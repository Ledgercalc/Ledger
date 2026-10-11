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
const GEM = "M6.5 3h11L22 9.2 12 21.5 2 9.2z"; // diamond
const GEM_FACETS = "M2 9.2h20M9.2 3 7.6 9.2 12 21.5l4.4-12.3L14.8 3";
const CROWN = "M3 18h18v2H3zM3 7l4.5 4L12 4l4.5 7L21 7l-2 9H5z";
const tip = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0z`;
const CROWN_TIPS = tip(3, 7, 1.45) + tip(12, 4, 1.65) + tip(21, 7, 1.45);
const SPARK = "M5 0 6 4 10 5 6 6 5 10 4 6 0 5 4 4z";

const PALETTE = {
  pro: { stops: ["#EAFBFF", "#7FD6FA", "#2E9CF0"], glow: "rgba(56,189,248,.55)", glyph: "#0A3C66", glyphShadow: "rgba(255,255,255,.5)", sparks: ["#E0F7FF", "#7DD3FC", "#C7D2FE"] },
  creator: { stops: ["#8B5CF6", "#C026D3", "#FB4A7B"], glow: "rgba(192,38,211,.5)", glyph: "#FFFFFF", glyphShadow: "rgba(40,0,70,.35)", sparks: ["#E879F9", "#F472B6", "#C084FC"] },
};

const CSS = `
.tzs{display:inline-block;flex:none;vertical-align:middle;overflow:visible;user-select:none}
.tzs--pro{filter:drop-shadow(0 1px 2px ${PALETTE.pro.glow})}
.tzs--creator{filter:drop-shadow(0 1px 3px ${PALETTE.creator.glow})}
.tzs__spark{transform-box:fill-box;transform-origin:center;opacity:.95}
.tzs--anim .tzs__spark{opacity:0;animation:tzsTwinkle 2.8s ease-in-out infinite}
.tzs--anim .tzs__spark--b{animation-delay:.9s}
.tzs--anim .tzs__spark--c{animation-delay:1.8s}
@keyframes tzsTwinkle{0%,100%{opacity:0;transform:scale(.2) rotate(0deg)}45%{opacity:1;transform:scale(1) rotate(40deg)}70%{opacity:0;transform:scale(.4) rotate(70deg)}}
.tzs__sweep{transform:translateX(-18px)}
.tzs--anim .tzs__sweep{animation:tzsSweep 5.2s cubic-bezier(.4,0,.2,1) infinite}
@keyframes tzsSweep{0%,62%{transform:translateX(-18px)}100%{transform:translateX(34px)}}

