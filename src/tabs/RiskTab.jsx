import { pokeCrab } from "../lib/mascot.js";
import { Suspense, useEffect, useRef } from "react";
import { Field, PillGroup, Readout, RuleRow, StatChip } from "../components/ui.jsx";
import { computeQualifyingTradingDays } from "../lib/analytics.js";
import { EDGE_PROJECTION_PERIODS, PROFIT_TARGET_OPTIONS } from "../lib/constants.js";
import { fmt, num } from "../lib/format.js";
import { TAP, mono, palette } from "../lib/theme.js";
import { ArrowLeftRight, Pencil, Scale, Target } from "lucide-react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function RiskTab(props) {
  const {
    ConvertTab,
    applyPreset,
    convertProps,
    cs,
    edge,
    edgeProjectionPeriodIdx,
    isDesktop,
    linkedFirm,
    ps,
    renderSubNav,
    riskSubTab,
    setCs,
    setEdge,
    setEdgeProjectionPeriodIdx,
    setPs,
    setRiskSubTab,
    settings,
    threeCurveResult,
    trades
  } = props;
  let body = null;
    const RISK_SUB_TABS = [
      { id: "challenge", label: "Challenge" },
      { id: "edge", label: "Edge" },
      { id: "size", label: "Size" },
      { id: "convert", label: "Convert" },
    ];

    const ratio = num(edge.rr); // reward multiple, e.g. 2 = risking 1R to make 2R
    const buf = num(edge.buffer);
    const rrBeWin = ratio > 0 ? (1 / (1 + ratio)) * 100 : 0;
    const targetWinRate = Math.min(100, rrBeWin + buf);
    const beWin = rrBeWin;



const totalTrades = Math.max(0, Math.floor(num(edge.totalTrades)));

const enteredWins = Math.max(0, Math.floor(num(edge.totalWinTrades)));
const enteredLosses = Math.max(0, Math.floor(num(edge.totalLossTrades)));

const hasWinsInput = edge.totalWinTrades !== "";
const hasLossesInput = edge.totalLossTrades !== "";

let winTrades = enteredWins;
let lossTrades = enteredLosses;

// If total trades + wins are entered, calculate losses automatically.
if (totalTrades > 0 && hasWinsInput && !hasLossesInput) {
  winTrades = Math.min(enteredWins, totalTrades);
  lossTrades = totalTrades - winTrades;
}

// If total trades + losses are entered, calculate wins automatically.
else if (totalTrades > 0 && hasLossesInput && !hasWinsInput) {
  lossTrades = Math.min(enteredLosses, totalTrades);
  winTrades = totalTrades - lossTrades;
}

// If both are entered, keep them but never allow them above total trades.
else if (totalTrades > 0) {
  winTrades = Math.min(enteredWins, totalTrades);
  lossTrades = Math.min(enteredLosses, totalTrades - winTrades);
}

const hasTradeStats =
  totalTrades > 0 && (hasWinsInput || hasLossesInput);

const historicalWinRate =
  hasTradeStats
    ? (winTrades / totalTrades) * 100
    : 0;

const profileWinRate = rrBeWin;

const computedWinRate =
  hasTradeStats
    ? historicalWinRate
    : profileWinRate;

const lossRate =
  Math.max(0, 100 - computedWinRate);

const hasExpectancyInputs =
  ratio > 0;

// expectancy expressed in R (multiples of risk) — risking 1R per trade
const expectancy =
  hasExpectancyInputs
    ? (computedWinRate / 100) * ratio -
      (lossRate / 100) * 1
    : 0;

const per100 = expectancy * 100;

const totalProjected =
  expectancy * totalTrades;

const hasTotalProjection =
  hasExpectancyInputs &&
  totalTrades > 0;


const accountBal =
  num(edge.accountBalance);

const hasBalance =
  accountBal > 0;

const tradesPerMonth =
  Math.max(
    0,
    Math.floor(num(edge.tradesPerMonth))
  );

const tradesPerDay = tradesPerMonth / 30;

const selectedEdgePeriod = EDGE_PROJECTION_PERIODS[edgeProjectionPeriodIdx];

// Auto-fill Total Trades from Trades/Month, using the currently selected
// Projected Curve period, so the two sections stay in sync.
const selTrades = tradesPerDay * selectedEdgePeriod.days;
const selExpectedWins = selTrades * (computedWinRate / 100);
const selExpectedLosses = selTrades * (lossRate / 100);
const selProjectedR = selTrades * expectancy;
const hasSelProjection = hasExpectancyInputs && selTrades > 0;

const riskDollarPerTrade = hasBalance ? accountBal * (num(edge.riskPct) / 100) : 0;
const hasDollarProjection = hasSelProjection && hasBalance && riskDollarPerTrade > 0;
const selProjectedDollar = hasDollarProjection ? selProjectedR * riskDollarPerTrade : 0;

