import React, { useState, useEffect, useRef, Fragment } from "react";
import { Scale, LineChart as CurveIcon, ArrowLeftRight, Trash2, Plus, ChevronLeft, ChevronRight, ChevronDown, RotateCcw, Newspaper, Share2, X, Download, Upload, Copy, Sun, Moon, Bell, Info, Camera, Pencil, Check, Clock, Lightbulb, BookOpen, ClipboardCheck, TrendingUp, Flame, Target, FileText, Search, Minus, WrapText, CalendarClock, Image as ImageIcon } from "lucide-react";
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

const palette = { ...DARK_PALETTE };

const mono =
  "'JetBrains Mono','SF Mono','Roboto Mono',ui-monospace,Menlo,Consolas,monospace";
const sans =
  "'Inter','Manrope',system-ui,-apple-system,'Segoe UI',sans-serif";

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

const MAX_CUSTOM_SETUPS = 2;
const CUSTOM_SETUPS_STORAGE_KEY = "equity-curve:custom-setups";

const NOTE_TAGS = ["FOMO", "Followed plan", "News trade"];

const REVENGE_WINDOW_MINUTES = 15;
const REVENGE_WINDOW_MS = REVENGE_WINDOW_MINUTES * 60 * 1000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const ALARM_LEAD_MINUTES = 15;
const ALARM_LEAD_MS = ALARM_LEAD_MINUTES * 60 * 1000;
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
  { id: "notepad", label: "Notepad", icon: FileText },
  { id: "sessions", label: "Sessions", icon: Clock },
];

const NOTEPAD_STORAGE_KEY = "notepad:notes";
const NOTEPAD_FONT_SIZES = [12, 13, 14, 16, 18, 20, 24];
const DEFAULT_NOTEPAD_FONT_SIZE = 14;
const NOTEPAD_MAX_IMAGES_PER_NOTE = 6;

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

function noteImageCount(blocks) {
  return (blocks || []).filter((b) => b.type === "image").length;
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

function insertImageBlock(blocks, activeRef, noteId, dataUrl) {
  const imgId = makeBlockId();
  let idx = -1;
  if (activeRef && activeRef.noteId === noteId) {
    idx = blocks.findIndex((b) => b.id === activeRef.blockId && b.type === "text");
  }
  if (idx === -1) {
    const afterId = makeBlockId();
    return {
      blocks: [...blocks, { id: imgId, type: "image", src: dataUrl }, { id: afterId, type: "text", text: "" }],
      focusBlockId: afterId,
    };
  }
  const block = blocks[idx];
  const text = block.text || "";
  const pos = Math.max(0, Math.min(activeRef.pos ?? text.length, text.length));
  const before = text.slice(0, pos);
  const after = text.slice(pos);
  const afterId = makeBlockId();
  const newBlocks = [
    ...blocks.slice(0, idx),
    { id: block.id, type: "text", text: before },
    { id: imgId, type: "image", src: dataUrl },
    { id: afterId, type: "text", text: after },
    ...blocks.slice(idx + 1),
  ];
  return { blocks: newBlocks, focusBlockId: afterId };
}

function removeImageBlock(blocks, blockId) {
  const idx = blocks.findIndex((b) => b.id === blockId);
  if (idx === -1) return blocks;
  const prev = blocks[idx - 1];
  const next = blocks[idx + 1];
  let result;
  if (prev && prev.type === "text" && next && next.type === "text") {
    const mergedText = (prev.text || "") + (next.text || "");
    result = [
      ...blocks.slice(0, idx - 1),
      { id: prev.id, type: "text", text: mergedText },
      ...blocks.slice(idx + 2),
    ];
  } else {
    result = blocks.filter((b) => b.id !== blockId);
  }
  return result.length > 0 ? result : [{ id: makeBlockId(), type: "text", text: "" }];
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
  { id: "setup", label: "Setup" },
  { id: "outcome", label: "Outcome" },
];
const JOURNAL_DETAIL_FIELDS = [
  { id: "session", label: "Session" },
  { id: "mood", label: "Mood" },
  { id: "confidence", label: "Confidence" },
  { id: "mistake", label: "Mistake" },
  { id: "note", label: "Note" },
];
const DEFAULT_JOURNAL_COL_WIDTHS = { date: 140, pair: 110, trend: 130, rr: 80, setup: 130, outcome: 110 };
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
  { id: "sydney", label: "Sydney", startUTC: 22, endUTC: 7, color: "#6C8EBF" },
  { id: "tokyo", label: "Tokyo", startUTC: 0, endUTC: 9, color: "#BF6C8E" },
  { id: "london", label: "London", startUTC: 8, endUTC: 17, color: "#6CBF8E" },
  { id: "newyork", label: "New York", startUTC: 13, endUTC: 22, color: "#BFA26C" },
];

