import { AlertTriangle, Camera, Check, ChevronDown, ChevronLeft, Copy, Flame, Inbox, Lightbulb, Lock, MessageCircle, Pencil, Plus, Send, Share2, ShieldAlert, Sparkles, StickyNote, Target, TrendingDown, TrendingUp, Trash2, Users, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { COMMUNITY_API_BASE } from "../api/community.js";
import { Avatar } from "../components/ui.jsx";
import { dayKeyFromDate, dayKeyFromTs, num } from "../lib/format.js";
import { tradeScreenshots } from "../lib/images.js";
import { isCleanCheckin } from "../lib/playbook.js";
import { openPlans } from "../lib/planStore.js";
import { TAP, mono, palette, sans } from "../lib/theme.js";

// Partner: a private accountability pair (yes/no signs only), plus Mentor mode, where a Creator coaches
// mentees on the specific trades they choose to share. Nothing else about a trader's account is ever shared.

/* ---------- colour system ----------
   Three semantic colours only, each used for one meaning everywhere:
   emerald = kept / profit, rose = broken / loss, amber = waiting / needs attention. Gold stays the brand accent.
   `ink()` pulls a colour toward the theme's text colour so small text stays readable in dark AND light themes. */
const GOOD = "#10b981";
const BAD = "#f43f5e";
const onGold = () => palette.letterbox || "#fff"; // text on blue/gold buttons, same colour the other tabs use (read at render so theme switches apply)
const WARN = "#f59e0b";
const tint = (color, pct) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;
const ink = (color) => `color-mix(in srgb, ${color} 72%, ${palette.text})`;
const soft = (color, pct = 10) => `color-mix(in srgb, ${color} ${pct}%, ${palette.surface})`; // flat tinted fill, no gradient
const pnlColor = (n) => (n > 0 ? GOOD : n < 0 ? BAD : palette.textMuted);

const COMMIT_MAX = 140;
const NUDGES = [
  ["you_good", "You good?"],
  ["step_away", "Step away for an hour"],
  ["nice_one", "Nice discipline today"],
  ["check_in", "Where's your check-in?"],
];
const NUDGE_TEXT = {
  you_good: "says: You good?",
  step_away: "says: Step away for an hour.",
  nice_one: "says: Nice discipline today.",
  check_in: "says: Where's your check-in?",
  left: "ended the connection.",
  comment: "commented on a shared trade.",
};
// one-tap starters so a mentor can give useful feedback in seconds, and a mentee knows what to ask
const MENTOR_QUICK = [
  ["Followed plan", "Clean entry and you followed your plan."],
  ["Entry early", "Entry was early. Wait for confirmation before you click."],
  ["Risk too big", "Risk was too big for this setup. Size down until it's proven."],
  ["Moved stop", "You moved the stop. Keep it fixed once the trade is live."],
  ["Good patience", "Good patience here. Let the winners run."],
  ["Skip setup", "I'd skip this setup until you've tested it more."],
];
const MENTEE_QUICK = [
  ["Entry too early?", "Was my entry too early?"],
  ["Held long enough?", "Should I have held this longer?"],
  ["Size right?", "Was my position size right for this setup?"],
  ["Your take", "What would you have done differently here?"],
];
const DEFAULT_SHARE = { on: true, checkin: true, trades: true, loss: true };
const money = (n) => `${n < 0 ? "-" : "+"}$${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const dateText = (ts) => new Date(ts).toLocaleDateString([], { month: "short", day: "numeric" });
const ago = (ts) => {
  if (!ts) return "";
  const d = Math.floor((Date.now() - ts) / 86400000);
  if (d <= 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 30) return `${d}d ago`;
  return dateText(ts);
};
const plural = (n, one, many) => `${n} ${n === 1 ? one : many || `${one}s`}`;

async function api(token, path, { method = "GET", body } = {}) {
  const res = await fetch(`${COMMUNITY_API_BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = {};
  try { data = await res.json(); } catch (e) { /* empty body */ }
  if (!res.ok) {
    const err = new Error(data.error || "Something went wrong. Try again.");
    err.status = res.status;
    err.upgrade = data.upgrade;
    err.needUsername = data.needUsername;
    throw err;
  }
  return data;
}

// Screenshots are shrunk on the device before sharing so they stay small.
function shrinkImage(src) {
  const steps = [[900, 0.72], [700, 0.6], [520, 0.55]];
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      for (const [max, q] of steps) {
        try {
          const k = Math.min(1, max / Math.max(img.width, img.height));
          const c = document.createElement("canvas");
          c.width = Math.max(1, Math.round(img.width * k));
          c.height = Math.max(1, Math.round(img.height * k));
          c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
          const out = c.toDataURL("image/jpeg", q);
          if (out.length <= 270000) return resolve(out);
        } catch (e) { return resolve(null); }
      }
      return resolve(null);
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// ---- numbers for the mentor tools, all worked out on the device from the trades a mentee chose to share ----
function tradeStats(list) {
  const n = list.length;
  const wins = list.filter((t) => t.pnl > 0);
  const losses = list.filter((t) => t.pnl < 0);
  const gross = wins.reduce((s, t) => s + t.pnl, 0);
  const lost = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  return {
    n, wins: wins.length, losses: losses.length, gross, lost,
    net: gross - lost,
    winRate: n ? (wins.length / n) * 100 : 0,
    avgWin: wins.length ? gross / wins.length : 0,
    avgLoss: losses.length ? lost / losses.length : 0,
    pf: lost > 0 ? gross / lost : gross > 0 ? Infinity : 0,
  };
}
function groupTrades(list, key) {
  const map = {};
  list.forEach((t) => {
    const k = String(t[key] || "").trim();
    if (!k) return;
    const g = map[k] || (map[k] = { label: k, n: 0, net: 0, lossN: 0 });
    g.n += 1; g.net += t.pnl; if (t.pnl < 0) g.lossN += 1;
  });
  return Object.values(map).sort((a, b) => a.net - b.net);
}
const hasFeedback = (t) => (t.feedback !== undefined ? t.feedback > 0 : t.comments > 0);
function coachInsights(list) {
  const s = tradeStats(list);
  const out = [];
  if (s.n < 3) return out;
  const open = list.filter((t) => !hasFeedback(t)).length;
  if (open > 0) out.push({ tone: WARN, text: `${plural(open, "trade")} still waiting for your feedback.` });
  if (s.losses >= 3) {
    for (const key of ["emotion", "setup", "session"]) {
      const lossList = list.filter((t) => t.pnl < 0 && String(t[key] || "").trim());
      if (lossList.length < 3) continue;
      const g = groupTrades(lossList, key).sort((a, b) => b.n - a.n)[0];
      if (g && g.n / s.losses >= 0.5) { out.push({ tone: BAD, text: `${Math.round((g.n / s.losses) * 100)}% of their losses are tagged "${g.label}". Worth a conversation.` }); break; }
    }
  }
  if (s.avgLoss > 0 && s.avgWin > 0 && s.avgLoss > s.avgWin * 1.25) out.push({ tone: BAD, text: "Average loss is bigger than average win. Look at stop placement and early exits." });
  else if (s.avgWin > s.avgLoss * 1.5 && s.winRate < 50) out.push({ tone: GOOD, text: "Wins are much bigger than losses. A low win rate is still profitable here." });
  if (s.winRate >= 60 && s.net < 0) out.push({ tone: WARN, text: "High win rate but net negative. A few big losers are erasing the wins." });
  return out.slice(0, 3);
}

/* ---------- small building blocks ---------- */
const sub = { fontSize: 11.5, color: palette.textFaint, lineHeight: 1.5, marginTop: 3 };
const eyebrow = { fontFamily: mono, fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: palette.textFaint };
const btn = (primary, danger) => ({
  minHeight: 38, padding: "8px 16px", borderRadius: 99, fontSize: 12.5, fontWeight: 700, fontFamily: sans, cursor: "pointer", whiteSpace: "nowrap",
  border: `1px solid ${danger ? tint(BAD, 42) : primary ? palette.gold : palette.border}`,
  background: primary ? palette.gold : "transparent",
  color: primary ? onGold() : danger ? ink(BAD) : palette.textMuted,
});
const small = { minHeight: 34, padding: "6px 13px", fontSize: 12 };
const field = { width: "100%", minHeight: 42, padding: "9px 13px", borderRadius: 13, fontSize: 16, fontFamily: sans, background: palette.field, border: `1px solid ${palette.border}`, color: palette.text, outline: "none" };

function Card({ title, icon, aside, children, tone, style }) {
  return (
    <section style={{
      background: tone ? soft(tone, 9) : palette.surface,
      border: `1px solid ${tone ? tint(tone, 34) : palette.border}`, borderRadius: 16, padding: "16px 16px 15px", marginBottom: 14, boxShadow: palette.shadow, ...style,
    }}>
      {(title || aside) && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
            {icon && <span style={{ width: 28, height: 28, borderRadius: 10, display: "grid", placeItems: "center", flexShrink: 0, background: soft(palette.gold, 12), color: palette.gold }}>{icon}</span>}
            <h3 style={{ margin: 0, fontSize: 13.5, fontWeight: 800, color: palette.text, letterSpacing: -0.1 }}>{title}</h3>
          </div>
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

function Switch({ on, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className={TAP}
      style={{ position: "relative", width: 44, height: 26, borderRadius: 99, border: `1px solid ${on ? tint(palette.gold, 60) : palette.border}`, flexShrink: 0, cursor: "pointer", background: on ? palette.gold : tint(palette.text, 12), transition: "background .18s ease" }}>
      <span style={{ position: "absolute", top: 2, left: on ? 20 : 2, width: 20, height: 20, borderRadius: 99, background: "#fff", transition: "left .18s ease" }} />
    </button>
  );
}

function Segmented({ value, onChange, options, full }) {
  return (
    <div role="tablist" style={{ display: full ? "flex" : "inline-flex", padding: 4, gap: 3, borderRadius: 15, background: tint(palette.text, 6), border: `1px solid ${palette.border}` }}>
      {options.map(([id, label, dot]) => {
        const on = value === id;
        return (
          <button key={id} type="button" role="tab" aria-selected={on} onClick={() => onChange(id)} className={TAP}
            style={{ position: "relative", flex: full ? 1 : "none", minHeight: 36, padding: "6px 20px", borderRadius: 11, border: `1px solid ${on ? palette.border : "transparent"}`, cursor: "pointer", fontFamily: sans, fontSize: 13, fontWeight: 800, background: on ? palette.surface : "transparent", color: on ? palette.text : palette.textFaint, transition: "all .15s ease" }}>
            {label}
            {dot && <span aria-hidden="true" style={{ position: "absolute", top: 6, right: 8, width: 8, height: 8, borderRadius: 99, background: WARN, boxShadow: `0 0 0 2px ${palette.surface}` }} />}
          </button>
        );
      })}
    </div>
  );
}

function Pill({ children, color, solid }) {
  const c = color || palette.textMuted;
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 99, fontSize: 10.5, fontWeight: 800, color: solid ? onGold() : ink(c), background: solid ? c : tint(c, 14), border: `1px solid ${tint(c, solid ? 0 : 26)}`, whiteSpace: "nowrap" }}>{children}</span>;
}

function Chip({ children, onClick, on, color }) {
  const c = color || palette.gold;
  return (
    <button type="button" onClick={onClick} className={TAP} style={{ flexShrink: 0, minHeight: 32, padding: "5px 12px", borderRadius: 99, fontSize: 12, fontWeight: 700, fontFamily: sans, cursor: "pointer", whiteSpace: "nowrap", border: `1px solid ${on ? tint(c, 55) : palette.border}`, background: on ? tint(c, 16) : "transparent", color: on ? ink(c) : palette.textMuted }}>{children}</button>
  );
}

function Empty({ icon, title, text, children }) {
  return (
    <div style={{ textAlign: "center", padding: "22px 14px" }}>
      <span style={{ width: 48, height: 48, borderRadius: 16, display: "inline-grid", placeItems: "center", background: soft(palette.gold, 12), color: palette.gold }}>{icon}</span>
      <div style={{ fontSize: 14.5, fontWeight: 800, color: palette.text, marginTop: 11 }}>{title}</div>
      <div style={{ ...sub, maxWidth: 340, margin: "5px auto 0" }}>{text}</div>
      {children}
    </div>
  );
}

function StatTile({ label, value, color, hint }) {
  return (
    <div style={{ flex: "1 1 0", minWidth: 0, padding: "11px 12px", borderRadius: 14, background: tint(palette.text, 4), border: `1px solid ${palette.border}` }}>
      <div style={{ ...eyebrow, fontSize: 9.5 }}>{label}</div>
      <div style={{ fontFamily: mono, fontSize: 18, fontWeight: 800, color: color ? ink(color) : palette.text, marginTop: 4, letterSpacing: -0.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div>
      {hint && <div style={{ fontSize: 10.5, color: palette.textFaint, marginTop: 1 }}>{hint}</div>}
    </div>
  );
}

function Ring({ value, total, color, size = 66 }) {
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = total > 0 ? Math.min(1, value / total) : 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }} role="img" aria-label={total ? `${value} of ${total} rules kept` : "No rules set"}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={tint(palette.text, 11)} strokeWidth={stroke} />
      {pct > 0 && <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${c * pct} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dasharray .5s ease" }} />}
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" style={{ fontFamily: mono, fontSize: size * 0.27, fontWeight: 800, fill: palette.text }}>{total ? `${value}/${total}` : "-"}</text>
    </svg>
  );
}

function Signal({ label, value, hint, pending }) {
  const state = value === true ? "yes" : value === false ? "no" : "none";
  const color = state === "yes" ? GOOD : state === "no" ? BAD : pending ? WARN : palette.textFaint;
  const strong = state !== "none" || pending;
  return (
    <div style={{ flex: "1 1 0", minWidth: 0, padding: "10px 10px 9px", borderRadius: 14, background: strong ? soft(color, 10) : "transparent", border: `1px ${strong ? "solid" : "dashed"} ${tint(color, strong ? 32 : 24)}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: ink(color), fontSize: 12, fontWeight: 800 }}>
        <span style={{ width: 18, height: 18, borderRadius: 99, display: "grid", placeItems: "center", background: strong ? tint(color, 22) : tint(palette.text, 8), flexShrink: 0 }}>
          {state === "yes" ? <Check size={11} strokeWidth={3} /> : state === "no" ? <X size={11} strokeWidth={3} /> : <span style={{ width: 6, height: 2, borderRadius: 2, background: "currentColor" }} />}
        </span>
        {state === "yes" ? "Kept" : state === "no" ? "Broken" : hint || "Not set"}
      </div>
      <div style={{ fontSize: 10.5, color: palette.textFaint, marginTop: 5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
    </div>
  );
}

function WeekStrip({ days, today }) {
  const cell = (s, weekend) => ({
    width: 22, height: 22, borderRadius: 8,
    background: s === "clean" ? GOOD : s === "broken" ? BAD : tint(palette.text, 9),
        opacity: weekend && s === "none" ? 0.4 : 1,
  });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 10.5, fontWeight: 700, color: palette.textFaint, textAlign: "right", paddingTop: 19 }}>
        <span style={{ height: 22, lineHeight: "22px" }}>You</span>
        <span style={{ height: 22, lineHeight: "22px" }}>Them</span>
      </div>
      <div style={{ display: "flex", flex: 1, justifyContent: "space-between", maxWidth: 380 }}>
        {days.map((d) => {
          const isToday = d.day === today;
          return (
            <div key={d.day} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "3px 3px 4px", margin: "-3px -3px -4px", borderRadius: 11, background: isToday ? tint(palette.gold, 10) : "transparent", boxShadow: isToday ? `0 0 0 1px ${tint(palette.gold, 34)}` : "none" }}>
              <span style={{ fontSize: 10, fontWeight: isToday ? 800 : 600, color: isToday ? palette.gold : palette.textFaint, height: 11, lineHeight: "11px" }}>{new Date(`${d.day}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "narrow", timeZone: "UTC" })}</span>
              <span style={cell(d.me, d.weekend)} />
              <span style={cell(d.them, d.weekend)} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- a partner ---------- */
function PartnerCard({ p, busy, today, onNudge, onLeave, onBlock }) {
  const [menu, setMenu] = useState(false);
  const [ask, setAsk] = useState(null);
  const [report, setReport] = useState(false);
  const t = p.today;
  const vals = [t.checkin, t.trades, t.loss];
  const broken = t.shared && vals.some((v) => v === false);
  const clean = t.shared && !broken && vals.some((v) => v === true);
  const tone = broken ? BAD : clean ? GOOD : palette.textFaint;
  const status = broken ? "Rule broken today" : clean ? "Clean today" : t.shared ? "Nothing to report" : "Quiet today";
  const live = p.streak.current > 0;
  const bothClean = p.days.filter((d) => d.me === "clean" && d.them === "clean").length;
  return (
    <Card style={{ padding: 0, overflow: "hidden", marginBottom: 0 }}>
      <div style={{ padding: "16px 16px 0", background: soft(tone, 10) }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ position: "relative", display: "inline-flex", flexShrink: 0 }}>
            <span style={{ padding: 2.5, borderRadius: 99, border: `2px solid ${tone}`, display: "inline-flex" }}>
              <Avatar name={p.username} size={38} src={p.avatar || undefined} />
            </span>
            <span aria-hidden="true" style={{ position: "absolute", right: 0, bottom: 1, width: 12, height: 12, borderRadius: 99, background: tone, border: `2px solid ${palette.surface}` }} />
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: palette.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: -0.1 }}>{p.username}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2, fontSize: 11.5, color: palette.textFaint, flexWrap: "wrap" }}>
              <span style={{ color: ink(tone), fontWeight: 700 }}>{status}</span>
              <span aria-hidden="true">·</span>
              <span>Since {dateText(p.since)}</span>
            </div>
          </div>
          <button type="button" aria-label="Partnership options" aria-expanded={menu} onClick={() => { setMenu((m) => !m); setAsk(null); }} className={TAP}
            style={{ width: 36, height: 36, borderRadius: 99, border: `1px solid ${palette.border}`, background: "transparent", color: palette.textMuted, display: "grid", placeItems: "center", cursor: "pointer", flexShrink: 0 }}>
            <ChevronDown size={16} style={{ transform: menu ? "rotate(180deg)" : "none", transition: "transform .15s ease" }} />
          </button>
        </div>

        {menu && !ask && (
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <button type="button" onClick={() => setAsk("leave")} style={btn(false)}>Leave partnership</button>
            <button type="button" onClick={() => setAsk("block")} style={btn(false, true)}>Block</button>
          </div>
        )}
        {ask === "leave" && (
          <div style={{ marginTop: 12, padding: 13, borderRadius: 14, background: tint(palette.text, 4), border: `1px solid ${palette.border}` }}>
            <div style={{ fontSize: 13, color: palette.text, fontWeight: 800 }}>Leave your partnership with {p.username}?</div>
            <div style={sub}>Your shared streak ends and they'll see that it ended. You can invite each other again later.</div>
            <div style={{ display: "flex", gap: 8, marginTop: 11 }}>
              <button type="button" onClick={() => setAsk(null)} style={btn(false)}>Stay</button>
              <button type="button" disabled={busy} onClick={() => onLeave(p)} style={btn(false, true)}>Leave</button>
            </div>
          </div>
        )}
        {ask === "block" && (
          <div style={{ marginTop: 12, padding: 13, borderRadius: 14, background: soft(BAD, 10), border: `1px solid ${tint(BAD, 30)}` }}>
            <div style={{ fontSize: 13, color: palette.text, fontWeight: 800 }}>Block {p.username}?</div>
            <div style={sub}>This ends the partnership and stops any invites, codes, nudges or coaching between you. They won't be told you blocked them. You can unblock later.</div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 11, fontSize: 12.5, color: palette.textMuted, cursor: "pointer" }}>
              <input type="checkbox" checked={report} onChange={(e) => setReport(e.target.checked)} /> Also report this person
            </label>
            <div style={{ display: "flex", gap: 8, marginTop: 11 }}>
              <button type="button" onClick={() => setAsk(null)} style={btn(false)}>Cancel</button>
              <button type="button" disabled={busy} onClick={() => onBlock(p.username, report)} style={btn(false, true)}>Block</button>
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <div title="Days you were both clean" style={{ flex: "1.2 1 0", minWidth: 0, display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 14, background: live ? soft(palette.gold, 12) : soft(palette.text, 5), border: `1px solid ${live ? tint(palette.gold, 40) : palette.border}` }}>
            <Flame size={22} style={{ color: live ? palette.gold : palette.textFaint, flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: mono, fontSize: 20, fontWeight: 800, color: palette.text, lineHeight: 1 }}>{p.streak.current}</div>
              <div style={{ fontSize: 10.5, color: palette.textFaint, marginTop: 3 }}>day streak</div>
            </div>
          </div>
          <StatTile label="Best" value={p.streak.best} hint={p.streak.best === 1 ? "day" : "days"} />
          <StatTile label="This week" value={bothClean} hint="clean together" color={bothClean > 0 ? GOOD : undefined} />
        </div>

        <div style={{ ...eyebrow, margin: "16px 0 8px" }}>{p.username}'s day</div>
        <div style={{ display: "flex", gap: 8 }}>
          <Signal label="Checked in" value={t.checkin} hint="Not yet" pending />
          <Signal label="Trade limit" value={t.trades} />
          <Signal label="Loss limit" value={t.loss} />
        </div>
        {!t.shared && <div style={sub}>{p.username} hasn't shared anything yet today.</div>}
        <div style={{ ...eyebrow, margin: "16px 0 10px" }}>Last 7 days</div>
        <div style={{ paddingBottom: 16 }}>
          <WeekStrip days={p.days} today={today} />
        </div>
      </div>

      <div style={{ padding: "13px 16px", borderTop: `1px solid ${palette.border}`, background: tint(palette.text, 3) }}>
        <div style={eyebrow}>Their commitment this week</div>
        {p.commit ? (
          <div style={{ fontSize: 13, color: palette.text, marginTop: 6, lineHeight: 1.5, padding: "2px 0 2px 11px", borderLeft: `3px solid ${palette.gold}` }}>{p.commit.text}</div>
        ) : (
          <div style={{ fontSize: 12.5, color: palette.textFaint, marginTop: 5 }}>Nothing written yet.</div>
        )}
        {p.lastCommit && (
          <div style={{ marginTop: 8, display: "flex", alignItems: "flex-start", gap: 7, fontSize: 11.5, color: palette.textFaint, lineHeight: 1.45 }}>
            <Pill color={p.lastCommit.kept === true ? GOOD : p.lastCommit.kept === false ? BAD : palette.textFaint}>{p.lastCommit.kept === true ? "Kept" : p.lastCommit.kept === false ? "Not kept" : "Pending"}</Pill>
            <span style={{ minWidth: 0 }}>Last week: "{p.lastCommit.text}"</span>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none", padding: "12px 16px 14px", borderTop: `1px solid ${palette.border}` }}>
        {NUDGES.map(([kind, text]) => (
          <button key={kind} type="button" disabled={busy} onClick={() => onNudge(p, kind)} className={TAP} style={{ ...btn(false), ...small, fontSize: 12 }}>{text}</button>
        ))}
      </div>
    </Card>
  );
}

/* ---------- the top strip: how my own day is going and what partners can see ---------- */
function TodayStrip({ share, setShare, mine, partners, isDesktop }) {
  const [open, setOpen] = useState(false);
  const rows = [
    ["checkin", "Checked in on plan", mine.checkin, "Not yet", true],
    ["trades", "Kept to max trades", mine.trades, "Not set", false],
    ["loss", "Inside the loss limit", mine.loss, "Not set", false],
  ];
  const known = rows.filter((r) => r[2] !== null);
  const kept = known.filter((r) => r[2] === true).length;
  const broken = rows.some((r) => r[2] === false);
  const good = !broken && kept > 0;
  const tone = broken ? BAD : good ? GOOD : palette.textFaint;
  const headline = broken ? "A rule was broken today" : good ? "You're on track today" : "Nothing to report yet";
  const best = partners.reduce((m, p) => Math.max(m, p.streak.current), 0);
  const clean = partners.filter((p) => p.today.shared && ![p.today.checkin, p.today.trades, p.today.loss].some((v) => v === false) && [p.today.checkin, p.today.trades, p.today.loss].some((v) => v === true)).length;
  const hints = { checkin: "Check in on your Trade plan", trades: "Set max trades per day in Settings", loss: "Set a daily loss limit in Settings" };
  return (
    <Card style={{ padding: 0, overflow: "hidden", background: soft(tone, 11) }}>
      <div style={{ padding: isDesktop ? "18px 20px" : "16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "minmax(0, 1.15fr) minmax(0, 1.5fr)" : "1fr", gap: isDesktop ? 24 : 16, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
            <Ring value={kept} total={known.length} color={tone} size={isDesktop ? 72 : 66} />
            <div style={{ minWidth: 0 }}>
              <div style={{ ...eyebrow, display: "flex", alignItems: "center", gap: 6, color: ink(tone) }}>
                <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: 99, background: tone }} /> Your day
              </div>
              <div style={{ fontSize: isDesktop ? 19 : 17, fontWeight: 800, color: palette.text, letterSpacing: -0.3, marginTop: 4 }}>{headline}</div>
              <div style={{ ...sub, marginTop: 4 }}>
                {partners.length > 0
                  ? `${clean} of ${partners.length} partner${partners.length === 1 ? " is" : "s are"} clean today${best > 0 ? `. Longest streak: ${plural(best, "day")}.` : "."}`
                  : "Add a partner to start a clean-day streak together."}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, opacity: share.on ? 1 : 0.5 }}>
            {rows.map(([key, label, value, hint, pending]) => <Signal key={key} label={label} value={value} hint={hint} pending={pending} />)}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "11px 16px", borderTop: `1px solid ${palette.border}`, background: tint(palette.text, 3) }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
          <Lock size={14} style={{ color: palette.textFaint, flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: palette.text }}>Share my day with partners</div>
            <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} style={{ background: "transparent", border: 0, padding: 0, color: palette.gold, fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: sans }}>
              {open ? "Hide choices" : "Choose what's shared"}
            </button>
          </div>
        </div>
        <Switch on={share.on} onChange={(v) => setShare({ on: v })} label="Share my day with partners" />
      </div>
      {open && (
        <div style={{ padding: "4px 16px 16px", borderTop: `1px solid ${palette.border}` }}>
          <div style={{ ...sub, margin: "10px 0 0" }}>Worked out on your device from your Trade plan. Partners only ever see yes or no, never numbers.</div>
          {rows.map(([key, label, value]) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 13, opacity: share.on ? 1 : 0.5 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: palette.text, fontWeight: 600 }}>{label}</div>
                {value === null && <div style={{ fontSize: 11, color: palette.textFaint }}>{hints[key]}</div>}
              </div>
              <Switch on={share.on && share[key]} onChange={(v) => setShare({ [key]: v })} label={`Share: ${label}`} />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ================= Partners panel ================= */
function PartnersPanel({ ctx, data }) {
  const { token, isDesktop, busy, run, say, reload, today, share, mine, setShare } = ctx;
  const [inviteName, setInviteName] = useState("");
  const [redeemCode, setRedeemCode] = useState("");
  const [commitText, setCommitText] = useState("");
  const [editingCommit, setEditingCommit] = useState(false);
  const [showBlocked, setShowBlocked] = useState(false);

  const invite = async () => {
    const name = inviteName.trim();
    if (!name) return;
    const r = await run(() => api(token, "/partners/invite", { method: "POST", body: { username: name } }));
    if (r) { setInviteName(""); say(r.accepted ? "You're partners now." : "Invite sent."); }
  };
  const respond = (inv, accept) => run(() => api(token, "/partners/respond", { method: "POST", body: { linkId: inv.linkId, accept } }), accept ? `You and ${inv.username} are partners.` : "Invite declined.");
  const leave = (p) => run(() => api(token, "/partners/leave", { method: "POST", body: { linkId: p.linkId } }), "You left the partnership.");
  const cancelInvite = (inv) => run(() => api(token, "/partners/leave", { method: "POST", body: { linkId: inv.linkId } }), "Invite cancelled.");
  const block = (username, report) => run(() => api(token, "/partners/block", { method: "POST", body: { username, report: !!report } }), report ? "Blocked and reported." : "Blocked.");
  const unblock = (username) => run(() => api(token, "/partners/unblock", { method: "POST", body: { username } }), "Unblocked.");
  const nudge = (p, kind) => run(() => api(token, "/partners/nudge", { method: "POST", body: { linkId: p.linkId, kind } }), "Sent.");
  const dismissNudges = () => { reload({ clearNudges: true }); api(token, "/partners/nudges/seen", { method: "POST", body: {} }).catch(() => {}); };
  const saveCommit = async () => {
    const r = await run(() => api(token, "/partners/commit", { method: "POST", body: { day: today, text: commitText } }), commitText.trim() ? "Commitment saved." : "Commitment cleared.");
    if (r) setEditingCommit(false);
  };
  const review = (kept) => run(() => api(token, "/partners/commit/review", { method: "POST", body: { week: data.reviewDue.week, kept } }), kept ? "Nice, that's a kept week." : "Noted. A fresh week starts now.");
  const makeCode = () => run(() => api(token, "/partners/code", { method: "POST", body: {} }));
  const redeem = async () => {
    const r = await run(() => api(token, "/partners/redeem", { method: "POST", body: { code: redeemCode } }));
    if (r) { setRedeemCode(""); say("You're partners now."); }
  };
  const copyCode = async () => {
    try { await navigator.clipboard.writeText(data.code.code); say("Code copied."); } catch (e) { say("Couldn't copy. Select the code and copy it by hand.", true); }
  };

  const room = data.limit - data.partners.length;
  const grid = isDesktop ? { display: "grid", gridTemplateColumns: "minmax(0, 1fr) 350px", gap: 18, alignItems: "start" } : {};

  const left = (
    <div style={{ minWidth: 0 }}>
      {data.nudges.length > 0 && (
        <Card tone={palette.gold} title="New from your partners" icon={<Sparkles size={14} />}>
          {data.nudges.slice(0, 4).map((n) => (
            <div key={n.id} style={{ fontSize: 13, color: palette.text, marginBottom: 6, lineHeight: 1.45 }}><b>{n.username}</b> <span style={{ color: palette.textMuted }}>{NUDGE_TEXT[n.kind] || "sent you a note."}</span></div>
          ))}
          <button type="button" onClick={dismissNudges} style={{ ...btn(false), ...small, marginTop: 4 }}>Dismiss</button>
        </Card>
      )}
      {data.reviewDue && (
        <Card tone={WARN} title="Last week's commitment" icon={<Check size={14} />}>
          <div style={{ fontSize: 13.5, color: palette.text, lineHeight: 1.5, padding: "2px 0 2px 11px", borderLeft: `3px solid ${palette.gold}` }}>{data.reviewDue.text}</div>
          <div style={sub}>Did you keep it? Your partners will see your answer.</div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button type="button" disabled={busy} onClick={() => review(true)} style={btn(true)}>Yes, I kept it</button>
            <button type="button" disabled={busy} onClick={() => review(false)} style={btn(false)}>Not this time</button>
          </div>
        </Card>
      )}
      {data.partners.length === 0 && (
        <Card>
          <Empty icon={<Users size={22} />} title="No partner yet" text="Pair up with one trader you trust. You'll see each other's yes/no signs and build a clean streak together. Add someone with a username or a code." />
        </Card>
      )}
      {data.partners.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(auto-fit, minmax(340px, 1fr))" : "1fr", gap: 14, marginBottom: 14 }}>
          {data.partners.map((p) => <PartnerCard key={p.linkId} p={p} busy={busy} today={today} onNudge={nudge} onLeave={leave} onBlock={block} />)}
        </div>
      )}
      {(data.incoming.length > 0 || data.outgoing.length > 0) && (
        <Card title="Invites" icon={<Send size={13} />}>
          {data.incoming.map((inv) => (
            <div key={inv.linkId} style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
              <Avatar name={inv.username} size={32} src={inv.avatar || undefined} />
              <div style={{ flex: "1 1 140px", minWidth: 0, fontSize: 13, color: palette.text }}><b>{inv.username}</b> <span style={{ color: palette.textMuted }}>wants to be your partner</span></div>
              <button type="button" disabled={busy} onClick={() => respond(inv, true)} style={{ ...btn(true), ...small }}>Accept</button>
              <button type="button" disabled={busy} onClick={() => respond(inv, false)} style={{ ...btn(false), ...small }}>Decline</button>
              <button type="button" disabled={busy} aria-label={`Block ${inv.username}`} onClick={() => block(inv.username, false)} style={{ ...btn(false, true), ...small, padding: "6px 10px" }}><ShieldAlert size={14} /></button>
            </div>
          ))}
          {data.outgoing.map((inv) => (
            <div key={inv.linkId} style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
              <div style={{ flex: 1, minWidth: 0, fontSize: 13, color: palette.textMuted }}>Waiting for <b style={{ color: palette.text }}>{inv.username}</b></div>
              <button type="button" disabled={busy} onClick={() => cancelInvite(inv)} style={{ ...btn(false), ...small }}>Cancel</button>
            </div>
          ))}
        </Card>
      )}
    </div>
  );

  const right = (
    <div style={{ minWidth: 0 }}>
      <Card
        title="Your commitment this week"
        icon={<Target size={14} />}
        aside={data.myCommit && !editingCommit ? <button type="button" aria-label="Edit commitment" onClick={() => { setCommitText(data.myCommit.text); setEditingCommit(true); }} style={{ ...btn(false), minHeight: 32, padding: "4px 11px" }}><Pencil size={13} /></button> : null}
      >
        {data.myCommit && !editingCommit ? (
          <div style={{ fontSize: 13.5, color: palette.text, lineHeight: 1.5, padding: "2px 0 2px 11px", borderLeft: `3px solid ${palette.gold}` }}>{data.myCommit.text}</div>
        ) : (
          <>
            <div style={{ ...sub, marginTop: -4 }}>One line you'll hold yourself to, like "No trades after my second loss". Partners see it, and next week you mark whether you kept it.</div>
            <textarea value={commitText} maxLength={COMMIT_MAX} onChange={(e) => setCommitText(e.target.value)} rows={2} placeholder="This week I will..." style={{ ...field, marginTop: 11, resize: "none", minHeight: 66 }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 9 }}>
              <span style={{ fontSize: 11, color: palette.textFaint }}>{commitText.length}/{COMMIT_MAX}</span>
              <span style={{ display: "flex", gap: 8 }}>
                {editingCommit && <button type="button" onClick={() => setEditingCommit(false)} style={btn(false)}>Cancel</button>}
                <button type="button" disabled={busy} onClick={saveCommit} style={btn(true)}>{commitText.trim() ? "Save" : "Clear"}</button>
              </span>
            </div>
          </>
        )}
      </Card>

      <Card title="Add a partner" icon={<Plus size={14} />} aside={<Pill>{data.partners.length}/{data.limit}</Pill>}>
        {room <= 0 ? (
          <div style={sub}>
            Your {data.limit} partner {data.limit === 1 ? "spot is" : "spots are"} filled.
            {data.limit < 3 ? " Upgrade to Pro for up to 3." : ""}
            {data.limit < 3 && <button type="button" onClick={() => openPlans(`Your plan includes ${data.limit} partner. Upgrade to Pro for up to 3.`)} style={{ ...btn(true), ...small, marginLeft: 8 }}>See plans</button>}
          </div>
        ) : (
          <>
            <div style={{ ...eyebrow, marginBottom: 8 }}>By username</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={inviteName} onChange={(e) => setInviteName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && invite()} placeholder="Community username" autoCapitalize="none" autoCorrect="off" style={field} />
              <button type="button" disabled={busy || !inviteName.trim()} onClick={invite} style={btn(true)}>Invite</button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0" }}>
              <span style={{ flex: 1, height: 1, background: palette.border }} /><span style={{ ...eyebrow, fontSize: 9.5 }}>or use a code</span><span style={{ flex: 1, height: 1, background: palette.border }} />
            </div>
            <div style={sub}>Share a one-time code in any chat. Whoever enters it becomes your partner straight away. It lasts 48 hours.</div>
            {data.code ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 11 }}>
                <span style={{ fontFamily: mono, fontSize: 19, fontWeight: 800, letterSpacing: 3, color: palette.text }}>{data.code.code}</span>
                <button type="button" aria-label="Copy code" onClick={copyCode} className={TAP} style={{ width: 34, height: 34, display: "grid", placeItems: "center", background: "transparent", border: 0, padding: 0, cursor: "pointer", color: palette.textMuted }}><Copy size={16} /></button>
                <button type="button" disabled={busy} onClick={makeCode} style={{ marginLeft: "auto", background: "transparent", border: 0, padding: "6px 4px", cursor: "pointer", fontFamily: sans, fontSize: 12, fontWeight: 700, color: palette.gold }}>New code</button>
              </div>
            ) : (
              <button type="button" disabled={busy} onClick={makeCode} style={{ ...btn(false), marginTop: 11 }}>Make a code</button>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <input value={redeemCode} onChange={(e) => setRedeemCode(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === "Enter" && redeem()} placeholder="Enter a code" autoCapitalize="characters" autoCorrect="off" style={{ ...field, fontFamily: mono, letterSpacing: 2 }} />
              <button type="button" disabled={busy || redeemCode.trim().length < 6} onClick={redeem} style={btn(false)}>Join</button>
            </div>
          </>
        )}
      </Card>

      {data.blocked.length > 0 && (
        <Card>
          <button type="button" onClick={() => setShowBlocked((v) => !v)} aria-expanded={showBlocked} style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between", background: "transparent", border: 0, padding: 0, cursor: "pointer", fontFamily: sans }}>
            <span style={{ fontSize: 13.5, fontWeight: 800, color: palette.text }}>Blocked ({data.blocked.length})</span>
            <ChevronDown size={15} style={{ color: palette.textFaint, transform: showBlocked ? "rotate(180deg)" : "none" }} />
          </button>
          {showBlocked && data.blocked.map((name) => (
            <div key={name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 11, fontSize: 13, color: palette.text }}>
              <span>{name}</span>
              <button type="button" disabled={busy} onClick={() => unblock(name)} style={{ ...btn(false), ...small }}>Unblock</button>
            </div>
          ))}
        </Card>
      )}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", gap: 7, ...sub, textAlign: "left", padding: "0 10px 6px" }}>
        <Lock size={12} style={{ flexShrink: 0, marginTop: 2 }} />
        <span>Partners never see your balance, P&amp;L, trades or notes. Turn sharing off above at any time.</span>
      </div>
    </div>
  );

  return (
    <div>
      <TodayStrip share={share} setShare={setShare} mine={mine} partners={data.partners} isDesktop={isDesktop} />
      <div style={grid}>{left}{right}</div>
    </div>
  );
}

/* ================= Mentor panel ================= */
function TradeRow({ t, onOpen, review, right }) {
  const needs = review && !hasFeedback(t);
  const c = pnlColor(t.pnl);
  const meta = [dateText(t.ts), t.setup, t.emotion].filter(Boolean).join(" · ");
  return (
    <div style={{ display: "flex", alignItems: "stretch", gap: 10, marginTop: 8, borderRadius: 14, background: tint(palette.text, 3), border: `1px solid ${palette.border}`, overflow: "hidden" }}>
      <span aria-hidden="true" style={{ width: 4, background: c, flexShrink: 0 }} />
      <button type="button" onClick={onOpen} disabled={!onOpen} className={TAP} style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0, textAlign: "left", background: "transparent", border: 0, padding: "11px 0", cursor: onOpen ? "pointer" : "default", fontFamily: sans }}>
        <span style={{ minWidth: 0, flex: 1 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ fontSize: 13.5, fontWeight: 800, color: palette.text }}>{t.pair || "Trade"}</span>
            {t.direction && <Pill color={String(t.direction).toLowerCase().startsWith("s") ? BAD : GOOD}>{t.direction}</Pill>}
          </span>
          <span style={{ display: "block", fontSize: 11, color: palette.textFaint, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{meta}</span>
        </span>
        <span style={{ textAlign: "right", flexShrink: 0, paddingRight: right ? 0 : 12 }}>
          <span style={{ display: "block", fontFamily: mono, fontSize: 13.5, fontWeight: 800, color: ink(c) }}>{money(t.pnl)}</span>
          <span style={{ display: "block", marginTop: 4 }}>
            {needs ? <Pill color={WARN}>Needs review</Pill> : t.comments > 0 ? <Pill>{plural(t.comments, "comment")}</Pill> : null}
          </span>
        </span>
      </button>
      {right}
    </div>
  );
}

function QuickReplies({ items, onPick }) {
  return (
    <div style={{ display: "flex", gap: 7, overflowX: "auto", scrollbarWidth: "none", margin: "0 -2px", padding: "2px 2px 2px" }}>
      {items.map(([label, text]) => <Chip key={label} onClick={() => onPick(text)}>{label}</Chip>)}
    </div>
  );
}

function TradeDetail({ ctx, id, onBack, onUnshared }) {
  const { token, run, isDesktop } = ctx;
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const [text, setText] = useState("");
  const [zoom, setZoom] = useState(null);
  const load = useCallback(async () => {
    try { setD(await api(token, `/mentors/trade?id=${encodeURIComponent(id)}`)); setErr(""); } catch (e) { setErr(e.message); }
  }, [token, id]);
  useEffect(() => { setD(null); load(); }, [load]);
  const send = async () => {
    if (!text.trim()) return;
    const r = await run(() => api(token, "/mentors/comment", { method: "POST", body: { id, text } }));
    if (r) { setText(""); load(); }
  };
  const unshare = async () => { const r = await run(() => api(token, "/mentors/unshare", { method: "POST", body: { id } }), "Trade unshared."); if (r) onUnshared(); };
  const pick = (t) => setText((cur) => `${cur ? `${cur} ` : ""}${t}`.slice(0, 300));
  const back = !isDesktop || onBack ? <button type="button" onClick={onBack} style={{ ...btn(false), ...small, marginBottom: 12 }}><ChevronLeft size={14} style={{ verticalAlign: "-3px" }} /> Back</button> : null;
  if (err) return <Card>{back}<div style={{ fontSize: 13, color: ink(BAD) }}>{err}</div></Card>;
  if (!d) return <Card>{back}<div style={{ fontSize: 13, color: palette.textFaint }}>Loading...</div></Card>;
  const t = d.trade;
  const c = pnlColor(t.pnl);
  const meta = [["Setup", t.setup], ["Emotion", t.emotion], ["Session", t.session], ["Confidence", t.confidence]].filter((m) => m[1]);
  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "14px 16px 16px", background: soft(c, 12) }}>
        {back}
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <Avatar name={d.owner.username} size={36} src={d.owner.avatar || undefined} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: palette.text }}>{t.pair || "Trade"}</span>
              {t.direction && <Pill color={String(t.direction).toLowerCase().startsWith("s") ? BAD : GOOD}>{t.direction}</Pill>}
            </div>
            <div style={{ fontSize: 11.5, color: palette.textFaint, marginTop: 2 }}>{d.mine ? "Shared by you" : `Shared by ${d.owner.username}`} · {dateText(t.ts)}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: mono, fontSize: 21, fontWeight: 800, color: ink(c), letterSpacing: -0.4 }}>{money(t.pnl)}</div>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: ink(c) }}>{t.pnl > 0 ? "Winner" : t.pnl < 0 ? "Loser" : "Break-even"}</div>
          </div>
        </div>
      </div>

      <div style={{ padding: "14px 16px 16px" }}>
        {meta.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 8 }}>
            {meta.map(([k, v]) => (
              <div key={k} style={{ padding: "9px 11px", borderRadius: 12, background: tint(palette.text, 4), border: `1px solid ${palette.border}` }}>
                <div style={{ ...eyebrow, fontSize: 9.5 }}>{k}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: palette.text, marginTop: 3 }}>{v}</div>
              </div>
            ))}
          </div>
        )}
        {t.note && (
          <div style={{ marginTop: 12 }}>
            <div style={{ ...eyebrow, display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}><StickyNote size={12} /> Trader's note</div>
            <div style={{ fontSize: 13, color: palette.text, lineHeight: 1.6, whiteSpace: "pre-wrap", padding: "2px 0 2px 11px", borderLeft: `3px solid ${tint(palette.text, 18)}` }}>{t.note}</div>
          </div>
        )}
        {t.shots.length > 0 && (
          <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
            {t.shots.map((s, i) => (
              <img key={i} src={s} alt={`Screenshot ${i + 1}`} onClick={() => setZoom(zoom === i ? null : i)} style={{ width: "100%", maxHeight: zoom === i ? "none" : 240, objectFit: zoom === i ? "contain" : "cover", borderRadius: 14, border: `1px solid ${palette.border}`, cursor: zoom === i ? "zoom-out" : "zoom-in", background: tint(palette.text, 4) }} />
            ))}
          </div>
        )}

        <div style={{ marginTop: 18, paddingTop: 15, borderTop: `1px solid ${palette.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 800, color: palette.text, marginBottom: 6 }}>
            <MessageCircle size={14} style={{ color: palette.gold }} /> Feedback {d.comments.length > 0 && <Pill>{d.comments.length}</Pill>}
          </div>
          {d.comments.length === 0 && <div style={sub}>{d.mine ? "Your mentor hasn't replied yet. You can ask a question below." : "No feedback yet. Be the first to reply."}</div>}
          {d.comments.map((cm) => (
            <div key={cm.id} style={{ display: "flex", gap: 9, marginTop: 11, flexDirection: cm.mine ? "row-reverse" : "row" }}>
              <Avatar name={cm.username} size={28} src={cm.avatar || undefined} />
              <div style={{ maxWidth: "84%", minWidth: 0, padding: "9px 12px", borderRadius: cm.mine ? "14px 4px 14px 14px" : "4px 14px 14px 14px", background: cm.mine ? tint(palette.gold, 14) : tint(palette.text, 6), border: `1px solid ${cm.mine ? tint(palette.gold, 28) : palette.border}` }}>
                <div style={{ fontSize: 11, color: palette.textFaint }}><b style={{ color: palette.text }}>{cm.mine ? "You" : cm.username}</b> · {dateText(cm.ts)}</div>
                <div style={{ fontSize: 13, color: palette.text, marginTop: 3, lineHeight: 1.5, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{cm.text}</div>
              </div>
            </div>
          ))}
          <div style={{ marginTop: 14 }}>
            <QuickReplies items={d.mine ? MENTEE_QUICK : MENTOR_QUICK} onPick={pick} />
            <div style={{ display: "flex", gap: 8, marginTop: 9, alignItems: "flex-end" }}>
              <textarea value={text} maxLength={300} rows={2} onChange={(e) => setText(e.target.value)} placeholder={d.mine ? "Ask your mentor something" : "Write feedback"} style={{ ...field, resize: "none", minHeight: 58 }} />
              <button type="button" aria-label="Send comment" disabled={!text.trim()} onClick={send} style={{ ...btn(true), width: 46, height: 46, padding: 0, display: "grid", placeItems: "center", opacity: text.trim() ? 1 : 0.5 }}><Send size={16} /></button>
            </div>
            <div style={{ fontSize: 10.5, color: palette.textFaint, textAlign: "right", marginTop: 4 }}>{text.length}/300</div>
          </div>
        </div>
        {d.mine && <button type="button" onClick={unshare} style={{ ...btn(false, true), ...small, marginTop: 10 }}><Trash2 size={13} style={{ verticalAlign: "-2px", marginRight: 5 }} />Stop sharing this trade</button>}
      </div>
    </Card>
  );
}

function TradePicker({ ctx, mdata, onDone, onBack }) {
  const { token, trades, say, isDesktop } = ctx;
  const [picked, setPicked] = useState({});
  const [working, setWorking] = useState("");
  const sharedIds = new Set(mdata.shared.map((s) => String(s.tradeId)));
  const list = useMemo(() => [...trades].sort((a, b) => b.ts - a.ts).slice(0, 40), [trades]);
  const count = Object.values(picked).filter(Boolean).length;
  const room = mdata.limits.shared - mdata.shared.length;
  const quick = (fn) => {
    const next = {};
    list.filter((t) => fn(t) && !sharedIds.has(String(t.id))).slice(0, Math.max(0, room)).forEach((t) => { next[t.id] = true; });
    setPicked(next);
  };
  const go = async () => {
    const chosen = list.filter((t) => picked[t.id]);
    let done = 0;
    let lostShots = 0;
    try {
      for (const t of chosen) {
        setWorking(`Sharing ${done + 1} of ${chosen.length}...`);
        const raw = (tradeScreenshots(t) || []).slice(0, 2);
        const shots = (await Promise.all(raw.map(shrinkImage))).filter(Boolean);
        lostShots += raw.length - shots.length;
        await api(token, "/mentors/share", { method: "POST", body: { trade: { id: t.id, pair: t.pair, direction: t.direction, pnl: t.pnl, setup: t.setup, emotion: t.emotion, session: t.session, confidence: t.confidence, note: t.note, ts: t.ts }, shots } });
        done += 1;
      }
      say(lostShots > 0 ? `Shared ${done}. ${lostShots} screenshot${lostShots === 1 ? "" : "s"} couldn't be attached.` : `Shared ${done} trade${done === 1 ? "" : "s"}.`);
    } catch (e) { say(e.message, true); }
    setWorking("");
    onDone();
  };
  return (
    <Card title="Share trades with your mentors" icon={<Share2 size={13} />} aside={<button type="button" onClick={onBack} style={{ ...btn(false), minHeight: 32, padding: "4px 11px" }}>{isDesktop ? <X size={13} /> : <><ChevronLeft size={13} style={{ verticalAlign: "-2px" }} /> Back</>}</button>}>
      <div style={{ ...sub, marginTop: -4 }}>Your mentors will see the result, note and up to 2 screenshots of each trade you pick. Nothing else about your account. You can stop sharing any trade later.</div>
      {list.length > 0 && (
        <div style={{ display: "flex", gap: 7, overflowX: "auto", scrollbarWidth: "none", marginTop: 12 }}>
          <Chip onClick={() => quick((t) => t.pnl < 0)} color={BAD}>Recent losses</Chip>
          <Chip onClick={() => quick((t) => (tradeScreenshots(t) || []).length > 0)}>With screenshots</Chip>
          <Chip onClick={() => quick((t) => !!String(t.note || "").trim())}>With notes</Chip>
          {count > 0 && <Chip onClick={() => setPicked({})}>Clear</Chip>}
        </div>
      )}
      {list.length === 0 && <div style={{ ...sub, marginTop: 12 }}>You haven't logged any trades yet.</div>}
      <div style={{ marginTop: 6, maxHeight: isDesktop ? 420 : "none", overflowY: "auto" }}>
        {list.map((t) => {
          const already = sharedIds.has(String(t.id));
          const shots = (tradeScreenshots(t) || []).length;
          const on = !!picked[t.id];
          return (
            <label key={t.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 10px", margin: "6px 0 0", borderRadius: 13, cursor: "pointer", background: on ? tint(palette.gold, 10) : tint(palette.text, 3), border: `1px solid ${on ? tint(palette.gold, 45) : palette.border}` }}>
              <input type="checkbox" checked={on} onChange={(e) => setPicked({ ...picked, [t.id]: e.target.checked })} style={{ width: 17, height: 17, accentColor: palette.gold }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: palette.text }}>{t.pair || "Trade"} {t.direction ? <span style={{ fontWeight: 500, color: palette.textMuted }}>{t.direction}</span> : null}</span>
                <span style={{ display: "block", fontSize: 11, color: palette.textFaint, marginTop: 2 }}>{dateText(t.ts)}{shots ? <> · <Camera size={10} style={{ verticalAlign: "-1px" }} /> {shots}</> : ""}{already ? " · already shared" : ""}</span>
              </span>
              <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 800, color: ink(pnlColor(t.pnl)) }}>{money(t.pnl)}</span>
            </label>
          );
        })}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, gap: 10 }}>
        <span style={{ fontSize: 11.5, color: palette.textFaint }}>{working || `${count} selected · room for ${Math.max(0, room)} more`}</span>
        <button type="button" disabled={!!working || count === 0} onClick={go} style={{ ...btn(true), opacity: working || count === 0 ? 0.55 : 1 }}>Share {count || ""}</button>
      </div>
    </Card>
  );
}