.tzp{--h:22px;position:relative;display:inline-flex;align-items:center;justify-content:center;gap:calc(var(--h)*.26);height:var(--h);padding:0 calc(var(--h)*.5) 0 calc(var(--h)*.38);border-radius:999px;font-family:inherit;font-size:calc(var(--h)*.5);font-weight:800;letter-spacing:.09em;text-transform:uppercase;line-height:1;white-space:nowrap;vertical-align:middle;flex:none;overflow:hidden;isolation:isolate;user-select:none;cursor:default}
.tzp--sm{--h:18px}.tzp--lg{--h:30px}
.tzp__glyph{width:calc(var(--h)*.5);height:calc(var(--h)*.5);display:block;flex:none}
.tzp--pro{color:#06324F;background:linear-gradient(180deg,#EAFBFF 0%,#8EDDFB 55%,#38A8F2 100%);box-shadow:inset 0 1px 0 rgba(255,255,255,.75),inset 0 -1px 0 rgba(10,60,102,.18),0 1px 4px rgba(56,189,248,.45)}
.tzp--creator{color:#fff;background:linear-gradient(135deg,#7C3AED 0%,#C026D3 55%,#FB4A7B 100%);box-shadow:inset 0 1px 0 rgba(255,255,255,.38),inset 0 -1px 0 rgba(40,0,70,.25),0 1px 4px rgba(192,38,211,.4);text-shadow:0 1px 1px rgba(40,0,70,.3)}
.tzp::after{content:"";position:absolute;top:0;bottom:0;left:0;width:40%;z-index:-1;pointer-events:none;opacity:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent);transform:translateX(-160%) skewX(-20deg)}
.tzp--anim::after{opacity:1;animation:tzpSheen 5.2s ease-in-out infinite}
@keyframes tzpSheen{0%,62%{transform:translateX(-160%) skewX(-20deg)}100%{transform:translateX(360%) skewX(-20deg)}}

.tzn{display:inline-flex;align-items:center;gap:.38em;max-width:100%;vertical-align:middle;font:inherit;color:inherit}
.tzn__name{position:relative;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tzn__txt{display:inline-block}
.tzn__name--creator{filter:drop-shadow(0 0 4px rgba(217,70,239,.45))}
.tzn__name--pro{filter:drop-shadow(0 0 4px rgba(56,189,248,.55))}
.tzn__name--creator .tzn__txt{color:#B026C8}
.tzn__name--pro .tzn__txt{color:#0A84C6}
@supports ((-webkit-background-clip:text) or (background-clip:text)){
.tzn__name--creator .tzn__txt{background:linear-gradient(90deg,#8B5CF6 0%,#C026D3 27%,#F43F7E 50%,#C026D3 73%,#8B5CF6 100%);background-size:200% 100%;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent}
.tzn__name--pro .tzn__txt{background:linear-gradient(90deg,#0284C7 0%,#06B6D4 25%,#38BDF8 50%,#7C83F5 75%,#0284C7 100%);background-size:200% 100%;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent}
}
.tzn--anim .tzn__name--creator .tzn__txt,.tzn--anim .tzn__name--pro .tzn__txt{animation:tznFlow 4.5s linear infinite}
.tzn--anim .tzn__name--creator{animation:tznPulseC 3s ease-in-out infinite}
.tzn--anim .tzn__name--pro{animation:tznPulseP 3s ease-in-out infinite}
@keyframes tznFlow{to{background-position:200% 0}}
@keyframes tznPulseC{0%,100%{filter:drop-shadow(0 0 3px rgba(217,70,239,.3))}50%{filter:drop-shadow(0 0 7px rgba(217,70,239,.7))}}
@keyframes tznPulseP{0%,100%{filter:drop-shadow(0 0 3px rgba(56,189,248,.4))}50%{filter:drop-shadow(0 0 8px rgba(56,189,248,.85))}}
@media (prefers-reduced-motion:reduce){.tzs--anim .tzs__sweep,.tzs--anim .tzs__spark,.tzp--anim::after,.tzn--anim .tzn__name--creator,.tzn--anim .tzn__name--pro,.tzn--anim .tzn__name--creator .tzn__txt,.tzn--anim .tzn__name--pro .tzn__txt{animation:none!important}.tzs--anim .tzs__spark{opacity:.95}.tzp::after{opacity:0}}
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
    ? { d: GEM, t: "translate(5.3 5.4) scale(.56)" }
    : { d: CROWN, t: "translate(4.8 4.9) scale(.6)" };
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
      {plan === "creator" && (
        <g transform={glyph.t}>
          <path d={CROWN_TIPS} fill="#FFD9EC" />
          <path d="M12 9.6l2 2.8-2 2.8-2-2.8z" fill="#F43F7E" />
          <path d="M12 9.6l2 2.8h-4z" fill="#FFC2DA" />
          <path d="M7.2 11.2 6.4 15.6M16.8 11.2l.8 4.4" fill="none" stroke="rgba(139,50,200,.5)" strokeWidth=".8" strokeLinecap="round" />
          <circle cx="7.5" cy="19" r=".8" fill="#A21CAF" />
          <circle cx="12" cy="19" r=".8" fill="#F43F7E" />
          <circle cx="16.5" cy="19" r=".8" fill="#A21CAF" />
        </g>
      )}
      <g transform="translate(17 -4.5) scale(.62)"><path className="tzs__spark tzs__spark--a" d={SPARK} fill={pal.sparks[0]} /></g>
      <g transform="translate(-4.5 17) scale(.5)"><path className="tzs__spark tzs__spark--b" d={SPARK} fill={pal.sparks[1]} /></g>
      <g transform="translate(21.5 17.5) scale(.34)"><path className="tzs__spark tzs__spark--c" d={SPARK} fill={pal.sparks[2]} /></g>
    </svg>
  );
}

// Pro icon: just the diamond, cut into facets (no scalloped seal behind it).
function Gem({ size, animate }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const px = (SEAL_PX[size] || SEAL_PX.md) + 3;
  const fill = (n) => `url(#${n}${uid})`;
  const stop = (o, c) => <stop offset={o} stopColor={c} />;
  const g = (n, a, b, x2 = 0, y2 = 1) => (
    <linearGradient id={`${n}${uid}`} x1="0" y1="0" x2={x2} y2={y2}>{stop(0, a)}{stop(1, b)}</linearGradient>
  );
  return (
    <svg className={`tzs tzs--pro${animate ? " tzs--anim" : ""}`} width={px} height={px} viewBox="0 0 24 24" role="img" aria-label="Pro member">
      <title>Pro member</title>
      <defs>
        {g("tb", "#FFFFFF", "#D3F2FF")}
        {g("lc", "#C9EEFF", "#8ED8FB", 1, 1)}
        {g("rc", "#A6E1FD", "#5CC1F5", 1, 1)}
        {g("pl", "#70C8F8", "#3F9CEB")}
        {g("pc", "#9BDDFC", "#4DB3F4")}
        {g("pr", "#4EA9EF", "#2A86DD")}
        <linearGradient id={`sw${uid}`} x1="0" y1="0" x2="1" y2="0">{stop(0, "#fff")}{stop(0.5, "#fff")}{stop(1, "#fff")}</linearGradient>
        <clipPath id={`gc${uid}`}><path d={GEM} /></clipPath>
      </defs>
      <g clipPath={`url(#gc${uid})`}>
        <polygon points="2,9.2 6.5,3 9.2,9.2" fill={fill("lc")} />
        <polygon points="6.5,3 17.5,3 14.8,9.2 9.2,9.2" fill={fill("tb")} />
        <polygon points="17.5,3 22,9.2 14.8,9.2" fill={fill("rc")} />
        <polygon points="2,9.2 9.2,9.2 12,21.5" fill={fill("pl")} />
        <polygon points="9.2,9.2 14.8,9.2 12,21.5" fill={fill("pc")} />
        <polygon points="14.8,9.2 22,9.2 12,21.5" fill={fill("pr")} />
        <path d="M2 9.2h20M6.5 3 9.2 9.2M17.5 3 14.8 9.2M9.2 9.2 12 21.5 14.8 9.2" fill="none" stroke="rgba(255,255,255,.7)" strokeWidth=".45" strokeLinejoin="round" />
        <path d="M6.5 3h11" stroke="#fff" strokeWidth=".9" strokeLinecap="round" />
        <g className="tzs__sweep"><rect x="0" y="-2" width="5" height="28" fill={fill("sw")} opacity=".5" transform="skewX(-20)" /></g>
      </g>
      <path d="M7.6 4.6h4" stroke="#fff" strokeWidth="1" strokeLinecap="round" opacity=".95" />
      <g transform="translate(17 -4.5) scale(.62)"><path className="tzs__spark tzs__spark--a" d={SPARK} fill="#E0F7FF" /></g>
      <g transform="translate(-4.5 17) scale(.5)"><path className="tzs__spark tzs__spark--b" d={SPARK} fill="#7DD3FC" /></g>
      <g transform="translate(21.5 17.5) scale(.34)"><path className="tzs__spark tzs__spark--c" d={SPARK} fill="#C7D2FE" /></g>
    </svg>
  );
}

export function PlanBadge({ plan, size = "md", iconOnly = false, animate = true }) {
  if (plan !== "pro" && plan !== "creator") return null;
  ensureStyles();
  if (iconOnly) return plan === "pro" ? <Gem size={size} animate={animate} /> : <Seal plan={plan} size={size} animate={animate} />;
  const label = plan === "pro" ? "Pro" : "Creator";
  const cls = ["tzp", `tzp--${plan}`, size === "sm" && "tzp--sm", size === "lg" && "tzp--lg", animate && "tzp--anim"].filter(Boolean).join(" ");
  return (
    <span className={cls} role="img" aria-label={`${label} member`}>
      <svg className="tzp__glyph" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={plan === "pro" ? GEM : CROWN} />{plan === "creator" && <path d={CROWN_TIPS} />}{plan === "pro" && <path d={GEM_FACETS} fill="none" stroke="rgba(255,255,255,.8)" strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round" />}</svg>
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
    <span className="tzn tzn--anim">
      <span className={`tzn__name tzn__name--${plan}`} data-name={name}>
        <span className="tzn__txt">{name}</span>
      </span>
      <PlanBadge plan={plan} size={size} iconOnly={!asPill} />
    </span>
  );
}
