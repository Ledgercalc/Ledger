import { useEffect, useState } from "react";
import { Check, ChevronDown, Eye, EyeOff, Info, Link2, Lock, RefreshCw, ShieldCheck, X } from "lucide-react";
import { brokerReady, chooseAccount, connectTradeLocker, disconnect, reconnect, setAutoLog, syncNow, useBroker } from "../lib/broker.js";
import { TAP, THEME_TRANSITION, display, mono, palette } from "../lib/theme.js";
import "./BrokerTab.css";

const GREEN = "#1D9E75";
const AMBER = "#E5A93B";
const RANGES = [
  { id: "now", label: "From now on", days: 0 },
  { id: "7", label: "Last 7 days", days: 7 },
  { id: "30", label: "Last 30 days", days: 30 },
  { id: "90", label: "Last 90 days", days: 90 },
];

function useIsWide() {
  const q = "(min-width: 768px)";
  const [wide, setWide] = useState(() => (typeof window !== "undefined" && window.matchMedia ? window.matchMedia(q).matches : true));
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const m = window.matchMedia(q);
    const on = () => setWide(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return wide;
}

function ago(ms) {
  if (!ms) return "Never";
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 45) return "Just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
}
const money = (n) => `${n >= 0 ? "+" : "-"}$${Math.abs(n).toFixed(2)}`;
const fmtBal = (n, cur) => `${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${cur ? ` ${cur}` : ""}`;

const card = {
  background: palette.surface,
  border: `1px solid ${palette.border}`,
  borderRadius: 20,
  boxShadow: palette.shadow,
  transition: THEME_TRANSITION,
};
const inputBox = {
  background: palette.field,
  border: `1px solid ${palette.border}`,
  color: palette.text,
  fontFamily: mono,
  fontSize: "16px",
  borderRadius: 14,
  padding: "13px 14px",
  width: "100%",
  outline: "none",
};
const label = { color: palette.textMuted, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 6 };

function StatusPill({ phase, conn }) {
  const map = {
    idle: ["Not connected", palette.textMuted, palette.field, palette.border],
    connecting: ["Connecting…", palette.textMuted, palette.field, palette.border],
    choose: ["Choose account", AMBER, `${AMBER}1A`, `${AMBER}66`],
    syncing: ["Syncing…", palette.goldBright, `${palette.gold}1A`, `${palette.gold}55`],
    ok: [conn ? "Connected" : "Not connected", conn ? GREEN : palette.textMuted, conn ? `${GREEN}1A` : palette.field, conn ? `${GREEN}55` : palette.border],
    signin: ["Sign in again", AMBER, `${AMBER}1A`, `${AMBER}66`],
    error: ["Problem", palette.red, `${palette.red}14`, `${palette.red}55`],
  };
  const [text, color, bg, border] = map[phase] || map.idle;
  return (
    <span
      className="inline-flex items-center gap-1.5"
      style={{ fontFamily: mono, fontSize: "13px", fontWeight: 600, color, background: bg, border: `1px solid ${border}`, borderRadius: 999, padding: "5px 12px", whiteSpace: "nowrap" }}
      role="status"
    >
      <span style={{ width: 7, height: 7, borderRadius: 999, background: color, opacity: phase === "idle" ? 0.5 : 1 }} />
      {text}
    </span>
  );
}

