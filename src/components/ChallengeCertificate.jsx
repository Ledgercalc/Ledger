import { useId } from "react";
import { useCss } from "./useCss.js";

// Shareable proof of process: no amounts, no firm balances. SVG so it exports crisply.
//   <ChallengeCertificate username="Alex_FX" phase="Phase 1" tradingDays={18} date="2026-10-14" />
// Export:  const blob = await certificateToPng(svgEl);  await shareOrDownload(blob, "challenge-passed.png");

const CSS = `
.tz-cert{display:block;width:100%;height:auto;border-radius:14px;box-shadow:0 14px 40px rgba(0,0,0,.35)}
.tz-cert__shine{animation:tzCertShine 5.5s ease-in-out infinite}
.tz-cert__seal{transform-box:fill-box;transform-origin:center;animation:tzCertSeal 4s ease-in-out infinite}
@keyframes tzCertShine{0%,55%{transform:translateX(-260px) skewX(-20deg)}90%,100%{transform:translateX(1100px) skewX(-20deg)}}
@keyframes tzCertSeal{0%,100%{transform:scale(1)}50%{transform:scale(1.045)}}
@media (prefers-reduced-motion:reduce){.tz-cert *{animation:none!important}}
`;
const SERIF = '"Playfair Display", "Cormorant Garamond", Georgia, "Times New Roman", serif';
const SANS = 'Sora, system-ui, -apple-system, "Segoe UI", sans-serif';

export function certificateId(username = "", date = "") {
  let h = 2166136261;
  const s = `${username}|${date}`;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return `TRZ-${(h >>> 0).toString(36).toUpperCase().padStart(7, "0").slice(0, 7)}`;
}
const fmtDate = (d) => {
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d || "");
  return dt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
};

