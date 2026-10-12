import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Newspaper, RefreshCw, TrendingUp } from "lucide-react";
import { palette, sans } from "../lib/theme.js";

const SRC = "https://s3.tradingview.com/external-embedding/";
const tint = (color, pct) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;
const AMBER = "#f5a524";

/* ---------- embedded widgets (ticker, news, movers, and a calendar fallback) ---------- */
function Widget({ name, config, height }) {
  const hostRef = useRef(null);
  const configKey = JSON.stringify(config);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    host.innerHTML = "";
    const inner = document.createElement("div");
    inner.className = "tradingview-widget-container__widget";
    inner.style.height = `${height}px`;
    inner.style.width = "100%";
    host.appendChild(inner);
    const script = document.createElement("script");
    script.src = `${SRC}embed-widget-${name}.js`;
    script.async = true;
    script.type = "text/javascript";
    script.innerHTML = JSON.stringify({ ...JSON.parse(configKey), width: "100%", height });
    host.appendChild(script);
    return () => {
      host.innerHTML = "";
    };
  }, [name, configKey, height]);
  return <div ref={hostRef} className="tradingview-widget-container" style={{ height, width: "100%" }} />;
}

/* ---------- event data helpers (tolerant of different field names) ---------- */
const CCY_BY_COUNTRY = {
  US: "USD", "UNITED STATES": "USD", EU: "EUR", EA: "EUR", "EURO AREA": "EUR", EUROZONE: "EUR",
  DE: "EUR", GERMANY: "EUR", FR: "EUR", FRANCE: "EUR", IT: "EUR", ITALY: "EUR", ES: "EUR", SPAIN: "EUR",
  GB: "GBP", UK: "GBP", "UNITED KINGDOM": "GBP", JP: "JPY", JAPAN: "JPY", CH: "CHF", SWITZERLAND: "CHF",
  CA: "CAD", CANADA: "CAD", AU: "AUD", AUSTRALIA: "AUD", NZ: "NZD", "NEW ZEALAND": "NZD", CN: "CNY", CHINA: "CNY",
};
const CCY_ORDER = ["USD", "EUR", "GBP", "JPY", "AUD", "NZD", "CAD", "CHF", "CNY"];

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
  if (/^\d{4}-\d\d-\d\d$/.test(String(ev.date || "")) && /^\d\d:\d\d/.test(String(ev.time || ""))) {
    const t = String(ev.time).length === 5 ? `${ev.time}:00` : ev.time;
    return Date.parse(`${ev.date}T${t}Z`);
  }
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
  };
}
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
function countdown(ms) {
  const mins = Math.max(0, Math.round(ms / 60000));
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ${mins % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

/* ---------- small UI pieces ---------- */
function Segmented({ label, options, value, onChange }) {
  return (
    <div
      className="ec-seg"
      role="radiogroup"
      aria-label={label}
      style={{
        display: "inline-flex",
        gap: 2,
        padding: 3,
        borderRadius: 11,
        background: tint(palette.text, 5),
        border: `1px solid ${palette.border}`,
        flexShrink: 0,
      }}
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
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 10px",
              borderRadius: 8,
              border: 0,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 700,
              fontFamily: sans,
              background: on ? tint(palette.gold, 18) : "transparent",
              color: on ? palette.gold : palette.textMuted,
              transition: "background .15s ease, color .15s ease",
            }}
          >
            {o.dot && (
              <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: 99, background: o.dot, opacity: on ? 1 : 0.7 }} />
            )}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, hint, controls }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        flexWrap: "wrap",
        minHeight: 52,
        padding: "8px 16px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <span
          aria-hidden="true"
          style={{
            display: "grid",
            placeItems: "center",
            width: 28,
            height: 28,
            borderRadius: 9,
            background: tint(palette.gold, 14),
            color: palette.gold,
            flexShrink: 0,
          }}
        >
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

function ImpactBars({ level }) {
  const col = level >= 3 ? palette.red : level === 2 ? AMBER : palette.textFaint;
  const names = ["No impact", "Low impact", "Medium impact", "High impact"];
  return (
    <span role="img" aria-label={names[level]} style={{ display: "inline-flex", alignItems: "flex-end", gap: 2, height: 13, flexShrink: 0 }}>
      {[1, 2, 3].map((i) => (
        <span key={i} style={{ width: 3, height: 4 + i * 3, borderRadius: 1.5, background: i <= level ? col : tint(palette.text, 14) }} />
      ))}
    </span>
  );
}

