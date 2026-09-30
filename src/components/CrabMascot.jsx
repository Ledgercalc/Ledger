import { useCallback, useEffect, useId, useRef, useState } from "react";
import { CRAB_EVENT } from "../lib/mascot.js";
import { palette } from "../lib/theme.js";

/* ──────────────────────────────────────────────────────────────────────────
   Tredzi the hermit crab
   A coral hermit crab living in a spiral shell, holding a pocket calculator.
   Reacts to app actions through pokeCrab(mood, detail) from lib/mascot.js.

   Props
     size     height in px (default 110)
     rest     resting pose when nothing is happening ("worry" etc.)
     enabled  false = render nothing
   ────────────────────────────────────────────────────────────────────────── */

const SLEEP_AFTER_MS = 45000;
const MOOD_MS = { win: 2100, loss: 2300, save: 1300, poof: 1100, type: 650, tap: 1100, wave: 1800 };
const LINES = {
  win: ["Nice one!", "Shell yeah!", "Green candle!"],
  loss: ["Shell-shocked...", "Next one.", "Breathe."],
  save: ["Saved!"],
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
    case "poof": return "C";
    case "tap": return "42.";
    case "wave": return "Hi";
    case "type": return d.text || String(Math.floor(Math.random() * 9000 + 1000));
    default: return "0.";
  }
}

