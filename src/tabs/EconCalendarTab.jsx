import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Check, ChevronDown, Clock, Flame, Landmark, Lock, Plus, RefreshCw, TrendingUp, X } from "lucide-react";
import { palette, sans } from "../lib/theme.js";

/* =====================================================================================
   Economic calendar tab - everything on this screen comes from your own worker (/market/calendar).
   No embedded widgets, no outside calendar or news source.
   ===================================================================================== */

const tint = (color, pct) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;
const AMBER = "#f5a524";
const DAY_MS = 86400000;
const hairline = { borderTop: `1px solid ${palette.border}` };

/* ---------- currencies ---------- */
const CCY_META = {
  USD: { name: "US Dollar", cc: "US", bank: "Fed", hue: 150 },
  EUR: { name: "Euro", cc: "EU", bank: "ECB", hue: 222 },
  GBP: { name: "British Pound", cc: "GB", bank: "BoE", hue: 350 },
  JPY: { name: "Japanese Yen", cc: "JP", bank: "BoJ", hue: 12 },
  AUD: { name: "Australian Dollar", cc: "AU", bank: "RBA", hue: 40 },
  NZD: { name: "New Zealand Dollar", cc: "NZ", bank: "RBNZ", hue: 190 },
  CAD: { name: "Canadian Dollar", cc: "CA", bank: "BoC", hue: 0 },
  CHF: { name: "Swiss Franc", cc: "CH", bank: "SNB", hue: 330 },
  CNY: { name: "Chinese Yuan", cc: "CN", bank: "PBoC", hue: 20 },
};
const CCY_ORDER = ["USD", "EUR", "GBP", "JPY", "AUD", "NZD", "CAD", "CHF", "CNY"];
const CB_ORDER = ["USD", "EUR", "GBP", "JPY", "AUD", "NZD", "CAD", "CHF"];
const CCY_BY_COUNTRY = {
  US: "USD", "UNITED STATES": "USD", EU: "EUR", EA: "EUR", "EURO AREA": "EUR", EUROZONE: "EUR",
  DE: "EUR", GERMANY: "EUR", FR: "EUR", FRANCE: "EUR", IT: "EUR", ITALY: "EUR", ES: "EUR", SPAIN: "EUR",
  GB: "GBP", UK: "GBP", "UNITED KINGDOM": "GBP", JP: "JPY", JAPAN: "JPY", CH: "CHF", SWITZERLAND: "CHF",
  CA: "CAD", CANADA: "CAD", AU: "AUD", AUSTRALIA: "AUD", NZ: "NZD", "NEW ZEALAND": "NZD", CN: "CNY", CHINA: "CNY",
};
const TZ_OPTIONS = [
  ["America/New_York", "New York"], ["America/Toronto", "Toronto"], ["Europe/London", "London"], ["Europe/Berlin", "Frankfurt"],
  ["Europe/Zurich", "Zurich"], ["Asia/Tokyo", "Tokyo"], ["Australia/Sydney", "Sydney"], ["Pacific/Auckland", "Auckland"], ["UTC", "UTC"],
];

/* ---------- preferences ---------- */
function loadPref(key, fallback) {
  try {
    const v = JSON.parse(window.localStorage.getItem(key));
    return v == null ? fallback : v;
  } catch (e) {
    return fallback;
  }
}
function savePref(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // storage unavailable; the choice just won't be remembered
  }
}

/* ---------- event data helpers (tolerant of different field names) ---------- */
function toMs(v) {
  if (v == null || v === "") return NaN;
  if (typeof v === "number") return v < 1e12 ? v * 1000 : v;
  const s = String(v).trim();
  if (/^\d+$/.test(s)) {
    const n = Number(s);
    return n < 1e12 ? n * 1000 : n;
  }
  if (/^\d{4}-\d\d-\d\d$/.test(s)) return Date.parse(`${s}T00:00:00Z`);
  const hasTz = /([zZ]|[+-]\d\d:?\d\d)$/.test(s);
  const iso = s.includes("T") ? s : s.replace(" ", "T");
  return Date.parse(hasTz ? iso : `${iso}Z`);
}
function eventMs(ev) {
  for (const k of ["timestamp", "datetime", "dateTime", "date", "time", "at", "start"]) {
    const ms = toMs(ev[k]);
    if (Number.isFinite(ms)) return ms;
  }
  return NaN;
}
function currencyOf(ev) {
  const c = String(ev.currency || "").toUpperCase();
  if (c) return c;
  const k = String(ev.country || "").toUpperCase();
  return CCY_BY_COUNTRY[k] || k;
}
function impactOf(ev) {
  const v = ev.impact ?? ev.importance ?? ev.volatility ?? ev.priority;
  if (typeof v === "number") return v >= 3 ? 3 : v === 2 ? 2 : v === 1 ? 1 : 0;
  const s = String(v || "").toLowerCase();
  if (s.includes("high") || s === "3") return 3;
  if (s.includes("med") || s === "2") return 2;
  if (s.includes("low") || s === "1") return 1;
  return 0;
}
function normalize(ev, i) {
  if (!ev || typeof ev !== "object") return null;
  const ms = eventMs(ev);
  const title = ev.event ?? ev.title ?? ev.name ?? ev.indicator;
  if (!Number.isFinite(ms) || !title) return null;
  return {
    id: ev.id ?? `${ms}-${i}`,
    ms,
    title: String(title),
    ccy: currencyOf(ev),
    impact: impactOf(ev),
    actual: ev.actual,
    forecast: ev.estimate ?? ev.forecast ?? ev.consensus,
    previous: ev.previous ?? ev.prior,
    unit: typeof ev.unit === "string" && ev.unit.length <= 4 ? ev.unit : "",
    change: typeof ev.change === "number" ? ev.change : null,
    status: ev.status || "",
    custom: String(ev.id || "").includes(":custom:"),
  };
}
const isNum = (v) => typeof v === "number" && Number.isFinite(v);
function fmtVal(v, unit) {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "number") return `${v.toLocaleString(undefined, { maximumFractionDigits: 3 })}${unit || ""}`;
  return String(v);
}
const dayKey = (ms) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};
const startOfDay = (ms) => {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};
const addDays = (ms, n) => {
  const d = new Date(ms);
  d.setDate(d.getDate() + n);
  return d.getTime();
};
function countdown(ms) {
  const mins = Math.max(0, Math.round(ms / 60000));
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ${mins % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}
function surpriseOf(ev) {
  if (!isNum(ev.actual)) return null;
  const vs = isNum(ev.forecast) ? "forecast" : isNum(ev.previous) ? "previous" : null;
  if (!vs) return null;
  const ref = vs === "forecast" ? ev.forecast : ev.previous;
  const d = Number((ev.actual - ref).toFixed(4));
  if (d === 0) return { dir: 0, text: `In line with ${vs}` };
  return { dir: d > 0 ? 1 : -1, text: `${d > 0 ? "Above" : "Below"} ${vs} by ${fmtVal(Math.abs(d), ev.unit)}` };
}
const timeOf = (ms) => new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

/* ---------- small UI pieces ---------- */
function CcyBadge({ ccy, size = 22 }) {
  const meta = CCY_META[ccy];
  const hue = meta ? meta.hue : 220;
  return (
    <span
      aria-hidden="true"
      title={meta ? meta.name : ccy}
      style={{
        display: "inline-grid",
        placeItems: "center",
        width: size,
        height: size,
        borderRadius: 99,
        flexShrink: 0,
        fontSize: size * 0.4,
        fontWeight: 800,
        letterSpacing: 0.2,
        color: `hsl(${hue} 70% 62%)`,
        background: `hsl(${hue} 60% 50% / 0.16)`,
        boxShadow: `inset 0 0 0 1px hsl(${hue} 60% 55% / 0.35)`,
      }}
    >
      {meta ? meta.cc : (ccy || "—").slice(0, 2)}
    </span>
  );
}

function CcyChip({ ccy }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0 }}>
      <CcyBadge ccy={ccy} size={20} />
      <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 0.2, color: palette.text }}>{ccy || "—"}</span>
    </span>
  );
}