const mod24 = (h) => ((h % 24) + 24) % 24;

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

  const weekdayRows = Object.keys(byWeekday)
    .map((k) => {
      const b = byWeekday[k];
      return {
        id: k,
        label: WEEKDAY_SHORT[Number(k)],
        count: b.count,
        mistakeRate: b.count ? Math.round((b.mistakeCount / b.count) * 100) : 0,
      };
    })
    .filter((r) => r.count > 0);

  const worstTrend = trendRows.length ? [...trendRows].sort((a, b) => b.mistakeRate - a.mistakeRate)[0] : null;
  const worstWeekday = weekdayRows.length ? [...weekdayRows].sort((a, b) => b.mistakeRate - a.mistakeRate)[0] : null;

  return { trendRows, weekdayRows, worstTrend, worstWeekday };
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

  roundRect(36, 36, W - 72, H - 72, 28);
  ctx.strokeStyle = c.border;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = c.gold;
  ctx.font = "600 26px monospace";
  ctx.textAlign = "left";
  ctx.fillText("LEDGER \u00b7 WEEKLY RECAP", 80, 128);

  ctx.fillStyle = c.text;
  ctx.font = "700 58px monospace";
  ctx.fillText("MY TRADING WEEK", 80, 196);

  ctx.fillStyle = c.textMuted;
  ctx.font = "400 24px sans-serif";
  ctx.fillText(`${rangeLabel} \u00b7 ${tradeCount} trade${tradeCount === 1 ? "" : "s"}`, 80, 236);

  ctx.fillStyle = c.textFaint;
  ctx.font = "600 20px sans-serif";
  ctx.fillText("NET RETURN", 80, 300);
  ctx.fillStyle = lineColor;
  ctx.font = "700 96px monospace";
  ctx.fillText(fmtPct(netPct), 80, 390);

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
  areaGrad.addColorStop(0, `${lineColor}33`);
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
  ctx.lineWidth = 4;
  ctx.lineJoin = "round";
  ctx.stroke();

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

  const row1Y = chartY + chartH + 48;
  const row1Bottom = drawChipRow(row1Y, [
    { label: "WIN RATE", value: `${fmt(winRate, 0)}%`, color: c.text },
    { label: "BEST STREAK", value: `+${bestStreak}`, color: c.green },
    { label: "WORST STREAK", value: `${worstStreak}`, color: worstStreak < 0 ? c.red : c.text },
  ]);

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
  const [sessionsSubTab, setSessionsSubTab] = useState("sessions");
  const [theme, setTheme] = useState("dark");
  const [themeLoaded, setThemeLoaded] = useState(false);

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
    maxDrawdownPct: "4",
    ddMode: "trail",
  });
  const [ps, setPs] = useState({
    balance: "",
    riskPct: "1",
    stopPips: "",
    valuePerPip: "10",
    preset: "forex",
  });
  const [fx, setFx] = useState({ amount: "100", from: "USD", to: "BDT", customRate: "" });

  const [liveFxRates, setLiveFxRates] = useState(null);
  const [fxRatesDate, setFxRatesDate] = useState(null);
  const [fxRatesStatus, setFxRatesStatus] = useState("idle");

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
  const [addingSetup, setAddingSetup] = useState(false);
  const [newSetupName, setNewSetupName] = useState("");
  const [setupError, setSetupError] = useState("");

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
  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const [copyMsg, setCopyMsg] = useState("");
  const [copyFallbackText, setCopyFallbackText] = useState("");

  const fileInputRef = useRef(null);
  const [backupMsg, setBackupMsg] = useState("");
  const [pendingImport, setPendingImport] = useState(null);

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
  const notepadImageInputRef = useRef(null);
  const [viewingNoteImage, setViewingNoteImage] = useState(null);
  const [notepadImageSaving, setNotepadImageSaving] = useState(false);
  const [notepadImageError, setNotepadImageError] = useState("");
  const [pendingNoteDelete, setPendingNoteDelete] = useState(null);
  const [pendingNoteImageDelete, setPendingNoteImageDelete] = useState(null);

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
        // non-critical, fail silently
      } finally {
        if (!cancelled) setJournalLoaded(true);
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
        // non-critical, fail silently
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

  useEffect(() => {
    if (!playbookCheckinsLoaded) return;
    const todayKey = dayKeyFromDate(new Date());
    const existing = playbookCheckins.find((c) => c.date === todayKey);
    setTodayResults(existing ? { ...existing.results } : {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playbookCheckinsLoaded]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await window.storage.get(NOTEPAD_STORAGE_KEY, false);
        if (cancelled) return;
        if (res && res.value) {
          const parsed = JSON.parse(res.value);
          if (Array.isArray(parsed)) setNotepadNotes(parsed.map(migrateNoteShape));
        }
      } catch (err) {
        // non-critical, fail silently
      } finally {
        if (!cancelled) setNotepadLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  const persistCustomSetups = async (next) => {
    setCustomSetups(next);
    try {
      await window.storage.set(CUSTOM_SETUPS_STORAGE_KEY, JSON.stringify(next), false);
    } catch (err) {
      // non-critical, fail silently
    }
  };

  const findSetupLabel = (id) => setupMeta(id)?.label || customSetups.find((s) => s.id === id)?.label || id;

  const persistJournalEntries = async (next) => {
    setJournalEntries(next);
    try {
      await window.storage.set(JOURNAL_STORAGE_KEY, JSON.stringify(next), false);
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
      { id, date: dateKey, pair: "", trend: "", rr: "", setup: setupId || "", mistake: "", note: "" },
    ]);
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

        const header = ["Date", "Pair", "Trend", "R:R", "Setup", "Outcome", "Session", "Mood", "Confidence", "Mistake", "Note"];
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
          setupLabel,
          outcomeLabel(r.outcome),
          sessionLabelFor(r.session),
          moodLabelFor(r.mood),
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
    setTradeNote("");
    setTradeEmotion(null);
    setTradeSetup(null);
    setEditingTradeId(null);
  };

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
    ensureJournalRowForDate(dayKeyFromDate(new Date()), tradeSetup);
    resetTradeForm();
  };

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

  const persistNotepadNotes = async (next) => {
    setNotepadNotes(next);
    try {
      await window.storage.set(NOTEPAD_STORAGE_KEY, JSON.stringify(next), false);
    } catch (err) {
      // non-critical, fail silently
    }
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

  const openNoteImagePicker = () => {
    setNotepadImageError("");
    if (notepadImageInputRef.current) notepadImageInputRef.current.click();
  };

  const handleNoteImageChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    const targetId = activeNoteId;
    if (!file || !targetId) return;
    setNotepadImageError("");
    setNotepadImageSaving(true);
    try {
      const dataUrl = await resizeImageFile(file);
      const note = notepadNotes.find((n) => n.id === targetId);
      if (note && noteImageCount(note.blocks) < NOTEPAD_MAX_IMAGES_PER_NOTE) {
        const result = insertImageBlock(note.blocks, notepadActiveBlockRef.current, targetId, dataUrl);
        updateNote(targetId, { blocks: result.blocks });
        setNotepadFocusBlock({ blockId: result.focusBlockId, pos: 0 });
      }
    } catch (err) {
      setNotepadImageError("Couldn't attach that image, please try again.");
    } finally {
      setNotepadImageSaving(false);
    }
  };

  const requestDeleteNoteImage = (noteId, blockId) => setPendingNoteImageDelete({ noteId, blockId });
  const cancelDeleteNoteImage = () => setPendingNoteImageDelete(null);
  const confirmDeleteNoteImage = () => {
    if (!pendingNoteImageDelete) return;
    const { noteId, blockId } = pendingNoteImageDelete;
    const note = notepadNotes.find((n) => n.id === noteId);
    if (note) {
      updateNote(noteId, { blocks: removeImageBlock(note.blocks, blockId) });
    }
    setPendingNoteImageDelete(null);
    setViewingNoteImage((cur) => (cur && cur.noteId === noteId && cur.blockId === blockId ? null : cur));
  };

  const downloadNoteImage = (src, note, blockId) => {
    setNotepadMsg("");
    try {
      const imageBlocks = (note.blocks || []).filter((b) => b.type === "image");
      const idx = imageBlocks.findIndex((b) => b.id === blockId);
      const filename = `${(note.title || "note").replace(/[^\w\-]+/g, "_") || "note"}-image-${idx === -1 ? 1 : idx + 1}.jpg`;
      const file = dataUrlToFile(src, filename);
      downloadImageFile(file, filename, "Downloaded.");
    } catch (err) {
      setNotepadMsg("Couldn't prepare that image to download.");
    }
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
    const maxDrawdownPct = num(cs.maxDrawdownPct) || 4;
    const ddMode = cs.ddMode === "static" ? "static" : "trail";

    const totalProfit = hasBoth ? currentBal - startBal : 0;
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
            <PillGroup
              options={[4, 6, 8, 10, 12]}
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

    const journalRows = filledJournalRows(journalEntries);
    const hasJournalData = journalRows.length > 0;
    const trendBreakdown = journalTrendBreakdown(journalRows);
    const rrSeries = journalRRSeries(journalRows);
    const mistakeFreq = journalMistakeFrequency(journalRows);
    const setupRadarData = journalSetupRadar(journalRows, customSetups);
    const mistakePatterns = journalMistakePatterns(journalRows);
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
              onClick={() => setInsightsSubTab(s.id)}
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
            Last 6 months – tap a square for that day's total.
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

        <span
          className="block mb-1.5 uppercase"
          style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
        >
          Journaling Activity (6 mo)
        </span>
        <div
          className="rounded-2xl p-4 mb-6"
          style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
        >
          <div style={{ width: "100%", height: 140 }}>
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
              className="rounded-2xl p-4 mb-6"
              style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
            >
              <div style={{ width: "100%", height: 140 }}>
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

        {sessionByDay.length > 0 && (
          <>
            <span
              className="block mb-1.5 uppercase"
              style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
            >
              Session Activity by Day
            </span>
            <div
              className="rounded-2xl p-4 mb-6"
              style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
            >
              <div style={{ width: "100%", height: 200 }}>
                <ResponsiveContainer>
                  <AreaChart data={sessionByDay} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
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
                      contentStyle={{
                        background: palette.field,
                        border: `1px solid ${palette.border}`,
                        borderRadius: "8px",
                        fontFamily: mono,
                        fontSize: "12px",
                      }}
                      labelStyle={{ color: palette.textMuted }}
                    />
                    <Legend
                      wrapperStyle={{ fontFamily: mono, fontSize: "10px", color: palette.textMuted }}
                      formatter={(v) => <span style={{ color: palette.textMuted }}>{v}</span>}
                    />
                    {MARKET_SESSIONS.map((s) => (
                      <Area
                        key={s.id}
                        type="monotone"
                        dataKey={s.label}
                        stackId="1"
                        stroke={s.color}
                        fill={s.color}
                        fillOpacity={0.55}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <p className="text-xs mb-6" style={{ color: palette.textFaint }}>
              Which session you journaled trades in, day by day \u2014 helps spot whether certain sessions get
              logged more (or less) consistently.
            </p>
          </>
        )}

        {confidenceByDay.length > 1 && (
          <>
            <span
              className="block mb-1.5 uppercase"
              style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
            >
              Confidence by Day
            </span>
            <div
              className="rounded-2xl p-4 mb-6"
              style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
            >
              <div style={{ width: "100%", height: 160 }}>
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
              className="rounded-2xl p-4 mb-6"
              style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
            >
              <div style={{ width: "100%", height: 200 }}>
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

        {rrSeries.length > 1 && (
          <>
            <span
              className="block mb-1.5 uppercase"
              style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
            >
              Planned R:R Over Time
            </span>
            <div
              className="rounded-2xl p-4 mb-6"
              style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
            >
              <div style={{ width: "100%", height: 160 }}>
                <ResponsiveContainer>
                  <AreaChart data={rrSeries} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="rrFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={palette.gold} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={palette.gold} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={palette.border} strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="label"
                      stroke={palette.textFaint}
                      tick={{ fill: palette.textFaint, fontSize: 9, fontFamily: mono }}
                      tickLine={false}
                      axisLine={{ stroke: palette.border }}
                      minTickGap={24}
                    />
                    <YAxis
                      stroke={palette.textFaint}
                      tick={{ fill: palette.textFaint, fontSize: 10, fontFamily: mono }}
                      tickLine={false}
                      axisLine={{ stroke: palette.border }}
                      width={28}
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
                      formatter={(v) => [`${v}`, "R:R"]}
                    />
                    <Area type="monotone" dataKey="rr" stroke={palette.gold} strokeWidth={2} fill="url(#rrFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {rrDist.length > 0 && (
          <>
            <span
              className="block mb-1.5 uppercase"
              style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
            >
              R:R Distribution
            </span>
            <div
              className="rounded-2xl p-4 mb-6"
              style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
            >
              <div style={{ width: "100%", height: 140 }}>
                <ResponsiveContainer>
                  <BarChart data={rrDist} margin={{ top: 6, right: 8, bottom: 0, left: 0 }} barCategoryGap="30%">
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
                    <Tooltip {...barTooltipProps} formatter={(v) => [`${v}`, "Rows"]} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={THIN_BAR_SIZE} fill={palette.green} activeBar={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {combinedMistakeRows.length > 0 && (
          <>
            {(mistakePatterns.worstTrend?.mistakeRate >= 30 || mistakePatterns.worstWeekday?.mistakeRate >= 30) && (
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
                  {mistakePatterns.worstTrend && mistakePatterns.worstTrend.mistakeRate >= 30 && (
                    <>You log a mistake {mistakePatterns.worstTrend.mistakeRate}% of the time in {mistakePatterns.worstTrend.label.toLowerCase()} conditions. </>
                  )}
                  {mistakePatterns.worstWeekday && mistakePatterns.worstWeekday.mistakeRate >= 30 && (
                    <>{mistakePatterns.worstWeekday.label}s are your worst day, {mistakePatterns.worstWeekday.mistakeRate}% of entries flagged.</>
                  )}
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
              className="rounded-2xl p-4 mb-6"
              style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
            >
              <div style={{ width: "100%", height: 180 }}>
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
              className="rounded-2xl p-4 mb-6"
              style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
            >
              <div style={{ width: "100%", height: Math.max(140, mistakeFreq.length * 34) }}>
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
            <div className="grid grid-cols-2 gap-3 mb-2">
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

      const cellInputStyle = { color: palette.text, fontFamily: mono, fontSize: "13px", border: "none" };
      const detailFieldStyle = { color: palette.text, fontFamily: mono, fontSize: "13px", border: "none" };

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
        if (field.id === "session") {
          const val = row.session || "";
          return (
            <select
              value={val}
              onChange={(e) => updateJournalField(row.id, "session", e.target.value, dateForRow)}
              className="w-full bg-transparent outline-none appearance-none"
              style={{
                ...detailFieldStyle,
                color: val ? palette.text : palette.textFaint,
                border: `1px solid ${palette.border}`,
                borderRadius: "6px",
                padding: "8px 10px",
              }}
            >
              <option value="" style={{ background: palette.field, color: palette.textFaint }}>
                Add session
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
              className="w-full bg-transparent outline-none appearance-none"
              style={{
                ...detailFieldStyle,
                color: val ? palette.text : palette.textFaint,
                border: `1px solid ${palette.border}`,
                borderRadius: "6px",
                padding: "8px 10px",
              }}
            >
              <option value="" style={{ background: palette.field, color: palette.textFaint }}>
                Add mood
              </option>
              {EMOTIONS.map((e) => (
                <option key={e.id} value={e.id} style={{ background: palette.field, color: palette.text }}>
                  {e.emoji} {e.label}
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
              className="w-full bg-transparent outline-none appearance-none"
              style={{
                ...detailFieldStyle,
                color: val ? palette.text : palette.textFaint,
                border: `1px solid ${palette.border}`,
                borderRadius: "6px",
                padding: "8px 10px",
              }}
            >
              <option value="" style={{ background: palette.field, color: palette.textFaint }}>
                Add confidence
              </option>
              {CONFIDENCE_OPTIONS.map((c) => (
                <option key={c.id} value={c.id} style={{ background: palette.field, color: palette.text }}>
                  {c.label}
                </option>
              ))}
            </select>
          );
        }
        return (
          <textarea
            value={row[field.id] || ""}
            onChange={(e) => {
              updateJournalField(row.id, field.id, e.target.value, dateForRow);
              autoResizeTextarea(e.target);
            }}
            ref={autoResizeTextarea}
            placeholder={field.id === "note" ? "Add note" : "Add mistake"}
            rows={1}
            className="w-full bg-transparent outline-none block"
            style={{
              ...detailFieldStyle,
              border: `1px solid ${palette.border}`,
              borderRadius: "6px",
              padding: "8px 10px",
              resize: "none",
              overflow: "hidden",
              whiteSpace: "pre-wrap",
              overflowWrap: "break-word",
              wordBreak: "break-word",
              lineHeight: "1.5",
            }}
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
                maxHeight: "480px",
              }}
            >
              <div style={{ overflowY: "auto", overflowX: "auto", maxHeight: "480px", WebkitOverflowScrolling: "touch" }}>
                <table style={{ borderCollapse: "collapse", width: `${totalTableWidth}px` }}>
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
                            padding: "14px 10px",
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
                                paddingTop: "10px",
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
                                  padding: "10px 10px",
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
                                paddingTop: "10px",
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
                                  padding: "14px 16px",
                                }}
                              >
                                <div className="grid grid-cols-2 gap-3 mb-3">
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
                                {JOURNAL_DETAIL_FIELDS.filter((f) => f.id === "mistake" || f.id === "note").map((field) => (
                                  <div key={field.id} className="mb-3">
                                    <span
                                      className="block mb-1 uppercase"
                                      style={{ color: palette.textFaint, letterSpacing: "0.06em", fontSize: "10px" }}
                                    >
                                      {field.label}
                                    </span>
                                    {renderDetailField(row, field)}
                                  </div>
                                ))}
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
            visibleNotes.map((n) => {
              const imgCount = noteImageCount(n.blocks);
              const preview = notePreview(n.blocks);
              return (
                <div
                  key={n.id}
                  onClick={() => openNote(n.id)}
                  className={`rounded-lg px-3 py-3 mb-2 ${TAP}`}
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
                        {imgCount > 0 && (
                          <span className="flex items-center gap-0.5 flex-shrink-0" style={{ color: palette.textFaint }}>
                            <ImageIcon size={11} />
                            <span style={{ fontSize: "10px", fontFamily: mono }}>{imgCount}</span>
                          </span>
                        )}
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
            })
          )}
        </>
      );
    } else {
      const wordWrap = activeNote.wordWrap !== false;
      const fontSize = activeNote.fontSize || DEFAULT_NOTEPAD_FONT_SIZE;
      const blocks = activeNote.blocks;
      const imgCount = noteImageCount(blocks);
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
              onClick={openNoteImagePicker}
              disabled={notepadImageSaving || imgCount >= NOTEPAD_MAX_IMAGES_PER_NOTE}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${TAP}`}
              style={{
                background: palette.field,
                color: palette.textMuted,
                border: `1px solid ${palette.border}`,
                fontSize: "11px",
                fontFamily: mono,
                opacity: notepadImageSaving || imgCount >= NOTEPAD_MAX_IMAGES_PER_NOTE ? 0.5 : 1,
              }}
              title="Insert image at cursor"
            >
              <Camera size={13} />
              {notepadImageSaving ? "Saving\u2026" : `Image (${imgCount}/${NOTEPAD_MAX_IMAGES_PER_NOTE})`}
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
            className="w-full rounded-lg px-3 py-3 mb-1"
            style={{
              background: palette.surface,
              border: `1px solid ${palette.border}`,
              minHeight: "260px",
              transition: THEME_TRANSITION,
            }}
          >
            {blocks.map((block, i) => {
              if (block.type === "image") {
                return (
                  <div key={block.id} className="relative my-2" style={{ display: "inline-block", maxWidth: "100%" }}>
                    <img
                      src={block.src}
                      alt="Note attachment"
                      onClick={() => setViewingNoteImage({ src: block.src, noteId: activeNote.id, blockId: block.id })}
                      className={TAP}
                      style={{
                        display: "block",
                        maxWidth: "100%",
                        maxHeight: "280px",
                        borderRadius: "10px",
                        border: `1px solid ${palette.border}`,
                        cursor: "pointer",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => requestDeleteNoteImage(activeNote.id, block.id)}
                      className={`absolute flex items-center justify-center rounded-full ${TAP}`}
                      style={{
                        top: "-6px",
                        right: "-6px",
                        width: "20px",
                        height: "20px",
                        background: palette.red,
                        color: "#FFFFFF",
                      }}
                      aria-label="Remove image"
                    >
                      <X size={12} />
                    </button>
                  </div>
                );
              }
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
                    fontSize: `${fontSize}px`,
                    lineHeight: 1.6,
                    resize: "none",
                    overflow: "hidden",
                    whiteSpace: wordWrap ? "pre-wrap" : "pre",
                    overflowWrap: wordWrap ? "break-word" : "normal",
                    overflowX: wordWrap ? "hidden" : "auto",
                    padding: 0,
                    minHeight: blocks.length === 1 ? "236px" : "24px",
                  }}
                />
              );
            })}
          </div>

          <div className="flex items-center justify-between mb-4">
            <span style={{ color: palette.textFaint, fontSize: "11px", fontFamily: mono }}>
              {countLines(blocks)} ln \u2013 {countWords(bodyText)} words \u2013 {bodyText.length} chars
            </span>
            <span style={{ color: palette.textFaint, fontSize: "11px", fontFamily: mono }}>
              Saved {new Date(activeNote.updatedAt).toLocaleTimeString()}
            </span>
          </div>

          {notepadImageError && (
            <p className="text-xs mb-2" style={{ color: palette.red }}>
              {notepadImageError}
            </p>
          )}

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

          <input
            ref={notepadImageInputRef}
            type="file"
            accept="image/*"
            onChange={handleNoteImageChange}
            style={{ display: "none" }}
          />
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
            Standard session hours in UTC: Sydney 22:00–07:00, Tokyo 00:00–09:00, London 08:00–17:00,
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
        input:focus, select:focus, textarea:focus { outline: none; }
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

      {viewingNoteImage && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: "rgba(5,7,12,0.9)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
          onClick={() => setViewingNoteImage(null)}
        >
          <div
            className="w-full flex flex-col items-center modal-in"
            style={{ maxWidth: "480px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between mb-3">
              <span style={{ color: "#EDEFF3", fontFamily: mono, fontSize: "13px" }}>
                Note Image
              </span>
              <button
                type="button"
                onClick={() => setViewingNoteImage(null)}
                className={TAP}
                style={{ color: "#7C8AA0" }}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <img
              src={viewingNoteImage.src}
              alt="Note attachment"
              className="w-full rounded-2xl mb-3"
              style={{ border: `1px solid ${palette.border}` }}
            />
            <div className="flex gap-2 w-full">
              <button
                type="button"
                onClick={() => {
                  const note = notepadNotes.find((n) => n.id === viewingNoteImage.noteId);
                  downloadNoteImage(viewingNoteImage.src, note || {}, viewingNoteImage.blockId);
                }}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-3 ${TAP}`}
                style={{
                  background: palette.gold,
                  color: palette.letterbox,
                  fontFamily: mono,
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                <Download size={16} />
                Download
              </button>
              <button
                type="button"
                onClick={() => requestDeleteNoteImage(viewingNoteImage.noteId, viewingNoteImage.blockId)}
                className={`flex items-center justify-center rounded-lg py-3 px-4 ${TAP}`}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "#EDEFF3",
                }}
                aria-label="Delete image"
                title="Delete"
              >
                <Trash2 size={16} />
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

      {pendingNoteImageDelete && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-6"
          style={{ background: "rgba(5,7,12,0.85)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
          onClick={cancelDeleteNoteImage}
        >
          <div
            className="w-full modal-in rounded-2xl p-5"
            style={{ maxWidth: "300px", background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ color: palette.text, fontSize: "14px", fontWeight: 600, marginBottom: "6px", transition: THEME_TRANSITION }}>
              Delete this image?
            </div>
            <p className="text-xs mb-4" style={{ color: palette.textMuted, transition: THEME_TRANSITION }}>
              This can't be undone.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={cancelDeleteNoteImage}
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
                onClick={confirmDeleteNoteImage}
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
