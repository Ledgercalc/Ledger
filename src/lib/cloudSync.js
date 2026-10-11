// Cloud sync: keeps a signed-in user's accounts and journal data the same on every device.
//
// How it works:
//  - Everything the app saves goes through window.storage.set. We wrap that call, and when the key is one of the
//    synced ones we mark it "dirty" and upload it a moment later (one small JSON doc per key).
//  - When the app opens (and when you come back to it, or go back online) we download the newest docs, merge, and
//    reload once if anything changed so the screen shows it.
//  - Screenshots and other embedded images (data: URLs) are NOT uploaded; each device keeps its own.
//  - Two devices editing the same doc at the same moment is merged by id for lists (trades, accounts, ...), and
//    this device wins for single values.
import { communityApi } from "../api/community.js";

const META_KEY = "tredzi-cloud-sync-meta";
const RELOAD_KEY = "tredzi-cloud-sync-reload-at";
const FLUSH_DELAY_MS = 2500;
const RETRY_MS = 20000;

let cfg = null;
let installed = false;
let origSet = null;
let meta = { versions: {}, dirty: {}, owner: null, pulledOnce: false };
let dirtyCounter = 0;
let accountIds = [];
let accountObjs = [];
let keyList = [];
let keySet = new Set();
let fallbackOf = new Map(); // scoped key -> old unscoped key, for the original "My Account" that predates per-account storage
let chain = Promise.resolve();
let flushTimer = null;
let retryTimer = null;
let readyToUpload = false;
let status = { state: "idle", at: 0, message: "" };
const listeners = new Set();

