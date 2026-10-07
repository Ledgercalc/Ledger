// TradeLocker sync for Tredzi.
// The browser talks to a tiny read-only proxy (see worker/broker-proxy.js), which forwards to TradeLocker.
// Only login tokens are kept on this device. The password is used once to sign in and is never saved.
import { useSyncExternalStore } from "react";

export const BROKER_PROXY_BASE = (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_BROKER_PROXY_URL) || "";
const STORE_KEY = "tredzi:broker:v1";
const MAX_RECENT = 15;
// A column that holds realized profit (but not things like "takeProfit").
const PNL_COLUMN = /^(realized|closed|net|gross)?_?(pl|pnl|profit|profitloss)$/i;
const TOKEN_SKEW_MS = 30 * 1000;

// ---------- tiny external store so the tab and the background sync share one state ----------
const listeners = new Set();
let state = {
  loaded: false,
  accountId: null,
  conn: null, // saved connection (tokens, account, settings)
  phase: "idle", // idle | connecting | choose | syncing | ok | signin | error
  error: "",
  choices: [], // accounts to pick from after login
  pending: null, // login result waiting for an account choice
  diag: null, // what the last sync found (for troubleshooting)
  lastAdded: 0,
};
let importer = null;
let syncing = false;

const emit = () => listeners.forEach((l) => l());
const setState = (patch) => {
  state = { ...state, ...patch };
  emit();
};
export const getBrokerState = () => state;
export const subscribeBroker = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
export function useBroker() {
  return useSyncExternalStore(subscribeBroker, getBrokerState, getBrokerState);
}
export function registerImporter(fn) {
  importer = fn;
  return () => {
    if (importer === fn) importer = null;
  };
}

// ---------- storage ----------
const keyFor = (accountId) => `${STORE_KEY}:${accountId || "default"}`;
async function readStore(accountId) {
  try {
    const res = await window.storage.get(keyFor(accountId), false);
    return res && res.value ? JSON.parse(res.value) : null;
  } catch (e) {
    return null;
  }
}
async function writeStore(accountId, conn) {
  try {
    if (!conn) await window.storage.delete(keyFor(accountId), false);
    else await window.storage.set(keyFor(accountId), JSON.stringify(conn), false);
  } catch (e) {
    // non-critical
  }
}
async function saveConn(conn) {
  setState({ conn });
  await writeStore(state.accountId, conn);
}

export async function initBroker(accountId) {
  if (state.loaded && state.accountId === accountId) return;
  const conn = await readStore(accountId);
  setState({ loaded: true, accountId, conn, phase: conn ? "ok" : "idle", error: "", choices: [], pending: null });
}

// ---------- HTTP through the proxy ----------
export const brokerReady = () => !!BROKER_PROXY_BASE;

