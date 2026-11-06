// Edit profile sheet — ported from tredzi2.html's EP(): profile photo, display name, role line,
// bio, trading style chips, markets chips, and a "Save profile" footer.
// Goes in src/components/EditProfileSheet.jsx
import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Avatar } from "./ui.jsx";
import { TAP, palette, sans } from "../lib/theme.js";

const STYLE_OPTIONS = ["Scalper", "Day trader", "Swing", "Position"];
const MARKET_OPTIONS = ["FX", "Indices", "Gold", "Crypto", "Stocks"];

export default function EditProfileSheet({
  open, onClose, username, avatarSrc, avatarUploading, onAvatarFile, onRemoveAvatar,
  role, bio, styles, markets, saving, error, onSave,
}) {
  const [name, setName] = useState("");
  const [roleLine, setRoleLine] = useState("");
  const [bioText, setBioText] = useState("");
  const [sty, setSty] = useState([]);
  const [mk, setMk] = useState([]);

  // Re-seed the form each time the sheet opens
  useEffect(() => {
    if (!open) return;
    setName(username || "");
    setRoleLine(role || "");
    setBioText(bio || "");
    setSty(Array.isArray(styles) ? styles : []);
    setMk(Array.isArray(markets) ? markets : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const toggle = (list, setList, v) => setList(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const lb = (left, right) => (
    <div className="flex items-center justify-between" style={{ fontFamily: sans, fontSize: "12px", color: palette.textMuted, margin: "22px 0 8px" }}>
      <span>{left}</span>{right && <span>{right}</span>}
    </div>
  );
  const fieldLabel = { display: "block", fontFamily: sans, fontSize: "12px", color: palette.textMuted, marginTop: "12px" };
  const input = { display: "block", width: "100%", minHeight: "44px", marginTop: "4px", padding: "10px 12px", borderRadius: "12px", background: palette.surface, border: `1px solid ${palette.border}`, color: palette.text, fontFamily: sans, fontSize: "14px", outline: "none" };
  const chip = (label, on, onClick) => (
    <button
      key={label}
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={TAP}
      style={{
        padding: "8px 14px", minHeight: "40px", margin: "0 8px 8px 0", borderRadius: "10px",
        fontFamily: sans, fontSize: "13px", fontWeight: 500, display: "flex", alignItems: "center",
        background: on ? palette.text : palette.surface,
        color: on ? palette.bg : palette.textMuted,
        border: `1px solid ${on ? palette.text : palette.border}`,
      }}
    >
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: palette.bg, zIndex: 140 }} role="dialog" aria-label="Edit profile">
      <div
        className="flex items-center gap-3 flex-shrink-0"
        style={{ padding: "12px 16px", paddingTop: "max(12px, env(safe-area-inset-top))", background: palette.surface, borderBottom: `1px solid ${palette.border}` }}
      >
        <button
          type="button"
          onClick={onClose}
          className={`flex items-center justify-center flex-shrink-0 ${TAP}`}
          style={{ width: "44px", height: "44px", borderRadius: "12px", background: `${palette.gold}16`, border: `1px solid ${palette.gold}55`, color: palette.gold }}
          aria-label="Back"
        >
          <ChevronLeft size={22} strokeWidth={2.2} />
        </button>
        <h1 style={{ margin: 0, flex: 1, fontFamily: sans, fontSize: "22px", fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.2, color: palette.text }}>Edit profile</h1>
      </div>

      <div className="flex-1" style={{ overflowY: "auto", minHeight: 0 }}>
        <div className="mx-auto w-full" style={{ maxWidth: "560px", padding: "0 16px 16px" }}>
          {lb("Profile photo")}
          <div className="flex items-center" style={{ gap: "14px", marginBottom: "8px" }}>
            <Avatar name={username || "?"} size={64} src={avatarSrc} />
            <label
              className={TAP}
              style={{ padding: "8px 14px", minHeight: "40px", display: "flex", alignItems: "center", borderRadius: "10px", cursor: avatarUploading ? "default" : "pointer", fontFamily: sans, fontSize: "13px", fontWeight: 500, background: palette.text, color: palette.bg, border: `1px solid ${palette.text}`, opacity: avatarUploading ? 0.6 : 1 }}
            >
              {avatarUploading ? "Uploading…" : avatarSrc ? "Change photo" : "Add photo"}
              <input type="file" accept="image/*" disabled={avatarUploading} onChange={onAvatarFile} style={{ display: "none" }} />
            </label>
            {avatarSrc && onRemoveAvatar && (
              <button type="button" onClick={onRemoveAvatar} disabled={avatarUploading} className={TAP} style={{ minHeight: "40px", padding: "0 8px", fontFamily: sans, fontSize: "13px", fontWeight: 500, color: palette.red }}>
                Remove
              </button>
            )}
          </div>

          <label style={fieldLabel}>Display name
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={24} style={input} />
          </label>
          <label style={fieldLabel}>Role line
            <input value={roleLine} onChange={(e) => setRoleLine(e.target.value.slice(0, 60))} placeholder="e.g. Day trader, NY session" style={input} />
          </label>
          <label style={fieldLabel}>Bio
            <textarea value={bioText} onChange={(e) => setBioText(e.target.value.slice(0, 160))} rows={3} placeholder="Tell people what you trade and how you think about risk…" style={{ ...input, resize: "none", lineHeight: 1.45 }} />
          </label>

          {lb("Trading style", "Pick any")}
          <div className="flex flex-wrap">{STYLE_OPTIONS.map((x) => chip(x, sty.includes(x), () => toggle(sty, setSty, x)))}</div>
          {lb("Markets", "Pick any")}
          <div className="flex flex-wrap">{MARKET_OPTIONS.map((x) => chip(x, mk.includes(x), () => toggle(mk, setMk, x)))}</div>

          {error && <p style={{ marginTop: "8px", fontFamily: sans, fontSize: "12px", color: palette.red }}>{error}</p>}
        </div>
      </div>

      <div className="flex-shrink-0" style={{ padding: "12px 16px", paddingBottom: "max(12px, env(safe-area-inset-bottom))", borderTop: `1px solid ${palette.border}`, background: palette.bg }}>
        <div className="mx-auto w-full" style={{ maxWidth: "560px" }}>
          <button
            type="button"
            disabled={saving || !name.trim()}
            onClick={() => onSave({ username: name.trim(), role: roleLine.trim(), bio: bioText, style: sty, markets: mk })}
            className={`w-full ${TAP}`}
            style={{ height: "48px", borderRadius: "12px", fontFamily: sans, fontSize: "14px", fontWeight: 600, textAlign: "center", background: palette.gold, color: palette.letterbox, opacity: saving || !name.trim() ? 0.6 : 1 }}
          >
            {saving ? "Saving…" : "Save profile"}
          </button>
        </div>
      </div>
    </div>
  );
}
