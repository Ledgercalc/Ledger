import { useId } from "react";
import { usePlanOf } from "../lib/planStore.js";

// Pro / Creator plan badges.
//   <PlanBadge plan="creator" />            -> labelled pill ("Creator")   (profile headers, settings, upgrade screen)
//   <PlanBadge plan="creator" iconOnly />   -> verified-style seal         (next to usernames)
//   <PlanName name="Raihan" />              -> username + its seal, looked up by name; free users are plain text
// Free users never get a badge.

const SEAL_N = 10; // scallops around the seal
const SEAL = (() => {
  const pts = [];
  const steps = 160;
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const r = 10.9 * (1 + 0.045 * Math.cos(SEAL_N * t));
    pts.push(`${(12 + r * Math.cos(t)).toFixed(2)} ${(12 + r * Math.sin(t)).toFixed(2)}`);
  }
  return `M${pts.join("L")}Z`;
})();
const BOLT = "M13 2 4 14h7l-1 8 9-12h-7z";
const CROWN = "M3 18h18v2H3zM3 7l4.5 4L12 4l4.5 7L21 7l-2 9H5z";

const PALETTE = {
  pro: { stops: ["#FFE07A", "#F7B22C", "#DE8200"], glow: "rgba(245,158,11,.5)", glyph: "#4A2B00", glyphShadow: "rgba(255,255,255,.35)" },
  creator: { stops: ["#8B5CF6", "#C026D3", "#FB4A7B"], glow: "rgba(192,38,211,.5)", glyph: "#FFFFFF", glyphShadow: "rgba(40,0,70,.35)" },
};

const CSS = `
.tzs{display:inline-block;flex:none;vertical-align:middle;overflow:visible;user-select:none}
.tzs--pro{filter:drop-shadow(0 1px 2px ${PALETTE.pro.glow})}
.tzs--creator{filter:drop-shadow(0 1px 3px ${PALETTE.creator.glow})}
.tzs__sweep{transform:translateX(-18px)}
.tzs--anim .tzs__sweep{animation:tzsSweep 5.2s cubic-bezier(.4,0,.2,1) infinite}
@keyframes tzsSweep{0%,62%{transform:translateX(-18px)}100%{transform:translateX(34px)}}

.tzp{--h:22px;position:relative;display:inline-flex;align-items:center;justify-content:center;gap:calc(var(--h)*.26);height:var(--h);padding:0 calc(var(--h)*.5) 0 calc(var(--h)*.38);border-radius:999px;font-family:inherit;font-size:calc(var(--h)*.5);font-weight:800;letter-spacing:.09em;text-transform:uppercase;line-height:1;white-space:nowrap;vertical-align:middle;flex:none;overflow:hidden;isolation:isolate;user-select:none;cursor:default}
.tzp--sm{--h:18px}.tzp--lg{--h:30px}
.tzp__glyph{width:calc(var(--h)*.5);height:calc(var(--h)*.5);display:block;flex:none}
.tzp--pro{color:#3A2100;background:linear-gradient(180deg,#FFE07A 0%,#F7B22C 58%,#E08A00 100%);box-shadow:inset 0 1px 0 rgba(255,255,255,.6),inset 0 -1px 0 rgba(120,60,0,.18),0 1px 3px rgba(222,130,0,.38)}
.tzp--creator{color:#fff;background:linear-gradient(135deg,#7C3AED 0%,#C026D3 55%,#FB4A7B 100%);box-shadow:inset 0 1px 0 rgba(255,255,255,.38),inset 0 -1px 0 rgba(40,0,70,.25),0 1px 4px rgba(192,38,211,.4);text-shadow:0 1px 1px rgba(40,0,70,.3)}
.tzp::after{content:"";position:absolute;top:0;bottom:0;left:0;width:40%;z-index:-1;pointer-events:none;opacity:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent);transform:translateX(-160%) skewX(-20deg)}
.tzp--anim::after{opacity:1;animation:tzpSheen 5.2s ease-in-out infinite}
@keyframes tzpSheen{0%,62%{transform:translateX(-160%) skewX(-20deg)}100%{transform:translateX(360%) skewX(-20deg)}}

.tzn{display:inline-flex;align-items:center;gap:.38em;max-width:100%;vertical-align:middle;font:inherit;color:inherit}
.tzn__name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tzn__name--creator .tzn__txt{color:#B026C8}
@supports ((-webkit-background-clip:text) or (background-clip:text)){
.tzn__name--creator .tzn__txt{background:linear-gradient(90deg,#8B5CF6 0%,#C026D3 55%,#F43F7E 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent}
}
@media (prefers-reduced-motion:reduce){.tzs--anim .tzs__sweep,.tzp--anim::after{animation:none!important}.tzp::after{opacity:0}}
`;