function ImpactBars({ level }) {
  const col = level >= 3 ? palette.red : level === 2 ? AMBER : palette.textFaint;
  const names = ["No impact", "Low impact", "Medium impact", "High impact"];
  return (
    <span role="img" aria-label={names[level]} title={names[level]} style={{ display: "inline-flex", alignItems: "flex-end", gap: 2, height: 13, flexShrink: 0 }}>
      {[1, 2, 3].map((i) => (
        <span key={i} style={{ width: 3, height: 4 + i * 3, borderRadius: 1.5, background: i <= level ? col : tint(palette.text, 14) }} />
      ))}
    </span>
  );
}

function Segmented({ label, options, value, onChange }) {
  return (
    <div
      className="ec-seg"
      role="radiogroup"
      aria-label={label}
      style={{ display: "inline-flex", gap: 2, padding: 3, borderRadius: 11, background: tint(palette.text, 5), border: `1px solid ${palette.border}`, flexShrink: 0 }}
    >
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.id)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 11px", borderRadius: 8, border: 0, cursor: "pointer",
              fontSize: 12, fontWeight: 700, fontFamily: sans,
              background: on ? tint(palette.gold, 18) : "transparent", color: on ? palette.gold : palette.textMuted,
              transition: "background .15s ease, color .15s ease",
            }}
          >
            {o.dot && <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: 99, background: o.dot, opacity: on ? 1 : 0.7 }} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function PanelHeader({ icon: Icon, title, hint, controls }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", minHeight: 52, padding: "8px 16px", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <span aria-hidden="true" style={{ display: "grid", placeItems: "center", width: 28, height: 28, borderRadius: 9, background: tint(palette.gold, 14), color: palette.gold, flexShrink: 0 }}>
          <Icon size={15} />
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: palette.text, fontSize: 14.5, fontWeight: 800, fontFamily: sans, lineHeight: 1.2 }}>{title}</div>
          {hint && <div style={{ color: palette.textFaint, fontSize: 11, marginTop: 2 }}>{hint}</div>}
        </div>
      </div>
      {controls}
    </div>
  );
}

const iconBtn = (busy) => ({
  display: "grid", placeItems: "center", width: 32, height: 32, borderRadius: 10, border: `1px solid ${palette.border}`,
  background: tint(palette.text, 5), color: palette.textMuted, cursor: busy ? "default" : "pointer", flexShrink: 0,
});
const fieldStyle = {
  width: "100%", boxSizing: "border-box", padding: "7px 9px", borderRadius: 9, border: `1px solid ${palette.border}`,
  background: tint(palette.text, 5), color: palette.text, fontSize: 13, fontFamily: sans, outline: "none",
};
const primaryBtn = (disabled) => ({
  display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 10, border: `1px solid ${tint(palette.gold, 45)}`,
  background: tint(palette.gold, 16), color: palette.gold, fontWeight: 800, fontSize: 12.5, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.6 : 1, fontFamily: sans,
});
const ghostBtn = {
  display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 10, border: `1px solid ${palette.border}`,
  background: "transparent", color: palette.textMuted, fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: sans,
};

function Skeleton() {
  return (
    <div aria-hidden="true" style={{ padding: "6px 16px" }}>
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", padding: "14px 0", borderBottom: `1px solid ${palette.border}` }}>
          <span style={{ width: 44, height: 10, borderRadius: 5, background: tint(palette.text, 8) }} />
          <span style={{ width: 36, height: 16, borderRadius: 6, background: tint(palette.text, 8) }} />
          <span style={{ flex: 1, height: 10, borderRadius: 5, background: tint(palette.text, 8), maxWidth: `${50 + ((i * 13) % 35)}%` }} />
        </div>
      ))}
    </div>
  );
}

function Notice({ children }) {
  return <div style={{ padding: "36px 24px", textAlign: "center", color: palette.textMuted, fontSize: 13, lineHeight: 1.5 }}>{children}</div>;
}

/* ---------- owner tools (rate numbers, forecasts, your own events) ---------- */
async function ownerCall(apiBase, key, body) {
  const res = await fetch(`${apiBase}/market/calendar/admin`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "That didn't work.");
  return data;
}

function NumField({ label, value, onChange, unit }) {
  return (
    <label style={{ display: "block", minWidth: 0 }}>
      <span style={{ display: "block", fontSize: 10.5, color: palette.textFaint, fontWeight: 700, marginBottom: 3 }}>
        {label}
        {unit ? ` (${unit})` : ""}
      </span>
      <input inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} placeholder="—" style={fieldStyle} />
    </label>
  );
}