// a mentor's private jotter for one mentee. It lives only on this device and is never sent anywhere.
function PrivateNotes({ storageKey }) {
  const [text, setText] = useState(() => { try { return localStorage.getItem(storageKey) || ""; } catch (e) { return ""; } });
  const [open, setOpen] = useState(() => { try { return !!localStorage.getItem(storageKey); } catch (e) { return false; } });
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const change = (v) => {
    setText(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { try { if (v.trim()) localStorage.setItem(storageKey, v); else localStorage.removeItem(storageKey); } catch (e) { /* storage unavailable */ } }, 500);
  };
  return (
    <div style={{ marginTop: 14, borderRadius: 14, border: `1px solid ${palette.border}`, background: tint(palette.text, 3), overflow: "hidden" }}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className={TAP} style={{ display: "flex", width: "100%", alignItems: "center", gap: 9, padding: "11px 13px", background: "transparent", border: 0, cursor: "pointer", fontFamily: sans, textAlign: "left" }}>
        <StickyNote size={14} style={{ color: palette.gold }} />
        <span style={{ flex: 1, fontSize: 13, fontWeight: 800, color: palette.text }}>Private coaching notes</span>
        <ChevronDown size={15} style={{ color: palette.textFaint, transform: open ? "rotate(180deg)" : "none", transition: "transform .15s ease" }} />
      </button>
      {open && (
        <div style={{ padding: "0 13px 13px" }}>
          <textarea value={text} onChange={(e) => change(e.target.value)} rows={4} maxLength={2000} placeholder="Patterns you've noticed, what to work on next session..." style={{ ...field, resize: "vertical", minHeight: 92 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 6, ...sub }}><Lock size={11} /> Only you can see this. Saved on this device, not shared.</div>
        </div>
      )}
    </div>
  );
}