function setStatus(state, message = "") {
  status = { state, at: Date.now(), message };
  listeners.forEach((fn) => {
    try { fn(status); } catch (e) { /* ignore */ }
  });
}
export const getCloudSyncStatus = () => status;
export function subscribeCloudSync(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// ---------- small helpers ----------
const tryParse = (raw) => {
  try { return JSON.parse(raw); } catch (e) { return undefined; }
};
const isDataUrl = (v) => typeof v === "string" && v.startsWith("data:");
function strip(v) {
  if (Array.isArray(v)) return v.filter((x) => !isDataUrl(x)).map(strip);
  if (v && typeof v === "object") {
    const o = {};
    for (const [k, x] of Object.entries(v)) {
      if (isDataUrl(x)) continue;
      o[k] = strip(x);
    }
    return o;
  }
  return v;
}
function restoreFromLocal(remoteItem, localItem) {
  const out = { ...remoteItem };
  for (const [k, x] of Object.entries(localItem || {})) {
    if (isDataUrl(x)) out[k] = x;
    else if (Array.isArray(x) && x.some(isDataUrl)) out[k] = x;
  }
  return out;
}
const encKey = (k) => {
  const bytes = new TextEncoder().encode(k);
  let s = "";
  bytes.forEach((b) => { s += String.fromCharCode(b); });
  return "k_" + btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const hasId = (x) => x && typeof x === "object" && x.id !== undefined;
const isIdList = (a) => Array.isArray(a) && a.every(hasId);

async function readLocal(key) {
  try {
    const r = await window.storage.get(key, false);
    return r && typeof r.value === "string" ? r.value : null;
  } catch (e) {
    return null;
  }
}
async function readForSync(key) {
  const v = await readLocal(key);
  if (v !== null) return v;
  const fb = fallbackOf.get(key);
  return fb ? readLocal(fb) : null;
}
async function writeLocal(key, value) {
  await origSet(key, value, false); // bypasses our wrapper, so it doesn't mark itself dirty
}
async function saveMeta() {
  try { await origSet(META_KEY, JSON.stringify(meta), false); } catch (e) { /* ignore */ }
}
async function loadMeta() {
  const raw = await readLocal(META_KEY);
  const p = raw ? tryParse(raw) : null;
  if (p && typeof p === "object") meta = { versions: p.versions || {}, dirty: p.dirty || {}, owner: p.owner || null, pulledOnce: !!p.pulledOnce };
  for (const k of Object.keys(meta.dirty)) dirtyCounter = Math.max(dirtyCounter, Number(meta.dirty[k]) || 0);
}

function rebuildKeys(list) {
  accountObjs = Array.isArray(list) ? list.filter((a) => a && a.id) : [];
  accountIds = accountObjs.map((a) => a.id);
  const keys = [cfg.accountsKey, ...cfg.globalKeys];
  fallbackOf = new Map();
  for (const acc of accountObjs) {
    for (const base of cfg.accountBases) {
      const k = cfg.scopedKey(base, acc.id);
      keys.push(k);
      if (acc.legacy) fallbackOf.set(k, base);
    }
  }
  keyList = keys;
  keySet = new Set(keys);
}

function markDirty(key) {
  meta.dirty[key] = ++dirtyCounter;
  saveMeta();
  if (!readyToUpload) return;
  clearTimeout(flushTimer);
  flushTimer = setTimeout(() => { run(flushSafe); }, FLUSH_DELAY_MS);
}

function install() {
  if (installed) return;
  installed = true;
  origSet = window.storage.set.bind(window.storage);
  window.storage.set = async (key, value, shared) => {
    const r = await origSet(key, value, shared);
    try {
      if (cfg && !shared) {
        if (key === cfg.accountsKey) {
          rebuildKeys(tryParse(value));
        }
        if (keySet.has(key)) markDirty(key);
      }
    } catch (e) { /* never break the app's own save */ }
    return r;
  };
  document.addEventListener("visibilitychange", () => {
    if (!cfg) return;
    if (document.visibilityState === "visible") run(syncCycle);
    else run(flushSafe);
  });
  window.addEventListener("online", () => { if (cfg) run(syncCycle); });
}

const run = (fn) => {
  const p = chain.then(fn, fn).catch(() => {});
  chain = p;
  return p;
};
const auth = () => ({ Authorization: `Bearer ${cfg.getToken()}` });

// ---------- merging ----------
function mergeLists(localRaw, remoteRaw) {
  const l = tryParse(localRaw);
  const r = tryParse(remoteRaw);
  if (isIdList(l) && isIdList(r)) {
    const lById = new Map(l.map((x) => [String(x.id), x]));
    const seen = new Set();
    const out = [];
    for (const x of r) {
      const id = String(x.id);
      seen.add(id);
      out.push(lById.has(id) ? lById.get(id) : x);
    }
    for (const x of l) if (!seen.has(String(x.id))) out.push(x);
    if (out.length && out.every((x) => Number.isFinite(x.ts))) out.sort((a, b) => a.ts - b.ts);
    return JSON.stringify(out);
  }
  return localRaw; // single values: this device wins
}
function applyRemote(remoteRaw, localRaw) {
  const r = tryParse(remoteRaw);
  const l = localRaw === null ? undefined : tryParse(localRaw);
  if (Array.isArray(r) && Array.isArray(l) && isIdList(l)) {
    const lById = new Map(l.map((x) => [String(x.id), x]));
    return JSON.stringify(r.map((x) => (hasId(x) && lById.has(String(x.id)) ? restoreFromLocal(x, lById.get(String(x.id))) : x)));
  }
  return remoteRaw;
}
async function isPristine(id) {
  for (const base of cfg.pristineBases) {
    for (const k of [cfg.scopedKey(base, id), base]) {
      const raw = await readLocal(k);
      if (raw && raw !== "[]" && raw !== "null" && raw !== "{}" && raw !== '""') return false;
    }
  }
  return true;
}

// ---------- download ----------
async function pullAll() {
  const data = await communityApi("/sync/all", { headers: auth() });
  const uid = String(data.userId || "");
  if (meta.owner && uid && meta.owner !== uid) {
    const err = new Error("This device already holds another account's data.");
    err.locked = true;
    throw err;
  }
  if (uid) meta.owner = uid;
  const byEnc = new Map((data.docs || []).map((d) => [d.key, d]));
  let changed = false;

  // 1) the account list first, so we know which per-account docs exist
  const accKey = cfg.accountsKey;
  const accDoc = byEnc.get(encKey(accKey));
  if (accDoc && accDoc.updatedAt > (meta.versions[accKey] || 0)) {
    const remoteList = tryParse(accDoc.data);
    const localRaw = await readLocal(accKey);
    const localList = localRaw ? tryParse(localRaw) : null;
    let nextRaw = localRaw;
    let replaced = false;
    if (Array.isArray(remoteList) && remoteList.length) {
      if (Array.isArray(localList) && localList.length) {
        const pristineDefault = !meta.pulledOnce && localList.length === 1 && localList[0].legacy && (await isPristine(localList[0].id));
        if (pristineDefault) { nextRaw = JSON.stringify(remoteList); replaced = true; }
        else if (meta.dirty[accKey] || !meta.pulledOnce) nextRaw = mergeLists(localRaw, accDoc.data);
        else nextRaw = JSON.stringify(remoteList);
      } else {
        nextRaw = JSON.stringify(remoteList);
      }
    }
    if (nextRaw !== localRaw) { await writeLocal(accKey, nextRaw); changed = true; }
    if (replaced) delete meta.dirty[accKey];
    meta.versions[accKey] = accDoc.updatedAt;
    rebuildKeys(tryParse(nextRaw));
  }

  // 2) every other doc
  for (const key of keyList) {
    if (key === accKey) continue;
    const doc = byEnc.get(encKey(key));
    if (!doc) continue;
    if (doc.updatedAt <= (meta.versions[key] || 0)) continue;
    const local = await readForSync(key);
    if (meta.dirty[key]) {
      const merged = local === null ? doc.data : mergeLists(local, doc.data);
      if (merged !== local) { await writeLocal(key, merged); changed = true; }
    } else {
      const next = applyRemote(doc.data, local);
      if (next !== local) { await writeLocal(key, next); changed = true; }
    }
    meta.versions[key] = doc.updatedAt;
  }

  // 3) things this device has that the cloud has never seen: queue them for upload
  for (const key of keyList) {
    if (byEnc.has(encKey(key)) || meta.versions[key] !== undefined || meta.dirty[key]) continue;
    if ((await readForSync(key)) !== null) meta.dirty[key] = ++dirtyCounter;
  }
  meta.pulledOnce = true;
  await saveMeta();
  return changed;
}

// ---------- upload ----------
async function flushOnly() {
  if (!cfg || !cfg.getToken() || !readyToUpload) return { conflict: false };
  let conflict = false;
  let tooLarge = 0;
  for (const key of Object.keys(meta.dirty)) {
    const stamp = meta.dirty[key];
    const raw = await readForSync(key);
    if (raw === null) { delete meta.dirty[key]; continue; }
    const parsed = tryParse(raw);
    const payload = parsed && typeof parsed === "object" ? JSON.stringify(strip(parsed)) : raw;
    try {
      const res = await communityApi("/sync/doc", {
        method: "POST",
        headers: auth(),
        body: JSON.stringify({ key: encKey(key), data: payload, base: meta.versions[key] || 0 }),
      });
      meta.versions[key] = res.updatedAt;
      if (meta.dirty[key] === stamp) delete meta.dirty[key];
    } catch (err) {
      const m = String((err && err.message) || "");
      if (/conflict/i.test(m)) { conflict = true; break; }
      if (/too large/i.test(m)) { tooLarge++; if (meta.dirty[key] === stamp) delete meta.dirty[key]; continue; }
      throw err;
    }
  }
  await saveMeta();
  if (tooLarge) setStatus("error", "Some data is too large to sync.");
  return { conflict };
}

// Used for edits made while the app is open: upload, and fall back to a full sync if another device got there first.
async function flushSafe() {
  if (!cfg || !cfg.getToken() || !readyToUpload) return;
  try {
    const r = await flushOnly();
    if (r.conflict) await syncCycle();
    else if (status.state !== "error") setStatus("ok");
  } catch (err) {
    setStatus("error", String((err && err.message) || "Couldn't sync. Will retry."));
    clearTimeout(retryTimer);
    retryTimer = setTimeout(() => { run(syncCycle); }, RETRY_MS);
  }
}

function reloadOnce() {
  let last = 0;
  try { last = Number(sessionStorage.getItem(RELOAD_KEY) || 0); } catch (e) { /* ignore */ }
  if (Date.now() - last < 20000) {
    setStatus("ok", "New data arrived from another device. Reload the app to see it.");
    return;
  }
  try { sessionStorage.setItem(RELOAD_KEY, String(Date.now())); } catch (e) { /* ignore */ }
  window.location.reload();
}

async function syncCycle() {
  if (!cfg) return;
  if (!cfg.getToken()) { setStatus("signedout"); return; }
  setStatus("syncing");
  clearTimeout(retryTimer);
  try {
    let changed = await pullAll();
    readyToUpload = true;
    let r = await flushOnly();
    if (r.conflict) {
      changed = (await pullAll()) || changed;
      r = await flushOnly();
    }
    if (status.state === "error" && /too large/i.test(status.message)) {
      // keep the message visible
    } else {
      setStatus("ok");
    }
    if (changed) reloadOnce();
  } catch (err) {
    if (err && err.locked) {
      setStatus("locked", err.message);
      return;
    }
    setStatus("error", String((err && err.message) || "Couldn't sync. Will retry."));
    retryTimer = setTimeout(() => { run(syncCycle); }, RETRY_MS);
  }
}

// ---------- public ----------
// config: { getToken, accountsKey, globalKeys, accountBases, pristineBases, scopedKey }
export async function startCloudSync(config) {
  cfg = config;
  readyToUpload = false;
  install();
  await loadMeta();
  const list = tryParse((await readLocal(cfg.accountsKey)) || "null");
  rebuildKeys(list);
  return run(syncCycle);
}
export function stopCloudSync() {
  cfg = null;
  readyToUpload = false;
  clearTimeout(flushTimer);
  clearTimeout(retryTimer);
}
export const cloudSyncNow = () => (cfg ? run(syncCycle) : Promise.resolve());
