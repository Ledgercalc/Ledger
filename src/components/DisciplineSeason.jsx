import { Check, Gift, Lock } from "lucide-react";
import { palette } from "../../lib/theme.js";
import { RARITY, SEASON, seasonRewards } from "../../lib/cosmetics.js";
import { useCss } from "./useCss.js";

// 8-week discipline season. Free track (circles) + supporter pass track (hexagons).
//   <DisciplineSeason weeksDone={3} hasPass={false} claimed={new Set(["free:2"])} onClaim={(r)=>...} onGetPass={...} />
// weeksDone = weeks completed so far (earn a week by meeting your own discipline rules). Week weeksDone+1 is "now".

const CSS = `
.tz-ds{width:100%;color:var(--tz-tx)}
.tz-ds__head{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:12px}
.tz-ds__grid{position:relative;display:grid;grid-template-columns:repeat(8,minmax(0,1fr));row-gap:6px}
.tz-ds__cell{position:relative;display:flex;flex-direction:column;align-items:center;gap:5px;min-width:0}
.tz-ds__line{position:absolute;top:19px;left:-50%;width:100%;height:3px;border-radius:2px;background:rgba(127,140,170,.3);z-index:0}
.tz-ds__line--on{background:linear-gradient(90deg,#34d399,#6ee7b7)}
.tz-ds__line--pass{background:rgba(255,184,77,.28)}.tz-ds__line--pass.tz-ds__line--on{background:linear-gradient(90deg,#f59e0b,#fcd34d)}
.tz-ds__node{position:relative;z-index:1;width:38px;height:38px;display:grid;place-items:center;border-radius:50%;border:2px solid rgba(127,140,170,.5);background:var(--tz-bg);color:rgba(127,140,170,.9);font-size:13px;font-weight:700;transition:transform .2s}
.tz-ds__node--done{background:linear-gradient(135deg,#6ee7b7,#10b981);border-color:#047857;color:#052e22;animation:tzDsPop .5s cubic-bezier(.34,1.56,.64,1) both}
.tz-ds__node--now{border-color:#34d399;color:#34d399;animation:tzDsNow 1.8s ease-in-out infinite}
.tz-ds__hex{clip-path:polygon(50% 0,93% 25%,93% 75%,50% 100%,7% 75%,7% 25%);border:0;border-radius:0;width:40px;height:42px;background:rgba(127,140,170,.35)}
.tz-ds__hex::before{content:"";position:absolute;inset:2px;background:var(--tz-bg);clip-path:inherit}
.tz-ds__hex>*{position:relative}
.tz-ds__hex--done{background:linear-gradient(135deg,#fde68a,#f59e0b);animation:tzDsPop .5s cubic-bezier(.34,1.56,.64,1) both}
.tz-ds__hex--done::before{background:linear-gradient(135deg,#fcd34d,#f59e0b)}
.tz-ds__hex--now{background:#f59e0b;animation:tzDsNowHex 1.8s ease-in-out infinite}
.tz-ds__hex--ready{background:linear-gradient(135deg,#fde68a,#f59e0b)}
.tz-ds__rw{display:grid;place-items:center;position:absolute;right:-3px;top:-4px;z-index:2;width:17px;height:17px;border-radius:50%;background:var(--c,#94a3b8);color:#0b1020;box-shadow:0 0 0 2px var(--tz-bg)}
.tz-ds__rw svg{width:10px;height:10px}
.tz-ds__claim{font:inherit;font-size:11px;font-weight:700;border:0;border-radius:999px;padding:3px 9px;cursor:pointer;color:#052e22;background:linear-gradient(135deg,#6ee7b7,#10b981);animation:tzDsBob 1.4s ease-in-out infinite}
.tz-ds__claim--pass{color:#3b2500;background:linear-gradient(135deg,#fde68a,#f59e0b)}
.tz-ds__name{font-size:10.5px;line-height:1.15;text-align:center;color:var(--tz-mu);min-height:24px}
.tz-ds__lock{position:absolute;inset:-4px -2px;z-index:3;border-radius:14px;background:rgba(10,12,20,.58);backdrop-filter:blur(1.5px);display:flex;align-items:center;justify-content:center;gap:8px;color:#fff;font-size:12px;font-weight:600}
.tz-ds__cta{font:inherit;font-size:12px;font-weight:700;border:0;border-radius:999px;padding:6px 12px;cursor:pointer;color:#3b2500;background:linear-gradient(135deg,#fde68a,#f59e0b)}
@keyframes tzDsPop{0%{transform:scale(.5)}100%{transform:scale(1)}}
@keyframes tzDsNow{0%,100%{box-shadow:0 0 0 0 rgba(52,211,153,.55)}50%{box-shadow:0 0 0 7px rgba(52,211,153,0)}}
@keyframes tzDsNowHex{0%,100%{filter:drop-shadow(0 0 0 rgba(245,158,11,.0))}50%{filter:drop-shadow(0 0 6px rgba(245,158,11,.9))}}
@keyframes tzDsBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}
@media (prefers-reduced-motion:reduce){.tz-ds *{animation:none!important}}
`;

