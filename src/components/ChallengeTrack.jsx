import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useCss, clamp01 } from "./useCss.js";

// Profit-target progress as a little scene. progress = 0..1 (e.g. profitProgress(pnl, target)).
//   <ChallengeTrack skin="mountain" progress={0.65} caption="to profit target" />
// skins: "bar" | "mountain" | "road" | "rocket" | "ladder". Purely visual.

const CSS = `
.tz-ct{display:block;width:100%;height:auto;border-radius:16px}
.tz-ct text{font-family:inherit}
.tz-ct__star{animation:tzCtTwinkle 3s ease-in-out infinite}
.tz-ct__flag{transform-box:fill-box;transform-origin:0 50%;animation:tzCtWave 1.8s ease-in-out infinite}
.tz-ct__dash{animation:tzCtDash 1.4s linear infinite}
.tz-ct__pulse{transform-box:fill-box;transform-origin:center;animation:tzCtPulse 2s ease-out infinite}
.tz-ct__move{transition:transform 1.1s cubic-bezier(.22,1,.36,1)}
.tz-ct__prog{transition:stroke-dasharray 1.1s cubic-bezier(.22,1,.36,1)}
.tz-ct__flame{transform-box:fill-box;transform-origin:50% 0;animation:tzCtFlame .18s ease-in-out infinite alternate}
.tz-ct__scroll1{animation:tzCtScroll 3.2s linear infinite}
.tz-ct__scroll2{animation:tzCtScroll 5.5s linear infinite}
.tz-ct__rung{transition:fill .5s ease,filter .5s ease}
.tz-ct__bar{position:relative;height:14px;border-radius:999px;background:rgba(127,140,170,.25);overflow:hidden}
.tz-ct__barfill{position:absolute;inset:0 auto 0 0;border-radius:inherit;overflow:hidden;background:linear-gradient(90deg,#3b82f6,#22d3ee,#4ade80);transition:width 1.1s cubic-bezier(.22,1,.36,1)}
.tz-ct__barfill::after{content:"";position:absolute;inset:0;background:linear-gradient(100deg,transparent 30%,rgba(255,255,255,.55) 50%,transparent 70%);transform:translateX(-100%);animation:tzCtSheen 2.6s ease-in-out infinite}
@keyframes tzCtTwinkle{0%,100%{opacity:.25}50%{opacity:1}}
@keyframes tzCtWave{0%,100%{transform:skewY(0) scaleX(1)}50%{transform:skewY(-7deg) scaleX(.86)}}
@keyframes tzCtDash{to{stroke-dashoffset:-12}}
@keyframes tzCtPulse{0%{transform:scale(.6);opacity:.8}100%{transform:scale(2.2);opacity:0}}
@keyframes tzCtFlame{from{transform:scaleY(.8) scaleX(.92)}to{transform:scaleY(1.25) scaleX(1.05)}}
@keyframes tzCtScroll{from{transform:translateY(-150px)}to{transform:translateY(0)}}
@keyframes tzCtSheen{to{transform:translateX(100%)}}
@media (prefers-reduced-motion:reduce){.tz-ct *,.tz-ct__bar *{animation:none!important;transition:none!important}}
`;

// Moves a marker along a path. Starts at 0 and eases to `t` after mount so it animates in.
function useAlong(pathRef, t) {
  const [target, setTarget] = useState(0);
  const [pt, setPt] = useState({ x: 0, y: 0, a: 0 });
  useEffect(() => {
    const id = requestAnimationFrame(() => setTarget(t));
    return () => cancelAnimationFrame(id);
  }, [t]);
  useLayoutEffect(() => {
    const p = pathRef.current;
    if (!p) return;
    const len = p.getTotalLength();
    const at = len * target;
    const a = p.getPointAtLength(at);
    const b = p.getPointAtLength(Math.min(len, at + 1.5));
    setPt({ x: a.x, y: a.y, a: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI });
  }, [target, pathRef]);
  return { ...pt, t: target };
}

const STARS = [[20, 18, 1.2], [48, 40, 1], [92, 14, 1.3], [128, 34, 1], [168, 12, 1.2], [250, 20, 1], [292, 44, 1.2], [304, 14, 1], [66, 62, 1], [276, 66, 1]];

function Caption({ pct, caption, color = "#fff" }) {
  return (
    <g>
      <text x="16" y="30" fontSize="22" fontWeight="700" fill={color}>{pct}%</text>
      <text x="16" y="45" fontSize="11" fill={color} opacity=".75">{caption}</text>
    </g>
  );
}

