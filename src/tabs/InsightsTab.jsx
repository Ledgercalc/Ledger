import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown, Clock, Download, Plus, Send, Sparkles, Trash2 } from "lucide-react";
import { pokeCrab } from "../lib/mascot.js";
import { PlanLockCard } from "../components/PlansModal.jsx";
import { hasFeature } from "../data/plans.js";
import { useMyPlan } from "../lib/planStore.js";
import { SETUPS, emotionMeta } from "../lib/constants.js";
import { MARKET_SESSIONS } from "../lib/sessions.js";
import { bySession, bySetup, byConfidence, byDirection, byMood, byPair, byWeekday, findPatterns } from "../lib/tradeInsights.js";
import { fmtMoney } from "../lib/format.js";
import { TAP, THEME_TRANSITION, display, mono, palette } from "../lib/theme.js";

// ───────────────────────── helpers ─────────────────────────

const FEW_TRADES = 3;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const pad2 = (n) => String(n).padStart(2, "0");
const dayKey = (ts) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};
const monthKey = (ts) => dayKey(ts).slice(0, 7);
const usd = (n) => `${n < 0 ? "-" : ""}$${fmtMoney(Number.isFinite(n) ? n : 0)}`;
const usdS = (n) => `${n > 0 ? "+" : ""}${usd(n)}`;
const compact = (n) => {
  const a = Math.abs(n);
  return `${n < 0 ? "-" : ""}${a >= 1000 ? `${(a / 1000).toFixed(1)}k` : String(Math.round(a * 10) / 10)}`;
};
const ratioText = (n) => (Number.isFinite(n) ? n.toFixed(2) : "\u221e");
const toneOf = (n) => (n > 0 ? palette.green : n < 0 ? palette.red : palette.text);
const alphaHex = (a) => Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, "0");
const numOrNaN = (v) => (v === null || v === undefined || v === "" ? NaN : Number(v));

// Trades are enriched once: R-multiple (from entry, stop and exit), the money risked, first mistake tag, day and grade.
function gradeOf(t, medRisk) {
  let p = 0;
  if (t._hasStop) p += 25;
  if (!t._mist) p += 30;
  if (t._hasStop && medRisk && t._risk && t._risk <= medRisk * 1.5) p += 20;
  if (t.note && String(t.note).length > 3) p += 10;
  if (!t.rate || Number(t.rate) >= 3) p += 15;
  return p >= 90 ? "A" : p >= 75 ? "B" : p >= 60 ? "C" : p >= 40 ? "D" : "F";
}

function enrich(trades) {
  const base = trades
    .filter((t) => t && Number.isFinite(t.pnl))
    .slice()
    .sort((a, b) => (a.ts || 0) - (b.ts || 0))
    .map((t) => {
      const e = numOrNaN(t.e);
      const s = numOrNaN(t.s);
      const x = numOrNaN(t.x);
      const hasStop = Number.isFinite(e) && Number.isFinite(s) && e !== s;
      const r = hasStop && Number.isFinite(x) ? ((s < e ? 1 : -1) * (x - e)) / Math.abs(e - s) : null;
      const risk = r !== null && Math.abs(r) > 0.05 ? Math.abs(t.pnl) / Math.abs(r) : null;
      const mist = Array.isArray(t.mist) ? t.mist.filter(Boolean) : [];
      return { ...t, _r: r, _risk: risk, _hasStop: hasStop, _mist: mist[0] || "", _day: dayKey(t.ts || 0) };
    });
  const risks = base.map((t) => t._risk).filter(Boolean).sort((a, b) => a - b);
  const med = risks.length ? risks[Math.floor(risks.length / 2)] : 0;
  return base.map((t) => ({ ...t, _grade: gradeOf(t, med) }));
}

function pfStats(ts) {
  const o = { n: ts.length, w: 0, l: 0, gp: 0, gl: 0, tot: 0, best: null, worst: null, mw: 0, ml: 0, cw: 0, cl: 0, eq: 0, pk: 0, dd: 0, mist: 0, cc: 0, mcc: 0, rs: [] };
  ts.forEach((t) => {
    o.tot += t.pnl;
    if (t.pnl > 0) {
      o.w++;
      o.gp += t.pnl;
      o.cw++;
      o.cl = 0;
      if (o.cw > o.mw) o.mw = o.cw;
    } else if (t.pnl < 0) {
      o.l++;
      o.gl -= t.pnl;
      o.cl++;
      o.cw = 0;
      if (o.cl > o.ml) o.ml = o.cl;
    } else {
      o.cw = 0;
      o.cl = 0;
    }
    if (!o.best || t.pnl > o.best.pnl) o.best = t;
    if (!o.worst || t.pnl < o.worst.pnl) o.worst = t;
    o.eq += t.pnl;
    if (o.eq > o.pk) o.pk = o.eq;
    if (o.pk - o.eq > o.dd) o.dd = o.pk - o.eq;
    if (t._mist) {
      o.mist++;
      o.cc = 0;
    } else {
      o.cc++;
      if (o.cc > o.mcc) o.mcc = o.cc;
    }
    if (t._r !== null) o.rs.push(t._r);
  });
  o.aw = o.w ? o.gp / o.w : 0;
  o.al = o.l ? o.gl / o.l : 0;
  o.pf = o.gl ? o.gp / o.gl : o.gp ? Infinity : 0;
  o.wr = o.n ? (o.w / o.n) * 100 : 0;
  o.exp = o.n ? o.tot / o.n : 0;
  o.po = o.al ? o.aw / o.al : 0;
  o.rf = o.dd ? o.tot / o.dd : o.tot > 0 ? Infinity : 0;
  return o;
}

function cleanDays(ts) {
  const m = {};
  const ks = [];
  ts.forEach((t) => {
    if (!(t._day in m)) {
      m[t._day] = true;
      ks.push(t._day);
    }
    if (t._mist) m[t._day] = false;
  });
  ks.sort();
  let best = 0;
  let run = 0;
  ks.forEach((k) => {
    if (m[k]) {
      run++;
      if (run > best) best = run;
    } else run = 0;
  });
  let cur = 0;
  for (let i = ks.length - 1; i >= 0 && m[ks[i]]; i--) cur++;
  return { cur, best };
}

function normCdf(x) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}

function holdBucket(ms) {
  const m = Number(ms) / 60000;
  if (ms === null || ms === undefined || ms === "" || !Number.isFinite(m)) return "";
  return m < 15 ? "Scalp (<15m)" : m < 60 ? "15-60 min" : m < 240 ? "1-4 hours" : m < 1440 ? "Intraday (4h+)" : "Swing (1d+)";
}

const ARCHETYPES = {
  Discipline: ["Monk", "Rules first, emotions last."],
  Planning: ["Architect", "Every trade has a plan."],
  Edge: ["Sniper", "Few shots, big payoff."],
  Stability: ["Machine", "Steady, repeatable results."],
  Patience: ["Hunter", "You wait for the right moment."],
  Mindset: ["Zen Master", "Calm under pressure."],
};
const DNA_TIPS = {
  Discipline: "Remove the tagged mistakes first. They are your cheapest gains.",
  Planning: "Always log a stop so every trade has an R.",
  Edge: "Drop your weakest setups and test it against your breakdown.",
  Stability: "Size down on bad days and protect your green days.",
  Patience: "Cap trades per day. Your later trades pay less.",
  Mindset: "Skip trades when anxious or bored.",
};

function dnaScores(d, moodLabel) {
  const n = d.length;
  let gp = 0;
  let gl = 0;
  let mist = 0;
  let stops = 0;
  let emT = 0;
  let emG = 0;
  const dd = {};
  const nd = {};
  d.forEach((t) => {
    if (t.pnl > 0) gp += t.pnl;
    else if (t.pnl < 0) gl -= t.pnl;
    if (t._mist) mist++;
    if (t._hasStop) stops++;
    if (t.emotion) {
      emT++;
      if (/calm|confident|good/i.test(moodLabel(t.emotion))) emG++;
    }
    dd[t._day] = (dd[t._day] || 0) + t.pnl;
    nd[t._day] = (nd[t._day] || 0) + 1;
  });
  const dk = Object.keys(dd);
  const greenDays = dk.filter((k) => dd[k] > 0).length;
  const pf = gl ? gp / gl : gp ? 3 : 0;
  const perDay = n / dk.length;
  const c = (x) => Math.max(0, Math.min(100, Math.round(x)));
  return [
    ["Discipline", c(100 - (mist / n) * 100)],
    ["Planning", c((stops / n) * 100)],
    ["Edge", c((pf / 2.5) * 100)],
    ["Stability", c((greenDays / dk.length) * 100)],
    ["Patience", c(100 - (perDay - 1) * 22)],
    ["Mindset", emT ? c((emG / emT) * 100) : 50],
  ];
}