/* ── styles ─────────────────────────────────────────────────────────────── */
const CSS = `
.tz-crab{position:relative;display:block;background:none;border:0;padding:0;cursor:pointer;line-height:0;-webkit-tap-highlight-color:transparent;border-radius:16px}
.tz-crab:focus-visible{outline:2px solid currentColor;outline-offset:3px}
.tz-crab svg{display:block;overflow:visible;transition:transform .15s ease-out}
.tz-crab:active svg{transform:scale(.97)}

.tz-crab__screen{fill:#C3DFCB;transition:fill .2s}
.tz-crab__digits{fill:#1F3028;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-weight:800;font-size:10.5px}
.tz-crab__spark,.tz-crab__zzz,.tz-crab__puff,.tz-crab__sweat,.tz-crab__confetti{opacity:0}
.tz-crab__spark,.tz-crab__puff,.tz-crab__confetti{transform-box:fill-box;transform-origin:center}

/* transform origins (all in SVG user units) */
.tz-crab__all{transform-origin:105px 152px}
.tz-crab__shell{transform-origin:158px 150px}
.tz-crab__front{transform-origin:100px 150px}
.tz-crab__body{transform-origin:98px 142px}
.tz-crab__eyes{transform-origin:94px 104px}
.tz-crab__ant{transform-origin:94px 100px}
.tz-crab__hold{transform-origin:48px 140px}
.tz-crab__sclaw{transform-origin:80px 126px}
.tz-crab__dact{transform-origin:22px -3px}
.tz-crab__mouth{transform-box:fill-box;transform-origin:center}

/* ── idle loop ── */
.tz-crab__all{animation:tzBob 3.6s ease-in-out infinite}
.tz-crab__body{animation:tzBreath 3.6s ease-in-out infinite}
.tz-crab__shell{animation:tzShellSway 6s ease-in-out infinite}
.tz-crab__eyes{animation:tzStalk 5.2s ease-in-out infinite}
.tz-crab__ant.l{animation:tzAntL 3.2s ease-in-out infinite}
.tz-crab__ant.r{animation:tzAntR 3.6s ease-in-out infinite}
.tz-crab__lid.t{animation:tzBlink 4.8s infinite}
.tz-crab__pupil{animation:tzLook 8s ease-in-out infinite}
.tz-crab__sclaw{animation:tzIdleTap 7s ease-in-out infinite}
.tz-crab__leg{animation:tzLeg 2.8s ease-in-out infinite}
.tz-crab__leg:nth-child(even){animation-delay:-1.4s}
.tz-crab__shine{animation:tzShine 6s ease-in-out infinite}
.tz-crab__lid.b{transform:translateY(14px)}

@keyframes tzBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-1.4px)}}
@keyframes tzBreath{0%,100%{transform:scale(1,1)}50%{transform:scale(1.015,1.03)}}
@keyframes tzShellSway{0%,100%{transform:rotate(0)}50%{transform:rotate(.9deg)}}
@keyframes tzStalk{0%,100%{transform:rotate(0)}50%{transform:rotate(2.4deg)}}
@keyframes tzAntL{0%,100%{transform:rotate(0)}50%{transform:rotate(-7deg)}}
@keyframes tzAntR{0%,100%{transform:rotate(0)}50%{transform:rotate(8deg)}}
@keyframes tzBlink{0%,92%,100%{transform:translateY(-13px)}95%{transform:translateY(10px)}98%{transform:translateY(-13px)}}
@keyframes tzLook{0%,35%,100%{transform:translate(0,0)}45%,70%{transform:translate(-2.2px,.4px)}80%,90%{transform:translate(1.4px,-.6px)}}
@keyframes tzIdleTap{0%,88%,100%{transform:rotate(0)}91%{transform:rotate(-7deg)}94%{transform:rotate(1deg)}97%{transform:rotate(-6deg)}}
@keyframes tzLeg{0%,100%{transform:rotate(0)}50%{transform:rotate(3deg)}}
@keyframes tzShine{0%,80%,100%{opacity:.5}90%{opacity:.95}}

/* ── keyframes used by moods ── */
@keyframes tzHop{0%,100%{transform:translateY(0) scale(1,1)}14%{transform:translateY(0) scale(1.06,.93)}48%{transform:translateY(-17px) scale(.96,1.05)}84%{transform:translateY(0) scale(1.05,.95)}}
@keyframes tzHopS{0%,100%{transform:translateY(0) scale(1,1)}20%{transform:translateY(0) scale(1.04,.96)}50%{transform:translateY(-8px) scale(.98,1.03)}}
@keyframes tzPump{0%,100%{transform:rotate(0)}50%{transform:rotate(38deg)}}
@keyframes tzWave{0%,100%{transform:rotate(50deg)}50%{transform:rotate(76deg)}}
@keyframes tzWaveUp{from{transform:rotate(0)}to{transform:rotate(50deg)}}
@keyframes tzSnap{0%,100%{transform:rotate(0)}50%{transform:rotate(-20deg)}}
@keyframes tzTap{0%,100%{transform:rotate(0)}45%{transform:rotate(-13deg) translateY(1.5px)}}
@keyframes tzKey{0%,100%{opacity:1;transform:translateY(0)}50%{opacity:.5;transform:translateY(.8px)}}
@keyframes tzRetreat{0%{transform:translateX(0) scale(1)}22%,78%{transform:translateX(11px) scale(.93)}100%{transform:translateX(0) scale(1)}}
@keyframes tzShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-1.6px)}40%{transform:translateX(1.6px)}60%{transform:translateX(-1.2px)}80%{transform:translateX(1.2px)}}
@keyframes tzShellBump{0%,100%{transform:rotate(0)}30%{transform:rotate(-2.6deg)}60%{transform:rotate(1.8deg)}}
@keyframes tzSquish{0%,100%{transform:scale(1,1)}30%{transform:scale(1.14,.8)}60%{transform:scale(.96,1.05)}}
@keyframes tzRaise{0%,100%{transform:translateY(0) rotate(0)}25%,70%{transform:translateY(-9px) rotate(-4deg)}}
@keyframes tzSpark{0%{opacity:0;transform:scale(.2) rotate(0)}40%{opacity:1;transform:scale(1.2) rotate(40deg)}100%{opacity:0;transform:scale(.7) translateY(-8px) rotate(90deg)}}
@keyframes tzConfetti{0%{opacity:0;transform:translate(0,4px) rotate(0)}25%{opacity:1}100%{opacity:0;transform:translate(var(--dx,6px),-22px) rotate(220deg)}}
@keyframes tzPuff{0%{opacity:0;transform:scale(.3)}30%{opacity:.95}100%{opacity:0;transform:scale(1.9) translateY(-6px)}}
@keyframes tzZ{0%{opacity:0;transform:translate(0,5px)}40%{opacity:1}100%{opacity:0;transform:translate(7px,-12px)}}
@keyframes tzSweat{0%{opacity:0;transform:translateY(-3px)}25%{opacity:1}100%{opacity:0;transform:translateY(12px)}}
@keyframes tzSleepBreath{0%,100%{transform:scale(1,1)}50%{transform:scale(1.025,1.05)}}
@keyframes tzGlow{0%,100%{opacity:0}50%{opacity:.85}}
@keyframes tzPop{from{opacity:0;transform:translateY(3px) scale(.94)}to{opacity:1;transform:none}}
@keyframes tzWorry{0%,100%{transform:translateX(0)}25%{transform:translateX(-.7px)}75%{transform:translateX(.7px)}}

/* ── WIN: hop, raise the calculator, pump the free claw, sparkle ── */
.tz-crab--win .tz-crab__all{animation:tzHop .75s ease-out 2}
.tz-crab--win .tz-crab__body{animation:none}
.tz-crab--win .tz-crab__hold{animation:tzRaise 1.5s ease-in-out 1}
.tz-crab--win .tz-crab__sclaw{animation:tzPump .36s ease-in-out 4}
.tz-crab--win .tz-crab__shell{animation:tzShellBump .75s ease-in-out 2}
.tz-crab--win .tz-crab__screen{fill:#9FEBB4}
.tz-crab--win .tz-crab__lid.b{transform:translateY(0)}
.tz-crab--win .tz-crab__lid.t{animation:none;transform:translateY(-13px)}
.tz-crab--win .tz-crab__spark{animation:tzSpark 1.3s ease-out both}
.tz-crab--win .tz-crab__spark:nth-of-type(2){animation-delay:.12s}
.tz-crab--win .tz-crab__spark:nth-of-type(3){animation-delay:.26s}
.tz-crab--win .tz-crab__spark:nth-of-type(4){animation-delay:.38s}
.tz-crab--win .tz-crab__confetti{animation:tzConfetti 1.3s ease-out both}
.tz-crab--win .tz-crab__confetti:nth-of-type(2n){animation-delay:.15s}
.tz-crab--win .tz-crab__confetti:nth-of-type(3n){animation-delay:.3s}
.tz-crab--win .tz-crab__glow{animation:tzGlow 1.4s ease-in-out 1}
.tz-crab--win .tz-crab__cheek{opacity:.75}

/* ── LOSS: retreats into the shell, eyes droop, screen turns red ── */
.tz-crab--loss .tz-crab__front{animation:tzRetreat 2.2s ease-in-out 1}
.tz-crab--loss .tz-crab__all{animation:none}
.tz-crab--loss .tz-crab__body{animation:none}
.tz-crab--loss .tz-crab__eyes,.tz-crab--worry .tz-crab__eyes{animation:none}
.tz-crab--loss .tz-crab__eyes{transform:rotate(9deg)}
.tz-crab--worry .tz-crab__eyes{transform:rotate(5deg)}
.tz-crab--loss .tz-crab__lid.t.l,.tz-crab--worry .tz-crab__lid.t.l{animation:none;transform:translateY(-4.5px) rotate(-18deg)}
.tz-crab--loss .tz-crab__lid.t.r,.tz-crab--worry .tz-crab__lid.t.r{animation:none;transform:translateY(-4.5px) rotate(18deg)}
.tz-crab--loss .tz-crab__pupil,.tz-crab--worry .tz-crab__pupil{animation:none;transform:translate(0,1.6px)}
.tz-crab--loss .tz-crab__screen{fill:#F3A9A9}
.tz-crab--loss .tz-crab__hold{animation:tzShake .5s ease-in-out 3}
.tz-crab--loss .tz-crab__shell{animation:tzShellBump 1.2s ease-in-out 1}
.tz-crab--loss .tz-crab__sclaw,.tz-crab--worry .tz-crab__sclaw{animation:none;transform:rotate(-26deg)}
.tz-crab--loss .tz-crab__sweat,.tz-crab--worry .tz-crab__sweat{animation:tzSweat 2s ease-in infinite}
.tz-crab--worry .tz-crab__front{animation:tzWorry .45s ease-in-out infinite}
.tz-crab--worry .tz-crab__antennas{opacity:.85}

/* ── TYPE: free claw taps the keys, eyes watch the screen ── */
.tz-crab--type .tz-crab__sclaw{animation:tzTap .26s ease-in-out infinite}
.tz-crab--type .tz-crab__key{animation:tzKey .42s infinite}
.tz-crab--type .tz-crab__key:nth-child(3n){animation-delay:.14s}
.tz-crab--type .tz-crab__key:nth-child(5n){animation-delay:.27s}
.tz-crab--type .tz-crab__key:nth-child(7n){animation-delay:.07s}
.tz-crab--type .tz-crab__pupil{animation:none;transform:translate(-2.4px,2px)}
.tz-crab--type .tz-crab__body{animation:tzHopS .52s ease-out infinite}

/* ── TAP (click) & SAVE: little hop and a claw snap ── */
.tz-crab--tap .tz-crab__all,.tz-crab--save .tz-crab__all{animation:tzHopS .55s ease-out 1}
.tz-crab--tap .tz-crab__sclaw{animation:tzWaveUp .2s ease-out forwards}
.tz-crab--tap .tz-crab__dact,.tz-crab--save .tz-crab__dact,.tz-crab--wave .tz-crab__dact{animation:tzSnap .22s ease-in-out 4}
.tz-crab--tap .tz-crab__cheek{opacity:.75}
.tz-crab--save .tz-crab__sclaw{animation:tzTap .22s ease-in-out 3}
.tz-crab--save .tz-crab__screen{fill:#9FEBB4}
.tz-crab--save .tz-crab__spark{animation:tzSpark 1s ease-out both}
.tz-crab--save .tz-crab__spark:nth-of-type(3){animation-delay:.2s}

/* ── WAVE: hello ── */
.tz-crab--wave .tz-crab__sclaw{animation:tzWaveUp .25s ease-out forwards,tzWave .5s ease-in-out .25s 3}
.tz-crab--wave .tz-crab__cheek{opacity:.75}

/* ── POOF (delete): squish + smoke ── */
.tz-crab--poof .tz-crab__all{animation:tzSquish .55s ease-out 1}
.tz-crab--poof .tz-crab__puff{animation:tzPuff .85s ease-out both}
.tz-crab--poof .tz-crab__puff:nth-of-type(2){animation-delay:.08s}
.tz-crab--poof .tz-crab__puff:nth-of-type(3){animation-delay:.16s}
.tz-crab--poof .tz-crab__lid.t{animation:none;transform:translateY(-6px)}
.tz-crab--poof .tz-crab__pupil{animation:none;transform:translate(-1.5px,-1px)}

/* ── SLEEP ── */
.tz-crab--sleep .tz-crab__all{animation:tzSleepBreath 3.4s ease-in-out infinite}
.tz-crab--sleep .tz-crab__body,.tz-crab--sleep .tz-crab__eyes,.tz-crab--sleep .tz-crab__sclaw,.tz-crab--sleep .tz-crab__ant{animation:none}
.tz-crab--sleep .tz-crab__eyes{transform:rotate(6deg)}
.tz-crab--sleep .tz-crab__sclaw{transform:rotate(-14deg)}
.tz-crab--sleep .tz-crab__front{transform:translateX(3px)}
.tz-crab--sleep .tz-crab__lid.t{animation:none;transform:translateY(9px)}
.tz-crab--sleep .tz-crab__zzz{opacity:1;animation:tzZ 2.8s ease-in-out infinite}
.tz-crab--sleep .tz-crab__zzz text:nth-child(2){animation:tzZ 2.8s ease-in-out .7s infinite}

/* ── speech bubble ── */
.tz-crab__bubble{position:absolute;right:calc(100% - 10px);top:10px;white-space:nowrap;font-size:11.5px;font-weight:600;line-height:1.3;padding:5px 11px;border-radius:14px;background:var(--tzb);color:var(--tzt);border:1px solid var(--tzbd);box-shadow:0 2px 8px rgba(0,0,0,.14);animation:tzPop .25s ease-out;pointer-events:none}
.tz-crab__bubble::after{content:"";position:absolute;right:-5px;top:50%;width:8px;height:8px;margin-top:-4px;background:var(--tzb);border-top:1px solid var(--tzbd);border-right:1px solid var(--tzbd);transform:rotate(45deg)}

@media (prefers-reduced-motion: reduce){.tz-crab *,.tz-crab__bubble{animation:none !important}}
`;

