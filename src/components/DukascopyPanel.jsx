import { useEffect, useRef, useState } from "react";
import { DUKA, dayString, daysBetween, downloadDukascopy, loadDukascopy, storedDays, storedSummary } from "../api/dukascopy.js";
import { TAP, display, mono, palette } from "../lib/theme.js";
import { ChevronDown, ChevronUp, Download, Loader2, Square } from "lucide-react";

// Full-history candles from Dukascopy: download once into this browser, then load any timeframe from it.
// Uses the instrument and timeframe already chosen in the Backtest tab's data card.
export default function DukascopyPanel({ symbol, tf, instruments, onLoad }) {
  const today = dayString(Date.now());
  const monthAgo = dayString(Date.now() - 30 * 86400000);
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [busy, setBusy] = useState(false);
  const [building, setBuilding] = useState(false);
  const [progress, setProgress] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState({ count: 0, first: "", last: "" });
  const [savedSet, setSavedSet] = useState(new Set());
  const ctrl = useRef(null);
  const supported = !!DUKA[symbol];
  const label = (instruments.find((i) => i.id === symbol) || { label: symbol }).label;

  useEffect(() => {
    let alive = true;
    if (open && supported) {
      storedSummary(symbol).then((s) => alive && setSaved(s)).catch(() => {});
      storedDays(symbol).then((s) => alive && setSavedSet(s)).catch(() => {});
    }
    return () => {
      alive = false;
    };
  }, [open, symbol, supported, busy]);
  useEffect(() => () => ctrl.current && ctrl.current.abort(), []);

  const rangeDays = daysBetween(from <= to ? from : to, to >= from ? to : from).filter((d) => new Date(d + "T00:00:00Z").getUTCDay() !== 6 && d <= today);
  const tradingDays = rangeDays.length;
  const missing = rangeDays.filter((d) => !savedSet.has(d) || d === today).length;
  const field = {
    background: palette.field, border: `1px solid ${palette.border}`, color: palette.text, borderRadius: 10, padding: "8px 10px",
    fontFamily: mono, fontSize: 13, minWidth: 0, outline: "none", colorScheme: "light dark",
  };
  const chip = (active) => ({
    background: active ? palette.gold : palette.field, color: active ? palette.letterbox : palette.textMuted,
    border: `1px solid ${active ? palette.gold : palette.border}`, borderRadius: 999, padding: "5px 11px", fontFamily: mono,
    fontSize: 12, fontWeight: 600, cursor: "pointer",
  });
  const btn = (primary) => ({
    background: primary ? palette.gold : palette.field, color: primary ? palette.letterbox : palette.textMuted,
    border: `1px solid ${primary ? palette.gold : palette.border}`, borderRadius: 10, padding: "9px 12px", fontFamily: mono,
    fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
  });
  const setRange = (days) => {
    setTo(today);
    setFrom(dayString(Date.now() - days * 86400000));
  };

  // One button: fetch whatever isn't saved yet (with a progress bar), then put the range on the chart.
  const loadAll = async () => {
    setError("");
    setMessage("");
    if (from > to) return setError("The start date has to be before the end date.");
    if (to > today) return setError("The end date can't be in the future.");
    ctrl.current = new AbortController();
    setBusy(true);
    setProgress({ done: 0, total: 0, bytes: 0 });
    try {
      await downloadDukascopy({ symbol, fromDay: from, toDay: to, signal: ctrl.current.signal, onProgress: setProgress });
      setBuilding(true);
      const list = await loadDukascopy({ symbol, fromDay: from, toDay: to, tf });
      if (list.length < 30) throw new Error("Dukascopy returned no candles for that range. Try other dates.");
      onLoad(list);
    } catch (err) {
      if (err && err.name === "AbortError") setMessage("Stopped. What was fetched is saved; press Load again to carry on.");
      else setError((err && err.message) || "Loading failed. Try again.");
    } finally {
      setBusy(false);
      setBuilding(false);
    }
  };
  const stop = () => ctrl.current && ctrl.current.abort();

  const pct = progress && progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
  return (
    <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${palette.border}` }}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className={TAP} style={{ background: "transparent", border: "none", padding: 0, display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: palette.text, fontFamily: display, fontWeight: 700, fontSize: 14 }}>
        Full history from Dukascopy (free)
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && (
        <div style={{ marginTop: 10 }}>
          {!supported ? (
            <p style={{ color: palette.textMuted, fontFamily: mono, fontSize: 12.5, margin: 0 }}>Full history isn't available for {label}.</p>
          ) : (
            <>
              <p style={{ color: palette.textMuted, fontFamily: mono, fontSize: 12, lineHeight: 1.6, margin: "0 0 10px" }}>
                Real minute-by-minute data for <b>{label}</b>, years back. Pick the dates and press Load. The first time, the days are fetched (small files, about 10 to 30 KB per day) and kept on this device; after that the same range opens instantly. It uses the timeframe chosen above ({tf}).
              </p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                {[["1 week", 7], ["1 month", 30], ["3 months", 90], ["1 year", 365]].map(([t, d]) => (
                  <button key={t} type="button" onClick={() => setRange(d)} disabled={busy} className={TAP} style={chip(from === dayString(Date.now() - d * 86400000) && to === today)}>{t}</button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
                <div>
                  <label htmlFor="duka-from" style={{ display: "block", color: palette.textFaint, fontFamily: mono, fontSize: 11.5, marginBottom: 4 }}>From</label>
                  <input id="duka-from" type="date" value={from} max={today} min="2003-05-05" onChange={(e) => setFrom(e.target.value)} disabled={busy} style={field} />
                </div>
                <div>
                  <label htmlFor="duka-to" style={{ display: "block", color: palette.textFaint, fontFamily: mono, fontSize: 11.5, marginBottom: 4 }}>To</label>
                  <input id="duka-to" type="date" value={to} max={today} min="2003-05-05" onChange={(e) => setTo(e.target.value)} disabled={busy} style={field} />
                </div>
                {busy ? (
                  <button type="button" onClick={stop} className={TAP} style={btn(false)}><Square size={14} /> Stop</button>
                ) : (
                  <button type="button" onClick={loadAll} disabled={building} className={TAP} style={btn(true)}>
                    {building ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                    {missing === 0 ? `Load ${tradingDays} days` : `Load ${tradingDays} days (${missing} to fetch)`}
                  </button>
                )}
              </div>
              {busy && progress && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ height: 8, borderRadius: 4, background: palette.field, border: `1px solid ${palette.border}`, overflow: "hidden" }} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                    <div style={{ width: `${pct}%`, height: "100%", background: palette.gold, transition: "width 0.2s" }} />
                  </div>
                  <div style={{ color: palette.textMuted, fontFamily: mono, fontSize: 12, marginTop: 6 }}>
                    {progress.total ? `Day ${progress.done} of ${progress.total}${progress.day ? ` (${progress.day})` : ""}` : "Starting"} - {(progress.bytes / 1048576).toFixed(1)} MB fetched
                  </div>
                </div>
              )}
              {error && <p role="alert" style={{ color: palette.red, fontFamily: mono, fontSize: 12.5, margin: "10px 0 0" }}>{error}</p>}
              {message && !error && <p style={{ color: palette.textMuted, fontFamily: mono, fontSize: 12.5, margin: "10px 0 0" }}>{message}</p>}
              <p style={{ color: palette.textFaint, fontFamily: mono, fontSize: 11.5, margin: "10px 0 0" }}>
                {saved.count ? `Saved on this device for ${label}: ${saved.count} day${saved.count === 1 ? "" : "s"} (${saved.first} to ${saved.last}).` : `Nothing saved on this device for ${label} yet.`}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
