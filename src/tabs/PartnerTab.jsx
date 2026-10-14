import { Check, ChevronDown, Flame, Pencil, Plus, ShieldAlert, Users, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { COMMUNITY_API_BASE } from "../api/community.js";
import { Avatar } from "../components/ui.jsx";
import { dayKeyFromDate, dayKeyFromTs, num } from "../lib/format.js";
import { isCleanCheckin } from "../lib/playbook.js";
import { openPlans } from "../lib/planStore.js";
import { TAP, mono, palette, sans } from "../lib/theme.js";

// Partner: a private accountability pair. You and a partner see only yes/no signs from each other's day
// (checked in on plan, kept to max trades, stayed inside the loss limit). Never balances, P&L or trades.

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
const NUDGE_TEXT = { you_good: "You good?", step_away: "Step away for an hour.", nice_one: "Nice discipline today.", check_in: "Where's your check-in?", left: "ended the partnership." };
const DEFAULT_SHARE = { on: true, checkin: true, trades: true, loss: true };

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

function Switch({ on, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className={TAP}
      style={{ position: "relative", width: 40, height: 23, borderRadius: 99, border: 0, flexShrink: 0, cursor: "pointer", background: on ? palette.gold : tint(palette.text, 16), transition: "background .15s ease" }}>
      <span style={{ position: "absolute", top: 3, left: on ? 20 : 3, width: 17, height: 17, borderRadius: 99, background: "#fff", transition: "left .15s ease" }} />
    </button>
  );
}

const card = { background: palette.surface, border: `1px solid ${palette.border}`, borderRadius: 16, padding: "14px 15px", marginBottom: 12, boxShadow: palette.shadow };
const h = { fontSize: 13, fontWeight: 800, color: palette.text, margin: 0 };
const sub = { fontSize: 11.5, color: palette.textFaint, lineHeight: 1.5, marginTop: 3 };
const btn = (primary, danger) => ({
  minHeight: 36, padding: "7px 14px", borderRadius: 99, fontSize: 12, fontWeight: 700, fontFamily: sans, cursor: "pointer",
  border: `1px solid ${danger ? tint(BAD, 45) : primary ? palette.gold : palette.border}`,
  background: primary ? palette.gold : "transparent",
  color: primary ? "#111" : danger ? BAD : palette.textMuted,
});
const input = { width: "100%", minHeight: 40, padding: "8px 12px", borderRadius: 12, fontSize: 16, fontFamily: sans, background: palette.field, border: `1px solid ${palette.border}`, color: palette.text, outline: "none" };

function Signal({ label, value, hint, big }) {
  const state = value === true ? "yes" : value === false ? "no" : "none";
  const color = state === "yes" ? GOOD : state === "no" ? BAD : palette.textFaint;
  return (
    <div style={{ flex: "1 1 0", minWidth: 0, padding: big ? "11px 13px" : "8px 10px", borderRadius: 12, background: tint(color, state === "none" ? 6 : 12), border: `1px solid ${tint(color, state === "none" ? 18 : 35)}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color, fontSize: 12, fontWeight: 800 }}>
        {state === "yes" ? <Check size={13} /> : state === "no" ? <X size={13} /> : <span style={{ width: 13, textAlign: "center" }}>-</span>}
        {state === "yes" ? "Yes" : state === "no" ? "Broken" : hint || "Not set"}
      </div>
      <div style={{ fontSize: 10.5, color: palette.textFaint, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
    </div>
  );
}

function WeekStrip({ days, big }) {
  const dot = (s, weekend) => ({ width: big ? 14 : 11, height: big ? 14 : 11, borderRadius: 99, background: s === "clean" ? GOOD : s === "broken" ? BAD : tint(palette.text, 12), opacity: weekend && s === "none" ? 0.4 : 1 });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 10, color: palette.textFaint, textAlign: "right", paddingTop: 15 }}>
        <span>You</span>
        <span>Them</span>
      </div>
      <div style={{ display: "flex", flex: 1, justifyContent: "space-between" }}>
        {days.map((d) => (
          <div key={d.day} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 10, color: palette.textFaint }}>{new Date(`${d.day}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "narrow", timeZone: "UTC" })}</span>
            <span style={dot(d.me, d.weekend)} />
            <span style={dot(d.them, d.weekend)} />
          </div>
        ))}
      </div>
    </div>
  );
}