// ───────────────────────── small UI pieces (all use the app palette) ─────────────────────────

function SectionHeading({ children, hint }) {
  return (
    <div className="mt-8 mb-3">
      <h3 style={{ color: palette.text, fontFamily: display, fontSize: "15px", fontWeight: 700, margin: 0 }}>{children}</h3>
      {hint && (
        <p className="text-xs" style={{ color: palette.textFaint, marginTop: "2px" }}>
          {hint}
        </p>
      )}
    </div>
  );
}

function Card({ children, style }) {
  return (
    <div style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow, borderRadius: "20px", padding: "18px", minWidth: 0, ...style }}>
      {children}
    </div>
  );
}

function Badge({ children, tone }) {
  const c = tone === "good" ? palette.green : tone === "bad" ? palette.red : palette.textMuted;
  return (
    <span style={{ fontFamily: mono, fontSize: "9.5px", fontWeight: 700, color: c, border: `1px solid ${c}`, borderRadius: "999px", padding: "2px 8px", whiteSpace: "nowrap", flexShrink: 0 }}>
      {children}
    </span>
  );
}

function Head({ title, badge }) {
  return (
    <div className="flex items-center justify-between" style={{ gap: "8px", marginBottom: "12px" }}>
      <span style={{ color: palette.textFaint, fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>{title}</span>
      {badge}
    </div>
  );
}

function Big({ children, color }) {
  return <div style={{ fontFamily: display, fontSize: "30px", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1, color: color || palette.text }}>{children}</div>;
}

function Note({ children, style }) {
  return <div style={{ color: palette.textMuted, fontSize: "12px", lineHeight: 1.5, marginTop: "6px", ...style }}>{children}</div>;
}

function Empty({ children }) {
  return (
    <p className="text-xs" style={{ color: palette.textFaint, textAlign: "center", padding: "14px 6px", margin: 0 }}>
      {children}
    </p>
  );
}

function Tile({ label, value, color }) {
  return (
    <div style={{ background: palette.field, borderRadius: "12px", padding: "10px 12px", minWidth: 0 }}>
      <div style={{ color: palette.textFaint, fontSize: "11px" }}>{label}</div>
      <div className="truncate" style={{ fontFamily: mono, fontSize: "16px", fontWeight: 700, color: color || palette.text, marginTop: "2px" }}>
        {value}
      </div>
    </div>
  );
}

function Kpi({ label, value, color }) {
  return (
    <div style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow, borderRadius: "16px", padding: "12px 14px", minWidth: 0 }}>
      <div style={{ color: palette.textFaint, fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</div>
      <div className="truncate" style={{ fontFamily: mono, fontSize: "17px", fontWeight: 700, color: color || palette.text, marginTop: "4px" }}>
        {value}
      </div>
    </div>
  );
}

function HBar({ label, value, max, color, text }) {
  return (
    <div style={{ margin: "10px 0" }}>
      <div className="flex items-baseline justify-between" style={{ fontSize: "13px", gap: "8px", marginBottom: "5px" }}>
        <span className="truncate" style={{ color: palette.textMuted, minWidth: 0 }}>{label}</span>
        <span style={{ fontFamily: mono, fontWeight: 700, color: palette.text, flexShrink: 0 }}>{text}</span>
      </div>
      <div style={{ height: "8px", borderRadius: "999px", background: palette.field, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${Math.max(2, Math.min(100, (value / (max || 1)) * 100))}%`, background: color, borderRadius: "999px" }} />
      </div>
    </div>
  );
}

function Chips({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap" style={{ gap: "6px" }}>
      {options.map(([id, label]) => {
        const on = id === value;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={`rounded-full ${TAP}`}
            style={{
              background: on ? palette.gold : palette.field,
              color: on ? palette.letterbox : palette.textMuted,
              border: `1px solid ${on ? palette.gold : palette.border}`,
              fontFamily: display,
              fontSize: "12.5px",
              fontWeight: on ? 700 : 500,
              padding: "6px 13px",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function AreaChart({ pts, color, h = 90, line }) {
  const uid = useId().replace(/:/g, "");
  if (pts.length < 2) return <Empty>Log a couple of trades to see the curve.</Empty>;
  const mn = Math.min(...pts);
  const mx = Math.max(...pts);
  const rg = mx - mn || 1;
  const y = (v) => (h - 8 - ((v - mn) / rg) * (h - 18)).toFixed(1);
  const xy = pts.map((v, i) => `${((i / (pts.length - 1)) * 300).toFixed(1)},${y(v)}`).join(" ");
  const zy = Math.max(2, Math.min(h - 2, Number(y(0)))).toFixed(1);
  return (
    <svg viewBox={`0 0 300 ${h}`} preserveAspectRatio="none" role="img" aria-label="Chart" style={{ width: "100%", height: `${h}px`, display: "block" }}>
      <defs>
        <linearGradient id={`ag-${uid}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.4" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1="0" x2="300" y1={zy} y2={zy} stroke={color} strokeOpacity="0.35" strokeDasharray="3" vectorEffect="non-scaling-stroke" />
      <polygon points={`0,${h} ${xy} 300,${h}`} fill={`url(#ag-${uid})`} />
      <polyline fill="none" stroke={color} strokeWidth={line || 2.2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" points={xy} />
    </svg>
  );
}

function Gauge({ value, max, color }) {
  const p = Math.max(0, Math.min(1, value / max));
  const L = 141.4;
  return (
    <svg viewBox="0 0 110 62" style={{ width: "140px", flex: "none" }} role="img" aria-label="Gauge">
      <path d="M10 56 A45 45 0 0 1 100 56" fill="none" stroke={palette.field} strokeWidth="10" strokeLinecap="round" />
      <path d="M10 56 A45 45 0 0 1 100 56" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(p * L).toFixed(1)} ${L}`} />
    </svg>
  );
}

function Ring({ pct, size = 96 }) {
  return (
    <svg viewBox="0 0 36 36" style={{ width: `${size}px`, height: `${size}px`, flex: "none" }} role="img" aria-label="Win rate">
      <circle cx="18" cy="18" r="15.9" fill="none" stroke={palette.field} strokeWidth="4" />
      <circle cx="18" cy="18" r="15.9" fill="none" stroke={palette.green} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${pct.toFixed(1)} 100`} transform="rotate(-90 18 18)" />
      <text x="18" y="21" textAnchor="middle" fontSize="8" fontWeight="800" fill={palette.text}>{pct.toFixed(0)}%</text>
    </svg>
  );
}

function StreakBars({ ts }) {
  const a = ts.slice(-60);
  const w = 6;
  const H = 44;
  const m = H / 2;
  const mx = Math.max(...a.map((t) => Math.abs(t.pnl))) || 1;
  return (
    <svg viewBox={`0 0 ${a.length * w} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: "64px", display: "block" }} role="img" aria-label="P&L per trade">
      {a.map((t, i) => {
        const ht = Math.max(2, (Math.abs(t.pnl) / mx) * (m - 2));
        return <rect key={i} x={i * w + 0.5} y={t.pnl >= 0 ? m - ht : m} width={w - 1.2} height={ht} rx="1.5" fill={t.pnl > 0 ? palette.green : t.pnl < 0 ? palette.red : palette.textFaint} />;
      })}
      <line x1="0" x2={a.length * w} y1={m} y2={m} stroke={palette.border} />
    </svg>
  );
}

function Radar({ scores }) {
  const cx = 110;
  const cy = 110;
  const R = 78;
  const n = scores.length;
  const pt = (i, r) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [(cx + Math.cos(a) * r).toFixed(1), (cy + Math.sin(a) * r).toFixed(1)];
  };
  return (
    <svg viewBox="0 0 220 220" style={{ width: "100%", maxWidth: "300px", margin: "0 auto", display: "block" }} role="img" aria-label="Trader DNA radar">
      {[0.33, 0.66, 1].map((f) => (
        <polygon key={f} points={scores.map((s, i) => pt(i, R * f).join(",")).join(" ")} fill="none" stroke={palette.border} />
      ))}
      {scores.map((s, i) => (
        <line key={s[0]} x1={cx} y1={cy} x2={pt(i, R)[0]} y2={pt(i, R)[1]} stroke={palette.border} />
      ))}
      <polygon points={scores.map((s, i) => pt(i, (R * s[1]) / 100).join(",")).join(" ")} fill={palette.gold} fillOpacity="0.28" stroke={palette.gold} strokeWidth="2" />
      {scores.map((s, i) => {
        const q = pt(i, R + 16);
        return (
          <text key={s[0]} x={q[0]} y={q[1]} textAnchor="middle" fontSize="9" fill={palette.textMuted}>
            {s[0]}
          </text>
        );
      })}
    </svg>
  );
}

// ───────────────────────── main component ─────────────────────────

function OverviewPanel({ trades, customSetups, customMoods, isDesktop }) {
  const myPlan = useMyPlan();
  const [range, setRange] = useState("all");
  const [group, setGroup] = useState("setup");

  const data = useMemo(() => enrich(trades), [trades]);
  const moodLabel = (id) => (emotionMeta(id) || (customMoods || []).find((x) => x.id === id) || {}).label || "";

  // "What your trades say" findings, same maths as before.
  const findings = useMemo(() => {
    const setupLabel = (id) => [...SETUPS, ...(customSetups || [])].find((x) => x.id === id)?.label;
    const sessionLabel = (id) => MARKET_SESSIONS.find((x) => x.id === id)?.label;
    const moodMeta = (id) => emotionMeta(id) || (customMoods || []).find((x) => x.id === id);
    const setupRows = bySetup(trades, setupLabel);
    const sessionRows = bySession(trades, sessionLabel);
    const moodRows = byMood(trades, moodMeta);
    const pairRows = byPair(trades);
    const dayRows = byWeekday(trades);
    const directionRows = byDirection(trades);
    const confRows = byConfidence(trades);
    return findPatterns(trades, { setupRows, sessionRows, moodRows, pairRows, dayRows, confRows, directionRows }, fmtMoney);
  }, [trades, customSetups, customMoods]);

  const cols = (n, mobile = 1) => ({
    display: "grid",
    gap: "16px",
    gridTemplateColumns: `repeat(${isDesktop ? n : mobile}, minmax(0, 1fr))`,
    alignItems: "start",
  });

  if (!data.length) {
    return (
      <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
        No trades yet. Insights appear once you start logging trades in the Journal tab.
      </p>
    );
  }

  // ── Performance report (range-filtered) ──
  const cutoff = range === "all" ? 0 : Date.now() - Number(range) * 86400000;
  const ts = range === "all" ? data : data.filter((t) => (t.ts || 0) >= cutoff);
  const S = pfStats(ts);
  const rangeLabel = { all: "All time", 90: "Last 90 days", 30: "Last 30 days", 7: "Last 7 days" }[range];

  // ── All-time stats for the overview and DNA sections ──
  const A = pfStats(data);

  const perfCards = [];
  if (S.n) {
    const pfc = S.pf >= 1.5 ? palette.green : S.pf >= 1 ? palette.gold : palette.red;
    perfCards.push(
      <Card key="pf">
        <Head title="Profit factor" badge={S.pf >= 2 ? <Badge tone="good">EXCELLENT</Badge> : S.pf >= 1.5 ? <Badge tone="good">GOOD</Badge> : S.pf >= 1.1 ? <Badge>FAIR</Badge> : S.pf >= 1 ? <Badge>MARGINAL</Badge> : <Badge tone="bad">LOSING</Badge>} />
        <div className="flex items-center justify-between" style={{ gap: "12px" }}>
          <div style={{ minWidth: 0 }}>
            <Big>{ratioText(S.pf)}</Big>
            <Note>Gross profit {usd(S.gp)}<br />÷ gross loss {usd(S.gl)}</Note>
          </div>
          <Gauge value={Math.min(S.pf, 3)} max={3} color={pfc} />
        </div>
      </Card>
    );

    const W = Math.max(5, Math.min(20, Math.floor(S.n / 3)));
    const rolling = [];
    if (S.n >= W + 3) {
      for (let i = W; i <= S.n; i++) {
        let sm = 0;
        for (let j = i - W; j < i; j++) sm += ts[j].pnl;
        rolling.push(sm / W);
      }
    }
    const eR = S.rs.length ? S.rs.reduce((a, b) => a + b, 0) / S.rs.length : null;
    perfCards.push(
      <Card key="exp">
        <Head title="Expectancy" badge={S.exp > 0 ? <Badge tone="good">POSITIVE EDGE</Badge> : <Badge tone="bad">NEGATIVE</Badge>} />
        <Big color={toneOf(S.exp)}>
          {usd(S.exp)}
          <span style={{ fontSize: "13px", fontWeight: 600, color: palette.textMuted }}> per trade</span>
        </Big>
        <Note>{eR !== null ? `${eR.toFixed(2)}R per trade, ` : ""}average over {S.n} trades</Note>
        {rolling.length > 1 && (
          <div style={{ marginTop: "10px" }}>
            <AreaChart pts={rolling} color={S.exp >= 0 ? palette.green : palette.red} h={56} />
            <Note style={{ marginTop: "2px" }}>Rolling {W}-trade expectancy</Note>
          </div>
        )}
      </Card>
    );

    const be = S.po ? 100 / (1 + S.po) : null;
    perfCards.push(
      <Card key="wr">
        <Head title="Win rate & win/loss ratio" badge={<Badge>{S.w}W · {S.l}L</Badge>} />
        <div className="flex items-center" style={{ gap: "14px" }}>
          <Ring pct={S.wr} />
          <div className="flex-1 grid gap-2" style={{ gridTemplateColumns: "1fr", minWidth: 0 }}>
            <Tile label="Win / loss ratio" value={S.l ? `${(S.w / S.l).toFixed(2)} : 1` : "\u221e"} />
            <Tile label="Break-even win rate" value={be === null ? "N/A" : `${be.toFixed(0)}%`} />
          </div>
        </div>
      </Card>
    );

    const mxw = Math.max(S.aw, S.al) || 1;
    perfCards.push(
      <Card key="aw">
        <Head title="Average win vs average loss" badge={<Badge tone={S.po >= 1 ? "good" : "bad"}>PAYOFF {S.po.toFixed(2)}</Badge>} />
        <HBar label="Average win" value={S.aw} max={mxw} color={palette.green} text={usd(S.aw)} />
        <HBar label="Average loss" value={S.al} max={mxw} color={palette.red} text={`-${usd(S.al)}`} />
        <Note>{S.al ? `Your average win is ${S.po.toFixed(2)}x your average loss.` : "No losing trades in this range."}</Note>
      </Card>
    );

    const bw = S.best ? Math.max(0, S.best.pnl) : 0;
    const wl = S.worst ? Math.min(0, S.worst.pnl) : 0;
    const mxl = Math.max(bw, Math.abs(wl)) || 1;
    perfCards.push(
      <Card key="lw">
        <Head title="Largest win & largest loss" />
        <HBar label={`Largest win${bw && S.best.pair ? ` · ${S.best.pair}` : ""}`} value={bw} max={mxl} color={palette.green} text={usd(bw)} />
        <HBar label={`Largest loss${wl && S.worst.pair ? ` · ${S.worst.pair}` : ""}`} value={Math.abs(wl)} max={mxl} color={palette.red} text={usd(wl)} />
        <Note>
          {S.gp && bw ? `Your best trade is ${((bw / S.gp) * 100).toFixed(0)}% of gross profit. ` : ""}
          {wl && bw ? `Worst loss is ${(Math.abs(wl) / bw).toFixed(2)}x your best win.` : ""}
        </Note>
      </Card>
    );

    const under = [0];
    let q = 0;
    let pk = 0;
    ts.forEach((t) => {
      q += t.pnl;
      if (q > pk) pk = q;
      under.push(q - pk);
    });
    perfCards.push(
      <Card key="dd">
        <Head title="Drawdown & recovery" badge={S.rf >= 3 ? <Badge tone="good">STRONG RECOVERY</Badge> : S.rf >= 1 ? <Badge>OK</Badge> : <Badge tone="bad">WEAK</Badge>} />
        <div className="grid grid-cols-2 gap-2">
          <Tile label="Max drawdown" value={`-${usd(S.dd)}`} color={S.dd ? palette.red : undefined} />
          <Tile label="Recovery factor" value={ratioText(S.rf)} color={S.rf >= 1 ? palette.green : palette.red} />
          <Tile label="Current drawdown" value={`-${usd(S.pk - S.eq)}`} color={S.pk - S.eq > 0 ? palette.red : undefined} />
          <Tile label="Net profit" value={usd(S.tot)} color={toneOf(S.tot)} />
        </div>
        <div style={{ marginTop: "10px" }}>
          <AreaChart pts={under} color={palette.red} h={70} />
        </div>
        <Note>Recovery factor = net profit ÷ max drawdown. Above 3 is strong.</Note>
      </Card>
    );

    perfCards.push(
      <Card key="st">
        <Head title="Streaks" badge={<Badge tone={S.cl ? "bad" : S.cw ? "good" : undefined}>{S.cl ? `CURRENT: ${S.cl} L` : S.cw ? `CURRENT: ${S.cw} W` : "NONE"}</Badge>} />
        <div className="grid grid-cols-2 gap-2">
          <Tile label="Best win streak" value={S.mw} color={palette.green} />
          <Tile label="Worst loss streak" value={S.ml} color={palette.red} />
        </div>
        <div style={{ marginTop: "10px" }}>
          <StreakBars ts={ts} />
        </div>
        <Note>Bar height = P&amp;L per trade, last {Math.min(60, S.n)} trades</Note>
      </Card>
    );

    const dc = cleanDays(ts);
    const last = ts.slice(-60);
    perfCards.push(
      <Card key="dis">
        <Head title="Discipline streaks" badge={<Badge tone={S.mist / S.n < 0.15 ? "good" : undefined}>{(100 - (S.mist / S.n) * 100).toFixed(0)}% CLEAN</Badge>} />
        <div className="grid grid-cols-2 gap-2">
          <Tile label="Clean trades streak" value={S.cc} color={S.cc >= 5 ? palette.green : undefined} />
          <Tile label="Best clean trades" value={S.mcc} color={palette.green} />
          <Tile label="Clean days streak" value={dc.cur} />
          <Tile label="Best clean days" value={dc.best} />
        </div>
        <div className="flex flex-wrap" style={{ gap: "3px", marginTop: "10px" }}>
          {last.map((t, i) => (
            <span key={i} title={t._day} style={{ width: "12px", height: "12px", borderRadius: "3px", background: t._mist ? palette.red : palette.green }} />
          ))}
        </div>
        <Note>Clean = a trade with no mistake tag. Last {last.length} trades: green clean, red mistake.</Note>
      </Card>
    );
  }

  // This month vs last month (always from all trades)
  const now = new Date();
  const thisKey = monthKey(now.getTime());
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastKey = monthKey(prev.getTime());
  const MA = pfStats(data.filter((t) => monthKey(t.ts || 0) === lastKey));
  const MB = pfStats(data.filter((t) => monthKey(t.ts || 0) === thisKey));
  const lastName = prev.toLocaleString("en", { month: "short" });
  const thisName = now.toLocaleString("en", { month: "short" });
  const cmpRows = [
    ["Net P&L", MA.tot, MB.tot, usd, 1],
    ["Trades", MA.n, MB.n, String, 0],
    ["Win rate", MA.wr, MB.wr, (v) => `${v.toFixed(0)}%`, 1],
    ["Profit factor", MA.pf, MB.pf, ratioText, 1],
    ["Avg win", MA.aw, MB.aw, usd, 1],
    ["Avg loss", MA.al, MB.al, usd, -1],
    ["Largest win", MA.best ? MA.best.pnl : 0, MB.best ? MB.best.pnl : 0, usd, 1],
    ["Largest loss", MA.worst ? MA.worst.pnl : 0, MB.worst ? MB.worst.pnl : 0, usd, 1],
    ["Mistakes", MA.mist, MB.mist, String, -1],
  ];
  const mxm = Math.max(Math.abs(MA.tot), Math.abs(MB.tot)) || 1;
  const monthCard = (
    <Card key="month">
      <Head title="This month vs last month" badge={<Badge>{thisName} vs {lastName}</Badge>} />
      {(MA.n > 0 || MB.n > 0) && (
        <>
          <HBar label={lastName} value={Math.abs(MA.tot)} max={mxm} color={MA.tot >= 0 ? palette.green : palette.red} text={usd(MA.tot)} />
          <HBar label={thisName} value={Math.abs(MB.tot)} max={mxm} color={MB.tot >= 0 ? palette.green : palette.red} text={usd(MB.tot)} />
        </>
      )}
      <div style={{ overflowX: "auto", marginTop: "6px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
          <thead>
            <tr style={{ color: palette.textFaint, fontSize: "11px" }}>
              <th style={{ textAlign: "left", padding: "7px 4px", fontWeight: 700 }} />
              <th style={{ textAlign: "right", padding: "7px 4px", fontWeight: 700 }}>{lastName}</th>
              <th style={{ textAlign: "right", padding: "7px 4px", fontWeight: 700 }}>{thisName}</th>
              <th style={{ textAlign: "right", padding: "7px 4px", fontWeight: 700 }}>Change</th>
            </tr>
          </thead>
          <tbody>
            {cmpRows.map(([label, a, b, f, dir]) => {
              let ch = "-";
              let c = palette.textFaint;
              if (MA.n && MB.n && Number.isFinite(a) && Number.isFinite(b)) {
                const df = b - a;
                if (df === 0) ch = "=";
                else {
                  const good = dir === 0 ? 0 : (df > 0 ? 1 : -1) * dir;
                  c = good > 0 ? palette.green : good < 0 ? palette.red : palette.textMuted;
                  ch = `${df > 0 ? "\u25B2" : "\u25BC"} ${f === usd ? usd(Math.abs(df)) : f === ratioText ? Math.abs(df).toFixed(2) : label === "Win rate" ? `${Math.abs(df).toFixed(0)} pts` : Math.abs(df)}`;
                }
              }
              return (
                <tr key={label} style={{ borderTop: `1px solid ${palette.border}` }}>
                  <td style={{ padding: "8px 4px", color: palette.textMuted }}>{label}</td>
                  <td style={{ padding: "8px 4px", textAlign: "right", fontFamily: mono, color: palette.textMuted }}>{MA.n ? f(a) : "-"}</td>
                  <td style={{ padding: "8px 4px", textAlign: "right", fontFamily: mono, color: palette.text, fontWeight: 700 }}>{MB.n ? f(b) : "-"}</td>
                  <td style={{ padding: "8px 4px", textAlign: "right", fontFamily: mono, color: c }}>{ch}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!MA.n && <Note>No trades logged last month yet.</Note>}
    </Card>
  );
  perfCards.push(monthCard);

  // ── Overview extras ──
  const mistakeTrades = data.filter((t) => t._mist);
  const mistakeCost = mistakeTrades.reduce((s, t) => s + t.pnl, 0);
  const kelly = A.w && A.l ? A.wr / 100 - (1 - A.wr / 100) / A.po : null;

  // ── Breakdown ──
  const setupLabel = (id) => [...SETUPS, ...(customSetups || [])].find((x) => x.id === id)?.label || "";
  const sessionLabel = (id) => MARKET_SESSIONS.find((x) => x.id === id)?.label || "";
  const GROUPS = [
    ["setup", "Setup", (t) => setupLabel(t.setup)],
    ["pair", "Symbol", (t) => t.pair || ""],
    ["wd", "Weekday", (t) => WEEKDAYS[new Date(t.ts || 0).getDay()]],
    ["side", "Side", (t) => (/^(up|buy|long)$/i.test(t.direction || "") ? "Long" : /^(down|sell|short)$/i.test(t.direction || "") ? "Short" : "")],
    ["mistake", "Mistake", (t) => t._mist || "Clean"],
    ["mood", "Mood", (t) => (t.emotion ? moodLabel(t.emotion) : "")],
    ["session", "Session", (t) => sessionLabel(t.session)],
    ["month", "Month", (t) => monthKey(t.ts || 0)],
    ["hold", "Hold time", (t) => holdBucket(t.holdMs)],
    ["hour", "Hour", (t) => `${pad2(new Date(t.openTs || t.ts || 0).getHours())}:00`],
    ["grade", "Grade", (t) => t._grade],
  ];
  const keyFn = (GROUPS.find((g) => g[0] === group) || GROUPS[0])[2];
  const groups = {};
  data.forEach((t) => {
    const k = keyFn(t) || "Untagged";
    const o = groups[k] || (groups[k] = { n: 0, pnl: 0, w: 0 });
    o.n++;
    o.pnl += t.pnl;
    if (t.pnl > 0) o.w++;
  });
  const groupKeys = Object.keys(groups).sort((a, b) => groups[b].pnl - groups[a].pnl);
  const maxGroup = Math.max(...groupKeys.map((k) => Math.abs(groups[k].pnl))) || 1;

  // ── R-multiple distribution ──
  const rs = data.filter((t) => t._r !== null).map((t) => t._r);
  const R_BUCKETS = [["\u2264-2", -1e9, -2], ["-2…-1", -2, -1], ["-1…0", -1, 0], ["0…1", 0, 1], ["1…2", 1, 2], ["2…3", 2, 3], [">3", 3, 1e9]];
  const rCounts = R_BUCKETS.map((b) => rs.filter((r) => r > b[1] && r <= b[2]).length);
  const rMax = Math.max(...rCounts) || 1;

  // ── Drawdown curve (all trades) ──
  const ddPts = [0];
  {
    let e = 0;
    let p = 0;
    data.forEach((t) => {
      e += t.pnl;
      if (e > p) p = e;
      ddPts.push(e - p);
    });
  }

  // ── Is your edge real? ──
  let sig = null;
  if (data.length >= 15) {
    const n = data.length;
    const mean = A.tot / n;
    const v = data.reduce((s, t) => s + (t.pnl - mean) * (t.pnl - mean), 0);
    const sd = Math.sqrt(v / (n - 1));
    const tv = sd ? mean / (sd / Math.sqrt(n)) : 0;
    const conf = normCdf(tv) * 100;
    const need = mean > 0 && sd ? Math.ceil(Math.pow((1.645 * sd) / mean, 2)) : 0;
    sig = { n, conf, need };
  }

  // ── Risk consistency ──
  const riskList = data.filter((t) => t._risk).slice(-40);
  let rc = null;
  if (riskList.length >= 5) {
    const avg = riskList.reduce((s, t) => s + t._risk, 0) / riskList.length;
    const sd = Math.sqrt(riskList.reduce((s, t) => s + (t._risk - avg) * (t._risk - avg), 0) / riskList.length);
    const mx = Math.max(...riskList.map((t) => t._risk));
    const big = riskList.filter((t) => t._risk > avg * 2);
    rc = { avg, mx, big, bigPnl: big.reduce((s, t) => s + t.pnl, 0), score: Math.max(0, Math.round(100 - (sd / avg) * 100)) };
  }

  // ── Best hours ──
  const hours = {};
  data.forEach((t) => {
    const h = new Date(t.openTs || t.ts || 0).getHours();
    const o = hours[h] || (hours[h] = { n: 0, p: 0 });
    o.n++;
    o.p += t.pnl;
  });
  const hourKeys = Object.keys(hours);
  const hourMax = Math.max(...hourKeys.map((k) => Math.abs(hours[k].p))) || 1;
  const hourSorted = hourKeys.slice().sort((a, b) => hours[b].p - hours[a].p);

  // ── DNA ──
  const dna = data.length >= 10 ? dnaScores(data, moodLabel) : null;
  let dnaView = null;
  if (dna) {
    const srt = dna.slice().sort((a, b) => b[1] - a[1]);
    dnaView = { strong: srt[0], weak: srt[srt.length - 1], avg: Math.round(dna.reduce((a, b) => a + b[1], 0) / dna.length) };
  }
  let edgeRoll = null;
  if (data.length >= 25) {
    const W = 20;
    const r = [];
    for (let i = W; i <= data.length; i++) {
      let sm = 0;
      for (let j = i - W; j < i; j++) sm += data[j].pnl;
      r.push(sm / W);
    }
    const now20 = r[r.length - 1];
    const all = r.reduce((a, b) => a + b, 0) / r.length;
    edgeRoll = { r, now20, text: now20 > all * 1.1 ? "Edge improving" : now20 < all * 0.9 ? "Edge fading. Review recent trades." : "Edge stable" };
  }

  return (
    <>
      {/* ───────── What your trades say ───────── */}
      <SectionHeading hint="The clearest things your own trades are telling you right now.">What your trades say</SectionHeading>
      {hasFeature(myPlan.plan, "journalInsights") ? (
        findings.length > 0 ? (
          <div style={cols(2)}>
            {findings.map((f, i) => (
              <div
                key={i}
                style={{
                  background: palette.surface,
                  border: `1px solid ${palette.border}`,
                  borderLeft: `4px solid ${f.tone === "good" ? palette.green : palette.red}`,
                  boxShadow: palette.shadow,
                  borderRadius: "20px",
                  padding: "16px",
                }}
              >
                <div style={{ color: palette.text, fontSize: "14px", fontWeight: 700, marginBottom: "3px" }}>{f.title}</div>
                <div style={{ color: palette.textMuted, fontSize: "13px" }}>{f.detail}</div>
              </div>
            ))}
          </div>
        ) : (
          <Card>
            <p className="text-xs" style={{ color: palette.textFaint, margin: 0 }}>
              Nothing stands out yet. Findings need at least {FEW_TRADES} trades in a group and two groups to compare, so keep tagging setup, session and mood on each trade.
            </p>
          </Card>
        )
      ) : (
        <PlanLockCard title="Pattern insights" plan="pro" blurb="See which setups, sessions, directions and confidence levels make or lose you money." />
      )}

      {/* ───────── Performance ───────── */}
      <SectionHeading hint="Your performance report. Pick a range to focus it.">Performance</SectionHeading>
      <div style={{ marginBottom: "14px" }}>
        <Chips options={[["all", "All"], ["90", "90D"], ["30", "30D"], ["7", "7D"]]} value={range} onChange={setRange} />
      </div>
      {S.n === 0 ? (
        <Card>
          <Empty>No trades in this range.</Empty>
        </Card>
      ) : (
        <>
          <div
            style={{
              background: `linear-gradient(135deg, ${palette.gold}, ${palette.goldBright})`,
              color: palette.letterbox,
              borderRadius: "22px",
              padding: isDesktop ? "24px 28px 0" : "18px 18px 0",
              overflow: "hidden",
              boxShadow: palette.shadow,
              marginBottom: "16px",
            }}
          >
            <div className="flex items-end justify-between flex-wrap" style={{ gap: "12px" }}>
              <div>
                <div style={{ fontSize: "12px", fontWeight: 600, opacity: 0.75 }}>{rangeLabel}</div>
                <div style={{ fontFamily: display, fontSize: isDesktop ? "44px" : "36px", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1 }}>{usdS(S.tot)}</div>
              </div>
              <div style={{ fontSize: "13px", fontWeight: 600, opacity: 0.85, paddingBottom: "4px" }}>
                {S.n} trades · {S.wr.toFixed(0)}% win rate · profit factor {ratioText(S.pf)}
              </div>
            </div>
            <div style={{ margin: isDesktop ? "10px -28px 0" : "10px -18px 0" }}>
              <AreaChart pts={[0, ...ts.reduce((a, t) => (a.push((a.length ? a[a.length - 1] : 0) + t.pnl), a), [])]} color={palette.letterbox} h={isDesktop ? 110 : 70} />
            </div>
          </div>
        </>
      )}
      {S.n > 0 ? <div style={cols(2)}>{perfCards}</div> : <div style={{ ...cols(2), marginTop: "16px" }}>{monthCard}</div>}

      {/* ───────── Overview ───────── */}
      <SectionHeading hint="Everything across all of your logged trades.">Overview</SectionHeading>
      <div style={{ ...cols(3), gridTemplateColumns: isDesktop ? "minmax(0,1fr) minmax(0,2fr)" : "1fr" }}>
        <Card>
          <Head title="Win rate" />
          <div className="flex items-center" style={{ gap: "14px" }}>
            <Ring pct={A.wr} size={92} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: "13px", color: palette.textMuted }}>
                <span style={{ color: palette.green, fontWeight: 700 }}>{A.w} wins</span> · <span style={{ color: palette.red, fontWeight: 700 }}>{A.l} losses</span>
              </div>
              <div style={{ fontSize: "13px", color: palette.textMuted, marginTop: "4px" }}>
                Expectancy <b style={{ color: toneOf(A.tot), fontFamily: mono }}>{usd(A.exp)}</b> / trade
              </div>
            </div>
          </div>
        </Card>
        <div style={{ display: "grid", gap: "12px", gridTemplateColumns: `repeat(${isDesktop ? 4 : 2}, minmax(0, 1fr))` }}>
          <Kpi label="Best trade" value={usd(A.best ? A.best.pnl : 0)} color={palette.green} />
          <Kpi label="Worst trade" value={usd(A.worst ? A.worst.pnl : 0)} color={palette.red} />
          <Kpi label="Win streak" value={A.mw} />
          <Kpi label="Loss streak" value={A.ml} />
          <Kpi label="Discipline" value={`${(100 - (A.mist / A.n) * 100).toFixed(0)}%`} />
          <Kpi label="Mistakes cost" value={usd(mistakeCost)} color={mistakeCost < 0 ? palette.red : undefined} />
          <Kpi label="Payoff ratio" value={A.w && A.l ? A.po.toFixed(2) : "N/A"} />
          <Kpi label="Kelly %" value={kelly === null ? "N/A" : `${(kelly * 100).toFixed(0)}%`} color={kelly === null ? undefined : kelly > 0 ? palette.green : palette.red} />
        </div>
      </div>

      <SectionHeading hint="Net result for every way of slicing your trades.">Breakdown</SectionHeading>
      <Card>
        <div style={{ marginBottom: "14px" }}>
          <Chips options={GROUPS.map((g) => [g[0], g[1]])} value={group} onChange={setGroup} />
        </div>
        {groupKeys.map((k, i) => {
          const o = groups[k];
          const wd = (Math.abs(o.pnl) / maxGroup) * 50;
          const c = o.pnl >= 0 ? palette.green : palette.red;
          return (
            <div
              key={k}
              style={{
                display: "grid",
                gridTemplateColumns: isDesktop ? "minmax(140px, 1.2fr) 3fr 80px" : "minmax(88px, 1.2fr) 2fr 64px",
                gap: "12px",
                alignItems: "center",
                padding: "9px 0",
                borderTop: i === 0 ? "none" : `1px solid ${palette.border}`,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div className="truncate" style={{ color: palette.text, fontSize: "13px" }}>{k}</div>
                <div style={{ color: palette.textFaint, fontSize: "11px" }}>
                  {o.n} trade{o.n === 1 ? "" : "s"} · {((o.w / o.n) * 100).toFixed(0)}%{o.n < FEW_TRADES ? " · too few" : ""}
                </div>
              </div>
              <div style={{ position: "relative", height: "9px", borderRadius: "999px", background: palette.field, overflow: "hidden" }}>
                <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: "1px", background: palette.border }} />
                <div style={{ position: "absolute", top: 0, bottom: 0, borderRadius: "999px", background: c, [o.pnl >= 0 ? "left" : "right"]: "50%", width: `${Math.max(1.5, wd)}%` }} />
              </div>
              <div style={{ fontFamily: mono, fontSize: "13px", fontWeight: 700, color: c, textAlign: "right" }}>{compact(o.pnl)}</div>
            </div>
          );
        })}
      </Card>

      <div style={{ ...cols(2), marginTop: "16px" }}>
        <div>
          <SectionHeading hint="How big your wins and losses are, in multiples of what you risked.">R-multiple distribution</SectionHeading>
          <Card>
            {rs.length < 2 ? (
              <Empty>Log entry, stop and exit prices on trades to see R-multiples.</Empty>
            ) : (
              <div className="flex items-end" style={{ gap: "6px", height: "130px" }}>
                {R_BUCKETS.map((b, i) => (
                  <div key={b[0]} className="flex flex-col justify-end items-center" style={{ flex: 1, height: "100%", fontSize: "10px", color: palette.textFaint, gap: "3px" }}>
                    <span>{rCounts[i]}</span>
                    <div style={{ width: "100%", minHeight: "2px", height: `${(rCounts[i] / rMax) * 75}%`, borderRadius: "5px 5px 0 0", background: b[2] <= 0 ? palette.red : palette.green }} />
                    <span>{b[0]}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
        <div>
          <SectionHeading hint="How far you sit below your equity peak, trade by trade.">Drawdown</SectionHeading>
          <Card>
            <AreaChart pts={ddPts} color={palette.red} h={130} />
          </Card>
        </div>
      </div>

      <div style={{ ...cols(2), marginTop: "0" }}>
        <div>
          <SectionHeading hint="Could your results just be luck?">Is your edge real?</SectionHeading>
          <Card>
            {!sig ? (
              <Empty>Needs 15+ trades.</Empty>
            ) : (
              <>
                <Big color={sig.conf >= 90 ? palette.green : sig.conf >= 70 ? palette.text : palette.red}>{sig.conf.toFixed(0)}%</Big>
                <Note>
                  confidence that your true expectancy is above zero (from {sig.n} trades).
                  <br />
                  {sig.conf >= 95 ? "Statistically solid edge." : sig.conf >= 80 ? "Promising, but luck cannot be ruled out yet." : sig.conf >= 50 ? "Not enough evidence yet. These results could be luck." : "Evidence points to no edge so far."}
                  {sig.need > sig.n && (
                    <>
                      <br />
                      About <b style={{ color: palette.text }}>{sig.need}</b> trades at this rate would give 95% confidence.
                    </>
                  )}
                </Note>
              </>
            )}
          </Card>
        </div>
        <div>
          <SectionHeading hint="Do you size every trade the same?">Risk consistency</SectionHeading>
          <Card>
            {!rc ? (
              <Empty>Log entry, stop and exit prices on 5+ trades.</Empty>
            ) : (
              <>
                <div className="flex items-end" style={{ gap: "2px", height: "80px" }}>
                  {riskList.map((t, i) => (
                    <div key={i} style={{ flex: 1, borderRadius: "3px 3px 0 0", height: `${(t._risk / rc.mx) * 100}%`, background: t._risk > rc.avg * 2 ? palette.red : palette.gold }} />
                  ))}
                </div>
                <Note>
                  Sizing consistency <b style={{ color: palette.text }}>{rc.score}/100</b> across your last {riskList.length} trades.
                  {rc.big.length > 0 ? (
                    <>
                      {" "}{rc.big.length} oversized trade{rc.big.length > 1 ? "s" : ""} (over 2x normal risk) made <b style={{ color: toneOf(rc.bigPnl) }}>{usd(rc.bigPnl)}</b>.
                    </>
                  ) : (
                    " No oversized outliers."
                  )}
                </Note>
              </>
            )}
          </Card>
        </div>
      </div>

      <SectionHeading hint="Hours come from each trade's open time, or the time it was logged.">Best hours to trade</SectionHeading>
      <Card>
        {hourKeys.length < 2 ? (
          <Empty>Log more trades across different hours to see your best hours.</Empty>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${isDesktop ? 12 : 6}, minmax(0, 1fr))`, gap: "5px" }}>
              {Array.from({ length: 24 }, (_, i) => {
                const o = hours[i];
                const a = o ? Math.min(1, Math.abs(o.p) / hourMax) : 0;
                return (
                  <div
                    key={i}
                    style={{
                      borderRadius: "9px",
                      padding: "6px 0",
                      textAlign: "center",
                      fontSize: "10px",
                      color: o ? palette.text : palette.textFaint,
                      background: o ? `${o.p >= 0 ? palette.green : palette.red}${alphaHex(0.15 + a * 0.5)}` : palette.field,
                    }}
                  >
                    <b style={{ display: "block", fontSize: "11px" }}>{pad2(i)}</b>
                    {o ? compact(o.p) : "·"}
                  </div>
                );
              })}
            </div>
            <Note>
              Best hour <b style={{ color: palette.text }}>{pad2(Number(hourSorted[0]))}:00</b> ({compact(hours[hourSorted[0]].p)}), worst{" "}
              <b style={{ color: palette.text }}>{pad2(Number(hourSorted[hourSorted.length - 1]))}:00</b> ({compact(hours[hourSorted[hourSorted.length - 1]].p)}).
            </Note>
          </>
        )}
      </Card>

      {/* ───────── DNA ───────── */}
      <SectionHeading hint="Six scores that describe how you trade, built from your own log.">Trader DNA</SectionHeading>
      <div style={cols(2)}>
        <Card>
          {!dnaView ? (
            <Empty>Log 10+ trades to reveal your Trader DNA.</Empty>
          ) : (
            <>
              <Radar scores={dna} />
              <div style={{ textAlign: "center", marginTop: "6px" }}>
                <div style={{ fontSize: "12px", color: palette.textFaint }}>Your archetype</div>
                <div style={{ fontFamily: display, fontSize: "24px", fontWeight: 800, color: palette.text }}>{ARCHETYPES[dnaView.strong[0]][0]}</div>
                <div style={{ fontSize: "13px", color: palette.textMuted }}>
                  {ARCHETYPES[dnaView.strong[0]][1]} · DNA score <b style={{ color: palette.text }}>{dnaView.avg}</b>/100
                </div>
              </div>
              <div style={{ marginTop: "14px", fontSize: "13.5px", color: palette.text, lineHeight: 1.7 }}>
                Strength: <b>{dnaView.strong[0]} {dnaView.strong[1]}</b>
                <br />
                Biggest leak: <b>{dnaView.weak[0]} {dnaView.weak[1]}</b>
                <br />
                <span style={{ color: palette.textMuted }}>{DNA_TIPS[dnaView.weak[0]]}</span>
              </div>
            </>
          )}
        </Card>
        <Card>
          <Head title="Edge health" />
          {!edgeRoll ? (
            <Empty>Needs 25+ trades.</Empty>
          ) : (
            <>
              <AreaChart pts={edgeRoll.r} color={edgeRoll.now20 >= 0 ? palette.green : palette.red} h={isDesktop ? 200 : 100} />
              <Note>
                Rolling 20-trade expectancy: <b style={{ color: toneOf(edgeRoll.now20), fontFamily: mono }}>{usd(edgeRoll.now20)}</b> · {edgeRoll.text}
              </Note>
            </>
          )}
        </Card>
      </div>
    </>
  );
}


