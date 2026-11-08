import { useRef, useState } from "react";
import { palette, sans } from "../lib/theme.js";
import { BOARDS, POST_MAX, decodePost, encodePost, shrinkImage, tradeMeta } from "../lib/ledgerPost.js";

// The one post composer used everywhere: Community > Feed and Profile > Add a post.
// It builds the post text itself (board, title, details, optional journaled trade) and hands
// { text, image } to onSubmit. onSubmit may be async and should throw to show an error.
//
// Props: username, avatar, trades (journal trades, optional), onSubmit({text,image}), onClose()

const BCOL = { Setups: palette.green, Reviews: palette.gold, Psychology: "#8B7CF6", Risk: palette.red, General: palette.textMuted };

const when = (ts) => { try { return new Date(ts).toLocaleDateString(undefined, { day: "numeric", month: "short" }); } catch (e) { return ""; } };

// How a Ledger post looks wherever it is shown outside the Community feed
// (profile posts list and the post viewer): board tag, title, trade box, details, photo.

export const BOARD_COLOR = { Setups: palette.green, Reviews: palette.gold, Psychology: "#8B7CF6", Risk: palette.red, General: palette.textMuted };

export function BoardTag({ board }) {
  const c = BOARD_COLOR[board] || palette.textMuted;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 10px", borderRadius: "999px", background: `${c}22`, color: palette.text, fontFamily: sans, fontSize: "12px", fontWeight: 500 }}>
      <i style={{ width: "8px", height: "8px", borderRadius: "50%", background: c, display: "inline-block" }} />{board}
    </span>
  );
}

export function TradeLine({ t }) {
  const oc = t.o === "Win" ? palette.green : t.o === "Loss" ? palette.red : palette.textMuted;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginTop: "10px", padding: "9px 12px", border: `1px solid ${palette.border}`, borderRadius: "12px", background: palette.field, fontFamily: sans, fontSize: "13px", color: palette.text }}>
      <b>{t.s}</b>
      <span style={{ color: t.d > 0 ? palette.green : palette.red, fontWeight: 600 }}>{t.d > 0 ? "Long" : "Short"}</span>
      <b style={{ color: oc }}>{t.o}</b>
      {t.u ? <span style={{ color: palette.textMuted }}>{t.u} setup</span> : null}
      {t.n ? <span style={{ color: palette.textMuted }}>{t.n}</span> : null}
    </div>
  );
}

