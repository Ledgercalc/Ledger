import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MONTH_NAMES, WEEKDAY_LABELS, dayKeyFromDate, dayKeyFromTs, fmtMoney, formatDayLabel } from "../lib/format.js";
import { TAP, THEME_TRANSITION, display, mono, palette } from "../lib/theme.js";

const GAIN_RGB = "34,180,94";
const LOSS_RGB = "224,82,82";

function signedMoney(pnl) {
  return `${pnl > 0 ? "+" : pnl < 0 ? "-" : ""}$${fmtMoney(pnl)}`;
}

// Short label that always fits inside a tile: +$169, -$1,234, +$12.4k
function tileMoney(pnl) {
  const abs = Math.abs(pnl);
  const sign = pnl > 0 ? "+" : pnl < 0 ? "-" : "";
  if (abs >= 100000) return `${sign}$${Math.round(abs / 1000)}k`;
  if (abs >= 10000) return `${sign}$${(abs / 1000).toFixed(1)}k`;
  if (abs < 1 && abs > 0) return `${sign}$${abs.toFixed(2)}`;
  return `${sign}$${Math.round(abs).toLocaleString("en-US")}`;
}

export default function HeatmapCalendar({ trades, isDesktop }) {
  const now = new Date();
  const todayKey = dayKeyFromDate(now);
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [selectedKey, setSelectedKey] = useState(null);

  const { byDay, earliest } = useMemo(() => {
    const map = {};
    let minTs = null;
    trades.forEach((t) => {
      const k = dayKeyFromTs(t.ts);
      if (!map[k]) map[k] = { pnl: 0, count: 0, wins: 0 };
      map[k].pnl += t.pnl;
      map[k].count += 1;
      if (t.pnl > 0) map[k].wins += 1;
      if (minTs === null || t.ts < minTs) minTs = t.ts;
    });
    const first = minTs === null ? now : new Date(minTs);
    return { byDay: map, earliest: { y: first.getFullYear(), m: first.getMonth() } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trades]);

  const { cells, stats, maxAbs } = useMemo(() => {
    const { y, m } = view;
    const lead = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const total = Math.ceil((lead + daysInMonth) / 7) * 7;
    const list = [];
    let net = 0;
    let green = 0;
    let red = 0;
    let best = null;
    let max = 0;
    for (let i = 0; i < total; i++) {
      const d = new Date(y, m, 1 - lead + i);
      const key = dayKeyFromDate(d);
      const inMonth = d.getMonth() === m;
      const rec = inMonth ? byDay[key] || null : null;
      if (rec) {
        net += rec.pnl;
        if (rec.pnl > 0) green += 1;
        if (rec.pnl < 0) red += 1;
        if (best === null || rec.pnl > best) best = rec.pnl;
        max = Math.max(max, Math.abs(rec.pnl));
      }
      list.push({ key, day: d.getDate(), inMonth, rec, future: key > todayKey });
    }
    return { cells: list, stats: { net, green, red, best, tradedDays: green + red }, maxAbs: max };
  }, [view, byDay, todayKey]);

  const atCurrent = view.y === now.getFullYear() && view.m === now.getMonth();
  const atEarliest = view.y < earliest.y || (view.y === earliest.y && view.m <= earliest.m);
  const shift = (delta) => {
    setSelectedKey(null);
    setView((v) => {
      const d = new Date(v.y, v.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  };
  const goToday = () => {
    setSelectedKey(null);
    setView({ y: now.getFullYear(), m: now.getMonth() });
  };

  const gap = isDesktop ? 8 : 5;
  const selected = selectedKey ? byDay[selectedKey] : null;

  const navBtn = (disabled) => ({
    width: isDesktop ? 38 : 34,
    height: isDesktop ? 38 : 34,
    borderRadius: 12,
    background: palette.field,
    border: `1px solid ${palette.border}`,
    color: disabled ? palette.textFaint : palette.text,
    opacity: disabled ? 0.45 : 1,
    cursor: disabled ? "default" : "pointer",
  });

  const statTile = (label, value, color) => (
    <div
      className="flex-1 min-w-0"
      style={{
        background: palette.field,
        border: `1px solid ${palette.border}`,
        borderRadius: 12,
        padding: isDesktop ? "10px 14px" : "8px 10px",
      }}
    >
      <div style={{ color: palette.textFaint, fontSize: isDesktop ? "12px" : "10.5px" }}>{label}</div>
      <div
        className="truncate"
        style={{ color: color || palette.text, fontFamily: display, fontWeight: 700, fontSize: isDesktop ? "17px" : "14px", marginTop: 2 }}
      >
        {value}
      </div>
    </div>
  );

  return (
    <div
      className="mb-6"
      style={{
        background: palette.surface,
        border: `1px solid ${palette.border}`,
        borderRadius: 22,
        boxShadow: palette.shadow,
        padding: isDesktop ? "28px 30px 26px" : "18px 14px 16px",
        maxWidth: isDesktop ? 820 : "none",
        marginLeft: "auto",
        marginRight: "auto",
        transition: THEME_TRANSITION,
      }}
    >
      <div className="flex items-center justify-between" style={{ marginBottom: isDesktop ? 18 : 14, padding: isDesktop ? 0 : "0 4px" }}>
        <h3 style={{ fontFamily: display, fontWeight: 700, fontSize: isDesktop ? "24px" : "20px", color: palette.text, margin: 0, letterSpacing: "-0.01em" }}>
          Performance Heatmap
        </h3>
        {!atCurrent && (
          <button
            type="button"
            onClick={goToday}
            className={TAP}
            style={{ color: palette.goldBright, fontSize: "12.5px", fontWeight: 600, padding: "6px 10px", borderRadius: 10, background: `${palette.gold}22` }}
          >
            Today
          </button>
        )}
      </div>

      <div className="flex items-center justify-between" style={{ marginBottom: isDesktop ? 16 : 12 }}>
        <button
          type="button"
          className={`flex items-center justify-center ${TAP}`}
          style={navBtn(atEarliest)}
          onClick={() => !atEarliest && shift(-1)}
          disabled={atEarliest}
          aria-label="Previous month"
        >
          <ChevronLeft size={18} />
        </button>
        <span style={{ fontFamily: display, fontWeight: 600, fontSize: isDesktop ? "17px" : "15px", color: palette.text }}>
          {MONTH_NAMES[view.m]} {view.y}
        </span>
        <button
          type="button"
          className={`flex items-center justify-center ${TAP}`}
          style={navBtn(atCurrent)}
          onClick={() => !atCurrent && shift(1)}
          disabled={atCurrent}
          aria-label="Next month"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="flex" style={{ gap, marginBottom: isDesktop ? 18 : 14 }}>
        {statTile("Net P&L", stats.tradedDays ? signedMoney(stats.net) : "\u2014", stats.net > 0 ? palette.green : stats.net < 0 ? palette.red : undefined)}
        {statTile("Green / red days", stats.tradedDays ? `${stats.green} / ${stats.red}` : "\u2014")}
        {statTile("Best day", stats.best !== null ? signedMoney(stats.best) : "\u2014", stats.best > 0 ? palette.green : undefined)}
      </div>

      <div className="grid" style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap, marginBottom: gap }}>
        {WEEKDAY_LABELS.map((w, i) => (
          <div key={i} className="text-center" style={{ color: palette.textFaint, fontSize: isDesktop ? "12px" : "11px", fontWeight: 600 }}>
            {w}
          </div>
        ))}
      </div>

      <div className="grid" style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap }}>
        {cells.map((c) => {
          const rec = c.rec;
          const isToday = c.key === todayKey;
          const isSelected = c.key === selectedKey;
          let bg = "transparent";
          let textColor = palette.textFaint;
          let moneyColor = "#fff";
          if (c.inMonth) {
            bg = palette.field;
            textColor = c.future ? palette.textFaint : palette.textMuted;
          }
          if (rec) {
            const intensity = maxAbs > 0 ? Math.min(1, Math.abs(rec.pnl) / maxAbs) : 0;
            if (rec.pnl === 0) {
              textColor = palette.text;
              moneyColor = palette.textMuted;
            } else {
              const alpha = (0.34 + 0.66 * intensity).toFixed(2);
              bg = `rgba(${rec.pnl > 0 ? GAIN_RGB : LOSS_RGB},${alpha})`;
              const strong = intensity >= 0.4;
              textColor = strong ? "#fff" : palette.text;
              moneyColor = strong ? "#fff" : palette.text;
            }
          }
          const ring = isSelected ? `0 0 0 2px ${palette.text}` : isToday ? `0 0 0 2px ${palette.goldBright}` : "none";
          const inner = (
            <>
              <span style={{ fontFamily: display, fontWeight: 700, fontSize: isDesktop ? "20px" : "15px", color: textColor, lineHeight: 1.1 }}>
                {c.day}
              </span>
              {rec && (
                <span style={{ fontFamily: mono, fontWeight: 600, fontSize: isDesktop ? "13px" : "10px", color: moneyColor, lineHeight: 1.1, marginTop: isDesktop ? 5 : 3 }}>
                  {tileMoney(rec.pnl)}
                </span>
              )}
            </>
          );
          const base = {
            aspectRatio: isDesktop ? "1 / 0.92" : "1 / 1",
            borderRadius: isDesktop ? 14 : 10,
            background: bg,
            boxShadow: ring,
            opacity: c.inMonth ? 1 : 0.35,
            transition: "box-shadow 0.15s ease",
          };
          return rec ? (
            <button
              key={c.key}
              type="button"
              onClick={() => setSelectedKey(isSelected ? null : c.key)}
              className={`flex flex-col items-center justify-center ${TAP}`}
              style={{ ...base, cursor: "pointer" }}
              aria-label={`${formatDayLabel(c.key)}: ${signedMoney(rec.pnl)}, ${rec.count} trade${rec.count === 1 ? "" : "s"}`}
              aria-pressed={isSelected}
            >
              {inner}
            </button>
          ) : (
            <div key={c.key} className="flex flex-col items-center justify-center" style={base}>
              {inner}
            </div>
          );
        })}
      </div>

      <div
        className="flex items-center justify-between"
        style={{
          marginTop: isDesktop ? 18 : 14,
          minHeight: 44,
          padding: "10px 14px",
          borderRadius: 12,
          background: palette.field,
          border: `1px solid ${palette.border}`,
        }}
      >
        {selected ? (
          <>
            <span style={{ color: palette.text, fontSize: "13px", fontWeight: 600 }}>{formatDayLabel(selectedKey)}</span>
            <span style={{ fontSize: "13px", fontFamily: mono }}>
              <span style={{ color: palette.textMuted }}>
                {selected.count} trade{selected.count === 1 ? "" : "s"} {"\u00B7"} {selected.wins} win{selected.wins === 1 ? "" : "s"}{" "}
              </span>
              <span style={{ color: selected.pnl > 0 ? palette.green : selected.pnl < 0 ? palette.red : palette.text, fontWeight: 700 }}>
                {signedMoney(selected.pnl)}
              </span>
            </span>
          </>
        ) : (
          <span style={{ color: palette.textFaint, fontSize: "12.5px" }}>
            {stats.tradedDays ? "Tap a day to see its trades and total." : "No trades logged this month."}
          </span>
        )}
      </div>
    </div>
  );
}