function Segmented({ options, value, onChange }) {
  const idx = Math.max(0, options.findIndex((o) => o.id === value));
  return (
    <div role="tablist" className="relative" style={{ display: "grid", gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`, padding: 4, borderRadius: 14, background: palette.field, border: `1px solid ${palette.border}` }}>
      <span
        aria-hidden="true"
        className="ledger-seg-thumb"
        style={{ position: "absolute", top: 4, bottom: 4, left: 4, width: `calc((100% - 8px) / ${options.length})`, transform: `translateX(${idx * 100}%)`, borderRadius: 10, background: palette.gold, boxShadow: "0 2px 10px rgba(0,0,0,0.2)" }}
      />
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="tab"
          aria-selected={value === o.id}
          onClick={() => onChange(o.id)}
          className={`relative ${TAP}`}
          style={{ zIndex: 1, background: "transparent", padding: "10px 4px", fontFamily: display, fontSize: "14px", fontWeight: value === o.id ? 700 : 500, color: value === o.id ? palette.letterbox : palette.textMuted, transition: "color 0.2s ease" }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({ on, onChange, title, desc }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className={`w-full flex items-center gap-3 text-left ${TAP}`} style={{ background: "transparent" }}>
      <span className="flex-1 min-w-0">
        <span className="block" style={{ color: palette.text, fontFamily: display, fontSize: "16px", fontWeight: 600 }}>{title}</span>
        <span className="block" style={{ color: palette.textMuted, fontSize: "13px", marginTop: 2 }}>{desc}</span>
      </span>
      <span className="flex-shrink-0" style={{ width: 48, height: 28, borderRadius: 999, background: on ? palette.gold : palette.border, position: "relative", transition: "background 0.2s ease" }}>
        <span style={{ position: "absolute", top: 3, left: on ? 23 : 3, width: 22, height: 22, borderRadius: 999, background: "#fff", transition: "left 0.2s cubic-bezier(0.22, 1, 0.36, 1)", boxShadow: "0 1px 4px rgba(0,0,0,0.3)" }} />
      </span>
    </button>
  );
}

function PasswordField({ value, onChange, onEnter, placeholder = "Your TradeLocker password" }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && onEnter) onEnter(); }}
        placeholder={placeholder}
        autoComplete="current-password"
        style={{ ...inputBox, paddingRight: 48 }}
      />
      <button type="button" onClick={() => setShow((v) => !v)} className={`absolute ${TAP}`} style={{ right: 6, top: "50%", transform: "translateY(-50%)", padding: 10, color: palette.textMuted, background: "transparent" }} aria-label={show ? "Hide password" : "Show password"}>
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

export default function BrokerTab(props) {
  const wideQuery = useIsWide();
  const isDesktop = props.isDesktop ?? wideQuery;
  const { phase, conn, error, choices, diag, lastAdded } = useBroker();
  const ready = brokerReady();

  const [env, setEnv] = useState("demo");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [server, setServer] = useState("");
  const [range, setRange] = useState("now");
  const [auto, setAuto] = useState(true);
  const [pw2, setPw2] = useState("");
  const [showDiag, setShowDiag] = useState(false);
  const [confirmOff, setConfirmOff] = useState(false);
  const [, tick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const busy = phase === "connecting";
  const canConnect = ready && !busy && email.trim() && password && server.trim();
  const connect = () => {
    if (!canConnect) return;
    const days = RANGES.find((r) => r.id === range).days;
    connectTradeLocker({ env, email, password, server, importFrom: days ? Date.now() - days * 86400000 : Date.now(), autoLog: auto });
    setPassword("");
  };

  const wrap = { maxWidth: isDesktop ? 760 : "none", margin: "0 auto" };
  const pad = isDesktop ? 24 : 18;

  return (
    <div style={{ ...wrap, paddingBottom: 24 }}>
      <div className="flex items-start justify-between gap-3" style={{ marginBottom: 6 }}>
        <h2 style={{ fontFamily: display, fontSize: isDesktop ? "32px" : "26px", fontWeight: 700, color: palette.text, margin: 0, letterSpacing: "-0.02em" }}>Broker</h2>
        <StatusPill phase={phase} conn={conn} />
      </div>
      <p style={{ color: palette.textMuted, fontSize: "14px", lineHeight: 1.5, margin: "0 0 18px" }}>
        Connect your trading account and your closed trades are added to your journal automatically.
      </p>

      {!ready && (
        <div className="flex gap-3" style={{ ...card, padding: 14, marginBottom: 14, borderColor: `${AMBER}66`, background: `${AMBER}12` }}>
          <Info size={18} style={{ color: AMBER, flexShrink: 0, marginTop: 2 }} />
          <p style={{ color: palette.text, fontSize: "13px", lineHeight: 1.5, margin: 0 }}>
            Broker sync is not switched on for this app yet. You can look around, but connecting is turned off until it is.
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2" style={{ marginBottom: 14 }} role="group" aria-label="Platform">
        <span className="inline-flex items-center gap-2" style={{ background: palette.gold, color: palette.letterbox, borderRadius: 14, padding: "10px 16px", fontFamily: display, fontSize: "15px", fontWeight: 700 }}>
          <Link2 size={16} /> TradeLocker
        </span>
        {["MetaTrader 5", "Match-Trader"].map((p) => (
          <span key={p} className="inline-flex items-center gap-2" style={{ background: palette.field, border: `1px solid ${palette.border}`, color: palette.textFaint, borderRadius: 14, padding: "10px 14px", fontFamily: display, fontSize: "14px" }}>
            {p}
            <span style={{ fontSize: "11px", fontFamily: mono, background: palette.surface, border: `1px solid ${palette.border}`, borderRadius: 999, padding: "1px 8px" }}>Soon</span>
          </span>
        ))}
      </div>

      {/* ---------- choose an account ---------- */}
      {phase === "choose" && (
        <div style={{ ...card, padding: pad, marginBottom: 14 }}>
          <div style={{ fontFamily: display, fontSize: "18px", fontWeight: 700, color: palette.text }}>Which account?</div>
          <p style={{ color: palette.textMuted, fontSize: "13px", margin: "4px 0 14px" }}>This login has more than one trading account. Pick the one to sync.</p>
          <div className="flex flex-col gap-2">
            {choices.map((a) => (
              <button key={a.id} type="button" onClick={() => chooseAccount(a)} className={`flex items-center justify-between gap-3 text-left ${TAP}`} style={{ background: palette.field, border: `1px solid ${palette.border}`, borderRadius: 14, padding: "12px 14px" }}>
                <span className="min-w-0">
                  <span className="block truncate" style={{ color: palette.text, fontSize: "15px", fontWeight: 600 }}>{a.name}</span>
                  <span className="block" style={{ color: palette.textFaint, fontSize: "12px", fontFamily: mono }}>#{a.id}</span>
                </span>
                <span style={{ color: palette.text, fontFamily: mono, fontSize: "14px", fontWeight: 600 }}>{fmtBal(a.balance, a.currency)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ---------- connect form ---------- */}
      {!conn && phase !== "choose" && (
        <div style={{ ...card, padding: pad, marginBottom: 14 }}>
          <span style={label}>Account type</span>
          <Segmented options={[{ id: "demo", label: "Demo" }, { id: "live", label: "Live" }]} value={env} onChange={setEnv} />

          <div style={{ marginTop: 16 }}>
            <label htmlFor="bk-email" style={label}>Email</label>
            <input id="bk-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="username" style={inputBox} />
          </div>
          <div style={{ marginTop: 14 }}>
            <span style={label}>Password</span>
            <PasswordField value={password} onChange={setPassword} onEnter={connect} />
          </div>
          <div style={{ marginTop: 14 }}>
            <label htmlFor="bk-server" style={label}>Server name</label>
            <input id="bk-server" type="text" value={server} onChange={(e) => setServer(e.target.value)} placeholder="e.g. HEROFX" autoCapitalize="characters" autoCorrect="off" spellCheck={false} style={inputBox} />
            <p style={{ color: palette.textFaint, fontSize: "12px", margin: "6px 2px 0" }}>It is shown on your broker or prop firm's TradeLocker login page.</p>
          </div>

          <div style={{ marginTop: 18 }}>
            <span style={label}>Import trades</span>
            <div className="flex flex-wrap gap-2">
              {RANGES.map((r) => (
                <button key={r.id} type="button" onClick={() => setRange(r.id)} className={TAP} aria-pressed={range === r.id} style={{ borderRadius: 999, padding: "8px 14px", fontSize: "13px", fontWeight: 600, background: range === r.id ? `${palette.gold}22` : palette.field, color: range === r.id ? palette.goldBright : palette.textMuted, border: `1px solid ${range === r.id ? palette.gold : palette.border}` }}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ borderTop: `1px solid ${palette.border}`, marginTop: 18, paddingTop: 16 }}>
            <Toggle on={auto} onChange={setAuto} title="Auto-log new trades" desc="Add each trade to your journal as soon as it closes." />
          </div>

          <button type="button" onClick={connect} disabled={!canConnect} className={`w-full ${TAP}`} style={{ marginTop: 18, padding: "15px 0", borderRadius: 16, background: palette.gold, color: palette.letterbox, fontFamily: display, fontSize: "16px", fontWeight: 700, opacity: canConnect ? 1 : 0.5, boxShadow: canConnect ? `0 8px 22px ${palette.gold}44` : "none", transition: "opacity 0.2s ease" }}>
            {busy ? "Connecting…" : "Connect TradeLocker"}
          </button>
          {error && phase === "error" && <p style={{ color: palette.red, fontSize: "13px", lineHeight: 1.5, margin: "10px 2px 0" }} role="alert">{error}</p>}

          <div className="flex gap-3" style={{ marginTop: 18, background: palette.field, borderRadius: 14, padding: 14 }}>
            <ShieldCheck size={20} style={{ color: GREEN, flexShrink: 0, marginTop: 1 }} />
            <div style={{ color: palette.textMuted, fontSize: "13px", lineHeight: 1.55 }}>
              <strong style={{ color: palette.text }}>Read-only.</strong> We only read your closed trades and cannot place or change orders. Your password is used once to sign in and is never saved. A login token stays on this device only, and you can disconnect at any time.
            </div>
          </div>
        </div>
      )}

      {/* ---------- sign in again ---------- */}
      {conn && phase === "signin" && (
        <div style={{ ...card, padding: pad, marginBottom: 14, borderColor: `${AMBER}66` }}>
          <div className="flex items-center gap-2" style={{ fontFamily: display, fontSize: "17px", fontWeight: 700, color: palette.text }}>
            <Lock size={17} style={{ color: AMBER }} /> Sign in again
          </div>
          <p style={{ color: palette.textMuted, fontSize: "13px", lineHeight: 1.5, margin: "6px 0 12px" }}>
            Your TradeLocker session ended. Enter your password for {conn.email} to keep syncing.
          </p>
          <PasswordField value={pw2} onChange={setPw2} onEnter={() => pw2 && (reconnect(pw2), setPw2(""))} />
          <button type="button" disabled={!pw2} onClick={() => { reconnect(pw2); setPw2(""); }} className={`w-full ${TAP}`} style={{ marginTop: 12, padding: "13px 0", borderRadius: 14, background: palette.gold, color: palette.letterbox, fontFamily: display, fontSize: "15px", fontWeight: 700, opacity: pw2 ? 1 : 0.5 }}>
            Sign in
          </button>
          {error && <p style={{ color: palette.red, fontSize: "13px", margin: "10px 2px 0" }} role="alert">{error}</p>}
        </div>
      )}

      {/* ---------- connected ---------- */}
      {conn && (
        <>
          <div style={{ ...card, padding: pad, marginBottom: 14 }}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="truncate" style={{ fontFamily: display, fontSize: "20px", fontWeight: 700, color: palette.text }}>{conn.accountName}</span>
                  <span style={{ fontFamily: mono, fontSize: "11px", fontWeight: 700, padding: "2px 9px", borderRadius: 999, color: conn.env === "live" ? palette.red : palette.goldBright, background: conn.env === "live" ? `${palette.red}14` : `${palette.gold}1A`, border: `1px solid ${conn.env === "live" ? `${palette.red}55` : `${palette.gold}55`}` }}>
                    {conn.env === "live" ? "LIVE" : "DEMO"}
                  </span>
                </div>
                <div style={{ color: palette.textFaint, fontSize: "12px", fontFamily: mono, marginTop: 3 }}>TradeLocker · {conn.server} · #{conn.accountId}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div style={{ color: palette.textFaint, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase" }}>Balance</div>
                <div style={{ color: palette.text, fontFamily: mono, fontSize: "16px", fontWeight: 700 }}>{fmtBal(conn.balance, conn.currency)}</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, marginTop: 16 }}>
              {[
                ["Last synced", ago(conn.lastSyncAt)],
                ["Trades added", String(conn.totalImported || 0)],
                ["Checks", conn.autoLog ? "Every minute" : "Manual"],
              ].map(([k, v]) => (
                <div key={k} style={{ background: palette.field, borderRadius: 14, padding: "10px 12px", minWidth: 0 }}>
                  <div style={{ color: palette.textFaint, fontSize: "11px" }}>{k}</div>
                  <div className="truncate" style={{ color: palette.text, fontFamily: display, fontSize: "15px", fontWeight: 700, marginTop: 2 }}>{v}</div>
                </div>
              ))}
            </div>

            {phase === "ok" && conn.lastSyncAt > 0 && (
              <p style={{ color: lastAdded > 0 ? GREEN : palette.textMuted, fontSize: "13px", margin: "12px 2px 0", display: "flex", alignItems: "center", gap: 6 }}>
                {lastAdded > 0 ? <Check size={15} /> : null}
                {lastAdded > 0 ? `Added ${lastAdded} new trade${lastAdded === 1 ? "" : "s"} to your journal.` : "Up to date. No new closed trades."}
              </p>
            )}
            {phase === "error" && error && <p style={{ color: palette.red, fontSize: "13px", margin: "12px 2px 0" }} role="alert">{error}</p>}

            <div style={{ borderTop: `1px solid ${palette.border}`, marginTop: 14, paddingTop: 14 }}>
              <Toggle on={!!conn.autoLog} onChange={setAutoLog} title="Auto-log new trades" desc="Add each trade to your journal as soon as it closes." />
            </div>

            <div className="flex gap-2" style={{ marginTop: 14 }}>
              <button type="button" onClick={() => syncNow({ manual: true })} disabled={phase === "syncing" || phase === "signin"} className={`flex-1 flex items-center justify-center gap-2 ${TAP}`} style={{ padding: "13px 0", borderRadius: 14, background: palette.gold, color: palette.letterbox, fontFamily: display, fontSize: "15px", fontWeight: 700, opacity: phase === "syncing" || phase === "signin" ? 0.6 : 1 }}>
                <RefreshCw size={17} style={{ animation: phase === "syncing" ? "brokerSpin 1s linear infinite" : "none" }} />
                {phase === "syncing" ? "Syncing…" : "Sync now"}
              </button>
              {!confirmOff ? (
                <button type="button" onClick={() => setConfirmOff(true)} className={TAP} style={{ padding: "13px 18px", borderRadius: 14, background: palette.field, border: `1px solid ${palette.border}`, color: palette.textMuted, fontSize: "14px", fontWeight: 600 }}>
                  Disconnect
                </button>
              ) : (
                <div className="flex gap-2">
                  <button type="button" onClick={() => { disconnect(); setConfirmOff(false); }} className={TAP} style={{ padding: "13px 14px", borderRadius: 14, background: `${palette.red}18`, border: `1px solid ${palette.red}66`, color: palette.red, fontSize: "14px", fontWeight: 700 }}>
                    Yes, disconnect
                  </button>
                  <button type="button" onClick={() => setConfirmOff(false)} className={TAP} aria-label="Cancel" style={{ padding: "13px 12px", borderRadius: 14, background: palette.field, border: `1px solid ${palette.border}`, color: palette.textMuted }}>
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>
            {confirmOff && <p style={{ color: palette.textFaint, fontSize: "12px", margin: "8px 2px 0" }}>Your journal keeps every trade already added. Only the saved login is removed.</p>}
          </div>

          <div style={{ ...card, padding: pad, marginBottom: 14 }}>
            <div style={{ color: palette.textMuted, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Synced trades</div>
            {(conn.recent || []).length === 0 ? (
              <p style={{ color: palette.textFaint, fontSize: "14px", margin: 0 }}>Nothing synced yet. New closed trades will show up here.</p>
            ) : (
              conn.recent.map((t, i) => (
                <div key={t.extId} className="flex items-center justify-between gap-3" style={{ padding: "11px 0", borderTop: i === 0 ? "none" : `1px solid ${palette.border}` }}>
                  <div className="min-w-0">
                    <div className="truncate" style={{ color: palette.text, fontSize: "15px", fontWeight: 600 }}>{t.pair || "Trade"}</div>
                    <div style={{ color: palette.textFaint, fontSize: "12px" }}>{new Date(t.ts).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}{t.estimated ? " · estimated" : ""}</div>
                  </div>
                  <span style={{ fontFamily: mono, fontSize: "15px", fontWeight: 700, color: t.pnl > 0 ? GREEN : t.pnl < 0 ? palette.red : palette.textMuted }}>{money(t.pnl)}</span>
                </div>
              ))
            )}
          </div>

          {diag && (
            <div style={{ ...card, padding: "4px 0", marginBottom: 14 }}>
              <button type="button" onClick={() => setShowDiag((v) => !v)} aria-expanded={showDiag} className={`w-full flex items-center justify-between ${TAP}`} style={{ padding: "14px 18px", background: "transparent" }}>
                <span style={{ color: palette.textMuted, fontSize: "13px", fontWeight: 600 }}>Sync details</span>
                <ChevronDown size={16} style={{ color: palette.textFaint, transform: showDiag ? "rotate(180deg)" : "none", transition: "transform 0.2s ease" }} />
              </button>
              {showDiag && (
                <div style={{ padding: "0 18px 16px", color: palette.textMuted, fontSize: "13px", lineHeight: 1.7, fontFamily: mono }}>
                  <div>Orders read: {diag.rows}</div>
                  <div>Closed trades found: {diag.closed}</div>
                  <div>Inside your import range: {diag.inRange}</div>
                  <div>Profit comes from: {diag.pnlSource}</div>
                  {diag.noPnl > 0 && (
                    <p style={{ fontFamily: "inherit", color: AMBER, margin: "8px 0 0" }}>
                      {diag.noPnl} closed trade{diag.noPnl === 1 ? " was" : "s were"} skipped because TradeLocker did not report the profit for {diag.noPnl === 1 ? "it" : "them"}. Nothing wrong was added to your journal.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      <p style={{ color: palette.textFaint, fontSize: "12px", lineHeight: 1.6, margin: "4px 2px 0" }}>
        Syncing only reads your trade history. Trades are checked while the app is open, and new ones are added once, never twice.
      </p>
    </div>
  );
}
