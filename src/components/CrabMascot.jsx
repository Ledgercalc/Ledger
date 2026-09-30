import { useCallback, useEffect, useRef, useState } from "react";
import { CRAB_EVENT } from "../lib/mascot.js";
import { palette } from "../lib/theme.js";

const SLEEP_AFTER_MS = 45000;
const MOOD_MS = { win: 1700, loss: 1900, save: 1100, edit: 1100, streak: 2000, limit: 2300, goal: 2400, revenge: 1500, sent: 1300, peek: 800, poof: 900, type: 650, tap: 900, wave: 1600 };
const LINES = {
  win: ["Nice one!", "Shell yeah!", "Green candle!"],
  loss: ["Shell-shocked...", "Next one.", "Breathe."],
  save: ["Saved!"],
  edit: ["Updated!", "Got it."],
  streak: ["On fire!", "Hat trick!"],
  limit: ["Enough for today.", "Step back."],
  goal: ["Goal smashed!"],
  revenge: ["Cool off...", "Revenge?"],
  sent: ["Sent!"],
  poof: ["Poof."],
  tap: ["Hi!", "Crunching...", "Tap tap."],
};
const pick = (arr) => (arr && arr.length ? arr[Math.floor(Math.random() * arr.length)] : "");

function fmtAmt(n) {
  const v = Math.abs(Number(n) || 0);
  if (v >= 100000) return `${Math.round(v / 1000)}k`;
  if (v >= 10000) return `${(v / 1000).toFixed(1)}k`;
  return String(Math.round(v * 100) / 100).slice(0, 6);
}

function screenFor(mood, d) {
  switch (mood) {
    case "win": return `+${fmtAmt(d.amount)}`;
    case "loss": return `-${fmtAmt(d.amount)}`;
    case "save": return "OK";
    case "edit": return "OK";
    case "streak": return `x${d.count || 3}`;
    case "limit": return "STOP";
    case "goal": return "GOAL";
    case "revenge": return "NO!";
    case "sent": return "SENT";
    case "poof": return "C";
    case "tap": return "42.";
    case "wave": return "Hi";
    case "type": return d.text || String(Math.floor(Math.random() * 9000 + 1000));
    default: return "0.";
  }
}