function OwnerEditor({ ev, onSave, onDelete }) {
  const show = (v) => (isNum(v) ? String(v) : "");
  const [actual, setActual] = useState(show(ev.actual));
  const [forecast, setForecast] = useState(show(ev.forecast));
  const [previous, setPrevious] = useState(show(ev.previous));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const go = async (fn) => {
    setBusy(true);
    setErr("");
    try {
      await fn();
    } catch (e) {
      setErr(e.message || "That didn't work.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px dashed ${palette.border}` }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: palette.gold, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
        <Lock size={12} /> Owner edit
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
        <NumField label="Actual" value={actual} onChange={setActual} unit={ev.unit} />
        <NumField label="Forecast" value={forecast} onChange={setForecast} unit={ev.unit} />
        <NumField label="Previous" value={previous} onChange={setPrevious} unit={ev.unit} />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
        <button type="button" disabled={busy} style={primaryBtn(busy)} onClick={() => go(() => onSave(ev.id, { actual, forecast, previous }))}>
          <Check size={14} /> Save
        </button>
        {ev.custom && (
          <button type="button" disabled={busy} style={ghostBtn} onClick={() => go(() => onDelete(ev.id))}>
            <X size={14} /> Delete event
          </button>
        )}
        {err && <span style={{ fontSize: 12, color: palette.red, fontWeight: 700 }}>{err}</span>}
      </div>
      <div style={{ fontSize: 11, color: palette.textFaint, marginTop: 8, lineHeight: 1.45 }}>Leave Actual empty until the number is out. Clearing it puts the release back to waiting.</div>
    </div>
  );
}

function AddEventForm({ onAdd, onClose }) {
  const [f, setF] = useState({ ccy: "EUR", title: "", impact: "3", date: "", time: "", tz: "Europe/Berlin", unit: "%", forecast: "", previous: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k) => (e) => setF((o) => ({ ...o, [k]: e.target ? e.target.value : e }));
  const submit = async () => {
    setBusy(true);
    setErr("");
    try {
      await onAdd({ ...f, impact: Number(f.impact) });
      onClose();
    } catch (e) {
      setErr(e.message || "That didn't work.");
    } finally {
      setBusy(false);
    }
  };
  const lab = (t) => <span style={{ display: "block", fontSize: 10.5, color: palette.textFaint, fontWeight: 700, marginBottom: 3 }}>{t}</span>;
  return (
    <div style={{ padding: "12px 16px 14px", background: tint(palette.gold, 5), ...hairline }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: palette.text }}>Add your own event</span>
        <button type="button" onClick={onClose} aria-label="Close" style={{ ...iconBtn(false), width: 28, height: 28 }}>
          <X size={14} />
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8 }}>
        <label>
          {lab("Currency")}
          <select value={f.ccy} onChange={set("ccy")} style={fieldStyle}>
            {CCY_ORDER.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label style={{ gridColumn: "span 2" }}>
          {lab("Event name")}
          <input value={f.title} onChange={set("title")} placeholder="e.g. German CPI y/y" maxLength={120} style={fieldStyle} />
        </label>
        <label>
          {lab("Impact")}
          <select value={f.impact} onChange={set("impact")} style={fieldStyle}>
            <option value="3">High</option>
            <option value="2">Medium</option>
            <option value="1">Low</option>
          </select>
        </label>
        <label>
          {lab("Date")}
          <input type="date" value={f.date} onChange={set("date")} style={fieldStyle} />
        </label>
        <label>
          {lab("Time")}
          <input type="time" value={f.time} onChange={set("time")} style={fieldStyle} />
        </label>
        <label>
          {lab("Time is in")}
          <select value={f.tz} onChange={set("tz")} style={fieldStyle}>
            {TZ_OPTIONS.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        </label>
        <label>
          {lab("Unit")}
          <input value={f.unit} onChange={set("unit")} maxLength={4} placeholder="%" style={fieldStyle} />
        </label>
        <label>
          {lab("Forecast")}
          <input inputMode="decimal" value={f.forecast} onChange={set("forecast")} placeholder="—" style={fieldStyle} />
        </label>
        <label>
          {lab("Previous")}
          <input inputMode="decimal" value={f.previous} onChange={set("previous")} placeholder="—" style={fieldStyle} />
        </label>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button type="button" disabled={busy} style={primaryBtn(busy)} onClick={submit}>
          <Plus size={14} /> Add event
        </button>
        {err && <span style={{ fontSize: 12, color: palette.red, fontWeight: 700 }}>{err}</span>}
      </div>
    </div>
  );
}

function OwnerKeyForm({ onUnlock, onClose }) {
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const go = async () => {
    if (!key.trim()) return;
    setBusy(true);
    setErr("");
    try {
      await onUnlock(key.trim());
      onClose();
    } catch (e) {
      setErr(e.message || "That didn't work.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div style={{ padding: "10px 16px 12px", background: tint(palette.text, 3), ...hairline }}>
      <div style={{ fontSize: 12, color: palette.textMuted, marginBottom: 8, lineHeight: 1.45 }}>Enter your owner key to type in rate decisions, forecasts and your own events.</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="password"
          autoComplete="off"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && go()}
          placeholder="Owner key"
          aria-label="Owner key"
          style={{ ...fieldStyle, width: 220, maxWidth: "100%" }}
        />
        <button type="button" disabled={busy} style={primaryBtn(busy)} onClick={go}>
          Unlock
        </button>
        <button type="button" style={ghostBtn} onClick={onClose}>
          Cancel
        </button>
        {err && <span style={{ fontSize: 12, color: palette.red, fontWeight: 700 }}>{err}</span>}
      </div>
    </div>
  );
}

/* ---------- event rows ---------- */
const colsFor = (showForecast) =>
  showForecast ? "62px 78px 22px minmax(0, 1fr) 66px 66px 66px 18px" : "62px 78px 22px minmax(0, 1fr) 76px 76px 18px";

function ValueCell({ label, v, strong, ev, compact }) {
  const empty = v == null || v === "";
  const pending = strong && empty && ev.status === "pending";
  const showChange = strong && !empty && ev.change != null;
  return (
    <div style={{ textAlign: compact ? "left" : "right", fontVariantNumeric: "tabular-nums", minWidth: 0 }}>
      {compact && <div style={{ fontSize: 10.5, color: palette.textFaint, marginBottom: 1 }}>{label}</div>}
      <div style={{ fontSize: pending ? 12 : 13, fontWeight: strong ? 800 : 600, color: pending ? palette.gold : empty ? palette.textFaint : strong ? palette.text : palette.textMuted }}>
        {pending ? "Pending" : fmtVal(v, ev.unit)}
      </div>
      {showChange && (
        <div title="Change vs previous" style={{ fontSize: 10.5, fontWeight: 700, color: palette.textFaint }}>
          {ev.change > 0 ? "+" : ""}
          {ev.change.toLocaleString(undefined, { maximumFractionDigits: 3 })}
          {ev.unit === "K" ? "K" : ""}
        </div>
      )}
    </div>
  );
}

function EventDetail({ ev, owner, onSave, onDelete }) {
  const sup = surpriseOf(ev);
  const status = ev.status === "released" ? "Released" : ev.status === "pending" ? "Waiting for the number" : ev.status === "review" ? "Needs a check" : "Scheduled";
  const impactName = ["No", "Low", "Medium", "High"][ev.impact] + " impact";
  const tile = (label, v, strong) => (
    <div style={{ padding: "10px 12px", borderRadius: 12, background: tint(palette.text, 5), border: `1px solid ${palette.border}`, minWidth: 0 }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: palette.textFaint, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: strong && isNum(v) ? palette.text : palette.textMuted, fontVariantNumeric: "tabular-nums" }}>
        {strong && !isNum(v) && ev.status === "pending" ? <span style={{ fontSize: 13, color: palette.gold }}>Pending</span> : fmtVal(v, ev.unit)}
      </div>
    </div>
  );
  return (
    <div style={{ padding: "12px 16px 16px", background: tint(palette.text, 3), borderBottom: `1px solid ${palette.border}` }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
        {tile("Actual", ev.actual, true)}
        {tile("Forecast", ev.forecast)}
        {tile("Previous", ev.previous)}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", marginTop: 10, fontSize: 12, color: palette.textMuted, alignItems: "center" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <ImpactBars level={ev.impact} /> {impactName}
        </span>
        <span>{(CCY_META[ev.ccy] && CCY_META[ev.ccy].name) || ev.ccy}</span>
        <span>{status}</span>
        <span>
          {new Date(ev.ms).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
      {sup && (
        <div style={{ marginTop: 8, fontSize: 12.5, fontWeight: 700, color: palette.text }}>
          {sup.dir > 0 ? "▲ " : sup.dir < 0 ? "▼ " : "● "}
          {sup.text}
        </div>
      )}
      {owner && <OwnerEditor key={`${ev.id}-${ev.actual}-${ev.forecast}-${ev.previous}`} ev={ev} onSave={onSave} onDelete={onDelete} />}
    </div>
  );
}

function EventRow({ ev, isNext, compact, now, rowRef, showForecast, open, onToggle, owner, onSave, onDelete }) {
  const accent = isNext ? { boxShadow: `inset 3px 0 0 ${palette.gold}`, background: tint(palette.gold, 7) } : null;
  const toggleProps = {
    role: "button",
    tabIndex: 0,
    "aria-expanded": open,
    onClick: onToggle,
    onKeyDown: (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onToggle();
      }
    },
  };
  const chevron = (
    <ChevronDown size={14} aria-hidden="true" style={{ color: palette.textFaint, transform: open ? "rotate(180deg)" : "none", transition: "transform .15s ease", justifySelf: "end" }} />
  );
  return (
    <div ref={rowRef}>
      {compact ? (
        <div {...toggleProps} className="ec-row" style={{ padding: "11px 16px", borderBottom: open ? "none" : `1px solid ${palette.border}`, cursor: "pointer", ...accent }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: palette.textMuted, fontVariantNumeric: "tabular-nums" }}>{timeOf(ev.ms)}</span>
            <CcyChip ccy={ev.ccy} />
            <ImpactBars level={ev.impact} />
            {isNext && <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 800, color: palette.gold }}>in {countdown(ev.ms - now)}</span>}
          </div>
          <div style={{ margin: "6px 0 8px", fontSize: 13.5, fontWeight: 700, color: palette.text, lineHeight: 1.3 }}>{ev.title}</div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${showForecast ? 3 : 2}, minmax(0, 1fr))`, gap: 8 }}>
            <ValueCell label="Actual" v={ev.actual} strong ev={ev} compact />
            {showForecast && <ValueCell label="Forecast" v={ev.forecast} ev={ev} compact />}
            <ValueCell label="Previous" v={ev.previous} ev={ev} compact />
          </div>
        </div>
      ) : (
        <div
          {...toggleProps}
          className="ec-row"
          style={{
            display: "grid", gridTemplateColumns: colsFor(showForecast), gap: 10, alignItems: "center", padding: "10px 16px",
            borderBottom: open ? "none" : `1px solid ${palette.border}`, cursor: "pointer", ...accent,
          }}
        >
          <span style={{ fontSize: 12.5, fontWeight: 700, color: palette.textMuted, fontVariantNumeric: "tabular-nums" }}>{timeOf(ev.ms)}</span>
          <CcyChip ccy={ev.ccy} />
          <ImpactBars level={ev.impact} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: palette.text, lineHeight: 1.3 }}>{ev.title}</div>
            {isNext && <div style={{ fontSize: 11, fontWeight: 800, color: palette.gold, marginTop: 2 }}>in {countdown(ev.ms - now)}</div>}
          </div>
          <ValueCell label="Actual" v={ev.actual} strong ev={ev} />
          {showForecast && <ValueCell label="Forecast" v={ev.forecast} ev={ev} />}
          <ValueCell label="Previous" v={ev.previous} ev={ev} />
          {chevron}
        </div>
      )}
      {open && <EventDetail ev={ev} owner={owner} onSave={onSave} onDelete={onDelete} />}
    </div>
  );
}

/* ---------- options ---------- */
const IMPACT = [
  { id: "high", label: "High", min: 3, dot: palette.red },
  { id: "medium", label: "Medium+", min: 2, dot: AMBER },
  { id: "all", label: "All", min: 0, dot: palette.textFaint },
];

export default function EconCalendarTab({ theme = "dark", isDesktop, apiBase }) {
  const [sel, setSel] = useState("week"); // "week" or a day offset 0..6
  const [impact, setImpactState] = useState(() => loadPref("ec-impact", "medium"));
  const [ccys, setCcysState] = useState(() => loadPref("ec-ccys", []));
  const setImpact = (v) => {
    setImpactState(v);
    savePref("ec-impact", v);
  };
  const setCcys = (v) => {
    setCcysState(v);
    savePref("ec-ccys", v);
  };
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [ownerKey, setOwnerKey] = useState(() => loadPref("ec-owner-key", ""));
  const [keyOpen, setKeyOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [own, setOwn] = useState({
    events: [], rates: [], nextRates: [], status: apiBase ? "loading" : "error", error: apiBase ? "" : "The calendar service address is missing.",
  });

  // Your own calendar: read from your worker's database (/market/calendar). No other source is used.
  const loadOwn = useRef(null);
  loadOwn.current = async () => {
    if (!apiBase) return;
    setBusy(true);
    try {
      const res = await fetch(`${apiBase}/market/calendar`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !Array.isArray(data.events)) throw new Error(data.error || "Couldn't load the calendar.");
      setOwn({
        events: data.events,
        rates: Array.isArray(data.rates) ? data.rates : [],
        nextRates: Array.isArray(data.nextRates) ? data.nextRates : [],
        status: data.syncing ? "syncing" : "live",
        error: "",
      });
    } catch (err) {
      setOwn((o) => ({ ...o, status: o.events.length ? "live" : "error", error: err.message || "Couldn't load the calendar." }));
    } finally {
      setBusy(false);
    }
  };
  const hasPending = own.events.some((e) => e.status === "pending");
  useEffect(() => {
    loadOwn.current();
    // fast while the first sync runs or a release is waiting for its number, relaxed otherwise
    const every = own.status === "syncing" ? 10000 : hasPending ? 15000 : 60000;
    const id = setInterval(() => loadOwn.current(), every);
    return () => clearInterval(id);
  }, [apiBase, own.status === "syncing", hasPending]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(id);
  }, []);

  const owner = !!ownerKey;
  const signOut = () => {
    setOwnerKey("");
    savePref("ec-owner-key", "");
    setAddOpen(false);
  };
  const unlock = async (key) => {
    await ownerCall(apiBase, key, { op: "ping" });
    setOwnerKey(key);
    savePref("ec-owner-key", key);
  };
  const ownerAction = async (body) => {
    try {
      await ownerCall(apiBase, ownerKey, body);
    } catch (e) {
      if (/owner key/i.test(e.message)) signOut();
      throw e;
    }
    await loadOwn.current();
  };
  const num = (v) => (String(v).trim() === "" ? null : Number(String(v).replace(",", ".")));
  const saveEvent = (id, v) => ownerAction({ op: "set", id, actual: num(v.actual), forecast: num(v.forecast), previous: num(v.previous) });
  const deleteEvent = (id) => ownerAction({ op: "delete", id }).then(() => setOpenId(null));
  const addEvent = (f) => ownerAction({ op: "add", ...f, forecast: num(f.forecast), previous: num(f.previous) });

  const tz = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g, " ");
    } catch (e) {
      return "your local time";
    }
  }, []);

  const all = useMemo(() => own.events.map(normalize).filter(Boolean).sort((a, b) => a.ms - b.ms), [own.events]);
  const today0 = startOfDay(now);
  const minImpact = IMPACT.find((i) => i.id === impact).min;
  const weekEnd = addDays(today0, 7);

  const matches = (e) => e.impact >= minImpact && (!ccys.length || ccys.includes(e.ccy) || e.ccy === "ALL");
  const visible = useMemo(() => all.filter(matches), [all, minImpact, ccys]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const [from, to] = sel === "week" ? [today0, weekEnd] : [addDays(today0, sel), addDays(today0, sel + 1)];
    return visible.filter((e) => e.ms >= from && e.ms < to);
  }, [visible, sel, today0, weekEnd]);

  const currencyOptions = useMemo(() => {
    const present = [...new Set(all.map((e) => e.ccy))].filter((c) => c && c !== "ALL");
    return [...CCY_ORDER.filter((c) => present.includes(c)), ...present.filter((c) => !CCY_ORDER.includes(c)).sort()];
  }, [all]);

  // Week strip: one tile per day, counting what matches the current filters.
  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const from = addDays(today0, i);
        const to = addDays(today0, i + 1);
        const items = visible.filter((e) => e.ms >= from && e.ms < to);
        return { i, ms: from, count: items.length, high: items.filter((e) => e.impact >= 3).length };
      }),
    [visible, today0]
  );

  const groups = useMemo(() => {
    const out = [];
    filtered.forEach((e) => {
      const key = dayKey(e.ms);
      let g = out[out.length - 1];
      if (!g || g.key !== key) {
        g = { key, ms: e.ms, items: [] };
        out.push(g);
      }
      g.items.push(e);
    });
    return out;
  }, [filtered]);

  const next = filtered.find((e) => e.ms > now);
  const nextHigh = all.find((e) => e.ms > now && e.impact >= 3 && (!ccys.length || ccys.includes(e.ccy)));
  const todayKey = dayKey(now);
  const todayAll = all.filter((e) => dayKey(e.ms) === todayKey);
  const todayStats = {
    total: todayAll.length,
    high: todayAll.filter((e) => e.impact >= 3).length,
    out: todayAll.filter((e) => e.status === "released" && isNum(e.actual)).length,
    waiting: todayAll.filter((e) => e.status === "pending").length,
  };
  const highAhead = all.filter((e) => e.ms > now && e.impact >= 3 && (!ccys.length || ccys.includes(e.ccy))).slice(0, 6);

  const weekCounts = useMemo(() => {
    const map = {};
    all.filter((e) => e.ms >= today0 && e.ms < weekEnd && e.impact >= Math.max(1, minImpact)).forEach((e) => {
      map[e.ccy] = (map[e.ccy] || 0) + 1;
    });
    return CCY_ORDER.filter((c) => map[c]).map((c) => ({ ccy: c, n: map[c] }));
  }, [all, today0, weekEnd, minImpact]);
  const weekMax = Math.max(1, ...weekCounts.map((c) => c.n));

  const rateRows = useMemo(
    () =>
      CB_ORDER.map((ccy) => {
        const rel = own.rates.find((r) => r.ccy === ccy);
        const nxt = own.nextRates.find((r) => r.ccy === ccy);
        const rate = rel ? rel.actual : nxt && nxt.previous != null ? nxt.previous : null;
        const delta = rel && rel.previous != null ? Number((rel.actual - rel.previous).toFixed(3)) : null;
        return { ccy, rate, delta, nextMs: nxt ? nxt.ts : null };
      }),
    [own.rates, own.nextRates]
  );

  const listRef = useRef(null);
  const nextRowRef = useRef(null);
  const scrollKey = `${sel}|${impact}|${ccys.join(",")}|${all.length}`;
  useEffect(() => {
    const box = listRef.current;
    if (!box) return;
    const row = nextRowRef.current;
    box.scrollTop = row ? Math.max(0, row.offsetTop - 44) : 0;
  }, [scrollKey]);

  const loading = own.status === "loading";
  const showForecast = owner || all.some((e) => e.forecast !== null && e.forecast !== undefined && e.forecast !== "");
  const failed = own.status === "error" && all.length === 0;
  const syncing = own.status === "syncing" && all.length === 0;
  const live = own.status === "live" || own.status === "syncing";

  const refreshBtn = (
    <button type="button" onClick={() => loadOwn.current()} disabled={busy} aria-label="Refresh calendar" title="Refresh calendar" className="ec-seg" style={iconBtn(busy)}>
      <RefreshCw size={14} className={busy ? "ec-spin" : undefined} />
    </button>
  );
  const ownerBtn = (
    <button
      type="button"
      className="ec-seg"
      aria-label={owner ? "Owner mode is on. Turn off" : "Owner sign in"}
      title={owner ? "Owner mode on (click to turn off)" : "Owner sign in"}
      onClick={() => (owner ? signOut() : setKeyOpen((v) => !v))}
      style={{ ...iconBtn(false), color: owner ? palette.gold : palette.textMuted, background: owner ? tint(palette.gold, 14) : tint(palette.text, 5), borderColor: owner ? tint(palette.gold, 45) : palette.border }}
    >
      <Lock size={14} />
    </button>
  );
  const addBtn = owner ? (
    <button type="button" className="ec-seg" aria-label="Add your own event" title="Add your own event" onClick={() => setAddOpen((v) => !v)} style={iconBtn(false)}>
      <Plus size={15} />
    </button>
  ) : null;

  /* ---- hero strip ---- */
  const clockTime = new Date(now).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const clockDate = new Date(now).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
  const stat = (n, label, strong) => (
    <div style={{ textAlign: "center", minWidth: 54 }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: strong && n > 0 ? palette.red : palette.text, fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>{n}</div>
      <div style={{ fontSize: 10.5, color: palette.textFaint, fontWeight: 700, marginTop: 3 }}>{label}</div>
    </div>
  );
  const hero = (
    <div
      style={{
        display: "grid", gridTemplateColumns: isDesktop ? "auto minmax(0, 1fr) auto" : "1fr", gap: isDesktop ? 24 : 14, alignItems: "center", padding: "16px 18px",
        background: `linear-gradient(135deg, ${tint(palette.gold, 10)}, transparent 62%)`,
      }}
    >
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 800, color: palette.textFaint, letterSpacing: 0.4 }}>
          <Clock size={12} /> {tz.toUpperCase()}
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, marginLeft: 6, color: live ? palette.gold : palette.textFaint }}>
            <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: 99, background: live ? palette.gold : palette.textFaint }} />
            {own.status === "syncing" ? "SYNCING" : live ? "LIVE" : "OFFLINE"}
          </span>
        </div>
        <div style={{ fontSize: 34, fontWeight: 800, color: palette.text, lineHeight: 1.1, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>{clockTime}</div>
        <div style={{ fontSize: 12.5, color: palette.textMuted, marginTop: 2 }}>{clockDate}</div>
      </div>
      <div style={{ minWidth: 0 }} aria-live="polite">
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 800, color: palette.red, letterSpacing: 0.4 }}>
          <Flame size={12} /> NEXT HIGH-IMPACT
        </div>
        {nextHigh ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6, minWidth: 0 }}>
              <CcyBadge ccy={nextHigh.ccy} size={28} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: palette.text, lineHeight: 1.25, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: isDesktop ? "nowrap" : "normal" }}>{nextHigh.title}</div>
                <div style={{ fontSize: 12, color: palette.textMuted, marginTop: 2 }}>
                  {new Date(nextHigh.ms).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })} at {timeOf(nextHigh.ms)}
                </div>
              </div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: palette.gold, marginTop: 6 }}>in {countdown(nextHigh.ms - now)}</div>
          </>
        ) : (
          <div style={{ fontSize: 13, color: palette.textMuted, marginTop: 8 }}>No high-impact release is coming up.</div>
        )}
      </div>
      <div style={{ display: "flex", gap: isDesktop ? 18 : 10, justifyContent: isDesktop ? "flex-end" : "space-between" }} aria-label="Today at a glance">
        {stat(todayStats.total, "Today")}
        {stat(todayStats.high, "High impact", true)}
        {stat(todayStats.out, "Released")}
        {stat(todayStats.waiting, "Waiting")}
      </div>
    </div>
  );

  /* ---- week strip ---- */
  const tileStyle = (on) => ({
    flex: "1 0 0", minWidth: 62, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "8px 6px", borderRadius: 12, cursor: "pointer", fontFamily: sans,
    border: `1px solid ${on ? tint(palette.gold, 50) : palette.border}`, background: on ? tint(palette.gold, 14) : tint(palette.text, 3), color: on ? palette.gold : palette.textMuted,
    transition: "background .15s ease, border-color .15s ease",
  });
  const strip = (
    <div className="ec-strip" role="tablist" aria-label="Pick a day" style={{ display: "flex", gap: 6, padding: "0 16px 12px", overflowX: "auto" }}>
      <button type="button" role="tab" aria-selected={sel === "week"} onClick={() => setSel("week")} style={tileStyle(sel === "week")}>
        <span style={{ fontSize: 11, fontWeight: 700 }}>Next</span>
        <span style={{ fontSize: 15, fontWeight: 800 }}>7 days</span>
        <span style={{ fontSize: 10.5, fontWeight: 700, opacity: 0.8 }}>{days.reduce((n, d) => n + d.count, 0)} events</span>
      </button>
      {days.map((d) => {
        const on = sel === d.i;
        const dt = new Date(d.ms);
        return (
          <button key={d.i} type="button" role="tab" aria-selected={on} onClick={() => setSel(d.i)} style={tileStyle(on)}>
            <span style={{ fontSize: 11, fontWeight: 700 }}>{d.i === 0 ? "Today" : dt.toLocaleDateString([], { weekday: "short" })}</span>
            <span style={{ fontSize: 17, fontWeight: 800, color: on ? palette.gold : palette.text }}>{dt.getDate()}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5, fontWeight: 700, opacity: d.count ? 1 : 0.5 }}>
              {d.high > 0 && <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: 99, background: palette.red }} />}
              {d.count}
            </span>
          </button>
        );
      })}
    </div>
  );

  /* ---- currency filter ---- */
  const chip = (on) => ({
    display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 9px 4px 5px", borderRadius: 99, fontSize: 11.5, fontWeight: 800, cursor: "pointer", fontFamily: sans,
    border: `1px solid ${on ? tint(palette.gold, 45) : palette.border}`, background: on ? tint(palette.gold, 16) : "transparent", color: on ? palette.gold : palette.textMuted,
    transition: "background .15s ease, color .15s ease", flexShrink: 0,
  });
  const toggleCcy = (c) => setCcys(ccys.includes(c) ? ccys.filter((x) => x !== c) : [...ccys, c]);
  const ccyFilter = currencyOptions.length > 1 && (
    <div className="ec-seg ec-strip" role="group" aria-label="Currencies" style={{ display: "flex", gap: 6, padding: "0 16px 12px", overflowX: isDesktop ? "visible" : "auto", flexWrap: isDesktop ? "wrap" : "nowrap" }}>
      <button type="button" aria-pressed={ccys.length === 0} onClick={() => setCcys([])} style={{ ...chip(ccys.length === 0), padding: "4px 12px" }}>
        All
      </button>
      {currencyOptions.map((c) => (
        <button key={c} type="button" aria-pressed={ccys.includes(c)} onClick={() => toggleCcy(c)} style={chip(ccys.includes(c))}>
          <CcyBadge ccy={c} size={18} />
          {c}
        </button>
      ))}
    </div>
  );

  /* ---- list ---- */
  const list = (() => {
    if (loading && all.length === 0) return <Skeleton />;
    if (syncing) return <Notice>Setting up your calendar for the first time. The official release schedule is being loaded; this takes under a minute.</Notice>;
    if (failed) {
      return (
        <Notice>
          <div style={{ marginBottom: 12 }}>{own.error || "Couldn't load the calendar."}</div>
          <button type="button" onClick={() => loadOwn.current()} style={primaryBtn(false)}>
            Try again
          </button>
        </Notice>
      );
    }
    if (groups.length === 0) return <Notice>No releases match these filters. Pick 7 days, lower the impact level or clear the currency filter.</Notice>;
    return groups.map((g) => (
      <div key={g.key}>
        <div
          style={{
            position: "sticky", top: 0, zIndex: 1, display: "flex", alignItems: "center", gap: 8, padding: "9px 16px", background: palette.surface,
            borderBottom: `1px solid ${palette.border}`, fontSize: 12.5, fontWeight: 800, color: palette.text,
          }}
        >
          {new Date(g.ms).toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })}
          {g.key === todayKey && (
            <span style={{ fontSize: 10.5, fontWeight: 800, padding: "2px 7px", borderRadius: 99, background: tint(palette.gold, 18), color: palette.gold }}>Today</span>
          )}
          <span style={{ marginLeft: "auto", fontWeight: 600, color: palette.textFaint }}>
            {g.items.length} {g.items.length === 1 ? "release" : "releases"}
          </span>
        </div>
        {g.items.map((ev) => {
          const isNext = !!next && ev.id === next.id;
          return (
            <EventRow
              key={ev.id}
              ev={ev}
              isNext={isNext}
              compact={!isDesktop}
              now={now}
              rowRef={isNext ? nextRowRef : undefined}
              showForecast={showForecast}
              open={openId === ev.id}
              onToggle={() => setOpenId(openId === ev.id ? null : ev.id)}
              owner={owner}
              onSave={saveEvent}
              onDelete={deleteEvent}
            />
          );
        })}
      </div>
    ));
  })();

  const calendarCard = (
    <div style={{ minWidth: 0 }}>
      <PanelHeader icon={CalendarDays} title="Economic calendar" hint={`Times in ${tz}`} controls={<div style={{ display: "flex", gap: 8 }}>{addBtn}{ownerBtn}{refreshBtn}</div>} />
      {keyOpen && !owner && <OwnerKeyForm onUnlock={unlock} onClose={() => setKeyOpen(false)} />}
      {addOpen && owner && <AddEventForm onAdd={addEvent} onClose={() => setAddOpen(false)} />}
      <div style={{ padding: "4px 0 0" }}>{strip}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "0 16px 12px" }}>
        <Segmented label="Impact" options={IMPACT} value={impact} onChange={setImpact} />
      </div>
      {ccyFilter}
      <div
        style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 44, padding: "6px 16px", boxSizing: "border-box", background: tint(palette.gold, 8), ...hairline }}
        aria-live="polite"
      >
        {next ? (
          <>
            <CcyChip ccy={next.ccy} />
            <ImpactBars level={next.impact} />
            <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, color: palette.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{next.title}</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: palette.gold, whiteSpace: "nowrap" }}>in {countdown(next.ms - now)}</span>
          </>
        ) : (
          <span style={{ fontSize: 13, color: palette.textMuted }}>No more releases in this view.</span>
        )}
      </div>
      {isDesktop && !failed && !syncing && (
        <div style={{ display: "grid", gridTemplateColumns: colsFor(showForecast), gap: 10, padding: "8px 16px", fontSize: 11, color: palette.textFaint, fontWeight: 700, ...hairline }}>
          <span>Time</span>
          <span>Currency</span>
          <span />
          <span>Event</span>
          <span style={{ textAlign: "right" }}>Actual</span>
          {showForecast && <span style={{ textAlign: "right" }}>Forecast</span>}
          <span style={{ textAlign: "right" }}>Previous</span>
          <span />
        </div>
      )}
      <div ref={listRef} style={{ position: "relative", overflowY: "auto", height: isDesktop ? 600 : 560, ...hairline }}>
        {list}
      </div>
    </div>
  );

  /* ---- side panels (all from your own data) ---- */
  const banksPanel = (
    <div style={{ minWidth: 0 }}>
      <PanelHeader icon={Landmark} title="Central banks" hint="Policy rate and next decision" />
      <div style={{ padding: "0 8px 10px" }}>
        {rateRows.map((r) => (
          <div key={r.ccy} style={{ display: "grid", gridTemplateColumns: "auto minmax(0, 1fr) auto", gap: 10, alignItems: "center", padding: "8px 8px", borderRadius: 10 }}>
            <CcyBadge ccy={r.ccy} size={26} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: palette.text }}>
                {CCY_META[r.ccy].bank} <span style={{ fontWeight: 600, color: palette.textFaint }}>· {r.ccy}</span>
              </div>
              <div style={{ fontSize: 11, color: palette.textFaint, marginTop: 1 }}>
                {r.nextMs ? `Next ${new Date(r.nextMs).toLocaleDateString([], { month: "short", day: "numeric" })} · in ${countdown(r.nextMs - now)}` : "No decision scheduled"}
              </div>
            </div>
            <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: r.rate == null ? palette.textFaint : palette.text }}>{r.rate == null ? "—" : `${r.rate.toFixed(2)}%`}</div>
              {r.delta != null && (
                <div style={{ fontSize: 10.5, fontWeight: 800, color: r.delta === 0 ? palette.textFaint : palette.text }}>
                  {r.delta === 0 ? "Held" : `${r.delta > 0 ? "▲ +" : "▼ "}${r.delta.toFixed(2)}`}
                </div>
              )}
            </div>
          </div>
        ))}
        {owner && rateRows.some((r) => r.rate == null) && (
          <div style={{ fontSize: 11, color: palette.textFaint, padding: "6px 8px 0", lineHeight: 1.45 }}>
            A rate shows as — until you type it. Open the bank's next decision in the calendar and fill in Previous (the current rate).
          </div>
        )}
      </div>
    </div>
  );

  const aheadPanel = (
    <div style={{ minWidth: 0 }}>
      <PanelHeader icon={Flame} title="High-impact ahead" hint="Next big releases across all days" />
      <div style={{ padding: "0 8px 10px" }}>
        {highAhead.length === 0 && <div style={{ padding: "10px 8px 6px", fontSize: 12.5, color: palette.textMuted }}>Nothing high-impact is scheduled yet.</div>}
        {highAhead.map((e) => (
          <div key={e.id} style={{ display: "grid", gridTemplateColumns: "auto minmax(0, 1fr) auto", gap: 10, alignItems: "center", padding: "8px 8px" }}>
            <CcyBadge ccy={e.ccy} size={26} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: palette.text, lineHeight: 1.3 }}>{e.title}</div>
              <div style={{ fontSize: 11, color: palette.textFaint, marginTop: 1 }}>
                {new Date(e.ms).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })} · {timeOf(e.ms)}
              </div>
            </div>
            <span style={{ fontSize: 11.5, fontWeight: 800, color: palette.gold, whiteSpace: "nowrap" }}>{countdown(e.ms - now)}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const activityPanel = (
    <div style={{ minWidth: 0 }}>
      <PanelHeader icon={TrendingUp} title="Week activity" hint="Releases per currency, next 7 days" />
      <div style={{ padding: "0 16px 14px", display: "grid", gap: 8 }}>
        {weekCounts.length === 0 && <div style={{ fontSize: 12.5, color: palette.textMuted }}>No releases in the next 7 days.</div>}
        {weekCounts.map((c) => {
          const on = ccys.includes(c.ccy);
          return (
            <button
              key={c.ccy}
              type="button"
              className="ec-seg"
              onClick={() => toggleCcy(c.ccy)}
              aria-pressed={on}
              title={`Filter by ${c.ccy}`}
              style={{ display: "grid", gridTemplateColumns: "44px minmax(0, 1fr) 22px", gap: 10, alignItems: "center", background: "transparent", border: 0, padding: 0, cursor: "pointer", fontFamily: sans, textAlign: "left" }}
            >
              <span style={{ fontSize: 12, fontWeight: 800, color: on ? palette.gold : palette.text }}>{c.ccy}</span>
              <span style={{ height: 8, borderRadius: 99, background: tint(palette.text, 7), overflow: "hidden" }}>
                <span style={{ display: "block", height: "100%", width: `${(c.n / weekMax) * 100}%`, borderRadius: 99, background: on ? palette.gold : tint(palette.gold, 70) }} />
              </span>
              <span style={{ fontSize: 12, fontWeight: 800, color: palette.textMuted, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{c.n}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div style={{ padding: isDesktop ? 0 : "0 12px" }}>
      <style>{`.ec-seg button:focus-visible,button.ec-seg:focus-visible,.ec-row:focus-visible,.ec-strip button:focus-visible{outline:2px solid ${palette.gold};outline-offset:1px}
.ec-row:hover{background:${tint(palette.text, 4)}}
.ec-strip{scrollbar-width:thin}
@keyframes ec-spin{to{transform:rotate(360deg)}}
.ec-spin{animation:ec-spin .9s linear infinite}
@media (prefers-reduced-motion: reduce){.ec-seg button,.ec-strip button{transition:none!important}.ec-spin{animation:none}}`}</style>
      <div style={{ background: palette.surface, border: `1px solid ${palette.border}`, borderRadius: 18, overflow: "hidden", boxShadow: palette.shadow }}>
        {hero}
        {isDesktop ? (
          <div style={{ ...hairline, display: "grid", gridTemplateColumns: "minmax(0, 1.55fr) minmax(0, 1fr)" }}>
            <div style={{ borderRight: `1px solid ${palette.border}` }}>{calendarCard}</div>
            <div>
              {banksPanel}
              <div style={hairline}>{aheadPanel}</div>
              <div style={hairline}>{activityPanel}</div>
            </div>
          </div>
        ) : (
          <>
            <div style={hairline}>{calendarCard}</div>
            <div style={hairline}>{banksPanel}</div>
            <div style={hairline}>{aheadPanel}</div>
            <div style={hairline}>{activityPanel}</div>
          </>
        )}
      </div>
    </div>
  );
}