function CcyChip({ ccy }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 7px",
        borderRadius: 7,
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: 0.2,
        color: palette.text,
        background: tint(palette.text, 8),
      }}
    >
      {ccy || "—"}
    </span>
  );
}

const colsFor = (showForecast) =>
  showForecast ? "58px 50px 22px minmax(0, 1fr) 62px 62px 62px" : "58px 50px 22px minmax(0, 1fr) 74px 74px";

function EventRow({ ev, isNext, compact, now, rowRef, showForecast }) {
  const time = new Date(ev.ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const accent = isNext ? { boxShadow: `inset 3px 0 0 ${palette.gold}`, background: tint(palette.gold, 7) } : null;
  const val = (label, v, strong) => (
    <div style={{ textAlign: compact ? "left" : "right", fontVariantNumeric: "tabular-nums", minWidth: 0 }}>
      {compact && <div style={{ fontSize: 10.5, color: palette.textFaint, marginBottom: 1 }}>{label}</div>}
      <div
        style={{
          fontSize: 13,
          fontWeight: strong ? 800 : 600,
          color: v == null || v === "" ? palette.textFaint : strong ? palette.text : palette.textMuted,
        }}
      >
        {fmtVal(v, ev.unit)}
      </div>
    </div>
  );

  if (compact) {
    return (
      <div ref={rowRef} style={{ padding: "11px 16px", borderBottom: `1px solid ${palette.border}`, ...accent }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: palette.textMuted, fontVariantNumeric: "tabular-nums" }}>{time}</span>
          <CcyChip ccy={ev.ccy} />
          <ImpactBars level={ev.impact} />
          {isNext && (
            <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 800, color: palette.gold }}>in {countdown(ev.ms - now)}</span>
          )}
        </div>
        <div style={{ margin: "6px 0 8px", fontSize: 13.5, fontWeight: 700, color: palette.text, lineHeight: 1.3 }}>{ev.title}</div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${showForecast ? 3 : 2}, minmax(0, 1fr))`, gap: 8 }}>
          {val("Actual", ev.actual, true)}
          {showForecast && val("Forecast", ev.forecast)}
          {val("Previous", ev.previous)}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={rowRef}
      className="ec-row"
      style={{
        display: "grid",
        gridTemplateColumns: colsFor(showForecast),
        gap: 10,
        alignItems: "center",
        padding: "10px 16px",
        borderBottom: `1px solid ${palette.border}`,
        ...accent,
      }}
    >
      <span style={{ fontSize: 12.5, fontWeight: 700, color: palette.textMuted, fontVariantNumeric: "tabular-nums" }}>{time}</span>
      <CcyChip ccy={ev.ccy} />
      <ImpactBars level={ev.impact} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: palette.text, lineHeight: 1.3 }}>{ev.title}</div>
        {isNext && <div style={{ fontSize: 11, fontWeight: 800, color: palette.gold, marginTop: 2 }}>in {countdown(ev.ms - now)}</div>}
      </div>
      {val("Actual", ev.actual, true)}
      {showForecast && val("Forecast", ev.forecast)}
      {val("Previous", ev.previous)}
    </div>
  );
}

function CcyFilter({ options, value, onChange }) {
  const toggle = (c) => onChange(value.includes(c) ? value.filter((x) => x !== c) : [...value, c]);
  const chip = (on) => ({
    padding: "4px 9px",
    borderRadius: 8,
    fontSize: 11.5,
    fontWeight: 800,
    cursor: "pointer",
    fontFamily: sans,
    border: `1px solid ${on ? tint(palette.gold, 45) : palette.border}`,
    background: on ? tint(palette.gold, 18) : "transparent",
    color: on ? palette.gold : palette.textMuted,
    transition: "background .15s ease, color .15s ease",
  });
  return (
    <div className="ec-seg" role="group" aria-label="Currencies" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      <button type="button" aria-pressed={value.length === 0} onClick={() => onChange([])} style={chip(value.length === 0)}>
        All
      </button>
      {options.map((c) => (
        <button key={c} type="button" aria-pressed={value.includes(c)} onClick={() => toggle(c)} style={chip(value.includes(c))}>
          {c}
        </button>
      ))}
    </div>
  );
}

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

/* ---------- options ---------- */
const RANGE = [
  { id: "today", label: "Today" },
  { id: "tomorrow", label: "Tomorrow" },
  { id: "week", label: "7 days" },
];
const IMPACT = [
  { id: "high", label: "High", min: 3, dot: palette.red },
  { id: "medium", label: "Medium+", min: 2, dot: AMBER },
  { id: "all", label: "All", min: 0, dot: palette.textFaint },
];
const NEWS_FEEDS = [
  { id: "gold", label: "Gold", cfg: { feedMode: "symbol", symbol: "OANDA:XAUUSD" } },
  { id: "top", label: "Top", cfg: { feedMode: "all_symbols" } },
  { id: "forex", label: "Forex", cfg: { feedMode: "market", market: "forex" } },
  { id: "stock", label: "Stocks", cfg: { feedMode: "market", market: "stock" } },
  { id: "crypto", label: "Crypto", cfg: { feedMode: "market", market: "crypto" } },
];
const EXCHANGES = [
  { id: "US", label: "US" },
  { id: "NASDAQ", label: "NASDAQ" },
  { id: "NYSE", label: "NYSE" },
];
const TICKER = [
  { proName: "OANDA:XAUUSD", title: "Gold" },
  { proName: "TVC:DXY", title: "Dollar index" },
  { proName: "TVC:US10Y", title: "US 10Y" },
  { proName: "FOREXCOM:SPXUSD", title: "S&P 500" },
  { proName: "FOREXCOM:NSXUSD", title: "Nasdaq 100" },
  { proName: "TVC:USOIL", title: "WTI crude" },
  { proName: "FX:EURUSD", title: "EUR/USD" },
  { proName: "FX:USDJPY", title: "USD/JPY" },
  { proName: "BITSTAMP:BTCUSD", title: "Bitcoin" },
];
const hairline = { borderTop: `1px solid ${palette.border}` };

export default function EconCalendarTab({ theme = "dark", isDesktop, apiBase, econEvents: fmpEvents, econStatus: fmpStatus = "idle", econError: fmpError = "", onRefresh }) {
  const [range, setRange] = useState("week");
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
  const [feed, setFeed] = useState("gold");
  const [exchange, setExchange] = useState("US");
  const [now, setNow] = useState(() => Date.now());
  const [own, setOwn] = useState({ events: [], status: apiBase ? "loading" : "off", error: "" });

  // Your own calendar from the worker (/market/calendar). Falls back to the FMP data if it is unavailable.
  const loadOwn = useRef(null);
  loadOwn.current = async () => {
    if (!apiBase) return;
    setOwn((o) => ({ ...o, status: o.events.length ? o.status : "loading", error: "" }));
    try {
      const res = await fetch(`${apiBase}/market/calendar`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !Array.isArray(data.events)) throw new Error(data.error || "Couldn't load the calendar.");
      setOwn({ events: data.events, status: "live", error: "" });
    } catch (err) {
      setOwn((o) => ({ events: o.events, status: o.events.length ? "live" : "error", error: err.message || "Couldn't load the calendar." }));
    }
  };
  useEffect(() => {
    loadOwn.current();
    const id = setInterval(() => loadOwn.current(), 5 * 60000);
    return () => clearInterval(id);
  }, [apiBase]);
  const usingOwn = own.status === "live";
  const econEvents = usingOwn ? own.events : fmpEvents;
  const econStatus = usingOwn ? "live" : own.status === "loading" ? "loading" : fmpStatus;
  const econError = usingOwn ? "" : own.error || fmpError;

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const colorTheme = theme === "light" ? "light" : "dark";
  const base = useMemo(() => ({ colorTheme, isTransparent: true, locale: "en" }), [colorTheme]);
  const tz = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g, " ");
    } catch (e) {
      return "your local time";
    }
  }, []);

  const all = useMemo(
    () => (Array.isArray(econEvents) ? econEvents : []).map(normalize).filter(Boolean).sort((a, b) => a.ms - b.ms),
    [econEvents]
  );
  const today0 = startOfDay(now);

  const filtered = useMemo(() => {
    const DAY = 86400000;
    const [from, to] =
      range === "today" ? [today0, today0 + DAY] : range === "tomorrow" ? [today0 + DAY, today0 + 2 * DAY] : [today0, today0 + 7 * DAY];
    const min = IMPACT.find((i) => i.id === impact).min;
    return all.filter((e) => {
      if (e.ms < from || e.ms >= to || e.impact < min) return false;
      if (ccys.length && !(ccys.includes(e.ccy) || e.ccy === "ALL")) return false;
      return true;
    });
  }, [all, range, impact, ccys, today0]);

  const currencyOptions = useMemo(() => {
    const extra = [...new Set(all.map((e) => e.ccy))].filter((c) => c && c !== "ALL" && !CCY_ORDER.includes(c)).sort();
    return [...CCY_ORDER, ...extra];
  }, [all]);

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
  const todayKey = dayKey(now);

  const listRef = useRef(null);
  const nextRowRef = useRef(null);
  const scrollKey = `${range}|${impact}|${ccys.join(",")}|${all.length}`;
  useEffect(() => {
    const box = listRef.current;
    if (!box) return;
    const row = nextRowRef.current;
    box.scrollTop = row ? Math.max(0, row.offsetTop - 44) : 0;
  }, [scrollKey]);

  const loading = econStatus === "loading";
  const showForecast = all.some((e) => e.forecast !== null && e.forecast !== undefined && e.forecast !== "");
  const failed = econStatus === "error" && all.length === 0;
  const unusable = Array.isArray(econEvents) && econEvents.length > 0 && all.length === 0;

  const tickerCfg = useMemo(() => ({ ...base, symbols: TICKER, showSymbolLogo: true, displayMode: "regular" }), [base]);
  const fallbackCfg = useMemo(() => ({ ...base, importanceFilter: "0,1", countryFilter: "us" }), [base]);
  const newsCfg = useMemo(() => ({ ...base, displayMode: "regular", ...NEWS_FEEDS.find((f) => f.id === feed).cfg }), [base, feed]);
  const moversCfg = useMemo(
    () => ({ ...base, exchange, dateRange: "1D", showChart: true, showSymbolLogo: true, showFloatingTooltip: false }),
    [base, exchange]
  );
  const sideH = isDesktop ? 420 : 480;

  const refreshBtn = (
    <button
      type="button"
      onClick={() => {
        loadOwn.current();
        if (!usingOwn && onRefresh) onRefresh();
      }}
      disabled={loading}
      aria-label="Refresh calendar"
      title="Refresh calendar"
      className="ec-seg"
      style={{
        display: "grid",
        placeItems: "center",
        width: 32,
        height: 32,
        borderRadius: 10,
        border: `1px solid ${palette.border}`,
        background: tint(palette.text, 5),
        color: palette.textMuted,
        cursor: loading ? "default" : "pointer",
      }}
    >
      <RefreshCw size={14} className={loading ? "ec-spin" : undefined} />
    </button>
  );

  const list = (() => {
    if (loading && all.length === 0) return <Skeleton />;
    if (failed || unusable) {
      return (
        <div style={{ padding: "14px 16px" }}>
          <div style={{ fontSize: 13, color: palette.textMuted, marginBottom: 10, lineHeight: 1.45 }}>
            {failed
              ? `${econError || "Couldn't load the calendar."} Showing the backup calendar instead.`
              : "The calendar data came back in a format this view can't read, so the backup calendar is shown."}
          </div>
          <Widget name="events" config={fallbackCfg} height={isDesktop ? 520 : 480} />
        </div>
      );
    }
    if (groups.length === 0) {
      return (
        <div style={{ padding: "36px 24px", textAlign: "center", color: palette.textMuted, fontSize: 13, lineHeight: 1.5 }}>
          No releases match these filters. Try 7 days, lower the impact level, or add more currencies.
        </div>
      );
    }
    return groups.map((g) => (
      <div key={g.key}>
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 1,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 16px",
            background: palette.surface,
            borderBottom: `1px solid ${palette.border}`,
            fontSize: 12.5,
            fontWeight: 800,
            color: palette.text,
          }}
        >
          {new Date(g.ms).toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })}
          {g.key === todayKey && (
            <span style={{ fontSize: 10.5, fontWeight: 800, padding: "2px 7px", borderRadius: 99, background: tint(palette.gold, 18), color: palette.gold }}>
              Today
            </span>
          )}
          <span style={{ marginLeft: "auto", fontWeight: 600, color: palette.textFaint }}>
            {g.items.length} {g.items.length === 1 ? "release" : "releases"}
          </span>
        </div>
        {g.items.map((ev) => {
          const isNext = next && ev.id === next.id;
          return <EventRow key={ev.id} ev={ev} isNext={isNext} compact={!isDesktop} now={now} rowRef={isNext ? nextRowRef : undefined} showForecast={showForecast} />;
        })}
      </div>
    ));
  })();

  const calendarInner = (
    <div style={{ display: "flex", flexDirection: "column", height: isDesktop ? "100%" : "auto", minHeight: 0 }}>
      <SectionHeader icon={CalendarDays} title="Economic calendar" hint={`Times in ${tz}`} controls={refreshBtn} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "0 16px 10px" }}>
        <Segmented label="Date range" options={RANGE} value={range} onChange={setRange} />
        <Segmented label="Impact" options={IMPACT} value={impact} onChange={setImpact} />
      </div>
      <div style={{ padding: "0 16px 10px" }}>
        <CcyFilter options={currencyOptions} value={ccys} onChange={setCcys} />
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          minHeight: 44,
          padding: "6px 16px",
          boxSizing: "border-box",
          background: tint(palette.gold, 8),
          ...hairline,
        }}
        aria-live="polite"
      >
        {next ? (
          <>
            <CcyChip ccy={next.ccy} />
            <ImpactBars level={next.impact} />
            <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, color: palette.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {next.title}
            </span>
            <span style={{ fontSize: 13, fontWeight: 800, color: palette.gold, whiteSpace: "nowrap" }}>in {countdown(next.ms - now)}</span>
          </>
        ) : (
          <span style={{ fontSize: 13, color: palette.textMuted }}>No more releases in this view.</span>
        )}
      </div>
      {isDesktop && !failed && !unusable && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: colsFor(showForecast),
            gap: 10,
            padding: "8px 16px",
            fontSize: 11,
            color: palette.textFaint,
            fontWeight: 700,
            ...hairline,
          }}
        >
          <span>Time</span>
          <span>Currency</span>
          <span />
          <span>Event</span>
          <span style={{ textAlign: "right" }}>Actual</span>
          {showForecast && <span style={{ textAlign: "right" }}>Forecast</span>}
          <span style={{ textAlign: "right" }}>Previous</span>
        </div>
      )}
      <div
        ref={listRef}
        style={{
          position: "relative",
          overflowY: "auto",
          flex: isDesktop ? 1 : "none",
          height: isDesktop ? undefined : 560,
          minHeight: 0,
          ...hairline,
        }}
      >
        {list}
      </div>
    </div>
  );

  const news = (
    <div style={{ minWidth: 0 }}>
      <SectionHeader icon={Newspaper} title="News" controls={<Segmented label="News feed" options={NEWS_FEEDS} value={feed} onChange={setFeed} />} />
      <div style={{ padding: "0 8px 8px" }}>
        <Widget name="timeline" config={newsCfg} height={sideH} />
      </div>
    </div>
  );
  const movers = (
    <div style={{ minWidth: 0 }}>
      <SectionHeader icon={TrendingUp} title="Stocks up and down" controls={<Segmented label="Exchange" options={EXCHANGES} value={exchange} onChange={setExchange} />} />
      <div style={{ padding: "0 8px 8px" }}>
        <Widget name="hotlists" config={moversCfg} height={sideH} />
      </div>
    </div>
  );

  return (
    <div style={{ padding: isDesktop ? 0 : "0 12px" }}>
      <style>{`.ec-seg button:focus-visible,button.ec-seg:focus-visible{outline:2px solid ${palette.gold};outline-offset:1px}
