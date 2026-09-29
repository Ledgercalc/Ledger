import { OnboardingTip } from "../components/onboarding.jsx";
import { Readout } from "../components/ui.jsx";
import { DEFAULT_NOTEPAD_FONT_SIZE } from "../lib/constants.js";
import { blocksText, countLines, countOccurrencesInBlocks, countWords, notePreview } from "../lib/notes.js";
import { TAP, THEME_TRANSITION, mono, palette } from "../lib/theme.js";
import { CalendarClock, ChevronLeft, Download, FileText, Minus, Plus, Search, Trash2, WrapText, X } from "lucide-react";

export default function NotepadTab(props) {
  const {
    activeNoteId,
    adjustNoteFontSize,
    closeNote,
    createNote,
    downloadNoteText,
    getNotepadBlockRef,
    insertDateTimeIntoNote,
    isDesktop,
    notepadFindOpen,
    notepadFindText,
    notepadLoaded,
    notepadMsg,
    notepadNotes,
    notepadReplaceText,
    notepadSearch,
    openNote,
    persistSettings,
    replaceAllInNote,
    requestDeleteNote,
    setNotepadFindOpen,
    setNotepadFindText,
    setNotepadMsg,
    setNotepadReplaceText,
    setNotepadSearch,
    settings,
    toggleNoteWordWrap,
    trackNotepadCursor,
    updateNote
  } = props;
  let body = null;
    const activeNote = activeNoteId ? notepadNotes.find((n) => n.id === activeNoteId) : null;

    if (!notepadLoaded) {
      body = (
        <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
          Loading notes\u2026
        </p>
      );
    } else if (!activeNote) {
      const query = notepadSearch.trim().toLowerCase();
      const visibleNotes = [...notepadNotes]
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .filter((n) => {
          if (!query) return true;
          return (
            (n.title || "").toLowerCase().includes(query) ||
            blocksText(n.blocks).toLowerCase().includes(query)
          );
        });

      body = (
        <>
          <OnboardingTip
            id="notepad-intro"
            text="Notes here are separate from your trade journal — good for quick thoughts, watchlists, or plans that aren't tied to one trade."
            settings={settings}
            persistSettings={persistSettings}
          />
          <Readout
            icon={FileText}
            eyebrow="Notepad"
            value={String(notepadNotes.length)}
            unit={notepadNotes.length === 1 ? "note" : "notes"}
            sub="Notes with word wrap, find & replace, and photos inline in the text."
          />

          <button
            type="button"
            onClick={createNote}
            className={`w-full flex items-center justify-center gap-2 rounded-lg py-3 mb-4 ${TAP}`}
            style={{
              background: palette.gold,
              color: palette.letterbox,
              fontFamily: mono,
              fontSize: "14px",
              fontWeight: 600,
              transition: `${THEME_TRANSITION}, transform 0.15s ease`,
            }}
          >
            <Plus size={16} />
            New Note
          </button>

          {notepadNotes.length > 0 && (
            <div
              className="flex items-center rounded-lg px-3 mb-4"
              style={{ background: palette.field, border: `1px solid ${palette.border}`, transition: THEME_TRANSITION }}
            >
              <Search size={14} style={{ color: palette.textFaint, flexShrink: 0 }} />
              <input
                type="text"
                value={notepadSearch}
                onChange={(e) => setNotepadSearch(e.target.value)}
                placeholder="Search notes"
                className="w-full bg-transparent py-3 px-2 outline-none"
                style={{ color: palette.text, fontSize: "14px" }}
              />
              {notepadSearch && (
                <button
                  type="button"
                  onClick={() => setNotepadSearch("")}
                  className={TAP}
                  style={{ color: palette.textFaint }}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )}

          {notepadNotes.length === 0 ? (
            <div
              className="rounded-2xl p-6 text-center"
              style={{ background: palette.surface, border: `1px dashed ${palette.border}` }}
            >
              <FileText size={22} style={{ color: palette.textFaint, margin: "0 auto 8px" }} />
              <p className="text-xs" style={{ color: palette.textFaint }}>
                No notes yet. Tap New Note to start writing.
              </p>
            </div>
          ) : visibleNotes.length === 0 ? (
            <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
              No notes match "{notepadSearch}".
            </p>
          ) : (
            <div className={isDesktop ? "grid grid-cols-2 gap-3" : "contents"}>
              {visibleNotes.map((n) => {
                const preview = notePreview(n.blocks);
                return (
                  <div
                    key={n.id}
                    onClick={() => openNote(n.id)}
                    className={isDesktop ? `rounded-lg px-5 py-4 mb-3 ${TAP}` : `rounded-lg px-3 py-3 mb-2 ${TAP}`}
                    style={{
                      background: palette.surface,
                      border: `1px solid ${palette.border}`,
                      boxShadow: palette.shadow,
                      cursor: "pointer",
                      transition: THEME_TRANSITION,
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0" style={{ marginRight: "8px" }}>
                        <div
                          className="flex items-center gap-1.5"
                          style={{ color: palette.text, fontSize: "14px", fontWeight: 600, marginBottom: "3px" }}
                        >
                          <span className="truncate">{n.title || "Untitled Note"}</span>
                        </div>
                        {preview && (
                          <div style={{ color: palette.textMuted, fontSize: "12px", marginBottom: "3px" }}>
                            {preview}
                          </div>
                        )}
                        <div style={{ color: palette.textFaint, fontSize: "10px", fontFamily: mono }}>
                          {new Date(n.updatedAt).toLocaleString()}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          requestDeleteNote(n.id);
                        }}
                        className={`flex-shrink-0 ${TAP}`}
                        style={{ color: palette.textFaint }}
                        aria-label={`Delete ${n.title || "Untitled Note"}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      );
    } else {
      const wordWrap = activeNote.wordWrap !== false;
      const fontSize = activeNote.fontSize || DEFAULT_NOTEPAD_FONT_SIZE;
      const blocks = activeNote.blocks;
      const findMatches = notepadFindText ? countOccurrencesInBlocks(blocks, notepadFindText) : 0;
      const bodyText = blocksText(blocks);

      const autoGrowBlock = (el) => {
        if (!el) return;
        el.style.height = "auto";
        el.style.height = `${el.scrollHeight}px`;
      };

      const updateBlockText = (blockId, text) => {
        updateNote(activeNote.id, {
          blocks: blocks.map((b) => (b.id === blockId ? { ...b, text } : b)),
        });
      };

      body = (
        <>
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={closeNote}
              className={`flex items-center gap-1 ${TAP}`}
              style={{ color: palette.textMuted, fontSize: "12px", fontFamily: mono }}
            >
              <ChevronLeft size={16} />
              Notes
            </button>
            <button
              type="button"
              onClick={() => requestDeleteNote(activeNote.id)}
              className={TAP}
              style={{ color: palette.textFaint }}
              aria-label="Delete note"
            >
              <Trash2 size={15} />
            </button>
          </div>

          <input
            type="text"
            value={activeNote.title}
            onChange={(e) => updateNote(activeNote.id, { title: e.target.value })}
            placeholder="Untitled Note"
            className="w-full bg-transparent outline-none mb-3"
            style={{ color: palette.text, fontFamily: mono, fontSize: "1.15rem", fontWeight: 700 }}
          />

          <div className="flex items-center gap-1.5 flex-wrap mb-2">
            <button
              type="button"
              onClick={() => toggleNoteWordWrap(activeNote)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${TAP}`}
              style={{
                background: wordWrap ? palette.gold : palette.field,
                color: wordWrap ? palette.letterbox : palette.textMuted,
                border: `1px solid ${wordWrap ? palette.gold : palette.border}`,
                fontSize: "11px",
                fontFamily: mono,
              }}
              title="Toggle word wrap"
            >
              <WrapText size={13} />
              Wrap
            </button>

            <div
              className="flex items-center rounded-lg overflow-hidden"
              style={{ border: `1px solid ${palette.border}` }}
            >
              <button
                type="button"
                onClick={() => adjustNoteFontSize(activeNote, -1)}
                className={TAP}
                style={{ color: palette.textMuted, padding: "6px 8px", background: palette.field }}
                aria-label="Decrease font size"
              >
                <Minus size={12} />
              </button>
              <span
                style={{
                  color: palette.text,
                  fontFamily: mono,
                  fontSize: "11px",
                  padding: "0 8px",
                  minWidth: "26px",
                  textAlign: "center",
                }}
              >
                {fontSize}
              </span>
              <button
                type="button"
                onClick={() => adjustNoteFontSize(activeNote, 1)}
                className={TAP}
                style={{ color: palette.textMuted, padding: "6px 8px", background: palette.field }}
                aria-label="Increase font size"
              >
                <Plus size={12} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => insertDateTimeIntoNote(activeNote)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${TAP}`}
              style={{ background: palette.field, color: palette.textMuted, border: `1px solid ${palette.border}`, fontSize: "11px", fontFamily: mono }}
              title="Insert date & time"
            >
              <CalendarClock size={13} />
              Date/Time
            </button>

            <button
              type="button"
              onClick={() => {
                setNotepadFindOpen((v) => !v);
                setNotepadMsg("");
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${TAP}`}
              style={{
                background: notepadFindOpen ? palette.gold : palette.field,
                color: notepadFindOpen ? palette.letterbox : palette.textMuted,
                border: `1px solid ${notepadFindOpen ? palette.gold : palette.border}`,
                fontSize: "11px",
                fontFamily: mono,
              }}
              title="Find & replace"
            >
              <Search size={13} />
              Find
            </button>
          </div>

          {notepadFindOpen && (
            <div
              className="rounded-lg p-3 mb-3"
              style={{ background: palette.field, border: `1px solid ${palette.border}` }}
            >
              <input
                type="text"
                value={notepadFindText}
                onChange={(e) => {
                  setNotepadFindText(e.target.value);
                  setNotepadMsg("");
                }}
                placeholder="Find"
                className="w-full rounded-lg px-3 py-2 mb-2 bg-transparent outline-none"
                style={{ background: palette.surface, border: `1px solid ${palette.border}`, color: palette.text, fontSize: "13px" }}
              />
              <input
                type="text"
                value={notepadReplaceText}
                onChange={(e) => setNotepadReplaceText(e.target.value)}
                placeholder="Replace with"
                className="w-full rounded-lg px-3 py-2 mb-2 bg-transparent outline-none"
                style={{ background: palette.surface, border: `1px solid ${palette.border}`, color: palette.text, fontSize: "13px" }}
              />
              <div className="flex items-center justify-between">
                <span style={{ color: palette.textFaint, fontSize: "11px", fontFamily: mono }}>
                  {notepadFindText ? `${findMatches} match${findMatches === 1 ? "" : "es"}` : "\u00a0"}
                </span>
                <button
                  type="button"
                  onClick={() => replaceAllInNote(activeNote)}
                  disabled={!notepadFindText}
                  className={`rounded-lg px-3 py-1.5 ${TAP}`}
                  style={{
                    background: notepadFindText ? palette.gold : palette.border,
                    color: notepadFindText ? palette.letterbox : palette.textFaint,
                    fontFamily: mono,
                    fontSize: "12px",
                    fontWeight: 600,
                    opacity: notepadFindText ? 1 : 0.6,
                  }}
                >
                  Replace All
                </button>
              </div>
            </div>
          )}

          <div
            className={isDesktop ? "w-full rounded-lg px-6 py-6 mb-1" : "w-full rounded-lg px-3 py-3 mb-1"}
            style={{
              background: palette.surface,
              border: `1px solid ${palette.border}`,
              minHeight: isDesktop ? "480px" : "260px",
              transition: THEME_TRANSITION,
            }}
          >
            {blocks.map((block, i) => {
              if (block.type === "image") return null;
              return (
                <textarea
                  key={block.id}
                  ref={getNotepadBlockRef(activeNote.id, block.id)}
                  value={block.text}
                  onChange={(e) => {
                    updateBlockText(block.id, e.target.value);
                    trackNotepadCursor(activeNote.id, block.id)(e);
                    autoGrowBlock(e.target);
                  }}
                  onFocus={trackNotepadCursor(activeNote.id, block.id)}
                  onClick={trackNotepadCursor(activeNote.id, block.id)}
                  onKeyUp={trackNotepadCursor(activeNote.id, block.id)}
                  placeholder={blocks.length === 1 ? "Start typing..." : ""}
                  rows={1}
                  className="w-full bg-transparent outline-none block"
                  style={{
                    border: "none",
                    color: palette.text,
                    fontFamily: mono,
                    fontSize: `${isDesktop ? fontSize + 2 : fontSize}px`,
                    lineHeight: 1.6,
                    resize: "none",
                    overflow: "hidden",
                    whiteSpace: wordWrap ? "pre-wrap" : "pre",
                    overflowWrap: wordWrap ? "break-word" : "normal",
                    overflowX: wordWrap ? "hidden" : "auto",
                    padding: 0,
                    minHeight: blocks.length === 1 ? (isDesktop ? "456px" : "236px") : "24px",
                  }}
                />
              );
            })}
          </div>

          <div className="flex items-center justify-between mb-4">
            <span style={{ color: palette.textFaint, fontSize: "11px", fontFamily: mono }}>
              {countLines(blocks)} ln – {countWords(bodyText)} words – {bodyText.length} chars
            </span>
            <span style={{ color: palette.textFaint, fontSize: "11px", fontFamily: mono }}>
              Saved {new Date(activeNote.updatedAt).toLocaleTimeString()}
            </span>
          </div>

          <button
            type="button"
            onClick={() => downloadNoteText(activeNote)}
            className={`w-full flex items-center justify-center gap-2 rounded-lg py-3 mt-2 mb-2 ${TAP}`}
            style={{
              background: palette.field,
              border: `1px solid ${palette.border}`,
              color: palette.text,
              fontFamily: mono,
              fontSize: "13px",
              fontWeight: 600,
              transition: `${THEME_TRANSITION}, transform 0.15s ease`,
            }}
          >
            <Download size={16} />
            Download as .txt
          </button>
          {notepadMsg && (
            <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
              {notepadMsg}
            </p>
          )}
        </>
      );
    }
  
  return body;
}
