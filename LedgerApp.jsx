import React, { useState, useEffect, useRef, useMemo, Fragment } from "react";
import { Scale, LineChart as CurveIcon, ArrowLeftRight, Trash2, Plus, ChevronLeft, ChevronRight, ChevronDown, RotateCcw, Newspaper, Share2, X, Download, Upload, Copy, Sun, Moon, Bell, Info, Camera, Pencil, Check, Clock, Lightbulb, BookOpen, ClipboardCheck, TrendingUp, Flame, Target, FileText, Search, Minus, WrapText, CalendarClock, Settings, Palette, LayoutGrid, ShieldAlert, Tags, Table2, AlertTriangle, Building2, Filter } from "lucide-react";
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
  PieChart,
  Pie,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  LabelList,
} from "recharts";

// --- localStorage shim for window.storage (drop-in replacement) ---
if (typeof window !== "undefined" && !window.storage) {
  window.storage = {
    async get(key, shared = false) {
      const raw = localStorage.getItem(key);
      if (raw === null) {
        // Matches the original API: missing keys throw, not return null
        throw new Error(`Key not found: ${key}`);
      }
      return { key, value: raw, shared: !!shared };
    },

    async set(key, value, shared = false) {
      try {
        localStorage.setItem(key, value);
        return { key, value, shared: !!shared };
      } catch (err) {
        // e.g. quota exceeded (common with lots of base64 screenshots)
        console.error("localStorage set failed:", err);
        return null;
      }
    },

    async delete(key, shared = false) {
      try {
        localStorage.removeItem(key);
        return { key, deleted: true, shared: !!shared };
      } catch (err) {
        console.error("localStorage delete failed:", err);
        return null;
      }
    },

    async list(prefix = "", shared = false) {
      try {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(prefix)) keys.push(k);
        }
        return { keys, prefix, shared: !!shared };
      } catch (err) {
        console.error("localStorage list failed:", err);
        return null;
      }
    },
  };
}

const DARK_PALETTE = {
  bg: "#12151C",
  letterbox: "#0A0C11",
  surface: "#1E2330",
  field: "#262C3D",
  border: "#3A4258",
  text: "#F5F6F9",
  textMuted: "#A3AEC4",
  textFaint: "#68738F",
  gold: "#E0AC5F",
  goldBright: "#FFD695",
  green: "#63D4A4",
  red: "#F0897E",
  shadow: "0 4px 10px rgba(0,0,0,0.4), 0 16px 36px rgba(0,0,0,0.45)",
  glow: "rgba(255,214,149,0.4)",
  navShadow: "0 -6px 20px rgba(0,0,0,0.4)",
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

const AMBER_PALETTE = {
  bg: "#0B0A09",
  letterbox: "#060505",
  surface: "#181614",
  field: "#211E1A",
  border: "#3D372F",
  text: "#F3EFE8",
  textMuted: "#ADA598",
  textFaint: "#726A5C",
  gold: "#D99A44",
  goldBright: "#EFC06B",
  green: "#6FC492",
  red: "#E27860",
  shadow: "0 4px 10px rgba(0,0,0,0.5), 0 16px 36px rgba(0,0,0,0.5)",
  glow: "rgba(239,192,107,0.3)",
  navShadow: "0 -6px 20px rgba(0,0,0,0.5)",
};

const FOREST_PALETTE = {
  bg: "#0D140F",
  letterbox: "#070B08",
  surface: "#16211A",
  field: "#1E2B22",
  border: "#35473C",
  text: "#EAF2EC",
  textMuted: "#9FB3A4",
  textFaint: "#6B7D70",
  gold: "#D9A441",
  goldBright: "#F0C36B",
  green: "#4FC98A",
  red: "#E2735C",
  shadow: "0 4px 10px rgba(0,0,0,0.45), 0 16px 36px rgba(0,0,0,0.5)",
  glow: "rgba(217,164,65,0.35)",
  navShadow: "0 -6px 20px rgba(0,0,0,0.45)",
};

const palette = { ...DARK_PALETTE };

const mono =
  "'JetBrains Mono','SF Mono','Roboto Mono',ui-monospace,Menlo,Consolas,monospace";
const sans =
  "'Sora','Inter','Manrope',system-ui,-apple-system,'Segoe UI',sans-serif";
const display =
  "'Sora',ui-sans-serif,system-ui,-apple-system,sans-serif";

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

const SETUPS = [
  { id: "reversal", label: "Reversal" },
  { id: "pullback", label: "Pullback" },
  { id: "trend", label: "Trend" },
  { id: "breakout", label: "Breakout" },
];
const setupMeta = (id) => SETUPS.find((s) => s.id === id);

const MAX_CUSTOM_SETUPS = 6;
const CUSTOM_SETUPS_STORAGE_KEY = "equity-curve:custom-setups";
const HIDDEN_DEFAULT_SETUPS_KEY = "equity-curve:hidden-default-setups";

const MAX_CUSTOM_MOODS = 6;
const CUSTOM_MOODS_STORAGE_KEY = "equity-curve:custom-moods";

const SETTINGS_STORAGE_KEY = "ledger:settings:v1";
const DEFAULT_SETTINGS = {
  themeMode: "dark",
  defaultLandingTab: "risk",
  defaultAccountBalance: "",
  sizeRiskInputMode: "percent", // "percent" | "dollar"
  revengeLockEnabled: false,
  revengeWindowMinutes: "15",
  dailyLossLimit: "",
  maxTradesPerDay: "",
  alarmLeadMinutes: "15",
  hideDollarInShare: true,
  autoSyncTradesToJournal: false,
  showOnboardingTips: true,
  onboardingDismissed: [],
  traderAlias: "",
  statementPeriodType: "month",
  defaultInsightsTab: "overview",
  heatmapWeeksBack: "26",
  hiddenTabs: [],
  mobileNavPinnedTabs: [],
  journalTableLayout: "auto", // "auto" | "cards" | "table"
  showRevengeTag: true,
  tourCompleted: false,
};

const NOTE_TAGS = ["FOMO", "Followed plan", "News trade"];

export const RUNTIME = {
  REVENGE_WINDOW_MINUTES: 15,
  REVENGE_WINDOW_MS: 15 * 60 * 1000,
  ALARM_LEAD_MINUTES: 15,
  ALARM_LEAD_MS: 15 * 60 * 1000,
};
export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const ALARM_CHECK_INTERVAL_MS = 15000;
const ALARM_STALE_WINDOW_MS = 10 * 60 * 1000;

const SCREENSHOT_MAX_DIM = 1600;
const SCREENSHOT_START_QUALITY = 0.92;
const SCREENSHOT_MIN_QUALITY = 0.5;
const SCREENSHOT_MAX_BYTES = 1_200_000;
const SCREENSHOT_MAX_PER_TRADE = 2;

function tradeScreenshots(t) {
  if (Array.isArray(t.screenshots)) return t.screenshots;
  if (t.screenshot) return [t.screenshot];
  return [];
}

function dataUrlBytes(dataUrl) {
  const commaIdx = dataUrl.indexOf(",");
  const base64Len = dataUrl.length - (commaIdx + 1);
  return Math.floor((base64Len * 3) / 4);
}

function dataUrlToFile(dataUrl, filename) {
  const [header, base64] = dataUrl.split(",");
  const mimeMatch = header.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
}

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
  NGN: 1530,
};
const FX_SNAPSHOT_LABEL = "Aug 2026";

const FX_LIVE_STORAGE_KEY = "fx:live-rates:v1";
const FX_CACHE_MS = 12 * 60 * 60 * 1000;
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
  NGN: "Nigerian Naira",
};

const CURRENCY_CODES = Object.keys(FX_RATES_PER_USD);

function Field({ label, value, onChange, suffix, placeholder, readOnly, isDesktop }) {
  return (
    <label className="block mb-4">
      <span
        className="block mb-1.5 uppercase"
        style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px", transition: THEME_TRANSITION }}
      >
        {label}
      </span>
      <div
        className="flex items-center px-3.5"
        style={{
          background: readOnly ? palette.surface : palette.field,
          border: `1px solid ${palette.border}`,
          borderRadius: "12px",
          transition: `${THEME_TRANSITION}, border-color 0.15s ease`,
        }}
        onFocusCapture={(e) => { e.currentTarget.style.borderColor = palette.gold; }}
        onBlurCapture={(e) => { e.currentTarget.style.borderColor = palette.border; }}
      >
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          readOnly={readOnly}
          tabIndex={readOnly ? -1 : undefined}
          className={isDesktop ? "w-full bg-transparent py-4 outline-none" : "w-full bg-transparent py-3 outline-none"}
          style={{
            color: readOnly ? palette.textMuted : palette.text,
            fontFamily: mono,
            fontSize: isDesktop ? "18px" : "16px",
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

function SettingsSection({ icon: Icon, title, description, danger, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const accent = danger ? palette.red : palette.gold;
  return (
    <div
      className="mb-4 overflow-hidden"
      style={{
        background: danger ? `${palette.red}0A` : palette.field,
        border: `1px solid ${danger ? `${palette.red}55` : palette.border}`,
        borderRadius: "16px",
        transition: THEME_TRANSITION,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 p-4 text-left"
        style={{ background: "transparent" }}
      >
        {Icon && (
          <span
            className="flex items-center justify-center rounded-lg flex-shrink-0"
            style={{
              width: "28px",
              height: "28px",
              background: `${accent}1E`,
              color: accent,
            }}
          >
            <Icon size={14} strokeWidth={2.2} />
          </span>
        )}
        <span
          style={{
            fontFamily: display,
            fontSize: "12.5px",
            fontWeight: 700,
            color: danger ? palette.red : palette.text,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            flex: 1,
          }}
        >
          {title}
        </span>
        <ChevronDown
          size={16}
          style={{
            color: palette.textFaint,
            flexShrink: 0,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
          }}
        />
      </button>
      {open && (
        <div className="px-4 pb-4">
          {description && (
            <p className="text-xs mb-3" style={{ color: palette.textFaint }}>
              {description}
            </p>
          )}
          {children}
        </div>
      )}
    </div>
  );
}

function SettingsSubLabel({ children }) {
  return (
    <span
      className="block mb-1.5 uppercase"
      style={{ color: palette.textMuted, letterSpacing: "0.07em", fontSize: "10.5px", fontWeight: 600 }}
    >
      {children}
    </span>
  );
}

function StatChip({ label, value, onClick, isDesktop }) {
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
      className={`p-3.5 ${onClick ? `${TAP}` : ""}`}
      style={{
        background: palette.surface,
        border: `1px solid ${palette.border}`,
        borderRadius: "14px",
        boxShadow: palette.shadow,
        cursor: onClick ? "pointer" : "default",
        transition: `${THEME_TRANSITION}, box-shadow 0.15s ease, border-color 0.15s ease`,
      }}
    >
      <div
        className="uppercase mb-1.5 flex items-center gap-1"
        style={{ color: palette.textFaint, letterSpacing: "0.07em", fontSize: "10.5px", fontWeight: 600, transition: THEME_TRANSITION }}
      >
        {label}
        {onClick && <Info size={10} style={{ opacity: 0.7, flexShrink: 0 }} />}
      </div>
      <div
        style={{
          fontFamily: mono,
          fontSize: isDesktop ? "1.4rem" : "1.08rem",
          fontWeight: 600,
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
      style={{
        background: palette.surface,
        border: `1px solid ${palette.border}`,
        borderLeft: `3px solid ${pass === undefined ? palette.border : pass ? palette.green : palette.red}`,
        boxShadow: palette.shadow,
        transition: THEME_TRANSITION,
      }}
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

function Readout({ eyebrow, value, unit, sub, tone, isDesktop, rightContent }) {
  const toneColor =
    tone === "good" ? palette.green : tone === "bad" ? palette.red : palette.goldBright;
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 mb-6"
      style={{
        background: `linear-gradient(135deg, ${palette.surface} 0%, ${palette.field}CC 100%)`,
        border: `1px solid ${palette.gold}22`,
        borderRadius: "18px",
        boxShadow: `${palette.shadow}, 0 0 0 1px ${palette.gold}0A inset`,
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
        <div className="flex items-start justify-between gap-2">
          <div
            className="uppercase mb-2 flex items-center gap-2"
            style={{ color: palette.textMuted, letterSpacing: "0.12em", fontSize: "11px", transition: THEME_TRANSITION }}
          >
            <span style={{ width: "4px", height: "4px", borderRadius: "999px", background: palette.gold, display: "inline-block" }} />
            {eyebrow}
          </div>
          {rightContent && isDesktop && (
            <div className="text-right flex-shrink-0" style={{ marginLeft: "8px" }}>
              {rightContent}
            </div>
          )}
        </div>
        <div className="flex items-baseline gap-2 ticker-glow">
          <span
            style={{
              fontFamily: mono,
              fontSize: isDesktop ? "3.2rem" : "2.15rem",
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
        {rightContent && !isDesktop && (
          <div
            className="mt-3 pt-3"
            style={{ borderTop: `1px dashed ${palette.border}` }}
          >
            {rightContent}
          </div>
        )}
      </div>
    </div>
  );
}

const TABS = [
  { id: "risk", label: "Challenge", icon: Scale },
  { id: "propfirm", label: "Prop Firm", icon: Building2 },
  { id: "fx", label: "Convert", icon: ArrowLeftRight },
  { id: "curve", label: "Curve", icon: CurveIcon },
  { id: "insights", label: "Insights", icon: Lightbulb },
  { id: "journal", label: "Journal", icon: BookOpen },
  { id: "notepad", label: "Notepad", icon: FileText },
  { id: "sessions", label: "Sessions", icon: Clock },
];

const MOBILE_NAV_PRIMARY_COUNT = 4;

const TOUR_STEPS = [
  {
    id: "welcome",
    title: "Welcome to Ledger",
    text: "Quick tour of the app \u2014 about 10 steps. Skip anytime with the button below.",
  },
  {
    id: "tab-risk",
    tabId: "risk",
    target: "tab-risk",
    title: "Challenge Calculator",
    text: "Track profit targets, daily/max drawdown, consistency rules, and position sizing for prop firm challenges.",
  },
  {
    id: "tab-propfirm",
    tabId: "propfirm",
    target: "tab-propfirm",
    title: "Prop Firm Rules",
    text: "Look up a firm's published rules and apply them straight into the Challenge calculator.",
  },
  {
    id: "tab-fx",
    tabId: "fx",
    target: "tab-fx",
    title: "Currency Convert",
    text: "Convert between currencies using live daily rates, or override with your broker's exact rate.",
  },
  {
    id: "tab-curve",
    tabId: "curve",
    target: "tab-curve",
    title: "Equity Curve",
    text: "Log trades, watch your equity curve build, check the calendar, and share a weekly recap.",
  },
  {
    id: "tab-insights",
    tabId: "insights",
    target: "tab-insights",
    title: "Insights",
    text: "Deeper analytics \u2014 performance heatmap, discipline grade, setup and mood breakdowns.",
  },
  {
    id: "tab-journal",
    tabId: "journal",
    target: "tab-journal",
    title: "Trade Journal",
    text: "A full spreadsheet-style journal plus a Playbook to track how well you follow your own rules.",
  },
  {
    id: "tab-notepad",
    tabId: "notepad",
    target: "tab-notepad",
    title: "Notepad",
    text: "Quick notes separate from your trade journal \u2014 watchlists, plans, anything else.",
  },
  {
    id: "tab-sessions",
    tabId: "sessions",
    target: "tab-sessions",
    title: "Sessions & News",
    text: "Track market session hours in your local time and set alarms for upcoming news events.",
  },
  {
    id: "settings-btn",
    target: "settings-btn",
    title: "Settings",
    text: "Customize theme, defaults, risk limits, tags, and more. You're all set \u2014 happy trading!",
  },
];

const NOTEPAD_STORAGE_KEY = "notepad:notes";
const NOTEPAD_FONT_SIZES = [12, 13, 14, 16, 18, 20, 24];
const DEFAULT_NOTEPAD_FONT_SIZE = 14;
const MAX_JOURNAL_PHOTOS_PER_ROW = 2;

function makeBlockId() {
  return `blk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function migrateNoteShape(n) {
  if (Array.isArray(n.blocks)) return n;
  const blocks = [{ id: makeBlockId(), type: "text", text: n.content || "" }];
  (Array.isArray(n.images) ? n.images : []).forEach((src) => {
    blocks.push({ id: makeBlockId(), type: "image", src });
  });
  const { content, images, ...rest } = n;
  return { ...rest, blocks };
}

function blocksText(blocks) {
  return (blocks || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text || "")
    .join("");
}

function countWords(text) {
  const trimmed = (text || "").trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function countLines(blocks) {
  const text = blocksText(blocks);
  if (!text) return 1;
  return text.split("\n").length;
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countOccurrencesInBlocks(blocks, find) {
  if (!find) return 0;
  const re = new RegExp(escapeRegExp(find), "gi");
  let total = 0;
  (blocks || []).forEach((b) => {
    if (b.type !== "text") return;
    const matches = (b.text || "").match(re);
    if (matches) total += matches.length;
  });
  return total;
}

function replaceAllInBlocks(blocks, find, replaceWith) {
  const re = new RegExp(escapeRegExp(find), "gi");
  return (blocks || []).map((b) =>
    b.type === "text" ? { ...b, text: (b.text || "").replace(re, replaceWith) } : b
  );
}

function notePreview(blocks, maxLen = 90) {
  const flat = blocksText(blocks).replace(/\s+/g, " ").trim();
  if (!flat) return "";
  return flat.length > maxLen ? `${flat.slice(0, maxLen)}\u2026` : flat;
}

function blocksToExportText(blocks) {
  return (blocks || []).map((b) => (b.type === "image" ? "\n[Image attached]\n" : b.text || "")).join("");
}

function autoGrowBlock(el) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

const JOURNAL_STORAGE_KEY = "journal:entries";
const JOURNAL_COLS_STORAGE_KEY = "journal:col-widths";
const TREND_OPTIONS = [
  { id: "uptrend", label: "Uptrend" },
  { id: "downtrend", label: "Downtrend" },
  { id: "range", label: "Range" },
];
const OUTCOME_OPTIONS = [
  { id: "win", label: "Win" },
  { id: "loss", label: "Loss" },
  { id: "breakeven", label: "Breakeven" },
];
const CONFIDENCE_OPTIONS = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
];
const outcomeLabel = (id) => OUTCOME_OPTIONS.find((o) => o.id === id)?.label || "";
const confidenceLabel = (id) => CONFIDENCE_OPTIONS.find((c) => c.id === id)?.label || "";
const moodLabelFor = (id) => emotionMeta(id)?.label || "";
const sessionLabelFor = (id) => MARKET_SESSIONS.find((s) => s.id === id)?.label || "";
const JOURNAL_COLUMNS = [
  { id: "date", label: "Date" },
  { id: "pair", label: "Pair" },
  { id: "trend", label: "Trend" },
  { id: "rr", label: "R:R" },
  { id: "pnl", label: "PnL" },
  { id: "setup", label: "Setup" },
  { id: "outcome", label: "Outcome" },
];
const JOURNAL_DETAIL_FIELDS = [
  { id: "session", label: "Session" },
  { id: "mood", label: "Mood" },
  { id: "confidence", label: "Confidence" },
  { id: "entryPrice", label: "Entry Price" },
  { id: "closingPrice", label: "Closing Price" },
  { id: "mistake", label: "Mistake" },
  { id: "note", label: "Note" },
];

const DEFAULT_JOURNAL_COL_WIDTHS = { date: 140, pair: 110, trend: 130, rr: 80, pnl: 90, setup: 130, outcome: 110 };
const JOURNAL_TOGGLE_COL_WIDTH = 34;
const JOURNAL_COL_MIN = 56;
const JOURNAL_COL_MAX = 280;

const PLAYBOOK_RULES_KEY = "playbook:rules";
const PLAYBOOK_CHECKINS_KEY = "playbook:checkins";
const PLAYBOOK_STARTER_RULES = [
  "Only trade my planned setups",
  "Never risk more than 1-2% per trade",
  "No trades within 15 minutes of a loss",
];
const MAX_PLAYBOOK_RULES = 10;

function isCleanCheckin(checkin) {
  const ids = Object.keys(checkin.results || {});
  return ids.length > 0 && ids.every((id) => checkin.results[id]);
}

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

const MARKET_SESSIONS = [
  { id: "asia", label: "Asia", startUTC: 22, endUTC: 9, color: "#6C8EBF" },
  { id: "london", label: "London", startUTC: 8, endUTC: 17, color: "#6CBF8E" },
  { id: "newyork", label: "New York", startUTC: 13, endUTC: 22, color: "#BFA26C" },
];

function mod24(h) {
  return ((h % 24) + 24) % 24;
}

function sessionOpenAtUTCHour(session, hourUTC) {
  const h = mod24(hourUTC);
  if (session.startUTC <= session.endUTC) {
    return h >= session.startUTC && h < session.endUTC;
  }
  return h >= session.startUTC || h < session.endUTC;
}

function sessionOpenAtLocalHour(session, localHour, tzOffsetMinutes) {
  return sessionOpenAtUTCHour(session, localHour + tzOffsetMinutes / 60);
}

function sessionLocalSegments(session, tzOffsetMinutes) {
  const localStart = mod24(session.startUTC - tzOffsetMinutes / 60);
  const localEnd = mod24(session.endUTC - tzOffsetMinutes / 60);
  if (localStart <= localEnd) return [[localStart, localEnd]];
  return [
    [localStart, 24],
    [0, localEnd],
  ];
}

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
const GOALS_STORAGE_KEY = "ledger:goals";
const FX_LAST_PAIR_KEY = "fx:last-pair";
const EDGE_STORAGE_KEY = "ledger:edge-inputs";
const CS_STORAGE_KEY = "ledger:challenge-inputs";
const LINKED_FIRM_KEY = "ledger:linked-firm";
const PS_STORAGE_KEY = "ledger:size-inputs";
const ACCOUNTS_LIST_KEY = "ledger:accounts:list";
const ACCOUNTS_ACTIVE_KEY = "ledger:accounts:active";
const scopedKey = (base, accountId) => `${base}:${accountId}`;

const DEFAULT_CS_INPUTS = {
  startBal: "",
  currentBal: "",
  targetPct: "10",
  dailyLossPct: "5",
  todayLoss: "",
  bestDay: "",
  rule: "30",
  maxDrawdownPct: "4",
  ddMode: "trail",
  minTradingDays: "0",
  minTrades: "0",
  minDayGainPct: "0",
  profitSplitPct: "80",
  profitSplitEnabled: true,
};

const PROFIT_TARGET_OPTIONS = [5, 6, 8, 10, 12];

const EDGE_CURVE_MAX_TRADES = 200; // cap for chart performance/readability

const EDGE_PROJECTION_PERIODS = [
  { label: "1 Week", days: 7 },
  { label: "1 Month", days: 30 },
  { label: "3 Months", days: 90 },
  { label: "6 Months", days: 180 },
  { label: "1 Year", days: 365 },
  { label: "5 Years", days: 1825 },
  { label: "10 Years", days: 3650 },
];

// Source: nextlevelfunded.com official pricing page (live fetch) + nextlevelfunded.com/faqs, checked 2026-09-09.
// FAQ confirms: a "profitable trading day" = at least 0.5% profit of account balance
// (applies across all standard evaluation types), and NLF advertises a 100% profit
// split on all standard account types (their $10/$25 "Special" beginner accounts are
// capped at 50%, but those aren't modeled here).
const PROP_FIRMS = [
  {
    id: "nextlevelfunded",
    name: "NextLevelFunded",
    lastChecked:"",
    sourceNote: "nextlevelfunded.com official pricing page + nextlevelfunded.com/faqs",
    plans: [
      {
        id: "nlf-1step",
        label: "1 Step",
        blurb: "Single phase, 8% target, no Pro pricing bump.",
        maxRiskPct: "1.5",
        twoMinRule: true,
        slRule: true,
        minTradingDays: 4,
        maxTradingDays: "Unlimited",
        minDayGainPct: "0.5",
        profitSplitPct: "100",
        phases: [
          { label: "Evaluation", targetPct: "8", dailyLossPct: "3", maxDrawdownPct: "7", ddMode: "static", consistencyPct: "30" },
        ],
        sizes: [5000, 10000, 25000, 50000, 100000, 200000].map((amount) => ({ amount, verified: true })),
      },
      {
        id: "nlf-1step-pro",
        label: "1 Step Pro",
        blurb: "Single phase, higher 11% target, wider drawdown room.",
        maxRiskPct: "1.5",
        twoMinRule: true,
        slRule: true,
        minTradingDays: 5,
        maxTradingDays: "Unlimited",
        minDayGainPct: "0.5",
        profitSplitPct: "100",
        phases: [
          { label: "Evaluation", targetPct: "11", dailyLossPct: "3", maxDrawdownPct: "11", ddMode: "static", consistencyPct: "30" },
        ],
        sizes: [5000, 10000, 25000, 50000, 100000, 200000].map((amount) => ({ amount, verified: true })),
      },
      {
        id: "nlf-2step",
        label: "2 Step",
        blurb: "Two phases, 8% then 6% target, wider daily/overall room than Pro.",
        maxRiskPct: "1.5",
        twoMinRule: true,
        slRule: true,
        minTradingDays: 5,
        maxTradingDays: "Unlimited",
        minDayGainPct: "0.5",
        profitSplitPct: "100",
        phases: [
          { label: "Phase 1", targetPct: "8", dailyLossPct: "5", maxDrawdownPct: "12", ddMode: "static", consistencyPct: "30" },
          { label: "Phase 2", targetPct: "6", dailyLossPct: "5", maxDrawdownPct: "12", ddMode: "static", consistencyPct: "30" },
        ],
        sizes: [5000, 10000, 25000, 50000, 100000, 200000].map((amount) => ({ amount, verified: true })),
      },
      {
        id: "nlf-2step-pro",
        label: "2 Step Pro",
        blurb: "Two phases, 6% both targets, tighter daily/overall drawdown.",
        maxRiskPct: "1.5",
        twoMinRule: true,
        slRule: true,
        minTradingDays: 5,
        maxTradingDays: "Unlimited",
        minDayGainPct: "0.5",
        profitSplitPct: "100",
        phases: [
          { label: "Phase 1", targetPct: "6", dailyLossPct: "4", maxDrawdownPct: "8", ddMode: "static", consistencyPct: "30" },
          { label: "Phase 2", targetPct: "6", dailyLossPct: "4", maxDrawdownPct: "8", ddMode: "static", consistencyPct: "30" },
        ],
        sizes: [5000, 10000, 25000, 50000, 100000, 200000].map((amount) => ({ amount, verified: true })),
      },
      {
        id: "nlf-instant-flex",
        label: "Instant Flex",
        blurb: "Funded immediately, tightest max-risk-per-trade of any NLF plan, capped daily payouts.",
        maxRiskPct: "1",
        twoMinRule: true,
        slRule: true,
        minTradingDays: null,
        minTrades: 10,
        maxTradingDays: "Unlimited",
        minDayGainPct: "0.5",
        profitSplitPct: "100",
        phases: [
          { label: "Funded from day 1", targetPct: "instant", dailyLossPct: "3", maxDrawdownPct: "4", ddMode: "trail", consistencyPct: "15" },
        ],
        sizes: [
          { amount: 10000, verified: true, payoutCap: 100 },
          { amount: 50000, verified: true, payoutCap: 500 },
          { amount: 100000, verified: true, payoutCap: 1000 },
          { amount: 200000, verified: true, payoutCap: 1500 },
          { amount: 300000, verified: true, payoutCap: 2000 },
          { amount: 400000, verified: true, payoutCap: 2500 },
          { amount: 500000, verified: true, payoutCap: 3000 },
        ],
      },
      {
        id: "nlf-instant-pro",
        label: "Instant Pro",
        blurb: "Funded immediately, moderate drawdown, 15% consistency rule, 5 profitable days needed for payout.",
        maxRiskPct: "1.5",
        twoMinRule: true,
        slRule: true,
        minTradingDays: 5,
        maxTradingDays: "Unlimited",
        minDayGainPct: "0.5",
        profitSplitPct: "100",
        phases: [
          { label: "Funded from day 1", targetPct: "instant", dailyLossPct: "3", maxDrawdownPct: "6", ddMode: "trail", consistencyPct: "15" },
        ],
        sizes: [5000, 10000, 25000, 50000, 100000, 200000].map((amount) => ({ amount, verified: true })),
      },
      {
        id: "nlf-instant-crown",
        label: "Instant Crown",
        blurb: "Funded immediately, tightest drawdown of the Instant models, but no consistency rule and no minimum days at all.",
        maxRiskPct: "1.5",
        twoMinRule: true,
        slRule: true,
        minTradingDays: null,
        minTrades: 10,
        maxTradingDays: "Unlimited",
        minDayGainPct: "0",
        profitSplitPct: "90",
        phases: [
          { label: "Funded from day 1", targetPct: "instant", dailyLossPct: "2", maxDrawdownPct: "4", ddMode: "trail", consistencyPct: "0" },
        ],
        sizes: [5000, 10000, 25000, 50000, 100000, 200000].map((amount) => ({ amount, verified: true })),
      },
    ],
  },
  {
    id: "fundingpips",
    name: "FundingPips",
    lastChecked: "",
    sourceNote: "fundingpips.com/trading-objectives + individual model articles on help.fundingpips.com",
    plans: [
      {
        id: "fp-1step-flex",
        label: "1 Step Flex",
        blurb: "Single phase, 12% target, no minimum trading days, flat 85% bi-weekly split.",
        maxRiskPct: "1",
        twoMinRule: false,
        slRule: false,
        minTradingDays: 0,
        maxTradingDays: "Unlimited",
        minDayGainPct: "0",
        profitSplitPct: "85",
        phases: [
          { label: "Evaluation", targetPct: "12", dailyLossPct: "3", maxDrawdownPct: "12", ddMode: "static", consistencyPct: "0" },
        ],
        sizes: [5000, 10000, 25000, 50000, 100000].map((amount) => ({ amount, verified: true })),
      },
      {
        id: "fp-2step-standard",
        label: "2 Step Standard",
        blurb: "Two phases, 8% then 5% target, widest choice of reward cycle once funded.",
        maxRiskPct: "1.5",
        twoMinRule: false,
        slRule: false,
        minTradingDays: 3,
        maxTradingDays: "Unlimited",
        minDayGainPct: "0",
        profitSplitPct: "80",
        phases: [
          { label: "Phase 1", targetPct: "8", dailyLossPct: "5", maxDrawdownPct: "10", ddMode: "static", consistencyPct: "0" },
          { label: "Phase 2", targetPct: "5", dailyLossPct: "5", maxDrawdownPct: "10", ddMode: "static", consistencyPct: "0" },
        ],
        sizes: [5000, 10000, 25000, 50000, 100000].map((amount) => ({ amount, verified: true })),
      },
      {
        id: "fp-2step-flex",
        label: "2 Step Flex",
        blurb: "Two phases, 10% then 6% target, wider daily/overall drawdown than Pro, choose your split (85%/95%/100%) at purchase.",
        maxRiskPct: "1.5",
        twoMinRule: false,
        slRule: false,
        minTradingDays: 1,
        maxTradingDays: "Unlimited",
        minDayGainPct: "0",
        profitSplitPct: "85",
        phases: [
          { label: "Phase 1", targetPct: "10", dailyLossPct: "4", maxDrawdownPct: "12", ddMode: "static", consistencyPct: "0" },
          { label: "Phase 2", targetPct: "6", dailyLossPct: "4", maxDrawdownPct: "12", ddMode: "static", consistencyPct: "0" },
        ],
        sizes: [5000, 10000, 25000, 50000, 100000].map((amount) => ({ amount, verified: true })),
      },
      {
        id: "fp-2step-pro",
        label: "2 Step Pro",
        blurb: "Two phases, 6% target in both, tightest drawdown of the lineup, sizes up to $200K.",
        maxRiskPct: "1",
        twoMinRule: false,
        slRule: false,
        minTradingDays: 2,
        maxTradingDays: "Unlimited",
        minDayGainPct: "0",
        profitSplitPct: "80",
        phases: [
          { label: "Phase 1", targetPct: "6", dailyLossPct: "3", maxDrawdownPct: "6", ddMode: "static", consistencyPct: "0" },
          { label: "Phase 2", targetPct: "6", dailyLossPct: "3", maxDrawdownPct: "6", ddMode: "static", consistencyPct: "0" },
        ],
        sizes: [5000, 10000, 25000, 50000, 100000, 200000].map((amount) => ({ amount, verified: true })),
      },
      {
        id: "fp-zero",
        label: "Zero",
        blurb: "No evaluation, funded from day one. 95% bi-weekly split, 15% consistency cap, needs 7 profitable days (\u22650.25% each) per rolling 30 to unlock a reward.",
        maxRiskPct: "1",
        twoMinRule: false,
        slRule: false,
        minTradingDays: null,
        maxTradingDays: "Unlimited",
        minDayGainPct: "0.25",
        profitSplitPct: "95",
        phases: [
          { label: "Funded from day 1", targetPct: "instant", dailyLossPct: "3", maxDrawdownPct: "5", ddMode: "trail", consistencyPct: "15" },
        ],
        sizes: [5000, 10000, 25000, 50000, 100000, 200000].map((amount) => ({ amount, verified: true })),
      },
    ],
  },
  {
    id: "blueguardian",
    name: "Blue Guardian",
    lastChecked: "",
    sourceNote: "checkout.blueguardian.com live account-size selector + blueguardian.com/blogs (\"1-Step Standard vs 1-Step Nano\", \"2-Step Standard vs 2-Step Nano\", \"Blue Guardian $25K Account Review\" — all published/checked Aug–Sep 2026).",
    plans: [
      {
        id: "bg-instant",
        label: "Instant",
        blurb: "No evaluation, funded from day one. 6% trailing drawdown, 5 profitable days (≥0.5% each) needed before payout, 20% consistency rule.",
        maxRiskPct: "1",
        twoMinRule: true,
        slRule: false,
        minTradingDays: 5,
        maxTradingDays: "Unlimited",
        minDayGainPct: "0.5",
        profitSplitPct: "80",
        phases: [
          { label: "Funded from day 1", targetPct: "instant", dailyLossPct: "3", maxDrawdownPct: "6", ddMode: "trail", consistencyPct: "20" },
        ],
        sizes: [5000, 10000, 25000, 50000, 100000, 150000, 200000, 300000, 400000].map((amount) => ({ amount, verified: true })),
      },
      {
        id: "bg-instant-starter",
        label: "Instant Starter",
        blurb: "$5K only, one-time account: single payout capped at 5% of balance ($250), then the account closes permanently.",
        maxRiskPct: "1",
        twoMinRule: true,
        slRule: false,
        minTradingDays: 5,
        maxTradingDays: "Unlimited",
        minDayGainPct: "0.5",
        profitSplitPct: "90",
        phases: [
          { label: "Funded from day 1", targetPct: "instant", dailyLossPct: "3", maxDrawdownPct: "5", ddMode: "trail", consistencyPct: "15" },
        ],
        sizes: [{ amount: 5000, verified: true, payoutCap: 250 }],
      },
      {
        id: "bg-1step-standard",
        label: "1 Step Standard",
        blurb: "Single phase, 9% target, 6% trailing drawdown, 3 profitable days needed, no consistency rule.",
        maxRiskPct: "2",
        twoMinRule: true,
        slRule: false,
        minTradingDays: 3,
        maxTradingDays: "Unlimited",
        minDayGainPct: "0.5",
        profitSplitPct: "90",
        phases: [
          { label: "Evaluation", targetPct: "9", dailyLossPct: "4", maxDrawdownPct: "6", ddMode: "trail", consistencyPct: "0" },
        ],
        sizes: [5000, 10000, 25000, 50000, 100000, 200000].map((amount) => ({ amount, verified: true })),
      },
      {
        id: "bg-1step-nano",
        label: "1 Step Nano",
        blurb: "Cheapest single-phase model, higher 10% target, no minimum trading days, but a 50% consistency rule once funded.",
        maxRiskPct: "2",
        twoMinRule: true,
        slRule: false,
        minTradingDays: null,
        maxTradingDays: "Unlimited",
        minDayGainPct: "0.5",
        profitSplitPct: "100",
        phases: [
          { label: "Evaluation", targetPct: "10", dailyLossPct: "4", maxDrawdownPct: "6", ddMode: "trail", consistencyPct: "50" },
        ],
        sizes: [5000, 10000, 25000, 50000, 100000, 200000].map((amount) => ({ amount, verified: true })),
      },
      {
        id: "bg-2step-standard",
        label: "2 Step Standard",
        blurb: "Two phases, 8% then 4% target, static 8% drawdown, 3 profitable days needed, no consistency rule.",
        maxRiskPct: "2",
        twoMinRule: true,
        slRule: false,
        minTradingDays: 3,
        maxTradingDays: "Unlimited",
        minDayGainPct: "0.5",
        profitSplitPct: "90",
        phases: [
          { label: "Phase 1", targetPct: "8", dailyLossPct: "4", maxDrawdownPct: "8", ddMode: "static", consistencyPct: "0" },
          { label: "Phase 2", targetPct: "4", dailyLossPct: "4", maxDrawdownPct: "8", ddMode: "static", consistencyPct: "0" },
        ],
        sizes: [5000, 25000, 50000, 100000, 150000, 200000].map((amount) => ({ amount, verified: true })),
      },
      {
        id: "bg-2step-nano",
        label: "2 Step Nano",
        blurb: "Entry-size $25K, 8% then 5% target, generous static 10% drawdown, no minimum trading days, 50% consistency rule once funded.",
        maxRiskPct: "2",
        twoMinRule: true,
        slRule: false,
        minTradingDays: null,
        maxTradingDays: "Unlimited",
        minDayGainPct: "0.5",
        profitSplitPct: "100",
        phases: [
          { label: "Phase 1", targetPct: "8", dailyLossPct: "3", maxDrawdownPct: "10", ddMode: "static", consistencyPct: "50" },
          { label: "Phase 2", targetPct: "5", dailyLossPct: "3", maxDrawdownPct: "10", ddMode: "static", consistencyPct: "50" },
        ],
        sizes: [25000, 50000, 100000, 200000].map((amount) => ({ amount, verified: true })),
      },
    ],
  },
  {
    id: "fundednext",
    name: "Funded Next",
    lastChecked: "",
    sourceNote: "fundednext.com official Stellar 1-Step/2-Step/Lite/Instant challenge pages (live fetch, comparison table) + help.fundednext.com consistency-rule FAQ.",
    plans: [
      {
        id: "fn-2step",
        label: "Stellar 2-Step",
        blurb: "Two phases, 8% then 5% target, widest drawdown room (10% static) of the four models, 95% max reward share.",
        maxRiskPct: "1.5",
        twoMinRule: true,
        slRule: false,
        minTradingDays: 5,
        maxTradingDays: "Unlimited",
        minDayGainPct: "0",
        profitSplitPct: "95",
        phases: [
          { label: "Phase 1", targetPct: "8", dailyLossPct: "5", maxDrawdownPct: "10", ddMode: "static", consistencyPct: "0" },
          { label: "Phase 2", targetPct: "5", dailyLossPct: "5", maxDrawdownPct: "10", ddMode: "static", consistencyPct: "0" },
        ],
        sizes: [6000, 15000, 25000, 50000, 100000, 200000].map((amount) => ({ amount, verified: true })),
      },
      {
        id: "fn-1step",
        label: "Stellar 1-Step",
        blurb: "Single phase, 10% target, only 2 minimum trading days, tightest drawdown (6% static) of the Stellar lineup, fastest reward cycle (every 5 business days).",
        maxRiskPct: "3",
        twoMinRule: true,
        slRule: false,
        minTradingDays: 2,
        maxTradingDays: "Unlimited",
        minDayGainPct: "0",
        profitSplitPct: "95",
        phases: [
          { label: "Evaluation", targetPct: "10", dailyLossPct: "3", maxDrawdownPct: "6", ddMode: "static", consistencyPct: "0" },
        ],
        sizes: [6000, 15000, 25000, 50000, 100000, 200000].map((amount) => ({ amount, verified: true })),
      },
      {
        id: "fn-lite",
        label: "Stellar Lite",
        blurb: "Two phases, 8% then 4% target, cheapest entry fee of the four models, 8% static drawdown, 4% daily loss.",
        maxRiskPct: "1.5",
        twoMinRule: true,
        slRule: false,
        minTradingDays: 5,
        maxTradingDays: "Unlimited",
        minDayGainPct: "0",
        profitSplitPct: "95",
        phases: [
          { label: "Phase 1", targetPct: "8", dailyLossPct: "4", maxDrawdownPct: "8", ddMode: "static", consistencyPct: "0" },
          { label: "Phase 2", targetPct: "4", dailyLossPct: "4", maxDrawdownPct: "8", ddMode: "static", consistencyPct: "0" },
        ],
        sizes: [5000, 10000, 25000, 50000, 100000, 200000].map((amount) => ({ amount, verified: true })),
      },
      {
        id: "fn-instant",
        label: "Stellar Instant",
        blurb: "No evaluation, funded from day one. No profit target and no separate daily loss cap — just a 6% trailing overall drawdown. Reward share caps lower, at 80%, and rewards are on-demand (at 5% growth) or bi-weekly (at 1%+ growth).",
        maxRiskPct: "1",
        twoMinRule: false,
        slRule: false,
        minTradingDays: null,
        maxTradingDays: "Unlimited",
        minDayGainPct: "0",
        profitSplitPct: "80",
        phases: [
          { label: "Funded from day 1", targetPct: "instant", dailyLossPct: "6", maxDrawdownPct: "6", ddMode: "trail", consistencyPct: "0" },
        ],
        sizes: [2000, 5000, 10000, 20000].map((amount) => ({ amount, verified: true })),
      },
    ],
  },
{
    id: "goatfundedtrader",
    name: "GoatFundedTrader",
    lastChecked:"",
    sourceNote: "goatfundedtrader.com official website + official Goat Funded Trader model FAQs",
    plans: [
      {
        id: "gft-1step",
        label: "1 Step",
        blurb: "Single evaluation phase, 10% target, 3% daily drawdown for accounts purchased from August 1, 2026 onward, 6% static maximum loss, no consistency rule.",
        maxRiskPct: null,
        twoMinRule: false,
        slRule: false,
        minTradingDays: 3,
        maxTradingDays: "Unlimited",
        minDayGainPct: "0.5",
        profitSplitPct: "80",
        phases: [
          {
            label: "Evaluation",
            targetPct: "10",
            dailyLossPct: "3",
            maxDrawdownPct: "6",
            ddMode: "static",
            consistencyPct: "0",
          },
        ],
        sizes: [5000, 10000, 25000, 50000, 100000, 150000, 200000].map(
          (amount) => ({ amount, verified: true })
        ),
      },

      {
        id: "gft-2step-goat",
        label: "2 Step GOAT",
        blurb: "Two evaluation phases, 8% then 6% target, 4% daily drawdown, 10% static maximum loss, no consistency rule.",
        maxRiskPct: null,
        twoMinRule: false,
        slRule: false,
        minTradingDays: 3,
        maxTradingDays: "Unlimited",
        minDayGainPct: "0.5",
        profitSplitPct: "80",
        phases: [
          {
            label: "Phase 1",
            targetPct: "8",
            dailyLossPct: "4",
            maxDrawdownPct: "10",
            ddMode: "static",
            consistencyPct: "0",
          },
          {
            label: "Phase 2",
            targetPct: "6",
            dailyLossPct: "4",
            maxDrawdownPct: "10",
            ddMode: "static",
            consistencyPct: "0",
          },
        ],
        sizes: [5000, 10000, 25000, 50000, 100000, 150000, 200000].map(
          (amount) => ({ amount, verified: true })
        ),
      },

      {
        id: "gft-2step-standard",
        label: "2 Step Standard",
        blurb: "Two evaluation phases, 10% then 5% target, 5% daily drawdown, 10% static maximum loss, no consistency rule.",
        maxRiskPct: null,
        twoMinRule: false,
        slRule: false,
        minTradingDays: 3,
        maxTradingDays: "Unlimited",
        minDayGainPct: "0.5",
        profitSplitPct: "80",
        phases: [
          {
            label: "Phase 1",
            targetPct: "10",
            dailyLossPct: "5",
            maxDrawdownPct: "10",
            ddMode: "static",
            consistencyPct: "0",
          },
          {
            label: "Phase 2",
            targetPct: "5",
            dailyLossPct: "5",
            maxDrawdownPct: "10",
            ddMode: "static",
            consistencyPct: "0",
          },
        ],
        sizes: [5000, 10000, 25000, 50000, 100000, 150000, 200000].map(
          (amount) => ({ amount, verified: true })
        ),
      },

      {
        id: "gft-hero",
        label: "HERO",
        blurb: "Instant funded. 3% trailing daily drawdown, 5% trailing maximum loss, 6 valid trading days, 1% floating-loss rule and 15% consistency.",
        maxRiskPct: "1",
        twoMinRule: false,
        slRule: false,
        minTradingDays: 6,
        maxTradingDays: "Unlimited",
        minDayGainPct: "0.5",
        profitSplitPct: "90",
        phases: [
          {
            label: "Funded from day 1",
            targetPct: "instant",
            dailyLossPct: "3",
            maxDrawdownPct: "5",
            ddMode: "trail",
            consistencyPct: "15",
          },
        ],
        sizes: [
          5000,
          10000,
          25000,
          50000,
          100000,
          150000,
          200000,
          250000,
          300000,
          400000,
        ].map((amount) => ({ amount, verified: true })),
      },

      {
        id: "gft-goat",
        label: "GOAT",
        blurb: "Instant funded. 3% trailing daily drawdown, 6% trailing maximum loss, 5 valid trading days, 2% floating-loss rule and 15% consistency.",
        maxRiskPct: "2",
        twoMinRule: false,
        slRule: false,
        minTradingDays: 5,
        maxTradingDays: "Unlimited",
        minDayGainPct: "0.5",
        profitSplitPct: "80",
        phases: [
          {
            label: "Funded from day 1",
            targetPct: "instant",
            dailyLossPct: "3",
            maxDrawdownPct: "6",
            ddMode: "trail",
            consistencyPct: "15",
          },
        ],
        sizes: [
          5000,
          10000,
          25000,
          50000,
          100000,
          150000,
          200000,
          250000,
          300000,
          400000,
        ].map((amount) => ({ amount, verified: true })),
      },

      {
        id: "gft-premium",
        label: "PREMIUM",
        blurb: "Instant funded. 3% daily drawdown, 6% intraday trailing maximum loss, 5 valid trading days, no consistency rule.",
        maxRiskPct: "1",
        twoMinRule: false,
        slRule: false,
        minTradingDays: 5,
        maxTradingDays: "Unlimited",
        minDayGainPct: "0.5",
        profitSplitPct: "80",
        phases: [
          {
            label: "Funded from day 1",
            targetPct: "instant",
            dailyLossPct: "3",
            maxDrawdownPct: "6",
            ddMode: "trail",
            consistencyPct: "0",
          },
        ],
        sizes: [
          5000,
          10000,
          25000,
          50000,
          100000,
          150000,
        ].map((amount) => ({ amount, verified: true })),
      },
    ],
  },
{
    id: "lucidtrading",
    name: "Lucid Trading",
    lastChecked:"",
    sourceNote: "lucidtrading.com official website + support.lucidtrading.com",
    plans: [
      {
        id: "lucid-pro",
        label: "Lucid Pro",
        blurb: "Evaluation with 5%-6% profit target, EOD trailing max loss, and account-size based daily loss limits.",
        maxRiskPct: null,
        twoMinRule: false,
        slRule: false,
        minTradingDays: null,
        maxTradingDays: "Unlimited",
        minDayGainPct: "0",
        profitSplitPct: "90",
        phases: [
          {
            label: "Evaluation",
            targetPct: "5",
            dailyLossPct: "0",
            maxDrawdownPct: "4",
            ddMode: "trailing",
            consistencyPct: "0",
          },
        ],
        sizes: [
          { amount: 25000, verified: true },
          { amount: 50000, verified: true },
          { amount: 100000, verified: true },
          { amount: 150000, verified: true },
        ],
      },

      {
        id: "lucid-flex",
        label: "Lucid Flex",
        blurb: "Evaluation with 5%-6% profit target, EOD trailing max loss, 50% consistency, and optional daily loss limit.",
        maxRiskPct: null,
        twoMinRule: false,
        slRule: false,
        minTradingDays: null,
        maxTradingDays: "Unlimited",
        minDayGainPct: "0",
        profitSplitPct: "90",
        phases: [
          {
            label: "Evaluation",
            targetPct: "5",
            dailyLossPct: "0",
            maxDrawdownPct: "4",
            ddMode: "trailing",
            consistencyPct: "50",
          },
        ],
        sizes: [
          { amount: 25000, verified: true },
          { amount: 50000, verified: true },
          { amount: 100000, verified: true },
          { amount: 150000, verified: true },
        ],
      },

      {
        id: "lucid-daily",
        label: "Lucid Daily",
        blurb: "Evaluation with 5%-6% profit target, EOD trailing max loss, 50% evaluation consistency, and optional fixed daily loss limit.",
        maxRiskPct: null,
        twoMinRule: false,
        slRule: false,
        minTradingDays: null,
        maxTradingDays: "Unlimited",
        minDayGainPct: "0",
        profitSplitPct: "90",
        phases: [
          {
            label: "Evaluation",
            targetPct: "5",
            dailyLossPct: "2.4",
            maxDrawdownPct: "4",
            ddMode: "trailing",
            consistencyPct: "50",
          },
        ],
        sizes: [
          { amount: 25000, verified: true },
          { amount: 50000, verified: true },
          { amount: 100000, verified: true },
          { amount: 150000, verified: true },
        ],
      },

{
  id: "lucid-direct",
  label: "Lucid Direct",
  blurb: "Straight-to-funded account with EOD trailing max loss, account-size based daily loss limits, and 20% payout consistency.",
  maxRiskPct: null,
  twoMinRule: false,
  slRule: false,
  minTradingDays: null,
  maxTradingDays: "Unlimited",
  minDayGainPct: "0",
  profitSplitPct: "90",
  phases: [
    {
      label: "Funded",
      targetPct: "0",
      dailyLossPct: "0",
      maxDrawdownPct: "4",
      ddMode: "trailing",
      consistencyPct: "20",
    },
  ],
      sizes: [
        { amount: 25000, verified: true },
        { amount: 50000, verified: true },
        { amount: 100000, verified: true },
        { amount: 150000, verified: true },
      ],
    },
  ],
},
];

const COMING_SOON_FIRMS = ["FTMO", "Apex", "TopStep", "MyFundedFX"];

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

function formatMinSec(ms) {
  if (!Number.isFinite(ms) || ms < 0) return "0:00";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${pad2(m)}:${pad2(s)}`;
  return `${m}:${pad2(s)}`;
}

function computeStatementData(trades, journalEntries, customSetups, playbookCheckins, startingBalance, period, customMoods = []) {
  let rangeStart, rangeEnd, seriesBuckets, periodLabel, checkinMatch;

  if (period.type === "month") {
    const monthPrefix = `${period.year}-${pad2(period.index + 1)}`;
    rangeStart = new Date(period.year, period.index, 1).getTime();
    rangeEnd = new Date(period.year, period.index + 1, 1).getTime();
    const daysInMonth = new Date(period.year, period.index + 1, 0).getDate();
    seriesBuckets = Array.from({ length: daysInMonth }, (_, i) => ({
      label: String(i + 1),
      matches: (t) => new Date(t.ts).getDate() === i + 1,
    }));
    periodLabel = `${MONTH_NAMES[period.index]} ${period.year}`;
    checkinMatch = (key) => key.startsWith(monthPrefix);
  } else if (period.type === "quarter") {
    const startMonth = period.index * 3;
    rangeStart = new Date(period.year, startMonth, 1).getTime();
    rangeEnd = new Date(period.year, startMonth + 3, 1).getTime();
    seriesBuckets = [0, 1, 2].map((i) => ({
      label: MONTH_SHORT[startMonth + i],
      matches: (t) => new Date(t.ts).getMonth() === startMonth + i,
    }));
    periodLabel = `Q${period.index + 1} ${period.year}`;
    checkinMatch = (key) => {
      if (!key.startsWith(`${period.year}-`)) return false;
      const m = Number(key.slice(5, 7));
      return m >= startMonth + 1 && m <= startMonth + 3;
    };
  } else {
    rangeStart = new Date(period.year, 0, 1).getTime();
    rangeEnd = new Date(period.year + 1, 0, 1).getTime();
    seriesBuckets = MONTH_SHORT.map((label, i) => ({
      label,
      matches: (t) => new Date(t.ts).getMonth() === i,
    }));
    periodLabel = `${period.year} Annual`;
    checkinMatch = (key) => key.startsWith(`${period.year}-`);
  }

  const rangeTrades = trades.filter((t) => t.ts >= rangeStart && t.ts < rangeEnd);
  const series = seriesBuckets.map((b) => ({
    label: b.label,
    pnl: rangeTrades.filter(b.matches).reduce((s, t) => s + t.pnl, 0),
  }));
  const maxAbs = Math.max(1, ...series.map((d) => Math.abs(d.pnl)));

  const netPnl = rangeTrades.reduce((s, t) => s + t.pnl, 0);
  const wins = rangeTrades.filter((t) => t.pnl > 0);
  const winRate = rangeTrades.length ? (wins.length / rangeTrades.length) * 100 : 0;
  const startBal = num(startingBalance);

  const bucketsWithTrades = series.filter((d) => d.pnl !== 0);
  const bestBucket = bucketsWithTrades.length ? bucketsWithTrades.reduce((a, b) => (b.pnl > a.pnl ? b : a)) : null;
  const worstBucket = bucketsWithTrades.length ? bucketsWithTrades.reduce((a, b) => (b.pnl < a.pnl ? b : a)) : null;

  const perf = computePerformanceMetrics(rangeTrades);
  const revengeCost = computeRevengeCostSplit(rangeTrades);
  const discipline = computeDisciplineStreak(rangeTrades);
  const completeness = computeJournalCompleteness(rangeTrades);
  const insights = computeInsights(rangeTrades, customSetups, customMoods);

  const periodCheckins = playbookCheckins.filter((c) => checkinMatch(c.date));
  const cleanCheckins = periodCheckins.filter(isCleanCheckin).length;
  const cleanPct = periodCheckins.length ? Math.round((cleanCheckins / periodCheckins.length) * 100) : null;

  const topPairs = tradePairFrequency(rangeTrades, 1);
  const mostTradedPair = topPairs.length ? topPairs[0] : null;

  return {
    periodLabel,
    tradeCount: rangeTrades.length,
    netPnl,
    netPct: startBal > 0 ? (netPnl / startBal) * 100 : null,
    winRate,
    series,
    maxAbs,
    bestBucket,
    worstBucket,
    perf,
    revengeCost,
    discipline,
    completeness,
    bestSetup: insights.bestSetup,
    bestMood: insights.bestMood,
    cleanPct,
    checkinCount: periodCheckins.length,
    mostTradedPair,
  };
}

function computeGoalProgress(trades, startBal, period) {
  if (!(startBal > 0)) return null;
  const now = new Date();
  let periodStart;
  if (period === "week") {
    const day = now.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    periodStart = new Date(now);
    periodStart.setDate(now.getDate() - diffToMonday);
    periodStart.setHours(0, 0, 0, 0);
  } else {
    periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  const periodTrades = trades.filter((t) => t.ts >= periodStart.getTime());
  const netPnl = periodTrades.reduce((s, t) => s + t.pnl, 0);
  const pct = (netPnl / startBal) * 100;
  return { count: periodTrades.length, netPnl, pct, periodStart };
}

const CALENDAR_PROXY_URL = "https://ledger-calendar-proxy.ledgercalc.workers.dev/calendar";
const FMP_STORAGE_KEY = "fmp:econ-calendar:v1";
const FMP_CACHE_MS = 12 * 60 * 60 * 1000; // 12 hours — new estimates/actuals can post mid-month

const ECON_KEYWORDS = /CPI|PPI|FOMC|NFP|GDP|non.?farm|interest rate|federal funds|unemployment|payroll|retail sales|PCE|core inflation|jobless/i;

function currentMonthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const fmtDate = (d) => d.toISOString().slice(0, 10);
  return { from: fmtDate(from), to: fmtDate(to) };
}

async function fetchEconomicCalendar() {
  if (!CALENDAR_PROXY_URL || CALENDAR_PROXY_URL.includes("yourname")) {
    throw new Error("Set CALENDAR_PROXY_URL to your deployed Worker URL first.");
  }

  const res = await fetch(CALENDAR_PROXY_URL);
  if (!res.ok) throw new Error(`Calendar request failed (${res.status})`);
  const json = await res.json();
  if (!Array.isArray(json)) throw new Error("Unexpected response from the calendar proxy.");

  return json
    .filter((item) => item.country === "USD" && ECON_KEYWORDS.test(item.title || ""))
    .map((item) => ({
      id: `${item.title}-${item.date}`,
      name: item.title,
      date: item.date,
      impact: (item.impact || "").toLowerCase() || "medium",
      previous: item.previous,
      estimate: item.forecast,
      actual: item.actual,
    }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

const SW_SCRIPT = `
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    self.registration.showNotification(event.data.title, event.data.options);
  }
});
`;

async function registerAlarmServiceWorker() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    const blob = new Blob([SW_SCRIPT], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const registration = await navigator.serviceWorker.register(url);
    return registration;
  } catch (err) {
    return null;
  }
}

function computeRevengeIds(trades) {
  const sorted = [...trades].sort((a, b) => a.ts - b.ts);
  const ids = new Set();
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    if (prev.pnl < 0 && cur.ts - prev.ts <= RUNTIME.REVENGE_WINDOW_MS) {
      ids.add(cur.id);
    }
  }
  return ids;
}

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

function computeInsights(trades, customSetups, customMoods = []) {
  const WEEKDAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const moodMetaLocal = (id) => emotionMeta(id) || customMoods.find((m) => m.id === id);
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
      label: moodMetaLocal(id)?.label || id,
      emoji: moodMetaLocal(id)?.emoji || "",
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

function computeHeadlineInsight(trades, customSetups, customMoods = []) {
  if (trades.length < 5) return null;
  const insights = computeInsights(trades, customSetups, customMoods);
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
      } \u2014 watch that ${RUNTIME.REVENGE_WINDOW_MINUTES}-minute window after a loss.`,
    });
  }

  if (candidates.length === 0) {
    return "Keep logging trades \u2014 clear patterns will show up here as your journal grows.";
  }
  candidates.sort((a, b) => b.priority - a.priority);
  return candidates[0].text;
}

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

// Evenly distributes wins across trades to hit the target win rate exactly
// (same idea as a line-drawing algorithm) — deterministic and reproducible,
// but since R:R usually isn't 1, every win/loss still moves the curve by a
// different amount than the last, so it naturally zigzags like a real curve.
function generateEquityCurve({ winRatePct, rr, numTrades, riskDollarPerTrade }) {
  if (!(numTrades > 0) || !(rr > 0)) return null;
  const winProb = Math.min(1, Math.max(0, winRatePct / 100));
  const trades = Math.max(1, Math.min(Math.round(numTrades), EDGE_CURVE_MAX_TRADES));

  let acc = 0;
  let cumR = 0;
  const points = [{ trade: 0, r: 0, pnl: riskDollarPerTrade > 0 ? 0 : null }];
  for (let t = 1; t <= trades; t++) {
    acc += winProb;
    let isWin = false;
    if (acc >= 1) {
      isWin = true;
      acc -= 1;
    }
    cumR += isWin ? rr : -1;
    points.push({
      trade: t,
      r: cumR,
      pnl: riskDollarPerTrade > 0 ? cumR * riskDollarPerTrade : null,
    });
  }
  return { points, finalR: cumR, trades };
}

function generateThreeCurveProjection({ winRatePct, rr, spreadPct, numTrades, riskDollarPerTrade }) {
  if (!(numTrades > 0) || !(rr > 0) || !(winRatePct >= 0)) return null;

  const normalWinRate = winRatePct;
  const bestWinRate = Math.min(100, winRatePct + spreadPct);
  const worstWinRate = Math.max(0, winRatePct - spreadPct);

  const normal = generateEquityCurve({ winRatePct: normalWinRate, rr, numTrades, riskDollarPerTrade });
  const best = generateEquityCurve({ winRatePct: bestWinRate, rr, numTrades, riskDollarPerTrade });
  const worst = generateEquityCurve({ winRatePct: worstWinRate, rr, numTrades, riskDollarPerTrade });
  if (!normal || !best || !worst) return null;

  const trades = normal.trades;
  const chartData = Array.from({ length: trades + 1 }, (_, i) => ({
    trade: i,
    normal: normal.points[i] ? normal.points[i].r : null,
    best: best.points[i] ? best.points[i].r : null,
    worst: worst.points[i] ? worst.points[i].r : null,
    normalPnl: normal.points[i] ? normal.points[i].pnl : null,
    bestPnl: best.points[i] ? best.points[i].pnl : null,
    worstPnl: worst.points[i] ? worst.points[i].pnl : null,
  }));

  return {
    chartData,
    trades,
    normalWinRate,
    bestWinRate,
    worstWinRate,
    normalFinalR: normal.finalR,
    bestFinalR: best.finalR,
    worstFinalR: worst.finalR,
    normalFinalPnl: normal.points[trades].pnl,
    bestFinalPnl: best.points[trades].pnl,
    worstFinalPnl: worst.points[trades].pnl,
  };
}


function computeQualifyingTradingDays(trades, startBal, minDayGainPct) {
  const byDay = {};
  trades.forEach((t) => {
    const k = dayKeyFromTs(t.ts);
    byDay[k] = (byDay[k] || 0) + t.pnl;
  });
  const threshold = num(minDayGainPct);
  const dayKeys = Object.keys(byDay);
  const qualifyingDayKeys = startBal > 0
    ? dayKeys.filter((k) => (byDay[k] / startBal) * 100 >= threshold).sort()
    : [];
  return {
    totalDaysTraded: dayKeys.length,
    qualifyingDays: qualifyingDayKeys.length,
    qualifyingDayKeys,
  };
}

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

// ---- Journal tab data -> Insights "Journal" sub-tab helpers ----
function filledJournalRows(journalEntries) {
  return journalEntries.filter((r) =>
    [r.pair, r.trend, r.rr, r.setup, r.outcome, r.session, r.mood, r.confidence, r.mistake, r.note].some(
      (v) => v && String(v).trim()
    )
  );
}

function journalTrendBreakdown(rows) {
  const counts = { uptrend: 0, downtrend: 0, range: 0, untagged: 0 };
  rows.forEach((r) => {
    if (r.trend && counts[r.trend] !== undefined) counts[r.trend] += 1;
    else counts.untagged += 1;
  });
  return TREND_OPTIONS.map((t) => ({ id: t.id, name: t.label, value: counts[t.id] }))
    .concat(counts.untagged > 0 ? [{ id: "untagged", name: "Untagged", value: counts.untagged }] : [])
    .filter((d) => d.value > 0);
}

function journalRRSeries(rows) {
  return rows
    .filter((r) => r.date && r.rr !== "" && Number.isFinite(parseFloat(r.rr)))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .map((r) => ({ date: r.date, label: formatShortDate(new Date(`${r.date}T00:00:00`).getTime()), rr: num(r.rr) }));
}

function journalMistakeFrequency(rows, max = 6) {
  const counts = {};
  rows.forEach((r) => {
    const m = (r.mistake || "").trim();
    if (!m) return;
    const key = m.toLowerCase();
    if (!counts[key]) counts[key] = { label: m, count: 0 };
    counts[key].count += 1;
  });
  return Object.values(counts)
    .sort((a, b) => b.count - a.count)
    .slice(0, max);
}

function journalSetupRadar(rows, customSetups) {
  const bySetup = {};
  rows.forEach((r) => {
    if (!r.setup) return;
    if (!bySetup[r.setup]) bySetup[r.setup] = { count: 0, rrTotal: 0, rrCount: 0, cleanCount: 0 };
    const b = bySetup[r.setup];
    b.count += 1;
    if (r.rr !== "" && Number.isFinite(num(r.rr))) {
      b.rrTotal += num(r.rr);
      b.rrCount += 1;
    }
    if (!r.mistake || !r.mistake.trim()) b.cleanCount += 1;
  });
  const ids = Object.keys(bySetup);
  if (ids.length === 0) return { rows: [], maxCount: 0, maxRR: 0 };
  const maxCount = Math.max(...ids.map((id) => bySetup[id].count));
  const maxRR = Math.max(...ids.map((id) => (bySetup[id].rrCount ? bySetup[id].rrTotal / bySetup[id].rrCount : 0)), 1);
  const setupRows = ids.map((id) => {
    const b = bySetup[id];
    const avgRR = b.rrCount ? b.rrTotal / b.rrCount : 0;
    return {
      id,
      label: setupMeta(id)?.label || customSetups.find((s) => s.id === id)?.label || id,
      Frequency: maxCount ? Math.round((b.count / maxCount) * 100) : 0,
      "Avg R:R": maxRR ? Math.round((avgRR / maxRR) * 100) : 0,
      "Clean Rate": b.count ? Math.round((b.cleanCount / b.count) * 100) : 0,
      count: b.count,
      avgRR,
    };
  });
  return { rows: setupRows, maxCount, maxRR };
}

function journalMistakePatterns(rows) {
  const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const byTrend = {};
  TREND_OPTIONS.forEach((t) => (byTrend[t.id] = { count: 0, mistakeCount: 0 }));
  const byWeekday = {};
  for (let i = 0; i < 7; i++) byWeekday[i] = { count: 0, mistakeCount: 0 };

  rows.forEach((r) => {
    const hasMistake = !!(r.mistake && r.mistake.trim());
    if (r.trend && byTrend[r.trend]) {
      byTrend[r.trend].count += 1;
      if (hasMistake) byTrend[r.trend].mistakeCount += 1;
    }
    if (r.date) {
      const wd = new Date(`${r.date}T00:00:00`).getDay();
      byWeekday[wd].count += 1;
      if (hasMistake) byWeekday[wd].mistakeCount += 1;
    }
  });

  const trendRows = TREND_OPTIONS.map((t) => {
    const b = byTrend[t.id];
    return {
      id: t.id,
      label: t.label,
      count: b.count,
      mistakeRate: b.count ? Math.round((b.mistakeCount / b.count) * 100) : 0,
    };
  }).filter((r) => r.count > 0);

  const WEEKDAY_FULL_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const weekdayRows = Object.keys(byWeekday)
    .map((k) => {
      const b = byWeekday[k];
      return {
        id: k,
        label: WEEKDAY_SHORT[Number(k)],
        fullLabel: WEEKDAY_FULL_NAMES[Number(k)],
        count: b.count,
        mistakeRate: b.count ? Math.round((b.mistakeCount / b.count) * 100) : 0,
      };
    })
    .filter((r) => r.count > 0);

  const maxTrendRate = trendRows.length ? Math.max(...trendRows.map((r) => r.mistakeRate)) : 0;
  const worstTrends = trendRows.filter((r) => r.mistakeRate === maxTrendRate && maxTrendRate > 0);

  const maxWeekdayRate = weekdayRows.length ? Math.max(...weekdayRows.map((r) => r.mistakeRate)) : 0;
  const worstWeekdays = weekdayRows.filter((r) => r.mistakeRate === maxWeekdayRate && maxWeekdayRate > 0);

  return { trendRows, weekdayRows, worstTrends, worstWeekdays };
}

function journalPairFrequency(rows, max = 8) {
  const counts = {};
  rows.forEach((r) => {
    const p = (r.pair || "").trim().toUpperCase();
    if (!p) return;
    counts[p] = (counts[p] || 0) + 1;
  });
  return Object.keys(counts)
    .map((pair) => ({ pair, count: counts[pair] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, max);
}

function tradePairFrequency(trades, max = 8) {
  const counts = {};
  trades.forEach((t) => {
    const p = (t.pair || "").trim().toUpperCase();
    if (!p) return;
    counts[p] = (counts[p] || 0) + 1;
  });
  return Object.keys(counts)
    .map((pair) => ({ pair, count: counts[pair] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, max);
}

function journalWeekdayFrequency(rows) {
  const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const counts = {};
  rows.forEach((r) => {
    if (!r.date) return;
    const wd = new Date(`${r.date}T00:00:00`).getDay();
    counts[wd] = (counts[wd] || 0) + 1;
  });
  return WEEKDAY_SHORT.map((label, i) => ({ id: i, label, count: counts[i] || 0 }));
}

function journalSessionFrequency(rows) {
  return MARKET_SESSIONS.map((s) => {
    const count = rows.filter((r) => r.session === s.id).length;
    return { id: s.id, label: s.label, count, color: s.color };
  }).filter((r) => r.count > 0);
}

function computeSessionWinRates(journalRows) {
  const bySession = {};
  journalRows.forEach((r) => {
    if (!r.session) return;
    const pnl = parseFloat(r.pnl);
    const hasOutcome = r.outcome === "win" || r.outcome === "loss";
    const isWin = hasOutcome ? r.outcome === "win" : Number.isFinite(pnl) ? pnl > 0 : null;
    if (isWin === null) return;
    if (!bySession[r.session]) bySession[r.session] = { wins: 0, total: 0 };
    bySession[r.session].total += 1;
    if (isWin) bySession[r.session].wins += 1;
  });
  return MARKET_SESSIONS.map((s) => {
    const b = bySession[s.id];
    return {
      id: s.id,
      label: s.label,
      total: b ? b.total : 0,
      winRate: b && b.total ? (b.wins / b.total) * 100 : null,
    };
  });
}

function journalRRDistribution(rows) {
  const buckets = [
    { label: "<1", min: -Infinity, max: 1 },
    { label: "1-2", min: 1, max: 2 },
    { label: "2-3", min: 2, max: 3 },
    { label: "3-4", min: 3, max: 4 },
    { label: "4+", min: 4, max: Infinity },
  ];
  const counts = buckets.map(() => 0);
  rows.forEach((r) => {
    if (r.rr === "" || !Number.isFinite(parseFloat(r.rr))) return;
    const v = num(r.rr);
    const idx = buckets.findIndex((b) => v >= b.min && v < b.max);
    if (idx !== -1) counts[idx] += 1;
  });
  return buckets.map((b, i) => ({ label: b.label, count: counts[i] })).filter((d) => d.count > 0);
}

function journalMonthlyVolume(rows, monthsBack = 6) {
  const now = new Date();
  const months = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`, label: MONTH_SHORT[d.getMonth()] });
  }
  const counts = {};
  rows.forEach((r) => {
    if (!r.date) return;
    const k = r.date.slice(0, 7);
    counts[k] = (counts[k] || 0) + 1;
  });
  return months.map((m) => ({ label: m.label, count: counts[m.key] || 0 }));
}

function journalPnLByMonth(rows, year) {
  const byMonth = {};
  rows.forEach((r) => {
    if (!r.date || r.pnl === undefined || r.pnl === "") return;
    const [y, m] = r.date.split("-").map(Number);
    if (y !== year) return;
    const pnl = parseFloat(r.pnl);
    if (!Number.isFinite(pnl)) return;
    byMonth[m] = (byMonth[m] || 0) + pnl;
  });
  return byMonth;
}

function journalPnLByDay(rows, year, month) {
  const byDay = {};
  rows.forEach((r) => {
    if (!r.date || r.pnl === undefined || r.pnl === "") return;
    const [y, m, d] = r.date.split("-").map(Number);
    if (y !== year || m !== month) return;
    const pnl = parseFloat(r.pnl);
    if (!Number.isFinite(pnl)) return;
    byDay[d] = (byDay[d] || 0) + pnl;
  });
  return byDay;
}

function journalMonthlyPnLSeries(pnlByMonth) {
  return MONTH_SHORT.map((label, i) => ({ label, pnl: pnlByMonth[i + 1] || 0 }));
}

function journalDailyPnLSeries(pnlByDay, daysInMonth) {
  return Array.from({ length: daysInMonth }, (_, i) => ({ label: String(i + 1), pnl: pnlByDay[i + 1] || 0 }));
}

function joinWithAnd(arr) {
  if (arr.length === 0) return "";
  if (arr.length === 1) return arr[0];
  if (arr.length === 2) return `${arr[0]} and ${arr[1]}`;
  return `${arr.slice(0, -1).join(", ")}, and ${arr[arr.length - 1]}`;
}

function journalSessionByDay(rows, maxDays = 30) {
  const bySession = {};
  rows.forEach((r) => {
    if (!r.date || !r.session) return;
    if (!bySession[r.date]) bySession[r.date] = {};
    bySession[r.date][r.session] = (bySession[r.date][r.session] || 0) + 1;
  });
  const dates = Object.keys(bySession).sort().slice(-maxDays);
  return dates.map((d) => {
    const entry = { date: d, label: formatShortDate(new Date(`${d}T00:00:00`).getTime()) };
    MARKET_SESSIONS.forEach((s) => {
      entry[s.label] = bySession[d][s.id] || 0;
    });
    return entry;
  });
}

const CONFIDENCE_VALUE = { low: 1, medium: 2, high: 3 };

function journalConfidenceByDay(rows, maxDays = 30) {
  const byDate = {};
  rows.forEach((r) => {
    if (!r.date || !r.confidence) return;
    if (!byDate[r.date]) byDate[r.date] = { total: 0, count: 0 };
    byDate[r.date].total += CONFIDENCE_VALUE[r.confidence] || 0;
    byDate[r.date].count += 1;
  });
  const dates = Object.keys(byDate).sort().slice(-maxDays);
  return dates.map((d) => ({
    date: d,
    label: formatShortDate(new Date(`${d}T00:00:00`).getTime()),
    avgConfidence: byDate[d].count ? byDate[d].total / byDate[d].count : 0,
  }));
}

function buildWeekRecap(weekTrades, startBal, weekJournalRows = [], customSetups = []) {
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
  ? {
      id: topSetupId,
      count: setupCounts[topSetupId],
      label: setupMeta(topSetupId)?.label || customSetups.find((s) => s.id === topSetupId)?.label || topSetupId,
    }
  : null;

  const revengeCount = computeRevengeIds(weekTrades).size;

  const rangeLabel = `${formatShortDate(weekTrades[0].ts)} \u2013 ${formatShortDate(weekTrades[weekTrades.length - 1].ts)}`;

  const perf = computePerformanceMetrics(weekTrades);
  const grade = computeDisciplineGrade(weekTrades);

  // Top pair now comes from the Curve-tab trade log, not the Journal tab
  const topPairs = tradePairFrequency(weekTrades, 1);
  const topPair = topPairs.length ? topPairs[0] : null;

  const rrValues = weekJournalRows.map((r) => parseFloat(r.rr)).filter((v) => Number.isFinite(v));
  const avgRR = rrValues.length ? rrValues.reduce((s, v) => s + v, 0) / rrValues.length : null;

  // Trade Pace Trend — front-loaded vs back-loaded vs even, based on trade timestamps
  let paceTrend = "Even";
  if (weekTrades.length >= 2) {
    const sortedTs = weekTrades.map((t) => t.ts).sort((a, b) => a - b);
    const rangeStartTs = sortedTs[0];
    const rangeEndTs = sortedTs[sortedTs.length - 1];
    const midTs = (rangeStartTs + rangeEndTs) / 2;
    const firstHalfCount = weekTrades.filter((t) => t.ts <= midTs).length;
    const secondHalfCount = weekTrades.length - firstHalfCount;
    const diff = firstHalfCount - secondHalfCount;
    const threshold = Math.max(1, Math.ceil(weekTrades.length * 0.2));
    if (diff >= threshold) paceTrend = "Front-loaded";
    else if (-diff >= threshold) paceTrend = "Back-loaded";
  }

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
    profitFactor: perf.profitFactor,
    grade: grade.grade,
    topPair,
    avgRR,
    paceTrend,
  };
}

const SHARE_COLORS = {
  dark: {
    green: "#4FB286",
    red: "#DB6B63",
    gold: "#C7A25C",
    goldBright: "#E7C687",
    text: "#F3F5F9",
    textMuted: "#A8B4CC",
    textFaint: "#7C89A6",
    border: "#3A4A6B",
    surface: "#1B2434",
    bgFrom: "#0E1420",
    bgTo: "#070A11",
    dotRing: "#070A11",
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
  profitFactor,
  grade,
  topPair,
  paceTrend,
  recoveryFactor,
  consistencyLabel,
  activeDays,
  tone,
  theme,
  showDollarAmount,
  netDollar,
  traderAlias,
}) {

  const W = 1080;
  const H = 1600;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  const c = theme === "light" ? SHARE_COLORS.light : SHARE_COLORS.dark;
  const isDark = theme !== "light";
  const lineColor = tone === "bad" ? c.red : c.green;
  const gradeColor = grade === "A" || grade === "B" ? c.green : grade === "D" || grade === "F" ? c.red : c.gold;
  const tint = isDark
    ? (tone === "bad" ? "#FF9B93" : "#7EE8C4")
    : (tone === "bad" ? "#8C2318" : "#0A6B49");

  const roundRect = (x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

  const drawLogoMark = (x, y, s, color) => {
    ctx.save();
    ctx.fillStyle = color;
    const barW = s * 0.26;
    const gap = s * 0.16;
    const heights = [s * 0.5, s * 0.95, s * 0.68];
    heights.forEach((h, i) => {
      const bx = x + i * (barW + gap);
      const by = y + (s - h);
      ctx.fillRect(bx + barW / 2 - 1.5, y - s * 0.15, 3, s * 1.15);
      ctx.fillRect(bx, by, barW, h);
    });
    ctx.restore();
  };

  // ---- outer letterbox ----
  ctx.fillStyle = c.bgTo;
  ctx.fillRect(0, 0, W, H);

  // ---- clipped inner card: gradient + aurora + grid (no watermark) ----
  ctx.save();
  roundRect(36, 36, W - 72, H - 72, 28);
  ctx.clip();

  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, c.bgFrom);
  bgGrad.addColorStop(1, c.bgTo);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.globalAlpha = isDark ? 0.3 : 0.16;
  ctx.fillStyle = c.textFaint;
  for (let yy = 60; yy < H - 40; yy += 34) {
    for (let xx = 60; xx < W - 40; xx += 34) {
      ctx.beginPath();
      ctx.arc(xx, yy, 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  const glowA = isDark ? "2E" : "16";
  const glowB = isDark ? "26" : "12";
  const g1 = ctx.createRadialGradient(W * 0.12, 100, 0, W * 0.12, 100, 560);
  g1.addColorStop(0, `${lineColor}${glowA}`);
  g1.addColorStop(1, `${lineColor}00`);
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, W, H * 0.5);

  const g2 = ctx.createRadialGradient(W * 0.92, 60, 0, W * 0.92, 60, 480);
  g2.addColorStop(0, `${c.gold}${glowB}`);
  g2.addColorStop(1, `${c.gold}00`);
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, W, H * 0.45);

  const g3 = ctx.createRadialGradient(W * 0.5, H * 0.86, 0, W * 0.5, H * 0.86, 520);
  g3.addColorStop(0, `${lineColor}${glowB}`);
  g3.addColorStop(1, `${lineColor}00`);
  ctx.fillStyle = g3;
  ctx.fillRect(0, H * 0.55, W, H * 0.45);

  ctx.restore(); // end clip

  // ---- outer border with glow ----
  ctx.save();
  ctx.shadowColor = `${c.gold}55`;
  ctx.shadowBlur = 20;
  roundRect(36, 36, W - 72, H - 72, 28);
  ctx.strokeStyle = `${c.gold}77`;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  const drawCorner = (x, y, dx, dy) => {
    const len = 34;
    ctx.strokeStyle = c.gold;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y + dy * len);
    ctx.lineTo(x, y);
    ctx.lineTo(x + dx * len, y);
    ctx.stroke();
  };
  drawCorner(36, 36, 1, 1);
  drawCorner(W - 36, 36, -1, 1);
  drawCorner(36, H - 36, 1, -1);
  drawCorner(W - 36, H - 36, -1, -1);

  // ---- header ----
  drawLogoMark(80, 96, 26, c.gold);
  ctx.fillStyle = c.gold;
  ctx.font = "600 26px monospace";
  ctx.textAlign = "left";
  ctx.fillText("LEDGER \u00b7 WEEKLY RECAP", 130, 118);

  if (grade && grade !== "N/A") {
    const badgeCx = W - 140;
    const badgeCy = 108;
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      const r1 = 58;
      const r2 = 66;
      ctx.strokeStyle = `${gradeColor}${i % 2 === 0 ? "77" : "33"}`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(badgeCx + Math.cos(a) * r1, badgeCy + Math.sin(a) * r1);
      ctx.lineTo(badgeCx + Math.cos(a) * r2, badgeCy + Math.sin(a) * r2);
      ctx.stroke();
    }
    ctx.save();
    ctx.shadowColor = `${gradeColor}99`;
    ctx.shadowBlur = 30;
    ctx.beginPath();
    ctx.arc(badgeCx, badgeCy, 46, 0, Math.PI * 2);
    ctx.fillStyle = `${gradeColor}22`;
    ctx.fill();
    ctx.restore();
    ctx.lineWidth = 3;
    ctx.strokeStyle = gradeColor;
    ctx.stroke();
    ctx.fillStyle = gradeColor;
    ctx.font = "700 44px monospace";
    ctx.textAlign = "center";
    ctx.fillText(grade, badgeCx, badgeCy + 16);
    ctx.fillStyle = c.textFaint;
    ctx.font = "600 14px sans-serif";
    ctx.fillText("GRADE", badgeCx, badgeCy + 68);
    ctx.textAlign = "left";
  }

  if (traderAlias) {
    ctx.fillStyle = c.text;
    ctx.font = "700 30px sans-serif";
    ctx.fillText(traderAlias, 80, 160);
  }

  ctx.fillStyle = c.text;
  ctx.font = "700 58px monospace";
  ctx.fillText("MY TRADING WEEK", 80, traderAlias ? 226 : 196);

  ctx.fillStyle = c.textMuted;
  ctx.font = "400 24px sans-serif";
  ctx.fillText(`${rangeLabel} \u00b7 ${tradeCount} trade${tradeCount === 1 ? "" : "s"}`, 80, traderAlias ? 266 : 236);

  ctx.fillStyle = c.textFaint;
  ctx.font = "600 20px sans-serif";
  ctx.fillText("NET RETURN", 80, traderAlias ? 320 : 300);

  const numText = fmtPct(netPct);
  ctx.font = "700 96px monospace";
  const numWidth = ctx.measureText(numText).width;
  const numGrad = ctx.createLinearGradient(80, 0, 80 + numWidth, 0);
  numGrad.addColorStop(0, lineColor);
  numGrad.addColorStop(1, tint);
  ctx.save();
  ctx.shadowColor = `${lineColor}AA`;
  ctx.shadowBlur = 32;
  ctx.fillStyle = numGrad;
  ctx.fillText(numText, 80, traderAlias ? 410 : 390);
  ctx.restore();

  const arrowUp = netPct >= 0;
  const pillX = 80 + numWidth + 26;
  const pillY = traderAlias ? 340 : 320;
  const pillW = 62;
  const pillH = 62;
  roundRect(pillX, pillY, pillW, pillH, 18);
  ctx.fillStyle = `${lineColor}22`;
  ctx.fill();
  ctx.strokeStyle = `${lineColor}66`;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.save();
  ctx.fillStyle = lineColor;
  const pcx = pillX + pillW / 2;
  const pcy = pillY + pillH / 2;
  const s = 16;
  ctx.beginPath();
  if (arrowUp) {
    ctx.moveTo(pcx, pcy - s);
    ctx.lineTo(pcx + s, pcy + s * 0.6);
    ctx.lineTo(pcx - s, pcy + s * 0.6);
  } else {
    ctx.moveTo(pcx, pcy + s);
    ctx.lineTo(pcx + s, pcy - s * 0.6);
    ctx.lineTo(pcx - s, pcy - s * 0.6);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  if (showDollarAmount && Number.isFinite(netDollar)) {
    ctx.fillStyle = c.textMuted;
    ctx.font = "500 24px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`${netDollar >= 0 ? "+" : "-"}$${fmtMoney(netDollar)}`, 80, 428);
  }

  const chartX = 80;
  const chartY = 440;
  const chartW = W - 160;
  const chartH = 320;

  roundRect(chartX, chartY, chartW, chartH, 20);
  const chartBg = ctx.createLinearGradient(chartX, chartY, chartX, chartY + chartH);
  chartBg.addColorStop(0, c.surface);
  chartBg.addColorStop(1, `${c.surface}CC`);
  ctx.fillStyle = chartBg;
  ctx.fill();
  ctx.save();
  ctx.shadowColor = `${lineColor}33`;
  ctx.shadowBlur = 20;
  ctx.strokeStyle = `${lineColor}55`;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  const padX = 40;
  const padY = 36;
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

  ctx.strokeStyle = c.textFaint;
  ctx.setLineDash([6, 6]);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(plotX, yFor(0));
  ctx.lineTo(plotX + plotW, yFor(0));
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.beginPath();
  ctx.moveTo(xFor(0), yFor(0));
  curve.forEach((p, i) => ctx.lineTo(xFor(i), yFor(p.pct)));
  ctx.lineTo(xFor(curve.length - 1), yFor(0));
  ctx.closePath();
  const areaGrad = ctx.createLinearGradient(0, plotY, 0, plotY + plotH);
  areaGrad.addColorStop(0, `${lineColor}70`);
  areaGrad.addColorStop(1, `${lineColor}00`);
  ctx.fillStyle = areaGrad;
  ctx.fill();

  ctx.beginPath();
  curve.forEach((p, i) => {
    const x = xFor(i);
    const y = yFor(p.pct);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 5;
  ctx.lineJoin = "round";
  ctx.shadowColor = `${lineColor}AA`;
  ctx.shadowBlur = 20;
  ctx.stroke();
  ctx.shadowBlur = 0;

  curve.forEach((p, i) => {
    if (i === 0) return;
    const x = xFor(i);
    const y = yFor(p.pct);
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = c.bgTo;
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = lineColor;
    ctx.stroke();
  });

  const lastX = xFor(curve.length - 1);
  const lastY = yFor(curve[curve.length - 1].pct);

  [22, 14].forEach((rr, idx) => {
    ctx.beginPath();
    ctx.arc(lastX, lastY, rr, 0, Math.PI * 2);
    ctx.strokeStyle = `${lineColor}${idx === 0 ? "22" : "44"}`;
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  ctx.save();
  ctx.shadowColor = `${lineColor}CC`;
  ctx.shadowBlur = 22;
  ctx.beginPath();
  ctx.arc(lastX, lastY, 9, 0, Math.PI * 2);
  ctx.fillStyle = lineColor;
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.arc(lastX, lastY, 9, 0, Math.PI * 2);
  ctx.strokeStyle = c.dotRing;
  ctx.lineWidth = 3;
  ctx.stroke();

  const fmtRatioLocal = (n) => (Number.isFinite(n) ? n.toFixed(2) : "\u221e");

  // ---- plain stat chips (no icon badges) ----
  const drawChipRow = (y, stats, chipH = 110) => {
    const gap = 24;
    const chipW = (W - 160 - gap * 2) / 3;
    stats.forEach((s, i) => {
      const x = chartX + i * (chipW + gap);
      roundRect(x, y, chipW, chipH, 20);
      const cardGrad = ctx.createLinearGradient(x, y, x, y + chipH);
      cardGrad.addColorStop(0, c.surface);
      cardGrad.addColorStop(1, `${c.surface}CC`);
      ctx.fillStyle = cardGrad;
      ctx.fill();
      ctx.strokeStyle = s.accent ? `${s.color}66` : c.border;
      ctx.lineWidth = s.accent ? 2 : 1;
      ctx.stroke();

      ctx.textAlign = "center";
      ctx.fillStyle = c.textFaint;
      ctx.font = "600 15px sans-serif";
      ctx.fillText(s.label, x + chipW / 2, y + 34);

      ctx.fillStyle = s.color;
      ctx.font = `700 ${s.small ? 26 : 32}px monospace`;
      ctx.fillText(s.value, x + chipW / 2, y + (s.small ? 74 : 76));

      if (s.sub) {
        ctx.fillStyle = c.textFaint;
        ctx.font = "500 13px sans-serif";
        ctx.fillText(s.sub, x + chipW / 2, y + 96);
      }

      if (typeof s.bar === "number") {
        const barW = chipW - 32;
        const barX = x + 16;
        const barY = y + chipH - 20;
        roundRect(barX, barY, barW, 6, 3);
        ctx.fillStyle = `${s.color}22`;
        ctx.fill();
        const filled = Math.max(0.04, Math.min(1, s.bar));
        roundRect(barX, barY, barW * filled, 6, 3);
        ctx.fillStyle = s.color;
        ctx.fill();
      }

      ctx.textAlign = "left";
    });
    return y + chipH;
  };

  const row1Y = chartY + chartH + 44;
  const row1Bottom = drawChipRow(row1Y, [
    { label: "WIN RATE", value: `${fmt(winRate, 0)}%`, color: c.text },
    { label: "BEST STREAK", value: `+${bestStreak}`, color: c.green },
    { label: "WORST STREAK", value: `${worstStreak}`, color: worstStreak < 0 ? c.red : c.text },
  ]);

  const row2Y = row1Bottom + 20;
  const row2Bottom = drawChipRow(row2Y, [
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

  const row3Y = row2Bottom + 20;
  const row3Bottom = drawChipRow(
    row3Y,
    [
      {
        label: "PROFIT FACTOR",
        value: fmtRatioLocal(profitFactor),
        color: Number.isFinite(profitFactor) && profitFactor >= 1.5 ? c.green : c.goldBright,
        sub: !Number.isFinite(profitFactor)
          ? "No losses"
          : profitFactor >= 2
          ? "Excellent"
          : profitFactor >= 1.5
          ? "Solid"
          : profitFactor >= 1
          ? "Breakeven+"
          : "Under 1.0",
      },
      {
        label: "TOP PAIR",
        value: topPair ? `${topPair.pair}` : "\u2014",
        color: c.goldBright,
        small: true,
        sub: topPair ? `${topPair.count} trade${topPair.count === 1 ? "" : "s"}` : undefined,
      },
      {
        label: "TRADE PACE",
        value: paceTrend || "Even",
        color: paceTrend === "Front-loaded" ? c.gold : paceTrend === "Back-loaded" ? c.goldBright : c.text,
        small: true,
        sub: "vs rest of week",
      },
    ],
    140
  );

  // ---- Deeper Stats ----
  const deeperTitleY = row3Bottom + 56;
  ctx.fillStyle = c.gold;
  roundRect(chartX, deeperTitleY - 20, 5, 26, 3);
  ctx.fill();
  ctx.fillStyle = c.textMuted;
  ctx.font = "600 22px monospace";
  ctx.textAlign = "left";
  ctx.fillText("DEEPER STATS", chartX + 18, deeperTitleY);

  const deeperRowY = deeperTitleY + 34;
  drawChipRow(
    deeperRowY,
    [
      {
        label: "RECOVERY FACTOR",
        value: fmtRatioLocal(recoveryFactor),
        color: Number.isFinite(recoveryFactor) && recoveryFactor >= 2 ? c.green : c.goldBright,
        sub: !Number.isFinite(recoveryFactor)
          ? "No drawdown"
          : recoveryFactor >= 4
          ? "Excellent"
          : recoveryFactor >= 2
          ? "Solid"
          : "Needs work",
      },
      {
        label: "CONSISTENCY",
        value: consistencyLabel || "\u2014",
        color:
          consistencyLabel === "Low"
            ? c.green
            : consistencyLabel === "Medium"
            ? c.gold
            : consistencyLabel === "High"
            ? c.red
            : c.textMuted,
        sub: consistencyLabel ? "Day-to-day volatility" : "Not enough data",
      },
      {
        label: "ACTIVE DAYS",
        value: `${activeDays}/7`,
        color: c.text,
        sub: "Days you traded",
      },
    ],
    140
  );

  ctx.fillStyle = c.textFaint;
  ctx.font = "400 20px monospace";
  ctx.textAlign = "left";
  ctx.fillText(
    showDollarAmount ? "Process metrics, with the numbers to back it up." : "No dollar amounts \u2014 just the process.",
    80,
    H - 70
  );

  ctx.textAlign = "right";
  ctx.fillStyle = c.goldBright;
  ctx.font = "600 22px monospace";
  ctx.fillText("LEDGER", W - 80, H - 70);
  ctx.textAlign = "left";

  return canvas.toDataURL("image/png");
}

function OnboardingTip({ id, text, settings, persistSettings }) {
  if (!settings.showOnboardingTips) return null;
  if ((settings.onboardingDismissed || []).includes(id)) return null;
  return (
    <div
      className="rounded-2xl p-3 mb-4 flex items-start gap-2"
      style={{ background: `${palette.gold}14`, border: `1px solid ${palette.gold}55` }}
    >
      <Lightbulb size={14} style={{ color: palette.gold, marginTop: "2px", flexShrink: 0 }} />
      <p className="text-xs flex-1" style={{ color: palette.text }}>
        {text}
      </p>
      <button
        type="button"
        onClick={() =>
          persistSettings({
            ...settings,
            onboardingDismissed: [...(settings.onboardingDismissed || []), id],
          })
        }
        style={{ color: palette.textFaint, flexShrink: 0 }}
        aria-label="Dismiss tip"
      >
        <X size={13} />
      </button>
    </div>
  );
}


export default function LedgerApp() {
  const [activeTab, setActiveTab] = useState("risk");
  const ActiveTabIcon = TABS.find((t) => t.id === activeTab)?.icon || Scale;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pulseOpen, setPulseOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  const [accounts, setAccounts] = useState([]);
  const [accountsLoaded, setAccountsLoaded] = useState(false);
  const [activeAccountId, setActiveAccountId] = useState(null);
  const [addingAccount, setAddingAccount] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [accountNameError, setAccountNameError] = useState("");
  const [editingAccountId, setEditingAccountId] = useState(null);
  const [editAccountName, setEditAccountName] = useState("");
  const [pendingAccountDelete, setPendingAccountDelete] = useState(null);
  const [accountDataLoaded, setAccountDataLoaded] = useState(false);

  const [riskSubTab, setRiskSubTab] = useState("challenge");
  const [edgeProjectionPeriodIdx, setEdgeProjectionPeriodIdx] = useState(1);
  const [pfFirmId, setPfFirmId] = useState(null);
  const [linkedFirm, setLinkedFirm] = useState(null); // { firmName, planLabel } once applied from the Prop Firm tab
  const [pfPlanId, setPfPlanId] = useState(null);
  const [pfSizeAmount, setPfSizeAmount] = useState(null);
  const [pfPhaseIdx, setPfPhaseIdx] = useState(0);
  const [pfSearch, setPfSearch] = useState("");
  const [pfMarketType, setPfMarketType] = useState("all");
  const [pfCompareMode, setPfCompareMode] = useState(false);
  const [pfCompareIds, setPfCompareIds] = useState([]);
  const [pfSortBy, setPfSortBy] = useState(null);
  const [pfFilterDdMode, setPfFilterDdMode] = useState("all");
  const [pfFilterInstant, setPfFilterInstant] = useState("all");
  const [pfFilterPhases, setPfFilterPhases] = useState("all");
  const [pfFilterPanelOpen, setPfFilterPanelOpen] = useState(false);
  const [sessionsSubTab, setSessionsSubTab] = useState("sessions");
  const [theme, setTheme] = useState("dark");
  const [themeLoaded, setThemeLoaded] = useState(false);

Object.assign(
  palette,
  theme === "light" ? LIGHT_PALETTE
    : theme === "amber" ? AMBER_PALETTE
    : theme === "forest" ? FOREST_PALETTE
    : DARK_PALETTE
);

const [edge, setEdge] = useState({
  accountBalance: "",
  rr: "",
  riskPct: "1",
  buffer: "5",
  totalTrades: "",
  totalWinTrades: "",
  totalLossTrades: "",
  tradesPerMonth: "",
});

const [cs, setCs] = useState(DEFAULT_CS_INPUTS);

  const [ps, setPs] = useState({
    balance: "",
    riskPct: "1",
    riskDollar: "",
    stopPips: "",
    valuePerPip: "10",
    preset: "forex",
  });

const threeCurveResult = useMemo(() => {
  const ratioTC = num(edge.rr);
  if (!(ratioTC > 0)) return null;

  const totalTradesTC = Math.max(0, Math.floor(num(edge.totalTrades)));
  const hasWinsInputTC = edge.totalWinTrades !== "";
  const hasLossesInputTC = edge.totalLossTrades !== "";
  let winTradesTC = Math.max(0, Math.floor(num(edge.totalWinTrades)));
  let lossTradesTC = Math.max(0, Math.floor(num(edge.totalLossTrades)));
  if (totalTradesTC > 0 && hasWinsInputTC && !hasLossesInputTC) {
    winTradesTC = Math.min(winTradesTC, totalTradesTC);
    lossTradesTC = totalTradesTC - winTradesTC;
  } else if (totalTradesTC > 0 && hasLossesInputTC && !hasWinsInputTC) {
    lossTradesTC = Math.min(lossTradesTC, totalTradesTC);
    winTradesTC = totalTradesTC - lossTradesTC;
  } else if (totalTradesTC > 0) {
    winTradesTC = Math.min(winTradesTC, totalTradesTC);
    lossTradesTC = Math.min(lossTradesTC, totalTradesTC - winTradesTC);
  }
  const hasTradeStatsTC = totalTradesTC > 0 && (hasWinsInputTC || hasLossesInputTC);
  const rrBeWinTC = (1 / (1 + ratioTC)) * 100;
  const computedWinRateTC = hasTradeStatsTC ? (winTradesTC / totalTradesTC) * 100 : rrBeWinTC;

  const tradesPerMonthTC = Math.max(0, Math.floor(num(edge.tradesPerMonth)));
  const tradesPerDayTC = tradesPerMonthTC / 30;
  const periodTC = EDGE_PROJECTION_PERIODS[edgeProjectionPeriodIdx];
  const selTradesTC = tradesPerDayTC * periodTC.days;
  if (!(selTradesTC > 0)) return null;

  const riskPctTC = num(edge.riskPct) || 1;
  const accountBalTC = num(edge.accountBalance);
  const riskDollarPerTradeTC = accountBalTC > 0 ? accountBalTC * (riskPctTC / 100) : 0;
  const spreadTC = num(edge.buffer) || 5;

  return generateThreeCurveProjection({
    winRatePct: computedWinRateTC,
    rr: ratioTC,
    spreadPct: spreadTC,
    numTrades: selTradesTC,
    riskDollarPerTrade: riskDollarPerTradeTC,
  });
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [
  edge.rr,
  edge.totalTrades,
  edge.totalWinTrades,
  edge.totalLossTrades,
  edge.tradesPerMonth,
  edge.riskPct,
  edge.accountBalance,
  edge.buffer,
  edgeProjectionPeriodIdx,
]);










const resetPropFirmWizard = () => {
  setPfFirmId(null);
  setPfPlanId(null);
  setPfSizeAmount(null);
  setPfPhaseIdx(0);
  setPfMarketType("all");
  setPfCompareMode(false);
  setPfCompareIds([]);
};

  const applyPropFirmToChallenge = (firm, plan, phase) => {
    setCs({
      ...cs,
      startBal: pfSizeAmount ? String(pfSizeAmount) : cs.startBal,
      targetPct: phase.targetPct,
      dailyLossPct: phase.dailyLossPct,
      maxDrawdownPct: phase.maxDrawdownPct,
      ddMode: phase.ddMode,
      rule: phase.consistencyPct,
      minTradingDays: plan.minTradingDays != null ? String(plan.minTradingDays) : "0",
      minTrades: plan.minTrades != null ? String(plan.minTrades) : "0",
      minDayGainPct: plan.minDayGainPct != null ? String(plan.minDayGainPct) : "0",
      profitSplitPct: plan.profitSplitPct != null ? String(plan.profitSplitPct) : cs.profitSplitPct,
    });
    const newLinkedFirm = { firmName: firm.name, planLabel: plan.label };
    setLinkedFirm(newLinkedFirm);
    if (activeAccountId) {
      window.storage
        .set(scopedKey(LINKED_FIRM_KEY, activeAccountId), JSON.stringify(newLinkedFirm), false)
        .catch(() => {});
    }
    setActiveTab("risk");
    setRiskSubTab("challenge");
  };

  const [fx, setFx] = useState({ amount: "100", from: "USD", to: "BDT", customRate: "" });
  const [calcInputsLoaded, setCalcInputsLoaded] = useState(false);

  const [liveFxRates, setLiveFxRates] = useState(null);
  const [fxRatesDate, setFxRatesDate] = useState(null);
  const [fxRatesStatus, setFxRatesStatus] = useState("idle");

  const [trades, setTrades] = useState([]);
  const [tradesLoaded, setTradesLoaded] = useState(false);
  const [tradeInput, setTradeInput] = useState("");
  const [tradePair, setTradePair] = useState("");
  const [tradeNote, setTradeNote] = useState("");
  const [tradeEmotion, setTradeEmotion] = useState(null);
  const [tradeSetup, setTradeSetup] = useState(null);
  const [startingBalance, setStartingBalance] = useState("");
  const [tradesLoadError, setTradesLoadError] = useState("");
  const [calMonth, setCalMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [showStreakInfo, setShowStreakInfo] = useState(false);
  const [showDisciplineInfo, setShowDisciplineInfo] = useState(false);

  const [expandedMetric, setExpandedMetric] = useState(null);
  const [expandedHeatmapDay, setExpandedHeatmapDay] = useState(null);
  const [insightReportMsg, setInsightReportMsg] = useState("");
  const [insightsSubTab, setInsightsSubTab] = useState("overview");

  const [journalSubTab, setJournalSubTab] = useState("log");
  const [journalEntries, setJournalEntries] = useState([]);
  const [journalLoaded, setJournalLoaded] = useState(false);
  const [journalYear, setJournalYear] = useState(() => new Date().getFullYear());
  const [journalMonth, setJournalMonth] = useState(null);
  const [journalColWidths, setJournalColWidths] = useState(DEFAULT_JOURNAL_COL_WIDTHS);
  const journalResizeRef = useRef(null);
  const journalCellRefs = useRef({});
  const [journalFocusRowId, setJournalFocusRowId] = useState(null);
  const [journalExportMsg, setJournalExportMsg] = useState("");
  const journalImportInputRef = useRef(null);
  const [journalImportMsg, setJournalImportMsg] = useState("");
  const [journalExpandedRows, setJournalExpandedRows] = useState({});
  const journalPhotoInputRef = useRef(null);
  const [journalPhotoTarget, setJournalPhotoTarget] = useState(null);
  const [journalPhotoSaving, setJournalPhotoSaving] = useState(false);
  const [journalPhotoError, setJournalPhotoError] = useState("");
  const [viewingJournalPhoto, setViewingJournalPhoto] = useState(null);
  const [pendingJournalPhotoDelete, setPendingJournalPhotoDelete] = useState(null);
  const [journalInsightYear, setJournalInsightYear] = useState(() => new Date().getFullYear());
  const [journalInsightMonth, setJournalInsightMonth] = useState(null);

  const [playbookRules, setPlaybookRules] = useState([]);
  const [playbookRulesLoaded, setPlaybookRulesLoaded] = useState(false);
  const [playbookCheckins, setPlaybookCheckins] = useState([]);
  const [playbookCheckinsLoaded, setPlaybookCheckinsLoaded] = useState(false);
  const [newRuleText, setNewRuleText] = useState("");
  const [playbookRuleError, setPlaybookRuleError] = useState("");
  const [todayResults, setTodayResults] = useState({});
  const [playbookMsg, setPlaybookMsg] = useState("");

  const [editingTradeId, setEditingTradeId] = useState(null);
  const logFormRef = useRef(null);

  const [customSetups, setCustomSetups] = useState([]);
  const [customSetupsLoaded, setCustomSetupsLoaded] = useState(false);
  const [hiddenDefaultSetupIds, setHiddenDefaultSetupIds] = useState([]);
  const [hiddenDefaultSetupsLoaded, setHiddenDefaultSetupsLoaded] = useState(false);
  const [addingSetup, setAddingSetup] = useState(false);
  const [newSetupName, setNewSetupName] = useState("");
  const [setupError, setSetupError] = useState("");

  const [customMoods, setCustomMoods] = useState([]);
  const [customMoodsLoaded, setCustomMoodsLoaded] = useState(false);
  const [addingMood, setAddingMood] = useState(false);
  const [newMoodName, setNewMoodName] = useState("");
  const [newMoodEmoji, setNewMoodEmoji] = useState("🙂");
  const [moodError, setMoodError] = useState("");

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [pendingSettingsReset, setPendingSettingsReset] = useState(false);
  const [pendingRevengeLog, setPendingRevengeLog] = useState(false);
  const [tourActive, setTourActive] = useState(false);
const [tourStep, setTourStep] = useState(0);
const [tourRect, setTourRect] = useState(null);

const startTour = () => {
  setTourStep(0);
  setTourActive(true);
};

const endTour = (markComplete = true) => {
  setTourActive(false);
  setTourRect(null);
  if (markComplete && !settings.tourCompleted) {
    persistSettings({ ...settings, tourCompleted: true });
  }
};

const goToTourStep = (idx) => {
  if (idx < 0) return;
  if (idx >= TOUR_STEPS.length) {
    endTour(true);
    return;
  }
  setTourStep(idx);
};

useEffect(() => {
  if (!settingsLoaded) return;
  if (settings.tourCompleted) return;
  if (tourActive) return;
  const t = setTimeout(() => {
    setTourStep(0);
    setTourActive(true);
  }, 700);
  return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [settingsLoaded]);

useEffect(() => {
  const tpm = Math.max(0, Math.floor(num(edge.tradesPerMonth)));
  if (tpm <= 0) return;
  const period = EDGE_PROJECTION_PERIODS[edgeProjectionPeriodIdx];
  const tradesPerDay = tpm / 30;
  const projected = Math.round(tradesPerDay * period.days);
  setEdge((e) => {
    if (String(projected) === e.totalTrades) return e;
    return { ...e, totalTrades: String(projected) };
  });
}, [edge.tradesPerMonth, edgeProjectionPeriodIdx]);

useEffect(() => {
  if (!tourActive) return;
  const step = TOUR_STEPS[tourStep];
  if (!step) return;
  if (step.tabId) setActiveTab(step.tabId);

  let cancelled = false;
  const locate = (attemptsLeft) => {
    requestAnimationFrame(() => {
      if (cancelled) return;
      if (!step.target) {
        setTourRect(null);
        return;
      }
      const el = document.querySelector(`[data-tour-id="${step.target}"]`);
      if (el) {
        const r = el.getBoundingClientRect();
        setTourRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      } else if (attemptsLeft > 0) {
        locate(attemptsLeft - 1);
      } else {
        setTourRect(null);
        setTourStep((cur) => (cur === tourStep ? Math.min(cur + 1, TOUR_STEPS.length - 1) : cur));
      }
    });
  };
  locate(6);

  const onResize = () => {
    if (!step.target) return;
    const el = document.querySelector(`[data-tour-id="${step.target}"]`);
    if (el) {
      const r = el.getBoundingClientRect();
      setTourRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    }
  };
  window.addEventListener("resize", onResize);
  return () => {
    cancelled = true;
    window.removeEventListener("resize", onResize);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [tourActive, tourStep]);

RUNTIME.REVENGE_WINDOW_MINUTES = num(settings.revengeWindowMinutes) || 15;
RUNTIME.REVENGE_WINDOW_MS = RUNTIME.REVENGE_WINDOW_MINUTES * 60 * 1000;
RUNTIME.ALARM_LEAD_MINUTES = num(settings.alarmLeadMinutes) || 15;
RUNTIME.ALARM_LEAD_MS = RUNTIME.ALARM_LEAD_MINUTES * 60 * 1000;

  const [expandedTradeId, setExpandedTradeId] = useState(null);
  const screenshotInputRef = useRef(null);
  const [screenshotTargetId, setScreenshotTargetId] = useState(null);
  const [screenshotError, setScreenshotError] = useState("");
  const [screenshotSaving, setScreenshotSaving] = useState(false);
  const [viewingScreenshot, setViewingScreenshot] = useState(null);
  const [screenshotShareMsg, setScreenshotShareMsg] = useState("");
  const [pendingScreenshotDelete, setPendingScreenshotDelete] = useState(null);

  const [newsEvents, setNewsEvents] = useState([]);
  const [newsLoaded, setNewsLoaded] = useState(false);
  const [econEvents, setEconEvents] = useState([]);
  const [econStatus, setEconStatus] = useState("idle"); // idle | loading | live | error
  const [econError, setEconError] = useState("");
  const [newEventName, setNewEventName] = useState("");
  const [newEventImpact, setNewEventImpact] = useState("high");
  const [newEventDate, setNewEventDate] = useState("");
  const [newEventTime, setNewEventTime] = useState("18:30");
  const [newEventAlarm, setNewEventAlarm] = useState(true);
  const [newsLoadError, setNewsLoadError] = useState("");

  const [notifPermission, setNotifPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );
  const [ringingEvent, setRingingEvent] = useState(null);
  const audioCtxRef = useRef(null);
  const beepIntervalRef = useRef(null);

  const shareCanvasRef = useRef(null);
  const [shareImageUrl, setShareImageUrl] = useState(null);
  const [shareError, setShareError] = useState("");

  const [currentTime, setCurrentTime] = useState(() => new Date());

   const [viewportWidth, setViewportWidth] = useState(
   typeof window !== "undefined" ? window.innerWidth : 440
  );
  useEffect(() => {
   const onResize = () => setViewportWidth(window.innerWidth);
   window.addEventListener("resize", onResize);
   return () => window.removeEventListener("resize", onResize);
  }, []);

  const isDesktop = viewportWidth >= 1024;
  const isTablet = viewportWidth >= 640 && viewportWidth < 1024;
  const isNarrowScreen = viewportWidth < 640;
  const isPro = true;

  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const [goals, setGoals] = useState({ weeklyTargetPct: "", monthlyTargetPct: "" });
  const [statementPeriod, setStatementPeriod] = useState(null); // { year, type: 'month'|'quarter'|'year', index }
  const [goalsLoaded, setGoalsLoaded] = useState(false);
  const [swRegistration, setSwRegistration] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await window.storage.get(GOALS_STORAGE_KEY, false);
        if (cancelled) return;
        if (res && res.value) {
          const parsed = JSON.parse(res.value);
          if (parsed && typeof parsed === "object") {
            setGoals({ weeklyTargetPct: parsed.weeklyTargetPct || "", monthlyTargetPct: parsed.monthlyTargetPct || "" });
          }
        }
      } catch (err) {
        // non-critical, fail silently
      } finally {
        if (!cancelled) setGoalsLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const reg = await registerAlarmServiceWorker();
      if (!cancelled) setSwRegistration(reg);
    })();
    return () => { cancelled = true; };
  }, []);

  const persistGoals = async (next) => {
    setGoals(next);
    try {
      await window.storage.set(GOALS_STORAGE_KEY, JSON.stringify(next), false);
    } catch (err) {
      // non-critical, fail silently
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await window.storage.get(FX_LAST_PAIR_KEY, false);
        if (cancelled) return;
        if (res && res.value) {
          const parsed = JSON.parse(res.value);
          if (parsed && parsed.from && parsed.to) {
            setFx((f) => ({ ...f, from: parsed.from, to: parsed.to }));
          }
        }
      } catch (err) {
        // non-critical, fail silently
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    window.storage
      .set(FX_LAST_PAIR_KEY, JSON.stringify({ from: fx.from, to: fx.to }), false)
      .catch(() => {});
  }, [fx.from, fx.to]);

    useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [edgeRes, psRes] = await Promise.allSettled([
          window.storage.get(EDGE_STORAGE_KEY, false),
          window.storage.get(PS_STORAGE_KEY, false),
        ]);
        if (cancelled) return;
        if (edgeRes.status === "fulfilled" && edgeRes.value) {
          const parsed = JSON.parse(edgeRes.value.value);
          if (parsed && typeof parsed === "object") setEdge((e) => ({ ...e, ...parsed }));
        }
        if (psRes.status === "fulfilled" && psRes.value) {
          const parsed = JSON.parse(psRes.value.value);
          if (parsed && typeof parsed === "object") setPs((p) => ({ ...p, ...parsed }));
        }
      } catch (err) {
        // non-critical, fail silently
      } finally {
        if (!cancelled) setCalcInputsLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!calcInputsLoaded) return;
    window.storage.set(EDGE_STORAGE_KEY, JSON.stringify(edge), false).catch(() => {});
  }, [edge, calcInputsLoaded]);

  useEffect(() => {
    if (!accountDataLoaded || !activeAccountId) return;
    window.storage.set(scopedKey(CS_STORAGE_KEY, activeAccountId), JSON.stringify(cs), false).catch(() => {});
  }, [cs, accountDataLoaded, activeAccountId]);

  useEffect(() => {
    if (!calcInputsLoaded) return;
    window.storage.set(PS_STORAGE_KEY, JSON.stringify(ps), false).catch(() => {});
  }, [ps, calcInputsLoaded]);

  const [copyMsg, setCopyMsg] = useState("");
  const [copyFallbackText, setCopyFallbackText] = useState("");

  const fileInputRef = useRef(null);
  const [backupMsg, setBackupMsg] = useState("");
  const [pendingImport, setPendingImport] = useState(null);
  const masterImportInputRef = useRef(null);
  const [masterExportMsg, setMasterExportMsg] = useState("");
  const [pendingMasterImport, setPendingMasterImport] = useState(null);

  const [notepadNotes, setNotepadNotes] = useState([]);
  const [notepadLoaded, setNotepadLoaded] = useState(false);
  const [activeNoteId, setActiveNoteId] = useState(null);
  const [notepadSearch, setNotepadSearch] = useState("");
  const [notepadFindOpen, setNotepadFindOpen] = useState(false);
  const [notepadFindText, setNotepadFindText] = useState("");
  const [notepadReplaceText, setNotepadReplaceText] = useState("");
  const [notepadMsg, setNotepadMsg] = useState("");
  const notepadBlockRefs = useRef({});
  const notepadRefCallbackCache = useRef({});
  const getNotepadBlockRef = (noteId, blockId) => {
    const key = `${noteId}:${blockId}`;
    if (!notepadRefCallbackCache.current[key]) {
      notepadRefCallbackCache.current[key] = (el) => {
        if (el) {
          notepadBlockRefs.current[key] = el;
          autoGrowBlock(el);
        } else {
          delete notepadBlockRefs.current[key];
          delete notepadRefCallbackCache.current[key];
        }
      };
    }
    return notepadRefCallbackCache.current[key];
  };
  const notepadActiveBlockRef = useRef({ noteId: null, blockId: null, pos: 0 });
  const [notepadFocusBlock, setNotepadFocusBlock] = useState(null);
  const [pendingNoteDelete, setPendingNoteDelete] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const themeRes = await window.storage.get(THEME_STORAGE_KEY, false);
        if (cancelled) return;
        if (themeRes && themeRes.value) {
          const t = themeRes.value;
          if (t === "light" || t === "dark") setTheme(t);
        }
      } catch (err) {
        // non-critical, fail silently
      } finally {
        if (!cancelled) setThemeLoaded(true);
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
        const [listRes, activeRes] = await Promise.allSettled([
          window.storage.get(ACCOUNTS_LIST_KEY, false),
          window.storage.get(ACCOUNTS_ACTIVE_KEY, false),
        ]);
        if (cancelled) return;

        let list = null;
        if (listRes.status === "fulfilled" && listRes.value) {
          const parsed = JSON.parse(listRes.value.value);
          if (Array.isArray(parsed) && parsed.length > 0) list = parsed;
        }

        let activeId = null;
        if (activeRes.status === "fulfilled" && activeRes.value) {
          activeId = activeRes.value.value;
        }

        if (!list) {
          const id = `acc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          list = [{ id, name: "My Account", createdAt: Date.now(), archived: false, legacy: true }];
          activeId = id;
          window.storage.set(ACCOUNTS_LIST_KEY, JSON.stringify(list), false).catch(() => {});
          window.storage.set(ACCOUNTS_ACTIVE_KEY, id, false).catch(() => {});
        } else if (!activeId || !list.some((a) => a.id === activeId)) {
          activeId = list[0].id;
          window.storage.set(ACCOUNTS_ACTIVE_KEY, activeId, false).catch(() => {});
        }

        if (!cancelled) {
          setAccounts(list);
          setActiveAccountId(activeId);
        }
      } catch (err) {
        // non-critical, fail silently
      } finally {
        if (!cancelled) setAccountsLoaded(true);
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
        // non-critical, fail silently
      } finally {
        if (!cancelled) setCustomSetupsLoaded(true);
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
        const res = await window.storage.get(CUSTOM_MOODS_STORAGE_KEY, false);
        if (cancelled) return;
        if (res && res.value) {
          const parsed = JSON.parse(res.value);
          if (Array.isArray(parsed)) setCustomMoods(parsed.slice(0, MAX_CUSTOM_MOODS));
        }
      } catch (err) {
        // non-critical, fail silently
      } finally {
        if (!cancelled) setCustomMoodsLoaded(true);
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
        const res = await window.storage.get(SETTINGS_STORAGE_KEY, false);
        if (cancelled) return;
        if (res && res.value) {
          const parsed = JSON.parse(res.value);
          if (parsed && typeof parsed === "object") {
            setSettings({ ...DEFAULT_SETTINGS, ...parsed });
          }
        }
      } catch (err) {
        // non-critical, fail silently
      } finally {
        if (!cancelled) setSettingsLoaded(true);
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
        const widthsRes = await window.storage.get(JOURNAL_COLS_STORAGE_KEY, false);
        if (cancelled) return;
        if (widthsRes && widthsRes.value) {
          const parsed = JSON.parse(widthsRes.value);
          if (parsed && typeof parsed === "object") {
            setJournalColWidths({ ...DEFAULT_JOURNAL_COL_WIDTHS, ...parsed });
          }
        }
      } catch (err) {
        // non-critical, fail silently
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!accountsLoaded || !activeAccountId) return;
    let cancelled = false;
    setAccountDataLoaded(false);
    (async () => {
      const acc = accounts.find((a) => a.id === activeAccountId);
      const isLegacy = !!(acc && acc.legacy);
      try {
const [balRes, csRes, tradesRes, journalRes, playbookRulesRes, playbookCheckinsRes, notepadRes, linkedFirmRes] =
  await Promise.allSettled([
    window.storage.get(scopedKey(STORAGE_BAL_KEY, activeAccountId), false),
    window.storage.get(scopedKey(CS_STORAGE_KEY, activeAccountId), false),
    window.storage.get(scopedKey(STORAGE_KEY, activeAccountId), false),
    window.storage.get(scopedKey(JOURNAL_STORAGE_KEY, activeAccountId), false),
    window.storage.get(scopedKey(PLAYBOOK_RULES_KEY, activeAccountId), false),
    window.storage.get(scopedKey(PLAYBOOK_CHECKINS_KEY, activeAccountId), false),
    window.storage.get(scopedKey(NOTEPAD_STORAGE_KEY, activeAccountId), false),
    window.storage.get(scopedKey(LINKED_FIRM_KEY, activeAccountId), false),
  ]);
        if (cancelled) return;

        // Starting balance
        if (balRes.status === "fulfilled" && balRes.value) {
          setStartingBalance(balRes.value.value);
        } else if (isLegacy) {
          const legacyBal = await window.storage.get(STORAGE_BAL_KEY, false).catch(() => null);
          if (!cancelled) setStartingBalance(legacyBal ? legacyBal.value : "");
        } else {
          setStartingBalance("");
        }

        // Challenge calculator inputs
        if (csRes.status === "fulfilled" && csRes.value) {
          const parsed = JSON.parse(csRes.value.value);
          if (parsed && typeof parsed === "object") setCs({ ...DEFAULT_CS_INPUTS, ...parsed });
        } else if (isLegacy) {
          const legacyCs = await window.storage.get(CS_STORAGE_KEY, false).catch(() => null);
          if (!cancelled && legacyCs) {
            const parsed = JSON.parse(legacyCs.value);
            setCs(parsed && typeof parsed === "object" ? { ...DEFAULT_CS_INPUTS, ...parsed } : DEFAULT_CS_INPUTS);
          } else if (!cancelled) {
            setCs(DEFAULT_CS_INPUTS);
          }
        } else {
          setCs(DEFAULT_CS_INPUTS);
        }

        // Trades
        if (tradesRes.status === "fulfilled" && tradesRes.value) {
          const parsed = JSON.parse(tradesRes.value.value);
          if (!cancelled) setTrades(Array.isArray(parsed) ? parsed : []);
        } else if (isLegacy) {
          const legacyTrades = await window.storage.get(STORAGE_KEY, false).catch(() => null);
          if (!cancelled) {
            try {
              const parsed = legacyTrades ? JSON.parse(legacyTrades.value) : [];
              setTrades(Array.isArray(parsed) ? parsed : []);
            } catch (e) {
              setTrades([]);
            }
          }
        } else if (!cancelled) {
          setTrades([]);
        }

        // Journal entries
        if (journalRes.status === "fulfilled" && journalRes.value) {
          const parsed = JSON.parse(journalRes.value.value);
          if (!cancelled) setJournalEntries(Array.isArray(parsed) ? parsed : []);
        } else if (isLegacy) {
          const legacyJournal = await window.storage.get(JOURNAL_STORAGE_KEY, false).catch(() => null);
          if (!cancelled) {
            try {
              const parsed = legacyJournal ? JSON.parse(legacyJournal.value) : [];
              setJournalEntries(Array.isArray(parsed) ? parsed : []);
            } catch (e) {
              setJournalEntries([]);
            }
          }
        } else if (!cancelled) {
          setJournalEntries([]);
        }

        // Playbook rules (seed starter rules for a brand-new account)
        let loadedRules = null;
        if (playbookRulesRes.status === "fulfilled" && playbookRulesRes.value) {
          const parsed = JSON.parse(playbookRulesRes.value.value);
          if (Array.isArray(parsed)) loadedRules = parsed;
        } else if (isLegacy) {
          const legacyRules = await window.storage.get(PLAYBOOK_RULES_KEY, false).catch(() => null);
          if (legacyRules) {
            try {
              const parsed = JSON.parse(legacyRules.value);
              if (Array.isArray(parsed)) loadedRules = parsed;
            } catch (e) {
              // ignore
            }
          }
        }
        if (!cancelled) {
          if (loadedRules) {
            setPlaybookRules(loadedRules);
          } else {
            const seeded = PLAYBOOK_STARTER_RULES.map((text, i) => ({
              id: `rule-${Date.now()}-${i}`,
              text,
            }));
            setPlaybookRules(seeded);
            window.storage
              .set(scopedKey(PLAYBOOK_RULES_KEY, activeAccountId), JSON.stringify(seeded), false)
              .catch(() => {});
          }
        }

        // Playbook check-ins
        if (playbookCheckinsRes.status === "fulfilled" && playbookCheckinsRes.value) {
          const parsed = JSON.parse(playbookCheckinsRes.value.value);
          if (!cancelled) setPlaybookCheckins(Array.isArray(parsed) ? parsed : []);
        } else if (isLegacy) {
          const legacyCheckins = await window.storage.get(PLAYBOOK_CHECKINS_KEY, false).catch(() => null);
          if (!cancelled) {
            try {
              const parsed = legacyCheckins ? JSON.parse(legacyCheckins.value) : [];
              setPlaybookCheckins(Array.isArray(parsed) ? parsed : []);
            } catch (e) {
              setPlaybookCheckins([]);
            }
          }
        } else if (!cancelled) {
          setPlaybookCheckins([]);
        }


        // Notepad notes
        if (notepadRes.status === "fulfilled" && notepadRes.value) {
          const parsed = JSON.parse(notepadRes.value.value);
          if (!cancelled) setNotepadNotes(Array.isArray(parsed) ? parsed.map(migrateNoteShape) : []);
        } else if (isLegacy) {
          const legacyNotes = await window.storage.get(NOTEPAD_STORAGE_KEY, false).catch(() => null);
          if (!cancelled) {
            try {
              const parsed = legacyNotes ? JSON.parse(legacyNotes.value) : [];
              setNotepadNotes(Array.isArray(parsed) ? parsed.map(migrateNoteShape) : []);
            } catch (e) {
              setNotepadNotes([]);
            }
          }
        } else if (!cancelled) {
          setNotepadNotes([]);
        }

        // Linked prop firm (shown under Profit Split on the Challenge tab)
        if (linkedFirmRes.status === "fulfilled" && linkedFirmRes.value) {
          try {
            const parsed = JSON.parse(linkedFirmRes.value.value);
            if (!cancelled) setLinkedFirm(parsed && typeof parsed === "object" ? parsed : null);
          } catch (e) {
            if (!cancelled) setLinkedFirm(null);
          }
        } else if (!cancelled) {
          setLinkedFirm(null);
        }

      } catch (err) {
        // non-critical, fail silently

      } finally {
        if (!cancelled) {
          setAccountDataLoaded(true);
          setTradesLoaded(true);
          setJournalLoaded(true);
          setPlaybookRulesLoaded(true);
          setPlaybookCheckinsLoaded(true);
          setNotepadLoaded(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountsLoaded, activeAccountId]);

  useEffect(() => {
    if (!playbookCheckinsLoaded) return;
    const todayKey = dayKeyFromDate(new Date());
    const existing = playbookCheckins.find((c) => c.date === todayKey);
    setTodayResults(existing ? { ...existing.results } : {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playbookCheckinsLoaded, activeAccountId]);

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cached = await window.storage.get(FMP_STORAGE_KEY, false);
        if (cached && cached.value) {
          const parsed = JSON.parse(cached.value);
          if (Array.isArray(parsed.events)) {
            if (!cancelled) {
              setEconEvents(parsed.events);
              setEconStatus("live");
            }
            if (parsed.fetchedAt && Date.now() - parsed.fetchedAt < FMP_CACHE_MS) return;
          }
        }
      } catch (err) {
        // no cache yet — fall through to a fresh fetch
      }
      if (!cancelled) loadEconomicCalendar();
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

const setThemeMode = (mode) => {
  persistSettings({ ...settings, themeMode: mode });
  if (mode === "dark" || mode === "light" || mode === "amber" || mode === "forest") {
    setTheme(mode);
    window.storage.set(THEME_STORAGE_KEY, mode, false).catch(() => {});
  }
};

  useEffect(() => {
    if (settings.themeMode !== "auto") return;
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => setTheme(mq.matches ? "dark" : "light");
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [settings.themeMode]);

useEffect(() => {
    if (settingsLoaded && settings.defaultLandingTab) {
      setActiveTab(settings.defaultLandingTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsLoaded]);

  useEffect(() => {
    if (!settingsLoaded) return;
    const hidden = settings.hiddenTabs || [];
    if (hidden.includes(activeTab)) {
      const fallback = TABS.find((t) => !hidden.includes(t.id));
      if (fallback) setActiveTab(fallback.id);
    }
  }, [settings.hiddenTabs, activeTab, settingsLoaded]);

  useEffect(() => {
    if (settingsLoaded && settings.defaultInsightsTab) {
      setInsightsSubTab(settings.defaultInsightsTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsLoaded]);

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
      const notifOptions = {
        body: `Scheduled for ${ev.time} today \u2014 open Ledger to dismiss`,
        tag: `ledger-alarm-${ev.id}`,
      };
      if (swRegistration && swRegistration.active) {
        try {
          swRegistration.active.postMessage({
            type: "SHOW_NOTIFICATION",
            title: `\u23F0 ${ev.name}`,
            options: notifOptions,
          });
        } catch (err) {
          // fall through to the plain Notification below
        }
      }
      try {
        new Notification(`\u23F0 ${ev.name}`, notifOptions);
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
            : Number.isFinite(occMs) && nowMs >= occMs - RUNTIME.ALARM_LEAD_MS && nowMs < occMs + ALARM_STALE_WINDOW_MS
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

  const loadEconomicCalendar = async () => {
    setEconError("");
    setEconStatus("loading");
    try {
      const events = await fetchEconomicCalendar();
      setEconEvents(events);
      setEconStatus("live");
      window.storage
        .set(FMP_STORAGE_KEY, JSON.stringify({ events, fetchedAt: Date.now() }), false)
        .catch(() => {});
    } catch (err) {
      setEconStatus("error");
      setEconError(err.message || "Couldn't load the economic calendar.");
    }
  };

  const persistTrades = async (next) => {
    setTrades(next);
    if (!activeAccountId) return;
    try {
      await window.storage.set(scopedKey(STORAGE_KEY, activeAccountId), JSON.stringify(next), false);
    } catch (err) {
      // non-critical, fail silently
    }
  };

  const persistStartingBalance = async (val) => {
    setStartingBalance(val);
    if (!activeAccountId) return;
    try {
      await window.storage.set(scopedKey(STORAGE_BAL_KEY, activeAccountId), val, false);
    } catch (err) {
      // starting balance is non-critical, fail silently
    }
  };

  const persistCustomSetups = async (next) => {
    setCustomSetups(next);
    try {
      await window.storage.set(CUSTOM_SETUPS_STORAGE_KEY, JSON.stringify(next), false);
    } catch (err) {
      // non-critical, fail silently
    }
  };

  const persistHiddenDefaultSetups = async (next) => {
    setHiddenDefaultSetupIds(next);
    try {
      await window.storage.set(HIDDEN_DEFAULT_SETUPS_KEY, JSON.stringify(next), false);
    } catch (err) {
      // non-critical, fail silently
    }
  };

  const persistCustomMoods = async (next) => {
    setCustomMoods(next);
    try {
      await window.storage.set(CUSTOM_MOODS_STORAGE_KEY, JSON.stringify(next), false);
    } catch (err) {
      // non-critical, fail silently
    }
  };

  const persistSettings = async (next) => {
    setSettings(next);
    try {
      await window.storage.set(SETTINGS_STORAGE_KEY, JSON.stringify(next), false);
    } catch (err) {
      // non-critical, fail silently
    }
  };

  const defaultBalanceInputRef = useRef(null);
  const defaultBalanceDebounceRef = useRef(null);

  const applyDefaultAccountBalance = (value) => {
    persistSettings({ ...settings, defaultAccountBalance: value });
    if (!value) return;
    setEdge((e) => (e.accountBalance === "" ? { ...e, accountBalance: value } : e));
    setCs((c) => (c.startBal === "" ? { ...c, startBal: value } : c));
    setPs((p) => (p.balance === "" ? { ...p, balance: value } : p));
    if (startingBalance === "") persistStartingBalance(value);
  };

  const scheduleDefaultBalanceApply = () => {
    if (defaultBalanceDebounceRef.current) clearTimeout(defaultBalanceDebounceRef.current);
    defaultBalanceDebounceRef.current = setTimeout(() => {
      const el = defaultBalanceInputRef.current;
      if (el) applyDefaultAccountBalance(el.value);
    }, 900);
  };

  const persistAccounts = async (next) => {
    setAccounts(next);
    try {
      await window.storage.set(ACCOUNTS_LIST_KEY, JSON.stringify(next), false);
    } catch (err) {
      // non-critical, fail silently
    }
  };

  const persistActiveAccountId = async (id) => {
    setActiveAccountId(id);
    try {
      await window.storage.set(ACCOUNTS_ACTIVE_KEY, id, false);
    } catch (err) {
      // non-critical, fail silently
    }
  };

const switchAccount = (id) => {
  if (id !== activeAccountId) {
    setAccountDataLoaded(false);
    setLinkedFirm(null);
    setActiveNoteId(null); // add this
    persistActiveAccountId(id);
  }
};

  const confirmAddAccount = () => {
    const name = newAccountName.trim();
    if (!name) return;
    if (name.length > 40) {
      setAccountNameError("Keep it under 40 characters.");
      return;
    }
    const id = `acc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const next = [...accounts, { id, name, createdAt: Date.now(), archived: false }];
    persistAccounts(next);
    persistActiveAccountId(id);
    setAddingAccount(false);
    setNewAccountName("");
    setAccountNameError("");
  };

  const confirmRenameAccount = () => {
    const name = editAccountName.trim();
    if (!name || !editingAccountId) {
      setEditingAccountId(null);
      return;
    }
    persistAccounts(accounts.map((a) => (a.id === editingAccountId ? { ...a, name } : a)));
    setEditingAccountId(null);
  };

  const confirmDeleteAccount = () => {
    if (!pendingAccountDelete) return;
    const remaining = accounts.filter((a) => a.id !== pendingAccountDelete);
    if (remaining.length === 0) {
      setPendingAccountDelete(null);
      return;
    }
    persistAccounts(remaining);
    if (activeAccountId === pendingAccountDelete) {
      persistActiveAccountId(remaining[0].id);
    }
    setPendingAccountDelete(null);
  };

const selectInsightsSubTab = (id) => {
    setInsightsSubTab(id);
    persistSettings({ ...settings, defaultInsightsTab: id });
  };

  const toggleHiddenTab = (tabId) => {
    const current = settings.hiddenTabs || [];
    const isHidden = current.includes(tabId);
    let next;
    if (isHidden) {
      next = current.filter((id) => id !== tabId);
    } else {
      if (current.length >= TABS.length - 1) return; // never hide the last visible tab
      next = [...current, tabId];
    }
    persistSettings({ ...settings, hiddenTabs: next });
  };

  const togglePinnedMobileTab = (tabId) => {
    const current = settings.mobileNavPinnedTabs || [];
    const isPinned = current.includes(tabId);
    let next;
    if (isPinned) {
      next = current.filter((id) => id !== tabId);
    } else {
      if (current.length >= MOBILE_NAV_PRIMARY_COUNT) return; // bar only fits this many + More
      next = [...current, tabId];
    }
    persistSettings({ ...settings, mobileNavPinnedTabs: next });
  };

  const removeDefaultSetup = (id) => {
    if (hiddenDefaultSetupIds.includes(id)) return;
    persistHiddenDefaultSetups([...hiddenDefaultSetupIds, id]);
    if (tradeSetup === id) setTradeSetup(null);
  };

  const restoreDefaultSetups = () => {
    persistHiddenDefaultSetups([]);
  };

  const findSetupLabel = (id) => setupMeta(id)?.label || customSetups.find((s) => s.id === id)?.label || id;

    const findMoodMeta = (id) => emotionMeta(id) || customMoods.find((m) => m.id === id);

  const openAddMood = () => {
    setMoodError("");
    setNewMoodName("");
    setNewMoodEmoji("🙂");
    setAddingMood(true);
  };

  const cancelAddMood = () => {
    setAddingMood(false);
    setNewMoodName("");
    setMoodError("");
  };

  const confirmAddMood = () => {
    const name = newMoodName.trim();
    if (!name) return;
    if (name.length > 16) {
      setMoodError("Keep it under 16 characters.");
      return;
    }
    const allLabels = [...EMOTIONS, ...customMoods].map((m) => m.label.toLowerCase());
    if (allLabels.includes(name.toLowerCase())) {
      setMoodError("That mood already exists.");
      return;
    }
    if (customMoods.length >= MAX_CUSTOM_MOODS) {
      setMoodError(`You can add up to ${MAX_CUSTOM_MOODS} custom moods.`);
      return;
    }
    const id = `custom-mood-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const next = [...customMoods, { id, label: name, emoji: newMoodEmoji || "🙂" }];
    persistCustomMoods(next);
    setAddingMood(false);
    setNewMoodName("");
    setMoodError("");
  };

  const removeCustomMood = (id) => {
    persistCustomMoods(customMoods.filter((m) => m.id !== id));
    if (tradeEmotion === id) setTradeEmotion(null);
  };

  const persistJournalEntries = async (next) => {
    setJournalEntries(next);
    if (!activeAccountId) return;
    try {
      await window.storage.set(scopedKey(JOURNAL_STORAGE_KEY, activeAccountId), JSON.stringify(next), false);
    } catch (err) {
      // non-critical, fail silently
    }
  };
const ensureJournalRowForDate = (dateKey, setupId) => {
    const exists = journalEntries.some((r) => r.date === dateKey);
    if (exists) return; // never overwrite a day you've already journaled
    const id = `j-auto-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    persistJournalEntries([
      ...journalEntries,
     { id, date: dateKey, pair: "", trend: "", rr: "", pnl: "", setup: setupId || "", outcome: "", mistake: "", note: "" },
    ]);
  };

const outcomeFromPnl = (pnl) => (pnl > 0 ? "win" : pnl < 0 ? "loss" : "breakeven");

const syncTradeToJournal = (trade) => {
  const alreadySynced = journalEntries.some((r) => r.sourceTradeId === trade.id);
  if (alreadySynced) return;
  const newRow = {
    id: `j-sync-${trade.id}`,
    date: dayKeyFromTs(trade.ts),
    pair: trade.pair || "",
    trend: "",
    rr: "",
    pnl: String(trade.pnl),
    setup: trade.setup || "",
    outcome: outcomeFromPnl(trade.pnl),
    session: "",
    mood: trade.emotion || "",
    confidence: "",
    mistake: "",
    note: trade.note || "",
    sourceTradeId: trade.id,
  };
  persistJournalEntries([...journalEntries, newRow]);
};

const updateSyncedJournalRow = (trade) => {
  persistJournalEntries(
    journalEntries.map((r) =>
      r.sourceTradeId === trade.id
        ? {
            ...r,
            pair: trade.pair || "",
            pnl: String(trade.pnl),
            setup: trade.setup || "",
            outcome: outcomeFromPnl(trade.pnl),
            mood: trade.emotion || "",
            note: trade.note || "",
          }
        : r
    )
  );
};

  const persistJournalColWidths = async (next) => {
    try {
      await window.storage.set(JOURNAL_COLS_STORAGE_KEY, JSON.stringify(next), false);
    } catch (err) {
      // non-critical, fail silently
    }
  };

  const updateJournalField = (id, field, value, dateForRow) => {
    const exists = journalEntries.some((r) => r.id === id);
    if (exists) {
      persistJournalEntries(journalEntries.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
      return;
    }
    const newRow = { id, date: dateForRow, pair: "", trend: "", rr: "", setup: "", mistake: "", note: "", [field]: value };
    persistJournalEntries([...journalEntries, newRow]);
  };

  const updateJournalPnl = (id, value, dateForRow) => {
    const n = parseFloat(value);
    const patch = { pnl: value };
    if (value !== "" && Number.isFinite(n) && n !== 0) {
      patch.outcome = n > 0 ? "win" : "loss";
    }
    const exists = journalEntries.some((r) => r.id === id);
    if (exists) {
      persistJournalEntries(journalEntries.map((r) => (r.id === id ? { ...r, ...patch } : r)));
      return;
    }
    const newRow = {
      id,
      date: dateForRow,
      pair: "",
      trend: "",
      rr: "",
      setup: "",
      outcome: "",
      mistake: "",
      note: "",
      ...patch,
    };
    persistJournalEntries([...journalEntries, newRow]);
  };

  const addJournalRow = (defaultDate) => {
    const id = `j-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const date = defaultDate || dayKeyFromDate(new Date());
    persistJournalEntries([
      ...journalEntries,
      { id, date, pair: "", trend: "", rr: "", pnl: "", setup: "", outcome: "", mistake: "", note: "" },
    ]);
    setJournalFocusRowId(id);
  };

    const deleteJournalRow = (id) => {
    persistJournalEntries(journalEntries.filter((r) => r.id !== id));
  };

  const toggleJournalRowExpanded = (id) => {
    setJournalExpandedRows((cur) => ({ ...cur, [id]: !cur[id] }));
  };

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

  const openJournalPhotoPicker = (rowId) => {
    setJournalPhotoError("");
    setJournalPhotoTarget(rowId);
    if (journalPhotoInputRef.current) journalPhotoInputRef.current.click();
  };

  const handleJournalPhotoChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    const targetId = journalPhotoTarget;
    setJournalPhotoTarget(null);
    if (!file || !targetId) return;
    setJournalPhotoError("");
    setJournalPhotoSaving(true);
    try {
      const dataUrl = await resizeImageFile(file);
      persistJournalEntries(
        journalEntries.map((r) => {
          if (r.id !== targetId) return r;
          const existing = Array.isArray(r.photos) ? r.photos : [];
          if (existing.length >= MAX_JOURNAL_PHOTOS_PER_ROW) return r;
          return { ...r, photos: [...existing, dataUrl] };
        })
      );
    } catch (err) {
      setJournalPhotoError("Couldn't attach that image, please try again.");
    } finally {
      setJournalPhotoSaving(false);
    }
  };

  const removeJournalPhoto = (rowId, index) => {
    persistJournalEntries(
      journalEntries.map((r) => {
        if (r.id !== rowId) return r;
        return { ...r, photos: (r.photos || []).filter((_, i) => i !== index) };
      })
    );
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

  const focusJournalCell = (rowId, colId) => {
    const el = journalCellRefs.current[`${rowId}:${colId}`];
    if (el && typeof el.focus === "function") el.focus();
  };

  useEffect(() => {
    if (!journalFocusRowId) return;
    const el = journalCellRefs.current[`${journalFocusRowId}:pair`];
    if (el) {
      el.focus();
      setJournalFocusRowId(null);
    }
  }, [journalEntries, journalFocusRowId]);

  useEffect(() => {
    if (!notepadFocusBlock || !activeNoteId) return;
    const el = notepadBlockRefs.current[`${activeNoteId}:${notepadFocusBlock.blockId}`];
    if (el) {
      autoGrowBlock(el);
      el.focus();
      const pos = notepadFocusBlock.pos ?? el.value.length;
      try {
        el.setSelectionRange(pos, pos);
      } catch (err) {
        // ignore \u2014 focus still landed even if selection couldn't be set
      }
      setNotepadFocusBlock(null);
    }
  }, [notepadNotes, notepadFocusBlock, activeNoteId]);

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

  const exportJournalCSV = () => {
    setJournalExportMsg("");
    if (journalMonth === null) return;
    const monthPrefix = `${journalYear}-${pad2(journalMonth + 1)}`;
    const rows = journalEntries
      .filter((r) => r.date && r.date.startsWith(monthPrefix))
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

    if (rows.length === 0) {
      setJournalExportMsg("No entries this month yet, nothing to download.");
      return;
    }

    const escapeCsv = (val) => {
      const s = String(val ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const header = ["Date", "Pair", "Trend", "R:R", "PnL", "Setup", "Outcome", "Session", "Mood", "Confidence", "Mistake", "Note"];
    const lines = [header.join(",")];
    rows.forEach((r) => {
      const trendLabel = TREND_OPTIONS.find((t) => t.id === r.trend)?.label || r.trend || "";
      const setupLabel = r.setup ? findSetupLabel(r.setup) : "";
      lines.push(
        [
          r.date || "",
          r.pair || "",
          trendLabel,
          r.rr || "",
          r.pnl || "",
          setupLabel,
          outcomeLabel(r.outcome),
          sessionLabelFor(r.session),
          r.mood ? findMoodMeta(r.mood)?.label || "" : "",
          confidenceLabel(r.confidence),
          r.mistake || "",
          r.note || "",
        ]
          .map(escapeCsv)
          .join(",")
      );
    });

    try {
      const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ledger-journal-${monthPrefix}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      setJournalExportMsg("Downloaded.");
    } catch (err) {
      setJournalExportMsg("Couldn't create the file, please try again.");
    }
  };

  const parseJournalCSV = (text) => {
    const rows = [];
    let field = "";
    let row = [];
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          field += c;
        }
      } else if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        row.push(field);
        field = "";
      } else if (c === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else if (c === "\r") {
        // skip
      } else {
        field += c;
      }
    }
    if (field.length > 0 || row.length > 0) {
      row.push(field);
      rows.push(row);
    }
    return rows.filter((r) => r.some((v) => v && v.trim() !== ""));
  };

  const findTrendIdByLabel = (label) => {
    const l = (label || "").trim().toLowerCase();
    const found = TREND_OPTIONS.find((t) => t.label.toLowerCase() === l);
    return found ? found.id : "";
  };

    const findSetupIdByLabel = (label) => {
    const l = (label || "").trim().toLowerCase();
    if (!l) return "";
    const built = SETUPS.find((s) => s.label.toLowerCase() === l);
    if (built) return built.id;
    const custom = customSetups.find((s) => s.label.toLowerCase() === l);
    return custom ? custom.id : "";
  };

  const findOutcomeIdByLabel = (label) => {
    const l = (label || "").trim().toLowerCase();
    const found = OUTCOME_OPTIONS.find((o) => o.label.toLowerCase() === l);
    return found ? found.id : "";
  };
  const findSessionIdByLabel = (label) => {
    const l = (label || "").trim().toLowerCase();
    const found = MARKET_SESSIONS.find((s) => s.label.toLowerCase() === l);
    return found ? found.id : "";
  };
  const findMoodIdByLabel = (label) => {
    const l = (label || "").trim().toLowerCase();
    const found = EMOTIONS.find((e) => e.label.toLowerCase() === l);
    return found ? found.id : "";
  };
  const findConfidenceIdByLabel = (label) => {
    const l = (label || "").trim().toLowerCase();
    const found = CONFIDENCE_OPTIONS.find((c) => c.label.toLowerCase() === l);
    return found ? found.id : "";
  };

  const triggerJournalImport = () => {
    setJournalImportMsg("");
    if (journalImportInputRef.current) journalImportInputRef.current.click();
  };

  const importJournalCSV = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setJournalImportMsg("");
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const rows = parseJournalCSV(String(reader.result));
        if (rows.length < 2) {
          setJournalImportMsg("That file doesn't look like a Ledger journal export.");
          return;
        }
                const header = rows[0].map((h) => h.trim().toLowerCase());
        const idx = {
          date: header.indexOf("date"),
          pair: header.indexOf("pair"),
          trend: header.indexOf("trend"),
          rr: header.indexOf("r:r"),
          pnl: header.indexOf("pnl"),
          setup: header.indexOf("setup"),
          outcome: header.indexOf("outcome"),
          session: header.indexOf("session"),
          mood: header.indexOf("mood"),
          confidence: header.indexOf("confidence"),
          mistake: header.indexOf("mistake"),
          note: header.indexOf("note"),
        };
        if (idx.date === -1) {
          setJournalImportMsg("That file doesn't look like a Ledger journal export.");
          return;
        }
        const newEntries = rows
          .slice(1)
          .map((r, i) => ({
            id: `j-import-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
            date: (r[idx.date] || "").trim(),
            pair: idx.pair !== -1 ? (r[idx.pair] || "").trim() : "",
            trend: idx.trend !== -1 ? findTrendIdByLabel(r[idx.trend]) : "",
            rr: idx.rr !== -1 ? (r[idx.rr] || "").trim() : "",
            pnl: idx.pnl !== -1 ? (r[idx.pnl] || "").trim() : "",
            setup: idx.setup !== -1 ? findSetupIdByLabel(r[idx.setup]) : "",            
            outcome: idx.outcome !== -1 ? findOutcomeIdByLabel(r[idx.outcome]) : "",
            session: idx.session !== -1 ? findSessionIdByLabel(r[idx.session]) : "",
            mood: idx.mood !== -1 ? findMoodIdByLabel(r[idx.mood]) : "",
            confidence: idx.confidence !== -1 ? findConfidenceIdByLabel(r[idx.confidence]) : "",
            mistake: idx.mistake !== -1 ? (r[idx.mistake] || "").trim() : "",
            note: idx.note !== -1 ? (r[idx.note] || "").trim() : "",
          }))
          .filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.date));

        if (newEntries.length === 0) {
          setJournalImportMsg("No valid rows found in that file.");
          return;
        }
        persistJournalEntries([...journalEntries, ...newEntries]);
        setJournalImportMsg(`Imported ${newEntries.length} row${newEntries.length === 1 ? "" : "s"}.`);
      } catch (err) {
        setJournalImportMsg("Couldn't read that file, please try again.");
      }
    };
    reader.onerror = () => setJournalImportMsg("Couldn't read that file.");
    reader.readAsText(file);
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

  const persistPlaybookRules = async (next) => {
    setPlaybookRules(next);
    if (!activeAccountId) return;
    try {
      await window.storage.set(scopedKey(PLAYBOOK_RULES_KEY, activeAccountId), JSON.stringify(next), false);
    } catch (err) {
      // non-critical, fail silently
    }
  };

  const persistPlaybookCheckins = async (next) => {
    setPlaybookCheckins(next);
    if (!activeAccountId) return;
    try {
      await window.storage.set(scopedKey(PLAYBOOK_CHECKINS_KEY, activeAccountId), JSON.stringify(next), false);
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

  const deletePlaybookCheckin = (id) => {
    const deleted = playbookCheckins.find((c) => c.id === id);
    persistPlaybookCheckins(playbookCheckins.filter((c) => c.id !== id));
    if (deleted && deleted.date === dayKeyFromDate(new Date())) {
      setTodayResults({});
    }
  };

  const resetTradeForm = () => {
    setTradeInput("");
    setTradePair("");
    setTradeNote("");
    setTradeEmotion(null);
    setTradeSetup(null);
    setEditingTradeId(null);
  };

  const startEditTrade = (t) => {
    setTradeInput(String(t.pnl));
    setTradePair(t.pair || "");
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

  const commitTrade = () => {
    const pnl = num(tradeInput);
    if (editingTradeId) {
      const next = trades.map((t) =>
        t.id === editingTradeId
          ? { ...t, pnl, pair: tradePair.trim(), note: tradeNote.trim(), emotion: tradeEmotion, setup: tradeSetup }
          : t
      );
      persistTrades(next);
      if (settings.autoSyncTradesToJournal) {
        const updated = next.find((t) => t.id === editingTradeId);
        if (updated) updateSyncedJournalRow(updated);
      }
      resetTradeForm();
      return;
    }

    const newTrade = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      pnl,
      pair: tradePair.trim(),
      note: tradeNote.trim(),
      emotion: tradeEmotion,
      setup: tradeSetup,
      ts: Date.now(),
    };
    const next = [...trades, newTrade];
    persistTrades(next);
    if (settings.autoSyncTradesToJournal) {
      syncTradeToJournal(newTrade);
    } else {
      ensureJournalRowForDate(dayKeyFromDate(new Date()), tradeSetup);
    }
    resetTradeForm();
  };

  const submitTrade = () => {
    const pnl = num(tradeInput);
    if (!tradeInput || pnl === 0) return;

    if (!editingTradeId && settings.revengeLockEnabled && trades.length > 0) {
      const sorted = [...trades].sort((a, b) => a.ts - b.ts);
      const lastTrade = sorted[sorted.length - 1];
if (lastTrade.pnl < 0 && Date.now() - lastTrade.ts <= RUNTIME.REVENGE_WINDOW_MS) {
        setPendingRevengeLog(true);
        return;
      }
    }

    commitTrade();
  };

  const confirmRevengeLog = () => {
    setPendingRevengeLog(false);
    commitTrade();
  };

  const cancelRevengeLog = () => setPendingRevengeLog(false);

  const deleteTrade = (id) => {
    persistTrades(trades.filter((t) => t.id !== id));
    if (editingTradeId === id) resetTradeForm();
  };

  const clearTrades = () => {
    persistTrades([]);
    resetTradeForm();
  };

  const openScreenshotPicker = (tradeId) => {
    setScreenshotError("");
    setScreenshotTargetId(tradeId);
    if (screenshotInputRef.current) screenshotInputRef.current.click();
  };

  const handleScreenshotChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
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
        if (err && err.name === "AbortError") return;
      }
    }

    downloadImageFile(file, filename, "Sharing isn't available now \u2014 download instead.");
  };

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

    const weekJournalRows = journalEntries.filter((r) => {
      if (!r.date) return false;
      const ts = new Date(`${r.date}T00:00:00`).getTime();
      return now - ts <= WEEK_MS;
    });

    const recap = buildWeekRecap(weekTrades, startBal, weekJournalRows, customSetups);
    const discipline = computeDisciplineStreak(trades);
    const weekPerf = computePerformanceMetrics(weekTrades);
    const weekConsistency = computeConsistencyScore(weekTrades);
    const activeDaySet = new Set(weekTrades.map((t) => dayKeyFromTs(t.ts)));

    try {
      if (!shareCanvasRef.current) {
        setShareError("Couldn't generate the image, please try again.");
        return;
      }
const weekNetDollar = weekTrades.reduce((s, t) => s + t.pnl, 0);
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
  profitFactor: recap.profitFactor,
  grade: recap.grade,
  topPair: recap.topPair,
  paceTrend: recap.paceTrend,
  recoveryFactor: weekPerf.recoveryFactor,
  consistencyLabel: weekConsistency ? weekConsistency.label : null,
  activeDays: activeDaySet.size,
  tone: recap.netPct >= 0 ? "good" : "bad",
  theme,
  showDollarAmount: !settings.hideDollarInShare,
  netDollar: weekNetDollar,
  traderAlias: settings.traderAlias,
});
      setShareImageUrl(dataUrl);
    } catch (err) {
      setShareError("Couldn't generate the image, please try again.");
    }
  };

  const closeShare = () => setShareImageUrl(null);

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
      window.open(shareImageUrl, "_blank");
    }
  };

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

    const weekJournalRows = journalEntries.filter((r) => {
      if (!r.date) return false;
      const ts = new Date(`${r.date}T00:00:00`).getTime();
      return now - ts <= WEEK_MS;
    });

    const recap = buildWeekRecap(weekTrades, startBal, weekJournalRows, customSetups);
    const discipline = computeDisciplineStreak(trades);
    const fmtRatioLocal = (n) => (Number.isFinite(n) ? n.toFixed(2) : "\u221e");

    const weekNetDollarSummary = weekTrades.reduce((s, t) => s + t.pnl, 0);
    const lines = [
      `My Trading Week \u2014 ${recap.rangeLabel}`,
      `Grade: ${recap.grade}`,
      `Trades: ${recap.tradeCount}`,
      `Win Rate: ${fmt(recap.winRate, 0)}%`,
      `Net Return: ${fmtPct(recap.netPct)}`,
      ...(!settings.hideDollarInShare
        ? [`Net P&L: ${weekNetDollarSummary >= 0 ? "+" : "-"}$${fmtMoney(weekNetDollarSummary)}`]
        : []),
      `Profit Factor: ${fmtRatioLocal(recap.profitFactor)}`,
      `Best Streak: +${recap.bestStreak}    Worst Streak: ${recap.worstStreak}`,
      `Discipline Streak: ${discipline.current} day${discipline.current === 1 ? "" : "s"} (best: ${discipline.best})`,
      `Revenge Trades This Week: ${recap.revengeCount}`,
    ];
    if (recap.topSetup) {
      lines.push(`Top Setup: ${recap.topSetup.label} (${recap.topSetup.count}x)`);
    }
    if (recap.topPair) {
      lines.push(`Most Traded Pair: ${recap.topPair.pair} (${recap.topPair.count}x)`);
    }
    if (recap.avgRR !== null) {
      lines.push(`Average R:R: ${recap.avgRR.toFixed(1)}`);
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
      notepadNotes,
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
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      setBackupMsg("Press download to download the report.");
    } catch (err) {
      setBackupMsg("Couldn't create the backup file, please try again.");
    }
  };

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
    e.target.value = "";
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
    if (Array.isArray(data.notepadNotes)) {
      persistNotepadNotes(data.notepadNotes.map(migrateNoteShape));
    }
if (data.theme === "light" || data.theme === "dark" || data.theme === "amber" || data.theme === "forest") {
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
  
    const exportAllData = () => {
    setMasterExportMsg("");
    const payload = {
      version: 2,
      kind: "ledger-master-export",
      exportedAt: new Date().toISOString(),
      startingBalance,
      trades,
      newsEvents,
      customSetups,
      hiddenDefaultSetupIds,
      customMoods,
      journalEntries,
      journalColWidths,
      playbookRules,
      playbookCheckins,
      notepadNotes,
      theme,
      settings,
      goals,
      fxLastPair: { from: fx.from, to: fx.to },
      edge,
      cs,
      ps,
    };
    try {
      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ledger-master-export-${dayKeyFromDate(new Date())}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      setMasterExportMsg("Downloaded full export.");
    } catch (err) {
      setMasterExportMsg("Couldn't create the export file, please try again.");
    }
  };

  const validateMasterImport = (data) => {
    if (!data || typeof data !== "object" || !Array.isArray(data.trades)) {
      setMasterExportMsg("That file doesn't look like a Ledger export.");
      return null;
    }
    const tradesValid = data.trades.every(
      (t) => t && typeof t.pnl === "number" && Number.isFinite(t.pnl) && typeof t.ts === "number"
    );
    if (!tradesValid) {
      setMasterExportMsg("That file doesn't look like a Ledger export.");
      return null;
    }
    return data;
  };

  const importAllDataFile = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setMasterExportMsg("");
    const reader = new FileReader();
    reader.onload = () => {
      let data;
      try {
        data = JSON.parse(reader.result);
      } catch (err) {
        setMasterExportMsg("Couldn't read that file \u2014 make sure it's a Ledger export JSON.");
        return;
      }
      const valid = validateMasterImport(data);
      if (!valid) return;
      setPendingMasterImport(valid);
    };
    reader.onerror = () => setMasterExportMsg("Couldn't read that file.");
    reader.readAsText(file);
  };

  const confirmMasterImport = () => {
    if (!pendingMasterImport) return;
    const data = pendingMasterImport;

    persistTrades(data.trades);
    if (typeof data.startingBalance === "string" || typeof data.startingBalance === "number") {
      persistStartingBalance(String(data.startingBalance));
    }
    if (Array.isArray(data.newsEvents)) persistNews(data.newsEvents);
    if (Array.isArray(data.customSetups)) persistCustomSetups(data.customSetups.slice(0, MAX_CUSTOM_SETUPS));
    if (Array.isArray(data.hiddenDefaultSetupIds)) persistHiddenDefaultSetups(data.hiddenDefaultSetupIds);
    if (Array.isArray(data.customMoods)) persistCustomMoods(data.customMoods.slice(0, MAX_CUSTOM_MOODS));
    if (Array.isArray(data.journalEntries)) persistJournalEntries(data.journalEntries);
    if (data.journalColWidths && typeof data.journalColWidths === "object") {
      const nextWidths = { ...DEFAULT_JOURNAL_COL_WIDTHS, ...data.journalColWidths };
      setJournalColWidths(nextWidths);
      persistJournalColWidths(nextWidths);
    }
    if (Array.isArray(data.playbookRules)) persistPlaybookRules(data.playbookRules.slice(0, MAX_PLAYBOOK_RULES));
    if (Array.isArray(data.playbookCheckins)) persistPlaybookCheckins(data.playbookCheckins);
    if (Array.isArray(data.notepadNotes)) persistNotepadNotes(data.notepadNotes.map(migrateNoteShape));
    if (data.theme === "light" || data.theme === "dark" || data.theme === "amber" || data.theme === "forest") {
      setTheme(data.theme);
      window.storage.set(THEME_STORAGE_KEY, data.theme, false).catch(() => {});
    }
    if (data.settings && typeof data.settings === "object") {
      persistSettings({ ...DEFAULT_SETTINGS, ...data.settings });
    }
    if (data.goals && typeof data.goals === "object") {
      persistGoals({
        weeklyTargetPct: data.goals.weeklyTargetPct || "",
        monthlyTargetPct: data.goals.monthlyTargetPct || "",
      });
    }
    if (data.fxLastPair && data.fxLastPair.from && data.fxLastPair.to) {
      setFx((f) => ({ ...f, from: data.fxLastPair.from, to: data.fxLastPair.to }));
    }
    if (data.edge && typeof data.edge === "object") {
      setEdge((e) => ({ ...e, ...data.edge }));
      window.storage.set(EDGE_STORAGE_KEY, JSON.stringify({ ...edge, ...data.edge }), false).catch(() => {});
    }
    if (data.cs && typeof data.cs === "object") {
      setCs((c) => ({ ...c, ...data.cs }));
      window.storage.set(CS_STORAGE_KEY, JSON.stringify({ ...cs, ...data.cs }), false).catch(() => {});
    }
    if (data.ps && typeof data.ps === "object") {
      setPs((p) => ({ ...p, ...data.ps }));
      window.storage.set(PS_STORAGE_KEY, JSON.stringify({ ...ps, ...data.ps }), false).catch(() => {});
    }

    setPendingMasterImport(null);
    setMasterExportMsg("Full backup restored.");
  };

  const cancelMasterImport = () => {
    setPendingMasterImport(null);
    setMasterExportMsg("");
  };

const persistNotepadNotes = async (next) => {
  setNotepadNotes(next);
  if (!activeAccountId) return;
  try {
    await window.storage.set(scopedKey(NOTEPAD_STORAGE_KEY, activeAccountId), JSON.stringify(next), false);
  } catch (err) {}
};

  const createNote = () => {
    const id = `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = Date.now();
    const firstBlockId = makeBlockId();
    const newNote = {
      id,
      title: "Untitled Note",
      blocks: [{ id: firstBlockId, type: "text", text: "" }],
      wordWrap: true,
      fontSize: DEFAULT_NOTEPAD_FONT_SIZE,
      createdAt: now,
      updatedAt: now,
    };
    persistNotepadNotes([newNote, ...notepadNotes]);
    setActiveNoteId(id);
    notepadActiveBlockRef.current = { noteId: id, blockId: firstBlockId, pos: 0 };
    setNotepadFindOpen(false);
    setNotepadMsg("");
  };

  const updateNote = (id, patch) => {
    persistNotepadNotes(
      notepadNotes.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n))
    );
  };

  const openNote = (id) => {
    setActiveNoteId(id);
    notepadActiveBlockRef.current = { noteId: null, blockId: null, pos: 0 };
    setNotepadFindOpen(false);
    setNotepadFindText("");
    setNotepadReplaceText("");
    setNotepadMsg("");
  };

  const closeNote = () => {
    setActiveNoteId(null);
    notepadActiveBlockRef.current = { noteId: null, blockId: null, pos: 0 };
    setNotepadFindOpen(false);
    setNotepadMsg("");
  };

  const requestDeleteNote = (id) => setPendingNoteDelete(id);
  const cancelDeleteNote = () => setPendingNoteDelete(null);
  const confirmDeleteNote = () => {
    if (!pendingNoteDelete) return;
    persistNotepadNotes(notepadNotes.filter((n) => n.id !== pendingNoteDelete));
    if (activeNoteId === pendingNoteDelete) setActiveNoteId(null);
    setPendingNoteDelete(null);
  };

    const toggleNoteWordWrap = (note) => updateNote(note.id, { wordWrap: note.wordWrap === false });

  const adjustNoteFontSize = (note, dir) => {
    const idx = NOTEPAD_FONT_SIZES.indexOf(note.fontSize || DEFAULT_NOTEPAD_FONT_SIZE);
    const nextIdx = Math.max(0, Math.min(NOTEPAD_FONT_SIZES.length - 1, (idx === -1 ? 2 : idx) + dir));
    updateNote(note.id, { fontSize: NOTEPAD_FONT_SIZES[nextIdx] });
  };

  const insertTextAtCursor = (note, text) => {
    const blocks = note.blocks;
    const ref = notepadActiveBlockRef.current;
    let targetIdx =
      ref.noteId === note.id ? blocks.findIndex((b) => b.id === ref.blockId && b.type === "text") : -1;
    if (targetIdx === -1) {
      for (let i = blocks.length - 1; i >= 0; i--) {
        if (blocks[i].type === "text") {
          targetIdx = i;
          break;
        }
      }
    }
    if (targetIdx === -1) {
      const newBlock = { id: makeBlockId(), type: "text", text };
      updateNote(note.id, { blocks: [...blocks, newBlock] });
      setNotepadFocusBlock({ blockId: newBlock.id, pos: text.length });
      return;
    }
    const block = blocks[targetIdx];
    const content = block.text || "";
    const pos =
      ref.noteId === note.id && ref.blockId === block.id
        ? Math.max(0, Math.min(ref.pos ?? content.length, content.length))
        : content.length;
    const nextText = content.slice(0, pos) + text + content.slice(pos);
    const newBlocks = blocks.map((b, i) => (i === targetIdx ? { ...b, text: nextText } : b));
    updateNote(note.id, { blocks: newBlocks });
    setNotepadFocusBlock({ blockId: block.id, pos: pos + text.length });
  };

  const insertDateTimeIntoNote = (note) => {
    insertTextAtCursor(note, new Date().toLocaleString());
  };

  const replaceAllInNote = (note) => {
    if (!notepadFindText) return;
    const count = countOccurrencesInBlocks(note.blocks, notepadFindText);
    if (count === 0) {
      setNotepadMsg("No matches found.");
      return;
    }
    updateNote(note.id, { blocks: replaceAllInBlocks(note.blocks, notepadFindText, notepadReplaceText) });
    setNotepadMsg(`Replaced ${count} occurrence${count === 1 ? "" : "s"}.`);
  };

  const trackNotepadCursor = (noteId, blockId) => (e) => {
    notepadActiveBlockRef.current = { noteId, blockId, pos: e.target.selectionStart };
  };

  const downloadNoteText = (note) => {
    setNotepadMsg("");
    try {
      const blob = new Blob([blocksToExportText(note.blocks)], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(note.title || "note").replace(/[^\w\-]+/g, "_") || "note"}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      setNotepadMsg("Downloaded.");
    } catch (err) {
      setNotepadMsg("Couldn't create the file, please try again.");
    }
  };

const hiddenTabIds = settings.hiddenTabs || [];
  const visibleTabs = TABS.filter((t) => !hiddenTabIds.includes(t.id));
  const navTabs = visibleTabs.length > 0 ? visibleTabs : TABS;

  const pinnedTabIdsRaw = (settings.mobileNavPinnedTabs || []).filter((id) =>
    navTabs.some((t) => t.id === id)
  );
  const mobileNavPrimaryTabs =
    pinnedTabIdsRaw.length > 0
      ? pinnedTabIdsRaw.map((id) => navTabs.find((t) => t.id === id)).filter(Boolean)
      : navTabs.slice(0, MOBILE_NAV_PRIMARY_COUNT);
  const mobileNavOverflowTabs = navTabs.filter(
    (t) => !mobileNavPrimaryTabs.some((p) => p.id === t.id)
  );
  const activeInMobileOverflow = mobileNavOverflowTabs.some((t) => t.id === activeTab);

  let body = null;

  if (activeTab === "risk") {
    const RISK_SUB_TABS = [
      { id: "challenge", label: "Challenge" },
      { id: "edge", label: "Edge" },
      { id: "size", label: "Size" },
    ];

    const ratio = num(edge.rr); // reward multiple, e.g. 2 = risking 1R to make 2R
    const buf = num(edge.buffer);
    const rrBeWin = ratio > 0 ? (1 / (1 + ratio)) * 100 : 0;
    const targetWinRate = Math.min(100, rrBeWin + buf);
    const beWin = rrBeWin;



const totalTrades = Math.max(0, Math.floor(num(edge.totalTrades)));

const enteredWins = Math.max(0, Math.floor(num(edge.totalWinTrades)));
const enteredLosses = Math.max(0, Math.floor(num(edge.totalLossTrades)));

const hasWinsInput = edge.totalWinTrades !== "";
const hasLossesInput = edge.totalLossTrades !== "";

let winTrades = enteredWins;
let lossTrades = enteredLosses;

// If total trades + wins are entered, calculate losses automatically.
if (totalTrades > 0 && hasWinsInput && !hasLossesInput) {
  winTrades = Math.min(enteredWins, totalTrades);
  lossTrades = totalTrades - winTrades;
}

// If total trades + losses are entered, calculate wins automatically.
else if (totalTrades > 0 && hasLossesInput && !hasWinsInput) {
  lossTrades = Math.min(enteredLosses, totalTrades);
  winTrades = totalTrades - lossTrades;
}

// If both are entered, keep them but never allow them above total trades.
else if (totalTrades > 0) {
  winTrades = Math.min(enteredWins, totalTrades);
  lossTrades = Math.min(enteredLosses, totalTrades - winTrades);
}

const hasTradeStats =
  totalTrades > 0 && (hasWinsInput || hasLossesInput);

const historicalWinRate =
  hasTradeStats
    ? (winTrades / totalTrades) * 100
    : 0;

const profileWinRate = rrBeWin;

const computedWinRate =
  hasTradeStats
    ? historicalWinRate
    : profileWinRate;

const lossRate =
  Math.max(0, 100 - computedWinRate);

const hasExpectancyInputs =
  ratio > 0;

// expectancy expressed in R (multiples of risk) — risking 1R per trade
const expectancy =
  hasExpectancyInputs
    ? (computedWinRate / 100) * ratio -
      (lossRate / 100) * 1
    : 0;

const per100 = expectancy * 100;

const totalProjected =
  expectancy * totalTrades;

const hasTotalProjection =
  hasExpectancyInputs &&
  totalTrades > 0;


const accountBal =
  num(edge.accountBalance);

const hasBalance =
  accountBal > 0;

const tradesPerMonth =
  Math.max(
    0,
    Math.floor(num(edge.tradesPerMonth))
  );

const tradesPerDay = tradesPerMonth / 30;

const selectedEdgePeriod = EDGE_PROJECTION_PERIODS[edgeProjectionPeriodIdx];

// Auto-fill Total Trades from Trades/Month, using the currently selected
// Projected Curve period, so the two sections stay in sync.
const selTrades = tradesPerDay * selectedEdgePeriod.days;
const selExpectedWins = selTrades * (computedWinRate / 100);
const selExpectedLosses = selTrades * (lossRate / 100);
const selProjectedR = selTrades * expectancy;
const hasSelProjection = hasExpectancyInputs && selTrades > 0;

const riskDollarPerTrade = hasBalance ? accountBal * (num(edge.riskPct) / 100) : 0;
const hasDollarProjection = hasSelProjection && hasBalance && riskDollarPerTrade > 0;
const selProjectedDollar = hasDollarProjection ? selProjectedR * riskDollarPerTrade : 0;

const EDGE_CURVE_POINTS = 40;
const edgeCurveData = Array.from({ length: EDGE_CURVE_POINTS + 1 }, (_, i) => {
  const tradeCount = (selTrades * i) / EDGE_CURVE_POINTS;
  const rVal = expectancy * tradeCount;
  return {
    trade: Math.round(tradeCount),
    r: rVal,
    pnl: riskDollarPerTrade > 0 ? rVal * riskDollarPerTrade : null,
  };
});
    const bal = num(ps.balance);
    const sizeRiskMode = settings.sizeRiskInputMode === "dollar" ? "dollar" : "percent";
    const psRiskPct = num(ps.riskPct);
    const psRiskDollar = num(ps.riskDollar);
    const stopPips = num(ps.stopPips);
    const valPerPip = num(ps.valuePerPip);
    const riskAmt = sizeRiskMode === "dollar" ? psRiskDollar : bal * (psRiskPct / 100);
    const riskPctEffective = sizeRiskMode === "dollar" ? (bal > 0 ? (psRiskDollar / bal) * 100 : 0) : psRiskPct;
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
    const maxDrawdownPct = num(cs.maxDrawdownPct) || 4;
    const ddMode = cs.ddMode === "static" ? "static" : "trail";

    const totalProfit = hasBoth ? currentBal - startBal : 0;
    const splitEarnings = totalProfit * (num(cs.profitSplitPct) / 100);
    const targetAmount = hasTarget ? startBal * (targetPct / 100) : 0;
    const progressPct = hasBoth && hasTarget && targetAmount > 0 ? (totalProfit / targetAmount) * 100 : 0;
    const remainingToTarget = hasTarget ? Math.max(0, targetAmount - totalProfit) : 0;

    const dailyLossAllowed = startBal * (dailyLossPct / 100);
    const dailyPass = hasStart ? todayLoss <= dailyLossAllowed : undefined;
    const dailyRemaining = Math.max(0, dailyLossAllowed - todayLoss);

    const peakBalance = hasBoth
      ? ddMode === "static"
        ? startBal
        : Math.max(startBal, currentBal)
      : startBal;
    const maxDrawdownAllowed = peakBalance * (maxDrawdownPct / 100);
    const floorBalance = peakBalance - maxDrawdownAllowed;
    const overallPass = hasBoth ? currentBal >= floorBalance : undefined;
    const overallRemaining = Math.max(0, currentBal - floorBalance);

    const consistencyScore = hasBoth && totalProfit > 0 ? (bestDay / totalProfit) * 100 : 0;
    const consistencyPass =
      hasBoth && totalProfit > 0 ? (rule === 0 ? true : consistencyScore <= rule) : undefined;
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
            <Readout isDesktop={isDesktop}
              eyebrow={!hasTarget ? (hasBoth && totalProfit < 0 ? "You Need More for Payout" : "Your Profit Amount") : "Profit Target Progress"}
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
rightContent={
  hasBoth && totalProfit > 0 && cs.profitSplitEnabled !== false
    ? isDesktop ? (
        <div>
          <div
            className="uppercase"
            style={{ color: palette.textFaint, letterSpacing: "0.08em", fontSize: "10px" }}
          >
            Your Cut ({cs.profitSplitPct}%)
          </div>
          <div
            style={{
              fontFamily: mono,
              fontSize: "1.1rem",
              fontWeight: 600,
              color: palette.green,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            ${fmt(splitEarnings)}
          </div>
          {linkedFirm && (
            <div style={{ color: palette.textFaint, fontSize: "10px", marginTop: "1px" }}>
              {linkedFirm.firmName} — {linkedFirm.planLabel}
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div>
            <div
              className="uppercase"
              style={{ color: palette.textFaint, letterSpacing: "0.08em", fontSize: "10px" }}
            >
              Your Cut ({cs.profitSplitPct}%)
            </div>
            {linkedFirm && (
              <div style={{ color: palette.textFaint, fontSize: "10px", marginTop: "1px" }}>
                {linkedFirm.firmName} — {linkedFirm.planLabel}
              </div>
            )}
          </div>
          <div
            style={{
              fontFamily: mono,
              fontSize: "1.1rem",
              fontWeight: 600,
              color: palette.green,
              fontVariantNumeric: "tabular-nums",
              flexShrink: 0,
              marginLeft: "8px",
            }}
          >
            ${fmt(splitEarnings)}
          </div>
        </div>
      )
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
                  : rule === 0
                  ? "No consistency rule set"
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-2">
              <StatChip isDesktop={isDesktop} label="Current Drawdown" value={`${currentDrawdownPct.toFixed(1)}%`} />
              <StatChip isDesktop={isDesktop} label="Gain to Recover" value={`+${recoveryNeededPct.toFixed(1)}%`} />
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
            <div className="lg:grid lg:grid-cols-2 lg:gap-4">
              <Field isDesktop={isDesktop} label="Starting Balance" value={cs.startBal} suffix="$" placeholder="10000" onChange={(e) => setCs({ ...cs, startBal: e.target.value })} />
              <Field isDesktop={isDesktop} label="Current Balance" value={cs.currentBal} suffix="$" placeholder="10650" onChange={(e) => setCs({ ...cs, currentBal: e.target.value })} />
            </div>

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
           <div className="lg:grid lg:grid-cols-2 lg:gap-4">
            <Field isDesktop={isDesktop}  label="Loss Today" value={cs.todayLoss} suffix="$" placeholder="0" onChange={(e) => setCs({ ...cs, todayLoss: e.target.value })} />
           </div>
            <span className="block mb-1.5 uppercase" style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}>
              Max Drawdown
            </span>
            <PillGroup
              options={[4, 5, 6, 8, 10, 12]}
              value={cs.maxDrawdownPct}
              onChange={(v) => setCs({ ...cs, maxDrawdownPct: v })}
            />

            <div className="flex gap-2 mb-4">
              {[
                { id: "trail", label: "Trailing" },
                { id: "static", label: "Static" },
              ].map((m) => {
                const active = ddMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setCs({ ...cs, ddMode: m.id })}
                    className={`px-3 py-1.5 rounded-full transition-colors ${TAP}`}
                    style={{
                      background: active ? palette.gold : palette.field,
                      color: active ? palette.letterbox : palette.textMuted,
                      border: `1px solid ${active ? palette.gold : palette.border}`,
                      fontFamily: mono,
                      fontSize: "13px",
                    }}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs mb-4" style={{ color: palette.textMuted }}>
              {ddMode === "static"
                ? `Fixed at ${maxDrawdownPct}% off your starting balance \u2014 the floor never moves even as your balance grows.`
                : `Fixed at ${maxDrawdownPct}%, trailing off your peak balance (starting or current, whichever is higher).`}
            </p>

            <span className="block mb-1.5 uppercase" style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}>
              Consistency Rule
            </span>
            <PillGroup options={[0, 15, 20, 25, 30, 40]} value={cs.rule} onChange={(v) => setCs({ ...cs, rule: v })} />
           <div className="lg:grid lg:grid-cols-2 lg:gap-4">
            <Field isDesktop={isDesktop}  label="Best Single Day Profit" value={cs.bestDay} suffix="$" placeholder="800" onChange={(e) => setCs({ ...cs, bestDay: e.target.value })} />
           </div>

                       {(() => {
              const minDaysTarget = num(cs.minTradingDays);
              if (minDaysTarget <= 0) return null;
              if (!(startBal > 0)) {
                return (
                  <p className="text-xs mb-3" style={{ color: palette.textFaint }}>
                    Enter a starting balance above to track progress toward your {minDaysTarget}-day minimum.
                  </p>
                );
              }
              const tracker = computeQualifyingTradingDays(trades, startBal, cs.minDayGainPct);
              const pct = Math.min(100, (tracker.qualifyingDays / minDaysTarget) * 100);
              const met = tracker.qualifyingDays >= minDaysTarget;
              const remaining = Math.max(0, minDaysTarget - tracker.qualifyingDays);
              return (
                <div
                  className="rounded-lg p-3 mb-4"
                  style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span style={{ color: palette.text, fontSize: "13px", fontWeight: 600 }}>
                      Minimum Trading Days Tracker
                    </span>
                    <span style={{ fontFamily: mono, fontSize: "12px", color: met ? palette.green : palette.textMuted }}>
                      {tracker.qualifyingDays} / {minDaysTarget}
                    </span>
                  </div>
                  <div style={{ height: "6px", borderRadius: "999px", background: palette.field, overflow: "hidden", marginBottom: "6px" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${pct}%`,
                        background: met ? palette.green : palette.gold,
                        borderRadius: "999px",
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>
                  <div className="text-xs" style={{ color: palette.textFaint }}>
                    {met
                      ? `Requirement met \u2014 ${tracker.qualifyingDays} qualifying day${tracker.qualifyingDays === 1 ? "" : "s"} out of ${tracker.totalDaysTraded} day${tracker.totalDaysTraded === 1 ? "" : "s"} traded.`
                      : `${remaining} more qualifying day${remaining === 1 ? "" : "s"} needed. ${tracker.totalDaysTraded} day${tracker.totalDaysTraded === 1 ? "" : "s"} traded so far, ${tracker.qualifyingDays} hit the ${cs.minDayGainPct || 0}% threshold.`}
                  </div>
                </div>
              );
            })()}

<span className="block mb-1.5 mt-4 uppercase" style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}>
  Minimum Trades
</span>
<PillGroup
  options={[0, 5, 10, 20, 30, 50]}
  suffix=""
  value={cs.minTrades}
  onChange={(v) => setCs({ ...cs, minTrades: v })}
/>

             {(() => {
  const minTradesTarget = num(cs.minTrades);
  if (minTradesTarget <= 0) return null;

  const completedTrades = trades.length;
  const pct = Math.min(100, (completedTrades / minTradesTarget) * 100);
  const met = completedTrades >= minTradesTarget;
  const remaining = Math.max(0, minTradesTarget - completedTrades);

  return (
    <div
      className="rounded-lg p-3 mb-4 mt-3"
      style={{
        background: palette.surface,
        border: `1px solid ${palette.border}`,
        boxShadow: palette.shadow,
      }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span style={{ color: palette.text, fontSize: "13px", fontWeight: 600 }}>
          Minimum Trades Tracker
        </span>

        <span
          style={{
            fontFamily: mono,
            fontSize: "12px",
            color: met ? palette.green : palette.textMuted,
          }}
        >
          {completedTrades} / {minTradesTarget}
        </span>
      </div>

      <div
        style={{
          height: "6px",
          borderRadius: "999px",
          background: palette.field,
          overflow: "hidden",
          marginBottom: "6px",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: met ? palette.green : palette.gold,
            borderRadius: "999px",
            transition: "width 0.3s ease",
          }}
        />
      </div>

      <div className="text-xs" style={{ color: palette.textFaint }}>
        {met
          ? `Requirement met — ${completedTrades} trades completed.`
          : `${remaining} more trade${remaining === 1 ? "" : "s"} needed.`}
      </div>
    </div>
  );
})()}

            <div className="lg:grid lg:grid-cols-2 lg:gap-4">
              <Field isDesktop={isDesktop} label="Min Gain % per Day" value={cs.minDayGainPct} suffix="%" placeholder="0.5" onChange={(e) => setCs({ ...cs, minDayGainPct: e.target.value })} />
            </div>
            <p className="text-xs -mt-2 mb-4" style={{ color: palette.textFaint }}>
              A day only counts toward your {cs.minTradingDays || 0}-day minimum if it moves your balance by at
              least {cs.minDayGainPct || 0}%.
            </p>

<span className="block mb-1.5 uppercase" style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}>
  Profit Split
</span>
<div className="flex gap-2 flex-wrap mb-1">
  {[50, 60, 70, 80, 90, 95, 100].map((opt) => {
    const isSelected = cs.profitSplitEnabled !== false && String(cs.profitSplitPct) === String(opt);
    return (
      <button
        key={opt}
        type="button"
        onClick={() =>
          setCs({
            ...cs,
            profitSplitPct: String(opt),
            profitSplitEnabled: isSelected ? false : true,
          })
        }
        className={`px-3 py-1.5 rounded-full transition-colors ${TAP}`}
        style={{
          background: isSelected ? palette.gold : palette.field,
          color: isSelected ? palette.letterbox : palette.textMuted,
          border: `1px solid ${isSelected ? palette.gold : palette.border}`,
          fontFamily: mono,
          fontSize: "13px",
        }}
      >
        {opt}%
      </button>
    );
  })}
</div>
<p className="text-xs mb-4" style={{ color: palette.textFaint }}>
  {cs.profitSplitEnabled === false
    ? ""
    : "Your share of profits once funded — reference only, it doesn't affect any pass/fail check above. Tap the selected percentage again to turn it off."}
</p>

            <p className="text-xs mt-1" style={{ color: palette.textFaint }}>
              Limits shown are common presets, use your specific firm's rules for anything that matters.
            </p>
          </>
        ) : riskSubTab === "edge" ? (
          <>
<div
  className="rounded-xl p-4 mb-5"
  style={{
    background: palette.surface,
    border: `1px solid ${palette.border}`,
    boxShadow: palette.shadow,
  }}
>
  <div className="flex items-center justify-between mb-3">
    <div>
      <div
        className="uppercase"
        style={{
          color: palette.gold,
          fontFamily: mono,
          fontSize: "10px",
          fontWeight: 700,
          letterSpacing: "0.1em",
        }}
      >
        Edge Overview
      </div>

      <div
        style={{
          color: palette.text,
          fontSize: "17px",
          fontWeight: 700,
          marginTop: "3px",
        }}
      >
        Is this setup worth taking?
      </div>
    </div>

    <div
      className="rounded-full px-2.5 py-1"
      style={{
        background:
          !hasExpectancyInputs
            ? palette.field
            : expectancy > 0
            ? "rgba(79,201,138,0.12)"
            : "rgba(226,115,92,0.12)",
        border: `1px solid ${
          !hasExpectancyInputs
            ? palette.border
            : expectancy > 0
            ? palette.green
            : palette.red
        }`,
        color:
          !hasExpectancyInputs
            ? palette.textMuted
            : expectancy > 0
            ? palette.green
            : palette.red,
        fontFamily: mono,
        fontSize: "10px",
        fontWeight: 700,
      }}
    >
      {!hasExpectancyInputs ? "WAITING FOR DATA" : expectancy > 0 ? "POSITIVE EDGE" : "NEGATIVE EDGE"}
    </div>
  </div>


  <div
    className="rounded-lg p-3 mb-3"
    style={{
      background: palette.field,
      border: `1px solid ${palette.border}`,
    }}
  >
    <div className="flex items-end justify-between">
      <div>
        <div
          style={{
            color: palette.textFaint,
            fontSize: "10px",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Expectancy / Trade
        </div>

        <div
          style={{
            color: !hasExpectancyInputs
              ? palette.textMuted
              : expectancy > 0
              ? palette.green
              : palette.red,
            fontFamily: mono,
            fontSize: "24px",
            fontWeight: 700,
            marginTop: "4px",
          }}
        >
          {hasExpectancyInputs
            ? `${expectancy > 0 ? "+" : ""}${fmt(expectancy)}R`
            : "N/A"}
        </div>
      </div>

      <div className="text-right">
        <div style={{ color: palette.textFaint, fontSize: "10px" }}>
          {hasTotalProjection
            ? `Projected over ${fmt(totalTrades, 0)} trades`
            : "Expected value per trade"}
        </div>

        {hasTotalProjection && (
          <div
            style={{
              color: totalProjected >= 0 ? palette.green : palette.red,
              fontFamily: mono,
              fontSize: "13px",
              fontWeight: 600,
              marginTop: "3px",
            }}
          >
            {totalProjected >= 0 ? "+" : "-"}{fmt(Math.abs(totalProjected))}R
          </div>
        )}
      </div>
    </div>
  </div>

  <div
    className="rounded-lg p-3"
    style={{
      background:
        hasExpectancyInputs && computedWinRate >= targetWinRate
          ? "rgba(79,201,138,0.08)"
          : hasExpectancyInputs
          ? "rgba(226,115,92,0.08)"
          : palette.field,
      border: `1px solid ${
        hasExpectancyInputs && computedWinRate >= targetWinRate
          ? palette.green
          : hasExpectancyInputs
          ? palette.red
          : palette.border
      }`,
    }}
  >
    <div className="flex items-center justify-between">
      <span style={{ color: palette.textMuted, fontSize: "11px" }}>
        Win rate needed (with buffer)
      </span>
      <span
        style={{
          color: computedWinRate >= targetWinRate ? palette.green : palette.red,
          fontFamily: mono,
          fontSize: "13px",
          fontWeight: 700,
        }}
      >
        {targetWinRate.toFixed(1)}%
      </span>
    </div>
    <div
      style={{
        height: "5px",
        borderRadius: "999px",
        background: palette.field,
        overflow: "hidden",
        marginTop: "8px",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${Math.min(100, computedWinRate)}%`,
          background: computedWinRate >= targetWinRate ? palette.green : palette.red,
          borderRadius: "999px",
          transition: "width 0.3s ease",
        }}
      />
    </div>
    <div
      className="flex justify-between mt-1.5"
      style={{ color: palette.textFaint, fontSize: "10px", fontFamily: mono }}
    >
      <span>Current: {computedWinRate ? `${computedWinRate.toFixed(1)}%` : "0.0%"}</span>
      <span>1 : {ratio ? ratio.toFixed(2) : "0.00"} R:R</span>
    </div>
  </div>
</div>



<div
  className="rounded-xl p-4 mb-5"
  style={{
    background: palette.surface,
    border: `1px solid ${palette.border}`,
    boxShadow: palette.shadow,
  }}
>
  <div className="mb-3">
    <div
      className="uppercase"
      style={{
        color: palette.gold,
        fontFamily: mono,
        fontSize: "10px",
        fontWeight: 700,
        letterSpacing: "0.1em",
      }}
    >
      Trade Edge
    </div>

    <div
      style={{
        color: palette.text,
        fontSize: "16px",
        fontWeight: 700,
        marginTop: "3px",
      }}
    >
      Setup & Performance Profile
    </div>

    <div
      style={{
        color: palette.textFaint,
        fontSize: "11px",
        marginTop: "2px",
      }}
    >
      Define your R:R and trade history to see whether your win rate and payoff structure create a positive edge.
    </div>
  </div>

  <div className="lg:grid lg:grid-cols-2 lg:gap-4">
    <Field
      isDesktop={isDesktop}
      label="Account Balance"
      value={edge.accountBalance}
      suffix="$"
      placeholder="10000"
      onChange={(e) => setEdge({ ...edge, accountBalance: e.target.value })}
    />

    <Field
      isDesktop={isDesktop}
      label="R:R (Reward Multiple)"
      value={edge.rr}
      suffix="R"
      placeholder="2"
      onChange={(e) => setEdge({ ...edge, rr: e.target.value })}
    />

    <Field
      isDesktop={isDesktop}
      label="Total Trades"
      value={edge.totalTrades}
      placeholder="100"
      onChange={(e) => setEdge({ ...edge, totalTrades: e.target.value })}
    />

    <Field
      isDesktop={isDesktop}
      label="Winning Trades"
      value={edge.totalWinTrades}
      placeholder="60"
      onChange={(e) =>
        setEdge({
          ...edge,
          totalWinTrades: e.target.value,
          totalLossTrades:
            e.target.value === "" || edge.totalTrades === ""
              ? ""
              : String(Math.max(0, num(edge.totalTrades) - num(e.target.value))),
        })
      }
    />

    <Field
      isDesktop={isDesktop}
      label="Losing Trades"
      value={edge.totalLossTrades}
      placeholder="40"
      onChange={(e) =>
        setEdge({
          ...edge,
          totalLossTrades: e.target.value,
          totalWinTrades:
            e.target.value === "" || edge.totalTrades === ""
              ? ""
              : String(Math.max(0, num(edge.totalTrades) - num(e.target.value))),
        })
      }
    />

    <Field
      isDesktop={isDesktop}
      label="Trades / Month"
      value={edge.tradesPerMonth}
      placeholder="20"
      onChange={(e) => setEdge({ ...edge, tradesPerMonth: e.target.value })}
    />

    <Field
      isDesktop={isDesktop}
      label="Risk % / Trade"
      value={edge.riskPct}
      suffix="%"
      placeholder="1"
      onChange={(e) => setEdge({ ...edge, riskPct: e.target.value })}
    />

    <Field
      isDesktop={isDesktop}
      label="Safety Buffer"
      value={edge.buffer}
      suffix="%"
      placeholder="5"
      onChange={(e) => setEdge({ ...edge, buffer: e.target.value })}
    />
  </div>

  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-3">
    <StatChip
      isDesktop={isDesktop}
      label="Win Rate"
      value={computedWinRate ? `${computedWinRate.toFixed(1)}%` : "N/A"}
    />

    <StatChip
      isDesktop={isDesktop}
      label="Breakeven"
      value={beWin ? `${beWin.toFixed(1)}%` : "N/A"}
    />

    <StatChip
      isDesktop={isDesktop}
      label="Expectancy"
      value={
        hasExpectancyInputs
          ? `${expectancy >= 0 ? "+" : ""}${fmt(expectancy)}R`
          : "N/A"
      }
    />

    <StatChip
      isDesktop={isDesktop}
      label="Projected"
      value={
        hasTotalProjection
          ? `${totalProjected >= 0 ? "+" : "-"}${fmt(Math.abs(totalProjected))}R`
          : "N/A"
      }
    />
  </div>
</div>


<div
  className="rounded-xl p-4 mb-5"
  style={{
    background: palette.surface,
    border: `1px solid ${palette.border}`,
    boxShadow: palette.shadow,
  }}
>
  <div className="mb-3">
    <div
      className="uppercase"
      style={{
        color: palette.gold,
        fontFamily: mono,
        fontSize: "10px",
        fontWeight: 700,
        letterSpacing: "0.1em",
      }}
    >
      Long-Term Edge
    </div>
    <div style={{ color: palette.text, fontSize: "17px", fontWeight: 700, marginTop: "3px" }}>
      Projected Curve
    </div>
    <div style={{ color: palette.textFaint, fontSize: "11px", marginTop: "3px", lineHeight: 1.5 }}>
      Built from your R:R and win rate — Normal uses your actual numbers, Best/Worst shift the win
      rate by your Safety Buffer ({edge.buffer || 5}%) either direction. Pick a horizon below; trade
      count is worked out automatically from Trades / Month.
    </div>
  </div>

  <div className="flex gap-2 flex-wrap mb-4">
    {EDGE_PROJECTION_PERIODS.map((p, i) => (
      <button
        key={p.label}
        type="button"
        onClick={() => setEdgeProjectionPeriodIdx(i)}
        className={`px-3 py-1.5 rounded-full transition-colors ${TAP}`}
        style={{
          background: edgeProjectionPeriodIdx === i ? palette.gold : palette.field,
          color: edgeProjectionPeriodIdx === i ? palette.letterbox : palette.textMuted,
          border: `1px solid ${edgeProjectionPeriodIdx === i ? palette.gold : palette.border}`,
          fontFamily: mono,
          fontSize: "12.5px",
        }}
      >
        {p.label}
      </button>
    ))}
  </div>

  {!threeCurveResult ? (
    <p className="text-xs mb-1" style={{ color: palette.textFaint }}>
      Fill in R:R and Trades / Month above to see the projection for {selectedEdgePeriod.label.toLowerCase()}.
    </p>
  ) : (
    <>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: "Worst", r: threeCurveResult.worstFinalR, pnl: threeCurveResult.worstFinalPnl, color: palette.red, wr: threeCurveResult.worstWinRate },
          { label: "Normal", r: threeCurveResult.normalFinalR, pnl: threeCurveResult.normalFinalPnl, color: palette.gold, wr: threeCurveResult.normalWinRate },
          { label: "Best", r: threeCurveResult.bestFinalR, pnl: threeCurveResult.bestFinalPnl, color: palette.green, wr: threeCurveResult.bestWinRate },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-lg p-3"
            style={{ background: palette.field, border: `1px solid ${s.color}55` }}
          >
            <div className="uppercase" style={{ color: s.color, fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em" }}>
              {s.label}
            </div>
<div style={{ fontFamily: mono, fontSize: "18px", fontWeight: 700, color: s.color, marginTop: "4px" }}>
  {s.r >= 0 ? "+" : ""}{fmt(s.r)}R
</div>
{s.pnl !== null && s.pnl !== undefined && (
  <div style={{ fontFamily: mono, fontSize: "18px", fontWeight: 700, color: s.color, marginTop: "2px" }}>
    {s.pnl >= 0 ? "+" : "-"}${fmt(Math.abs(s.pnl))}
  </div>
)}
            <div style={{ fontSize: "10px", color: palette.textFaint, marginTop: "4px" }}>
              {s.wr.toFixed(1)}% win rate
            </div>
          </div>
        ))}
      </div>

      {threeCurveResult.normalFinalPnl === null && (
        <p className="text-xs mb-3" style={{ color: palette.textFaint }}>
          Add Account Balance and Risk % / Trade above to see this in dollars.
        </p>
      )}

<div style={{ width: "100%", height: isDesktop ? 320 : 260, minWidth: 0 }}>
  <ResponsiveContainer width="99%" height="100%" debounce={50}>
    <LineChart data={threeCurveResult.chartData} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
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
              width={48}
              unit="R"
            />
            <ReferenceLine y={0} stroke={palette.textFaint} strokeDasharray="4 4" />
            <Tooltip
              contentStyle={{
                background: palette.field,
                border: `1px solid ${palette.border}`,
                borderRadius: "8px",
                fontFamily: mono,
                fontSize: "12px",
              }}
              labelStyle={{ color: palette.textMuted }}
              labelFormatter={(l) => `Trade ${l}`}
              formatter={(v, name, props) => {
                const key = name === "worst" ? "worstPnl" : name === "best" ? "bestPnl" : "normalPnl";
                const pnl = props.payload[key];
                const label = name === "worst" ? "Worst" : name === "best" ? "Best" : "Normal";
                const rLabel = `${v >= 0 ? "+" : ""}${fmt(v)}R`;
                return [pnl !== null && pnl !== undefined ? `${rLabel} (${pnl >= 0 ? "+" : "-"}$${fmt(Math.abs(pnl))})` : rLabel, label];
              }}
            />
            <Line type="monotone" dataKey="worst" stroke={palette.red} strokeWidth={1.5} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="normal" stroke={palette.gold} strokeWidth={2.5} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="best" stroke={palette.green} strokeWidth={1.5} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs mt-2" style={{ color: palette.textFaint }}>
        {threeCurveResult.trades} trades projected for {selectedEdgePeriod.label.toLowerCase()}.
      </p>
    </>
  )}
</div>
    	</>
        ) : (
          <>
            <div
              className="rounded-xl p-4 mb-5"
              style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="uppercase" style={{ color: palette.gold, fontFamily: mono, fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em" }}>
                    Position Size
                  </div>
                  <div style={{ color: palette.text, fontSize: "17px", fontWeight: 700, marginTop: "3px" }}>
                    How big should this trade be?
                  </div>
                </div>
                <div
                  className="rounded-full px-2.5 py-1"
                  style={{
                    background: riskPctEffective > 2 ? "rgba(226,115,92,0.12)" : riskPctEffective > 0 ? "rgba(79,201,138,0.12)" : palette.field,
                    border: `1px solid ${riskPctEffective > 2 ? palette.red : riskPctEffective > 0 ? palette.green : palette.border}`,
                    color: riskPctEffective > 2 ? palette.red : riskPctEffective > 0 ? palette.green : palette.textMuted,
                    fontFamily: mono,
                    fontSize: "10px",
                    fontWeight: 700,
                  }}
                >
                  {riskPctEffective > 2 ? "AGGRESSIVE" : riskPctEffective > 0 ? "WITHIN NORM" : "NO DATA"}
                </div>
              </div>

              <div className="rounded-lg p-3 mb-3" style={{ background: palette.field, border: `1px solid ${palette.border}` }}>
                <div className="flex items-end justify-between">
                  <div>
                    <div style={{ color: palette.textFaint, fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      Lot Size
                    </div>
                    <div style={{ color: palette.text, fontFamily: mono, fontSize: "28px", fontWeight: 700, marginTop: "4px" }}>
                      {fmt(lots)}
                      <span style={{ fontSize: "13px", color: palette.textFaint, marginLeft: "4px" }}>lots</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div style={{ color: palette.textFaint, fontSize: "10px" }}>Risking</div>
                    <div style={{ color: palette.gold, fontFamily: mono, fontSize: "16px", fontWeight: 700, marginTop: "3px" }}>
                      ${fmt(riskAmt)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg p-3" style={{ background: palette.field, border: `1px solid ${palette.border}` }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span style={{ color: palette.textMuted, fontSize: "11px" }}>Risk relative to account</span>
                  <span style={{ color: riskPctEffective > 2 ? palette.red : palette.text, fontFamily: mono, fontSize: "13px", fontWeight: 700 }}>
                    {fmt(riskPctEffective, 2)}%
                  </span>
                </div>
                <div style={{ height: "5px", borderRadius: "999px", background: palette.border, overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.min(100, riskPctEffective * 20)}%`,
                      background: riskPctEffective > 2 ? palette.red : palette.green,
                      borderRadius: "999px",
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1.5" style={{ color: palette.textFaint, fontSize: "10px", fontFamily: mono }}>
                  <span>0%</span>
                  <span>5%+</span>
                </div>
              </div>
            </div>

            <span className="block mb-1.5 uppercase" style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}>
              Instrument
            </span>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { id: "forex", label: "Forex", icon: ArrowLeftRight },
                { id: "gold", label: "Gold", icon: Scale },
                { id: "custom", label: "Custom", icon: Pencil },
              ].map((p) => {
                const Icon = p.icon;
                const active = ps.preset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPreset(p.id)}
                    className={`flex flex-col items-center justify-center gap-1 rounded-lg py-3 transition-colors ${TAP}`}
                    style={{
                      background: active ? palette.gold : palette.field,
                      color: active ? palette.letterbox : palette.textMuted,
                      border: `1px solid ${active ? palette.gold : palette.border}`,
                    }}
                  >
                    <Icon size={15} />
                    <span style={{ fontFamily: mono, fontSize: "12px" }}>{p.label}</span>
                  </button>
                );
              })}
            </div>

           <div className="lg:grid lg:grid-cols-2 lg:gap-4">
            <Field isDesktop={isDesktop}  label="Account Balance" value={ps.balance} suffix="$" placeholder="5000" onChange={(e) => setPs({ ...ps, balance: e.target.value })} />
            {sizeRiskMode === "dollar" ? (
              <Field isDesktop={isDesktop}  label="Risk per Trade" value={ps.riskDollar} suffix="$" placeholder="100" onChange={(e) => setPs({ ...ps, riskDollar: e.target.value })} />
            ) : (
              <Field isDesktop={isDesktop}  label="Risk per Trade" value={ps.riskPct} suffix="%" placeholder="1" onChange={(e) => setPs({ ...ps, riskPct: e.target.value })} />
            )}
            <Field isDesktop={isDesktop}  label="Stop Distance" value={ps.stopPips} suffix="pips" placeholder="25" onChange={(e) => setPs({ ...ps, stopPips: e.target.value })} />
            <Field isDesktop={isDesktop}  label="Value per Pip (1.0 lot)" value={ps.valuePerPip} suffix="$" onChange={(e) => setPs({ ...ps, preset: "custom", valuePerPip: e.target.value })} />
           </div>
            <p className="text-xs mt-1" style={{ color: palette.textFaint }}>
              Pip values are typical defaults, confirm your broker's contract specs before sizing real trades.
            </p>
          </>
        )}
      </>
    );
  }

    if (activeTab === "propfirm") {
    const firm = PROP_FIRMS.find((f) => f.id === pfFirmId);
    const plan = firm?.plans.find((p) => p.id === pfPlanId);
    const size = plan?.sizes.find((s) => s.amount === pfSizeAmount);
    const phase = plan?.phases[pfPhaseIdx] || plan?.phases[0];

    const crumbBack = (label, onClick) => (
      <button
        type="button"
        onClick={onClick}
        className={`flex items-center gap-1 mb-4 ${TAP}`}
        style={{ color: palette.textMuted, fontSize: "12px", fontFamily: mono }}
      >
        <ChevronLeft size={16} />
        {label}
      </button>
    );

    if (!firm) {
      const q = pfSearch.trim().toLowerCase();
      const filtersActive =
        !!pfSortBy || pfFilterDdMode !== "all" || pfFilterInstant !== "all" || pfFilterPhases !== "all";

      const planMatchesFilters = (p) => {
        if (pfFilterDdMode !== "all" && p.phases[0].ddMode !== pfFilterDdMode) return false;
        const isInstant = p.phases[0].targetPct === "instant";
        if (pfFilterInstant === "instant" && !isInstant) return false;
        if (pfFilterInstant === "evaluation" && isInstant) return false;
        if (pfFilterPhases !== "all" && String(p.phases.length) !== pfFilterPhases) return false;
        return true;
      };

const filteredFirms = PROP_FIRMS.filter((f) => {
  const isFuturesFirm = f.id === "lucidtrading";

  const matchesMarket =
    pfMarketType === "all" ||
    (pfMarketType === "futures" && isFuturesFirm) ||
    (pfMarketType === "cfd" && !isFuturesFirm);

  if (!matchesMarket) return false;

  const matchesSearch =
    !q ||
    f.name.toLowerCase().includes(q) ||
    f.plans.some((p) => p.label.toLowerCase().includes(q));

  if (!matchesSearch) return false;
  if (filtersActive && !f.plans.some(planMatchesFilters)) return false;

  return true;
});
      const pfFilterChip = (active, label, onClick) => (
        <button
          key={label}
          type="button"
          onClick={onClick}
          className={`px-3 py-1.5 rounded-full transition-colors ${TAP}`}
          style={{
            background: active ? palette.gold : palette.field,
            color: active ? palette.letterbox : palette.textMuted,
            border: `1px solid ${active ? palette.gold : palette.border}`,
            fontFamily: mono,
            fontSize: "12px",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {label}
        </button>
      );

      body = (
        <>
          <Readout
            eyebrow="Prop Firm"
            value={String(PROP_FIRMS.length)}
            unit={PROP_FIRMS.length === 1 ? "firm mapped" : "firms mapped"}
            sub="Pick a firm to see its evaluation rules and drop them straight into the Challenge calculator."
          />

          <div className="flex items-center gap-2 mb-3">
            <div
              className="flex items-center rounded-lg px-3 flex-1"
              style={{ background: palette.field, border: `1px solid ${palette.border}` }}
            >
              <Search size={14} style={{ color: palette.textFaint, flexShrink: 0 }} />
              <input
                type="text"
                value={pfSearch}
                onChange={(e) => setPfSearch(e.target.value)}
                placeholder="Search firm or plan name"
                className="w-full bg-transparent py-2.5 px-2 outline-none"
                style={{ color: palette.text, fontSize: "14px" }}
              />
              {pfSearch && (
                <button
                  type="button"
                  onClick={() => setPfSearch("")}
                  className={TAP}
                  style={{ color: palette.textFaint }}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setPfFilterPanelOpen((v) => !v)}
              className={`relative flex items-center justify-center rounded-lg flex-shrink-0 ${TAP}`}
              style={{
                width: "42px",
                height: "42px",
                background: pfFilterPanelOpen || filtersActive ? palette.gold : palette.field,
                border: `1px solid ${pfFilterPanelOpen || filtersActive ? palette.gold : palette.border}`,
                color: pfFilterPanelOpen || filtersActive ? palette.letterbox : palette.textMuted,
              }}
              aria-label="Toggle sort & filter options"
            >
              <Filter size={16} />
              {filtersActive && !pfFilterPanelOpen && (
                <span
                  style={{
                    position: "absolute",
                    top: "-3px",
                    right: "-3px",
                    width: "9px",
                    height: "9px",
                    borderRadius: "999px",
                    background: palette.red,
                    border: `1.5px solid ${palette.surface}`,
                  }}
                />
              )}
            </button>
          </div>

          {pfFilterPanelOpen && (
            <div
              className="rounded-2xl p-3.5 mb-4"
              style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
            >
              <div className="flex items-center justify-between mb-2.5">
                <span
                  style={{
                    fontFamily: display,
                    fontSize: "12px",
                    fontWeight: 700,
                    color: palette.text,
                    letterSpacing: "0.03em",
                    textTransform: "uppercase",
                  }}
                >
                  Sort &amp; Filter
                </span>
                {filtersActive && (
                  <button
                    type="button"
                    onClick={() => {
                      setPfSortBy(null);
                      setPfFilterDdMode("all");
                      setPfFilterInstant("all");
                      setPfFilterPhases("all");
                    }}
                    className={TAP}
                    style={{
                      color: palette.textFaint,
                      fontSize: "11px",
                      fontFamily: mono,
                      textDecoration: "underline",
                      textUnderlineOffset: "2px",
                    }}
                  >
                    Clear all
                  </button>
                )}
              </div>

              <span
                className="block mb-1.5 uppercase"
                style={{ color: palette.textFaint, letterSpacing: "0.07em", fontSize: "10px", fontWeight: 600 }}
              >
                Sort By
              </span>
              <div className="flex gap-1.5 flex-wrap mb-3">
                {[
                  { id: "split", label: "Profit Split" },
                  { id: "risk", label: "Max Risk" },
                  { id: "drawdown", label: "Drawdown %" },
                  { id: "dailyLoss", label: "Daily Loss %" },
                  { id: "consistency", label: "Consistency" },
                  { id: "target", label: "Target %" },
                  { id: "minDayGain", label: "Min Day Gain" },
                  { id: "size", label: "Cheapest Size" },
                  { id: "funded", label: "Fastest Funded" },
                ].map((opt) =>
                  pfFilterChip(pfSortBy === opt.id, opt.label, () =>
                    setPfSortBy(pfSortBy === opt.id ? null : opt.id)
                  )
                )}
              </div>

              <div style={{ height: "1px", background: palette.border, margin: "10px 0" }} />

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <span
                    className="block mb-1.5 uppercase"
                    style={{ color: palette.textFaint, letterSpacing: "0.07em", fontSize: "10px", fontWeight: 600 }}
                  >
                    Drawdown
                  </span>
                  <div className="flex flex-col gap-1.5 items-start">
                    {pfFilterChip(pfFilterDdMode === "all", "Any", () => setPfFilterDdMode("all"))}
                    {pfFilterChip(pfFilterDdMode === "static", "Static", () => setPfFilterDdMode("static"))}
                    {pfFilterChip(pfFilterDdMode === "trail", "Trailing", () => setPfFilterDdMode("trail"))}
                  </div>
                </div>

                <div>
                  <span
                    className="block mb-1.5 uppercase"
                    style={{ color: palette.textFaint, letterSpacing: "0.07em", fontSize: "10px", fontWeight: 600 }}
                  >
                    Account
                  </span>
                  <div className="flex flex-col gap-1.5 items-start">
                    {pfFilterChip(pfFilterInstant === "all", "Any", () => setPfFilterInstant("all"))}
                    {pfFilterChip(pfFilterInstant === "instant", "Instant", () => setPfFilterInstant("instant"))}
                    {pfFilterChip(pfFilterInstant === "evaluation", "Evaluation", () => setPfFilterInstant("evaluation"))}
                  </div>
                </div>

                <div>
                  <span
                    className="block mb-1.5 uppercase"
                    style={{ color: palette.textFaint, letterSpacing: "0.07em", fontSize: "10px", fontWeight: 600 }}
                  >
                    Phases
                  </span>
                  <div className="flex flex-col gap-1.5 items-start">
                    {pfFilterChip(pfFilterPhases === "all", "Any", () => setPfFilterPhases("all"))}
                    {pfFilterChip(pfFilterPhases === "1", "1-Step", () => setPfFilterPhases("1"))}
                    {pfFilterChip(pfFilterPhases === "2", "2-Step", () => setPfFilterPhases("2"))}
                  </div>
                </div>
              </div>

              <p className="text-xs mt-3" style={{ color: palette.textFaint }}>
                Firms shown if any plan matches.
              </p>
            </div>
          )}

<span className="block mb-1.5 uppercase" style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}>
  {q || filtersActive ? `Matching Firms (${filteredFirms.length})` : "Choose a Firm"}
</span>

<div className="flex gap-2 mb-4">
  {[
    { id: "all", label: "All" },
    { id: "cfd", label: "CFD" },
    { id: "futures", label: "Futures" },
  ].map((market) => {
    const active = pfMarketType === market.id;

    return (
      <button
        key={market.id}
        type="button"
        onClick={() => {
          setPfMarketType(market.id);
          setPfFirmId(null);
          setPfPlanId(null);
          setPfSizeAmount(null);
          setPfPhaseIdx(0);
        }}
        className={`px-3 py-1.5 rounded-full transition-colors ${TAP}`}
        style={{
          background: active ? palette.gold : palette.field,
          color: active ? palette.letterbox : palette.textMuted,
          border: `1px solid ${active ? palette.gold : palette.border}`,
          fontFamily: mono,
          fontSize: "12px",
          whiteSpace: "nowrap",
        }}
      >
        {market.label}
      </button>
    );
  })}
</div>
          {filteredFirms.length === 0 && (
            <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
              No firm or plan matches "{pfSearch}".
            </p>
          )}
          {filteredFirms.map((f) => {
            const isApplied = linkedFirm?.firmName === f.name;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => { setPfFirmId(f.id); setPfSearch(""); }}
                className={`w-full flex items-center justify-between rounded-lg px-4 py-3.5 mb-2 ${TAP}`}
                style={{
                  background: palette.surface,
                  border: `1px solid ${isApplied ? palette.gold : palette.border}`,
                  boxShadow: palette.shadow,
                }}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span style={{ color: palette.text, fontSize: "14px", fontWeight: 600 }}>{f.name}</span>
                    {isApplied && (
                      <span
                        style={{
                          fontSize: "9px",
                          fontFamily: mono,
                          color: palette.gold,
                          border: `1px solid ${palette.gold}`,
                          borderRadius: "999px",
                          padding: "1px 6px",
                          textTransform: "uppercase",
                        }}
                      >
                        Applied
                      </span>
                    )}
                  </div>
<div
  style={{
    color: palette.textFaint,
    fontSize: "11px",
    marginTop: "2px",
    marginLeft: 0,
    paddingLeft: 0,
    textAlign: "left",
    display: "block",
    width: "100%",
  }}
>
  {f.plans.length} plan{f.plans.length === 1 ? "" : "s"} · verified {f.lastChecked}
</div>
                </div>
                <ChevronRight size={16} style={{ color: palette.textFaint }} />
              </button>
            );
          })}

          {!q && (
            <>
              <span className="block mt-4 mb-1.5 uppercase" style={{ color: palette.textFaint, letterSpacing: "0.08em", fontSize: "11px" }}>
                Not Mapped Yet
              </span>
              {COMING_SOON_FIRMS.map((name) => (
                <div
                  key={name}
                  className="w-full flex items-center justify-between rounded-lg px-4 py-3.5 mb-2"
                  style={{ background: "transparent", border: `1px dashed ${palette.border}`, opacity: 0.55 }}
                >
                  <div style={{ color: palette.textMuted, fontSize: "14px" }}>{name}</div>
                  <span style={{ color: palette.textFaint, fontSize: "10px", fontFamily: mono, textTransform: "uppercase" }}>
                    Coming soon
                  </span>
                </div>
              ))}
            </>
          )}
          <p className="text-xs mt-3" style={{ color: palette.textFaint }}>
            A firm shows up here only once every plan and account size has been checked against its current published
            rules — not just the flagship one.
          </p>
        </>
      );

    } else if (!plan) {
      const pfFundedMetric = (p) =>
        p.minTradingDays != null
          ? { value: p.minTradingDays, unit: "d" }
          : p.minTrades != null
          ? { value: p.minTrades, unit: "tr" }
          : { value: Infinity, unit: "" };
      const pfSorters = {
        split: (a, b) => num(b.profitSplitPct) - num(a.profitSplitPct),
        risk: (a, b) => num(a.maxRiskPct) - num(b.maxRiskPct),
        drawdown: (a, b) => num(b.phases[0].maxDrawdownPct) - num(a.phases[0].maxDrawdownPct),
        dailyLoss: (a, b) => num(b.phases[0].dailyLossPct) - num(a.phases[0].dailyLossPct),
        consistency: (a, b) => num(a.phases[0].consistencyPct) - num(b.phases[0].consistencyPct),
        target: (a, b) => {
          const ta = a.phases[0].targetPct === "instant" ? 0 : num(a.phases[0].targetPct);
          const tb = b.phases[0].targetPct === "instant" ? 0 : num(b.phases[0].targetPct);
          return ta - tb;
        },
        minDayGain: (a, b) => num(a.minDayGainPct) - num(b.minDayGainPct),
        size: (a, b) => Math.min(...a.sizes.map((s) => s.amount)) - Math.min(...b.sizes.map((s) => s.amount)),
        funded: (a, b) => pfFundedMetric(a).value - pfFundedMetric(b).value,
      };
      let visiblePlans = firm.plans.filter((p) => {
        if (pfFilterDdMode !== "all" && p.phases[0].ddMode !== pfFilterDdMode) return false;
        const isInstant = p.phases[0].targetPct === "instant";
        if (pfFilterInstant === "instant" && !isInstant) return false;
        if (pfFilterInstant === "evaluation" && isInstant) return false;
        if (pfFilterPhases !== "all" && String(p.phases.length) !== pfFilterPhases) return false;
        const q = pfSearch.trim().toLowerCase();
        if (q && !p.label.toLowerCase().includes(q)) return false;
        return true;
      });
      if (pfSortBy && pfSorters[pfSortBy]) {
        visiblePlans = [...visiblePlans].sort(pfSorters[pfSortBy]);
      }
      const pfFilterChip = (active, label, onClick) => (
        <button
          key={label}
          type="button"
          onClick={onClick}
          className={`px-3 py-1.5 rounded-full transition-colors ${TAP}`}
          style={{
            background: active ? palette.gold : palette.field,
            color: active ? palette.letterbox : palette.textMuted,
            border: `1px solid ${active ? palette.gold : palette.border}`,
            fontFamily: mono,
            fontSize: "12px",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {label}
        </button>
      );

  body = (
    <>
      {crumbBack("Firms", resetPropFirmWizard)}
      <div className="flex items-center justify-between mb-4">
        <span className="uppercase" style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}>
          {firm.name} — Choose a Plan
        </span>
        <button
          type="button"
          onClick={() => { setPfCompareMode((v) => !v); setPfCompareIds([]); }}
          className={TAP}
          style={{ color: pfCompareMode ? palette.gold : palette.textFaint, fontSize: "11px", fontFamily: mono }}
        >
          {pfCompareMode ? "Done comparing" : "Compare plans"}
        </button>
      </div>

      {visiblePlans.length === 0 && (
        <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
          No plans match these filters. Try loosening one above.
        </p>
      )}

      {pfCompareMode ? (
        <>
          <p className="text-xs mb-3" style={{ color: palette.textFaint }}>
            Tap up to 3 plans to compare side by side.
          </p>
          <div className="flex gap-2 flex-wrap mb-4">
            {visiblePlans.map((p) => {
              const selected = pfCompareIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() =>
                    setPfCompareIds((cur) =>
                      selected
                        ? cur.filter((id) => id !== p.id)
                        : cur.length >= 3
                        ? cur
                        : [...cur, p.id]
                    )
                  }
                  className={`px-3 py-1.5 rounded-full transition-colors ${TAP}`}
                  style={{
                    background: selected ? palette.gold : palette.field,
                    color: selected ? palette.letterbox : palette.textMuted,
                    border: `1px solid ${selected ? palette.gold : palette.border}`,
                    fontFamily: mono,
                    fontSize: "12.5px",
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {pfCompareIds.length >= 2 && (
            <div
              className="rounded-2xl overflow-hidden mb-4"
              style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
            >
              <div style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "collapse", width: "100%", minWidth: `${pfCompareIds.length * 140 + 100}px` }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", padding: "10px 12px", borderBottom: `1px solid ${palette.gold}55`, background: palette.field }} />
                      {pfCompareIds.map((id) => {
                        const p = firm.plans.find((pp) => pp.id === id);
                        return (
                          <th
                            key={id}
                            style={{
                              textAlign: "left",
                              padding: "10px 12px",
                              borderBottom: `1px solid ${palette.gold}55`,
                              background: palette.field,
                              color: palette.text,
                              fontSize: "12px",
                              fontFamily: mono,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {p.label}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: "Target", get: (p) => p.phases.map((ph) => (ph.targetPct === "instant" ? "Instant" : `${ph.targetPct}%`)).join(" / ") },
                      { label: "Daily Loss", get: (p) => `${p.phases[0].dailyLossPct}%` },
                      { label: "Max Loss", get: (p) => `${p.phases[0].maxDrawdownPct}%` },
                      { label: "DD Type", get: (p) => (p.phases[0].ddMode === "static" ? "Static" : "Trailing") },
                      { label: "Consistency", get: (p) => (p.phases[0].consistencyPct === "0" ? "None" : `${p.phases[0].consistencyPct}%`) },
                      { label: "Min Days", get: (p) => (p.minTradingDays == null ? "None" : String(p.minTradingDays)) },
                      { label: "Profit Split", get: (p) => (p.profitSplitPct ? `${p.profitSplitPct}%` : "N/A") },
                    ].map((row, i) => (
                      <tr key={row.label} style={{ background: i % 2 === 1 ? `${palette.field}55` : "transparent" }}>
                        <td style={{ padding: "8px 12px", color: palette.textFaint, fontSize: "11px", whiteSpace: "nowrap" }}>{row.label}</td>
                        {pfCompareIds.map((id) => {
                          const p = firm.plans.find((pp) => pp.id === id);
                          return (
                            <td key={id} style={{ padding: "8px 12px", color: palette.text, fontSize: "12px", fontFamily: mono, whiteSpace: "nowrap" }}>
                              {row.get(p)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : null}

      {visiblePlans.map((p) => {
        const isApplied = linkedFirm?.firmName === firm.name && linkedFirm?.planLabel === p.label;

        return (
          <button
            key={p.id}
            type="button"
            onClick={() => setPfPlanId(p.id)}
            className={`w-full text-left rounded-lg px-4 py-3.5 mb-2 ${TAP}`}
            style={{
              background: palette.surface,
              border: `1px solid ${isApplied ? palette.gold : palette.border}`,
              boxShadow: palette.shadow
            }}
          >
            <div className="flex items-center gap-2" style={{ marginBottom: "3px" }}>
              <span style={{ color: palette.text, fontSize: "14px", fontWeight: 600 }}>
                {p.label}
              </span>

              {isApplied && (
                <span
                  style={{
                    fontSize: "9px",
                    fontFamily: mono,
                    color: palette.gold,
                    border: `1px solid ${palette.gold}`,
                    borderRadius: "999px",
                    padding: "1px 6px",
                    textTransform: "uppercase"
                  }}
                >
                  Applied
                </span>
              )}
            </div>

            <div style={{ color: palette.textMuted, fontSize: "12px" }}>
              {p.blurb}
            </div>
          </button>
        );
      })}

      <p
        className="text-xs mt-4 mb-4"
        style={{
          color: palette.textFaint,
          textAlign: "center"
        }}
      >
        For more information visit their official website.
      </p>
    </>
  );
} else if (!size) {
      body = (
        <>
          {crumbBack(firm.name, () => setPfPlanId(null))}
          <span className="block mb-1.5 uppercase" style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}>
            {plan.label} — Account Size
          </span>
          <div className="grid grid-cols-3 gap-2 mb-2">
            {plan.sizes.map((s) => (
              <button
                key={s.amount}
                type="button"
                onClick={() => setPfSizeAmount(s.amount)}
                className={`flex flex-col items-center justify-center rounded-lg py-3 ${TAP}`}
                style={{
                  background: palette.surface,
                  border: `1px solid ${s.verified ? palette.border : `${palette.gold}55`}`,
                  opacity: s.verified ? 1 : 0.75,
                }}
              >
                <span style={{ fontFamily: mono, fontSize: "13px", color: palette.text }}>
                  ${(s.amount / 1000).toFixed(0)}K
                </span>
                {!s.verified && (
                  <span style={{ fontSize: "9px", fontFamily: mono, color: palette.gold, marginTop: "2px" }}>
                    unverified
                  </span>
                )}
                {s.payoutCap && (
                  <span style={{ fontSize: "9px", fontFamily: mono, color: palette.textFaint, marginTop: "2px" }}>
                    cap ${s.payoutCap}
                  </span>
                )}
              </button>
            ))}
          </div>
          <p className="text-xs mt-2" style={{ color: palette.textFaint }}>
            "Unverified" sizes assume the same percentages as the confirmed tier — double-check before relying on them.
          </p>
        </>
      );
    } else {
      body = (
        <>
          {crumbBack(`${plan.label} · ${firm.name}`, () => setPfSizeAmount(null))}
          {!size.verified && (
            <div className="rounded-lg p-3 mb-4" style={{ background: `${palette.gold}14`, border: `1px solid ${palette.gold}` }}>
              <p className="text-xs" style={{ color: palette.text }}>
                This account size hasn't been individually checked against {firm.name}'s current rules — the numbers
                below assume they match the confirmed tier.
              </p>
            </div>
          )}

          <Readout
            eyebrow={`${firm.name} · ${plan.label} · $${(pfSizeAmount / 1000).toFixed(0)}K`}
            value={phase.targetPct === "instant" ? "Instant" : `${phase.targetPct}%`}
            unit={phase.targetPct === "instant" ? undefined : "target"}
            sub={phase.label}
          />

          {plan.phases.length > 1 && (
            <div className="flex gap-2 mb-4">
              {plan.phases.map((ph, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPfPhaseIdx(i)}
                  className={`flex-1 px-3 py-2 rounded-full ${TAP}`}
                  style={{
                    background: pfPhaseIdx === i ? palette.gold : palette.field,
                    color: pfPhaseIdx === i ? palette.letterbox : palette.textMuted,
                    border: `1px solid ${pfPhaseIdx === i ? palette.gold : palette.border}`,
                    fontFamily: mono,
                    fontSize: "13px",
                  }}
                >
                  {ph.label}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-4">
            <StatChip label="Daily Loss" value={`${phase.dailyLossPct}%`} />
            <StatChip label="Max Drawdown" value={`${phase.maxDrawdownPct}%`} />
            <StatChip label="Drawdown Type" value={plan.ddMode === "static" ? "Static" : "Trailing"} />
            <StatChip label="Consistency Rule" value={phase.consistencyPct === "0" ? "None" : `${phase.consistencyPct}%`} />
            <StatChip label="Min Trading Days" value={plan.minTradingDays === null ? "None" : String(plan.minTradingDays)} />
            <StatChip label="Max Trading Days" value={plan.maxTradingDays} />
            <StatChip
              label="Min Day Gain %"
              value={plan.minDayGainPct && Number(plan.minDayGainPct) > 0 ? `${plan.minDayGainPct}%` : "None"}
            />
            <StatChip label="Profit Split" value={plan.profitSplitPct ? `${plan.profitSplitPct}%` : "N/A"} />
            {plan.minTrades != null && (
              <StatChip label="Min Trades" value={String(plan.minTrades)} />
            )}
            {size.payoutCap != null && (
              <StatChip label="Payout Cap" value={`$${size.payoutCap}/payout`} />
            )}
          </div>

          <button
            type="button"
            onClick={() => applyPropFirmToChallenge(firm, plan, phase)}
            className={`w-full flex items-center justify-center gap-2 rounded-lg py-3 mb-2 ${TAP}`}
            style={{ background: palette.gold, color: palette.letterbox, fontFamily: mono, fontSize: "13px", fontWeight: 600 }}
          >
            <ArrowLeftRight size={16} />
            Apply to Challenge Calculator
          </button>
          <p className="text-xs mb-1" style={{ color: palette.textFaint }}>
            Sets your starting balance and every rule field on the Challenge tab to match this plan.      
         </p>
        </>
      );
    }
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
        <OnboardingTip
          id="fx-rate-override-intro"
          text="Rates update once a day automatically. If your broker quotes something slightly different, paste it into Rate Override below for a precise conversion."
          settings={settings}
          persistSettings={persistSettings}
        />
        <Readout isDesktop={isDesktop}
          eyebrow={`${fx.from} \u2192 ${fx.to}`}
          value={sameCurrency ? fmtThousands(amount) : fmtThousands(converted)}
          unit={fx.to}
          sub={
            sameCurrency
              ? "Same currency on both sides"
              : `1 ${fx.from} = ${fmt(effectiveRate, 4)} ${fx.to}, 1 ${fx.to} = ${fmt(inverseRate, 4)} ${fx.from}`
          }
        />
       <div className="lg:grid lg:grid-cols-2 lg:gap-4">
        <Field isDesktop={isDesktop} 
          label="Amount"
          value={fx.amount}
          suffix={fx.from}
          placeholder="100"
          onChange={(e) => setFx({ ...fx, amount: e.target.value })}
        />
       </div>

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

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatChip isDesktop={isDesktop}
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
          <StatChip isDesktop={isDesktop} label={`${fx.to} per ${fx.from}`} value={fmt(effectiveRate, 4)} />
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
        <Field isDesktop={isDesktop} 
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

    const todayInfo = tradesByDay[todayKey];
    const todayTradeCount = todayInfo ? todayInfo.trades.length : 0;
    const todayLossTotal = todayInfo ? todayInfo.trades.filter((t) => t.pnl < 0).reduce((s, t) => s + t.pnl, 0) : 0;
    const dailyLossLimitNum = num(settings.dailyLossLimit);
    const hitDailyLossLimit = dailyLossLimitNum > 0 && Math.abs(todayLossTotal) >= dailyLossLimitNum;
    const maxTradesNum = num(settings.maxTradesPerDay);
    const hitMaxTrades = maxTradesNum > 0 && todayTradeCount >= maxTradesNum;

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

      <OnboardingTip
  	id="curve-setup-mood"
  	text="Tag each trade with a Setup and Mood below — it unlocks the Insights tab's breakdowns by strategy and emotional state."
  	settings={settings}
  	persistSettings={persistSettings}
       />

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
            className={isDesktop ? "rounded-2xl p-6 mb-6" : "rounded-2xl p-4 mb-6"}
            style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow, transition: THEME_TRANSITION }}
          >
            <div style={{ width: "100%", height: isDesktop ? 340 : 180 }}>
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-2">
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-2">
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
              Consecutive trading days with no revenge trade (opened within {RUNTIME.REVENGE_WINDOW_MINUTES} minutes of a
              loss) tracks behavior, not P&amp;L.
            </p>
          )}
        </div>

        <span
          className="block mb-1.5 uppercase"
          style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
        >
          Goals
        </span>
        <div
          className={isDesktop ? "rounded-2xl p-6 mb-4" : "rounded-2xl p-4 mb-4"}
          style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow, transition: THEME_TRANSITION }}
        >
          {[
            { key: "weeklyTargetPct", period: "week", label: "This Week" },
            { key: "monthlyTargetPct", period: "month", label: "This Month" },
          ].map(({ key, period, label }, idx) => {
            const targetPct = num(goals[key]);
            const progress = computeGoalProgress(trades, startBal, period);
            const hasTarget = goals[key] !== "" && targetPct > 0;
            const pct = progress ? progress.pct : 0;
            const progressToward = hasTarget && targetPct > 0 ? Math.max(0, Math.min(100, (pct / targetPct) * 100)) : 0;
            const met = hasTarget && pct >= targetPct;
            return (
              <div key={key} style={{ marginBottom: idx === 0 ? "16px" : 0 }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span style={{ color: palette.text, fontSize: "13px", fontWeight: 600 }}>{label}</span>
                  <span
                    style={{
                      fontFamily: mono,
                      fontSize: "12px",
                      color: !startBal ? palette.textFaint : met ? palette.green : pct < 0 ? palette.red : palette.textMuted,
                    }}
                  >
                    {startBal ? `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%` : "N/A"}
                    {hasTarget ? ` / ${targetPct}%` : ""}
                  </span>
                </div>
                {hasTarget && (
                  <div style={{ height: "6px", borderRadius: "999px", background: palette.field, overflow: "hidden", marginBottom: "6px" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${progressToward}%`,
                        background: met ? palette.green : palette.gold,
                        borderRadius: "999px",
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>
                )}
                <input
                  type="text"
                  inputMode="decimal"
                  value={goals[key]}
                  onChange={(e) => persistGoals({ ...goals, [key]: e.target.value })}
                  placeholder="Set a target %"
                  className="w-full rounded-lg px-3 py-2 bg-transparent outline-none"
                  style={{ background: palette.field, border: `1px solid ${palette.border}`, color: palette.text, fontFamily: mono, fontSize: "13px" }}
                />
              </div>
            );
          })}
          {!startBal && (
            <p className="text-xs mt-3" style={{ color: palette.textFaint }}>
              Set a starting balance below so goal progress can be calculated as a percentage.
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
          <div className={isDesktop ? "flex gap-3" : "flex gap-2"}>
            <button
              type="button"
              onClick={exportBackup}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg ${isDesktop ? "py-3.5" : "py-2.5"} ${TAP}`}
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
                entries, playbook rules, notepad notes, and theme on this device with the backup file (
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

        {hitDailyLossLimit && (
          <div
            className="rounded-2xl p-4 mb-4"
            style={{ background: `${palette.red}14`, border: `1px solid ${palette.red}`, boxShadow: palette.shadow }}
          >
            <div style={{ color: palette.red, fontSize: "13px", fontWeight: 600, marginBottom: "2px" }}>
              Daily loss limit reached
            </div>
            <div className="text-xs" style={{ color: palette.textMuted }}>
              You've hit your ${fmt(dailyLossLimitNum, 0)} daily loss limit for today (${fmtMoney(todayLossTotal)}{" "}
              so far). Consider stepping away for the rest of the day.
            </div>
          </div>
        )}
        {hitMaxTrades && (
          <div
            className="rounded-2xl p-4 mb-4"
            style={{ background: `${palette.gold}14`, border: `1px solid ${palette.gold}`, boxShadow: palette.shadow }}
          >
            <div style={{ color: palette.gold, fontSize: "13px", fontWeight: 600, marginBottom: "2px" }}>
              Trade limit reached
            </div>
            <div className="text-xs" style={{ color: palette.textMuted }}>
              You've hit your limit of {maxTradesNum} trade{maxTradesNum === 1 ? "" : "s"} for today Consider stepping away for the rest of the day.
          </div>
         </div>
        )}

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
        <input
          type="text"
          value={tradePair}
          onChange={(e) => setTradePair(e.target.value.toUpperCase())}
          placeholder="Pair"
          className="w-full rounded-lg px-3 py-2.5 mb-2 bg-transparent outline-none"
          style={{
            background: palette.field,
            border: `1px solid ${palette.border}`,
            color: palette.text,
            fontFamily: mono,
            fontSize: "14px",
          }}
        />
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
                <button
                  key={s.id}
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
              );
            })}
        </div>

        <span
          className="block mb-1.5 uppercase"
          style={{ color: palette.textFaint, letterSpacing: "0.08em", fontSize: "10px" }}
        >
          Mood
        </span>
        <div className="flex gap-2 flex-wrap mb-2 items-center">
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

          {customMoodsLoaded &&
            customMoods.map((m) => {
              const active = tradeEmotion === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setTradeEmotion(active ? null : m.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors ${TAP}`}
                  style={{
                    background: active ? palette.gold : palette.field,
                    color: active ? palette.letterbox : palette.textMuted,
                    border: `1px dashed ${active ? palette.gold : palette.border}`,
                    fontSize: "13px",
                  }}
                >
                  <span>{m.emoji}</span>
                  {m.label}
                </button>
              );
            })}
        </div>

        <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
          Enter net P&amp;L for the trade. Positive logs a win, negative logs a loss. The dashed chips quick-fill
          the note; Setup tags what kind of trade it was (tap the + to add up to {MAX_CUSTOM_SETUPS} of your own);
          Mood tags how you felt. Tap the pencil on any logged trade below to edit it in place. Tags and a
          "revenge" flag (opened within {RUNTIME.REVENGE_WINDOW_MINUTES} minutes of a loss) show up per trade in the
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

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
              <StatChip
                label={`${MONTH_NAMES[viewMonthIdx]} Total`}
                value={`${monthTotal >= 0 ? "+" : "-"}$${fmtMoney(monthTotal)}`}
              />
              <StatChip label={`${MONTH_NAMES[viewMonthIdx]} Trades`} value={String(monthTradeCount)} />
            </div>

            {(() => {
              const periodType = settings.statementPeriodType || "month";
              const periodLabel = periodType === "quarter" ? "Quarter" : periodType === "year" ? "Year" : "Month";
              const disabled = periodType === "month" && monthTradeCount === 0;
              const openStatement = () => {
                if (periodType === "quarter") {
                  setStatementPeriod({ year: viewYear, type: "quarter", index: Math.floor(viewMonthIdx / 3) });
                } else if (periodType === "year") {
                  setStatementPeriod({ year: viewYear, type: "year" });
                } else {
                  setStatementPeriod({ year: viewYear, type: "month", index: viewMonthIdx });
                }
              };
              return (
                <button
                  type="button"
                  onClick={openStatement}
                  disabled={disabled}
                  className={`w-full flex items-center justify-center gap-1.5 rounded-lg py-2.5 mb-4 ${TAP}`}
                  style={{
                    background: palette.field,
                    border: `1px solid ${palette.border}`,
                    color: disabled ? palette.textFaint : palette.text,
                    fontFamily: mono,
                    fontSize: "12px",
                    fontWeight: 600,
                    opacity: disabled ? 0.6 : 1,
                  }}
                >
                  <FileText size={14} />
                  {periodLabel} Statement
                </button>
              );
            })()}

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
                            {t.pair && (
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
                                {t.pair}
                              </span>
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
                           {settings.showRevengeTag !== false && revengeIds.has(t.id) && (
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
    const insights = computeInsights(trades, customSetups, customMoods);
    const heatmapWeeksBack = Number(settings.heatmapWeeksBack) || 26;
    const heatmap = computeHeatmapWeeks(trades, heatmapWeeksBack);
    const headline = computeHeadlineInsight(trades, customSetups, customMoods);
    const perf = computePerformanceMetrics(trades);
    const monthCmp = computeMonthComparison(trades);
    const completeness = computeJournalCompleteness(trades);
    const grade = computeDisciplineGrade(trades);
    const revengeCost = computeRevengeCostSplit(trades);
    const overconfidence = computeOverconfidenceCheck(trades);
    const disciplineTrend = computeDisciplineStreakTrend(trades);
    const noteTags = computeNoteTagAnalysis(trades);
    const consistency = computeConsistencyScore(trades);

    const journalRows = filledJournalRows(journalEntries);
    const hasJournalData = journalRows.length > 0;
    const trendBreakdown = journalTrendBreakdown(journalRows);
    const rrSeries = journalRRSeries(journalRows);
    const mistakeFreq = journalMistakeFrequency(journalRows);
    const setupRadarData = journalSetupRadar(journalRows, customSetups);
    const mistakePatterns = journalMistakePatterns(journalRows);
    const patternDetected =
  (mistakePatterns.worstTrends[0]?.mistakeRate ?? 0) >= 30 ||
  (mistakePatterns.worstWeekdays[0]?.mistakeRate ?? 0) >= 30;
const closestWeekday = [...mistakePatterns.weekdayRows].sort(
  (a, b) => b.mistakeRate - a.mistakeRate
)[0];
    const combinedMistakeRows = [
      ...mistakePatterns.trendRows.map((r) => ({ ...r, group: "Trend" })),
      ...mistakePatterns.weekdayRows.map((r) => ({ ...r, group: "Day" })),
    ];
    const pairFreq = journalPairFrequency(journalRows);
    const weekdayFreq = journalWeekdayFrequency(journalRows);
    const rrDist = journalRRDistribution(journalRows);
    const monthlyVolume = journalMonthlyVolume(journalRows);
    const sessionByDay = journalSessionByDay(journalRows);
    const confidenceByDay = journalConfidenceByDay(journalRows);

    const fmtSigned = (n) => `${n >= 0 ? "+" : "-"}$${fmtMoney(n)}`;
    const fmtRatio = (n) => (Number.isFinite(n) ? n.toFixed(2) : "\u221e");

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
    const THIN_BAR_SIZE = 14;
    const PIE_COLORS = [palette.gold, palette.green, palette.red, palette.textMuted, palette.goldBright];

    const INSIGHTS_SUB_TABS = [
      { id: "overview", label: "Overview" },
      { id: "behavior", label: "Behavior" },
      { id: "journal", label: "Journal" },
    ];

    const insightsSubNav = (
      <div className="flex gap-2 mb-6" style={{ overflowX: "auto" }}>
        {INSIGHTS_SUB_TABS.map((s) => {
          const active = insightsSubTab === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => selectInsightsSubTab(s.id)}
              className={`flex-1 px-3 py-2 rounded-full transition-colors ${TAP}`}
              style={{
                background: active ? palette.gold : palette.field,
                color: active ? palette.letterbox : palette.textMuted,
                border: `1px solid ${active ? palette.gold : palette.border}`,
                fontFamily: mono,
                fontSize: "13px",
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              {s.label}
            </button>
          );
        })}
      </div>
    );

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

    const overviewSection = !hasData ? (
      <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
        No trades yet, insights will appear once you start logging on the Curve tab.
      </p>
    ) : (
      <>
        <OnboardingTip
          id="insights-overview-intro"
          text="This heatmap and the metrics below update automatically from your logged trades — nothing to fill in here."
          settings={settings}
          persistSettings={persistSettings}
        />
        <span
          className="block mb-1.5 uppercase"
          style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
        >
          Performance Heatmap
        </span>
        <div
          className={isDesktop ? "rounded-2xl p-6 mb-2" : "rounded-2xl p-3 mb-2"}
          style={{
            background: palette.surface,
            border: `1px solid ${palette.border}`,
            boxShadow: palette.shadow,
            overflowX: "auto",
          }}
        >
          <div className="flex" style={{ gap: isDesktop ? "5px" : "3px", justifyContent: isDesktop ? "center" : "normal" }}>
            <div className="flex flex-col justify-between" style={{ gap: isDesktop ? "5px" : "3px", paddingRight: isDesktop ? "8px" : "4px" }}>
              {WEEKDAY_LABELS.map((w, i) => (
                <div
                  key={i}
                  style={{
                    width: isDesktop ? "16px" : "10px",
                    height: isDesktop ? "16px" : "10px",
                    fontSize: isDesktop ? "10px" : "7px",
                    color: palette.textFaint,
                    lineHeight: isDesktop ? "16px" : "10px",
                  }}
                >
                  {i % 2 === 1 ? w : ""}
                </div>
              ))}
            </div>
            {heatmap.weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col" style={{ gap: isDesktop ? "5px" : "3px" }}>
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
                        width: isDesktop ? "16px" : "10px",
                        height: isDesktop ? "16px" : "10px",
                        borderRadius: isDesktop ? "3px" : "2px",
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
            Last {heatmapWeeksBack} weeks – tap a square for that day's total.
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
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
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
    );

    const behaviorSection = !hasData ? (
      <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
        No trades yet, behavior stats will appear once you start logging on the Curve tab.
      </p>
    ) : (
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
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
              className={isDesktop ? "rounded-2xl p-6 mb-6" : "rounded-2xl p-4 mb-6"}
              style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
            >
              <div style={{ width: "100%", height: isDesktop ? 240 : 140 }}>
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
              className={isDesktop ? "rounded-2xl p-6 mb-6" : "rounded-2xl p-4 mb-6"}
              style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
            >
              <div style={{ width: "100%", height: isDesktop ? 220 : 140 }}>
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
        <div className="mb-6">
          <StatChip label="Day-to-Day Volatility" value={consistency ? consistency.label : "N/A"} />
        </div>

        {insights.setupRows.length > 0 ? (
          <>
            <span
              className="block mb-1.5 uppercase"
              style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
            >
              Setup Performance
            </span>
            <div
              className={isDesktop ? "rounded-2xl p-6 mb-2" : "rounded-2xl p-4 mb-2"}
              style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
            >
              <div style={{ width: "100%", height: isDesktop ? 260 : 160 }}>
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
              className={isDesktop ? "rounded-2xl p-6 mb-2" : "rounded-2xl p-4 mb-2"}
              style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
            >
              <div style={{ width: "100%", height: isDesktop ? 260 : 160 }}>
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
    );

    const journalSection = !journalLoaded ? (
      <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
        Loading journal data\u2026
      </p>
    ) : !hasJournalData ? (
      <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
        No journal entries yet. Fill in some rows on the Journal tab (pair, trend, R:R, setup, mistakes) to see
        analytics here.
      </p>
    ) : (
      <>
        <Readout
          eyebrow="Journal Entries"
          value={String(journalRows.length)}
          unit={journalRows.length === 1 ? "row" : "rows"}
          sub="Sourced from the Journal tab's spreadsheet, not your logged trades"
        />

        {/* Yearly PnL Calendar */}
        <span className="block mb-1.5 uppercase" style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}>
          Yearly PnL Calendar
        </span>
        <div className="flex items-center justify-between mb-4">
          <button type="button" onClick={() => { setJournalInsightYear((y) => y - 1); setJournalInsightMonth(null); }} className={TAP} style={{ color: palette.textMuted, padding: "4px" }} aria-label="Previous year"><ChevronLeft size={20} /></button>
          <span style={{ fontFamily: mono, fontSize: "1.1rem", color: palette.text, letterSpacing: "0.04em" }}>{journalInsightYear}</span>
          <button type="button" onClick={() => { setJournalInsightYear((y) => y + 1); setJournalInsightMonth(null); }} className={TAP} style={{ color: palette.textMuted, padding: "4px" }} aria-label="Next year"><ChevronRight size={20} /></button>
        </div>
        {(() => {
          const pnlByMonth = journalPnLByMonth(journalRows, journalInsightYear);
          const pnlByDay = journalInsightMonth ? journalPnLByDay(journalRows, journalInsightYear, journalInsightMonth) : {};
          const yearHasData = Object.keys(pnlByMonth).length > 0;
          if (journalInsightMonth === null) {
            return (
              <>
                {!yearHasData && (
                  <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
                    No PnL data for {journalInsightYear}. Fill in the PnL column in your journal rows to see this calendar.
                  </p>
                )}
                <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                  {MONTH_SHORT.map((mLabel, mIdx) => {
                    const monthPnl = pnlByMonth[mIdx + 1];
                    const hasPnl = monthPnl !== undefined;
                    return (
                      <button
                        key={mIdx}
                        type="button"
                        onClick={() => hasPnl && setJournalInsightMonth(mIdx + 1)}
                        className={`flex flex-col items-center justify-center gap-1 rounded-2xl ${hasPnl ? TAP : ""}`}
                        style={{
                          aspectRatio: "1",
                          background: hasPnl ? (monthPnl >= 0 ? `${palette.green}1A` : `${palette.red}1A`) : palette.surface,
                          border: `1px solid ${hasPnl ? (monthPnl >= 0 ? palette.green : palette.red) + "55" : palette.border}`,
                          cursor: hasPnl ? "pointer" : "default",
                          transition: THEME_TRANSITION,
                        }}
                      >
              <span style={{ fontFamily: mono, fontSize: "13px", fontWeight: 600, color: hasPnl ? palette.text : palette.textFaint }}>{mLabel}</span>
                        {hasPnl && (
                          <span style={{ fontFamily: mono, fontSize: "10px", color: monthPnl >= 0 ? palette.green : palette.red }}>
                            {monthPnl >= 0 ? "+" : ""}{fmtMoney(monthPnl)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs mb-4" style={{ color: palette.textFaint }}>Tap a coloured month to see its daily breakdown.</p>

                <span className="block mb-1.5 uppercase" style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}>
                  PnL by Month
                </span>
                <div className={isDesktop ? "rounded-2xl p-6 mb-6" : "rounded-2xl p-4 mb-6"} style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}>
                  <div style={{ width: "100%", height: isDesktop ? 280 : 180 }}>
                    <ResponsiveContainer>
                      <BarChart data={journalMonthlyPnLSeries(pnlByMonth)} margin={{ top: 6, right: 8, bottom: 0, left: 0 }} barCategoryGap="30%">
                        <CartesianGrid stroke={palette.border} strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" stroke={palette.textFaint} tick={{ fill: palette.textFaint, fontSize: 10, fontFamily: mono }} tickLine={false} axisLine={{ stroke: palette.border }} />
                        <YAxis stroke={palette.textFaint} tick={{ fill: palette.textFaint, fontSize: 10, fontFamily: mono }} tickLine={false} axisLine={{ stroke: palette.border }} width={48} />
                        <ReferenceLine y={0} stroke={palette.textFaint} />
                        <Tooltip
                          cursor={false}
                          contentStyle={{ background: palette.field, border: `1px solid ${palette.border}`, borderRadius: "8px", fontFamily: mono, fontSize: "12px" }}
                          labelStyle={{ color: palette.textMuted }}
                          itemStyle={{ color: palette.text }}
                          formatter={(v) => [`${v >= 0 ? "+" : ""}$${fmtMoney(v)}`, "PnL"]}
                        />
                        <Bar dataKey="pnl" radius={[5, 5, 5, 5]} barSize={16} activeBar={false}>
                          {journalMonthlyPnLSeries(pnlByMonth).map((d, i) => (
                            <Cell key={i} fill={d.pnl >= 0 ? palette.green : palette.red} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            );
          }
          const daysInMonth = new Date(journalInsightYear, journalInsightMonth, 0).getDate();
          const monthTotal = pnlByMonth[journalInsightMonth] || 0;
          return (
            <>
              <button type="button" onClick={() => setJournalInsightMonth(null)} className={`flex items-center gap-1 mb-3 ${TAP}`} style={{ color: palette.textMuted, fontSize: "12px", fontFamily: mono }}>
                <ChevronLeft size={16} />{journalInsightYear}
              </button>
              <div className="rounded-2xl p-4 mb-6" style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}>
                <div className="flex items-baseline justify-between mb-3">
                  <span style={{ fontFamily: mono, fontSize: "13px", fontWeight: 600, color: palette.text }}>{MONTH_NAMES[journalInsightMonth - 1]} {journalInsightYear}</span>
                  <span style={{ fontFamily: mono, fontSize: "13px", color: monthTotal >= 0 ? palette.green : palette.red }}>
                    {monthTotal >= 0 ? "+" : ""}{fmtMoney(monthTotal)} total
                  </span>
                </div>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                  const dayPnl = pnlByDay[day];
                  if (dayPnl === undefined) return null;
                  return (
                    <div key={day} className="flex items-center justify-between py-2" style={{ borderBottom: `1px solid ${palette.border}` }}>
                      <span style={{ color: palette.textMuted, fontSize: "12px", fontFamily: mono }}>
                        {MONTH_SHORT[journalInsightMonth - 1]} {day}
                      </span>
                      <span style={{ fontFamily: mono, fontSize: "13px", color: dayPnl >= 0 ? palette.green : palette.red }}>
                        {dayPnl >= 0 ? "+" : ""}{fmtMoney(dayPnl)}
                      </span>
                    </div>
                  );
                })}
              </div>

              <span className="block mb-1.5 uppercase" style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}>
                PnL by Day — {MONTH_NAMES[journalInsightMonth - 1]}
              </span>
              <div className={isDesktop ? "rounded-2xl p-6 mb-6" : "rounded-2xl p-4 mb-6"} style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}>
                <div style={{ width: "100%", height: isDesktop ? 280 : 180 }}>
                  <ResponsiveContainer>
                    <BarChart data={journalDailyPnLSeries(pnlByDay, daysInMonth)} margin={{ top: 6, right: 8, bottom: 0, left: 0 }} barCategoryGap="25%">
                      <CartesianGrid stroke={palette.border} strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="label"
                        stroke={palette.textFaint}
                        tick={{ fill: palette.textFaint, fontSize: 9, fontFamily: mono }}
                        tickLine={false}
                        axisLine={{ stroke: palette.border }}
                        interval={Math.ceil(daysInMonth / 10)}
                      />
                      <YAxis stroke={palette.textFaint} tick={{ fill: palette.textFaint, fontSize: 10, fontFamily: mono }} tickLine={false} axisLine={{ stroke: palette.border }} width={48} />
                      <ReferenceLine y={0} stroke={palette.textFaint} />
                      <Tooltip
                        cursor={false}
                        contentStyle={{ background: palette.field, border: `1px solid ${palette.border}`, borderRadius: "8px", fontFamily: mono, fontSize: "12px" }}
                        labelStyle={{ color: palette.textMuted }}
                        itemStyle={{ color: palette.text }}
                        formatter={(v) => [`${v >= 0 ? "+" : ""}$${fmtMoney(v)}`, "PnL"]}
                        labelFormatter={(l) => `${MONTH_SHORT[journalInsightMonth - 1]} ${l}`}
                      />
                      <Bar dataKey="pnl" radius={[3, 3, 3, 3]} barSize={8} activeBar={false}>
                        {journalDailyPnLSeries(pnlByDay, daysInMonth).map((d, i) => (
                          <Cell key={i} fill={d.pnl >= 0 ? palette.green : palette.red} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          );
        })()}
        <span
          className="block mb-1.5 uppercase"
          style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
        >
          Journaling Activity (6 mo)
        </span>
        <div
          className={isDesktop ? "rounded-2xl p-6 mb-6" : "rounded-2xl p-4 mb-6"}
          style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
        >
          <div style={{ width: "100%", height: isDesktop ? 240 : 140 }}>
            <ResponsiveContainer>
              <BarChart data={monthlyVolume} margin={{ top: 6, right: 8, bottom: 0, left: 0 }} barCategoryGap="35%">
                <CartesianGrid stroke={palette.border} strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
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
                  width={28}
                  allowDecimals={false}
                />
                <Tooltip {...barTooltipProps} formatter={(v) => [`${v}`, "Entries"]} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={THIN_BAR_SIZE} fill={palette.gold} activeBar={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {weekdayFreq.some((d) => d.count > 0) && (
          <>
            <span
              className="block mb-1.5 uppercase"
              style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
            >
              Entries by Weekday
            </span>
            <div
              className={isDesktop ? "rounded-2xl p-6 mb-6" : "rounded-2xl p-4 mb-6"}
              style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
            >
              <div style={{ width: "100%", height: isDesktop ? 240 : 140 }}>
                <ResponsiveContainer>
                  <BarChart data={weekdayFreq} margin={{ top: 6, right: 8, bottom: 0, left: 0 }} barCategoryGap="30%">
                    <CartesianGrid stroke={palette.border} strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="label"
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
                      width={28}
                      allowDecimals={false}
                    />
                    <Tooltip {...barTooltipProps} formatter={(v) => [`${v}`, "Entries"]} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={THIN_BAR_SIZE} fill={palette.goldBright} activeBar={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

{sessionByDay.length > 0 && (() => {
  const sessionFreq = journalSessionFrequency(journalRows);
  const totalEntries = sessionFreq.reduce((sum, s) => sum + s.count, 0);
  return (
    <>
      <span className="block mb-1.5 uppercase" style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}>
        Session Breakdown
      </span>
      <div className={isDesktop ? "rounded-2xl p-6 mb-2" : "rounded-2xl p-4 mb-2"} style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}>
        <div style={{ width: "100%", height: isDesktop ? 280 : 180 }}>
          <ResponsiveContainer>
            <BarChart data={sessionByDay} margin={{ top: 6, right: 8, bottom: 0, left: 0 }} barCategoryGap="22%">
              <CartesianGrid stroke={palette.border} strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                stroke={palette.textFaint}
                tick={{ fill: palette.textFaint, fontSize: 9, fontFamily: mono }}
                tickLine={false}
                axisLine={{ stroke: palette.border }}
                minTickGap={20}
              />
              <YAxis
                stroke={palette.textFaint}
                tick={{ fill: palette.textFaint, fontSize: 10, fontFamily: mono }}
                tickLine={false}
                axisLine={{ stroke: palette.border }}
                width={28}
                allowDecimals={false}
              />
              <Tooltip
                cursor={{ fill: `${palette.gold}10` }}
                contentStyle={{ background: palette.field, border: `1px solid ${palette.border}`, borderRadius: "8px", fontFamily: mono, fontSize: "12px" }}
                labelStyle={{ color: palette.textMuted }}
              />
              {MARKET_SESSIONS.map((s, idx) => (
                <Bar
                  key={s.id}
                  dataKey={s.label}
                  stackId="a"
                  fill={s.color}
                  radius={idx === MARKET_SESSIONS.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {sessionFreq.length > 0 && (
          <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${palette.border}` }}>
            <div className="flex items-center justify-between mb-2">
              <span className="uppercase" style={{ color: palette.textFaint, fontSize: "10px", letterSpacing: "0.07em" }}>Session</span>
              <span className="uppercase" style={{ color: palette.textFaint, fontSize: "10px", letterSpacing: "0.07em" }}>Total</span>
            </div>
            {sessionFreq.map((s) => (
              <div key={s.id} className="flex items-center gap-2 mb-1.5">
                <span style={{ width: "64px", fontSize: "11px", fontFamily: mono, color: s.color, fontWeight: 600, flexShrink: 0 }}>
                  {s.label}
                </span>
                <div className="flex-1" style={{ height: "5px", borderRadius: "999px", background: palette.field, overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${totalEntries ? (s.count / totalEntries) * 100 : 0}%`,
                      background: s.color,
                      borderRadius: "999px",
                      transition: "width 0.4s ease",
                    }}
                  />
                </div>
                <span style={{ fontFamily: mono, fontSize: "11px", color: palette.textMuted, flexShrink: 0, minWidth: "28px", textAlign: "right" }}>
                  {s.count}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      <p className="text-xs mb-6" style={{ color: palette.textFaint }}>
        Daily entries stacked by session — bars show when you're most active. Progress strips show each session's share of all logged entries.
      </p>
    </>
  );
})()}

        {confidenceByDay.length > 1 && (
          <>
            <span
              className="block mb-1.5 uppercase"
              style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
            >
              Confidence by Day
            </span>
            <div
              className={isDesktop ? "rounded-2xl p-6 mb-6" : "rounded-2xl p-4 mb-6"}
              style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
            >
              <div style={{ width: "100%", height: isDesktop ? 260 : 160 }}>
                <ResponsiveContainer>
                  <LineChart data={confidenceByDay} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke={palette.border} strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="label"
                      stroke={palette.textFaint}
                      tick={{ fill: palette.textFaint, fontSize: 9, fontFamily: mono }}
                      tickLine={false}
                      axisLine={{ stroke: palette.border }}
                      minTickGap={20}
                    />
                    <YAxis
                      stroke={palette.textFaint}
                      tick={{ fill: palette.textFaint, fontSize: 10, fontFamily: mono }}
                      tickLine={false}
                      axisLine={{ stroke: palette.border }}
                      width={54}
                      domain={[1, 3]}
                      ticks={[1, 2, 3]}
                      tickFormatter={(v) => (v === 1 ? "Low" : v === 2 ? "Medium" : "High")}
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
                      formatter={(v) => [
                        v === 1 ? "Low" : v === 2 ? "Medium" : v === 3 ? "High" : v.toFixed(2),
                        "Confidence",
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="avgConfidence"
                      stroke={palette.gold}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <p className="text-xs mb-6" style={{ color: palette.textFaint }}>
              Average confidence level logged per day (Low / Medium / High) \u2014 a dip here alongside a losing
              streak can be worth a closer look.
            </p>
          </>
        )}

        {trendBreakdown.length > 0 && (
          <>
            <span
              className="block mb-1.5 uppercase"
              style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
            >
              Trend Breakdown
            </span>
            <div
              className={isDesktop ? "rounded-2xl p-6 mb-6" : "rounded-2xl p-4 mb-6"}
              style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
            >
              <div style={{ width: "100%", height: isDesktop ? 300 : 200 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={trendBreakdown}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={72}
                      paddingAngle={2}
                    >
                      {trendBreakdown.map((d, i) => (
                        <Cell key={d.id} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: palette.field,
                        border: `1px solid ${palette.border}`,
                        borderRadius: "8px",
                        fontFamily: mono,
                        fontSize: "12px",
                      }}
                      labelStyle={{ color: palette.textMuted }}
                      itemStyle={{ color: palette.text }}
                    />
                    <Legend
                      wrapperStyle={{ fontFamily: mono, fontSize: "11px", color: palette.textMuted }}
                      formatter={(v) => <span style={{ color: palette.textMuted }}>{v}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {setupRadarData.rows.length > 0 && (
          <>
            <span
              className="block mb-1.5 uppercase"
              style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
            >
              Setup Breakdown
            </span>
            <div
              className={isDesktop ? "rounded-2xl p-6 mb-6" : "rounded-2xl p-4 mb-6"}
              style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
            >
              <div style={{ width: "100%", height: Math.max(isDesktop ? 220 : 140, setupRadarData.rows.length * (isDesktop ? 44 : 34)) }}>
                <ResponsiveContainer>
                  <BarChart
                    data={[...setupRadarData.rows].sort((a, b) => b.count - a.count)}
                    layout="vertical"
                    margin={{ top: 4, right: 16, bottom: 4, left: 4 }}
                    barCategoryGap="30%"
                  >
                    <CartesianGrid stroke={palette.border} strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" hide allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={92}
                      stroke={palette.textFaint}
                      tick={{ fill: palette.textMuted, fontSize: 10, fontFamily: mono }}
                      tickLine={false}
                      axisLine={{ stroke: palette.border }}
                    />
                    <Tooltip
                      cursor={false}
                      contentStyle={{
                        background: palette.field,
                        border: `1px solid ${palette.border}`,
                        borderRadius: "8px",
                        fontFamily: mono,
                        fontSize: "12px",
                      }}
                      labelStyle={{ color: palette.textMuted }}
                      itemStyle={{ color: palette.text }}
                      formatter={(v) => [`${v}`, "Entries"]}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={16} fill={palette.gold} activeBar={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

{combinedMistakeRows.length > 0 && (
  <>
    {patternDetected ? (
      <div
        className="rounded-2xl p-4 mb-6"
        style={{ background: palette.surface, border: `1px solid ${palette.red}`, boxShadow: palette.shadow }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Lightbulb size={14} style={{ color: palette.red }} />
          <span className="uppercase" style={{ color: palette.red, letterSpacing: "0.08em", fontSize: "10px" }}>
            Pattern Detected
          </span>
        </div>
        <div style={{ color: palette.text, fontSize: "13px" }}>
          {mistakePatterns.worstTrends.length > 0 && mistakePatterns.worstTrends[0].mistakeRate >= 30 && (
            <>
              You log a mistake {mistakePatterns.worstTrends[0].mistakeRate}% of the time in{" "}
              {joinWithAnd(mistakePatterns.worstTrends.map((t) => t.label.toLowerCase()))} conditions.{" "}
            </>
          )}
          {mistakePatterns.worstWeekdays.length > 0 && mistakePatterns.worstWeekdays[0].mistakeRate >= 30 && (
            <>
              {joinWithAnd(mistakePatterns.worstWeekdays.map((w) => `${w.fullLabel}s`))}{" "}
              {mistakePatterns.worstWeekdays.length > 1 ? "are" : "is"} your worst day
              {mistakePatterns.worstWeekdays.length > 1 ? "s" : ""}.
            </>
          )}
        </div>
      </div>
    ) : (
      <div
        className="rounded-2xl p-4 mb-6"
        style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Lightbulb size={14} style={{ color: palette.textFaint }} />
          <span className="uppercase" style={{ color: palette.textFaint, letterSpacing: "0.08em", fontSize: "10px" }}>
            No Strong Pattern Yet
          </span>
        </div>
        <div style={{ color: palette.textMuted, fontSize: "13px" }}>
          {closestWeekday
            ? `${closestWeekday.fullLabel} currently has your highest mistake rate at ${closestWeekday.mistakeRate}%${
                closestWeekday.count < 3
                  ? `, but it only has ${closestWeekday.count} entr${closestWeekday.count === 1 ? "y" : "ies"} so far — a weekday needs at least 3 journaled entries before a pattern counts`
                  : ", which is under the 30% threshold that flags a real pattern"
              }.`
            : "Fill in the Mistake field on a few more journal rows — once a weekday or market condition has at least 3 entries, patterns will start surfacing here."}
        </div>
      </div>
    )}

            <span
              className="block mb-1.5 uppercase"
              style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
            >
              Mistake Rate by Trend & Weekday
            </span>
            <div
              className={isDesktop ? "rounded-2xl p-6 mb-6" : "rounded-2xl p-4 mb-6"}
              style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
            >
              <div style={{ width: "100%", height: isDesktop ? 280 : 180 }}>
                <ResponsiveContainer>
                  <BarChart data={combinedMistakeRows} margin={{ top: 6, right: 8, bottom: 8, left: 0 }} barCategoryGap="25%">
                    <CartesianGrid stroke={palette.border} strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="label"
                      stroke={palette.textFaint}
                      tick={{ fill: palette.textFaint, fontSize: 9, fontFamily: mono }}
                      tickLine={false}
                      axisLine={{ stroke: palette.border }}
                      interval={0}
                      angle={-35}
                      textAnchor="end"
                      height={46}
                    />
                    <YAxis
                      stroke={palette.textFaint}
                      tick={{ fill: palette.textFaint, fontSize: 10, fontFamily: mono }}
                      tickLine={false}
                      axisLine={{ stroke: palette.border }}
                      width={30}
                      unit="%"
                    />
                    <Tooltip
                      {...barTooltipProps}
                      formatter={(v, name, props) => [`${v}%`, props.payload.group]}
                    />
                    <Bar dataKey="mistakeRate" radius={[4, 4, 0, 0]} barSize={THIN_BAR_SIZE} activeBar={false}>
                      {combinedMistakeRows.map((r, i) => (
                        <Cell key={i} fill={r.mistakeRate >= 50 ? palette.red : r.mistakeRate >= 25 ? palette.gold : palette.green} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <p className="text-xs mb-6" style={{ color: palette.textFaint }}>
              Percent of entries with a mistake logged, grouped by market condition and by day of week – this is
              where to look for a habit to fix, not just a setup to favor.
            </p>
          </>
        )}

        {mistakeFreq.length > 0 && (
          <>
            <span
              className="block mb-1.5 uppercase"
              style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
            >
              Recurring Mistakes
            </span>
            <div
              className={isDesktop ? "rounded-2xl p-6 mb-6" : "rounded-2xl p-4 mb-6"}
              style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
            >
              <div style={{ width: "100%", height: Math.max(isDesktop ? 220 : 140, mistakeFreq.length * (isDesktop ? 44 : 34)) }}>
                <ResponsiveContainer>
                  <BarChart
                    data={mistakeFreq}
                    layout="vertical"
                    margin={{ top: 4, right: 16, bottom: 4, left: 4 }}
                    barCategoryGap="30%"
                  >
                    <CartesianGrid stroke={palette.border} strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" hide allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={120}
                      stroke={palette.textFaint}
                      tick={{ fill: palette.textMuted, fontSize: 10, fontFamily: mono }}
                      tickLine={false}
                      axisLine={{ stroke: palette.border }}
                    />
                    <Tooltip {...barTooltipProps} formatter={(v) => [`${v}`, "Count"]} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={16} fill={palette.red} activeBar={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {pairFreq.length > 0 && (
          <>
            <span
              className="block mb-1.5 uppercase"
              style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
            >
              Most Journaled Pairs
            </span>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-2">
              {pairFreq.map((p) => (
                <StatChip key={p.pair} label={p.pair} value={`${p.count} entr${p.count === 1 ? "y" : "ies"}`} />
              ))}
            </div>
          </>
        )}

        <p className="text-xs mt-4" style={{ color: palette.textFaint }}>
          These charts read straight from your Journal tab rows, add or fill in more rows there to sharpen the
          picture here.
        </p>
      </>
    );

    body = (
      <>
        {insightsSubNav}
        {insightsSubTab === "overview" && overviewSection}
        {insightsSubTab === "behavior" && behaviorSection}
        {insightsSubTab === "journal" && journalSection}

        {insightsSubTab !== "journal" && hasData && (
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
      const stats = computePlaybookStats(playbookRules, playbookCheckins);
      const todayKey = dayKeyFromDate(new Date());
      const alreadyCheckedInToday = playbookCheckins.some((c) => c.date === todayKey);
      const recentCheckins = [...playbookCheckins]
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
        .slice(0, 7);

      body = (
        <>
          {journalSubNav}

          <OnboardingTip
            id="playbook-intro"
            text="Check off which rules you followed each day here to build a discipline streak, separate from your P&L."
            settings={settings}
            persistSettings={persistSettings}
          />

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
              <div className="grid grid-cols-3 gap-3 lg:gap-4 mb-6">
                <div
                  className={isDesktop ? "rounded-lg p-5" : "rounded-lg p-3"}
                  style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow, transition: THEME_TRANSITION }}
                >
                  <div
                    className="flex items-center gap-1 mb-1"
                    style={{ color: palette.textFaint, fontSize: isDesktop ? "12px" : "10px", letterSpacing: "0.06em" }}
                  >
                    <Flame size={isDesktop ? 13 : 11} style={{ color: stats.current > 0 ? palette.gold : palette.textFaint }} />
                    STREAK
                  </div>
                  <div style={{ fontFamily: mono, fontSize: isDesktop ? "1.6rem" : "1.1rem", color: palette.text }}>
                    {stats.current}
                    <span style={{ fontSize: "11px", color: palette.textFaint }}>d</span>
                  </div>
                </div>
                <div
                  className={isDesktop ? "rounded-lg p-5" : "rounded-lg p-3"}
                  style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow, transition: THEME_TRANSITION }}
                >
                  <div
                    className="flex items-center gap-1 mb-1"
                    style={{ color: palette.textFaint, fontSize: isDesktop ? "12px" : "10px", letterSpacing: "0.06em" }}
                  >
                    <TrendingUp size={isDesktop ? 13 : 11} />
                    BEST
                  </div>
                  <div style={{ fontFamily: mono, fontSize: isDesktop ? "1.6rem" : "1.1rem", color: palette.text }}>
                    {stats.best}
                    <span style={{ fontSize: isDesktop ? "13px" : "11px", color: palette.textFaint }}>d</span>
                  </div>
                </div>
                <div
                  className={isDesktop ? "rounded-lg p-5" : "rounded-lg p-3"}
                  style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow, transition: THEME_TRANSITION }}
                >
                  <div
                    className="flex items-center gap-1 mb-1"
                    style={{ color: palette.textFaint, fontSize: isDesktop ? "12px" : "10px", letterSpacing: "0.06em" }}
                  >
                    <Target size={isDesktop ? 13 : 11} />
                    CLEAN
                  </div>
                  <div style={{ fontFamily: mono, fontSize: isDesktop ? "1.6rem" : "1.1rem", color: palette.text }}>
                    {stats.overallPct}
                    <span style={{ fontSize: isDesktop ? "13px" : "11px", color: palette.textFaint }}>%</span>
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
            Track up to {MAX_PLAYBOOK_RULES} rules at once. Removing a rule only affects future check-ins,
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
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
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
            const year = journalYear;
      const monthIdx = journalMonth;
      const monthPrefix = `${year}-${pad2(monthIdx + 1)}`;
      const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
      const monthMinDate = `${monthPrefix}-01`;
      const monthMaxDate = `${monthPrefix}-${pad2(daysInMonth)}`;

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
                pnl: "",
                setup: "",
                outcome: "",
                session: "",
                mood: "",
                confidence: "",
                mistake: "",
                note: "",
                _placeholder: true,
              },
            ];

      const totalTableWidth =
        JOURNAL_TOGGLE_COL_WIDTH + JOURNAL_COLUMNS.reduce((s, c) => s + journalColWidths[c.id], 0) + 36;

      const cellInputStyle = { color: palette.text, fontFamily: mono, fontSize: isDesktop ? "14px" : "12px", border: "none" };
      const detailFieldStyle = { color: palette.text, fontFamily: mono, fontSize: isDesktop ? "15px" : "13px", border: "none" };

      const autoResizeTextarea = (el) => {
        if (!el) return;
        el.style.height = "auto";
        el.style.height = `${el.scrollHeight}px`;
      };

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
          const visibleDefaultSetups = SETUPS.filter((s) => !hiddenDefaultSetupIds.includes(s.id));
          const allSetups = [...visibleDefaultSetups, ...customSetups];
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

        if (col.id === "pnl") {
          const val = row.pnl || "";
          const n = parseFloat(val);
          const hasVal = val !== "" && Number.isFinite(n);
          return (
            <input
              type="text"
              inputMode="decimal"
              ref={registerRef}
              onKeyDown={onCellKeyDown}
              value={val}
              onChange={(e) => updateJournalPnl(row.id, e.target.value, dateForRow)}
              placeholder="PnL"
              className="w-full bg-transparent outline-none"
              style={{ ...cellInputStyle, color: hasVal ? (n >= 0 ? palette.green : palette.red) : palette.textFaint }}
            />
          );
        }

        if (col.id === "outcome") {
          const val = row.outcome || "";
          return (
            <select
              ref={registerRef}
              onKeyDown={onCellKeyDown}
              value={val}
              onChange={(e) => updateJournalField(row.id, "outcome", e.target.value, dateForRow)}
              className="w-full bg-transparent outline-none appearance-none"
              style={{
                ...cellInputStyle,
                color:
                  val === "win" ? palette.green : val === "loss" ? palette.red : val ? palette.text : palette.textFaint,
              }}
            >
              <option value="" style={{ background: palette.field, color: palette.textFaint }}>
                Add outcome
              </option>
              {OUTCOME_OPTIONS.map((o) => (
                <option key={o.id} value={o.id} style={{ background: palette.field, color: palette.text }}>
                  {o.label}
                </option>
              ))}
            </select>
          );
        }

        const placeholderText = col.id === "pair" ? "Add pair" : "Add R:R";
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

      const renderDetailField = (row, field) => {
        const dateForRow = row.date;

        const selectStyle = {
          ...detailFieldStyle,
          border: `1px solid ${palette.border}`,
          borderRadius: "6px",
          padding: "4px 8px",
          width: "100%",
          display: "block",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        };

        if (field.id === "session") {
          const val = row.session || "";
          return (
            <select
              value={val}
              onChange={(e) => updateJournalField(row.id, "session", e.target.value, dateForRow)}
              className="bg-transparent outline-none appearance-none"
              style={{ ...selectStyle, color: val ? palette.text : palette.textFaint }}
            >
              <option value="" style={{ background: palette.field, color: palette.textFaint }}>
                Choose
              </option>
              {MARKET_SESSIONS.map((s) => (
                <option key={s.id} value={s.id} style={{ background: palette.field, color: palette.text }}>
                  {s.label}
                </option>
              ))}
            </select>
          );
        }
        if (field.id === "mood") {
          const val = row.mood || "";
          return (
            <select
              value={val}
              onChange={(e) => updateJournalField(row.id, "mood", e.target.value, dateForRow)}
              className="bg-transparent outline-none appearance-none"
              style={{ ...selectStyle, color: val ? palette.text : palette.textFaint }}
            >
              <option value="" style={{ background: palette.field, color: palette.textFaint }}>
                Select
              </option>
              {EMOTIONS.map((e) => (
                <option key={e.id} value={e.id} style={{ background: palette.field, color: palette.text }}>
                  {e.emoji} {e.label}
                </option>
              ))}
              {customMoods.map((m) => (
                <option key={m.id} value={m.id} style={{ background: palette.field, color: palette.text }}>
                  {m.emoji} {m.label}
                </option>
              ))}
            </select>
          );
        }
        if (field.id === "confidence") {
          const val = row.confidence || "";
          return (
            <select
              value={val}
              onChange={(e) => updateJournalField(row.id, "confidence", e.target.value, dateForRow)}
              className="bg-transparent outline-none appearance-none"
              style={{ ...selectStyle, color: val ? palette.text : palette.textFaint }}
            >
              <option value="" style={{ background: palette.field, color: palette.textFaint }}>
                Select
              </option>
              {CONFIDENCE_OPTIONS.map((c) => (
                <option key={c.id} value={c.id} style={{ background: palette.field, color: palette.text }}>
                  {c.label}
                </option>
              ))}
            </select>
          );
        }

        if (field.id === "entryPrice" || field.id === "closingPrice") {
          const val = row[field.id] || "";
          return (
            <input
              type="text"
              inputMode="decimal"
              value={val}
              onChange={(e) => updateJournalField(row.id, field.id, e.target.value, dateForRow)}
              placeholder={field.id === "entryPrice" ? "2415.20" : "2410.00"}
              className="w-full bg-transparent outline-none"
              style={{ ...selectStyle, color: val ? palette.text : palette.textFaint }}
            />
          );
        }

        if (field.id === "mistake") {
          const val = row.mistake || "";
          return (
            <textarea
              value={val}
              onChange={(e) => {
                updateJournalField(row.id, "mistake", e.target.value, dateForRow);
                e.target.style.height = "auto";
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              ref={(el) => {
                if (el) {
                  el.style.height = "auto";
                  el.style.height = `${el.scrollHeight}px`;
                }
              }}
              placeholder="Add mistake"
              rows={1}
              className="w-full bg-transparent outline-none block"
              style={{
                ...detailFieldStyle,
                border: `1px solid ${palette.border}`,
                borderRadius: "6px",
                padding: "6px 10px",
                resize: "none",
                overflow: "hidden",
                whiteSpace: "pre-wrap",
                overflowWrap: "break-word",
                wordBreak: "break-word",
                lineHeight: "1.5",
                minHeight: "34px",
              }}
            />
          );
        }

        // Note — auto-growing textarea, no reserved blank space
        return (
          <textarea
            value={row[field.id] || ""}
            onChange={(e) => {
              updateJournalField(row.id, field.id, e.target.value, dateForRow);
              e.target.style.height = "auto";
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
            ref={(el) => {
              if (el) {
                el.style.height = "auto";
                el.style.height = `${el.scrollHeight}px`;
              }
            }}
            placeholder="Add note"
            rows={1}
            className="w-full bg-transparent outline-none block"
            style={{
              ...detailFieldStyle,
              border: `1px solid ${palette.border}`,
              borderRadius: "6px",
              padding: "6px 10px",
              resize: "none",
              overflow: "hidden",
              whiteSpace: "pre-wrap",
              overflowWrap: "break-word",
              wordBreak: "break-word",
              lineHeight: "1.5",
              minHeight: "34px",
            }}
          />
        );
      };

      const cardFieldBoxStyle = {
        border: `1px solid ${palette.border}`,
        borderRadius: "6px",
        padding: "4px 8px",
        width: "100%",
        display: "block",
        background: "transparent",
      };

      const renderCardField = (row, col, rowIdx, colIdx, rows) => {
        const dateForRow = row.date;

        if (col.id === "date") {
          return (
            <input
              type="date"
              value={row.date || ""}
              min={monthMinDate}
              max={monthMaxDate}
              onChange={(e) => updateJournalField(row.id, "date", e.target.value, dateForRow)}
              className="w-full bg-transparent outline-none journal-row-date-input"
              style={{ ...detailFieldStyle, ...cardFieldBoxStyle }}
            />
          );
        }
        if (col.id === "trend") {
          const val = row.trend || "";
          return (
            <select
              value={val}
              onChange={(e) => updateJournalField(row.id, "trend", e.target.value, dateForRow)}
              className="w-full bg-transparent outline-none appearance-none"
              style={{ ...detailFieldStyle, ...cardFieldBoxStyle, color: val ? palette.text : palette.textFaint }}
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
          const visibleDefaultSetups = SETUPS.filter((s) => !hiddenDefaultSetupIds.includes(s.id));
          const allSetups = [...visibleDefaultSetups, ...customSetups];
          return (
            <select
              value={val}
              onChange={(e) => updateJournalField(row.id, "setup", e.target.value, dateForRow)}
              className="w-full bg-transparent outline-none appearance-none"
              style={{ ...detailFieldStyle, ...cardFieldBoxStyle, color: val ? palette.text : palette.textFaint }}
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
        if (col.id === "pnl") {
          const val = row.pnl || "";
          const n = parseFloat(val);
          const hasVal = val !== "" && Number.isFinite(n);
          return (
            <input
              type="text"
              inputMode="decimal"
              value={val}
              onChange={(e) => updateJournalPnl(row.id, e.target.value, dateForRow)}
              placeholder="PnL"
              className="w-full bg-transparent outline-none"
              style={{
                ...detailFieldStyle,
                ...cardFieldBoxStyle,
                color: hasVal ? (n >= 0 ? palette.green : palette.red) : palette.textFaint,
              }}
            />
          );
        }
        if (col.id === "outcome") {
          const val = row.outcome || "";
          return (
            <select
              value={val}
              onChange={(e) => updateJournalField(row.id, "outcome", e.target.value, dateForRow)}
              className="w-full bg-transparent outline-none appearance-none"
              style={{
                ...detailFieldStyle,
                ...cardFieldBoxStyle,
                color:
                  val === "win" ? palette.green : val === "loss" ? palette.red : val ? palette.text : palette.textFaint,
              }}
            >
              <option value="" style={{ background: palette.field, color: palette.textFaint }}>
                W/L/BE 
              </option>
              {OUTCOME_OPTIONS.map((o) => (
                <option key={o.id} value={o.id} style={{ background: palette.field, color: palette.text }}>
                  {o.label}
                </option>
              ))}
            </select>
          );
        }

        const placeholderText = col.id === "pair" ? "Add pair" : "Add R";
        return (
          <input
            type="text"
            value={row[col.id] || ""}
            onChange={(e) => updateJournalField(row.id, col.id, e.target.value, dateForRow)}
            placeholder={placeholderText}
            className="w-full bg-transparent outline-none"
            style={{ ...detailFieldStyle, ...cardFieldBoxStyle }}
          />
        );
      };

      const journalLayoutPref = settings.journalTableLayout || "auto";
      const useCardLayout = journalLayoutPref === "cards" || (journalLayoutPref === "auto" && isNarrowScreen);

      body = (
        <>
          {journalSubNav}

          <OnboardingTip
            id="journal-table-intro"
            text="Tap any cell to edit it. Tap the arrow on the left of a row to reveal Session, Mood, Confidence, Mistake, and Note without widening the table."
            settings={settings}
            persistSettings={persistSettings}
          />

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
          ) : useCardLayout ? (
            <div className="mb-3">
              {allRows.map((row, rowIdx) => {
                const isExpanded = !!journalExpandedRows[row.id];
                return (
                  <div
                    key={row.id}
                    className="rounded-2xl mb-3 p-3"
                    style={{
                      background: palette.surface,
                      border: `1px solid ${palette.border}`,
                      boxShadow: palette.shadow,
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {!row._placeholder && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleJournalRowExpanded(row.id);
                          }}
                          className={TAP}
                          style={{
                            color: palette.textMuted,
                            flexShrink: 0,
                            width: "28px",
                            height: "28px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          aria-label={isExpanded ? "Collapse row" : "Expand row"}
                        >
                          {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                        </button>
                      )}
   <div
     className="flex-1 min-w-0"
     style={{ overflow: "hidden" }}
     onClick={(e) => e.stopPropagation()}
   >
    <input
      type="date"
      value={row.date || ""}
      min={monthMinDate}
      max={monthMaxDate}
      onChange={(e) => updateJournalField(row.id, "date", e.target.value, row.date)}
      className="bg-transparent outline-none journal-row-date-input"
      style={{ ...detailFieldStyle, fontSize: "12px", width: "calc(100% + 24px)" }}
    />
</div>
                      {!row._placeholder && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteJournalRow(row.id);
                          }}
                          className={TAP}
                          style={{
                            color: palette.textFaint,
                            flexShrink: 0,
                            width: "28px",
                            height: "28px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          aria-label="Delete row"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 mb-2">
                      {JOURNAL_COLUMNS.filter((c) => c.id !== "date").map((col, colIdx) => (
                        <div key={col.id}>
                          <span
                            className="block mb-1 uppercase"
                            style={{ color: palette.textFaint, letterSpacing: "0.06em", fontSize: "10px" }}
                          >
                            {col.label}
                          </span>
                          {renderCardField(row, col, rowIdx, colIdx, allRows)}
                        </div>
                      ))}
                    </div>

                    {isExpanded && !row._placeholder && (
                      <>
                        <div className="grid grid-cols-3 gap-1.5 mb-2">
                          {JOURNAL_DETAIL_FIELDS.filter(
                            (f) => f.id === "session" || f.id === "mood" || f.id === "confidence"
                          ).map((field) => (
                            <div key={field.id}>
                              <span
                                className="block mb-1 uppercase"
                                style={{ color: palette.textFaint, letterSpacing: "0.06em", fontSize: "10px" }}
                              >
                                {field.label}
                              </span>
                              {renderDetailField(row, field)}
                            </div>
                          ))}
                        </div>

                        <div className="grid grid-cols-2 gap-1.5 mb-2">
                          {["entryPrice", "closingPrice"].map((fid) => {
                            const field = JOURNAL_DETAIL_FIELDS.find((f) => f.id === fid);
                            return (
                              <div key={fid}>
                                <span
                                  className="block mb-1 uppercase"
                                  style={{ color: palette.textFaint, letterSpacing: "0.06em", fontSize: "10px" }}
                                >
                                  {field.label}
                                </span>
                                {renderDetailField(row, field)}
                              </div>
                            );
                          })}
                        </div>

                        <div className="mb-2">
                          <span
                            className="block mb-1 uppercase"
                            style={{ color: palette.textFaint, letterSpacing: "0.06em", fontSize: "10px" }}
                          >
                            Mistake
                          </span>
                          {renderDetailField(row, JOURNAL_DETAIL_FIELDS.find((f) => f.id === "mistake"))}
                        </div>

                        <div className="mb-3">
                          <span
                            className="block mb-1 uppercase"
                            style={{ color: palette.textFaint, letterSpacing: "0.06em", fontSize: "10px" }}
                          >
                            Note
                          </span>
                          {renderDetailField(row, JOURNAL_DETAIL_FIELDS.find((f) => f.id === "note"))}
                        </div>

                        <div>
                          <span
                            className="block mb-1 uppercase"
                            style={{ color: palette.textFaint, letterSpacing: "0.06em", fontSize: "10px" }}
                          >
                            Trade Photos
                          </span>
                          <div className="flex flex-col gap-2" style={{ width: "80px" }}>
                            {(row.photos || []).map((src, idx) => (
                              <div key={idx} className="relative inline-block">
                                <img
                                  src={src}
                                  alt={`Trade photo ${idx + 1}`}
                                  onClick={() => setViewingJournalPhoto({ src, rowId: row.id, index: idx })}
                                  className={`rounded-lg ${TAP}`}
                                  style={{
                                    width: "80px",
                                    height: "80px",
                                    objectFit: "cover",
                                    border: `1px solid ${palette.border}`,
                                    cursor: "pointer",
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => setPendingJournalPhotoDelete({ rowId: row.id, index: idx })}
                                  className={`absolute flex items-center justify-center rounded-full ${TAP}`}
                                  style={{
                                    top: "-5px",
                                    right: "-5px",
                                    width: "16px",
                                    height: "16px",
                                    background: palette.red,
                                    color: "#FFFFFF",
                                  }}
                                  aria-label="Remove photo"
                                >
                                  <X size={9} />
                                </button>
                              </div>
                            ))}
                            {(row.photos || []).length < MAX_JOURNAL_PHOTOS_PER_ROW && (
                              <button
                                type="button"
                                onClick={() => openJournalPhotoPicker(row.id)}
                                disabled={journalPhotoSaving && journalPhotoTarget === row.id}
                                className={`flex flex-col items-center justify-center gap-1 rounded-lg ${TAP}`}
                                style={{
                                  width: "80px",
                                  height: "80px",
                                  background: "transparent",
                                  border: `1px dashed ${palette.border}`,
                                  color: palette.textFaint,
                                }}
                              >
                                <Camera size={14} />
                                <span style={{ fontSize: "9px", fontFamily: mono }}>
                                  {journalPhotoSaving && journalPhotoTarget === row.id ? "Saving…" : "Add photo"}
                                </span>
                              </button>
                            )}
                          </div>
                          {journalPhotoError && (
                            <p className="text-xs mt-1" style={{ color: palette.red }}>
                              {journalPhotoError}
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              className="rounded-2xl mb-3"
              style={{
                background: palette.surface,
                border: `1px solid ${palette.border}`,
                boxShadow: palette.shadow,
                overflow: "hidden",
                maxHeight: isDesktop ? "680px" : "480px",
              }}
            >
              <div style={{ overflowY: "auto", overflowX: "auto", maxHeight: isDesktop ? "680px" : "480px", WebkitOverflowScrolling: "touch" }}>
                <table style={{ borderCollapse: "collapse", width: isDesktop ? "100%" : `${totalTableWidth}px`, minWidth: `${totalTableWidth}px` }}>
                  <thead>
                    <tr>
                      <th
                        style={{
                          position: "sticky",
                          top: 0,
                          zIndex: 1,
                          width: `${JOURNAL_TOGGLE_COL_WIDTH}px`,
                          minWidth: `${JOURNAL_TOGGLE_COL_WIDTH}px`,
                          background: palette.field,
                          borderBottom: `1px solid ${palette.gold}55`,
                        }}
                      />
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
                            padding: isDesktop ? "14px 12px" : "9px 8px",
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
                          zIndex: 1,
                          width: "36px",
                          minWidth: "36px",
                          background: palette.field,
                          borderBottom: `1px solid ${palette.gold}55`,
                        }}
                      />
                    </tr>
                  </thead>
                  <tbody>
                    {allRows.map((row, rowIdx) => {
                      const isExpanded = !!journalExpandedRows[row.id];
                      return (
                        <Fragment key={row.id}>
                          <tr style={{ background: rowIdx % 2 === 1 ? `${palette.field}55` : "transparent" }}>
                            <td
                              style={{
                                width: `${JOURNAL_TOGGLE_COL_WIDTH}px`,
                                minWidth: `${JOURNAL_TOGGLE_COL_WIDTH}px`,
                                borderBottom: `1px solid ${palette.border}`,
                            textAlign: "center",
                            verticalAlign: "top",
                            paddingTop: "6px",
                              }}
                            >
                              {!row._placeholder && (
                                <button
                                  type="button"
                                  onClick={() => toggleJournalRowExpanded(row.id)}
                                  className={TAP}
                                  style={{
                                    color: palette.textMuted,
                                    width: "28px",
                                    height: "28px",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                  aria-label={isExpanded ? "Collapse row" : "Expand row"}
                                >
                                  {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                                </button>
                              )}
                            </td>
                            {JOURNAL_COLUMNS.map((col, colIdx) => (
                              <td
                                key={col.id}
                                style={{
                                  width: `${journalColWidths[col.id]}px`,
                                  minWidth: `${journalColWidths[col.id]}px`,
                                  maxWidth: `${journalColWidths[col.id]}px`,
                                  borderBottom: `1px solid ${palette.border}`,
                                  borderRight: `1px solid ${palette.border}`,
                                  padding: isDesktop ? "10px 12px" : "5px 8px",
                                  verticalAlign: "top",
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
                            verticalAlign: "top",
                            paddingTop: "6px",
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
                          {isExpanded && !row._placeholder && (
                            <tr>
                              <td
                                colSpan={JOURNAL_COLUMNS.length + 2}
                                style={{
                                  borderBottom: `1px solid ${palette.border}`,
                                  background: `${palette.field}55`,
                                  padding: "10px 12px",
                                }}
                              >
                                <div className="grid grid-cols-3 gap-1.5 mb-2">
                                  {JOURNAL_DETAIL_FIELDS.filter(
                                    (f) => f.id === "session" || f.id === "mood" || f.id === "confidence"
                                  ).map((field) => (
                                    <div key={field.id}>
                                      <span
                                        className="block mb-1 uppercase"
                                        style={{ color: palette.textFaint, letterSpacing: "0.06em", fontSize: "10px" }}
                                      >
                                        {field.label}
                                      </span>
                                      {renderDetailField(row, field)}
                                    </div>
                                  ))}
                                </div>

                                <div className="grid grid-cols-3 gap-1.5 mb-2">
                                  {["mistake", "entryPrice", "closingPrice"].map((fid) => {
                                    const field = JOURNAL_DETAIL_FIELDS.find((f) => f.id === fid);
                                    return (
                                      <div key={fid}>
                                        <span
                                          className="block mb-1 uppercase"
                                          style={{ color: palette.textFaint, letterSpacing: "0.06em", fontSize: "10px" }}
                                        >
                                          {field.label}
                                        </span>
                                        {renderDetailField(row, field)}
                                      </div>
                                    );
                                  })}
                                </div>

                                <div className="grid grid-cols-3 gap-1.5 mb-3">
                                  {["note"].map((fid) => {
                                    const field = JOURNAL_DETAIL_FIELDS.find((f) => f.id === fid);
                                    return (
                                      <div key={fid}>
                                        <span
                                          className="block mb-1 uppercase"
                                          style={{ color: palette.textFaint, letterSpacing: "0.06em", fontSize: "10px" }}
                                        >
                                          {field.label}
                                        </span>
                                        {renderDetailField(row, field)}
                                      </div>
                                    );
                                  })}
                                </div>

                        <div>
                          <span
                            className="block mb-1 uppercase"
                            style={{ color: palette.textFaint, letterSpacing: "0.06em", fontSize: "10px" }}
                          >
                            Trade Photos
                          </span>
                                <div className="flex gap-2 flex-wrap">
                                  {(row.photos || []).map((src, idx) => (
                                    <div key={idx} className="relative inline-block">
                     <img
                      src={src}
                      alt={`Trade photo ${idx + 1}`}
                      onClick={() => setViewingJournalPhoto({ src, rowId: row.id, index: idx })}
                      className={`rounded-lg ${TAP}`}
                      style={{ width: "80px", height: "80px", objectFit: "cover", border: `1px solid ${palette.border}`, cursor: "pointer" }}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => setPendingJournalPhotoDelete({ rowId: row.id, index: idx })}
                                        className={`absolute flex items-center justify-center rounded-full ${TAP}`}
                                        style={{ top: "-5px", right: "-5px", width: "16px", height: "16px", background: palette.red, color: "#FFFFFF" }}
                                        aria-label="Remove photo"
                                      >
                                        <X size={9} />
                                      </button>
                                    </div>
                                  ))}
                                  {(row.photos || []).length < MAX_JOURNAL_PHOTOS_PER_ROW && (
                 <button
                  type="button"
                  onClick={() => openJournalPhotoPicker(row.id)}
                  disabled={journalPhotoSaving && journalPhotoTarget === row.id}
                  className={`flex flex-col items-center justify-center gap-1 rounded-lg ${TAP}`}
                  style={{ width: "80px", height: "80px", background: "transparent", border: `1px dashed ${palette.border}`, color: palette.textFaint }}
                                    >
                                      <Camera size={14} />
                                      <span style={{ fontSize: "9px", fontFamily: mono }}>
                                        {journalPhotoSaving && journalPhotoTarget === row.id ? "Saving…" : "Add photo"}
                                      </span>
                                    </button>
                                  )}
                                </div>
                                {journalPhotoError && (
                                  <p className="text-xs mt-1" style={{ color: palette.red }}>{journalPhotoError}</p>
                                )}
                              </div>
                             </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {addingSetup && (
            <div className="flex items-center gap-2 mb-3">
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

          <button
            type="button"
            onClick={() => {
              const today = new Date();
              const isCurrentMonth = today.getFullYear() === year && today.getMonth() === monthIdx;
              addJournalRow(isCurrentMonth ? dayKeyFromDate(today) : monthMinDate);
            }}
            className={`w-full flex items-center justify-center gap-2 rounded-lg py-3 mb-3 ${TAP}`}
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

          <button
            type="button"
            onClick={exportJournalCSV}
            className={`w-full flex items-center justify-center gap-2 rounded-lg py-3 mb-2 ${TAP}`}
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
            Download Journal (CSV)
          </button>
          {journalExportMsg && (
            <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
              {journalExportMsg}
            </p>
          )}

          <button
            type="button"
            onClick={triggerJournalImport}
            className={`w-full flex items-center justify-center gap-2 rounded-lg py-3 mb-2 ${TAP}`}
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
            <Upload size={16} />
            Import Journal (CSV)
          </button>
          <input
            ref={journalImportInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={importJournalCSV}
            style={{ display: "none" }}
          />

          <input
            ref={journalPhotoInputRef}
            type="file"
            accept="image/*"
            onChange={handleJournalPhotoChange}
            style={{ display: "none" }}
          />

          {journalImportMsg && (
            <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
              {journalImportMsg}
            </p>
          )}

          <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
            Tap any cell to edit, Trend, Setup, and Outcome are quick-select. Tap the arrow on the left of a row
            to open Session, Mood, Confidence, Mistake, and Note without widening the table. The date only lets
            you pick a day within {MONTH_NAMES[monthIdx]} {year}. Drag a column header's right edge to resize it.
            Rows sort by date automatically, so add extra rows for multiple trades on the same day. Hold Alt and
            press an arrow key to jump between the visible cells. Use Download Journal to save this month's
            entries, including the expanded fields, as a CSV file.
          </p>
        </>
      );
    }
  }

  if (activeTab === "notepad") {
    const activeNote = activeNoteId ? notepadNotes.find((n) => n.id === activeNoteId) : null;

    if (!notepadLoaded) {
      body = (
        <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
          Loading notes\u2026
        </p>
      );
    } else if (!activeNote) {
      const query = notepadSearch.trim().toLowerCase();
      const visibleNotes = [...notepadNotes]
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .filter((n) => {
          if (!query) return true;
          return (
            (n.title || "").toLowerCase().includes(query) ||
            blocksText(n.blocks).toLowerCase().includes(query)
          );
        });

      body = (
        <>
          <OnboardingTip
            id="notepad-intro"
            text="Notes here are separate from your trade journal — good for quick thoughts, watchlists, or plans that aren't tied to one trade."
            settings={settings}
            persistSettings={persistSettings}
          />
          <Readout
            eyebrow="Notepad"
            value={String(notepadNotes.length)}
            unit={notepadNotes.length === 1 ? "note" : "notes"}
            sub="Notes with word wrap, find & replace, and photos inline in the text."
          />

          <button
            type="button"
            onClick={createNote}
            className={`w-full flex items-center justify-center gap-2 rounded-lg py-3 mb-4 ${TAP}`}
            style={{
              background: palette.gold,
              color: palette.letterbox,
              fontFamily: mono,
              fontSize: "14px",
              fontWeight: 600,
              transition: `${THEME_TRANSITION}, transform 0.15s ease`,
            }}
          >
            <Plus size={16} />
            New Note
          </button>

          {notepadNotes.length > 0 && (
            <div
              className="flex items-center rounded-lg px-3 mb-4"
              style={{ background: palette.field, border: `1px solid ${palette.border}`, transition: THEME_TRANSITION }}
            >
              <Search size={14} style={{ color: palette.textFaint, flexShrink: 0 }} />
              <input
                type="text"
                value={notepadSearch}
                onChange={(e) => setNotepadSearch(e.target.value)}
                placeholder="Search notes"
                className="w-full bg-transparent py-3 px-2 outline-none"
                style={{ color: palette.text, fontSize: "14px" }}
              />
              {notepadSearch && (
                <button
                  type="button"
                  onClick={() => setNotepadSearch("")}
                  className={TAP}
                  style={{ color: palette.textFaint }}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )}

          {notepadNotes.length === 0 ? (
            <div
              className="rounded-2xl p-6 text-center"
              style={{ background: palette.surface, border: `1px dashed ${palette.border}` }}
            >
              <FileText size={22} style={{ color: palette.textFaint, margin: "0 auto 8px" }} />
              <p className="text-xs" style={{ color: palette.textFaint }}>
                No notes yet. Tap New Note to start writing.
              </p>
            </div>
          ) : visibleNotes.length === 0 ? (
            <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
              No notes match "{notepadSearch}".
            </p>
          ) : (
            <div className={isDesktop ? "grid grid-cols-2 gap-3" : "contents"}>
              {visibleNotes.map((n) => {
                const preview = notePreview(n.blocks);
                return (
                  <div
                    key={n.id}
                    onClick={() => openNote(n.id)}
                    className={isDesktop ? `rounded-lg px-5 py-4 mb-3 ${TAP}` : `rounded-lg px-3 py-3 mb-2 ${TAP}`}
                    style={{
                      background: palette.surface,
                      border: `1px solid ${palette.border}`,
                      boxShadow: palette.shadow,
                      cursor: "pointer",
                      transition: THEME_TRANSITION,
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0" style={{ marginRight: "8px" }}>
                        <div
                          className="flex items-center gap-1.5"
                          style={{ color: palette.text, fontSize: "14px", fontWeight: 600, marginBottom: "3px" }}
                        >
                          <span className="truncate">{n.title || "Untitled Note"}</span>
                        </div>
                        {preview && (
                          <div style={{ color: palette.textMuted, fontSize: "12px", marginBottom: "3px" }}>
                            {preview}
                          </div>
                        )}
                        <div style={{ color: palette.textFaint, fontSize: "10px", fontFamily: mono }}>
                          {new Date(n.updatedAt).toLocaleString()}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          requestDeleteNote(n.id);
                        }}
                        className={`flex-shrink-0 ${TAP}`}
                        style={{ color: palette.textFaint }}
                        aria-label={`Delete ${n.title || "Untitled Note"}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      );
    } else {
      const wordWrap = activeNote.wordWrap !== false;
      const fontSize = activeNote.fontSize || DEFAULT_NOTEPAD_FONT_SIZE;
      const blocks = activeNote.blocks;
      const findMatches = notepadFindText ? countOccurrencesInBlocks(blocks, notepadFindText) : 0;
      const bodyText = blocksText(blocks);

      const autoGrowBlock = (el) => {
        if (!el) return;
        el.style.height = "auto";
        el.style.height = `${el.scrollHeight}px`;
      };

      const updateBlockText = (blockId, text) => {
        updateNote(activeNote.id, {
          blocks: blocks.map((b) => (b.id === blockId ? { ...b, text } : b)),
        });
      };

      body = (
        <>
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={closeNote}
              className={`flex items-center gap-1 ${TAP}`}
              style={{ color: palette.textMuted, fontSize: "12px", fontFamily: mono }}
            >
              <ChevronLeft size={16} />
              Notes
            </button>
            <button
              type="button"
              onClick={() => requestDeleteNote(activeNote.id)}
              className={TAP}
              style={{ color: palette.textFaint }}
              aria-label="Delete note"
            >
              <Trash2 size={15} />
            </button>
          </div>

          <input
            type="text"
            value={activeNote.title}
            onChange={(e) => updateNote(activeNote.id, { title: e.target.value })}
            placeholder="Untitled Note"
            className="w-full bg-transparent outline-none mb-3"
            style={{ color: palette.text, fontFamily: mono, fontSize: "1.15rem", fontWeight: 700 }}
          />

          <div className="flex items-center gap-1.5 flex-wrap mb-2">
            <button
              type="button"
              onClick={() => toggleNoteWordWrap(activeNote)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${TAP}`}
              style={{
                background: wordWrap ? palette.gold : palette.field,
                color: wordWrap ? palette.letterbox : palette.textMuted,
                border: `1px solid ${wordWrap ? palette.gold : palette.border}`,
                fontSize: "11px",
                fontFamily: mono,
              }}
              title="Toggle word wrap"
            >
              <WrapText size={13} />
              Wrap
            </button>

            <div
              className="flex items-center rounded-lg overflow-hidden"
              style={{ border: `1px solid ${palette.border}` }}
            >
              <button
                type="button"
                onClick={() => adjustNoteFontSize(activeNote, -1)}
                className={TAP}
                style={{ color: palette.textMuted, padding: "6px 8px", background: palette.field }}
                aria-label="Decrease font size"
              >
                <Minus size={12} />
              </button>
              <span
                style={{
                  color: palette.text,
                  fontFamily: mono,
                  fontSize: "11px",
                  padding: "0 8px",
                  minWidth: "26px",
                  textAlign: "center",
                }}
              >
                {fontSize}
              </span>
              <button
                type="button"
                onClick={() => adjustNoteFontSize(activeNote, 1)}
                className={TAP}
                style={{ color: palette.textMuted, padding: "6px 8px", background: palette.field }}
                aria-label="Increase font size"
              >
                <Plus size={12} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => insertDateTimeIntoNote(activeNote)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${TAP}`}
              style={{ background: palette.field, color: palette.textMuted, border: `1px solid ${palette.border}`, fontSize: "11px", fontFamily: mono }}
              title="Insert date & time"
            >
              <CalendarClock size={13} />
              Date/Time
            </button>

            <button
              type="button"
              onClick={() => {
                setNotepadFindOpen((v) => !v);
                setNotepadMsg("");
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${TAP}`}
              style={{
                background: notepadFindOpen ? palette.gold : palette.field,
                color: notepadFindOpen ? palette.letterbox : palette.textMuted,
                border: `1px solid ${notepadFindOpen ? palette.gold : palette.border}`,
                fontSize: "11px",
                fontFamily: mono,
              }}
              title="Find & replace"
            >
              <Search size={13} />
              Find
            </button>
          </div>

          {notepadFindOpen && (
            <div
              className="rounded-lg p-3 mb-3"
              style={{ background: palette.field, border: `1px solid ${palette.border}` }}
            >
              <input
                type="text"
                value={notepadFindText}
                onChange={(e) => {
                  setNotepadFindText(e.target.value);
                  setNotepadMsg("");
                }}
                placeholder="Find"
                className="w-full rounded-lg px-3 py-2 mb-2 bg-transparent outline-none"
                style={{ background: palette.surface, border: `1px solid ${palette.border}`, color: palette.text, fontSize: "13px" }}
              />
              <input
                type="text"
                value={notepadReplaceText}
                onChange={(e) => setNotepadReplaceText(e.target.value)}
                placeholder="Replace with"
                className="w-full rounded-lg px-3 py-2 mb-2 bg-transparent outline-none"
                style={{ background: palette.surface, border: `1px solid ${palette.border}`, color: palette.text, fontSize: "13px" }}
              />
              <div className="flex items-center justify-between">
                <span style={{ color: palette.textFaint, fontSize: "11px", fontFamily: mono }}>
                  {notepadFindText ? `${findMatches} match${findMatches === 1 ? "" : "es"}` : "\u00a0"}
                </span>
                <button
                  type="button"
                  onClick={() => replaceAllInNote(activeNote)}
                  disabled={!notepadFindText}
                  className={`rounded-lg px-3 py-1.5 ${TAP}`}
                  style={{
                    background: notepadFindText ? palette.gold : palette.border,
                    color: notepadFindText ? palette.letterbox : palette.textFaint,
                    fontFamily: mono,
                    fontSize: "12px",
                    fontWeight: 600,
                    opacity: notepadFindText ? 1 : 0.6,
                  }}
                >
                  Replace All
                </button>
              </div>
            </div>
          )}

          <div
            className={isDesktop ? "w-full rounded-lg px-6 py-6 mb-1" : "w-full rounded-lg px-3 py-3 mb-1"}
            style={{
              background: palette.surface,
              border: `1px solid ${palette.border}`,
              minHeight: isDesktop ? "480px" : "260px",
              transition: THEME_TRANSITION,
            }}
          >
            {blocks.map((block, i) => {
              if (block.type === "image") return null;
              return (
                <textarea
                  key={block.id}
                  ref={getNotepadBlockRef(activeNote.id, block.id)}
                  value={block.text}
                  onChange={(e) => {
                    updateBlockText(block.id, e.target.value);
                    trackNotepadCursor(activeNote.id, block.id)(e);
                    autoGrowBlock(e.target);
                  }}
                  onFocus={trackNotepadCursor(activeNote.id, block.id)}
                  onClick={trackNotepadCursor(activeNote.id, block.id)}
                  onKeyUp={trackNotepadCursor(activeNote.id, block.id)}
                  placeholder={blocks.length === 1 ? "Start typing..." : ""}
                  rows={1}
                  className="w-full bg-transparent outline-none block"
                  style={{
                    border: "none",
                    color: palette.text,
                    fontFamily: mono,
                    fontSize: `${isDesktop ? fontSize + 2 : fontSize}px`,
                    lineHeight: 1.6,
                    resize: "none",
                    overflow: "hidden",
                    whiteSpace: wordWrap ? "pre-wrap" : "pre",
                    overflowWrap: wordWrap ? "break-word" : "normal",
                    overflowX: wordWrap ? "hidden" : "auto",
                    padding: 0,
                    minHeight: blocks.length === 1 ? (isDesktop ? "456px" : "236px") : "24px",
                  }}
                />
              );
            })}
          </div>

          <div className="flex items-center justify-between mb-4">
            <span style={{ color: palette.textFaint, fontSize: "11px", fontFamily: mono }}>
              {countLines(blocks)} ln – {countWords(bodyText)} words – {bodyText.length} chars
            </span>
            <span style={{ color: palette.textFaint, fontSize: "11px", fontFamily: mono }}>
              Saved {new Date(activeNote.updatedAt).toLocaleTimeString()}
            </span>
          </div>

          <button
            type="button"
            onClick={() => downloadNoteText(activeNote)}
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
            Download as .txt
          </button>
          {notepadMsg && (
            <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
              {notepadMsg}
            </p>
          )}
        </>
      );
    }
  }

  if (activeTab === "sessions") {
    const SESSIONS_SUB_TABS = [
      { id: "sessions", label: "Sessions" },
      { id: "news", label: "News" },
    ];

    const sessionsSubNav = (
      <div className="flex gap-2 mb-6">
        {SESSIONS_SUB_TABS.map((s) => {
          const active = sessionsSubTab === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSessionsSubTab(s.id)}
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

    let newsBody = null;
    {
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

      newsBody = (
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
            app rings (sound + notification) {RUNTIME.ALARM_LEAD_MINUTES} minutes before, but only while it's open in your
            browser it can't set a true system alarm, so keep the tab open (or this installed as a
            home-screen app) close to the event.
          </p>

          <div className="flex items-center justify-between mb-1.5">
            <span
              className="uppercase"
              style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
            >
              Economic Calendar — This Week
            </span>
            <button
              type="button"
              onClick={loadEconomicCalendar}
              className={TAP}
              style={{ color: palette.gold, fontSize: "11px", fontFamily: mono }}
            >
              Refresh
            </button>
          </div>

          {econStatus === "loading" && (
            <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
              Loading economic calendar\u2026
            </p>
          )}
          {econStatus === "error" && (
            <p className="text-xs mb-4" style={{ color: palette.red }}>
              {econError}
            </p>
          )}
          {econStatus === "live" && econEvents.length === 0 && (
            <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
              No high-impact USD events found for this month.
            </p>
          )}

          {econEvents.map((ev) => {
            const evDate = new Date(ev.date.replace(" ", "T"));
            const released = ev.actual !== null && ev.actual !== undefined && ev.actual !== "";
            return (
              <div
                key={ev.id}
                className="rounded-lg px-3 py-2.5 mb-2"
                style={{
                  background: palette.surface,
                  border: `1px solid ${palette.border}`,
                  boxShadow: palette.shadow,
                  opacity: released ? 0.7 : 1,
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span style={{ color: palette.text, fontSize: "13px" }}>{ev.name}</span>
                  <span
                    style={{
                      fontSize: "9px",
                      fontFamily: mono,
                      color:
                        ev.impact === "high" ? palette.red : ev.impact === "medium" ? palette.goldBright : palette.textMuted,
                      border: `1px solid ${
                        ev.impact === "high" ? palette.red : ev.impact === "medium" ? palette.goldBright : palette.textMuted
                      }`,
                      borderRadius: "999px",
                      padding: "1px 6px",
                      textTransform: "uppercase",
                      flexShrink: 0,
                      marginLeft: "8px",
                    }}
                  >
                    {ev.impact}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: palette.textFaint, fontSize: "11px" }}>
                    {evDate.toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span style={{ fontFamily: mono, fontSize: "10px", color: palette.textMuted }}>
                    {ev.previous != null && `Prev ${ev.previous}`}
                    {ev.estimate != null && `  Est ${ev.estimate}`}
                    {ev.actual != null && `  Actual ${ev.actual}`}
                  </span>
                </div>
              </div>
            );
          })}

          <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
            Shows this week's upcoming US releases — filtered to CPI, PPI, FOMC, NFP, GDP, and similar
            high-medium impact events. This is separate from the alarm calendar below — add specific events there for
            a countdown/alarm.
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
            {newEventAlarm ? `Ring ${RUNTIME.ALARM_LEAD_MINUTES} min before` : "No alarm for this event"}
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

    let sessionsBody = null;
    {
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

      sessionsBody = (
        <>
          <OnboardingTip
            id="sessions-overlap-intro"
            text="The gold strip under the timeline marks session overlaps — that's usually when volume and volatility are highest."
            settings={settings}
            persistSettings={persistSettings}
          />
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
            className={isDesktop ? "rounded-2xl p-6 mb-2" : "rounded-2xl p-4 mb-2"}
            style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow, transition: THEME_TRANSITION }}
          >
            <div
              className="uppercase mb-3"
              style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: isDesktop ? "13px" : "11px" }}
            >
              Session Timeline (Local Time)
            </div>

            {sessionStates.map((s) => (
              <div key={s.id} className="flex items-center mb-2" style={{ gap: isDesktop ? "12px" : "8px" }}>
                <span
                  style={{ width: isDesktop ? "90px" : "62px", flexShrink: 0, fontSize: isDesktop ? "13px" : "11px", fontFamily: mono, color: palette.textMuted }}
                >
                  {s.label}
                </span>
                <div className="relative flex-1" style={{ height: isDesktop ? "26px" : "16px" }}>
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
            Gold marker is right now. The strip under the bars highlights overlaps – brighter gold marks
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
              London &amp; New York overlap, {formatHourLabel(hlStart)} – {formatHourLabel(hlEnd)} your time
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
            const rangeLabel = `${formatHourLabel(rangeStart)} – ${formatHourLabel(rangeEnd)}`;
            const countdownLabel = formatCountdown(s.hours * 3600000);
            return (
              <div
                key={s.id}
                className={isDesktop ? "flex items-center justify-between rounded-lg px-5 py-4 mb-3" : "flex items-center justify-between rounded-lg px-3 py-3 mb-2"}
                style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow, transition: THEME_TRANSITION }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="rounded-full flex-shrink-0"
                    style={{ width: isDesktop ? "10px" : "8px", height: isDesktop ? "10px" : "8px", background: s.color }}
                  />
                  <div>
                    <div style={{ color: palette.text, fontSize: isDesktop ? "16px" : "14px", marginBottom: "2px" }}>{s.label}</div>
                    <div style={{ color: palette.textMuted, fontSize: isDesktop ? "14px" : "12px" }}>{rangeLabel}</div>
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
            Standard session hours in UTC: Asia 22:00–09:00, London 08:00–17:00,
            New York 13:00–22:00. Shown here converted to your device's local time (
            {tzName || "detected automatically"}), not adjusted for daylight saving.
          </p>

          <button
            type="button"
            onClick={() => setSessionsSubTab("news")}
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

    body = (
      <>
        {sessionsSubNav}
        {sessionsSubTab === "sessions" ? sessionsBody : newsBody}
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
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap');

  * { -webkit-tap-highlight-color: transparent; }
  html, body { -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; overscroll-behavior-y: none; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-thumb { background: ${palette.border}; border-radius: 999px; }
  ::-webkit-scrollbar-track { background: transparent; }
  input, select, textarea, button { font-family: inherit; }
  button { -webkit-appearance: none; }

  @media (prefers-reduced-motion: no-preference) {
    .ticker-glow { animation: pulse 3.2s ease-in-out infinite; }
  }

        @media (prefers-reduced-motion: no-preference) {
  	.flame-flicker {
   	  animation: flameFlicker 1.8s ease-in-out infinite;
   	   transform-origin: 50% 90%;
  	 }
	}
	  @keyframes flameFlicker {
    	  0%   { transform: scale(1) rotate(0deg); opacity: 1; }
  	  20%  { transform: scale(1.08, 0.95) rotate(-2deg); opacity: 0.92; }
  	  40%  { transform: scale(0.96, 1.05) rotate(2deg); opacity: 1; }
  	  60%  { transform: scale(1.05, 0.97) rotate(-1deg); opacity: 0.95; }
  	  80%  { transform: scale(0.98, 1.03) rotate(1deg); opacity: 1; }
  	  100% { transform: scale(1) rotate(0deg); opacity: 1; }
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
        @keyframes sheetUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .sheet-in { animation: sheetUp 0.2s ease-out; }
        input:focus, select:focus, textarea:focus { outline: none; }
        select option { background: ${palette.field}; }
        .journal-row-date-input::-webkit-calendar-picker-indicator { display: none; -webkit-appearance: none; }
        @media print {
          body * { visibility: hidden; }
          #ledger-statement, #ledger-statement * { visibility: visible; }
          .statement-print-wrapper {
            position: static !important;
            overflow: visible !important;
            background: none !important;
            display: block !important;
          }
          #ledger-statement {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          #ledger-statement * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          .statement-no-print { display: none !important; }
        }

      `}</style>
      <div
        className="w-full flex flex-col md:flex-row"
        style={{
          maxWidth: isDesktop ? "1200px" : isTablet ? "760px" : "440px",
          height: "100%",
          background: palette.bg,
          fontFamily: sans,
          overflow: "hidden",
          border: "none",
          boxShadow: "none",
          transition: THEME_TRANSITION,
        }}
      >
        <div className="flex flex-col flex-1" style={{ minWidth: 0, minHeight: 0, overflow: "hidden" }}>

        <header
          className={isDesktop ? "px-8 flex-shrink-0 flex items-center justify-between" : "px-5 pt-6 pb-4 flex-shrink-0 flex items-center justify-between"}
          style={{ height: isDesktop ? "76px" : "auto", borderBottom: isDesktop ? "none" : `1px solid ${palette.border}`, transition: THEME_TRANSITION }}
        >
          <div style={{ marginLeft: isDesktop ? "8px" : 0 }}>
            {isDesktop ? (
              <div className="flex items-center gap-3">
                 <div
                   className="flex items-center justify-center rounded-xl"
                   style={{
                   width: "36px",
                   height: "36px",
                   background: `linear-gradient(135deg, ${palette.gold}, ${palette.goldBright})`,
                   boxShadow: `0 3px 10px ${palette.gold}44`,
                    }}
                   >
                   <ActiveTabIcon size={18} style={{ color: palette.letterbox }} strokeWidth={2.2} />
                 </div>
                <div>
<div style={{ fontFamily: display, fontSize: "17px", fontWeight: 700, color: palette.text, letterSpacing: "0.02em", lineHeight: 1.1 }}>
  LEDGER
</div>
                  <div className="uppercase" style={{ fontFamily: mono, color: palette.textFaint, letterSpacing: "0.09em", fontSize: "10.5px", fontWeight: 600, lineHeight: 1 }}>
                    Trade Math Calculator
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <span
                  className="flex items-center justify-center rounded-xl flex-shrink-0"
                  style={{
                    width: "34px",
                    height: "34px",
                    background: `linear-gradient(135deg, ${palette.gold}, ${palette.goldBright})`,
                    boxShadow: `0 3px 10px ${palette.gold}44`,
                  }}
                >
                  <ActiveTabIcon size={17} style={{ color: palette.letterbox }} strokeWidth={2.2} />
                </span>
                <div>
                  <h1 style={{ fontFamily: display, fontSize: "1.3rem", fontWeight: 700, color: palette.text, letterSpacing: "0.01em", lineHeight: 1.1, transition: THEME_TRANSITION }}>
                    LEDGER
                  </h1>
                  <div className="uppercase" style={{ color: palette.textFaint, letterSpacing: "0.1em", fontSize: "10px", fontWeight: 600, transition: THEME_TRANSITION }}>
                    Trade Math Calculator
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
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

            <button
              type="button"
	      data-tour-id="settings-btn"
              onClick={() => setSettingsOpen(true)}
              aria-label="Open settings"
              className={`flex items-center justify-center rounded-full flex-shrink-0 ${TAP}`}
              style={{
                width: "38px",
                height: "38px",
                background: palette.field,
                border: `1px solid ${palette.border}`,
                color: palette.textMuted,
                boxShadow: palette.shadow,
                transition: `${THEME_TRANSITION}, transform 0.15s ease`,
              }}
            >
              <Settings size={17} />
            </button>
          </div>
        </header>

        <main
          className={isDesktop ? "px-8 py-6" : "px-5 py-5"}
          style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", WebkitOverflowScrolling: "touch" }}
        >
          {body}
        </main>
        </div>


        <nav
          className={isDesktop ? "flex flex-col order-first" : "flex items-stretch"}
          style={{
            flexShrink: 0,
            borderTop: isDesktop ? "none" : `1px solid ${palette.border}`,
            borderRight: isDesktop ? `1px solid ${palette.border}` : "none",
            background: isDesktop
              ? `linear-gradient(180deg, ${palette.surface} 0%, ${palette.bg} 100%)`
              : palette.surface,
            boxShadow: palette.navShadow,
            paddingBottom: isDesktop ? "20px" : "env(safe-area-inset-bottom)",
            paddingTop: isDesktop ? 0 : 0,
            width: isDesktop ? "252px" : "auto",
            height: isDesktop ? "100%" : "auto",
            transition: THEME_TRANSITION,
          }}
        >
          <div className={isDesktop ? "flex flex-col px-4 pt-6 gap-1" : "flex flex-1 items-stretch"}>
          {isDesktop && (
            <div
              className="uppercase mb-2 px-2"
              style={{ color: palette.textFaint, letterSpacing: "0.14em", fontSize: "10px", fontWeight: 700 }}
            >
              Navigate
            </div>
          )}
           {(isDesktop ? navTabs : mobileNavPrimaryTabs).map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <div key={tab.id} className={isDesktop ? "flex relative" : "flex flex-1 items-stretch"}>
                {isDesktop && active && (
                  <span
                    style={{
                      position: "absolute",
                      left: "-16px",
                      top: "8px",
                      bottom: "8px",
                      width: "3px",
                      borderRadius: "0 3px 3px 0",
                      background: `linear-gradient(180deg, ${palette.gold}, ${palette.goldBright})`,
                    }}
                  />
                )}
                <button
                  type="button"
                  data-tour-id={`tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={
                    isDesktop
                      ? `w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl ${TAP}`
                      : `w-full flex flex-col items-center justify-center gap-1 py-3 ${TAP}`
                  }
                  style={{
                    color: active ? palette.goldBright : palette.textMuted,
                    background: active
                      ? isDesktop
                        ? `linear-gradient(135deg, ${palette.gold}22, ${palette.gold}0A)`
                        : `${palette.gold}16`
                      : "transparent",
                    borderRadius: isDesktop ? "10px" : "12px",
                    border: isDesktop ? `1px solid ${active ? `${palette.gold}3A` : "transparent"}` : "none",
                    boxShadow: isDesktop && active ? `0 2px 10px ${palette.gold}22` : "none",
                    transition: `${THEME_TRANSITION}, transform 0.15s ease, background 0.15s ease`,
                  }}
                >
                  <span
                    className="flex items-center justify-center flex-shrink-0"
                    style={{
                      width: isDesktop ? "30px" : "auto",
                      height: isDesktop ? "30px" : "auto",
                      borderRadius: isDesktop ? "9px" : 0,
                      background: isDesktop && active ? `${palette.gold}20` : "transparent",
                    }}
                  >
                    <Icon size={isDesktop ? 17 : 18} strokeWidth={active ? 2.4 : 1.8} />
                  </span>
                  <span style={{ fontSize: isDesktop ? "14px" : "10px", letterSpacing: "0.02em", fontWeight: isDesktop ? 600 : 400 }}>
                    {tab.label}
                  </span>
                </button>
              </div>
            );
          })}

          {!isDesktop && mobileNavOverflowTabs.length > 0 && (
            <div className="flex flex-1 items-stretch">
              <button
                type="button"
                onClick={() => setMoreMenuOpen(true)}
                className={`w-full flex flex-col items-center justify-center gap-1 py-3 ${TAP}`}
                style={{
                  color: activeInMobileOverflow ? palette.goldBright : palette.textMuted,
                  background: activeInMobileOverflow ? `${palette.gold}16` : "transparent",
                  borderRadius: "12px",
                  transition: `${THEME_TRANSITION}, transform 0.15s ease, background 0.15s ease`,
                }}
              >
                <span className="flex items-center justify-center flex-shrink-0">
                  <LayoutGrid size={18} strokeWidth={activeInMobileOverflow ? 2.4 : 1.8} />
                </span>
                <span style={{ fontSize: "10px", letterSpacing: "0.02em", fontWeight: activeInMobileOverflow ? 600 : 400 }}>
                  More
                </span>
              </button>
            </div>
          )}
          </div>

{isDesktop && (() => {
            const pulseTodayKey = dayKeyFromDate(new Date());
            const pulseTodayTrades = trades.filter((t) => dayKeyFromTs(t.ts) === pulseTodayKey);
            const pulseTodayNet = pulseTodayTrades.reduce((s, t) => s + t.pnl, 0);
            const { current: pulseStreak } = computeDisciplineStreak(trades);
            const pulseHasTrades = trades.length > 0;
            const pulseIsProfitable = pulseTodayTrades.length > 0 && pulseTodayNet > 0;
	    const pulseFlameActive = pulseIsProfitable || pulseStreak > 0;
            return (
              <button
                type="button"
                onClick={() => setPulseOpen(true)}
                className={`mx-4 mt-auto rounded-xl px-3 py-3 text-left ${TAP}`}
                style={{
                  background: `linear-gradient(135deg, ${palette.gold}16, ${palette.gold}05)`,
                  border: `1px solid ${palette.gold}2A`,
                  cursor: "pointer",
                }}
              >
                <div
                  className="flex items-center justify-between mb-2"
                  style={{ fontFamily: mono, fontSize: "10px", color: palette.gold, letterSpacing: "0.08em", fontWeight: 700 }}
                >
                  <span className="flex items-center gap-1.5">
                      <Flame
                        size={12}
                        className={pulseFlameActive ? "flame-flicker" : ""}
                        style={{ color: pulseFlameActive ? palette.gold : palette.textFaint }}
                      />
                    TODAY'S PULSE
                  </span>
                  <ChevronRight size={12} style={{ color: palette.gold, opacity: 0.7 }} />
                </div>
                {pulseHasTrades ? (
                  <>
                    <div className="flex items-center justify-between mb-1.5">
                      <span style={{ fontSize: "11px", color: palette.textFaint }}>Net today</span>
                      <span
                        style={{
                          fontFamily: mono,
                          fontSize: "12px",
                          fontWeight: 600,
                          color: pulseTodayTrades.length
                            ? pulseTodayNet >= 0
                              ? palette.green
                              : palette.red
                            : palette.textFaint,
                        }}
                      >
                        {pulseTodayTrades.length ? `${pulseTodayNet >= 0 ? "+" : "-"}$${fmtMoney(pulseTodayNet)}` : "No trades yet"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span style={{ fontSize: "11px", color: palette.textFaint }}>Discipline streak</span>
                      <span
                        style={{
                          fontFamily: mono,
                          fontSize: "12px",
                          fontWeight: 600,
                          color: pulseStreak > 0 ? palette.gold : palette.textFaint,
                        }}
                      >
                        {pulseStreak} day{pulseStreak === 1 ? "" : "s"}
                      </span>
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: "11px", color: palette.textFaint }}>
                    Log your first trade to start tracking your pulse.
                  </div>
                )}
              </button>
            );
          })()}
        </nav>
      </div>

      <canvas ref={shareCanvasRef} style={{ display: "none" }} />

      {moreMenuOpen && (
        <div
          className="fixed inset-0 flex items-end justify-center z-50"
          style={{ background: "rgba(5,7,12,0.75)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
          onClick={() => setMoreMenuOpen(false)}
        >
          <div
            className="w-full sheet-in"
            style={{
              maxWidth: "440px",
              background: palette.surface,
              border: `1px solid ${palette.border}`,
              borderTopLeftRadius: "22px",
              borderTopRightRadius: "22px",
              boxShadow: palette.shadow,
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <span style={{ width: "36px", height: "4px", borderRadius: "999px", background: palette.border }} />
            </div>
            <div className="flex items-center justify-between px-5 pt-2 pb-3">
              <span style={{ fontFamily: display, fontSize: "15px", fontWeight: 700, color: palette.text }}>
                More
              </span>
              <button
                type="button"
                onClick={() => setMoreMenuOpen(false)}
                className={`flex items-center justify-center rounded-full ${TAP}`}
                style={{ width: "30px", height: "30px", color: palette.textFaint, background: palette.field, border: `1px solid ${palette.border}` }}
                aria-label="Close"
              >
                <X size={15} />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2 px-4 pb-6">
              {mobileNavOverflowTabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.id);
                      setMoreMenuOpen(false);
                    }}
                    className={`flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-xl ${TAP}`}
                    style={{
                      background: active ? `${palette.gold}16` : palette.field,
                      border: `1px solid ${active ? palette.gold : palette.border}`,
                      color: active ? palette.goldBright : palette.textMuted,
                    }}
                  >
                    <Icon size={19} strokeWidth={active ? 2.4 : 1.8} />
                    <span style={{ fontSize: "10.5px", fontWeight: active ? 600 : 400 }}>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

{settingsOpen && (
  <div
    className="fixed inset-0 flex items-center justify-center z-50 p-4"
    style={{ background: "rgba(5,7,12,0.85)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
    onClick={() => setSettingsOpen(false)}
  >
    <div
      className="w-full modal-in rounded-2xl overflow-y-auto"
      style={{
        maxWidth: isDesktop ? "600px" : "440px",
        maxHeight: "85vh",
        background: palette.surface,
        border: `1px solid ${palette.border}`,
        boxShadow: palette.shadow,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{
          borderBottom: `1px solid ${palette.border}`,
          position: "sticky",
          top: 0,
          background: palette.surface,
          zIndex: 2,
        }}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="flex items-center justify-center rounded-xl flex-shrink-0"
            style={{
              width: "34px",
              height: "34px",
              background: `linear-gradient(135deg, ${palette.gold}, ${palette.goldBright})`,
              boxShadow: `0 3px 10px ${palette.gold}44`,
            }}
          >
            <Settings size={16} style={{ color: palette.letterbox }} strokeWidth={2.3} />
          </span>
          <div>
<div style={{ fontFamily: display, fontSize: "15px", fontWeight: 700, color: palette.text, lineHeight: 1.15 }}>
  Settings
</div>
            <div
              className="uppercase"
              style={{ fontFamily: mono, fontSize: "10px", color: palette.textFaint, letterSpacing: "0.09em" }}
            >
              Customize Ledger
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setSettingsOpen(false)}
          className={`flex items-center justify-center rounded-full ${TAP}`}
          style={{ width: "32px", height: "32px", color: palette.textFaint, background: palette.field, border: `1px solid ${palette.border}` }}
          aria-label="Close settings"
        >
          <X size={16} />
        </button>
      </div>

      <div className="p-5">
        {/* ACCOUNTS */}
        <SettingsSection icon={Building2} title="Accounts" defaultOpen>
          <SettingsSubLabel>Active Account</SettingsSubLabel>

          {!accountsLoaded ? (
            <p className="text-xs mb-2" style={{ color: palette.textFaint }}>Loading accounts\u2026</p>
          ) : (
            accounts.map((acc) => {
              const isActive = acc.id === activeAccountId;
              const isEditing = editingAccountId === acc.id;
              return (
                <div
                  key={acc.id}
                  className="rounded-lg mb-2 px-3 py-2.5"
                  style={{
                    background: isActive ? `${palette.gold}14` : palette.surface,
                    border: `1px solid ${isActive ? palette.gold : palette.border}`,
                  }}
                >
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editAccountName}
                        onChange={(e) => setEditAccountName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { e.preventDefault(); confirmRenameAccount(); }
                          else if (e.key === "Escape") setEditingAccountId(null);
                        }}
                        autoFocus
                        maxLength={40}
                        className="flex-1 rounded-lg px-2.5 py-1.5 bg-transparent outline-none"
                        style={{ background: palette.field, border: `1px solid ${palette.border}`, color: palette.text, fontFamily: mono, fontSize: "11.5px" }}
                      />
                      <button
                        type="button"
                        onClick={confirmRenameAccount}
                        className={`flex items-center justify-center rounded-lg flex-shrink-0 ${TAP}`}
                        style={{ width: "26px", height: "26px", background: palette.gold, color: palette.letterbox }}
                        aria-label="Save name"
                      >
                        <Check size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingAccountId(null)}
                        className={`flex items-center justify-center rounded-lg flex-shrink-0 ${TAP}`}
                        style={{ width: "26px", height: "26px", background: "transparent", border: `1px solid ${palette.border}`, color: palette.textFaint }}
                        aria-label="Cancel"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          switchAccount(acc.id);
                          setSettingsOpen(false);
                        }}
                        className="flex items-center gap-2 flex-1 text-left"
                        style={{ minWidth: 0 }}
                      >
                        <span
                          className="flex items-center justify-center rounded-full flex-shrink-0"
                          style={{
                            width: "14px",
                            height: "14px",
                            border: `1.5px solid ${isActive ? palette.gold : palette.textFaint}`,
                            background: isActive ? palette.gold : "transparent",
                          }}
                        >
                          {isActive && <Check size={8} strokeWidth={3} style={{ color: palette.letterbox }} />}
                        </span>
                        <span className="truncate" style={{ color: palette.text, fontSize: "12px", fontWeight: isActive ? 600 : 400 }}>
                          {acc.name}
                        </span>
                      </button>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => { setEditingAccountId(acc.id); setEditAccountName(acc.name); }}
                          className={TAP}
                          style={{ color: palette.textFaint, padding: "4px" }}
                          aria-label={`Rename ${acc.name}`}
                        >
                          <Pencil size={11} />
                        </button>
                        {accounts.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setPendingAccountDelete(acc.id)}
                            className={TAP}
                            style={{ color: palette.textFaint, padding: "4px" }}
                            aria-label={`Delete ${acc.name}`}
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {addingAccount ? (
            <div className="flex items-center gap-2 mt-1">
              <input
                type="text"
                value={newAccountName}
                onChange={(e) => { setNewAccountName(e.target.value); if (accountNameError) setAccountNameError(""); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); confirmAddAccount(); }
                  else if (e.key === "Escape") { setAddingAccount(false); setNewAccountName(""); }
                }}
                placeholder="e.g. FundingPips 2-Step $50K"
                autoFocus
                maxLength={40}
                className="flex-1 rounded-lg px-3 py-2 bg-transparent outline-none"
                style={{ background: palette.surface, border: `1px solid ${palette.border}`, color: palette.text, fontFamily: mono, fontSize: "11.5px" }}
              />
              <button
                type="button"
                onClick={confirmAddAccount}
                className={`rounded-lg px-3 py-2 flex-shrink-0 ${TAP}`}
                style={{ background: palette.gold, color: palette.letterbox, fontFamily: mono, fontSize: "11.5px", fontWeight: 600 }}
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => { setAddingAccount(false); setNewAccountName(""); setAccountNameError(""); }}
                className={`flex items-center justify-center rounded-lg flex-shrink-0 ${TAP}`}
                style={{ width: "34px", height: "34px", background: "transparent", border: `1px solid ${palette.border}`, color: palette.textFaint }}
                aria-label="Cancel"
              >
                <X size={13} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => { setAddingAccount(true); setNewAccountName(""); setAccountNameError(""); }}
              className={`w-full flex items-center justify-center gap-2 rounded-lg py-2.5 mt-1 ${TAP}`}
              style={{
                background: "transparent",
                border: `1px dashed ${palette.gold}88`,
                color: palette.gold,
                fontFamily: mono,
                fontSize: "11.5px",
                fontWeight: 600,
              }}
            >
              <Plus size={12} />
              Add Account
            </button>
          )}
          {accountNameError && (
            <p className="text-xs mt-2" style={{ color: palette.red }}>{accountNameError}</p>
          )}

          <p className="text-xs mt-3" style={{ color: palette.textFaint }}>
            Each account keeps its own starting balance, Challenge calculator inputs, trades, journal entries,
            and Playbook check-ins. Setup/mood tags, notes, news events, and goals stay shared across every
            account. Switching here changes which one is active.
          </p>
        </SettingsSection>

        {/* APPEARANCE */}
        <SettingsSection icon={Palette} title="Appearance" defaultOpen>
          <SettingsSubLabel>Theme</SettingsSubLabel>
          <div className="flex gap-2 mb-1 flex-wrap">
            {[
              { id: "dark", label: "Dark" },
              { id: "light", label: "Light" },
              { id: "amber", label: "Amber" },
              { id: "forest", label: "Forest" },
              { id: "auto", label: "Auto" },
            ].map((opt) => {
              const active = settings.themeMode === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setThemeMode(opt.id)}
                  className={`px-3 py-2 rounded-lg transition-colors ${TAP}`}
                  style={{
                    background: active ? palette.gold : palette.surface,
                    color: active ? palette.letterbox : palette.textMuted,
                    border: `1px solid ${active ? palette.gold : palette.border}`,
                    fontFamily: mono,
                    fontSize: "12.5px",
                    fontWeight: 600,
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </SettingsSection>

        {/* NAVIGATION */}
        <SettingsSection icon={LayoutGrid} title="Navigation">
          <SettingsSubLabel>Default Landing Tab</SettingsSubLabel>
          <div className="flex gap-2 flex-wrap mb-1">
            {navTabs.map((t) => {
              const active = settings.defaultLandingTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => persistSettings({ ...settings, defaultLandingTab: t.id })}
                  className={`px-3 py-1.5 rounded-full transition-colors ${TAP}`}
                  style={{
                    background: active ? palette.gold : palette.surface,
                    color: active ? palette.letterbox : palette.textMuted,
                    border: `1px solid ${active ? palette.gold : palette.border}`,
                    fontFamily: mono,
                    fontSize: "12.5px",
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
            Opens automatically the next time you launch Ledger.
          </p>

          <SettingsSubLabel>Visible Tabs</SettingsSubLabel>
          <div className="flex gap-2 flex-wrap mb-1">
            {TABS.map((t) => {
              const hidden = (settings.hiddenTabs || []).includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleHiddenTab(t.id)}
                  className={`px-3 py-1.5 rounded-full transition-colors ${TAP}`}
                  style={{
                    background: hidden ? palette.surface : palette.gold,
                    color: hidden ? palette.textFaint : palette.letterbox,
                    border: `1px solid ${hidden ? palette.border : palette.gold}`,
                    fontFamily: mono,
                    fontSize: "12.5px",
                    textDecoration: hidden ? "line-through" : "none",
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
            Tap to hide a tab from your navigation. At least one must stay visible.
          </p>

          <SettingsSubLabel>Mobile Bottom Bar</SettingsSubLabel>
          <div className="flex gap-2 flex-wrap mb-1">
            {navTabs.map((t) => {
              const pinnedList = settings.mobileNavPinnedTabs || [];
              const isPinned = pinnedList.includes(t.id);
              const pinnedIndex = pinnedList.indexOf(t.id);
              const atLimit = pinnedList.length >= MOBILE_NAV_PRIMARY_COUNT;
              const disabled = !isPinned && atLimit;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => togglePinnedMobileTab(t.id)}
                  disabled={disabled}
                  className={`px-3 py-1.5 rounded-full transition-colors ${disabled ? "" : TAP}`}
                  style={{
                    background: isPinned ? palette.gold : palette.surface,
                    color: isPinned ? palette.letterbox : disabled ? palette.textFaint : palette.textMuted,
                    border: `1px solid ${isPinned ? palette.gold : palette.border}`,
                    fontFamily: mono,
                    fontSize: "12.5px",
                    opacity: disabled ? 0.5 : 1,
                  }}
                >
                  {isPinned ? `${pinnedIndex + 1}. ` : ""}
                  {t.label}
                </button>
              );
            })}
          </div>
          {(settings.mobileNavPinnedTabs || []).length > 0 && (
            <button
              type="button"
              onClick={() => persistSettings({ ...settings, mobileNavPinnedTabs: [] })}
              className={`mb-2 block ${TAP}`}
              style={{ color: palette.textFaint, fontSize: "11px", fontFamily: mono, textDecoration: "underline" }}
            >
              Reset to default
            </button>
          )}
          <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
            Pick up to {MOBILE_NAV_PRIMARY_COUNT} tabs to pin in the mobile bottom bar (numbered in tap order) —
            everything else lands in "More." Leave empty to use the first {MOBILE_NAV_PRIMARY_COUNT} tabs
            automatically.
          </p>

          <SettingsSubLabel>Default Insights Tab</SettingsSubLabel>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "overview", label: "Overview" },
              { id: "behavior", label: "Behavior" },
              { id: "journal", label: "Journal" },
            ].map((opt) => {
              const active = (settings.defaultInsightsTab || "overview") === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => persistSettings({ ...settings, defaultInsightsTab: opt.id })}
                  className={`px-1 py-2 rounded-lg transition-colors ${TAP}`}
                  style={{
                    background: active ? palette.gold : palette.surface,
                    color: active ? palette.letterbox : palette.textMuted,
                    border: `1px solid ${active ? palette.gold : palette.border}`,
                    fontFamily: mono,
                    fontSize: "12px",
                    fontWeight: 600,
                    minWidth: 0,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </SettingsSection>

        {/* TRADING DEFAULTS */}
        <SettingsSection icon={Scale} title="Trading Defaults">
          <SettingsSubLabel>Default Account Balance</SettingsSubLabel>
          <div
            className="flex items-center rounded-lg px-3 mb-1"
            style={{ background: palette.surface, border: `1px solid ${palette.border}` }}
          >
            <span className="text-sm pr-1" style={{ color: palette.textFaint }}>$</span>
            <input
              ref={defaultBalanceInputRef}
              type="text"
              inputMode="decimal"
              defaultValue={settings.defaultAccountBalance}
              onChange={scheduleDefaultBalanceApply}
              onBlur={() => {
                if (defaultBalanceDebounceRef.current) clearTimeout(defaultBalanceDebounceRef.current);
                const el = defaultBalanceInputRef.current;
                if (el) applyDefaultAccountBalance(el.value);
              }}
              placeholder="10000"
              className="w-full bg-transparent py-2.5 outline-none"
              style={{ color: palette.text, fontFamily: mono, fontSize: "14px" }}
            />
          </div>
          <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
            Pre-fills the balance field on the Challenge, Edge, and Size calculators when empty.
          </p>

          <SettingsSubLabel>Statement Period</SettingsSubLabel>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "month", label: "Monthly" },
              { id: "quarter", label: "Quarterly" },
              { id: "year", label: "Annual" },
            ].map((opt) => {
              const active = (settings.statementPeriodType || "month") === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => persistSettings({ ...settings, statementPeriodType: opt.id })}
                  className={`px-1 py-2 rounded-lg transition-colors ${TAP}`}
                  style={{ minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                  style={{
                    background: active ? palette.gold : palette.surface,
                    color: active ? palette.letterbox : palette.textMuted,
                    border: `1px solid ${active ? palette.gold : palette.border}`,
                    fontFamily: mono,
                    fontSize: "12.5px",
                    fontWeight: 600,
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <SettingsSubLabel>Size Tab Risk Input</SettingsSubLabel>
          <div className="flex gap-2">
            {[
              { id: "percent", label: "Percent (%)" },
              { id: "dollar", label: "Dollar ($)" },
            ].map((opt) => {
              const active = (settings.sizeRiskInputMode || "percent") === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => persistSettings({ ...settings, sizeRiskInputMode: opt.id })}
                  className={`flex-1 px-3 py-2 rounded-lg transition-colors ${TAP}`}
                  style={{
                    background: active ? palette.gold : palette.surface,
                    color: active ? palette.letterbox : palette.textMuted,
                    border: `1px solid ${active ? palette.gold : palette.border}`,
                    fontFamily: mono,
                    fontSize: "12.5px",
                    fontWeight: 600,
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs mt-1" style={{ color: palette.textFaint }}>
            Choose whether the Size tab's "Risk per Trade" field takes a percentage of your balance or a fixed dollar amount.
          </p>
        </SettingsSection>

        {/* RISK & DISCIPLINE */}
        <SettingsSection icon={ShieldAlert} title="Risk & Discipline">
          <SettingsSubLabel>Revenge Trade Cooldown</SettingsSubLabel>
          <button
            type="button"
            onClick={() => persistSettings({ ...settings, revengeLockEnabled: !settings.revengeLockEnabled })}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-1 transition-colors ${TAP}`}
            style={{
              background: settings.revengeLockEnabled ? palette.gold : palette.surface,
              color: settings.revengeLockEnabled ? palette.letterbox : palette.textMuted,
              border: `1px solid ${settings.revengeLockEnabled ? palette.gold : palette.border}`,
              fontFamily: mono,
              fontSize: "12.5px",
            }}
          >
            <Bell size={14} />
            {settings.revengeLockEnabled ? "Cooldown warning is on" : "Cooldown warning is off"}
          </button>
          <p className="text-xs mb-3" style={{ color: palette.textFaint }}>
            Logging a trade within the revenge window after a loss shows a warning first.
          </p>

          <SettingsSubLabel>Revenge Window (minutes)</SettingsSubLabel>
          <PillGroup
            options={[5, 10, 15, 20, 30]}
            suffix="m"
            value={settings.revengeWindowMinutes}
            onChange={(v) => persistSettings({ ...settings, revengeWindowMinutes: v })}
          />
          <p className="text-xs -mt-2 mb-3" style={{ color: palette.textFaint }}>
            Currently {RUNTIME.REVENGE_WINDOW_MINUTES} minutes — drives the "revenge" tag, the discipline streak, and the cooldown warning.
          </p>

          <button
            type="button"
            onClick={() => persistSettings({ ...settings, showRevengeTag: settings.showRevengeTag === false ? true : false })}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-3 transition-colors ${TAP}`}
            style={{
              background: settings.showRevengeTag !== false ? palette.gold : palette.surface,
              color: settings.showRevengeTag !== false ? palette.letterbox : palette.textMuted,
              border: `1px solid ${settings.showRevengeTag !== false ? palette.gold : palette.border}`,
              fontFamily: mono,
              fontSize: "12.5px",
            }}
          >
            <Flame size={14} />
            {settings.showRevengeTag !== false ? "Revenge tag is shown on trades" : "Revenge tag is hidden"}
          </button>

          <SettingsSubLabel>Daily Loss Limit</SettingsSubLabel>
          <div
            className="flex items-center rounded-lg px-3 mb-1"
            style={{ background: palette.surface, border: `1px solid ${palette.border}` }}
          >
            <span className="text-sm pr-1" style={{ color: palette.textFaint }}>$</span>
            <input
              type="text"
              inputMode="decimal"
              value={settings.dailyLossLimit}
              onChange={(e) => persistSettings({ ...settings, dailyLossLimit: e.target.value })}
              placeholder="200"
              className="w-full bg-transparent py-2.5 outline-none"
              style={{ color: palette.text, fontFamily: mono, fontSize: "14px" }}
            />
          </div>
          <p className="text-xs mb-3" style={{ color: palette.textFaint }}>
            A personal step-away line, separate from any prop-firm rule. Leave blank to disable.
          </p>

          <SettingsSubLabel>Max Trades per Day</SettingsSubLabel>
          <input
            type="text"
            inputMode="numeric"
            value={settings.maxTradesPerDay}
            onChange={(e) => persistSettings({ ...settings, maxTradesPerDay: e.target.value })}
            placeholder="5"
            className="w-full rounded-lg px-3 py-2.5 bg-transparent outline-none"
            style={{ background: palette.surface, border: `1px solid ${palette.border}`, color: palette.text, fontFamily: mono, fontSize: "14px" }}
          />
          <p className="text-xs mt-1" style={{ color: palette.textFaint }}>
            Shows a nudge on the Curve tab once you hit this count. Leave blank to disable.
          </p>
        </SettingsSection>

        {/* TAGS */}
        <SettingsSection icon={Tags} title="Custom Tags">
          <SettingsSubLabel>Setup Tags</SettingsSubLabel>
          <div className="flex gap-2 flex-wrap mb-1 items-center">
            {SETUPS.filter((s) => !hiddenDefaultSetupIds.includes(s.id)).map((s) => (
              <span key={s.id} className="relative inline-flex">
                <span
                  className="px-3 py-1.5 rounded-full inline-block"
                  style={{ background: palette.surface, color: palette.textMuted, border: `1px solid ${palette.border}`, fontSize: "12.5px" }}
                >
                  {s.label}
                </span>
                <button
                  type="button"
                  onClick={() => removeDefaultSetup(s.id)}
                  className={`absolute flex items-center justify-center rounded-full ${TAP}`}
                  style={{ top: "-5px", right: "-5px", width: "15px", height: "15px", background: palette.red, color: "#FFFFFF" }}
                  aria-label={`Remove ${s.label} setup`}
                >
                  <X size={9} />
                </button>
              </span>
            ))}
            {customSetupsLoaded &&
              customSetups.map((s) => (
                <span key={s.id} className="relative inline-flex">
                  <span
                    className="px-3 py-1.5 rounded-full inline-block"
                    style={{ background: palette.surface, color: palette.textMuted, border: `1px dashed ${palette.border}`, fontSize: "12.5px" }}
                  >
                    {s.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeCustomSetup(s.id)}
                    className={`absolute flex items-center justify-center rounded-full ${TAP}`}
                    style={{ top: "-5px", right: "-5px", width: "15px", height: "15px", background: palette.red, color: "#FFFFFF" }}
                    aria-label={`Remove ${s.label} setup`}
                  >
                    <X size={9} />
                  </button>
                </span>
              ))}
            {customSetupsLoaded && customSetups.length < MAX_CUSTOM_SETUPS && !addingSetup && (
              <button
                type="button"
                onClick={openAddSetup}
                className={`flex items-center justify-center rounded-full flex-shrink-0 ${TAP}`}
                style={{ width: "28px", height: "28px", background: "transparent", border: `1px dashed ${palette.border}`, color: palette.textFaint }}
                aria-label="Add custom setup"
                title="Add your own setup tag"
              >
                <Plus size={13} />
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
                style={{ background: palette.surface, border: `1px solid ${palette.border}`, color: palette.text, fontFamily: mono, fontSize: "12.5px" }}
              />
              <button
                type="button"
                onClick={confirmAddSetup}
                className={`rounded-lg px-3 py-2 flex-shrink-0 ${TAP}`}
                style={{ background: palette.gold, color: palette.letterbox, fontFamily: mono, fontSize: "12.5px", fontWeight: 600 }}
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
            <p className="text-xs mb-2" style={{ color: palette.red }}>{setupError}</p>
          )}
          {hiddenDefaultSetupsLoaded && hiddenDefaultSetupIds.length > 0 && (
            <button
              type="button"
              onClick={restoreDefaultSetups}
              className={`mb-2 block ${TAP}`}
              style={{ color: palette.textFaint, fontSize: "11px", fontFamily: mono, textDecoration: "underline" }}
            >
              Restore default setups
            </button>
          )}
          <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
            Up to {MAX_CUSTOM_SETUPS}. Shows up on the Curve tab's trade log and the Journal tab's Setup field.
          </p>

          <SettingsSubLabel>Mood Tags</SettingsSubLabel>
          <div className="flex gap-2 flex-wrap mb-1 items-center">
            {customMoodsLoaded &&
              customMoods.map((m) => (
                <span key={m.id} className="relative inline-flex">
                  <span
                    className="px-3 py-1.5 rounded-full inline-flex items-center gap-1.5"
                    style={{ background: palette.surface, color: palette.textMuted, border: `1px dashed ${palette.border}`, fontSize: "12.5px" }}
                  >
                    <span>{m.emoji}</span>
                    {m.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeCustomMood(m.id)}
                    className={`absolute flex items-center justify-center rounded-full ${TAP}`}
                    style={{ top: "-5px", right: "-5px", width: "15px", height: "15px", background: palette.red, color: "#FFFFFF" }}
                    aria-label={`Remove ${m.label} mood`}
                  >
                    <X size={9} />
                  </button>
                </span>
              ))}
            {customMoodsLoaded && customMoods.length < MAX_CUSTOM_MOODS && !addingMood && (
              <button
                type="button"
                onClick={openAddMood}
                className={`flex items-center justify-center rounded-full flex-shrink-0 ${TAP}`}
                style={{ width: "28px", height: "28px", background: "transparent", border: `1px dashed ${palette.border}`, color: palette.textFaint }}
                aria-label="Add custom mood"
                title="Add your own mood tag"
              >
                <Plus size={13} />
              </button>
            )}
          </div>
          {addingMood && (
            <div className="flex items-center gap-2 mb-1">
              <input
                type="text"
                value={newMoodEmoji}
                onChange={(e) => setNewMoodEmoji(e.target.value.slice(0, 2))}
                className="rounded-lg px-2 py-2 bg-transparent outline-none text-center"
                style={{ width: "44px", background: palette.surface, border: `1px solid ${palette.border}`, color: palette.text, fontSize: "16px" }}
              />
              <input
                type="text"
                value={newMoodName}
                onChange={(e) => {
                  setNewMoodName(e.target.value);
                  if (moodError) setMoodError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    confirmAddMood();
                  } else if (e.key === "Escape") {
                    cancelAddMood();
                  }
                }}
                placeholder="New mood name"
                autoFocus
                maxLength={16}
                className="flex-1 rounded-lg px-3 py-2 bg-transparent outline-none"
                style={{ background: palette.surface, border: `1px solid ${palette.border}`, color: palette.text, fontFamily: mono, fontSize: "12.5px" }}
              />
              <button
                type="button"
                onClick={confirmAddMood}
                className={`rounded-lg px-3 py-2 flex-shrink-0 ${TAP}`}
                style={{ background: palette.gold, color: palette.letterbox, fontFamily: mono, fontSize: "12.5px", fontWeight: 600 }}
              >
                Add
              </button>
              <button
                type="button"
                onClick={cancelAddMood}
                className={`flex items-center justify-center rounded-lg flex-shrink-0 ${TAP}`}
                style={{ width: "34px", height: "34px", background: "transparent", border: `1px solid ${palette.border}`, color: palette.textFaint }}
                aria-label="Cancel adding mood"
              >
                <X size={14} />
              </button>
            </div>
          )}
          {moodError && (
            <p className="text-xs mb-2" style={{ color: palette.red }}>{moodError}</p>
          )}
          <p className="text-xs" style={{ color: palette.textFaint }}>
            Up to {MAX_CUSTOM_MOODS}. Shows up on the Curve tab's trade log and the Journal tab's Mood field.
          </p>
        </SettingsSection>

        {/* NOTIFICATIONS */}
        <SettingsSection icon={Bell} title="Notifications">
          <SettingsSubLabel>News Alarm Lead Time</SettingsSubLabel>
          <PillGroup
            options={[5, 10, 15, 20, 30]}
            suffix="m"
            value={settings.alarmLeadMinutes}
            onChange={(v) => persistSettings({ ...settings, alarmLeadMinutes: v })}
          />
          <p className="text-xs -mt-2" style={{ color: palette.textFaint }}>
            Currently rings {RUNTIME.ALARM_LEAD_MINUTES} minutes before a flagged event on the Sessions tab.
          </p>
        </SettingsSection>

        {/* SHARING & REPORTS */}
        <SettingsSection icon={Share2} title="Sharing & Reports">
          <SettingsSubLabel>Weekly Share Card</SettingsSubLabel>
          <button
            type="button"
            onClick={() => persistSettings({ ...settings, hideDollarInShare: !settings.hideDollarInShare })}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-1 transition-colors ${TAP}`}
            style={{
              background: settings.hideDollarInShare ? palette.gold : palette.surface,
              color: settings.hideDollarInShare ? palette.letterbox : palette.textMuted,
              border: `1px solid ${settings.hideDollarInShare ? palette.gold : palette.border}`,
              fontFamily: mono,
              fontSize: "12.5px",
            }}
          >
            <Share2 size={14} />
            {settings.hideDollarInShare ? "Dollar amounts hidden" : "Dollar amounts shown"}
          </button>
          <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
            Controls whether "Share My Week" and "Copy Summary" include your net P&amp;L in dollars.
          </p>

          <SettingsSubLabel>Trader Alias</SettingsSubLabel>
          <input
            type="text"
            value={settings.traderAlias}
            onChange={(e) => persistSettings({ ...settings, traderAlias: e.target.value })}
            placeholder="e.g. J. Rahman"
            maxLength={40}
            className="w-full rounded-lg px-3 py-2.5 bg-transparent outline-none"
            style={{ background: palette.surface, border: `1px solid ${palette.border}`, color: palette.text, fontFamily: mono, fontSize: "14px" }}
          />
          <p className="text-xs mt-1" style={{ color: palette.textFaint }}>
            Shown on printed Statements and the Weekly Share Card. Leave blank to omit.
          </p>
        </SettingsSection>

        {/* JOURNAL & DATA */}
        <SettingsSection icon={Table2} title="Journal & Data">
          <SettingsSubLabel>Insights Heatmap Range</SettingsSubLabel>
          <PillGroup
            options={[13, 26, 52]}
            suffix="w"
            value={settings.heatmapWeeksBack}
            onChange={(v) => persistSettings({ ...settings, heatmapWeeksBack: v })}
          />
          <p className="text-xs -mt-2 mb-4" style={{ color: palette.textFaint }}>
            Weeks of history the Performance Heatmap on the Insights tab shows.
          </p>

          <SettingsSubLabel>Journal Table Layout</SettingsSubLabel>
          <div className="flex gap-2 mb-1">
            {[
              { id: "auto", label: "Auto" },
              { id: "cards", label: "Cards" },
              { id: "table", label: "Table" },
            ].map((opt) => {
              const active = (settings.journalTableLayout || "auto") === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => persistSettings({ ...settings, journalTableLayout: opt.id })}
                  className={`flex-1 px-3 py-2 rounded-lg transition-colors ${TAP}`}
                  style={{
                    background: active ? palette.gold : palette.surface,
                    color: active ? palette.letterbox : palette.textMuted,
                    border: `1px solid ${active ? palette.gold : palette.border}`,
                    fontFamily: mono,
                    fontSize: "12.5px",
                    fontWeight: 600,
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
            Auto uses Cards on narrow screens, Table on wider ones.
          </p>

          <button
            type="button"
            onClick={() => persistSettings({ ...settings, autoSyncTradesToJournal: !settings.autoSyncTradesToJournal })}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-1 transition-colors ${TAP}`}
            style={{
              background: settings.autoSyncTradesToJournal ? palette.gold : palette.surface,
              color: settings.autoSyncTradesToJournal ? palette.letterbox : palette.textMuted,
              border: `1px solid ${settings.autoSyncTradesToJournal ? palette.gold : palette.border}`,
              fontFamily: mono,
              fontSize: "12.5px",
            }}
          >
            <ArrowLeftRight size={14} />
            {settings.autoSyncTradesToJournal ? "Auto-sync is on" : "Auto-sync is off"}
          </button>
          <p className="text-xs" style={{ color: palette.textFaint }}>
            Mirrors every logged trade into a matching Journal row. One-way — editing a Journal row never
            changes the trade.
          </p>
        </SettingsSection>

        {/* HELP */}
        <SettingsSection icon={Lightbulb} title="Help & Tips">
          <button
            type="button"
            onClick={() => persistSettings({ ...settings, showOnboardingTips: !settings.showOnboardingTips })}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-2 transition-colors ${TAP}`}
            style={{
              background: settings.showOnboardingTips ? palette.gold : palette.surface,
              color: settings.showOnboardingTips ? palette.letterbox : palette.textMuted,
              border: `1px solid ${settings.showOnboardingTips ? palette.gold : palette.border}`,
              fontFamily: mono,
              fontSize: "12.5px",
            }}
          >
            <Lightbulb size={14} />
            {settings.showOnboardingTips ? "Tips are showing" : "Tips are hidden"}
          </button>
          <p className="text-xs mb-3" style={{ color: palette.textFaint }}>
            Dismissible callouts pointing out tagging, the Playbook, and other features. Dismissing one hides
            only that tip.
          </p>
          <button
            type="button"
            onClick={() => {
              setSettingsOpen(false);
              startTour();
            }}
            className={`w-full flex items-center justify-center gap-2 rounded-lg py-2.5 ${TAP}`}
            style={{
              background: palette.surface,
              border: `1px solid ${palette.border}`,
              color: palette.text,
              fontFamily: mono,
              fontSize: "12.5px",
              fontWeight: 600,
            }}
          >
            <ChevronRight size={14} />
            Restart App Tour
          </button>
        </SettingsSection>

                {/* FULL BACKUP */}
        <SettingsSection icon={Download} title="Full Backup (Everything)">
          <p className="text-xs mb-3" style={{ color: palette.textFaint }}>
            Exports absolutely everything — trades, journal, playbook, notes, settings, goals, and calculator
            inputs — in one file. This is separate from the Curve tab's "Backup &amp; Restore," which only
            covers the core data.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={exportAllData}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 ${TAP}`}
              style={{
                background: palette.surface,
                border: `1px solid ${palette.border}`,
                color: palette.text,
                fontFamily: mono,
                fontSize: "12.5px",
                fontWeight: 600,
              }}
            >
              <Download size={14} />
              Export All
            </button>
            <button
              type="button"
              onClick={() => masterImportInputRef.current && masterImportInputRef.current.click()}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 ${TAP}`}
              style={{
                background: palette.surface,
                border: `1px solid ${palette.border}`,
                color: palette.text,
                fontFamily: mono,
                fontSize: "12.5px",
                fontWeight: 600,
              }}
            >
              <Upload size={14} />
              Import All
            </button>
            <input
              ref={masterImportInputRef}
              type="file"
              accept="application/json,.json"
              onChange={importAllDataFile}
              style={{ display: "none" }}
            />
          </div>
          {masterExportMsg && (
            <p className="text-xs mt-2" style={{ color: palette.textFaint }}>
              {masterExportMsg}
            </p>
          )}
          {pendingMasterImport && (
            <div
              className="rounded-lg p-3 mt-3"
              style={{ background: palette.surface, border: `1px solid ${palette.gold}` }}
            >
              <p className="text-xs mb-3" style={{ color: palette.text }}>
                This will replace ALL data on this device — trades, journal, playbook, notes, settings, goals,
                and calculator inputs — with this backup ({pendingMasterImport.trades.length} trade
                {pendingMasterImport.trades.length === 1 ? "" : "s"}). This can't be undone.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={confirmMasterImport}
                  className={`flex-1 rounded-lg py-2 ${TAP}`}
                  style={{ background: palette.gold, color: palette.letterbox, fontFamily: mono, fontSize: "13px" }}
                >
                  Replace Everything
                </button>
                <button
                  type="button"
                  onClick={cancelMasterImport}
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
        </SettingsSection>

        {/* DANGER ZONE */}
        <SettingsSection icon={AlertTriangle} title="Danger Zone" danger>
          {!pendingSettingsReset ? (
            <button
              type="button"
              onClick={() => setPendingSettingsReset(true)}
              className={`w-full flex items-center justify-center gap-2 rounded-lg py-2.5 ${TAP}`}
              style={{ background: "transparent", border: `1px solid ${palette.red}`, color: palette.red, fontFamily: mono, fontSize: "12.5px", fontWeight: 600 }}
            >
              <RotateCcw size={14} />
              Reset Settings to Defaults
            </button>
          ) : (
            <div className="rounded-lg p-3" style={{ background: palette.surface, border: `1px solid ${palette.red}` }}>
              <p className="text-xs mb-3" style={{ color: palette.text }}>
                This resets theme, limits, alarms, and other preferences here — it does NOT touch your trades,
                journal, or notes. Continue?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    persistSettings(DEFAULT_SETTINGS);
                    setPendingSettingsReset(false);
                  }}
                  className={`flex-1 rounded-lg py-2 ${TAP}`}
                  style={{ background: palette.red, color: "#FFFFFF", fontFamily: mono, fontSize: "12.5px", fontWeight: 600 }}
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setPendingSettingsReset(false)}
                  className={`flex-1 rounded-lg py-2 ${TAP}`}
                  style={{ background: "transparent", border: `1px solid ${palette.border}`, color: palette.textMuted, fontFamily: mono, fontSize: "12.5px" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </SettingsSection>
      </div>
    </div>
  </div>
)}

{pendingAccountDelete && (
  <div
    className="fixed inset-0 flex items-center justify-center z-50 p-6"
    style={{ background: "rgba(5,7,12,0.85)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
    onClick={() => setPendingAccountDelete(null)}
  >
    <div
      className="w-full modal-in rounded-2xl p-5"
      style={{ maxWidth: "300px", background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ color: palette.text, fontSize: "14px", fontWeight: 600, marginBottom: "6px" }}>
        Delete this account?
      </div>
      <p className="text-xs mb-4" style={{ color: palette.textMuted }}>
        This removes it from your account list. This can't be undone.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setPendingAccountDelete(null)}
          className={`flex-1 rounded-lg py-2.5 ${TAP}`}
          style={{ background: "transparent", border: `1px solid ${palette.border}`, color: palette.textMuted, fontFamily: mono, fontSize: "13px" }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={confirmDeleteAccount}
          className={`flex-1 rounded-lg py-2.5 ${TAP}`}
          style={{ background: palette.red, color: "#FFFFFF", fontFamily: mono, fontSize: "13px", fontWeight: 600 }}
        >
          Delete
        </button>
      </div>
    </div>
  </div>
)}

  {pulseOpen && (() => {
  const fmtSignedShort = (n) => `${n >= 0 ? "+" : "-"}$${fmtMoney(n)}`;
  const nowPulse = currentTime;
  const todayKeyPulse = dayKeyFromDate(nowPulse);
  const todayTradesPulse = trades.filter((t) => dayKeyFromTs(t.ts) === todayKeyPulse);
  const todayNetPulse = todayTradesPulse.reduce((s, t) => s + t.pnl, 0);

  // A1 — time since last trade
  const sortedTradesPulse = [...trades].sort((a, b) => a.ts - b.ts);
  const lastTradePulse = sortedTradesPulse[sortedTradesPulse.length - 1];
  const msSinceLastTrade = lastTradePulse ? nowPulse.getTime() - lastTradePulse.ts : null;
  const lastTradeWasLoss = lastTradePulse && lastTradePulse.pnl < 0;
  const inCooldownPulse = lastTradeWasLoss && msSinceLastTrade !== null && msSinceLastTrade <= RUNTIME.REVENGE_WINDOW_MS;

  // A2 — trades remaining
  const maxTradesNumPulse = num(settings.maxTradesPerDay);
  const tradesRemainingPulse = maxTradesNumPulse > 0 ? Math.max(0, maxTradesNumPulse - todayTradesPulse.length) : null;

  // A3 — risk budget burn
  const dailyLossLimitNumPulse = num(settings.dailyLossLimit);
  const todayLossTotalPulse = todayTradesPulse.filter((t) => t.pnl < 0).reduce((s, t) => s + t.pnl, 0);
  const lossBudgetPctPulse =
    dailyLossLimitNumPulse > 0 ? Math.min(100, (Math.abs(todayLossTotalPulse) / dailyLossLimitNumPulse) * 100) : null;

  // A4 — active session(s) + historical win rate for them
  const nowUTCHourPulse = nowPulse.getUTCHours() + nowPulse.getUTCMinutes() / 60;
  const openSessionsPulse = MARKET_SESSIONS.filter((s) => sessionOpenAtUTCHour(s, nowUTCHourPulse));
  const sessionWinRatesPulse = computeSessionWinRates(filledJournalRows(journalEntries));
  const openSessionStatsPulse = openSessionsPulse
    .map((s) => sessionWinRatesPulse.find((r) => r.id === s.id))
    .filter(Boolean);

  // B5 — today vs average day
  const dayTotalsPulse = {};
  trades.forEach((t) => {
    const k = dayKeyFromTs(t.ts);
    dayTotalsPulse[k] = (dayTotalsPulse[k] || 0) + t.pnl;
  });
  const pastDayKeysPulse = Object.keys(dayTotalsPulse).filter((k) => k !== todayKeyPulse);
  const avgDayPnlPulse = pastDayKeysPulse.length
    ? pastDayKeysPulse.reduce((s, k) => s + dayTotalsPulse[k], 0) / pastDayKeysPulse.length
    : null;

  // B6 — same-weekday track record
  const insightsPulse = computeInsights(trades, customSetups, customMoods);
  const todayWeekdayNumPulse = nowPulse.getDay();
  const weekdayRowPulse = insightsPulse.weekdayRows.find((r) => Number(r.id) === todayWeekdayNumPulse);

  // B7 — today's mood track record
  const firstTradeTodayWithMood = todayTradesPulse.find((t) => t.emotion);
  const moodRowPulse = firstTradeTodayWithMood
    ? insightsPulse.moodRows.find((r) => r.id === firstTradeTodayWithMood.emotion)
    : null;

  // C8 — live win-streak risk flag
  let liveWinStreakPulse = 0;
  for (let i = sortedTradesPulse.length - 1; i >= 0; i--) {
    if (sortedTradesPulse[i].pnl > 0) liveWinStreakPulse += 1;
    else break;
  }
  const overconfidencePulse = computeOverconfidenceCheck(trades);
  const streakRiskFlagPulse = liveWinStreakPulse >= 3 && overconfidencePulse && overconfidencePulse.detected;

  // C9 — discipline streak "at risk"/record framing
  const disciplinePulse = computeDisciplineStreak(trades);
  const disciplineTrendPulse = computeDisciplineStreakTrend(trades);
  const last6WeeksPulse = disciplineTrendPulse.slice(-42);
  const bestInWindowPulse = last6WeeksPulse.length ? Math.max(...last6WeeksPulse.map((d) => d.streak)) : 0;
  const isNewRecordWindowPulse = disciplinePulse.current > 0 && disciplinePulse.current >= bestInWindowPulse;
  const oneMoreTiesRecordPulse = disciplinePulse.best - disciplinePulse.current === 1 && disciplinePulse.current > 0;

  // C10 — next flagged news event
  const upcomingNewsPulse = newsEvents
    .filter((ev) => ev.alarm)
    .map((ev) => ({ ev, occMs: nextOccurrenceMs(ev, nowPulse) }))
    .filter((x) => Number.isFinite(x.occMs) && x.occMs >= nowPulse.getTime())
    .sort((a, b) => a.occMs - b.occMs)[0];

  const pulseRow = (label, value, valueColor, sub) => (
    <div
      className="flex items-center justify-between rounded-lg px-3 py-2.5 mb-2"
      style={{ background: palette.field, border: `1px solid ${palette.border}` }}
    >
      <div style={{ flex: 1, marginRight: "8px" }}>
        <div style={{ color: palette.text, fontSize: "13px" }}>{label}</div>
        {sub && <div style={{ color: palette.textFaint, fontSize: "11px", marginTop: "2px" }}>{sub}</div>}
      </div>
      <span style={{ fontFamily: mono, fontSize: "13px", color: valueColor || palette.text, flexShrink: 0 }}>
        {value}
      </span>
    </div>
  );

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: "rgba(5,7,12,0.85)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
      onClick={() => setPulseOpen(false)}
    >
      <div
        className="w-full modal-in rounded-2xl overflow-y-auto"
        style={{
          maxWidth: isDesktop ? "560px" : "440px",
          maxHeight: "85vh",
          background: palette.surface,
          border: `1px solid ${palette.border}`,
          boxShadow: palette.shadow,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between p-5"
          style={{ borderBottom: `1px solid ${palette.border}`, position: "sticky", top: 0, background: palette.surface, zIndex: 2 }}
        >
<div className="flex items-center gap-2">
  <Flame
    size={16}
    className={(todayTradesPulse.length > 0 && todayNetPulse > 0) || disciplinePulse.current > 0 ? "flame-flicker" : ""}
    style={{
      color:
        (todayTradesPulse.length > 0 && todayNetPulse > 0) || disciplinePulse.current > 0
          ? palette.gold
          : palette.textFaint,
    }}
  />
  <span style={{ fontFamily: mono, fontSize: "16px", fontWeight: 700, color: palette.text }}>
    Today's Pulse
  </span>
</div>
          <button type="button" onClick={() => setPulseOpen(false)} className={TAP} style={{ color: palette.textFaint }} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="p-5">
          {!trades.length ? (
            <p className="text-xs mb-2" style={{ color: palette.textFaint }}>
              Log your first trade to start tracking your pulse.
            </p>
          ) : (
            <>
              <span className="block mb-1.5 uppercase" style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}>
                Right Now
              </span>

              {pulseRow(
                "Time Since Last Trade",
                lastTradePulse ? formatMinSec(msSinceLastTrade) : "N/A",
                inCooldownPulse ? palette.red : palette.text,
                lastTradePulse
                  ? inCooldownPulse
                    ? `Last trade was a loss — inside your ${RUNTIME.REVENGE_WINDOW_MINUTES}-minute cooldown`
                    : lastTradeWasLoss
                    ? "Last trade was a loss, cooldown has passed"
                    : "Last trade was a win"
                  : "No trades logged yet"
              )}

              {tradesRemainingPulse !== null &&
                pulseRow(
                  "Trades Left Before Caution",
                  `${tradesRemainingPulse} / ${maxTradesNumPulse}`,
                  tradesRemainingPulse === 0 ? palette.red : tradesRemainingPulse <= 1 ? palette.gold : palette.text,
                  `${todayTradesPulse.length} logged today`
                )}

              {lossBudgetPctPulse !== null &&
                pulseRow(
                  "Risk Budget Used Today",
                  `${lossBudgetPctPulse.toFixed(0)}%`,
                  lossBudgetPctPulse >= 100 ? palette.red : lossBudgetPctPulse >= 70 ? palette.gold : palette.green,
                  `$${fmtMoney(Math.abs(todayLossTotalPulse))} of $${fmt(dailyLossLimitNumPulse, 0)} limit`
                )}

              {openSessionsPulse.length > 0 &&
                pulseRow(
                  `Active Session${openSessionsPulse.length > 1 ? "s" : ""}`,
                  openSessionsPulse.map((s) => s.label).join(" + "),
                  palette.gold,
                  openSessionStatsPulse.length
                    ? openSessionStatsPulse
                        .map((s) =>
                          s.winRate !== null ? `${s.label} win rate: ${s.winRate.toFixed(0)}%` : `${s.label}: not enough journal data`
                        )
                        .join(" \u00b7 ")
                    : "No journaled session data yet"
                )}

              <span className="block mt-4 mb-1.5 uppercase" style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}>
                Compared to Your History
              </span>

              {pulseRow(
                "Today vs. Your Average Day",
                avgDayPnlPulse === null ? "N/A" : fmtSignedShort(todayNetPulse - avgDayPnlPulse),
                avgDayPnlPulse === null ? palette.textFaint : todayNetPulse >= avgDayPnlPulse ? palette.green : palette.red,
                avgDayPnlPulse === null
                  ? "Not enough history yet"
                  : `Today: ${fmtSignedShort(todayNetPulse)} vs. your average of ${fmtSignedShort(avgDayPnlPulse)}/day`
              )}

              {pulseRow(
                "This Weekday's Track Record",
                weekdayRowPulse ? `${weekdayRowPulse.winRate.toFixed(0)}% win rate` : "N/A",
                weekdayRowPulse ? (weekdayRowPulse.winRate >= 50 ? palette.green : palette.red) : palette.textFaint,
                weekdayRowPulse
                  ? `${weekdayRowPulse.count} trade${weekdayRowPulse.count === 1 ? "" : "s"} logged on ${weekdayRowPulse.label}s`
                  : "Log more trades to build this up"
              )}

              {firstTradeTodayWithMood &&
                pulseRow(
                  "Today's Mood Track Record",
                  moodRowPulse ? `${moodRowPulse.winRate.toFixed(0)}% win rate` : "N/A",
                  moodRowPulse ? (moodRowPulse.winRate >= 50 ? palette.green : palette.red) : palette.textFaint,
                  moodRowPulse
                    ? `${moodRowPulse.emoji} ${moodRowPulse.label} \u2014 ${moodRowPulse.count} trade${moodRowPulse.count === 1 ? "" : "s"} historically`
                    : "Tag a mood on today's trades to see this"
                )}

              <span className="block mt-4 mb-1.5 uppercase" style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}>
                Watch For
              </span>

              {liveWinStreakPulse >= 2 &&
                pulseRow(
                  "Current Win Streak",
                  `${liveWinStreakPulse} in a row`,
                  streakRiskFlagPulse ? palette.red : palette.green,
                  streakRiskFlagPulse
                    ? `You've historically sized up ${overconfidencePulse.pctChange.toFixed(0)}% after streaks like this`
                    : "No oversizing pattern detected yet"
                )}

              {disciplinePulse.hasData &&
                pulseRow(
                  "Discipline Streak Status",
                  `${disciplinePulse.current} day${disciplinePulse.current === 1 ? "" : "s"}`,
                  isNewRecordWindowPulse ? palette.gold : palette.text,
                  isNewRecordWindowPulse
                    ? "Matches or beats your best in the last ~6 weeks"
                    : oneMoreTiesRecordPulse
                    ? `One more clean day ties your best streak of ${disciplinePulse.best}`
                    : `Best streak: ${disciplinePulse.best} days`
                )}

              {upcomingNewsPulse &&
                pulseRow(
                  "Next Flagged Event",
                  formatCountdown(upcomingNewsPulse.occMs - nowPulse.getTime()),
                  upcomingNewsPulse.ev.impact === "high" ? palette.red : palette.textMuted,
                  `${upcomingNewsPulse.ev.name} \u2014 ${upcomingNewsPulse.ev.date} ${upcomingNewsPulse.ev.time}`
                )}
            </>
          )}
        </div>
      </div>
    </div>
  );
})()}

{shareImageUrl && (
  <div
    className="fixed inset-0 flex items-start justify-center z-50 p-4 overflow-y-auto"
    style={{ background: "rgba(5,7,12,0.85)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
    onClick={closeShare}
  >
    <div
      className="w-full flex flex-col items-center modal-in"
      style={{ maxWidth: "420px", margin: "20px 0" }}
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

        {viewingJournalPhoto && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: "rgba(5,7,12,0.9)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
          onClick={() => setViewingJournalPhoto(null)}
        >
          <div className="w-full flex flex-col items-center modal-in" style={{ maxWidth: "480px" }} onClick={(e) => e.stopPropagation()}>
            <div className="w-full flex items-center justify-between mb-3">
              <span style={{ color: "#EDEFF3", fontFamily: mono, fontSize: "13px" }}>Trade Photo</span>
              <button type="button" onClick={() => setViewingJournalPhoto(null)} className={TAP} style={{ color: "#7C8AA0" }} aria-label="Close"><X size={20} /></button>
            </div>
            <img src={viewingJournalPhoto.src} alt="Trade photo" className="w-full rounded-2xl mb-3" style={{ border: `1px solid ${palette.border}` }} />
            <button
              type="button"
              onClick={() => { setPendingJournalPhotoDelete({ rowId: viewingJournalPhoto.rowId, index: viewingJournalPhoto.index }); setViewingJournalPhoto(null); }}
              className={`w-full flex items-center justify-center gap-2 rounded-lg py-3 ${TAP}`}
              style={{ background: palette.red, color: "#FFFFFF", fontFamily: mono, fontSize: "14px", fontWeight: 600 }}
            >
              <Trash2 size={16} /> Delete Photo
            </button>
          </div>
        </div>
      )}

       {pendingJournalPhotoDelete && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-6"
          style={{ background: "rgba(5,7,12,0.85)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
          onClick={() => setPendingJournalPhotoDelete(null)}
        >
          <div className="w-full modal-in rounded-2xl p-5" style={{ maxWidth: "300px", background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }} onClick={(e) => e.stopPropagation()}>
            <div style={{ color: palette.text, fontSize: "14px", fontWeight: 600, marginBottom: "6px" }}>Delete this photo?</div>
            <p className="text-xs mb-4" style={{ color: palette.textMuted }}>This can't be undone.</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPendingJournalPhotoDelete(null)} className={`flex-1 rounded-lg py-2.5 ${TAP}`} style={{ background: "transparent", border: `1px solid ${palette.border}`, color: palette.textMuted, fontFamily: mono, fontSize: "13px" }}>Cancel</button>
              <button type="button" onClick={() => { removeJournalPhoto(pendingJournalPhotoDelete.rowId, pendingJournalPhotoDelete.index); setPendingJournalPhotoDelete(null); }} className={`flex-1 rounded-lg py-2.5 ${TAP}`} style={{ background: palette.red, color: "#FFFFFF", fontFamily: mono, fontSize: "13px", fontWeight: 600 }}>Delete</button>
            </div>
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

      {pendingRevengeLog && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-6"
          style={{ background: "rgba(5,7,12,0.85)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
          onClick={cancelRevengeLog}
        >
          <div
            className="w-full modal-in rounded-2xl p-5"
            style={{ maxWidth: "340px", background: palette.surface, border: `1px solid ${palette.red}`, boxShadow: palette.shadow }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ color: palette.text, fontSize: "14px", fontWeight: 600, marginBottom: "6px" }}>
              Cooldown active
            </div>
            <p className="text-xs mb-4" style={{ color: palette.textMuted }}>
              Your last trade was a loss within the last {RUNTIME.REVENGE_WINDOW_MINUTES} minutes. Take a breath before
              logging another one \u2014 is this still your plan, or emotion?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={cancelRevengeLog}
                className={`flex-1 rounded-lg py-2.5 ${TAP}`}
                style={{
                  background: palette.gold,
                  color: palette.letterbox,
                  fontFamily: mono,
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                Wait it out
              </button>
              <button
                type="button"
                onClick={confirmRevengeLog}
                className={`flex-1 rounded-lg py-2.5 ${TAP}`}
                style={{
                  background: "transparent",
                  border: `1px solid ${palette.border}`,
                  color: palette.textMuted,
                  fontFamily: mono,
                  fontSize: "13px",
                }}
              >
                Log anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingNoteDelete && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-6"
          style={{ background: "rgba(5,7,12,0.85)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
          onClick={cancelDeleteNote}
        >
          <div
            className="w-full modal-in rounded-2xl p-5"
            style={{ maxWidth: "300px", background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ color: palette.text, fontSize: "14px", fontWeight: 600, marginBottom: "6px", transition: THEME_TRANSITION }}>
              Delete this note?
            </div>
            <p className="text-xs mb-4" style={{ color: palette.textMuted, transition: THEME_TRANSITION }}>
              This can't be undone.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={cancelDeleteNote}
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
                onClick={confirmDeleteNote}
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

      {statementPeriod && (() => {
        const S = { text: "#19170F", muted: "#68624F", faint: "#9D9782", border: "#E6E1D4", green: "#0D9463", red: "#C43B2E", gold: "#B08A3E", bg: "#FFFFFF", bgAlt: "#F4F2EB" };
        const data = computeStatementData(trades, journalEntries, customSetups, playbookCheckins, startingBalance, statementPeriod, customMoods);
        const fmtSigned = (n) => `${n >= 0 ? "+" : "-"}$${fmtMoney(n)}`;
        const fmtRatio = (n) => (Number.isFinite(n) ? n.toFixed(2) : "\u221e");

        return (
          <div
            className="fixed inset-0 flex items-start justify-center z-50 p-4 statement-print-wrapper"
            style={{ background: "rgba(5,7,12,0.9)", overflowY: "auto" }}
            onClick={() => setStatementPeriod(null)}
          >
            <div
              className="w-full modal-in"
              style={{ maxWidth: "600px", margin: "20px 0" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3 statement-no-print">
                <span style={{ color: "#EDEFF3", fontFamily: mono, fontSize: "14px", fontWeight: 600 }}>
                  Statement Preview
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 ${TAP}`}
                    style={{ background: S.gold, color: "#FFFFFF", fontFamily: mono, fontSize: "13px", fontWeight: 600 }}
                  >
                    <Download size={15} />
                    Print / Save as PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatementPeriod(null)}
                    className={`flex items-center justify-center rounded-lg px-3 ${TAP}`}
                    style={{ background: "transparent", border: "1px solid #7C8AA0", color: "#EDEFF3" }}
                    aria-label="Close"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div
                id="ledger-statement"
                style={{ background: S.bg, borderRadius: "12px", padding: "28px", fontFamily: sans }}
              >
                <div className="flex items-start justify-between mb-1" style={{ borderBottom: `2px solid ${S.gold}`, paddingBottom: "12px" }}>
                  <div>
                    <div style={{ fontFamily: mono, fontSize: "10px", letterSpacing: "0.14em", color: S.gold, textTransform: "uppercase" }}>
                      Ledger — {statementPeriod.type === "month" ? "Monthly" : statementPeriod.type === "quarter" ? "Quarterly" : "Annual"} Statement
                    </div>
                    <div style={{ fontFamily: mono, fontSize: "1.4rem", fontWeight: 700, color: S.text }}>
                      {data.periodLabel}
                    </div>
                    {settings.traderAlias && (
                      <div style={{ fontSize: "11px", color: S.muted, marginTop: "2px" }}>{settings.traderAlias}</div>
                    )}
                  </div>
                  <div style={{ textAlign: "right", fontSize: "10px", color: S.faint, fontFamily: mono }}>
                    Generated {new Date().toLocaleDateString()}
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 my-4">
                  {[
                    { label: "Net P&L", value: fmtSigned(data.netPnl), color: data.netPnl >= 0 ? S.green : S.red },
                    { label: "% of Account", value: data.netPct === null ? "N/A" : fmtPct(data.netPct), color: S.text },
                    { label: "Trades", value: String(data.tradeCount), color: S.text },
                    { label: "Win Rate", value: `${data.winRate.toFixed(1)}%`, color: S.text },
                  ].map((c) => (
                    <div key={c.label} style={{ background: S.bgAlt, borderRadius: "8px", padding: "10px", textAlign: "center" }}>
                      <div style={{ fontSize: "9px", color: S.faint, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "3px" }}>{c.label}</div>
                      <div style={{ fontFamily: mono, fontSize: "13px", fontWeight: 700, color: c.color }}>{c.value}</div>
                    </div>
                  ))}
                </div>

                <div style={{ fontSize: "11px", fontWeight: 700, color: S.text, textTransform: "uppercase", letterSpacing: "0.06em", margin: "16px 0 8px" }}>
                  {statementPeriod.type === "month" ? "Daily P&L" : "Monthly P&L"}
                </div>
                <div style={{ background: S.bgAlt, borderRadius: "8px", padding: "12px 10px 4px" }}>
                  <div className="flex items-end" style={{ height: "80px", gap: "2px" }}>
                    {data.series.map((d, i) => (
                      <div
                        key={i}
                        title={`${d.label}: ${fmtSigned(d.pnl)}`}
                        style={{
                          flex: 1,
                          height: `${d.pnl === 0 ? 2 : Math.max(4, (Math.abs(d.pnl) / data.maxAbs) * 80)}px`,
                          background: d.pnl > 0 ? S.green : d.pnl < 0 ? S.red : S.faint,
                          borderRadius: "1px",
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between" style={{ fontSize: "8px", color: S.faint, fontFamily: mono, marginTop: "4px" }}>
                    <span>{data.series[0]?.label}</span>
                    <span>{data.series[data.series.length - 1]?.label}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 my-4">
                  <div>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: S.text, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>
                      Performance
                    </div>
                    {[
                      ["Profit Factor", fmtRatio(data.perf.profitFactor)],
                      ["Win/Loss Ratio", fmtRatio(data.perf.winLossRatio)],
                      ["Expectancy", fmtSigned(data.perf.expectancy)],
                      ["Largest Win", fmtSigned(data.perf.largestWin)],
                      ["Largest Loss", fmtSigned(data.perf.largestLoss)],
                      ["Max Drawdown", `$${fmtMoney(data.perf.maxDD)}`],
                    ].map(([l, v]) => (
                      <div key={l} className="flex justify-between" style={{ fontSize: "11px", padding: "3px 0", borderBottom: `1px solid ${S.border}` }}>
                        <span style={{ color: S.muted }}>{l}</span>
                        <span style={{ fontFamily: mono, color: S.text, fontWeight: 600 }}>{v}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: S.text, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>
                      Process & Discipline
                    </div>
                    {[
                      ["Best Period", data.bestBucket ? `${fmtSigned(data.bestBucket.pnl)} (${data.bestBucket.label})` : "N/A"],
                      ["Worst Period", data.worstBucket ? `${fmtSigned(data.worstBucket.pnl)} (${data.worstBucket.label})` : "N/A"],
                      ["Revenge Trades", `${data.revengeCost.revengeCount} (${fmtSigned(data.revengeCost.revengeTotal)})`],
                      ["Discipline Streak", `${data.discipline.current}d (best ${data.discipline.best}d)`],
                      ["Journal Completeness", `${data.completeness}%`],
                      ["Playbook Clean Days", data.cleanPct === null ? "N/A" : `${data.cleanPct}% (${data.checkinCount} check-ins)`],
                      ["Most Traded Pair", data.mostTradedPair ? `${data.mostTradedPair.pair} (${data.mostTradedPair.count}x)` : "N/A"],
                    ].map(([l, v]) => (
                      <div key={l} className="flex justify-between" style={{ fontSize: "11px", padding: "3px 0", borderBottom: `1px solid ${S.border}` }}>
                        <span style={{ color: S.muted }}>{l}</span>
                        <span style={{ fontFamily: mono, color: S.text, fontWeight: 600 }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {(data.bestSetup || data.bestMood) && (
                  <div className="flex gap-2 mb-2">
                    {data.bestSetup && (
                      <div style={{ flex: 1, background: `${S.gold}14`, border: `1px solid ${S.gold}55`, borderRadius: "8px", padding: "8px 10px" }}>
                        <div style={{ fontSize: "9px", color: S.gold, textTransform: "uppercase", letterSpacing: "0.06em" }}>Top Setup</div>
                        <div style={{ fontSize: "12px", color: S.text, fontWeight: 600 }}>{data.bestSetup.label}</div>
                      </div>
                    )}
                    {data.bestMood && (
                      <div style={{ flex: 1, background: `${S.green}14`, border: `1px solid ${S.green}55`, borderRadius: "8px", padding: "8px 10px" }}>
                        <div style={{ fontSize: "9px", color: S.green, textTransform: "uppercase", letterSpacing: "0.06em" }}>Best Mood</div>
                        <div style={{ fontSize: "12px", color: S.text, fontWeight: 600 }}>{data.bestMood.emoji} {data.bestMood.label}</div>
                      </div>
                    )}
                  </div>
                )}

                <div style={{ marginTop: "16px", paddingTop: "10px", borderTop: `1px solid ${S.border}`, fontSize: "9px", color: S.faint, fontFamily: mono }}>
                  Generated by Ledger — not a substitute for broker-issued account statements.
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {tourActive && (() => {
  const step = TOUR_STEPS[tourStep];
  const rect = tourRect;
  const pad = 8;
  const vw = typeof window !== "undefined" ? window.innerWidth : 400;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const cardWidth = isDesktop ? 340 : Math.min(340, vw - 32);

  let cardStyle;
  if (!rect) {
    cardStyle = { position: "fixed", left: "50%", top: "50%", transform: "translate(-50%, -50%)", width: cardWidth };
  } else {
    const spaceBelow = vh - (rect.top + rect.height);
    const spaceAbove = rect.top;
    const placeBelow = spaceBelow > 200 || spaceBelow > spaceAbove;
    let left = rect.left + rect.width / 2 - cardWidth / 2;
    left = Math.max(16, Math.min(left, vw - cardWidth - 16));
    cardStyle = placeBelow
      ? { position: "fixed", left, top: rect.top + rect.height + pad + 8, width: cardWidth }
      : { position: "fixed", left, bottom: vh - rect.top + pad + 8, width: cardWidth };
  }

  return (
    <div className="fixed inset-0" style={{ zIndex: 90 }}>
      {rect ? (
        <>
          <div onClick={() => endTour(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, height: Math.max(0, rect.top - pad), background: "rgba(5,7,12,0.78)" }} />
          <div onClick={() => endTour(false)} style={{ position: "fixed", top: rect.top + rect.height + pad, left: 0, right: 0, bottom: 0, background: "rgba(5,7,12,0.78)" }} />
          <div onClick={() => endTour(false)} style={{ position: "fixed", top: rect.top - pad, left: 0, width: Math.max(0, rect.left - pad), height: rect.height + pad * 2, background: "rgba(5,7,12,0.78)" }} />
          <div onClick={() => endTour(false)} style={{ position: "fixed", top: rect.top - pad, left: rect.left + rect.width + pad, right: 0, height: rect.height + pad * 2, background: "rgba(5,7,12,0.78)" }} />
          <div
            style={{
              position: "fixed",
              top: rect.top - pad,
              left: rect.left - pad,
              width: rect.width + pad * 2,
              height: rect.height + pad * 2,
              borderRadius: "14px",
              border: `2px solid ${palette.gold}`,
              boxShadow: `0 0 0 4px ${palette.gold}33, 0 0 24px ${palette.gold}66`,
              pointerEvents: "none",
              transition: "top 0.25s ease, left 0.25s ease",
            }}
          />
        </>
      ) : (
        <div onClick={() => endTour(false)} style={{ position: "fixed", inset: 0, background: "rgba(5,7,12,0.82)" }} />
      )}

      <div
        className="modal-in rounded-2xl p-5"
        style={{ ...cardStyle, background: palette.surface, border: `1px solid ${palette.gold}55`, boxShadow: palette.shadow, zIndex: 91 }}
      >
        <div className="flex items-center justify-between mb-2">
          <span style={{ fontFamily: mono, fontSize: "10px", color: palette.gold, letterSpacing: "0.1em" }}>
            STEP {tourStep + 1} OF {TOUR_STEPS.length}
          </span>
          <button type="button" onClick={() => endTour(true)} className={TAP} style={{ color: palette.textFaint }} aria-label="Skip tour">
            <X size={16} />
          </button>
        </div>
        <div style={{ fontFamily: display, fontSize: "16px", fontWeight: 700, color: palette.text, marginBottom: "6px" }}>
          {step.title}
        </div>
        <p className="text-sm mb-4" style={{ color: palette.textMuted }}>
          {step.text}
        </p>
        <div className="flex items-center gap-2">
          {tourStep > 0 && (
            <button type="button" onClick={() => goToTourStep(tourStep - 1)} className={`px-3 py-2 rounded-lg ${TAP}`} style={{ background: "transparent", border: `1px solid ${palette.border}`, color: palette.textMuted, fontFamily: mono, fontSize: "12.5px" }}>
              Back
            </button>
          )}
          <button type="button" onClick={() => endTour(true)} className={`px-3 py-2 rounded-lg ${TAP}`} style={{ background: "transparent", color: palette.textFaint, fontFamily: mono, fontSize: "12.5px" }}>
            Skip
          </button>
          <button
            type="button"
            onClick={() => goToTourStep(tourStep + 1)}
            className={`flex-1 rounded-lg py-2.5 ${TAP}`}
            style={{ background: palette.gold, color: palette.letterbox, fontFamily: mono, fontSize: "13px", fontWeight: 600 }}
          >
            {tourStep === TOUR_STEPS.length - 1 ? "Finish" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
})()}

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
