import { TAP, display, palette } from "../lib/theme.js";
import { useState } from "react";

// Broker connection screen (TradeLocker, Match-Trader). Connect calls the optional `onConnect`
// prop, and shows a "not switched on yet" message until a backend handler is passed in.
export default function BrokerTab({ onConnect, onDisconnect, onSync, onAutoSyncChange, connection, syncInfo, autoSync: autoSyncProp }) {
  const PLATFORMS = [
    { id: "tradelocker", label: "TradeLocker", ready: true },
    { id: "mt5", label: "MetaTrader 5", ready: false },
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
  const platformLabel = isMT ? "Match-Trader" : "TradeLocker";
  const connectedLabel = connection && connection.platform === "matchtrader" ? "Match-Trader" : "TradeLocker";
  const connected = !!(connection && connection.connected);
  const sync = syncInfo || {};

  const submit = async () => {
    if (!email.trim() || !password || (isMT ? !brokerId.trim() || !platformUrl.trim() : !server.trim())) {
      setStatus("error");
      setMsg(isMT ? "Enter your email, password, Broker ID and platform web address." : "Enter your email, password and server name.");
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
      await onConnect({ platform, env, email: email.trim(), password, server: server.trim(), brokerId: brokerId.trim(), platformUrl: platformUrl.trim(), autoSync });
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
                onClick={() => p.ready && setPlatform(p.id)}
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
              </button>
            );
          })}
        </div>
      </div>

      {/* Connection form / connected state */}
      {!connected ? (
        <div style={card}>
          {!isMT && (
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

          <label style={label}>Email</label>
          <input
            style={{ ...field, marginBottom: 14 }}
            type="email"
            autoComplete="off"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label style={label}>Password</label>
          <div style={{ position: "relative", marginBottom: 14 }}>
            <input
              style={{ ...field, paddingRight: 64 }}
              type={showPw ? "text" : "password"}
              autoComplete="new-password"
              placeholder={`${platformLabel} password`}
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
              <label style={label}>Broker ID</label>
              <input
                style={{ ...field, marginBottom: 14 }}
                autoComplete="off"
                placeholder="From your broker or prop firm"
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
                Use the email and password you sign in to Match-Trader with. The web address is the page you open to log in to your
                broker or prop firm&apos;s Match-Trader. Ask them for the Broker ID if you don&apos;t have it, and check that API access is switched
                on for your account.
              </p>
            </>
          ) : (
            <>
              <label style={label}>Server name</label>
              <input
                style={field}
                autoComplete="off"
                placeholder="e.g. your broker or prop firm's server"
                value={server}
                onChange={(e) => setServer(e.target.value)}
              />
              <p className="text-xs mt-2 mb-4" style={{ color: palette.textFaint }}>
                Use the email and password you sign in to TradeLocker with. A demo account has no separate password of its own.
                The server name is the broker shown on the TradeLocker login screen.
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
                Checks for closed trades about every 90 seconds while the app is open.
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
