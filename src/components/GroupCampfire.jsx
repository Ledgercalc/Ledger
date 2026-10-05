import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "./ui.jsx";
import { display, mono, palette } from "../lib/theme.js";
import "./GroupCampfire.css";

const DAY_MS = 24 * 60 * 60 * 1000;
// scale = flame size, glow = light radius, sparks/smoke = particle counts
const LEVELS = [
  { name: "Embers", scale: 0, glow: 0, sparks: 0, smoke: 0 },
  { name: "Warm glow", scale: 0.5, glow: 170, sparks: 3, smoke: 0 },
  { name: "Crackling", scale: 0.72, glow: 220, sparks: 6, smoke: 2 },
  { name: "Roaring", scale: 0.92, glow: 270, sparks: 9, smoke: 3 },
  { name: "Bonfire", scale: 1.1, glow: 330, sparks: 13, smoke: 3 },
];
const STARS = [
  [341, 250, 1, 0.9], [676, 20, 0.8, 0.5], [384, 157, 0.8, 0.6], [48, 30, 1.5, 0.9], [81, 69, 0.8, 0.9], [70, 219, 2, 0.5],
  [980, 65, 2, 0.5], [600, 157, 1.5, 0.5], [236, 19, 2, 0.6], [306, 115, 1, 0.5], [594, 86, 2, 0.6], [115, 156, 2, 0.6],
  [391, 32, 2, 0.5], [587, 23, 2, 0.6], [518, 182, 2, 0.9], [805, 88, 1.5, 0.9], [380, 84, 1, 0.6], [725, 207, 1, 0.5],
  [906, 95, 1.5, 0.7], [633, 26, 0.8, 0.9], [178, 201, 1.2, 0.6], [965, 133, 1.5, 0.5], [694, 27, 2, 0.7], [358, 185, 1.2, 0.9],
  [870, 31, 1.2, 0.9], [758, 187, 1.2, 0.9], [301, 191, 1.5, 0.7], [182, 164, 0.8, 0.9], [766, 71, 1.5, 0.9], [948, 231, 1.5, 0.5],
  [180, 122, 1.5, 0.7], [914, 43, 1.5, 0.7], [733, 114, 1.2, 0.9], [190, 46, 1, 0.6], [22, 132, 2, 0.6], [439, 144, 1.2, 0.7],
];
const SPARKS = [
  [488, 190, -6, 3.2], [514, 176, 12, 2.4], [470, 205, -16, 2.8], [532, 198, 18, 3], [500, 160, 2, 2.2], [455, 215, -22, 2.6],
  [545, 212, 24, 2.4], [492, 224, -10, 2], [520, 150, 8, 3.4], [478, 168, -14, 2.2], [538, 180, 20, 2], [505, 140, -4, 2.6], [466, 188, -20, 2],
];
const SMOKE = [[506, 150, 26], [520, 104, 32], [498, 62, 38]];

function toMs(ts) {
  const n = Number(ts) || 0;
  return n > 0 && n < 1e12 ? n * 1000 : n;
}
const dayKey = (ms) => {
  const d = new Date(ms);
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
};

// Everything the campfire needs, from the members and messages the app already has loaded.
export function campfireStats({ members, messages, memberCount, me }) {
  const now = Date.now();
  const list = Array.isArray(members) ? members : [];
  const recent = new Set();
  const days = new Set();
  (messages || []).forEach((m) => {
    if (!m) return;
    const ms = toMs(m.ts);
    if (ms > 0) days.add(dayKey(ms));
    if (m.author && now - ms <= DAY_MS) recent.add(m.author);
  });
  const known = new Set(list.map((m) => m.username));
  const activeUsers = list.length ? [...recent].filter((u) => known.has(u)) : [...recent];
  const total = Math.max(Number(memberCount) || 0, list.length, activeUsers.length, 1);
  const active = activeUsers.length;
  const ratio = active / total;
  const ratioLevel = active === 0 ? 0 : ratio >= 1 ? 4 : ratio >= 0.6 ? 3 : ratio >= 0.3 ? 2 : 1;

  // Days in a row with at least one message (a quiet day today does not break yesterday's run yet).
  let streak = 0;
  let cursor = now;
  if (!days.has(dayKey(cursor))) cursor -= DAY_MS;
  while (days.has(dayKey(cursor)) && streak < 365) {
    streak += 1;
    cursor -= DAY_MS;
  }
  const bonus = streak >= 7 ? 2 : streak >= 3 ? 1 : 0;
  const level = active === 0 ? 0 : Math.min(4, ratioLevel + bonus);
  const online = list.filter((m) => m.isOnline).length;
  return { active, total, level, streak, online, activeSet: new Set(activeUsers), meActive: !!me && recent.has(me) };
}

