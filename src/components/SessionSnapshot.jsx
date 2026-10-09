import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { dayKeyFromDate, dayKeyFromTs, fmtMoney, num } from "../lib/format.js";
import { MARKET_SESSIONS, sessionOpenAtUTCHour } from "../lib/sessions.js";
import { TAP, THEME_TRANSITION, display, mono, palette } from "../lib/theme.js";

// Phone-only strip at the top of the Journal tab. One glance: today's result, how many trades,
// and which market is open. Tap it to open the full snapshot sheet.
export default function SessionSnapshot({ trades = [], maxTradesPerDay, onOpen }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const todayKey = dayKeyFromDate(now);
  const today = trades.filter((t) => dayKeyFromTs(t.ts) === todayKey);
  const net = today.reduce((s, t) => s + t.pnl, 0);
  const wins = today.filter((t) => t.pnl > 0).length;
  const losses = today.filter((t) => t.pnl < 0).length;
  const decided = wins + losses;
  const winRate = decided > 0 ? Math.round((wins / decided) * 100) : null;
  const max = num(maxTradesPerDay);
  const usedPct = max > 0 ? Math.min(100, (today.length / max) * 100) : 0;

  const hour = now.getUTCHours() + now.getUTCMinutes() / 60;
  const open = MARKET_SESSIONS.filter((s) => sessionOpenAtUTCHour(s, hour));

  const netColor = today.length === 0 || net === 0 ? palette.text : net > 0 ? palette.green : palette.red;
  const stat = (label, value, color) => (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ color: palette.textFaint, fontSize: "11px" }}>{label}</div>
      <div style={{ color: color || palette.text, fontFamily: mono, fontSize: "14px", fontWeight: 700, marginTop: "2px" }}>{value}</div>
    </div>
  );

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Open session snapshot"
      className={`w-full text-left rounded-2xl mb-4 ${TAP}`}
      style={{
        display: "block",
        padding: "14px 16px",
        background: palette.surface,
        border: `1px solid ${palette.border}`,
        boxShadow: palette.shadow,
        transition: THEME_TRANSITION,
      }}
    >
      <div className="flex items-center justify-between" style={{ marginBottom: "6px" }}>
        <span style={{ color: palette.textMuted, fontSize: "12px" }}>Today</span>
        <span className="flex items-center gap-1.5" style={{ color: open.length ? palette.text : palette.textFaint, fontSize: "12px" }}>
          <span
            aria-hidden="true"
            style={{
              width: 7,
              height: 7,
              borderRadius: "999px",
              background: open.length ? palette.green : palette.textFaint,
              boxShadow: open.length ? `0 0 0 3px ${palette.green}26` : "none",
            }}
          />
          {open.length ? `${open.map((s) => s.label).join(" + ")} open` : "Markets quiet"}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <span style={{ fontFamily: display, fontSize: "30px", fontWeight: 700, lineHeight: 1.1, color: netColor }}>
          {today.length === 0 ? "$0" : `${net >= 0 ? "+" : "-"}$${fmtMoney(net)}`}
        </span>
        <ChevronRight size={20} style={{ color: palette.textFaint, flexShrink: 0 }} />
      </div>

      <div className="flex" style={{ gap: "12px", marginTop: "12px", paddingTop: "12px", borderTop: `1px solid ${palette.border}` }}>
        {stat("Trades", max > 0 ? `${today.length} / ${max}` : String(today.length), max > 0 && today.length >= max ? palette.red : undefined)}
        {stat("Win rate", winRate === null ? "\u2013" : `${winRate}%`, winRate === null ? palette.textFaint : winRate >= 50 ? palette.green : palette.red)}
        {stat("W / L", `${wins} / ${losses}`)}
      </div>

      {max > 0 && (
        <div style={{ height: "4px", borderRadius: "999px", background: palette.field, overflow: "hidden", marginTop: "12px" }}>
          <div
            style={{
              height: "100%",
              width: `${usedPct}%`,
              borderRadius: "999px",
              background: usedPct >= 100 ? palette.red : usedPct >= 70 ? palette.gold : palette.green,
              transition: "width 0.3s ease",
            }}
          />
        </div>
      )}
    </button>
  );
}
