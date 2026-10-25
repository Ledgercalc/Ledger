// Order-flow storage (browser IndexedDB). Separate from candleStore so the candle data is never touched.
// One entry per symbol and UTC day. A day is a flat Float64Array of records, 4 numbers each:
//   [minute (unix seconds), price level (integer = price / step), tick volume, unused]
// (days saved by the first version split the volume into two slots by tick direction; only the sum of the two is used)
// Records are sorted by minute. "step" is the price size of one level (1 pip for most forex).

const DB_NAME = "tredzi-flow";
const STORE = "days";
let dbPromise = null;

function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "key" });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        dbPromise = null;
        reject(req.error);
      };
    });
  }
  return dbPromise;
}

const wrap = (r) =>
  new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });

const finished = (t) =>
  new Promise((resolve, reject) => {
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });

const bounds = (symbol, from, to) => IDBKeyRange.bound(`${symbol}|${from}`, `${symbol}|${to}`);

export async function putFlowDay(symbol, day, step, flat) {
  const db = await openDb();
  const t = db.transaction(STORE, "readwrite");
  t.objectStore(STORE).put({ key: `${symbol}|${day}`, symbol, day, step, flat });
  await finished(t);
}

export async function listFlowDays(symbol) {
  const db = await openDb();
  const keys = await wrap(db.transaction(STORE, "readonly").objectStore(STORE).getAllKeys(bounds(symbol, "0000-00-00", "9999-99-99")));
  return keys.map((k) => String(k).split("|")[1]).sort();
}

export async function getFlowRange(symbol, fromDay, toDay) {
  const db = await openDb();
  const rows = await wrap(db.transaction(STORE, "readonly").objectStore(STORE).getAll(bounds(symbol, fromDay, toDay)));
  return rows.sort((a, b) => (a.day < b.day ? -1 : 1));
}

export async function clearFlow(symbol) {
  const db = await openDb();
  const t = db.transaction(STORE, "readwrite");
  t.objectStore(STORE).delete(bounds(symbol, "0000-00-00", "9999-99-99"));
  await finished(t);
}

// Join the stored days into one set of compact typed arrays, sorted by time, ready for the chart engine.
export function buildFlow(rows) {
  let total = 0;
  for (const r of rows) total += Math.floor(r.flat.length / 4);
  if (!total) return null;
  const time = new Float64Array(total);
  const lvl = new Int32Array(total);
  const vol = new Float32Array(total);
  const days = [];
  let k = 0;
  for (const r of rows) {
    days.push(r.day);
    const f = r.flat;
    for (let i = 0; i + 3 < f.length; i += 4) {
      time[k] = f[i];
      lvl[k] = f[i + 1];
      vol[k] = f[i + 2] + f[i + 3];
      k++;
    }
  }
  return { step: rows[0].step, n: k, time, lvl, vol, days, first: time[0], last: time[k - 1] };
}
