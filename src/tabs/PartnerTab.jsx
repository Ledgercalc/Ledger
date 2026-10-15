import { Camera, Check, ChevronDown, ChevronLeft, Copy, Flame, MessageCircle, Plus, Send, Share2, ShieldAlert, Trash2, Users, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { COMMUNITY_API_BASE } from "../api/community.js";
import { Avatar } from "../components/ui.jsx";
import { dayKeyFromDate, dayKeyFromTs, num } from "../lib/format.js";
import { tradeScreenshots } from "../lib/images.js";
import { isCleanCheckin } from "../lib/playbook.js";
import { openPlans } from "../lib/planStore.js";
import { TAP, mono, palette, sans } from "../lib/theme.js";

// Partner: a private accountability pair (yes/no signs only) plus Mentor mode, where a Creator coaches mentees
// on the specific trades they choose to share. Nothing else about a trader's account is ever shared.
//
// Colour system (read from the theme at render time, so light/dark switches apply immediately):
//   accent  palette.gold   primary actions, active states, the streak flame
//   good    palette.green  "yes", wins, strengths
//   bad     palette.red    "broken", losses, things to fix
//   warn    amber          middling grades
//   neutral surfaces use palette.surface / field and soft tints of palette.text, never a saturated fill

const tint = (color, pct) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;
const accent = () => palette.gold;
const good = () => palette.green || "#22c55e";
const bad = () => palette.red || "#ef4444";
const warn = () => "#e5a13a";
const onAccent = () => palette.letterbox || "#111";
const wellBg = () => tint(palette.text, 4);

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
  review: "reviewed one of your trades.",
  task: "gave you a new task.",
};
const GRADES = [
  ["A", "Textbook"],
  ["B", "Solid"],
  ["C", "Sloppy"],
  ["D", "Avoid"],
];
const GRADE_SCORE = { A: 4, B: 3, C: 2, D: 1 };
const gradeColor = (g) => (g === "A" ? good() : g === "B" ? accent() : g === "C" ? warn() : bad());
const letterFor = (avg) => (avg >= 3.5 ? "A" : avg >= 2.5 ? "B" : avg >= 1.5 ? "C" : "D");
const TAGS = {
  good_entry: ["Good entry", true],
  patient: ["Patient", true],
  followed_plan: ["Followed plan", true],
  good_risk: ["Good risk", true],
  early_exit: ["Early exit", false],
  moved_stop: ["Moved stop", false],
  oversized: ["Oversized", false],
  no_setup: ["No setup", false],
  chased: ["Chased", false],
  revenge: ["Revenge", false],
  held_too_long: ["Held too long", false],
};
const GOOD_TAGS = Object.keys(TAGS).filter((k) => TAGS[k][1]);
const BAD_TAGS = Object.keys(TAGS).filter((k) => !TAGS[k][1]);
const DEFAULT_SHARE = { on: true, checkin: true, trades: true, loss: true };
const money = (n) => `${n < 0 ? "-" : "+"}$${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const money2 = (n) => `${n < 0 ? "-" : "+"}$${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const dateText = (ts) => new Date(ts).toLocaleDateString([], { month: "short", day: "numeric" });

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

/* ---------- style helpers (functions, so they follow the live theme) ---------- */
const sub = () => ({ fontSize: 11.5, color: palette.textFaint, lineHeight: 1.5, marginTop: 3 });
const label = () => ({ fontSize: 11.5, fontWeight: 600, color: palette.textMuted });
const btn = (kind = "ghost") => ({
  minHeight: 36, padding: "7px 14px", borderRadius: 10, fontSize: 12, fontWeight: 700, fontFamily: sans, cursor: "pointer", whiteSpace: "nowrap",
  border: `1px solid ${kind === "primary" ? accent() : kind === "danger" ? tint(bad(), 40) : palette.border}`,
  background: kind === "primary" ? accent() : "transparent",
  color: kind === "primary" ? onAccent() : kind === "danger" ? bad() : palette.textMuted,
});
const small = { minHeight: 32, padding: "5px 12px" };
const field = () => ({ width: "100%", minHeight: 40, padding: "8px 12px", borderRadius: 10, fontSize: 16, fontFamily: sans, background: palette.field, border: `1px solid ${palette.border}`, color: palette.text, outline: "none" });

function Card({ title, icon, aside, children, flush, style }) {
  return (
    <section style={{ background: palette.surface, border: `1px solid ${palette.border}`, borderRadius: 16, marginBottom: 14, overflow: "hidden", boxShadow: palette.shadow, ...style }}>
      {(title || aside) && (
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "12px 16px", borderBottom: `1px solid ${palette.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
            {icon && <span style={{ width: 24, height: 24, borderRadius: 8, display: "grid", placeItems: "center", flexShrink: 0, background: tint(accent(), 12), color: accent() }}>{icon}</span>}
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: palette.text, letterSpacing: 0.1 }}>{title}</h3>
          </div>
          {aside}
        </header>
      )}
      <div style={{ padding: flush ? 0 : 16 }}>{children}</div>
    </section>
  );
}

const Rule = () => <div style={{ height: 1, background: palette.border, margin: "14px 0" }} />;

function Switch({ on, onChange, label: aria }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={aria} onClick={() => onChange(!on)} className={TAP}
      style={{ position: "relative", width: 40, height: 23, borderRadius: 99, border: 0, flexShrink: 0, cursor: "pointer", background: on ? accent() : tint(palette.text, 18), transition: "background .15s ease" }}>
      <span style={{ position: "absolute", top: 3, left: on ? 20 : 3, width: 17, height: 17, borderRadius: 99, background: "#fff", transition: "left .15s ease", boxShadow: "0 1px 2px rgba(0,0,0,.25)" }} />
    </button>
  );
}

function Segmented({ value, onChange, options }) {
  return (
    <div role="tablist" style={{ display: "inline-flex", padding: 3, gap: 2, borderRadius: 12, background: wellBg(), border: `1px solid ${palette.border}` }}>
      {options.map(([id, text, dot]) => {
        const on = value === id;
        return (
          <button key={id} type="button" role="tab" aria-selected={on} onClick={() => onChange(id)} className={TAP}
            style={{ position: "relative", minHeight: 32, padding: "5px 18px", borderRadius: 9, border: 0, cursor: "pointer", fontFamily: sans, fontSize: 12.5, fontWeight: 700, background: on ? palette.surface : "transparent", color: on ? palette.text : palette.textFaint, boxShadow: on ? `0 1px 3px rgba(0,0,0,.18), 0 0 0 1px ${palette.border}` : "none" }}>
            {text}
            {dot && <span aria-hidden="true" style={{ position: "absolute", top: 6, right: 7, width: 7, height: 7, borderRadius: 99, background: accent() }} />}
          </button>
        );
      })}
    </div>
  );
}

function Pill({ children, color }) {
  const c = color || palette.textMuted;
  return <span style={{ display: "inline-block", padding: "2px 9px", borderRadius: 99, fontSize: 10.5, fontWeight: 700, color: c, background: tint(c, 12), border: `1px solid ${tint(c, 24)}`, whiteSpace: "nowrap" }}>{children}</span>;
}

function GradeBadge({ g, size = 22 }) {
  const c = gradeColor(g);
  return <span title={`Grade ${g}`} style={{ display: "inline-grid", placeItems: "center", width: size, height: size, borderRadius: 7, fontSize: size * 0.52, fontWeight: 800, fontFamily: mono, color: c, background: tint(c, 14), border: `1px solid ${tint(c, 34)}`, flexShrink: 0 }}>{g}</span>;
}

function Tile({ name, value, hint, tone }) {
  return (
    <div style={{ flex: "1 1 0", minWidth: 0, padding: "12px 14px", borderRadius: 14, background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}>
      <div style={{ fontSize: 11, color: palette.textFaint, fontWeight: 600 }}>{name}</div>
      <div style={{ fontFamily: mono, fontSize: 22, fontWeight: 800, color: tone || palette.text, marginTop: 4, lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
      {hint && <div style={{ fontSize: 11, color: palette.textFaint, marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

function Signal({ name, value, hint }) {
  const state = value === true ? "yes" : value === false ? "no" : "none";
  const c = state === "yes" ? good() : state === "no" ? bad() : palette.textFaint;
  return (
    <div style={{ flex: "1 1 0", minWidth: 0, padding: "10px 11px", borderRadius: 12, background: wellBg() }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <span style={{ width: 20, height: 20, borderRadius: 99, display: "grid", placeItems: "center", background: tint(c, 16), color: c, flexShrink: 0 }}>
          {state === "yes" ? <Check size={12} /> : state === "no" ? <X size={12} /> : <span style={{ fontSize: 11 }}>-</span>}
        </span>
        <span style={{ fontSize: 12, fontWeight: 700, color: state === "none" ? palette.textFaint : c }}>{state === "yes" ? "Yes" : state === "no" ? "Broken" : hint || "Not set"}</span>
      </div>
      <div style={{ fontSize: 10.5, color: palette.textFaint, marginTop: 5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
    </div>
  );
}

function WeekStrip({ days }) {
  const cell = (s, weekend) => ({ width: 18, height: 18, borderRadius: 5, background: s === "clean" ? good() : s === "broken" ? bad() : tint(palette.text, 9), opacity: weekend && s === "none" ? 0.45 : s === "none" ? 1 : 0.92 });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 10, color: palette.textFaint, textAlign: "right", paddingTop: 17 }}>
        <span style={{ height: 18, lineHeight: "18px" }}>You</span>
        <span style={{ height: 18, lineHeight: "18px" }}>Them</span>
      </div>
      <div style={{ display: "flex", flex: 1, justifyContent: "space-between", maxWidth: 340 }}>
        {days.map((d) => (
          <div key={d.day} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 10, color: palette.textFaint, height: 11, lineHeight: "11px" }}>{new Date(`${d.day}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "narrow", timeZone: "UTC" })}</span>
            <span style={cell(d.me, d.weekend)} />
            <span style={cell(d.them, d.weekend)} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- a partner ---------- */
function PartnerCard({ p, busy, onNudge, onLeave, onBlock }) {
  const [menu, setMenu] = useState(false);
  const [ask, setAsk] = useState(null);
  const [report, setReport] = useState(false);
  const t = p.today;
  const vals = [t.checkin, t.trades, t.loss];
  const dot = !t.shared ? palette.textFaint : vals.some((v) => v === false) ? bad() : vals.some((v) => v === true) ? good() : palette.textFaint;
  const hot = p.streak.current > 0;
  return (
    <Card flush style={{ marginBottom: 0 }}>
      <div style={{ padding: "16px 16px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ position: "relative", display: "inline-flex" }}>
            <Avatar name={p.username} size={40} src={p.avatar || undefined} />
            <span title={t.shared ? "Shared today" : "Nothing shared yet"} style={{ position: "absolute", right: -1, bottom: -1, width: 12, height: 12, borderRadius: 99, background: dot, border: `2px solid ${palette.surface}` }} />
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: palette.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.username}</div>
            <div style={{ fontSize: 11, color: palette.textFaint }}>Partners since {dateText(p.since)}</div>
          </div>
          <div title="Days you were both clean" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 11px", borderRadius: 10, background: wellBg(), border: `1px solid ${palette.border}` }}>
            <Flame size={15} style={{ color: hot ? accent() : palette.textFaint }} />
            <span style={{ fontFamily: mono, fontSize: 15, fontWeight: 800, color: palette.text }}>{p.streak.current}</span>
          </div>
          <button type="button" aria-label="Partnership options" aria-expanded={menu} onClick={() => { setMenu((m) => !m); setAsk(null); }} className={TAP}
            style={{ width: 34, height: 34, borderRadius: 10, border: `1px solid ${palette.border}`, background: "transparent", color: palette.textMuted, display: "grid", placeItems: "center", cursor: "pointer" }}>
            <ChevronDown size={15} style={{ transform: menu ? "rotate(180deg)" : "none", transition: "transform .15s ease" }} />
          </button>
        </div>

        {menu && !ask && (
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <button type="button" onClick={() => setAsk("leave")} style={btn()}>Leave partnership</button>
            <button type="button" onClick={() => setAsk("block")} style={btn("danger")}>Block</button>
          </div>
        )}
        {ask === "leave" && (
          <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: wellBg(), border: `1px solid ${palette.border}` }}>
            <div style={{ fontSize: 12.5, color: palette.text, fontWeight: 700 }}>Leave your partnership with {p.username}?</div>
            <div style={sub()}>Your shared streak ends and they'll see that it ended. You can invite each other again later.</div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button type="button" onClick={() => setAsk(null)} style={btn()}>Stay</button>
              <button type="button" disabled={busy} onClick={() => onLeave(p)} style={btn("danger")}>Leave</button>
            </div>
          </div>
        )}
        {ask === "block" && (
          <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: tint(bad(), 6), border: `1px solid ${tint(bad(), 28)}` }}>
            <div style={{ fontSize: 12.5, color: palette.text, fontWeight: 700 }}>Block {p.username}?</div>
            <div style={sub()}>This ends the partnership and stops any invites, codes, nudges or coaching between you. They won't be told you blocked them. You can unblock later.</div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 12, color: palette.textMuted, cursor: "pointer" }}>
              <input type="checkbox" checked={report} onChange={(e) => setReport(e.target.checked)} /> Also report this person
            </label>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button type="button" onClick={() => setAsk(null)} style={btn()}>Cancel</button>
              <button type="button" disabled={busy} onClick={() => onBlock(p.username, report)} style={btn("danger")}>Block</button>
            </div>
          </div>
        )}

        <div style={{ ...label(), margin: "16px 0 8px" }}>{p.username}'s day</div>
        <div style={{ display: "flex", gap: 8 }}>
          <Signal name="Checked in" value={t.checkin} hint="Not yet" />
          <Signal name="Trade limit" value={t.trades} />
          <Signal name="Loss limit" value={t.loss} />
        </div>
        {!t.shared && <div style={sub()}>{p.username} hasn't shared anything yet today.</div>}
        <div style={{ ...label(), margin: "16px 0 8px" }}>Last 7 days{p.streak.best > 0 ? ` · best streak ${p.streak.best}` : ""}</div>
        <WeekStrip days={p.days} />
      </div>

      <div style={{ padding: "12px 16px", borderTop: `1px solid ${palette.border}`, background: wellBg() }}>
        <div style={label()}>Their commitment this week</div>
        <div style={{ fontSize: 12.5, color: p.commit ? palette.text : palette.textFaint, marginTop: 4, lineHeight: 1.45 }}>{p.commit ? `"${p.commit.text}"` : "Nothing written yet."}</div>
        {p.lastCommit && (
          <div style={{ ...sub(), color: p.lastCommit.kept === true ? good() : p.lastCommit.kept === false ? bad() : palette.textFaint }}>
            Last week: "{p.lastCommit.text}" {p.lastCommit.kept === true ? "(kept)" : p.lastCommit.kept === false ? "(not kept)" : "(not reviewed yet)"}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none", padding: "12px 16px", borderTop: `1px solid ${palette.border}` }}>
        {NUDGES.map(([kind, text]) => (
          <button key={kind} type="button" disabled={busy} onClick={() => onNudge(p, kind)} className={TAP} style={{ ...btn(), ...small, fontSize: 11.5 }}>{text}</button>
        ))}
      </div>
    </Card>
  );
}

/* ---------- the top strip: how my own day is going and what partners can see ---------- */
function TodayStrip({ share, setShare, mine, partners, isDesktop }) {
  const [open, setOpen] = useState(false);
  const rows = [
    ["checkin", "Checked in on plan", mine.checkin, "Not yet"],
    ["trades", "Kept to max trades", mine.trades, "Not set"],
    ["loss", "Stayed inside the loss limit", mine.loss, "Not set"],
  ];
  const broken = rows.some((r) => r[2] === false);
  const fine = !broken && rows.some((r) => r[2] === true);
  const tone = broken ? bad() : fine ? good() : palette.textFaint;
  const headline = broken ? "A rule was broken today" : fine ? "You're on track today" : "Nothing to report yet";
  const best = partners.reduce((m, p) => Math.max(m, p.streak.current), 0);
  const clean = partners.filter((p) => { const v = [p.today.checkin, p.today.trades, p.today.loss]; return p.today.shared && !v.includes(false) && v.includes(true); }).length;
  const hints = { checkin: "Check in on your Trade plan", trades: "Set max trades per day in Settings", loss: "Set a daily loss limit in Settings" };
  return (
    <Card flush>
      <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "minmax(0, 1.1fr) minmax(0, 1.7fr) auto" : "1fr", gap: isDesktop ? 24 : 14, alignItems: "center", padding: "16px 18px" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, ...label() }}>
            <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 99, background: tone }} />
            Your day
          </div>
          <div style={{ fontSize: isDesktop ? 20 : 17, fontWeight: 800, color: palette.text, letterSpacing: -0.2, marginTop: 5 }}>{headline}</div>
          <div style={sub()}>
            {partners.length > 0
              ? `${clean} of ${partners.length} partner${partners.length === 1 ? " is" : "s are"} clean today${best > 0 ? `. Longest streak: ${best} ${best === 1 ? "day" : "days"}.` : "."}`
              : "Add a partner to start a clean-day streak together."}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, opacity: share.on ? 1 : 0.5 }}>
          {rows.map(([key, name, value, hint]) => <Signal key={key} name={name} value={value} hint={hint} />)}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: isDesktop ? "flex-end" : "space-between" }}>
          <div style={{ textAlign: isDesktop ? "right" : "left" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: palette.text }}>Share with partners</div>
            <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} style={{ background: "transparent", border: 0, padding: 0, color: accent(), fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: sans }}>
              {open ? "Hide choices" : "Choose what's shared"}
            </button>
          </div>
          <Switch on={share.on} onChange={(v) => setShare({ on: v })} label="Share my day with partners" />
        </div>
      </div>
      {open && (
        <div style={{ padding: "4px 18px 16px", borderTop: `1px solid ${palette.border}`, background: wellBg() }}>
          <div style={{ ...sub(), margin: "10px 0 0" }}>Worked out on your device from your Trade plan. Partners only ever see yes or no, never numbers.</div>
          {rows.map(([key, name, value]) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, opacity: share.on ? 1 : 0.5 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, color: palette.text, fontWeight: 600 }}>{name}</div>
                {value === null && <div style={{ fontSize: 11, color: palette.textFaint }}>{hints[key]}</div>}
              </div>
              <Switch on={share.on && share[key]} onChange={(v) => setShare({ [key]: v })} label={`Share: ${name}`} />
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
  const grid = isDesktop ? { display: "grid", gridTemplateColumns: "minmax(0, 1fr) 340px", gap: 18, alignItems: "start" } : {};

  const left = (
    <div style={{ minWidth: 0 }}>
      {data.nudges.length > 0 && (
        <Card flush style={{ borderColor: tint(accent(), 40) }}>
          <div style={{ padding: "13px 16px", background: tint(accent(), 6) }}>
            {data.nudges.slice(0, 4).map((n) => (
              <div key={n.id} style={{ fontSize: 12.5, color: palette.text, marginBottom: 5 }}><b>{n.username}</b> {NUDGE_TEXT[n.kind] || "sent you a note."}</div>
            ))}
            <button type="button" onClick={dismissNudges} style={{ ...btn(), ...small, marginTop: 4 }}>Dismiss</button>
          </div>
        </Card>
      )}
      {data.reviewDue && (
        <Card title="Last week's commitment" icon={<Check size={13} />}>
          <div style={{ fontSize: 13, color: palette.text, lineHeight: 1.45 }}>"{data.reviewDue.text}"</div>
          <div style={sub()}>Did you keep it? Your partners will see your answer.</div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button type="button" disabled={busy} onClick={() => review(true)} style={btn("primary")}>Yes, I kept it</button>
            <button type="button" disabled={busy} onClick={() => review(false)} style={btn()}>Not this time</button>
          </div>
        </Card>
      )}
      {data.partners.length === 0 && (
        <Card>
          <div style={{ textAlign: "center", padding: "14px 8px" }}>
            <span style={{ width: 48, height: 48, borderRadius: 14, display: "inline-grid", placeItems: "center", background: tint(accent(), 12), color: accent() }}><Users size={22} /></span>
            <div style={{ fontSize: 15, fontWeight: 800, color: palette.text, marginTop: 12 }}>No partner yet</div>
            <div style={{ ...sub(), maxWidth: 380, margin: "6px auto 0" }}>Pair up with one trader you trust. You'll see each other's yes/no signs and build a clean streak together. Add someone with a username or a code.</div>
          </div>
        </Card>
      )}
      {data.partners.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(auto-fit, minmax(340px, 1fr))" : "1fr", gap: 14, marginBottom: 14 }}>
          {data.partners.map((p) => <PartnerCard key={p.linkId} p={p} busy={busy} onNudge={nudge} onLeave={leave} onBlock={block} />)}
        </div>
      )}
      {(data.incoming.length > 0 || data.outgoing.length > 0) && (
        <Card title="Invites" icon={<Send size={12} />}>
          {data.incoming.map((inv) => (
            <div key={inv.linkId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", flexWrap: "wrap" }}>
              <Avatar name={inv.username} size={30} src={inv.avatar || undefined} />
              <div style={{ flex: "1 1 140px", minWidth: 0, fontSize: 12.5, color: palette.text }}><b>{inv.username}</b> wants to be your partner</div>
              <button type="button" disabled={busy} onClick={() => respond(inv, true)} style={{ ...btn("primary"), ...small }}>Accept</button>
              <button type="button" disabled={busy} onClick={() => respond(inv, false)} style={{ ...btn(), ...small }}>Decline</button>
              <button type="button" disabled={busy} aria-label={`Block ${inv.username}`} onClick={() => block(inv.username, false)} style={{ ...btn("danger"), ...small, padding: "5px 9px" }}><ShieldAlert size={14} /></button>
            </div>
          ))}
          {data.outgoing.map((inv) => (
            <div key={inv.linkId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
              <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: palette.textMuted }}>Waiting for <b style={{ color: palette.text }}>{inv.username}</b></div>
              <button type="button" disabled={busy} onClick={() => cancelInvite(inv)} style={{ ...btn(), ...small }}>Cancel</button>
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
        icon={<Check size={13} />}
        aside={data.myCommit && !editingCommit ? <button type="button" onClick={() => { setCommitText(data.myCommit.text); setEditingCommit(true); }} style={{ ...btn(), minHeight: 28, padding: "3px 11px" }}>Edit</button> : null}
      >
        {data.myCommit && !editingCommit ? (
          <div style={{ fontSize: 13, color: palette.text, lineHeight: 1.5 }}>"{data.myCommit.text}"</div>
        ) : (
          <>
            <div style={{ ...sub(), marginTop: 0 }}>One line you'll hold yourself to, like "No trades after my second loss". Partners see it, and next week you mark whether you kept it.</div>
            <textarea value={commitText} maxLength={COMMIT_MAX} onChange={(e) => setCommitText(e.target.value)} rows={2} placeholder="This week I will..." style={{ ...field(), marginTop: 10, resize: "none", minHeight: 62 }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
              <span style={{ fontSize: 11, color: palette.textFaint }}>{commitText.length}/{COMMIT_MAX}</span>
              <span style={{ display: "flex", gap: 8 }}>
                {editingCommit && <button type="button" onClick={() => setEditingCommit(false)} style={btn()}>Cancel</button>}
                <button type="button" disabled={busy} onClick={saveCommit} style={btn("primary")}>{commitText.trim() ? "Save" : "Clear"}</button>
              </span>
            </div>
          </>
        )}
      </Card>

      <Card title="Add a partner" icon={<Plus size={13} />}>
        {room <= 0 ? (
          <div style={{ ...sub(), marginTop: 0 }}>
            Your {data.limit} partner {data.limit === 1 ? "spot is" : "spots are"} filled.
            {data.limit < 3 ? " Upgrade to Pro for up to 3." : ""}
            {data.limit < 3 && <button type="button" onClick={() => openPlans(`Your plan includes ${data.limit} partner. Upgrade to Pro for up to 3.`)} style={{ ...btn("primary"), ...small, marginLeft: 8 }}>See plans</button>}
          </div>
        ) : (
          <>
            <div style={label()}>By username</div>
            <div style={{ display: "flex", gap: 8, marginTop: 7 }}>
              <input value={inviteName} onChange={(e) => setInviteName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && invite()} placeholder="Community username" autoCapitalize="none" autoCorrect="off" style={field()} />
              <button type="button" disabled={busy || !inviteName.trim()} onClick={invite} style={btn("primary")}>Invite</button>
            </div>
            <Rule />
            <div style={label()}>By code</div>
            <div style={sub()}>Share a one-time code in any chat. Whoever enters it becomes your partner straight away. It lasts 48 hours.</div>
            {data.code ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, flexWrap: "wrap", padding: "10px 12px", borderRadius: 12, background: wellBg() }}>
                <span style={{ fontFamily: mono, fontSize: 19, fontWeight: 800, letterSpacing: 3, color: palette.text, flex: 1 }}>{data.code.code}</span>
                <button type="button" onClick={copyCode} style={{ ...btn(), ...small }}><Copy size={12} style={{ verticalAlign: "-1px", marginRight: 5 }} />Copy</button>
                <button type="button" disabled={busy} onClick={makeCode} style={{ ...btn(), ...small }}>New</button>
              </div>
            ) : (
              <button type="button" disabled={busy} onClick={makeCode} style={{ ...btn(), marginTop: 10 }}>Make a code</button>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <input value={redeemCode} onChange={(e) => setRedeemCode(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === "Enter" && redeem()} placeholder="Enter a code" autoCapitalize="characters" autoCorrect="off" style={{ ...field(), fontFamily: mono, letterSpacing: 2 }} />
              <button type="button" disabled={busy || redeemCode.trim().length < 6} onClick={redeem} style={btn()}>Join</button>
            </div>
          </>
        )}
      </Card>

      {data.blocked.length > 0 && (
        <Card flush>
          <button type="button" onClick={() => setShowBlocked((v) => !v)} aria-expanded={showBlocked} style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between", background: "transparent", border: 0, padding: "13px 16px", cursor: "pointer", fontFamily: sans }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: palette.text }}>Blocked ({data.blocked.length})</span>
            <ChevronDown size={15} style={{ color: palette.textFaint, transform: showBlocked ? "rotate(180deg)" : "none" }} />
          </button>
          {showBlocked && (
            <div style={{ padding: "0 16px 14px" }}>
              {data.blocked.map((name) => (
                <div key={name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 10, fontSize: 12.5, color: palette.text }}>
                  <span>{name}</span>
                  <button type="button" disabled={busy} onClick={() => unblock(name)} style={{ ...btn(), minHeight: 30, padding: "4px 12px" }}>Unblock</button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
      <div style={{ ...sub(), textAlign: "center", padding: "0 8px 6px" }}>Partners never see your balance, P&amp;L, trades or notes.</div>
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
function TradeRow({ t, onOpen, who, first }) {
  return (
    <button type="button" onClick={onOpen} disabled={!onOpen} className={TAP}
      style={{ display: "flex", alignItems: "center", gap: 11, width: "100%", textAlign: "left", background: "transparent", border: 0, borderTop: first ? 0 : `1px solid ${palette.border}`, padding: "11px 16px", cursor: onOpen ? "pointer" : "default", fontFamily: sans }}>
      {who && <Avatar name={who.username} size={28} src={who.avatar || undefined} />}
      <span style={{ minWidth: 0, flex: 1 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: palette.text }}>{t.pair || "Trade"}</span>
          {t.direction && <Pill color={String(t.direction).toLowerCase().startsWith("s") ? bad() : good()}>{t.direction}</Pill>}
        </span>
        <span style={{ display: "block", fontSize: 11, color: palette.textFaint, marginTop: 2 }}>
          {who ? `${who.username} · ` : ""}{dateText(t.ts)}{t.comments > 0 ? ` · ${t.comments} comment${t.comments === 1 ? "" : "s"}` : ""}
        </span>
      </span>
      {t.reviews && t.reviews.slice(0, 2).map((r, i) => <GradeBadge key={i} g={r.grade} />)}
      <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 800, color: t.pnl >= 0 ? good() : bad(), minWidth: 56, textAlign: "right" }}>{money(t.pnl)}</span>
    </button>
  );
}

function TagChip({ id, on, onClick }) {
  const [text, positive] = TAGS[id];
  const c = positive ? good() : bad();
  const interactive = !!onClick;
  return (
    <button type="button" disabled={!interactive} aria-pressed={interactive ? on : undefined} onClick={onClick} className={interactive ? TAP : undefined}
      style={{ minHeight: interactive ? 32 : 24, padding: interactive ? "5px 12px" : "2px 10px", borderRadius: 99, fontSize: interactive ? 12 : 11, fontWeight: 700, fontFamily: sans, cursor: interactive ? "pointer" : "default", color: on || !interactive ? c : palette.textMuted, background: on || !interactive ? tint(c, 12) : "transparent", border: `1px solid ${on || !interactive ? tint(c, 36) : palette.border}` }}>
      {text}
    </button>
  );
}

function TradeDetail({ ctx, id, onBack, onUnshared, onChanged }) {
  const { token, run, isDesktop } = ctx;
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const [text, setText] = useState("");
  const [zoom, setZoom] = useState(null);
  const [grade, setGrade] = useState("");
  const [tags, setTags] = useState([]);
  const load = useCallback(async () => {
    try {
      const r = await api(token, `/mentors/trade?id=${encodeURIComponent(id)}`);
      setD(r);
      const mineReview = (r.reviews || []).find((x) => x.mine);
      setGrade(mineReview ? mineReview.grade : "");
      setTags(mineReview ? mineReview.tags : []);
      setErr("");
    } catch (e) { setErr(e.message); }
  }, [token, id]);
  useEffect(() => { setD(null); load(); }, [load]);
  const send = async () => {
    if (!text.trim()) return;
    const r = await run(() => api(token, "/mentors/comment", { method: "POST", body: { id, text } }));
    if (r) { setText(""); load(); onChanged(); }
  };
  const saveReview = async () => {
    const r = await run(() => api(token, "/mentors/review", { method: "POST", body: { id, grade, tags } }), "Review saved.");
    if (r) { load(); onChanged(); }
  };
  const unshare = async () => { const r = await run(() => api(token, "/mentors/unshare", { method: "POST", body: { id } }), "Trade unshared."); if (r) onUnshared(); };
  const backBtn = <button type="button" onClick={onBack} style={{ ...btn(), ...small }}><ChevronLeft size={14} style={{ verticalAlign: "-3px" }} /> {isDesktop ? "Close" : "Back"}</button>;
  if (err) return <Card title="Shared trade" aside={backBtn}><div style={{ fontSize: 12.5, color: bad() }}>{err}</div></Card>;
  if (!d) return <Card title="Shared trade" aside={backBtn}><div style={{ fontSize: 12.5, color: palette.textFaint }}>Loading...</div></Card>;
  const t = d.trade;
  const meta = [t.setup, t.emotion, t.session, t.confidence ? `Confidence ${t.confidence}` : ""].filter(Boolean);
  const canReview = !d.mine;
  const toggleTag = (g) => setTags(tags.includes(g) ? tags.filter((x) => x !== g) : [...tags, g].slice(0, 6));
  return (
    <Card flush aside={backBtn} title={`${t.pair || "Trade"} · ${dateText(t.ts)}`} icon={<Share2 size={12} />}>
      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <Avatar name={d.owner.username} size={34} src={d.owner.avatar || undefined} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: palette.text }}>{t.pair || "Trade"}</span>
              {t.direction && <Pill color={String(t.direction).toLowerCase().startsWith("s") ? bad() : good()}>{t.direction}</Pill>}
            </div>
            <div style={{ fontSize: 11, color: palette.textFaint }}>{d.mine ? "Shared by you" : `Shared by ${d.owner.username}`}</div>
          </div>
          <span style={{ fontFamily: mono, fontSize: 18, fontWeight: 800, color: t.pnl >= 0 ? good() : bad() }}>{money2(t.pnl)}</span>
        </div>
        {meta.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>{meta.map((c) => <Pill key={c}>{c}</Pill>)}</div>}
        {t.note && <div style={{ fontSize: 12.5, color: palette.text, lineHeight: 1.6, marginTop: 12, whiteSpace: "pre-wrap" }}>{t.note}</div>}
        {t.shots.length > 0 && (
          <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
            {t.shots.map((s, i) => (
              <img key={i} src={s} alt={`Screenshot ${i + 1}`} onClick={() => setZoom(zoom === i ? null : i)} style={{ width: "100%", maxHeight: zoom === i ? "none" : 240, objectFit: zoom === i ? "contain" : "cover", borderRadius: 12, border: `1px solid ${palette.border}`, cursor: "zoom-in", background: wellBg() }} />
            ))}
          </div>
        )}
      </div>

      {d.reviews.length > 0 && (
        <div style={{ padding: "14px 16px", borderTop: `1px solid ${palette.border}`, background: wellBg() }}>
          <div style={{ ...label(), marginBottom: 8 }}>{d.mine ? "What your mentors said" : "Reviews"}</div>
          {d.reviews.map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginTop: i ? 10 : 0 }}>
              <GradeBadge g={r.grade} size={26} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: palette.textMuted }}><b style={{ color: palette.text }}>{r.mine ? "You" : r.username}</b> · {dateText(r.ts)}</div>
                {r.tags.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}>{r.tags.filter((g) => TAGS[g]).map((g) => <TagChip key={g} id={g} on />)}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {canReview && (
        <div style={{ padding: "14px 16px", borderTop: `1px solid ${palette.border}` }}>
          <div style={{ ...label(), marginBottom: 8 }}>Your review</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {GRADES.map(([g, cap]) => {
              const on = grade === g;
              const c = gradeColor(g);
              return (
                <button key={g} type="button" aria-pressed={on} onClick={() => setGrade(g)} className={TAP}
                  style={{ padding: "9px 4px", borderRadius: 12, cursor: "pointer", fontFamily: sans, textAlign: "center", color: on ? c : palette.textMuted, background: on ? tint(c, 12) : "transparent", border: `1px solid ${on ? tint(c, 45) : palette.border}` }}>
                  <div style={{ fontFamily: mono, fontSize: 18, fontWeight: 800 }}>{g}</div>
                  <div style={{ fontSize: 10.5, marginTop: 2 }}>{cap}</div>
                </button>
              );
            })}
          </div>
          <div style={{ ...label(), margin: "14px 0 7px" }}>What went well</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>{GOOD_TAGS.map((g) => <TagChip key={g} id={g} on={tags.includes(g)} onClick={() => toggleTag(g)} />)}</div>
          <div style={{ ...label(), margin: "12px 0 7px" }}>What to work on</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>{BAD_TAGS.map((g) => <TagChip key={g} id={g} on={tags.includes(g)} onClick={() => toggleTag(g)} />)}</div>
          <button type="button" disabled={!grade} onClick={saveReview} style={{ ...btn("primary"), marginTop: 14 }}>{(d.reviews || []).some((x) => x.mine) ? "Update review" : "Save review"}</button>
        </div>
      )}

      <div style={{ padding: 16, borderTop: `1px solid ${palette.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, ...label(), marginBottom: 6 }}><MessageCircle size={13} style={{ color: accent() }} /> Comments</div>
        {d.comments.length === 0 && <div style={sub()}>No comments yet.</div>}
        {d.comments.map((c) => (
          <div key={c.id} style={{ display: "flex", gap: 9, marginTop: 10 }}>
            <Avatar name={c.username} size={26} src={c.avatar || undefined} />
            <div style={{ flex: 1, minWidth: 0, padding: "8px 11px", borderRadius: 12, background: c.mine ? tint(accent(), 9) : wellBg() }}>
              <div style={{ fontSize: 11, color: palette.textFaint }}><b style={{ color: palette.text }}>{c.mine ? "You" : c.username}</b> · {dateText(c.ts)}</div>
              <div style={{ fontSize: 12.5, color: palette.text, marginTop: 2, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{c.text}</div>
            </div>
          </div>
        ))}
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <input value={text} maxLength={300} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Write a comment" style={field()} />
          <button type="button" aria-label="Send comment" disabled={!text.trim()} onClick={send} style={{ ...btn("primary"), padding: "7px 13px" }}><Send size={14} /></button>
        </div>
        {d.mine && <button type="button" onClick={unshare} style={{ ...btn("danger"), ...small, marginTop: 14 }}><Trash2 size={13} style={{ verticalAlign: "-2px", marginRight: 5 }} />Stop sharing this trade</button>}
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
    <Card flush title="Share trades with your mentors" icon={<Share2 size={12} />} aside={<button type="button" onClick={onBack} style={{ ...btn(), minHeight: 30, padding: "4px 11px" }}>{isDesktop ? "Close" : "Back"}</button>}>
      <div style={{ padding: "12px 16px 4px" }}>
        <div style={sub()}>Your mentors will see the result, note and up to 2 screenshots of each trade you pick. Nothing else about your account. You can stop sharing any trade later.</div>
      </div>
      {list.length === 0 && <div style={{ ...sub(), padding: "8px 16px 16px" }}>You haven't logged any trades yet.</div>}
      <div style={{ maxHeight: isDesktop ? 440 : "none", overflowY: "auto", marginTop: 8 }}>
        {list.map((t, i) => {
          const already = sharedIds.has(String(t.id));
          const shots = (tradeScreenshots(t) || []).length;
          return (
            <label key={t.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 16px", borderTop: i ? `1px solid ${palette.border}` : `1px solid ${palette.border}`, cursor: "pointer", background: picked[t.id] ? tint(accent(), 7) : "transparent" }}>
              <input type="checkbox" checked={!!picked[t.id]} onChange={(e) => setPicked({ ...picked, [t.id]: e.target.checked })} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: palette.text }}>{t.pair || "Trade"} {t.direction ? <span style={{ fontWeight: 500, color: palette.textMuted }}>{t.direction}</span> : null}</span>
                <span style={{ display: "block", fontSize: 11, color: palette.textFaint }}>{dateText(t.ts)}{shots ? <> · <Camera size={10} style={{ verticalAlign: "-1px" }} /> {shots}</> : ""}{already ? " · already shared" : ""}</span>
              </span>
              <span style={{ fontFamily: mono, fontSize: 12.5, fontWeight: 800, color: t.pnl >= 0 ? good() : bad() }}>{money(t.pnl)}</span>
            </label>
          );
        })}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "12px 16px", borderTop: `1px solid ${palette.border}`, background: wellBg() }}>
        <span style={{ fontSize: 11.5, color: palette.textFaint }}>{working || `${count} selected · room for ${Math.max(0, room)} more`}</span>
        <button type="button" disabled={!!working || count === 0} onClick={go} style={btn("primary")}>Share {count || ""}</button>
      </div>
    </Card>
  );
}

// Patterns across the trades a mentee shared, built from their mentors' reviews.
function Insights({ shared }) {
  const stat = useMemo(() => {
    const reviewed = shared.filter((t) => t.reviews.length > 0);
    const gradeCount = { A: 0, B: 0, C: 0, D: 0 };
    let sum = 0;
    let n = 0;
    const tagMap = {};
    reviewed.forEach((t) => {
      const seen = new Set();
      t.reviews.forEach((r) => {
        gradeCount[r.grade] = (gradeCount[r.grade] || 0) + 1;
        sum += GRADE_SCORE[r.grade] || 0;
        n += 1;
        r.tags.forEach((g) => { if (TAGS[g]) seen.add(g); });
      });
      seen.forEach((g) => { const e = tagMap[g] || (tagMap[g] = { count: 0, pnl: 0 }); e.count += 1; e.pnl += t.pnl; });
    });
    const entries = Object.entries(tagMap);
    return {
      reviewed: reviewed.length,
      gradeCount,
      avg: n ? sum / n : null,
      work: entries.filter(([g]) => !TAGS[g][1]).sort((a, b) => b[1].count - a[1].count).slice(0, 4),
      strong: entries.filter(([g]) => TAGS[g][1]).sort((a, b) => b[1].count - a[1].count).slice(0, 4),
    };
  }, [shared]);
  const total = Object.values(stat.gradeCount).reduce((a, b) => a + b, 0);
  const maxWork = Math.max(1, ...stat.work.map(([, e]) => e.count));
  return (
    <Card title="What your mentors noticed" icon={<Flame size={12} />}>
      {stat.reviewed === 0 ? (
        <div style={{ ...sub(), marginTop: 0 }}>Once a mentor grades the trades you share, your patterns show up here: what keeps costing you, and what you do well.</div>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <GradeBadge g={letterFor(stat.avg)} size={44} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: palette.text }}>Average grade {letterFor(stat.avg)}</div>
              <div style={sub()}>{stat.reviewed} reviewed trade{stat.reviewed === 1 ? "" : "s"}</div>
              <div style={{ display: "flex", height: 7, borderRadius: 99, overflow: "hidden", marginTop: 8, background: tint(palette.text, 8) }}>
                {["A", "B", "C", "D"].map((g) => stat.gradeCount[g] > 0 && <span key={g} title={`${g}: ${stat.gradeCount[g]}`} style={{ width: `${(stat.gradeCount[g] / total) * 100}%`, background: gradeColor(g) }} />)}
              </div>
            </div>
          </div>
          {stat.work.length > 0 && (
            <>
              <Rule />
              <div style={label()}>Costing you the most</div>
              {stat.work.map(([g, e]) => (
                <div key={g} style={{ marginTop: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: palette.text }}>
                    <b>{TAGS[g][0]}</b>
                    <span style={{ color: palette.textFaint }}>{e.count} trade{e.count === 1 ? "" : "s"} · <span style={{ color: e.pnl >= 0 ? good() : bad(), fontFamily: mono }}>{money(e.pnl)}</span></span>
                  </div>
                  <div style={{ height: 5, borderRadius: 99, background: tint(palette.text, 8), marginTop: 5 }}>
                    <div style={{ height: "100%", width: `${(e.count / maxWork) * 100}%`, borderRadius: 99, background: bad(), opacity: 0.85 }} />
                  </div>
                </div>
              ))}
            </>
          )}
          {stat.strong.length > 0 && (
            <>
              <Rule />
              <div style={label()}>You do this well</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>{stat.strong.map(([g, e]) => <span key={g} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><TagChip id={g} on /><span style={{ fontSize: 11, color: palette.textFaint }}>x{e.count}</span></span>)}</div>
            </>
          )}
        </>
      )}
    </Card>
  );
}

function TaskList({ tasks, onToggle, onDelete, busy, showMentor }) {
  return tasks.map((t, i) => (
    <div key={t.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "9px 0", borderTop: i ? `1px solid ${palette.border}` : 0 }}>
      {onToggle ? (
        <button type="button" role="checkbox" aria-checked={t.done} aria-label={t.text} disabled={busy} onClick={() => onToggle(t)} className={TAP}
          style={{ width: 20, height: 20, marginTop: 1, borderRadius: 6, flexShrink: 0, cursor: "pointer", display: "grid", placeItems: "center", background: t.done ? good() : "transparent", border: `1.5px solid ${t.done ? good() : palette.textFaint}`, color: "#fff" }}>
          {t.done && <Check size={12} />}
        </button>
      ) : (
        <span aria-hidden="true" style={{ width: 8, height: 8, marginTop: 6, borderRadius: 99, flexShrink: 0, background: t.done ? good() : accent() }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, color: t.done ? palette.textFaint : palette.text, textDecoration: t.done ? "line-through" : "none", lineHeight: 1.45 }}>{t.text}</div>
        {showMentor && <div style={{ fontSize: 10.5, color: palette.textFaint, marginTop: 2 }}>From {t.mentor}</div>}
        {!onToggle && t.done && <div style={{ fontSize: 10.5, color: good(), marginTop: 2 }}>Done</div>}
      </div>
      {onDelete && <button type="button" aria-label="Remove task" disabled={busy} onClick={() => onDelete(t)} style={{ background: "transparent", border: 0, color: palette.textFaint, cursor: "pointer", padding: 4 }}><X size={14} /></button>}
    </div>
  ));
}

function MenteeView({ ctx, sel, onBack, onOpenTrade, onChanged }) {
  const { token, busy, run, say, isDesktop } = ctx;
  const [v, setV] = useState(null);
  const [task, setTask] = useState("");
  const load = useCallback(async () => {
    try { setV(await api(token, `/mentors/trades?linkId=${encodeURIComponent(sel.linkId)}`)); } catch (e) { say(e.message, true); onBack(); }
  }, [token, sel.linkId, say, onBack]);
  useEffect(() => { setV(null); load(); }, [load]);
  const addTask = async () => { const r = await run(() => api(token, "/mentors/task", { method: "POST", body: { linkId: sel.linkId, text: task } }), "Task sent."); if (r) { setTask(""); load(); onChanged(); } };
  const delTask = async (t) => { const r = await run(() => api(token, "/mentors/task/delete", { method: "POST", body: { id: t.id } })); if (r) { load(); onChanged(); } };
  const backBtn = <button type="button" onClick={onBack} style={{ ...btn(), minHeight: 30, padding: "4px 11px" }}>{isDesktop ? "Close" : <><ChevronLeft size={13} style={{ verticalAlign: "-2px" }} /> Back</>}</button>;
  if (!v) return <Card title={`${sel.username}`} aside={backBtn}><div style={sub()}>Loading...</div></Card>;
  const s = v.stats;
  const winRate = s.shared ? Math.round((s.wins / s.shared) * 100) : null;
  return (
    <div>
      <Card flush title={v.mentee.username} icon={<Users size={12} />} aside={backBtn}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8, padding: 14 }}>
          <Tile name="Shared" value={s.shared} />
          <Tile name="Win rate" value={winRate === null ? "-" : `${winRate}%`} />
          <Tile name="Net" value={s.shared ? money(s.net) : "-"} tone={s.net >= 0 ? good() : bad()} />
          <Tile name="Avg grade" value={s.avgGrade ? letterFor(s.avgGrade) : "-"} tone={s.avgGrade ? gradeColor(letterFor(s.avgGrade)) : undefined} />
        </div>
        {s.tags.length > 0 && (
          <div style={{ padding: "0 16px 14px" }}>
            <div style={{ ...label(), marginBottom: 7 }}>Most flagged</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{s.tags.filter(([g]) => TAGS[g]).map(([g, n]) => <span key={g} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><TagChip id={g} on /><span style={{ fontSize: 11, color: palette.textFaint }}>x{n}</span></span>)}</div>
          </div>
        )}
      </Card>
      <Card title="Tasks" icon={<Check size={12} />} aside={<span style={{ fontSize: 11, color: palette.textFaint }}>{v.tasks.filter((t) => !t.done).length} open</span>}>
        {v.tasks.length === 0 && <div style={{ ...sub(), marginTop: 0 }}>Give {v.mentee.username} a small, specific job, like "Journal every trade this week" or "Take no trades before the London open".</div>}
        <TaskList tasks={v.tasks} onDelete={delTask} busy={busy} />
        <div style={{ display: "flex", gap: 8, marginTop: v.tasks.length ? 12 : 10 }}>
          <input value={task} maxLength={140} onChange={(e) => setTask(e.target.value)} onKeyDown={(e) => e.key === "Enter" && task.trim() && addTask()} placeholder="Add a task" style={field()} />
          <button type="button" disabled={busy || !task.trim()} onClick={addTask} style={btn("primary")}>Add</button>
        </div>
      </Card>
      <Card flush title="Shared trades" icon={<Share2 size={12} />}>
        {v.trades.length === 0 && <div style={{ ...sub(), padding: 16 }}>They haven't shared any trades yet.</div>}
        {v.trades.map((t, i) => (
          <div key={t.id} style={{ position: "relative" }}>
            <TradeRow t={t} first={i === 0} onOpen={() => onOpenTrade(t.id)} />
            {!t.reviewed && <span style={{ position: "absolute", right: 82, top: 14 }}><Pill color={accent()}>Needs review</Pill></span>}
          </div>
        ))}
      </Card>
    </div>
  );
}

function MentorPanel({ ctx }) {
  const { token, isDesktop, busy, run, say } = ctx;
  const [m, setM] = useState(null);
  const [err, setErr] = useState("");
  const [sel, setSel] = useState(null); // null | {kind:"pick"} | {kind:"mentee", linkId, username} | {kind:"trade", id, back}
  const [mentorName, setMentorName] = useState("");
  const [menteeName, setMenteeName] = useState("");

  const load = useCallback(async () => {
    try { setM(await api(token, "/mentors")); setErr(""); } catch (e) { setErr(e.message); }
  }, [token]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === "visible") load(); }, 60000);
    return () => clearInterval(id);
  }, [load]);

  const act = async (fn, okText) => { const r = await run(fn, okText); await load(); return r; };
  const askMentor = async () => { const r = await act(() => api(token, "/mentors/invite", { method: "POST", body: { username: mentorName, role: "mentor" } })); if (r) { setMentorName(""); say(r.accepted ? "You're connected." : "Request sent."); } };
  const inviteMentee = async () => { const r = await act(() => api(token, "/mentors/invite", { method: "POST", body: { username: menteeName, role: "mentee" } })); if (r) { setMenteeName(""); say(r.accepted ? "You're connected." : "Invite sent."); } };
  const respond = (inv, accept) => act(() => api(token, "/mentors/respond", { method: "POST", body: { linkId: inv.linkId, accept } }), accept ? "Connected." : "Declined.");
  const leave = (l) => act(() => api(token, "/mentors/leave", { method: "POST", body: { linkId: l.linkId } }), "Done.");
  const toggleTask = (t) => act(() => api(token, "/mentors/task/done", { method: "POST", body: { id: t.id, done: !t.done } }));

  const clearSel = useCallback(() => setSel(null), []);
  if (err && !m) return <Card title="Couldn't load Mentor"><div style={sub()}>{err}</div><button type="button" onClick={load} style={{ ...btn("primary"), marginTop: 10 }}>Try again</button></Card>;
  if (!m) return <Card><div style={{ fontSize: 12.5, color: palette.textFaint }}>Loading...</div></Card>;

  const hasMentors = m.mentors.length > 0;
  const openTasks = m.tasks.filter((t) => !t.done).length;
  const reviewedShared = m.shared.flatMap((t) => t.reviews);
  const myAvg = reviewedShared.length ? reviewedShared.reduce((sum, r) => sum + (GRADE_SCORE[r.grade] || 0), 0) / reviewedShared.length : null;
  const tiles = [];
  if (m.creator) {
    tiles.push(["Needs review", m.queue.length, m.queue.length ? "from your mentees" : "all caught up", m.queue.length ? accent() : undefined]);
    tiles.push(["Mentees", m.mentees.length, `of ${m.limits.mentees}`]);
  }
  if (hasMentors || !m.creator) {
    tiles.push(["Mentors", m.mentors.length, `of ${m.limits.mentors}`]);
    tiles.push(["Shared trades", m.shared.length, `of ${m.limits.shared}`]);
    tiles.push(["Avg grade", myAvg ? letterFor(myAvg) : "-", myAvg ? "from your mentors" : "not graded yet", myAvg ? gradeColor(letterFor(myAvg)) : undefined]);
    tiles.push(["Open tasks", openTasks, openTasks ? "to do" : "nothing pending"]);
  }
  const grid = isDesktop ? { display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.25fr)", gap: 18, alignItems: "start" } : {};
  const backToList = () => setSel(sel && sel.back ? sel.back : null);

  const lists = (
    <div style={{ minWidth: 0 }}>
      {m.invites.length > 0 && (
        <Card title="Requests" icon={<Send size={12} />}>
          {m.invites.map((inv) => (
            <div key={inv.linkId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", flexWrap: "wrap" }}>
              <Avatar name={inv.username} size={30} src={inv.avatar || undefined} />
              <div style={{ flex: "1 1 150px", minWidth: 0, fontSize: 12.5, color: palette.text }}><b>{inv.username}</b> {inv.asks === "mentor" ? "wants you as their mentor" : "offers to be your mentor"}</div>
              <button type="button" disabled={busy} onClick={() => respond(inv, true)} style={{ ...btn("primary"), ...small }}>Accept</button>
              <button type="button" disabled={busy} onClick={() => respond(inv, false)} style={{ ...btn(), ...small }}>Decline</button>
            </div>
          ))}
        </Card>
      )}

      {m.creator && m.queue.length > 0 && (
        <Card flush title="Review queue" icon={<Check size={12} />} aside={<Pill color={accent()}>{m.queue.length} waiting</Pill>}>
          {m.queue.slice(0, 6).map((t, i) => <TradeRow key={t.id} t={t} first={i === 0} who={{ username: t.username, avatar: t.avatar }} onOpen={() => setSel({ kind: "trade", id: t.id, back: null })} />)}
        </Card>
      )}

      {m.creator ? (
        <Card flush title="Your mentees" icon={<Users size={12} />} aside={<Pill color={accent()}>Creator</Pill>}>
          {m.mentees.length === 0 && <div style={{ ...sub(), padding: "14px 16px 4px", marginTop: 0 }}>Invite a trader you want to coach. You'll only ever see the trades they choose to share.</div>}
          {m.mentees.map((l, i) => (
            <div key={l.linkId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderTop: i ? `1px solid ${palette.border}` : 0 }}>
              <button type="button" onClick={() => setSel({ kind: "mentee", linkId: l.linkId, username: l.username })} className={TAP} style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0, textAlign: "left", background: "transparent", border: 0, padding: 0, cursor: "pointer", fontFamily: sans }}>
                <Avatar name={l.username} size={32} src={l.avatar || undefined} />
                <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 13, fontWeight: 700, color: palette.text }}>{l.username}</span><span style={{ display: "block", fontSize: 11, color: palette.textFaint }}>{l.shared} shared trade{l.shared === 1 ? "" : "s"}</span></span>
              </button>
              <button type="button" disabled={busy} onClick={() => leave(l)} style={{ ...btn("danger"), ...small }}>Remove</button>
            </div>
          ))}
          {m.pending.filter((p) => p.as === "mentee").map((p) => (
            <div key={p.linkId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderTop: `1px solid ${palette.border}` }}>
              <div style={{ flex: 1, fontSize: 12.5, color: palette.textMuted }}>Waiting for <b style={{ color: palette.text }}>{p.username}</b></div>
              <button type="button" disabled={busy} onClick={() => leave(p)} style={{ ...btn(), ...small }}>Cancel</button>
            </div>
          ))}
          {m.mentees.length < m.limits.mentees && (
            <div style={{ display: "flex", gap: 8, padding: "12px 16px", borderTop: `1px solid ${palette.border}`, background: wellBg() }}>
              <input value={menteeName} onChange={(e) => setMenteeName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && menteeName.trim() && inviteMentee()} placeholder="Invite a mentee by username" autoCapitalize="none" autoCorrect="off" style={field()} />
              <button type="button" disabled={busy || !menteeName.trim()} onClick={inviteMentee} style={btn("primary")}>Invite</button>
            </div>
          )}
        </Card>
      ) : (
        <Card title="Coach other traders" icon={<Users size={12} />}>
          <div style={{ ...sub(), marginTop: 0 }}>With the Creator plan you can coach up to {m.limits.mentees} traders. They share chosen trades with you, and you grade them, tag what stood out and set tasks.</div>
          <button type="button" onClick={() => openPlans("Coaching other traders is part of the Creator plan.")} style={{ ...btn("primary"), marginTop: 12 }}>See Creator plan</button>
        </Card>
      )}

      <Card flush title="Your mentors" icon={<Users size={12} />}>
        {m.mentors.length === 0 && <div style={{ ...sub(), padding: "14px 16px 4px", marginTop: 0 }}>A mentor is a Creator who reviews the trades you choose to share: they grade them, tag what went well and what to fix, and set tasks.</div>}
        {m.mentors.map((l, i) => (
          <div key={l.linkId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderTop: i ? `1px solid ${palette.border}` : 0 }}>
            <Avatar name={l.username} size={32} src={l.avatar || undefined} />
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 700, color: palette.text }}>{l.username}</div><div style={{ fontSize: 11, color: palette.textFaint }}>Mentor since {dateText(l.since)}</div></div>
            <button type="button" disabled={busy} onClick={() => leave(l)} style={{ ...btn("danger"), ...small }}>Remove</button>
          </div>
        ))}
        {m.pending.filter((p) => p.as === "mentor").map((p) => (
          <div key={p.linkId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderTop: `1px solid ${palette.border}` }}>
            <div style={{ flex: 1, fontSize: 12.5, color: palette.textMuted }}>Waiting for <b style={{ color: palette.text }}>{p.username}</b></div>
            <button type="button" disabled={busy} onClick={() => leave(p)} style={{ ...btn(), ...small }}>Cancel</button>
          </div>
        ))}
        {m.mentors.length + m.pending.filter((p) => p.as === "mentor").length < m.limits.mentors && (
          <div style={{ display: "flex", gap: 8, padding: "12px 16px", borderTop: `1px solid ${palette.border}`, background: wellBg() }}>
            <input value={mentorName} onChange={(e) => setMentorName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && mentorName.trim() && askMentor()} placeholder="Ask a mentor by username" autoCapitalize="none" autoCorrect="off" style={field()} />
            <button type="button" disabled={busy || !mentorName.trim()} onClick={askMentor} style={btn("primary")}>Ask</button>
          </div>
        )}
      </Card>

      {m.tasks.length > 0 && (
        <Card title="Tasks from your mentors" icon={<Check size={12} />} aside={<span style={{ fontSize: 11, color: palette.textFaint }}>{m.tasks.filter((t) => t.done).length} of {m.tasks.length} done</span>}>
          <TaskList tasks={m.tasks} onToggle={toggleTask} busy={busy} showMentor />
        </Card>
      )}

      {hasMentors && (
        <Card flush title="Shared with your mentors" icon={<Share2 size={12} />} aside={<button type="button" onClick={() => setSel({ kind: "pick" })} style={{ ...btn("primary"), minHeight: 30, padding: "4px 12px" }}>Share trades</button>}>
          {m.shared.length === 0 && <div style={{ ...sub(), padding: 16, marginTop: 0 }}>Nothing shared yet. Pick the trades you want feedback on.</div>}
          {m.shared.map((t, i) => <TradeRow key={t.id} t={t} first={i === 0} onOpen={() => setSel({ kind: "trade", id: t.id, back: null })} />)}
        </Card>
      )}

      {hasMentors && <Insights shared={m.shared} />}
    </div>
  );

  let pane = null;
  if (sel && sel.kind === "pick") pane = <TradePicker ctx={ctx} mdata={m} onDone={() => { clearSel(); load(); }} onBack={clearSel} />;
  else if (sel && sel.kind === "trade") pane = <TradeDetail key={sel.id} ctx={ctx} id={sel.id} onBack={backToList} onUnshared={() => { clearSel(); load(); }} onChanged={load} />;
  else if (sel && sel.kind === "mentee") pane = <MenteeView key={sel.linkId} ctx={ctx} sel={sel} onBack={clearSel} onOpenTrade={(id) => setSel({ kind: "trade", id, back: sel })} onChanged={load} />;
  else if (isDesktop) {
    pane = (
      <Card>
        <div style={{ textAlign: "center", padding: "28px 14px" }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: palette.text }}>Select a trade or a mentee</div>
          <div style={{ ...sub(), maxWidth: 330, margin: "5px auto 0" }}>Shared trades open here with screenshots, the review, and a comment thread.</div>
        </div>
      </Card>
    );
  }

  return (
    <div>
      {tiles.length > 0 && !(sel && !isDesktop) && (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${isDesktop ? Math.min(4, tiles.length) : 2}, minmax(0, 1fr))`, gap: 10, marginBottom: 14 }}>
          {tiles.slice(0, 4).map(([name, value, hint, tone]) => <Tile key={name} name={name} value={value} hint={hint} tone={tone} />)}
        </div>
      )}
      {isDesktop ? <div style={grid}>{lists}<div style={{ minWidth: 0, position: "sticky", top: 12 }}>{pane}</div></div> : <div>{pane || lists}</div>}
    </div>
  );
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

  const say = useCallback((text, bad_ = false) => {
    setToast({ text, bad: bad_ });
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

  const ctx = { token, isDesktop, busy, run, say, reload, today, trades, share, mine, setShare };
  // The page around a tab adds its own side padding, so pull out of it to leave only a small gutter.
  const wrap = isDesktop
    ? { margin: "0 -14px", fontFamily: sans, paddingBottom: 8 }
    : { boxSizing: "border-box", width: "100vw", marginLeft: "calc(50% - 50vw)", padding: "0 12px", overflowX: "clip", fontFamily: sans, paddingBottom: 8 };
  const hasName = !!(communityUsername || (data && data.me && data.me.username));
  const header = (right) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", padding: "2px 2px 14px" }}>
      <div>
        <div style={{ fontSize: isDesktop ? 20 : 18.5, fontWeight: 800, color: palette.text, letterSpacing: -0.2 }}>Partner</div>
        <div style={{ fontSize: 12, color: palette.textMuted, marginTop: 3 }}>Stay on plan with someone who notices when you don't.</div>
      </div>
      {right}
    </div>
  );
  const note = (title, text, action) => (
    <div style={wrap}>
      {header(null)}
      <Card>
        <div style={{ fontSize: 14, fontWeight: 800, color: palette.text }}>{title}</div>
        <div style={sub()}>{text}</div>
        {action}
      </Card>
    </div>
  );

  if (!token) return note("Sign in to find a partner", "Partners are matched by account, so you need to be signed in. Your trades and balances are never shared.");
  if (loadError === "username" || (!hasName && !loading && !data)) {
    return note("Pick a username first", "Partners find each other by Community username. Choose yours in the Community tab, then come back.", goToCommunity ? <button type="button" onClick={goToCommunity} style={{ ...btn("primary"), marginTop: 12 }}>Open Community</button> : null);
  }
  if (loading && !data) return note("Loading...", "Getting your partners.");
  if (!data) return note("Couldn't load your partners", loadError || "Check your connection and try again.", <button type="button" onClick={() => load(false)} style={{ ...btn("primary"), marginTop: 12 }}>Try again</button>);

  const dot = data.nudges.some((n) => ["comment", "review", "task"].includes(n.kind));
  return (
    <div style={wrap}>
      {header(
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {view === "partners" && <span style={{ padding: "5px 11px", borderRadius: 99, border: `1px solid ${palette.border}`, fontSize: 11, fontWeight: 700, color: palette.textMuted, whiteSpace: "nowrap" }}>{data.partners.length} of {data.limit} partner{data.limit === 1 ? "" : "s"}</span>}
          <Segmented value={view} onChange={setView} options={[["partners", "Partners"], ["mentor", "Mentor", dot]]} />
        </div>
      )}
      {toast && <div role="status" style={{ marginBottom: 14, padding: "10px 14px", borderRadius: 12, fontSize: 12.5, fontWeight: 600, background: palette.surface, color: toast.bad ? bad() : palette.text, border: `1px solid ${toast.bad ? tint(bad(), 40) : palette.border}`, boxShadow: palette.shadow }}>{toast.text}</div>}
      {view === "partners" ? <PartnersPanel ctx={ctx} data={data} /> : <MentorPanel ctx={ctx} />}
    </div>
  );
}