function PartnerCard({ p, busy, onNudge, onLeave, onBlock, desktop, wide }) {
  const [menu, setMenu] = useState(false);
  const [ask, setAsk] = useState(null); // "leave" | "block"
  const [report, setReport] = useState(false);
  const since = new Date(p.since).toLocaleDateString([], { month: "short", day: "numeric" });
  return (
    <div style={desktop ? { ...card, padding: "20px 22px", marginBottom: 0 } : card}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Avatar name={p.username} size={desktop ? 44 : 38} src={p.avatar || undefined} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: desktop ? 15.5 : 14, fontWeight: 800, color: palette.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.username}</div>
          <div style={{ fontSize: 11, color: palette.textFaint }}>Partners since {since}</div>
        </div>
        <button type="button" aria-label="Partnership options" aria-expanded={menu} onClick={() => { setMenu((m) => !m); setAsk(null); }} className={TAP}
          style={{ width: 34, height: 34, borderRadius: 99, border: `1px solid ${palette.border}`, background: "transparent", color: palette.textMuted, display: "grid", placeItems: "center", cursor: "pointer" }}>
          <ChevronDown size={15} style={{ transform: menu ? "rotate(180deg)" : "none", transition: "transform .15s ease" }} />
        </button>
      </div>

      {menu && !ask && (
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={() => setAsk("leave")} style={btn(false)}>Leave partnership</button>
          <button type="button" onClick={() => setAsk("block")} style={btn(false, true)}>Block</button>
        </div>
      )}
      {ask === "leave" && (
        <div style={{ marginTop: 10, padding: 12, borderRadius: 12, background: tint(palette.text, 4), border: `1px solid ${palette.border}` }}>
          <div style={{ fontSize: 12.5, color: palette.text, fontWeight: 700 }}>Leave your partnership with {p.username}?</div>
          <div style={sub}>Your shared streak ends. They'll see that the partnership ended. You can invite each other again later.</div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button type="button" onClick={() => setAsk(null)} style={btn(false)}>Stay</button>
            <button type="button" disabled={busy} onClick={() => onLeave(p)} style={btn(false, true)}>Leave</button>
          </div>
        </div>
      )}
      {ask === "block" && (
        <div style={{ marginTop: 10, padding: 12, borderRadius: 12, background: tint(BAD, 6), border: `1px solid ${tint(BAD, 30)}` }}>
          <div style={{ fontSize: 12.5, color: palette.text, fontWeight: 700 }}>Block {p.username}?</div>
          <div style={sub}>This ends the partnership and stops any invites, codes or nudges between you. They won't be told you blocked them. You can unblock later.</div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 12, color: palette.textMuted, cursor: "pointer" }}>
            <input type="checkbox" checked={report} onChange={(e) => setReport(e.target.checked)} /> Also report this person
          </label>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button type="button" onClick={() => setAsk(null)} style={btn(false)}>Cancel</button>
            <button type="button" disabled={busy} onClick={() => onBlock(p.username, report)} style={btn(false, true)}>Block</button>
          </div>
        </div>
      )}

      {(() => {
        const live = p.streak.current > 0;
        const streakBox = (
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: wide ? "0 0 16px" : "14px 0 12px", padding: desktop ? "14px 16px" : "11px 13px", borderRadius: 14, background: tint(live ? palette.gold : palette.text, live ? 10 : 4), border: `1px solid ${tint(live ? palette.gold : palette.text, live ? 30 : 10)}` }}>
            <Flame size={desktop ? 26 : 22} style={{ color: live ? palette.gold : palette.textFaint, flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: desktop ? 28 : 22, fontWeight: 800, fontFamily: mono, color: palette.text, lineHeight: 1 }}>
                {p.streak.current}
                <span style={{ fontSize: 12, fontWeight: 700, fontFamily: sans, color: palette.textMuted, marginLeft: 6 }}>{p.streak.current === 1 ? "day" : "days"} clean together</span>
              </div>
              <div style={{ fontSize: 11, color: palette.textFaint, marginTop: 4 }}>
                {p.streak.best > 0 ? `Best together: ${p.streak.best} ${p.streak.best === 1 ? "day" : "days"}` : "A clean day is when you both stick to your own rules."}
              </div>
            </div>
          </div>
        );
        const signals = (
          <>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: palette.textMuted, marginBottom: 6 }}>{p.username}'s day</div>
            <div style={{ display: "flex", gap: 8 }}>
              <Signal big={desktop} label="Checked in" value={p.today.checkin} hint="Not yet" />
              <Signal big={desktop} label="Trade limit" value={p.today.trades} />
              <Signal big={desktop} label="Loss limit" value={p.today.loss} />
            </div>
            {!p.today.shared && <div style={sub}>{p.username} hasn't shared anything yet today.</div>}
          </>
        );
        const week = (
          <div style={{ margin: wide ? "18px 0 0" : "14px 0 4px" }}>
            <WeekStrip days={p.days} big={desktop} />
          </div>
        );
        const commit = (
          <div style={wide ? undefined : { marginTop: 12, paddingTop: 12, borderTop: `1px solid ${palette.border}` }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: palette.textMuted }}>Their commitment this week</div>
            <div style={{ fontSize: desktop ? 13.5 : 12.5, color: p.commit ? palette.text : palette.textFaint, marginTop: 3, lineHeight: 1.45 }}>{p.commit ? p.commit.text : "Nothing written yet."}</div>
            {p.lastCommit && (
              <div style={{ ...sub, color: p.lastCommit.kept === true ? GOOD : p.lastCommit.kept === false ? BAD : palette.textFaint }}>
                Last week: "{p.lastCommit.text}" {p.lastCommit.kept === true ? "(kept)" : p.lastCommit.kept === false ? "(not kept)" : "(not reviewed yet)"}
              </div>
            )}
          </div>
        );
        const nudges = (
          <div style={{ marginTop: wide ? 20 : 12, paddingTop: wide ? 20 : 12, borderTop: `1px solid ${palette.border}` }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: palette.textMuted, marginBottom: 8 }}>Send a nudge</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {NUDGES.map(([kind, text]) => (
                <button key={kind} type="button" disabled={busy} onClick={() => onNudge(p, kind)} className={TAP}
                  style={{ ...btn(false), minHeight: 34, padding: "6px 12px", fontSize: 11.5 }}>{text}</button>
              ))}
            </div>
          </div>
        );
        return wide ? (
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.15fr) minmax(0, 1fr)", gap: 28, marginTop: 18 }}>
            <div style={{ minWidth: 0 }}>{streakBox}{signals}{week}</div>
            <div style={{ minWidth: 0, borderLeft: `1px solid ${palette.border}`, paddingLeft: 28 }}>{commit}{nudges}</div>
          </div>
        ) : (
          <>{streakBox}{signals}{week}{commit}{nudges}</>
        );
      })()}
    </div>
  );
}

