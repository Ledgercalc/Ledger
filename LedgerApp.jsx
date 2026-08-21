import { useState, useEffect, useRef } from "react";
import { Scale, LineChart as CurveIcon, ArrowLeftRight, Trash2, Plus, ChevronLeft, ChevronRight, RotateCcw, Newspaper, Share2, X, Download, Upload, Copy, Sun, Moon, Bell, Info, Camera, Pencil, Check, Clock, Lightbulb, BookOpen, ClipboardCheck, TrendingUp, Flame, Target } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { createRoot } from "react-dom/client";

// ---- Storage shim for standalone/PWA use ----
// window.storage.get/set/delete/list is an API provided by the Claude
// artifact preview environment. Outside that environment (e.g. this app
// built and hosted as its own PWA on GitHub Pages) window.storage does not
// exist, so every persistTrades/persistNews/etc. call in this file would
// throw. This shim implements the same get/set/delete/list interface on
// top of the browser's own localStorage, so none of the call sites below
// need to change — they keep calling window.storage exactly as before.
// `shared` is accepted for interface compatibility but ignored: a
// standalone PWA has no multi-user "shared" storage concept, every key is
// just a normal localStorage entry local to that browser/device.
if (typeof window !== "undefined" && !window.storage) {
  window.storage = {
    async get(key, shared) {
      let raw;
      try {
        raw = localStorage.getItem(key);
      } catch (err) {
        throw new Error(`storage.get failed for "${key}": ${err.message}`);
      }
      if (raw === null || raw === undefined) return null;
      return { key, value: raw, shared: !!shared };
    },
    async set(key, value, shared) {
      try {
        localStorage.setItem(key, value);
      } catch (err) {
        throw new Error(`storage.set failed for "${key}": ${err.message}`);
      }
      return { key, value, shared: !!shared };
    },
    async delete(key, shared) {
      let existed = false;
      try {
        existed = localStorage.getItem(key) !== null;
        localStorage.removeItem(key);
      } catch (err) {
        throw new Error(`storage.delete failed for "${key}": ${err.message}`);
      }
      return { key, deleted: existed, shared: !!shared };
    },
    async list(prefix, shared) {
      const keys = [];
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k !== null && (!prefix || k.startsWith(prefix))) keys.push(k);
        }
      } catch (err) {
        throw new Error(`storage.list failed: ${err.message}`);
      }
      return { keys, prefix, shared: !!shared };
    },
  };
}

const DARK_PALETTE = {
  bg: "#0A0E16",
  letterbox: "#05070C",
  surface: "#121A28",
  field: "#161F30",
  border: "#243046",
  text: "#EDEFF3",
  textMuted: "#7C8AA0",
  textFaint: "#4B566B",
  gold: "#C7A25C",
  goldBright: "#E7C687",
  green: "#4FB286",
  red: "#DB6B63",
  shadow: "none",
  glow: "rgba(231,198,135,0.28)",
  navShadow: "none",
};

const LIGHT_PALETTE = {
  bg: "#FFFFFF",
  letterbox: "#EDEBE3",
  surface: "#FCFBF8",
  field: "#F4F2EB",
  border: "#E6E1D4",
  text: "#19170F",
  textMuted: "#68624F",
  textFaint: "#9D9782",
  gold: "#B08A3E",
  goldBright: "#8C6A26",
  green: "#0D9463",
  red: "#C43B2E",
  shadow: "0 1px 2px rgba(25,23,15,0.04), 0 10px 24px rgba(25,23,15,0.06)",
  glow: "rgba(176,138,62,0.16)",
  navShadow: "0 -6px 18px rgba(25,23,15,0.045)",
};

// Mutable on purpose: toggling theme reassigns these values in place so every
// component (which reads palette.xxx at render time) picks up the new theme
// without threading a theme prop through the whole tree.
const palette = { ...DARK_PALETTE };

const mono =
  "'JetBrains Mono','SF Mono','Roboto Mono',ui-monospace,Menlo,Consolas,monospace";
const sans =
  "'Inter','Manrope',system-ui,-apple-system,'Segoe UI',sans-serif";

// Theme colors now switch instantly and all at once (no per-property CSS
// transition), so every themed surface flips together on toggle instead of
// some sections animating ahead of or behind others.
const THEME_TRANSITION = "none";
const TAP = "active:scale-95 transition-transform duration-150";

const LADDER = [42, 68, 30, 80, 46, 58, 72, 34, 62, 50, 76, 40, 56, 44];

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};
const fmt = (n, d = 2) => (Number.isFinite(n) ? n.toFixed(d) : (0).toFixed(d));
const fmtThousands = (n, d = 2) => {
  if (!Number.isFinite(n)) return (0).toFixed(d);
  return n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
};
const fmtPct = (n, d = 1) => `${n >= 0 ? "+" : ""}${fmt(n, d)}%`;

// Every on-screen dollar amount for a trade's P&L — the top Equity readout,
// calendar day cells, the Month Total chip, the selected-day header, and
// each trade row — goes through this one function, at the same precision
// (cents). Previously the calendar and trade rows rounded to whole dollars
// while the top readout kept cents, so the two could visibly disagree even
// though the underlying sum was identical; routing everything through
// fmtMoney keeps them numerically and visually in sync.
const fmtMoney = (n) => fmt(Math.abs(n), 2);