/* ── reusable claw (drawn pointing +x, wrist at 0,0) ─────────────────────── */
function Claw({ g }) {
  return (
    <g>
      {/* fixed finger */}
      <path d="M19 3 C28 6 37 4 43 -3 C44 6 35 12 21 11 Z" fill={`url(#${g}-claw2)`} stroke="#B63F27" strokeWidth=".8" strokeLinejoin="round" />
      {/* palm */}
      <path d="M-1 -9 C8 -13 19 -12 25 -7 C28 -3 28 4 25 8 C19 12 8 12 -1 9 C-4 4 -4 -4 -1 -9 Z" fill={`url(#${g}-claw)`} stroke="#B63F27" strokeWidth=".9" strokeLinejoin="round" />
      {/* moving finger */}
      <g className="tz-crab__dact">
        <path d="M19 -10 C30 -14 40 -9 44 0 C36 -3 27 -2 19 3 Z" fill={`url(#${g}-claw2)`} stroke="#B63F27" strokeWidth=".8" strokeLinejoin="round" />
        <path d="M38 -6 C40 -4 42 -2 43 0" stroke="#FFE2D3" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity=".8" />
      </g>
      {/* highlight + grain */}
      <ellipse cx="11" cy="-5.5" rx="8" ry="2.6" fill="#fff" opacity=".28" transform="rotate(-8 11 -5.5)" />
      <circle cx="6" cy="3" r="1" fill="#B63F27" opacity=".28" />
      <circle cx="13" cy="5" r="1.1" fill="#B63F27" opacity=".24" />
      <circle cx="18" cy="1" r=".9" fill="#B63F27" opacity=".24" />
    </g>
  );
}