export default function InsightsTab(props) {
  const {
    coachChatId, coachChats, coachChatsMax, coachDeleteConfirmId, coachError, coachHistoryOpen, coachInput,
    coachLoading, coachMessages, coachRemaining, coachScrollRef, customMoods, customSetups, deleteCoachChat,
    expandedHeatmapDay, expandedMetric, exportInsightsReport, insightReportMsg, insightsSubTab: insightsSubTabProp,
    isDesktop, newCoachChat, openCoachChat, selectInsightsSubTab, sendCoachMessage, session,
    setCoachDeleteConfirmId, setCoachHistoryOpen, setCoachInput, trades,
  } = props;
  // "journal", "patterns" and "behavior" were separate tabs. They are part of Overview now.
  const insightsSubTab = insightsSubTabProp === "journal" || insightsSubTabProp === "patterns" || insightsSubTabProp === "behavior" ? "overview" : insightsSubTabProp;
  // ── Mascot reactions ───────────────────────────────────────────────
  const crabReady = useRef(false);
  const prevCoachLoading = useRef(false);
  useEffect(() => {
    if (crabReady.current) pokeCrab("look");
  }, [insightsSubTab]);
  useEffect(() => {
    if (crabReady.current && expandedMetric) pokeCrab("look", { say: "" });
  }, [expandedMetric]);
  useEffect(() => {
    if (crabReady.current && expandedHeatmapDay) pokeCrab("look", { say: "" });
  }, [expandedHeatmapDay]);
  useEffect(() => {
    if (prevCoachLoading.current && !coachLoading && crabReady.current) {
      if (coachError) pokeCrab("alert", { say: "Coach hit a snag" });
      else pokeCrab("check", { say: "Coach replied" });
    }
    prevCoachLoading.current = !!coachLoading;
  }, [coachLoading, coachError]);
  useEffect(() => {
    pokeCrab("rest", { pose: coachLoading ? "think" : "" });
    return () => pokeCrab("rest", { pose: "" });
  }, [coachLoading]);
  useEffect(() => {
    crabReady.current = true;
  }, []);
    const INSIGHTS_SUB_TABS = [
      { id: "overview", label: "Overview" },
      { id: "coach", label: "Coach" },
    ];

    const insightsSubNav = isDesktop ? (
      <div
        className="flex items-center gap-7 mb-8"
        style={{
          borderBottom: `1px solid ${palette.border}`,
          position: "sticky",
          top: 0,
          zIndex: 5,
          background: palette.bg,
          paddingTop: "14px",
        }}
      >
        {INSIGHTS_SUB_TABS.map((s) => {
          const active = insightsSubTab === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => selectInsightsSubTab(s.id)}
              className={TAP}
              style={{
                background: "transparent",
                border: "none",
                borderBottom: `2.5px solid ${active ? palette.gold : "transparent"}`,
                color: active ? palette.text : palette.textFaint,
                fontFamily: display,
                fontSize: "14.5px",
                fontWeight: active ? 700 : 500,
                padding: "0 2px 14px 2px",
                marginBottom: "-1px",
                cursor: "pointer",
                transition: "color 0.15s ease, border-color 0.15s ease",
              }}
            >
              {s.label}
            </button>
          );
        })}
      </div>
    ) : (
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 5,
          background: palette.bg,
          paddingTop: "8px",
          paddingBottom: "8px",
        }}
      >
        <div
          role="tablist"
          className="relative"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${INSIGHTS_SUB_TABS.length}, minmax(0, 1fr))`,
            padding: "4px",
            borderRadius: "14px",
            background: palette.field,
            border: `1px solid ${palette.border}`,
          }}
        >
          <span
            aria-hidden="true"
            className="ledger-seg-thumb"
            style={{
              position: "absolute",
              top: "4px",
              bottom: "4px",
              left: "4px",
              width: `calc((100% - 8px) / ${INSIGHTS_SUB_TABS.length})`,
              transform: `translateX(${Math.max(0, INSIGHTS_SUB_TABS.findIndex((t) => t.id === insightsSubTab)) * 100}%)`,
              borderRadius: "10px",
              background: palette.gold,
              boxShadow: "0 2px 10px rgba(0,0,0,0.25)",
            }}
          />
          {INSIGHTS_SUB_TABS.map((s) => {
            const active = insightsSubTab === s.id;
            return (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => selectInsightsSubTab(s.id)}
                className={`relative ${TAP}`}
                style={{
                  zIndex: 1,
                  background: "transparent",
                  border: "none",
                  padding: "8px 4px",
                  minWidth: 0,
                  textAlign: "center",
                  color: active ? palette.letterbox : palette.textMuted,
                  fontFamily: display,
                  fontSize: INSIGHTS_SUB_TABS.length > 3 ? "12.5px" : "13.5px",
                  fontWeight: active ? 700 : 500,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  transition: "color 0.2s ease",
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>
    );


    const coachSection = !session?.token ? (
      <div
        className="rounded-2xl p-6 text-center"
        style={{ background: palette.surface, border: `1px solid ${palette.border}` }}
      >
        <Sparkles size={28} style={{ color: palette.gold, margin: "0 auto 10px" }} />
        <p className="text-sm mb-1" style={{ color: palette.text, fontWeight: 600 }}>
          Sign in to use the AI Coach
        </p>
        <p className="text-xs" style={{ color: palette.textFaint }}>
          The Coach reads your own trade stats and answers questions about them \u2014 sign in from the Community tab
          first.
        </p>
      </div>
    ) : (
      <div className="flex flex-col" style={{ flex: "1 1 auto", minHeight: 0 }}>
        <div className="flex items-center justify-between gap-2 mb-3" style={{ flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setCoachHistoryOpen((o) => !o)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 min-w-0 ${TAP}`}
            style={{
              background: palette.field,
              border: `1px solid ${palette.border}`,
              color: palette.text,
              fontFamily: mono,
              fontSize: "12.5px",
              maxWidth: "70%",
            }}
            aria-label="Saved chats"
          >
            <Clock size={14} style={{ flexShrink: 0, color: palette.textMuted }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {coachChats.find((c) => c.id === coachChatId)?.title || "New chat"}
            </span>
            <ChevronDown size={14} style={{ flexShrink: 0, color: palette.textMuted }} />
          </button>
          <button
            type="button"
            onClick={newCoachChat}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 ${TAP}`}
            style={{
              background: palette.gold,
              color: palette.letterbox,
              fontFamily: mono,
              fontSize: "12.5px",
              fontWeight: 600,
              opacity: coachChats.length >= coachChatsMax ? 0.6 : 1,
            }}
          >
            <Plus size={14} />
            New chat
          </button>
        </div>

        {coachHistoryOpen && (
          <div
            className="rounded-2xl p-2 mb-3"
            style={{ background: palette.surface, border: `1px solid ${palette.border}` }}
          >
            {coachChats.length === 0 ? (
              <p className="text-xs px-2 py-3" style={{ color: palette.textFaint }}>
                No saved chats yet — your conversations are saved automatically.
              </p>
            ) : (
              coachChats.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-2 rounded-lg px-2 py-2"
                  style={{ background: c.id === coachChatId ? palette.field : "transparent" }}
                >
                  <button
                    type="button"
                    onClick={() => openCoachChat(c.id)}
                    className={`flex-1 min-w-0 text-left ${TAP}`}
                    style={{ color: palette.text, fontFamily: mono, fontSize: "12.5px" }}
                  >
                    <span className="block" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.title}
                    </span>
                    <span className="block" style={{ color: palette.textFaint, fontSize: "10.5px" }}>
                      {new Date(c.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                  </button>
                  {coachDeleteConfirmId === c.id ? (
                    <button
                      type="button"
                      onClick={() => deleteCoachChat(c.id)}
                      className={`rounded-md px-2 py-1 ${TAP}`}
                      style={{ background: palette.red, color: "#FFFFFF", fontFamily: mono, fontSize: "11px", fontWeight: 600 }}
                    >
                      Delete?
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setCoachDeleteConfirmId(c.id)}
                      className={TAP}
                      style={{ color: palette.textFaint, padding: "4px" }}
                      aria-label="Delete chat"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))
            )}
            <p className="text-xs px-2 pt-2" style={{ color: palette.textFaint }}>
              {coachChats.length}/{coachChatsMax} saved chats
            </p>
          </div>
        )}

        <div
          ref={coachScrollRef}
          className="rounded-2xl p-4 mb-3 flex-1 flex flex-col gap-3"
          style={{
            background: palette.surface,
            border: `1px solid ${palette.border}`,
            minHeight: 0,
            maxHeight: isDesktop ? undefined : "max(170px, calc(100dvh - 390px - env(safe-area-inset-bottom, 0px)))",
            overflowY: "auto",
            overscrollBehavior: "contain",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {coachMessages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
              <Sparkles size={24} style={{ color: palette.textFaint, marginBottom: "8px" }} />
              <p className="text-xs" style={{ color: palette.textFaint, maxWidth: "260px" }}>
                Chat about anything, or ask about your setups, moods, and patterns - e.g. "What's my best setup?"
                or "Explain risk of ruin".
              </p>
            </div>
          ) : (
            coachMessages.map((m) => (
              <div
                key={m.id}
                className="rounded-xl px-3 py-2"
                style={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "85%",
                  background: m.role === "user" ? palette.gold : palette.field,
                  color: m.role === "user" ? palette.letterbox : palette.text,
                  fontSize: "13.5px",
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                }}
              >
                {m.text}
              </div>
            ))
          )}
          {coachLoading && (
            <div
              className="rounded-xl px-3 py-2"
              style={{ alignSelf: "flex-start", background: palette.field, color: palette.textFaint, fontSize: "13px" }}
            >
              Thinking...
            </div>
          )}
        </div>

        {coachError && (
          <p className="text-xs mb-2" style={{ color: palette.red }}>
            {coachError}
          </p>
        )}

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={coachInput}
            onChange={(e) => {
              setCoachInput(e.target.value);
              pokeCrab("type");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendCoachMessage();
              }
            }}
            placeholder="Message the Coach..."
            disabled={coachLoading}
            className="flex-1 rounded-lg px-3 py-2.5"
            style={{
              background: palette.field,
              border: `1px solid ${palette.border}`,
              color: palette.text,
              fontFamily: mono,
              fontSize: "13.5px",
              outline: "none",
            }}
          />
          <button
            type="button"
            onClick={(e) => {
              pokeCrab("tap", { say: "" });
              sendCoachMessage(e);
            }}
            disabled={coachLoading || !coachInput.trim()}
            className={`rounded-lg px-4 py-2.5 flex items-center justify-center ${TAP}`}
            style={{
              background: palette.gold,
              color: palette.letterbox,
              opacity: coachLoading || !coachInput.trim() ? 0.6 : 1,
            }}
            aria-label="Send"
          >
            <Send size={16} />
          </button>
        </div>

        {coachRemaining !== null && (
          <p className="text-xs mt-2" style={{ color: palette.textFaint }}>
            {coachRemaining > 0
              ? `${coachRemaining} message${coachRemaining === 1 ? "" : "s"} left today.`
              : "Daily limit reached \u2014 resets at midnight UTC."}
          </p>
        )}
      </div>
    );

    const hasData = trades.length > 0;
    const coachFixed = insightsSubTab === "coach";
    return (
      <div
        className={isDesktop ? "insights-desktop-redesign" : ""}
        style={coachFixed ? { display: "flex", flexDirection: "column", flex: "1 1 auto", minHeight: 0, width: "100%" } : undefined}
      >
        {isDesktop && (
          <style>{`.insights-desktop-redesign { max-width: 1180px; margin: 0 auto; }`}</style>
        )}
        {insightsSubNav}
        {insightsSubTab === "overview" && (
          <OverviewPanel trades={trades} customSetups={customSetups} customMoods={customMoods} isDesktop={isDesktop} />
        )}
        {insightsSubTab === "coach" && coachSection}

        {insightsSubTab !== "coach" && hasData && (
          <>
            <button
              type="button"
              onClick={(e) => {
                pokeCrab("save");
                exportInsightsReport(e);
              }}
              className={`w-full flex items-center justify-center gap-2 rounded-lg py-3 mt-8 mb-2 ${TAP}`}
              style={{ background: palette.field, border: `1px solid ${palette.border}`, color: palette.text, fontFamily: mono, fontSize: "13px", fontWeight: 600, transition: THEME_TRANSITION }}
            >
              <Download size={16} />
              Download Report
            </button>
            {insightReportMsg && (
              <p className="text-xs mb-4" style={{ color: palette.textFaint }}>{insightReportMsg}</p>
            )}
          </>
        )}
      </div>
    );
}