// text: the raw stored post text. clamp: cut long details (list view). image: show the photo too.
export function PostContent({ text, image, clamp, titleSize = 17 }) {
  const d = decodePost(text);
  return (
    <div style={{ fontFamily: sans, color: palette.text }}>
      <div><BoardTag board={d.board} /></div>
      {d.title ? <div style={{ fontSize: `${titleSize}px`, fontWeight: 600, lineHeight: 1.3, marginTop: "10px", letterSpacing: "-0.005em", wordBreak: "break-word" }}>{d.title}</div> : null}
      {d.trade ? <TradeLine t={d.trade} /> : null}
      {d.note ? (
        <div style={{ fontSize: "14px", lineHeight: 1.5, marginTop: "8px", color: d.title ? palette.textMuted : palette.text, whiteSpace: "pre-wrap", wordBreak: "break-word", ...(clamp ? { display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" } : {}) }}>{d.note}</div>
      ) : null}
      {image ? <img src={image} alt="" style={{ display: "block", width: "100%", maxHeight: "360px", objectFit: "cover", borderRadius: "12px", marginTop: "10px", border: `1px solid ${palette.border}` }} /> : null}
    </div>
  );
}

export const HelpfulIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 15l6-6 6 6" /></svg>
);

export default function PostComposer({ username, avatar, trades, onSubmit, onClose }) {
  const [board, setBoard] = useState("Setups");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [image, setImage] = useState(null);
  const [trade, setTrade] = useState(null);
  const [pick, setPick] = useState(false);
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [err, setErr] = useState("");
  const file = useRef(null);

  const list = (Array.isArray(trades) ? trades : []).filter((t) => t && t.pair).slice().sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, 15);
  const text = encodePost({ board, title, note, trade });
  const canPost = !busy && !photoBusy && (title.trim() || note.trim() || image || trade);

  const onFile = async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    setPhotoBusy(true); setErr("");
    try { setImage(await shrinkImage(f, 800)); } catch (x) { setErr(x.message || "Couldn't attach that photo."); }
    setPhotoBusy(false);
  };
  const submit = async () => {
    if (!canPost) return;
    setBusy(true); setErr("");
    try { await onSubmit({ text, image }); } catch (x) { setErr((x && x.message) || "Couldn't post. Try again."); setBusy(false); return; }
    setBusy(false);
  };

  const line = `1px solid ${palette.border}`;
  const chip = (on, c) => ({
    padding: "8px 14px", borderRadius: 10, border: `1px solid ${on ? c : palette.border}`, fontSize: 13, fontWeight: 500, minHeight: 38,
    background: on ? c : palette.surface, color: on ? palette.letterbox : palette.textMuted, cursor: "pointer", margin: "0 8px 8px 0",
  });
  const input = { width: "100%", boxSizing: "border-box", border: line, background: palette.surface, color: palette.text, borderRadius: 12, padding: "11px 12px", fontFamily: sans, fontSize: 14, marginTop: 4, display: "block" };
  const label = { display: "block", fontSize: 12, color: palette.textMuted, marginTop: 14 };

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, fontFamily: sans, color: palette.text, background: palette.bg }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 16px 10px", borderBottom: line }}>
        <button type="button" onClick={() => { if (!busy) onClose(); }} aria-label="Close" style={{ width: 40, height: 40, borderRadius: 12, border: line, background: palette.surface, color: palette.text, fontSize: 18, cursor: "pointer" }}>×</button>
        <div style={{ flex: 1, fontSize: 17, fontWeight: 600 }}>New post</div>
        <button type="button" onClick={submit} disabled={!canPost} style={{ height: 40, padding: "0 20px", borderRadius: 12, border: 0, background: canPost ? palette.gold : palette.field, color: canPost ? palette.letterbox : palette.textFaint, fontWeight: 700, fontSize: 14, cursor: canPost ? "pointer" : "default" }}>
          {busy ? "Posting…" : "Post"}
        </button>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "4px 16px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "12px 0 0" }}>
          <span style={{ width: 34, height: 34, borderRadius: "50%", background: palette.field, color: palette.gold, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, overflow: "hidden" }}>
            {avatar ? <img src={avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : String(username || "?").slice(0, 2).toUpperCase()}
          </span>
          <b style={{ fontSize: 14 }}>{username || "You"}</b>
        </div>

        <div style={{ ...label, marginTop: 16 }}>Board</div>
        <div style={{ display: "flex", flexWrap: "wrap", marginTop: 6 }}>
          {BOARDS.map((b) => <button key={b} type="button" onClick={() => setBoard(b)} style={chip(board === b, BCOL[b])}>{b}</button>)}
        </div>

        <label style={label}>Title
          <input style={input} placeholder="Do you cut size after a big win?" maxLength={90} value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label style={label}>Details, optional
          <textarea style={{ ...input, resize: "none" }} rows={5} placeholder="Keep it about process." value={note} onChange={(e) => setNote(e.target.value.slice(0, 900))} />
        </label>

        {image ? (
          <div style={{ position: "relative", marginTop: 14, borderRadius: 12, overflow: "hidden", border: line, background: palette.letterbox }}>
            <img src={image} alt="" style={{ display: "block", width: "100%", maxHeight: 280, objectFit: "contain" }} />
            <button type="button" onClick={() => setImage(null)} aria-label="Remove photo" style={{ position: "absolute", top: 8, right: 8, width: 30, height: 30, borderRadius: "50%", border: 0, background: "rgba(0,0,0,.65)", color: "#fff", cursor: "pointer" }}>×</button>
          </div>
        ) : null}

        {trade ? (
          <div style={{ marginTop: 14, padding: "10px 12px", border: line, borderRadius: 12, background: palette.surface, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <span style={{ fontSize: 13 }}><b>{trade.s}</b> {trade.d > 0 ? "Long" : "Short"} · {trade.o}{trade.u ? ` · ${trade.u}` : ""}</span>
            <button type="button" onClick={() => setTrade(null)} style={{ border: 0, background: "none", color: palette.textMuted, cursor: "pointer", fontSize: 13 }}>Remove</button>
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          <input ref={file} type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />
          <button type="button" onClick={() => file.current && file.current.click()} disabled={photoBusy} style={{ ...chip(false, palette.border), margin: 0, display: "inline-flex", alignItems: "center", gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
            {photoBusy ? "Adding photo…" : image ? "Change photo" : "Add photo"}
          </button>
          {!trade && (
            <button type="button" onClick={() => { if (!list.length) { setErr("No journaled trades yet. Log a trade in your journal first."); return; } setErr(""); setPick((v) => !v); }} aria-expanded={pick} style={{ ...chip(pick, palette.gold), margin: 0, display: "inline-flex", alignItems: "center", gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l6-6 4 4 8-8" /><path d="M14 7h7v7" /></svg>
              Attach a trade
            </button>
          )}
        </div>

        {pick && !trade && (
          <div style={{ marginTop: 10, border: line, borderRadius: 12, background: palette.surface }}>
            <div style={{ fontSize: 12, color: palette.textMuted, padding: "10px 12px 2px" }}>Posts show the result (Win, Loss or BE), never dollar amounts.</div>
            {list.map((t) => {
              const m = tradeMeta(t);
              return (
                <button key={t.id} type="button" onClick={() => { setTrade(m); setPick(false); if (!title.trim()) setTitle(`${m.s} ${m.d > 0 ? "long" : "short"}, ${m.o}`.slice(0, 90)); }}
                  style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", border: 0, borderTop: line, background: "none", color: palette.text, cursor: "pointer", textAlign: "left", fontSize: 14 }}>
                  <span><b>{m.s}</b> {m.d > 0 ? "Long" : "Short"}<div style={{ fontSize: 12, color: palette.textMuted }}>{[m.u, when(t.ts)].filter(Boolean).join(", ")}</div></span>
                  <b style={{ color: m.o === "Win" ? palette.green : m.o === "Loss" ? palette.red : palette.textMuted }}>{m.o}</b>
                </button>
              );
            })}
          </div>
        )}

        <div style={{ fontSize: 11.5, color: palette.textFaint, marginTop: 12, textAlign: "right" }}>{text.length}/{POST_MAX}</div>
        {err && <p style={{ color: palette.red, fontSize: 13, margin: "6px 0 0" }}>{err}</p>}
      </div>
    </div>
  );
}
