import { useEffect, useMemo, useState } from "react";

/* ------------------------------------------------------------------
   OrderFlowProfile: Footprint | Volume profile | Delta profile
   Ticks: [{ t: ms, bid, ask }]. Load them with one tap from server.mjs
   (dukascopy-node), drop a CSV, or pass <OrderFlowProfile ticks={...} />.
   Spot gold has no traded volume: volume = tick count, and each tick is
   classified buy/sell from quote moves. Dukascopy's own bid/ask volume
   columns are quoted size, so they are never used.
------------------------------------------------------------------- */

const SERVER = "http://localhost:8787";

// 1. Clean ticks
export function cleanTicks(raw) {
  let t = raw.filter((k) => k.bid > 0 && k.ask >= k.bid && isFinite(k.t)).sort((a, b) => a.t - b.t);
  if (t.length < 5) return t;
  const sp = t.map((k) => k.ask - k.bid).sort((a, b) => a - b);
  const med = sp[sp.length >> 1] || 0.01;
  t = t.filter((k) => k.ask - k.bid <= med * 12);          // spread glitches / rollover
  const thr = med * 25, out = [t[0]];
  for (let i = 1; i < t.length - 1; i++) {
    const p = out[out.length - 1], c = t[i], n = t[i + 1];
    const m = (c.ask + c.bid) / 2, pm = (p.ask + p.bid) / 2, nm = (n.ask + n.bid) / 2;
    const spike = Math.abs(m - pm) > thr && Math.abs(m - nm) > thr && Math.abs(pm - nm) < thr / 2;
    if (!spike && !(c.bid === p.bid && c.ask === p.ask)) out.push(c); // spikes + duplicate quotes
  }
  out.push(t[t.length - 1]);
  return out;
}

// 2. Classify each tick: ask up = buyers lifting, bid down = sellers hitting
export function classify(ticks) {
  const ev = [];
  for (let i = 1; i < ticks.length; i++) {
    const a = ticks[i], p = ticks[i - 1], dA = a.ask - p.ask, dB = a.bid - p.bid;
    if (dA > 0 && dB >= 0) ev.push({ t: a.t, p: a.ask, k: "buy" });
    else if (dB < 0 && dA <= 0) ev.push({ t: a.t, p: a.bid, k: "sell" });
    else if (dA > 0 && dB > 0) ev.push({ t: a.t, p: a.ask, k: "buy" });
    else ev.push({ t: a.t, p: (a.ask + a.bid) / 2, k: "neu" });
  }
  return ev;
}

const lvKey = (p, step) => Math.round(p / step);
function levels(ev, step) {
  const m = new Map();
  for (const e of ev) {
    const k = lvKey(e.p, step), o = m.get(k) || { buy: 0, sell: 0, neu: 0 };
    o[e.k]++; m.set(k, o);
  }
  return m;
}

// 3. Volume/Delta profile with POC + 70% value area
export function buildProfile(ev, step) {
  const rows = [...levels(ev, step).entries()]
    .map(([k, o]) => ({ price: k * step, ...o, vol: o.buy + o.sell + o.neu, delta: o.buy - o.sell }))
    .sort((a, b) => b.price - a.price);
  const total = rows.reduce((s, r) => s + r.vol, 0);
  let poc = 0; rows.forEach((r, i) => { if (r.vol > rows[poc].vol) poc = i; });
  let lo = poc, hi = poc, acc = rows[poc]?.vol || 0;
  while (rows.length && acc < total * 0.7 && (lo > 0 || hi < rows.length - 1)) {
    const up = lo > 0 ? rows[lo - 1].vol : -1, dn = hi < rows.length - 1 ? rows[hi + 1].vol : -1;
    acc += up >= dn ? rows[--lo].vol : rows[++hi].vol;
  }
  return { rows, poc, vah: lo, val: hi, delta: rows.reduce((s, r) => s + r.delta, 0) };
}

// 4. Footprint bars: sell(bid) x buy(ask) per level, diagonal imbalances
export function buildFootprint(ev, step, tfMin, maxBars = 14) {
  const ms = tfMin * 60000, groups = new Map();
  for (const e of ev) { const b = Math.floor(e.t / ms) * ms; (groups.get(b) || groups.set(b, []).get(b)).push(e); }
  return [...groups.entries()].sort((a, b) => a[0] - b[0]).slice(-maxBars).map(([t, list]) => {
    const lv = levels(list, step);
    let poc = null, pv = -1, delta = 0, vol = 0;
    for (const [k, o] of lv) {
      const v = o.buy + o.sell + o.neu; delta += o.buy - o.sell; vol += v;
      if (v > pv) { pv = v; poc = k; }
    }
    return { t, lv, poc, delta, vol };
  });
}