.ec-row:hover{background:${tint(palette.text, 4)}}
@keyframes ec-spin{to{transform:rotate(360deg)}}
.ec-spin{animation:ec-spin .9s linear infinite}
@media (prefers-reduced-motion: reduce){.ec-seg button{transition:none!important}.ec-spin{animation:none}}`}</style>
      <div
        style={{
          background: palette.surface,
          border: `1px solid ${palette.border}`,
          borderRadius: 18,
          overflow: "hidden",
          boxShadow: palette.shadow,
        }}
      >
        <div style={{ padding: "2px 8px" }}>
          <Widget name="ticker-tape" config={tickerCfg} height={76} />
        </div>
        {isDesktop ? (
          <div style={{ ...hairline, display: "grid", gridTemplateColumns: "minmax(0, 1.5fr) minmax(0, 1fr)" }}>
            <div style={{ position: "relative", borderRight: `1px solid ${palette.border}` }}>
              <div style={{ position: "absolute", inset: 0 }}>{calendarInner}</div>
            </div>
            <div>
              {news}
              <div style={hairline}>{movers}</div>
            </div>
          </div>
        ) : (
          <>
            <div style={hairline}>{calendarInner}</div>
            <div style={hairline}>{news}</div>
            <div style={hairline}>{movers}</div>
          </>
        )}
      </div>
    </div>
  );
}