function BarList({ rows }) {
  const max = rows.reduce((m, r) => Math.max(m, Math.abs(r.net)), 0) || 1;
  return (
    <div style={{ display: "grid", gap: 9, marginTop: 11 }}>
      {rows.map((r) => (
        <div key={r.label}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, fontSize: 12 }}>
            <span style={{ fontWeight: 700, color: palette.text, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label} <span style={{ fontWeight: 500, color: palette.textFaint }}>· {r.n}</span></span>
            <span style={{ fontFamily: mono, fontWeight: 800, color: ink(pnlColor(r.net)), flexShrink: 0 }}>{money(r.net)}</span>
          </div>
          <div style={{ height: 6, borderRadius: 99, background: tint(palette.text, 8), marginTop: 5, overflow: "hidden" }}>
            <div style={{ width: `${Math.max(4, (Math.abs(r.net) / max) * 100)}%`, height: "100%", borderRadius: 99, background: pnlColor(r.net) }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function MenteePane({ ctx, link, trades, startFilter, onBack, onOpen }) {
  const { isDesktop } = ctx;
  const [filter, setFilter] = useState(startFilter || "all");
  const [by, setBy] = useState("");
  const list = useMemo(() => trades || [], [trades]);
  const stats = useMemo(() => tradeStats(list), [list]);
  const insights = useMemo(() => coachInsights(list), [list]);
  const groups = useMemo(() => ({ setup: groupTrades(list, "setup"), emotion: groupTrades(list, "emotion"), session: groupTrades(list, "session") }), [list]);
  const tabs = [["setup", "Setup"], ["emotion", "Emotion"], ["session", "Session"]].filter(([k]) => groups[k].length > 0);
  const tab = tabs.find(([k]) => k === by) ? by : tabs[0] && tabs[0][0];
  const open = list.filter((t) => !hasFeedback(t)).length;
  const shown = list.filter((t) => (filter === "review" ? !hasFeedback(t) : filter === "loss" ? t.pnl < 0 : filter === "win" ? t.pnl > 0 : true));
  const pf = stats.pf === Infinity ? "∞" : stats.pf.toFixed(2);
  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "14px 16px 15px", background: soft(palette.gold, 12) }}>
        <button type="button" onClick={onBack} style={{ ...btn(false), ...small, marginBottom: 12 }}>{isDesktop ? <X size={13} style={{ verticalAlign: "-2px" }} /> : <><ChevronLeft size={14} style={{ verticalAlign: "-3px" }} /> Back</>}</button>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Avatar name={link.username} size={44} src={link.avatar || undefined} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: palette.text }}>{link.username}</div>
            <div style={{ fontSize: 11.5, color: palette.textFaint, marginTop: 2 }}>{trades ? `${plural(list.length, "shared trade")}${open > 0 ? ` · ${open} to review` : " · all reviewed"}` : "Loading..."}</div>
          </div>
          {open > 0 && <Pill color={WARN}>{open} to review</Pill>}
        </div>
      </div>

      <div style={{ padding: "14px 16px 16px" }}>
        {!trades && <div style={sub}>Loading...</div>}
        {trades && list.length === 0 && <Empty icon={<Inbox size={22} />} title="Nothing shared yet" text={`${link.username} hasn't shared any trades. When they do, you'll get stats, patterns and a review queue here.`} />}
        {trades && list.length > 0 && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
              <StatTile label="Net P&L" value={money(stats.net)} color={pnlColor(stats.net)} hint={`${stats.wins}W · ${stats.losses}L`} />
              <StatTile label="Win rate" value={`${Math.round(stats.winRate)}%`} hint={`of ${plural(stats.n, "trade")}`} />
              <StatTile label="Profit factor" value={pf} color={stats.pf >= 1 ? GOOD : BAD} hint={stats.pf >= 1 ? "wins outweigh losses" : "losses outweigh wins"} />
              <StatTile label="Avg win / loss" value={`${stats.avgWin ? Math.round(stats.avgWin) : 0} / ${stats.avgLoss ? Math.round(stats.avgLoss) : 0}`} hint="in $" />
            </div>

            {insights.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ ...eyebrow, display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}><Lightbulb size={12} /> Coaching insights</div>
                <div style={{ display: "grid", gap: 7 }}>
                  {insights.map((i) => (
                    <div key={i.text} style={{ display: "flex", gap: 9, alignItems: "flex-start", padding: "10px 12px", borderRadius: 13, background: soft(i.tone, 12), border: `1px solid ${tint(i.tone, 28)}`, fontSize: 12.5, color: palette.text, lineHeight: 1.5 }}>
                      {i.tone === GOOD ? <TrendingUp size={15} style={{ color: ink(i.tone), flexShrink: 0, marginTop: 2 }} /> : i.tone === BAD ? <TrendingDown size={15} style={{ color: ink(i.tone), flexShrink: 0, marginTop: 2 }} /> : <AlertTriangle size={15} style={{ color: ink(i.tone), flexShrink: 0, marginTop: 2 }} />}
                      <span>{i.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab && (
              <div style={{ marginTop: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span style={eyebrow}>Where the P&amp;L comes from</span>
                  <span style={{ display: "flex", gap: 5 }}>{tabs.map(([k, label]) => <Chip key={k} on={tab === k} onClick={() => setBy(k)}>{label}</Chip>)}</span>
                </div>
                <BarList rows={groups[tab].slice(0, 5)} />
              </div>
            )}

            <div style={{ marginTop: 18, paddingTop: 15, borderTop: `1px solid ${palette.border}` }}>
              <div style={{ display: "flex", gap: 7, overflowX: "auto", scrollbarWidth: "none" }}>
                {[["all", `All ${list.length}`], ["review", `To review ${open}`], ["loss", `Losses ${stats.losses}`], ["win", `Wins ${stats.wins}`]].map(([k, label]) => <Chip key={k} on={filter === k} color={k === "review" ? WARN : k === "loss" ? BAD : k === "win" ? GOOD : undefined} onClick={() => setFilter(k)}>{label}</Chip>)}
              </div>
              {shown.length === 0 && <div style={{ ...sub, marginTop: 12 }}>{filter === "review" ? "You're all caught up. Every shared trade has feedback." : "No trades in this filter."}</div>}
              {shown.map((t) => <TradeRow key={t.id} t={t} review onOpen={() => onOpen(t)} />)}
            </div>
          </>
        )}
        <PrivateNotes key={link.linkId} storageKey={`tredzi.mentorNotes.${link.linkId}`} />
      </div>
    </Card>
  );
}

function PersonRow({ avatar, name, sub: subText, onClick, children }) {
  const inner = (
    <>
      <Avatar name={name} size={36} src={avatar || undefined} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 13.5, fontWeight: 800, color: palette.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
        {subText && <span style={{ display: "block", fontSize: 11.5, color: palette.textFaint, marginTop: 2 }}>{subText}</span>}
      </span>
    </>
  );
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, padding: "10px 12px", borderRadius: 14, background: tint(palette.text, 3), border: `1px solid ${palette.border}` }}>
      {onClick
        ? <button type="button" onClick={onClick} className={TAP} style={{ display: "flex", alignItems: "center", gap: 11, flex: 1, minWidth: 0, textAlign: "left", background: "transparent", border: 0, padding: 0, cursor: "pointer", fontFamily: sans }}>{inner}</button>
        : <div style={{ display: "flex", alignItems: "center", gap: 11, flex: 1, minWidth: 0 }}>{inner}</div>}
      {children}
    </div>
  );
}

function MentorPanel({ ctx }) {
  const { token, isDesktop, busy, run, say } = ctx;
  const [m, setM] = useState(null);
  const [err, setErr] = useState("");
  const [sel, setSel] = useState(null); // null | {kind:"pick"} | {kind:"mentee", linkId, username, avatar, filter?} | {kind:"trade", id, back}
  const [mentorName, setMentorName] = useState("");
  const [menteeName, setMenteeName] = useState("");
  const [menteeTrades, setMenteeTrades] = useState(null);

  const load = useCallback(async () => {
    try { setM(await api(token, "/mentors")); setErr(""); } catch (e) { setErr(e.message); }
  }, [token]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === "visible") load(); }, 60000);
    return () => clearInterval(id);
  }, [load]);

  const menteeLink = sel && sel.kind === "mentee" ? sel.linkId : null;
  useEffect(() => {
    if (!menteeLink) { setMenteeTrades(null); return; }
    setMenteeTrades(null);
    api(token, `/mentors/trades?linkId=${encodeURIComponent(menteeLink)}`).then((r) => setMenteeTrades(r.trades)).catch((e) => { say(e.message, true); setSel(null); });
  }, [menteeLink, token, say]);

  const act = async (fn, okText) => { const r = await run(fn, okText); await load(); return r; };
  const askMentor = async () => { const r = await act(() => api(token, "/mentors/invite", { method: "POST", body: { username: mentorName, role: "mentor" } })); if (r) { setMentorName(""); say(r.accepted ? "You're connected." : "Request sent."); } };
  const inviteMentee = async () => { const r = await act(() => api(token, "/mentors/invite", { method: "POST", body: { username: menteeName, role: "mentee" } })); if (r) { setMenteeName(""); say(r.accepted ? "You're connected." : "Invite sent."); } };
  const respond = (inv, accept) => act(() => api(token, "/mentors/respond", { method: "POST", body: { linkId: inv.linkId, accept } }), accept ? "Connected." : "Declined.");
  const leave = (l) => act(() => api(token, "/mentors/leave", { method: "POST", body: { linkId: l.linkId } }), "Done.");

  if (err && !m) return <Card title="Couldn't load Mentor"><div style={sub}>{err}</div><button type="button" onClick={load} style={{ ...btn(true), marginTop: 12 }}>Try again</button></Card>;
  if (!m) return <Card><div style={{ fontSize: 13, color: palette.textFaint }}>Loading...</div></Card>;

  const hasMentors = m.mentors.length > 0;
  const grid = isDesktop ? { display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.25fr)", gap: 18, alignItems: "start" } : {};
  const backToList = () => setSel(sel && sel.back ? sel.back : null);

  // dashboard numbers
  const toReview = m.mentees.reduce((s, x) => s + (x.open || 0), 0);
  const sharedWithMe = m.mentees.reduce((s, x) => s + (x.shared || 0), 0);
  const withFeedback = m.shared.filter(hasFeedback).length;
  const tiles = m.creator
    ? [["Mentees", `${m.mentees.length}/${m.limits.mentees}`, undefined, "coaching now"], ["To review", String(toReview), toReview > 0 ? WARN : GOOD, toReview > 0 ? "waiting on you" : "all caught up"], ["Shared", String(sharedWithMe), undefined, "trades from mentees"]]
    : [["Mentors", `${m.mentors.length}/${m.limits.mentors}`, undefined, "connected"], ["Shared", `${m.shared.length}/${m.limits.shared}`, undefined, "trades"], ["Feedback", String(withFeedback), withFeedback > 0 ? GOOD : undefined, "trades with replies"]];
  const queue = m.mentees.filter((x) => (x.open || 0) > 0).sort((a, b) => b.open - a.open);
  const openMentee = (l, filter) => setSel({ kind: "mentee", linkId: l.linkId, username: l.username, avatar: l.avatar, filter });

  // a mentee's own tip, based only on the trades they've shared
  const mine = tradeStats(m.shared);
  const tip = m.shared.length === 0
    ? "Start with your last losing trade. That's where a mentor helps most."
    : m.shared.length >= 3 && mine.losses === 0
      ? "You've only shared winners. Share a loss too, that's where the learning is."
      : m.shared.length > withFeedback
        ? `${plural(m.shared.length - withFeedback, "trade")} still waiting for your mentor's feedback.`
        : "Every shared trade has feedback. Share your next one to keep the momentum.";

  const lists = (
    <div style={{ minWidth: 0 }}>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", gap: 8, padding: 14, background: soft(palette.gold, 12) }}>
          {tiles.map(([label, value, color, hint]) => <StatTile key={label} label={label} value={value} color={color} hint={hint} />)}
        </div>
      </Card>

      {m.invites.length > 0 && (
        <Card title="Requests" icon={<Send size={13} />} tone={palette.gold}>
          {m.invites.map((inv) => (
            <div key={inv.linkId} style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
              <Avatar name={inv.username} size={32} src={inv.avatar || undefined} />
              <div style={{ flex: "1 1 150px", minWidth: 0, fontSize: 13, color: palette.text }}><b>{inv.username}</b> <span style={{ color: palette.textMuted }}>{inv.asks === "mentor" ? "wants you as their mentor" : "offers to be your mentor"}</span></div>
              <button type="button" disabled={busy} onClick={() => respond(inv, true)} style={{ ...btn(true), ...small }}>Accept</button>
              <button type="button" disabled={busy} onClick={() => respond(inv, false)} style={{ ...btn(false), ...small }}>Decline</button>
            </div>
          ))}
        </Card>
      )}

      {m.creator && queue.length > 0 && (
        <Card title="Review queue" icon={<Inbox size={14} />} tone={WARN} aside={<Pill color={WARN}>{toReview}</Pill>}>
          <div style={{ ...sub, marginTop: -4 }}>Shared trades that haven't had any feedback from you yet.</div>
          {queue.map((l) => (
            <PersonRow key={l.linkId} avatar={l.avatar} name={l.username} sub={`${plural(l.open, "trade")} to review${l.last ? ` · last shared ${ago(l.last)}` : ""}`} onClick={() => openMentee(l, "review")}>
              <Pill color={WARN}>{l.open}</Pill>
            </PersonRow>
          ))}
        </Card>
      )}

      <Card title="Your mentors" icon={<Users size={13} />} aside={<Pill>{m.mentors.length}/{m.limits.mentors}</Pill>}>
        {m.mentors.length === 0 && m.pending.filter((p) => p.as === "mentor").length === 0 && <div style={{ ...sub, marginTop: -4 }}>A mentor is a Creator who can look at the trades you choose to share and leave comments. Ask someone you trust.</div>}
        {m.mentors.map((l) => (
          <PersonRow key={l.linkId} avatar={l.avatar} name={l.username} sub={`Mentor since ${dateText(l.since)}`}>
            <button type="button" disabled={busy} onClick={() => leave(l)} style={{ ...btn(false, true), ...small }}>Remove</button>
          </PersonRow>
        ))}
        {m.pending.filter((p) => p.as === "mentor").map((p) => (
          <div key={p.linkId} style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
            <div style={{ flex: 1, fontSize: 13, color: palette.textMuted }}>Waiting for <b style={{ color: palette.text }}>{p.username}</b></div>
            <button type="button" disabled={busy} onClick={() => leave(p)} style={{ ...btn(false), ...small }}>Cancel</button>
          </div>
        ))}
        {m.mentors.length + m.pending.filter((p) => p.as === "mentor").length < m.limits.mentors && (
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <input value={mentorName} onChange={(e) => setMentorName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && mentorName.trim() && askMentor()} placeholder="Mentor's username" autoCapitalize="none" autoCorrect="off" style={field} />
            <button type="button" disabled={busy || !mentorName.trim()} onClick={askMentor} style={btn(true)}>Ask</button>
          </div>
        )}
      </Card>

      {hasMentors && (
        <Card title="Your coaching" icon={<Sparkles size={13} />} aside={<button type="button" onClick={() => setSel({ kind: "pick" })} style={{ ...btn(true), ...small }}>Share trades</button>}>
          {m.shared.length > 0 && (
            <>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", fontSize: 12, color: palette.textMuted }}>
                <span>Feedback received</span>
                <span style={{ fontFamily: mono, fontWeight: 800, color: palette.text }}>{withFeedback} of {m.shared.length}</span>
              </div>
              <div style={{ height: 7, borderRadius: 99, background: tint(palette.text, 8), marginTop: 6, overflow: "hidden" }}>
                <div style={{ width: `${(withFeedback / m.shared.length) * 100}%`, height: "100%", borderRadius: 99, background: GOOD, transition: "width .4s ease" }} />
              </div>
            </>
          )}
          <div style={{ display: "flex", gap: 9, alignItems: "flex-start", marginTop: m.shared.length ? 12 : 0, padding: "10px 12px", borderRadius: 13, background: soft(palette.gold, 12), border: `1px solid ${tint(palette.gold, 28)}`, fontSize: 12.5, color: palette.text, lineHeight: 1.5 }}>
            <Lightbulb size={15} style={{ color: palette.gold, flexShrink: 0, marginTop: 2 }} /><span>{tip}</span>
          </div>
          {m.shared.length > 0 && <div style={{ ...eyebrow, margin: "16px 0 0" }}>Shared by you</div>}
          {m.shared.map((t) => <TradeRow key={t.id} t={t} onOpen={() => setSel({ kind: "trade", id: t.id })} />)}
        </Card>
      )}

      {m.creator ? (
        <Card title="Your mentees" icon={<Users size={13} />} aside={<Pill color={palette.gold}>Creator</Pill>}>
          {m.mentees.length === 0 && <div style={{ ...sub, marginTop: -4 }}>Invite a trader you want to coach. You'll only ever see the trades they choose to share.</div>}
          {m.mentees.map((l) => (
            <PersonRow key={l.linkId} avatar={l.avatar} name={l.username} onClick={() => openMentee(l)}
              sub={`${plural(l.shared, "shared trade")}${l.last ? ` · ${ago(l.last)}` : ""}${l.shared > 0 && l.net !== undefined ? ` · ${money(l.net)}` : ""}`}>
              {l.open > 0 && <Pill color={WARN}>{l.open} new</Pill>}
              <button type="button" disabled={busy} onClick={() => leave(l)} style={{ ...btn(false, true), ...small }}>Remove</button>
            </PersonRow>
          ))}
          {m.pending.filter((p) => p.as === "mentee").map((p) => (
            <div key={p.linkId} style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
              <div style={{ flex: 1, fontSize: 13, color: palette.textMuted }}>Waiting for <b style={{ color: palette.text }}>{p.username}</b></div>
              <button type="button" disabled={busy} onClick={() => leave(p)} style={{ ...btn(false), ...small }}>Cancel</button>
            </div>
          ))}
          {m.mentees.length < m.limits.mentees && (
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <input value={menteeName} onChange={(e) => setMenteeName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && menteeName.trim() && inviteMentee()} placeholder="Mentee's username" autoCapitalize="none" autoCorrect="off" style={field} />
              <button type="button" disabled={busy || !menteeName.trim()} onClick={inviteMentee} style={btn(true)}>Invite</button>
            </div>
          )}
        </Card>
      ) : (
        <Card title="Coach other traders" icon={<Users size={13} />}>
          <div style={{ ...sub, marginTop: -4 }}>With the Creator plan you can coach up to {m.limits.mentees} traders. They share chosen trades with you, and you get stats, patterns, a review queue and one-tap feedback.</div>
          <button type="button" onClick={() => openPlans("Coaching other traders is part of the Creator plan.")} style={{ ...btn(true), marginTop: 12 }}>See Creator plan</button>
        </Card>
      )}
    </div>
  );

  let pane = null;
  if (sel && sel.kind === "pick") pane = <TradePicker ctx={ctx} mdata={m} onDone={() => { setSel(null); load(); }} onBack={() => setSel(null)} />;
  else if (sel && sel.kind === "trade") pane = <TradeDetail key={sel.id} ctx={ctx} id={sel.id} onBack={backToList} onUnshared={() => { setSel(null); load(); }} />;
  else if (sel && sel.kind === "mentee") {
    pane = <MenteePane key={sel.linkId} ctx={ctx} link={sel} trades={menteeTrades} startFilter={sel.filter} onBack={() => setSel(null)} onOpen={(t) => setSel({ kind: "trade", id: t.id, back: sel })} />;
  } else if (isDesktop) {
    pane = (
      <Card>
        <Empty icon={<MessageCircle size={22} />} title="Pick a trade to review" text="Trades shared with you or by you open here, with screenshots, stats and a feedback thread." />
      </Card>
    );
  }

  if (!isDesktop) return <div>{pane || lists}</div>;
  return <div style={grid}>{lists}<div style={{ minWidth: 0, position: "sticky", top: 12 }}>{pane}</div></div>;
}

