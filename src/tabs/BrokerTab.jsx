import { TAP, display, palette } from "../lib/theme.js";
import { useState } from "react";
import { TREDZI_EA } from "../lib/tredziEa.js";

// Broker connection screen (TradeLocker, Match-Trader). Connect calls the optional `onConnect`
// prop, and shows a "not switched on yet" message until a backend handler is passed in.
export default function BrokerTab({ onConnect, onDisconnect, onSync, onAutoSyncChange, connection, syncInfo, autoSync: autoSyncProp }) {
  const PLATFORMS = [
    { id: "tradelocker", label: "TradeLocker", ready: true },
    { id: "mt5", label: "MetaTrader 5", ready: true, tag: "Free" },
    { id: "matchtrader", label: "Match-Trader", ready: true },
  ];
  const [platform, setPlatform] = useState("tradelocker");
  const [env, setEnv] = useState("demo");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [server, setServer] = useState("");
  const [brokerId, setBrokerId] = useState("");
  const [platformUrl, setPlatformUrl] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [autoSync, setAutoSync] = useState(true);
  const [status, setStatus] = useState("idle"); // idle | connecting | error
  const [msg, setMsg] = useState("");
  const [setup, setSetup] = useState(null); // { key, url } right after a sync key is created
  const [copied, setCopied] = useState("");

  const card = {
    background: palette.surface,
    border: `1px solid ${palette.border}`,
    borderRadius: "16px",
    padding: "18px",
    marginBottom: "16px",
  };
  const label = {
    color: palette.textMuted,
    fontSize: "11px",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: "6px",
    display: "block",
  };
  const field = {
    width: "100%",
    padding: "11px 12px",
    borderRadius: "10px",
    border: `1px solid ${palette.border}`,
    background: palette.field,
    color: palette.text,
    fontSize: "14px",
    outline: "none",
  };

  const isMT = platform === "matchtrader";
  const isMT5 = platform === "mt5";
  const platformLabel = isMT ? "Match-Trader" : isMT5 ? "MetaTrader 5" : "TradeLocker";
  const connectedLabel = connection && connection.platform === "matchtrader" ? "Match-Trader" : connection && connection.platform === "mt5" ? "MetaTrader 5" : "TradeLocker";
  const connected = !!(connection && connection.connected);
  const sync = syncInfo || {};

  const submit = async () => {
    if (!isMT5 && (!email.trim() || !password || (isMT ? !platformUrl.trim() : !server.trim()))) {
      setStatus("error");
      setMsg(
        isMT
          ? "Enter your login, password and platform web address."
          : isMT5
          ? "Enter your login number, password and server name."
          : "Enter your email, password and server name."
      );
      return;
    }
    if (!onConnect) {
      setStatus("error");
      setMsg("Broker sync isn\u2019t switched on yet. This screen is ready; the connection backend is coming next.");
      return;
    }
    setStatus("connecting");
    setMsg("");
    try {
      const data = await onConnect({ platform, env, email: email.trim(), password, server: server.trim(), brokerId: brokerId.trim(), platformUrl: platformUrl.trim(), autoSync });
      if (data && data.syncKey) setSetup({ key: data.syncKey, url: data.pushUrl });
      setStatus("idle");
      setPassword("");
    } catch (e) {
      setStatus("error");
      setMsg(e?.message || "Couldn\u2019t connect. Check your details and try again.");
    }
  };

  const disconnect = async () => {
    setStatus("idle");
    setMsg("");
    try {
      if (onDisconnect) await onDisconnect();
    } catch (e) {
      setStatus("error");
      setMsg(e?.message || "Couldn\u2019t disconnect. Try again.");
    }
  };
  const ghostBtn = {
    background: "transparent",
    color: palette.textMuted,
    border: `1px solid ${palette.border}`,
    borderRadius: "10px",
    padding: "8px 12px",
    fontSize: "13px",
  };
  const originOf = (u) => {
    try { return new URL(u).origin; } catch (e) { return u; }
  };
  const copyText = async (text, tag) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(tag);
      setTimeout(() => setCopied(""), 1500);
    } catch (e) { /* clipboard blocked */ }
  };
  const downloadEa = () => {
    if (!setup) return;
    const src = TREDZI_EA.split("__PUSH_URL__").join(setup.url).split("__SYNC_KEY__").join(setup.key);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([src], { type: "text/plain" }));
    a.download = "TredziSync.mq5";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const newKey = async () => {
    if (!onConnect) return;
    setStatus("connecting");
    setMsg("");
    try {
      const data = await onConnect({ platform: "mt5", autoSync: !!autoSyncProp });
      if (data && data.syncKey) setSetup({ key: data.syncKey, url: data.pushUrl });
      setStatus("idle");
    } catch (e) {
      setStatus("error");
      setMsg(e?.message || "Couldn\u2019t create a new key. Try again.");
    }
  };
  const when = (ts) => (ts ? new Date(ts).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }) : "never");

  const pill = (text, color) => (
    <span
      style={{
        fontSize: "11px",
        fontWeight: 700,
        padding: "3px 9px",
        borderRadius: "999px",
        color,
        border: `1px solid ${color}`,
      }}
    >
      {text}
    </span>
  );

  return (
    <div style={{ maxWidth: 560 }}>
      <div className="flex items-center justify-between mb-1">
        <h2 style={{ color: palette.text, fontFamily: display, fontSize: "22px", fontWeight: 700 }}>Broker</h2>
        {connected ? pill("Connected", palette.green) : pill("Not connected", palette.textFaint)}
      </div>
      <p className="text-xs mb-5" style={{ color: palette.textFaint }}>
        Connect your trading account and closed trades are added to your journal automatically.
      </p>

      {/* Platform picker */}
      <div style={card}>
        <span style={label}>Platform</span>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((p) => {
            const active = platform === p.id;
            return (
              <button
                key={p.id}
                type="button"
                disabled={!p.ready}
                onClick={() => {
                  if (!p.ready) return;
                  setPlatform(p.id);
                  setStatus("idle");
                  setMsg("");
                }}
                className={TAP}
                style={{
                  padding: "9px 14px",
                  borderRadius: "10px",
                  fontSize: "13.5px",
                  fontWeight: active ? 700 : 500,
                  background: active ? palette.gold : "transparent",
                  color: active ? "#fff" : p.ready ? palette.text : palette.textFaint,
                  border: `1px solid ${active ? palette.gold : palette.border}`,
                  opacity: p.ready ? 1 : 0.7,
                  cursor: p.ready ? "pointer" : "not-allowed",
                }}
              >
                {p.label}
                {!p.ready && <span style={{ marginLeft: 8, fontSize: "10.5px" }}>Soon</span>}
                {p.ready && p.tag && <span style={{ marginLeft: 8, fontSize: "10.5px", opacity: 0.8 }}>{p.tag}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Connection form / connected state */}
      {!connected && isMT5 ? (
        <div style={card}>
          <div style={{ color: palette.text, fontSize: "15px", fontWeight: 700, marginBottom: 6 }}>Free sync with a small MT5 add-on</div>
          <p className="text-xs mb-4" style={{ color: palette.textFaint, lineHeight: 1.6 }}>
            Tredzi gives you a sync key and a ready-made add-on file (an Expert Advisor). You put the file into MetaTrader 5 once, and it sends your
            open trade and your closed trades to Tredzi. No password is shared and it costs nothing. MetaTrader 5 has to stay running, on your PC or a
            VPS, for trades to come in. One key links one account.
          </p>
          <div
            className="flex items-center justify-between mb-4"
            style={{ padding: "12px 0", borderTop: `1px solid ${palette.border}` }}
          >
            <div>
              <div style={{ color: palette.text, fontSize: "14px", fontWeight: 600 }}>Auto-log new trades</div>
              <div className="text-xs" style={{ color: palette.textFaint }}>
                Add trades to your journal as soon as they close.
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={autoSync}
              onClick={() => setAutoSync((v) => !v)}
              style={{
                width: 44,
                height: 26,
                borderRadius: 999,
                border: "none",
                position: "relative",
                background: autoSync ? palette.gold : palette.border,
                transition: "background 150ms",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 3,
                  left: autoSync ? 21 : 3,
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: "#fff",
                  transition: "left 150ms",
                }}
              />
            </button>
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={status === "connecting"}
            className={TAP}
            style={{
              width: "100%",
              background: palette.gold,
              color: "#fff",
              border: "none",
              borderRadius: "12px",
              padding: "12px 16px",
              fontSize: "14.5px",
              fontWeight: 700,
              opacity: status === "connecting" ? 0.7 : 1,
            }}
          >
            {status === "connecting" ? "Creating\u2026" : "Create my sync key"}
          </button>
          {msg && (
            <p className="text-xs mt-3" style={{ color: status === "error" ? palette.red : palette.textFaint }}>
              {msg}
            </p>
          )}
        </div>
      ) : !connected ? (
        <div style={card}>
          {!isMT && !isMT5 && (
            <>
          <span style={label}>Account type</span>
          <div
            className="flex mb-4"
            style={{ border: `1px solid ${palette.border}`, borderRadius: "10px", overflow: "hidden" }}
          >
            {[
              { id: "demo", text: "Demo" },
              { id: "live", text: "Live" },
            ].map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setEnv(o.id)}
                className={TAP}
                style={{
                  flex: 1,
                  padding: "9px 0",
                  fontSize: "13.5px",
                  fontWeight: env === o.id ? 700 : 500,
                  background: env === o.id ? palette.field : "transparent",
                  color: env === o.id ? palette.text : palette.textFaint,
                  border: "none",
                }}
              >
                {o.text}
              </button>
            ))}
          </div>
            </>
          )}

          <label style={label}>{isMT ? "Email or login" : isMT5 ? "Login (account number)" : "Email"}</label>
          <input
            style={{ ...field, marginBottom: 14 }}
            type={isMT || isMT5 ? "text" : "email"}
            inputMode={isMT5 ? "numeric" : undefined}
            autoComplete="off"
            autoCapitalize="none"
            placeholder={isMT ? "Email or login number" : isMT5 ? "e.g. 22453" : "you@example.com"}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label style={label}>{isMT5 ? "Investor password (read-only)" : "Password"}</label>
          <div style={{ position: "relative", marginBottom: 14 }}>
            <input
              style={{ ...field, paddingRight: 64 }}
              type={showPw ? "text" : "password"}
              autoComplete="new-password"
              placeholder={isMT5 ? "Investor password" : `${platformLabel} password`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                color: palette.textMuted,
                fontSize: "12px",
              }}
            >
              {showPw ? "Hide" : "Show"}
            </button>
          </div>

          {isMT ? (
            <>
              <label style={label}>Broker ID / Server (optional)</label>
              <input
                style={{ ...field, marginBottom: 14 }}
                autoComplete="off"
                placeholder="Broker ID or server name, if you have one"
                value={brokerId}
                onChange={(e) => setBrokerId(e.target.value)}
              />
              <label style={label}>Platform web address</label>
              <input
                style={field}
                type="url"
                autoComplete="off"
                autoCapitalize="none"
                placeholder="https://trader.yourbroker.com"
                value={platformUrl}
                onChange={(e) => setPlatformUrl(e.target.value)}
              />
              <p className="text-xs mt-2 mb-4" style={{ color: palette.textFaint }}>
                Use the login and password you sign in to Match-Trader with. The web address is the page you open to log in to your
                broker or prop firm&apos;s Match-Trader. Some firms show this as a "Server" in their dashboard, so paste that if you have no Broker ID. Leave it blank if login works without it.
              </p>
            </>
          ) : (
            <>
              <label style={label}>Server name</label>
              <input
                style={field}
                autoComplete="off"
                placeholder={isMT5 ? "e.g. YourBroker-Live" : "e.g. your broker or prop firm's server"}
                value={server}
                onChange={(e) => setServer(e.target.value)}
              />
              <p className="text-xs mt-2 mb-4" style={{ color: palette.textFaint }}>
                {isMT5
                  ? "Use your account login number and server name from your broker or prop firm. The investor password is read-only: it can see your trades but can't place or change any. If you only have your main password, change it or ask your broker for an investor one."
                  : "Use the email and password you sign in to TradeLocker with. A demo account has no separate password of its own. The server name is the broker shown on the TradeLocker login screen."}
              </p>
            </>
          )}

          <div
            className="flex items-center justify-between mb-4"
            style={{ padding: "12px 0", borderTop: `1px solid ${palette.border}` }}
          >
            <div>
              <div style={{ color: palette.text, fontSize: "14px", fontWeight: 600 }}>Auto-log new trades</div>
              <div className="text-xs" style={{ color: palette.textFaint }}>
                Add trades to your journal as soon as they close.
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={autoSync}
              onClick={() => setAutoSync((v) => !v)}
              style={{
                width: 44,
                height: 26,
                borderRadius: 999,
                border: "none",
                position: "relative",
                background: autoSync ? palette.gold : palette.border,
                transition: "background 150ms",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 3,
                  left: autoSync ? 21 : 3,
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: "#fff",
                  transition: "left 150ms",
                }}
              />
            </button>
          </div>

          <button
            type="button"
            onClick={submit}
            disabled={status === "connecting"}
            className={TAP}
            style={{
              width: "100%",
              background: palette.gold,
              color: "#fff",
              border: "none",
              borderRadius: "12px",
              padding: "12px 16px",
              fontSize: "14.5px",
              fontWeight: 700,
              opacity: status === "connecting" ? 0.7 : 1,
            }}
          >
            {status === "connecting" ? "Connecting\u2026" : `Connect ${platformLabel}`}
          </button>
          {msg && (
            <p className="text-xs mt-3" style={{ color: status === "error" ? palette.red : palette.textFaint }}>
              {msg}
            </p>
          )}
        </div>
      ) : (
        <div style={card}>
          <div className="flex items-center justify-between">
            <div>
              <div style={{ color: palette.text, fontSize: "15px", fontWeight: 700 }}>{connectedLabel}</div>
              <div className="text-xs" style={{ color: palette.textFaint }}>
                {[connection.accountName, connection.server, connection.env === "demo" ? "Demo" : "Live"].filter(Boolean).join(" \u00b7 ")}
              </div>
            </div>
            <button
              type="button"
              onClick={disconnect}
              className={TAP}
              style={{
                background: "transparent",
                color: palette.red,
                border: `1px solid ${palette.border}`,
                borderRadius: "10px",
                padding: "7px 12px",
                fontSize: "13px",
              }}
            >
              Disconnect
            </button>
          </div>

          <div
            className="flex items-center justify-between"
            style={{ padding: "12px 0", marginTop: 14, borderTop: `1px solid ${palette.border}` }}
          >
            <div>
              <div style={{ color: palette.text, fontSize: "14px", fontWeight: 600 }}>Auto-log new trades</div>
              <div className="text-xs" style={{ color: palette.textFaint }}>
                Checks for closed trades every 30 seconds (90 for other brokers) while the app is open.
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={!!autoSyncProp}
              onClick={() => onAutoSyncChange && onAutoSyncChange(!autoSyncProp)}
              style={{
                width: 44,
                height: 26,
                borderRadius: 999,
                border: "none",
                position: "relative",
                background: autoSyncProp ? palette.gold : palette.border,
                transition: "background 150ms",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 3,
                  left: autoSyncProp ? 21 : 3,
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: "#fff",
                  transition: "left 150ms",
                }}
              />
            </button>
          </div>
          <button
            type="button"
            onClick={() => onSync && onSync()}
            disabled={sync.syncing}
            className={TAP}
            style={{
              width: "100%",
              background: "transparent",
              color: palette.text,
              border: `1px solid ${palette.border}`,
              borderRadius: "12px",
              padding: "10px 16px",
              fontSize: "14px",
              fontWeight: 600,
              opacity: sync.syncing ? 0.6 : 1,
            }}
          >
            {sync.syncing ? "Syncing\u2026" : "Sync now"}
          </button>
          {connection.platform === "mt5" && (
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${palette.border}` }}>
              {(() => {
                const seen = connection.eaSeenAt || 0;
                const ago = seen ? Date.now() - seen : null;
                const live = ago !== null && ago < 90000;
                const dot = live ? palette.green : ago !== null ? palette.gold : palette.red;
                const text = live
                  ? `Add-on connected${connection.eaAccount ? ` \u00b7 account ${connection.eaAccount}` : ""}`
                  : ago !== null
                  ? `Add-on stopped sending (last heard ${Math.max(1, Math.round(ago / 60000))} min ago). Check that MT5 is open and the add-on is on the chart.`
                  : "Waiting for the add-on. Nothing has been received yet, so no trades can sync.";
                return (
                  <div className="flex items-center" style={{ gap: 8, marginBottom: 12 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 999, background: dot, flexShrink: 0 }} />
                    <span className="text-xs" style={{ color: palette.textMuted, lineHeight: 1.5 }}>{text}</span>
                  </div>
                );
              })()}
              <div style={{ color: palette.text, fontSize: "14px", fontWeight: 600, marginBottom: 8 }}>Set up the MT5 add-on</div>
              {setup ? (
                <>
                  <span style={label}>Sync key</span>
                  <div className="flex items-center gap-2 mb-3">
                    <code style={{ ...field, fontFamily: "monospace", fontSize: "12.5px", wordBreak: "break-all", flex: 1 }}>{setup.key}</code>
                    <button type="button" onClick={() => copyText(setup.key, "key")} className={TAP} style={ghostBtn}>
                      {copied === "key" ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <p className="text-xs mb-3" style={{ color: palette.textFaint }}>
                    This key is shown only now. Download the file below, which already contains it.
                  </p>
                </>
              ) : (
                <p className="text-xs mb-3" style={{ color: palette.textFaint }}>
                  Your key was shown when you created it and isn&apos;t kept anywhere readable. If you lost it, create a new one below. The old key stops working.
                </p>
              )}
              <ol className="text-xs mb-3" style={{ color: palette.textMuted, lineHeight: 1.7, paddingLeft: 18, listStyle: "decimal" }}>
                <li>Download the add-on file{setup ? "" : " (after creating a new key)"}.</li>
                <li>In MetaTrader 5 choose File, then Open Data Folder, open MQL5, then Experts, and put the file there. In the Navigator, right-click Expert Advisors and press Refresh.</li>
                <li>
                  Go to Tools, Options, Expert Advisors. Tick &quot;Allow WebRequest for listed URL&quot; and add{" "}
                  <b style={{ wordBreak: "break-all" }}>{setup ? originOf(setup.url) : "your Tredzi server address"}</b>.
                </li>
                <li>Drag TredziSync from the Navigator onto any chart, and make sure Algo Trading is switched on.</li>
                <li>Top-left of the chart shows &quot;Tredzi sync: connected&quot;. If it says BLOCKED, redo the WebRequest step. Then open a trade, it appears in Active trade within about 10 seconds.</li>
              </ol>
              <div className="flex flex-wrap gap-2">
                {setup && (
                  <button type="button" onClick={downloadEa} className={TAP} style={{ ...ghostBtn, color: palette.text, fontWeight: 600 }}>
                    Download add-on file
                  </button>
                )}
                <button type="button" onClick={newKey} disabled={status === "connecting"} className={TAP} style={ghostBtn}>
                  {status === "connecting" ? "Creating\u2026" : "New sync key"}
                </button>
              </div>
              {msg && (
                <p className="text-xs mt-3" style={{ color: status === "error" ? palette.red : palette.textFaint }}>
                  {msg}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Synced trades */}
      <div style={card}>
        <span style={label}>Synced trades</span>
        <p className="text-xs" style={{ color: palette.textFaint }}>
          {!connected
            ? "Nothing synced yet. Connect an account to start."
            : sync.message
            ? sync.message
            : `Last checked ${when(sync.lastSync || connection.lastSync)}. New closed trades appear in your journal.`}
        </p>
      </div>

      <p className="text-xs" style={{ color: palette.textFaint }}>
        Syncing only reads your trade history. Your password is never stored in the browser.
      </p>
    </div>
  );
}
