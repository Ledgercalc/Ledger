import React, { useEffect, useId, useState } from "react";

/**
 * LiveFlame — a layered, animated fire (SVG + SMIL, no images, no libraries).
 * Layers: soft glow -> red/orange body -> yellow middle -> white-hot core -> blue base,
 * plus two side licks and rising embers. Every layer morphs on its own timing, so it
 * never loops in an obvious way. Respects "reduce motion" (shows a still flame).
 *
 * props: size = height in px, active = lit or dim/out, dimColor = colour when inactive
 */
export default function LiveFlame({ size = 28, active = true, dimColor = "#68738F", style, className }) {
  const uid = useId().replace(/:/g, "");
  const id = (n) => `${n}-${uid}`;
  const [still, setStill] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setStill(mq.matches);
    apply();
    mq.addEventListener ? mq.addEventListener("change", apply) : mq.addListener(apply);
    return () => { mq.removeEventListener ? mq.removeEventListener("change", apply) : mq.removeListener(apply); };
  }, []);

  const width = Math.round(size * 0.72);
  const animate = active && !still;
  const embers = animate && size >= 20;

  const OUTER = [
    "M53.1 16.7 C54.1 51.3 87.6 65.1 85.6 95.1 C85.1 120.5 69.7 132.0 50.0 132.0 C30.3 132.0 14.2 120.5 13.5 92.8 C18.8 67.4 40.6 49.0 53.1 16.7Z",
    "M62.2 16.7 C58.0 51.3 87.1 65.1 86.7 95.1 C85.1 120.5 69.7 132.0 50.0 132.0 C30.3 132.0 14.1 120.5 15.2 92.8 C20.4 67.4 56.4 49.0 62.2 16.7Z",
    "M61.1 19.1 C60.8 53.0 87.0 66.5 87.7 95.9 C87.2 120.7 70.9 132.0 50.0 132.0 C29.1 132.0 12.0 120.7 13.9 93.6 C11.1 68.8 50.6 50.7 61.1 19.1Z",
    "M46.6 9.1 C54.6 45.9 86.3 60.7 84.7 92.7 C85.8 119.7 70.1 132.0 50.0 132.0 C29.9 132.0 13.4 119.7 12.1 90.2 C15.8 63.2 44.3 43.5 46.6 9.1Z",
    "M39.6 7.7 C47.3 45.0 92.9 59.9 89.6 92.2 C88.0 119.6 71.3 132.0 50.0 132.0 C28.7 132.0 11.2 119.6 9.5 89.7 C12.4 62.4 38.9 42.5 39.6 7.7Z",
    "M40.9 18.4 C54.1 52.4 89.5 66.1 88.0 95.6 C86.9 120.6 70.7 132.0 50.0 132.0 C29.3 132.0 12.4 120.6 14.3 93.4 C11.7 68.4 40.6 50.2 40.9 18.4Z",
    "M53.1 16.7 C54.1 51.3 87.6 65.1 85.6 95.1 C85.1 120.5 69.7 132.0 50.0 132.0 C30.3 132.0 14.2 120.5 13.5 92.8 C18.8 67.4 40.6 49.0 53.1 16.7Z",
  ];
  const MID = [
    "M58.1 34.8 C54.8 64.0 84.0 75.6 80.1 100.9 C78.6 122.3 66.1 132.0 50.0 132.0 C33.9 132.0 20.8 122.3 20.1 98.9 C20.3 77.6 48.6 62.0 58.1 34.8Z",
    "M57.8 40.0 C60.4 67.6 81.8 78.7 80.2 102.6 C77.6 122.8 65.5 132.0 50.0 132.0 C34.5 132.0 21.8 122.8 20.0 100.7 C23.7 80.5 50.0 65.8 57.8 40.0Z",
    "M52.8 40.5 C57.3 68.0 77.6 78.9 79.0 102.7 C76.9 122.9 65.1 132.0 50.0 132.0 C34.9 132.0 22.6 122.9 22.5 100.9 C24.5 80.8 45.1 66.1 52.8 40.5Z",
    "M40.6 41.1 C57.0 68.4 83.4 79.3 78.8 102.9 C79.5 122.9 66.6 132.0 50.0 132.0 C33.4 132.0 19.9 122.9 18.3 101.1 C24.4 81.1 41.5 66.6 40.6 41.1Z",
    "M44.6 39.0 C56.9 66.9 85.0 78.0 77.6 102.2 C78.4 122.7 65.9 132.0 50.0 132.0 C34.1 132.0 21.0 122.7 20.0 100.4 C24.6 79.9 38.9 65.0 44.6 39.0Z",
    "M58.1 34.8 C54.8 64.0 84.0 75.6 80.1 100.9 C78.6 122.3 66.1 132.0 50.0 132.0 C33.9 132.0 20.8 122.3 20.1 98.9 C20.3 77.6 48.6 62.0 58.1 34.8Z",
  ];
  const CORE = [
    "M51.0 80.4 C57.5 95.9 66.2 102.1 62.5 115.5 C63.9 126.8 57.8 132.0 50.0 132.0 C42.2 132.0 35.8 126.8 37.7 114.5 C39.9 103.1 42.1 94.9 51.0 80.4Z",
    "M54.3 86.0 C58.2 99.8 67.5 105.3 64.0 117.3 C65.1 127.4 58.5 132.0 50.0 132.0 C41.5 132.0 34.6 127.4 34.1 116.4 C39.1 106.3 47.2 98.9 54.3 86.0Z",
    "M45.3 85.1 C55.7 99.2 64.5 104.8 63.8 117.0 C65.4 127.3 58.6 132.0 50.0 132.0 C41.4 132.0 34.3 127.3 32.9 116.1 C34.8 105.7 44.8 98.2 45.3 85.1Z",
    "M47.6 80.7 C56.3 96.1 64.3 102.3 65.9 115.6 C63.9 126.9 57.8 132.0 50.0 132.0 C42.2 132.0 35.8 126.9 34.3 114.6 C32.5 103.3 37.1 95.1 47.6 80.7Z",
    "M51.0 80.4 C57.5 95.9 66.2 102.1 62.5 115.5 C63.9 126.8 57.8 132.0 50.0 132.0 C42.2 132.0 35.8 126.8 37.7 114.5 C39.9 103.1 42.1 94.9 51.0 80.4Z",
  ];
  const TL = [
    "M24.0 80.0 C28.0 68.0 30.0 56.0 19.2 42.0 C18.0 56.0 16.0 68.0 24.0 80.0Z",
    "M24.0 80.0 C22.0 68.0 24.0 56.0 9.6 42.0 C12.0 56.0 16.0 68.0 24.0 80.0Z",
    "M24.0 80.0 C30.0 68.0 32.0 56.0 22.4 42.0 C20.0 56.0 16.0 68.0 24.0 80.0Z",
    "M24.0 80.0 C25.0 68.0 27.0 56.0 14.4 42.0 C15.0 56.0 16.0 68.0 24.0 80.0Z",
    "M24.0 80.0 C28.0 68.0 30.0 56.0 19.2 42.0 C18.0 56.0 16.0 68.0 24.0 80.0Z",
  ];
  const TR = [
    "M76.0 86.0 C86.0 75.8 87.7 65.6 82.4 53.7 C77.5 65.6 69.2 75.8 76.0 86.0Z",
    "M76.0 86.0 C91.0 75.8 92.7 65.6 90.4 53.7 C82.5 65.6 69.2 75.8 76.0 86.0Z",
    "M76.0 86.0 C84.0 75.8 85.7 65.6 79.2 53.7 C75.5 65.6 69.2 75.8 76.0 86.0Z",
    "M76.0 86.0 C89.0 75.8 90.7 65.6 87.2 53.7 C80.5 65.6 69.2 75.8 76.0 86.0Z",
    "M76.0 86.0 C86.0 75.8 87.7 65.6 82.4 53.7 C77.5 65.6 69.2 75.8 76.0 86.0Z",
  ];

  // --- inactive: a quiet, dim silhouette (no motion) ---
  if (!active) {
    return (
      <svg width={width} height={size} viewBox="0 0 100 140" className={className} style={{ display: "inline-block", overflow: "visible", ...style }} aria-hidden="true">
        <path d={OUTER[0]} fill={dimColor} opacity="0.28" />
        <path d={CORE[0]} fill={dimColor} opacity="0.35" transform="translate(0 0)" />
      </svg>
    );
  }

  const A = (list, dur, begin) => {
    const n = list.length;
    const kts = Array.from({ length: n }, (_, i) => (i / (n - 1)).toFixed(3)).join(";");
    const ks = Array.from({ length: n - 1 }, () => "0.42 0 0.58 1").join(";");
    return (
      <animate attributeName="d" dur={`${dur}s`} begin={`${begin}s`} repeatCount="indefinite"
        calcMode="spline" keyTimes={kts} keySplines={ks} values={list.join(";")} />
    );
  };

  return (
    <svg width={width} height={size} viewBox="0 0 100 140" className={className}
      style={{ display: "inline-block", overflow: "visible", ...style }} aria-hidden="true">
      <defs>
        <radialGradient id={id("glow")} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#ff8a1e" stopOpacity="0.5" />
          <stop offset="0.5" stopColor="#ff5a00" stopOpacity="0.16" />
          <stop offset="1" stopColor="#ff5a00" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id("out")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffb340" stopOpacity="0.75" />
          <stop offset="0.35" stopColor="#ff7a10" />
          <stop offset="0.8" stopColor="#f0380a" />
          <stop offset="1" stopColor="#b81c00" />
        </linearGradient>
        <linearGradient id={id("mid")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe270" stopOpacity="0.9" />
          <stop offset="0.5" stopColor="#ffb21e" />
          <stop offset="1" stopColor="#ff7d0a" />
        </linearGradient>
        <linearGradient id={id("core")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fffbe0" />
          <stop offset="1" stopColor="#ffe688" />
        </linearGradient>
        <radialGradient id={id("blue")} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#5aa5ff" stopOpacity="0.8" />
          <stop offset="1" stopColor="#2f6bff" stopOpacity="0" />
        </radialGradient>
        <filter id={id("soft")} x="-30%" y="-20%" width="160%" height="140%">
          <feGaussianBlur stdDeviation="1.1" />
        </filter>
        <filter id={id("heat")} x="-20%" y="-10%" width="140%" height="130%">
          <feTurbulence type="fractalNoise" baseFrequency="0.018 0.05" numOctaves="2" seed="4" result="n">
            {animate && <animate attributeName="baseFrequency" dur="3.2s" repeatCount="indefinite"
              values="0.018 0.050;0.024 0.062;0.016 0.046;0.018 0.050" />}
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="n" scale="3.6" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>

      {/* warm glow that breathes */}
      <ellipse cx="50" cy="98" rx="60" ry="66" fill={`url(#${id("glow")})`}>
        {animate && <animate attributeName="opacity" dur="1.7s" repeatCount="indefinite"
          values="0.85;1;0.7;0.95;0.8;0.85" keyTimes="0;0.2;0.45;0.65;0.85;1" />}
      </ellipse>

      {/* the whole fire sways from its base and shimmers with heat */}
      <g filter={`url(#${id("heat")})`}>
        <g>
          {animate && <animateTransform attributeName="transform" type="rotate" dur="2.6s" repeatCount="indefinite"
            calcMode="spline" keyTimes="0;0.18;0.4;0.62;0.82;1" keySplines=".4 0 .6 1;.4 0 .6 1;.4 0 .6 1;.4 0 .6 1;.4 0 .6 1"
            values="0 50 132;2.4 50 132;-1.8 50 132;3 50 132;-2.6 50 132;0 50 132" />}

          {/* side licks that flick up and vanish */}
          <path d={TL[0]} fill={`url(#${id("out")})`} opacity="0.85" filter={`url(#${id("soft")})`}>
            {animate && A(TL, 1.35, -0.3)}
            {animate && <animate attributeName="opacity" dur="1.35s" begin="-0.3s" repeatCount="indefinite" values="0.2;0.9;0.75;0.1;0.2" keyTimes="0;0.3;0.6;0.9;1" />}
          </path>
          <path d={TR[0]} fill={`url(#${id("out")})`} opacity="0.85" filter={`url(#${id("soft")})`}>
            {animate && A(TR, 1.1, -0.7)}
            {animate && <animate attributeName="opacity" dur="1.1s" begin="-0.7s" repeatCount="indefinite" values="0.15;0.85;0.7;0.1;0.15" keyTimes="0;0.25;0.6;0.9;1" />}
          </path>

          {/* red / orange body */}
          <path d={OUTER[0]} fill={`url(#${id("out")})`} filter={`url(#${id("soft")})`}>
            {animate && A(OUTER, 1.9, 0)}
          </path>
          {/* yellow middle */}
          <path d={MID[0]} fill={`url(#${id("mid")})`} style={{ mixBlendMode: "screen" }}>
            {animate && A(MID, 1.35, -0.4)}
          </path>
          {/* white-hot core */}
          <path d={CORE[0]} fill={`url(#${id("core")})`} style={{ mixBlendMode: "screen" }}>
            {animate && A(CORE, 0.95, -0.2)}
          </path>
        </g>
        {/* blue base, like a real flame */}
        <ellipse cx="50" cy="127" rx="21" ry="8" fill={`url(#${id("blue")})`}>
          {animate && <animate attributeName="opacity" dur="1.2s" repeatCount="indefinite" values="0.9;0.6;0.95;0.7;0.9" />}
        </ellipse>
      </g>

      {/* rising embers */}
      {embers && [
        { x: 40, dx: -10, dur: 2.6, begin: 0, r: 1.8 },
        { x: 58, dx: 12, dur: 3.1, begin: -1.1, r: 1.5 },
        { x: 50, dx: 4, dur: 2.2, begin: -1.7, r: 1.2 },
      ].map((e, i) => (
        <circle key={i} cx={e.x} cy="110" r={e.r} fill="#ffc14d" opacity="0">
          <animate attributeName="cy" dur={`${e.dur}s`} begin={`${e.begin}s`} repeatCount="indefinite" values="112;60;-10" keyTimes="0;0.5;1" />
          <animate attributeName="cx" dur={`${e.dur}s`} begin={`${e.begin}s`} repeatCount="indefinite" values={`${e.x};${e.x + e.dx * 0.4};${e.x + e.dx}`} keyTimes="0;0.5;1" />
          <animate attributeName="opacity" dur={`${e.dur}s`} begin={`${e.begin}s`} repeatCount="indefinite" values="0;0.95;0.6;0" keyTimes="0;0.15;0.6;1" />
        </circle>
      ))}
    </svg>
  );
}
