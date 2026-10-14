import { Camera, Check, ChevronDown, ChevronLeft, Copy, Flame, MessageCircle, Pencil, Plus, Send, Share2, ShieldAlert, Trash2, Users, X } from "lucide-react";
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

const tint = (color, pct) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;
const GOOD = "#22c55e";
const BAD = "#ef4444";
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
const DEFAULT_SHARE = { on: true, checkin: true, trades: true, loss: true };
const money = (n) => `${n < 0 ? "-" : "+"}$${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
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

/* ---------- small building blocks ---------- */
const sub = { fontSize: 11.5, color: palette.textFaint, lineHeight: 1.5, marginTop: 3 };
const btn = (primary, danger) => ({
  minHeight: 36, padding: "7px 14px", borderRadius: 99, fontSize: 12, fontWeight: 700, fontFamily: sans, cursor: "pointer", whiteSpace: "nowrap",
  border: `1px solid ${danger ? tint(BAD, 45) : primary ? palette.gold : palette.border}`,
  background: primary ? palette.gold : "transparent",
  color: primary ? "#111" : danger ? BAD : palette.textMuted,
});
const small = { minHeight: 32, padding: "5px 12px" };
const field = { width: "100%", minHeight: 40, padding: "8px 12px", borderRadius: 12, fontSize: 16, fontFamily: sans, background: palette.field, border: `1px solid ${palette.border}`, color: palette.text, outline: "none" };

function Card({ title, icon, aside, children, tone, style }) {
  return (
    <section style={{ background: tone ? tint(tone, 7) : palette.surface, border: `1px solid ${tone ? tint(tone, 38) : palette.border}`, borderRadius: 18, padding: "15px 16px", marginBottom: 14, boxShadow: palette.shadow, ...style }}>
      {(title || aside) && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            {icon && <span style={{ width: 26, height: 26, borderRadius: 9, display: "grid", placeItems: "center", flexShrink: 0, background: tint(palette.gold, 14), color: palette.gold }}>{icon}</span>}
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: palette.text }}>{title}</h3>
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
      style={{ position: "relative", width: 40, height: 23, borderRadius: 99, border: 0, flexShrink: 0, cursor: "pointer", background: on ? palette.gold : tint(palette.text, 16), transition: "background .15s ease" }}>
      <span style={{ position: "absolute", top: 3, left: on ? 20 : 3, width: 17, height: 17, borderRadius: 99, background: "#fff", transition: "left .15s ease" }} />
    </button>
  );
}

function Segmented({ value, onChange, options }) {
  return (
    <div role="tablist" style={{ display: "inline-flex", padding: 3, gap: 2, borderRadius: 13, background: tint(palette.text, 5), border: `1px solid ${palette.border}` }}>
      {options.map(([id, label, dot]) => {
        const on = value === id;
        return (
          <button key={id} type="button" role="tab" aria-selected={on} onClick={() => onChange(id)} className={TAP}
            style={{ position: "relative", minHeight: 32, padding: "5px 16px", borderRadius: 10, border: 0, cursor: "pointer", fontFamily: sans, fontSize: 12.5, fontWeight: 700, background: on ? palette.surface : "transparent", color: on ? palette.text : palette.textFaint, boxShadow: on ? `0 1px 3px rgba(0,0,0,.2), 0 0 0 1px ${palette.border}` : "none" }}>
            {label}
            {dot && <span aria-hidden="true" style={{ position: "absolute", top: 5, right: 6, width: 7, height: 7, borderRadius: 99, background: palette.gold }} />}
          </button>
        );
      })}
    </div>
  );
}

function Pill({ children, color }) {
  const c = color || palette.textMuted;
  return <span style={{ display: "inline-block", padding: "2px 9px", borderRadius: 99, fontSize: 10.5, fontWeight: 800, color: c, background: tint(c, 14), whiteSpace: "nowrap" }}>{children}</span>;
}

function Signal({ label, value, hint }) {
  const state = value === true ? "yes" : value === false ? "no" : "none";
  const color = state === "yes" ? GOOD : state === "no" ? BAD : palette.textFaint;
  return (
    <div style={{ flex: "1 1 0", minWidth: 0, padding: "9px 10px", borderRadius: 13, background: tint(color, state === "none" ? 5 : 11), border: `1px solid ${tint(color, state === "none" ? 16 : 34)}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, color, fontSize: 12, fontWeight: 800 }}>
        {state === "yes" ? <Check size={13} /> : state === "no" ? <X size={13} /> : <span style={{ width: 13, textAlign: "center" }}>-</span>}
        {state === "yes" ? "Yes" : state === "no" ? "Broken" : hint || "Not set"}
      </div>
      <div style={{ fontSize: 10.5, color: palette.textFaint, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
    </div>
  );
}