function Spark({ x, y, s = 1, fill }) {
  return (
    <g className="tz-crab__spark" transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 -6 L1.7 -1.7 L6 0 L1.7 1.7 L0 6 L-1.7 1.7 L-6 0 L-1.7 -1.7Z" fill={fill} />
    </g>
  );
}

/* ── component ──────────────────────────────────────────────────────────── */
export default function CrabMascot({ size = 110, rest, enabled = true }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const g = `tzc${uid}`;
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
        bubbleTimer.current = setTimeout(() => setBubble(""), 2300);
      } else {
        setBubble("");
      }
      moodTimer.current = setTimeout(() => {
        setMood("");
        setScreen("0.");
      }, MOOD_MS[next] || 1300);
      armSleep();
    },
    [armSleep]
  );

  useEffect(() => {
    if (!enabled) return undefined;
    react("wave", { say: "" });
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
      clearTimeout(moodTimer.current);
      clearTimeout(sleepTimer.current);
      clearTimeout(bubbleTimer.current);
    };
  }, [enabled, react]);

  if (!enabled) return null;

  const effective = mood || rest || "idle";
  const W = Math.round((size * 210) / 166);
  const gold = palette.gold || "#E3B04B";
  const sad = effective === "loss" || effective === "worry";
  const asleep = effective === "sleep";

  // mouth shape per mood
  let mouthD = "M86.5 125 Q93 131.5 99.5 125";
  let mouthFill = "none";
  if (sad) mouthD = "M87 129 Q93 123.5 99 129";
  else if (asleep) mouthD = "M89 126 Q93 128.5 97 126";
  else if (effective === "win") { mouthD = "M85 124 Q93 136 101 124 Q93 127 85 124 Z"; mouthFill = "#7A2618"; }
  else if (effective === "tap" || effective === "poof") { mouthD = "M90 124 Q93 131 96 124 Q93 122 90 124 Z"; mouthFill = "#7A2618"; }
  else if (effective === "type") mouthD = "M88.5 126 Q93 128.5 97.5 126";

  const bubbleVars = { "--tzb": palette.surface, "--tzt": palette.text, "--tzbd": palette.border };

  return (
    <div style={{ position: "relative", display: "inline-block", ...bubbleVars }}>
      <style>{CSS}</style>
      <button
        type="button"
        className={`tz-crab tz-crab--${effective}`}
        onClick={() => react("tap")}
        aria-label="Tredzi the hermit crab. Tap to say hi."
        style={{ color: palette.text }}
      >
        <svg viewBox="0 0 210 166" width={W} height={size} aria-hidden="true">
          <defs>
            <radialGradient id={`${g}-shell`} cx="34%" cy="28%" r="80%">
              <stop offset="0" stopColor="#FFFAF0" />
              <stop offset=".45" stopColor="#F8E2C2" />
              <stop offset="1" stopColor="#DFAE80" />
            </radialGradient>
            <radialGradient id={`${g}-inner`} cx="60%" cy="50%" r="70%">
              <stop offset="0" stopColor="#7C3A4B" />
              <stop offset="1" stopColor="#36171F" />
            </radialGradient>
            <linearGradient id={`${g}-body`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#FF9B75" />
              <stop offset=".55" stopColor="#F2714E" />
              <stop offset="1" stopColor="#CF4B30" />
            </linearGradient>
            <linearGradient id={`${g}-claw`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#FF9C78" />
              <stop offset="1" stopColor="#E25A3A" />
            </linearGradient>
            <linearGradient id={`${g}-claw2`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#F2714E" />
              <stop offset="1" stopColor="#D24A30" />
            </linearGradient>
            <linearGradient id={`${g}-calc`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#4B5367" />
              <stop offset="1" stopColor="#242935" />
            </linearGradient>
            <linearGradient id={`${g}-glare`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#fff" stopOpacity=".55" />
              <stop offset=".5" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
            <radialGradient id={`${g}-eye`} cx="40%" cy="35%" r="75%">
              <stop offset="0" stopColor="#fff" />
              <stop offset="1" stopColor="#E4E9F2" />
            </radialGradient>
            <radialGradient id={`${g}-glow`} cx="50%" cy="50%" r="50%">
              <stop offset="0" stopColor={gold} stopOpacity=".55" />
              <stop offset="1" stopColor={gold} stopOpacity="0" />
            </radialGradient>
            <clipPath id={`${g}-eyeclip`}><circle cx="0" cy="0" r="8.6" /></clipPath>
            <clipPath id={`${g}-w1`}><path d="M-38 10 C-38 -16 -16 -30 8 -30 C32 -30 46 -10 44 14 C42 40 20 52 -6 50 C-26 48 -38 34 -38 10Z" /></clipPath>
            <clipPath id={`${g}-w2`}><path d="M-10 -22 C-10 -40 4 -50 20 -50 C36 -50 44 -38 42 -24 C40 -10 26 -4 10 -6 C-4 -8 -10 -12 -10 -22Z" /></clipPath>
            <clipPath id={`${g}-w3`}><path d="M6 -52 C6 -64 14 -72 24 -72 C34 -72 40 -64 38 -54 C36 -46 28 -42 18 -43 C10 -44 6 -46 6 -52Z" /></clipPath>
            <clipPath id={`${g}-screen`}><rect x="-18.5" y="-26" width="37" height="17" rx="3" /></clipPath>
          </defs>

          {/* ground shadow */}
          <ellipse cx="112" cy="154" rx="84" ry="6.5" fill="#000" opacity=".17" />
          <ellipse cx="112" cy="154" rx="56" ry="4" fill="#000" opacity=".12" />

          <g className="tz-crab__all">
            {/* ═══ SHELL (spiral whelk) ═══ */}
            <g className="tz-crab__shell">
              <g transform="translate(159 106) rotate(5) scale(.92)">
                {/* apex */}
                <path d="M18 -68 C20 -78 26 -86 33 -91 C36 -83 39 -74 37 -66 C31 -62 22 -62 18 -68Z" fill={`url(#${g}-shell)`} stroke="#C4905F" strokeWidth="1.3" strokeLinejoin="round" />
                <path d="M24 -72 Q30 -77 34 -84" stroke="#B85C6E" strokeWidth="2" strokeLinecap="round" fill="none" opacity=".55" />

                {/* whorl 3 */}
                <path d="M6 -52 C6 -64 14 -72 24 -72 C34 -72 40 -64 38 -54 C36 -46 28 -42 18 -43 C10 -44 6 -46 6 -52Z" fill={`url(#${g}-shell)`} stroke="#C4905F" strokeWidth="1.4" strokeLinejoin="round" />
                <g clipPath={`url(#${g}-w3)`} fill="none" strokeLinecap="round">
                  <path d="M3 -62 Q22 -69 41 -61" stroke="#B85C6E" strokeWidth="4.6" opacity=".5" />
                  <path d="M3 -51 Q22 -58 41 -50" stroke="#B85C6E" strokeWidth="4.6" opacity=".5" />
                  <path d="M3 -56.4 Q22 -63.4 41 -55.4" stroke="#fff" strokeWidth="1" opacity=".5" />
                </g>

                {/* whorl 2 */}
                <path d="M-10 -22 C-10 -40 4 -50 20 -50 C36 -50 44 -38 42 -24 C40 -10 26 -4 10 -6 C-4 -8 -10 -12 -10 -22Z" fill={`url(#${g}-shell)`} stroke="#C4905F" strokeWidth="1.5" strokeLinejoin="round" />
                <g clipPath={`url(#${g}-w2)`} fill="none" strokeLinecap="round">
                  <path d="M-13 -38 Q16 -47 45 -35" stroke="#B85C6E" strokeWidth="5.4" opacity=".5" />
                  <path d="M-13 -24 Q16 -33 45 -21" stroke="#B85C6E" strokeWidth="5.4" opacity=".5" />
                  <path d="M-13 -10 Q16 -19 45 -7" stroke="#B85C6E" strokeWidth="5.4" opacity=".5" />
                  <path d="M-13 -31 Q16 -40 45 -28" stroke="#fff" strokeWidth="1.1" opacity=".5" />
                  <path d="M-13 -17 Q16 -26 45 -14" stroke="#fff" strokeWidth="1.1" opacity=".5" />
                </g>

                {/* body whorl */}
                <path d="M-38 10 C-38 -16 -16 -30 8 -30 C32 -30 46 -10 44 14 C42 40 20 52 -6 50 C-26 48 -38 34 -38 10Z" fill={`url(#${g}-shell)`} stroke="#C4905F" strokeWidth="1.7" strokeLinejoin="round" />
                <g clipPath={`url(#${g}-w1)`} fill="none" strokeLinecap="round">
                  <path d="M-42 -2 Q4 -18 48 -4" stroke="#B85C6E" strokeWidth="6.6" opacity=".5" />
                  <path d="M-42 15 Q4 -1 48 13" stroke="#B85C6E" strokeWidth="6.6" opacity=".5" />
                  <path d="M-42 32 Q4 16 48 30" stroke="#B85C6E" strokeWidth="6.6" opacity=".5" />
                  <path d="M-40 49 Q4 33 48 47" stroke="#B85C6E" strokeWidth="6.6" opacity=".5" />
                  <path d="M-42 6.5 Q4 -9.5 48 4.5" stroke="#fff" strokeWidth="1.3" opacity=".55" />
                  <path d="M-42 23.5 Q4 7.5 48 21.5" stroke="#fff" strokeWidth="1.3" opacity=".55" />
                  <path d="M-40 41 Q4 25 48 39" stroke="#fff" strokeWidth="1.3" opacity=".55" />
                  {/* speckles */}
                  <g fill="#9C4A5E" stroke="none" opacity=".45">
                    <circle cx="16" cy="-6" r="1.3" /><circle cx="28" cy="-2" r="1.1" /><circle cx="6" cy="10" r="1.2" />
                    <circle cx="26" cy="20" r="1.3" /><circle cx="14" cy="32" r="1.2" /><circle cx="34" cy="34" r="1" />
                  </g>
                  {/* rim shading at the bottom */}
                  <path d="M-30 46 Q8 58 42 30" stroke="#8C4B35" strokeWidth="7" opacity=".14" />
                </g>

                {/* shell opening */}
                <ellipse cx="-31" cy="27" rx="13" ry="20" transform="rotate(-14 -31 27)" fill="#D9A57C" />
                <ellipse cx="-31" cy="27" rx="11.4" ry="18.4" transform="rotate(-14 -31 27)" fill={`url(#${g}-inner)`} stroke="#FFF1DC" strokeWidth="3.2" />

                {/* highlights */}
                <g className="tz-crab__shine">
                  <ellipse cx="-10" cy="-8" rx="10" ry="4.6" transform="rotate(-24 -10 -8)" fill="#fff" opacity=".6" />
                  <ellipse cx="4" cy="-36" rx="6" ry="2.6" transform="rotate(-24 4 -36)" fill="#fff" opacity=".55" />
                  <ellipse cx="14" cy="-60" rx="3.6" ry="1.8" transform="rotate(-24 14 -60)" fill="#fff" opacity=".55" />
                </g>
                <circle className="tz-crab__glow" cx="6" cy="-8" r="38" fill={`url(#${g}-glow)`} opacity="0" />
              </g>
            </g>

            {/* ═══ CRAB ═══ */}
            <g className="tz-crab__front">
              {/* walking legs */}
              <g fill="none" stroke="#C9472E" strokeWidth="4.4" strokeLinecap="round" strokeLinejoin="round">
                <g className="tz-crab__leg" style={{ transformOrigin: "80px 136px" }}><path d="M80 136 L69 141 L65 151" /><path d="M65 151 L61 152" strokeWidth="3.4" /></g>
                <g className="tz-crab__leg" style={{ transformOrigin: "91px 140px" }}><path d="M91 140 L84 147 L82 152" /><path d="M82 152 L78 153" strokeWidth="3.4" /></g>
                <g className="tz-crab__leg" style={{ transformOrigin: "107px 140px" }}><path d="M107 140 L114 147 L116 152" /><path d="M116 152 L120 153" strokeWidth="3.4" /></g>
                <g className="tz-crab__leg" style={{ transformOrigin: "118px 136px" }}><path d="M118 136 L129 141 L133 151" /><path d="M133 151 L137 152" strokeWidth="3.4" /></g>
              </g>
              {/* leg highlights */}
              <g fill="none" stroke="#FF9C78" strokeWidth="1.2" strokeLinecap="round" opacity=".6">
                <path d="M79 135 L70 139.5" /><path d="M119 135 L128 139.5" />
              </g>

              {/* soft abdomen curling into the shell opening */}
              <g>
                <path d="M112 136 C122 140 134 136 140 126 C143 120 141 116 137 117 C135 124 128 128 118 128 Z" fill="#F7A386" stroke="#C9472E" strokeWidth="1" strokeLinejoin="round" />
                <path d="M122 129 Q124 135 122 139 M129 128 Q132 134 130 137 M135 124 Q138 129 137 133" stroke="#E0775A" strokeWidth="1.2" fill="none" strokeLinecap="round" />
              </g>

              <g className="tz-crab__body">
                {/* body */}
                <path d="M70 122 C68 106 82 97 98 97 C115 97 127 108 127 123 C127 137 113 143 98 143 C82 143 71 137 70 122Z" fill={`url(#${g}-body)`} stroke="#B63F27" strokeWidth="1.3" strokeLinejoin="round" />
                {/* shell rim lip shadow at body/shell junction */}
                <path d="M118 104 C124 110 126 118 125 128" stroke="#B63F27" strokeWidth="5" opacity=".18" fill="none" strokeLinecap="round" />
                {/* belly + highlight + texture */}
                <ellipse cx="96" cy="136" rx="19" ry="5.4" fill="#FFB89C" opacity=".5" />
                <ellipse cx="86" cy="105" rx="13" ry="5.4" transform="rotate(-18 86 105)" fill="#fff" opacity=".3" />
                <g fill="#B63F27" opacity=".22">
                  <circle cx="108" cy="110" r="1.6" /><circle cx="116" cy="116" r="1.4" /><circle cx="104" cy="118" r="1.2" /><circle cx="112" cy="124" r="1.5" />
                </g>
                {/* cheeks */}
                <ellipse className="tz-crab__cheek" cx="79" cy="125" rx="5" ry="3.2" fill="#FF5E7A" opacity=".32" style={{ transition: "opacity .2s" }} />
                <ellipse className="tz-crab__cheek" cx="108" cy="125" rx="5" ry="3.2" fill="#FF5E7A" opacity=".32" style={{ transition: "opacity .2s" }} />
                {/* mouth */}
                <path className="tz-crab__mouth" d={mouthD} fill={mouthFill} stroke="#7A2618" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                {effective === "win" && <ellipse cx="93" cy="130.6" rx="3.6" ry="1.9" fill="#FF8E9A" />}
                {/* nose dots */}
                <circle cx="91" cy="119.5" r=".9" fill="#7A2618" opacity=".55" />
                <circle cx="95.5" cy="119.5" r=".9" fill="#7A2618" opacity=".55" />
              </g>

              {/* antennae */}
              <g className="tz-crab__antennas" fill="none" stroke="#E25A3A" strokeWidth="1.7" strokeLinecap="round">
                <g className="tz-crab__ant l"><path d="M92 99 Q91 78 82 57" /><circle cx="82" cy="57" r="1.9" fill="#FF9C78" stroke="none" /></g>
                <g className="tz-crab__ant r"><path d="M96 99 Q103 78 116 60" /><circle cx="116" cy="60" r="1.9" fill="#FF9C78" stroke="none" /></g>
              </g>

              {/* eyes on stalks */}
              <g className="tz-crab__eyes">
                <path d="M86 104 Q84 92 83 83" stroke="#B63F27" strokeWidth="6.4" strokeLinecap="round" fill="none" />
                <path d="M86 104 Q84 92 83 83" stroke="#F2714E" strokeWidth="4.6" strokeLinecap="round" fill="none" />
                <path d="M103 103 Q104 90 105 79" stroke="#B63F27" strokeWidth="6.4" strokeLinecap="round" fill="none" />
                <path d="M103 103 Q104 90 105 79" stroke="#F2714E" strokeWidth="4.6" strokeLinecap="round" fill="none" />
                {[[82.5, 75.5, "l"], [105.5, 71.5, "r"]].map(([ex, ey, side]) => (
                  <g key={side} transform={`translate(${ex} ${ey})`}>
                    <circle r="9.6" fill="#B63F27" />
                    <circle r="8.6" fill={`url(#${g}-eye)`} />
                    <g clipPath={`url(#${g}-eyeclip)`}>
                      <g className="tz-crab__pupil">
                        <circle cx="-.6" cy=".8" r="4.6" fill="#1D2230" />
                        <circle cx="-.6" cy=".8" r="2.3" fill="#3B4560" opacity=".7" />
                        <circle cx="-2.4" cy="-1.4" r="1.7" fill="#fff" />
                        <circle cx="1.6" cy="2.6" r=".8" fill="#fff" opacity=".85" />
                      </g>
                      {/* upper lid */}
                      <rect className={`tz-crab__lid t ${side}`} x="-14" y="-22" width="28" height="22" fill="#F2714E" />
                      {/* lower lid: happy squint */}
                      <circle className="tz-crab__lid b" cx="0" cy="11.5" r="9.4" fill="#F2714E" />
                    </g>
                    {asleep && <path d="M-6.4 1 Q0 6 6.4 1" stroke="#7A2618" strokeWidth="1.8" strokeLinecap="round" fill="none" />}
                  </g>
                ))}
              </g>

              {/* ═══ CALCULATOR + big claw holding it ═══ */}
              <g className="tz-crab__hold">
                <g transform="translate(47 110) rotate(-8)">
                  {/* drop shadow */}
                  <rect x="-21" y="-28" width="46" height="62" rx="8" fill="#000" opacity=".18" />
                  {/* body */}
                  <rect x="-23" y="-31" width="46" height="62" rx="7.5" fill={`url(#${g}-calc)`} stroke="#151923" strokeWidth="1.2" />
                  <rect x="-21.6" y="-29.6" width="43.2" height="59.2" rx="6.4" fill="none" stroke="#fff" strokeOpacity=".14" strokeWidth="1" />
                  {/* screen */}
                  <rect x="-20.5" y="-28" width="41" height="21" rx="3.6" fill="#1B2029" />
                  <rect className="tz-crab__screen" x="-18.5" y="-26" width="37" height="17" rx="3" />
                  <text className="tz-crab__digits" x="16.4" y="-13.4" textAnchor="end">{screen}</text>
                  <g clipPath={`url(#${g}-screen)`}>
                    <path d="M-22 -26 L6 -26 L-8 -9 L-22 -9Z" fill={`url(#${g}-glare)`} opacity=".5" />
                  </g>
                  {/* keys */}
                  {[0, 1, 2, 3].map((r) =>
                    [0, 1, 2, 3].map((c) => {
                      const op = c === 3;
                      const eq = r === 3 && c === 3;
                      const x = -19.4 + c * 10.2;
                      const y = -4 + r * 8;
                      const base = eq ? "#F2714E" : op ? gold : r === 0 ? "#7A8499" : "#5B6479";
                      return (
                        <g key={`${r}-${c}`} className="tz-crab__key">
                          <rect x={x} y={y + 1} width="8.2" height="6.2" rx="1.9" fill="#151923" opacity=".55" />
                          <rect x={x} y={y} width="8.2" height="6.2" rx="1.9" fill={base} />
                          <rect x={x + 1} y={y + 0.7} width="6.2" height="1.4" rx=".7" fill="#fff" opacity=".28" />
                        </g>
                      );
                    })
                  )}
                </g>

                {/* big claw cradling the calculator from below */}
                <g>
                  <path d="M84 134 Q72 147 60 139" stroke="#B63F27" strokeWidth="8.2" strokeLinecap="round" fill="none" />
                  <path d="M84 134 Q72 147 60 139" stroke="#F2714E" strokeWidth="6.2" strokeLinecap="round" fill="none" />
                  <path d="M80 135 Q72 143 63 139" stroke="#FF9C78" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity=".7" />
                  <g transform="translate(61 138) scale(-1 1) rotate(24) scale(.96)">
                    <Claw g={g} />
                  </g>
                </g>
              </g>

              {/* free small claw: taps / waves */}
              <g className="tz-crab__sclaw">
                <path d="M82 128 Q77 124 73 124" stroke="#B63F27" strokeWidth="6.4" strokeLinecap="round" fill="none" />
                <path d="M82 128 Q77 124 73 124" stroke="#F2714E" strokeWidth="4.6" strokeLinecap="round" fill="none" />
                <g transform="translate(73 124) scale(-.66 .66) rotate(-4)">
                  <Claw g={g} />
                </g>
              </g>
            </g>

            {/* sweat drop (loss / worry) */}
            <g className="tz-crab__sweat">
              <path d="M66 70 C61 77 60 81 63.4 83.6 C66.8 86 70 83.4 69.6 80 C69.2 77 67.6 74 66 70Z" fill="#8BD0F5" stroke="#4FA4D6" strokeWidth=".8" />
              <ellipse cx="64.2" cy="80.2" rx="1" ry="1.8" fill="#fff" opacity=".7" />
            </g>
          </g>

          {/* ═══ effects ═══ */}
          {[[24, 62, 1], [72, 40, 0.8], [126, 24, 1.15], [186, 50, 0.9]].map(([x, y, s], i) => (
            <Spark key={i} x={x} y={y} s={s} fill={gold} />
          ))}
          {[[40, 54, "#F2714E", -6], [100, 36, "#8BD0F5", 6], [156, 20, "#9FEBB4", 9], [14, 84, gold, -8], [196, 78, "#F2714E", 6]].map(([x, y, c, dx], i) => (
            <rect key={i} className="tz-crab__confetti" x={x} y={y} width="4" height="4" rx="1" fill={c} style={{ "--dx": `${dx}px` }} />
          ))}
          {[[46, 96, 11], [34, 108, 9], [58, 110, 8]].map(([x, y, r], i) => (
            <circle key={i} className="tz-crab__puff" cx={x} cy={y} r={r} fill={palette.textFaint || "#C9CED8"} />
          ))}
          <g className="tz-crab__zzz" fill={palette.textFaint || "#8B93A5"} fontFamily="ui-monospace,monospace" fontWeight="800">
            <text x="124" y="50" fontSize="14">z</text>
            <text x="138" y="38" fontSize="10">z</text>
          </g>
        </svg>
      </button>
      {bubble && (
        <span key={bubble} role="status" className="tz-crab__bubble">
          {bubble}
        </span>
      )}
    </div>
  );
}
