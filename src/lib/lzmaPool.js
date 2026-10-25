// decodeLzma(bytes) -> Promise<Uint8Array>. Decodes in a small pool of background workers (several files at once,
// page stays smooth). If workers aren't available or fail to start, it quietly decodes on the main thread instead.
import { lzmaDecode } from "./lzma.js";

let workers = null;
let turn = 0;
let seq = 0;
const pending = new Map();

function fallbackAll() {
  const jobs = [...pending.values()];
  pending.clear();
  workers = [];
  for (const j of jobs) {
    try {
      j.resolve(lzmaDecode(j.buf));
    } catch (err) {
      j.reject(err);
    }
  }
}

function start() {
  if (workers) return workers;
  workers = [];
  try {
    if (typeof Worker === "undefined") return workers;
    const n = Math.max(2, Math.min(4, ((typeof navigator !== "undefined" && navigator.hardwareConcurrency) || 4) - 1));
    const list = [];
    for (let i = 0; i < n; i++) {
      const w = new Worker(new URL("./lzmaWorker.js", import.meta.url), { type: "module" });
      w.onmessage = (e) => {
        const job = pending.get(e.data.id);
        if (!job) return;
        pending.delete(e.data.id);
        if (e.data.error) job.reject(new Error(e.data.error));
        else job.resolve(e.data.out);
      };
      w.onerror = fallbackAll; // worker couldn't load: finish everything on the main thread
      list.push(w);
    }
    workers = list;
  } catch {
    workers = [];
  }
  return workers;
}

export function decodeLzma(buf) {
  const ws = start();
  if (!ws.length) {
    try {
      return Promise.resolve(lzmaDecode(buf));
    } catch (err) {
      return Promise.reject(err);
    }
  }
  return new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject, buf });
    ws[turn++ % ws.length].postMessage({ id, buf }); // input is copied, so the caller's bytes stay usable
  });
}