// CSV loader (Dukascopy / MT5 headers)
export function parseTickCsv(text) {
  const L = text.trim().split(/\r?\n/), h = L[0].toLowerCase().split(/[,;\t]/).map((s) => s.trim());
  const ix = (...n) => h.findIndex((x) => n.includes(x));
  const iT = ix("timestamp", "time", "date", "datetime"), iA = ix("askprice", "ask"), iB = ix("bidprice", "bid");
  return L.slice(1).map((l) => { const c = l.split(/[,;\t]/); return { t: isNaN(+c[iT]) ? Date.parse(c[iT]) : +c[iT], ask: +c[iA], bid: +c[iB] }; });
}

function demoTicks(n = 20000) {
  let m = 2650, t = Date.now() - n * 800;
  return Array.from({ length: n }, () => {
    m += (Math.random() - 0.5) * 0.6; t += 600 + Math.random() * 400;
    const s = 0.2 + Math.random() * 0.1;
    return { t, bid: +(m - s / 2).toFixed(2), ask: +(m + s / 2).toFixed(2) };
  });
}

// 5. UI
const C = { bg: "#10161c", panel: "#161e26", line: "#26323d", txt: "#d7e0e6", dim: "#7d8d99",
  buy: "#34b99b", sell: "#e4675b", vol: "#5d7f9a", poc: "#e8b04a" };
const sel = { background: C.panel, color: C.txt, border: `1px solid ${C.line}`, borderRadius: 6, padding: "6px 10px", fontSize: 13 };

export default function OrderFlowProfile({ ticks: input, defaultStep = 0.5, instrument = "xauusd" }) {
  const [raw, setRaw] = useState(input || null);
  const [mode, setMode] = useState("footprint");
  const [step, setStep] = useState(defaultStep);
  const [tf, setTf] = useState(5);
  const [hours, setHours] = useState(2);
  const [status, setStatus] = useState("");

  const ev = useMemo(() => classify(cleanTicks(raw || demoTicks())), [raw]);
  const P = useMemo(() => buildProfile(ev, step), [ev, step]);
  const F = useMemo(() => buildFootprint(ev, step, tf), [ev, step, tf]);

  async function load() {
    setStatus("Loading ticks…");
    try {
      const to = new Date(), from = new Date(to - hours * 3600e3);
      const r = await fetch(`${SERVER}/ticks?instrument=${instrument}&from=${from.toISOString()}&to=${to.toISOString()}`);
      if (!r.ok) throw new Error(await r.text());
      const d = await r.json();
      setRaw(d); setStatus(`${d.length.toLocaleString()} ticks loaded`);
    } catch (e) { setStatus("Tick server is off. Start your app with npm run dev (see top of server.mjs)"); }
  }
  const onFile = async (f) => f && setRaw(parseTickCsv(await f.text()));

  // Auto-load real ticks when the panel opens or the range changes (skipped if you pass ticks yourself)
  useEffect(() => { if (!input) load(); }, [hours, instrument]);

  const Tab = ({ id, children }) => (
    <button onClick={() => setMode(id)} style={{ flex: 1, padding: "10px 0", border: 0, cursor: "pointer",
      background: mode === id ? C.poc : "transparent", color: mode === id ? "#10161c" : C.txt, fontWeight: 600, fontSize: 14 }}>{children}</button>
  );

  return (
    <div style={{ background: C.bg, color: C.txt, padding: 14, maxWidth: 760, fontFamily: "system-ui, sans-serif" }}
      onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files[0]); }}>
      <div style={{ display: "flex", border: `1px solid ${C.line}`, borderRadius: 8, overflow: "hidden" }}>
        <Tab id="footprint">Footprint</Tab><Tab id="volume">Volume</Tab><Tab id="delta">Delta</Tab>
      </div>

      <div style={{ display: "flex", gap: 8, margin: "10px 0", flexWrap: "wrap" }}>
        <select value={hours} onChange={(e) => setHours(+e.target.value)} style={sel}>
          {[1, 2, 4, 8, 24].map((h) => <option key={h} value={h}>Last {h} h</option>)}
        </select>
        <button onClick={load} style={{ ...sel, background: C.poc, color: "#10161c", fontWeight: 600, cursor: "pointer" }}>Reload</button>
        <select value={step} onChange={(e) => setStep(+e.target.value)} style={sel}>
          {[0.1, 0.25, 0.5, 1, 2].map((s) => <option key={s} value={s}>Row {s}</option>)}
        </select>
        {mode === "footprint" && (
          <select value={tf} onChange={(e) => setTf(+e.target.value)} style={sel}>
            {[1, 5, 15, 30].map((m) => <option key={m} value={m}>{m}m bars</option>)}
          </select>
        )}
        <label style={{ ...sel, cursor: "pointer" }}>Load CSV
          <input type="file" accept=".csv,.txt" hidden onChange={(e) => onFile(e.target.files[0])} />
        </label>
      </div>
      <div style={{ fontSize: 13, color: C.dim, marginBottom: 8 }}>
        {status || (raw ? "" : "Showing demo data until real ticks load.")} · net delta{" "}
        <b style={{ color: P.delta >= 0 ? C.buy : C.sell }}>{P.delta.toLocaleString()}</b>
      </div>

      {mode === "footprint" ? <Footprint bars={F} step={step} /> : <Profile P={P} mode={mode} />}

      <div style={{ fontSize: 12, color: C.dim, marginTop: 8 }}>
        {mode === "footprint"
          ? "Cells read sell × buy (tick counts). Green/red fill = 3× diagonal imbalance. Amber box = bar POC."
          : "Amber = POC · shaded rows = 70% value area · volume = tick count"}
      </div>
    </div>
  );
}

