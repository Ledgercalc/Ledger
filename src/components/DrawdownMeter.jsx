import { useEffect, useId, useRef, useState } from "react";
import { palette } from "../../lib/theme.js";
import { useCss, clamp01 } from "./useCss.js";

// Drawdown buffer as a meter. remaining = 0..1 (1 = nothing used yet; see bufferLeft() in lib/cosmetics.js).
//   <DrawdownMeter skin="gauge" remaining={0.6} />
// skins: "bar" | "gauge" | "battery" | "health" | "shield". Purely visual, never changes a rule.

const CSS = `
.tz-dd{display:inline-flex;flex-direction:column;align-items:center;gap:6px;max-width:100%}
.tz-dd svg{display:block;overflow:visible;max-width:100%;height:auto}
.tz-dd text{font-family:inherit}
.tz-dd__needle{transform-origin:100px 100px;transition:transform 1.2s cubic-bezier(.34,1.56,.64,1)}
.tz-dd__seg{transition:width .9s cubic-bezier(.22,1,.36,1),fill .4s}
.tz-dd__ghost{transition:width .9s cubic-bezier(.22,1,.36,1) .55s}
.tz-dd__bat{transform-box:fill-box;transform-origin:0 50%;animation:tzDdFill .7s cubic-bezier(.22,1,.36,1) both}
.tz-dd--low .tz-dd__blink{animation:tzDdBlink 1s ease-in-out infinite}
.tz-dd__shine{animation:tzDdShine 3.4s ease-in-out infinite}
.tz-dd--low .tz-dd__alert{animation:tzDdAlert 1.1s ease-in-out infinite}
.tz-dd__crack{transition:opacity .6s ease}
.tz-dd__hbar{position:relative;height:14px;width:220px;max-width:100%;border-radius:999px;background:rgba(127,140,170,.25);overflow:hidden}
.tz-dd__hfill{position:absolute;inset:0 auto 0 0;border-radius:inherit;transition:width 1s cubic-bezier(.22,1,.36,1),background .4s}
@keyframes tzDdFill{from{transform:scaleX(0);opacity:0}to{transform:scaleX(1);opacity:1}}
@keyframes tzDdBlink{0%,100%{opacity:1}50%{opacity:.25}}
@keyframes tzDdShine{0%,55%{transform:translateX(-120px) skewX(-20deg)}85%,100%{transform:translateX(170px) skewX(-20deg)}}
@keyframes tzDdAlert{0%,100%{opacity:.15}50%{opacity:.7}}
@media (prefers-reduced-motion:reduce){.tz-dd *{animation:none!important;transition:none!important}}
`;

export const zoneOf = (r) => (r >= 0.5 ? { id: "ok", color: "#34d399" } : r >= 0.25 ? { id: "warn", color: "#fbbf24" } : { id: "low", color: "#f87171" });

// Eases from 0 to the real value on mount, and follows later changes.
function useEased(value, delay = 0) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay + 30);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}

const pol = (cx, cy, r, t) => {
  const a = Math.PI * (1 - t);
  return [cx + r * Math.cos(a), cy - r * Math.sin(a)];
};
const arc = (cx, cy, r, t0, t1) => {
  const [x0, y0] = pol(cx, cy, r, t0);
  const [x1, y1] = pol(cx, cy, r, t1);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
};