let injected = false;
function ensureStyles() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  const el = document.createElement("style");
  el.setAttribute("data-tz-plan-badges", "");
  el.textContent = CSS;
  document.head.appendChild(el);
}

const SEAL_PX = { sm: 17, md: 21, lg: 30 };

function Seal({ plan, size, animate }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const pal = PALETTE[plan];
  const label = plan === "pro" ? "Pro member" : "Creator";
  const px = SEAL_PX[size] || SEAL_PX.md;
  const glyph = plan === "pro"
    ? { d: BOLT, t: "translate(6.15 6) scale(.52)" }
    : { d: CROWN, t: "translate(5.3 5.4) scale(.56)" };
  return (
    <svg className={`tzs tzs--${plan}${animate ? " tzs--anim" : ""}`} width={px} height={px} viewBox="0 0 24 24" role="img" aria-label={label}>
      <title>{label}</title>
      <defs>
        <linearGradient id={`g${uid}`} x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor={pal.stops[0]} />
          <stop offset="0.55" stopColor={pal.stops[1]} />
          <stop offset="1" stopColor={pal.stops[2]} />
        </linearGradient>
        <linearGradient id={`h${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".5" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`s${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset=".5" stopColor="#fff" stopOpacity=".7" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`c${uid}`}><path d={SEAL} /></clipPath>
      </defs>
      <path d={SEAL} fill={`url(#g${uid})`} />
      <g clipPath={`url(#c${uid})`}>
        <path d="M0 0H24V12C17 9.6 7 9.6 0 12Z" fill={`url(#h${uid})`} />
        <g className="tzs__sweep"><rect x="0" y="-2" width="7" height="28" fill={`url(#s${uid})`} transform="skewX(-20)" /></g>
      </g>
      <path d={SEAL} fill="none" stroke="rgba(0,0,0,.16)" strokeWidth=".55" />
      <g transform="translate(0 0.5)"><path d={glyph.d} transform={glyph.t} fill={pal.glyphShadow} /></g>
      <path d={glyph.d} transform={glyph.t} fill={pal.glyph} />
    </svg>
  );
}

export function PlanBadge({ plan, size = "md", iconOnly = false, animate = true }) {
  if (plan !== "pro" && plan !== "creator") return null;
  ensureStyles();
  if (iconOnly) return <Seal plan={plan} size={size} animate={animate} />;
  const label = plan === "pro" ? "Pro" : "Creator";
  const cls = ["tzp", `tzp--${plan}`, size === "sm" && "tzp--sm", size === "lg" && "tzp--lg", animate && "tzp--anim"].filter(Boolean).join(" ");
  return (
    <span className={cls} role="img" aria-label={`${label} member`}>
      <svg className="tzp__glyph" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={plan === "pro" ? BOLT : CROWN} /></svg>
      <span>{label}</span>
    </span>
  );
}

// A username followed by its plan seal. Works anywhere a name is shown (chat, feed, groups, profile).
//   size: "sm" | "md" | "lg"       variant: "seal" (default) | "pill"
//   creatorLabel is kept for older calls and is the same as variant="pill"
export function PlanName({ name, size = "sm", variant, creatorLabel = false }) {
  const plan = usePlanOf(name);
  ensureStyles();
  if (plan === "free") return <>{name}</>;
  const asPill = variant === "pill" || creatorLabel;
  return (
    <span className="tzn">
      <span className={`tzn__name${plan === "creator" ? " tzn__name--creator" : ""}`}>
        <span className="tzn__txt">{name}</span>
      </span>
      <PlanBadge plan={plan} size={size} iconOnly={!asPill} />
    </span>
  );
}
