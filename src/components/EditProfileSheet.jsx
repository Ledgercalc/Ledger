import { useEffect, useRef, useState } from "react";
import { palette, sans } from "../lib/theme.js";

// Edit profile: photo, username, Bio (the short line), Description (the longer text),
// trading style, markets and main session. onSave gets { username, role, bio, style, markets, session }.

const STYLES = ["Scalper", "Day trader", "Swing", "Position"];
const MARKETS = ["FX", "Indices", "Gold", "Crypto", "Stocks"];
const SESSIONS = ["Asia", "London", "New York"];

export default function EditProfileSheet({ open, onClose, username, avatarSrc, avatarUploading, onAvatarFile, onRemoveAvatar, role, bio, styles, markets, mainSession, saving, error, onSave }) {
  const [name, setName] = useState("");
  const [line, setLine] = useState("");
  const [desc, setDesc] = useState("");
  const [st, setSt] = useState([]);
  const [mk, setMk] = useState([]);
  const [ses, setSes] = useState("");
  const photo = useRef(null);

  useEffect(() => {
    if (!open) return;
    setName(username || "");
    setLine(role || "");
    setDesc(bio || "");
    setSt(Array.isArray(styles) ? styles : []);
    setMk(Array.isArray(markets) ? markets : []);
    setSes(mainSession || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 900;
  const line1 = `1px solid ${palette.border}`;
  const toggle = (arr, setArr, v) => setArr(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const chip = (on) => ({
    minHeight: "38px", padding: "0 14px", borderRadius: "10px", fontSize: "13px", fontWeight: 500, margin: "0 8px 8px 0", cursor: "pointer",
    border: `1px solid ${on ? palette.gold : palette.border}`, background: on ? palette.gold : palette.surface, color: on ? palette.letterbox : palette.textMuted,
  });
  const input = { width: "100%", boxSizing: "border-box", border: line1, background: palette.field, color: palette.text, borderRadius: "12px", padding: "11px 12px", fontFamily: sans, fontSize: "14px", marginTop: "6px", display: "block" };
  const lab = { display: "block", fontSize: "12px", color: palette.textMuted, marginTop: "16px", fontFamily: sans };
  const sec = (left, right) => (
    <div style={{ display: "flex", justifyContent: "space-between", margin: "22px 0 8px", fontSize: "12.5px", color: palette.textMuted, fontFamily: sans }}><span>{left}</span><span>{right}</span></div>
  );

  const save = () => {
    if (saving) return;
    onSave({ username: name.trim(), role: line.trim(), bio: desc.trim(), style: st, markets: mk, session: ses });
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(5,7,12,0.6)", display: "flex", alignItems: isDesktop ? "center" : "flex-end", justifyContent: "center", padding: isDesktop ? "16px" : 0 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: "520px", height: isDesktop ? "min(88vh, 780px)" : "94vh", display: "flex", flexDirection: "column", background: palette.bg, border: line1, borderRadius: isDesktop ? "22px" : "22px 22px 0 0", overflow: "hidden", boxShadow: palette.shadow, fontFamily: sans, color: palette.text }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "16px 16px 12px", borderBottom: line1 }}>
          <button type="button" onClick={onClose} aria-label="Close" style={{ width: "40px", height: "40px", borderRadius: "12px", border: line1, background: palette.surface, color: palette.text, fontSize: "18px", cursor: "pointer" }}>×</button>
          <div style={{ flex: 1, fontSize: "17px", fontWeight: 600 }}>Edit profile</div>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "4px 16px 18px" }}>
          {sec("Profile photo", "")}
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <span style={{ width: "64px", height: "64px", borderRadius: "50%", background: palette.field, color: palette.gold, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", fontWeight: 600, overflow: "hidden", flex: "none" }}>
              {avatarSrc ? <img src={avatarSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : String(username || "?").slice(0, 2).toUpperCase()}
            </span>
            <input ref={photo} type="file" accept="image/*" onChange={onAvatarFile} disabled={avatarUploading} style={{ display: "none" }} />
            <button type="button" onClick={() => photo.current && photo.current.click()} disabled={avatarUploading} style={{ ...chip(true), margin: 0 }}>{avatarUploading ? "Uploading…" : avatarSrc ? "Change photo" : "Add photo"}</button>
            {avatarSrc && !avatarUploading && <button type="button" onClick={onRemoveAvatar} style={{ background: "none", border: "none", color: palette.textMuted, fontSize: "13px", minHeight: "40px", padding: "0 8px", cursor: "pointer" }}>Remove</button>}
          </div>

          <label style={lab}>Username
            <input value={name} onChange={(e) => setName(e.target.value.replace(/\s/g, ""))} maxLength={24} autoCapitalize="off" autoComplete="off" style={input} />
          </label>
          <label style={lab}>Bio
            <input value={line} onChange={(e) => setLine(e.target.value)} maxLength={60} placeholder="Gold and FX pullbacks" style={input} />
          </label>
          <label style={lab}>Description
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={4} maxLength={200} placeholder="What you trade and how you think about risk" style={{ ...input, resize: "none", lineHeight: 1.5 }} />
          </label>

          {sec("Trading style", "Pick any")}
          <div style={{ display: "flex", flexWrap: "wrap" }}>{STYLES.map((x) => <button key={x} type="button" onClick={() => toggle(st, setSt, x)} style={chip(st.includes(x))}>{x}</button>)}</div>

          {sec("Markets", "Pick any")}
          <div style={{ display: "flex", flexWrap: "wrap" }}>{MARKETS.map((x) => <button key={x} type="button" onClick={() => toggle(mk, setMk, x)} style={chip(mk.includes(x))}>{x}</button>)}</div>

          {sec("Main session", "Shown on your profile")}
          <div style={{ display: "flex", flexWrap: "wrap" }}>{SESSIONS.map((x) => <button key={x} type="button" aria-pressed={ses === x} onClick={() => setSes(ses === x ? "" : x)} style={chip(ses === x)}>{x}</button>)}</div>

          {error && <p role="alert" style={{ color: palette.red, fontSize: "13px", margin: "12px 0 0" }}>{error}</p>}
        </div>

        <div style={{ padding: "12px 16px calc(14px + env(safe-area-inset-bottom, 0px))", borderTop: line1 }}>
          <button type="button" onClick={save} disabled={saving} style={{ width: "100%", height: "48px", borderRadius: "12px", border: "none", background: palette.gold, color: palette.letterbox, fontSize: "14.5px", fontWeight: 700, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving…" : "Save profile"}
          </button>
        </div>
      </div>
    </div>
  );
}
