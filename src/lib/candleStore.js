// Local candle storage in the browser (IndexedDB): no size limit worth worrying about, survives reloads.
// One record per instrument per UTC day, holding that day's 1-minute candles as a flat Float64Array:
// [time, open, high, low, close, volume, time, open, ...]. Falls back to memory if IndexedDB is unavailable.

const DB_NAME = "tredzi-candles";
const STORE = "days";
const memory = new Map();
let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore(STORE, { keyPath: "key" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch (err) {
      resolve(null);
    }
  });
  return dbPromise;
}

const wrap = (req) =>
  new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

// Records written now carry volume (6 numbers per candle: time, open, high, low, close, volume). Older records (5 numbers,
// no volume) are still readable; they are listed separately so the downloader can refresh them.
const V6 = "|v6";
const parseKey = (k) => {
  const parts = String(k).split("|");
  return { day: parts[1], v6: parts[2] === "v6" };
};

export async function putDay(symbol, day, flat) {
  const key = `${symbol}|${day}${V6}`;
  const legacyKey = `${symbol}|${day}`;
  const db = await openDb();
  if (!db) {
    memory.delete(legacyKey);
    memory.set(key, { key, symbol, day, flat, stride: 6 });
    return;
  }
  const tx = db.transaction(STORE, "readwrite");
  const store = tx.objectStore(STORE);
  store.delete(legacyKey);
  store.put({ key, symbol, day, flat, stride: 6 });
  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

async function allKeys(symbol) {
  const db = await openDb();
  if (!db) return [...memory.keys()].filter((k) => k.startsWith(`${symbol}|`));
  const range = IDBKeyRange.bound(`${symbol}|`, `${symbol}|\uffff`);
  return wrap(db.transaction(STORE).objectStore(STORE).getAllKeys(range));
}

// Days that exist at all (with or without volume).
export async function listDays(symbol) {
  const days = new Set((await allKeys(symbol)).map((k) => parseKey(k).day));
  return [...days].sort();
}

// Days saved in the newer format (with volume).
export async function listVolumeDays(symbol) {
  return [...new Set((await allKeys(symbol)).map(parseKey).filter((k) => k.v6).map((k) => k.day))].sort();
}

// [{ flat, stride }] for every stored day between fromDay and toDay (inclusive), oldest first.
export async function getRange(symbol, fromDay, toDay) {
  const db = await openDb();
  let rows;
  if (!db) {
    rows = [...memory.values()].filter((r) => r.symbol === symbol && r.day >= fromDay && r.day <= toDay);
  } else {
    const range = IDBKeyRange.bound(`${symbol}|${fromDay}`, `${symbol}|${toDay}\uffff`);
    rows = await wrap(db.transaction(STORE).objectStore(STORE).getAll(range));
  }
  const byDay = new Map();
  for (const r of rows) {
    const cur = byDay.get(r.day);
    if (!cur || (r.stride || 5) > (cur.stride || 5)) byDay.set(r.day, r);
  }
  return [...byDay.values()].sort((a, b) => (a.day < b.day ? -1 : 1)).map((r) => ({ flat: r.flat, stride: r.stride || 5 }));
}

export async function clearSymbol(symbol) {
  const db = await openDb();
  if (!db) {
    [...memory.keys()].filter((k) => k.startsWith(`${symbol}|`)).forEach((k) => memory.delete(k));
    return;
  }
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).delete(IDBKeyRange.bound(`${symbol}|`, `${symbol}|\uffff`));
  await new Promise((resolve) => {
    tx.oncomplete = resolve;
    tx.onerror = resolve;
    tx.onabort = resolve;
  });
}