export default function ChallengeCertificate({ username = "Trader", phase = "Phase 1", tradingDays = 0, date = new Date(), title = "Challenge passed", animated = true, className = "" }) {
  useCss("tz-cert-css", CSS);
  const uid = useId().replace(/:/g, "");
  const id = certificateId(username, String(date));
  const ray = Array.from({ length: 24 }, (_, i) => i);
  const guil = Array.from({ length: 16 }, (_, i) => i);
  return (
    <svg className={`tz-cert ${className}`} viewBox="0 0 900 600" role="img" aria-label={`${title}: ${username}, ${phase}, ${tradingDays} trading days`} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${uid}bg`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#0c1230" /><stop offset=".55" stopColor="#151b45" /><stop offset="1" stopColor="#0a0e26" /></linearGradient>
        <linearGradient id={`${uid}gold`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff1b8" /><stop offset=".45" stopColor="#f2b533" /><stop offset="1" stopColor="#a8700b" /></linearGradient>
        <radialGradient id={`${uid}seal`} cx=".35" cy=".3"><stop offset="0" stopColor="#fff7d1" /><stop offset=".5" stopColor="#f5b83a" /><stop offset="1" stopColor="#a8700b" /></radialGradient>
        <linearGradient id={`${uid}sh`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".5" stopColor="#fff" stopOpacity=".16" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
        <clipPath id={`${uid}cl`}><rect width="900" height="600" rx="14" /></clipPath>
      </defs>
      <g clipPath={`url(#${uid}cl)`}>
        <rect width="900" height="600" fill={`url(#${uid}bg)`} />
        {/* guilloche */}
        <g fill="none" stroke="#f2b533" strokeOpacity=".07" strokeWidth="1">
          {guil.map((i) => <path key={i} d={`M0 ${40 + i * 34} C 150 ${i * 34 - 10}, 300 ${90 + i * 34}, 450 ${40 + i * 34} S 750 ${i * 34 - 10}, 900 ${40 + i * 34}`} />)}
        </g>
        <g fill="none" stroke="#fff" strokeOpacity=".05">
          {ray.map((i) => <line key={i} x1="450" y1="300" x2={450 + Math.cos((i * Math.PI) / 12) * 700} y2={300 + Math.sin((i * Math.PI) / 12) * 700} />)}
        </g>
        {/* frame */}
        <rect x="22" y="22" width="856" height="556" rx="8" fill="none" stroke={`url(#${uid}gold)`} strokeWidth="3" />
        <rect x="34" y="34" width="832" height="532" rx="4" fill="none" stroke="#f2b533" strokeOpacity=".5" strokeWidth="1" />
        {[[34, 34, 1, 1], [866, 34, -1, 1], [34, 566, 1, -1], [866, 566, -1, -1]].map(([x, y, sx, sy], i) => (
          <g key={i} transform={`translate(${x} ${y}) scale(${sx} ${sy})`} fill="none" stroke={`url(#${uid}gold)`} strokeWidth="2.2" strokeLinecap="round">
            <path d="M0 46 C0 18 18 0 46 0" /><path d="M0 30 C0 12 12 0 30 0" opacity=".7" /><circle cx="52" cy="52" r="4" fill="#f2b533" stroke="none" /><path d="M16 16 L28 28" opacity=".6" />
          </g>
        ))}
        {/* heading */}
        <text x="450" y="104" textAnchor="middle" fontFamily={SANS} fontSize="15" letterSpacing="9" fill="#f2b533" fontWeight="600">CERTIFICATE OF COMPLETION</text>
        <line x1="300" y1="122" x2="600" y2="122" stroke="#f2b533" strokeOpacity=".5" />
        <circle cx="450" cy="122" r="3.5" fill="#f2b533" />
        {/* seal */}
        <g className={animated ? "tz-cert__seal" : ""}>
          {Array.from({ length: 28 }, (_, i) => {
            const a = (i * 2 * Math.PI) / 28;
            const r1 = 60, r2 = i % 2 ? 70 : 76;
            return <line key={i} x1={450 + Math.cos(a) * r1} y1={208 + Math.sin(a) * r1} x2={450 + Math.cos(a) * r2} y2={208 + Math.sin(a) * r2} stroke={`url(#${uid}gold)`} strokeWidth="5" strokeLinecap="round" />;
          })}
          <circle cx="450" cy="208" r="62" fill={`url(#${uid}seal)`} stroke="#7a4f05" strokeWidth="2.5" />
          <circle cx="450" cy="208" r="50" fill="none" stroke="#7a4f05" strokeOpacity=".55" strokeWidth="1.5" strokeDasharray="2 4" />
          <path d="M450 172 L459 196 L485 197 L464 213 L472 238 L450 223 L428 238 L436 213 L415 197 L441 196 Z" fill="#fff7d1" stroke="#7a4f05" strokeWidth="2" strokeLinejoin="round" />
        </g>
        <path d="M416 262 L400 330 L424 318 L440 340 L446 272 Z M484 262 L500 330 L476 318 L460 340 L454 272 Z" fill="#b91c1c" stroke="#7f1d1d" strokeWidth="1.5" strokeLinejoin="round" />
        {/* body */}
        <text x="450" y="392" textAnchor="middle" fontFamily={SERIF} fontSize="50" fontWeight="700" fill="#fff" letterSpacing="1">{title}</text>
        <text x="450" y="432" textAnchor="middle" fontFamily={SANS} fontSize="17" fill="#c7cff0">awarded to</text>
        <text x="450" y="486" textAnchor="middle" fontFamily={SERIF} fontSize="46" fontStyle="italic" fill={`url(#${uid}gold)`}>{username}</text>
        <line x1="260" y1="500" x2="640" y2="500" stroke="#f2b533" strokeOpacity=".5" />
        <text x="450" y="530" textAnchor="middle" fontFamily={SANS} fontSize="17" fill="#e5e9ff" fontWeight="600">{phase}  ·  {tradingDays} trading days</text>
        <text x="60" y="556" fontFamily={SANS} fontSize="12" fill="#8f9acb">{fmtDate(date)}  ·  No amounts shown</text>
        <text x="840" y="556" textAnchor="end" fontFamily={SANS} fontSize="12" fill="#8f9acb" letterSpacing="1">{id}</text>
        <text x="450" y="560" textAnchor="middle" fontFamily={SANS} fontSize="12" fill="#f2b533" fontWeight="700" letterSpacing="4">TREDZI</text>
        {animated && <rect className="tz-cert__shine" x="0" y="0" width="160" height="600" fill={`url(#${uid}sh)`} />}
      </g>
    </svg>
  );
}

// Renders the SVG to a PNG blob (2x by default). Uses system fonts, so the look matches on every device.
export async function certificateToPng(svgEl, scale = 2) {
  const clone = svgEl.cloneNode(true);
  clone.setAttribute("width", "900");
  clone.setAttribute("height", "600");
  clone.querySelectorAll(".tz-cert__shine").forEach((n) => n.remove());
  const xml = new XMLSerializer().serializeToString(clone);
  const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const c = document.createElement("canvas");
    c.width = 900 * scale; c.height = 600 * scale;
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    return await new Promise((res) => c.toBlob(res, "image/png"));
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function shareOrDownload(blob, filename = "challenge-passed.png") {
  const file = new File([blob], filename, { type: "image/png" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: "Challenge passed" }); return "shared"; } catch (e) { if (e && e.name === "AbortError") return "cancelled"; }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  return "downloaded";
}
