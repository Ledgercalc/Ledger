import { useCallback, useEffect, useId, useRef, useState } from "react";
import { CRAB_EVENT } from "../lib/mascot.js";
import { palette } from "../lib/theme.js";

/* ──────────────────────────────────────────────────────────────────────────
   Tredzi the hermit crab  (v2)
   A coral hermit crab carrying a spiral shell on its back, gripping a pocket
   calculator in its big claw and tapping the keys with the small one.

   Moods you can fire with pokeCrab(mood, detail) from lib/mascot.js:
     win  loss  save  poof  type  tap  wave          (original set)
     add  check  alert  look  party  think           (new)
   Props
     size     height in px (default 110)
     rest     pose to hold when nothing is happening: "worry" | "think" | ...
              (or set it from anywhere: pokeCrab("rest", { pose: "worry" }), pose: "" clears it)
     enabled  false = render nothing
   ────────────────────────────────────────────────────────────────────────── */

const SLEEP_AFTER_MS = 45000;
const MOOD_MS = {
  win: 2100, loss: 2300, save: 1300, poof: 1100, type: 650, tap: 1100, wave: 1800,
  add: 1100, check: 1500, alert: 1400, look: 1300, party: 2600, think: 2600,
};
const LINES = {
  win: ["Nice one!", "Shell yeah!", "Green candle!"],
  loss: ["Shell-shocked...", "Next one.", "Breathe."],
  save: ["Saved!"],
  poof: ["Poof."],
  tap: ["Hi!", "Crunching...", "Tap tap."],
  add: ["Logged."],
  check: ["Rule kept!", "Nice and clean."],
  alert: ["Careful!"],
  party: ["Streak!"],
  think: ["Thinking..."],
};
// What the calculator shows while a persistent `rest` pose is held.
const REST_SCREEN = { worry: "0.", think: "" };
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
    case "add": return "+1";
    case "alert": return "!";
    case "look": return "?";
    case "party": return "GG";
    case "check":
    case "think": return "";
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
.tz-crab__spark,.tz-crab__zzz,.tz-crab__puff,.tz-crab__sweat,.tz-crab__confetti,.tz-crab__plus,.tz-crab__excl,.tz-crab__thought,.tz-crab__tick{opacity:0}
.tz-crab__spark,.tz-crab__puff,.tz-crab__confetti,.tz-crab__plus,.tz-crab__excl,.tz-crab__eyeball,.tz-crab__pupil,.tz-crab__sdot{transform-box:fill-box;transform-origin:center}
.tz-crab__tick{stroke-dasharray:30;stroke-dashoffset:30}

/* transform origins (SVG user units) */
.tz-crab__all{transform-origin:118px 176px}
.tz-crab__shell{transform-origin:150px 152px}
.tz-crab__front{transform-origin:100px 176px}
.tz-crab__body{transform-origin:98px 168px}
.tz-crab__eyes{transform-origin:96px 128px}
.tz-crab__ant{transform-origin:94px 124px}
.tz-crab__hold{transform-origin:44px 160px}
.tz-crab__sclaw{transform-origin:84px 143px}
.tz-crab__dact{transform-origin:24px -5px}
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
.tz-crab__dact{animation:tzNip 9s ease-in-out infinite}
.tz-crab__leg{animation:tzLeg 2.8s ease-in-out infinite}
.tz-crab__leg:nth-child(even){animation-delay:-1.4s}
.tz-crab__shine{animation:tzShine 6s ease-in-out infinite}
.tz-crab__lid.b{transform:translateY(14px)}

@keyframes tzBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-1.4px)}}
@keyframes tzBreath{0%,100%{transform:scale(1,1)}50%{transform:scale(1.015,1.03)}}
@keyframes tzShellSway{0%,100%{transform:rotate(0)}50%{transform:rotate(.8deg)}}
@keyframes tzStalk{0%,100%{transform:rotate(0)}50%{transform:rotate(2.4deg)}}
@keyframes tzAntL{0%,100%{transform:rotate(0)}50%{transform:rotate(-7deg)}}
@keyframes tzAntR{0%,100%{transform:rotate(0)}50%{transform:rotate(8deg)}}
@keyframes tzBlink{0%,92%,100%{transform:translateY(-13px)}95%{transform:translateY(10px)}98%{transform:translateY(-13px)}}
@keyframes tzLook{0%,35%,100%{transform:translate(0,0)}45%,70%{transform:translate(-2.2px,.4px)}80%,90%{transform:translate(1.4px,-.6px)}}
@keyframes tzIdleTap{0%,88%,100%{transform:rotate(0)}91%{transform:rotate(-7deg)}94%{transform:rotate(1deg)}97%{transform:rotate(-6deg)}}
@keyframes tzNip{0%,80%,100%{transform:rotate(0)}84%{transform:rotate(-14deg)}88%{transform:rotate(0)}92%{transform:rotate(-14deg)}96%{transform:rotate(0)}}
@keyframes tzLeg{0%,100%{transform:rotate(0)}50%{transform:rotate(3deg)}}
@keyframes tzShine{0%,80%,100%{opacity:.5}90%{opacity:.95}}

