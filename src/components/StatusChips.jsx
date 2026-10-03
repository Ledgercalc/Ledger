import { Award, BadgeCheck, Ban, BookOpen, Flame, GraduationCap, ShieldCheck, Sparkles, Sunrise, Sunset } from "lucide-react";
import { useCss } from "./useCss.js";

// Small status pills shown next to a name. Earned or chosen, never bought with real money.
//   <StatusChips ids={["streak", "passed"]} streak={12} />      <StatusChip id="funded" />
// Visuals live here, the catalog (names, rarity, unlock) is in lib/cosmetics.js.

const CSS = `
.tz-chip{--c:#94a3b8;--bg:rgba(148,163,184,.14);position:relative;display:inline-flex;align-items:center;gap:5px;height:22px;padding:0 9px 0 6px;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:.02em;line-height:1;white-space:nowrap;color:var(--c);background:linear-gradient(180deg,var(--bg),transparent),rgba(0,0,0,.18);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--c) 45%,transparent);overflow:hidden;vertical-align:middle}
.tz-chip--sm{height:18px;font-size:10px;padding:0 7px 0 5px;gap:4px}
.tz-chip svg{width:13px;height:13px;flex:none}
.tz-chip--sm svg{width:11px;height:11px}
.tz-chip--streak{--c:#fb923c}.tz-chip--discipline{--c:#2dd4bf}.tz-chip--journal{--c:#60a5fa}.tz-chip--no_revenge{--c:#f472b6}
.tz-chip--london{--c:#fbbf24}.tz-chip--newyork{--c:#a78bfa}.tz-chip--funded{--c:#4ade80}.tz-chip--passed{--c:#fcd34d}
.tz-chip--mentor{--c:#38bdf8}.tz-chip--early{--c:#e879f9}
.tz-chip--anim.tz-chip--streak svg{animation:tzChFlame 1.1s ease-in-out infinite;transform-origin:50% 100%}
.tz-chip--anim.tz-chip--passed::after,.tz-chip--anim.tz-chip--funded::after{content:"";position:absolute;inset:0;background:linear-gradient(100deg,transparent 35%,rgba(255,255,255,.45) 50%,transparent 65%);transform:translateX(-120%);animation:tzChSheen 3.6s ease-in-out infinite}
.tz-chip--anim.tz-chip--discipline svg{animation:tzChPulse 2.4s ease-in-out infinite}
.tz-chip--anim.tz-chip--early svg{animation:tzChTwinkle 1.8s ease-in-out infinite}
@keyframes tzChFlame{0%,100%{transform:scale(1,1) rotate(0)}30%{transform:scale(.92,1.14) rotate(-5deg)}65%{transform:scale(1.06,.94) rotate(4deg)}}
@keyframes tzChSheen{0%,55%{transform:translateX(-120%)}90%,100%{transform:translateX(120%)}}
@keyframes tzChPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.18)}}
@keyframes tzChTwinkle{0%,100%{opacity:1;transform:rotate(0) scale(1)}50%{opacity:.55;transform:rotate(25deg) scale(1.15)}}
@media (prefers-reduced-motion:reduce){.tz-chip *,.tz-chip::after{animation:none!important}.tz-chip::after{display:none}}
`;

export const CHIP_VIEW = {
  streak: { Icon: Flame, text: (o) => `${o.streak || 7}-day streak` },
  discipline: { Icon: ShieldCheck, text: () => "Disciplined" },
  journal: { Icon: BookOpen, text: () => "Journals daily" },
  no_revenge: { Icon: Ban, text: () => "No revenge trades" },
  london: { Icon: Sunrise, text: () => "London session" },
  newyork: { Icon: Sunset, text: () => "New York session" },
  funded: { Icon: BadgeCheck, text: () => "Funded" },
  passed: { Icon: Award, text: () => "Challenge passed" },
  mentor: { Icon: GraduationCap, text: () => "Mentor" },
  early: { Icon: Sparkles, text: () => "Early member" },
};

export function StatusChip({ id, size = "md", animated = true, streak, className = "" }) {
  useCss("tz-chip-css", CSS);
  const v = CHIP_VIEW[id];
  if (!v) return null;
  const { Icon } = v;
  const label = v.text({ streak });
  return (
    <span className={`tz-chip tz-chip--${id}${size === "sm" ? " tz-chip--sm" : ""}${animated ? " tz-chip--anim" : ""} ${className}`.trim()} title={label}>
      <Icon strokeWidth={2.4} aria-hidden="true" />
      {label}
    </span>
  );
}

export default function StatusChips({ ids = [], max = 2, size = "md", animated = true, streak, className = "", style }) {
  const list = ids.filter((id) => CHIP_VIEW[id]).slice(0, max);
  if (!list.length) return null;
  return (
    <span className={className} style={{ display: "inline-flex", flexWrap: "wrap", gap: 5, alignItems: "center", ...style }}>
      {list.map((id) => <StatusChip key={id} id={id} size={size} animated={animated} streak={streak} />)}
    </span>
  );
}
