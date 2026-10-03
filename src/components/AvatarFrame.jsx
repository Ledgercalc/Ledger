import { useId } from "react";
import { useCss } from "./useCss.js";

// Animated avatar frames. Wrap your existing <Avatar/>:
//   <AvatarFrame frame="aurora" size={44}><Avatar name="Alex" size={44} /></AvatarFrame>
// `size` = the avatar's own size. The frame adds ~34% around it. frame="none" renders children untouched.
// Everything animates with transform/opacity only (GPU friendly) and stops for prefers-reduced-motion.

const CSS = `
.tz-fr{--s:60px;--t:4px;position:relative;display:inline-grid;place-items:center;width:var(--s);height:var(--s);flex:none;isolation:isolate;vertical-align:middle}
.tz-fr__ava{position:relative;z-index:4;display:grid;place-items:center;border-radius:50%}
.tz-fr__l{position:absolute;inset:0;border-radius:50%;pointer-events:none}
.tz-fr__back{inset:var(--t);background:radial-gradient(circle,rgba(6,8,14,.2),rgba(6,8,14,.72));z-index:1}
.tz-fr__ring{z-index:2;-webkit-mask:radial-gradient(farthest-side,transparent calc(100% - var(--t)),#000 calc(100% - var(--t) + .6px));mask:radial-gradient(farthest-side,transparent calc(100% - var(--t)),#000 calc(100% - var(--t) + .6px))}
.tz-fr__thin{z-index:3;-webkit-mask:radial-gradient(farthest-side,transparent calc(100% - var(--t)*.42),#000 calc(100% - var(--t)*.42 + .6px));mask:radial-gradient(farthest-side,transparent calc(100% - var(--t)*.42),#000 calc(100% - var(--t)*.42 + .6px))}
.tz-fr__glow{z-index:0;filter:blur(calc(var(--t)*1.5));opacity:.8}
.tz-fr__orb{position:absolute;inset:0;z-index:5;pointer-events:none}
.tz-fr__pw{position:absolute;inset:0;transform:rotate(calc(var(--i)*var(--step,60deg)))}
.tz-fr__p{position:absolute;left:50%;top:calc(var(--t)/2 - 3px);width:6px;height:6px;margin-left:-3px;border-radius:50%;background:#fff;box-shadow:0 0 6px 2px var(--c,#fff)}
.tz-fr__star{position:absolute;z-index:6;width:calc(var(--s)*.2);height:calc(var(--s)*.2);pointer-events:none;color:#fff;filter:drop-shadow(0 0 3px currentColor)}
/* Aurora */
.tz-fr--aurora .tz-fr__ring,.tz-fr--aurora .tz-fr__glow{background:conic-gradient(#ff4fa3,#ffb347,#fff176,#4dffb0,#4dd2ff,#8b6bff,#ff4fa3)}
.tz-fr--aurora .tz-fr__thin{inset:calc(var(--t)*1.5);background:repeating-conic-gradient(rgba(255,255,255,.95) 0 3deg,transparent 3deg 9deg)}
.tz-fr--aurora .tz-fr__p{--c:#7be8ff}
.tz-fr__star--a{top:-4%;right:-3%;color:#fff3a8}.tz-fr__star--b{bottom:-3%;left:-4%;color:#9ff0ff}
/* Inferno */
.tz-fr--inferno .tz-fr__ring,.tz-fr--inferno .tz-fr__glow{background:conic-gradient(#ff3d00,#ff9100,#ffe082,#ff9100,#ff3d00,#c62800,#ff3d00)}
.tz-fr--inferno .tz-fr__glow{background:radial-gradient(circle,transparent 55%,rgba(255,110,0,.9) 70%,transparent 100%);filter:blur(calc(var(--t)*1.8))}
.tz-fr__fw{position:absolute;inset:0;z-index:3;transform:rotate(calc(var(--i)*18deg));pointer-events:none}
.tz-fr__flame{position:absolute;left:50%;top:0;width:calc(var(--s)*.11);height:calc(var(--s)*.22);margin-left:calc(var(--s)*-.055);transform:translateY(calc(var(--s)*-.15));transform-origin:50% 100%;overflow:visible}
.tz-fr__ember{position:absolute;z-index:6;left:calc(14% + var(--i)*12%);bottom:62%;width:calc(var(--s)*.035);height:calc(var(--s)*.035);min-width:2px;min-height:2px;border-radius:50%;background:#ffd180;box-shadow:0 0 5px 1px #ff8f00;opacity:0}
/* Royal */
.tz-fr--royal .tz-fr__ring{background:conic-gradient(#8a6508,#ffe27a,#fff6c8,#e6b422,#8a6508,#e6b422,#fff6c8,#ffe27a,#8a6508)}
.tz-fr--royal .tz-fr__glow{background:conic-gradient(#e6b422,#fff2b0,#e6b422);opacity:.55}
.tz-fr--royal .tz-fr__thin{inset:calc(var(--t)*1.25);background:conic-gradient(from 0deg,rgba(255,255,255,0) 0 90%,rgba(255,255,255,.95) 96%,rgba(255,255,255,0) 100%)}
.tz-fr__gem{position:absolute;z-index:6;left:50%;top:0;width:calc(var(--s)*.1);height:calc(var(--s)*.1);margin-left:calc(var(--s)*-.05);margin-top:calc(var(--s)*-.015);transform:rotate(45deg);border-radius:18%;background:linear-gradient(135deg,#fff,var(--c) 45%,#00000066);box-shadow:0 0 6px 1px var(--c),inset 0 0 2px rgba(255,255,255,.9)}
.tz-fr__crown{position:absolute;z-index:7;left:50%;top:0;width:calc(var(--s)*.34);height:calc(var(--s)*.2);margin-left:calc(var(--s)*-.17);transform:translateY(-62%);filter:drop-shadow(0 1px 2px rgba(0,0,0,.5))}
/* Galaxy */
.tz-fr--galaxy .tz-fr__ring{background:conic-gradient(#1b1464,#5b2bd6,#00b7ff,#d946ef,#1b1464)}
.tz-fr--galaxy .tz-fr__glow{background:conic-gradient(#5b2bd6,#00b7ff,#d946ef,#5b2bd6)}
.tz-fr--galaxy .tz-fr__thin{inset:calc(var(--t)*.7);background:conic-gradient(rgba(255,255,255,0) 0 62%,rgba(190,225,255,.95) 100%)}
.tz-fr__stars{z-index:3;background-image:radial-gradient(1.4px 1.4px at 12% 38%,#fff,transparent),radial-gradient(1px 1px at 30% 8%,#cfe8ff,transparent),radial-gradient(1.4px 1.4px at 70% 12%,#fff,transparent),radial-gradient(1px 1px at 92% 46%,#ffd9ff,transparent),radial-gradient(1.4px 1.4px at 80% 88%,#fff,transparent),radial-gradient(1px 1px at 38% 94%,#cfe8ff,transparent),radial-gradient(1.2px 1.2px at 6% 70%,#fff,transparent);-webkit-mask:radial-gradient(farthest-side,transparent calc(100% - var(--t)*1.4),#000 calc(100% - var(--t)*1.4 + .6px));mask:radial-gradient(farthest-side,transparent calc(100% - var(--t)*1.4),#000 calc(100% - var(--t)*1.4 + .6px))}
.tz-fr__planet{position:absolute;left:50%;top:0;width:calc(var(--t)*1.7);height:calc(var(--t)*1.7);margin-left:calc(var(--t)*-.85);margin-top:calc(var(--t)*-.55);border-radius:50%;background:radial-gradient(circle at 32% 30%,#fff,var(--c) 42%,#0b1030);box-shadow:0 0 8px 1px var(--c)}
/* animation */
.tz-fr--anim.tz-fr--aurora .tz-fr__ring{animation:tzFrSpin 5s linear infinite}
.tz-fr--anim.tz-fr--aurora .tz-fr__glow{animation:tzFrSpinRev 8s linear infinite,tzFrFade 2.6s ease-in-out infinite}
.tz-fr--anim.tz-fr--aurora .tz-fr__thin{animation:tzFrSpinRev 12s linear infinite}
.tz-fr--anim .tz-fr__orb{animation:tzFrSpin var(--d,7s) linear infinite}
.tz-fr--anim .tz-fr__star{animation:tzFrTwinkle 2.4s ease-in-out infinite}
.tz-fr--anim .tz-fr__star--b{animation-delay:1.2s}
.tz-fr--anim.tz-fr--inferno .tz-fr__ring{animation:tzFrSpin 3.4s linear infinite}
.tz-fr--anim.tz-fr--inferno .tz-fr__glow{animation:tzFrHeat 1.5s ease-in-out infinite}
.tz-fr--anim .tz-fr__flame{animation:tzFrFlick calc(.8s + var(--i)*.07s) ease-in-out infinite;animation-delay:calc(var(--i)*-.19s)}
.tz-fr--anim .tz-fr__ember{animation:tzFrEmber 2.4s ease-out infinite;animation-delay:calc(var(--i)*-.5s)}
.tz-fr--anim.tz-fr--royal .tz-fr__ring{animation:tzFrSpin 16s linear infinite}
.tz-fr--anim.tz-fr--royal .tz-fr__thin{animation:tzFrSpin 3.6s linear infinite}
.tz-fr--anim.tz-fr--royal .tz-fr__glow{animation:tzFrFade 3s ease-in-out infinite}
.tz-fr--anim .tz-fr__gem{animation:tzFrGlint 3s ease-in-out infinite;animation-delay:calc(var(--i)*-.75s)}
.tz-fr--anim.tz-fr--galaxy .tz-fr__ring{animation:tzFrSpin 14s linear infinite}
.tz-fr--anim.tz-fr--galaxy .tz-fr__glow{animation:tzFrSpinRev 10s linear infinite,tzFrFade 3.2s ease-in-out infinite}
.tz-fr--anim.tz-fr--galaxy .tz-fr__thin{animation:tzFrSpin 2.8s linear infinite}
.tz-fr--anim.tz-fr--galaxy .tz-fr__stars{animation:tzFrSpinRev 40s linear infinite,tzFrFade 2.2s ease-in-out infinite}
@keyframes tzFrSpin{to{transform:rotate(360deg)}}
@keyframes tzFrSpinRev{to{transform:rotate(-360deg)}}
@keyframes tzFrFade{0%,100%{opacity:.45}50%{opacity:.95}}
@keyframes tzFrHeat{0%,100%{opacity:.6;transform:scale(1)}50%{opacity:1;transform:scale(1.07)}}
@keyframes tzFrTwinkle{0%,100%{opacity:.15;transform:scale(.4) rotate(0)}50%{opacity:1;transform:scale(1) rotate(45deg)}}
@keyframes tzFrFlick{0%,100%{transform:translateY(calc(var(--s)*-.15)) scale(1,1)}30%{transform:translateY(calc(var(--s)*-.15)) scale(.85,1.22)}65%{transform:translateY(calc(var(--s)*-.15)) scale(1.1,.8)}}
@keyframes tzFrEmber{0%{opacity:0;transform:translate(0,0) scale(1)}12%{opacity:1}100%{opacity:0;transform:translate(calc(var(--i)*3px - 8px),calc(var(--s)*-.5)) scale(.3)}}
@keyframes tzFrGlint{0%,100%{filter:brightness(1)}50%{filter:brightness(1.8)}}
@media (prefers-reduced-motion:reduce){.tz-fr *{animation:none!important}.tz-fr__star{opacity:.9}}
`;

