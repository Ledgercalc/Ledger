import { useId } from "react";
import { palette } from "../../lib/theme.js";
import { useCss, clamp01 } from "./useCss.js";

// A campfire that grows as more members check in today.
//   <GroupCampfire members={[{ name: "Alex", checkedIn: true }, ...]} canCheckIn onCheckIn={fn} />
// `level` (0..1) overrides the automatic checked / total ratio. Needs a daily check-in per member on the backend.

const CSS = `
.tz-cf{display:inline-flex;flex-direction:column;align-items:center;gap:8px;width:100%;max-width:340px}
.tz-cf svg{display:block;width:100%;height:auto;border-radius:18px;overflow:hidden}
.tz-cf text{font-family:inherit}
.tz-cf__fire{transition:transform 1.2s cubic-bezier(.22,1,.36,1),opacity .8s}
.tz-cf__f1,.tz-cf__f2,.tz-cf__f3{transform-box:fill-box;transform-origin:50% 100%}
.tz-cf__f1{animation:tzCfA 1.5s ease-in-out infinite}
.tz-cf__f2{animation:tzCfB 1.1s ease-in-out infinite}
.tz-cf__f3{animation:tzCfC .8s ease-in-out infinite}
.tz-cf__glow{transform-box:fill-box;transform-origin:center;animation:tzCfGlow 2.2s ease-in-out infinite}
.tz-cf__spark{opacity:0;animation:tzCfSpark var(--dur,2.6s) ease-out infinite;animation-delay:var(--del,0s)}
.tz-cf__mem{transition:opacity .6s,filter .6s}
.tz-cf__halo{transform-box:fill-box;transform-origin:center;animation:tzCfGlow 2.6s ease-in-out infinite}
.tz-cf__btn{font:inherit;font-size:13px;font-weight:600;padding:8px 16px;border-radius:999px;border:0;cursor:pointer;color:#3b1d00;background:linear-gradient(135deg,#ffd166,#ff8a3d);box-shadow:0 2px 10px rgba(255,138,61,.4)}
.tz-cf__btn:active{transform:scale(.96)}
@keyframes tzCfA{0%,100%{transform:scale(1,1) skewX(0)}30%{transform:scale(.95,1.07) skewX(-3deg)}65%{transform:scale(1.04,.95) skewX(2.5deg)}}
@keyframes tzCfB{0%,100%{transform:scale(1,1) skewX(0)}35%{transform:scale(1.06,.93) skewX(3deg)}70%{transform:scale(.93,1.1) skewX(-3deg)}}
@keyframes tzCfC{0%,100%{transform:scale(1,1)}50%{transform:scale(.9,1.14)}}
@keyframes tzCfGlow{0%,100%{opacity:.55;transform:scale(.94)}50%{opacity:1;transform:scale(1.08)}}
@keyframes tzCfSpark{0%{opacity:0;transform:translate(0,0) scale(1)}12%{opacity:1}100%{opacity:0;transform:translate(var(--dx,0px),-92px) scale(.2)}}
@media (prefers-reduced-motion:reduce){.tz-cf *{animation:none!important;transition:none!important}.tz-cf__spark{opacity:.6}}
`;

const OUTER = "M0 -104 C14 -78 44 -58 44 -26 C44 -4 24 8 0 8 C-24 8 -44 -4 -44 -26 C-44 -52 -16 -62 -8 -86 C-4 -76 -2 -88 0 -104 Z";
const SPARKS = [[-14, 14, 2.4, 0], [10, -18, 3, .6], [-4, 22, 2.8, 1.2], [18, -8, 2.2, 1.7], [-20, -12, 3.2, .3], [4, 10, 2.6, 2.1], [-8, -24, 2.9, 1.4], [14, 20, 2.5, .9]];