async function tl(env, path, { method = "GET", token, accNum, body } = {}) {
  if (!BROKER_PROXY_BASE) throw new BrokerError("setup", "The broker connection is not set up on this app yet.");
  const headers = { Accept: "application/json" };
  if (body) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  if (accNum !== undefined && accNum !== null) headers.accNum = String(accNum);
  let res;
  try {
    res = await fetch(`${BROKER_PROXY_BASE.replace(/\/$/, "")}/tl/${env}/${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    throw new BrokerError("network", "Could not reach the broker connection. Check your internet and try again.");
  }
  let json = null;
  try {
    json = await res.json();
  } catch (e) {
    json = null;
  }
  if (res.status === 401 || res.status === 403) throw new BrokerError("auth", (json && (json.errmsg || json.message)) || "Sign in again.");
  if (res.status === 429) throw new BrokerError("rate", "TradeLocker asked us to slow down. Trying again shortly.");
  if (!res.ok || (json && json.s === "error")) {
    throw new BrokerError("api", (json && (json.errmsg || json.message || json.error)) || `TradeLocker returned an error (${res.status}).`);
  }
  return json;
}
export class BrokerError extends Error {
  constructor(kind, message) {
    super(message);
    this.kind = kind;
  }
}

const toMs = (v) => {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return v < 1e12 ? v * 1000 : v;
  const t = Date.parse(v);
  return Number.isFinite(t) ? t : 0;
};
const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

// ---------- sign in ----------
function tokensFrom(json) {
  const accessToken = json.accessToken || (json.d && json.d.accessToken);
  const refreshToken = json.refreshToken || (json.d && json.d.refreshToken);
  const exp = json.expireDate || (json.d && json.d.expireDate);
  if (!accessToken) throw new BrokerError("api", "TradeLocker did not return a login token. Check your email, password and server name.");
  return { accessToken, refreshToken, expiresAt: toMs(exp) || Date.now() + 9 * 60 * 1000 };
}

async function listAccounts(env, accessToken) {
  const json = await tl(env, "auth/jwt/all-accounts", { token: accessToken });
  const raw = json.accounts || (json.d && json.d.accounts) || [];
  return raw.map((a) => ({
    id: String(a.id),
    accNum: a.accNum,
    name: a.name || `Account ${a.accNum}`,
    currency: a.currency || "",
    balance: num(a.accountBalance ?? a.balance),
    status: a.status || "",
  }));
}

export async function connectTradeLocker({ env, email, password, server, importFrom, autoLog }) {
  setState({ phase: "connecting", error: "" });
  try {
    const login = await tl(env, "auth/jwt/token", { method: "POST", body: { email: email.trim(), password, server: server.trim() } });
    const tokens = tokensFrom(login);
    const accounts = await listAccounts(env, tokens.accessToken);
    if (!accounts.length) throw new BrokerError("api", "Signed in, but no trading accounts were found for this login.");
    const base = { platform: "tradelocker", env, server: server.trim(), email: email.trim(), importFrom, autoLog, ...tokens };
    if (accounts.length === 1) {
      await finishConnect(base, accounts[0]);
    } else {
      setState({ phase: "choose", choices: accounts, pending: base });
    }
  } catch (e) {
    setState({ phase: "error", error: e.message || "Could not connect." });
  }
}

export async function chooseAccount(acc) {
  const base = state.pending;
  if (!base) return;
  setState({ phase: "connecting", error: "" });
  await finishConnect(base, acc);
}

async function finishConnect(base, acc) {
  const conn = {
    ...base,
    accountId: acc.id,
    accNum: acc.accNum,
    accountName: acc.name,
    currency: acc.currency,
    balance: acc.balance,
    lastSyncAt: 0,
    totalImported: 0,
    recent: [],
    cache: null,
  };
  setState({ pending: null, choices: [] });
  await saveConn(conn);
  await syncNow({ first: true });
}


// The saved login token ended: sign in again with the saved email and server (password typed once more, not stored).
export async function reconnect(password) {
  const conn = state.conn;
  if (!conn) return;
  setState({ phase: "connecting", error: "" });
  try {
    const login = await tl(conn.env, "auth/jwt/token", { method: "POST", body: { email: conn.email, password, server: conn.server } });
    const next = { ...conn, ...tokensFrom(login) };
    await saveConn(next);
    syncing = false;
    await syncNow();
  } catch (e) {
    setState({ phase: "signin", error: e.message || "Could not sign in." });
  }
}

export async function disconnect() {
  await writeStore(state.accountId, null);
  setState({ conn: null, phase: "idle", error: "", diag: null, choices: [], pending: null, lastAdded: 0 });
}

export async function setAutoLog(on) {
  if (!state.conn) return;
  await saveConn({ ...state.conn, autoLog: !!on });
}

// ---------- reading history ----------
async function freshToken(conn) {
  if (conn.accessToken && conn.expiresAt - TOKEN_SKEW_MS > Date.now()) return conn;
  if (!conn.refreshToken) throw new BrokerError("auth", "Your TradeLocker session ended. Sign in again.");
  try {
    const json = await tl(conn.env, "auth/jwt/refresh", { method: "POST", body: { refreshToken: conn.refreshToken } });
    const next = { ...conn, ...tokensFrom({ ...json, refreshToken: json.refreshToken || (json.d && json.d.refreshToken) || conn.refreshToken }) };
    await saveConn(next);
    return next;
  } catch (e) {
    throw new BrokerError("auth", "Your TradeLocker session ended. Sign in again.");
  }
}

const colsOf = (cfg, name) => {
  const d = cfg && (cfg.d || cfg);
  if (!d) return null;
  const key = Object.keys(d).find((k) => k.toLowerCase() === `${name}config`.toLowerCase());
  const block = key ? d[key] : null;
  const cols = block && (block.columns || block);
  return Array.isArray(cols) ? cols.map((c) => (typeof c === "string" ? c : c.id || c.name)) : null;
};

async function loadCache(conn) {
  const DAY = 24 * 60 * 60 * 1000;
  if (conn.cache && Date.now() - conn.cache.at < DAY && conn.cache.cols && conn.cache.instruments) return conn;
  const cfg = await tl(conn.env, "trade/config", { token: conn.accessToken });
  const cols = colsOf(cfg, "ordersHistory");
  let instruments = {};
  try {
    const ins = await tl(conn.env, `trade/accounts/${conn.accountId}/instruments`, { token: conn.accessToken, accNum: conn.accNum });
    const list = (ins.d && ins.d.instruments) || ins.instruments || [];
    list.forEach((i) => {
      const id = i.tradableInstrumentId ?? i.id;
      if (id !== undefined) instruments[id] = { name: i.name || i.description || String(id), size: num(i.contractSize ?? i.lotSize ?? i.contractMultiplier) || 0 };
    });
  } catch (e) {
    instruments = {};
  }
  const next = { ...conn, cache: { at: Date.now(), cols, instruments } };
  await saveConn(next);
  return next;
}

// Turn raw rows into objects using the column names TradeLocker publishes in /trade/config.
export function decodeRows(rows, cols) {
  if (!Array.isArray(rows)) return [];
  return rows.map((r) => {
    if (!Array.isArray(r)) return r;
    const o = {};
    (cols || []).forEach((c, i) => {
      o[c] = r[i];
    });
    return o;
  });
}

// Group filled orders by position, and keep only positions that are fully closed.
export function buildClosedTrades(orders, { accountId, instruments = {}, pnlCol }) {
  const filled = orders.filter((o) => /fill/i.test(String(o.status)) && num(o.filledQty ?? o.qty) > 0);
  const byPos = new Map();
  filled.forEach((o) => {
    const pid = o.positionId;
    if (pid === undefined || pid === null || pid === "") return;
    if (!byPos.has(pid)) byPos.set(pid, []);
    byPos.get(pid).push(o);
  });
  const out = [];
  byPos.forEach((fills, pid) => {
    fills.sort((a, b) => toMs(a.lastModified ?? a.createdDate) - toMs(b.lastModified ?? b.createdDate));
    const dir = String(fills[0].side).toLowerCase() === "buy" ? 1 : -1;
    let qIn = 0, cIn = 0, qOut = 0, cOut = 0, reported = 0, hasReported = false, lastTs = 0;
    fills.forEach((o) => {
      const q = num(o.filledQty ?? o.qty);
      const p = num(o.avgPrice ?? o.price);
      const d = String(o.side).toLowerCase() === "buy" ? 1 : -1;
      if (d === dir) { qIn += q; cIn += q * p; } else { qOut += q; cOut += q * p; }
      if (pnlCol && o[pnlCol] !== undefined && o[pnlCol] !== null && o[pnlCol] !== "") { reported += num(o[pnlCol]); hasReported = true; }
      lastTs = Math.max(lastTs, toMs(o.lastModified ?? o.createdDate));
    });
    if (qOut <= 0 || qOut < qIn - 1e-9) return; // still open or only partly closed
    const entry = cIn / qIn;
    const exit = cOut / qOut;
    const closed = Math.min(qIn, qOut);
    const ins = instruments[fills[0].tradableInstrumentId] || {};
    let pnl = null;
    let estimated = false;
    if (hasReported) pnl = reported;
    else if (ins.size > 0) { pnl = (exit - entry) * dir * closed * ins.size; estimated = true; }
    out.push({
      extId: `tl:${accountId}:${pid}`,
      source: "tradelocker",
      pair: ins.name || String(fills[0].tradableInstrumentId || ""),
      pnl: pnl === null ? null : Math.round(pnl * 100) / 100,
      estimated,
      ts: lastTs || Date.now(),
      note: `TradeLocker ${dir > 0 ? "buy" : "sell"} ${closed} @ ${entry.toFixed(5)} to ${exit.toFixed(5)}`,
    });
  });
  return out.sort((a, b) => a.ts - b.ts);
}

export async function syncNow({ first = false, manual = false } = {}) {
  if (syncing) return;
  let conn = state.conn;
  if (!conn) return;
  syncing = true;
  setState({ phase: "syncing", error: "" });
  try {
    conn = await freshToken(conn);
    conn = await loadCache(conn);
    const hist = await tl(conn.env, `trade/accounts/${conn.accountId}/ordersHistory`, { token: conn.accessToken, accNum: conn.accNum });
    const rows = (hist.d && (hist.d.ordersHistory || hist.d.orders)) || hist.ordersHistory || [];
    const cols = conn.cache.cols;
    const orders = decodeRows(rows, cols);
    const pnlCol = (cols || []).find((c) => PNL_COLUMN.test(String(c))) || null;
    const all = buildClosedTrades(orders, { accountId: conn.accountId, instruments: conn.cache.instruments, pnlCol });
    const since = conn.importFrom || 0;
    const wanted = all.filter((t) => t.ts >= since);
    const withPnl = wanted.filter((t) => t.pnl !== null);
    const noPnl = wanted.length - withPnl.length;
    let added = 0;
    if (importer && withPnl.length && (conn.autoLog || first || manual)) {
      added = importer(withPnl.map(({ estimated, ...t }) => ({ ...t, note: estimated ? `${t.note} (P&L estimated)` : t.note }))) || 0;
    }
    const known = new Set((conn.recent || []).map((r) => r.extId));
    const recentNew = withPnl.filter((t) => !known.has(t.extId)).map((t) => ({ extId: t.extId, pair: t.pair, pnl: t.pnl, ts: t.ts, estimated: t.estimated }));
    const next = {
      ...conn,
      lastSyncAt: Date.now(),
      totalImported: (conn.totalImported || 0) + added,
      recent: [...recentNew, ...(conn.recent || [])].sort((a, b) => b.ts - a.ts).slice(0, MAX_RECENT),
    };
    await saveConn(next);
    setState({
      phase: "ok",
      lastAdded: added,
      diag: { rows: rows.length, closed: all.length, inRange: wanted.length, noPnl, pnlSource: withPnl.some((t) => !t.estimated) ? `reported by TradeLocker${pnlCol ? ` (${pnlCol})` : ""}` : withPnl.some((t) => t.estimated) ? "estimated from prices" : "not provided", columns: cols || [] },
    });
  } catch (e) {
    if (e.kind === "auth") setState({ phase: "signin", error: e.message });
    else setState({ phase: "error", error: e.message || "Sync failed." });
  } finally {
    syncing = false;
  }
}
