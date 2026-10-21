// Local candle storage in the browser (IndexedDB): no size limit worth worrying about, survives reloads.
// One record per instrument per UTC day, holding that day's 1-minute candles as a flat Float64Array:
// [time, open, high, low, close, time, open, ...]. Falls back to memory if IndexedDB is unavailable.

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

export async function putDay(symbol, day, flat) {
  const key = `${symbol}|${day}`;
  const db = await openDb();
  if (!db) {
    memory.set(key, { key, symbol, day, flat });
    return;
  }
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).put({ key, symbol, day, flat });
  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function listDays(symbol) {
  const db = await openDb();
  if (!db) return [...memory.values()].filter((r) => r.symbol === symbol).map((r) => r.day).sort();
  const range = IDBKeyRange.bound(`${symbol}|`, `${symbol}|\uffff`);
  const keys = await wrap(db.transaction(STORE).objectStore(STORE).getAllKeys(range));
  return keys.map((k) => String(k).split("|")[1]).sort();
}

// Flat arrays for every stored day between fromDay and toDay (inclusive), oldest first.
export async function getRange(symbol, fromDay, toDay) {
  const db = await openDb();
  if (!db) {
    return [...memory.values()]
      .filter((r) => r.symbol === symbol && r.day >= fromDay && r.day <= toDay)
      .sort((a, b) => (a.day < b.day ? -1 : 1))
      .map((r) => r.flat);
  }
  const range = IDBKeyRange.bound(`${symbol}|${fromDay}`, `${symbol}|${toDay}`);
  const rows = await wrap(db.transaction(STORE).objectStore(STORE).getAll(range));
  return rows.sort((a, b) => (a.day < b.day ? -1 : 1)).map((r) => r.flat);
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
