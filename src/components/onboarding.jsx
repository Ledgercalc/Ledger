import { ONBOARD_CURVE_BACK, ONBOARD_CURVE_FRONT } from "../data/onboarding.js";
import { palette } from "../lib/theme.js";
import { Lightbulb, X } from "lucide-react";

export function OnboardingCurveLayer({ d, top, height, viewBoxH, opacityLine, opacityFill, fillId, glowId, travelDuration, travelDelay, travelOpacity, swayClass, swayDuration, swayDelay }) {
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top, height, overflow: "hidden" }}>
      <svg
        className={swayClass}
        width="106%"
        height="100%"
        style={{ position: "relative", left: "-3%", animationDuration: swayDuration, animationDelay: swayDelay }}
        viewBox={`0 0 1280 ${viewBoxH}`}
        preserveAspectRatio="none"
      >
        <defs>
          <filter id={glowId} x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path d={`${d} L1280,${viewBoxH} L0,${viewBoxH} Z`} fill={palette.gold} fillOpacity={opacityFill} />
        <path d={d} fill="none" stroke={palette.gold} strokeWidth="1.25" opacity={opacityLine} />
        <path
          className="onboard-curve-travel"
          d={d}
          fill="none"
          stroke={palette.goldBright || "#FFE7BA"}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="14 1500"
          opacity={travelOpacity}
          filter={`url(#${glowId})`}
          style={{ animationDuration: travelDuration, animationDelay: travelDelay }}
        />
      </svg>
    </div>
  );
}

export function OnboardingAmbientBG() {
  return (
    <div
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 0, pointerEvents: "none" }}
    >
      <div
        className="onboard-bg-grain"
        style={{ position: "absolute", inset: 0, opacity: 0.035, mixBlendMode: "overlay" }}
      >
        <svg width="100%" height="100%">
          <filter id="onboardGrain">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
            <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.9 0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#onboardGrain)" />
        </svg>
      </div>

      <OnboardingCurveLayer
        d={ONBOARD_CURVE_BACK}
        top="18%"
        height="230px"
        viewBoxH={520}
        opacityLine={0.22}
        opacityFill={0.05}
        fillId="onboardCurveFillBack"
        glowId="onboardGlowBack"
        travelDuration="5.5s"
        travelDelay="0s"
        travelOpacity={0.6}
        swayClass="onboard-curve-sway-back"
        swayDuration="22s"
        swayDelay="0s"
      />
      <OnboardingCurveLayer
        d={ONBOARD_CURVE_FRONT}
        top="46%"
        height="280px"
        viewBoxH={640}
        opacityLine={0.42}
        opacityFill={0.08}
        fillId="onboardCurveFillFront"
        glowId="onboardGlowFront"
        travelDuration="3.8s"
        travelDelay="-1.4s"
        travelOpacity={0.85}
        swayClass="onboard-curve-sway-front"
        swayDuration="16s"
        swayDelay="-5s"
      />

      <style>{`
        @keyframes onboardCurveSwayBack {
          0% { transform: translate(0, 0); }
          25% { transform: translate(-12px, -6px); }
          50% { transform: translate(8px, 4px); }
          75% { transform: translate(-5px, 6px); }
          100% { transform: translate(0, 0); }
        }
        @keyframes onboardCurveSwayFront {
          0% { transform: translate(0, 0); }
          30% { transform: translate(16px, 6px); }
          55% { transform: translate(-10px, -7px); }
          80% { transform: translate(6px, -4px); }
          100% { transform: translate(0, 0); }
        }
        @keyframes onboardCurveTravel {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: -1514; }
        }
        @media (prefers-reduced-motion: no-preference) {
          .onboard-curve-travel {
            animation-name: onboardCurveTravel;
            animation-timing-function: linear;
            animation-iteration-count: infinite;
          }
          .onboard-curve-sway-back {
            animation-name: onboardCurveSwayBack;
            animation-timing-function: ease-in-out;
            animation-iteration-count: infinite;
          }
          .onboard-curve-sway-front {
            animation-name: onboardCurveSwayFront;
            animation-timing-function: ease-in-out;
            animation-iteration-count: infinite;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .onboard-curve-travel { display: none; }
          .onboard-curve-sway-back, .onboard-curve-sway-front { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

export function OnboardingTip({ id, text, settings, persistSettings }) {
  if (!settings.showOnboardingTips) return null;
  if ((settings.onboardingDismissed || []).includes(id)) return null;
  return (
    <div
      className="rounded-2xl p-3 mb-4 flex items-start gap-2"
      style={{ background: `${palette.gold}14`, border: `1px solid ${palette.gold}55` }}
    >
      <Lightbulb size={14} style={{ color: palette.gold, marginTop: "2px", flexShrink: 0 }} />
      <p className="text-xs flex-1" style={{ color: palette.text }}>
        {text}
      </p>
      <button
        type="button"
        onClick={() =>
          persistSettings({
            ...settings,
            onboardingDismissed: [...(settings.onboardingDismissed || []), id],
          })
        }
        style={{ color: palette.textFaint, flexShrink: 0 }}
        aria-label="Dismiss tip"
      >
        <X size={13} />
      </button>
    </div>
  );
}
