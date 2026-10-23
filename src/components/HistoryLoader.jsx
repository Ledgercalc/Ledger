import { useEffect, useRef, useState } from "react";
import { DUKA, clearSaved, dayString, daysBetween, downloadDukascopy, loadDukascopy, storedDayCounts, storedDays, storedSummary } from "../api/dukascopy.js";
import { TAP, mono, palette } from "../lib/theme.js";
import { Download, Loader2, Square, Upload } from "lucide-react";

// The one place to pick data: instrument, timeframe and ANY date range, then Load.
// Whatever isn't on this device yet is fetched (with a progress bar), kept for next time, and put on the chart.
// Needs: field/label styles and ghostBtn() from the Backtest tab so it looks the same as the rest.
const TF_MIN = { "1m": 1, "5m": 5, "15m": 15, "30m": 30, "1h": 60, "4h": 240, "1d": 1440 };
const EARLIEST = "2003-05-05";

export default function HistoryLoader({ symbol, setSymbol, tf, setTf, instruments, timeframes, isDesktop, fileRef, onCsv, onLoad, onQuick, quickLoading, fieldStyle, labelStyle, ghostBtn }) {
  const today = dayString(Date.now());
  const [from, setFrom] = useState(dayString(Date.now() - 90 * 86400000));
  const [to, setTo] = useState(today);
  const [clean, setClean] = useState(true);
  const [busy, setBusy] = useState(false);
  const [building, setBuilding] = useState(false);
  const [progress, setProgress] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [partial, setPartial] = useState(false);
  const [saved, setSaved] = useState({ count: 0, first: "", last: "" });
  const [savedSet, setSavedSet] = useState(new Set());
  const [counts, setCounts] = useState({ all: 0, withVolume: 0, needRefresh: 0 });
  const ctrl = useRef(null);
  const supported = !!DUKA[symbol];
  const label = (instruments.find((i) => i.id === symbol) || { label: symbol }).label;

  useEffect(() => {
    let alive = true;
    if (supported) {
      storedSummary(symbol).then((s) => alive && setSaved(s)).catch(() => {});
      storedDays(symbol).then((s) => alive && setSavedSet(s)).catch(() => {});
      storedDayCounts(symbol).then((c) => alive && setCounts(c)).catch(() => {});
    }
    return () => {
      alive = false;
    };
  }, [symbol, supported, busy]);
  useEffect(() => () => ctrl.current && ctrl.current.abort(), []);

  const valid = from && to && from <= to && to <= today && from >= EARLIEST;
  const rangeDays = valid ? daysBetween(from, to).filter((d) => new Date(`${d}T00:00:00Z`).getUTCDay() !== 6) : [];
  const missing = rangeDays.filter((d) => !savedSet.has(d) || d === today).length;
  const estCandles = Math.round(rangeDays.length * (1440 / (TF_MIN[tf] || 15)));
  const estMb = Math.max(0.1, missing * 0.02);
  const fmt = (n) => n.toLocaleString("en-US");

  const loadAll = async () => {
    setError("");
    setMessage("");
    setPartial(false);
    if (!valid) return setError(from > to ? "The start date has to be before the end date." : to > today ? "The end date can't be in the future." : `Dukascopy data starts around ${EARLIEST}.`);
    ctrl.current = new AbortController();
    setBusy(true);
    setProgress({ done: 0, total: 0, bytes: 0 });
    try {
      const r = await downloadDukascopy({ symbol, fromDay: from, toDay: to, signal: ctrl.current.signal, onProgress: setProgress });
      if (r.failed.length) {
        const first = r.failed.find((f) => f.message !== "Not fetched yet") || r.failed[0];
        setPartial(true);
        setError(`${r.failed.length} day${r.failed.length === 1 ? "" : "s"} couldn't be fetched (${first.message}) Everything else is saved. Wait a few minutes and press Load candles again to carry on where it stopped.`);
        return;
      }
      setBuilding(true);
      const list = await loadDukascopy({ symbol, fromDay: from, toDay: to, tf, clean });
      if (list.length < 30) throw new Error("No candles came back for that range. It may be a weekend or holiday. Try other dates.");
      onLoad(list, { from, to });
    } catch (err) {
      if (err && err.name === "AbortError") setMessage("Stopped. What was fetched is saved; press Load again to carry on.");
      else setError((err && err.message) || "Loading failed. Try again.");
    } finally {
      setBusy(false);
      setBuilding(false);
    }
  };
  const stop = () => ctrl.current && ctrl.current.abort();
  // Use what is already on the device, even if a few days are missing.
  const loadSaved = async () => {
    setError("");
    setBuilding(true);
    try {
      const list = await loadDukascopy({ symbol, fromDay: from, toDay: to, tf, clean });
      if (list.length < 30) throw new Error("Not enough saved candles in that range yet.");
      onLoad(list, { from, to });
    } catch (err) {
      setError((err && err.message) || "Couldn't build the chart from the saved data.");
    } finally {
      setBuilding(false);
    }
  };
  const clearData = async () => {
    await clearSaved(symbol);
    setSaved({ count: 0, first: "", last: "" });
    setSavedSet(new Set());
    setMessage(`Saved ${label} data removed from this device.`);
  };

  const grey = { color: palette.textFaint, fontFamily: mono, fontSize: 11.5 };
  const linkBtn = { background: "transparent", border: "none", padding: 0, color: palette.textMuted, fontFamily: mono, fontSize: 11.5, textDecoration: "underline", cursor: "pointer" };
  const pct = progress && progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
  const working = busy || building;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "1.5fr 0.7fr 1fr 1fr" : "1fr 1fr", gap: 10, alignItems: "end" }}>
        <div style={isDesktop ? undefined : { gridColumn: "1 / -1" }}>
          <label style={labelStyle} htmlFor="bt-symbol">Instrument</label>
          <select id="bt-symbol" value={symbol} onChange={(e) => setSymbol(e.target.value)} disabled={working} style={fieldStyle}>
            {["Forex", "Metals", "Indices"].map((g) => (
              <optgroup key={g} label={g}>
                {instruments.filter((i) => i.group === g).map((i) => (
                  <option key={i.id} value={i.id}>{i.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div style={isDesktop ? undefined : { gridColumn: "1 / -1" }}>
          <label style={labelStyle} htmlFor="bt-tf">Timeframe</label>
          <select id="bt-tf" value={tf} onChange={(e) => setTf(e.target.value)} disabled={working} style={fieldStyle}>
            {timeframes.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle} htmlFor="bt-from">From</label>
          <input id="bt-from" type="date" value={from} min={EARLIEST} max={today} onChange={(e) => setFrom(e.target.value)} disabled={working} style={fieldStyle} />
        </div>
        <div>
          <label style={labelStyle} htmlFor="bt-to">To</label>
          <input id="bt-to" type="date" value={to} min={EARLIEST} max={today} onChange={(e) => setTo(e.target.value)} disabled={working} style={fieldStyle} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 12 }}>
        {busy ? (
          <button type="button" onClick={stop} className={TAP} style={{ ...ghostBtn(false), justifyContent: "center" }}>
            <Square size={14} /> Stop
          </button>
        ) : (
          <button type="button" onClick={loadAll} disabled={building || !supported} className={TAP} style={{ ...ghostBtn(true), justifyContent: "center", ...(building || !supported ? { opacity: 0.55, cursor: "not-allowed" } : null) }}>
            {building ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            {building ? "Building chart" : "Load candles"}
          </button>
        )}
        <button type="button" onClick={() => fileRef.current && fileRef.current.click()} disabled={working} className={TAP} style={{ ...ghostBtn(false), justifyContent: "center", ...(working ? { opacity: 0.55, cursor: "not-allowed" } : null) }}>
          <Upload size={15} /> Import CSV
        </button>
        <input ref={fileRef} type="file" accept=".csv,.txt,text/csv" onChange={onCsv} style={{ display: "none" }} />
        <label style={{ display: "inline-flex", alignItems: "center", gap: 7, color: palette.textMuted, fontFamily: mono, fontSize: 12.5, cursor: "pointer" }}>
          <input type="checkbox" checked={clean} onChange={(e) => setClean(e.target.checked)} disabled={working} />
          Clean candles
        </label>
      </div>

      {!supported ? (
        <p style={{ ...grey, margin: "10px 0 0" }}>Full history isn't available for {label}. Use Import CSV.</p>
      ) : (
        valid && (
          <p style={{ ...grey, margin: "10px 0 0", lineHeight: 1.6 }}>
            {fmt(rangeDays.length)} trading days, about {fmt(estCandles)} candles at {tf}.{" "}
            {missing === 0 ? "Already saved on this device, so it opens instantly." : `${fmt(missing)} day${missing === 1 ? "" : "s"} still to fetch (about ${estMb < 10 ? estMb.toFixed(1) : Math.round(estMb)} MB), then it's saved for next time.`}
            {estCandles > 1500000 ? " That is a lot of candles and the chart may feel slow. A bigger timeframe will be smoother." : ""}
          </p>
        )
      )}

      {busy && progress && (
        <div style={{ marginTop: 10 }}>
          <div style={{ height: 8, borderRadius: 4, background: palette.field, border: `1px solid ${palette.border}`, overflow: "hidden" }} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div style={{ width: `${pct}%`, height: "100%", background: palette.gold, transition: "width 0.2s" }} />
          </div>
          <div style={{ ...grey, marginTop: 6, color: palette.textMuted }}>
            {progress.total ? `Day ${progress.done} of ${progress.total}${progress.day ? ` (${progress.day})` : ""}` : "Starting"} - {(progress.bytes / 1048576).toFixed(1)} MB fetched
          </div>
          {progress.note && <div style={{ ...grey, marginTop: 4, color: palette.gold }}>{progress.note}</div>}
        </div>
      )}
      {error && (
        <div style={{ marginTop: 10 }}>
          <p role="alert" style={{ color: palette.red, fontFamily: mono, fontSize: 12.5, margin: 0 }}>{error}</p>
          {partial && (
            <button type="button" onClick={loadSaved} disabled={building} style={{ ...linkBtn, marginTop: 6, marginRight: 14 }}>
              Load what's saved so far
            </button>
          )}
          {onQuick && (
            <button type="button" onClick={onQuick} disabled={quickLoading} style={{ ...linkBtn, marginTop: 6 }}>
              {quickLoading ? "Loading..." : "Load quick recent data instead (limited history)"}
            </button>
          )}
        </div>
      )}
      {message && !error && <p style={{ color: palette.textMuted, fontFamily: mono, fontSize: 12.5, margin: "10px 0 0" }}>{message}</p>}
      {supported && saved.count > 0 && (
        <p style={{ ...grey, margin: "10px 0 0" }}>
          Saved on this device for {label}: {saved.count} day{saved.count === 1 ? "" : "s"} ({saved.first} to {saved.last}).{counts.needRefresh > 0 ? ` ${counts.needRefresh} of them were saved before volume data was added and will be refreshed on the next Load (needed for the volume profile).` : ""}{" "}
          <button type="button" onClick={clearData} disabled={working} style={linkBtn}>Remove</button>
        </p>
      )}
    </div>
  );
}