/* ── keyframes used by moods ── */
@keyframes tzHop{0%,100%{transform:translateY(0) scale(1,1)}14%{transform:translateY(0) scale(1.06,.93)}48%{transform:translateY(-17px) scale(.96,1.05)}84%{transform:translateY(0) scale(1.05,.95)}}
@keyframes tzHopS{0%,100%{transform:translateY(0) scale(1,1)}20%{transform:translateY(0) scale(1.04,.96)}50%{transform:translateY(-8px) scale(.98,1.03)}}
@keyframes tzNod{0%,100%{transform:translateY(0) scale(1,1)}25%{transform:translateY(3px) scale(1.03,.96)}50%{transform:translateY(0)}75%{transform:translateY(3px) scale(1.03,.96)}}
@keyframes tzDance{0%,100%{transform:translate(0,0) rotate(0)}25%{transform:translate(-3px,-6px) rotate(-3deg)}75%{transform:translate(3px,-6px) rotate(3deg)}}
@keyframes tzPump{0%,100%{transform:rotate(0)}50%{transform:rotate(38deg)}}
@keyframes tzWave{0%,100%{transform:rotate(50deg)}50%{transform:rotate(76deg)}}
@keyframes tzWaveUp{from{transform:rotate(0)}to{transform:rotate(50deg)}}
@keyframes tzChin{0%,100%{transform:rotate(14deg)}50%{transform:rotate(30deg)}}
@keyframes tzSnap{0%,100%{transform:rotate(0)}50%{transform:rotate(-20deg)}}
@keyframes tzTap{0%,100%{transform:rotate(0)}45%{transform:rotate(-13deg) translateY(1.5px)}}
@keyframes tzKey{0%,100%{opacity:1;transform:translateY(0)}50%{opacity:.5;transform:translateY(.8px)}}
@keyframes tzRetreat{0%{transform:translateX(0) scale(1)}22%,78%{transform:translateX(11px) scale(.93)}100%{transform:translateX(0) scale(1)}}
@keyframes tzShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-1.6px)}40%{transform:translateX(1.6px)}60%{transform:translateX(-1.2px)}80%{transform:translateX(1.2px)}}
@keyframes tzJolt{0%,100%{transform:translate(0,0)}25%{transform:translate(-2px,-1px)}50%{transform:translate(2px,0)}75%{transform:translate(-1.5px,1px)}}
@keyframes tzShellBump{0%,100%{transform:rotate(0)}30%{transform:rotate(-2.6deg)}60%{transform:rotate(1.8deg)}}
@keyframes tzSquish{0%,100%{transform:scale(1,1)}30%{transform:scale(1.14,.8)}60%{transform:scale(.96,1.05)}}
@keyframes tzRaise{0%,100%{transform:translateY(0) rotate(0)}25%,70%{transform:translateY(-9px) rotate(-4deg)}}
@keyframes tzSpark{0%{opacity:0;transform:scale(.2) rotate(0)}40%{opacity:1;transform:scale(1.2) rotate(40deg)}100%{opacity:0;transform:scale(.7) translateY(-8px) rotate(90deg)}}
@keyframes tzConfetti{0%{opacity:0;transform:translate(0,4px) rotate(0)}25%{opacity:1}100%{opacity:0;transform:translate(var(--dx,6px),-24px) rotate(220deg)}}
@keyframes tzPuff{0%{opacity:0;transform:scale(.3)}30%{opacity:.95}100%{opacity:0;transform:scale(1.9) translateY(-6px)}}
@keyframes tzZ{0%{opacity:0;transform:translate(0,5px)}40%{opacity:1}100%{opacity:0;transform:translate(7px,-12px)}}
@keyframes tzSweat{0%{opacity:0;transform:translateY(-3px)}25%{opacity:1}100%{opacity:0;transform:translateY(12px)}}
@keyframes tzSleepBreath{0%,100%{transform:scale(1,1)}50%{transform:scale(1.025,1.05)}}
@keyframes tzGlow{0%,100%{opacity:0}50%{opacity:.85}}
@keyframes tzPop{from{opacity:0;transform:translateY(3px) scale(.94)}to{opacity:1;transform:none}}
@keyframes tzWorry{0%,100%{transform:translateX(0)}25%{transform:translateX(-.7px)}75%{transform:translateX(.7px)}}
@keyframes tzPlus{0%{opacity:0;transform:translateY(6px) scale(.4)}30%{opacity:1;transform:translateY(-2px) scale(1.15)}100%{opacity:0;transform:translateY(-16px) scale(.9)}}
@keyframes tzTick{0%{opacity:1;stroke-dashoffset:30}60%,100%{opacity:1;stroke-dashoffset:0}}
@keyframes tzExcl{0%{opacity:0;transform:translateY(8px) scale(.3)}25%{opacity:1;transform:translateY(-2px) scale(1.25)}40%{transform:scale(1)}85%{opacity:1}100%{opacity:0}}
@keyframes tzScan{0%,100%{transform:translate(0,0)}22%{transform:translate(-3px,.4px)}55%{transform:translate(3px,-.4px)}80%{transform:translate(-1.5px,0)}}
@keyframes tzThought{0%,100%{opacity:.25;transform:translateY(0)}50%{opacity:1;transform:translateY(-3px)}}
@keyframes tzSdot{0%,100%{opacity:.25;transform:scale(.7)}50%{opacity:1;transform:scale(1.15)}}
@keyframes tzEyePop{0%{transform:scale(1)}20%{transform:scale(1.22)}100%{transform:scale(1.14)}}

/* ── WIN ── */
.tz-crab--win .tz-crab__all{animation:tzHop .75s ease-out 2}
.tz-crab--win .tz-crab__body{animation:none}
.tz-crab--win .tz-crab__hold{animation:tzRaise 1.5s ease-in-out 1}
.tz-crab--win .tz-crab__sclaw{animation:tzPump .36s ease-in-out 4}
.tz-crab--win .tz-crab__dact{animation:tzSnap .2s ease-in-out 6}
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