// The flames and logs on their own (also used by the small strip).
function FireDrawing({ level, uid }) {
  const L = LEVELS[level];
  const flameT = `translate(500 330) scale(${L.scale || 1}) translate(-500 -330)`;
  return (
    <>
      <defs>
        <linearGradient id={`${uid}-f1`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FF9A4A" />
          <stop offset="100%" stopColor="#E0412F" />
        </linearGradient>
        <linearGradient id={`${uid}-f2`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFC866" />
          <stop offset="100%" stopColor="#FF8A3D" />
        </linearGradient>
        <linearGradient id={`${uid}-f3`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFEBA8" />
          <stop offset="100%" stopColor="#FFC25C" />
        </linearGradient>
        <linearGradient id={`${uid}-log`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#A4693A" />
          <stop offset="100%" stopColor="#5E3A1F" />
        </linearGradient>
      </defs>

      {level > 0 && (
        <g transform={flameT}>
          <g className="cf-tl"><path d="M452 190 C440 214 428 232 432 262 C436 296 458 322 482 328 C470 300 458 268 454 240 C452 222 452 206 452 190Z" fill={`url(#${uid}-f1)`} /></g>
          <g className="cf-tr"><path d="M552 178 C570 206 580 236 574 268 C568 300 548 322 524 328 C534 300 548 268 550 240 C552 218 554 198 552 178Z" fill={`url(#${uid}-f1)`} /></g>
          <g className="cf-flame cf-f1"><path d="M500 128 C512 168 548 188 556 232 C566 286 536 330 500 330 C464 330 434 286 444 232 C452 188 488 168 500 128Z" fill={`url(#${uid}-f1)`} /></g>
          <g className="cf-flame cf-f2"><path d="M500 170 C508 200 532 216 536 250 C540 292 522 328 500 328 C478 328 460 292 464 250 C468 216 492 200 500 170Z" fill={`url(#${uid}-f2)`} /></g>
          <g className="cf-flame cf-f3"><path d="M500 214 C506 236 520 248 522 272 C524 300 514 326 500 326 C486 326 476 300 478 272 C480 248 494 236 500 214Z" fill={`url(#${uid}-f3)`} /></g>
          <g className="cf-flame cf-f4"><ellipse cx="500" cy="302" rx="12" ry="22" fill="#FFF4D2" /></g>
        </g>
      )}

      {level === 0 && (
        <>
          <circle className="cf-ember" cx="466" cy="318" r="6" fill="#E0412F" />
          <circle className="cf-ember" cx="503" cy="308" r="7.5" fill="#FF8A3D" style={{ animationDelay: "-0.9s" }} />
          <circle className="cf-ember" cx="541" cy="319" r="5.5" fill="#E0412F" style={{ animationDelay: "-1.7s" }} />
        </>
      )}

      {/* logs */}
      <g transform="rotate(-6 490 338)">
        <rect x="392" y="326" width="200" height="24" rx="12" fill={`url(#${uid}-log)`} />
        <ellipse cx="398" cy="338" rx="7" ry="12" fill="#C9965A" />
        <ellipse cx="398" cy="338" rx="3.4" ry="6.4" fill="none" stroke="#8B5A2B" strokeWidth="1.2" />
      </g>
      <g transform="rotate(9 525 336)">
        <rect x="440" y="326" width="200" height="22" rx="11" fill={`url(#${uid}-log)`} />
        <ellipse cx="634" cy="337" rx="6.5" ry="11" fill="#C9965A" />
        <ellipse cx="634" cy="337" rx="3" ry="6" fill="none" stroke="#8B5A2B" strokeWidth="1.2" />
      </g>
      <g transform="rotate(-2 500 346)">
        <rect x="430" y="338" width="150" height="16" rx="8" fill="#4A2F18" />
      </g>
    </>
  );
}

function Scene({ level, uid }) {
  const L = LEVELS[level];
  return (
    <>
      <defs>
        <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#04070E" />
          <stop offset="50%" stopColor="#0D152C" />
          <stop offset="100%" stopColor="#2A3260" />
        </linearGradient>
        <linearGradient id={`${uid}-hillA`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10162E" />
          <stop offset="100%" stopColor="#0A0F22" />
        </linearGradient>
        <linearGradient id={`${uid}-hillB`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#090D1E" />
          <stop offset="100%" stopColor="#070A16" />
        </linearGradient>
        <linearGradient id={`${uid}-ground`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#151630" />
          <stop offset="100%" stopColor="#1A1230" />
        </linearGradient>
        <radialGradient id={`${uid}-glow`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FF9A3C" stopOpacity="0.5" />
          <stop offset="50%" stopColor="#FF8A3D" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#FF8A3D" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${uid}-gglow`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FF8A3D" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#FF8A3D" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${uid}-moon`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#DDE5FA" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#DDE5FA" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${uid}-puff`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#C9D3EC" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#C9D3EC" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="1000" height="460" fill={`url(#${uid}-sky)`} />
      {STARS.map(([x, y, r, o], i) => (
        <circle key={i} className={i % 3 === 0 ? "cf-star" : undefined} cx={x} cy={y} r={r} fill="#E6ECFF" opacity={o} style={i % 3 === 0 ? { animationDelay: `${-i * 0.37}s` } : undefined} />
      ))}
      <circle cx="736" cy="72" r="60" fill={`url(#${uid}-moon)`} />
      <path d="M730 52 A24 24 0 1 0 752.2 85.2 A20 20 0 1 1 730 52Z" fill="#E4EAF8" />

      <path d="M0 318 C140 270 280 296 420 322 C560 346 700 288 840 300 C920 306 960 318 1000 312 V460 H0Z" fill={`url(#${uid}-hillA)`} />
      <path d="M0 346 C130 318 260 322 400 348 C540 372 690 322 840 334 C920 340 960 352 1000 346 V460 H0Z" fill={`url(#${uid}-hillB)`} />
      {level > 0 && <ellipse cx="500" cy="352" rx={L.glow * 1.05} ry="58" fill={`url(#${uid}-gglow)`} />}
      <path d="M0 392 C150 362 310 358 460 378 C610 398 760 360 1000 384 V460 H0Z" fill={`url(#${uid}-ground)`} />

      {level > 0 && (
        <g className="cf-glow">
          <circle cx="500" cy="300" r={L.glow} fill={`url(#${uid}-glow)`} />
        </g>
      )}

      {SMOKE.slice(0, L.smoke).map(([x, y, r], i) => (
        <circle key={i} className="cf-smoke" cx={x} cy={y} r={r} fill={`url(#${uid}-puff)`} style={{ "--dx": `${10 + i * 8}px`, animationDelay: `${-i * 2.3}s` }} />
      ))}

      <FireDrawing level={level} uid={uid} />

      {SPARKS.slice(0, L.sparks).map(([x, y, dx, r], i) => (
        <circle
          key={i}
          className="cf-spark"
          cx={x}
          cy={y + (1 - L.scale) * 90}
          r={r}
          fill={i % 2 ? "#FFD27A" : "#FF9A4A"}
          style={{ "--dx": `${dx}px`, animationDelay: `${-i * 0.55}s`, animationDuration: `${2.6 + (i % 4) * 0.5}s` }}
        />
      ))}
    </>
  );
}

function useWidth(ref, fallback = 360) {
  const [w, setW] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const read = () => setW(el.getBoundingClientRect().width || fallback);
    read();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, fallback]);
  return w;
}

export default function GroupCampfire({ members = [], messages = [], memberCount, me, variant = "card" }) {
  const stats = useMemo(() => campfireStats({ members, messages, memberCount, me }), [members, messages, memberCount, me]);
  const { active, total, level, streak, online, activeSet, meActive } = stats;
  const L = LEVELS[level];
  const wrapRef = useRef(null);
  const w = useWidth(wrapRef);
  const tall = w < 540;

  if (variant === "strip") {
    return (
      <div
        className="flex items-center gap-3"
        style={{ background: palette.field, border: `1px solid ${palette.border}`, borderRadius: 14, padding: "8px 12px" }}
      >
        <svg width="46" height="52" viewBox="404 112 192 250" role="img" aria-label={`Campfire: ${L.name}`} style={{ flexShrink: 0, borderRadius: 10, background: "#0C1328" }}>
          <FireDrawing level={level} uid="strip" />
        </svg>
        <div className="min-w-0 flex-1">
          <div style={{ color: palette.text, fontFamily: display, fontSize: "14px", fontWeight: 700 }}>Campfire · {L.name}</div>
          <div style={{ color: palette.textMuted, fontSize: "12px" }}>
            {active} of {total} active · {streak > 0 ? `${streak}-day fire` : "no streak yet"}
          </div>
        </div>
      </div>
    );
  }

  // Who sits around the fire: online first, then people who spoke today; the busiest sit in the middle.
  const maxShown = w < 380 ? 5 : w < 560 ? 6 : 8;
  const ranked = [...members].sort((a, b) => {
    const sa = (a.isOnline ? 2 : 0) + (activeSet.has(a.username) ? 1 : 0);
    const sb = (b.isOnline ? 2 : 0) + (activeSet.has(b.username) ? 1 : 0);
    return sb - sa || String(a.username).localeCompare(String(b.username));
  });
  const shown = ranked.slice(0, maxShown);
  const n = shown.length;
  const slots = Array.from({ length: n }, (_, i) => (n === 1 ? 0 : (i / (n - 1)) * 2 - 1)); // -1 .. 1, left to right
  const centerOut = [...slots].sort((a, b) => Math.abs(a) - Math.abs(b) || b - a);
  const seat = new Map(shown.map((m, i) => [m.username, centerOut[i]]));
  const avatar = Math.round(Math.max(30, Math.min(50, w * 0.085)));
  const spread = 38; // percent of the width on each side of the middle
  const nameW = n > 1 ? Math.max(48, ((spread * 2) / (n - 1)) * (w / 100) - 4) : 90;
  const baseTop = tall ? 79 : 78;

  const subtitle = `${online} online · ${streak > 0 ? `${streak}-day fire` : "fire not started"}`;
  const hint =
    level === 4
      ? "Everyone added wood today. The bonfire is at its peak."
      : meActive
      ? "You added wood today. The more members speak, the higher it burns."
      : active === 0
      ? "The fire is down to embers. Send a message to light it today."
      : "Send a message in the group to add wood to the fire.";

  return (
    <div>
      <div
        ref={wrapRef}
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: tall ? "100 / 92" : "1000 / 460",
          borderRadius: 18,
          overflow: "hidden",
          background: "#04070E",
          border: `1px solid ${palette.border}`,
        }}
      >
        <svg
          viewBox="0 0 1000 460"
          preserveAspectRatio="xMidYMid slice"
          role="img"
          aria-label={`Group campfire: ${L.name}, ${active} of ${total} members active`}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        >
          <Scene level={level} uid="card" />
        </svg>

        <div style={{ position: "absolute", left: 16, top: 14, right: 16, display: "flex", justifyContent: "space-between", gap: 8, pointerEvents: "none" }}>
          <div className="min-w-0">
            <div style={{ color: "#FFFFFF", fontFamily: display, fontSize: tall ? "17px" : "20px", fontWeight: 700, textShadow: "0 1px 6px rgba(0,0,0,0.5)" }}>Group campfire</div>
            <div style={{ color: "#A9B6D6", fontSize: "13px", marginTop: 2, textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>{subtitle}</div>
          </div>
          <span
            style={{
              alignSelf: "flex-start",
              flexShrink: 0,
              fontFamily: mono,
              fontSize: "12px",
              fontWeight: 700,
              padding: "3px 10px",
              borderRadius: 999,
              color: level === 0 ? "#A9B6D6" : "#FFC27A",
              background: "rgba(10,14,28,0.55)",
              border: `1px solid ${level === 0 ? "rgba(169,182,214,0.35)" : "rgba(255,168,80,0.45)"}`,
            }}
          >
            {L.name}
          </span>
        </div>

        {shown.map((m) => {
          const t = seat.get(m.username) || 0;
          const on = activeSet.has(m.username);
          return (
            <div
              key={m.username}
              title={`${m.username}${m.isOnline ? " (online)" : ""}: ${on ? "added wood today" : "quiet today"}`}
              style={{
                position: "absolute",
                left: `${50 + t * spread}%`,
                top: `${baseTop + 5 * (1 - t * t)}%`,
                transform: "translate(-50%, -50%)",
                width: nameW,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                opacity: on || m.isOnline ? 1 : 0.62,
                transition: "opacity 0.3s ease",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  padding: 2,
                  borderRadius: 999,
                  border: `2px solid ${on ? "#FFA84F" : "rgba(255,255,255,0.14)"}`,
                  boxShadow: on ? "0 0 14px rgba(255,150,60,0.55)" : "none",
                  background: "rgba(8,12,24,0.35)",
                }}
              >
                <Avatar name={m.username} size={avatar} src={m.avatar} online={!!m.isOnline} />
              </span>
              <span
                className="truncate"
                style={{ maxWidth: "100%", color: on ? "#F2F5FC" : "#AEB9D3", fontSize: "12px", fontWeight: on ? 600 : 500, textShadow: "0 1px 4px rgba(0,0,0,0.85)" }}
              >
                {m.username}
              </span>
            </div>
          );
        })}
        {members.length > n && (
          <span style={{ position: "absolute", right: 12, bottom: 10, color: "#A9B6D6", fontFamily: mono, fontSize: "12px", textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>
            +{members.length - n} more
          </span>
        )}
      </div>
      <p style={{ color: palette.textMuted, fontSize: "12px", lineHeight: 1.5, margin: "8px 2px 0" }}>{hint}</p>
    </div>
  );
}