const FLAME_PATH = "M5 0 C5.6 4 8.6 7 8.6 11 C8.6 14 7 16 5 16 C3 16 1.4 14 1.4 11 C1.4 8.4 3.4 6.6 4 3.6 C4.4 2.6 4.8 1.6 5 0 Z";
const FRAMES_WITH_RING = ["aurora", "inferno", "royal", "galaxy"];
const STAR = "M5 0 6 4 10 5 6 6 5 10 4 6 0 5 4 4z";

export default function AvatarFrame({ frame = "none", size = 44, animated = true, children, className = "", style }) {
  useCss("tz-frames-css", CSS);
  const uid = useId().replace(/:/g, "");
  if (!FRAMES_WITH_RING.includes(frame)) return <>{children}</>;
  const total = Math.round(size * 1.34);
  const t = Math.max(3, Math.round(size * 0.075));
  const cls = `tz-fr tz-fr--${frame}${animated ? " tz-fr--anim" : ""} ${className}`.trim();
  const vars = { "--s": `${total}px`, "--t": `${t}px`, ...style };
  const L = (c) => <span className={`tz-fr__l ${c}`} />;
  const star = (k) => (
    <svg className={`tz-fr__star tz-fr__star--${k}`} viewBox="0 0 10 10" aria-hidden="true"><path d={STAR} fill="currentColor" /></svg>
  );
  return (
    <span className={cls} style={vars} aria-hidden={false}>
      {L("tz-fr__glow")}
      {L("tz-fr__back")}
      {L("tz-fr__ring")}
      {frame === "galaxy" && L("tz-fr__stars")}
      {L("tz-fr__thin")}

      {frame === "aurora" && (
        <>
          <span className="tz-fr__orb" style={{ "--d": "7s" }}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <span key={i} className="tz-fr__pw" style={{ "--i": i }}><span className="tz-fr__p" style={{ animationDelay: `${i * -0.4}s` }} /></span>
            ))}
          </span>
          {star("a")}{star("b")}
        </>
      )}

      {frame === "inferno" && (
        <>
          <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
            <defs>
              <linearGradient id={`${uid}f`} x1="0" y1="1" x2="0" y2="0">
                <stop offset="0" stopColor="#ff3d00" />
                <stop offset=".55" stopColor="#ff9100" />
                <stop offset="1" stopColor="#fff3b0" />
              </linearGradient>
            </defs>
          </svg>
          {Array.from({ length: 20 }, (_, i) => (
            <span key={i} className="tz-fr__fw" style={{ "--i": i }}>
              <svg className="tz-fr__flame" viewBox="0 0 10 16" style={{ "--i": i }} aria-hidden="true"><path d={FLAME_PATH} fill={`url(#${uid}f)`} /></svg>
            </span>
          ))}
          {[0, 1, 2, 3, 4, 5, 6].map((i) => <span key={i} className="tz-fr__ember" style={{ "--i": i }} />)}
        </>
      )}

      {frame === "royal" && (
        <>
          {[["#ff3b5c", "0deg"], ["#4dc3ff", "90deg"], ["#2ee6a6", "180deg"], ["#ffffff", "270deg"]].map(([c, a], i) => (
            <span key={i} className="tz-fr__pw" style={{ "--i": i, "--step": "90deg", position: "absolute", inset: 0, zIndex: 6 }}>
              <span className="tz-fr__gem" style={{ "--c": c, "--i": i }} />
            </span>
          ))}
          <svg className="tz-fr__crown" viewBox="0 0 34 20" aria-hidden="true">
            <defs>
              <linearGradient id={`${uid}c`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff2b0" /><stop offset="1" stopColor="#d9a21b" /></linearGradient>
            </defs>
            <path d="M2 17 L4 5 L11 11 L17 2 L23 11 L30 5 L32 17 Z" fill={`url(#${uid}c)`} stroke="#8a6508" strokeWidth=".8" strokeLinejoin="round" />
            <rect x="2" y="16.5" width="30" height="2.6" rx="1.2" fill="#e6b422" stroke="#8a6508" strokeWidth=".6" />
            <circle cx="4" cy="5" r="1.6" fill="#ff3b5c" /><circle cx="17" cy="2.4" r="1.7" fill="#4dc3ff" /><circle cx="30" cy="5" r="1.6" fill="#2ee6a6" />
          </svg>
        </>
      )}

      {frame === "galaxy" && (
        <>
          <span className="tz-fr__orb" style={{ "--d": "9s" }}><span className="tz-fr__planet" style={{ "--c": "#7dd3fc" }} /></span>
          <span className="tz-fr__orb" style={{ "--d": "15s", animationDirection: "reverse", animationDelay: "-7s" }}>
            <span className="tz-fr__planet" style={{ "--c": "#f0abfc", transform: "scale(.7)" }} />
          </span>
          {star("a")}{star("b")}
        </>
      )}

      <span className="tz-fr__ava">{children}</span>
    </span>
  );
}
