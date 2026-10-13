import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Clock, RefreshCw, Search, SlidersHorizontal, X } from "lucide-react";
import { palette, sans } from "../lib/theme.js";

/* =====================================================================================
   Economic calendar tab - TradeFuse-style layout. Everything on this screen comes from
   your own worker (/market/calendar). No embedded widgets, no outside calendar source.
   ===================================================================================== */

const tint = (color, pct) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;
const AMBER = "#f5a524";
const hairline = { borderTop: `1px solid ${palette.border}` };

/* ---------- currencies ---------- */
const CCY_META = {
  USD: { name: "United States", bank: "Fed" },
  EUR: { name: "Euro Area", bank: "ECB" },
  GBP: { name: "United Kingdom", bank: "BoE" },
  JPY: { name: "Japan", bank: "BoJ" },
  AUD: { name: "Australia", bank: "RBA" },
  NZD: { name: "New Zealand", bank: "RBNZ" },
  CAD: { name: "Canada", bank: "BoC" },
  CHF: { name: "Switzerland", bank: "SNB" },
  CNY: { name: "China", bank: "PBoC" },
};
const CCY_ORDER = ["USD", "EUR", "GBP", "JPY", "AUD", "NZD", "CAD", "CHF", "CNY"];
const CCY_BY_COUNTRY = {
  US: "USD", "UNITED STATES": "USD", EU: "EUR", EA: "EUR", "EURO AREA": "EUR", EUROZONE: "EUR",
  DE: "EUR", GERMANY: "EUR", FR: "EUR", FRANCE: "EUR", IT: "EUR", ITALY: "EUR", ES: "EUR", SPAIN: "EUR",
  GB: "GBP", UK: "GBP", "UNITED KINGDOM": "GBP", JP: "JPY", JAPAN: "JPY", CH: "CHF", SWITZERLAND: "CHF",
  CA: "CAD", CANADA: "CAD", AU: "AUD", AUSTRALIA: "AUD", NZ: "NZD", "NEW ZEALAND": "NZD", CN: "CNY", CHINA: "CNY",
};
const ZONES = [
  ["Asia/Dhaka", "Dhaka"], ["Asia/Singapore", "Singapore"], ["Asia/Dubai", "Dubai"], ["Asia/Tokyo", "Tokyo"], ["Australia/Sydney", "Sydney"],
  ["Pacific/Auckland", "Auckland"], ["Europe/London", "London"], ["Europe/Berlin", "Frankfurt"], ["Europe/Zurich", "Zurich"],
  ["America/New_York", "New York"], ["America/Chicago", "Chicago"], ["America/Toronto", "Toronto"], ["UTC", "UTC"],
];

