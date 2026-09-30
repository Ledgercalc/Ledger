import { useState } from "react";
import { ChevronDown, Link2, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { TAP, THEME_TRANSITION, mono, palette } from "../lib/theme.js";

const fieldStyle = {
  background: palette.field,
  border: `1px solid ${palette.border}`,
  color: palette.text,
  fontFamily: mono,
  fontSize: "13px",
  transition: THEME_TRANSITION,
};

export default function BrokerConnect({ broker }) {
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState("mt5");
  const [server, setServer] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [confirmRemoveId, setConfirmRemoveId] = useState(null);

  if (!broker) return null;
  const { signedIn, connections, connecting, syncingId, message, connect, syncNow, disconnect } = broker;

  const canSubmit = signedIn && !connecting && server.trim() && /^\d{3,12}$/.test(login.trim()) && password;

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    const r = await connect({ platform, server: server.trim(), login: login.trim(), password });
    if (r.ok) {
      setPassword("");
      setServer("");
      setLogin("");
    }
  };

  const msgColor = message?.kind === "error" ? palette.red : message?.kind === "ok" ? palette.green : palette.textMuted;

  return (
    <div
      className="w-full rounded-lg mb-2"
      style={{ background: palette.field, border: `1px solid ${palette.border}`, transition: THEME_TRANSITION }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between gap-2 px-4 py-3 ${TAP}`}
        style={{ background: "transparent", color: palette.text, fontFamily: mono, fontSize: "13px", fontWeight: 600 }}
      >
        <span className="flex items-center gap-2">
          <Link2 size={16} color={palette.gold} />
          Broker sync (MT5 / MT4)
          {connections.length > 0 && (
            <span style={{ color: palette.green, fontSize: "11px" }}>{connections.length} connected</span>
          )}
        </span>
        <ChevronDown
          size={16}
          color={palette.textFaint}
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s ease" }}
        />
      </button>

      {open && (
        <div className="px-4 pb-4">
          {!signedIn ? (
            <p style={{ color: palette.textMuted, fontFamily: mono, fontSize: "12px", lineHeight: 1.5 }}>
              Sign in to your Tredzi account (Community tab) to connect a broker. Your trades sync automatically once connected.
            </p>
          ) : (
            <>
              {connections.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-2 rounded-md px-3 py-2 mb-2"
                  style={{ background: palette.surface, border: `1px solid ${palette.border}` }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: palette.text, fontFamily: mono, fontSize: "13px", fontWeight: 600 }}>
                      {c.platform.toUpperCase()} · {c.login}
                    </div>
                    <div
                      style={{
                        color: palette.textFaint,
                        fontFamily: mono,
                        fontSize: "11px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {c.server}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => syncNow(c)}
                      disabled={syncingId === c.id}
                      aria-label="Sync now"
                      className={`flex items-center gap-1 rounded-md px-2 py-1 ${TAP}`}
                      style={{ border: `1px solid ${palette.gold}88`, color: palette.gold, fontFamily: mono, fontSize: "11px", background: "transparent" }}
                    >
                      <RefreshCw size={12} className={syncingId === c.id ? "animate-spin" : ""} />
                      {syncingId === c.id ? "Syncing" : "Sync"}
                    </button>
                    {confirmRemoveId === c.id ? (
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmRemoveId(null);
                          disconnect(c);
                        }}
                        className={`rounded-md px-2 py-1 ${TAP}`}
                        style={{ border: `1px solid ${palette.red}`, color: palette.red, fontFamily: mono, fontSize: "11px", background: "transparent" }}
                      >
                        Confirm
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmRemoveId(c.id)}
                        aria-label="Disconnect broker"
                        className={`rounded-md p-1 ${TAP}`}
                        style={{ color: palette.textFaint, background: "transparent" }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              <form onSubmit={submit} className="flex flex-col gap-2 mt-1" autoComplete="off">
                <div className="flex gap-2">
                  {["mt5", "mt4"].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPlatform(p)}
                      className={`flex-1 rounded-md py-2 ${TAP}`}
                      style={{
                        background: platform === p ? palette.gold : "transparent",
                        color: platform === p ? palette.letterbox : palette.textMuted,
                        border: `1px solid ${platform === p ? palette.gold : palette.border}`,
                        fontFamily: mono,
                        fontSize: "12px",
                        fontWeight: 600,
                      }}
                    >
                      {p.toUpperCase()}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={server}
                  onChange={(e) => setServer(e.target.value)}
                  placeholder="Server (e.g. ICMarketsSC-Demo)"
                  maxLength={64}
                  autoCapitalize="off"
                  autoCorrect="off"
                  className="w-full rounded-md px-3 py-2"
                  style={fieldStyle}
                />
                <input
                  type="text"
                  inputMode="numeric"
                  value={login}
                  onChange={(e) => setLogin(e.target.value.replace(/\D/g, ""))}
                  placeholder="Account number (login)"
                  maxLength={12}
                  className="w-full rounded-md px-3 py-2"
                  style={fieldStyle}
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Investor (read-only) password"
                  maxLength={128}
                  autoComplete="new-password"
                  className="w-full rounded-md px-3 py-2"
                  style={fieldStyle}
                />
                <p
                  className="flex gap-2"
                  style={{ color: palette.textFaint, fontFamily: mono, fontSize: "11px", lineHeight: 1.5 }}
                >
                  <ShieldCheck size={14} style={{ flexShrink: 0, marginTop: 1 }} color={palette.green} />
                  Use your investor password, not your trading password. It can only view history, never place or close trades. Tredzi doesn't store it.
                </p>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className={`w-full flex items-center justify-center gap-2 rounded-lg py-3 ${TAP}`}
                  style={{
                    background: canSubmit ? palette.gold : "transparent",
                    color: canSubmit ? palette.letterbox : palette.textFaint,
                    border: `1px solid ${canSubmit ? palette.gold : palette.border}`,
                    fontFamily: mono,
                    fontSize: "13px",
                    fontWeight: 600,
                    opacity: connecting ? 0.7 : 1,
                  }}
                >
                  <Link2 size={16} />
                  {connecting ? "Connecting..." : "Connect broker"}
                </button>
              </form>
            </>
          )}

          {message && (
            <p style={{ color: msgColor, fontFamily: mono, fontSize: "12px", lineHeight: 1.5, marginTop: 8 }}>{message.text}</p>
          )}
        </div>
      )}
    </div>
  );
}