const CSS = `
.tz-crab{position:relative;display:block;background:none;border:0;padding:0;cursor:pointer;line-height:0;-webkit-tap-highlight-color:transparent}
.tz-crab svg{display:block;overflow:visible}
.tz-crab__screen{fill:#BFD9C8;transition:fill .2s}
.tz-crab__digits{fill:#22302A;font-family:ui-monospace,Menlo,Consolas,monospace;font-weight:700;font-size:10px}
.tz-crab__spark,.tz-crab__zzz{opacity:0}
.tz-crab__all{animation:tzCrabBob 3.4s ease-in-out infinite}
.tz-crab__eye{transform-box:fill-box;transform-origin:center;animation:tzCrabBlink 4.6s infinite}
.tz-crab__pupil{animation:tzCrabLook 7s ease-in-out infinite}
.tz-crab__eyes{transform-origin:48px 74px;animation:tzCrabStalk 5s ease-in-out infinite}
.tz-crab__claw{transform-origin:30px 82px}
.tz-crab__claw2{transform-origin:68px 80px}
.tz-crab__pincer-up{transform-origin:20px 74px}
@keyframes tzCrabBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-1.5px)}}
@keyframes tzCrabBlink{0%,93%,100%{transform:scaleY(1)}96%{transform:scaleY(.1)}}
@keyframes tzCrabLook{0%,40%,100%{transform:translateX(0)}50%,80%{transform:translateX(-1.6px)}}
@keyframes tzCrabStalk{0%,100%{transform:rotate(0)}50%{transform:rotate(3deg)}}
@keyframes tzCrabHop{0%,100%{transform:translateY(0) scale(1,1)}15%{transform:translateY(0) scale(1.06,.94)}50%{transform:translateY(-16px) scale(.96,1.05)}85%{transform:translateY(0) scale(1.04,.96)}}
@keyframes tzCrabHopS{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
@keyframes tzCrabPump{0%,100%{transform:rotate(0)}50%{transform:rotate(-28deg)}}
@keyframes tzCrabWave{0%,100%{transform:rotate(0)}50%{transform:rotate(-34deg)}}
@keyframes tzCrabSnap{0%,100%{transform:rotate(0)}50%{transform:rotate(-16deg)}}
@keyframes tzCrabTap{0%,100%{transform:rotate(0)}50%{transform:rotate(-18deg)}}
@keyframes tzCrabKey{0%,100%{opacity:1}50%{opacity:.55}}
@keyframes tzCrabShrink{0%,100%{transform:translateX(0) scale(1)}15%,75%{transform:translateX(10px) scale(.92)}}
@keyframes tzCrabNod{0%,100%{transform:rotate(0)}30%{transform:rotate(12deg) translateY(2px)}60%{transform:rotate(-3deg)}}
@keyframes tzCrabNodBody{0%,100%{transform:translateY(0)}35%{transform:translateY(2px)}}
@keyframes tzCrabDance{0%,100%{transform:rotate(0) translateY(0)}25%{transform:rotate(-7deg) translateY(-8px)}75%{transform:rotate(7deg) translateY(-8px)}}
@keyframes tzCrabBigHop{0%,100%{transform:translateY(0) scale(1,1)}20%{transform:translateY(0) scale(1.08,.92)}55%{transform:translateY(-22px) scale(.95,1.08)}}
@keyframes tzCrabHide{0%,100%{transform:translateX(0) scale(1)}15%,85%{transform:translateX(14px) scale(.8)}}
@keyframes tzCrabShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-3px)}40%{transform:translateX(3px)}60%{transform:translateX(-3px)}80%{transform:translateX(3px)}}
@keyframes tzCrabHeadShake{0%,100%{transform:rotate(0)}25%{transform:rotate(-9deg)}75%{transform:rotate(9deg)}}
@keyframes tzCrabPeek{0%,100%{transform:translateX(0)}30%,70%{transform:translateX(-5px)}}
@keyframes tzCrabSquish{0%,100%{transform:scale(1,1)}40%{transform:scale(1.1,.82)}}
@keyframes tzCrabSpark{0%{opacity:0;transform:scale(.2)}40%{opacity:1;transform:scale(1.2)}100%{opacity:0;transform:scale(.8) translateY(-6px)}}
@keyframes tzCrabZ{0%{opacity:0;transform:translate(0,4px)}40%{opacity:1}100%{opacity:0;transform:translate(6px,-10px)}}
@keyframes tzCrabBreath{0%,100%{transform:scale(1)}50%{transform:scale(1.02,1.03)}}
@keyframes tzCrabPop{from{opacity:0;transform:translateY(3px) scale(.96)}to{opacity:1;transform:none}}
.tz-crab__spark,.tz-crab__spark path{transform-box:fill-box;transform-origin:center}
.tz-crab--win .tz-crab__all{animation:tzCrabHop .8s ease-out 2}
.tz-crab--win .tz-crab__claw{animation:tzCrabPump .4s ease-in-out 4}
.tz-crab--win .tz-crab__screen{fill:#9BE7B0}
.tz-crab--win .tz-crab__spark,.tz-crab--streak .tz-crab__spark,.tz-crab--goal .tz-crab__spark{animation:tzCrabSpark 1.2s ease-out both}
.tz-crab--win .tz-crab__spark:nth-of-type(2),.tz-crab--streak .tz-crab__spark:nth-of-type(2),.tz-crab--goal .tz-crab__spark:nth-of-type(2){animation-delay:.15s}
.tz-crab--win .tz-crab__spark:nth-of-type(3),.tz-crab--streak .tz-crab__spark:nth-of-type(3),.tz-crab--goal .tz-crab__spark:nth-of-type(3){animation-delay:.3s}
.tz-crab--loss .tz-crab__all{animation:tzCrabShrink 1.9s ease-in-out 1}
.tz-crab--loss .tz-crab__eyes,.tz-crab--worry .tz-crab__eyes{animation:none}
.tz-crab--loss .tz-crab__eyes{transform:rotate(14deg)}
.tz-crab--worry .tz-crab__eyes{transform:rotate(8deg)}
.tz-crab--loss .tz-crab__screen{fill:#F1A3A3}
.tz-crab--type .tz-crab__claw2{animation:tzCrabTap .28s ease-in-out infinite}
.tz-crab--type .tz-crab__key{animation:tzCrabKey .5s infinite}
.tz-crab--type .tz-crab__key:nth-child(odd){animation-delay:.2s}
.tz-crab--type .tz-crab__pupil{animation:none;transform:translateY(1.4px)}
.tz-crab--tap .tz-crab__all,.tz-crab--save .tz-crab__all{animation:tzCrabHopS .5s ease-out 1}
.tz-crab--tap .tz-crab__pincer-up,.tz-crab--save .tz-crab__pincer-up{animation:tzCrabSnap .25s ease-in-out 3}
.tz-crab--save .tz-crab__screen{fill:#9BE7B0}
.tz-crab--wave .tz-crab__claw{animation:tzCrabWave .5s ease-in-out 3}
.tz-crab--edit .tz-crab__eyes{animation:tzCrabNod .38s ease-in-out 3}
.tz-crab--edit .tz-crab__all{animation:tzCrabNodBody .38s ease-in-out 3}
.tz-crab--edit .tz-crab__screen{fill:#E6D8A8}
.tz-crab--streak .tz-crab__all{animation:tzCrabDance .5s ease-in-out 4}
.tz-crab--streak .tz-crab__claw,.tz-crab--goal .tz-crab__claw{animation:tzCrabPump .4s ease-in-out 5}
.tz-crab--streak .tz-crab__claw2,.tz-crab--goal .tz-crab__claw2{animation:tzCrabTap .28s ease-in-out infinite}
.tz-crab--streak .tz-crab__screen,.tz-crab--goal .tz-crab__screen{fill:#9BE7B0}
.tz-crab--goal .tz-crab__all{animation:tzCrabBigHop .8s ease-out 3}
.tz-crab--limit .tz-crab__all{animation:tzCrabHide 2.3s ease-in-out 1}
.tz-crab--limit .tz-crab__eyes{animation:none;transform:rotate(14deg)}
.tz-crab--limit .tz-crab__screen{fill:#F1C08A}
.tz-crab--revenge .tz-crab__all{animation:tzCrabShake .3s linear 4}
.tz-crab--revenge .tz-crab__eyes{animation:tzCrabHeadShake .4s ease-in-out 3}
.tz-crab--revenge .tz-crab__screen{fill:#F1A3A3}
.tz-crab--sent .tz-crab__all{animation:tzCrabHopS .5s ease-out 1}
.tz-crab--sent .tz-crab__claw{animation:tzCrabWave .5s ease-in-out 3}
.tz-crab--sent .tz-crab__screen{fill:#9BE7B0}
.tz-crab--peek .tz-crab__all{animation:tzCrabPeek .8s ease-in-out 1}
.tz-crab--peek .tz-crab__pupil{animation:none;transform:translateX(-1.6px)}
.tz-crab--poof .tz-crab__all{animation:tzCrabSquish .5s ease-out 1}
.tz-crab--sleep .tz-crab__all{animation:tzCrabBreath 3.2s ease-in-out infinite}
.tz-crab--sleep .tz-crab__eye{animation:none;transform:scaleY(.12)}
.tz-crab--sleep .tz-crab__eyes{animation:none}
.tz-crab--sleep .tz-crab__zzz{opacity:1;animation:tzCrabZ 2.6s ease-in-out infinite}
.tz-crab__bubble{position:absolute;right:calc(100% - 6px);top:4px;white-space:nowrap;font-size:11px;line-height:1.3;padding:4px 9px;border-radius:999px;animation:tzCrabPop .25s ease-out;pointer-events:none}
@media (prefers-reduced-motion: reduce){.tz-crab *,.tz-crab__bubble{animation:none !important}}
`;