function Footprint({ bars, step }) {
  if (!bars.length) return null;
  let hi = -Infinity, lo = Infinity;
  bars.forEach((b) => { for (const k of b.lv.keys()) { hi = Math.max(hi, k); lo = Math.min(lo, k); } });
  const n = hi - lo + 1, rh = 14, cw = 92, top = 6, H = n * rh + top + 40;
  const W = 56 + bars.length * cw;
  const time = (t) => new Date(t).toISOString().slice(11, 16);
  return (
    <div style={{ overflow: "auto", maxHeight: 620, background: C.panel, borderRadius: 8 }}>
      <svg width={W} height={H} role="img" aria-label="Footprint chart" fontFamily="ui-monospace, monospace" fontSize="10">
        {Array.from({ length: n }, (_, i) => {
          const k = hi - i;
          return i % 2 === 0 ? <text key={k} x={4} y={top + i * rh + 11} fill={C.dim}>{(k * step).toFixed(2)}</text> : null;
        })}
        {bars.map((b, bi) => {
          const x0 = 56 + bi * cw;
          return (
            <g key={b.t}>
              {Array.from({ length: n }, (_, i) => {
                const k = hi - i, o = b.lv.get(k); if (!o) return null;
                const above = b.lv.get(k + 1), below = b.lv.get(k - 1);
                const buyImb = below && o.buy >= 5 && o.buy >= 3 * below.sell; // ask vs bid one level below
                const sellImb = above && o.sell >= 5 && o.sell >= 3 * above.buy; // bid vs ask one level above
                const y = top + i * rh;
                return (
                  <g key={k}>
                    <rect x={x0} y={y} width={cw - 4} height={rh - 1} fill="#ffffff0a" />
                    {sellImb && <rect x={x0} y={y} width={(cw - 4) / 2} height={rh - 1} fill={C.sell} opacity=".6" />}
                    {buyImb && <rect x={x0 + (cw - 4) / 2} y={y} width={(cw - 4) / 2} height={rh - 1} fill={C.buy} opacity=".6" />}
                    {k === b.poc && <rect x={x0} y={y} width={cw - 4} height={rh - 1} fill="none" stroke={C.poc} />}
                    <text x={x0 + (cw - 4) / 2 - 4} y={y + 10} textAnchor="end" fill={C.txt}>{o.sell}</text>
                    <text x={x0 + (cw - 4) / 2 + 4} y={y + 10} fill={C.txt}>{o.buy}</text>
                  </g>
                );
              })}
              <text x={x0} y={H - 24} fill={C.dim}>{time(b.t)}</text>
              <text x={x0} y={H - 10} fill={b.delta >= 0 ? C.buy : C.sell}>Δ {b.delta}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function Profile({ P, mode }) {
  const rowH = Math.max(6, Math.min(16, 520 / Math.max(P.rows.length, 1)));
  const W = 420, H = P.rows.length * rowH + 8, mid = W / 2 + 30;
  const maxV = Math.max(1, ...P.rows.map((r) => r.vol)), maxD = Math.max(1, ...P.rows.map((r) => Math.abs(r.delta)));
  return (
    <div style={{ maxHeight: 580, overflowY: "auto", background: C.panel, borderRadius: 8 }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Profile">
        {P.rows.map((r, i) => {
          const y = i * rowH + 4, poc = i === P.poc, dw = (Math.abs(r.delta) / maxD) * (W / 2 - 50);
          return (
            <g key={r.price}>
              {i >= P.vah && i <= P.val && <rect x={0} y={y} width={W} height={rowH} fill="#ffffff08" />}
              {mode === "volume"
                ? <rect x={60} y={y + 1} width={(r.vol / maxV) * (W - 80)} height={rowH - 2} fill={poc ? C.poc : C.vol} />
                : <rect x={r.delta >= 0 ? mid : mid - dw} y={y + 1} width={dw} height={rowH - 2} fill={r.delta >= 0 ? C.buy : C.sell} />}
              {rowH >= 9 && <text x={4} y={y + rowH - 2} fontSize={Math.min(10, rowH - 1)} fill={poc ? C.poc : C.dim}>{r.price.toFixed(2)}</text>}
            </g>
          );
        })}
        {mode === "delta" && <line x1={mid} x2={mid} y1={0} y2={H} stroke={C.line} />}
      </svg>
    </div>
  );
}