function WeekStrip({ days }) {
  const cell = (s, weekend) => ({ width: 18, height: 18, borderRadius: 6, background: s === "clean" ? GOOD : s === "broken" ? BAD : tint(palette.text, 10), opacity: weekend && s === "none" ? 0.4 : 1 });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 10, color: palette.textFaint, textAlign: "right", paddingTop: 17 }}>
        <span style={{ height: 18, lineHeight: "18px" }}>You</span>
        <span style={{ height: 18, lineHeight: "18px" }}>Them</span>
      </div>
      <div style={{ display: "flex", flex: 1, justifyContent: "space-between", maxWidth: 360 }}>
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
  const ring = !t.shared ? palette.border : [t.checkin, t.trades, t.loss].some((v) => v === false) ? BAD : GOOD;
  return (
    <Card style={{ padding: 0, overflow: "hidden", marginBottom: 0 }}>
      <div style={{ padding: "14px 16px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <span style={{ padding: 2, borderRadius: 99, border: `2px solid ${ring}`, display: "inline-flex" }}>
            <Avatar name={p.username} size={36} src={p.avatar || undefined} />
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: palette.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.username}</div>
            <div style={{ fontSize: 11, color: palette.textFaint }}>Partners since {dateText(p.since)}</div>
          </div>
          <div title="Days you were both clean" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 99, background: tint(p.streak.current > 0 ? palette.gold : palette.text, p.streak.current > 0 ? 14 : 6), border: `1px solid ${tint(p.streak.current > 0 ? palette.gold : palette.text, p.streak.current > 0 ? 40 : 14)}` }}>
            <Flame size={15} style={{ color: p.streak.current > 0 ? palette.gold : palette.textFaint }} />
            <span style={{ fontFamily: mono, fontSize: 15, fontWeight: 800, color: palette.text }}>{p.streak.current}</span>
          </div>
          <button type="button" aria-label="Partnership options" aria-expanded={menu} onClick={() => { setMenu((m) => !m); setAsk(null); }} className={TAP}
            style={{ width: 32, height: 32, borderRadius: 99, border: `1px solid ${palette.border}`, background: "transparent", color: palette.textMuted, display: "grid", placeItems: "center", cursor: "pointer" }}>
            <ChevronDown size={15} style={{ transform: menu ? "rotate(180deg)" : "none", transition: "transform .15s ease" }} />
          </button>
        </div>
        <div style={{ ...sub, marginTop: 8 }}>
          {p.streak.current > 0 ? `${p.streak.current} ${p.streak.current === 1 ? "day" : "days"} clean together.` : "A clean day is when you both stick to your own rules."}
          {p.streak.best > 0 ? ` Best: ${p.streak.best}.` : ""}
        </div>

        {menu && !ask && (
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <button type="button" onClick={() => setAsk("leave")} style={btn(false)}>Leave partnership</button>
            <button type="button" onClick={() => setAsk("block")} style={btn(false, true)}>Block</button>
          </div>
        )}
        {ask === "leave" && (
          <div style={{ marginTop: 10, padding: 12, borderRadius: 13, background: tint(palette.text, 4), border: `1px solid ${palette.border}` }}>
            <div style={{ fontSize: 12.5, color: palette.text, fontWeight: 700 }}>Leave your partnership with {p.username}?</div>
            <div style={sub}>Your shared streak ends and they'll see that it ended. You can invite each other again later.</div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button type="button" onClick={() => setAsk(null)} style={btn(false)}>Stay</button>
              <button type="button" disabled={busy} onClick={() => onLeave(p)} style={btn(false, true)}>Leave</button>
            </div>
          </div>
        )}
        {ask === "block" && (
          <div style={{ marginTop: 10, padding: 12, borderRadius: 13, background: tint(BAD, 6), border: `1px solid ${tint(BAD, 30)}` }}>
            <div style={{ fontSize: 12.5, color: palette.text, fontWeight: 700 }}>Block {p.username}?</div>
            <div style={sub}>This ends the partnership and stops any invites, codes, nudges or coaching between you. They won't be told you blocked them. You can unblock later.</div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 12, color: palette.textMuted, cursor: "pointer" }}>
              <input type="checkbox" checked={report} onChange={(e) => setReport(e.target.checked)} /> Also report this person
            </label>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button type="button" onClick={() => setAsk(null)} style={btn(false)}>Cancel</button>
              <button type="button" disabled={busy} onClick={() => onBlock(p.username, report)} style={btn(false, true)}>Block</button>
            </div>
          </div>
        )}

        <div style={{ fontSize: 11.5, fontWeight: 700, color: palette.textMuted, margin: "14px 0 7px" }}>{p.username}'s day</div>
        <div style={{ display: "flex", gap: 8 }}>
          <Signal label="Checked in" value={t.checkin} hint="Not yet" />
          <Signal label="Trade limit" value={t.trades} />
          <Signal label="Loss limit" value={t.loss} />
        </div>
        {!t.shared && <div style={sub}>{p.username} hasn't shared anything yet today.</div>}
        <div style={{ margin: "14px 0 14px" }}>
          <WeekStrip days={p.days} />
        </div>
      </div>

      <div style={{ padding: "12px 16px", borderTop: `1px solid ${palette.border}`, background: tint(palette.text, 3) }}>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: palette.textMuted }}>Their commitment this week</div>
        <div style={{ fontSize: 12.5, color: p.commit ? palette.text : palette.textFaint, marginTop: 3, lineHeight: 1.45 }}>{p.commit ? `"${p.commit.text}"` : "Nothing written yet."}</div>
        {p.lastCommit && (
          <div style={{ ...sub, color: p.lastCommit.kept === true ? GOOD : p.lastCommit.kept === false ? BAD : palette.textFaint }}>
            Last week: "{p.lastCommit.text}" {p.lastCommit.kept === true ? "(kept)" : p.lastCommit.kept === false ? "(not kept)" : "(not reviewed yet)"}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none", padding: "12px 16px 14px", borderTop: `1px solid ${palette.border}` }}>
        {NUDGES.map(([kind, text]) => (
          <button key={kind} type="button" disabled={busy} onClick={() => onNudge(p, kind)} className={TAP} style={{ ...btn(false), ...small, fontSize: 11.5 }}>{text}</button>
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
  const good = !broken && rows.some((r) => r[2] === true);
  const tone = broken ? BAD : good ? GOOD : palette.textFaint;
  const headline = broken ? "A rule was broken today" : good ? "You're on track today" : "Nothing to report yet";
  const best = partners.reduce((m, p) => Math.max(m, p.streak.current), 0);
  const clean = partners.filter((p) => p.today.shared && ![p.today.checkin, p.today.trades, p.today.loss].some((v) => v === false) && [p.today.checkin, p.today.trades, p.today.loss].some((v) => v === true)).length;
  const hints = { checkin: "Check in on your Trade plan", trades: "Set max trades per day in Settings", loss: "Set a daily loss limit in Settings" };
  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "minmax(0, 1.1fr) minmax(0, 1.6fr) auto" : "1fr", gap: isDesktop ? 22 : 14, alignItems: "center", padding: "16px 18px" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, fontWeight: 700, color: tone }}>
            <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 99, background: tone }} />
            Your day
          </div>
          <div style={{ fontSize: isDesktop ? 19 : 17, fontWeight: 800, color: palette.text, letterSpacing: -0.2, marginTop: 5 }}>{headline}</div>
          <div style={{ ...sub, marginTop: 5 }}>
            {partners.length > 0
              ? `${clean} of ${partners.length} partner${partners.length === 1 ? " is" : "s are"} clean today${best > 0 ? `. Longest streak: ${best} ${best === 1 ? "day" : "days"}.` : "."}`
              : "Add a partner to start a clean-day streak together."}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, opacity: share.on ? 1 : 0.5 }}>
          {rows.map(([key, label, value, hint]) => <Signal key={key} label={label} value={value} hint={hint} />)}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: isDesktop ? "flex-end" : "space-between" }}>
          <div style={{ textAlign: isDesktop ? "right" : "left" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: palette.text }}>Share with partners</div>
            <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} style={{ background: "transparent", border: 0, padding: 0, color: palette.gold, fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: sans }}>
              {open ? "Hide choices" : "Choose what's shared"}
            </button>
          </div>
          <Switch on={share.on} onChange={(v) => setShare({ on: v })} label="Share my day with partners" />
        </div>
      </div>
      {open && (
        <div style={{ padding: "4px 18px 16px", borderTop: `1px solid ${palette.border}`, background: tint(palette.text, 3) }}>
          <div style={{ ...sub, margin: "10px 0 0" }}>Worked out on your device from your Trade plan. Partners only ever see yes or no, never numbers.</div>
          {rows.map(([key, label, value]) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, opacity: share.on ? 1 : 0.5 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, color: palette.text, fontWeight: 600 }}>{label}</div>
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
  const { token, isDesktop, busy, run, say, reload, today, share, mine, setShare, goToCommunity } = ctx;
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
        <Card tone={palette.gold}>
          {data.nudges.slice(0, 4).map((n) => (
            <div key={n.id} style={{ fontSize: 12.5, color: palette.text, marginBottom: 4 }}><b>{n.username}</b> {NUDGE_TEXT[n.kind] || "sent you a note."}</div>
          ))}
          <button type="button" onClick={dismissNudges} style={{ ...btn(false), ...small, marginTop: 6 }}>Dismiss</button>
        </Card>
      )}
      {data.reviewDue && (
        <Card title="Last week's commitment" icon={<Check size={14} />}>
          <div style={{ fontSize: 13, color: palette.text, lineHeight: 1.45 }}>"{data.reviewDue.text}"</div>
          <div style={sub}>Did you keep it? Your partners will see your answer.</div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button type="button" disabled={busy} onClick={() => review(true)} style={btn(true)}>Yes, I kept it</button>
            <button type="button" disabled={busy} onClick={() => review(false)} style={btn(false)}>Not this time</button>
          </div>
        </Card>
      )}
      {data.partners.length === 0 && (
        <Card style={{ textAlign: "center", padding: "28px 18px" }}>
          <span style={{ width: 46, height: 46, borderRadius: 16, display: "inline-grid", placeItems: "center", background: tint(palette.gold, 14), color: palette.gold }}><Users size={22} /></span>
          <div style={{ fontSize: 15, fontWeight: 800, color: palette.text, marginTop: 10 }}>No partner yet</div>
          <div style={{ ...sub, maxWidth: 360, margin: "5px auto 0" }}>Pair up with one trader you trust. You'll see each other's yes/no signs and build a clean streak together. Add someone with a username or a code.</div>
        </Card>
      )}
      {data.partners.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(auto-fit, minmax(340px, 1fr))" : "1fr", gap: 14, marginBottom: 14 }}>
          {data.partners.map((p) => <PartnerCard key={p.linkId} p={p} busy={busy} onNudge={nudge} onLeave={leave} onBlock={block} />)}
        </div>
      )}
      {(data.incoming.length > 0 || data.outgoing.length > 0) && (
        <Card title="Invites" icon={<Send size={13} />}>
          {data.incoming.map((inv) => (
            <div key={inv.linkId} style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
              <Avatar name={inv.username} size={30} src={inv.avatar || undefined} />
              <div style={{ flex: "1 1 140px", minWidth: 0, fontSize: 12.5, color: palette.text }}><b>{inv.username}</b> wants to be your partner</div>
              <button type="button" disabled={busy} onClick={() => respond(inv, true)} style={{ ...btn(true), ...small }}>Accept</button>
              <button type="button" disabled={busy} onClick={() => respond(inv, false)} style={{ ...btn(false), ...small }}>Decline</button>
              <button type="button" disabled={busy} aria-label={`Block ${inv.username}`} onClick={() => block(inv.username, false)} style={{ ...btn(false, true), ...small, padding: "5px 9px" }}><ShieldAlert size={14} /></button>
            </div>
          ))}
          {data.outgoing.map((inv) => (
            <div key={inv.linkId} style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
              <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: palette.textMuted }}>Waiting for <b style={{ color: palette.text }}>{inv.username}</b></div>
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
        icon={<Pencil size={13} />}
        aside={data.myCommit && !editingCommit ? <button type="button" aria-label="Edit commitment" onClick={() => { setCommitText(data.myCommit.text); setEditingCommit(true); }} style={{ ...btn(false), minHeight: 30, padding: "4px 10px" }}><Pencil size={13} /></button> : null}
      >
        {data.myCommit && !editingCommit ? (
          <div style={{ fontSize: 13, color: palette.text, lineHeight: 1.45 }}>"{data.myCommit.text}"</div>
        ) : (
          <>
            <div style={sub}>One line you'll hold yourself to, like "No trades after my second loss". Partners see it, and next week you mark whether you kept it.</div>
            <textarea value={commitText} maxLength={COMMIT_MAX} onChange={(e) => setCommitText(e.target.value)} rows={2} placeholder="This week I will..." style={{ ...field, marginTop: 10, resize: "none", minHeight: 62 }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
              <span style={{ fontSize: 11, color: palette.textFaint }}>{commitText.length}/{COMMIT_MAX}</span>
              <span style={{ display: "flex", gap: 8 }}>
                {editingCommit && <button type="button" onClick={() => setEditingCommit(false)} style={btn(false)}>Cancel</button>}
                <button type="button" disabled={busy} onClick={saveCommit} style={btn(true)}>{commitText.trim() ? "Save" : "Clear"}</button>
              </span>
            </div>
          </>
        )}
      </Card>

      <Card title="Add a partner" icon={<Plus size={14} />}>
        {room <= 0 ? (
          <div style={sub}>
            Your {data.limit} partner {data.limit === 1 ? "spot is" : "spots are"} filled.
            {data.limit < 3 ? " Upgrade to Pro for up to 3." : ""}
            {data.limit < 3 && <button type="button" onClick={() => openPlans(`Your plan includes ${data.limit} partner. Upgrade to Pro for up to 3.`)} style={{ ...btn(true), ...small, marginLeft: 8 }}>See plans</button>}
          </div>
        ) : (
          <>
            <div style={{ ...sub, marginTop: -4 }}>Invite someone by their Community username.</div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <input value={inviteName} onChange={(e) => setInviteName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && invite()} placeholder="username" autoCapitalize="none" autoCorrect="off" style={field} />
              <button type="button" disabled={busy || !inviteName.trim()} onClick={invite} style={btn(true)}>Invite</button>
            </div>
            <div style={{ height: 1, background: palette.border, margin: "14px 0" }} />
            <div style={{ fontSize: 12, fontWeight: 700, color: palette.textMuted }}>Or use a code</div>
            <div style={sub}>Share a one-time code in any chat. Whoever enters it becomes your partner straight away. It lasts 48 hours.</div>
            {data.code ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                <span style={{ fontFamily: mono, fontSize: 20, fontWeight: 800, letterSpacing: 3, color: palette.text }}>{data.code.code}</span>
                <button type="button" onClick={copyCode} style={{ ...btn(false), ...small }}><Copy size={12} style={{ verticalAlign: "-1px", marginRight: 5 }} />Copy</button>
                <button type="button" disabled={busy} onClick={makeCode} style={{ ...btn(false), ...small }}>New code</button>
              </div>
            ) : (
              <button type="button" disabled={busy} onClick={makeCode} style={{ ...btn(false), marginTop: 10 }}>Make a code</button>
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
            <span style={{ fontSize: 13, fontWeight: 800, color: palette.text }}>Blocked ({data.blocked.length})</span>
            <ChevronDown size={15} style={{ color: palette.textFaint, transform: showBlocked ? "rotate(180deg)" : "none" }} />
          </button>
          {showBlocked && data.blocked.map((name) => (
            <div key={name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10, fontSize: 12.5, color: palette.text }}>
              <span>{name}</span>
              <button type="button" disabled={busy} onClick={() => unblock(name)} style={{ ...btn(false), minHeight: 30, padding: "4px 12px" }}>Unblock</button>
            </div>
          ))}
        </Card>
      )}
      <div style={{ ...sub, textAlign: "center", padding: "0 8px 6px" }}>Partners never see your balance, P&amp;L, trades or notes. Turn sharing off above at any time.</div>
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
function TradeRow({ t, onOpen, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderTop: `1px solid ${palette.border}` }}>
      <button type="button" onClick={onOpen} disabled={!onOpen} className={TAP} style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0, textAlign: "left", background: "transparent", border: 0, padding: 0, cursor: onOpen ? "pointer" : "default", fontFamily: sans }}>
        <span style={{ minWidth: 0, flex: 1 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: palette.text }}>{t.pair || "Trade"}</span>
            {t.direction && <Pill color={String(t.direction).toLowerCase().startsWith("s") ? BAD : GOOD}>{t.direction}</Pill>}
          </span>
          <span style={{ display: "block", fontSize: 11, color: palette.textFaint, marginTop: 2 }}>{dateText(t.ts)}{t.comments > 0 ? ` · ${t.comments} comment${t.comments === 1 ? "" : "s"}` : ""}</span>
        </span>
        <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 800, color: t.pnl >= 0 ? GOOD : BAD }}>{money(t.pnl)}</span>
      </button>
      {right}
    </div>
  );
}