export default function GroupCampfire({ members = [], level, canCheckIn = false, onCheckIn, label, className = "" }) {
  useCss("tz-campfire-css", CSS);
  const uid = useId().replace(/:/g, "");
  const shown = members.slice(0, 8);
  const checked = members.filter((m) => m.checkedIn).length;
  const lvl = clamp01(level != null ? level : members.length ? checked / members.length : 0);
  const s = 0.42 + 0.58 * lvl;
  const lit = lvl > 0.02;
  const cx = 160, cy = 150, rx = 126, ry = 40;
  // Evenly spaced left to right along the front of the fire, so nobody overlaps.
  const pos = (i, n) => {
    const u = n === 1 ? 0 : -1 + (2 * i) / (n - 1);
    return [cx + rx * u, cy + 8 + ry * Math.sqrt(Math.max(0, 1 - u * u))];
  };
  return (
    <div className={`tz-cf ${className}`}>
      <svg viewBox="0 0 320 214" role="img" aria-label={`Group campfire: ${checked} of ${members.length} members checked in`}>
        <defs>
          <linearGradient id={`${uid}b`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#070a18" /><stop offset="1" stopColor="#1a1030" /></linearGradient>
          <radialGradient id={`${uid}gl`}><stop offset="0" stopColor="#ffb347" stopOpacity=".7" /><stop offset=".5" stopColor="#ff7a2f" stopOpacity=".22" /><stop offset="1" stopColor="#ff7a2f" stopOpacity="0" /></radialGradient>
          <linearGradient id={`${uid}o`} x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#b91c1c" /><stop offset=".45" stopColor="#f97316" /><stop offset="1" stopColor="#fbbf24" /></linearGradient>
          <linearGradient id={`${uid}m`} x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#f97316" /><stop offset="1" stopColor="#fde047" /></linearGradient>
          <linearGradient id={`${uid}i`} x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#fde68a" /><stop offset="1" stopColor="#fffbeb" /></linearGradient>
          <radialGradient id={`${uid}hl`}><stop offset="0" stopColor="#ffb347" stopOpacity=".55" /><stop offset="1" stopColor="#ffb347" stopOpacity="0" /></radialGradient>
          <radialGradient id={`${uid}mc`}><stop offset="0" stopColor="#ffe3b3" /><stop offset="1" stopColor="#f59e0b" /></radialGradient>
        </defs>
        <rect width="320" height="214" rx="18" fill={`url(#${uid}b)`} />
        {[[30, 24], [74, 52], [118, 16], [210, 30], [262, 22], [288, 60], [176, 50], [48, 92], [296, 100]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i % 3 ? 1 : 1.5} fill="#fff" opacity={0.35 + (i % 3) * 0.2} />)}
        <ellipse cx={cx} cy={cy - 8} rx={150 * (0.5 + 0.5 * lvl)} ry={110 * (0.5 + 0.5 * lvl)} fill={`url(#${uid}gl)`} className="tz-cf__glow" opacity={lit ? 1 : 0.3} />
        <ellipse cx={cx} cy={cy + 6} rx={rx + 10} ry={ry + 6} fill="#000" opacity=".25" />
        {/* stones */}
        {Array.from({ length: 9 }, (_, i) => {
          const a = (i / 9) * Math.PI * 2;
          return <ellipse key={i} cx={cx + 40 * Math.cos(a)} cy={cy - 4 + 11 * Math.sin(a)} rx="9" ry="5.5" fill={i % 2 ? "#475569" : "#334155"} stroke="#0f172a" strokeWidth="1" />;
        })}
        {/* fire */}
        <g className="tz-cf__fire" style={{ transform: `translate(${cx}px,${cy - 2}px) scale(${s})`, opacity: lit ? 1 : 0.35 }}>
          <g className="tz-cf__f1"><path d={OUTER} fill={`url(#${uid}o)`} /></g>
          {lit && <g className="tz-cf__f2"><path d={OUTER} fill={`url(#${uid}m)`} transform="translate(0 4) scale(.7)" /></g>}
          {lit && <g className="tz-cf__f3"><path d={OUTER} fill={`url(#${uid}i)`} transform="translate(0 6) scale(.4)" /></g>}
        </g>
        {/* logs */}
        <g>
          <rect x={cx - 38} y={cy - 8} width="76" height="12" rx="6" fill="#5b3a1e" transform={`rotate(14 ${cx} ${cy - 2})`} />
          <rect x={cx - 38} y={cy - 8} width="76" height="12" rx="6" fill="#6f4724" transform={`rotate(-14 ${cx} ${cy - 2})`} />
          <ellipse cx={cx + 36} cy={cy - 11} rx="4" ry="5.6" fill="#8a5a2e" /><ellipse cx={cx - 36} cy={cy - 11} rx="4" ry="5.6" fill="#8a5a2e" />
        </g>
        {/* sparks */}
        {lit && SPARKS.map(([x, dx, dur, del], i) => (
          <circle key={i} className="tz-cf__spark" style={{ "--dx": `${dx}px`, "--dur": `${dur}s`, "--del": `${del}s` }} cx={cx + x * s} cy={cy - 60 * s} r={1.6} fill="#ffd27a" />
        ))}
        {/* members */}
        {shown.map((m, i) => {
          const [x, y] = pos(i, shown.length);
          const on = !!m.checkedIn;
          const letter = (m.name || "?").trim().charAt(0).toUpperCase();
          return (
            <g key={m.name + i} className="tz-cf__mem" style={{ opacity: on ? 1 : 0.7 }}>
              {on && <circle className="tz-cf__halo" cx={x} cy={y} r="24" fill={`url(#${uid}hl)`} />}
              <circle cx={x} cy={y} r="13.5" fill={on ? `url(#${uid}mc)` : "rgba(148,163,184,.16)"} stroke={on ? "#7c2d12" : "#64748b"} strokeWidth="1.6" strokeDasharray={on ? "0" : "3 3"} />
              <text x={x} y={y + 4.5} fontSize="13" fontWeight="700" textAnchor="middle" fill={on ? "#4a1d00" : "#94a3b8"}>{letter}</text>
            </g>
          );
        })}
      </svg>
      <div style={{ fontSize: 13, color: palette.textMuted, textAlign: "center" }}>
        {label || (members.length ? <><b style={{ color: palette.text }}>{checked}</b> of {members.length} checked in today</> : "Light the fire: check in today")}
      </div>
      {canCheckIn && <button type="button" className="tz-cf__btn" onClick={onCheckIn}>Check in</button>}
    </div>
  );
}