/* ---------- currency icons: round flags (artwork from the MIT-licensed "country-flag-icons" set, stored right here so nothing is loaded from outside) ---------- */
const FLAG_SVG = {
  USD: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"59.85 0 342 342\"><path fill=\"#FFF\" d=\"M0 0h513v342H0z\"/><g fill=\"#D80027\"><path d=\"M0 0h513v26.3H0zM0 52.6h513v26.3H0zM0 105.2h513v26.3H0zM0 157.8h513v26.3H0zM0 210.5h513v26.3H0zM0 263.1h513v26.3H0zM0 315.7h513V342H0z\"/></g><path fill=\"#2E52B2\" d=\"M0 0h256.5v184.1H0z\"/><g fill=\"#FFF\"><path d=\"m47.8 138.9-4-12.8-4.4 12.8H26.2l10.7 7.7-4 12.8 10.9-7.9 10.6 7.9-4.1-12.8 10.9-7.7zM104.1 138.9l-4.1-12.8-4.2 12.8H82.6l10.7 7.7-4 12.8 10.7-7.9 10.8 7.9-4-12.8 10.7-7.7zM160.6 138.9l-4.3-12.8-4 12.8h-13.5l11 7.7-4.2 12.8 10.7-7.9 11 7.9-4.2-12.8 10.7-7.7zM216.8 138.9l-4-12.8-4.2 12.8h-13.3l10.8 7.7-4 12.8 10.7-7.9 10.8 7.9-4.3-12.8 11-7.7zM100 75.3l-4.2 12.8H82.6L93.3 96l-4 12.6 10.7-7.8 10.8 7.8-4-12.6 10.7-7.9h-13.4zM43.8 75.3l-4.4 12.8H26.2L36.9 96l-4 12.6 10.9-7.8 10.6 7.8L50.3 96l10.9-7.9H47.8zM156.3 75.3l-4 12.8h-13.5l11 7.9-4.2 12.6 10.7-7.8 11 7.8-4.2-12.6 10.7-7.9h-13.2zM212.8 75.3l-4.2 12.8h-13.3l10.8 7.9-4 12.6 10.7-7.8 10.8 7.8-4.3-12.6 11-7.9h-13.5zM43.8 24.7l-4.4 12.6H26.2l10.7 7.9-4 12.7L43.8 50l10.6 7.9-4.1-12.7 10.9-7.9H47.8zM100 24.7l-4.2 12.6H82.6l10.7 7.9-4 12.7L100 50l10.8 7.9-4-12.7 10.7-7.9h-13.4zM156.3 24.7l-4 12.6h-13.5l11 7.9-4.2 12.7 10.7-7.9 11 7.9-4.2-12.7 10.7-7.9h-13.2zM212.8 24.7l-4.2 12.6h-13.3l10.8 7.9-4 12.7 10.7-7.9 10.8 7.9-4.3-12.7 11-7.9h-13.5z\"/></g></svg>",
  EUR: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 408 408\"><path fill=\"#039\" d=\"M0 0h408v408H0V0z\"/><path fill=\"#FC0\" d=\"m203.963 45.231 5.089 15.653h16.542l-13.322 9.68 5.015 15.67-13.323-9.68-13.323 9.68 5.089-15.662-13.322-9.68h16.468l5.087-15.661zm-68 18.134 5.089 15.653h16.542l-13.323 9.68 5.016 15.67-13.324-9.68-13.323 9.68 5.089-15.662-13.323-9.681h16.468l5.089-15.66zm-49.867 49.866 5.089 15.653h16.542l-13.323 9.68 5.016 15.67-13.324-9.68-13.323 9.68 5.089-15.662-13.323-9.68h16.468l5.089-15.661zM67.963 181.23l5.089 15.654h16.542l-13.323 9.682 5.016 15.67-13.324-9.682-13.323 9.682 5.089-15.664-13.323-9.679h16.468l5.089-15.663zm18.133 68.001 5.089 15.654h16.542l-13.323 9.68 5.016 15.67-13.324-9.68-13.323 9.68 5.089-15.662-13.323-9.68h16.468l5.089-15.662zm49.867 49.867 5.089 15.654h16.542l-13.323 9.68 5.016 15.67-13.324-9.679-13.323 9.679 5.089-15.661-13.323-9.681h16.468l5.089-15.662zm136-235.733 5.089 15.653h16.542l-13.322 9.68 5.015 15.67-13.323-9.68-13.324 9.68 5.09-15.662-13.322-9.681h16.468l5.087-15.66zm49.867 49.866 5.088 15.653h16.543l-13.323 9.68 5.015 15.67-13.322-9.68-13.324 9.68 5.09-15.662-13.323-9.68h16.468l5.088-15.661zm18.133 68 5.089 15.653h16.542l-13.322 9.682 5.015 15.67-13.323-9.682-13.323 9.682 5.089-15.664-13.322-9.679h16.468l5.087-15.662zm-18.133 68 5.088 15.654h16.543l-13.323 9.68 5.016 15.67-13.323-9.68-13.324 9.68 5.09-15.662-13.323-9.68h16.469l5.087-15.662zm-117.867 68 5.089 15.654h16.542l-13.322 9.68 5.015 15.67-13.323-9.68-13.323 9.68 5.089-15.662-13.322-9.68h16.468l5.087-15.662zm68-18.133 5.089 15.654h16.542l-13.322 9.68 5.016 15.67-13.324-9.68-13.322 9.68 5.088-15.662-13.322-9.68h16.469l5.086-15.662z\"/></svg>",
  GBP: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"85.5 0 342 342\"><g fill=\"#FFF\"><path d=\"M0 0h513v341.3H0V0z\"/><path d=\"M311.7 230 513 341.3v-31.5L369.3 230h-57.6zM200.3 111.3 0 0v31.5l143.7 79.8h56.6z\"/></g><g fill=\"#012169\"><path d=\"M393.8 230 513 295.7V230H393.8zm-82.1 0L513 341.3v-31.5L369.3 230h-57.6zm146.9 111.3-147-81.7v81.7h147zM90.3 230 0 280.2V230h90.3zm110 14.2v97.2H25.5l174.8-97.2zM118.2 111.3 0 45.6v65.7h118.2zm82.1 0L0 0v31.5l143.7 79.8h56.6zM53.4 0l147 81.7V0h-147zM421.7 111.3 513 61.1v50.2h-91.3zm-110-14.2V0h174.9L311.7 97.1z\"/></g><g fill=\"#c8102e\"><path d=\"M288 0h-64v138.7H0v64h224v138.7h64V202.7h224v-64H288V0z\"/><path d=\"M311.7 230 513 341.3v-31.5L369.3 230h-57.6zM143.7 230 0 309.9v31.5L200.3 230h-56.6zM200.3 111.3 0 0v31.5l143.7 79.8h56.6zM368.3 111.3 513 31.5V0L311.7 111.3h56.6z\"/></g></svg>",
  JPY: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"85.5 0 342 342\"><path fill=\"#FFF\" d=\"M0 0h512v342H0z\"/><circle fill=\"#D80027\" cx=\"256.5\" cy=\"171\" r=\"96\"/></svg>",
  AUD: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"85.5 0 342 342\"><path fill=\"#00008b\" d=\"M0 0h513v342H0z\"/><g fill=\"#FFF\"><path d=\"m188 212.6 11 22.9 24.7-5.7-11 22.8 19.9 15.8-24.8 5.6.1 25.4-19.9-15.9-19.8 15.9.1-25.4-24.8-5.6 19.9-15.8-11.1-22.8 24.8 5.7zM385.9 241.1l5.2 10.9 11.8-2.7-5.3 10.9 9.5 7.5-11.8 2.6v12.2l-9.4-7.6-9.5 7.6.1-12.2-11.8-2.6 9.5-7.5-5.3-10.9 11.8 2.7zM337.3 125.1l5.2 10.9 11.8-2.7-5.3 10.9 9.5 7.5-11.8 2.7v12.1l-9.4-7.6-9.5 7.6.1-12.1-11.9-2.7 9.5-7.5-5.3-10.9L332 136zM385.9 58.9l5.2 10.9 11.8-2.7-5.3 10.9 9.5 7.5-11.8 2.7v12.1l-9.4-7.6-9.5 7.6.1-12.1-11.8-2.7 9.5-7.5-5.3-10.9 11.8 2.7zM428.4 108.6l5.2 10.9 11.8-2.7-5.3 10.9 9.5 7.5-11.8 2.6V150l-9.4-7.6-9.5 7.6v-12.2l-11.8-2.6 9.5-7.5-5.3-10.9 11.8 2.7zM398 166.5l4.1 12.7h13.3l-10.8 7.8 4.2 12.7-10.8-7.9-10.8 7.9 4.1-12.7-10.7-7.8h13.3z\"/></g><path fill=\"#00008b\" d=\"M0 0h256.5v171H0z\"/><g fill=\"#FFF\"><path d=\"M256.5 0v30.6l-45.3 25.2h45.3v59.4h-59.2l59.2 32.9V171h-26.7l-73.7-40.9V171h-55.7v-48.7L12.8 171H0v-30.6l45.3-25.2H0V55.8h59.2L0 22.9V0h26.7l73.7 40.9V0h55.7v48.7L243.7 0z\"/><path d=\"M156.1 115.2 256.5 171v-15.8l-72-40zM100.4 55.8 0 0v15.8l72 40z\"/></g><g fill=\"red\"><path d=\"M144.3 0h-32.1v69.5H0v32h112.2V171h32.1v-69.5h112.2v-32H144.3z\"/><path d=\"M156.1 115.2 256.5 171v-15.8l-72-40zM72 115.2l-72 40V171l100.4-55.8zM100.4 55.8 0 0v15.8l72 40zM184.5 55.8l72-40V0L156.1 55.8z\"/></g></svg>",
  NZD: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"114.57 0 342 342\"><path fill=\"#012169\" d=\"M0 0h513v342H0z\"/><g fill=\"#D80027\" stroke=\"#FFF\" stroke-width=\"2\" stroke-miterlimit=\"10\"><path d=\"m448.9 107.7 4.2 13.1h13.8l-11.1 8.1L460 142l-11.1-8.1-11.1 8.1 4.2-13.1-11.1-8.1h13.7zM384.7 253.6l5.1 15.6h16.4l-13.2 9.7 5 15.6-13.3-9.7-13.2 9.7 5-15.6-13.3-9.7h16.5zM384.8 43.4l4.7 14.6h15.3l-12.4 8.9 4.7 14.6-12.3-9-12.4 9 4.7-14.6-12.3-8.9H380zM320.6 129.4l4.7 14.5h15.3l-12.3 9 4.7 14.5-12.4-8.9-12.3 8.9 4.7-14.5-12.4-9h15.3z\"/></g><path fill=\"#012169\" d=\"M0 0h256.5v171H0z\"/><g fill=\"#FFF\"><path d=\"M256.5 0v30.6l-45.3 25.2h45.3v59.4h-59.2l59.2 32.9V171h-26.7l-73.7-40.9V171h-55.7v-48.7L12.8 171H0v-30.6l45.3-25.2H0V55.8h59.2L0 22.9V0h26.7l73.7 40.9V0h55.7v48.7L243.7 0z\"/><path d=\"M156.1 115.2 256.5 171v-15.8l-72-40zM100.4 55.8 0 0v15.8l72 40z\"/></g><g fill=\"#D80027\"><path d=\"M144.3 0h-32.1v69.5H0v32h112.2V171h32.1v-69.5h112.2v-32H144.3z\"/><path d=\"M156.1 115.2 256.5 171v-15.8l-72-40zM72 115.2l-72 40V171l100.4-55.8zM100.4 55.8 0 0v15.8l72 40zM184.5 55.8l72-40V0L156.1 55.8z\"/></g></svg>",
  CAD: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"85.5 0 342 342\"><path fill=\"#FFF\" d=\"M0 0h513v342H0z\"/><g fill=\"red\"><path d=\"M0 0h142v342H0zM371 0h142v342H371zM306.5 206l50.4-25.2-25.2-12.6V143l-50.4 25.2 25.2-50.4h-25.2L256.1 80l-25.2 37.8h-25.2l25.2 50.4-50.4-25.2v25.2l-25.2 12.6 50.4 25.2-12.6 25.2h50.4V269h25.2v-37.8h50.4z\"/></g></svg>",
  CHF: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"128 0 512 512\"><path fill=\"red\" d=\"M0 0h768v512H0V0z\"/><path fill=\"#FFF\" d=\"M336 96h96v112h112v96H432v112h-96V304H224v-96h112V96z\"/></svg>",
  CNY: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"75.24 0 342 342\"><path fill=\"#D80027\" d=\"M0 0h513v342H0z\"/><g fill=\"#FFDA44\"><path d=\"m226.8 239.2-9.7-15.6-17.9 4.4 11.9-14.1-9.7-15.6 17.1 6.9 11.8-14.1-1.3 18.4 17.1 6.9-17.9 4.4zM290.6 82l-10.1 15.4 11.6 14.3-17.7-4.8-10.1 15.5-1-18.4-17.7-4.8 17.2-6.6-1-18.4 11.6 14.3zM236.2 25.4l-2 18.3 16.8 7.6-18 3.8-2 18.3-9.2-16-17.9 3.8 12.3-13.7-9.2-15.9 16.8 7.5zM292.8 161.8l-14.9 10.9 5.8 17.5-14.9-10.8-14.9 11 5.6-17.6-14.9-10.7 18.4-.1 5.6-17.6 5.8 17.5zM115 46.3l17.3 53.5h56.2l-45.4 32.9 17.3 53.5-45.4-33-45.5 33 17.4-53.5-45.5-32.9h56.3z\"/></g></svg>",
};
const FLAG_URI = {};
const flagUri = (ccy) => {
  if (!FLAG_SVG[ccy]) return "";
  return FLAG_URI[ccy] || (FLAG_URI[ccy] = `data:image/svg+xml;utf8,${encodeURIComponent(FLAG_SVG[ccy])}`);
};
function Flag({ ccy, w = 22 }) {
  const src = flagUri(ccy);
  const ring = { width: w, height: w, borderRadius: "50%", flexShrink: 0, boxShadow: `0 0 0 1px ${tint(palette.text, 18)}` };
  if (!src) {
    return (
      <span aria-hidden="true" style={{ ...ring, display: "inline-grid", placeItems: "center", background: tint(palette.text, 10), color: palette.textMuted, fontSize: w * 0.36, fontWeight: 800 }}>
        {(ccy || "?").slice(0, 2)}
      </span>
    );
  }
  return <img src={src} alt="" aria-hidden="true" width={w} height={w} draggable={false} style={{ ...ring, display: "block", objectFit: "cover" }} />;
}
// Two overlapping flags for a currency pair such as EUR/USD.
function PairIcon({ a, b, w = 22 }) {
  const overlap = Math.round(w * 0.38);
  return (
    <span aria-hidden="true" style={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
      <Flag ccy={a} w={w} />
      <span style={{ marginLeft: -overlap, borderRadius: "50%", boxShadow: `0 0 0 2px ${palette.surface}`, display: "inline-flex" }}>
        <Flag ccy={b} w={w} />
      </span>
    </span>
  );
}
// "EUR/USD", "EURUSD", "EUR-USD" -> ["EUR", "USD"] (only when both sides are real currency codes)
function parsePair(text) {
  const m = String(text || "").toUpperCase().match(/^([A-Z]{3})[\/\-_ ]?([A-Z]{3})$/);
  return m && m[1] !== m[2] && (CCY_META[m[1]] || m[1] === "XAU") && (CCY_META[m[2]] || m[2] === "XAU") ? [m[1], m[2]] : null;
}

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

/* ---------- event data helpers ---------- */
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
function categoryOf(title) {
  const t = title.toLowerCase();
  if (/(rate decision|ocr|cash rate|bank rate|press conference|fomc)/.test(t)) return "Central Bank";
  if (/(cpi|ppi|pce|price)/.test(t)) return "Inflation";
  if (/(payroll|unemployment|jobless|claims|earnings|jolts|job openings|employment)/.test(t)) return "Employment";
  if (/(gdp|retail|industrial|production)/.test(t)) return "Growth";
  return "Other";
}
const CATEGORIES = ["Central Bank", "Inflation", "Employment", "Growth", "Other"];
function normalize(ev, i) {
  if (!ev || typeof ev !== "object") return null;
  const ms = eventMs(ev);
  const title = ev.event ?? ev.title ?? ev.name ?? ev.indicator;
  if (!Number.isFinite(ms) || !title) return null;
  const pair = parsePair(ev.pair || ev.symbol || currencyOf(ev));
  return {
    id: ev.id ?? `${ms}-${i}`,
    indicator: ev.indicator && typeof ev.indicator === "string" ? ev.indicator : "",
    ms,
    title: String(title),
    ccy: pair ? `${pair[0]}/${pair[1]}` : currencyOf(ev),
    pair,
    impact: impactOf(ev),
    cat: categoryOf(String(title)),
    actual: ev.actual,
    forecast: ev.estimate ?? ev.forecast ?? ev.consensus,
    previous: ev.previous ?? ev.prior,
    unit: typeof ev.unit === "string" && ev.unit.length <= 4 ? ev.unit : "",
    change: typeof ev.change === "number" ? ev.change : null,
    status: ev.status || "",
  };
}
const isNum = (v) => typeof v === "number" && Number.isFinite(v);
function fmtVal(v, unit) {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "number") return `${v.toLocaleString(undefined, { maximumFractionDigits: 3 })}${unit || ""}`;
  return String(v);
}
function countdown(ms) {
  const mins = Math.max(0, Math.round(ms / 60000));
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ${mins % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}
function surpriseOf(ev) {
  if (!isNum(ev.actual)) return null;
  const vs = isNum(ev.forecast) ? "forecast" : isNum(ev.previous) ? "previous" : null;
  if (!vs) return null;
  const d = Number((ev.actual - (vs === "forecast" ? ev.forecast : ev.previous)).toFixed(4));
  if (d === 0) return { dir: 0, text: `In line with ${vs}` };
  return { dir: d > 0 ? 1 : -1, text: `${d > 0 ? "Above" : "Below"} ${vs} by ${fmtVal(Math.abs(d), ev.unit)}` };
}

/* ---------- dates in the chosen time zone (as plain YYYY-MM-DD text, so no daylight-saving surprises) ---------- */
const legsOf = (e) => (e.pair ? e.pair : [e.ccy]);
const ymd = (ms, tz) => new Date(ms).toLocaleDateString("en-CA", { timeZone: tz });
const shiftYmd = (s, n) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
const dowOf = (s) => new Date(`${s}T00:00:00Z`).getUTCDay();
const timeIn = (ms, tz) => new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: tz });
const longDay = (s) => new Date(`${s}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
function offsetLabel(ms, tz) {
  try {
    const p = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset" }).formatToParts(new Date(ms)).find((x) => x.type === "timeZoneName");
    return p ? p.value : "";
  } catch (e) {
    return "";
  }
}
function marketOpen(ms) {
  const d = new Date(ms);
  const day = d.getUTCDay();
  const h = d.getUTCHours();
  if (day === 6) return false;
  if (day === 0) return h >= 22;
  if (day === 5) return h < 22;
  return true;
}
function updatedText(ms, now) {
  if (!ms) return "";
  const m = Math.floor((now - ms) / 60000);
  return m < 1 ? "Updated just now" : m < 60 ? `Updated ${m} min ago` : `Updated ${Math.floor(m / 60)}h ago`;
}

/* ---------- plain-language notes shown when a row is opened ---------- */
function infoFor(ev) {
  const t = ev.title.toLowerCase();
  const cur = CCY_META[ev.ccy] ? CCY_META[ev.ccy].name : ev.ccy;
  const bank = CCY_META[ev.ccy] ? CCY_META[ev.ccy].bank : "the central bank";
  if (ev.pair)
    return {
      what: `News that affects the ${ev.ccy} pair, so it can move both currencies.`,
      why: "A pair moves on the difference between its two currencies, so news about either side can change the price.",
      how: `Think about which currency the news helps. Good news for ${ev.pair[0]} tends to lift ${ev.ccy}; good news for ${ev.pair[1]} tends to push it down.`,
    };
  const stronger = "A result stronger than the forecast usually supports the currency, a weaker one usually weighs on it.";
  const inflationHow = "A higher reading than forecast often raises expectations of tighter policy and tends to support the currency; a lower one often does the opposite.";
  const inflationWhy = "Central banks set interest rates with inflation in mind, so a surprise here can change rate expectations quickly.";
  const jobsWhy = "Jobs data shows how healthy the economy is and shapes what the central bank does next, so it can move the currency, gold and indices.";
  if (/press conference/.test(t))
    return {
      what: `A live question-and-answer session where officials from ${bank} explain their latest decision.`,
      why: "The tone and hints about future rate moves can move markets after the decision itself, often with sharp swings.",
      how: "There is no number to compare. Watch whether officials sound more cautious or more confident than expected.",
    };
  if (/rate decision|ocr|cash rate|bank rate/.test(t))
    return {
      what: `The ${bank} announces whether it raises, cuts or holds its main interest rate for ${cur}.`,
      why: "Interest rates are one of the biggest drivers of a currency over time. The statement and tone can matter as much as the rate itself.",
      how: "Compare the decision with what the market expected. A hold can still move price if the guidance sounds hawkish (more rate rises) or dovish (more cuts).",
    };
  if (/non-farm|payroll/.test(t))
    return { what: "How many jobs the US economy added or lost last month, not counting farm work.", why: jobsWhy, how: stronger };
  if (/unemployment rate/.test(t))
    return { what: "The share of people who want a job but can't find one.", why: jobsWhy, how: "Here lower is the stronger result: a lower rate than forecast usually supports the currency." };
  if (/earnings/.test(t))
    return { what: "How much average pay per hour changed over the month.", why: "Rising wages can keep inflation high, which central banks watch closely.", how: "Higher than forecast often points to tighter policy and tends to support the currency." };
  if (/jolts|job openings/.test(t))
    return { what: "The number of open job positions employers are trying to fill.", why: jobsWhy, how: stronger };
  if (/jobless claims/.test(t))
    return { what: "How many people filed a first-time claim for unemployment benefits last week.", why: "It is one of the quickest signals of how the job market is holding up.", how: "Lower is the stronger result: fewer claims than forecast usually supports the currency." };
  if (/core cpi/.test(t))
    return { what: "Consumer prices excluding food and energy, which swing a lot. m/m is the change on last month, y/y on a year ago.", why: inflationWhy, how: inflationHow };
  if (/cpi/.test(t))
    return { what: "How much the prices consumers pay changed. m/m is the change on last month, y/y on a year ago.", why: inflationWhy, how: inflationHow };
  if (/core pce/.test(t))
    return { what: "The Fed's preferred inflation measure, excluding food and energy.", why: inflationWhy, how: inflationHow };
  if (/pce/.test(t))
    return { what: "A broad measure of how prices of what people spend on have changed.", why: inflationWhy, how: inflationHow };
  if (/ppi/.test(t))
    return { what: "How much prices changed for businesses at the producer level, often an early sign for consumer prices.", why: inflationWhy, how: inflationHow };
  if (/gdp/.test(t))
    return { what: "How fast the whole economy grew, shown as an annualized rate for the quarter.", why: "It is the broadest picture of economic health and affects rate expectations.", how: stronger };
  if (/retail sales/.test(t))
    return { what: "The total amount spent in shops and online, a direct read on consumer demand.", why: "Consumer spending drives most of the economy, so it moves growth and rate expectations.", how: stronger };
  if (/industrial production/.test(t))
    return { what: "The output of factories, mines and utilities.", why: "It shows how strong the production side of the economy is.", how: stronger };
  return {
    what: `A scheduled economic release for ${cur}.`,
    why: "Releases like this can change expectations about growth, inflation and interest rates.",
    how: "Compare the actual figure with the forecast and the previous number to see whether it surprised the market.",
  };
}

/* ---------- small UI pieces ---------- */
const fieldBase = {
  boxSizing: "border-box", padding: "8px 11px", borderRadius: 10, border: `1px solid ${palette.border}`, background: tint(palette.text, 4),
  color: palette.text, fontSize: 13, fontFamily: sans, outline: "none", minWidth: 0,
};
const capStyle = { fontSize: 11.5, fontWeight: 700, color: palette.textMuted, marginBottom: 6 };

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

function Tag({ children }) {
  return (
    <span style={{ display: "inline-block", marginLeft: 8, padding: "1px 7px", borderRadius: 6, fontSize: 10.5, fontWeight: 700, color: palette.textFaint, background: tint(palette.text, 6), verticalAlign: "middle", whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

function Dropdown({ label, text, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const esc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", away);
    document.addEventListener("touchstart", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("touchstart", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  return (
    <div ref={ref} style={{ position: "relative", minWidth: 0 }}>
      <div style={capStyle}>{label}</div>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        style={{ ...fieldBase, width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, cursor: "pointer", textAlign: "left", fontWeight: 600 }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{text}</span>
        <ChevronDown size={14} aria-hidden="true" style={{ flexShrink: 0, color: palette.textFaint, transform: open ? "rotate(180deg)" : "none", transition: "transform .15s ease" }} />
      </button>
      {open && (
        <div
          role="listbox"
          style={{
            position: "absolute", zIndex: 5, top: "calc(100% + 6px)", left: 0, right: 0, minWidth: 190, maxHeight: 300, overflowY: "auto", padding: 5, borderRadius: 12,
            background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow === "none" ? "0 12px 32px rgba(0,0,0,.45)" : palette.shadow,
          }}
        >
          {typeof children === "function" ? children(() => setOpen(false)) : children}
        </div>
      )}
    </div>
  );
}

function Option({ on, onClick, children }) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={on}
      className="ec-opt"
      onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "8px 9px", borderRadius: 8, border: 0, background: on ? tint(palette.gold, 12) : "transparent", color: on ? palette.gold : palette.text, fontSize: 13, fontWeight: 600, fontFamily: sans, cursor: "pointer", textAlign: "left" }}
    >
      <span style={{ display: "grid", placeItems: "center", width: 15, height: 15, borderRadius: 4, border: `1px solid ${on ? palette.gold : palette.border}`, background: on ? tint(palette.gold, 20) : "transparent", flexShrink: 0 }}>
        {on && <Check size={11} />}
      </span>
      {children}
    </button>
  );
}

function Skeleton() {
  return (
    <div aria-hidden="true" style={{ padding: "6px 16px" }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", padding: "14px 0", borderBottom: `1px solid ${palette.border}` }}>
          <span style={{ width: 44, height: 10, borderRadius: 5, background: tint(palette.text, 8) }} />
          <span style={{ width: 36, height: 16, borderRadius: 6, background: tint(palette.text, 8) }} />
          <span style={{ flex: 1, height: 10, borderRadius: 5, background: tint(palette.text, 8), maxWidth: `${50 + ((i * 13) % 35)}%` }} />
        </div>
      ))}
    </div>
  );
}
const Notice = ({ children }) => <div style={{ padding: "40px 24px", textAlign: "center", color: palette.textMuted, fontSize: 13, lineHeight: 1.55 }}>{children}</div>;

/* ---------- event rows ---------- */
const COLS = "88px 112px minmax(0, 1fr) 52px 78px 78px 78px";

function ValueCell({ label, v, strong, ev, compact }) {
  const empty = v == null || v === "";
  const pending = strong && empty && ev.status === "pending";
  return (
    <div style={{ textAlign: compact ? "left" : "right", fontVariantNumeric: "tabular-nums", minWidth: 0 }}>
      {compact && <div style={{ fontSize: 10.5, color: palette.textFaint, marginBottom: 1 }}>{label}</div>}
      <div style={{ fontSize: pending ? 12 : 13, fontWeight: strong ? 800 : 600, color: pending ? palette.gold : empty ? palette.textFaint : strong ? palette.text : palette.textMuted }}>
        {pending ? "Pending" : fmtVal(v, ev.unit)}
      </div>
    </div>
  );
}

function Detail({ ev, history, tz, onClose, compact }) {
  const info = infoFor(ev);
  const sup = surpriseOf(ev);
  const recent = history.filter((h) => h.indicator === ev.indicator && h.ts < ev.ms).slice(0, 5);
  const head = (t) => <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 0.6, color: palette.textFaint, marginBottom: 5 }}>{t}</div>;
  const body = (t) => <div style={{ fontSize: 13, lineHeight: 1.55, color: palette.textMuted, marginBottom: 14 }}>{t}</div>;
  return (
    <div style={{ margin: compact ? "0 10px 12px" : "0 12px 14px", padding: compact ? "14px 14px 4px" : "16px 18px 6px", borderRadius: 14, background: tint(palette.text, 4), border: `1px solid ${palette.border}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        {ev.pair ? <PairIcon a={ev.pair[0]} b={ev.pair[1]} w={26} /> : <Flag ccy={ev.ccy} w={26} />}
        <span style={{ fontSize: 15, fontWeight: 800, color: palette.text }}>{ev.title}</span>
        {ev.pair ? <Tag>Currency pair</Tag> : <Tag>{CCY_META[ev.ccy] ? CCY_META[ev.ccy].name : ev.ccy}</Tag>}
        <Tag>{ev.ccy}</Tag>
        <Tag>{ev.cat}</Tag>
        <button type="button" aria-label="Close details" onClick={onClose} style={{ marginLeft: "auto", display: "grid", placeItems: "center", width: 28, height: 28, borderRadius: 8, border: `1px solid ${palette.border}`, background: "transparent", color: palette.textMuted, cursor: "pointer" }}>
          <X size={14} />
        </button>
      </div>
      {sup && (
        <div style={{ margin: "-4px 0 14px", fontSize: 12.5, fontWeight: 800, color: palette.text }}>
          {sup.dir > 0 ? "▲ " : sup.dir < 0 ? "▼ " : "● "}
          {sup.text}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: compact ? "1fr" : "minmax(0, 1.7fr) minmax(0, 1fr)", gap: compact ? 0 : 28 }}>
        <div>
          {head("WHAT IT IS")}
          {body(info.what)}
          {head("WHY IT MATTERS")}
          {body(info.why)}
          {head("HOW TO READ IT")}
          {body(info.how)}
        </div>
        <div>
          {head("RECENT RELEASES")}
          {recent.length === 0 ? (
            <div style={{ fontSize: 12.5, lineHeight: 1.55, color: palette.textFaint, marginBottom: 14 }}>
              No earlier figures stored yet.{isNum(ev.previous) ? ` Previous: ${fmtVal(ev.previous, ev.unit)}` : ""}
            </div>
          ) : (
            <div style={{ marginBottom: 14 }}>
              {recent.map((h) => (
                <div key={h.ts} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "5px 0", borderBottom: `1px solid ${palette.border}`, fontSize: 12.5, fontVariantNumeric: "tabular-nums" }}>
                  <span style={{ color: palette.textFaint }}>{new Date(h.ts).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric", timeZone: tz })}</span>
                  <span style={{ fontWeight: 800, color: palette.text }}>{fmtVal(h.actual, ev.unit)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EventRow({ ev, isNext, compact, now, tz, mode, open, onToggle, history }) {
  const accent = isNext ? { boxShadow: `inset 3px 0 0 ${palette.gold}`, background: tint(palette.gold, 6) } : null;
  const timeText = mode === "countdown" ? (ev.ms > now ? `in ${countdown(ev.ms - now)}` : `${countdown(now - ev.ms)} ago`) : timeIn(ev.ms, tz);
  const toggle = {
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
  const ccyCell = (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>
      {ev.pair ? <PairIcon a={ev.pair[0]} b={ev.pair[1]} w={20} /> : <Flag ccy={ev.ccy} w={20} />}
      <span style={{ fontSize: 12, fontWeight: 800, color: palette.text, whiteSpace: "nowrap" }}>{ev.ccy}</span>
    </span>
  );
  return (
    <div>
      {compact ? (
        <div {...toggle} className="ec-row" style={{ padding: "12px 16px", borderBottom: open ? "none" : `1px solid ${palette.border}`, cursor: "pointer", ...accent }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: palette.textMuted, fontVariantNumeric: "tabular-nums" }}>{timeText}</span>
            {ccyCell}
            <ImpactBars level={ev.impact} />
          </div>
          <div style={{ margin: "7px 0 9px", fontSize: 13.5, fontWeight: 700, color: palette.text, lineHeight: 1.35 }}>
            {ev.title}
            <Tag>{ev.cat}</Tag>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
            <ValueCell label="Actual" v={ev.actual} strong ev={ev} compact />
            <ValueCell label="Forecast" v={ev.forecast} ev={ev} compact />
            <ValueCell label="Previous" v={ev.previous} ev={ev} compact />
          </div>
        </div>
      ) : (
        <div {...toggle} className="ec-row" style={{ display: "grid", gridTemplateColumns: COLS, gap: 10, alignItems: "center", padding: "12px 18px", borderBottom: open ? "none" : `1px solid ${palette.border}`, cursor: "pointer", ...accent }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: palette.textMuted, fontVariantNumeric: "tabular-nums" }}>{timeText}</span>
          {ccyCell}
          <div style={{ minWidth: 0, fontSize: 13.5, fontWeight: 700, color: palette.text, lineHeight: 1.35 }}>
            {ev.title}
            <Tag>{ev.cat}</Tag>
          </div>
          <ImpactBars level={ev.impact} />
          <ValueCell label="Actual" v={ev.actual} strong ev={ev} />
          <ValueCell label="Forecast" v={ev.forecast} ev={ev} />
          <ValueCell label="Previous" v={ev.previous} ev={ev} />
        </div>
      )}
      {open && <Detail ev={ev} history={history} tz={tz} compact={compact} onClose={onToggle} />}
    </div>
  );
}

/* ---------- options ---------- */
const RANGES = [
  { id: "yesterday", label: "Yesterday" },
  { id: "today", label: "Today" },
  { id: "tomorrow", label: "Tomorrow" },
  { id: "week", label: "This Week" },
  { id: "next", label: "Next Week" },
  { id: "custom", label: "Custom dates" },
];
const IMPACTS = [
  { id: "all", label: "All importance", min: 0 },
  { id: "low", label: "Low and above", min: 1 },
  { id: "medium", label: "Medium and above", min: 2 },
  { id: "high", label: "High", min: 3 },
];

export default function EconCalendarTab({ theme = "dark", isDesktop, apiBase }) {
  const [rangeSel, setRangeSel] = useState("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [impact, setImpactState] = useState(() => loadPref("ec-impact", "medium"));
  const [ccys, setCcysState] = useState(() => loadPref("ec-ccys", []));
  const [cat, setCat] = useState("all");
  const [search, setSearch] = useState("");
  const [tzSel, setTzSel] = useState(() => loadPref("ec-tz", "local"));
  const [mode, setMode] = useState("clock");
  const [filtersOpen, setFiltersOpen] = useState(() => loadPref("ec-filters", true));
  const [openId, setOpenId] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [own, setOwn] = useState({ events: [], history: [], updatedAt: 0, status: apiBase ? "loading" : "error", error: apiBase ? "" : "The calendar service address is missing." });

  const setImpact = (v) => {
    setImpactState(v);
    savePref("ec-impact", v);
  };
  const setCcys = (v) => {
    setCcysState(v);
    savePref("ec-ccys", v);
  };
  const pickTz = (v) => {
    setTzSel(v);
    savePref("ec-tz", v);
  };
  const toggleFilters = () => {
    setFiltersOpen((o) => {
      savePref("ec-filters", !o);
      return !o;
    });
  };

  // Your own calendar: read from your worker's database (/market/calendar). No other source is used.
  const loadOwn = useRef(null);
  loadOwn.current = async () => {
    if (!apiBase) return;
    setBusy(true);
    try {
      const res = await fetch(`${apiBase}/market/calendar`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !Array.isArray(data.events)) throw new Error(data.error || "Couldn't load the calendar.");
      setOwn({ events: data.events, history: Array.isArray(data.history) ? data.history : [], updatedAt: Date.now(), status: data.syncing ? "syncing" : "live", error: "" });
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

  const localTz = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch (e) {
      return "UTC";
    }
  }, []);
  const tz = tzSel === "local" ? localTz : tzSel;

  const all = useMemo(() => own.events.map(normalize).filter(Boolean).sort((a, b) => a.ms - b.ms), [own.events]);
  const days = useMemo(() => all.map((e) => ({ ...e, day: ymd(e.ms, tz) })), [all, tz]);
  const todayS = ymd(now, tz);
  const [from, to] = useMemo(() => {
    const monday = shiftYmd(todayS, -((dowOf(todayS) + 6) % 7));
    if (rangeSel === "yesterday") return [shiftYmd(todayS, -1), shiftYmd(todayS, -1)];
    if (rangeSel === "tomorrow") return [shiftYmd(todayS, 1), shiftYmd(todayS, 1)];
    if (rangeSel === "week") return [monday, shiftYmd(monday, 6)];
    if (rangeSel === "next") return [shiftYmd(monday, 7), shiftYmd(monday, 13)];
    if (rangeSel === "custom") {
      const a = customFrom || todayS;
      const b = customTo || a;
      return a <= b ? [a, b] : [b, a];
    }
    return [todayS, todayS];
  }, [rangeSel, todayS, customFrom, customTo]);
  const inRange = useMemo(() => days.filter((e) => e.day >= from && e.day <= to), [days, from, to]);

  const minImpact = (IMPACTS.find((i) => i.id === impact) || IMPACTS[2]).min;
  const q = search.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      inRange.filter(
        (e) =>
          e.impact >= minImpact &&
          (!ccys.length || legsOf(e).some((c) => ccys.includes(c))) &&
          (cat === "all" || e.cat === cat) &&
          (!q || e.title.toLowerCase().includes(q) || e.ccy.toLowerCase().includes(q))
      ),
    [inRange, minImpact, ccys, cat, q]
  );
  const groups = useMemo(() => {
    const out = [];
    filtered.forEach((e) => {
      let g = out[out.length - 1];
      if (!g || g.day !== e.day) {
        g = { day: e.day, items: [] };
        out.push(g);
      }
      g.items.push(e);
    });
    return out;
  }, [filtered]);
  const currencyOptions = useMemo(() => {
    const present = [...new Set(all.flatMap(legsOf))].filter((c) => c && c !== "ALL");
    return [...CCY_ORDER.filter((c) => present.includes(c)), ...present.filter((c) => !CCY_ORDER.includes(c)).sort()];
  }, [all]);
  const categoryOptions = useMemo(() => CATEGORIES.filter((c) => all.some((e) => e.cat === c)), [all]);
  const next = filtered.find((e) => e.ms > now);

  const reset = () => {
    setCcys([]);
    setCat("all");
    setImpact("medium");
    setSearch("");
  };
  const pickRange = (id) => {
    if (id === "custom" && !customFrom) {
      setCustomFrom(todayS);
      setCustomTo(shiftYmd(todayS, 6));
    }
    setRangeSel(id);
    setOpenId(null);
  };

  const loading = own.status === "loading";
  const failed = own.status === "error" && all.length === 0;
  const syncing = own.status === "syncing" && all.length === 0;
  const open = marketOpen(now);
  const clockTime = new Date(now).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: tz });
  const ccyText = ccys.length === 0 ? `Currencies (${currencyOptions.length})` : ccys.length <= 3 ? ccys.join(", ") : `${ccys.length} currencies`;
  const catText = cat === "all" ? "All Categories" : cat;
  const impText = (IMPACTS.find((i) => i.id === impact) || IMPACTS[2]).label;

  const pill = (on) => ({
    display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 9, border: `1px solid ${on ? tint(palette.gold, 40) : "transparent"}`, cursor: "pointer",
    fontSize: 12.5, fontWeight: 700, fontFamily: sans, whiteSpace: "nowrap", flexShrink: 0, background: on ? tint(palette.gold, 14) : "transparent", color: on ? palette.gold : palette.textMuted,
    transition: "background .15s ease, color .15s ease",
  });

  const list = (() => {
    if (loading && all.length === 0) return <Skeleton />;
    if (syncing) return <Notice>Setting up your calendar for the first time. The official release schedule is being loaded; this takes under a minute.</Notice>;
    if (failed) {
      return (
        <Notice>
          <div style={{ marginBottom: 12 }}>{own.error || "Couldn't load the calendar."}</div>
          <button type="button" onClick={() => loadOwn.current()} style={pill(true)}>Try again</button>
        </Notice>
      );
    }
    if (groups.length === 0) return <Notice>No events match these filters. Try another date range, lower the importance, or press Reset.</Notice>;
    return groups.map((g) => {
      const items = g.items;
      return (
        <div key={g.day}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 18px 8px", ...(isDesktop ? {} : { background: tint(palette.text, 3) }) }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: palette.text }}>{longDay(g.day)}</span>
            {g.day === todayS && <span style={{ fontSize: 10.5, fontWeight: 800, padding: "2px 8px", borderRadius: 99, background: tint(palette.gold, 18), color: palette.gold }}>Today</span>}
            <span style={{ fontSize: 12, color: palette.textFaint }}>
              {items.length} {items.length === 1 ? "event" : "events"}
            </span>
          </div>
          {items.map((ev) => (
            <EventRow
              key={ev.id}
              ev={ev}
              isNext={!!next && ev.id === next.id}
              compact={!isDesktop}
              now={now}
              tz={tz}
              mode={mode}
              open={openId === ev.id}
              onToggle={() => setOpenId(openId === ev.id ? null : ev.id)}
              history={own.history}
            />
          ))}
        </div>
      );
    });
  })();

  return (
    <div style={{ padding: isDesktop ? 0 : "0 12px" }}>
      <style>{`.ec-row:hover{background:${tint(palette.text, 4)}}
.ec-row:focus-visible,.ec-pills button:focus-visible,.ec-ctl:focus-visible,.ec-opt:focus-visible{outline:2px solid ${palette.gold};outline-offset:1px}
.ec-opt:hover{background:${tint(palette.text, 6)}}
.ec-pills{scrollbar-width:none}.ec-pills::-webkit-scrollbar{display:none}
@keyframes ec-spin{to{transform:rotate(360deg)}}
.ec-spin{animation:ec-spin .9s linear infinite}
@media (prefers-reduced-motion: reduce){.ec-pills button{transition:none!important}.ec-spin{animation:none}}`}</style>
      <div style={{ background: palette.surface, border: `1px solid ${palette.border}`, borderRadius: 18, overflow: "hidden", boxShadow: palette.shadow }}>
        {/* page header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "16px 18px 12px" }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: palette.text }}>Economic Calendar</div>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 11px", borderRadius: 99, border: `1px solid ${palette.border}`, fontSize: 12, fontWeight: 700, color: palette.textMuted }}>
            <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: 99, background: open ? palette.gold : palette.textFaint }} />
            {open ? "Market open" : "Market closed"}
          </span>
        </div>

        {/* date tabs + filter toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 18px 12px" }}>
          <div className="ec-pills" role="tablist" aria-label="Date range" style={{ display: "flex", gap: 2, overflowX: "auto", flex: 1, minWidth: 0 }}>
            {RANGES.map((r) => (
              <button key={r.id} type="button" role="tab" aria-selected={rangeSel === r.id} onClick={() => pickRange(r.id)} style={pill(rangeSel === r.id)}>
                {r.label}
              </button>
            ))}
          </div>
          <button type="button" className="ec-ctl" aria-expanded={filtersOpen} onClick={toggleFilters} style={{ ...fieldBase, display: "inline-flex", alignItems: "center", gap: 7, cursor: "pointer", fontWeight: 700, flexShrink: 0, borderColor: tint(palette.gold, 40), color: palette.gold }}>
            <SlidersHorizontal size={14} />
            {isDesktop ? (filtersOpen ? "Hide Filters" : "Show Filters") : null}
          </button>
        </div>

        {rangeSel === "custom" && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", padding: "0 18px 12px" }}>
            <input type="date" className="ec-ctl" aria-label="From date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} style={fieldBase} />
            <span style={{ color: palette.textFaint, fontSize: 12 }}>to</span>
            <input type="date" className="ec-ctl" aria-label="To date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} style={fieldBase} />
          </div>
        )}

        {filtersOpen && (
          <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(3, minmax(0, 1fr))" : "1fr", gap: 12, padding: "0 18px 14px" }}>
            <Dropdown label="Country" text={ccyText}>
              {() => (
                <>
                  <Option on={ccys.length === 0} onClick={() => setCcys([])}>All currencies</Option>
                  {currencyOptions.map((c) => (
                    <Option key={c} on={ccys.includes(c)} onClick={() => setCcys(ccys.includes(c) ? ccys.filter((x) => x !== c) : [...ccys, c])}>
                      <Flag ccy={c} w={20} />
                      <span style={{ fontWeight: 800 }}>{c}</span>
                      <span style={{ color: palette.textFaint, fontWeight: 600 }}>{CCY_META[c] ? CCY_META[c].name : ""}</span>
                    </Option>
                  ))}
                </>
              )}
            </Dropdown>
            <Dropdown label="Category" text={catText}>
              {(close) => (
                <>
                  <Option on={cat === "all"} onClick={() => { setCat("all"); close(); }}>All Categories</Option>
                  {categoryOptions.map((c) => (
                    <Option key={c} on={cat === c} onClick={() => { setCat(c); close(); }}>{c}</Option>
                  ))}
                </>
              )}
            </Dropdown>
            <Dropdown label="Importance" text={impText}>
              {(close) => IMPACTS.map((i) => (
                <Option key={i.id} on={impact === i.id} onClick={() => { setImpact(i.id); close(); }}>{i.label}</Option>
              ))}
            </Dropdown>
          </div>
        )}

        {/* time zone, clock mode, search */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "0 18px 14px" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, color: palette.textMuted, whiteSpace: "nowrap" }}>
            <Clock size={13} aria-hidden="true" />
            Current time <b style={{ color: palette.text, fontVariantNumeric: "tabular-nums" }}>{clockTime}</b>
            <span style={{ color: palette.textFaint }}>({offsetLabel(now, tz)})</span>
          </span>
          <select className="ec-ctl" aria-label="Time zone" value={tzSel} onChange={(e) => pickTz(e.target.value)} style={{ ...fieldBase, padding: "6px 9px", fontSize: 12.5, maxWidth: "100%" }}>
            <option value="local">Your timezone — {localTz}</option>
            {ZONES.filter(([id]) => id !== localTz).map(([id, name]) => (
              <option key={id} value={id}>{name} — {id}</option>
            ))}
          </select>
          <div role="radiogroup" aria-label="Time display" style={{ display: "inline-flex", border: `1px solid ${palette.border}`, borderRadius: 9, overflow: "hidden" }}>
            {[["clock", "Clock"], ["countdown", "Countdown"]].map(([id, label]) => (
              <button key={id} type="button" role="radio" aria-checked={mode === id} className="ec-ctl" onClick={() => setMode(id)} style={{ padding: "6px 11px", border: 0, cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: sans, background: mode === id ? tint(palette.text, 10) : "transparent", color: mode === id ? palette.text : palette.textFaint }}>
                {label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "1 1 260px", justifyContent: isDesktop ? "flex-end" : "flex-start", flexWrap: "wrap" }}>
            <label style={{ position: "relative", flex: "1 1 180px", maxWidth: 280, minWidth: 150 }}>
              <Search size={14} aria-hidden="true" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: palette.textFaint }} />
              <input className="ec-ctl" aria-label="Find an event" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find an event..." style={{ ...fieldBase, width: "100%", padding: "7px 10px 7px 30px", fontSize: 12.5 }} />
            </label>
            <span style={{ fontSize: 12, color: palette.textMuted, whiteSpace: "nowrap" }}>
              Showing <b style={{ color: palette.text }}>{filtered.length}</b> of {inRange.length}
            </span>
            <button type="button" className="ec-ctl" onClick={reset} style={{ border: 0, background: "transparent", color: palette.gold, fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: sans }}>
              Reset
            </button>
          </div>
        </div>

        {/* table */}
        {isDesktop && !failed && !syncing && (
          <div style={{ display: "grid", gridTemplateColumns: COLS, gap: 10, padding: "9px 18px", fontSize: 11.5, color: palette.textFaint, fontWeight: 700, ...hairline }}>
            <span>Time</span>
            <span>Cur.</span>
            <span>Event</span>
            <span>Imp.</span>
            <span style={{ textAlign: "right" }}>Actual</span>
            <span style={{ textAlign: "right" }}>Forecast</span>
            <span style={{ textAlign: "right" }}>Previous</span>
          </div>
        )}
        <div style={{ ...hairline, minHeight: 120, paddingBottom: 4 }}>{list}</div>

        {/* footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", padding: "10px 18px", fontSize: 11.5, color: palette.textFaint, ...hairline }}>
          <span>Source: your own calendar{own.updatedAt ? ` · ${updatedText(own.updatedAt, now)}` : ""}</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            Times in {tz} · {filtered.length} {filtered.length === 1 ? "event" : "events"}
            <button type="button" className="ec-ctl" onClick={() => loadOwn.current()} disabled={busy} aria-label="Refresh calendar" title="Refresh calendar" style={{ display: "grid", placeItems: "center", width: 24, height: 24, border: 0, background: "transparent", color: palette.textMuted, cursor: busy ? "default" : "pointer" }}>
              <RefreshCw size={13} className={busy ? "ec-spin" : undefined} />
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}