function TradeDetail({ ctx, id, onBack, onUnshared }) {
  const { token, run, say, isDesktop } = ctx;
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
  const back = !isDesktop || onBack ? <button type="button" onClick={onBack} style={{ ...btn(false), ...small, marginBottom: 10 }}><ChevronLeft size={14} style={{ verticalAlign: "-3px" }} /> Back</button> : null;
  if (err) return <Card>{back}<div style={{ fontSize: 12.5, color: BAD }}>{err}</div></Card>;
  if (!d) return <Card>{back}<div style={{ fontSize: 12.5, color: palette.textFaint }}>Loading...</div></Card>;
  const t = d.trade;
  const chips = [t.setup, t.emotion, t.session, t.confidence ? `Confidence ${t.confidence}` : ""].filter(Boolean);
  return (
    <Card>
      {back}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Avatar name={d.owner.username} size={32} src={d.owner.avatar || undefined} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: palette.text }}>{t.pair || "Trade"}</span>
            {t.direction && <Pill color={String(t.direction).toLowerCase().startsWith("s") ? BAD : GOOD}>{t.direction}</Pill>}
          </div>
          <div style={{ fontSize: 11, color: palette.textFaint }}>{d.mine ? "Shared by you" : `Shared by ${d.owner.username}`} · {dateText(t.ts)}</div>
        </div>
        <span style={{ fontFamily: mono, fontSize: 17, fontWeight: 800, color: t.pnl >= 0 ? GOOD : BAD }}>{money(t.pnl)}</span>
      </div>
      {chips.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>{chips.map((c) => <Pill key={c}>{c}</Pill>)}</div>}
      {t.note && <div style={{ fontSize: 12.5, color: palette.text, lineHeight: 1.55, marginTop: 12, whiteSpace: "pre-wrap" }}>{t.note}</div>}
      {t.shots.length > 0 && (
        <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
          {t.shots.map((s, i) => (
            <img key={i} src={s} alt={`Screenshot ${i + 1}`} onClick={() => setZoom(zoom === i ? null : i)} style={{ width: "100%", maxHeight: zoom === i ? "none" : 240, objectFit: zoom === i ? "contain" : "cover", borderRadius: 12, border: `1px solid ${palette.border}`, cursor: "zoom-in" }} />
          ))}
        </div>
      )}
      <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${palette.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 800, color: palette.text, marginBottom: 8 }}><MessageCircle size={14} style={{ color: palette.gold }} /> Comments</div>
        {d.comments.length === 0 && <div style={sub}>No comments yet.</div>}
        {d.comments.map((c) => (
          <div key={c.id} style={{ display: "flex", gap: 9, marginTop: 10 }}>
            <Avatar name={c.username} size={26} src={c.avatar || undefined} />
            <div style={{ flex: 1, minWidth: 0, padding: "8px 11px", borderRadius: 13, background: c.mine ? tint(palette.gold, 10) : tint(palette.text, 5) }}>
              <div style={{ fontSize: 11, color: palette.textFaint }}><b style={{ color: palette.text }}>{c.mine ? "You" : c.username}</b> · {dateText(c.ts)}</div>
              <div style={{ fontSize: 12.5, color: palette.text, marginTop: 2, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{c.text}</div>
            </div>
          </div>
        ))}
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <input value={text} maxLength={300} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Write a comment" style={field} />
          <button type="button" aria-label="Send comment" disabled={!text.trim()} onClick={send} style={{ ...btn(true), padding: "7px 13px" }}><Send size={14} /></button>
        </div>
      </div>
      {d.mine && <button type="button" onClick={unshare} style={{ ...btn(false, true), ...small, marginTop: 14 }}><Trash2 size={13} style={{ verticalAlign: "-2px", marginRight: 5 }} />Stop sharing this trade</button>}
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
    <Card title="Share trades with your mentors" icon={<Share2 size={13} />} aside={<button type="button" onClick={onBack} style={{ ...btn(false), minHeight: 30, padding: "4px 10px" }}>{isDesktop ? <X size={13} /> : <><ChevronLeft size={13} style={{ verticalAlign: "-2px" }} /> Back</>}</button>}>
      <div style={{ ...sub, marginTop: -4 }}>Your mentors will see the result, note and up to 2 screenshots of each trade you pick. Nothing else about your account. You can stop sharing any trade later.</div>
      {list.length === 0 && <div style={{ ...sub, marginTop: 12 }}>You haven't logged any trades yet.</div>}
      <div style={{ marginTop: 8, maxHeight: isDesktop ? 420 : "none", overflowY: "auto" }}>
        {list.map((t) => {
          const already = sharedIds.has(String(t.id));
          const shots = (tradeScreenshots(t) || []).length;
          return (
            <label key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderTop: `1px solid ${palette.border}`, cursor: "pointer" }}>
              <input type="checkbox" checked={!!picked[t.id]} onChange={(e) => setPicked({ ...picked, [t.id]: e.target.checked })} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: palette.text }}>{t.pair || "Trade"} {t.direction ? <span style={{ fontWeight: 500, color: palette.textMuted }}>{t.direction}</span> : null}</span>
                <span style={{ display: "block", fontSize: 11, color: palette.textFaint }}>{dateText(t.ts)}{shots ? <> · <Camera size={10} style={{ verticalAlign: "-1px" }} /> {shots}</> : ""}{already ? " · already shared" : ""}</span>
              </span>
              <span style={{ fontFamily: mono, fontSize: 12.5, fontWeight: 800, color: t.pnl >= 0 ? GOOD : BAD }}>{money(t.pnl)}</span>
            </label>
          );
        })}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, gap: 10 }}>
        <span style={{ fontSize: 11, color: palette.textFaint }}>{working || `${count} selected · room for ${Math.max(0, room)} more`}</span>
        <button type="button" disabled={!!working || count === 0} onClick={go} style={btn(true)}>Share {count || ""}</button>
      </div>
    </Card>
  );
}