const EDGE_CURVE_POINTS = 40;
const edgeCurveData = Array.from({ length: EDGE_CURVE_POINTS + 1 }, (_, i) => {
  const tradeCount = (selTrades * i) / EDGE_CURVE_POINTS;
  const rVal = expectancy * tradeCount;
  return {
    trade: Math.round(tradeCount),
    r: rVal,
    pnl: riskDollarPerTrade > 0 ? rVal * riskDollarPerTrade : null,
  };
});
    const bal = num(ps.balance);
    const sizeRiskMode = settings.sizeRiskInputMode === "dollar" ? "dollar" : "percent";
    const psRiskPct = num(ps.riskPct);
    const psRiskDollar = num(ps.riskDollar);
    const stopPips = num(ps.stopPips);
    const valPerPip = num(ps.valuePerPip);
    const riskAmt = sizeRiskMode === "dollar" ? psRiskDollar : bal * (psRiskPct / 100);
    const riskPctEffective = sizeRiskMode === "dollar" ? (bal > 0 ? (psRiskDollar / bal) * 100 : 0) : psRiskPct;
    const lots = stopPips > 0 && valPerPip > 0 ? riskAmt / (stopPips * valPerPip) : 0;

    const hasStart = cs.startBal !== "";
    const hasBoth = hasStart && cs.currentBal !== "";
    const hasTarget = cs.targetPct !== "instant";

    const startBal = num(cs.startBal);
    const currentBal = num(cs.currentBal);
    const targetPct = hasTarget ? num(cs.targetPct) : 0;
    const dailyLossPct = num(cs.dailyLossPct);
    const todayLoss = num(cs.todayLoss);
    const bestDay = num(cs.bestDay);
    const rule = num(cs.rule);
    const maxDrawdownPct = num(cs.maxDrawdownPct) || 4;
    const ddMode = cs.ddMode === "static" ? "static" : "trail";

    const totalProfit = hasBoth ? currentBal - startBal : 0;
    const splitEarnings = totalProfit * (num(cs.profitSplitPct) / 100);
    const targetAmount = hasTarget ? startBal * (targetPct / 100) : 0;
    const progressPct = hasBoth && hasTarget && targetAmount > 0 ? (totalProfit / targetAmount) * 100 : 0;
    const remainingToTarget = hasTarget ? Math.max(0, targetAmount - totalProfit) : 0;

    const dailyLossAllowed = startBal * (dailyLossPct / 100);
    const dailyPass = hasStart ? todayLoss <= dailyLossAllowed : undefined;
    const dailyRemaining = Math.max(0, dailyLossAllowed - todayLoss);

    const peakBalance = hasBoth
      ? ddMode === "static"
        ? startBal
        : Math.max(startBal, currentBal)
      : startBal;
    const maxDrawdownAllowed = peakBalance * (maxDrawdownPct / 100);
    const floorBalance = peakBalance - maxDrawdownAllowed;
    const overallPass = hasBoth ? currentBal >= floorBalance : undefined;
    const overallRemaining = Math.max(0, currentBal - floorBalance);

    const consistencyScore = hasBoth && totalProfit > 0 ? (bestDay / totalProfit) * 100 : 0;
    const consistencyPass =
      hasBoth && totalProfit > 0 ? (rule === 0 ? true : consistencyScore <= rule) : undefined;
    const reqTotalForConsistency = rule > 0 ? bestDay / (rule / 100) : 0;
    const moreNeededForConsistency = Math.max(0, reqTotalForConsistency - totalProfit);

    const inDrawdown = hasBoth && currentBal < peakBalance;
    const currentDrawdownPct = inDrawdown && peakBalance > 0 ? ((peakBalance - currentBal) / peakBalance) * 100 : 0;
    const recoveryNeededPct = inDrawdown && currentDrawdownPct < 100 ? (currentDrawdownPct / (100 - currentDrawdownPct)) * 100 : 0;
    const recoveryDollar = inDrawdown ? peakBalance - currentBal : 0;

    // ── Mascot reactions ─────────────────────────────────────────────
    const crabReady = useRef(false);
    const crabPrev = useRef({ hit: false, breach: false });
    useEffect(() => {
      if (crabReady.current) pokeCrab("look");
    }, [riskSubTab]);
    useEffect(() => {
      if (crabReady.current) pokeCrab("type");
    }, [cs, edge, ps]);
    useEffect(() => {
      const hit = hasTarget && hasBoth && progressPct >= 100;
      const breach = overallPass === false;
      if (crabReady.current) {
        if (hit && !crabPrev.current.hit) pokeCrab("party", { say: "Target hit!" });
        else if (breach && !crabPrev.current.breach) pokeCrab("alert", { say: "Below the floor!" });
      }
      crabPrev.current = { hit, breach };
    }, [hasTarget, hasBoth, progressPct, overallPass]);
    useEffect(() => {
      pokeCrab("rest", { pose: overallPass === false ? "worry" : "" });
      return () => pokeCrab("rest", { pose: "" });
    }, [overallPass]);
    useEffect(() => {
      crabReady.current = true;
    }, []);

    body = (
      <>
        {renderSubNav(RISK_SUB_TABS, riskSubTab, setRiskSubTab)}

        {riskSubTab === "convert" ? (
          <Suspense fallback={<div className="tz-tab-loading" aria-hidden="true" />}>
            <ConvertTab {...convertProps} />
          </Suspense>
        ) : riskSubTab === "challenge" ? (
          <>
            <Readout isDesktop={isDesktop}
              icon={Target}
              progress={hasTarget && hasBoth ? progressPct : undefined}
              statusLabel={
                hasTarget && hasBoth
                  ? progressPct >= 100
                    ? "TARGET HIT"
                    : totalProfit < 0
                    ? "BELOW START"
                    : "IN PROGRESS"
                  : undefined
              }
              eyebrow={!hasTarget ? (hasBoth && totalProfit < 0 ? "You Need More for Payout" : "Your Profit Amount") : "Profit Target Progress"}
              value={
                !hasTarget
                  ? hasBoth
                    ? `${totalProfit < 0 ? "-" : ""}$${fmt(Math.abs(totalProfit))}`
                    : "Instant"
                  : hasBoth
                  ? `${totalProfit < 0 ? "-" : ""}$${fmt(Math.abs(totalProfit))}`
                  : "$0"
              }
              sub={
                !hasTarget
                  ? hasBoth
                    ? totalProfit < 0
                      ? "Your balance is below your starting balance"
                      : "No profit target required for this challenge type"
                    : "Enter starting & current balance below"
                  : hasBoth
                  ? undefined
                  : "Enter starting & current balance below"
              }
              statLeft={
                hasTarget && hasBoth && progressPct < 100
                  ? { value: `$${fmt(remainingToTarget)}`, unit: "to go" }
                  : undefined
              }
              statRight={
                hasTarget && hasBoth && bestDay > 0
                  ? { value: `$${fmt(bestDay)}`, unit: "best day" }
                  : undefined
              }
              tone={
                !hasTarget
                  ? hasBoth
                    ? totalProfit < 0
                      ? "bad"
                      : "good"
                    : undefined
                  : !hasBoth
                  ? undefined
                  : progressPct >= 100
                  ? "good"
                  : totalProfit < 0
                  ? "bad"
                  : undefined
              }
rightContent={
  hasBoth && totalProfit > 0 && cs.profitSplitEnabled !== false
    ? isDesktop ? (
        <div>
          <div
            className="uppercase"
            style={{ color: palette.textFaint, letterSpacing: "0.08em", fontSize: "10px" }}
          >
            Your Cut ({cs.profitSplitPct}%)
          </div>
          <div
            style={{
              fontFamily: mono,
              fontSize: "1.1rem",
              fontWeight: 600,
              color: palette.green,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            ${fmt(splitEarnings)}
          </div>
          {linkedFirm && (
            <div style={{ color: palette.textFaint, fontSize: "10px", marginTop: "1px" }}>
              {linkedFirm.firmName} — {linkedFirm.planLabel}
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div>
            <div
              className="uppercase"
              style={{ color: palette.textFaint, letterSpacing: "0.08em", fontSize: "10px" }}
            >
              Your Cut ({cs.profitSplitPct}%)
            </div>
            {linkedFirm && (
              <div style={{ color: palette.textFaint, fontSize: "10px", marginTop: "1px" }}>
                {linkedFirm.firmName} — {linkedFirm.planLabel}
              </div>
            )}
          </div>
          <div
            style={{
              fontFamily: mono,
              fontSize: "1.1rem",
              fontWeight: 600,
              color: palette.green,
              fontVariantNumeric: "tabular-nums",
              flexShrink: 0,
              marginLeft: "8px",
            }}
          >
            ${fmt(splitEarnings)}
          </div>
        </div>
      )
    : undefined
}
            />

            <RuleRow
              label="Daily Drawdown"
              detail={
                dailyPass === undefined
                  ? "Enter starting balance below"
                  : dailyPass
                  ? `$${fmt(dailyRemaining)} of daily buffer left`
                  : `Over by $${fmt(todayLoss - dailyLossAllowed)}`
              }
              pass={dailyPass}
            />
            <RuleRow
              label="Max Drawdown"
              detail={
                overallPass === undefined
                  ? "Enter both balances below"
                  : overallPass
                  ? `$${fmt(overallRemaining)} of loss buffer left`
                  : `Below floor by $${fmt(floorBalance - currentBal)}`
              }
              pass={overallPass}
            />
            <RuleRow
              label="Consistency Rule"
              detail={
                consistencyPass === undefined
                  ? "Needs positive total profit"
                  : rule === 0
                  ? "No consistency rule set"
                  : consistencyPass
                  ? `${consistencyScore.toFixed(1)}% within the ${rule}% rule`
                  : `Need $${fmt(moreNeededForConsistency)} more total profit`
              }
              pass={consistencyPass}
            />

            <span className="block mt-6 mb-1.5 uppercase" style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}>
              Recovery
            </span>
            {!hasBoth ? (
              <p className="text-xs mb-4" style={{ color: palette.textMuted }}>
                Enter starting & current balance below to see recovery stats.
              </p>
            ) : inDrawdown ? (
              <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-2">
              <StatChip isDesktop={isDesktop} label="Current Drawdown" value={`${currentDrawdownPct.toFixed(1)}%`} />
              <StatChip isDesktop={isDesktop} label="Gain to Recover" value={`+${recoveryNeededPct.toFixed(1)}%`} />
            </div>
                <p className="text-xs mb-4" style={{ color: palette.textMuted }}>
                  ${fmt(recoveryDollar)} below your peak balance of ${fmt(peakBalance)}
                </p>
              </>
            ) : (
              <p className="text-xs mb-4" style={{ color: palette.textMuted }}>
                At or above peak balance. No recovery needed.
              </p>
            )}

            <span className="block mt-2 mb-1.5 uppercase" style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}>
              Account
            </span>
            <div className="lg:grid lg:grid-cols-2 lg:gap-4">
              <Field isDesktop={isDesktop} label="Starting Balance" value={cs.startBal} suffix="$" placeholder="10000" onChange={(e) => setCs({ ...cs, startBal: e.target.value })} />
              <Field isDesktop={isDesktop} label="Current Balance" value={cs.currentBal} suffix="$" placeholder="10650" onChange={(e) => setCs({ ...cs, currentBal: e.target.value })} />
            </div>

            <span className="block mb-1.5 uppercase" style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}>
              Profit Target
            </span>
            <div className="flex gap-2 flex-wrap mb-4">
              {PROFIT_TARGET_OPTIONS.map((opt) => {
                const active = String(cs.targetPct) === String(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setCs({ ...cs, targetPct: String(opt) })}
                    className={`px-3 py-1.5 rounded-full transition-colors ${TAP}`}
                    style={{
                      background: active ? palette.gold : palette.field,
                      color: active ? palette.letterbox : palette.textMuted,
                      border: `1px solid ${active ? palette.gold : palette.border}`,
                      fontFamily: mono,
                      fontSize: "13px",
                    }}
                  >
                    {opt}%
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setCs({ ...cs, targetPct: "instant" })}
                className={`px-3 py-1.5 rounded-full transition-colors ${TAP}`}
                style={{
                  background: !hasTarget ? palette.gold : palette.field,
                  color: !hasTarget ? palette.letterbox : palette.textMuted,
                  border: `1px solid ${!hasTarget ? palette.gold : palette.border}`,
                  fontFamily: mono,
                  fontSize: "13px",
                }}
              >
                Instant
              </button>
            </div>
            {!hasTarget && (
              <p className="text-xs -mt-2 mb-4" style={{ color: palette.textFaint }}>
                Instant challenges skip the profit target entirely.
              </p>
            )}

            <span className="block mb-1.5 uppercase" style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}>
              Daily Drawdown
            </span>
            <PillGroup options={[2, 3, 4, 5, 6]} value={cs.dailyLossPct} onChange={(v) => setCs({ ...cs, dailyLossPct: v })} />
           <div className="lg:grid lg:grid-cols-2 lg:gap-4">
            <Field isDesktop={isDesktop}  label="Loss Today" value={cs.todayLoss} suffix="$" placeholder="0" onChange={(e) => setCs({ ...cs, todayLoss: e.target.value })} />
           </div>
            <span className="block mb-1.5 uppercase" style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}>
              Max Drawdown
            </span>
            <PillGroup
              options={[4, 5, 6, 8, 10, 12]}
              value={cs.maxDrawdownPct}
              onChange={(v) => setCs({ ...cs, maxDrawdownPct: v })}
            />

            <div className="flex gap-2 mb-4">
              {[
                { id: "trail", label: "Trailing" },
                { id: "static", label: "Static" },
              ].map((m) => {
                const active = ddMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setCs({ ...cs, ddMode: m.id })}
                    className={`px-3 py-1.5 rounded-full transition-colors ${TAP}`}
                    style={{
                      background: active ? palette.gold : palette.field,
                      color: active ? palette.letterbox : palette.textMuted,
                      border: `1px solid ${active ? palette.gold : palette.border}`,
                      fontFamily: mono,
                      fontSize: "13px",
                    }}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs mb-4" style={{ color: palette.textMuted }}>
              {ddMode === "static"
                ? `Fixed at ${maxDrawdownPct}% off your starting balance \u2014 the floor never moves even as your balance grows.`
                : `Fixed at ${maxDrawdownPct}%, trailing off your peak balance (starting or current, whichever is higher).`}
            </p>

            <span className="block mb-1.5 uppercase" style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}>
              Consistency Rule
            </span>
            <PillGroup options={[0, 15, 20, 25, 30, 40]} value={cs.rule} onChange={(v) => setCs({ ...cs, rule: v })} />
           <div className="lg:grid lg:grid-cols-2 lg:gap-4">
            <Field isDesktop={isDesktop}  label="Best Single Day Profit" value={cs.bestDay} suffix="$" placeholder="800" onChange={(e) => setCs({ ...cs, bestDay: e.target.value })} />
           </div>

                       {(() => {
              const minDaysTarget = num(cs.minTradingDays);
              if (minDaysTarget <= 0) return null;
              if (!(startBal > 0)) {
                return (
                  <p className="text-xs mb-3" style={{ color: palette.textFaint }}>
                    Enter a starting balance above to track progress toward your {minDaysTarget}-day minimum.
                  </p>
                );
              }
              const tracker = computeQualifyingTradingDays(trades, startBal, cs.minDayGainPct);
              const pct = Math.min(100, (tracker.qualifyingDays / minDaysTarget) * 100);
              const met = tracker.qualifyingDays >= minDaysTarget;
              const remaining = Math.max(0, minDaysTarget - tracker.qualifyingDays);
              return (
                <div
                  className="rounded-lg p-3 mb-4"
                  style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span style={{ color: palette.text, fontSize: "13px", fontWeight: 600 }}>
                      Minimum Trading Days Tracker
                    </span>
                    <span style={{ fontFamily: mono, fontSize: "12px", color: met ? palette.green : palette.textMuted }}>
                      {tracker.qualifyingDays} / {minDaysTarget}
                    </span>
                  </div>
                  <div style={{ height: "6px", borderRadius: "999px", background: palette.field, overflow: "hidden", marginBottom: "6px" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${pct}%`,
                        background: met ? palette.green : palette.gold,
                        borderRadius: "999px",
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>
                  <div className="text-xs" style={{ color: palette.textFaint }}>
                    {met
                      ? `Requirement met \u2014 ${tracker.qualifyingDays} qualifying day${tracker.qualifyingDays === 1 ? "" : "s"} out of ${tracker.totalDaysTraded} day${tracker.totalDaysTraded === 1 ? "" : "s"} traded.`
                      : `${remaining} more qualifying day${remaining === 1 ? "" : "s"} needed. ${tracker.totalDaysTraded} day${tracker.totalDaysTraded === 1 ? "" : "s"} traded so far, ${tracker.qualifyingDays} hit the ${cs.minDayGainPct || 0}% threshold.`}
                  </div>
                </div>
              );
            })()}

<span className="block mb-1.5 mt-4 uppercase" style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}>
  Minimum Trades
</span>
<PillGroup
  options={[0, 5, 10, 20, 30, 50]}
  suffix=""
  value={cs.minTrades}
  onChange={(v) => setCs({ ...cs, minTrades: v })}
/>

             {(() => {
  const minTradesTarget = num(cs.minTrades);
  if (minTradesTarget <= 0) return null;

  const completedTrades = trades.length;
  const pct = Math.min(100, (completedTrades / minTradesTarget) * 100);
  const met = completedTrades >= minTradesTarget;
  const remaining = Math.max(0, minTradesTarget - completedTrades);

  return (
    <div
      className="rounded-lg p-3 mb-4 mt-3"
      style={{
        background: palette.surface,
        border: `1px solid ${palette.border}`,
        boxShadow: palette.shadow,
      }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span style={{ color: palette.text, fontSize: "13px", fontWeight: 600 }}>
          Minimum Trades Tracker
        </span>

        <span
          style={{
            fontFamily: mono,
            fontSize: "12px",
            color: met ? palette.green : palette.textMuted,
          }}
        >
          {completedTrades} / {minTradesTarget}
        </span>
      </div>

      <div
        style={{
          height: "6px",
          borderRadius: "999px",
          background: palette.field,
          overflow: "hidden",
          marginBottom: "6px",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: met ? palette.green : palette.gold,
            borderRadius: "999px",
            transition: "width 0.3s ease",
          }}
        />
      </div>

      <div className="text-xs" style={{ color: palette.textFaint }}>
        {met
          ? `Requirement met — ${completedTrades} trades completed.`
          : `${remaining} more trade${remaining === 1 ? "" : "s"} needed.`}
      </div>
    </div>
  );
})()}

            <div className="lg:grid lg:grid-cols-2 lg:gap-4">
              <Field isDesktop={isDesktop} label="Min Gain % per Day" value={cs.minDayGainPct} suffix="%" placeholder="0.5" onChange={(e) => setCs({ ...cs, minDayGainPct: e.target.value })} />
            </div>
            <p className="text-xs -mt-2 mb-4" style={{ color: palette.textFaint }}>
              A day only counts toward your {cs.minTradingDays || 0}-day minimum if it moves your balance by at
              least {cs.minDayGainPct || 0}%.
            </p>

<span className="block mb-1.5 uppercase" style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}>
  Profit Split
</span>
<div className="flex gap-2 flex-wrap mb-1">
  {[50, 60, 70, 80, 90, 95, 100].map((opt) => {
    const isSelected = cs.profitSplitEnabled !== false && String(cs.profitSplitPct) === String(opt);
    return (
      <button
        key={opt}
        type="button"
        onClick={() =>
          setCs({
            ...cs,
            profitSplitPct: String(opt),
            profitSplitEnabled: isSelected ? false : true,
          })
        }
        className={`px-3 py-1.5 rounded-full transition-colors ${TAP}`}
        style={{
          background: isSelected ? palette.gold : palette.field,
          color: isSelected ? palette.letterbox : palette.textMuted,
          border: `1px solid ${isSelected ? palette.gold : palette.border}`,
          fontFamily: mono,
          fontSize: "13px",
        }}
      >
        {opt}%
      </button>
    );
  })}
</div>
<p className="text-xs mb-4" style={{ color: palette.textFaint }}>
  {cs.profitSplitEnabled === false
    ? ""
    : "Your share of profits once funded — reference only, it doesn't affect any pass/fail check above. Tap the selected percentage again to turn it off."}
</p>

            <p className="text-xs mt-1" style={{ color: palette.textFaint }}>
              Limits shown are common presets, use your specific firm's rules for anything that matters.
            </p>
          </>
        ) : riskSubTab === "edge" ? (
          <>
<div
  className="rounded-xl p-4 mb-5"
  style={{
    background: palette.surface,
    border: `1px solid ${palette.border}`,
    boxShadow: palette.shadow,
  }}
>
  <div className="flex items-center justify-between mb-3">
    <div>
      <div
        className="uppercase"
        style={{
          color: palette.gold,
          fontFamily: mono,
          fontSize: "10px",
          fontWeight: 700,
          letterSpacing: "0.1em",
        }}
      >
        Edge Overview
      </div>

      <div
        style={{
          color: palette.text,
          fontSize: "17px",
          fontWeight: 700,
          marginTop: "3px",
        }}
      >
        Is this setup worth taking?
      </div>
    </div>

    <div
      className="rounded-full px-2.5 py-1"
      style={{
        background:
          !hasExpectancyInputs
            ? palette.field
            : expectancy > 0
            ? "rgba(79,201,138,0.12)"
            : "rgba(226,115,92,0.12)",
        border: `1px solid ${
          !hasExpectancyInputs
            ? palette.border
            : expectancy > 0
            ? palette.green
            : palette.red
        }`,
        color:
          !hasExpectancyInputs
            ? palette.textMuted
            : expectancy > 0
            ? palette.green
            : palette.red,
        fontFamily: mono,
        fontSize: "10px",
        fontWeight: 700,
      }}
    >
      {!hasExpectancyInputs ? "WAITING FOR DATA" : expectancy > 0 ? "POSITIVE EDGE" : "NEGATIVE EDGE"}
    </div>
  </div>


  <div
    className="rounded-lg p-3 mb-3"
    style={{
      background: palette.field,
      border: `1px solid ${palette.border}`,
    }}
  >
    <div className="flex items-end justify-between">
      <div>
        <div
          style={{
            color: palette.textFaint,
            fontSize: "10px",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Expectancy / Trade
        </div>

        <div
          style={{
            color: !hasExpectancyInputs
              ? palette.textMuted
              : expectancy > 0
              ? palette.green
              : palette.red,
            fontFamily: mono,
            fontSize: "24px",
            fontWeight: 700,
            marginTop: "4px",
          }}
        >
          {hasExpectancyInputs
            ? `${expectancy > 0 ? "+" : ""}${fmt(expectancy)}R`
            : "N/A"}
        </div>
      </div>

      <div className="text-right">
        <div style={{ color: palette.textFaint, fontSize: "10px" }}>
          {hasTotalProjection
            ? `Projected over ${fmt(totalTrades, 0)} trades`
            : "Expected value per trade"}
        </div>

        {hasTotalProjection && (
          <div
            style={{
              color: totalProjected >= 0 ? palette.green : palette.red,
              fontFamily: mono,
              fontSize: "13px",
              fontWeight: 600,
              marginTop: "3px",
            }}
          >
            {totalProjected >= 0 ? "+" : "-"}{fmt(Math.abs(totalProjected))}R
          </div>
        )}
      </div>
    </div>
  </div>

  <div
    className="rounded-lg p-3"
    style={{
      background:
        hasExpectancyInputs && computedWinRate >= targetWinRate
          ? "rgba(79,201,138,0.08)"
          : hasExpectancyInputs
          ? "rgba(226,115,92,0.08)"
          : palette.field,
      border: `1px solid ${
        hasExpectancyInputs && computedWinRate >= targetWinRate
          ? palette.green
          : hasExpectancyInputs
          ? palette.red
          : palette.border
      }`,
    }}
  >
    <div className="flex items-center justify-between">
      <span style={{ color: palette.textMuted, fontSize: "11px" }}>
        Win rate needed (with buffer)
      </span>
      <span
        style={{
          color: computedWinRate >= targetWinRate ? palette.green : palette.red,
          fontFamily: mono,
          fontSize: "13px",
          fontWeight: 700,
        }}
      >
        {targetWinRate.toFixed(1)}%
      </span>
    </div>
    <div
      style={{
        height: "5px",
        borderRadius: "999px",
        background: palette.field,
        overflow: "hidden",
        marginTop: "8px",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${Math.min(100, computedWinRate)}%`,
          background: computedWinRate >= targetWinRate ? palette.green : palette.red,
          borderRadius: "999px",
          transition: "width 0.3s ease",
        }}
      />
    </div>
    <div
      className="flex justify-between mt-1.5"
      style={{ color: palette.textFaint, fontSize: "10px", fontFamily: mono }}
    >
      <span>Current: {computedWinRate ? `${computedWinRate.toFixed(1)}%` : "0.0%"}</span>
      <span>1 : {ratio ? ratio.toFixed(2) : "0.00"} R:R</span>
    </div>
  </div>
</div>



<div
  className="rounded-xl p-4 mb-5"
  style={{
    background: palette.surface,
    border: `1px solid ${palette.border}`,
    boxShadow: palette.shadow,
  }}
>
  <div className="mb-3">
    <div
      className="uppercase"
      style={{
        color: palette.gold,
        fontFamily: mono,
        fontSize: "10px",
        fontWeight: 700,
        letterSpacing: "0.1em",
      }}
    >
      Trade Edge
    </div>

    <div
      style={{
        color: palette.text,
        fontSize: "16px",
        fontWeight: 700,
        marginTop: "3px",
      }}
    >
      Setup & Performance Profile
    </div>

    <div
      style={{
        color: palette.textFaint,
        fontSize: "11px",
        marginTop: "2px",
      }}
    >
      Define your R:R and trade history to see whether your win rate and payoff structure create a positive edge.
    </div>
  </div>

  <div className="lg:grid lg:grid-cols-2 lg:gap-4">
    <Field
      isDesktop={isDesktop}
      label="Account Balance"
      value={edge.accountBalance}
      suffix="$"
      placeholder="10000"
      onChange={(e) => setEdge({ ...edge, accountBalance: e.target.value })}
    />

    <Field
      isDesktop={isDesktop}
      label="R:R (Reward Multiple)"
      value={edge.rr}
      suffix="R"
      placeholder="2"
      onChange={(e) => setEdge({ ...edge, rr: e.target.value })}
    />

    <Field
      isDesktop={isDesktop}
      label="Total Trades"
      value={edge.totalTrades}
      placeholder="100"
      onChange={(e) => setEdge({ ...edge, totalTrades: e.target.value })}
    />

    <Field
      isDesktop={isDesktop}
      label="Winning Trades"
      value={edge.totalWinTrades}
      placeholder="60"
      onChange={(e) =>
        setEdge({
          ...edge,
          totalWinTrades: e.target.value,
          totalLossTrades:
            e.target.value === "" || edge.totalTrades === ""
              ? ""
              : String(Math.max(0, num(edge.totalTrades) - num(e.target.value))),
        })
      }
    />

    <Field
      isDesktop={isDesktop}
      label="Losing Trades"
      value={edge.totalLossTrades}
      placeholder="40"
      onChange={(e) =>
        setEdge({
          ...edge,
          totalLossTrades: e.target.value,
          totalWinTrades:
            e.target.value === "" || edge.totalTrades === ""
              ? ""
              : String(Math.max(0, num(edge.totalTrades) - num(e.target.value))),
        })
      }
    />

    <Field
      isDesktop={isDesktop}
      label="Trades / Month"
      value={edge.tradesPerMonth}
      placeholder="20"
      onChange={(e) => setEdge({ ...edge, tradesPerMonth: e.target.value })}
    />

    <Field
      isDesktop={isDesktop}
      label="Risk % / Trade"
      value={edge.riskPct}
      suffix="%"
      placeholder="1"
      onChange={(e) => setEdge({ ...edge, riskPct: e.target.value })}
    />

    <Field
      isDesktop={isDesktop}
      label="Safety Buffer"
      value={edge.buffer}
      suffix="%"
      placeholder="5"
      onChange={(e) => setEdge({ ...edge, buffer: e.target.value })}
    />
  </div>

  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-3">
    <StatChip
      isDesktop={isDesktop}
      label="Win Rate"
      value={computedWinRate ? `${computedWinRate.toFixed(1)}%` : "N/A"}
    />

    <StatChip
      isDesktop={isDesktop}
      label="Breakeven"
      value={beWin ? `${beWin.toFixed(1)}%` : "N/A"}
    />

    <StatChip
      isDesktop={isDesktop}
      label="Expectancy"
      value={
        hasExpectancyInputs
          ? `${expectancy >= 0 ? "+" : ""}${fmt(expectancy)}R`
          : "N/A"
      }
    />

    <StatChip
      isDesktop={isDesktop}
      label="Projected"
      value={
        hasTotalProjection
          ? `${totalProjected >= 0 ? "+" : "-"}${fmt(Math.abs(totalProjected))}R`
          : "N/A"
      }
    />
  </div>
</div>


<div
  className="rounded-xl p-4 mb-5"
  style={{
    background: palette.surface,
    border: `1px solid ${palette.border}`,
    boxShadow: palette.shadow,
  }}
>
  <div className="mb-3">
    <div
      className="uppercase"
      style={{
        color: palette.gold,
        fontFamily: mono,
        fontSize: "10px",
        fontWeight: 700,
        letterSpacing: "0.1em",
      }}
    >
      Long-Term Edge
    </div>
    <div style={{ color: palette.text, fontSize: "17px", fontWeight: 700, marginTop: "3px" }}>
      Projected Curve
    </div>
    <div style={{ color: palette.textFaint, fontSize: "11px", marginTop: "3px", lineHeight: 1.5 }}>
      Built from your R:R and win rate — Normal uses your actual numbers, Best/Worst shift the win
      rate by your Safety Buffer ({edge.buffer || 5}%) either direction. Pick a horizon below; trade
      count is worked out automatically from Trades / Month.
    </div>
  </div>

  <div className="flex gap-2 flex-wrap mb-4">
    {EDGE_PROJECTION_PERIODS.map((p, i) => (
      <button
        key={p.label}
        type="button"
        onClick={() => setEdgeProjectionPeriodIdx(i)}
        className={`px-3 py-1.5 rounded-full transition-colors ${TAP}`}
        style={{
          background: edgeProjectionPeriodIdx === i ? palette.gold : palette.field,
          color: edgeProjectionPeriodIdx === i ? palette.letterbox : palette.textMuted,
          border: `1px solid ${edgeProjectionPeriodIdx === i ? palette.gold : palette.border}`,
          fontFamily: mono,
          fontSize: "12.5px",
        }}
      >
        {p.label}
      </button>
    ))}
  </div>

  {!threeCurveResult ? (
    <p className="text-xs mb-1" style={{ color: palette.textFaint }}>
      Fill in R:R and Trades / Month above to see the projection for {selectedEdgePeriod.label.toLowerCase()}.
    </p>
  ) : (
    <>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: "Worst", r: threeCurveResult.worstFinalR, pnl: threeCurveResult.worstFinalPnl, color: palette.red, wr: threeCurveResult.worstWinRate },
          { label: "Normal", r: threeCurveResult.normalFinalR, pnl: threeCurveResult.normalFinalPnl, color: palette.gold, wr: threeCurveResult.normalWinRate },
          { label: "Best", r: threeCurveResult.bestFinalR, pnl: threeCurveResult.bestFinalPnl, color: palette.green, wr: threeCurveResult.bestWinRate },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-lg p-3"
            style={{ background: palette.field, border: `1px solid ${s.color}55` }}
          >
            <div className="uppercase" style={{ color: s.color, fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em" }}>
              {s.label}
            </div>
<div style={{ fontFamily: mono, fontSize: "18px", fontWeight: 700, color: s.color, marginTop: "4px" }}>
  {s.r >= 0 ? "+" : ""}{fmt(s.r)}R
</div>
{s.pnl !== null && s.pnl !== undefined && (
  <div style={{ fontFamily: mono, fontSize: "18px", fontWeight: 700, color: s.color, marginTop: "2px" }}>
    {s.pnl >= 0 ? "+" : "-"}${fmt(Math.abs(s.pnl))}
  </div>
)}
            <div style={{ fontSize: "10px", color: palette.textFaint, marginTop: "4px" }}>
              {s.wr.toFixed(1)}% win rate
            </div>
          </div>
        ))}
      </div>

      {threeCurveResult.normalFinalPnl === null && (
        <p className="text-xs mb-3" style={{ color: palette.textFaint }}>
          Add Account Balance and Risk % / Trade above to see this in dollars.
        </p>
      )}

<div style={{ width: "100%", height: isDesktop ? 320 : 260, minWidth: 0 }}>
  <ResponsiveContainer width="99%" height="100%" debounce={50}>
    <LineChart data={threeCurveResult.chartData} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={palette.border} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="trade"
              type="number"
              domain={[0, "dataMax"]}
              stroke={palette.textFaint}
              tick={{ fill: palette.textFaint, fontSize: 10, fontFamily: mono }}
              tickLine={false}
              axisLine={{ stroke: palette.border }}
            />
            <YAxis
              stroke={palette.textFaint}
              tick={{ fill: palette.textFaint, fontSize: 10, fontFamily: mono }}
              tickLine={false}
              axisLine={{ stroke: palette.border }}
              width={48}
              unit="R"
            />
            <ReferenceLine y={0} stroke={palette.textFaint} strokeDasharray="4 4" />
            <Tooltip
              contentStyle={{
                background: palette.field,
                border: `1px solid ${palette.border}`,
                borderRadius: "8px",
                fontFamily: mono,
                fontSize: "12px",
              }}
              labelStyle={{ color: palette.textMuted }}
              labelFormatter={(l) => `Trade ${l}`}
              formatter={(v, name, props) => {
                const key = name === "worst" ? "worstPnl" : name === "best" ? "bestPnl" : "normalPnl";
                const pnl = props.payload[key];
                const label = name === "worst" ? "Worst" : name === "best" ? "Best" : "Normal";
                const rLabel = `${v >= 0 ? "+" : ""}${fmt(v)}R`;
                return [pnl !== null && pnl !== undefined ? `${rLabel} (${pnl >= 0 ? "+" : "-"}$${fmt(Math.abs(pnl))})` : rLabel, label];
              }}
            />
            <Line type="monotone" dataKey="worst" stroke={palette.red} strokeWidth={1.5} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="normal" stroke={palette.gold} strokeWidth={2.5} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="best" stroke={palette.green} strokeWidth={1.5} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs mt-2" style={{ color: palette.textFaint }}>
        {threeCurveResult.trades} trades projected for {selectedEdgePeriod.label.toLowerCase()}.
      </p>
    </>
  )}
</div>
    	</>
        ) : (
          <>
            <div
              className="rounded-xl p-4 mb-5"
              style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="uppercase" style={{ color: palette.gold, fontFamily: mono, fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em" }}>
                    Position Size
                  </div>
                  <div style={{ color: palette.text, fontSize: "17px", fontWeight: 700, marginTop: "3px" }}>
                    How big should this trade be?
                  </div>
                </div>
                <div
                  className="rounded-full px-2.5 py-1"
                  style={{
                    background: riskPctEffective > 2 ? "rgba(226,115,92,0.12)" : riskPctEffective > 0 ? "rgba(79,201,138,0.12)" : palette.field,
                    border: `1px solid ${riskPctEffective > 2 ? palette.red : riskPctEffective > 0 ? palette.green : palette.border}`,
                    color: riskPctEffective > 2 ? palette.red : riskPctEffective > 0 ? palette.green : palette.textMuted,
                    fontFamily: mono,
                    fontSize: "10px",
                    fontWeight: 700,
                  }}
                >
                  {riskPctEffective > 2 ? "AGGRESSIVE" : riskPctEffective > 0 ? "WITHIN NORM" : "NO DATA"}
                </div>
              </div>

              <div className="rounded-lg p-3 mb-3" style={{ background: palette.field, border: `1px solid ${palette.border}` }}>
                <div className="flex items-end justify-between">
                  <div>
                    <div style={{ color: palette.textFaint, fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      Lot Size
                    </div>
                    <div style={{ color: palette.text, fontFamily: mono, fontSize: "28px", fontWeight: 700, marginTop: "4px" }}>
                      {fmt(lots)}
                      <span style={{ fontSize: "13px", color: palette.textFaint, marginLeft: "4px" }}>lots</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div style={{ color: palette.textFaint, fontSize: "10px" }}>Risking</div>
                    <div style={{ color: palette.green, fontFamily: mono, fontSize: "16px", fontWeight: 700, marginTop: "3px" }}>
                      ${fmt(riskAmt)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg p-3" style={{ background: palette.field, border: `1px solid ${palette.border}` }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span style={{ color: palette.textMuted, fontSize: "11px" }}>Risk relative to account</span>
                  <span style={{ color: riskPctEffective > 2 ? palette.red : palette.text, fontFamily: mono, fontSize: "13px", fontWeight: 700 }}>
                    {fmt(riskPctEffective, 2)}%
                  </span>
                </div>
                <div style={{ height: "5px", borderRadius: "999px", background: palette.border, overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.min(100, riskPctEffective * 20)}%`,
                      background: riskPctEffective > 2 ? palette.red : palette.green,
                      borderRadius: "999px",
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1.5" style={{ color: palette.textFaint, fontSize: "10px", fontFamily: mono }}>
                  <span>0%</span>
                  <span>5%+</span>
                </div>
              </div>
            </div>

            <span className="block mb-1.5 uppercase" style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}>
              Instrument
            </span>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { id: "forex", label: "Forex", icon: ArrowLeftRight },
                { id: "gold", label: "Gold", icon: Scale },
                { id: "custom", label: "Custom", icon: Pencil },
              ].map((p) => {
                const Icon = p.icon;
                const active = ps.preset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPreset(p.id)}
                    className={`flex flex-col items-center justify-center gap-1 rounded-lg py-3 transition-colors ${TAP}`}
                    style={{
                      background: active ? palette.gold : palette.field,
                      color: active ? palette.letterbox : palette.textMuted,
                      border: `1px solid ${active ? palette.gold : palette.border}`,
                    }}
                  >
                    <Icon size={15} />
                    <span style={{ fontFamily: mono, fontSize: "12px" }}>{p.label}</span>
                  </button>
                );
              })}
            </div>

           <div className="lg:grid lg:grid-cols-2 lg:gap-4">
            <Field isDesktop={isDesktop}  label="Account Balance" value={ps.balance} suffix="$" placeholder="5000" onChange={(e) => setPs({ ...ps, balance: e.target.value })} />
            {sizeRiskMode === "dollar" ? (
              <Field isDesktop={isDesktop}  label="Risk per Trade" value={ps.riskDollar} suffix="$" placeholder="100" onChange={(e) => setPs({ ...ps, riskDollar: e.target.value })} />
            ) : (
              <Field isDesktop={isDesktop}  label="Risk per Trade" value={ps.riskPct} suffix="%" placeholder="1" onChange={(e) => setPs({ ...ps, riskPct: e.target.value })} />
            )}
            <Field isDesktop={isDesktop}  label="Stop Distance" value={ps.stopPips} suffix="pips" placeholder="25" onChange={(e) => setPs({ ...ps, stopPips: e.target.value })} />
            <Field isDesktop={isDesktop}  label="Value per Pip (1.0 lot)" value={ps.valuePerPip} suffix="$" onChange={(e) => setPs({ ...ps, preset: "custom", valuePerPip: e.target.value })} />
           </div>
            <p className="text-xs mt-1" style={{ color: palette.textFaint }}>
              Pip values are typical defaults, confirm your broker's contract specs before sizing real trades.
            </p>
          </>
        )}
      </>
    );
  
  return body;
}