/* ── PARTY (streaks, milestones): longer dance + confetti rain ── */
.tz-crab--party .tz-crab__all{animation:tzDance .55s ease-in-out 4}
.tz-crab--party .tz-crab__body{animation:none}
.tz-crab--party .tz-crab__hold{animation:tzRaise 1.1s ease-in-out 2}
.tz-crab--party .tz-crab__sclaw{animation:tzPump .3s ease-in-out 8}
.tz-crab--party .tz-crab__dact{animation:tzSnap .18s ease-in-out 12}
.tz-crab--party .tz-crab__shell{animation:tzShellBump .55s ease-in-out 4}
.tz-crab--party .tz-crab__screen{fill:#FFE08A}
.tz-crab--party .tz-crab__lid.b{transform:translateY(0)}
.tz-crab--party .tz-crab__lid.t{animation:none;transform:translateY(-13px)}
.tz-crab--party .tz-crab__spark{animation:tzSpark 1s ease-out 3 both}
.tz-crab--party .tz-crab__spark:nth-of-type(2){animation-delay:.2s}
.tz-crab--party .tz-crab__spark:nth-of-type(3){animation-delay:.4s}
.tz-crab--party .tz-crab__spark:nth-of-type(4){animation-delay:.6s}
.tz-crab--party .tz-crab__confetti{animation:tzConfetti 1.1s ease-out 3 both}
.tz-crab--party .tz-crab__confetti:nth-of-type(2n){animation-delay:.2s}
.tz-crab--party .tz-crab__confetti:nth-of-type(3n){animation-delay:.45s}
.tz-crab--party .tz-crab__cheek{opacity:.8}

/* ── LOSS ── */
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
.tz-crab--loss .tz-crab__sclaw,.tz-crab--worry .tz-crab__sclaw{animation:none;transform:rotate(-8deg)}
.tz-crab--loss .tz-crab__dact,.tz-crab--worry .tz-crab__dact{animation:none}
.tz-crab--loss .tz-crab__sweat,.tz-crab--worry .tz-crab__sweat{animation:tzSweat 2s ease-in infinite}
.tz-crab--worry .tz-crab__front{animation:tzWorry .45s ease-in-out infinite}
.tz-crab--worry .tz-crab__antennas{opacity:.85}

/* ── TYPE ── */
.tz-crab--type .tz-crab__sclaw{animation:tzTap .26s ease-in-out infinite}
.tz-crab--type .tz-crab__key{animation:tzKey .42s infinite}
.tz-crab--type .tz-crab__key:nth-child(3n){animation-delay:.14s}
.tz-crab--type .tz-crab__key:nth-child(5n){animation-delay:.27s}
.tz-crab--type .tz-crab__key:nth-child(7n){animation-delay:.07s}
.tz-crab--type .tz-crab__pupil{animation:none;transform:translate(-2.6px,2px)}
.tz-crab--type .tz-crab__body{animation:tzHopS .52s ease-out infinite}

/* ── TAP & SAVE ── */
.tz-crab--tap .tz-crab__all,.tz-crab--save .tz-crab__all{animation:tzHopS .55s ease-out 1}
.tz-crab--tap .tz-crab__sclaw{animation:tzWaveUp .2s ease-out forwards}
.tz-crab--tap .tz-crab__dact,.tz-crab--save .tz-crab__dact,.tz-crab--wave .tz-crab__dact{animation:tzSnap .22s ease-in-out 4}
.tz-crab--tap .tz-crab__cheek{opacity:.75}
.tz-crab--save .tz-crab__sclaw{animation:tzTap .22s ease-in-out 3}
.tz-crab--save .tz-crab__screen{fill:#9FEBB4}
.tz-crab--save .tz-crab__spark{animation:tzSpark 1s ease-out both}
.tz-crab--save .tz-crab__spark:nth-of-type(3){animation-delay:.2s}

/* ── WAVE ── */
.tz-crab--wave .tz-crab__sclaw{animation:tzWaveUp .25s ease-out forwards,tzWave .5s ease-in-out .25s 3}
.tz-crab--wave .tz-crab__cheek{opacity:.75}

/* ── ADD (new row / rule / import): quick hop, key press, floating + ── */
.tz-crab--add .tz-crab__all{animation:tzHopS .5s ease-out 1}
.tz-crab--add .tz-crab__sclaw{animation:tzTap .2s ease-in-out 3}
.tz-crab--add .tz-crab__screen{fill:#9FEBB4}
.tz-crab--add .tz-crab__plus{animation:tzPlus 1s ease-out both}
.tz-crab--add .tz-crab__cheek{opacity:.7}

/* ── CHECK (rule kept, reply arrived): double nod and a drawn tick ── */
.tz-crab--check .tz-crab__all{animation:tzNod .9s ease-in-out 1}
.tz-crab--check .tz-crab__screen{fill:#9FEBB4}
.tz-crab--check .tz-crab__tick{animation:tzTick .55s ease-out both}
.tz-crab--check .tz-crab__lid.b{transform:translateY(5px)}
.tz-crab--check .tz-crab__lid.t{animation:none;transform:translateY(-13px)}
.tz-crab--check .tz-crab__cheek{opacity:.75}
.tz-crab--check .tz-crab__spark{animation:tzSpark 1s ease-out both}
.tz-crab--check .tz-crab__spark:nth-of-type(2){animation-delay:.15s}

/* ── ALERT (limit hit, error): eyes pop, jolt, exclamation mark ── */
.tz-crab--alert .tz-crab__all{animation:tzJolt .16s linear 7}
.tz-crab--alert .tz-crab__eyes{animation:none;transform:rotate(-2deg)}
.tz-crab--alert .tz-crab__eyeball{animation:tzEyePop .3s ease-out both}
.tz-crab--alert .tz-crab__pupil{animation:none;transform:scale(.62)}
.tz-crab--alert .tz-crab__lid.t{animation:none;transform:translateY(-14px)}
.tz-crab--alert .tz-crab__ant.l,.tz-crab--alert .tz-crab__ant.r{animation:none;transform:rotate(0)}
.tz-crab--alert .tz-crab__screen{fill:#FFD27A}
.tz-crab--alert .tz-crab__excl{animation:tzExcl 1.3s ease-out both}
.tz-crab--alert .tz-crab__sweat{animation:tzSweat 1.2s ease-in 2}
.tz-crab--alert .tz-crab__sclaw{animation:none;transform:rotate(6deg)}

/* ── LOOK (switched tab, opened a chart): eyes scan the content ── */
.tz-crab--look .tz-crab__pupil{animation:tzScan 1.1s ease-in-out 1}
.tz-crab--look .tz-crab__eyes{animation:tzStalk 1.1s ease-in-out 1}
.tz-crab--look .tz-crab__ant.l{animation-duration:.7s}
.tz-crab--look .tz-crab__ant.r{animation-duration:.7s}

/* ── THINK (waiting on the coach): pupils up, claw to chin, thought dots ── */
.tz-crab--think .tz-crab__pupil{animation:none;transform:translate(2px,-3px)}
.tz-crab--think .tz-crab__eyes{animation:tzStalk 2.6s ease-in-out infinite}
.tz-crab--think .tz-crab__ant.l,.tz-crab--think .tz-crab__ant.r{animation-duration:1s}
.tz-crab--think .tz-crab__sclaw{animation:tzChin 1.7s ease-in-out infinite}
.tz-crab--think .tz-crab__thought{opacity:1}
.tz-crab--think .tz-crab__thought circle{animation:tzThought 1.4s ease-in-out infinite}
.tz-crab--think .tz-crab__thought circle:nth-child(2){animation-delay:.25s}
.tz-crab--think .tz-crab__thought circle:nth-child(3){animation-delay:.5s}
.tz-crab--think .tz-crab__sdot{animation:tzSdot 1s ease-in-out infinite}
.tz-crab--think .tz-crab__sdot:nth-of-type(2){animation-delay:.18s}
.tz-crab--think .tz-crab__sdot:nth-of-type(3){animation-delay:.36s}

/* ── POOF ── */
.tz-crab--poof .tz-crab__all{animation:tzSquish .55s ease-out 1}
.tz-crab--poof .tz-crab__puff{animation:tzPuff .85s ease-out both}
.tz-crab--poof .tz-crab__puff:nth-of-type(2){animation-delay:.08s}
.tz-crab--poof .tz-crab__puff:nth-of-type(3){animation-delay:.16s}
.tz-crab--poof .tz-crab__lid.t{animation:none;transform:translateY(-6px)}
.tz-crab--poof .tz-crab__pupil{animation:none;transform:translate(-1.5px,-1px)}

/* ── SLEEP ── */
.tz-crab--sleep .tz-crab__all{animation:tzSleepBreath 3.4s ease-in-out infinite}
.tz-crab--sleep .tz-crab__body,.tz-crab--sleep .tz-crab__eyes,.tz-crab--sleep .tz-crab__sclaw,.tz-crab--sleep .tz-crab__ant,.tz-crab--sleep .tz-crab__dact{animation:none}
.tz-crab--sleep .tz-crab__eyes{transform:rotate(6deg)}
.tz-crab--sleep .tz-crab__sclaw{transform:rotate(-10deg)}
.tz-crab--sleep .tz-crab__front{transform:translateX(3px)}
.tz-crab--sleep .tz-crab__lid.t{animation:none;transform:translateY(9px)}
.tz-crab--sleep .tz-crab__zzz{opacity:1;animation:tzZ 2.8s ease-in-out infinite}
.tz-crab--sleep .tz-crab__zzz text:nth-child(2){animation:tzZ 2.8s ease-in-out .7s infinite}

/* ── speech bubble ── */
.tz-crab__bubble{position:absolute;right:calc(100% - 10px);top:10px;white-space:nowrap;font-size:11.5px;font-weight:600;line-height:1.3;padding:5px 11px;border-radius:14px;background:var(--tzb);color:var(--tzt);border:1px solid var(--tzbd);box-shadow:0 2px 8px rgba(0,0,0,.14);animation:tzPop .25s ease-out;pointer-events:none}
.tz-crab__bubble::after{content:"";position:absolute;right:-5px;top:50%;width:8px;height:8px;margin-top:-4px;background:var(--tzb);border-top:1px solid var(--tzbd);border-right:1px solid var(--tzbd);transform:rotate(45deg)}

@media (prefers-reduced-motion: reduce){.tz-crab *,.tz-crab__bubble{animation:none !important}}
`;

/* ── Claw: a proper chela. Drawn pointing +x, wrist at (0,0), finger pivot at (24,-5) ── */
function Claw({ g }) {
  const line = "#A93522";
  return (
    <g strokeLinejoin="round" strokeLinecap="round">
      {/* moving finger (dactyl), sits under the palm so its root is hidden */}
      <g className="tz-crab__dact">
        <path d="M16 -12 C28 -19 46 -15 57 -4 C58 -2 57 0 55 0 C46 -5 34 -4 22 3 Z" fill={`url(#${g}-claw2)`} stroke={line} strokeWidth=".9" />
        <path d="M30 -13.5 C38 -14.5 46 -11.5 52 -6" stroke="#FFD9C7" strokeWidth="1.3" fill="none" opacity=".75" />
        <path d="M30 -3 L31.8 -.5 L33.6 -3 M37 -4.2 L38.8 -1.8 L40.6 -4.4 M44 -5 L45.7 -2.8 L47.4 -5.2" fill="#FFE3D3" stroke="#D2684C" strokeWidth=".4" opacity=".9" />
      </g>
      {/* fixed finger (pollex) */}
      <path d="M16 4 C30 8 46 5 57 -3 C56 9 46 18 32 19 C24 19.5 18 16 14 11 Z" fill={`url(#${g}-claw2)`} stroke={line} strokeWidth=".9" />
      <path d="M32 6.4 L33.8 4 L35.6 6.5 M39.5 5.2 L41.3 2.8 L43 5.2 M46.5 2.6 L48.2 .4 L49.7 2.4" fill="#FFE3D3" stroke="#D2684C" strokeWidth=".4" opacity=".9" />
      <path d="M26 16 C36 16.5 46 12 52 5" stroke="#9E2F1D" strokeWidth="1.4" fill="none" opacity=".35" />
      {/* palm */}
      <path d="M-4 -12 C8 -19 24 -18 30 -9 C35 -2 35 5 30 11 C23 19 8 19 -4 12 C-10 6 -10 -6 -4 -12 Z" fill={`url(#${g}-claw)`} stroke={line} strokeWidth="1" />
      {/* wrist band */}
      <path d="M-3.4 -11.4 C-9 -5 -9 5 -3.4 11.4" stroke="#9E2F1D" strokeWidth="2.6" fill="none" opacity=".4" />
      {/* knuckle bumps */}
      <g fill="#FFD9C7" stroke={line} strokeWidth=".5">
        <ellipse cx="6" cy="-15.6" rx="2.2" ry="1.7" /><ellipse cx="14" cy="-16.4" rx="2.3" ry="1.7" /><ellipse cx="22" cy="-14" rx="2" ry="1.6" />
      </g>
      {/* highlight + grain */}
      <ellipse cx="11" cy="-8.4" rx="10" ry="3.2" fill="#fff" opacity=".34" transform="rotate(-6 11 -8.4)" />
      <path d="M2 4 Q10 9 22 7" stroke="#fff" strokeWidth="1" fill="none" opacity=".22" />
      <g fill="#A93522" opacity=".3">
        <circle cx="4" cy="2" r="1.1" /><circle cx="12" cy="6" r="1.2" /><circle cx="20" cy="3" r="1" /><circle cx="17" cy="11" r="1" /><circle cx="8" cy="11" r=".9" />
      </g>
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

/* One walking leg: three segments, joints, and a tiny foot. */
function Leg({ d, ox, oy, g, back }) {
  const fill = back ? "#B03D27" : "#C9472E";
  return (
    <g className="tz-crab__leg" style={{ transformOrigin: `${ox}px ${oy}px` }}>
      <path d={d} fill="none" stroke={back ? "#8E2E1D" : "#A93522"} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke={fill} strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke={back ? "#D86C52" : "#FF9C78"} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity=".55" transform="translate(-.7 -.7)" />
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
  const [restPose, setRestPose] = useState("");
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
      if (d.mood === "rest") {
        setRestPose(d.pose || "");
        return;
      }
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

  const holdPose = restPose || rest;
  const effective = mood || holdPose || "idle";
  const shownScreen = mood ? screen : holdPose && REST_SCREEN[holdPose] !== undefined ? REST_SCREEN[holdPose] : screen;
  const W = Math.round((size * 240) / 190);
  const gold = palette.gold || "#E3B04B";
  const sad = effective === "loss" || effective === "worry";
  const asleep = effective === "sleep";
  const thinking = effective === "think";

  // mouth shape per mood
  let mouthD = "M85 155 Q92 162 99 155";
  let mouthFill = "none";
  if (sad) mouthD = "M86 161 Q92 155 98 161";
  else if (asleep) mouthD = "M88 157 Q92 159.5 96 157";
  else if (effective === "win" || effective === "party") { mouthD = "M84 154 Q92 169 100 154 Q92 158 84 154 Z"; mouthFill = "#7A2618"; }
  else if (effective === "tap" || effective === "poof") { mouthD = "M89 155 Q92 162 95 155 Q92 153 89 155 Z"; mouthFill = "#7A2618"; }
  else if (effective === "alert") { mouthD = "M88.5 157 Q92 152 95.5 157 Q92 165 88.5 157 Z"; mouthFill = "#7A2618"; }
  else if (effective === "type") mouthD = "M88 157 Q92 159.5 96 157";
  else if (thinking) mouthD = "M87 158.4 Q92 156.2 97 157.6";
  else if (effective === "check" || effective === "add") mouthD = "M84 154.5 Q92 164 100 154.5";

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
        <svg viewBox="0 0 240 190" width={W} height={size} aria-hidden="true">
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
              <stop offset="0" stopColor="#FFA57F" />
              <stop offset=".5" stopColor="#F2714E" />
              <stop offset="1" stopColor="#CC4A2F" />
            </linearGradient>
            <linearGradient id={`${g}-claw`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#FFA07B" />
              <stop offset="1" stopColor="#E25A3A" />
            </linearGradient>
            <linearGradient id={`${g}-claw2`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#F9805C" />
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
          <ellipse cx="118" cy="178" rx="92" ry="7" fill="#000" opacity=".16" />
          <ellipse cx="118" cy="178" rx="62" ry="4.2" fill="#000" opacity=".12" />

          <g className="tz-crab__all">
            {/* rear walking legs, tucked under the shell */}
            <g>
              <Leg back g={g} ox={134} oy={150} d="M134 150 L146 162 L152 177" />
              <Leg back g={g} ox={144} oy={148} d="M144 148 L160 160 L168 176" />
            </g>

            {/* ═══ SHELL on the crab's back ═══ */}
            <g className="tz-crab__shell">
              <g transform="translate(158 104) rotate(-12) scale(1)">
                {/* apex */}
                <path d="M18 -68 C20 -78 26 -86 33 -91 C36 -83 39 -74 37 -66 C31 -62 22 -62 18 -68Z" fill={`url(#${g}-shell)`} stroke="#C4905F" strokeWidth="1.3" strokeLinejoin="round" />
                <path d="M24 -72 Q30 -77 34 -84" stroke="#B85C6E" strokeWidth="2" strokeLinecap="round" fill="none" opacity=".55" />

                {/* whorl 3 */}
                <path d="M6 -52 C6 -64 14 -72 24 -72 C34 -72 40 -64 38 -54 C36 -46 28 -42 18 -43 C10 -44 6 -46 6 -52Z" fill={`url(#${g}-shell)`} stroke="#C4905F" strokeWidth="1.4" strokeLinejoin="round" />
                <g clipPath={`url(#${g}-w3)`} fill="none" strokeLinecap="round">
                  <path d="M3 -62 Q22 -69 41 -61" stroke="#B85C6E" strokeWidth="4.6" opacity=".5" />
                  <path d="M3 -51 Q22 -58 41 -50" stroke="#B85C6E" strokeWidth="4.6" opacity=".5" />
                  <path d="M3 -56.4 Q22 -63.4 41 -55.4" stroke="#fff" strokeWidth="1" opacity=".5" />
                  <path d="M6 -46 Q22 -42 40 -50" stroke="#8C4B35" strokeWidth="5" opacity=".13" />
                </g>

                {/* whorl 2 */}
                <path d="M-10 -22 C-10 -40 4 -50 20 -50 C36 -50 44 -38 42 -24 C40 -10 26 -4 10 -6 C-4 -8 -10 -12 -10 -22Z" fill={`url(#${g}-shell)`} stroke="#C4905F" strokeWidth="1.5" strokeLinejoin="round" />
                <g clipPath={`url(#${g}-w2)`} fill="none" strokeLinecap="round">
                  <path d="M-13 -38 Q16 -47 45 -35" stroke="#B85C6E" strokeWidth="5.4" opacity=".5" />
                  <path d="M-13 -24 Q16 -33 45 -21" stroke="#B85C6E" strokeWidth="5.4" opacity=".5" />
                  <path d="M-13 -10 Q16 -19 45 -7" stroke="#B85C6E" strokeWidth="5.4" opacity=".5" />
                  <path d="M-13 -31 Q16 -40 45 -28" stroke="#fff" strokeWidth="1.1" opacity=".5" />
                  <path d="M-13 -17 Q16 -26 45 -14" stroke="#fff" strokeWidth="1.1" opacity=".5" />
                  <path d="M-8 -8 Q16 0 42 -12" stroke="#8C4B35" strokeWidth="6" opacity=".13" />
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
                  <g fill="#9C4A5E" stroke="none" opacity=".45">
                    <circle cx="16" cy="-6" r="1.3" /><circle cx="28" cy="-2" r="1.1" /><circle cx="6" cy="10" r="1.2" />
                    <circle cx="26" cy="20" r="1.3" /><circle cx="14" cy="32" r="1.2" /><circle cx="34" cy="34" r="1" />
                  </g>
                  <path d="M-30 46 Q8 58 42 30" stroke="#8C4B35" strokeWidth="7" opacity=".14" />
                  <path d="M-4 -26 Q22 -22 38 -4" stroke="#8C4B35" strokeWidth="6" opacity=".1" />
                </g>

                {/* shell opening (where the crab lives) */}
                <ellipse cx="-31" cy="27" rx="13" ry="20" transform="rotate(-14 -31 27)" fill="#D9A57C" />
                <ellipse cx="-31" cy="27" rx="11.4" ry="18.4" transform="rotate(-14 -31 27)" fill={`url(#${g}-inner)`} stroke="#FFF1DC" strokeWidth="3.2" />

                {/* highlights */}
                <g className="tz-crab__shine">
                  <ellipse cx="-10" cy="-8" rx="10" ry="4.6" transform="rotate(-24 -10 -8)" fill="#fff" opacity=".6" />
                  <ellipse cx="4" cy="-36" rx="6" ry="2.6" transform="rotate(-24 4 -36)" fill="#fff" opacity=".55" />
                  <ellipse cx="14" cy="-60" rx="3.6" ry="1.8" transform="rotate(-24 14 -60)" fill="#fff" opacity=".55" />
                </g>
                <circle className="tz-crab__glow" cx="6" cy="-8" r="40" fill={`url(#${g}-glow)`} opacity="0" />
              </g>
            </g>

            {/* ═══ CRAB ═══ */}
            <g className="tz-crab__front">
              {/* front walking legs */}
              <g>
                <Leg g={g} ox={88} oy={164} d="M88 164 L80 172 L77 178" />
                <Leg g={g} ox={100} oy={167} d="M100 167 L98 174 L98 178" />
                <Leg g={g} ox={112} oy={165} d="M112 165 L118 172 L121 178" />
                <Leg g={g} ox={122} oy={158} d="M122 158 L132 166 L137 178" />
              </g>

              {/* soft abdomen curling into the shell */}
              <g>
                <path d="M118 160 C130 164 142 158 146 146 C148 138 145 133 140 135 C139 144 132 151 122 150 Z" fill="#F7A386" stroke="#B63F27" strokeWidth="1" strokeLinejoin="round" />
                <path d="M127 152 Q130 158 128 163 M134 150 Q138 156 136 160 M140 145 Q144 150 143 154" stroke="#E0775A" strokeWidth="1.2" fill="none" strokeLinecap="round" />
              </g>

              <g className="tz-crab__body">
                {/* carapace */}
                <path d="M66 148 C64 130 80 120 98 120 C118 120 132 132 132 148 C132 162 116 171 98 171 C80 171 67 163 66 148Z" fill={`url(#${g}-body)`} stroke="#B63F27" strokeWidth="1.4" strokeLinejoin="round" />
                {/* top sheen + segment lines */}
                <ellipse cx="86" cy="130" rx="15" ry="6" transform="rotate(-18 86 130)" fill="#fff" opacity=".3" />
                <path d="M104 124 C112 130 116 138 115 148 M112 126 C120 132 124 140 123 150" stroke="#B63F27" strokeWidth="1.2" fill="none" opacity=".25" strokeLinecap="round" />
                {/* lighter face plate */}
                <ellipse cx="92" cy="155" rx="21" ry="13" fill="#FFB89C" opacity=".42" />
                <g fill="#B63F27" opacity=".22">
                  <circle cx="110" cy="136" r="1.6" /><circle cx="118" cy="144" r="1.4" /><circle cx="106" cy="146" r="1.2" /><circle cx="114" cy="154" r="1.5" /><circle cx="100" cy="132" r="1.2" />
                </g>
                {/* cheeks */}
                <ellipse className="tz-crab__cheek" cx="76" cy="154" rx="5" ry="3.2" fill="#FF5E7A" opacity=".32" style={{ transition: "opacity .2s" }} />
                <ellipse className="tz-crab__cheek" cx="108" cy="154" rx="5" ry="3.2" fill="#FF5E7A" opacity=".32" style={{ transition: "opacity .2s" }} />
                {/* mouth */}
                <path className="tz-crab__mouth" d={mouthD} fill={mouthFill} stroke="#7A2618" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                {(effective === "win" || effective === "party") && <ellipse cx="92" cy="163" rx="3.6" ry="1.9" fill="#FF8E9A" />}
                <circle cx="89.5" cy="149" r=".9" fill="#7A2618" opacity=".55" />
                <circle cx="94.5" cy="149" r=".9" fill="#7A2618" opacity=".55" />
              </g>

              {/* shell rim: the crab emerges from under the shell's lip */}
              <path d="M123 128 C117 138 117 152 125 164" stroke="#A8744A" strokeWidth="7" strokeLinecap="round" fill="none" opacity=".22" />
              <path d="M124 128 C118 138 118 152 126 163" stroke="#FFF1DC" strokeWidth="3.4" strokeLinecap="round" fill="none" />
              <path d="M126 129 C120 139 120 152 128 162" stroke="#D9A57C" strokeWidth="1" strokeLinecap="round" fill="none" opacity=".7" />

              {/* antennae */}
              <g className="tz-crab__antennas" fill="none" stroke="#E25A3A" strokeWidth="1.7" strokeLinecap="round">
                <g className="tz-crab__ant l"><path d="M90 123 Q86 98 70 76" /><circle cx="70" cy="76" r="1.9" fill="#FF9C78" stroke="none" /></g>
                <g className="tz-crab__ant r"><path d="M98 121 Q116 100 128 76" /><circle cx="128" cy="76" r="1.9" fill="#FF9C78" stroke="none" /></g>
              </g>

              {/* eyes on stalks */}
              <g className="tz-crab__eyes">
                <path d="M86 128 Q83 117 82 107" stroke="#B63F27" strokeWidth="6.4" strokeLinecap="round" fill="none" />
                <path d="M86 128 Q83 117 82 107" stroke="#F2714E" strokeWidth="4.6" strokeLinecap="round" fill="none" />
                <path d="M106 126 Q106 112 105 101" stroke="#B63F27" strokeWidth="6.4" strokeLinecap="round" fill="none" />
                <path d="M106 126 Q106 112 105 101" stroke="#F2714E" strokeWidth="4.6" strokeLinecap="round" fill="none" />
                {[[81, 98, "l"], [105, 92, "r"]].map(([ex, ey, side]) => (
                  <g key={side} transform={`translate(${ex} ${ey})`}>
                    <g className="tz-crab__eyeball">
                      <circle r="9.6" fill="#B63F27" />
                      <circle r="8.6" fill={`url(#${g}-eye)`} />
                      <g clipPath={`url(#${g}-eyeclip)`}>
                        <g className="tz-crab__pupil">
                          <circle cx="-.6" cy=".8" r="4.6" fill="#1D2230" />
                          <circle cx="-.6" cy=".8" r="2.3" fill="#3B4560" opacity=".7" />
                          <circle cx="-2.4" cy="-1.4" r="1.7" fill="#fff" />
                          <circle cx="1.6" cy="2.6" r=".8" fill="#fff" opacity=".85" />
                        </g>
                        <rect className={`tz-crab__lid t ${side}`} x="-14" y="-22" width="28" height="22" fill="#F2714E" />
                        <circle className="tz-crab__lid b" cx="0" cy="11.5" r="9.4" fill="#F2714E" />
                      </g>
                      {asleep && <path d="M-6.4 1 Q0 6 6.4 1" stroke="#7A2618" strokeWidth="1.8" strokeLinecap="round" fill="none" />}
                    </g>
                  </g>
                ))}
              </g>

              {/* ═══ CALCULATOR, gripped by the big claw ═══ */}
              <g className="tz-crab__hold">
                <g transform="translate(44 117) rotate(-8)">
                  <rect x="-21" y="-28" width="46" height="62" rx="8" fill="#000" opacity=".18" />
                  <rect x="-23" y="-31" width="46" height="62" rx="7.5" fill={`url(#${g}-calc)`} stroke="#151923" strokeWidth="1.2" />
                  <rect x="-21.6" y="-29.6" width="43.2" height="59.2" rx="6.4" fill="none" stroke="#fff" strokeOpacity=".14" strokeWidth="1" />
                  <rect x="-20.5" y="-28" width="41" height="21" rx="3.6" fill="#1B2029" />
                  <rect className="tz-crab__screen" x="-18.5" y="-26" width="37" height="17" rx="3" />
                  {thinking ? (
                    <g fill="#1F3028">
                      <circle className="tz-crab__sdot" cx="-5" cy="-17.5" r="2.2" />
                      <circle className="tz-crab__sdot" cx="1" cy="-17.5" r="2.2" />
                      <circle className="tz-crab__sdot" cx="7" cy="-17.5" r="2.2" />
                    </g>
                  ) : (
                    <text className="tz-crab__digits" x="16.4" y="-13.4" textAnchor="end">{shownScreen}</text>
                  )}
                  <path className="tz-crab__tick" d="M-8 -17 L-2 -11 L9 -23" stroke="#1F6B3E" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  <g clipPath={`url(#${g}-screen)`}>
                    <path d="M-22 -26 L6 -26 L-8 -9 L-22 -9Z" fill={`url(#${g}-glare)`} opacity=".5" />
                  </g>
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

                {/* big arm: upper arm, elbow, forearm, then the claw clamps the calculator's lower corner */}
                <g>
                  <path d="M80 162 Q64 176 46 170" stroke="#A93522" strokeWidth="10" strokeLinecap="round" fill="none" />
                  <path d="M80 162 Q64 176 46 170" stroke="#F2714E" strokeWidth="7.6" strokeLinecap="round" fill="none" />
                  <path d="M76 162 Q64 172 50 168" stroke="#FF9C78" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity=".7" />
                  <circle cx="46" cy="170" r="5.6" fill="#E25A3A" stroke="#A93522" strokeWidth="1.2" />
                  <path d="M46 170 Q30 170 20 164" stroke="#A93522" strokeWidth="9" strokeLinecap="round" fill="none" />
                  <path d="M46 170 Q30 170 20 164" stroke="#F2714E" strokeWidth="6.6" strokeLinecap="round" fill="none" />
                  <g fill="#FFD9C7" stroke="#A93522" strokeWidth=".5">
                    <ellipse cx="62" cy="168" rx="1.6" ry="1.3" /><ellipse cx="34" cy="166" rx="1.5" ry="1.2" />
                  </g>
                  <g transform="translate(18 163) rotate(-36) scale(.84)">
                    <Claw g={g} />
                  </g>
                </g>
              </g>

              {/* free small claw: taps the keys, waves, scratches its chin */}
              <g className="tz-crab__sclaw">
                <path d="M90 146 Q82 138 72 138" stroke="#A93522" strokeWidth="8" strokeLinecap="round" fill="none" />
                <path d="M90 146 Q82 138 72 138" stroke="#F2714E" strokeWidth="5.8" strokeLinecap="round" fill="none" />
                <path d="M87 144 Q82 139 75 139" stroke="#FF9C78" strokeWidth="1.3" strokeLinecap="round" fill="none" opacity=".7" />
                <circle cx="72" cy="138" r="3.9" fill="#E25A3A" stroke="#A93522" strokeWidth="1" />
                <g transform="translate(70 138) scale(-.56 .56) rotate(-16)">
                  <Claw g={g} />
                </g>
              </g>
            </g>

            {/* sweat drop + exclamation */}
            <g className="tz-crab__sweat">
              <path d="M62 88 C57 95 56 99 59.4 101.6 C62.8 104 66 101.4 65.6 98 C65.2 95 63.6 92 62 88Z" fill="#8BD0F5" stroke="#4FA4D6" strokeWidth=".8" />
              <ellipse cx="60.2" cy="98.2" rx="1" ry="1.8" fill="#fff" opacity=".7" />
            </g>
            <text className="tz-crab__excl" x="93" y="76" textAnchor="middle" fontSize="26" fontWeight="900" fill="#F2B233" stroke="#B87A0E" strokeWidth="1" fontFamily="system-ui,sans-serif">!</text>
            <g className="tz-crab__thought" fill={palette.textFaint || "#9AA3B2"}>
              <circle cx="62" cy="62" r="2.6" />
              <circle cx="54" cy="52" r="3.8" />
              <circle cx="44" cy="39" r="5.4" />
            </g>
          </g>

          {/* ═══ effects ═══ */}
          {[[24, 84, 1], [76, 52, 0.8], [140, 26, 1.15], [222, 62, 0.9]].map(([x, y, s], i) => (
            <Spark key={i} x={x} y={y} s={s} fill={gold} />
          ))}
          {[[44, 72, "#F2714E", -6], [108, 44, "#8BD0F5", 6], [172, 22, "#9FEBB4", 9], [14, 104, gold, -8], [226, 96, "#F2714E", 6]].map(([x, y, c, dx], i) => (
            <rect key={i} className="tz-crab__confetti" x={x} y={y} width="4" height="4" rx="1" fill={c} style={{ "--dx": `${dx}px` }} />
          ))}
          <g className="tz-crab__plus" transform="translate(30 84)">
            <path d="M0 -6 V6 M-6 0 H6" stroke="#37B26C" strokeWidth="3.4" strokeLinecap="round" fill="none" />
          </g>
          {[[44, 112, 12], [30, 130, 10], [60, 132, 9]].map(([x, y, r], i) => (
            <circle key={i} className="tz-crab__puff" cx={x} cy={y} r={r} fill={palette.textFaint || "#C9CED8"} />
          ))}
          <g className="tz-crab__zzz" fill={palette.textFaint || "#8B93A5"} fontFamily="ui-monospace,monospace" fontWeight="800">
            <text x="132" y="62" fontSize="14">z</text>
            <text x="146" y="50" fontSize="10">z</text>
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