function MentorPanel({ ctx }) {
  const { token, isDesktop, busy, run, say } = ctx;
  const [m, setM] = useState(null);
  const [err, setErr] = useState("");
  const [sel, setSel] = useState(null); // null | {kind:"pick"} | {kind:"mentee", linkId, username} | {kind:"trade", id, back}
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

  useEffect(() => {
    if (!sel || sel.kind !== "mentee") { setMenteeTrades(null); return; }
    setMenteeTrades(null);
    api(token, `/mentors/trades?linkId=${encodeURIComponent(sel.linkId)}`).then(setMenteeTrades).catch((e) => { say(e.message, true); setSel(null); });
  }, [sel, token, say]);

  const act = async (fn, okText) => { const r = await run(fn, okText); await load(); return r; };
  const askMentor = async () => { const r = await act(() => api(token, "/mentors/invite", { method: "POST", body: { username: mentorName, role: "mentor" } })); if (r) { setMentorName(""); say(r.accepted ? "You're connected." : "Request sent."); } };
  const inviteMentee = async () => { const r = await act(() => api(token, "/mentors/invite", { method: "POST", body: { username: menteeName, role: "mentee" } })); if (r) { setMenteeName(""); say(r.accepted ? "You're connected." : "Invite sent."); } };
  const respond = (inv, accept) => act(() => api(token, "/mentors/respond", { method: "POST", body: { linkId: inv.linkId, accept } }), accept ? "Connected." : "Declined.");
  const leave = (l) => act(() => api(token, "/mentors/leave", { method: "POST", body: { linkId: l.linkId } }), "Done.");

  if (err && !m) return <Card title="Couldn't load Mentor"><div style={sub}>{err}</div><button type="button" onClick={load} style={{ ...btn(true), marginTop: 10 }}>Try again</button></Card>;
  if (!m) return <Card><div style={{ fontSize: 12.5, color: palette.textFaint }}>Loading...</div></Card>;

  const hasMentors = m.mentors.length > 0;
  const grid = isDesktop ? { display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.25fr)", gap: 18, alignItems: "start" } : {};
  const backToList = () => setSel(sel && sel.back ? sel.back : null);

  const lists = (
    <div style={{ minWidth: 0 }}>
      {m.invites.length > 0 && (
        <Card title="Requests" icon={<Send size={13} />}>
          {m.invites.map((inv) => (
            <div key={inv.linkId} style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
              <Avatar name={inv.username} size={30} src={inv.avatar || undefined} />
              <div style={{ flex: "1 1 150px", minWidth: 0, fontSize: 12.5, color: palette.text }}><b>{inv.username}</b> {inv.asks === "mentor" ? "wants you as their mentor" : "offers to be your mentor"}</div>
              <button type="button" disabled={busy} onClick={() => respond(inv, true)} style={{ ...btn(true), ...small }}>Accept</button>
              <button type="button" disabled={busy} onClick={() => respond(inv, false)} style={{ ...btn(false), ...small }}>Decline</button>
            </div>
          ))}
        </Card>
      )}

      <Card title="Your mentors" icon={<Users size={13} />}>
        {m.mentors.length === 0 && <div style={sub}>A mentor is a Creator who can look at the trades you choose to share and leave comments. Ask someone you trust.</div>}
        {m.mentors.map((l) => (
          <div key={l.linkId} style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
            <Avatar name={l.username} size={30} src={l.avatar || undefined} />
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 700, color: palette.text }}>{l.username}</div><div style={{ fontSize: 11, color: palette.textFaint }}>Mentor since {dateText(l.since)}</div></div>
            <button type="button" disabled={busy} onClick={() => leave(l)} style={{ ...btn(false, true), ...small }}>Remove</button>
          </div>
        ))}
        {m.pending.filter((p) => p.as === "mentor").map((p) => (
          <div key={p.linkId} style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
            <div style={{ flex: 1, fontSize: 12.5, color: palette.textMuted }}>Waiting for <b style={{ color: palette.text }}>{p.username}</b></div>
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
        <Card title="Shared with your mentors" icon={<Share2 size={13} />} aside={<button type="button" onClick={() => setSel({ kind: "pick" })} style={{ ...btn(true), ...small }}>Share trades</button>}>
          {m.shared.length === 0 && <div style={sub}>Nothing shared yet. Pick the trades you want feedback on.</div>}
          {m.shared.map((t) => <TradeRow key={t.id} t={t} onOpen={() => setSel({ kind: "trade", id: t.id })} />)}
        </Card>
      )}

      {m.creator ? (
        <Card title="Your mentees" icon={<Users size={13} />} aside={<Pill color={palette.gold}>Creator</Pill>}>
          {m.mentees.length === 0 && <div style={sub}>Invite a trader you want to coach. You'll only ever see the trades they choose to share.</div>}
          {m.mentees.map((l) => (
            <div key={l.linkId} style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
              <button type="button" onClick={() => setSel({ kind: "mentee", linkId: l.linkId, username: l.username })} className={TAP} style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0, textAlign: "left", background: "transparent", border: 0, padding: 0, cursor: "pointer", fontFamily: sans }}>
                <Avatar name={l.username} size={30} src={l.avatar || undefined} />
                <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 13, fontWeight: 700, color: palette.text }}>{l.username}</span><span style={{ display: "block", fontSize: 11, color: palette.textFaint }}>{l.shared} shared trade{l.shared === 1 ? "" : "s"}</span></span>
              </button>
              <button type="button" disabled={busy} onClick={() => leave(l)} style={{ ...btn(false, true), ...small }}>Remove</button>
            </div>
          ))}
          {m.pending.filter((p) => p.as === "mentee").map((p) => (
            <div key={p.linkId} style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
              <div style={{ flex: 1, fontSize: 12.5, color: palette.textMuted }}>Waiting for <b style={{ color: palette.text }}>{p.username}</b></div>
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
          <div style={sub}>With the Creator plan you can coach up to {m.limits.mentees} traders. They share chosen trades with you, and you reply with comments.</div>
          <button type="button" onClick={() => openPlans("Coaching other traders is part of the Creator plan.")} style={{ ...btn(true), marginTop: 10 }}>See Creator plan</button>
        </Card>
      )}
    </div>
  );

  let pane = null;
  if (sel && sel.kind === "pick") pane = <TradePicker ctx={ctx} mdata={m} onDone={() => { setSel(null); load(); }} onBack={() => setSel(null)} />;
  else if (sel && sel.kind === "trade") pane = <TradeDetail key={sel.id} ctx={ctx} id={sel.id} onBack={backToList} onUnshared={() => { setSel(null); load(); }} />;
  else if (sel && sel.kind === "mentee") {
    pane = (
      <Card title={`${sel.username}'s shared trades`} icon={<Share2 size={13} />} aside={<button type="button" onClick={() => setSel(null)} style={{ ...btn(false), minHeight: 30, padding: "4px 10px" }}>{isDesktop ? <X size={13} /> : <><ChevronLeft size={13} style={{ verticalAlign: "-2px" }} /> Back</>}</button>}>
        {!menteeTrades && <div style={sub}>Loading...</div>}
        {menteeTrades && menteeTrades.trades.length === 0 && <div style={sub}>They haven't shared any trades yet.</div>}
        {menteeTrades && menteeTrades.trades.map((t) => <TradeRow key={t.id} t={t} onOpen={() => setSel({ kind: "trade", id: t.id, back: sel })} />)}
      </Card>
    );
  } else if (isDesktop) {
    pane = <Card style={{ textAlign: "center", padding: "34px 20px" }}><div style={{ fontSize: 13, fontWeight: 800, color: palette.text }}>Pick a trade to review</div><div style={{ ...sub, maxWidth: 320, margin: "5px auto 0" }}>Trades shared with you or by you open here, with screenshots and a comment thread.</div></Card>;
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
      {header(
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {view === "partners" && <span style={{ padding: "5px 11px", borderRadius: 99, border: `1px solid ${palette.border}`, fontSize: 11, fontWeight: 700, color: palette.textMuted, whiteSpace: "nowrap" }}>{data.partners.length} of {data.limit} partner{data.limit === 1 ? "" : "s"}</span>}
          <Segmented value={view} onChange={setView} options={[["partners", "Partners"], ["mentor", "Mentor", commentDot]]} />
        </div>
      )}
      {toast && <div role="status" style={{ marginBottom: 14, padding: "10px 14px", borderRadius: 14, fontSize: 12.5, fontWeight: 600, background: palette.surface, color: toast.bad ? BAD : palette.text, border: `1px solid ${toast.bad ? tint(BAD, 40) : palette.border}` }}>{toast.text}</div>}
      {view === "partners" ? <PartnersPanel ctx={ctx} data={data} /> : <MentorPanel ctx={ctx} />}
    </div>
  );
}