const KIND_LABEL = { frame: "Frame", trackSkin: "Track", meterSkin: "Meter", chip: "Chip" };

export default function DisciplineSeason({ weeksDone = 0, hasPass = false, claimed = new Set(), onClaim, onGetPass, className = "" }) {
  useCss("tz-season-css", CSS);
  const { free, pass } = seasonRewards();
  const weeks = Array.from({ length: SEASON.weeks }, (_, i) => i + 1);
  const vars = { "--tz-tx": palette.text, "--tz-mu": palette.textMuted, "--tz-bg": palette.surface };

  const row = (track) => weeks.map((w) => {
    const rw = (track === "free" ? free : pass)[w];
    const done = w <= weeksDone;
    const now = w === weeksDone + 1;
    const key = `${track}:${w}`;
    const canClaim = rw && done && !claimed.has(key) && (track === "free" || hasPass);
    const isHex = track === "pass";
    const state = rw && done && claimed.has(key) ? "done" : done && !rw ? "done" : now ? "now" : "";
    return (
      <div key={key} className="tz-ds__cell">
        {w > 1 && <span className={`tz-ds__line ${isHex ? "tz-ds__line--pass" : ""} ${w <= weeksDone + (isHex ? 0 : 0) ? "tz-ds__line--on" : ""}`} />}
        <span className={`tz-ds__node ${isHex ? "tz-ds__hex" : ""} ${state ? `${isHex ? "tz-ds__hex--" : "tz-ds__node--"}${state}` : ""} ${canClaim && isHex ? "tz-ds__hex--ready" : ""}`}>
          {state === "done" ? <Check size={18} strokeWidth={3} color={isHex ? "#3b2500" : undefined} /> : isHex && !rw ? <span style={{ width: 6, height: 6, borderRadius: 3, background: "rgba(127,140,170,.7)" }} /> : w}
          {rw && <span className="tz-ds__rw" style={{ "--c": RARITY[rw.rarity].color }}><Gift /></span>}
        </span>
        {canClaim ? (
          <button type="button" className={`tz-ds__claim ${isHex ? "tz-ds__claim--pass" : ""}`} onClick={() => onClaim && onClaim({ track, week: w, ...rw })}>Claim</button>
        ) : (
          <span className="tz-ds__name">{rw ? `${rw.label}` : ""}</span>
        )}
      </div>
    );
  });

  return (
    <div className={`tz-ds ${className}`} style={vars}>
      <div className="tz-ds__head">
        <div><b style={{ fontSize: 15 }}>{SEASON.name}: {SEASON.subtitle}</b><div style={{ fontSize: 12, color: palette.textMuted }}>Meet your own rules each week to move forward</div></div>
        <div style={{ fontSize: 12, color: palette.textMuted, whiteSpace: "nowrap" }}>Week <b style={{ color: palette.text }}>{Math.min(weeksDone + 1, SEASON.weeks)}</b> of {SEASON.weeks}</div>
      </div>
      <div style={{ fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: palette.textFaint, margin: "0 0 6px" }}>Free track</div>
      <div className="tz-ds__grid">{row("free")}</div>
      <div style={{ fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: palette.textFaint, margin: "14px 0 6px" }}>Supporter pass</div>
      <div style={{ position: "relative" }}>
        <div className="tz-ds__grid">{row("pass")}</div>
        {!hasPass && (
          <div className="tz-ds__lock"><Lock size={15} /> Extra rewards on the supporter pass {onGetPass && <button type="button" className="tz-ds__cta" onClick={onGetPass}>Get the pass</button>}</div>
        )}
      </div>
      <div style={{ marginTop: 10, fontSize: 11, color: palette.textFaint }}>Cosmetics only. Rewards never change limits, tools or calculations.{" "}{Object.values(KIND_LABEL).join(" / ")}</div>
    </div>
  );
}