function Gauge({ r, z, uid }) {
  const v = useEased(r);
  const ticks = Array.from({ length: 11 }, (_, i) => i / 10);
  return (
    <svg viewBox="0 0 200 128" width="200" role="presentation">
      <defs>
        <filter id={`${uid}g`} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3" /></filter>
        <radialGradient id={`${uid}h`}><stop offset="0" stopColor="#fff" /><stop offset="1" stopColor="#cbd5e1" /></radialGradient>
      </defs>
      <path d={arc(100, 100, 74, 0, 1)} stroke="rgba(127,140,170,.18)" strokeWidth="16" fill="none" strokeLinecap="round" />
      <path d={arc(100, 100, 74, 0.0, 0.25)} stroke="#f87171" strokeWidth="14" fill="none" strokeLinecap="round" />
      <path d={arc(100, 100, 74, 0.27, 0.5)} stroke="#fbbf24" strokeWidth="14" fill="none" />
      <path d={arc(100, 100, 74, 0.52, 1)} stroke="#34d399" strokeWidth="14" fill="none" strokeLinecap="round" />
      <path d={arc(100, 100, 74, 0, 1)} stroke="#fff" strokeOpacity=".08" strokeWidth="2" fill="none" transform="translate(0 -9)" />
      {ticks.map((t, i) => {
        const [x0, y0] = pol(100, 100, 60, t);
        const [x1, y1] = pol(100, 100, i % 5 === 0 ? 51 : 55, t);
        return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} stroke={palette.textMuted} strokeWidth={i % 5 === 0 ? 2 : 1} strokeLinecap="round" opacity=".7" />;
      })}
      <text x="22" y="118" fontSize="11" fill={palette.textFaint} textAnchor="middle">E</text>
      <text x="178" y="118" fontSize="11" fill={palette.textFaint} textAnchor="middle">F</text>
      <g className="tz-dd__needle" style={{ transform: `rotate(${-90 + 180 * v}deg)` }}>
        <polygon points="96.5,100 103.5,100 100.8,32 99.2,32" fill="#f8fafc" stroke="#0f172a" strokeWidth=".6" />
        <polygon points="96.5,100 103.5,100 100,114" fill="#f8fafc" opacity=".8" />
      </g>
      <circle cx="100" cy="100" r="8" fill={`url(#${uid}h)`} stroke="#0f172a" strokeWidth="1.2" />
      <circle cx="100" cy="100" r="3" fill={z.color} />
      <text x="100" y="82" fontSize="16" fontWeight="700" fill={z.color} textAnchor="middle">{Math.round(r * 100)}%</text>
    </svg>
  );
}

function Battery({ r, z }) {
  const n = 5;
  const w = 24, gap = 3.5;
  return (
    <svg viewBox="0 0 200 96" width="200" role="presentation">
      <rect x="14" y="14" width="156" height="68" rx="12" fill="rgba(127,140,170,.1)" stroke={palette.textMuted} strokeWidth="3" />
      <rect x="173" y="36" width="11" height="24" rx="3.5" fill={palette.textMuted} />
      {Array.from({ length: n }, (_, i) => {
        const f = Math.max(0, Math.min(1, r * n - i));
        return (
          <g key={i}>
            <rect x={25 + i * (w + gap)} y="24" width={w} height="48" rx="5" fill="rgba(127,140,170,.16)" />
            {f > 0 && (
              <rect className={`tz-dd__bat ${i === Math.ceil(r * n) - 1 ? "tz-dd__blink" : ""}`} style={{ animationDelay: `${i * 90}ms` }} x={25 + i * (w + gap)} y="24" width={w * f} height="48" rx="5" fill={z.color} />
            )}
          </g>
        );
      })}
      <path d="M95 33 L86 52 H96 L91 67 L108 45 H97 L102 33 Z" fill="#fff" opacity=".28" />
    </svg>
  );
}

function Health({ r, z }) {
  const v = useEased(r);
  const ghost = useEased(r, 0);
  const n = 10, w = 15, gap = 3.5;
  return (
    <svg viewBox="0 0 220 56" width="220" role="presentation">
      <path d="M17 41 C5 32 3 22 7 17 C11 12 17 13 17 19 C17 13 23 12 27 17 C31 22 29 32 17 41 Z" transform="translate(-3 -4)" fill={z.color} />
      {Array.from({ length: n }, (_, i) => {
        const f = Math.max(0, Math.min(1, v * n - i));
        const g = Math.max(0, Math.min(1, ghost * n - i));
        const x = 34 + i * (w + gap);
        return (
          <g key={i}>
            <rect x={x} y="14" width={w} height="28" rx="5" fill="rgba(127,140,170,.16)" />
            <rect className="tz-dd__ghost" x={x} y="14" width={w * g} height="28" rx="5" fill="#fff" opacity=".35" />
            <rect className="tz-dd__seg" x={x} y="14" width={w * f} height="28" rx="5" fill={z.color} />
            <rect className="tz-dd__seg" x={x} y="14" width={w * f} height="9" rx="4" fill="#fff" opacity=".22" />
          </g>
        );
      })}
    </svg>
  );
}