const pad2 = (n) => String(n).padStart(2, "0");
const dayKeyFromDate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const dayKeyFromTs = (ts) => dayKeyFromDate(new Date(ts));
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const formatDayLabel = (key) => {
  const [y, m, d] = key.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} ${d}, ${y}`;
};
const formatShortDate = (ts) => {
  const d = new Date(ts);
  return `${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`;
};

const EMOTIONS = [
  { id: "calm", label: "Calm", emoji: "\u{1F60C}" },
  { id: "confident", label: "Confident", emoji: "\u{1F4AA}" },
  { id: "rushed", label: "Rushed", emoji: "\u26A1" },
  { id: "tilted", label: "Tilted", emoji: "\u{1F624}" },
];
const emotionMeta = (id) => EMOTIONS.find((e) => e.id === id);

// Setup tags: what kind of trade it was, tagged the same way as mood.
const SETUPS = [
  { id: "reversal", label: "Reversal" },
  { id: "pullback", label: "Pullback" },
  { id: "trend", label: "Trend" },
  { id: "breakout", label: "Breakout" },
];
const setupMeta = (id) => SETUPS.find((s) => s.id === id);

// Users can add a small number of their own setup tags on top of the
// built-ins above. Capped and persisted so the chip row never grows
// unbounded and survives a reload.
const MAX_CUSTOM_SETUPS = 2;
const CUSTOM_SETUPS_STORAGE_KEY = "equity-curve:custom-setups";

// Quick-fill chips for the note field, shown right next to the mood chips.
const NOTE_TAGS = ["FOMO", "Followed plan", "News trade"];

// A trade opened within this many minutes of a prior loss is flagged as a
// possible revenge trade — an impulsive re-entry rather than a planned one.
// Used to badge individual trades in the calendar day view, and to compute
// the discipline streak below.
const REVENGE_WINDOW_MINUTES = 15;
const REVENGE_WINDOW_MS = REVENGE_WINDOW_MINUTES * 60 * 1000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// News alarm: how far ahead of an event the in-app alarm rings. This is a
// browser-only alarm (sound + Notification API), not a real system alarm —
// see the News tab copy and the ringing modal for the actual caveats.
const ALARM_LEAD_MINUTES = 15;
const ALARM_LEAD_MS = ALARM_LEAD_MINUTES * 60 * 1000;
const ALARM_CHECK_INTERVAL_MS = 15000;
// How long past the event time an unrung alarm is still allowed to fire —
// guards against ringing something hours late if the app was closed.
const ALARM_STALE_WINDOW_MS = 10 * 60 * 1000;

// Trade screenshots: resized client-side before storage so they don't blow
// past localStorage's ~5-10MB budget after a few dozen trades. Each trade
// can hold up to SCREENSHOT_MAX_PER_TRADE images.
//
// Clarity comes first: every screenshot is encoded at up to SCREENSHOT_MAX_DIM
// on its longer side, starting at SCREENSHOT_START_QUALITY. Quality is only
// stepped down — and dimensions only shrunk as a last resort — if the result
// would exceed SCREENSHOT_MAX_BYTES, so a normal chart screenshot saves sharp
// and only degrades when it actually needs to.
const SCREENSHOT_MAX_DIM = 1600;
const SCREENSHOT_START_QUALITY = 0.92;
const SCREENSHOT_MIN_QUALITY = 0.5;
const SCREENSHOT_MAX_BYTES = 1_200_000; // ~1.2MB per screenshot
const SCREENSHOT_MAX_PER_TRADE = 2;

// Normalizes a trade's screenshots into an array, regardless of whether it
// was saved under the old singular `screenshot` field or the current
// `screenshots` array — keeps every screenshot call site written against
// one shape instead of re-checking both fields everywhere.
function tradeScreenshots(t) {
  if (Array.isArray(t.screenshots)) return t.screenshots;
  if (t.screenshot) return [t.screenshot];
  return [];
}

// Rough base64 data-URL size estimate in bytes (base64 is 4/3 the size of
// the raw bytes it encodes) — good enough to drive the quality search below
// without decoding the string.
function dataUrlBytes(dataUrl) {
  const commaIdx = dataUrl.indexOf(",");
  const base64Len = dataUrl.length - (commaIdx + 1);
  return Math.floor((base64Len * 3) / 4);
}

// Converts a stored screenshot data URL into a real File object, so it can
// be handed to the Web Share API (which shares actual files, not URLs) or
// used as a download source.
function dataUrlToFile(dataUrl, filename) {
  const [header, base64] = dataUrl.split(",");
  const mimeMatch = header.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
}

// Draws `img` onto a canvas no larger than `dim` on its longer side,
// preserving aspect ratio.
function drawScaled(img, dim) {
  let { width, height } = img;
  if (width > dim || height > dim) {
    if (width > height) {
      height = Math.round((height * dim) / width);
      width = dim;
    } else {
      width = Math.round((width * dim) / height);
      height = dim;
    }
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, width, height);
  return canvas;
}

// Reads an image file and re-encodes it as a JPEG data URL, keeping it as
// sharp as possible: it starts at the full SCREENSHOT_MAX_DIM resolution and
// SCREENSHOT_START_QUALITY, and only steps quality down — then, as a last
// resort, shrinks the dimensions once and repeats — if the result would
// exceed SCREENSHOT_MAX_BYTES. A typical chart screenshot saves at full
// resolution and near-top quality; only unusually large images get
// compressed further, and only as much as needed to fit.
function resizeImageFile(file, maxDim = SCREENSHOT_MAX_DIM) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const encodeAt = (dim) => {
          const canvas = drawScaled(img, dim);
          let quality = SCREENSHOT_START_QUALITY;
          let dataUrl = canvas.toDataURL("image/jpeg", quality);
          while (dataUrlBytes(dataUrl) > SCREENSHOT_MAX_BYTES && quality > SCREENSHOT_MIN_QUALITY) {
            quality = Math.max(SCREENSHOT_MIN_QUALITY, quality - 0.1);
            dataUrl = canvas.toDataURL("image/jpeg", quality);
          }
          return dataUrl;
        };

        let dataUrl = encodeAt(maxDim);
        if (dataUrlBytes(dataUrl) > SCREENSHOT_MAX_BYTES && maxDim > 800) {
          dataUrl = encodeAt(Math.round(maxDim * 0.75));
        }
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error("Couldn't read that image"));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error("Couldn't read that file"));
    reader.readAsDataURL(file);
  });
}

// Reference rates: units of each currency per 1 USD.
// Snapshot rates, meant as a practical starting point rather than a live feed.
// Override any pair below with your own known rate for precise conversions.
const FX_RATES_PER_USD = {
  USD: 1,
  EUR: 0.8668,
  GBP: 0.7404,
  JPY: 159.45,
  INR: 95.42,
  BDT: 123.5,
  AUD: 1.4167,
  CAD: 1.3928,
  CHF: 0.8119,
  CNY: 6.7463,
  SGD: 1.2807,
  HKD: 7.8469,
  NZD: 1.7042,
  MYR: 4.0931,
  THB: 33.12,
  AED: 3.6725,
  SAR: 3.75,
  PKR: 277.48,
  PHP: 61.33,
  IDR: 16250,
  ZAR: 16.19,
  MXN: 17.06,
  ETB: 161,
};
const FX_SNAPSHOT_LABEL = "Aug 2026";

// fawazahmed0/currency-api — free, no-key, CORS-open, daily-updated FX
// rates. Two mirrors (jsdelivr CDN + Cloudflare Pages) so one outage
// doesn't kill live rates; falls back to FX_RATES_PER_USD above if both
// fail.
const FX_LIVE_STORAGE_KEY = "fx:live-rates:v1";
const FX_CACHE_MS = 12 * 60 * 60 * 1000; // don't refetch more than every 12h
const FX_API_URLS = [
  "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json",
  "https://latest.currency-api.pages.dev/v1/currencies/usd.json",
];

async function fetchLiveFxRates() {
  for (const url of FX_API_URLS) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      if (!data || !data.usd) continue;
      const rates = { USD: 1 };
      CURRENCY_CODES.forEach((code) => {
        const v = data.usd[code.toLowerCase()];
        if (typeof v === "number") rates[code] = v;
      });
      return { rates, date: data.date };
    } catch (err) {
      // try next mirror
    }
  }
  return null;
}

const CURRENCY_NAMES = {
  USD: "US Dollar",
  EUR: "Euro",
  GBP: "British Pound",
  JPY: "Japanese Yen",
  INR: "Indian Rupee",
  BDT: "Bangladeshi Taka",
  AUD: "Australian Dollar",
  CAD: "Canadian Dollar",
  CHF: "Swiss Franc",
  CNY: "Chinese Yuan",
  SGD: "Singapore Dollar",
  HKD: "Hong Kong Dollar",
  NZD: "New Zealand Dollar",
  MYR: "Malaysian Ringgit",
  THB: "Thai Baht",
  AED: "UAE Dirham",
  SAR: "Saudi Riyal",
  PKR: "Pakistani Rupee",
  PHP: "Philippine Peso",
  IDR: "Indonesian Rupiah",
  ZAR: "South African Rand",
  MXN: "Mexican Peso",
  ETB: "Ethiopian Birr",
};

const CURRENCY_CODES = Object.keys(FX_RATES_PER_USD);

function Field({ label, value, onChange, suffix, placeholder, readOnly }) {
  return (
    <label className="block mb-4">
      <span
        className="block mb-1.5 uppercase"
        style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px", transition: THEME_TRANSITION }}
      >
        {label}
      </span>
      <div
        className="flex items-center rounded-lg px-3"
        style={{
          background: readOnly ? palette.surface : palette.field,
          border: `1px solid ${palette.border}`,
          transition: THEME_TRANSITION,
        }}
      >
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          readOnly={readOnly}
          tabIndex={readOnly ? -1 : undefined}
          className="w-full bg-transparent py-3 outline-none"
          style={{
            color: readOnly ? palette.textMuted : palette.text,
            fontFamily: mono,
            fontSize: "16px",
            cursor: readOnly ? "default" : "text",
            transition: THEME_TRANSITION,
          }}
        />
        {suffix && (
          <span className="text-sm pl-2" style={{ color: palette.textFaint, transition: THEME_TRANSITION }}>
            {suffix}
          </span>
        )}
      </div>
    </label>
  );
}

function CurrencySelect({ label, value, onChange }) {
  return (
    <label className="block mb-4 flex-1">
      <span
        className="block mb-1.5 uppercase"
        style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px", transition: THEME_TRANSITION }}
      >
        {label}
      </span>
      <div
        className="rounded-lg px-3"
        style={{ background: palette.field, border: `1px solid ${palette.border}`, transition: THEME_TRANSITION }}
      >
        <select
          value={value}
          onChange={onChange}
          className="w-full bg-transparent py-3 outline-none appearance-none"
          style={{ color: palette.text, fontFamily: mono, fontSize: "15px", transition: THEME_TRANSITION }}
        >
          {CURRENCY_CODES.map((code) => (
            <option key={code} value={code} style={{ background: palette.field, color: palette.text }}>
              {code} — {CURRENCY_NAMES[code]}
            </option>
          ))}
        </select>
      </div>
    </label>
  );
}

function StatChip({ label, value, onClick }) {
  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={`rounded-lg p-3 ${onClick ? `${TAP}` : ""}`}
      style={{
        background: palette.surface,
        border: `1px solid ${palette.border}`,
        boxShadow: palette.shadow,
        cursor: onClick ? "pointer" : "default",
        transition: THEME_TRANSITION,
      }}
    >
      <div
        className="uppercase mb-1 flex items-center gap-1"
        style={{ color: palette.textFaint, letterSpacing: "0.08em", fontSize: "11px", transition: THEME_TRANSITION }}
      >
        {label}
        {onClick && <Info size={10} style={{ opacity: 0.7, flexShrink: 0 }} />}
      </div>
      <div
        style={{
          fontFamily: mono,
          fontSize: "1.05rem",
          color: palette.text,
          fontVariantNumeric: "tabular-nums",
          transition: THEME_TRANSITION,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function PillGroup({ options, value, onChange, suffix = "%" }) {
  return (
    <div className="flex gap-2 flex-wrap mb-4">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(String(opt))}
          className={`px-3 py-1.5 rounded-full transition-colors ${TAP}`}
          style={{
            background: String(value) === String(opt) ? palette.gold : palette.field,
            color: String(value) === String(opt) ? palette.letterbox : palette.textMuted,
            border: `1px solid ${String(value) === String(opt) ? palette.gold : palette.border}`,
            fontFamily: mono,
            fontSize: "13px",
          }}
        >
          {opt}
          {suffix}
        </button>
      ))}
    </div>
  );
}

function RuleRow({ label, detail, pass }) {
  const color = pass === undefined ? palette.textFaint : pass ? palette.green : palette.red;
  const badge = pass === undefined ? "N/A" : pass ? "OK" : "OVER";
  return (
    <div
      className="flex items-center justify-between rounded-lg px-3 py-3 mb-2"
      style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow, transition: THEME_TRANSITION }}
    >
      <div>
        <div style={{ color: palette.text, fontSize: "14px", marginBottom: "2px", transition: THEME_TRANSITION }}>{label}</div>
        <div style={{ color: palette.textMuted, fontSize: "12px", transition: THEME_TRANSITION }}>{detail}</div>
      </div>
      <span
        style={{
          fontFamily: mono,
          fontSize: "11px",
          letterSpacing: "0.06em",
          color,
          border: `1px solid ${color}`,
          borderRadius: "999px",
          padding: "3px 8px",
          flexShrink: 0,
          marginLeft: "8px",
          transition: THEME_TRANSITION,
        }}
      >
        {badge}
      </span>
    </div>
  );
}

function Readout({ eyebrow, value, unit, sub, tone }) {
  const toneColor =
    tone === "good" ? palette.green : tone === "bad" ? palette.red : palette.goldBright;
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-6 mb-6"
      style={{
        background: palette.surface,
        border: `1px solid ${palette.border}`,
        boxShadow: palette.shadow,
        "--glow": palette.glow,
        transition: THEME_TRANSITION,
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background: `repeating-linear-gradient(to bottom, ${palette.gold}14 0px, ${palette.gold}14 1px, transparent 1px, transparent 10px)`,
          opacity: 0.6,
        }}
      />
      <div
        className="absolute left-0 top-0 bottom-0 flex flex-col justify-around pointer-events-none"
        aria-hidden="true"
        style={{ width: "34px", padding: "10px 0" }}
      >
        {LADDER.map((w, i) => (
          <div
            key={i}
            style={{
              height: "3px",
              width: `${w}%`,
              background: i % 2 === 0 ? palette.green : palette.red,
              opacity: 0.4,
              marginBottom: "2px",
              borderRadius: "1px",
            }}
          />
        ))}
      </div>
      <div className="relative" style={{ paddingLeft: "38px" }}>
        <div
          className="uppercase mb-2"
          style={{ color: palette.textMuted, letterSpacing: "0.12em", fontSize: "11px", transition: THEME_TRANSITION }}
        >
          {eyebrow}
        </div>
        <div className="flex items-baseline gap-2 ticker-glow">
          <span
            style={{
              fontFamily: mono,
              fontSize: "2.4rem",
              fontWeight: 600,
              color: toneColor,
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1,
              transition: THEME_TRANSITION,
            }}
          >
            {value}
          </span>
          {unit && (
            <span style={{ fontFamily: mono, fontSize: "1rem", color: palette.textMuted, transition: THEME_TRANSITION }}>
              {unit}
            </span>
          )}
        </div>
        {sub && (
          <div className="mt-2 text-sm" style={{ color: palette.textMuted, transition: THEME_TRANSITION }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

const TABS = [
  { id: "risk", label: "Challenge", icon: Scale },
  { id: "fx", label: "Convert", icon: ArrowLeftRight },
  { id: "curve", label: "Curve", icon: CurveIcon },
  { id: "insights", label: "Insights", icon: Lightbulb },
  { id: "journal", label: "Journal", icon: BookOpen },
  { id: "news", label: "News", icon: Newspaper },
  { id: "sessions", label: "Sessions", icon: Clock },
];

// ---- Journal tab constants ----
const JOURNAL_STORAGE_KEY = "journal:entries";
const JOURNAL_COLS_STORAGE_KEY = "journal:col-widths";
const TREND_OPTIONS = [
  { id: "uptrend", label: "Uptrend" },
  { id: "downtrend", label: "Downtrend" },
  { id: "range", label: "Range" },
];
const JOURNAL_COLUMNS = [
  { id: "date", label: "Date" },
  { id: "pair", label: "Pair" },
  { id: "trend", label: "Trend" },
  { id: "rr", label: "R:R" },
  { id: "setup", label: "Setup" },
  { id: "mistake", label: "Mistake" },
  { id: "note", label: "Note" },
];
const DEFAULT_JOURNAL_COL_WIDTHS = { date: 122, pair: 96, trend: 108, rr: 68, setup: 112, mistake: 170, note: 200 };
const JOURNAL_COL_MIN = 56;
const JOURNAL_COL_MAX = 280;

// ---- Journal tab \u2192 Playbook sub-tab: a small set of trading rules the
// user defines for themselves (e.g. "only trade the London/NY overlap",
// "min 1:2 R:R"), plus a once-a-day check-in against the currently active
// rules. Rules and check-ins are stored separately so deleting or editing a
// rule never touches historical check-in data — a check-in is a frozen
// snapshot of which rule ids were being tracked and whether each was
// followed that day.
const PLAYBOOK_RULES_KEY = "playbook:rules";
const PLAYBOOK_CHECKINS_KEY = "playbook:checkins";
const PLAYBOOK_STARTER_RULES = [
  "Only trade my planned setups",
  "Never risk more than 1-2% per trade",
  "No trades within 15 minutes of a loss",
];
const MAX_PLAYBOOK_RULES = 10;

// True if every rule tracked in this check-in was followed. A check-in with
// zero tracked rules (all rules deleted since) never counts as clean.
function isCleanCheckin(checkin) {
  const ids = Object.keys(checkin.results || {});
  return ids.length > 0 && ids.every((id) => checkin.results[id]);
}

// Per-rule follow-rate, plus the current/best streak of clean (all-rules-
// followed) check-in days. Streak is computed the same way as the trading
// discipline streak elsewhere in this file: consecutive check-in days with
// no gaps in the data, not consecutive calendar days.
function computePlaybookStats(rules, checkins) {
  const sorted = [...checkins].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const ruleStats = rules.map((r) => {
    const tracked = sorted.filter((c) => r.id in (c.results || {}));
    const followed = tracked.filter((c) => c.results[r.id]).length;
    return {
      id: r.id,
      text: r.text,
      trackedCount: tracked.length,
      followedCount: followed,
      pct: tracked.length ? Math.round((followed / tracked.length) * 100) : null,
    };
  });

  let best = 0;
  let run = 0;
  sorted.forEach((c) => {
    if (isCleanCheckin(c)) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
  });

  let current = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (!isCleanCheckin(sorted[i])) break;
    current += 1;
  }

  const cleanDays = sorted.filter(isCleanCheckin).length;
  const overallPct = sorted.length ? Math.round((cleanDays / sorted.length) * 100) : null;

  return { ruleStats, current, best, hasData: sorted.length > 0, overallPct, totalCheckins: sorted.length };
}

// ---- Sessions tab: the four major FX trading sessions, defined by their
// standard open/close hour in UTC. endUTC < startUTC means the session
// wraps past midnight UTC (Sydney only). These are the commonly-cited
// standard-time session hours — a practical approximation, not adjusted
// for daylight saving in any of the four cities.
const MARKET_SESSIONS = [
  { id: "sydney", label: "Sydney", startUTC: 22, endUTC: 7, color: "#6C8EBF" },
  { id: "tokyo", label: "Tokyo", startUTC: 0, endUTC: 9, color: "#BF6C8E" },
  { id: "london", label: "London", startUTC: 8, endUTC: 17, color: "#6CBF8E" },
  { id: "newyork", label: "New York", startUTC: 13, endUTC: 22, color: "#BFA26C" },
];

const mod24 = (h) => ((h % 24) + 24) % 24;

// Whether a session is open at a given fractional UTC hour (0-24),
// handling the one session (Sydney) that wraps past midnight.
function sessionOpenAtUTCHour(session, hourUTC) {
  const h = mod24(hourUTC);
  if (session.startUTC <= session.endUTC) {
    return h >= session.startUTC && h < session.endUTC;
  }
  return h >= session.startUTC || h < session.endUTC;
}

// Same check, but against a local (already-offset) hour — converts back to
// UTC using the browser's current timezone offset (in minutes, from
// Date#getTimezoneOffset) before checking.
function sessionOpenAtLocalHour(session, localHour, tzOffsetMinutes) {
  return sessionOpenAtUTCHour(session, localHour + tzOffsetMinutes / 60);
}

// A session's open/close boundaries converted into local fractional hours
// (0-24), split into one or two [start, end] segments — two when the
// session's local window itself wraps past local midnight.
function sessionLocalSegments(session, tzOffsetMinutes) {
  const localStart = mod24(session.startUTC - tzOffsetMinutes / 60);
  const localEnd = mod24(session.endUTC - tzOffsetMinutes / 60);
  if (localStart <= localEnd) return [[localStart, localEnd]];
  return [
    [localStart, 24],
    [0, localEnd],
  ];
}

// Formats a fractional hour (0-24) as a local-style clock label, e.g. 13.5
// -> "1:30 PM", 9 -> "9 AM".
function formatHourLabel(hourFrac) {
  const h = mod24(hourFrac);
  const totalMin = Math.round(h * 60) % 1440;
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  const period = hh < 12 ? "AM" : "PM";
  let displayHour = hh % 12;
  if (displayHour === 0) displayHour = 12;
  return `${displayHour}${mm > 0 ? ":" + pad2(mm) : ""} ${period}`;
}

// Hours remaining until a currently-open session closes, or until a
// currently-closed session next opens — both always positive, both
// measured from the given fractional UTC hour.
function sessionCountdown(session, nowUTCHour) {
  const isOpen = sessionOpenAtUTCHour(session, nowUTCHour);
  if (isOpen) {
    let close = session.endUTC;
    if (close <= nowUTCHour) close += 24;
    return { isOpen, hours: close - nowUTCHour };
  }
  let open = session.startUTC;
  if (open <= nowUTCHour) open += 24;
  return { isOpen, hours: open - nowUTCHour };
}

// The London/New York overlap — 13:00-17:00 UTC under the fixed session
// hours above — is the highest-liquidity window of the day (the two
// biggest FX markets trading at once). Returned as local fractional hours
// so the UI can show it in the user's own time.
function highLiquidityWindowLocal(tzOffsetMinutes) {
  return {
    startLocal: mod24(13 - tzOffsetMinutes / 60),
    endLocal: mod24(17 - tzOffsetMinutes / 60),
  };
}

const STORAGE_KEY = "equity-curve:trades";
const STORAGE_BAL_KEY = "equity-curve:starting-balance";
const NEWS_STORAGE_KEY = "news:events:v4";
const THEME_STORAGE_KEY = "ledger:theme";

const PROFIT_TARGET_OPTIONS = [5, 6, 8, 10, 12];

function nextOccurrenceMs(ev, now) {
  if (!ev.date) return Infinity;
  const [h, m] = ev.time.split(":").map(Number);
  const [y, mo, da] = ev.date.split("-").map(Number);
  return new Date(y, mo - 1, da, h, m, 0, 0).getTime();
}

function formatCountdown(ms) {
  if (!Number.isFinite(ms) || ms < 0) return "N/A";
  const totalMin = Math.floor(ms / 60000);
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

// A trade opened within REVENGE_WINDOW_MS of a prior loss. Pure function of
// `trades`, shared by the calendar view (badging), the discipline streak,
// and the weekly recap, so all three always agree on which trades count.
function computeRevengeIds(trades) {
  const sorted = [...trades].sort((a, b) => a.ts - b.ts);
  const ids = new Set();
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    if (prev.pnl < 0 && cur.ts - prev.ts <= REVENGE_WINDOW_MS) {
      ids.add(cur.id);
    }
  }
  return ids;
}

// Consecutive trading days (days with at least one logged trade) containing
// zero revenge trades. Breaks on any day that has one, regardless of that
// day's P&L — this tracks behavior, not results.
function computeDisciplineStreak(trades) {
  const revengeIds = computeRevengeIds(trades);
  const byDay = {};
  trades.forEach((t) => {
    const k = dayKeyFromTs(t.ts);
    if (!byDay[k]) byDay[k] = [];
    byDay[k].push(t);
  });
  const dayKeys = Object.keys(byDay).sort();

  let best = 0;
  let run = 0;
  dayKeys.forEach((k) => {
    const dayHasRevenge = byDay[k].some((t) => revengeIds.has(t.id));
    if (dayHasRevenge) {
      run = 0;
    } else {
      run += 1;
      best = Math.max(best, run);
    }
  });

  let current = 0;
  for (let i = dayKeys.length - 1; i >= 0; i--) {
    const dayHasRevenge = byDay[dayKeys[i]].some((t) => revengeIds.has(t.id));
    if (dayHasRevenge) break;
    current += 1;
  }

  return { current, best, hasData: dayKeys.length > 0 };
}

// Shared aggregation for the Insights tab: groups trades by setup, mood, and
// weekday, and separately totals the cost of revenge trades. Pure function
// of `trades` (plus `customSetups` for label lookups), same pattern as the
// other compute* helpers above — one source of truth the tab renders from.
function computeInsights(trades, customSetups) {
  const WEEKDAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const bySetup = {};
  const byMood = {};
  const byWeekday = {};

  trades.forEach((t) => {
    if (t.setup) {
      if (!bySetup[t.setup]) bySetup[t.setup] = { count: 0, wins: 0, pnl: 0 };
      bySetup[t.setup].count += 1;
      bySetup[t.setup].pnl += t.pnl;
      if (t.pnl > 0) bySetup[t.setup].wins += 1;
    }
    if (t.emotion) {
      if (!byMood[t.emotion]) byMood[t.emotion] = { count: 0, wins: 0, pnl: 0 };
      byMood[t.emotion].count += 1;
      byMood[t.emotion].pnl += t.pnl;
      if (t.pnl > 0) byMood[t.emotion].wins += 1;
    }
    const wd = new Date(t.ts).getDay();
    if (!byWeekday[wd]) byWeekday[wd] = { count: 0, wins: 0, pnl: 0 };
    byWeekday[wd].count += 1;
    byWeekday[wd].pnl += t.pnl;
    if (t.pnl > 0) byWeekday[wd].wins += 1;
  });

  const setupRows = Object.keys(bySetup)
    .map((id) => ({
      id,
      label: setupMeta(id)?.label || customSetups.find((s) => s.id === id)?.label || id,
      ...bySetup[id],
      winRate: (bySetup[id].wins / bySetup[id].count) * 100,
    }))
    .sort((a, b) => b.pnl - a.pnl);

  const moodRows = Object.keys(byMood)
    .map((id) => ({
      id,
      label: emotionMeta(id)?.label || id,
      emoji: emotionMeta(id)?.emoji || "",
      ...byMood[id],
      winRate: (byMood[id].wins / byMood[id].count) * 100,
    }))
    .sort((a, b) => b.pnl - a.pnl);

  const weekdayRows = Object.keys(byWeekday)
    .map((k) => ({
      id: k,
      label: WEEKDAY_FULL[Number(k)],
      ...byWeekday[k],
      winRate: (byWeekday[k].wins / byWeekday[k].count) * 100,
    }))
    .sort((a, b) => Number(a.id) - Number(b.id));

  const revengeIds = computeRevengeIds(trades);
  const revengeTrades = trades.filter((t) => revengeIds.has(t.id));
  const revengePnl = revengeTrades.reduce((sum, t) => sum + t.pnl, 0);

  return {
    setupRows,
    moodRows,
    weekdayRows,
    bestSetup: setupRows.length ? setupRows[0] : null,
    worstSetup: setupRows.length ? setupRows[setupRows.length - 1] : null,
    bestMood: moodRows.length ? moodRows[0] : null,
    worstMood: moodRows.length ? moodRows[moodRows.length - 1] : null,
    revengeCount: revengeTrades.length,
    revengePnl,
  };
}

// ---- Insights tab: Overview sub-tab helpers ----

// Builds a GitHub-style heatmap grid: `weeksBack` columns of 7 days each
// (Sun-Sat), ending on the upcoming Saturday so the current week is never
// cut off mid-row. Each cell holds that day's net P&L (null if no trades
// that day) plus whether it falls after today (so the UI can render it as
// an empty placeholder instead of a "no trades" day).
function computeHeatmapWeeks(trades, weeksBack = 26) {
  const dayTotals = {};
  trades.forEach((t) => {
    const k = dayKeyFromTs(t.ts);
    dayTotals[k] = (dayTotals[k] || 0) + t.pnl;
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + (6 - today.getDay()));
  const totalDays = weeksBack * 7;
  const startDate = new Date(endOfWeek);
  startDate.setDate(endOfWeek.getDate() - totalDays + 1);

  const weeks = [];
  let cursor = new Date(startDate);
  let maxAbs = 0;
  for (let w = 0; w < weeksBack; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const key = dayKeyFromDate(cursor);
      const pnl = key in dayTotals ? dayTotals[key] : null;
      if (pnl !== null) maxAbs = Math.max(maxAbs, Math.abs(pnl));
      week.push({ key, date: new Date(cursor), pnl, future: cursor.getTime() > today.getTime() });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }
  return { weeks, maxAbs };
}

// One auto-generated plain-English takeaway, picking the single highest-
// signal pattern currently in the data (setup gap, mood gap, or revenge
// cost) rather than listing everything at once.
function computeHeadlineInsight(trades, customSetups) {
  if (trades.length < 5) return null;
  const insights = computeInsights(trades, customSetups);
  const candidates = [];

  if (insights.setupRows.length >= 2) {
    const best = insights.setupRows[0];
    const worst = insights.setupRows[insights.setupRows.length - 1];
    const diff = best.winRate - worst.winRate;
    if (best.id !== worst.id && diff >= 15) {
      candidates.push({
        priority: diff,
        text: `Your ${best.label} setups are outperforming ${worst.label} by ${diff.toFixed(0)}% win rate \u2014 consider focusing there.`,
      });
    }
  }

  if (insights.bestMood && insights.worstMood && insights.bestMood.id !== insights.worstMood.id) {
    const diff = insights.bestMood.winRate - insights.worstMood.winRate;
    if (diff >= 15) {
      candidates.push({
        priority: diff,
        text: `You win ${diff.toFixed(0)}% more often trading ${insights.bestMood.label.toLowerCase()} than ${insights.worstMood.label.toLowerCase()}.`,
      });
    }
  }

  if (insights.revengeCount > 0) {
    candidates.push({
      priority: Math.abs(insights.revengePnl) / 5,
      text: `Revenge trades have cost you $${fmtMoney(insights.revengePnl)} across ${insights.revengeCount} trade${
        insights.revengeCount === 1 ? "" : "s"
      } \u2014 watch that ${REVENGE_WINDOW_MINUTES}-minute window after a loss.`,
    });
  }

  if (candidates.length === 0) {
    return "Keep logging trades \u2014 clear patterns will show up here as your journal grows.";
  }
  candidates.sort((a, b) => b.priority - a.priority);
  return candidates[0].text;
}

// Maps a value against ascending thresholds [poorMax, avgMax, goodMax] into
// a Poor/Average/Good/Excellent tier. Non-finite (Infinity, from zero
// losses) always reads as Excellent.
function tierFor(value, thresholds) {
  if (!Number.isFinite(value)) return "Excellent";
  if (value <= thresholds[0]) return "Poor";
  if (value <= thresholds[1]) return "Average";
  if (value <= thresholds[2]) return "Good";
  return "Excellent";
}

function tierColor(tier) {
  if (tier === "Poor") return palette.red;
  if (tier === "Average") return palette.gold;
  return palette.green;
}

// Profit factor, recovery factor, win/loss ratio, expectancy, and largest
// win/loss \u2014 the standard "how good is this edge" metric set, each paired
// with a plain-language explanation shown on tap.
function computePerformanceMetrics(trades) {
  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl < 0);
  const grossProfit = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));

  const sorted = [...trades].sort((a, b) => a.ts - b.ts);
  let running = 0;
  let peak = 0;
  let maxDD = 0;
  sorted.forEach((t) => {
    running += t.pnl;
    peak = Math.max(peak, running);
    maxDD = Math.max(maxDD, peak - running);
  });
  const netProfit = running;

  const avgWin = wins.length ? grossProfit / wins.length : 0;
  const avgLoss = losses.length ? grossLoss / losses.length : 0;
  const winRate = trades.length ? wins.length / trades.length : 0;

  const metrics = {
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
    recoveryFactor: maxDD > 0 ? netProfit / maxDD : netProfit > 0 ? Infinity : 0,
    winLossRatio: avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? Infinity : 0,
    expectancy: winRate * avgWin - (1 - winRate) * avgLoss,
    largestWin: wins.length ? Math.max(...wins.map((t) => t.pnl)) : 0,
    largestLoss: losses.length ? Math.min(...losses.map((t) => t.pnl)) : 0,
  };

  const tiers = {
    profitFactor: tierFor(metrics.profitFactor, [1, 1.5, 2.5]),
    recoveryFactor: tierFor(metrics.recoveryFactor, [1, 2, 4]),
    winLossRatio: tierFor(metrics.winLossRatio, [0.8, 1.2, 2]),
    expectancy: tierFor(metrics.expectancy, [0, 5, 20]),
  };

  return { ...metrics, tiers, netProfit, maxDD };
}

const METRIC_INFO = {
  "Profit Factor": "Gross profit divided by gross loss. Above 1 means your wins outweigh your losses overall; above 1.5 is generally considered solid.",
  "Recovery Factor": "Net profit divided by your worst drawdown. Higher means you make back more than you ever gave up at your lowest point.",
  "Win/Loss Ratio": "Your average win size divided by your average loss size \u2014 independent of how often you win.",
  Expectancy: "The average dollar result you can expect per trade, blending your win rate with your average win and loss size.",
};

// This month vs. last month: win rate, net P&L, and trade count.
function computeMonthComparison(trades) {
  const now = new Date();
  const thisKey = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
  const lastDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastKey = `${lastDate.getFullYear()}-${pad2(lastDate.getMonth() + 1)}`;

  const agg = (key) => {
    const monthTrades = trades.filter((t) => dayKeyFromTs(t.ts).startsWith(key));
    const wins = monthTrades.filter((t) => t.pnl > 0).length;
    return {
      count: monthTrades.length,
      winRate: monthTrades.length ? (wins / monthTrades.length) * 100 : 0,
      net: monthTrades.reduce((s, t) => s + t.pnl, 0),
    };
  };

  return { thisMonth: agg(thisKey), lastMonth: agg(lastKey) };
}

// % of trades that have a note, a setup tag, and at least one screenshot \u2014
// each counts for a third of a trade's completeness score.
function computeJournalCompleteness(trades) {
  if (trades.length === 0) return 0;
  const total = trades.reduce((sum, t) => {
    let score = 0;
    if (t.note && t.note.trim()) score += 1;
    if (t.setup) score += 1;
    if (tradeScreenshots(t).length > 0) score += 1;
    return sum + score / 3;
  }, 0);
  return Math.round((total / trades.length) * 100);
}

// ---- Insights tab: Behavior sub-tab helpers ----

// Single A\u2013F grade synthesized from discipline streak, revenge-trade rate,
// and journal completeness \u2014 the "how disciplined is this trader" answer in
// one glance.
function computeDisciplineGrade(trades) {
  const { current, hasData } = computeDisciplineStreak(trades);
  if (!hasData) return { grade: "N/A", score: 0 };
  const revengeIds = computeRevengeIds(trades);
  const revengeRate = trades.length ? (revengeIds.size / trades.length) * 100 : 0;
  const completeness = computeJournalCompleteness(trades);

  const streakScore = Math.min(100, (current / 30) * 100);
  const revengeScore = Math.max(0, 100 - revengeRate * 5);
  const score = Math.round(streakScore * 0.4 + revengeScore * 0.4 + completeness * 0.2);

  let grade = "F";
  if (score >= 90) grade = "A";
  else if (score >= 80) grade = "B";
  else if (score >= 65) grade = "C";
  else if (score >= 50) grade = "D";
  return { grade, score };
}

// Total $ from revenge trades vs. every other trade, side by side.
function computeRevengeCostSplit(trades) {
  const revengeIds = computeRevengeIds(trades);
  const revenge = trades.filter((t) => revengeIds.has(t.id));
  const clean = trades.filter((t) => !revengeIds.has(t.id));
  return {
    revengeTotal: revenge.reduce((s, t) => s + t.pnl, 0),
    revengeCount: revenge.length,
    cleanTotal: clean.reduce((s, t) => s + t.pnl, 0),
    cleanCount: clean.length,
  };
}

// Flags whether trade size (using |P&L| as the only size proxy this app
// tracks) creeps up after a 3+ win streak \u2014 a common overconfidence tell.
// Needs at least 3 trades in each bucket to say anything meaningful.
function computeOverconfidenceCheck(trades) {
  const sorted = [...trades].sort((a, b) => a.ts - b.ts);
  let streak = 0;
  const afterStreak = [];
  const normal = [];
  sorted.forEach((t) => {
    const size = Math.abs(t.pnl);
    if (streak >= 3) afterStreak.push(size);
    else normal.push(size);
    streak = t.pnl > 0 ? streak + 1 : 0;
  });
  if (afterStreak.length < 3 || normal.length < 3) return null;
  const avg = (arr) => arr.reduce((s, v) => s + v, 0) / arr.length;
  const avgAfter = avg(afterStreak);
  const avgNormal = avg(normal);
  const pctChange = avgNormal > 0 ? ((avgAfter - avgNormal) / avgNormal) * 100 : 0;
  return { avgAfter, avgNormal, pctChange, detected: pctChange >= 20 };
}

// Running discipline streak plotted day by day (only trading days count),
// for a simple line chart of whether discipline is trending up or resetting.
function computeDisciplineStreakTrend(trades) {
  const revengeIds = computeRevengeIds(trades);
  const byDay = {};
  trades.forEach((t) => {
    const k = dayKeyFromTs(t.ts);
    if (!byDay[k]) byDay[k] = [];
    byDay[k].push(t);
  });
  const dayKeys = Object.keys(byDay).sort();
  let streak = 0;
  return dayKeys.map((k, i) => {
    const hasRevenge = byDay[k].some((t) => revengeIds.has(t.id));
    streak = hasRevenge ? 0 : streak + 1;
    return { day: i + 1, streak, key: k };
  });
}

// Win rate for each note quick-tag (FOMO / Followed plan / News trade),
// matched on an exact note match \u2014 same tags the Curve tab's dashed chips
// quick-fill.
function computeNoteTagAnalysis(trades) {
  return NOTE_TAGS.map((tag) => {
    const tagged = trades.filter((t) => t.note === tag);
    const wins = tagged.filter((t) => t.pnl > 0).length;
    return {
      tag,
      count: tagged.length,
      winRate: tagged.length ? (wins / tagged.length) * 100 : 0,
      pnl: tagged.reduce((s, t) => s + t.pnl, 0),
    };
  }).filter((r) => r.count > 0);
}

// Classifies day-to-day P&L volatility as Low/Medium/High using a
// coefficient-of-variation-style ratio (stdev of daily totals over the
// average daily magnitude) \u2014 needs at least 3 trading days to be meaningful.
function computeConsistencyScore(trades) {
  const byDay = {};
  trades.forEach((t) => {
    const k = dayKeyFromTs(t.ts);
    byDay[k] = (byDay[k] || 0) + t.pnl;
  });
  const values = Object.values(byDay);
  if (values.length < 3) return null;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
  const stdev = Math.sqrt(variance);
  const meanAbs = values.reduce((s, v) => s + Math.abs(v), 0) / values.length || 1;
  const cv = stdev / meanAbs;
  let label = "Low";
  if (cv > 2.5) label = "High";
  else if (cv > 1.2) label = "Medium";
  return { label, cv };
}

// Shared weekly-recap math, used by both the share image and the
// copy-as-text summary so the two can never drift out of sync. Assumes
// weekTrades is non-empty and startBal > 0 — callers check those first so
// they can show the right empty-state message.
function buildWeekRecap(weekTrades, startBal) {
  let running = 0;
  const curve = [{ pct: 0 }];
  weekTrades.forEach((t) => {
    running += (t.pnl / startBal) * 100;
    curve.push({ pct: running });
  });
  const netPct = running;

  const wins = weekTrades.filter((t) => t.pnl > 0).length;
  const winRate = (wins / weekTrades.length) * 100;

  let bestStreak = 0;
  let worstStreak = 0;
  let curStreak = 0;
  weekTrades.forEach((t) => {
    if (t.pnl > 0) curStreak = curStreak > 0 ? curStreak + 1 : 1;
    else if (t.pnl < 0) curStreak = curStreak < 0 ? curStreak - 1 : -1;
    else curStreak = 0;
    bestStreak = Math.max(bestStreak, curStreak);
    worstStreak = Math.min(worstStreak, curStreak);
  });

  const setupCounts = {};
  weekTrades.forEach((t) => {
    if (t.setup) setupCounts[t.setup] = (setupCounts[t.setup] || 0) + 1;
  });
  const topSetupId = Object.keys(setupCounts).sort((a, b) => setupCounts[b] - setupCounts[a])[0] || null;
  const topSetup = topSetupId
    ? { id: topSetupId, count: setupCounts[topSetupId], label: setupMeta(topSetupId)?.label || topSetupId }
    : null;

  // Revenge trades within this week only (chronological order within the
  // week's own trades) — same detection rule as the calendar badges and the
  // all-time discipline streak, just scoped to the week being summarized.
  const revengeCount = computeRevengeIds(weekTrades).size;

  const rangeLabel = `${formatShortDate(weekTrades[0].ts)} \u2013 ${formatShortDate(weekTrades[weekTrades.length - 1].ts)}`;

  return {
    curve,
    netPct,
    winRate,
    bestStreak,
    worstStreak,
    topSetup,
    revengeCount,
    rangeLabel,
    tradeCount: weekTrades.length,
  };
}

// Palette used for the exported share image. Kept independent of the live
// on-screen `palette` object (which mutates on theme toggle) so a card
// rendered from a given `theme` is always self-consistent, even if the user
// switches themes again right after generating it.
const SHARE_COLORS = {
  dark: {
    green: "#4FB286",
    red: "#DB6B63",
    gold: "#C7A25C",
    goldBright: "#E7C687",
    text: "#EDEFF3",
    textMuted: "#7C8AA0",
    textFaint: "#4B566B",
    border: "#243046",
    surface: "#121A28",
    bgFrom: "#0B0F19",
    bgTo: "#05070C",
    dotRing: "#05070C",
  },
  light: {
    green: "#0D9463",
    red: "#C43B2E",
    gold: "#B08A3E",
    goldBright: "#8C6A26",
    text: "#19170F",
    textMuted: "#68624F",
    textFaint: "#9D9782",
    border: "#E6E1D4",
    surface: "#FFFFFF",
    bgFrom: "#FFFFFF",
    bgTo: "#EDEBE3",
    dotRing: "#FFFFFF",
  },
};

// ---- Share My Week: draws a dollar-free recap card to a canvas ----
function drawShareCard(canvas, {
  rangeLabel,
  tradeCount,
  winRate,
  netPct,
  curve,
  bestStreak,
  worstStreak,
  topSetup,
  revengeCount,
  disciplineStreak,
  tone,
  theme,
}) {
  const W = 1080;
  const H = 1500;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  const c = theme === "light" ? SHARE_COLORS.light : SHARE_COLORS.dark;
  const lineColor = tone === "bad" ? c.red : c.green;

  // background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, c.bgFrom);
  bgGrad.addColorStop(1, c.bgTo);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  const roundRect = (x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

  // outer card
  roundRect(36, 36, W - 72, H - 72, 28);
  ctx.strokeStyle = c.border;
  ctx.lineWidth = 2;
  ctx.stroke();

  // header
  ctx.fillStyle = c.gold;
  ctx.font = "600 26px monospace";
  ctx.textAlign = "left";
  ctx.fillText("LEDGER · WEEKLY RECAP", 80, 128);

  ctx.fillStyle = c.text;
  ctx.font = "700 58px monospace";
  ctx.fillText("MY TRADING WEEK", 80, 196);

  ctx.fillStyle = c.textMuted;
  ctx.font = "400 24px sans-serif";
  ctx.fillText(`${rangeLabel} · ${tradeCount} trade${tradeCount === 1 ? "" : "s"}`, 80, 236);

  // big net % readout
  ctx.fillStyle = c.textFaint;
  ctx.font = "600 20px sans-serif";
  ctx.fillText("NET RETURN", 80, 300);
  ctx.fillStyle = lineColor;
  ctx.font = "700 96px monospace";
  ctx.fillText(fmtPct(netPct), 80, 390);

  // equity curve chart
  const chartX = 80;
  const chartY = 440;
  const chartW = W - 160;
  const chartH = 340;

  roundRect(chartX, chartY, chartW, chartH, 20);
  ctx.fillStyle = c.surface;
  ctx.fill();
  ctx.strokeStyle = c.border;
  ctx.lineWidth = 1;
  ctx.stroke();

  const padX = 40;
  const padY = 40;
  const plotX = chartX + padX;
  const plotY = chartY + padY;
  const plotW = chartW - padX * 2;
  const plotH = chartH - padY * 2;

  const values = curve.map((p) => p.pct);
  let minV = Math.min(0, ...values);
  let maxV = Math.max(0, ...values);
  if (minV === maxV) {
    minV -= 1;
    maxV += 1;
  }
  const pad = (maxV - minV) * 0.15 || 1;
  minV -= pad;
  maxV += pad;

  const xFor = (i) => plotX + (curve.length > 1 ? (i / (curve.length - 1)) * plotW : plotW / 2);
  const yFor = (v) => plotY + plotH - ((v - minV) / (maxV - minV)) * plotH;

  // zero line
  ctx.strokeStyle = c.textFaint;
  ctx.setLineDash([6, 6]);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(plotX, yFor(0));
  ctx.lineTo(plotX + plotW, yFor(0));
  ctx.stroke();
  ctx.setLineDash([]);

  // filled area under curve
  ctx.beginPath();
  ctx.moveTo(xFor(0), yFor(0));
  curve.forEach((p, i) => ctx.lineTo(xFor(i), yFor(p.pct)));
  ctx.lineTo(xFor(curve.length - 1), yFor(0));
  ctx.closePath();
  const areaGrad = ctx.createLinearGradient(0, plotY, 0, plotY + plotH);
  areaGrad.addColorStop(0, `${lineColor}33`);
  areaGrad.addColorStop(1, `${lineColor}00`);
  ctx.fillStyle = areaGrad;
  ctx.fill();

  // line
  ctx.beginPath();
  curve.forEach((p, i) => {
    const x = xFor(i);
    const y = yFor(p.pct);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 4;
  ctx.lineJoin = "round";
  ctx.stroke();

  // end dot
  const lastX = xFor(curve.length - 1);
  const lastY = yFor(curve[curve.length - 1].pct);
  ctx.beginPath();
  ctx.arc(lastX, lastY, 8, 0, Math.PI * 2);
  ctx.fillStyle = lineColor;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(lastX, lastY, 8, 0, Math.PI * 2);
  ctx.strokeStyle = c.dotRing;
  ctx.lineWidth = 3;
  ctx.stroke();

  // helper to draw one row of three stat chips
  const drawChipRow = (y, stats) => {
    const chipH = 150;
    const gap = 24;
    const chipW = (W - 160 - gap * 2) / 3;
    stats.forEach((s, i) => {
      const x = chartX + i * (chipW + gap);
      roundRect(x, y, chipW, chipH, 18);
      ctx.fillStyle = c.surface;
      ctx.fill();
      ctx.strokeStyle = c.border;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = c.textFaint;
      ctx.font = "600 16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(s.label, x + chipW / 2, y + 40);

      ctx.fillStyle = s.color;
      ctx.font = `700 ${s.small ? 30 : 40}px monospace`;
      ctx.fillText(s.value, x + chipW / 2, y + (s.small ? 92 : 96));
      ctx.textAlign = "left";
    });
    return y + chipH;
  };

  // row 1: outcome stats
  const row1Y = chartY + chartH + 48;
  const row1Bottom = drawChipRow(row1Y, [
    { label: "WIN RATE", value: `${fmt(winRate, 0)}%`, color: c.text },
    { label: "BEST STREAK", value: `+${bestStreak}`, color: c.green },
    { label: "WORST STREAK", value: `${worstStreak}`, color: worstStreak < 0 ? c.red : c.text },
  ]);

  // row 2: process/discipline stats — the "no dollar amounts, just the
  // process" ethos, made visible as actual numbers rather than just a tagline
  const row2Y = row1Bottom + 24;
  drawChipRow(row2Y, [
    {
      label: "DISCIPLINE STREAK",
      value: `${disciplineStreak}d`,
      color: disciplineStreak > 0 ? c.green : c.textMuted,
    },
    {
      label: "TOP SETUP",
      value: topSetup ? topSetup.label : "\u2014",
      color: c.text,
      small: !!topSetup,
    },
    {
      label: "REVENGE TRADES",
      value: `${revengeCount}`,
      color: revengeCount > 0 ? c.red : c.green,
    },
  ]);

  // footer
  ctx.fillStyle = c.textFaint;
  ctx.font = "400 20px monospace";
  ctx.textAlign = "left";
  ctx.fillText("No dollar amounts \u2014 just the process.", 80, H - 70);

  ctx.textAlign = "right";
  ctx.fillStyle = c.goldBright;
  ctx.font = "600 22px monospace";
  ctx.fillText("LEDGER", W - 80, H - 70);
  ctx.textAlign = "left";

  return canvas.toDataURL("image/png");
}

export default function LedgerApp() {
  const [activeTab, setActiveTab] = useState("risk");
  const [riskSubTab, setRiskSubTab] = useState("challenge");
  const [theme, setTheme] = useState("dark");
  const [themeLoaded, setThemeLoaded] = useState(false);

  // Keep the mutable `palette` object in sync with the chosen theme on every
  // render, before anything below reads palette.xxx.
  Object.assign(palette, theme === "light" ? LIGHT_PALETTE : DARK_PALETTE);

  const [edge, setEdge] = useState({
    accountBalance: "",
    entry: "",
    stop: "",
    target: "",
    avgWin: "",
    avgLoss: "",
    buffer: "5",
    totalTrades: "",
  });
  const [cs, setCs] = useState({
    startBal: "",
    currentBal: "",
    targetPct: "10",
    dailyLossPct: "5",
    todayLoss: "",
    bestDay: "",
    rule: "30",
  });
  const [ps, setPs] = useState({
    balance: "",
    riskPct: "1",
    stopPips: "",
    valuePerPip: "10",
    preset: "forex",
  });
  const [fx, setFx] = useState({ amount: "100", from: "USD", to: "BDT", customRate: "" });

  const [liveFxRates, setLiveFxRates] = useState(null); // { USD: 1, EUR: 0.86, ... } or null
  const [fxRatesDate, setFxRatesDate] = useState(null); // "2026-08-21"
  const [fxRatesStatus, setFxRatesStatus] = useState("idle"); // idle | loading | live | error

  const [trades, setTrades] = useState([]);
  const [tradesLoaded, setTradesLoaded] = useState(false);
  const [tradeInput, setTradeInput] = useState("");
  const [tradeNote, setTradeNote] = useState("");
  const [tradeEmotion, setTradeEmotion] = useState(null);
  const [tradeSetup, setTradeSetup] = useState(null);
  const [startingBalance, setStartingBalance] = useState("");
  const [tradesLoadError, setTradesLoadError] = useState("");
  const [calMonth, setCalMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [showStreakInfo, setShowStreakInfo] = useState(false);
  const [showDisciplineInfo, setShowDisciplineInfo] = useState(false);

  // ---- Insights tab: sub-nav (Overview / Behavior / Setup) and which
  // Performance Overview metric card is currently expanded to show its
  // plain-language explanation, if any.
  const [insightSubTab, setInsightSubTab] = useState("overview");
  const [expandedMetric, setExpandedMetric] = useState(null);
  const [expandedHeatmapDay, setExpandedHeatmapDay] = useState(null);
  const [insightReportMsg, setInsightReportMsg] = useState("");

  // ---- Journal tab: sub-nav (Journal / Playbook), plus the spreadsheet
  // journal itself, browsed by year then month. journalEntries holds only
  // rows the user has actually touched (empty calendar days are
  // synthesized at render time, not stored \u2014 see the journal tab body
  // below). journalMonth === null means the year-grid view is showing; a
  // number (0-11) opens that month's table.
  const [journalSubTab, setJournalSubTab] = useState("log");
  const [journalEntries, setJournalEntries] = useState([]);
  const [journalLoaded, setJournalLoaded] = useState(false);
  const [journalYear, setJournalYear] = useState(() => new Date().getFullYear());
  const [journalMonth, setJournalMonth] = useState(null);
  const [journalColWidths, setJournalColWidths] = useState(DEFAULT_JOURNAL_COL_WIDTHS);
  const journalResizeRef = useRef(null);
  // Maps "rowId:colId" -> the mounted input/select DOM node for that cell,
  // used both to autofocus a freshly-added row and to drive Alt+Arrow
  // cell-to-cell keyboard navigation across the journal table.
  const journalCellRefs = useRef({});
  // Set right after adding a row so a focus effect can jump into it once
  // it's actually rendered (it isn't yet on the same render as the write).
  const [journalFocusRowId, setJournalFocusRowId] = useState(null);

  // ---- Journal tab \u2192 Playbook sub-tab: user-defined trading rules plus
  // a once-a-day check-in against whichever rules are currently active.
  // playbookRules and playbookCheckins are persisted independently (see
  // PLAYBOOK_RULES_KEY / PLAYBOOK_CHECKINS_KEY above) so deleting a rule
  // never rewrites historical check-ins.
  const [playbookRules, setPlaybookRules] = useState([]);
  const [playbookRulesLoaded, setPlaybookRulesLoaded] = useState(false);
  const [playbookCheckins, setPlaybookCheckins] = useState([]);
  const [playbookCheckinsLoaded, setPlaybookCheckinsLoaded] = useState(false);
  const [newRuleText, setNewRuleText] = useState("");
  const [playbookRuleError, setPlaybookRuleError] = useState("");
  // Draft results for *today's* check-in, keyed by rule id. Seeded from an
  // existing check-in for today (if the user already checked in and is
  // revising it) whenever playbookCheckins finishes loading.
  const [todayResults, setTodayResults] = useState({});
  const [playbookMsg, setPlaybookMsg] = useState("");

  // ---- Edit trade: tapping the pencil icon on a logged trade row loads
  // that trade's values into the same Log-a-Trade form below instead of
  // requiring a delete + re-log. editingTradeId tracks which trade (if any)
  // is being edited; the same tradeInput/tradeNote/tradeEmotion/tradeSetup
  // state doubles as the edit form's fields, and submitTrade below either
  // adds a new trade or patches the one being edited.
  const [editingTradeId, setEditingTradeId] = useState(null);
  const logFormRef = useRef(null);

  // ---- Custom setup tags: up to MAX_CUSTOM_SETUPS user-defined tags that
  // sit alongside the built-in SETUPS list everywhere setups are shown
  // (logging a trade, the trade row badge, the weekly recap's "top setup").
  // Persisted separately from trades so they survive even if all trades are
  // cleared.
  const [customSetups, setCustomSetups] = useState([]);
  const [customSetupsLoaded, setCustomSetupsLoaded] = useState(false);
  const [addingSetup, setAddingSetup] = useState(false);
  const [newSetupName, setNewSetupName] = useState("");
  const [setupError, setSetupError] = useState("");

  // ---- Trade screenshots: attach up to SCREENSHOT_MAX_PER_TRADE chart
  // screenshots to any already-logged trade from the calendar day view.
  // Hidden by default — expandedTradeId tracks which trade's row is tapped
  // open, and only that row reveals its screenshots (or the add tile).
  // screenshotTargetId tracks which trade the (single, shared) hidden file
  // input is attaching to.
  const [expandedTradeId, setExpandedTradeId] = useState(null);
  const screenshotInputRef = useRef(null);
  const [screenshotTargetId, setScreenshotTargetId] = useState(null);
  const [screenshotError, setScreenshotError] = useState("");
  const [screenshotSaving, setScreenshotSaving] = useState(false);
  // Holds { src, trade, index } for the screenshot currently open in the
  // full-screen viewer, so the Share button below has the trade's P&L/date
  // to use as share text and a sensible filename.
  const [viewingScreenshot, setViewingScreenshot] = useState(null);
  const [screenshotShareMsg, setScreenshotShareMsg] = useState("");
  // Holds { tradeId, index } for a screenshot the user tapped the X on but
  // hasn't confirmed deleting yet \u2014 an in-app confirm card is used instead
  // of window.confirm(), which sandboxed previews often block silently.
  const [pendingScreenshotDelete, setPendingScreenshotDelete] = useState(null);

  const [newsEvents, setNewsEvents] = useState([]);
  const [newsLoaded, setNewsLoaded] = useState(false);
  const [newEventName, setNewEventName] = useState("");
  const [newEventImpact, setNewEventImpact] = useState("high");
  const [newEventDate, setNewEventDate] = useState("");
  const [newEventTime, setNewEventTime] = useState("18:30");
  const [newEventAlarm, setNewEventAlarm] = useState(true);
  const [newsLoadError, setNewsLoadError] = useState("");

  // ---- Alarm system state. This is a best-effort, browser-only alarm: it
  // rings via the Notification API (if permitted) plus an in-page sound and
  // modal, but only while this app is open in a tab. It cannot set a real
  // OS-level alarm — there's no web API for that.
  const [notifPermission, setNotifPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );
  const [ringingEvent, setRingingEvent] = useState(null);
  const audioCtxRef = useRef(null);
  const beepIntervalRef = useRef(null);

  const shareCanvasRef = useRef(null);
  const [shareImageUrl, setShareImageUrl] = useState(null);
  const [shareError, setShareError] = useState("");

  // ---- Sessions tab: a live clock, ticking once a second, that the
  // Sessions tab formats into local time and compares against each market
  // session's UTC hours. Lives at the top level (not inside the tab body)
  // so the interval only exists while this component is mounted, same
  // pattern as the alarm-check interval above.
  const [currentTime, setCurrentTime] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const [copyMsg, setCopyMsg] = useState("");
  const [copyFallbackText, setCopyFallbackText] = useState("");

  const fileInputRef = useRef(null);
  const [backupMsg, setBackupMsg] = useState("");
  // Holds a parsed-but-not-yet-applied backup file, so the user can confirm
  // the overwrite from an in-app card instead of a native confirm() dialog
  // (which sandboxed previews often block silently).
  const [pendingImport, setPendingImport] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [tradesRes, balRes, themeRes] = await Promise.allSettled([
          window.storage.get(STORAGE_KEY, false),
          window.storage.get(STORAGE_BAL_KEY, false),
          window.storage.get(THEME_STORAGE_KEY, false),
        ]);
        if (cancelled) return;
        if (tradesRes.status === "fulfilled" && tradesRes.value) {
          const parsed = JSON.parse(tradesRes.value.value);
          if (Array.isArray(parsed)) setTrades(parsed);
        }
        if (balRes.status === "fulfilled" && balRes.value) {
          setStartingBalance(balRes.value.value);
        }
        if (themeRes.status === "fulfilled" && themeRes.value) {
          const t = themeRes.value.value;
          if (t === "light" || t === "dark") setTheme(t);
        }
      } catch (err) {
        if (!cancelled) setTradesLoadError("Couldn't load saved trades.");
      } finally {
        if (!cancelled) {
          setTradesLoaded(true);
          setThemeLoaded(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await window.storage.get(NEWS_STORAGE_KEY, false);
        if (cancelled) return;
        if (res && res.value) {
          const parsed = JSON.parse(res.value);
          if (Array.isArray(parsed)) setNewsEvents(parsed);
        }
      } catch (err) {
        if (!cancelled) setNewsLoadError("Couldn't load saved events.");
      } finally {
        if (!cancelled) setNewsLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Loads any previously saved custom setup tags. Independent of the trades
  // load above so custom setups persist even across a "Clear all" on trades.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await window.storage.get(CUSTOM_SETUPS_STORAGE_KEY, false);
        if (cancelled) return;
        if (res && res.value) {
          const parsed = JSON.parse(res.value);
          if (Array.isArray(parsed)) setCustomSetups(parsed.slice(0, MAX_CUSTOM_SETUPS));
        }
      } catch (err) {
        // non-critical, fail silently \u2014 custom setups just start empty
      } finally {
        if (!cancelled) setCustomSetupsLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Loads saved journal entries and any resized column widths. Independent
  // of every other loader above so the Journal tab works standalone.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [entriesRes, widthsRes] = await Promise.allSettled([
          window.storage.get(JOURNAL_STORAGE_KEY, false),
          window.storage.get(JOURNAL_COLS_STORAGE_KEY, false),
        ]);
        if (cancelled) return;
        if (entriesRes.status === "fulfilled" && entriesRes.value) {
          const parsed = JSON.parse(entriesRes.value.value);
          if (Array.isArray(parsed)) setJournalEntries(parsed);
        }
        if (widthsRes.status === "fulfilled" && widthsRes.value) {
          const parsed = JSON.parse(widthsRes.value.value);
          if (parsed && typeof parsed === "object") {
            setJournalColWidths({ ...DEFAULT_JOURNAL_COL_WIDTHS, ...parsed });
          }
        }
      } catch (err) {
        // non-critical, fail silently \u2014 journal just starts empty
      } finally {
        if (!cancelled) setJournalLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Loads saved playbook rules and check-ins. Seeds first-time users with
  // PLAYBOOK_STARTER_RULES instead of an empty list so the tab has
  // something to check in against immediately, and persists that seed
  // right away so it isn't silently re-seeded (with new ids) on next load.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [rulesRes, checkinsRes] = await Promise.allSettled([
          window.storage.get(PLAYBOOK_RULES_KEY, false),
          window.storage.get(PLAYBOOK_CHECKINS_KEY, false),
        ]);
        if (cancelled) return;
        let loadedRules = null;
        if (rulesRes.status === "fulfilled" && rulesRes.value) {
          const parsed = JSON.parse(rulesRes.value.value);
          if (Array.isArray(parsed)) loadedRules = parsed;
        }
        if (loadedRules) {
          setPlaybookRules(loadedRules);
        } else {
          const seeded = PLAYBOOK_STARTER_RULES.map((text, i) => ({
            id: `rule-${Date.now()}-${i}`,
            text,
          }));
          setPlaybookRules(seeded);
          window.storage.set(PLAYBOOK_RULES_KEY, JSON.stringify(seeded), false).catch(() => {});
        }
        if (checkinsRes.status === "fulfilled" && checkinsRes.value) {
          const parsed = JSON.parse(checkinsRes.value.value);
          if (Array.isArray(parsed)) setPlaybookCheckins(parsed);
        }
      } catch (err) {
        // non-critical, fail silently \u2014 playbook just starts empty
      } finally {
        if (!cancelled) {
          setPlaybookRulesLoaded(true);
          setPlaybookCheckinsLoaded(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Once check-ins have loaded, seed today's draft from an existing
  // check-in for today (so revisiting the tab shows what was already
  // logged) rather than always starting blank.
  useEffect(() => {
    if (!playbookCheckinsLoaded) return;
    const todayKey = dayKeyFromDate(new Date());
    const existing = playbookCheckins.find((c) => c.date === todayKey);
    setTodayResults(existing ? { ...existing.results } : {});
    // Only run this seed once, right when check-ins finish loading \u2014
    // afterwards todayResults is fully driven by the checkboxes below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playbookCheckinsLoaded]);

  // Loads live FX rates: serves a cached copy instantly if it's under
  // FX_CACHE_MS old, and always refreshes from the API in the background
  // (once a day is plenty — these are daily rates, not intraday).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setFxRatesStatus("loading");
      let hadFreshCache = false;
      try {
        const cachedRes = await window.storage.get(FX_LIVE_STORAGE_KEY, false);
        if (cachedRes && cachedRes.value) {
          const cached = JSON.parse(cachedRes.value);
          if (cached.rates) {
            if (!cancelled) {
              setLiveFxRates(cached.rates);
              setFxRatesDate(cached.date || null);
              setFxRatesStatus("live");
            }
            hadFreshCache = cached.fetchedAt && Date.now() - cached.fetchedAt < FX_CACHE_MS;
          }
        }
      } catch (err) {
        // no usable cache, fall through to network fetch
      }
      if (hadFreshCache) return;

      const result = await fetchLiveFxRates();
      if (cancelled) return;
      if (result) {
        setLiveFxRates(result.rates);
        setFxRatesDate(result.date);
        setFxRatesStatus("live");
        window.storage
          .set(FX_LIVE_STORAGE_KEY, JSON.stringify({ ...result, fetchedAt: Date.now() }), false)
          .catch(() => {});
      } else {
        setFxRatesStatus((cur) => (cur === "live" ? cur : "error"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    window.storage.set(THEME_STORAGE_KEY, next, false).catch(() => {});
  };

  // Keeps the actual <html>/<body> background and the browser's status-bar
  // color (theme-color meta tag) in sync with the in-app theme. Without
  // this, those stay on their hardcoded dark value from index.html and can
  // flash/show through during scroll bounce or layout shifts while the app
  // content is mid-transition to light mode \u2014 that's the "black section
  // lags behind" effect.
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.style.backgroundColor = palette.letterbox;
    document.body.style.backgroundColor = palette.letterbox;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", palette.bg);
  }, [theme]);

  const persistNews = async (next) => {
    setNewsEvents(next);
    try {
      await window.storage.set(NEWS_STORAGE_KEY, JSON.stringify(next), false);
    } catch (err) {
      // non-critical, fail silently
    }
  };

  // ---- Alarm sound: a plain oscillator beep via Web Audio, so no external
  // audio file is needed. The AudioContext is created on a real user click
  // (the alarm toggle) so autoplay policies don't block it later when the
  // alarm actually fires without a fresh gesture.
  const ensureAudioContext = () => {
    if (!audioCtxRef.current) {
      const Ctx = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
      if (Ctx) {
        try {
          audioCtxRef.current = new Ctx();
        } catch (err) {
          audioCtxRef.current = null;
        }
      }
    }
    return audioCtxRef.current;
  };

  const startBeep = () => {
    const ctx = ensureAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    const playBeep = () => {
      if (!audioCtxRef.current) return;
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      } catch (err) {
        // audio unavailable \u2014 the notification and modal still show
      }
    };
    playBeep();
    beepIntervalRef.current = setInterval(playBeep, 900);
  };

  const stopBeep = () => {
    if (beepIntervalRef.current) {
      clearInterval(beepIntervalRef.current);
      beepIntervalRef.current = null;
    }
  };

  // Stop any beep loop if the component ever unmounts mid-ring.
  useEffect(() => {
    return () => stopBeep();
  }, []);

  const requestAlarmPermission = async () => {
    if (typeof Notification === "undefined") {
      setNotifPermission("unsupported");
      return "unsupported";
    }
    if (Notification.permission === "granted" || Notification.permission === "denied") {
      setNotifPermission(Notification.permission);
      return Notification.permission;
    }
    try {
      const result = await Notification.requestPermission();
      setNotifPermission(result);
      return result;
    } catch (err) {
      setNotifPermission("denied");
      return "denied";
    }
  };

  // Toggling the alarm chip is a real user click, so it's the right moment
  // to both ask for Notification permission and unlock the AudioContext.
  const toggleNewEventAlarm = () => {
    const next = !newEventAlarm;
    setNewEventAlarm(next);
    if (next) {
      ensureAudioContext();
      requestAlarmPermission();
    }
  };

  const triggerAlarm = (ev) => {
    setRingingEvent(ev);
    startBeep();
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      try {
        new Notification(`\u23F0 ${ev.name}`, {
          body: `Scheduled for ${ev.time} today \u2014 open Ledger to dismiss`,
          tag: `ledger-alarm-${ev.id}`,
        });
      } catch (err) {
        // ignore \u2014 sound + in-app modal still ring
      }
    }
  };

  const dismissAlarm = () => {
    stopBeep();
    setRingingEvent(null);
  };

  const snoozeAlarm = () => {
    if (!ringingEvent) return;
    stopBeep();
    const id = ringingEvent.id;
    persistNews(
      newsEvents.map((e) => (e.id === id ? { ...e, rung: false, snoozeUntil: Date.now() + 5 * 60000 } : e))
    );
    setRingingEvent(null);
  };

  // Checks alarm-enabled events on a short interval. Only fires while this
  // effect is alive, i.e. only while the app is open — see the caveats in
  // the News tab copy and the ringing modal.
  //
  // A snoozed event (snoozeUntil set) is checked purely against that
  // timestamp — once it's snoozed once, the original pre-event lead-time /
  // stale-window gate no longer applies, otherwise a second or third snooze
  // could silently fall outside ALARM_STALE_WINDOW_MS and never ring again.
  useEffect(() => {
    if (!newsLoaded) return;
    const tick = () => {
      if (ringingEvent) return;
      const nowMs = Date.now();
      const due = newsEvents
        .filter((ev) => ev.alarm && !ev.rung)
        .map((ev) => ({ ev, occMs: nextOccurrenceMs(ev, new Date()) }))
        .filter(({ ev, occMs }) =>
          ev.snoozeUntil
            ? nowMs >= ev.snoozeUntil
            : Number.isFinite(occMs) && nowMs >= occMs - ALARM_LEAD_MS && nowMs < occMs + ALARM_STALE_WINDOW_MS
        )
        .sort((a, b) => a.occMs - b.occMs);
      if (due.length > 0) {
        const { ev } = due[0];
        persistNews(newsEvents.map((e) => (e.id === ev.id ? { ...e, rung: true, snoozeUntil: undefined } : e)));
        triggerAlarm(ev);
      }
    };
    tick();
    const id = setInterval(tick, ALARM_CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [newsEvents, newsLoaded, ringingEvent]);

  const addNewsEvent = () => {
    if (!newEventName.trim() || !newEventTime || !newEventDate) return;
    const next = [
      ...newsEvents,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: newEventName.trim(),
        impact: newEventImpact,
        date: newEventDate,
        time: newEventTime,
        alarm: newEventAlarm,
        rung: false,
      },
    ];
    persistNews(next);
    setNewEventName("");
    setNewEventDate("");
  };

  const deleteNewsEvent = (id) => {
    persistNews(newsEvents.filter((e) => e.id !== id));
  };

  // Trade saves are best-effort, same as the starting balance and news
  // persistence above — a transient storage hiccup shouldn't surface a
  // "wasn't saved" warning every time someone logs a trade. If loading saved
  // trades on launch fails, that's still surfaced via tradesLoadError below.
  const persistTrades = async (next) => {
    setTrades(next);
    try {
      await window.storage.set(STORAGE_KEY, JSON.stringify(next), false);
    } catch (err) {
      // non-critical, fail silently
    }
  };

  const persistStartingBalance = async (val) => {
    setStartingBalance(val);
    try {
      await window.storage.set(STORAGE_BAL_KEY, val, false);
    } catch (err) {
      // starting balance is non-critical, fail silently
    }
  };

  // Saves the custom setup tag list (and mirrors it into local state right
  // away, same best-effort pattern as trades/news/theme above).
  const persistCustomSetups = async (next) => {
    setCustomSetups(next);
    try {
      await window.storage.set(CUSTOM_SETUPS_STORAGE_KEY, JSON.stringify(next), false);
    } catch (err) {
      // non-critical, fail silently
    }
  };

  // Looks up a setup's display label across both the built-in SETUPS list
  // and any user-added custom setups, so trade badges and recaps never show
  // a raw id for a custom tag.
  const findSetupLabel = (id) => setupMeta(id)?.label || customSetups.find((s) => s.id === id)?.label || id;

  // ---- Journal tab: persistence, row editing, and column-resize handlers.
  const persistJournalEntries = async (next) => {
    setJournalEntries(next);
    try {
      await window.storage.set(JOURNAL_STORAGE_KEY, JSON.stringify(next), false);
    } catch (err) {
      // non-critical, fail silently
    }
  };

  const persistJournalColWidths = async (next) => {
    try {
      await window.storage.set(JOURNAL_COLS_STORAGE_KEY, JSON.stringify(next), false);
    } catch (err) {
      // non-critical, fail silently
    }
  };

  // Edits one field on a journal row. If `id` doesn't match any stored row
  // yet (i.e. it's one of the empty per-day placeholder rows synthesized at
  // render time), this promotes it into a real, persisted row on first
  // edit \u2014 empty days themselves are never written to storage.
  const updateJournalField = (id, field, value, dateForRow) => {
    const exists = journalEntries.some((r) => r.id === id);
    if (exists) {
      persistJournalEntries(journalEntries.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
      return;
    }
    const newRow = { id, date: dateForRow, pair: "", trend: "", rr: "", setup: "", mistake: "", note: "", [field]: value };
    persistJournalEntries([...journalEntries, newRow]);
  };

  // `defaultDate` lets the caller seed a new row with a date inside the
  // month currently being viewed \u2014 without this, a row added while
  // browsing a past/future month would default to today's date and then
  // vanish from the table (rows are filtered to the viewed month below),
  // making the button look broken.
  const addJournalRow = (defaultDate) => {
    const id = `j-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const date = defaultDate || dayKeyFromDate(new Date());
    persistJournalEntries([
      ...journalEntries,
      { id, date, pair: "", trend: "", rr: "", setup: "", mistake: "", note: "" },
    ]);
    setJournalFocusRowId(id);
  };

  const deleteJournalRow = (id) => {
    persistJournalEntries(journalEntries.filter((r) => r.id !== id));
  };

  // Column resize, driven by pointer events with capture so dragging still
  // tracks correctly even if the pointer strays outside the thin handle.
  const startJournalResize = (col) => (e) => {
    e.stopPropagation();
    journalResizeRef.current = { col, startX: e.clientX, startWidth: journalColWidths[col] };
    if (e.target.setPointerCapture) {
      try {
        e.target.setPointerCapture(e.pointerId);
      } catch (err) {
        // ignore \u2014 dragging still works without capture on most browsers
      }
    }
  };

  const moveJournalResize = (e) => {
    if (!journalResizeRef.current) return;
    const { col, startX, startWidth } = journalResizeRef.current;
    const delta = e.clientX - startX;
    const next = Math.max(JOURNAL_COL_MIN, Math.min(JOURNAL_COL_MAX, startWidth + delta));
    setJournalColWidths((w) => ({ ...w, [col]: next }));
  };

  const endJournalResize = () => {
    if (!journalResizeRef.current) return;
    journalResizeRef.current = null;
    persistJournalColWidths(journalColWidths);
  };

  // Focuses a specific journal cell (by row id + column id) if it's
  // currently mounted \u2014 used for Alt+Arrow cell-to-cell navigation below.
  const focusJournalCell = (rowId, colId) => {
    const el = journalCellRefs.current[`${rowId}:${colId}`];
    if (el && typeof el.focus === "function") el.focus();
  };

  // After a new row is added, focus its Pair cell once it's actually
  // mounted \u2014 it isn't yet on the same render that persists it.
  useEffect(() => {
    if (!journalFocusRowId) return;
    const el = journalCellRefs.current[`${journalFocusRowId}:pair`];
    if (el) {
      el.focus();
      setJournalFocusRowId(null);
    }
  }, [journalEntries, journalFocusRowId]);

  // Alt+Arrow moves between journal cells left/right/up/down like a
  // spreadsheet, including into and out of the Date cell \u2014 a plain arrow
  // key there only moves between the date input's own day/month/year
  // segments, so a modifier is needed to jump cells consistently no matter
  // which column (date, pair, trend, setup, mistake, note) the focus is in.
  const handleJournalCellKeyDown = (e, rowIdx, colIdx, rows) => {
    if (!e.altKey) return;
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
    e.preventDefault();
    let nextRowIdx = rowIdx;
    let nextColIdx = colIdx;
    if (e.key === "ArrowLeft") nextColIdx = Math.max(0, colIdx - 1);
    if (e.key === "ArrowRight") nextColIdx = Math.min(JOURNAL_COLUMNS.length - 1, colIdx + 1);
    if (e.key === "ArrowUp") nextRowIdx = Math.max(0, rowIdx - 1);
    if (e.key === "ArrowDown") nextRowIdx = Math.min(rows.length - 1, rowIdx + 1);
    const nextRow = rows[nextRowIdx];
    const nextCol = JOURNAL_COLUMNS[nextColIdx];
    if (nextRow && nextCol) focusJournalCell(nextRow.id, nextCol.id);
  };

  const openAddSetup = () => {
    setSetupError("");
    setNewSetupName("");
    setAddingSetup(true);
  };

  const cancelAddSetup = () => {
    setAddingSetup(false);
    setNewSetupName("");
    setSetupError("");
  };

  const confirmAddSetup = () => {
    const name = newSetupName.trim();
    if (!name) return;
    if (name.length > 20) {
      setSetupError("Keep it under 20 characters.");
      return;
    }
    const allLabels = [...SETUPS, ...customSetups].map((s) => s.label.toLowerCase());
    if (allLabels.includes(name.toLowerCase())) {
      setSetupError("That setup already exists.");
      return;
    }
    if (customSetups.length >= MAX_CUSTOM_SETUPS) {
      setSetupError(`You can add up to ${MAX_CUSTOM_SETUPS} custom setups.`);
      return;
    }
    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const next = [...customSetups, { id, label: name }];
    persistCustomSetups(next);
    setTradeSetup(id);
    setAddingSetup(false);
    setNewSetupName("");
    setSetupError("");
  };

  const removeCustomSetup = (id) => {
    persistCustomSetups(customSetups.filter((s) => s.id !== id));
    if (tradeSetup === id) setTradeSetup(null);
  };

  // ---- Playbook (Journal sub-tab): persistence and handlers.
  const persistPlaybookRules = async (next) => {
    setPlaybookRules(next);
    try {
      await window.storage.set(PLAYBOOK_RULES_KEY, JSON.stringify(next), false);
    } catch (err) {
      // non-critical, fail silently
    }
  };

  const persistPlaybookCheckins = async (next) => {
    setPlaybookCheckins(next);
    try {
      await window.storage.set(PLAYBOOK_CHECKINS_KEY, JSON.stringify(next), false);
    } catch (err) {
      // non-critical, fail silently
    }
  };

  const addPlaybookRule = () => {
    const text = newRuleText.trim();
    if (!text) return;
    if (text.length > 80) {
      setPlaybookRuleError("Keep it under 80 characters.");
      return;
    }
    if (playbookRules.length >= MAX_PLAYBOOK_RULES) {
      setPlaybookRuleError(`You can track up to ${MAX_PLAYBOOK_RULES} rules at once.`);
      return;
    }
    const id = `rule-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    persistPlaybookRules([...playbookRules, { id, text }]);
    setNewRuleText("");
    setPlaybookRuleError("");
  };

  // Removing a rule only affects future check-ins and the rule list itself
  // \u2014 past check-ins keep whatever result was recorded for that rule id,
  // since isCleanCheckin / computePlaybookStats read straight from each
  // check-in's own results object rather than re-checking against the
  // current rule list.
  const removePlaybookRule = (id) => {
    persistPlaybookRules(playbookRules.filter((r) => r.id !== id));
    setTodayResults((cur) => {
      const next = { ...cur };
      delete next[id];
      return next;
    });
  };

  const toggleTodayResult = (ruleId) => {
    setTodayResults((cur) => ({ ...cur, [ruleId]: !cur[ruleId] }));
  };

  // Saves (or updates) today's check-in against every currently active
  // rule \u2014 a rule with no toggle tapped yet defaults to "not followed"
  // rather than being silently skipped, so a half-finished check-in can't
  // read as clean.
  const submitCheckin = () => {
    if (playbookRules.length === 0) {
      setPlaybookMsg("Add at least one rule above first.");
      return;
    }
    const todayKey = dayKeyFromDate(new Date());
    const results = {};
    playbookRules.forEach((r) => {
      results[r.id] = !!todayResults[r.id];
    });
    const existingIdx = playbookCheckins.findIndex((c) => c.date === todayKey);
    let next;
    if (existingIdx >= 0) {
      next = playbookCheckins.map((c, i) => (i === existingIdx ? { ...c, results } : c));
    } else {
      next = [
        ...playbookCheckins,
        { id: `chk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, date: todayKey, results },
      ];
    }
    persistPlaybookCheckins(next);
    setTodayResults(results);
    setPlaybookMsg(isCleanCheckin({ results }) ? "Clean day \u2014 every rule followed." : "Check-in saved.");
  };

  // Deletes a single check-in from history. Does not touch today's draft
  // (todayResults) unless the deleted check-in was today's — in that case
  // the draft is cleared too, so the Today's Check-In card no longer shows
  // stale toggles for a check-in that no longer exists.
  const deletePlaybookCheckin = (id) => {
    const deleted = playbookCheckins.find((c) => c.id === id);
    persistPlaybookCheckins(playbookCheckins.filter((c) => c.id !== id));
    if (deleted && deleted.date === dayKeyFromDate(new Date())) {
      setTodayResults({});
    }
  };

  // Resets the Log-a-Trade form back to its blank, "new trade" state and
  // exits edit mode (if any).
  const resetTradeForm = () => {
    setTradeInput("");
    setTradeNote("");
    setTradeEmotion(null);
    setTradeSetup(null);
    setEditingTradeId(null);
  };

  // Loads an existing trade's values into the Log-a-Trade form so the user
  // can adjust and re-save instead of deleting and re-logging. Collapses
  // the trade's expanded screenshot row (if open) since the form itself
  // takes over as the point of interaction, and scrolls the form into view
  // since it lives above the calendar the trade was tapped from.
  const startEditTrade = (t) => {
    setTradeInput(String(t.pnl));
    setTradeNote(t.note || "");
    setTradeEmotion(t.emotion || null);
    setTradeSetup(t.setup || null);
    setEditingTradeId(t.id);
    setExpandedTradeId((cur) => (cur === t.id ? null : cur));
    if (logFormRef.current) {
      logFormRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const cancelEditTrade = () => {
    resetTradeForm();
  };

  // Adds a new trade, or — when editingTradeId is set — patches the
  // existing trade in place (keeping its id, timestamp, and any attached
  // screenshots) instead of appending a duplicate.
  const submitTrade = () => {
    const pnl = num(tradeInput);
    if (!tradeInput || pnl === 0) return;

    if (editingTradeId) {
      const next = trades.map((t) =>
        t.id === editingTradeId
          ? { ...t, pnl, note: tradeNote.trim(), emotion: tradeEmotion, setup: tradeSetup }
          : t
      );
      persistTrades(next);
      resetTradeForm();
      return;
    }

    const next = [
      ...trades,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        pnl,
        note: tradeNote.trim(),
        emotion: tradeEmotion,
        setup: tradeSetup,
        ts: Date.now(),
      },
    ];
    persistTrades(next);
    resetTradeForm();
  };

  const deleteTrade = (id) => {
    persistTrades(trades.filter((t) => t.id !== id));
    // If the trade being deleted is the one currently loaded into the edit
    // form, back the form out of edit mode too so it doesn't silently try
    // to save changes to a trade that no longer exists.
    if (editingTradeId === id) resetTradeForm();
  };

  const clearTrades = () => {
    persistTrades([]);
    resetTradeForm();
  };

  // Opens the shared hidden file input, remembering which trade it's for.
  const openScreenshotPicker = (tradeId) => {
    setScreenshotError("");
    setScreenshotTargetId(tradeId);
    if (screenshotInputRef.current) screenshotInputRef.current.click();
  };

  // Resizes/compresses the picked image (kept as sharp as the per-image
  // byte budget allows — see resizeImageFile above), then saves it onto the
  // target trade and persists the whole trades array right away, the same
  // path every other trade edit goes through.
  const handleScreenshotChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = ""; // allow re-picking the same file later
    const targetId = screenshotTargetId;
    setScreenshotTargetId(null);
    if (!file || !targetId) return;
    setScreenshotError("");
    setScreenshotSaving(true);
    try {
      const dataUrl = await resizeImageFile(file);
      await persistTrades(
        trades.map((t) => {
          if (t.id !== targetId) return t;
          const existing = tradeScreenshots(t);
          if (existing.length >= SCREENSHOT_MAX_PER_TRADE) return t;
          // Migrate off the old singular `screenshot` field once a trade
          // gets its array populated, so there's only ever one source of
          // truth for a given trade going forward.
          return { ...t, screenshots: [...existing, dataUrl], screenshot: undefined };
        })
      );
    } catch (err) {
      setScreenshotError("Couldn't attach that image, please try again.");
    } finally {
      setScreenshotSaving(false);
    }
  };

  const removeScreenshot = (tradeId, index) => {
    persistTrades(
      trades.map((t) => {
        if (t.id !== tradeId) return t;
        return { ...t, screenshots: tradeScreenshots(t).filter((_, i) => i !== index), screenshot: undefined };
      })
    );
  };

  const confirmDeleteScreenshot = () => {
    if (!pendingScreenshotDelete) return;
    removeScreenshot(pendingScreenshotDelete.tradeId, pendingScreenshotDelete.index);
    setPendingScreenshotDelete(null);
  };

  const cancelDeleteScreenshot = () => setPendingScreenshotDelete(null);

  // Shares one screenshot (given its data URL and, optionally, the trade it
  // belongs to for a nicer filename/caption). Prefers the native share sheet
  // (native pickers, WhatsApp, Messages, AirDrop, etc.) via the Web Share
  // API's file support, and falls back to a direct download when that isn't
  // available (desktop browsers, sandboxed previews) or the device can't
  // share files. A cancelled share sheet is not an error.
  const shareImageFile = async (src, trade) => {
    setScreenshotShareMsg("");
    const dayKey = trade ? dayKeyFromTs(trade.ts) : dayKeyFromDate(new Date());
    const pnlLabel = trade ? `${trade.pnl >= 0 ? "+" : "-"}$${fmtMoney(trade.pnl)}` : "";
    const filename = `ledger-trade-${dayKey}${pnlLabel ? `-${pnlLabel.replace("+", "gain").replace("-", "loss").replace("$", "")}` : ""}.jpg`;

    let file;
    try {
      file = dataUrlToFile(src, filename);
    } catch (err) {
      setScreenshotShareMsg("Couldn't prepare that image to share.");
      return;
    }

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: "Trade Screenshot",
          text: trade ? `${pnlLabel} ${formatDayLabel(dayKey)}` : "Trade Screenshot",
        });
        return;
      } catch (err) {
        if (err && err.name === "AbortError") return; // user cancelled the share sheet
        // fall through to download below
      }
    }

    downloadImageFile(file, filename, "Sharing isn't available now \u2014 download instead.");
  };

  // Direct download, no share-sheet attempt \u2014 used by the explicit
  // Download button, and as shareImageFile's fallback when sharing isn't
  // available or is declined.
  const downloadImageFile = (file, filename, successMsg = "Downloaded.") => {
    try {
      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      setScreenshotShareMsg(successMsg);
    } catch (err) {
      setScreenshotShareMsg("Couldn't share or download that image.");
    }
  };

  const downloadScreenshot = (src, trade) => {
    setScreenshotShareMsg("");
    const dayKey = trade ? dayKeyFromTs(trade.ts) : dayKeyFromDate(new Date());
    const pnlLabel = trade ? `${trade.pnl >= 0 ? "+" : "-"}$${fmtMoney(trade.pnl)}` : "";
    const filename = `ledger-trade-${dayKey}${pnlLabel ? `-${pnlLabel.replace("+", "gain").replace("-", "loss").replace("$", "")}` : ""}.jpg`;
    try {
      const file = dataUrlToFile(src, filename);
      downloadImageFile(file, filename, "Downloaded.");
    } catch (err) {
      setScreenshotShareMsg("Couldn't prepare that image to download.");
    }
  };

  const applyPreset = (preset) => {
    const defaults = { forex: "10", gold: "1", custom: ps.valuePerPip };
    setPs({ ...ps, preset, valuePerPip: defaults[preset] });
  };

  // Builds the dollar-free "share my week" recap image and opens the preview.
  const generateWeeklyShare = () => {
    setShareError("");
    const now = Date.now();
    const weekTrades = trades.filter((t) => now - t.ts <= WEEK_MS).sort((a, b) => a.ts - b.ts);

    if (weekTrades.length === 0) {
      setShareError("No trades logged in the last 7 days yet.");
      return;
    }
    const startBal = num(startingBalance);
    if (!(startBal > 0)) {
      setShareError("Add a starting balance below first \u2014 it's only used to compute %, never shown.");
      return;
    }

    const recap = buildWeekRecap(weekTrades, startBal);
    const discipline = computeDisciplineStreak(trades);

    try {
      if (!shareCanvasRef.current) {
        setShareError("Couldn't generate the image, please try again.");
        return;
      }
      const dataUrl = drawShareCard(shareCanvasRef.current, {
        rangeLabel: recap.rangeLabel,
        tradeCount: recap.tradeCount,
        winRate: recap.winRate,
        netPct: recap.netPct,
        curve: recap.curve,
        bestStreak: recap.bestStreak,
        worstStreak: recap.worstStreak,
        topSetup: recap.topSetup,
        revengeCount: recap.revengeCount,
        disciplineStreak: discipline.current,
        tone: recap.netPct >= 0 ? "good" : "bad",
        theme,
      });
      setShareImageUrl(dataUrl);
    } catch (err) {
      setShareError("Couldn't generate the image, please try again.");
    }
  };

  const closeShare = () => setShareImageUrl(null);

  // Triggers a real download of the generated PNG. shareImageUrl is already
  // a data: URL from canvas.toDataURL(), so — same as the Export fix — a
  // temporary <a download> click is the reliable way to save it; the share
  // sheet / window.open route used previously is unreliable in a sandboxed
  // preview.
  const downloadShare = () => {
    if (!shareImageUrl) return;
    try {
      const a = document.createElement("a");
      a.href = shareImageUrl;
      a.download = "my-trading-week.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      // last resort: open it in a new tab so it can still be saved manually
      window.open(shareImageUrl, "_blank");
    }
  };

  // Builds the same weekly recap as the share image, formats it as plain
  // text, and puts it on the clipboard. Falls back to a selectable text box
  // if the Clipboard API is unavailable (common in sandboxed previews).
  const copyWeekSummary = async () => {
    setCopyMsg("");
    setCopyFallbackText("");
    const now = Date.now();
    const weekTrades = trades.filter((t) => now - t.ts <= WEEK_MS).sort((a, b) => a.ts - b.ts);

    if (weekTrades.length === 0) {
      setCopyMsg("No trades logged in the last 7 days yet.");
      return;
    }
    const startBal = num(startingBalance);
    if (!(startBal > 0)) {
      setCopyMsg("Add a starting balance below first \u2014 it's only used to compute %, never shown.");
      return;
    }

    const recap = buildWeekRecap(weekTrades, startBal);
    const discipline = computeDisciplineStreak(trades);

    const lines = [
      `My Trading Week \u2014 ${recap.rangeLabel}`,
      `Trades: ${recap.tradeCount}`,
      `Win Rate: ${fmt(recap.winRate, 0)}%`,
      `Net Return: ${fmtPct(recap.netPct)}`,
      `Best Streak: +${recap.bestStreak}    Worst Streak: ${recap.worstStreak}`,
      `Discipline Streak: ${discipline.current} day${discipline.current === 1 ? "" : "s"} (best: ${discipline.best})`,
      `Revenge Trades This Week: ${recap.revengeCount}`,
    ];
    if (recap.topSetup) {
      lines.push(`Top Setup: ${recap.topSetup.label} (${recap.topSetup.count}x)`);
    }
    lines.push("", "\u2014 Ledger \u00b7 no dollar amounts, just the process");
    const text = lines.join("\n");

    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) {
        throw new Error("Clipboard API unavailable");
      }
      await navigator.clipboard.writeText(text);
      setCopyMsg("Copied to clipboard.");
    } catch (err) {
      setCopyMsg("Couldn't copy automatically \u2014 select and copy the text below.");
      setCopyFallbackText(text);
    }
  };

  // Bundles every metric shown across the Insights tab's three sub-tabs
  // into one plain-text report and downloads it \u2014 same reliable <a download>
  // approach as the other exports in this file (see downloadImageFile /
  // exportBackup) since sandboxed previews are unreliable with the Web
  // Share API for arbitrary blobs.
  const exportInsightsReport = () => {
    setInsightReportMsg("");
    if (trades.length === 0) {
      setInsightReportMsg("Log some trades first \u2014 there's nothing to report on yet.");
      return;
    }
    const perf = computePerformanceMetrics(trades);
    const monthCmp = computeMonthComparison(trades);
    const completeness = computeJournalCompleteness(trades);
    const grade = computeDisciplineGrade(trades);
    const revengeCost = computeRevengeCostSplit(trades);
    const overconfidence = computeOverconfidenceCheck(trades);
    const noteTags = computeNoteTagAnalysis(trades);
    const consistency = computeConsistencyScore(trades);
    const insights = computeInsights(trades, customSetups);
    const headline = computeHeadlineInsight(trades, customSetups);

    const fmtSigned = (n) => `${n >= 0 ? "+" : "-"}$${fmtMoney(n)}`;
    const fmtRatio = (n) => (Number.isFinite(n) ? n.toFixed(2) : "\u221e");

    const lines = [
      "LEDGER \u2014 TRADING INSIGHTS REPORT",
      `Generated ${new Date().toLocaleString()}`,
      `${trades.length} trades logged`,
      "",
    ];
    if (headline) lines.push("HEADLINE", headline, "");

    lines.push(
      "PERFORMANCE OVERVIEW",
      `Profit Factor: ${fmtRatio(perf.profitFactor)} (${perf.tiers.profitFactor})`,
      `Recovery Factor: ${fmtRatio(perf.recoveryFactor)} (${perf.tiers.recoveryFactor})`,
      `Win/Loss Ratio: ${fmtRatio(perf.winLossRatio)} (${perf.tiers.winLossRatio})`,
      `Expectancy: ${fmtSigned(perf.expectancy)} per trade (${perf.tiers.expectancy})`,
      `Largest Win: ${fmtSigned(perf.largestWin)}`,
      `Largest Loss: ${fmtSigned(perf.largestLoss)}`,
      `Net Profit: ${fmtSigned(perf.netProfit)}`,
      "",
      "MONTH OVER MONTH",
      `This Month: ${monthCmp.thisMonth.count} trades, ${monthCmp.thisMonth.winRate.toFixed(0)}% win rate, ${fmtSigned(monthCmp.thisMonth.net)}`,
      `Last Month: ${monthCmp.lastMonth.count} trades, ${monthCmp.lastMonth.winRate.toFixed(0)}% win rate, ${fmtSigned(monthCmp.lastMonth.net)}`,
      "",
      `JOURNAL COMPLETENESS: ${completeness}%`,
      "",
      "BEHAVIOR",
      `Discipline Grade: ${grade.grade} (${grade.score}/100)`,
      `Revenge Trades: ${revengeCost.revengeCount} trades, ${fmtSigned(revengeCost.revengeTotal)}`,
      `Everything Else: ${revengeCost.cleanCount} trades, ${fmtSigned(revengeCost.cleanTotal)}`
    );
    if (overconfidence) {
      lines.push(
        `Post-Win-Streak Sizing: ${overconfidence.detected ? "UP" : "steady"} ${overconfidence.pctChange >= 0 ? "+" : ""}${overconfidence.pctChange.toFixed(0)}% vs normal after 3+ wins`
      );
    }
    if (consistency) {
      lines.push(`Consistency: ${consistency.label} day-to-day volatility`);
    }
    if (noteTags.length > 0) {
      lines.push("", "NOTE TAGS");
      noteTags.forEach((r) => lines.push(`${r.tag}: ${r.count} trades, ${r.winRate.toFixed(0)}% win rate, ${fmtSigned(r.pnl)}`));
    }
    if (insights.setupRows.length > 0) {
      lines.push("", "BY SETUP");
      insights.setupRows.forEach((r) =>
        lines.push(`${r.label}: ${r.count} trades, ${r.winRate.toFixed(0)}% win rate, ${fmtSigned(r.pnl)}`)
      );
    }
    if (insights.moodRows.length > 0) {
      lines.push("", "BY MOOD");
      insights.moodRows.forEach((r) =>
        lines.push(`${r.label}: ${r.count} trades, ${r.winRate.toFixed(0)}% win rate, ${fmtSigned(r.pnl)}`)
      );
    }
    lines.push("", "\u2014 Generated by Ledger");

    try {
      const blob = new Blob([lines.join("\n")], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ledger-insights-${dayKeyFromDate(new Date())}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      setInsightReportMsg("Press download to download the report.");
    } catch (err) {
      setInsightReportMsg("Couldn't create the report file, please try again.");
    }
  };

  // ---- Backup & Restore: everything lives only in this browser's storage,
  // so this is the one real safety net against clearing data or switching
  // phones. Exports trades, starting balance, news events, custom setups,
  // and theme as a single downloadable .json file; import reads that same
  // file back in after an in-app confirmation.
  const exportBackup = () => {
    setBackupMsg("");
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      startingBalance,
      trades,
      newsEvents,
      customSetups,
      journalEntries,
      journalColWidths,
      playbookRules,
      playbookCheckins,
      theme,
    };
    try {
      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ledger-backup-${dayKeyFromDate(new Date())}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Give the browser a moment to actually start the download before the
      // blob URL is revoked.
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      setBackupMsg("Press download to download the report.");
    } catch (err) {
      setBackupMsg("Couldn't create the backup file, please try again.");
    }
  };

  // Validates a parsed backup object's shape. Returns the object on success,
  // or null after setting an explanatory backupMsg.
  const validateBackup = (data) => {
    if (!data || !Array.isArray(data.trades)) {
      setBackupMsg("That file doesn't look like a Ledger backup.");
      return null;
    }
    const tradesValid = data.trades.every(
      (t) => t && typeof t.pnl === "number" && Number.isFinite(t.pnl) && typeof t.ts === "number"
    );
    if (!tradesValid) {
      setBackupMsg("That file doesn't look like a Ledger backup.");
      return null;
    }
    return data;
  };

  const importBackup = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;
    setBackupMsg("");
    const reader = new FileReader();
    reader.onload = () => {
      let data;
      try {
        data = JSON.parse(reader.result);
      } catch (err) {
        setBackupMsg("Couldn't read that file \u2014 make sure it's a Ledger backup JSON.");
        return;
      }
      const valid = validateBackup(data);
      if (!valid) return;
      // Hand off to an in-app confirm card instead of window.confirm(),
      // which sandboxed previews commonly block or auto-dismiss.
      setPendingImport(valid);
    };
    reader.onerror = () => setBackupMsg("Couldn't read that file.");
    reader.readAsText(file);
  };

  const confirmImport = () => {
    if (!pendingImport) return;
    const data = pendingImport;
    persistTrades(data.trades);
    if (typeof data.startingBalance === "string" || typeof data.startingBalance === "number") {
      persistStartingBalance(String(data.startingBalance));
    }
    if (Array.isArray(data.newsEvents)) {
      persistNews(data.newsEvents);
    }
    if (Array.isArray(data.customSetups)) {
      persistCustomSetups(data.customSetups.slice(0, MAX_CUSTOM_SETUPS));
    }
    if (Array.isArray(data.journalEntries)) {
      persistJournalEntries(data.journalEntries);
    }
    if (data.journalColWidths && typeof data.journalColWidths === "object") {
      const nextWidths = { ...DEFAULT_JOURNAL_COL_WIDTHS, ...data.journalColWidths };
      setJournalColWidths(nextWidths);
      persistJournalColWidths(nextWidths);
    }
    if (Array.isArray(data.playbookRules)) {
      persistPlaybookRules(data.playbookRules.slice(0, MAX_PLAYBOOK_RULES));
    }
    if (Array.isArray(data.playbookCheckins)) {
      persistPlaybookCheckins(data.playbookCheckins);
    }
    if (data.theme === "light" || data.theme === "dark") {
      setTheme(data.theme);
      window.storage.set(THEME_STORAGE_KEY, data.theme, false).catch(() => {});
    }
    setPendingImport(null);
    setBackupMsg("Backup restored.");
  };

  const cancelImport = () => {
    setPendingImport(null);
    setBackupMsg("");
  };

  let body = null;

  if (activeTab === "risk") {
    const RISK_SUB_TABS = [
      { id: "challenge", label: "Challenge" },
      { id: "edge", label: "Edge" },
      { id: "size", label: "Size" },
    ];

    const risk = Math.abs(num(edge.entry) - num(edge.stop));
    const reward = Math.abs(num(edge.target) - num(edge.entry));
    const ratio = risk > 0 ? reward / risk : 0;
    const rrBeWin = risk + reward > 0 ? (risk / (risk + reward)) * 100 : 0;

    const aw = num(edge.avgWin);
    const al = num(edge.avgLoss);
    const buf = num(edge.buffer);
    const dollarBe = aw + al > 0 ? (al / (aw + al)) * 100 : 0;
    const targetWinRate = Math.min(100, dollarBe + buf);
    const beWin = dollarBe || rrBeWin;

    const totalTrades = num(edge.totalTrades);
    const computedWinRate = aw + al > 0 ? (aw / (aw + al)) * 100 : 0;
    const hasExpectancyInputs = aw > 0 || al > 0;
    const expectancy = hasExpectancyInputs
      ? (computedWinRate / 100) * aw - (1 - computedWinRate / 100) * al
      : 0;
    const per100 = expectancy * 100;
    const hasTotalProjection = hasExpectancyInputs && edge.totalTrades !== "" && totalTrades > 0;
    const totalProjected = expectancy * totalTrades;

    const accountBal = num(edge.accountBalance);
    const hasBalance = accountBal > 0;
    const riskPct = hasBalance && al > 0 ? (al / accountBal) * 100 : 0;
    const rewardPct = hasBalance && aw > 0 ? (aw / accountBal) * 100 : 0;
    const expectancyPct = hasBalance && hasExpectancyInputs ? (expectancy / accountBal) * 100 : 0;
    const projectedBalance = accountBal + totalProjected;
    const projectedBalancePct = hasBalance && totalProjected ? (totalProjected / accountBal) * 100 : 0;

    const bal = num(ps.balance);
    const psRiskPct = num(ps.riskPct);
    const stopPips = num(ps.stopPips);
    const valPerPip = num(ps.valuePerPip);
    const riskAmt = bal * (psRiskPct / 100);
    const lots = stopPips > 0 && valPerPip > 0 ? riskAmt / (stopPips * valPerPip) : 0;

    const hasStart = cs.startBal !== "";
    const hasBoth = hasStart && cs.currentBal !== "";
    const hasTarget = cs.targetPct !== "instant";

    const startBal = num(cs.startBal);
    const currentBal = num(cs.currentBal);
    const targetPct = hasTarget ? num(cs.targetPct) : 0;
    const dailyLossPct = num(cs.dailyLossPct);
    const todayLoss = num(cs.todayLoss);
    const bestDay = num(cs.bestDay);
    const rule = num(cs.rule);
    const maxDrawdownPct = 4; // fixed trailing max drawdown

    const totalProfit = hasBoth ? currentBal - startBal : 0;
    const targetAmount = hasTarget ? startBal * (targetPct / 100) : 0;
    const progressPct = hasBoth && hasTarget && targetAmount > 0 ? (totalProfit / targetAmount) * 100 : 0;
    const remainingToTarget = hasTarget ? Math.max(0, targetAmount - totalProfit) : 0;

    const dailyLossAllowed = startBal * (dailyLossPct / 100);
    const dailyPass = hasStart ? todayLoss <= dailyLossAllowed : undefined;
    const dailyRemaining = Math.max(0, dailyLossAllowed - todayLoss);

    const peakBalance = hasBoth ? Math.max(startBal, currentBal) : startBal;
    const maxDrawdownAllowed = peakBalance * (maxDrawdownPct / 100);
    const floorBalance = peakBalance - maxDrawdownAllowed;
    const overallPass = hasBoth ? currentBal >= floorBalance : undefined;
    const overallRemaining = Math.max(0, currentBal - floorBalance);

    const consistencyScore = hasBoth && totalProfit > 0 ? (bestDay / totalProfit) * 100 : 0;
    const consistencyPass = hasBoth && totalProfit > 0 ? consistencyScore <= rule : undefined;
    const reqTotalForConsistency = rule > 0 ? bestDay / (rule / 100) : 0;
    const moreNeededForConsistency = Math.max(0, reqTotalForConsistency - totalProfit);

    const inDrawdown = hasBoth && currentBal < peakBalance;
    const currentDrawdownPct = inDrawdown && peakBalance > 0 ? ((peakBalance - currentBal) / peakBalance) * 100 : 0;
    const recoveryNeededPct = inDrawdown && currentDrawdownPct < 100 ? (currentDrawdownPct / (100 - currentDrawdownPct)) * 100 : 0;
    const recoveryDollar = inDrawdown ? peakBalance - currentBal : 0;

    body = (
      <>
        <div className="flex gap-2 mb-6">
          {RISK_SUB_TABS.map((s) => {
            const active = riskSubTab === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setRiskSubTab(s.id)}
                className={`flex-1 px-3 py-2 rounded-full transition-colors ${TAP}`}
                style={{
                  background: active ? palette.gold : palette.field,
                  color: active ? palette.letterbox : palette.textMuted,
                  border: `1px solid ${active ? palette.gold : palette.border}`,
                  fontFamily: mono,
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>

        {riskSubTab === "challenge" ? (
          <>
            <Readout
              eyebrow={!hasTarget ? (hasBoth && totalProfit < 0 ? "You Need More for Payout" : "Your Payout Amount") : "Profit Target Progress"}
              value={
                !hasTarget
                  ? hasBoth
                    ? `${totalProfit < 0 ? "-" : ""}$${fmt(Math.abs(totalProfit))}`
                    : "Instant"
                  : hasBoth
                  ? progressPct.toFixed(1)
                  : "0.0"
              }
              unit={!hasTarget ? undefined : "%"}
              sub={
                !hasTarget
                  ? hasBoth
                    ? totalProfit < 0
                      ? "Your balance is below your starting balance"
                      : "No profit target required for this challenge type"
                    : "Enter starting & current balance below"
                  : hasBoth
                  ? `$${fmt(totalProfit)} of $${fmt(targetAmount)} target ($${fmt(remainingToTarget)} to go)`
                  : "Enter starting & current balance below"
              }
              tone={
                !hasTarget
                  ? hasBoth
                    ? totalProfit < 0
                      ? "bad"
                      : "good"
                    : undefined
                  : !hasBoth
                  ? undefined
                  : progressPct >= 100
                  ? "good"
                  : totalProfit < 0
                  ? "bad"
                  : undefined
              }
            />

            <RuleRow
              label="Daily Drawdown"
              detail={
                dailyPass === undefined
                  ? "Enter starting balance below"
                  : dailyPass
                  ? `$${fmt(dailyRemaining)} of daily buffer left`
                  : `Over by $${fmt(todayLoss - dailyLossAllowed)}`
              }
              pass={dailyPass}
            />
            <RuleRow
              label="Max Drawdown"
              detail={
                overallPass === undefined
                  ? "Enter both balances below"
                  : overallPass
                  ? `$${fmt(overallRemaining)} of loss buffer left`
                  : `Below floor by $${fmt(floorBalance - currentBal)}`
              }
              pass={overallPass}
            />
            <RuleRow
              label="Consistency Rule"
              detail={
                consistencyPass === undefined
                  ? "Needs positive total profit"
                  : consistencyPass
                  ? `${consistencyScore.toFixed(1)}% within the ${rule}% rule`
                  : `Need $${fmt(moreNeededForConsistency)} more total profit`
              }
              pass={consistencyPass}
            />

            <span className="block mt-6 mb-1.5 uppercase" style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}>
              Recovery
            </span>
            {!hasBoth ? (
              <p className="text-xs mb-4" style={{ color: palette.textMuted }}>
                Enter starting & current balance below to see recovery stats.
              </p>
            ) : inDrawdown ? (
              <>
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <StatChip label="Current Drawdown" value={`${currentDrawdownPct.toFixed(1)}%`} />
                  <StatChip label="Gain to Recover" value={`+${recoveryNeededPct.toFixed(1)}%`} />
                </div>
                <p className="text-xs mb-4" style={{ color: palette.textMuted }}>
                  ${fmt(recoveryDollar)} below your peak balance of ${fmt(peakBalance)}
                </p>
              </>
            ) : (
              <p className="text-xs mb-4" style={{ color: palette.textMuted }}>
                At or above peak balance. No recovery needed.
              </p>
            )}

            <span className="block mt-2 mb-1.5 uppercase" style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}>
              Account
            </span>
            <Field label="Starting Balance" value={cs.startBal} suffix="$" placeholder="10000" onChange={(e) => setCs({ ...cs, startBal: e.target.value })} />
            <Field label="Current Balance" value={cs.currentBal} suffix="$" placeholder="10650" onChange={(e) => setCs({ ...cs, currentBal: e.target.value })} />

            <span className="block mb-1.5 uppercase" style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}>
              Profit Target
            </span>
            <div className="flex gap-2 flex-wrap mb-4">
              {PROFIT_TARGET_OPTIONS.map((opt) => {
                const active = String(cs.targetPct) === String(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setCs({ ...cs, targetPct: String(opt) })}
                    className={`px-3 py-1.5 rounded-full transition-colors ${TAP}`}
                    style={{
                      background: active ? palette.gold : palette.field,
                      color: active ? palette.letterbox : palette.textMuted,
                      border: `1px solid ${active ? palette.gold : palette.border}`,
                      fontFamily: mono,
                      fontSize: "13px",
                    }}
                  >
                    {opt}%
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setCs({ ...cs, targetPct: "instant" })}
                className={`px-3 py-1.5 rounded-full transition-colors ${TAP}`}
                style={{
                  background: !hasTarget ? palette.gold : palette.field,
                  color: !hasTarget ? palette.letterbox : palette.textMuted,
                  border: `1px solid ${!hasTarget ? palette.gold : palette.border}`,
                  fontFamily: mono,
                  fontSize: "13px",
                }}
              >
                Instant
              </button>
            </div>
            {!hasTarget && (
              <p className="text-xs -mt-2 mb-4" style={{ color: palette.textFaint }}>
                Instant challenges skip the profit target entirely.
              </p>
            )}

            <span className="block mb-1.5 uppercase" style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}>
              Daily Drawdown
            </span>
            <PillGroup options={[2, 3, 4, 5, 6]} value={cs.dailyLossPct} onChange={(v) => setCs({ ...cs, dailyLossPct: v })} />
            <Field label="Loss Today" value={cs.todayLoss} suffix="$" placeholder="0" onChange={(e) => setCs({ ...cs, todayLoss: e.target.value })} />

            <span className="block mb-1.5 uppercase" style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}>
              Max Drawdown
            </span>
            <p className="text-xs mb-4" style={{ color: palette.textMuted }}>
              Fixed at 4%, trailing off your peak balance (starting or current, whichever is higher).
            </p>

            <span className="block mb-1.5 uppercase" style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}>
              Consistency Rule
            </span>
            <PillGroup options={[0, 15, 20, 25, 30, 40]} value={cs.rule} onChange={(v) => setCs({ ...cs, rule: v })} />
            <Field label="Best Single Day Profit" value={cs.bestDay} suffix="$" placeholder="800" onChange={(e) => setCs({ ...cs, bestDay: e.target.value })} />

            <p className="text-xs mt-1" style={{ color: palette.textFaint }}>
              Limits shown are common presets, use your specific firm's rules for anything that matters.
            </p>
          </>
        ) : riskSubTab === "edge" ? (
          <>
            <Readout
              eyebrow="Expectancy per Trade"
              value={hasExpectancyInputs ? `${expectancy > 0 ? "+" : ""}${fmt(expectancy)}` : "N/A"}
              sub={
                hasExpectancyInputs
                  ? hasTotalProjection
                    ? hasBalance
                      ? `$${fmt(projectedBalance, 0)} projected balance after ${fmt(totalTrades, 0)} trades (${
                          projectedBalancePct >= 0 ? "+" : ""
                        }${fmt(projectedBalancePct, 1)}%)`
                      : `${totalProjected > 0 ? "+" : ""}$${fmt(Math.abs(totalProjected), 0)} projected over ${fmt(totalTrades, 0)} trades`
                    : hasBalance
                    ? `${expectancyPct >= 0 ? "+" : ""}${fmt(expectancyPct, 2)}% of balance per trade`
                    : `${per100 > 0 ? "+" : ""}${fmt(per100, 2)} projected per 100 trades`
                  : "Add account balance and average win/loss below"
              }
              tone={
                hasExpectancyInputs ? (expectancy > 0 ? "good" : expectancy < 0 ? "bad" : undefined) : undefined
              }
            />

            <div className={`grid grid-cols-2 gap-3 ${hasBalance ? "mb-3" : "mb-6"}`}>
              <StatChip label="R:R Ratio" value={`1 : ${ratio ? ratio.toFixed(2) : "0.00"}`} />
              <StatChip label="Breakeven Win %" value={beWin ? `${beWin.toFixed(1)}%` : "N/A"} />
            </div>
            {hasBalance && (
              <div className="grid grid-cols-2 gap-3 mb-6">
                <StatChip label="Risk % of Balance" value={riskPct ? `${riskPct.toFixed(2)}%` : "N/A"} />
                <StatChip label="Reward % of Balance" value={rewardPct ? `${rewardPct.toFixed(2)}%` : "N/A"} />
              </div>
            )}

            <span
              className="block mb-1.5 uppercase"
              style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
            >
              Trade Setup
            </span>
            <Field label="Account Balance" value={edge.accountBalance} suffix="$" placeholder="10000" onChange={(e) => setEdge({ ...edge, accountBalance: e.target.value })} />
            <Field label="Entry Price" value={edge.entry} placeholder="2415.20" onChange={(e) => setEdge({ ...edge, entry: e.target.value })} />
            <Field label="Stop Loss" value={edge.stop} placeholder="2410.00" onChange={(e) => setEdge({ ...edge, stop: e.target.value })} />
            <Field label="Take Profit" value={edge.target} placeholder="2426.80" onChange={(e) => setEdge({ ...edge, target: e.target.value })} />
            <p className="text-xs -mt-2 mb-4" style={{ color: palette.textFaint }}>
              Risk {fmt(risk)} pts, Reward {fmt(reward)} pts
            </p>

            <span
              className="block mb-1.5 uppercase"
              style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
            >
              Win / Loss Profile
            </span>
            <Field label="Average Win" value={edge.avgWin} suffix="$" placeholder="150" onChange={(e) => setEdge({ ...edge, avgWin: e.target.value })} />
            <Field label="Average Loss" value={edge.avgLoss} suffix="$" placeholder="75" onChange={(e) => setEdge({ ...edge, avgLoss: e.target.value })} />
            {hasBalance && (
              <p className="text-xs -mt-2 mb-4" style={{ color: palette.textFaint }}>
                Avg win {rewardPct.toFixed(2)}%, Avg loss {riskPct.toFixed(2)}% of balance
              </p>
            )}
            <Field label="Total Trades" value={edge.totalTrades} placeholder="100" onChange={(e) => setEdge({ ...edge, totalTrades: e.target.value })} />
            <Field
              label="Win Rate"
              value={computedWinRate ? fmt(computedWinRate, 1) : "0"}
              suffix="%"
              readOnly
              onChange={() => {}}
            />
            <Field label="Safety Buffer" value={edge.buffer} suffix="%" onChange={(e) => setEdge({ ...edge, buffer: e.target.value })} />
            <p className="text-xs -mt-2 mb-4" style={{ color: palette.textFaint }}>
              Target win rate with buffer: {targetWinRate.toFixed(1)}%
            </p>
          </>
        ) : (
          <>
            <Readout
              eyebrow="Position Size"
              value={fmt(lots)}
              unit="lots"
              sub={`Risking $${fmt(riskAmt)} (${psRiskPct || 0}% of account)`}
            />
            <span className="block mb-1.5 uppercase" style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}>
              Instrument
            </span>
            <div className="flex gap-2 mb-4">
              {[
                { id: "forex", label: "Forex" },
                { id: "gold", label: "Gold" },
                { id: "custom", label: "Custom" },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p.id)}
                  className={`px-3 py-1.5 rounded-full transition-colors ${TAP}`}
                  style={{
                    background: ps.preset === p.id ? palette.gold : palette.field,
                    color: ps.preset === p.id ? palette.letterbox : palette.textMuted,
                    border: `1px solid ${ps.preset === p.id ? palette.gold : palette.border}`,
                    fontFamily: mono,
                    fontSize: "13px",
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <Field label="Account Balance" value={ps.balance} suffix="$" placeholder="5000" onChange={(e) => setPs({ ...ps, balance: e.target.value })} />
            <Field label="Risk per Trade" value={ps.riskPct} suffix="%" placeholder="1" onChange={(e) => setPs({ ...ps, riskPct: e.target.value })} />
            <Field label="Stop Distance" value={ps.stopPips} suffix="pips" placeholder="25" onChange={(e) => setPs({ ...ps, stopPips: e.target.value })} />
            <Field label="Value per Pip (1.0 lot)" value={ps.valuePerPip} suffix="$" onChange={(e) => setPs({ ...ps, preset: "custom", valuePerPip: e.target.value })} />
            <p className="text-xs mt-1" style={{ color: palette.textFaint }}>
              Pip values are typical defaults, confirm your broker's contract specs before sizing real trades.
            </p>
          </>
        )}
      </>
    );
  }

  if (activeTab === "fx") {
    const amount = num(fx.amount);
    const ratesSource = liveFxRates || FX_RATES_PER_USD;
    const perUsdFrom = ratesSource[fx.from] ?? FX_RATES_PER_USD[fx.from] ?? 1;
    const perUsdTo = ratesSource[fx.to] ?? FX_RATES_PER_USD[fx.to] ?? 1;
    const builtInRate = perUsdFrom > 0 ? perUsdTo / perUsdFrom : 0;
    const customRateNum = num(fx.customRate);
    const usingCustomRate = fx.customRate !== "" && customRateNum > 0;
    const effectiveRate = usingCustomRate ? customRateNum : builtInRate;
    const converted = amount * effectiveRate;
    const inverseRate = effectiveRate > 0 ? 1 / effectiveRate : 0;
    const sameCurrency = fx.from === fx.to;

    const swap = () => setFx({ ...fx, from: fx.to, to: fx.from, customRate: "" });

    body = (
      <>
        <Readout
          eyebrow={`${fx.from} \u2192 ${fx.to}`}
          value={sameCurrency ? fmtThousands(amount) : fmtThousands(converted)}
          unit={fx.to}
          sub={
            sameCurrency
              ? "Same currency on both sides"
              : `1 ${fx.from} = ${fmt(effectiveRate, 4)} ${fx.to}, 1 ${fx.to} = ${fmt(inverseRate, 4)} ${fx.from}`
          }
        />

        <Field
          label="Amount"
          value={fx.amount}
          suffix={fx.from}
          placeholder="100"
          onChange={(e) => setFx({ ...fx, amount: e.target.value })}
        />

        <div className="flex items-end gap-2 mb-1">
          <CurrencySelect label="From" value={fx.from} onChange={(e) => setFx({ ...fx, from: e.target.value, customRate: "" })} />
          <button
            type="button"
            onClick={swap}
            className={`flex items-center justify-center rounded-lg flex-shrink-0 mb-4 ${TAP}`}
            style={{
              width: "44px",
              height: "48px",
              background: palette.field,
              border: `1px solid ${palette.border}`,
              color: palette.gold,
            }}
            aria-label="Swap currencies"
          >
            <ArrowLeftRight size={16} />
          </button>
          <CurrencySelect label="To" value={fx.to} onChange={(e) => setFx({ ...fx, to: e.target.value, customRate: "" })} />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <StatChip
            label="Rate used"
            value={
              usingCustomRate
                ? "Custom"
                : fxRatesStatus === "live"
                ? "Live"
                : fxRatesStatus === "loading"
                ? "Loading\u2026"
                : `${FX_SNAPSHOT_LABEL} (offline)`
            }
          />
          <StatChip label={`${fx.to} per ${fx.from}`} value={fmt(effectiveRate, 4)} />
        </div>

        <div className="flex items-center justify-between mb-1.5">
          <span
            className="uppercase"
            style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
          >
            Rate Override
          </span>
          {usingCustomRate && (
            <button
              type="button"
              onClick={() => setFx({ ...fx, customRate: "" })}
              className={`flex items-center gap-1 ${TAP}`}
              style={{ color: palette.textFaint, fontSize: "11px", fontFamily: mono }}
            >
              <RotateCcw size={11} />
              Reset
            </button>
          )}
        </div>
        <Field
          label={`1 ${fx.from} =`}
          value={fx.customRate}
          suffix={fx.to}
          placeholder={fmt(builtInRate, 4)}
          onChange={(e) => setFx({ ...fx, customRate: e.target.value })}
        />
        <p className="text-xs -mt-2 mb-4" style={{ color: palette.textFaint }}>
          {fxRatesStatus === "live"
            ? `Live daily rates${fxRatesDate ? ` as of ${fxRatesDate}` : ""}. Updated once a day, not intraday.`
            : fxRatesStatus === "loading"
            ? "Fetching today's live rates\u2026"
            : `Couldn't reach the live rate feed, showing the ${FX_SNAPSHOT_LABEL} fallback snapshot instead.`}{" "}
          For anything that matters, check your bank or exchange's current rate and paste it above to convert
          precisely.
        </p>
      </>
    );
  }

  if (activeTab === "curve") {
    const startBal = num(startingBalance);
    const wins = trades.filter((t) => t.pnl > 0);
    const losses = trades.filter((t) => t.pnl < 0);
    const netPnl = trades.reduce((s, t) => s + t.pnl, 0);
    const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;
    const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length) : 0;

    let running = startBal;
    let peak = startBal;
    let maxDrawdown = 0;
    const chartData = [{ trade: 0, equity: startBal }];
    trades.forEach((t, i) => {
      running += t.pnl;
      peak = Math.max(peak, running);
      maxDrawdown = Math.max(maxDrawdown, peak - running);
      chartData.push({ trade: i + 1, equity: running });
    });

    let bestStreak = 0;
    let worstStreak = 0;
    let curStreak = 0;
    trades.forEach((t) => {
      if (t.pnl > 0) {
        curStreak = curStreak > 0 ? curStreak + 1 : 1;
      } else if (t.pnl < 0) {
        curStreak = curStreak < 0 ? curStreak - 1 : -1;
      } else {
        curStreak = 0;
      }
      bestStreak = Math.max(bestStreak, curStreak);
      worstStreak = Math.min(worstStreak, curStreak);
    });

    const domainPad = Math.max(10, Math.abs(peak - (running - maxDrawdown)) * 0.1) || 10;

    // Revenge trading + discipline streak, both computed from the same
    // shared helpers used by the weekly recap above.
    const revengeIds = computeRevengeIds(trades);
    const { current: disciplineCurrent, best: disciplineBest, hasData: disciplineHasData } =
      computeDisciplineStreak(trades);

    const tradesByDay = {};
    trades.forEach((t) => {
      const k = dayKeyFromTs(t.ts);
      if (!tradesByDay[k]) tradesByDay[k] = { total: 0, trades: [] };
      tradesByDay[k].total += t.pnl;
      tradesByDay[k].trades.push(t);
    });

    const viewYear = calMonth.getFullYear();
    const viewMonthIdx = calMonth.getMonth();
    const firstWeekday = new Date(viewYear, viewMonthIdx, 1).getDay();
    const totalDaysInMonth = new Date(viewYear, viewMonthIdx + 1, 0).getDate();
    const monthCells = [];
    for (let i = 0; i < firstWeekday; i++) monthCells.push(null);
    for (let d = 1; d <= totalDaysInMonth; d++) monthCells.push(d);
    while (monthCells.length % 7 !== 0) monthCells.push(null);

    const monthPrefix = `${viewYear}-${pad2(viewMonthIdx + 1)}`;
    const monthTotal = Object.keys(tradesByDay).reduce(
      (sum, k) => (k.startsWith(monthPrefix) ? sum + tradesByDay[k].total : sum),
      0
    );
    const monthTradeCount = Object.keys(tradesByDay).reduce(
      (sum, k) => (k.startsWith(monthPrefix) ? sum + tradesByDay[k].trades.length : sum),
      0
    );

    const todayKey = dayKeyFromDate(new Date());
    const selectedInfo = selectedDay ? tradesByDay[selectedDay] : null;

    const goPrevMonth = () => {
      setCalMonth(new Date(viewYear, viewMonthIdx - 1, 1));
      setSelectedDay(null);
    };
    const goNextMonth = () => {
      setCalMonth(new Date(viewYear, viewMonthIdx + 1, 1));
      setSelectedDay(null);
    };

    body = (
      <>
        <Readout
          eyebrow="Equity"
          value={`${netPnl >= 0 ? "+" : "-"}$${fmtMoney(netPnl)}`}
          sub={
            trades.length > 0
              ? `${trades.length} trade${trades.length === 1 ? "" : "s"} logged, ${winRate.toFixed(1)}% win rate`
              : "Log your first trade below to start the curve"
          }
          tone={netPnl > 0 ? "good" : netPnl < 0 ? "bad" : undefined}
        />

        {trades.length > 0 && (
          <div
            className="rounded-2xl p-4 mb-6"
            style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow, transition: THEME_TRANSITION }}
          >
            <div style={{ width: "100%", height: 180 }}>
              <ResponsiveContainer>
                <LineChart data={chartData} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke={palette.border} strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="trade"
                    stroke={palette.textFaint}
                    tick={{ fill: palette.textFaint, fontSize: 10, fontFamily: mono }}
                    tickLine={false}
                    axisLine={{ stroke: palette.border }}
                  />
                  <YAxis
                    stroke={palette.textFaint}
                    tick={{ fill: palette.textFaint, fontSize: 10, fontFamily: mono }}
                    tickLine={false}
                    axisLine={{ stroke: palette.border }}
                    width={54}
                    domain={[
                      (dataMin) => Math.floor(dataMin - domainPad),
                      (dataMax) => Math.ceil(dataMax + domainPad),
                    ]}
                  />
                  <ReferenceLine y={startBal} stroke={palette.textFaint} strokeDasharray="4 4" />
                  <Tooltip
                    contentStyle={{
                      background: palette.field,
                      border: `1px solid ${palette.border}`,
                      borderRadius: "8px",
                      fontFamily: mono,
                      fontSize: "12px",
                    }}
                    labelStyle={{ color: palette.textMuted }}
                    itemStyle={{ color: palette.goldBright }}
                    formatter={(v) => [`$${fmt(v)}`, "Equity"]}
                    labelFormatter={(l) => `Trade ${l}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="equity"
                    stroke={netPnl >= 0 ? palette.green : palette.red}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="mb-4">
          <div className="grid grid-cols-2 gap-3 mb-2">
            <StatChip label="Win Rate" value={trades.length ? `${winRate.toFixed(1)}%` : "N/A"} />
            <StatChip label="Avg Win / Loss" value={trades.length ? `$${fmt(avgWin, 0)} / $${fmt(avgLoss, 0)}` : "N/A"} />
            <StatChip label="Max Drawdown" value={trades.length ? `$${fmt(maxDrawdown, 0)}` : "N/A"} />
            <StatChip
              label="Best / Worst Streak"
              value={trades.length ? `+${bestStreak} / ${worstStreak}` : "N/A"}
              onClick={() => setShowStreakInfo((v) => !v)}
            />
          </div>
          {showStreakInfo && (
            <p className="text-xs mt-2" style={{ color: palette.textFaint }}>
              Streaks count consecutive wins (positive) or losses (negative).
            </p>
          )}
        </div>

        <div className="mb-4">
          <div className="grid grid-cols-2 gap-3 mb-2">
            <StatChip
              label="Discipline Streak"
              value={disciplineHasData ? `${disciplineCurrent} day${disciplineCurrent === 1 ? "" : "s"}` : "N/A"}
              onClick={() => setShowDisciplineInfo((v) => !v)}
            />
            <StatChip
              label="Best Discipline Streak"
              value={disciplineHasData ? `${disciplineBest} day${disciplineBest === 1 ? "" : "s"}` : "N/A"}
            />
          </div>
          {showDisciplineInfo && (
            <p className="text-xs mt-2" style={{ color: palette.textFaint }}>
              Consecutive trading days with no revenge trade (opened within {REVENGE_WINDOW_MINUTES} minutes of a
              loss) tracks behavior, not P&amp;L.
            </p>
          )}
        </div>

        <div className="flex gap-2 mb-2">
          <button
            type="button"
            onClick={generateWeeklyShare}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-3 ${TAP}`}
            style={{
              background: palette.gold,
              border: `1px solid ${palette.gold}`,
              color: palette.letterbox,
              fontFamily: mono,
              fontSize: "13px",
              fontWeight: 600,
              boxShadow: palette.shadow,
              transition: `${THEME_TRANSITION}, transform 0.15s ease`,
            }}
          >
            <Share2 size={16} />
            Share My Week
          </button>
          <button
            type="button"
            onClick={copyWeekSummary}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-3 ${TAP}`}
            style={{
              background: palette.field,
              border: `1px solid ${palette.border}`,
              color: palette.text,
              fontFamily: mono,
              fontSize: "13px",
              fontWeight: 600,
              transition: `${THEME_TRANSITION}, transform 0.15s ease`,
            }}
          >
            <Copy size={16} />
            Copy Summary
          </button>
        </div>
        {shareError && (
          <p className="text-xs mb-2" style={{ color: palette.textFaint }}>
            {shareError}
          </p>
        )}
        {copyMsg && (
          <p className="text-xs mb-2" style={{ color: palette.textFaint }}>
            {copyMsg}
          </p>
        )}
        {copyFallbackText && (
          <div
            className="rounded-lg p-3 mb-2"
            style={{ background: palette.field, border: `1px solid ${palette.border}` }}
          >
            <textarea
              readOnly
              value={copyFallbackText}
              onFocus={(e) => e.target.select()}
              className="w-full bg-transparent outline-none"
              style={{ color: palette.text, fontFamily: mono, fontSize: "12px", height: "132px", resize: "none" }}
            />
            <button
              type="button"
              onClick={() => setCopyFallbackText("")}
              className={`mt-2 ${TAP}`}
              style={{ color: palette.textFaint, fontSize: "11px", fontFamily: mono }}
            >
              Dismiss
            </button>
          </div>
        )}
        {!shareError && !copyMsg && !copyFallbackText && <div className="mb-6" />}
        {(shareError || copyMsg) && !copyFallbackText && <div className="mb-4" />}

        <div
          className="rounded-2xl p-4 mb-6"
          style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow, transition: THEME_TRANSITION }}
        >
          <span
            className="block mb-1.5 uppercase"
            style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
          >
            Backup &amp; Restore
          </span>
          <p className="text-xs mb-3" style={{ color: palette.textFaint }}>
            Your data only lives in this browser. Export a backup file occasionally, or right before switching
            phones.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={exportBackup}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 ${TAP}`}
              style={{
                background: palette.field,
                border: `1px solid ${palette.border}`,
                color: palette.text,
                fontFamily: mono,
                fontSize: "13px",
                transition: `${THEME_TRANSITION}, transform 0.15s ease`,
              }}
            >
              <Download size={15} />
              Export
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 ${TAP}`}
              style={{
                background: palette.field,
                border: `1px solid ${palette.border}`,
                color: palette.text,
                fontFamily: mono,
                fontSize: "13px",
                transition: `${THEME_TRANSITION}, transform 0.15s ease`,
              }}
            >
              <Upload size={15} />
              Import
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={importBackup}
              style={{ display: "none" }}
            />
          </div>
          {backupMsg && (
            <p className="text-xs mt-2" style={{ color: palette.textFaint }}>
              {backupMsg}
            </p>
          )}
          {pendingImport && (
            <div
              className="rounded-lg p-3 mt-3"
              style={{ background: palette.field, border: `1px solid ${palette.gold}` }}
            >
              <p className="text-xs mb-3" style={{ color: palette.text }}>
                This will replace your current trades, starting balance, news events, custom setups, journal
                entries, playbook rules, and theme on this device with the backup file (
                {pendingImport.trades.length} trade{pendingImport.trades.length === 1 ? "" : "s"}). This can't be
                undone.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={confirmImport}
                  className={`flex-1 rounded-lg py-2 ${TAP}`}
                  style={{ background: palette.gold, color: palette.letterbox, fontFamily: mono, fontSize: "13px" }}
                >
                  Replace Data
                </button>
                <button
                  type="button"
                  onClick={cancelImport}
                  className={`flex-1 rounded-lg py-2 ${TAP}`}
                  style={{
                    background: "transparent",
                    border: `1px solid ${palette.border}`,
                    color: palette.textMuted,
                    fontFamily: mono,
                    fontSize: "13px",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <Field
          label="Starting Balance"
          value={startingBalance}
          suffix="$"
          placeholder="10000"
          onChange={(e) => persistStartingBalance(e.target.value)}
        />

        <div ref={logFormRef} className="flex items-center justify-between mb-1.5">
          <span
            className="uppercase"
            style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
          >
            {editingTradeId ? "Edit Trade" : "Log a Trade"}
          </span>
          {editingTradeId && (
            <button
              type="button"
              onClick={cancelEditTrade}
              className={TAP}
              style={{ color: palette.textFaint, fontSize: "11px", fontFamily: mono }}
            >
              Cancel
            </button>
          )}
        </div>
        {editingTradeId && (
          <p className="text-xs -mt-1 mb-2" style={{ color: palette.gold }}>
            Editing a logged trade.
          </p>
        )}
        <div className="flex gap-2 mb-2">
          <div
            className="flex items-center rounded-lg px-3 flex-1"
            style={{
              background: palette.field,
              border: `1px solid ${editingTradeId ? palette.gold : palette.border}`,
            }}
          >
            <span className="text-sm pr-1" style={{ color: palette.textFaint }}>
              $
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={tradeInput}
              onChange={(e) => setTradeInput(e.target.value)}
              placeholder="+120 or -60"
              className="w-full bg-transparent py-3 outline-none"
              style={{ color: palette.text, fontFamily: mono, fontSize: "16px" }}
            />
          </div>
          <button
            type="button"
            onClick={submitTrade}
            className={`flex items-center justify-center rounded-lg flex-shrink-0 ${TAP}`}
            style={{
              width: "46px",
              background: palette.gold,
              color: palette.letterbox,
            }}
            aria-label={editingTradeId ? "Save changes" : "Add trade"}
          >
            {editingTradeId ? <Check size={20} strokeWidth={2.4} /> : <Plus size={20} strokeWidth={2.4} />}
          </button>
        </div>
        <input
          type="text"
          value={tradeNote}
          onChange={(e) => setTradeNote(e.target.value)}
          placeholder="Note (optional)"
          className="w-full rounded-lg px-3 py-2.5 mb-2 bg-transparent outline-none"
          style={{
            background: palette.field,
            border: `1px solid ${palette.border}`,
            color: palette.textMuted,
            fontSize: "13px",
          }}
        />

        <div className="flex gap-2 flex-wrap mb-2">
          {NOTE_TAGS.map((tag) => {
            const active = tradeNote === tag;
            return (
              <button
                key={tag}
                type="button"
                onClick={() => setTradeNote(active ? "" : tag)}
                className={`px-3 py-1.5 rounded-full transition-colors ${TAP}`}
                style={{
                  background: active ? palette.field : "transparent",
                  color: active ? palette.text : palette.textFaint,
                  border: `1px dashed ${active ? palette.textMuted : palette.border}`,
                  fontSize: "12px",
                }}
              >
                {tag}
              </button>
            );
          })}
        </div>

        <span
          className="block mb-1.5 uppercase"
          style={{ color: palette.textFaint, letterSpacing: "0.08em", fontSize: "10px" }}
        >
          Setup
        </span>
        <div className="flex gap-2 flex-wrap mb-2 items-center">
          {SETUPS.map((s) => {
            const active = tradeSetup === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setTradeSetup(active ? null : s.id)}
                className={`px-3 py-1.5 rounded-full transition-colors ${TAP}`}
                style={{
                  background: active ? palette.gold : palette.field,
                  color: active ? palette.letterbox : palette.textMuted,
                  border: `1px solid ${active ? palette.gold : palette.border}`,
                  fontSize: "13px",
                }}
              >
                {s.label}
              </button>
            );
          })}
          {customSetupsLoaded &&
            customSetups.map((s) => {
              const active = tradeSetup === s.id;
              return (
                <span key={s.id} className="relative inline-flex">
                  <button
                    type="button"
                    onClick={() => setTradeSetup(active ? null : s.id)}
                    className={`px-3 py-1.5 rounded-full transition-colors ${TAP}`}
                    style={{
                      background: active ? palette.gold : palette.field,
                      color: active ? palette.letterbox : palette.textMuted,
                      border: `1px dashed ${active ? palette.gold : palette.border}`,
                      fontSize: "13px",
                    }}
                  >
                    {s.label}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeCustomSetup(s.id);
                    }}
                    className={`absolute flex items-center justify-center rounded-full ${TAP}`}
                    style={{
                      top: "-5px",
                      right: "-5px",
                      width: "15px",
                      height: "15px",
                      background: palette.red,
                      color: "#FFFFFF",
                    }}
                    aria-label={`Remove ${s.label} setup`}
                  >
                    <X size={9} />
                  </button>
                </span>
              );
            })}
          {customSetupsLoaded && customSetups.length < MAX_CUSTOM_SETUPS && !addingSetup && (
            <button
              type="button"
              onClick={openAddSetup}
              className={`flex items-center justify-center rounded-full flex-shrink-0 ${TAP}`}
              style={{
                width: "30px",
                height: "30px",
                background: "transparent",
                border: `1px dashed ${palette.border}`,
                color: palette.textFaint,
              }}
              aria-label="Add custom setup"
              title="Add your own setup tag"
            >
              <Plus size={14} />
            </button>
          )}
        </div>

        {addingSetup && (
          <div className="flex items-center gap-2 mb-1">
            <input
              type="text"
              value={newSetupName}
              onChange={(e) => {
                setNewSetupName(e.target.value);
                if (setupError) setSetupError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  confirmAddSetup();
                } else if (e.key === "Escape") {
                  cancelAddSetup();
                }
              }}
              placeholder="New setup name"
              autoFocus
              maxLength={20}
              className="flex-1 rounded-lg px-3 py-2 bg-transparent outline-none"
              style={{
                background: palette.field,
                border: `1px solid ${palette.border}`,
                color: palette.text,
                fontFamily: mono,
                fontSize: "13px",
              }}
            />
            <button
              type="button"
              onClick={confirmAddSetup}
              className={`rounded-lg px-3 py-2 flex-shrink-0 ${TAP}`}
              style={{ background: palette.gold, color: palette.letterbox, fontFamily: mono, fontSize: "13px", fontWeight: 600 }}
            >
              Add
            </button>
            <button
              type="button"
              onClick={cancelAddSetup}
              className={`flex items-center justify-center rounded-lg flex-shrink-0 ${TAP}`}
              style={{ width: "34px", height: "34px", background: "transparent", border: `1px solid ${palette.border}`, color: palette.textFaint }}
              aria-label="Cancel adding setup"
            >
              <X size={14} />
            </button>
          </div>
        )}
        {setupError && (
          <p className="text-xs mb-2" style={{ color: palette.red }}>
            {setupError}
          </p>
        )}

        <span
          className="block mb-1.5 uppercase"
          style={{ color: palette.textFaint, letterSpacing: "0.08em", fontSize: "10px" }}
        >
          Mood
        </span>
        <div className="flex gap-2 flex-wrap mb-2">
          {EMOTIONS.map((e) => {
            const active = tradeEmotion === e.id;
            return (
              <button
                key={e.id}
                type="button"
                onClick={() => setTradeEmotion(active ? null : e.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors ${TAP}`}
                style={{
                  background: active ? palette.gold : palette.field,
                  color: active ? palette.letterbox : palette.textMuted,
                  border: `1px solid ${active ? palette.gold : palette.border}`,
                  fontSize: "13px",
                }}
              >
                <span>{e.emoji}</span>
                {e.label}
              </button>
            );
          })}
        </div>
        <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
          Enter net P&amp;L for the trade. Positive logs a win, negative logs a loss. The dashed chips quick-fill
          the note; Setup tags what kind of trade it was (tap the + to add up to {MAX_CUSTOM_SETUPS} of your own);
          Mood tags how you felt. Tap the pencil on any logged trade below to edit it in place. Tags and a
          "revenge" flag (opened within {REVENGE_WINDOW_MINUTES} minutes of a loss) show up per trade in the
          calendar below.
        </p>

        {tradesLoadError && (
          <p className="text-xs mb-4" style={{ color: palette.red }}>
            {tradesLoadError}
          </p>
        )}
        {screenshotError && (
          <p className="text-xs mb-4" style={{ color: palette.red }}>
            {screenshotError}
          </p>
        )}

        {!tradesLoaded ? (
          <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
            Loading saved trades\u2026
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between mb-1.5">
              <span
                className="uppercase"
                style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
              >
                Calendar
              </span>
              {trades.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    clearTrades();
                    setSelectedDay(null);
                  }}
                  className={TAP}
                  style={{ color: palette.textFaint, fontSize: "11px", fontFamily: mono }}
                >
                  Clear all
                </button>
              )}
            </div>

            <div
              className="rounded-2xl p-4 mb-4"
              style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow, transition: THEME_TRANSITION }}
            >
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  onClick={goPrevMonth}
                  aria-label="Previous month"
                  className={TAP}
                  style={{ color: palette.textMuted, padding: "2px" }}
                >
                  <ChevronLeft size={18} />
                </button>
                <div style={{ fontFamily: mono, fontSize: "13px", color: palette.text, letterSpacing: "0.04em" }}>
                  {MONTH_NAMES[viewMonthIdx]} {viewYear}
                </div>
                <button
                  type="button"
                  onClick={goNextMonth}
                  aria-label="Next month"
                  className={TAP}
                  style={{ color: palette.textMuted, padding: "2px" }}
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-1.5">
                {WEEKDAY_LABELS.map((w, i) => (
                  <div
                    key={i}
                    className="text-center"
                    style={{ fontSize: "10px", color: palette.textFaint, fontFamily: mono }}
                  >
                    {w}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {monthCells.map((d, i) => {
                  if (d === null) return <div key={i} />;
                  const key = `${monthPrefix}-${pad2(d)}`;
                  const info = tradesByDay[key];
                  const hasTrades = !!info;
                  const isToday = key === todayKey;
                  const isSelected = key === selectedDay;
                  const posDay = hasTrades && info.total >= 0;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => hasTrades && setSelectedDay(isSelected ? null : key)}
                      className={`flex flex-col items-center justify-center rounded-lg ${hasTrades ? TAP : ""}`}
                      style={{
                        aspectRatio: "1",
                        background: hasTrades
                          ? posDay
                            ? `${palette.green}26`
                            : `${palette.red}26`
                          : "transparent",
                        border: `1px solid ${
                          isSelected ? palette.gold : isToday ? palette.textMuted : "transparent"
                        }`,
                        cursor: hasTrades ? "pointer" : "default",
                        transition: THEME_TRANSITION,
                      }}
                    >
                      <span
                        style={{
                          fontSize: "11px",
                          color: hasTrades ? palette.text : palette.textFaint,
                          fontFamily: mono,
                        }}
                      >
                        {d}
                      </span>
                      {hasTrades && (
                        <span
                          style={{
                            fontSize: "9px",
                            color: posDay ? palette.green : palette.red,
                            fontFamily: mono,
                          }}
                        >
                          {posDay ? "+" : "-"}
                          {fmtMoney(info.total)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <StatChip
                label={`${MONTH_NAMES[viewMonthIdx]} Total`}
                value={`${monthTotal >= 0 ? "+" : "-"}$${fmtMoney(monthTotal)}`}
              />
              <StatChip label={`${MONTH_NAMES[viewMonthIdx]} Trades`} value={String(monthTradeCount)} />
            </div>

            {selectedInfo && (
              <>
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className="uppercase"
                    style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
                  >
                    {formatDayLabel(selectedDay)}
                  </span>
                  <span
                    style={{
                      fontFamily: mono,
                      fontSize: "12px",
                      color: selectedInfo.total >= 0 ? palette.green : palette.red,
                    }}
                  >
                    {selectedInfo.total >= 0 ? "+" : "-"}${fmtMoney(selectedInfo.total)}
                  </span>
                </div>
                {selectedInfo.trades.map((t) => {
                  const isExpanded = expandedTradeId === t.id;
                  const isBeingEdited = editingTradeId === t.id;
                  const shots = tradeScreenshots(t);
                  const savingThisTrade = screenshotSaving && screenshotTargetId === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => setExpandedTradeId(isExpanded ? null : t.id)}
                      className="rounded-lg px-3 py-2.5 mb-2"
                      style={{
                        background: palette.surface,
                        border: `1px solid ${isBeingEdited ? palette.gold : palette.border}`,
                        boxShadow: palette.shadow,
                        cursor: "pointer",
                        transition: THEME_TRANSITION,
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              style={{
                                fontFamily: mono,
                                fontSize: "14px",
                                color: t.pnl >= 0 ? palette.green : palette.red,
                              }}
                            >
                              {t.pnl >= 0 ? "+" : "-"}${fmtMoney(t.pnl)}
                            </span>
                            {t.emotion && emotionMeta(t.emotion) && (
                              <span style={{ fontSize: "13px" }}>{emotionMeta(t.emotion).emoji}</span>
                            )}
                            {t.setup && (
                              <span
                                style={{
                                  fontSize: "10px",
                                  fontFamily: mono,
                                  color: palette.textMuted,
                                  border: `1px solid ${palette.border}`,
                                  borderRadius: "999px",
                                  padding: "1px 6px",
                                }}
                              >
                                {findSetupLabel(t.setup)}
                              </span>
                            )}
                            {revengeIds.has(t.id) && (
                              <span
                                style={{
                                  fontSize: "10px",
                                  fontFamily: mono,
                                  color: palette.red,
                                  border: `1px solid ${palette.red}`,
                                  borderRadius: "999px",
                                  padding: "1px 6px",
                                }}
                              >
                                revenge
                              </span>
                            )}
                            {isBeingEdited && (
                              <span
                                style={{
                                  fontSize: "10px",
                                  fontFamily: mono,
                                  color: palette.gold,
                                  border: `1px solid ${palette.gold}`,
                                  borderRadius: "999px",
                                  padding: "1px 6px",
                                }}
                              >
                                editing
                              </span>
                            )}
                            {shots.length > 0 && (
                              <span className="flex items-center gap-0.5">
                                <Camera size={11} style={{ color: palette.textFaint }} aria-label="Has screenshot" />
                                {shots.length > 1 && (
                                  <span style={{ fontSize: "9px", color: palette.textFaint, fontFamily: mono }}>
                                  </span>
                                )}
                              </span>
                            )}
                            {savingThisTrade && (
                              <span style={{ fontSize: "10px", color: palette.textFaint, fontFamily: mono }}>
                                saving\u2026
                              </span>
                            )}
                          </div>
                          {t.note && (
                            <div style={{ color: palette.textMuted, fontSize: "12px" }}>{t.note}</div>
                          )}
                        </div>
                        <div className="flex items-center flex-shrink-0" style={{ marginLeft: "8px", gap: "10px" }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditTrade(t);
                            }}
                            className={TAP}
                            style={{ color: palette.textFaint }}
                            aria-label="Edit trade"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteTrade(t.id);
                            }}
                            className={TAP}
                            style={{ color: palette.textFaint }}
                            aria-label="Delete trade"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-2 flex gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                          {shots.map((src, idx) => (
                            <div key={idx} className="relative inline-block">
                              <img
                                src={src}
                                alt={`Trade screenshot ${idx + 1}`}
                                onClick={() => setViewingScreenshot({ src, trade: t })}
                                className={`rounded-lg ${TAP}`}
                                style={{
                                  width: "96px",
                                  height: "96px",
                                  objectFit: "cover",
                                  border: `1px solid ${palette.border}`,
                                  cursor: "pointer",
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => setPendingScreenshotDelete({ tradeId: t.id, index: idx })}
                                className={`absolute flex items-center justify-center rounded-full ${TAP}`}
                                style={{
                                  top: "-6px",
                                  right: "-6px",
                                  width: "18px",
                                  height: "18px",
                                  background: palette.red,
                                  color: "#FFFFFF",
                                }}
                                aria-label="Remove screenshot"
                              >
                                <X size={11} />
                              </button>
                              <button
                                type="button"
                                onClick={() => shareImageFile(src, t)}
                                className={`absolute flex items-center justify-center rounded-full ${TAP}`}
                                style={{
                                  bottom: "-6px",
                                  right: "-6px",
                                  width: "22px",
                                  height: "22px",
                                  background: palette.gold,
                                  color: palette.letterbox,
                                  border: `2px solid ${palette.surface}`,
                                }}
                                aria-label="Share screenshot"
                              >
                                <Share2 size={11} />
                              </button>
                            </div>
                          ))}
                          {shots.length < SCREENSHOT_MAX_PER_TRADE && (
                            <button
                              type="button"
                              onClick={() => openScreenshotPicker(t.id)}
                              disabled={savingThisTrade}
                              className={`flex flex-col items-center justify-center gap-1 rounded-lg ${TAP}`}
                              style={{
                                width: "96px",
                                height: "96px",
                                background: "transparent",
                                border: `1px dashed ${palette.border}`,
                                color: palette.textFaint,
                                opacity: savingThisTrade ? 0.5 : 1,
                              }}
                            >
                              <Camera size={16} />
                              <span style={{ fontSize: "10px", fontFamily: mono }}>
                                {savingThisTrade
                                  ? "Saving\u2026"
                                  : shots.length === 0
                                  ? "Add photo"
                                  : "Add another"}
                              </span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}

            {trades.length === 0 && (
              <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
                No trades logged yet. Log one below and it'll land on today's date.
              </p>
            )}
            {trades.length > 0 && !selectedInfo && (
              <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
                Tap a highlighted day to see its trades.
              </p>
            )}
          </>
        )}

        <input
          ref={screenshotInputRef}
          type="file"
          accept="image/*"
          onChange={handleScreenshotChange}
          style={{ display: "none" }}
        />
      </>
    );
  }

  if (activeTab === "insights") {
    const hasData = trades.length > 0;
    const insights = computeInsights(trades, customSetups);
    const heatmap = computeHeatmapWeeks(trades, 26);
    const headline = computeHeadlineInsight(trades, customSetups);
    const perf = computePerformanceMetrics(trades);
    const monthCmp = computeMonthComparison(trades);
    const completeness = computeJournalCompleteness(trades);
    const grade = computeDisciplineGrade(trades);
    const revengeCost = computeRevengeCostSplit(trades);
    const overconfidence = computeOverconfidenceCheck(trades);
    const disciplineTrend = computeDisciplineStreakTrend(trades);
    const noteTags = computeNoteTagAnalysis(trades);
    const consistency = computeConsistencyScore(trades);

    const fmtSigned = (n) => `${n >= 0 ? "+" : "-"}$${fmtMoney(n)}`;
    const fmtRatio = (n) => (Number.isFinite(n) ? n.toFixed(2) : "\u221e");

    // Shared bar-chart tooltip/cursor settings used by every BarChart in
    // this tab, so hovering a bar always shows theme-correct text (dark
    // text was unreadable against the dark-mode tooltip background before)
    // and never paints Recharts' default hover-cursor rectangle, which
    // showed up as a washed-out white/dark "aura" behind the bars.
    const barTooltipProps = {
      cursor: false,
      contentStyle: {
        background: palette.field,
        border: `1px solid ${palette.border}`,
        borderRadius: "8px",
        fontFamily: mono,
        fontSize: "12px",
      },
      labelStyle: { color: palette.textMuted },
      itemStyle: { color: palette.text },
    };
    // Thin bars, shared across every BarChart in this tab.
    const THIN_BAR_SIZE = 14;

    const INSIGHT_SUB_TABS = [
      { id: "overview", label: "Overview" },
      { id: "behavior", label: "Behavior" },
      { id: "setup", label: "Setup" },
    ];

    const metricCard = (key, label, valueText, tier) => (
      <div
        key={key}
        onClick={() => setExpandedMetric(expandedMetric === key ? null : key)}
        className={`rounded-lg p-3 ${TAP}`}
        style={{
          background: palette.surface,
          border: `1px solid ${palette.border}`,
          boxShadow: palette.shadow,
          cursor: "pointer",
          transition: THEME_TRANSITION,
        }}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="uppercase" style={{ color: palette.textFaint, letterSpacing: "0.08em", fontSize: "10px" }}>
            {label}
          </span>
          <span
            style={{
              fontSize: "9px",
              fontFamily: mono,
              color: tierColor(tier),
              border: `1px solid ${tierColor(tier)}`,
              borderRadius: "999px",
              padding: "1px 6px",
              flexShrink: 0,
            }}
          >
            {tier}
          </span>
        </div>
        <div style={{ fontFamily: mono, fontSize: "1rem", color: palette.text }}>{valueText}</div>
        {expandedMetric === key && METRIC_INFO[label] && (
          <div className="text-xs mt-2" style={{ color: palette.textFaint }}>
            {METRIC_INFO[label]}
          </div>
        )}
      </div>
    );

    body = (
      <>
        <div className="flex gap-2 mb-6">
          {INSIGHT_SUB_TABS.map((s) => {
            const active = insightSubTab === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setInsightSubTab(s.id)}
                className={`flex-1 px-3 py-2 rounded-full transition-colors ${TAP}`}
                style={{
                  background: active ? palette.gold : palette.field,
                  color: active ? palette.letterbox : palette.textMuted,
                  border: `1px solid ${active ? palette.gold : palette.border}`,
                  fontFamily: mono,
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>

        {!hasData ? (
          <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
            No trades yet, insights will appear once you start logging on the Curve tab.
          </p>
        ) : insightSubTab === "overview" ? (
          <>
            <span
              className="block mb-1.5 uppercase"
              style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
            >
              Performance Heatmap
            </span>
            <div
              className="rounded-2xl p-3 mb-2"
              style={{
                background: palette.surface,
                border: `1px solid ${palette.border}`,
                boxShadow: palette.shadow,
                overflowX: "auto",
              }}
            >
              <div className="flex" style={{ gap: "3px" }}>
                <div className="flex flex-col justify-between" style={{ gap: "3px", paddingRight: "4px" }}>
                  {WEEKDAY_LABELS.map((w, i) => (
                    <div
                      key={i}
                      style={{ width: "10px", height: "10px", fontSize: "7px", color: palette.textFaint, lineHeight: "10px" }}
                    >
                      {i % 2 === 1 ? w : ""}
                    </div>
                  ))}
                </div>
                {heatmap.weeks.map((week, wi) => (
                  <div key={wi} className="flex flex-col" style={{ gap: "3px" }}>
                    {week.map((day, di) => {
                      const intensity = day.pnl !== null && heatmap.maxAbs > 0 ? Math.min(1, Math.abs(day.pnl) / heatmap.maxAbs) : 0;
                      const alphaHex = Math.round(30 + intensity * 190)
                        .toString(16)
                        .padStart(2, "0");
                      const bg = day.future
                        ? "transparent"
                        : day.pnl === null
                        ? palette.field
                        : `${day.pnl > 0 ? palette.green : palette.red}${alphaHex}`;
                      return (
                        <div
                          key={di}
                          onClick={() =>
                            !day.future &&
                            day.pnl !== null &&
                            setExpandedHeatmapDay(expandedHeatmapDay?.key === day.key ? null : day)
                          }
                          style={{
                            width: "10px",
                            height: "10px",
                            borderRadius: "2px",
                            background: bg,
                            cursor: day.pnl !== null ? "pointer" : "default",
                          }}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            {expandedHeatmapDay ? (
              <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
                {formatDayLabel(expandedHeatmapDay.key)}: {expandedHeatmapDay.pnl >= 0 ? "+" : "-"}$
                {fmtMoney(expandedHeatmapDay.pnl)}
              </p>
            ) : (
              <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
                Last 6 months — tap a square for that day's total.
              </p>
            )}

            {headline && (
              <div
                className="rounded-2xl p-4 mb-6"
                style={{ background: palette.surface, border: `1px solid ${palette.gold}`, boxShadow: palette.shadow }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Lightbulb size={14} style={{ color: palette.gold }} />
                  <span className="uppercase" style={{ color: palette.gold, letterSpacing: "0.08em", fontSize: "10px" }}>
                    Headline Insight
                  </span>
                </div>
                <div style={{ color: palette.text, fontSize: "13px" }}>{headline}</div>
              </div>
            )}

            <span
              className="block mb-1.5 uppercase"
              style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
            >
              Performance Overview
            </span>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {metricCard("pf", "Profit Factor", fmtRatio(perf.profitFactor), perf.tiers.profitFactor)}
              {metricCard("rf", "Recovery Factor", fmtRatio(perf.recoveryFactor), perf.tiers.recoveryFactor)}
              {metricCard("wl", "Win/Loss Ratio", fmtRatio(perf.winLossRatio), perf.tiers.winLossRatio)}
              {metricCard("exp", "Expectancy", fmtSigned(perf.expectancy), perf.tiers.expectancy)}
              <StatChip label="Largest Win" value={fmtSigned(perf.largestWin)} />
              <StatChip label="Largest Loss" value={fmtSigned(perf.largestLoss)} />
            </div>

            <span
              className="block mb-1.5 uppercase"
              style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
            >
              This Month vs Last Month
            </span>
            <div
              className="rounded-2xl p-4 mb-6"
              style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
            >
              {[
                { label: "Win Rate", thisV: monthCmp.thisMonth.winRate, lastV: monthCmp.lastMonth.winRate, fmt: (v) => `${v.toFixed(0)}%` },
                { label: "Net P&L", thisV: monthCmp.thisMonth.net, lastV: monthCmp.lastMonth.net, fmt: fmtSigned },
                { label: "Trade Count", thisV: monthCmp.thisMonth.count, lastV: monthCmp.lastMonth.count, fmt: (v) => `${v}` },
              ].map((row, i) => {
                const delta = row.thisV - row.lastV;
                const up = delta > 0;
                const flat = delta === 0;
                return (
                  <div
                    key={row.label}
                    className="flex items-center justify-between"
                    style={{ marginBottom: i < 2 ? "8px" : 0 }}
                  >
                    <span style={{ color: palette.textMuted, fontSize: "12px" }}>{row.label}</span>
                    <div className="flex items-center gap-2">
                      <span style={{ fontFamily: mono, fontSize: "13px", color: palette.text }}>{row.fmt(row.thisV)}</span>
                      <span style={{ fontSize: "11px", color: flat ? palette.textFaint : up ? palette.green : palette.red }}>
                        {flat ? "\u2014" : up ? "\u2191" : "\u2193"} vs {row.fmt(row.lastV)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <span
              className="block mb-1.5 uppercase"
              style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
            >
              Journal Completeness
            </span>
            <div
              className="rounded-2xl p-4 mb-2"
              style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
            >
              <div className="flex items-baseline justify-between mb-2">
                <span style={{ fontFamily: mono, fontSize: "1.3rem", color: palette.text }}>{completeness}%</span>
                <span style={{ fontSize: "11px", color: palette.textFaint }}>note + setup + screenshot</span>
              </div>
              <div style={{ height: "6px", borderRadius: "999px", background: palette.field, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${completeness}%`,
                    background: palette.gold,
                    borderRadius: "999px",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            </div>
          </>
        ) : insightSubTab === "behavior" ? (
          <>
            <Readout
              eyebrow="Discipline Grade"
              value={grade.grade}
              unit={grade.grade !== "N/A" ? `${grade.score}/100` : undefined}
              sub="Combines discipline streak, revenge-trade rate, and journal completeness"
              tone={grade.grade === "A" || grade.grade === "B" ? "good" : grade.grade === "D" || grade.grade === "F" ? "bad" : undefined}
            />

            <span
              className="block mb-1.5 uppercase"
              style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
            >
              Cost of Revenge Trading
            </span>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <StatChip
                label={`Revenge (${revengeCost.revengeCount})`}
                value={revengeCost.revengeCount ? fmtSigned(revengeCost.revengeTotal) : "N/A"}
              />
              <StatChip label={`Everything Else (${revengeCost.cleanCount})`} value={fmtSigned(revengeCost.cleanTotal)} />
            </div>

            <span
              className="block mb-1.5 uppercase"
              style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
            >
              Win-Streak Sizing Check
            </span>
            <div
              className="rounded-2xl p-4 mb-6"
              style={{
                background: palette.surface,
                border: `1px solid ${overconfidence?.detected ? palette.red : palette.border}`,
                boxShadow: palette.shadow,
              }}
            >
              {!overconfidence ? (
                <p className="text-xs" style={{ color: palette.textFaint }}>
                  Not enough trades yet to check this, needs a few 3+ win streaks in your history.
                </p>
              ) : (
                <>
                  <div style={{ color: palette.text, fontSize: "13px", marginBottom: "4px" }}>
                    {overconfidence.detected
                      ? `Trade size runs ${overconfidence.pctChange.toFixed(0)}% bigger after 3+ wins in a row.`
                      : "Trade size stays steady after win streaks \u2014 no overconfidence pattern detected."}
                  </div>
                  {overconfidence.detected && (
                    <div className="text-xs" style={{ color: palette.textFaint }}>
                      Consider sticking to your normal position size after a win streak.
                    </div>
                  )}
                </>
              )}
            </div>

            {disciplineTrend.length > 1 && (
              <>
                <span
                  className="block mb-1.5 uppercase"
                  style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
                >
                  Discipline Streak Trend
                </span>
                <div
                  className="rounded-2xl p-4 mb-6"
                  style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
                >
                  <div style={{ width: "100%", height: 140 }}>
                    <ResponsiveContainer>
                      <LineChart data={disciplineTrend} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
                        <CartesianGrid stroke={palette.border} strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="day" hide />
                        <YAxis
                          stroke={palette.textFaint}
                          tick={{ fill: palette.textFaint, fontSize: 10, fontFamily: mono }}
                          tickLine={false}
                          axisLine={{ stroke: palette.border }}
                          width={28}
                          allowDecimals={false}
                        />
                        <Tooltip
                          contentStyle={{
                            background: palette.field,
                            border: `1px solid ${palette.border}`,
                            borderRadius: "8px",
                            fontFamily: mono,
                            fontSize: "12px",
                          }}
                          labelStyle={{ color: palette.textMuted }}
                          itemStyle={{ color: palette.goldBright }}
                          formatter={(v) => [`${v} day${v === 1 ? "" : "s"}`, "Streak"]}
                          labelFormatter={() => ""}
                        />
                        <Line type="monotone" dataKey="streak" stroke={palette.gold} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}

            {noteTags.length > 0 && (
              <>
                <span
                  className="block mb-1.5 uppercase"
                  style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
                >
                  Note Tag Win Rate
                </span>
                <div
                  className="rounded-2xl p-4 mb-6"
                  style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
                >
                  <div style={{ width: "100%", height: 140 }}>
                    <ResponsiveContainer>
                      <BarChart data={noteTags} margin={{ top: 6, right: 8, bottom: 0, left: 0 }} barCategoryGap="40%">
                        <CartesianGrid stroke={palette.border} strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="tag"
                          stroke={palette.textFaint}
                          tick={{ fill: palette.textFaint, fontSize: 9, fontFamily: mono }}
                          tickLine={false}
                          axisLine={{ stroke: palette.border }}
                        />
                        <YAxis
                          stroke={palette.textFaint}
                          tick={{ fill: palette.textFaint, fontSize: 10, fontFamily: mono }}
                          tickLine={false}
                          axisLine={{ stroke: palette.border }}
                          width={28}
                          unit="%"
                        />
                        <Tooltip {...barTooltipProps} formatter={(v) => [`${v.toFixed(0)}%`, "Win Rate"]} />
                        <Bar dataKey="winRate" radius={[4, 4, 0, 0]} barSize={THIN_BAR_SIZE} activeBar={false}>
                          {noteTags.map((r, i) => (
                            <Cell key={i} fill={r.winRate >= 50 ? palette.green : palette.red} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}

            <span
              className="block mb-1.5 uppercase"
              style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
            >
              Consistency
            </span>
            <StatChip label="Day-to-Day Volatility" value={consistency ? consistency.label : "N/A"} />
          </>
        ) : (
          <>
            {insights.setupRows.length > 0 ? (
              <>
                <span
                  className="block mb-1.5 uppercase"
                  style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
                >
                  Setup Performance
                </span>
                <div
                  className="rounded-2xl p-4 mb-2"
                  style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
                >
                  <div style={{ width: "100%", height: 160 }}>
                    <ResponsiveContainer>
                      <BarChart data={insights.setupRows} margin={{ top: 6, right: 8, bottom: 0, left: 0 }} barCategoryGap="40%">
                        <CartesianGrid stroke={palette.border} strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="label"
                          stroke={palette.textFaint}
                          tick={{ fill: palette.textFaint, fontSize: 9, fontFamily: mono }}
                          tickLine={false}
                          axisLine={{ stroke: palette.border }}
                        />
                        <YAxis
                          stroke={palette.textFaint}
                          tick={{ fill: palette.textFaint, fontSize: 10, fontFamily: mono }}
                          tickLine={false}
                          axisLine={{ stroke: palette.border }}
                          width={28}
                          unit="%"
                        />
                        <Tooltip {...barTooltipProps} formatter={(v) => [`${v.toFixed(0)}%`, "Win Rate"]} />
                        <Bar dataKey="winRate" radius={[4, 4, 0, 0]} barSize={THIN_BAR_SIZE} activeBar={false}>
                          {insights.setupRows.map((r, i) => (
                            <Cell key={i} fill={r.winRate >= 50 ? palette.green : palette.red} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                {insights.setupRows.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-lg px-3 py-2.5 mb-2"
                    style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
                  >
                    <div>
                      <div style={{ color: palette.text, fontSize: "14px" }}>{r.label}</div>
                      <div style={{ color: palette.textMuted, fontSize: "12px" }}>
                        {r.count} trade{r.count === 1 ? "" : "s"} {r.winRate.toFixed(0)}% win rate
                      </div>
                    </div>
                    <span style={{ fontFamily: mono, fontSize: "13px", color: r.pnl >= 0 ? palette.green : palette.red }}>
                      {fmtSigned(r.pnl)}
                    </span>
                  </div>
                ))}
              </>
            ) : (
              <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
                Tag trades with a Setup on the Curve tab to see setup performance here.
              </p>
            )}

            {insights.moodRows.length > 0 && (
              <>
                <span
                  className="block mt-4 mb-1.5 uppercase"
                  style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
                >
                  Mood Impact
                </span>
                <div
                  className="rounded-2xl p-4 mb-2"
                  style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
                >
                  <div style={{ width: "100%", height: 160 }}>
                    <ResponsiveContainer>
                      <BarChart data={insights.moodRows} margin={{ top: 6, right: 8, bottom: 0, left: 0 }} barCategoryGap="40%">
                        <CartesianGrid stroke={palette.border} strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="label"
                          stroke={palette.textFaint}
                          tick={{ fill: palette.textFaint, fontSize: 9, fontFamily: mono }}
                          tickLine={false}
                          axisLine={{ stroke: palette.border }}
                        />
                        <YAxis
                          stroke={palette.textFaint}
                          tick={{ fill: palette.textFaint, fontSize: 10, fontFamily: mono }}
                          tickLine={false}
                          axisLine={{ stroke: palette.border }}
                          width={28}
                          unit="%"
                        />
                        <Tooltip {...barTooltipProps} formatter={(v) => [`${v.toFixed(0)}%`, "Win Rate"]} />
                        <Bar dataKey="winRate" radius={[4, 4, 0, 0]} barSize={THIN_BAR_SIZE} activeBar={false}>
                          {insights.moodRows.map((r, i) => (
                            <Cell key={i} fill={r.winRate >= 50 ? palette.green : palette.red} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                {insights.moodRows.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-lg px-3 py-2.5 mb-2"
                    style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
                  >
                    <div>
                      <div style={{ color: palette.text, fontSize: "14px" }}>
                        {r.emoji} {r.label}
                      </div>
                      <div style={{ color: palette.textMuted, fontSize: "12px" }}>
                        {r.count} trade{r.count === 1 ? "" : "s"} {r.winRate.toFixed(0)}% win rate
                      </div>
                    </div>
                    <span style={{ fontFamily: mono, fontSize: "13px", color: r.pnl >= 0 ? palette.green : palette.red }}>
                      {fmtSigned(r.pnl)}
                    </span>
                  </div>
                ))}
              </>
            )}
          </>
        )}

        {hasData && (
          <>
            <button
              type="button"
              onClick={exportInsightsReport}
              className={`w-full flex items-center justify-center gap-2 rounded-lg py-3 mt-2 mb-2 ${TAP}`}
              style={{
                background: palette.field,
                border: `1px solid ${palette.border}`,
                color: palette.text,
                fontFamily: mono,
                fontSize: "13px",
                fontWeight: 600,
                transition: `${THEME_TRANSITION}, transform 0.15s ease`,
              }}
            >
              <Download size={16} />
              Download Report
            </button>
            {insightReportMsg && (
              <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
                {insightReportMsg}
              </p>
            )}
          </>
        )}
      </>
    );
  }

  if (activeTab === "journal") {
    const JOURNAL_SUB_TABS = [
      { id: "log", label: "Journal" },
      { id: "playbook", label: "Playbook" },
    ];

    const journalSubNav = (
      <div className="flex gap-2 mb-6">
        {JOURNAL_SUB_TABS.map((s) => {
          const active = journalSubTab === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setJournalSubTab(s.id)}
              className={`flex-1 px-3 py-2 rounded-full transition-colors ${TAP}`}
              style={{
                background: active ? palette.gold : palette.field,
                color: active ? palette.letterbox : palette.textMuted,
                border: `1px solid ${active ? palette.gold : palette.border}`,
                fontFamily: mono,
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              {s.label}
            </button>
          );
        })}
      </div>
    );

    if (journalSubTab === "playbook") {
      // ---- Playbook sub-tab: user-defined rules plus a once-a-day
      // check-in card, a per-rule follow-rate list, and a compact recent
      // check-in history \u2014 laid out as a clean, dashboard-style set of
      // cards consistent with the rest of the app.
      const stats = computePlaybookStats(playbookRules, playbookCheckins);
      const todayKey = dayKeyFromDate(new Date());
      const alreadyCheckedInToday = playbookCheckins.some((c) => c.date === todayKey);
      const recentCheckins = [...playbookCheckins]
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
        .slice(0, 7);

      body = (
        <>
          {journalSubNav}

          <div className="flex items-center justify-between mb-1.5">
            <span
              className="uppercase"
              style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
            >
              Today's Check-In
            </span>
            <span style={{ color: palette.textFaint, fontSize: "11px", fontFamily: mono }}>
              {formatDayLabel(todayKey)}
            </span>
          </div>

          {!playbookRulesLoaded ? (
            <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
              Loading playbook\u2026
            </p>
          ) : playbookRules.length === 0 ? (
            <div
              className="rounded-2xl p-6 mb-6 text-center"
              style={{ background: palette.surface, border: `1px dashed ${palette.border}` }}
            >
              <ClipboardCheck size={22} style={{ color: palette.textFaint, margin: "0 auto 8px" }} />
              <p className="text-xs" style={{ color: palette.textFaint }}>
                Add a rule below to start checking in against your playbook.
              </p>
            </div>
          ) : (
            <div
              className="rounded-2xl overflow-hidden mb-2"
              style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow, transition: THEME_TRANSITION }}
            >
              {playbookRules.map((r, i) => {
                const followed = !!todayResults[r.id];
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => toggleTodayResult(r.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left ${TAP}`}
                    style={{
                      background: followed ? `${palette.green}12` : "transparent",
                      borderBottom: i < playbookRules.length - 1 ? `1px solid ${palette.border}` : "none",
                    }}
                  >
                    <span
                      className="flex items-center justify-center rounded-md flex-shrink-0"
                      style={{
                        width: "20px",
                        height: "20px",
                        border: `1.5px solid ${followed ? palette.green : palette.textFaint}`,
                        background: followed ? palette.green : "transparent",
                        color: palette.letterbox,
                      }}
                    >
                      {followed && <Check size={13} strokeWidth={3} />}
                    </span>
                    <span style={{ color: followed ? palette.text : palette.textMuted, fontSize: "13px", flex: 1 }}>
                      {r.text}
                    </span>
                  </button>
                );
              })}
              <div className="p-3" style={{ borderTop: `1px solid ${palette.border}`, background: palette.field }}>
                <button
                  type="button"
                  onClick={submitCheckin}
                  className={`w-full flex items-center justify-center gap-2 rounded-lg py-2.5 ${TAP}`}
                  style={{
                    background: palette.gold,
                    color: palette.letterbox,
                    fontFamily: mono,
                    fontSize: "13px",
                    fontWeight: 600,
                    transition: `${THEME_TRANSITION}, transform 0.15s ease`,
                  }}
                >
                  <ClipboardCheck size={16} />
                  {alreadyCheckedInToday ? "Update Today's Check-In" : "Save Today's Check-In"}
                </button>
              </div>
            </div>
          )}
          {playbookMsg && (
            <p className="text-xs mb-4" style={{ color: palette.gold }}>
              {playbookMsg}
            </p>
          )}
          {!playbookMsg && <div className="mb-4" />}

          {playbookRulesLoaded && stats.hasData && (
            <>
              <span
                className="block mb-1.5 uppercase"
                style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
              >
                Playbook Stats
              </span>
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div
                  className="rounded-lg p-3"
                  style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow, transition: THEME_TRANSITION }}
                >
                  <div
                    className="flex items-center gap-1 mb-1"
                    style={{ color: palette.textFaint, fontSize: "10px", letterSpacing: "0.06em" }}
                  >
                    <Flame size={11} style={{ color: stats.current > 0 ? palette.gold : palette.textFaint }} />
                    STREAK
                  </div>
                  <div style={{ fontFamily: mono, fontSize: "1.1rem", color: palette.text }}>
                    {stats.current}
                    <span style={{ fontSize: "11px", color: palette.textFaint }}>d</span>
                  </div>
                </div>
                <div
                  className="rounded-lg p-3"
                  style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow, transition: THEME_TRANSITION }}
                >
                  <div
                    className="flex items-center gap-1 mb-1"
                    style={{ color: palette.textFaint, fontSize: "10px", letterSpacing: "0.06em" }}
                  >
                    <TrendingUp size={11} />
                    BEST
                  </div>
                  <div style={{ fontFamily: mono, fontSize: "1.1rem", color: palette.text }}>
                    {stats.best}
                    <span style={{ fontSize: "11px", color: palette.textFaint }}>d</span>
                  </div>
                </div>
                <div
                  className="rounded-lg p-3"
                  style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow, transition: THEME_TRANSITION }}
                >
                  <div
                    className="flex items-center gap-1 mb-1"
                    style={{ color: palette.textFaint, fontSize: "10px", letterSpacing: "0.06em" }}
                  >
                    <Target size={11} />
                    CLEAN
                  </div>
                  <div style={{ fontFamily: mono, fontSize: "1.1rem", color: palette.text }}>
                    {stats.overallPct}
                    <span style={{ fontSize: "11px", color: palette.textFaint }}>%</span>
                  </div>
                </div>
              </div>

              <span
                className="block mb-1.5 uppercase"
                style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
              >
                Per-Rule Follow Rate
              </span>
              <div
                className="rounded-2xl p-4 mb-6"
                style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow, transition: THEME_TRANSITION }}
              >
                {stats.ruleStats.map((r, i) => (
                  <div key={r.id} style={{ marginBottom: i < stats.ruleStats.length - 1 ? "14px" : 0 }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span style={{ color: palette.text, fontSize: "12px", flex: 1, marginRight: "8px" }}>{r.text}</span>
                      <span
                        style={{
                          fontFamily: mono,
                          fontSize: "11px",
                          color: r.pct === null ? palette.textFaint : r.pct >= 80 ? palette.green : r.pct >= 50 ? palette.gold : palette.red,
                          flexShrink: 0,
                        }}
                      >
                        {r.pct === null ? "\u2014" : `${r.pct}%`}
                      </span>
                    </div>
                    <div style={{ height: "5px", borderRadius: "999px", background: palette.field, overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${r.pct ?? 0}%`,
                          background:
                            r.pct === null ? "transparent" : r.pct >= 80 ? palette.green : r.pct >= 50 ? palette.gold : palette.red,
                          borderRadius: "999px",
                          transition: "width 0.3s ease",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <span
            className="block mb-1.5 uppercase"
            style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
          >
            Your Rules
          </span>
          {playbookRulesLoaded && playbookRules.length > 0 && (
            <div className="mb-2">
              {playbookRules.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-lg px-3 py-3 mb-2"
                  style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow, transition: THEME_TRANSITION }}
                >
                  <span style={{ color: palette.text, fontSize: "13px", flex: 1, marginRight: "8px" }}>{r.text}</span>
                  <button
                    type="button"
                    onClick={() => removePlaybookRule(r.id)}
                    className={`flex-shrink-0 ${TAP}`}
                    style={{ color: palette.textFaint }}
                    aria-label={`Remove rule: ${r.text}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {playbookRulesLoaded && playbookRules.length < MAX_PLAYBOOK_RULES && (
            <div className="flex items-center gap-2 mb-1">
              <input
                type="text"
                value={newRuleText}
                onChange={(e) => {
                  setNewRuleText(e.target.value);
                  if (playbookRuleError) setPlaybookRuleError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addPlaybookRule();
                  }
                }}
                placeholder="New rule, e.g. Min 1:2 R:R"
                maxLength={80}
                className="flex-1 rounded-lg px-3 py-2.5 bg-transparent outline-none"
                style={{
                  background: palette.field,
                  border: `1px solid ${palette.border}`,
                  color: palette.text,
                  fontSize: "13px",
                }}
              />
              <button
                type="button"
                onClick={addPlaybookRule}
                className={`flex items-center justify-center rounded-lg flex-shrink-0 ${TAP}`}
                style={{ width: "42px", height: "42px", background: palette.gold, color: palette.letterbox }}
                aria-label="Add rule"
              >
                <Plus size={18} strokeWidth={2.4} />
              </button>
            </div>
          )}
          {playbookRuleError && (
            <p className="text-xs mb-2" style={{ color: palette.red }}>
              {playbookRuleError}
            </p>
          )}
          <p className="text-xs mt-1 mb-6" style={{ color: palette.textFaint }}>
            Track up to {MAX_PLAYBOOK_RULES} rules at once. Removing a rule only affects future check-ins –
            past history keeps whatever was recorded for it.
          </p>

          {recentCheckins.length > 0 && (
            <>
              <span
                className="block mb-1.5 uppercase"
                style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
              >
                Recent Check-Ins
              </span>
              <div
                className="rounded-2xl px-3 mb-4"
                style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow, transition: THEME_TRANSITION }}
              >
                {recentCheckins.map((c, i) => {
                  const clean = isCleanCheckin(c);
                  const total = Object.keys(c.results || {}).length;
                  const followedCount = Object.values(c.results || {}).filter(Boolean).length;
                  return (
                    <div
                      key={c.id}
                      className="flex items-center justify-between py-2.5"
                      style={{ borderBottom: i < recentCheckins.length - 1 ? `1px solid ${palette.border}` : "none" }}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="flex items-center justify-center rounded-full flex-shrink-0"
                          style={{
                            width: "18px",
                            height: "18px",
                            background: clean ? `${palette.green}22` : `${palette.red}18`,
                            color: clean ? palette.green : palette.red,
                          }}
                        >
                          {clean ? <Check size={11} strokeWidth={3} /> : <X size={11} strokeWidth={3} />}
                        </span>
                        <span style={{ color: palette.text, fontSize: "13px" }}>{formatDayLabel(c.date)}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span style={{ fontFamily: mono, fontSize: "11px", color: palette.textMuted }}>
                          {followedCount}/{total} followed
                        </span>
                        <button
                          type="button"
                          onClick={() => deletePlaybookCheckin(c.id)}
                          className={TAP}
                          style={{ color: palette.textFaint }}
                          aria-label={`Delete check-in for ${formatDayLabel(c.date)}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      );
    } else if (journalMonth === null) {
      // ---- Year grid: one box per month, filled months get a subtle
      // gold-tinted background so the eye can scan "which months have
      // entries" at a glance.
      const countsByMonth = {};
      journalEntries.forEach((r) => {
        if (!r.date) return;
        const [y, m] = r.date.split("-").map(Number);
        if (y !== journalYear) return;
        const filled = [r.pair, r.trend, r.rr, r.setup, r.mistake, r.note].some((v) => v && String(v).trim());
        if (filled) countsByMonth[m - 1] = (countsByMonth[m - 1] || 0) + 1;
      });

      body = (
        <>
          {journalSubNav}

          <div className="flex items-center justify-between mb-6">
            <button
              type="button"
              onClick={() => setJournalYear((y) => y - 1)}
              className={TAP}
              style={{ color: palette.textMuted, padding: "4px" }}
              aria-label="Previous year"
            >
              <ChevronLeft size={20} />
            </button>
            <span style={{ fontFamily: mono, fontSize: "1.1rem", color: palette.text, letterSpacing: "0.04em" }}>
              {journalYear}
            </span>
            <button
              type="button"
              onClick={() => setJournalYear((y) => y + 1)}
              className={TAP}
              style={{ color: palette.textMuted, padding: "4px" }}
              aria-label="Next year"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {!journalLoaded ? (
            <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
              Loading journal\u2026
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {MONTH_NAMES.map((m, i) => {
                const count = countsByMonth[i] || 0;
                const isCurrentMonth =
                  journalYear === new Date().getFullYear() && i === new Date().getMonth();
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setJournalMonth(i)}
                    className={`relative flex flex-col items-center justify-center gap-1.5 rounded-2xl ${TAP}`}
                    style={{
                      aspectRatio: "1",
                      background: count > 0 ? `${palette.gold}0D` : palette.surface,
                      border: `1px solid ${
                        isCurrentMonth ? palette.gold : count > 0 ? `${palette.gold}55` : palette.border
                      }`,
                      boxShadow: palette.shadow,
                      transition: THEME_TRANSITION,
                    }}
                  >
                    <span
                      className="uppercase"
                      style={{ fontFamily: mono, fontSize: "13px", fontWeight: 600, color: palette.text, letterSpacing: "0.04em" }}
                    >
                      {MONTH_SHORT[i]}
                    </span>
                    <span
                      style={{
                        fontFamily: mono,
                        fontSize: "10px",
                        color: count > 0 ? palette.gold : palette.textFaint,
                        border: count > 0 ? `1px solid ${palette.gold}55` : "none",
                        borderRadius: "999px",
                        padding: count > 0 ? "1px 8px" : 0,
                      }}
                    >
                      {count > 0 ? `${count} entr${count === 1 ? "y" : "ies"}` : "no entries"}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          <p className="text-xs mt-4" style={{ color: palette.textFaint }}>
            Tap a month to open its trade journal.
          </p>
        </>
      );
    } else {
      // ---- Month table view.
      const year = journalYear;
      const monthIdx = journalMonth;
      const monthPrefix = `${year}-${pad2(monthIdx + 1)}`;
      const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
      const monthMinDate = `${monthPrefix}-01`;
      const monthMaxDate = `${monthPrefix}-${pad2(daysInMonth)}`;

      // Only rows the user has actually touched for this month are shown.
      // Rather than synthesizing a placeholder for every day in the month,
      // just one blank starter row is offered when there's nothing yet \u2014
      // the date cell itself is a manual date picker (constrained to this
      // month via min/max below), and "Add Row" adds more as needed.
      const realRows = journalEntries
        .filter((r) => r.date && r.date.startsWith(monthPrefix))
        .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
      const allRows =
        realRows.length > 0
          ? realRows
          : [
              {
                id: `placeholder-${monthPrefix}`,
                date: monthMinDate,
                pair: "",
                trend: "",
                rr: "",
                setup: "",
                mistake: "",
                note: "",
                _placeholder: true,
              },
            ];

      const totalTableWidth = JOURNAL_COLUMNS.reduce((s, c) => s + journalColWidths[c.id], 0) + 36;

      const cellInputStyle = { color: palette.text, fontFamily: mono, fontSize: "12px", border: "none" };

      const renderCell = (row, col, rowIdx, colIdx, rows) => {
        const dateForRow = row.date;
        const cellKey = `${row.id}:${col.id}`;
        const registerRef = (el) => {
          if (el) journalCellRefs.current[cellKey] = el;
          else delete journalCellRefs.current[cellKey];
        };
        const onCellKeyDown = (e) => handleJournalCellKeyDown(e, rowIdx, colIdx, rows);

        if (col.id === "date") {
          return (
            <input
              type="date"
              ref={registerRef}
              onKeyDown={onCellKeyDown}
              value={row.date || ""}
              min={monthMinDate}
              max={monthMaxDate}
              onChange={(e) => updateJournalField(row.id, "date", e.target.value, dateForRow)}
              className="w-full bg-transparent outline-none"
              style={cellInputStyle}
            />
          );
        }
        if (col.id === "trend") {
          const val = row.trend || "";
          return (
            <select
              ref={registerRef}
              onKeyDown={onCellKeyDown}
              value={val}
              onChange={(e) => updateJournalField(row.id, "trend", e.target.value, dateForRow)}
              className="w-full bg-transparent outline-none appearance-none"
              style={{ ...cellInputStyle, color: val ? palette.text : palette.textFaint }}
            >
              <option value="" style={{ background: palette.field, color: palette.textFaint }}>
                Add trend
              </option>
              {TREND_OPTIONS.map((t) => (
                <option key={t.id} value={t.id} style={{ background: palette.field, color: palette.text }}>
                  {t.label}
                </option>
              ))}
            </select>
          );
        }
        if (col.id === "setup") {
          const val = row.setup || "";
          const allSetups = [...SETUPS, ...customSetups];
          return (
            <select
              ref={registerRef}
              onKeyDown={onCellKeyDown}
              value={val}
              onChange={(e) => updateJournalField(row.id, "setup", e.target.value, dateForRow)}
              className="w-full bg-transparent outline-none appearance-none"
              style={{ ...cellInputStyle, color: val ? palette.text : palette.textFaint }}
            >
              <option value="" style={{ background: palette.field, color: palette.textFaint }}>
                Add setup
              </option>
              {allSetups.map((s) => (
                <option key={s.id} value={s.id} style={{ background: palette.field, color: palette.text }}>
                  {s.label}
                </option>
              ))}
            </select>
          );
        }
        const placeholderText =
          col.id === "pair"
            ? "Add pair"
            : col.id === "rr"
            ? "Add R:R"
            : col.id === "note"
            ? "Add note"
            : "Add mistake";
        return (
          <input
            type="text"
            ref={registerRef}
            onKeyDown={onCellKeyDown}
            value={row[col.id] || ""}
            onChange={(e) => updateJournalField(row.id, col.id, e.target.value, dateForRow)}
            placeholder={placeholderText}
            className="w-full bg-transparent outline-none"
            style={cellInputStyle}
          />
        );
      };

      body = (
        <>
          {journalSubNav}

          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => setJournalMonth(null)}
              className={`flex items-center gap-1 ${TAP}`}
              style={{ color: palette.textMuted, fontSize: "12px", fontFamily: mono }}
            >
              <ChevronLeft size={16} />
              {year}
            </button>
            <span style={{ fontFamily: mono, fontSize: "13px", color: palette.text, letterSpacing: "0.04em" }}>
              {MONTH_NAMES[monthIdx]} {year}
            </span>
            <span style={{ width: "40px" }} />
          </div>

          {!journalLoaded ? (
            <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
              Loading journal\u2026
            </p>
          ) : (
            <div
              className="rounded-2xl mb-3"
              style={{
                background: palette.surface,
                border: `1px solid ${palette.border}`,
                boxShadow: palette.shadow,
                overflow: "hidden",
                maxHeight: "420px",
              }}
            >
              <div style={{ overflowY: "auto", overflowX: "auto", maxHeight: "420px", WebkitOverflowScrolling: "touch" }}>
                <table style={{ borderCollapse: "collapse", width: `${totalTableWidth}px` }}>
                  <thead>
                    <tr>
                      {JOURNAL_COLUMNS.map((col) => (
                        <th
                          key={col.id}
                          style={{
                            position: "sticky",
                            top: 0,
                            zIndex: 1,
                            width: `${journalColWidths[col.id]}px`,
                            minWidth: `${journalColWidths[col.id]}px`,
                            maxWidth: `${journalColWidths[col.id]}px`,
                            background: palette.field,
                            borderBottom: `1px solid ${palette.gold}55`,
                            borderRight: `1px solid ${palette.border}`,
                            textAlign: "left",
                            padding: "10px 8px",
                          }}
                        >
                          <div className="flex items-center justify-between" style={{ position: "relative" }}>
                            <span
                              className="uppercase"
                              style={{ fontSize: "10px", color: palette.textMuted, letterSpacing: "0.07em", fontWeight: 600 }}
                            >
                              {col.label}
                            </span>
                            <div
                              onPointerDown={startJournalResize(col.id)}
                              onPointerMove={moveJournalResize}
                              onPointerUp={endJournalResize}
                              onPointerCancel={endJournalResize}
                              style={{
                                position: "absolute",
                                right: "-9px",
                                top: "-10px",
                                bottom: "-10px",
                                width: "18px",
                                cursor: "col-resize",
                                touchAction: "none",
                              }}
                            />
                          </div>
                        </th>
                      ))}
                      <th
                        style={{
                          position: "sticky",
                          top: 0,
                          width: "36px",
                          minWidth: "36px",
                          background: palette.field,
                          borderBottom: `1px solid ${palette.gold}55`,
                        }}
                      />
                    </tr>
                  </thead>
                  <tbody>
                    {allRows.map((row, rowIdx) => (
                      <tr key={row.id} style={{ background: rowIdx % 2 === 1 ? `${palette.field}55` : "transparent" }}>
                        {JOURNAL_COLUMNS.map((col, colIdx) => (
                          <td
                            key={col.id}
                            style={{
                              width: `${journalColWidths[col.id]}px`,
                              minWidth: `${journalColWidths[col.id]}px`,
                              maxWidth: `${journalColWidths[col.id]}px`,
                              borderBottom: `1px solid ${palette.border}`,
                              borderRight: `1px solid ${palette.border}`,
                              padding: "8px 8px",
                            }}
                          >
                            {renderCell(row, col, rowIdx, colIdx, allRows)}
                          </td>
                        ))}
                        <td
                          style={{
                            width: "36px",
                            minWidth: "36px",
                            borderBottom: `1px solid ${palette.border}`,
                            textAlign: "center",
                          }}
                        >
                          {!row._placeholder && (
                            <button
                              type="button"
                              onClick={() => deleteJournalRow(row.id)}
                              className={TAP}
                              style={{ color: palette.textFaint }}
                              aria-label="Delete row"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              const today = new Date();
              const isCurrentMonth = today.getFullYear() === year && today.getMonth() === monthIdx;
              addJournalRow(isCurrentMonth ? dayKeyFromDate(today) : monthMinDate);
            }}
            className={`w-full flex items-center justify-center gap-2 rounded-lg py-3 mb-4 ${TAP}`}
            style={{
              background: "transparent",
              border: `1px dashed ${palette.gold}88`,
              color: palette.gold,
              fontFamily: mono,
              fontSize: "13px",
              fontWeight: 600,
              transition: `${THEME_TRANSITION}, transform 0.15s ease`,
            }}
          >
            <Plus size={16} />
            Add Trade Row
          </button>

          <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
            Tap any cell to edit, Trend and Setup are quick-select. The date only lets you pick a day within{" "}
            {MONTH_NAMES[monthIdx]} {year}. Drag a column header's right edge to resize it. Rows sort by date
            automatically, so add extra rows for multiple trades on the same day. Hold Alt and press an arrow
            key to jump between cells, including into and out of the date field without leaving the
            keyboard.
          </p>
        </>
      );
    }
  }

  if (activeTab === "news") {
    const now = new Date();
    const withOcc = newsEvents.map((ev) => ({ ev, occMs: nextOccurrenceMs(ev, now) }));

    const future = withOcc.filter((x) => x.occMs >= now.getTime()).sort((a, b) => a.occMs - b.occMs);
    const next = future[0];
    const nextMs = next ? next.occMs - now.getTime() : Infinity;
    const nextLabel = next ? `${next.ev.date} ${next.ev.time}` : "";

    const impactColor = (level) =>
      level === "high" ? palette.red : level === "medium" ? palette.goldBright : palette.textMuted;

    const dayGroups = {};
    withOcc.forEach(({ ev, occMs }) => {
      const d = new Date(occMs);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (!dayGroups[key]) dayGroups[key] = [];
      dayGroups[key].push({ ev, occMs });
    });
    const dayKeys = Object.keys(dayGroups).sort();

    body = (
      <>
        <Readout
          eyebrow="Next USD Event"
          value={next ? formatCountdown(nextMs) : "N/A"}
          sub={next ? `${next.ev.name}  ${nextLabel}` : "No upcoming events, add one below"}
          tone={next && next.ev.impact === "high" && nextMs < 60 * 60 * 1000 ? "bad" : undefined}
        />

        {newsLoadError && (
          <p className="text-xs mb-4" style={{ color: palette.red }}>
            {newsLoadError}
          </p>
        )}

        {notifPermission === "denied" && (
          <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
            Notifications are blocked in your browser settings alarms will still ring with sound while this
            app is open, just without a system notification.
          </p>
        )}

        {!newsLoaded ? (
          <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
            Loading saved events\u2026
          </p>
        ) : newsEvents.length === 0 ? (
          <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
            No events added yet. Add one below to start tracking it.
          </p>
        ) : (
          dayKeys.map((key) => {
            const dayDate = new Date(`${key}T00:00:00`);
            const dayLabel = dayDate.toLocaleDateString("default", {
              weekday: "long",
              month: "short",
              day: "numeric",
            });
            const isPast = dayGroups[key].every((x) => x.occMs < now.getTime());
            return (
              <div key={key} className="mb-4">
                <div
                  className="uppercase mb-1.5"
                  style={{
                    color: isPast ? palette.textFaint : palette.textMuted,
                    letterSpacing: "0.08em",
                    fontSize: "11px",
                  }}
                >
                  {dayLabel}
                </div>
                {dayGroups[key]
                  .sort((a, b) => a.ev.time.localeCompare(b.ev.time))
                  .map(({ ev, occMs }) => {
                    const passed = occMs < now.getTime();
                    return (
                      <div
                        key={ev.id}
                        className="flex items-center justify-between rounded-lg px-3 py-2.5 mb-2"
                        style={{
                          background: palette.surface,
                          border: `1px solid ${palette.border}`,
                          boxShadow: palette.shadow,
                          opacity: passed ? 0.55 : 1,
                          transition: THEME_TRANSITION,
                        }}
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span style={{ color: palette.text, fontSize: "14px" }}>{ev.name}</span>
                            <span
                              style={{
                                fontSize: "9px",
                                fontFamily: mono,
                                color: impactColor(ev.impact),
                                border: `1px solid ${impactColor(ev.impact)}`,
                                borderRadius: "999px",
                                padding: "1px 6px",
                                textTransform: "uppercase",
                              }}
                            >
                              {ev.impact}
                            </span>
                            {ev.alarm && <Bell size={11} style={{ color: palette.gold }} aria-label="Alarm set" />}
                          </div>
                          <div style={{ color: palette.textMuted, fontSize: "12px" }}>
                            {ev.time}
                            {passed ? ", released" : ""}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteNewsEvent(ev.id)}
                          className={TAP}
                          style={{ color: palette.textFaint }}
                          aria-label="Delete event"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    );
                  })}
              </div>
            );
          })
        )}

        <p className="text-xs mt-1 mb-6" style={{ color: palette.textFaint }}>
          Nothing here is added automatically add the events you want to track below. With Alarm on, this
          app rings (sound + notification) {ALARM_LEAD_MINUTES} minutes before, but only while it's open in your
          browser it can't set a true system alarm, so keep the tab open (or this installed as a
          home-screen app) close to the event.
        </p>

        <span className="block mb-1.5 uppercase" style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}>
          Add Event
        </span>
        <label className="block mb-4">
          <span
            className="block mb-1.5 uppercase"
            style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
          >
            Event Name
          </span>
          <div
            className="flex items-center rounded-lg px-3"
            style={{ background: palette.field, border: `1px solid ${palette.border}` }}
          >
            <input
              type="text"
              value={newEventName}
              onChange={(e) => setNewEventName(e.target.value)}
              placeholder="Non-Farm Payrolls"
              className="w-full bg-transparent py-3 outline-none"
              style={{ color: palette.text, fontFamily: mono, fontSize: "16px" }}
            />
          </div>
        </label>

        <span className="block mb-1.5 uppercase" style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}>
          Impact
        </span>
        <div className="flex gap-2 mb-4">
          {["high", "medium", "low"].map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => setNewEventImpact(lvl)}
              className={`px-3 py-1.5 rounded-full transition-colors ${TAP}`}
              style={{
                background: newEventImpact === lvl ? impactColor(lvl) : palette.field,
                color: newEventImpact === lvl ? palette.letterbox : palette.textMuted,
                border: `1px solid ${newEventImpact === lvl ? impactColor(lvl) : palette.border}`,
                fontFamily: mono,
                fontSize: "13px",
                textTransform: "capitalize",
              }}
            >
              {lvl}
            </button>
          ))}
        </div>

        <label className="block mb-4">
          <span
            className="block mb-1.5 uppercase"
            style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
          >
            Date
          </span>
          <div
            className="rounded-lg px-3"
            style={{ background: palette.field, border: `1px solid ${palette.border}` }}
          >
            <input
              type="date"
              value={newEventDate}
              onChange={(e) => setNewEventDate(e.target.value)}
              className="w-full bg-transparent py-3 outline-none"
              style={{ color: palette.text, fontFamily: mono, fontSize: "15px" }}
            />
          </div>
        </label>

        <label className="block mb-4">
          <span
            className="block mb-1.5 uppercase"
            style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
          >
            Time (local)
          </span>
          <div
            className="rounded-lg px-3"
            style={{ background: palette.field, border: `1px solid ${palette.border}` }}
          >
            <input
              type="time"
              value={newEventTime}
              onChange={(e) => setNewEventTime(e.target.value)}
              className="w-full bg-transparent py-3 outline-none"
              style={{ color: palette.text, fontFamily: mono, fontSize: "15px" }}
            />
          </div>
        </label>

        <span className="block mb-1.5 uppercase" style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}>
          Alarm
        </span>
        <button
          type="button"
          onClick={toggleNewEventAlarm}
          className={`flex items-center gap-2 px-3 py-2.5 rounded-lg mb-1 transition-colors ${TAP}`}
          style={{
            background: newEventAlarm ? palette.gold : palette.field,
            color: newEventAlarm ? palette.letterbox : palette.textMuted,
            border: `1px solid ${newEventAlarm ? palette.gold : palette.border}`,
            fontFamily: mono,
            fontSize: "13px",
          }}
        >
          <Bell size={15} />
          {newEventAlarm ? `Ring ${ALARM_LEAD_MINUTES} min before` : "No alarm for this event"}
        </button>
        <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
          {notifPermission === "granted"
            ? "Notifications are allowed \u2014 you'll get a system notification plus sound when it rings."
            : notifPermission === "unsupported"
            ? "This browser doesn't support notifications \u2014 the alarm will still ring with sound and an in-app popup."
            : "Turning this on will ask for notification permission."}
        </p>

        <button
          type="button"
          onClick={addNewsEvent}
          className={`w-full rounded-lg py-3 mb-4 ${TAP}`}
          style={{ background: palette.gold, color: palette.letterbox, fontFamily: mono, fontSize: "14px", transition: `${THEME_TRANSITION}, transform 0.15s ease` }}
        >
          + Add Event
        </button>
      </>
    );
  }

  if (activeTab === "sessions") {
    const tzOffsetMinutes = currentTime.getTimezoneOffset();
    const nowUTCHour =
      currentTime.getUTCHours() + currentTime.getUTCMinutes() / 60 + currentTime.getUTCSeconds() / 3600;
    const localTimeLabel = currentTime.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    let tzName = "";
    try {
      tzName = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    } catch (err) {
      tzName = "";
    }

    const sessionStates = MARKET_SESSIONS.map((s) => ({
      ...s,
      ...sessionCountdown(s, nowUTCHour),
      segments: sessionLocalSegments(s, tzOffsetMinutes),
    }));
    const openSessions = sessionStates.filter((s) => s.isOpen);

    const { startLocal: hlStart, endLocal: hlEnd } = highLiquidityWindowLocal(tzOffsetMinutes);
    const highLiquidityActive =
      openSessions.some((s) => s.id === "london") && openSessions.some((s) => s.id === "newyork");

    // 48 half-hour local slots, each holding how many sessions are open —
    // drives the overlap-intensity strip under the timeline.
    const overlapSlots = [];
    for (let i = 0; i < 48; i++) {
      const localHour = i / 2;
      const openIds = MARKET_SESSIONS.filter((s) =>
        sessionOpenAtLocalHour(s, localHour, tzOffsetMinutes)
      ).map((s) => s.id);
      overlapSlots.push({ localHour, count: openIds.length, openIds });
    }

    const nowLocalHour = mod24(nowUTCHour - tzOffsetMinutes / 60);
    const HOUR_TICKS = [0, 4, 8, 12, 16, 20];

    body = (
      <>
        <Readout
          eyebrow="Your Local Time"
          value={localTimeLabel}
          sub={
            openSessions.length > 0
              ? `${openSessions.map((s) => s.label).join(", ")} open now${
                  highLiquidityActive ? " \u2014 highest liquidity window" : ""
                }`
              : "No major session open right now"
          }
          tone={highLiquidityActive ? "good" : undefined}
        />

        <div
          className="rounded-2xl p-4 mb-2"
          style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow, transition: THEME_TRANSITION }}
        >
          <div
            className="uppercase mb-3"
            style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
          >
            Session Timeline (Local Time)
          </div>

          {sessionStates.map((s) => (
            <div key={s.id} className="flex items-center mb-2" style={{ gap: "8px" }}>
              <span
                style={{ width: "62px", flexShrink: 0, fontSize: "11px", fontFamily: mono, color: palette.textMuted }}
              >
                {s.label}
              </span>
              <div className="relative flex-1" style={{ height: "16px" }}>
                <div
                  className="absolute inset-0 rounded"
                  style={{ background: palette.field, border: `1px solid ${palette.border}` }}
                />
                {s.segments.map((seg, i) => (
                  <div
                    key={i}
                    className="absolute rounded"
                    style={{
                      top: 0,
                      bottom: 0,
                      left: `${(seg[0] / 24) * 100}%`,
                      width: `${((seg[1] - seg[0]) / 24) * 100}%`,
                      background: s.color,
                      opacity: s.isOpen ? 0.85 : 0.4,
                    }}
                  />
                ))}
                <div
                  className="absolute"
                  style={{
                    top: "-3px",
                    bottom: "-3px",
                    left: `${(nowLocalHour / 24) * 100}%`,
                    width: "2px",
                    background: palette.goldBright,
                  }}
                />
              </div>
            </div>
          ))}

          <div className="flex items-center mb-1" style={{ gap: "8px" }}>
            <span style={{ width: "62px", flexShrink: 0 }} />
            <div className="relative flex-1" style={{ height: "8px" }}>
              {overlapSlots.map((slot, i) => (
                <div
                  key={i}
                  className="absolute"
                  style={{
                    top: 0,
                    bottom: 0,
                    left: `${(slot.localHour / 24) * 100}%`,
                    width: `${(1 / 48) * 100}%`,
                    background:
                      slot.count >= 2
                        ? slot.openIds.includes("london") && slot.openIds.includes("newyork")
                          ? palette.goldBright
                          : `${palette.gold}88`
                        : "transparent",
                  }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center" style={{ gap: "8px" }}>
            <span style={{ width: "62px", flexShrink: 0 }} />
            <div className="relative flex-1" style={{ height: "12px" }}>
              {HOUR_TICKS.map((h) => (
                <span
                  key={h}
                  className="absolute"
                  style={{
                    left: `${(h / 24) * 100}%`,
                    transform: "translateX(-50%)",
                    fontSize: "9px",
                    fontFamily: mono,
                    color: palette.textFaint,
                  }}
                >
                  {formatHourLabel(h)}
                </span>
              ))}
            </div>
          </div>
        </div>
        <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
          Gold marker is right now. The strip under the bars highlights overlaps — brighter gold marks
          London and New York trading at once, the day's highest-liquidity window.
        </p>

        <div
          className="rounded-2xl p-4 mb-6"
          style={{ background: palette.surface, border: `1px solid ${palette.gold}`, boxShadow: palette.shadow }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Clock size={14} style={{ color: palette.gold }} />
            <span className="uppercase" style={{ color: palette.gold, letterSpacing: "0.08em", fontSize: "10px" }}>
              Highest Liquidity Window
            </span>
          </div>
          <div style={{ color: palette.text, fontSize: "13px" }}>
            London &amp; New York overlap, {formatHourLabel(hlStart)} \u2013 {formatHourLabel(hlEnd)} your time
            {highLiquidityActive ? " \u2014 active right now." : "."}
          </div>
        </div>

        <span
          className="block mb-1.5 uppercase"
          style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
        >
          Session Status
        </span>
        {sessionStates.map((s) => {
          const seg = s.segments;
          const rangeStart = seg[0][0];
          const rangeEnd = seg.length === 1 ? seg[0][1] : seg[1][1];
          const rangeLabel = `${formatHourLabel(rangeStart)} \u2013 ${formatHourLabel(rangeEnd)}`;
          const countdownLabel = formatCountdown(s.hours * 3600000);
          return (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-lg px-3 py-3 mb-2"
              style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow, transition: THEME_TRANSITION }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="rounded-full flex-shrink-0"
                  style={{ width: "8px", height: "8px", background: s.color }}
                />
                <div>
                  <div style={{ color: palette.text, fontSize: "14px", marginBottom: "2px" }}>{s.label}</div>
                  <div style={{ color: palette.textMuted, fontSize: "12px" }}>{rangeLabel}</div>
                </div>
              </div>
              <span
                style={{
                  fontFamily: mono,
                  fontSize: "11px",
                  letterSpacing: "0.06em",
                  color: s.isOpen ? palette.green : palette.textFaint,
                  border: `1px solid ${s.isOpen ? palette.green : palette.border}`,
                  borderRadius: "999px",
                  padding: "3px 8px",
                  flexShrink: 0,
                  marginLeft: "8px",
                  textAlign: "right",
                }}
              >
                {s.isOpen ? `OPEN \u00b7 ${countdownLabel} left` : `OPENS IN ${countdownLabel}`}
              </span>
            </div>
          );
        })}

        <p className="text-xs mt-2 mb-4" style={{ color: palette.textFaint }}>
          Standard session hours in UTC: Sydney 22:00—07:00, Tokyo 00:00—09:00, London 08:00—17:00,
          New York 13:00—22:00. Shown here converted to your device's local time (
          {tzName || "detected automatically"}), not adjusted for daylight saving.
        </p>

        <button
          type="button"
          onClick={() => setActiveTab("news")}
          className={`w-full flex items-center justify-center gap-2 rounded-lg py-3 mb-4 ${TAP}`}
          style={{
            background: palette.field,
            border: `1px solid ${palette.border}`,
            color: palette.text,
            fontFamily: mono,
            fontSize: "13px",
            fontWeight: 600,
            transition: `${THEME_TRANSITION}, transform 0.15s ease`,
          }}
        >
          <Newspaper size={16} />
          Check Today's News Events
        </button>
      </>
    );
  }

  return (
    <div
      className="w-full flex justify-center"
      style={{
        background: palette.letterbox,
        height: "100dvh",
        opacity: themeLoaded ? 1 : 0,
        transition: `opacity 0.15s ease-out, ${THEME_TRANSITION}`,
      }}
    >
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .ticker-glow { animation: pulse 3.2s ease-in-out infinite; }
        }
        @keyframes pulse {
          0%, 100% { filter: drop-shadow(0 0 0px rgba(0,0,0,0)); }
          50% { filter: drop-shadow(0 0 8px var(--glow, rgba(231,198,135,0.28))); }
        }
        @media (prefers-reduced-motion: no-preference) {
          .alarm-ring { animation: alarmPulse 1s ease-in-out infinite; }
        }
        @keyframes alarmPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.96) translateY(6px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .modal-in { animation: modalIn 0.18s ease-out; }
        input:focus, select:focus { outline: none; }
        select option { background: ${palette.field}; }
      `}</style>
      <div
        className="w-full flex flex-col"
        style={{ maxWidth: "440px", height: "100%", background: palette.bg, fontFamily: sans, overflow: "hidden", transition: THEME_TRANSITION }}
      >
        <header
          className="px-5 pt-6 pb-4 flex-shrink-0 flex items-center justify-between"
          style={{ borderBottom: `1px solid ${palette.border}`, transition: THEME_TRANSITION }}
        >
          <div>
            <div className="uppercase" style={{ color: palette.gold, letterSpacing: "0.16em", fontSize: "11px", transition: THEME_TRANSITION }}>
              Trade Math Calculator
            </div>
            <h1 className="mt-1" style={{ fontFamily: mono, fontSize: "1.6rem", fontWeight: 700, color: palette.text, letterSpacing: "0.02em", transition: THEME_TRANSITION }}>
              LEDGER
            </h1>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle light/dark mode"
            className={`flex items-center justify-center rounded-full flex-shrink-0 ${TAP}`}
            style={{
              width: "38px",
              height: "38px",
              background: palette.field,
              border: `1px solid ${palette.border}`,
              color: palette.gold,
              boxShadow: palette.shadow,
              transition: `${THEME_TRANSITION}, transform 0.15s ease`,
            }}
          >
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </header>

        <main
          className="px-5 py-5"
          style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", WebkitOverflowScrolling: "touch" }}
        >
          {body}
        </main>

        <nav
          className="flex overflow-x-auto"
          style={{
            flexShrink: 0,
            borderTop: `1px solid ${palette.border}`,
            background: palette.surface,
            boxShadow: palette.navShadow,
            paddingBottom: "env(safe-area-inset-bottom)",
            transition: THEME_TRANSITION,
          }}
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <div key={tab.id} className="flex items-stretch flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center gap-1 py-3 flex-shrink-0 ${TAP}`}
                  style={{
                    color: active ? palette.goldBright : palette.textFaint,
                    minWidth: "64px",
                    background: active ? `${palette.gold}14` : "transparent",
                    transition: `${THEME_TRANSITION}, transform 0.15s ease`,
                  }}
                >
                  <Icon size={18} strokeWidth={active ? 2.4 : 1.8} />
                  <span style={{ fontSize: "10px", letterSpacing: "0.04em" }}>{tab.label}</span>
                </button>
              </div>
            );
          })}
        </nav>
      </div>

      {/* hidden canvas used only to render the weekly-recap share image */}
      <canvas ref={shareCanvasRef} style={{ display: "none" }} />

      {shareImageUrl && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: "rgba(5,7,12,0.85)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
          onClick={closeShare}
        >
          <div
            className="w-full flex flex-col items-center modal-in"
            style={{ maxWidth: "420px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between mb-3">
              <span style={{ color: "#EDEFF3", fontFamily: mono, fontSize: "13px" }}>
                Preview
              </span>
              <button type="button" onClick={closeShare} className={TAP} style={{ color: "#7C8AA0" }} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <img
              src={shareImageUrl}
              alt="My trading week recap"
              className="w-full rounded-2xl mb-3"
              style={{ border: `1px solid ${palette.border}` }}
            />
            <p className="text-xs mb-3 text-center" style={{ color: "#7C8AA0" }}>
              Tip: press and hold (or right-click) the image above to save it directly.
            </p>
            <button
              type="button"
              onClick={downloadShare}
              className={`w-full flex items-center justify-center gap-2 rounded-lg py-3 ${TAP}`}
              style={{
                background: palette.gold,
                color: palette.letterbox,
                fontFamily: mono,
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              <Download size={16} />
              Save Image
            </button>
          </div>
        </div>
      )}

      {viewingScreenshot && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: "rgba(5,7,12,0.9)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
          onClick={() => {
            setViewingScreenshot(null);
            setScreenshotShareMsg("");
          }}
        >
          <div
            className="w-full flex flex-col items-center modal-in"
            style={{ maxWidth: "480px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between mb-3">
              <div>
                <span style={{ color: "#EDEFF3", fontFamily: mono, fontSize: "13px" }}>
                  Trade Screenshot
                </span>
                {viewingScreenshot.trade && (
                  <div style={{ color: "#7C8AA0", fontSize: "12px", marginTop: "2px" }}>
                    {formatDayLabel(dayKeyFromTs(viewingScreenshot.trade.ts))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setViewingScreenshot(null);
                  setScreenshotShareMsg("");
                }}
                className={TAP}
                style={{ color: "#7C8AA0" }}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <img
              src={viewingScreenshot.src}
              alt="Trade screenshot"
              className="w-full rounded-2xl mb-3"
              style={{ border: `1px solid ${palette.border}` }}
            />
            <div className="flex gap-2 w-full">
              <button
                type="button"
                onClick={() => shareImageFile(viewingScreenshot.src, viewingScreenshot.trade)}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-3 ${TAP}`}
                style={{
                  background: palette.gold,
                  color: palette.letterbox,
                  fontFamily: mono,
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                <Share2 size={16} />
                Share
              </button>
              <button
                type="button"
                onClick={() => downloadScreenshot(viewingScreenshot.src, viewingScreenshot.trade)}
                className={`flex items-center justify-center rounded-lg py-3 px-4 ${TAP}`}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "#EDEFF3",
                }}
                aria-label="Download screenshot"
                title="Download"
              >
                <Download size={16} />
              </button>
            </div>
            {screenshotShareMsg && (
              <p className="text-xs mt-2 text-center" style={{ color: "#7C8AA0" }}>
                {screenshotShareMsg}
              </p>
            )}
          </div>
        </div>
      )}

      {pendingScreenshotDelete && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-6"
          style={{ background: "rgba(5,7,12,0.85)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
          onClick={cancelDeleteScreenshot}
        >
          <div
            className="w-full modal-in rounded-2xl p-5"
            style={{ maxWidth: "300px", background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ color: palette.text, fontSize: "14px", fontWeight: 600, marginBottom: "6px", transition: THEME_TRANSITION }}>
              Delete this screenshot?
            </div>
            <p className="text-xs mb-4" style={{ color: palette.textMuted, transition: THEME_TRANSITION }}>
              This can't be undone.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={cancelDeleteScreenshot}
                className={`flex-1 rounded-lg py-2.5 ${TAP}`}
                style={{
                  background: "transparent",
                  border: `1px solid ${palette.border}`,
                  color: palette.textMuted,
                  fontFamily: mono,
                  fontSize: "13px",
                  transition: THEME_TRANSITION,
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteScreenshot}
                className={`flex-1 rounded-lg py-2.5 ${TAP}`}
                style={{
                  background: palette.red,
                  color: "#FFFFFF",
                  fontFamily: mono,
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {ringingEvent && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-6"
          style={{ background: "rgba(5,7,12,0.92)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
        >
          <div className="w-full flex flex-col items-center text-center modal-in" style={{ maxWidth: "360px" }}>
            <div className="alarm-ring mb-4" style={{ color: palette.gold }}>
              <Bell size={48} />
            </div>
            <div
              className="uppercase mb-1"
              style={{ color: "#7C8AA0", letterSpacing: "0.12em", fontSize: "11px" }}
            >
              Alarm
            </div>
            <div
              style={{ fontFamily: mono, fontSize: "1.4rem", fontWeight: 700, color: "#EDEFF3", marginBottom: "6px" }}
            >
              {ringingEvent.name}
            </div>
            <div style={{ color: "#7C8AA0", fontSize: "13px", marginBottom: "28px" }}>
              Scheduled for {ringingEvent.time} today
            </div>
            <div className="flex gap-2 w-full">
              <button
                type="button"
                onClick={snoozeAlarm}
                className={`flex-1 rounded-lg py-3 ${TAP}`}
                style={{
                  background: palette.field,
                  border: `1px solid ${palette.border}`,
                  color: "#EDEFF3",
                  fontFamily: mono,
                  fontSize: "14px",
                }}
              >
                Snooze 5m
              </button>
              <button
                type="button"
                onClick={dismissAlarm}
                className={`flex-1 rounded-lg py-3 ${TAP}`}
                style={{
                  background: palette.gold,
                  color: palette.letterbox,
                  fontFamily: mono,
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Mount: this file is loaded directly in the browser via Babel
// standalone (see index.html) rather than bundled with a build tool, so
// the app needs to mount itself here instead of a separate main.jsx.
const rootEl = document.getElementById("root");
if (rootEl) {
  createRoot(rootEl).render(<LedgerApp />);
}