/* ================= the tab ================= */
export default function PartnerTab({ isDesktop, session, communityUsername, trades = [], settings = {}, persistSettings, playbookCheckins = [], goToCommunity }) {
  const token = session && session.token;
  const [view, setView] = useState("partners");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [today, setToday] = useState(() => dayKeyFromDate(new Date()));
  const toastTimer = useRef(null);
  const dataRef = useRef(null);
  dataRef.current = data;

  const say = useCallback((text, bad = false) => {
    setToast({ text, bad });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  useEffect(() => {
    const id = setInterval(() => setToday((t) => { const n = dayKeyFromDate(new Date()); return n === t ? t : n; }), 60000);
    return () => clearInterval(id);
  }, []);

  const load = useCallback(async (quiet = false) => {
    if (!token) { setLoading(false); return; }
    if (!quiet) setLoading(true);
    try {
      setData(await api(token, `/partners?day=${today}`));
      setLoadError("");
    } catch (err) {
      if (err.needUsername) setLoadError("username");
      else if (!quiet || !dataRef.current) setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, today]);
  useEffect(() => { load(false); }, [load]);
  useEffect(() => {
    if (!token) return undefined;
    const tick = () => { if (document.visibilityState === "visible") load(true); };
    const id = setInterval(tick, 45000);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", tick); };
  }, [token, load]);

  // my own day, worked out on this device from the same data the rest of the app uses
  const share = { ...DEFAULT_SHARE, ...(settings.partnerShare || {}) };
  const mine = useMemo(() => {
    const maxTrades = num(settings.maxTradesPerDay);
    const lossLimit = num(settings.dailyLossLimit);
    const todays = trades.filter((t) => dayKeyFromTs(t.ts) === today);
    const loss = Math.abs(todays.filter((t) => t.pnl < 0).reduce((s, t) => s + t.pnl, 0));
    const check = playbookCheckins.find((c) => c.date === today);
    return {
      checkin: check ? isCleanCheckin(check) : null,
      trades: maxTrades > 0 ? todays.length <= maxTrades : null,
      loss: lossLimit > 0 ? loss < lossLimit : null,
    };
  }, [trades, settings.maxTradesPerDay, settings.dailyLossLimit, playbookCheckins, today]);
  const outgoing = useMemo(() => ({
    checkin: share.on && share.checkin ? mine.checkin : null,
    trades: share.on && share.trades ? mine.trades : null,
    loss: share.on && share.loss ? mine.loss : null,
  }), [mine, share.on, share.checkin, share.trades, share.loss]);

  const partnerCount = data ? data.partners.length : 0;
  const lastSent = useRef("");
  useEffect(() => {
    if (!token || partnerCount === 0) return undefined;
    const key = `${today}|${JSON.stringify(outgoing)}`;
    if (key === lastSent.current) return undefined;
    const id = setTimeout(async () => {
      try { await api(token, "/partners/status", { method: "POST", body: { day: today, ...outgoing } }); lastSent.current = key; } catch (e) { /* retried on the next change */ }
    }, 1200);
    return () => clearTimeout(id);
  }, [token, partnerCount, outgoing, today]);

  const setShare = (patch) => persistSettings && persistSettings({ ...settings, partnerShare: { ...share, ...patch } });
  const run = useCallback(async (fn, okText) => {
    setBusy(true);
    try {
      const r = await fn();
      if (okText) say(okText);
      await load(true);
      return r;
    } catch (err) {
      if (err.upgrade) openPlans(err.message);
      say(err.message, true);
      return null;
    } finally {
      setBusy(false);
    }
  }, [load, say]);
  const reload = (opts) => { if (opts && opts.clearNudges) setData((d) => (d ? { ...d, nudges: [] } : d)); else load(true); };

  const ctx = { token, isDesktop, busy, run, say, reload, today, trades, share, mine, setShare, goToCommunity };
  // The page around a tab adds its own side padding, so pull out of it to leave only a small gutter.
  const wrap = isDesktop
    ? { margin: "0 -14px", fontFamily: sans, paddingBottom: 8 }
    : { boxSizing: "border-box", width: "100vw", marginLeft: "calc(50% - 50vw)", padding: "0 12px", overflowX: "clip", fontFamily: sans, paddingBottom: 8 };
  const hasName = !!(communityUsername || (data && data.me && data.me.username));
  const header = (right) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", padding: "2px 2px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ width: 40, height: 40, borderRadius: 13, display: "grid", placeItems: "center", flexShrink: 0, background: soft(palette.gold, 12), color: palette.gold }}><Users size={19} /></span>
        <div>
          <div style={{ fontSize: isDesktop ? 20 : 18.5, fontWeight: 800, color: palette.text, letterSpacing: -0.3 }}>Partner</div>
          <div style={{ fontSize: 12, color: palette.textMuted, marginTop: 2 }}>Stay on plan with someone who notices when you don't.</div>
        </div>
      </div>
      {right}
    </div>
  );
  const note = (title, text, action) => (
    <div style={wrap}>
      {header(null)}
      <Card>
        <div style={{ fontSize: 15, fontWeight: 800, color: palette.text }}>{title}</div>
        <div style={sub}>{text}</div>
        {action}
      </Card>
    </div>
  );

  if (!token) return note("Sign in to find a partner", "Partners are matched by account, so you need to be signed in. Your trades and balances are never shared.");
  if (loadError === "username" || (!hasName && !loading && !data)) {
    return note("Pick a username first", "Partners find each other by Community username. Choose yours in the Community tab, then come back.", goToCommunity ? <button type="button" onClick={goToCommunity} style={{ ...btn(true), marginTop: 12 }}>Open Community</button> : null);
  }
  if (loading && !data) return note("Loading...", "Getting your partners.");
  if (!data) return note("Couldn't load your partners", loadError || "Check your connection and try again.", <button type="button" onClick={() => load(false)} style={{ ...btn(true), marginTop: 12 }}>Try again</button>);

  const commentDot = data.nudges.some((n) => n.kind === "comment");
  return (
    <div style={wrap}>
      {header(isDesktop ? <Segmented value={view} onChange={setView} options={[["partners", "Partners"], ["mentor", "Mentor", commentDot]]} /> : null)}
      {!isDesktop && <div style={{ marginBottom: 14 }}><Segmented full value={view} onChange={setView} options={[["partners", "Partners"], ["mentor", "Mentor", commentDot]]} /></div>}
      {toast && <div role="status" style={{ marginBottom: 14, padding: "11px 14px", borderRadius: 14, fontSize: 13, fontWeight: 700, background: toast.bad ? soft(BAD, 9) : soft(GOOD, 8), color: toast.bad ? ink(BAD) : palette.text, border: `1px solid ${tint(toast.bad ? BAD : GOOD, 38)}` }}>{toast.text}</div>}
      {view === "partners" ? <PartnersPanel ctx={ctx} data={data} /> : <MentorPanel ctx={ctx} />}
    </div>
  );
}