function Shield({ r, z, uid }) {
  const v = useEased(r);
  const c = v >= 0.5 ? ["#7dd3fc", "#2563eb", "#1e3a8a"] : v >= 0.25 ? ["#fde68a", "#d97706", "#78350f"] : ["#fecaca", "#dc2626", "#7f1d1d"];
  const d = "M60 8 L108 24 V64 C108 96 88 120 60 132 C32 120 12 96 12 64 V24 Z";
  return (
    <svg viewBox="0 0 120 142" width="120" role="presentation">
      <defs>
        <linearGradient id={`${uid}a`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={c[0]} /><stop offset=".55" stopColor={c[1]} /><stop offset="1" stopColor={c[2]} /></linearGradient>
        <clipPath id={`${uid}c`}><path d={d} /></clipPath>
        <filter id={`${uid}g`} x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="6" /></filter>
      </defs>
      <path className="tz-dd__alert" d={d} fill="#ef4444" filter={`url(#${uid}g)`} opacity="0" />
      <path d={d} fill={`url(#${uid}a)`} stroke="#0f172a" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M60 16 L100 29 V62 C100 90 84 110 60 122 Z" fill="#fff" opacity=".1" />
      <path d={d} fill="none" stroke="#fff" strokeOpacity=".5" strokeWidth="1.4" transform="translate(60 70) scale(.88) translate(-60 -70)" />
      <g clipPath={`url(#${uid}c)`}><rect className="tz-dd__shine" x="0" y="0" width="22" height="142" fill="#fff" opacity=".35" /></g>
      <g fill="none" stroke="#0b1020" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path className="tz-dd__crack" opacity={v < 0.75 ? 1 : 0} d="M62 10 L56 30 L66 42 L58 58" />
        <path className="tz-dd__crack" opacity={v < 0.5 ? 1 : 0} d="M104 40 L88 52 L94 66 L80 78 M20 52 L36 60 L30 76" />
        <path className="tz-dd__crack" opacity={v < 0.25 ? 1 : 0} d="M58 58 L70 76 L56 92 L66 112 M80 78 L72 98 M30 76 L44 92" />
      </g>
      <text x="60" y="86" fontSize="22" fontWeight="800" fill="#fff" stroke="#0b1020" strokeWidth="3" paintOrder="stroke" textAnchor="middle">{Math.round(r * 100)}%</text>
    </svg>
  );
}

export default function DrawdownMeter({ skin = "gauge", remaining = 1, label = "drawdown buffer left", className = "", style }) {
  useCss("tz-meter-css", CSS);
  const uid = useId().replace(/:/g, "");
  const r = clamp01(remaining);
  const z = zoneOf(r);
  const pct = Math.round(r * 100);
  const body =
    skin === "battery" ? <Battery r={r} z={z} /> :
    skin === "health" ? <Health r={r} z={z} /> :
    skin === "shield" ? <Shield r={r} z={z} uid={uid} /> :
    skin === "bar" ? (
      <div className="tz-dd__hbar"><div className="tz-dd__hfill" style={{ width: `${pct}%`, background: z.color }} /></div>
    ) : <Gauge r={r} z={z} uid={uid} />;
  return (
    <div className={`tz-dd ${z.id === "low" ? "tz-dd--low" : ""} ${className}`} style={style} role="img" aria-label={`${pct}% ${label}`}>
      {body}
      <div style={{ fontSize: 12, color: palette.textMuted, textAlign: "center" }}>
        {skin === "gauge" || skin === "shield" ? label : <><b style={{ color: z.color }}>{pct}%</b> {label}</>}
      </div>
    </div>
  );
}
