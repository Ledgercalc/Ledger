import { usePlanOf } from "../lib/planStore.js";

// Pro / Creator plan badges + the styled username. Ported from Tredzi_plan_badges.html.
// Free users get nothing. <PlanName name="Rahim" /> is the drop-in replacement for printing a username.
const CSS = `
.tzb{--h:22px;--fs:11px;position:relative;display:inline-flex;align-items:center;justify-content:center;gap:calc(var(--h)*.24);height:var(--h);padding:0 calc(var(--h)*.4) 0 calc(var(--h)*.3);border-radius:999px;font-family:inherit;font-size:var(--fs);font-weight:800;letter-spacing:.09em;text-transform:uppercase;line-height:1;white-space:nowrap;vertical-align:middle;flex-shrink:0;isolation:isolate;user-select:none;cursor:default}
.tzb--sm{--h:18px;--fs:10px}.tzb--lg{--h:30px;--fs:14px}
.tzb--icon{width:var(--h);padding:0}
.tzb__clip{position:absolute;inset:0;border-radius:inherit;overflow:hidden;z-index:-1}
.tzb__bg,.tzb__sheen{position:absolute;top:0;bottom:0;left:0}
.tzb__bg{width:100%}
.tzb__sheen{width:45%;opacity:0;transform:translateX(-160%) skewX(-20deg);background:linear-gradient(90deg,transparent,rgba(255,255,255,.7),transparent)}
.tzb__icon{width:calc(var(--h)*.56);height:calc(var(--h)*.56);flex:none;display:block}
.tzb--pro{color:#3b2500;box-shadow:inset 0 0 0 1px rgba(255,236,170,.6),0 1px 5px rgba(240,170,30,.35)}
.tzb--pro .tzb__bg{background:linear-gradient(135deg,#ffe58f 0%,#f8b733 55%,#e58e00 100%)}
.tzb--pro.tzb--anim .tzb__sheen{opacity:1;animation:tzbSheen 4.4s ease-in-out infinite}
.tzb--pro.tzb--anim .tzb__icon{animation:tzbPulse 4.4s ease-in-out infinite}
.tzb--creator{color:#fff;padding:0 calc(var(--h)*.3) 0 calc(var(--h)*.42);box-shadow:inset 0 0 0 1px rgba(255,255,255,.3)}
.tzb--creator.tzb--icon{padding:0}
.tzb__label{position:relative}
.tzb--creator .tzb__label{text-shadow:0 0 5px rgba(255,255,255,.55),0 1px 1px rgba(40,0,60,.35)}
.tzb--creator .tzb__label::after{content:attr(data-t);position:absolute;left:0;top:0;color:#fff;text-shadow:0 0 6px #fff,0 0 14px #f5a3ff,0 0 24px #e879f9;opacity:.85;pointer-events:none}
.tzb--creator.tzb--anim .tzb__label::after{opacity:.3;animation:tzbTextGlow 2.4s ease-in-out infinite}
.tzb--creator .tzb__bg{width:200%;background:linear-gradient(90deg,#6d28d9 0%,#c026d3 12.5%,#f43f5e 25%,#c026d3 37.5%,#6d28d9 50%,#c026d3 62.5%,#f43f5e 75%,#c026d3 87.5%,#6d28d9 100%)}
.tzb--creator.tzb--anim .tzb__bg{animation:tzbFlow 7s linear infinite}
.tzb--creator.tzb--anim .tzb__sheen{opacity:1;animation:tzbSheen 3.6s ease-in-out infinite .8s}
.tzb--creator::after{content:"";position:absolute;inset:-1px;border-radius:inherit;box-shadow:0 0 12px 1px rgba(192,38,211,.75);opacity:.55;z-index:-2;pointer-events:none}
.tzb--creator.tzb--anim::after{animation:tzbGlow 2.8s ease-in-out infinite}
.tzb--creator.tzb--anim .tzb__icon{animation:tzbBob 2.4s ease-in-out infinite}
.tzb__spark{position:absolute;width:calc(var(--h)*.36);height:calc(var(--h)*.36);color:#fff;opacity:0;pointer-events:none;filter:drop-shadow(0 0 2px rgba(255,255,255,.9))}
.tzb__spark--a{top:calc(var(--h)*-.2);right:calc(var(--h)*.06)}
.tzb__spark--b{bottom:calc(var(--h)*-.16);left:calc(var(--h)*.5)}
.tzb--anim .tzb__spark{animation:tzbTwinkle 2.6s ease-in-out infinite}
.tzb--anim .tzb__spark--b{animation-delay:1.2s}
.tzb--creator:not(.tzb--anim) .tzb__spark{opacity:.9}
@keyframes tzbSheen{0%,55%{transform:translateX(-160%) skewX(-20deg)}85%,100%{transform:translateX(330%) skewX(-20deg)}}
@keyframes tzbFlow{to{transform:translateX(-50%)}}
@keyframes tzbTextGlow{0%,100%{opacity:.3}50%{opacity:1}}
@keyframes tzbGlow{0%,100%{opacity:.35}50%{opacity:.95}}
@keyframes tzbBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-1px)}}
@keyframes tzbPulse{0%,60%,100%{transform:scale(1)}72%{transform:scale(1.18)}84%{transform:scale(1)}}
@keyframes tzbTwinkle{0%,100%{opacity:0;transform:scale(.3) rotate(0)}50%{opacity:1;transform:scale(1) rotate(45deg)}}
@media (prefers-reduced-motion:reduce){.tzb,.tzb *,.tzb::after,.tzb__label::after{animation:none!important}.tzb__sheen{opacity:0!important}.tzb--creator .tzb__spark{opacity:.9}.tzb--creator .tzb__label::after{opacity:.85!important}}
.tzn{display:inline-flex;align-items:center;gap:.4em;max-width:100%;vertical-align:middle;font:inherit;color:inherit}
.tzn__name{position:relative;isolation:isolate;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tzn__name--creator{overflow:visible}
.tzn__name--creator .tzn__txt{color:#c026d3;font-weight:inherit}
@supports ((-webkit-background-clip:text) or (background-clip:text)){
.tzn__name--creator .tzn__txt{background:linear-gradient(90deg,#8b5cf6 0%,#d946ef 50%,#fb7185 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent}
}
.tzn__name--creator::after{content:attr(data-name);position:absolute;left:0;top:0;z-index:-1;color:#d946ef;-webkit-text-fill-color:#d946ef;filter:blur(7px);opacity:.5;pointer-events:none;white-space:nowrap}
.tzn--anim .tzn__name--creator::after{animation:tznGlow 2.6s ease-in-out infinite}
@keyframes tznGlow{0%,100%{opacity:.25}50%{opacity:.8}}
@media (prefers-reduced-motion:reduce){.tzn__name--creator::after{animation:none!important;opacity:.5}}
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

const BOLT = "M13 2 4 14h7l-1 8 9-12h-7z";
const CROWN = "M3 18h18v2H3zM3 7l4.5 4L12 4l4.5 7L21 7l-2 9H5z";
const SPARK = "M5 0 6 4 10 5 6 6 5 10 4 6 0 5 4 4z";

export function PlanBadge({ plan, size = "md", iconOnly = false, animate = true }) {
  if (plan !== "pro" && plan !== "creator") return null;
  ensureStyles();
  const label = plan === "pro" ? "Pro" : "Creator";
  const cls = ["tzb", `tzb--${plan}`, size === "sm" && "tzb--sm", size === "lg" && "tzb--lg", animate && "tzb--anim", iconOnly && "tzb--icon"].filter(Boolean).join(" ");
  const icon = (
    <svg className="tzb__icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={plan === "pro" ? BOLT : CROWN} /></svg>
  );
  return (
    <span className={cls} role="img" aria-label={`${label} member`}>
      <span className="tzb__clip"><span className="tzb__bg" /><span className="tzb__sheen" /></span>
      {plan === "pro" ? (
        <>{icon}{!iconOnly && <span className="tzb__label" data-t={label}>{label}</span>}</>
      ) : (
        <>
          {!iconOnly && <span className="tzb__label" data-t={label}>{label}</span>}
          {icon}
          <svg className="tzb__spark tzb__spark--a" viewBox="0 0 10 10" aria-hidden="true"><path d={SPARK} fill="currentColor" /></svg>
          <svg className="tzb__spark tzb__spark--b" viewBox="0 0 10 10" aria-hidden="true"><path d={SPARK} fill="currentColor" /></svg>
        </>
      )}
    </span>
  );
}

// A username with its plan badge. Looks the plan up by name, so it works anywhere a name is shown
// (feed, chat, groups, profile). Free users render as plain text.
//   size: "sm" | "md" | "lg" (badge size)   creatorLabel: show the word "Creator" instead of just the crown
export function PlanName({ name, size = "sm", creatorLabel = false }) {
  const plan = usePlanOf(name);
  ensureStyles();
  if (plan === "free") return <>{name}</>;
  return (
    <span className="tzn tzn--anim">
      <span className={`tzn__name${plan === "creator" ? " tzn__name--creator" : ""}`} data-name={name}>
        <span className="tzn__txt">{name}</span>
      </span>
      <PlanBadge plan={plan} size={size} iconOnly={plan === "creator" && !creatorLabel} />
    </span>
  );
}
