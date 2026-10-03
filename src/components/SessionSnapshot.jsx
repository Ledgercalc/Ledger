import { memo, useMemo } from "react";
import { Activity, Flame, TrendingDown, TrendingUp } from "lucide-react";
import { computeDisciplineStreak } from "../lib/analytics.js";
import { dayKeyFromDate, dayKeyFromTs, fmtMoney, num } from "../lib/format.js";
import { TAP, display, mono, palette } from "../lib/theme.js";

// Mobile-only "Session Snapshot": the phone counterpart of the desktop sidebar's Today's Pulse.
// Own component + memo, so it only recalculates when trades or the relevant settings change,
// not on every App render.
function SessionSnapshotBase({ trades, maxTradesPerDay, onOpen, themeKey }) {
  const stats = useMemo(() => {
    const key = dayKeyFromDate(new Date());
    const today = trades.filter((t) => dayKeyFromTs(t.ts) === key);
    return {
      count: today.length,
      net: today.reduce((s, t) => s + t.pnl, 0),
      streak: computeDisciplineStreak(trades).current,
    };
  }, [trades]);
  const snapMax = num(maxTradesPerDay);
  const hasToday = stats.count > 0;
  const tone = !hasToday || stats.net === 0 ? palette.goldBright : stats.net > 0 ? palette.green : palette.red;
  const progress = snapMax > 0 ? Math.min(1, stats.count / snapMax) : hasToday ? 1 : 0;
  const R = 21;
  const C = 2 * Math.PI * R;
  const Icon = !hasToday || stats.net === 0 ? Activity : stats.net > 0 ? TrendingUp : TrendingDown;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Open session snapshot"
      className={`w-full text-left ${TAP}`}
      style={{
        display: "flex", alignItems: "center", gap: "14px", padding: "14px 14px 14px 12px", marginBottom: "16px",
        borderRadius: "20px", cursor: "pointer",
        background: `linear-gradient(135deg, ${tone}22 0%, ${palette.surface} 62%)`,
        border: `1px solid ${tone}38`, boxShadow: palette.shadow,
      }}
    >
      <span style={{ position: "relative", width: "54px", height: "54px", flex: "none", display: "block" }}>
        <svg width="54" height="54" viewBox="0 0 54 54" aria-hidden="true" style={{ transform: "rotate(-90deg)", display: "block" }}>
          <circle cx="27" cy="27" r={R} fill="none" stroke={palette.border} strokeWidth="5" />
          <circle cx="27" cy="27" r={R} fill="none" stroke={tone} strokeWidth="5" strokeLinecap="round"
            strokeDasharray={`${C * progress} ${C}`} style={{ transition: "stroke-dasharray .6s ease" }} />
        </svg>
        <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: tone }}>
          <Icon size={20} strokeWidth={2.4} />
        </span>
      </span>
      <span style={{ flex: "1 1 auto", minWidth: 0 }}>
        <span style={{ display: "block", fontSize: "10px", fontWeight: 800, letterSpacing: "0.14em", color: palette.textFaint, textTransform: "uppercase" }}>
          Session snapshot
        </span>
        {trades.length > 0 ? (
          <>
            <span style={{ display: "block", fontFamily: mono, fontSize: "22px", fontWeight: 800, lineHeight: 1.15, color: hasToday ? tone : palette.textFaint, marginTop: "2px" }}>
              {hasToday ? `${stats.net >= 0 ? "+" : "-"}$${fmtMoney(stats.net)}` : "$0"}
            </span>
            <span style={{ display: "block", fontSize: "11.5px", color: palette.textMuted, marginTop: "1px" }}>
              {hasToday ? `${stats.count} trade${stats.count === 1 ? "" : "s"} today${snapMax > 0 ? ` of ${snapMax}` : ""}` : "No trades yet today"}
            </span>
          </>
        ) : (
          <span style={{ display: "block", fontSize: "12.5px", color: palette.textMuted, marginTop: "3px" }}>
            Log your first trade to start your snapshot.
          </span>
        )}
      </span>
      <span style={{ flex: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", padding: "7px 11px", borderRadius: "14px", background: stats.streak > 0 ? `${palette.gold}1C` : palette.field, border: `1px solid ${stats.streak > 0 ? `${palette.gold}40` : palette.border}` }}>
        <Flame size={16} strokeWidth={2.3} style={{ color: stats.streak > 0 ? palette.goldBright : palette.textFaint }} />
        <span style={{ fontFamily: mono, fontSize: "14px", fontWeight: 800, color: stats.streak > 0 ? palette.goldBright : palette.textFaint, lineHeight: 1 }}>{stats.streak}d</span>
        <span style={{ fontSize: "8.5px", fontWeight: 700, letterSpacing: "0.1em", color: palette.textFaint, textTransform: "uppercase" }}>streak</span>
      </span>
    </button>
  );
}

const SessionSnapshot = memo(
  SessionSnapshotBase,
  (p, n) => p.trades === n.trades && p.maxTradesPerDay === n.maxTradesPerDay && p.themeKey === n.themeKey
);
export default SessionSnapshot;