export default function PartnerTab({ isDesktop, session, communityUsername, trades = [], settings = {}, persistSettings, playbookCheckins = [], goToCommunity }) {
  const token = session && session.token;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null); // { text, bad }
  const [inviteName, setInviteName] = useState("");
  const [redeemCode, setRedeemCode] = useState("");
  const [commitText, setCommitText] = useState("");
  const [editingCommit, setEditingCommit] = useState(false);
  const [showBlocked, setShowBlocked] = useState(false);
  const [today, setToday] = useState(() => dayKeyFromDate(new Date()));
  const toastTimer = useRef(null);

  const say = useCallback((text, bad = false) => {
    setToast({ text, bad });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  // Roll the "today" key over at midnight.
  useEffect(() => {
    const id = setInterval(() => setToday((t) => { const n = dayKeyFromDate(new Date()); return n === t ? t : n; }), 60000);
    return () => clearInterval(id);
  }, []);

  const hasName = !!(communityUsername || (data && data.me && data.me.username));

  const load = useCallback(async (quiet = false) => {
    if (!token) { setLoading(false); return; }
    if (!quiet) setLoading(true);
    try {
      const d = await api(token, `/partners?day=${today}`);
      setData(d);
      setLoadError("");
    } catch (err) {
      if (err.needUsername) setLoadError("username");
      else if (!quiet || !data) setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, today]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(false); }, [load]);
  useEffect(() => {
    if (!token) return undefined;
    const tick = () => { if (document.visibilityState === "visible") load(true); };
    const id = setInterval(tick, 45000);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", tick); };
  }, [token, load]);

  // ---- my own day, worked out on this device from the same data the rest of the app uses ----
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

  // Send it (only when there is a partner to read it), a moment after it last changed.
  const partnerCount = data ? data.partners.length : 0;
  const lastSent = useRef("");
  useEffect(() => {
    if (!token || partnerCount === 0) return undefined;
    const key = `${today}|${JSON.stringify(outgoing)}`;
    if (key === lastSent.current) return undefined;
    const id = setTimeout(async () => {
      try {
        await api(token, "/partners/status", { method: "POST", body: { day: today, ...outgoing } });
        lastSent.current = key;
      } catch (e) { /* retried on the next change or refresh */ }
    }, 1200);
    return () => clearTimeout(id);
  }, [token, partnerCount, outgoing, today]);

  const setShare = (patch) => persistSettings && persistSettings({ ...settings, partnerShare: { ...share, ...patch } });

  const run = async (fn, okText) => {
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
  };

  const invite = async () => {
    const name = inviteName.trim();
    if (!name) return;
    const r = await run(() => api(token, "/partners/invite", { method: "POST", body: { username: name } }), "");
    if (r) { setInviteName(""); say(r.accepted ? "You're partners now." : "Invite sent."); }
  };
  const respond = (inv, accept) => run(() => api(token, "/partners/respond", { method: "POST", body: { linkId: inv.linkId, accept } }), accept ? `You and ${inv.username} are partners.` : "Invite declined.");
  const leave = (p) => run(() => api(token, "/partners/leave", { method: "POST", body: { linkId: p.linkId } }), "You left the partnership.");
  const cancelInvite = (inv) => run(() => api(token, "/partners/leave", { method: "POST", body: { linkId: inv.linkId } }), "Invite cancelled.");
  const block = (username, report) => run(() => api(token, "/partners/block", { method: "POST", body: { username, report: !!report } }), report ? "Blocked and reported." : "Blocked.");
  const unblock = (username) => run(() => api(token, "/partners/unblock", { method: "POST", body: { username } }), "Unblocked.");
  const nudge = (p, kind) => run(() => api(token, "/partners/nudge", { method: "POST", body: { linkId: p.linkId, kind } }), "Sent.");
  const dismissNudges = () => { setData((d) => (d ? { ...d, nudges: [] } : d)); api(token, "/partners/nudges/seen", { method: "POST", body: {} }).catch(() => {}); };
  const saveCommit = async () => {
    const r = await run(() => api(token, "/partners/commit", { method: "POST", body: { day: today, text: commitText } }), commitText.trim() ? "Commitment saved." : "Commitment cleared.");
    if (r) setEditingCommit(false);
  };
  const review = (kept) => run(() => api(token, "/partners/commit/review", { method: "POST", body: { week: data.reviewDue.week, kept } }), kept ? "Nice, that's a kept week." : "Noted. A fresh week starts now.");
  const makeCode = () => run(() => api(token, "/partners/code", { method: "POST", body: {} }), "");
  const redeem = async () => {
    const r = await run(() => api(token, "/partners/redeem", { method: "POST", body: { code: redeemCode } }), "");
    if (r) { setRedeemCode(""); say("You're partners now."); }
  };
  const copyCode = async () => {
    try { await navigator.clipboard.writeText(data.code.code); say("Code copied."); } catch (e) { say("Couldn't copy. Select the code and copy it by hand.", true); }
  };

  const wrap = { maxWidth: isDesktop ? 1280 : undefined, margin: "0 auto", fontFamily: sans, paddingBottom: 8 };
  const wrapNarrow = { ...wrap, maxWidth: isDesktop ? 560 : undefined };
  const cardX = isDesktop ? { ...card, padding: "18px 20px", marginBottom: 0 } : card;
  const stackD = isDesktop ? { display: "flex", flexDirection: "column", gap: 16, minWidth: 0 } : undefined;

  // ---- not ready states ----
  const title = (
    <div style={{ padding: isDesktop ? "2px 2px 18px" : "2px 2px 12px" }}>
      <div style={{ fontSize: isDesktop ? 24 : 18.5, fontWeight: 800, color: palette.text, letterSpacing: -0.3 }}>Partner</div>
      <div style={{ fontSize: isDesktop ? 13 : 12, color: palette.textMuted, marginTop: 3 }}>Stay on plan with someone who notices when you don't.</div>
    </div>
  );
  if (!token) {
    return (
      <div style={wrapNarrow}>
        {title}
        <div style={card}>
          <div style={h}>Sign in to find a partner</div>
          <div style={sub}>Partners are matched by account, so you need to be signed in. Your trades and balances are never shared.</div>
        </div>
      </div>
    );
  }
  if (loadError === "username" || (!hasName && !loading && !data)) {
    return (
      <div style={wrapNarrow}>
        {title}
        <div style={card}>
          <div style={h}>Pick a username first</div>
          <div style={sub}>Partners find each other by Community username. Choose yours in the Community tab, then come back.</div>
          {goToCommunity && <button type="button" onClick={goToCommunity} style={{ ...btn(true), marginTop: 12 }}>Open Community</button>}
        </div>
      </div>
    );
  }
  if (loading && !data) {
    return (
      <div style={wrapNarrow}>
        {title}
        <div style={{ ...card, color: palette.textFaint, fontSize: 12.5 }}>Loading...</div>
      </div>
    );
  }
  if (!data) {
    return (
      <div style={wrapNarrow}>
        {title}
        <div style={card}>
          <div style={h}>Couldn't load your partners</div>
          <div style={sub}>{loadError || "Check your connection and try again."}</div>
          <button type="button" onClick={() => load(false)} style={{ ...btn(true), marginTop: 12 }}>Try again</button>
        </div>
      </div>
    );
  }

  const room = data.limit - data.partners.length;
  const countLabel = `${data.partners.length} of ${data.limit} partner${data.limit === 1 ? "" : "s"}`;

  return (
    <div style={wrap}>
      <style>{`.pt-banners:empty{display:none}`}</style>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        {title}
        <span style={{ marginTop: isDesktop ? 2 : 4, padding: isDesktop ? "6px 13px" : "5px 11px", borderRadius: 99, border: `1px solid ${palette.border}`, fontSize: 11, fontWeight: 700, color: palette.textMuted, whiteSpace: "nowrap" }}>{countLabel}</span>
      </div>

      <div className="pt-banners" style={isDesktop ? { display: "flex", flexDirection: "column", gap: 16, marginBottom: 16 } : undefined}>
      {toast && (
        <div role="status" style={{ ...cardX, padding: "10px 13px", marginBottom: isDesktop ? 0 : 12, fontSize: 12.5, fontWeight: 600, color: toast.bad ? BAD : palette.text, borderColor: toast.bad ? tint(BAD, 40) : palette.border }}>{toast.text}</div>
      )}

      {data.nudges.length > 0 && (
        <div style={{ ...cardX, borderColor: tint(palette.gold, 40), background: tint(palette.gold, 7) }}>
          {data.nudges.slice(0, 4).map((n) => (
            <div key={n.id} style={{ fontSize: 12.5, color: palette.text, marginBottom: 4 }}>
              <b>{n.username}</b> {n.kind === "left" ? NUDGE_TEXT.left : `says: ${NUDGE_TEXT[n.kind] || "Hey."}`}
            </div>
          ))}
          <button type="button" onClick={dismissNudges} style={{ ...btn(false), minHeight: 32, marginTop: 6, padding: "5px 12px" }}>Dismiss</button>
        </div>
      )}

      {data.reviewDue && (
        <div style={cardX}>
          <div style={h}>Last week's commitment</div>
          <div style={{ fontSize: 13, color: palette.text, marginTop: 6, lineHeight: 1.45 }}>"{data.reviewDue.text}"</div>
          <div style={sub}>Did you keep it? Your partners will see your answer.</div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button type="button" disabled={busy} onClick={() => review(true)} style={btn(true)}>Yes, I kept it</button>
            <button type="button" disabled={busy} onClick={() => review(false)} style={btn(false)}>Not this time</button>
          </div>
        </div>
      )}

      </div>

      <div style={isDesktop ? { display: "grid", gridTemplateColumns: "minmax(0, 1fr) 380px", gap: 20, alignItems: "start" } : undefined}>
      <div style={stackD}>
      {data.partners.length === 0 && (
        <div style={{ ...card, marginBottom: isDesktop ? 0 : 12, textAlign: "center", padding: isDesktop ? "36px 28px" : "22px 18px" }}>
          <Users size={isDesktop ? 32 : 26} style={{ color: palette.gold }} />
          <div style={{ ...h, marginTop: 8, fontSize: 14 }}>No partner yet</div>
          <div style={{ ...sub, maxWidth: 340, margin: "5px auto 0" }}>Pair up with one trader you trust. You'll see each other's yes/no signs and build a clean streak together. Add someone {isDesktop ? "on the right" : "below"}.</div>
          {isDesktop && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 380, margin: "24px auto 0", textAlign: "left" }}>
              {[
                ["1", "Invite someone", "By Community username or a one-time code."],
                ["2", "Share yes or no", "You only see whether they stuck to their own rules each day."],
                ["3", "Build a streak", "A clean day is when you both stick to your rules."],
              ].map(([n, t, d]) => (
                <div key={n} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <span style={{ width: 24, height: 24, borderRadius: 99, flexShrink: 0, display: "grid", placeItems: "center", fontSize: 12, fontWeight: 800, color: palette.gold, background: tint(palette.gold, 14), border: `1px solid ${tint(palette.gold, 30)}` }}>{n}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: palette.text }}>{t}</div>
                    <div style={{ fontSize: 12, color: palette.textFaint, lineHeight: 1.45, marginTop: 1 }}>{d}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <div style={isDesktop ? { display: "grid", gap: 16, gridTemplateColumns: data.partners.length === 1 ? "minmax(0, 1fr)" : "repeat(auto-fit, minmax(360px, 1fr))" } : undefined}>
        {data.partners.map((p) => (
          <PartnerCard key={p.linkId} p={p} busy={busy} onNudge={nudge} onLeave={leave} onBlock={block} desktop={isDesktop} wide={isDesktop && data.partners.length === 1} />
        ))}
      </div>

      {(data.incoming.length > 0 || data.outgoing.length > 0) && (
        <div style={cardX}>
          <div style={h}>Invites</div>
          {data.incoming.map((inv) => (
            <div key={inv.linkId} style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
              <Avatar name={inv.username} size={32} src={inv.avatar || undefined} />
              <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: palette.text }}><b>{inv.username}</b> wants to be your partner</div>
              <button type="button" disabled={busy} onClick={() => respond(inv, true)} style={{ ...btn(true), minHeight: 32, padding: "5px 12px" }}>Accept</button>
              <button type="button" disabled={busy} onClick={() => respond(inv, false)} style={{ ...btn(false), minHeight: 32, padding: "5px 12px" }}>Decline</button>
              <button type="button" disabled={busy} aria-label={`Block ${inv.username}`} onClick={() => block(inv.username, false)} style={{ ...btn(false, true), minHeight: 32, padding: "5px 9px" }}><ShieldAlert size={14} /></button>
            </div>
          ))}
          {data.outgoing.map((inv) => (
            <div key={inv.linkId} style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
              <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: palette.textMuted }}>Waiting for <b style={{ color: palette.text }}>{inv.username}</b></div>
              <button type="button" disabled={busy} onClick={() => cancelInvite(inv)} style={{ ...btn(false), minHeight: 32, padding: "5px 12px" }}>Cancel</button>
            </div>
          ))}
        </div>
      )}

      </div>
      <aside style={stackD}>
      {/* my own day and what partners can see */}
      <div style={cardX}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={h}>Your day</div>
            <div style={sub}>Worked out on your device from your Trade plan. Partners only ever see yes or no.</div>
          </div>
          <Switch on={share.on} onChange={(v) => setShare({ on: v })} label="Share my day with partners" />
        </div>
        {[
          ["checkin", "Checked in on plan", mine.checkin, "No check-in yet today"],
          ["trades", "Kept to max trades", mine.trades, "Set a max trades per day in Settings"],
          ["loss", "Stayed inside the loss limit", mine.loss, "Set a daily loss limit in Settings"],
        ].map(([key, label, value, empty]) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, opacity: share.on ? 1 : 0.5 }}>
            <span style={{ width: 22, height: 22, borderRadius: 99, display: "grid", placeItems: "center", flexShrink: 0, background: tint(value === true ? GOOD : value === false ? BAD : palette.textFaint, 16), color: value === true ? GOOD : value === false ? BAD : palette.textFaint }}>
              {value === true ? <Check size={13} /> : value === false ? <X size={13} /> : <span style={{ fontSize: 12 }}>-</span>}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, color: palette.text, fontWeight: 600 }}>{label}</div>
              {value === null && <div style={{ fontSize: 11, color: palette.textFaint }}>{empty}</div>}
            </div>
            <Switch on={share.on && share[key]} onChange={(v) => setShare({ [key]: v })} label={`Share: ${label}`} />
          </div>
        ))}
      </div>

      {/* weekly commitment */}
      <div style={cardX}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={h}>Your commitment this week</div>
          {data.myCommit && !editingCommit && (
            <button type="button" aria-label="Edit commitment" onClick={() => { setCommitText(data.myCommit.text); setEditingCommit(true); }} style={{ ...btn(false), minHeight: 30, padding: "4px 10px" }}><Pencil size={13} /></button>
          )}
        </div>
        {data.myCommit && !editingCommit ? (
          <div style={{ fontSize: 13, color: palette.text, marginTop: 8, lineHeight: 1.45 }}>"{data.myCommit.text}"</div>
        ) : (
          <>
            <div style={sub}>One line you'll hold yourself to, like "No trades after my second loss". Your partners see it, and next week you mark whether you kept it.</div>
            <textarea value={commitText} maxLength={COMMIT_MAX} onChange={(e) => setCommitText(e.target.value)} rows={2} placeholder="This week I will..." style={{ ...input, marginTop: 10, resize: "none", minHeight: 62 }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
              <span style={{ fontSize: 11, color: palette.textFaint }}>{commitText.length}/{COMMIT_MAX}</span>
              <span style={{ display: "flex", gap: 8 }}>
                {editingCommit && <button type="button" onClick={() => setEditingCommit(false)} style={btn(false)}>Cancel</button>}
                <button type="button" disabled={busy} onClick={saveCommit} style={btn(true)}>{commitText.trim() ? "Save" : "Clear"}</button>
              </span>
            </div>
          </>
        )}
      </div>

      {/* add a partner */}
      <div style={cardX}>
        <div style={h}>Add a partner</div>
        {room <= 0 ? (
          <div style={sub}>
            You have all {data.limit} of your partner spots filled.
            {data.limit < 3 ? " Upgrade to Pro for up to 3 partners." : ""}
            {data.limit < 3 && <button type="button" onClick={() => openPlans(`Your plan includes ${data.limit} partner. Upgrade to Pro for up to 3.`)} style={{ ...btn(true), minHeight: 32, marginLeft: 8, padding: "4px 12px" }}>See plans</button>}
          </div>
        ) : (
          <>
            <div style={sub}>Invite someone by their Community username.</div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <input value={inviteName} onChange={(e) => setInviteName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && invite()} placeholder="username" autoCapitalize="none" autoCorrect="off" style={input} />
              <button type="button" disabled={busy || !inviteName.trim()} onClick={invite} style={{ ...btn(true), flexShrink: 0 }}><Plus size={14} style={{ verticalAlign: "-2px", marginRight: 4 }} />Invite</button>
            </div>
            <div style={{ height: 1, background: palette.border, margin: "14px 0" }} />
            <div style={{ fontSize: 12, fontWeight: 700, color: palette.textMuted }}>Or use a code</div>
            <div style={sub}>Share a one-time code in any chat. Whoever enters it becomes your partner straight away. It expires in 48 hours.</div>
            {data.code ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                <span style={{ fontFamily: mono, fontSize: 20, fontWeight: 800, letterSpacing: 3, color: palette.text }}>{data.code.code}</span>
                <button type="button" onClick={copyCode} style={{ ...btn(false), minHeight: 32, padding: "4px 12px" }}>Copy</button>
                <button type="button" disabled={busy} onClick={makeCode} style={{ ...btn(false), minHeight: 32, padding: "4px 12px" }}>New code</button>
              </div>
            ) : (
              <button type="button" disabled={busy} onClick={makeCode} style={{ ...btn(false), marginTop: 10 }}>Make a code</button>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <input value={redeemCode} onChange={(e) => setRedeemCode(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === "Enter" && redeem()} placeholder="Enter a code" autoCapitalize="characters" autoCorrect="off" style={{ ...input, fontFamily: mono, letterSpacing: 2 }} />
              <button type="button" disabled={busy || redeemCode.trim().length < 6} onClick={redeem} style={{ ...btn(false), flexShrink: 0 }}>Join</button>
            </div>
          </>
        )}
      </div>

      {data.blocked.length > 0 && (
        <div style={cardX}>
          <button type="button" onClick={() => setShowBlocked((v) => !v)} aria-expanded={showBlocked} style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between", background: "transparent", border: 0, padding: 0, cursor: "pointer", fontFamily: sans }}>
            <span style={h}>Blocked ({data.blocked.length})</span>
            <ChevronDown size={15} style={{ color: palette.textFaint, transform: showBlocked ? "rotate(180deg)" : "none" }} />
          </button>
          {showBlocked && data.blocked.map((name) => (
            <div key={name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10, fontSize: 12.5, color: palette.text }}>
              <span>{name}</span>
              <button type="button" disabled={busy} onClick={() => unblock(name)} style={{ ...btn(false), minHeight: 30, padding: "4px 12px" }}>Unblock</button>
            </div>
          ))}
        </div>
      )}

      </aside>
      </div>

      <div style={{ ...sub, textAlign: "center", padding: "2px 12px 6px", marginTop: isDesktop ? 20 : 0 }}>
        Partners never see your balance, P&amp;L, trades or notes. Turn sharing off above at any time.
      </div>
    </div>
  );
}