// Hermit crab wearing a calculator as its shell.
// Props: size (px height), rest ("worry" = worried resting pose), enabled (false = render nothing).
export default function CrabMascot({ size = 92, rest, enabled = true }) {
  const [mood, setMood] = useState("");
  const [screen, setScreen] = useState("0.");
  const [bubble, setBubble] = useState("");
  const moodTimer = useRef(0);
  const sleepTimer = useRef(0);
  const bubbleTimer = useRef(0);
  const typeGate = useRef(0);

  const armSleep = useCallback(() => {
    clearTimeout(sleepTimer.current);
    sleepTimer.current = setTimeout(() => {
      setMood("sleep");
      setScreen("Zz");
    }, SLEEP_AFTER_MS);
  }, []);

  const react = useCallback(
    (next, detail = {}) => {
      clearTimeout(moodTimer.current);
      setMood(next);
      setScreen(screenFor(next, detail));
      const line = detail.say !== undefined ? detail.say : pick(LINES[next]);
      clearTimeout(bubbleTimer.current);
      if (line) {
        setBubble(line);
        bubbleTimer.current = setTimeout(() => setBubble(""), 2200);
      } else {
        setBubble("");
      }
      moodTimer.current = setTimeout(() => {
        setMood("");
        setScreen("0.");
      }, MOOD_MS[next] || 1200);
      armSleep();
    },
    [armSleep]
  );

  useEffect(() => {
    if (!enabled) return undefined;
    const waveTimer = setTimeout(() => react("wave", { say: "" }), 0);
    const onPoke = (e) => {
      const d = (e && e.detail) || {};
      if (!d.mood) return;
      if (d.mood === "type") {
        const now = Date.now();
        if (now - typeGate.current < 120) return;
        typeGate.current = now;
        d.say = "";
      }
      react(d.mood, d);
    };
    window.addEventListener(CRAB_EVENT, onPoke);
    return () => {
      window.removeEventListener(CRAB_EVENT, onPoke);
      clearTimeout(waveTimer);
      clearTimeout(moodTimer.current);
      clearTimeout(sleepTimer.current);
      clearTimeout(bubbleTimer.current);
    };
  }, [enabled, react]);

  if (!enabled) return null;
  const effective = mood || rest || "idle";
  const W = Math.round(size * 1.27);
  const sad = effective === "loss" || effective === "worry" || effective === "limit";
  const asleep = effective === "sleep";

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <style>{CSS}</style>
      <button
        type="button"
        className={`tz-crab tz-crab--${effective}`}
        onClick={() => react("tap")}
        aria-label="Tredzi the hermit crab. Tap to say hi."
      >
        <svg viewBox="0 0 140 110" width={W} height={size} aria-hidden="true">
          <ellipse cx="70" cy="101" rx="42" ry="5" fill="#000" opacity=".16" />
          <g className="tz-crab__all">
            {/* calculator shell */}
            <g transform="rotate(-10 90 56)">
              <rect x="62" y="16" width="56" height="76" rx="9" fill="#2E3440" stroke="#4C566A" strokeWidth="1.5" />
              <rect className="tz-crab__screen" x="68" y="22" width="44" height="18" rx="3" fill="#BFD9C8" />
              <text className="tz-crab__digits" x="109" y="35" textAnchor="end" fill="#22302A" fontFamily="ui-monospace,Menlo,Consolas,monospace" fontWeight="700" fontSize="10">{screen}</text>
              {[0, 1, 2, 3].map((r) =>
                [0, 1, 2].map((c) => {
                  const last = c === 2;
                  const eq = r === 3 && c === 2;
                  return (
                    <rect
                      key={`${r}-${c}`}
                      className="tz-crab__key"
                      x={70 + c * 14}
                      y={46 + r * 11}
                      width="11"
                      height="8"
                      rx="2"
                      fill={eq ? "#EE8463" : last ? (palette.gold || "#D9A441") : "#5E6778"}
                    />
                  );
                })
              )}
            </g>
            {/* legs */}
            {[34, 44, 54, 64].map((x, i) => (
              <line key={x} x1={x} y1={90} x2={x - 4 + (i % 2)} y2={98} stroke="#C65A3E" strokeWidth="3" strokeLinecap="round" />
            ))}
            {/* body */}
            <ellipse cx="50" cy="84" rx="26" ry="13" fill="#EE8463" />
            <ellipse cx="50" cy="88" rx="18" ry="6" fill="#F6A98F" opacity=".6" />
            {/* eye stalks */}
            <g className="tz-crab__eyes">
              <line x1="42" y1="74" x2="40" y2="58" stroke="#EE8463" strokeWidth="3.5" strokeLinecap="round" />
              <line x1="54" y1="73" x2="55" y2="56" stroke="#EE8463" strokeWidth="3.5" strokeLinecap="round" />
              <g className="tz-crab__eye"><circle cx="40" cy="55" r="5" fill="#fff" /><circle className="tz-crab__pupil" cx="41" cy="55.5" r="2.4" fill="#1F2430" /></g>
              <g className="tz-crab__eye"><circle cx="55" cy="53" r="5" fill="#fff" /><circle className="tz-crab__pupil" cx="56" cy="53.5" r="2.4" fill="#1F2430" /></g>
            </g>
            {effective === "goal" && (
              <g>
                <path d="M33 52 L41 34 L49 52 Z" fill={palette.gold || "#D9A441"} stroke="#7A2E1C" strokeWidth="1" />
                <circle cx="41" cy="33" r="2.6" fill="#EE8463" />
              </g>
            )}
            {effective === "revenge" && (
              <g stroke="#7A2E1C" strokeWidth="2" strokeLinecap="round">
                <line x1="34" y1="47" x2="45" y2="51" />
                <line x1="50" y1="48" x2="61" y2="44" />
              </g>
            )}
            <path
              d={sad ? "M45 89 Q49 85 53 89" : asleep ? "M45 87 L53 87" : "M45 86 Q49 90 53 86"}
              fill="none"
              stroke="#7A2E1C"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            {sad && <path d="M32 50 q3 5 0 7 q-3 -2 0 -7z" fill="#7EC8F2" />}
            {/* big claw */}
            <g className="tz-crab__claw">
              <line x1="30" y1="82" x2="20" y2="76" stroke="#EE8463" strokeWidth="5" strokeLinecap="round" />
              <ellipse className="tz-crab__pincer-up" cx="13" cy="70" rx="8" ry="4.5" transform="rotate(-35 13 70)" fill="#EE8463" />
              <ellipse cx="12" cy="78" rx="7" ry="4" transform="rotate(25 12 78)" fill="#E0694B" />
            </g>
            {/* small claw that taps the keys */}
            <g className="tz-crab__claw2">
              <line x1="68" y1="80" x2="76" y2="74" stroke="#EE8463" strokeWidth="3.5" strokeLinecap="round" />
              <circle cx="78" cy="72" r="4.5" fill="#E0694B" />
            </g>
          </g>
          {/* effects */}
          {[[30, 38], [118, 18], [10, 52]].map(([x, y], i) => (
            <g key={i} className="tz-crab__spark" opacity="0" transform={`translate(${x} ${y})`}>
              <path d="M0 -5 L1.5 -1.5 L5 0 L1.5 1.5 L0 5 L-1.5 1.5 L-5 0 L-1.5 -1.5Z" fill={palette.gold || "#D9A441"} />
            </g>
          ))}
          <g className="tz-crab__zzz" opacity="0" fill={palette.textFaint || "#888"} fontFamily="ui-monospace,monospace" fontWeight="700">
            <text x="96" y="14" fontSize="11">z</text>
            <text x="106" y="6" fontSize="8">z</text>
          </g>
        </svg>
      </button>
      {bubble && (
        <span
          key={bubble}
          role="status"
          className="tz-crab__bubble"
          style={{ background: palette.surface, color: palette.text, border: `1px solid ${palette.border}` }}
        >
          {bubble}
        </span>
      )}
    </div>
  );
}