function Mountain({ p, caption, uid }) {
  const ref = useRef(null);
  const d = "M36 138 C70 126 84 112 104 100 C118 92 124 100 140 88 C160 74 176 70 190 52 C198 42 206 34 213 27";
  const m = useAlong(ref, p);
  return (
    <>
      <defs>
        <linearGradient id={`${uid}s`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0b1026" /><stop offset=".65" stopColor="#272a6b" /><stop offset="1" stopColor="#6d3fb2" /></linearGradient>
        <linearGradient id={`${uid}m`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4a4fa8" /><stop offset="1" stopColor="#1a1d55" /></linearGradient>
        <filter id={`${uid}g`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2" /></filter>
      </defs>
      <rect width="320" height="150" fill={`url(#${uid}s)`} />
      {STARS.map(([x, y, r], i) => <circle key={i} className="tz-ct__star" style={{ animationDelay: `${i * 0.37}s` }} cx={x} cy={y} r={r} fill="#fff" />)}
      <circle cx="282" cy="30" r="11" fill="#f1f5ff" /><circle cx="287" cy="27" r="10" fill="#1d2160" opacity=".85" />
      <polygon points="0,150 0,96 38,72 78,102 118,64 160,106 205,78 250,110 320,86 320,150" fill="#171c4a" opacity=".9" />
      <polygon points="18,150 96,86 124,106 214,22 306,150" fill={`url(#${uid}m)`} />
      <polygon points="214,22 306,150 238,150" fill="#000" opacity=".22" />
      <polygon points="214,22 196,45 206,41 214,50 224,41 234,46" fill="#eaf2ff" />
      <path d={d} fill="none" stroke="rgba(255,255,255,.32)" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="3 5" />
      <path ref={ref} d={d} fill="none" stroke="none" />
      <path d={d} pathLength="100" fill="none" stroke="#5ab0ff" strokeWidth="3.4" strokeLinecap="round" className="tz-ct__prog" strokeDasharray={`${m.t * 100} 100`} filter={`url(#${uid}g)`} opacity=".9" />
      <path d={d} pathLength="100" fill="none" stroke="#bfe0ff" strokeWidth="1.6" strokeLinecap="round" className="tz-ct__prog" strokeDasharray={`${m.t * 100} 100`} />
      <line x1="214" y1="22" x2="214" y2="6" stroke="#e2e8f0" strokeWidth="1.4" />
      <polygon className="tz-ct__flag" points="214,6 232,11 214,17" fill="#ef4444" />
      <g className="tz-ct__move" style={{ transform: `translate(${m.x}px,${m.y}px)` }}>
        <circle className="tz-ct__pulse" r="6" fill="#5ab0ff" opacity=".6" />
        <circle r="5.2" fill="#5ab0ff" stroke="#fff" strokeWidth="1.6" />
      </g>
      <Caption pct={Math.round(p * 100)} caption={caption} />
    </>
  );
}

function Road({ p, caption, uid }) {
  const ref = useRef(null);
  const d = "M16 136 C64 136 84 112 134 118 C184 124 196 140 238 124 C268 112 272 98 296 92";
  const m = useAlong(ref, p);
  return (
    <>
      <defs>
        <linearGradient id={`${uid}s`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1e1b4b" /><stop offset=".55" stopColor="#be4a86" /><stop offset="1" stopColor="#f59e0b" /></linearGradient>
        <radialGradient id={`${uid}u`}><stop offset="0" stopColor="#fff7c2" /><stop offset=".6" stopColor="#ffd166" /><stop offset="1" stopColor="#ff8a3d" /></radialGradient>
      </defs>
      <rect width="320" height="150" fill={`url(#${uid}s)`} />
      <circle cx="236" cy="92" r="24" fill={`url(#${uid}u)`} />
      <polygon points="0,112 60,92 130,106 200,88 270,102 320,90 320,150 0,150" fill="#4a1d5e" />
      <polygon points="0,130 80,114 170,128 250,112 320,124 320,150 0,150" fill="#2a1240" />
      <path d={d} fill="none" stroke="#7b8194" strokeWidth="16" strokeLinecap="round" />
      <path d={d} fill="none" stroke="#2b2f40" strokeWidth="13" strokeLinecap="round" />
      <path ref={ref} d={d} fill="none" stroke="#fcd34d" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="6 6" className="tz-ct__dash" />
      <path d={d} pathLength="100" fill="none" stroke="#4ade80" strokeWidth="2.2" strokeLinecap="round" className="tz-ct__prog" strokeDasharray={`${m.t * 100} 100`} opacity=".95" />
      <line x1="296" y1="92" x2="296" y2="68" stroke="#e2e8f0" strokeWidth="1.5" />
      <g className="tz-ct__flag">
        {[0, 1, 2, 3].map((i) => [0, 1].map((j) => <rect key={`${i}${j}`} x={296 + i * 4.5} y={68 + j * 4.5} width="4.5" height="4.5" fill={(i + j) % 2 ? "#fff" : "#111827"} />))}
      </g>
      <g className="tz-ct__move" style={{ transform: `translate(${m.x}px,${m.y}px)` }}>
        <g style={{ transform: `rotate(${m.a}deg)`, transition: "transform 1.1s cubic-bezier(.22,1,.36,1)" }}>
          <polygon points="7,0 26,-9 26,9" fill="#fff6c2" opacity=".28" />
          <rect x="-9" y="-4.5" width="18" height="9" rx="3.2" fill="#38bdf8" stroke="#0c4a6e" strokeWidth=".9" />
          <rect x="-2" y="-3.2" width="7" height="6.4" rx="1.6" fill="#bae6fd" />
          <circle cx="8.4" cy="-2.6" r="1.3" fill="#fde047" /><circle cx="8.4" cy="2.6" r="1.3" fill="#fde047" />
        </g>
      </g>
      <Caption pct={Math.round(p * 100)} caption={caption} />
    </>
  );
}

function Rocket({ p, caption, uid }) {
  const [t, setT] = useState(0);
  useEffect(() => { const id = requestAnimationFrame(() => setT(p)); return () => cancelAnimationFrame(id); }, [p]);
  const y0 = 128, y1 = 46;
  const y = y0 + (y1 - y0) * t;
  return (
    <>
      <defs>
        <linearGradient id={`${uid}s`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#04060f" /><stop offset="1" stopColor="#1f1a5c" /></linearGradient>
        <radialGradient id={`${uid}p`} cx=".35" cy=".3"><stop offset="0" stopColor="#c7f9ff" /><stop offset=".55" stopColor="#38bdf8" /><stop offset="1" stopColor="#1e3a8a" /></radialGradient>
        <linearGradient id={`${uid}f`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff7b0" /><stop offset=".5" stopColor="#ff9f1c" /><stop offset="1" stopColor="#ef4444" stopOpacity="0" /></linearGradient>
      </defs>
      <rect width="320" height="150" fill={`url(#${uid}s)`} />
      <g className="tz-ct__scroll2" opacity=".55">{[...STARS, ...STARS.map(([x, y2, r]) => [x, y2 + 150, r])].map(([x, y2, r], i) => <circle key={i} cx={x * 1.05} cy={y2} r={r * .8} fill="#cbd5ff" />)}</g>
      <g className="tz-ct__scroll1">{[[40, 20], [110, 70], [230, 30], [290, 90], [180, 110], [70, 120], [260, 140]].flatMap(([x, y2], i) => [<circle key={i} cx={x} cy={y2} r="1.5" fill="#fff" />, <circle key={`b${i}`} cx={x} cy={y2 + 150} r="1.5" fill="#fff" />])}</g>
      <circle cx="160" cy="24" r="17" fill={`url(#${uid}p)`} />
      <ellipse cx="160" cy="24" rx="27" ry="6" fill="none" stroke="#a5f3fc" strokeWidth="1.2" opacity=".7" transform="rotate(-14 160 24)" />
      <line x1="170" y1="12" x2="170" y2="0" stroke="#e2e8f0" strokeWidth="1.2" />
      <polygon className="tz-ct__flag" points="170,0 182,4 170,8" fill="#ef4444" />
      <line x1="160" y1="132" x2="160" y2="44" stroke="rgba(255,255,255,.3)" strokeWidth="2" strokeDasharray="2 6" strokeLinecap="round" />
      <line className="tz-ct__prog" x1="160" y1="132" x2="160" y2={y} stroke="#ffb347" strokeWidth="2.6" strokeLinecap="round" />
      {[.25, .5, .75].map((k) => <line key={k} x1="155" x2="165" y1={y0 + (y1 - y0) * k + 4} y2={y0 + (y1 - y0) * k + 4} stroke="rgba(255,255,255,.35)" strokeWidth="1.2" />)}
      <rect x="138" y="138" width="44" height="6" rx="2" fill="#475569" /><rect x="150" y="144" width="20" height="6" fill="#334155" />
      <g className="tz-ct__move" style={{ transform: `translate(160px,${y}px)` }}>
        <path className="tz-ct__flame" d="M-4 11 C-3 18 -1 22 0 28 C1 22 3 18 4 11 Z" fill={`url(#${uid}f)`} />
        <path d="M-6 6 L-12 14 L-5 11 Z M6 6 L12 14 L5 11 Z" fill="#ef4444" />
        <path d="M0 -15 C6 -9 7 2 5.4 11 L-5.4 11 C-7 2 -6 -9 0 -15 Z" fill="#f1f5f9" stroke="#94a3b8" strokeWidth=".8" />
        <circle cx="0" cy="-3" r="3" fill="#38bdf8" stroke="#0c4a6e" strokeWidth=".9" />
      </g>
      <text x="16" y="30" fontSize="22" fontWeight="700" fill="#fff">{Math.round(p * 100)}%</text>
      <text x="16" y="45" fontSize="11" fill="#fff" opacity=".75">{caption}</text>
    </>
  );
}

function Ladder({ p, caption, uid }) {
  const [t, setT] = useState(0);
  useEffect(() => { const id = requestAnimationFrame(() => setT(p)); return () => cancelAnimationFrame(id); }, [p]);
  const rungs = 9, yTop = 26, yBot = 132;
  const ys = Array.from({ length: rungs }, (_, i) => yBot - (i * (yBot - yTop)) / (rungs - 1));
  const my = yBot + (yTop - yBot) * t;
  return (
    <>
      <defs>
        <linearGradient id={`${uid}s`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#111827" /><stop offset="1" stopColor="#0b1220" /></linearGradient>
        <linearGradient id={`${uid}l`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".12" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
        <filter id={`${uid}g`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2" /></filter>
      </defs>
      <rect width="320" height="150" fill={`url(#${uid}s)`} />
      <polygon points="150,0 170,0 215,150 105,150" fill={`url(#${uid}l)`} />
      <line x1="132" y1="12" x2="132" y2="144" stroke="#475569" strokeWidth="3" strokeLinecap="round" />
      <line x1="188" y1="12" x2="188" y2="144" stroke="#475569" strokeWidth="3" strokeLinecap="round" />
      {ys.map((y, i) => {
        const done = (yBot - y) / (yBot - yTop) <= t + 0.001;
        return (
          <g key={i}>
            {done && <line x1="132" x2="188" y1={y} y2={y} stroke="#34d399" strokeWidth="5" filter={`url(#${uid}g)`} opacity=".7" />}
            <line className="tz-ct__rung" x1="132" x2="188" y1={y} y2={y} stroke={done ? "#34d399" : "#64748b"} strokeWidth="3" strokeLinecap="round" />
          </g>
        );
      })}
      <line x1="160" y1="26" x2="160" y2="8" stroke="#e2e8f0" strokeWidth="1.4" />
      <polygon className="tz-ct__flag" points="160,8 178,13 160,19" fill="#ef4444" />
      <g className="tz-ct__move" style={{ transform: `translate(160px,${my}px)` }}>
        <circle className="tz-ct__pulse" r="7" fill="#34d399" opacity=".6" />
        <circle r="6" fill="#34d399" stroke="#fff" strokeWidth="1.7" />
      </g>
      <text x="16" y="30" fontSize="22" fontWeight="700" fill="#fff">{Math.round(p * 100)}%</text>
      <text x="16" y="45" fontSize="11" fill="#fff" opacity=".75">{caption}</text>
    </>
  );
}

export default function ChallengeTrack({ skin = "mountain", progress = 0, caption = "to profit target", animated = true, className = "", style }) {
  useCss("tz-track-css", CSS);
  const uid = useId().replace(/:/g, "");
  const p = clamp01(progress);
  const pct = Math.round(p * 100);
  if (skin === "bar") {
    return (
      <div className={`tz-ct__bar-wrap ${className}`} style={style} role="img" aria-label={`Profit target progress ${pct}%`}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6, opacity: 0.8 }}>
          <span>{caption}</span><b>{pct}%</b>
        </div>
        <div className="tz-ct__bar"><div className="tz-ct__barfill" style={{ width: `${pct}%` }} /></div>
      </div>
    );
  }
  const Scene = { mountain: Mountain, road: Road, rocket: Rocket, ladder: Ladder }[skin] || Mountain;
  return (
    <svg className={`tz-ct ${className}`} style={style} viewBox="0 0 320 150" role="img" aria-label={`Profit target progress ${pct}%`}>
      <clipPath id={`${uid}clip`}><rect width="320" height="150" rx="16" /></clipPath>
      <g clipPath={`url(#${uid}clip)`}><Scene p={p} caption={caption} uid={uid} /></g>
    </svg>
  );
}
