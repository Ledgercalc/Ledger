import { useState } from "react";
import { Brain, Check, ChevronDown, ClipboardCheck, Crosshair, Flame, Plus, ShieldCheck, Target, Trash2, TrendingUp, X } from "lucide-react";
import { computeGoalProgress, computeInsights } from "../lib/analytics.js";
import { MAX_CUSTOM_SETUPS, MAX_PLAYBOOK_RULES, SETUPS } from "../lib/constants.js";
import { dayKeyFromDate, dayKeyFromTs, fmtMoney, fmtThousands, formatDayLabel, num } from "../lib/format.js";
import { computePlaybookStats, isCleanCheckin } from "../lib/playbook.js";
import { TAP, THEME_TRANSITION, display, mono, palette } from "../lib/theme.js";

const AMBER = "#E5A93B";

const signed = (v) => `${v > 0 ? "+" : v < 0 ? "-" : ""}$${fmtMoney(v)}`;
const pnlColor = (v) => (v > 0 ? palette.green : v < 0 ? palette.red : palette.textMuted);

function PlanSection({ icon: Icon, title, summary, badge, badgeTone, className = "", children }) {
  const [open, setOpen] = useState(true);
  const toneColor = badgeTone === "good" ? palette.green : badgeTone === "bad" ? palette.red : palette.textMuted;
  return (
    <section
      className={`rounded-2xl overflow-hidden ${className}`}
      style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow, transition: THEME_TRANSITION }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 text-left"
        style={{ padding: "16px 18px", background: "transparent" }}
      >
        <span
          className="flex items-center justify-center flex-shrink-0"
          style={{ width: 40, height: 40, borderRadius: 12, background: `${palette.gold}2A`, color: palette.goldBright }}
        >
          <Icon size={20} strokeWidth={2.1} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block" style={{ fontFamily: display, fontSize: "16px", fontWeight: 600, color: palette.text, letterSpacing: "-0.005em" }}>
            {title}
          </span>
          <span className="block" style={{ fontSize: "12px", color: palette.textFaint, marginTop: 2 }}>
            {summary}
          </span>
        </span>
        {badge && (
          <span
            className="flex-shrink-0"
            style={{ fontSize: "11.5px", fontWeight: 600, color: toneColor, background: palette.field, border: `1px solid ${palette.border}`, borderRadius: 999, padding: "3px 10px" }}
          >
            {badge}
          </span>
        )}
        <ChevronDown
          size={16}
          className="flex-shrink-0"
          style={{ color: palette.textFaint, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s ease" }}
        />
      </button>
      {open && <div style={{ padding: "16px 18px 18px", borderTop: `1px solid ${palette.border}` }}>{children}</div>}
    </section>
  );
}

function SubHead({ children, right }) {
  return (
    <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
      <span style={{ color: palette.textMuted, fontSize: "12.5px", fontWeight: 600 }}>{children}</span>
      {right}
    </div>
  );
}

function PlanInput({ label, value, onChange, prefix, suffix, placeholder, inputMode = "decimal", maxLength, onEnter }) {
  return (
    <label className="block min-w-0">
      {label && <span className="block" style={{ color: palette.textFaint, fontSize: "11.5px", marginBottom: 5 }}>{label}</span>}
      <span
        className="flex items-center"
        style={{ background: palette.field, border: `1px solid ${palette.border}`, borderRadius: 10, padding: "0 12px" }}
      >
        {prefix && <span style={{ color: palette.textFaint, fontSize: "13px", paddingRight: 4 }}>{prefix}</span>}
        <input
          type="text"
          inputMode={inputMode}
          value={value ?? ""}
          maxLength={maxLength}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onEnter ? (e) => { if (e.key === "Enter") { e.preventDefault(); onEnter(); } } : undefined}
          placeholder={placeholder}
          className="w-full bg-transparent outline-none min-w-0"
          style={{ color: palette.text, fontFamily: mono, fontSize: "13.5px", padding: "9px 0" }}
        />
        {suffix && <span style={{ color: palette.textFaint, fontSize: "13px", paddingLeft: 4 }}>{suffix}</span>}
      </span>
    </label>
  );
}

function Meter({ label, valueText, ratio }) {
  const r = Math.max(0, Math.min(1, ratio));
  const color = ratio >= 1 ? palette.red : ratio >= 0.6 ? AMBER : palette.green;
  return (
    <div style={{ marginBottom: 12 }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 5 }}>
        <span style={{ color: palette.text, fontSize: "12.5px" }}>{label}</span>
        <span style={{ color, fontFamily: mono, fontSize: "12px", fontWeight: 600 }}>{valueText}</span>
      </div>
      <div style={{ height: 7, borderRadius: 999, background: palette.field, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${r * 100}%`, background: color, borderRadius: 999, transition: "width 0.3s ease" }} />
      </div>
    </div>
  );
}

function StatTile({ icon: Icon, label, value, unit }) {
  return (
    <div style={{ background: palette.field, border: `1px solid ${palette.border}`, borderRadius: 12, padding: "10px 12px" }}>
      <div className="flex items-center gap-1" style={{ color: palette.textFaint, fontSize: "11.5px" }}>
        <Icon size={12} />
        {label}
      </div>
      <div style={{ fontFamily: display, fontWeight: 700, fontSize: "1.2rem", color: palette.text, marginTop: 2 }}>
        {value}
        <span style={{ fontSize: "11px", color: palette.textFaint, fontWeight: 500 }}>{unit}</span>
      </div>
    </div>
  );
}

function AddRow({ value, onChange, onSubmit, placeholder, maxLength, ariaLabel }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 min-w-0">
        <PlanInput value={value} onChange={onChange} placeholder={placeholder} maxLength={maxLength} inputMode="text" onEnter={onSubmit} />
      </div>
      <button
        type="button"
        onClick={onSubmit}
        className={`flex items-center justify-center flex-shrink-0 ${TAP}`}
        style={{ width: 40, height: 40, borderRadius: 10, background: palette.gold, color: "#fff" }}
        aria-label={ariaLabel}
      >
        <Plus size={18} strokeWidth={2.4} />
      </button>
    </div>
  );
}

export default function TradePlan(props) {
  const {
    isDesktop,
    settings,
    persistSettings,
    trades,
    startingBalance,
    goals,
    persistGoals,
    customSetups,
    customMoods,
    hiddenDefaultSetupIds,
    newSetupName,
    setNewSetupName,
    confirmAddSetup,
    setupError,
    setSetupError,
    playbookRules,
    playbookRulesLoaded,
    playbookCheckins,
    playbookMsg,
    playbookRuleError,
    newRuleText,
    setNewRuleText,
    setPlaybookRuleError,
    addPlaybookRule,
    removePlaybookRule,
    todayResults,
    toggleTodayResult,
    submitCheckin,
    deletePlaybookCheckin,
  } = props;

  const setSetting = (key, value) => persistSettings({ ...settings, [key]: value });
  const startBal = num(startingBalance);
  const todayKey = dayKeyFromDate(new Date());
  const insights = computeInsights(trades, customSetups, customMoods);

  // ---- Goals
  const goalRows = [
    { key: "weeklyTargetPct", period: "week", label: "This week" },
    { key: "monthlyTargetPct", period: "month", label: "This month" },
  ].map((g) => {
    const target = num(goals[g.key]);
    const hasTarget = goals[g.key] !== "" && target > 0;
    const progress = computeGoalProgress(trades, startBal, g.period);
    const pct = progress ? progress.pct : 0;
    return { ...g, target, hasTarget, progress, pct, met: hasTarget && !!progress && pct >= target };
  });
  const goalsSet = goalRows.filter((g) => g.hasTarget).length;
  const goalsMet = goalRows.filter((g) => g.met).length;

  // ---- Risk
  const riskPct = num(settings.planRiskPerTradePct);
  const lossLimit = num(settings.dailyLossLimit);
  const maxTrades = num(settings.maxTradesPerDay);
  const todayTrades = trades.filter((t) => dayKeyFromTs(t.ts) === todayKey);
  const todayPnl = todayTrades.reduce((s, t) => s + t.pnl, 0);
  const lossUsed = Math.max(0, -todayPnl);
  const riskLimitsSet = [riskPct > 0, num(settings.planMinRR) > 0, lossLimit > 0, maxTrades > 0].filter(Boolean).length;
  const breached = (lossLimit > 0 && lossUsed >= lossLimit) || (maxTrades > 0 && todayTrades.length >= maxTrades);

  // ---- Setups
  const visibleDefaults = SETUPS.filter((s) => !(hiddenDefaultSetupIds || []).includes(s.id));
  const setupList = [...visibleDefaults, ...customSetups];
  const setupStats = {};
  insights.setupRows.forEach((r) => { setupStats[r.id] = r; });

  // ---- Psychology + rules
  const stats = computePlaybookStats(playbookRules, playbookCheckins);
  const ruleStatById = {};
  stats.ruleStats.forEach((r) => { ruleStatById[r.id] = r; });
  const alreadyCheckedInToday = playbookCheckins.some((c) => c.date === todayKey);
  const recentCheckins = [...playbookCheckins].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)).slice(0, 7);
  const rateColor = (pct) => (pct === null ? palette.textFaint : pct >= 80 ? palette.green : pct >= 50 ? AMBER : palette.red);

  return (
    <div className={isDesktop ? "grid grid-cols-2 gap-5 items-start" : "flex flex-col gap-4"} style={{ marginBottom: 24 }}>
      {/* GOALS */}
      <PlanSection
        icon={Target}
        title="Goals"
        summary="Weekly and monthly return targets"
        badge={goalsSet ? `${goalsMet} of ${goalsSet} met` : "Not set"}
        badgeTone={goalsSet && goalsMet === goalsSet ? "good" : undefined}
      >
        {goalRows.map((g, idx) => (
          <div key={g.key} style={{ marginBottom: idx === 0 ? 20 : 0 }}>
            <div className="flex items-baseline justify-between" style={{ marginBottom: 6 }}>
              <span style={{ color: palette.text, fontSize: "13.5px", fontWeight: 600 }}>{g.label}</span>
              <span style={{ fontFamily: mono, fontSize: "12.5px", color: !startBal ? palette.textFaint : g.met ? palette.green : g.pct < 0 ? palette.red : palette.textMuted }}>
                {startBal ? `${g.pct >= 0 ? "+" : ""}${g.pct.toFixed(1)}%` : "N/A"}
                {g.hasTarget ? ` of ${g.target}%` : ""}
              </span>
            </div>
            <div style={{ height: 8, borderRadius: 999, background: palette.field, overflow: "hidden", marginBottom: 6 }}>
              <div
                style={{
                  height: "100%",
                  width: `${g.hasTarget ? Math.max(0, Math.min(100, (g.pct / g.target) * 100)) : 0}%`,
                  background: g.met ? palette.green : palette.gold,
                  borderRadius: 999,
                  transition: "width 0.3s ease",
                }}
              />
            </div>
            <div className="flex items-center justify-between" style={{ marginBottom: 10, fontSize: "11.5px", color: palette.textFaint }}>
              <span>{g.progress ? `${g.progress.count} trade${g.progress.count === 1 ? "" : "s"}` : "No balance set"}</span>
              <span style={{ color: g.progress ? pnlColor(g.progress.netPnl) : palette.textFaint, fontFamily: mono }}>
                {g.progress ? signed(g.progress.netPnl) : ""}
              </span>
            </div>
            <PlanInput
              label="Target return"
              value={goals[g.key]}
              onChange={(v) => persistGoals({ ...goals, [g.key]: v })}
              placeholder="e.g. 3"
              suffix="%"
            />
          </div>
        ))}
        {!startBal && (
          <p style={{ color: palette.textFaint, fontSize: "12px", marginTop: 14 }}>
            Set a starting balance on the Curve tab so progress can be measured as a percentage.
          </p>
        )}
      </PlanSection>

      {/* RISK MANAGEMENT */}
      <PlanSection
        icon={ShieldCheck}
        title="Risk management"
        summary="The limits you agree to before the market opens"
        badge={breached ? "Limit reached" : riskLimitsSet ? `${riskLimitsSet} of 4 set` : "Not set"}
        badgeTone={breached ? "bad" : undefined}
      >
        <div className="grid grid-cols-2 gap-3" style={{ marginBottom: 6 }}>
          <PlanInput label="Max risk per trade" value={settings.planRiskPerTradePct} onChange={(v) => setSetting("planRiskPerTradePct", v)} suffix="%" placeholder="1" />
          <PlanInput label="Minimum reward : risk" value={settings.planMinRR} onChange={(v) => setSetting("planMinRR", v)} prefix="1 :" placeholder="2" />
          <PlanInput label="Daily loss limit" value={settings.dailyLossLimit} onChange={(v) => setSetting("dailyLossLimit", v)} prefix="$" placeholder="200" />
          <PlanInput label="Max trades per day" value={settings.maxTradesPerDay} onChange={(v) => setSetting("maxTradesPerDay", v)} inputMode="numeric" placeholder="5" />
        </div>
        {riskPct > 0 && startBal > 0 && (
          <p style={{ color: palette.textFaint, fontSize: "12px", marginBottom: 6 }}>
            About ${fmtThousands((startBal * riskPct) / 100)} at risk per trade on a ${fmtThousands(startBal, 0)} account.
          </p>
        )}

        <div style={{ marginTop: 16 }}>
          <SubHead>Today</SubHead>
          {lossLimit > 0 || maxTrades > 0 ? (
            <>
              {lossLimit > 0 && <Meter label="Daily loss used" valueText={`$${fmtMoney(lossUsed)} of $${fmtMoney(lossLimit)}`} ratio={lossUsed / lossLimit} />}
              {maxTrades > 0 && <Meter label="Trades taken" valueText={`${todayTrades.length} of ${maxTrades}`} ratio={todayTrades.length / maxTrades} />}
            </>
          ) : (
            <p style={{ color: palette.textFaint, fontSize: "12px" }}>Set a daily loss limit or trade cap to track today's usage here.</p>
          )}
        </div>

        <button
          type="button"
          onClick={() => setSetting("revengeLockEnabled", !settings.revengeLockEnabled)}
          className={`w-full flex items-center gap-3 text-left ${TAP}`}
          style={{ marginTop: 14, padding: "12px 14px", borderRadius: 12, background: palette.field, border: `1px solid ${palette.border}` }}
          role="switch"
          aria-checked={!!settings.revengeLockEnabled}
        >
          <span className="flex-1 min-w-0">
            <span className="block" style={{ color: palette.text, fontSize: "13px", fontWeight: 600 }}>Cooldown after a loss</span>
            <span className="block" style={{ color: palette.textFaint, fontSize: "11.5px", marginTop: 2 }}>Warns you before a trade opened right after a loss.</span>
          </span>
          <span
            className="flex-shrink-0"
            style={{ width: 38, height: 22, borderRadius: 999, background: settings.revengeLockEnabled ? palette.gold : palette.border, position: "relative", transition: "background 0.15s ease" }}
          >
            <span style={{ position: "absolute", top: 3, left: settings.revengeLockEnabled ? 19 : 3, width: 16, height: 16, borderRadius: 999, background: "#fff", transition: "left 0.15s ease" }} />
          </span>
        </button>
        {settings.revengeLockEnabled && (
          <div style={{ marginTop: 10 }}>
            <PlanInput label="Cooldown window" value={settings.revengeWindowMinutes} onChange={(v) => setSetting("revengeWindowMinutes", v)} suffix="min" inputMode="numeric" placeholder="15" />
          </div>
        )}
      </PlanSection>

      {/* TRADING SETUPS */}
      <PlanSection
        icon={Crosshair}
        title="Trading setups"
        summary="The only patterns you are allowed to trade"
        badge={`${setupList.length} setup${setupList.length === 1 ? "" : "s"}`}
      >
        <div style={{ marginBottom: 14 }}>
          {setupList.map((s, i) => {
            const st = setupStats[s.id];
            return (
              <div
                key={s.id}
                className="flex items-center justify-between gap-3"
                style={{ padding: "11px 0", borderTop: i === 0 ? "none" : `1px solid ${palette.border}` }}
              >
                <div className="min-w-0">
                  <div style={{ color: palette.text, fontSize: "13.5px", fontWeight: 600 }}>{s.label}</div>
                  <div style={{ color: palette.textFaint, fontSize: "11.5px", marginTop: 2 }}>
                    {st ? `${st.count} trade${st.count === 1 ? "" : "s"}, ${Math.round(st.winRate)}% win rate` : "No trades tagged yet"}
                  </div>
                </div>
                {st && <span style={{ color: pnlColor(st.pnl), fontFamily: mono, fontSize: "13px", fontWeight: 700, flexShrink: 0 }}>{signed(st.pnl)}</span>}
              </div>
            );
          })}
        </div>
        {customSetups.length < MAX_CUSTOM_SETUPS ? (
          <AddRow
            value={newSetupName}
            onChange={(v) => { setNewSetupName(v); if (setupError) setSetupError(""); }}
            onSubmit={confirmAddSetup}
            placeholder="Add a setup, e.g. Range fade"
            maxLength={20}
            ariaLabel="Add setup"
          />
        ) : (
          <p style={{ color: palette.textFaint, fontSize: "12px" }}>You have reached the limit of {MAX_CUSTOM_SETUPS} custom setups.</p>
        )}
        {setupError && <p style={{ color: palette.red, fontSize: "12px", marginTop: 8 }}>{setupError}</p>}
        <p style={{ color: palette.textFaint, fontSize: "12px", marginTop: 10 }}>Tag a setup when you log a trade and its results build up here.</p>
      </PlanSection>

      {/* PSYCHOLOGY */}
      <PlanSection
        icon={Brain}
        title="Psychology"
        summary="How your state of mind and discipline affect results"
        badge={stats.hasData ? `${stats.current}-day clean streak` : undefined}
        badgeTone={stats.current > 0 ? "good" : undefined}
        className={isDesktop ? "col-span-2" : ""}
      >
        <div className={isDesktop ? "grid grid-cols-2 gap-8" : ""}>
          <div style={{ marginBottom: isDesktop ? 0 : 22 }}>
            <SubHead>Mood and results</SubHead>
            {insights.moodRows.length === 0 ? (
              <p style={{ color: palette.textFaint, fontSize: "12px" }}>Tag a mood on your trades to see which states help or hurt your P&amp;L.</p>
            ) : (
              insights.moodRows.map((m, i) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-3"
                  style={{ padding: "10px 0", borderTop: i === 0 ? "none" : `1px solid ${palette.border}` }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span style={{ fontSize: "18px" }}>{m.emoji}</span>
                    <div className="min-w-0">
                      <div style={{ color: palette.text, fontSize: "13.5px", fontWeight: 600 }}>{m.label}</div>
                      <div style={{ color: palette.textFaint, fontSize: "11.5px" }}>{m.count} trade{m.count === 1 ? "" : "s"}, {Math.round(m.winRate)}% win rate</div>
                    </div>
                  </div>
                  <span style={{ color: pnlColor(m.pnl), fontFamily: mono, fontSize: "13px", fontWeight: 700, flexShrink: 0 }}>{signed(m.pnl)}</span>
                </div>
              ))
            )}
            <div
              className="flex items-center justify-between gap-3"
              style={{ marginTop: 12, padding: "11px 14px", borderRadius: 12, background: insights.revengeCount > 0 ? `${palette.red}14` : palette.field, border: `1px solid ${insights.revengeCount > 0 ? `${palette.red}44` : palette.border}` }}
            >
              <span className="flex items-center gap-2" style={{ color: palette.text, fontSize: "13px" }}>
                <Flame size={15} style={{ color: insights.revengeCount > 0 ? palette.red : palette.textFaint }} />
                Revenge trades
              </span>
              <span style={{ fontFamily: mono, fontSize: "12.5px", color: insights.revengeCount > 0 ? palette.red : palette.textMuted, fontWeight: 600 }}>
                {insights.revengeCount > 0 ? `${insights.revengeCount} costing ${signed(insights.revengePnl)}` : "None detected"}
              </span>
            </div>
          </div>

          <div>
            <SubHead right={<span style={{ color: palette.textFaint, fontSize: "11.5px", fontFamily: mono }}>{formatDayLabel(todayKey)}</span>}>
              Daily rule check-in
            </SubHead>
            {!playbookRulesLoaded ? (
              <p style={{ color: palette.textFaint, fontSize: "12px" }}>Loading rules{"\u2026"}</p>
            ) : playbookRules.length === 0 ? (
              <div className="text-center" style={{ padding: 18, borderRadius: 12, border: `1px dashed ${palette.border}` }}>
                <ClipboardCheck size={20} style={{ color: palette.textFaint, margin: "0 auto 6px" }} />
                <p style={{ color: palette.textFaint, fontSize: "12px" }}>Add a rule below to start checking in.</p>
              </div>
            ) : (
              <div style={{ borderRadius: 12, border: `1px solid ${palette.border}`, overflow: "hidden" }}>
                {playbookRules.map((r, i) => {
                  const followed = !!todayResults[r.id];
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => toggleTodayResult(r.id)}
                      className={`w-full flex items-center gap-3 px-3.5 py-3 text-left ${TAP}`}
                      style={{ background: followed ? `${palette.green}14` : "transparent", borderTop: i === 0 ? "none" : `1px solid ${palette.border}` }}
                    >
                      <span
                        className="flex items-center justify-center flex-shrink-0"
                        style={{ width: 20, height: 20, borderRadius: 6, border: `1.5px solid ${followed ? palette.green : palette.textFaint}`, background: followed ? palette.green : "transparent", color: "#fff" }}
                      >
                        {followed && <Check size={13} strokeWidth={3} />}
                      </span>
                      <span style={{ color: followed ? palette.text : palette.textMuted, fontSize: "13px", flex: 1 }}>{r.text}</span>
                    </button>
                  );
                })}
                <div style={{ padding: 10, background: palette.field, borderTop: `1px solid ${palette.border}` }}>
                  <button
                    type="button"
                    onClick={submitCheckin}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 ${TAP}`}
                    style={{ background: palette.gold, color: "#fff", borderRadius: 10, fontSize: "13px", fontWeight: 600 }}
                  >
                    <ClipboardCheck size={16} />
                    {alreadyCheckedInToday ? "Update today's check-in" : "Save today's check-in"}
                  </button>
                </div>
              </div>
            )}
            {playbookMsg && <p style={{ color: palette.goldBright, fontSize: "12px", marginTop: 8 }}>{playbookMsg}</p>}

            {playbookRulesLoaded && stats.hasData && (
              <div className="grid grid-cols-3 gap-2.5" style={{ marginTop: 14 }}>
                <StatTile icon={Flame} label="Streak" value={stats.current} unit="d" />
                <StatTile icon={TrendingUp} label="Best" value={stats.best} unit="d" />
                <StatTile icon={Target} label="Clean" value={stats.overallPct} unit="%" />
              </div>
            )}

            <div style={{ marginTop: 20 }}>
              <SubHead>Your rules</SubHead>
              {playbookRulesLoaded && playbookRules.map((r) => {
                const rs = ruleStatById[r.id];
                const pct = rs ? rs.pct : null;
                return (
                  <div key={r.id} style={{ padding: "9px 0", borderTop: `1px solid ${palette.border}` }}>
                    <div className="flex items-center justify-between gap-2">
                      <span style={{ color: palette.text, fontSize: "13px", flex: 1 }}>{r.text}</span>
                      <span style={{ fontFamily: mono, fontSize: "11.5px", color: rateColor(pct), flexShrink: 0 }}>{pct === null ? "\u2014" : `${pct}%`}</span>
                      <button type="button" onClick={() => removePlaybookRule(r.id)} className={`flex-shrink-0 ${TAP}`} style={{ color: palette.textFaint }} aria-label={`Remove rule: ${r.text}`}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                    {pct !== null && (
                      <div style={{ height: 4, borderRadius: 999, background: palette.field, overflow: "hidden", marginTop: 7 }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: rateColor(pct), borderRadius: 999, transition: "width 0.3s ease" }} />
                      </div>
                    )}
                  </div>
                );
              })}
              {playbookRulesLoaded && playbookRules.length < MAX_PLAYBOOK_RULES && (
                <div style={{ marginTop: 10 }}>
                  <AddRow
                    value={newRuleText}
                    onChange={(v) => { setNewRuleText(v); if (playbookRuleError) setPlaybookRuleError(""); }}
                    onSubmit={addPlaybookRule}
                    placeholder="New rule, e.g. Min 1:2 R:R"
                    maxLength={80}
                    ariaLabel="Add rule"
                  />
                </div>
              )}
              {playbookRuleError && <p style={{ color: palette.red, fontSize: "12px", marginTop: 8 }}>{playbookRuleError}</p>}
              <p style={{ color: palette.textFaint, fontSize: "11.5px", marginTop: 8 }}>
                Up to {MAX_PLAYBOOK_RULES} rules. Removing a rule only affects future check-ins.
              </p>
            </div>

            {recentCheckins.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <SubHead>Recent check-ins</SubHead>
                {recentCheckins.map((c) => {
                  const clean = isCleanCheckin(c);
                  const total = Object.keys(c.results || {}).length;
                  const followedCount = Object.values(c.results || {}).filter(Boolean).length;
                  return (
                    <div key={c.id} className="flex items-center justify-between" style={{ padding: "9px 0", borderTop: `1px solid ${palette.border}` }}>
                      <div className="flex items-center gap-2.5">
                        <span
                          className="flex items-center justify-center rounded-full flex-shrink-0"
                          style={{ width: 18, height: 18, background: clean ? `${palette.green}26` : `${palette.red}1E`, color: clean ? palette.green : palette.red }}
                        >
                          {clean ? <Check size={11} strokeWidth={3} /> : <X size={11} strokeWidth={3} />}
                        </span>
                        <span style={{ color: palette.text, fontSize: "13px" }}>{formatDayLabel(c.date)}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span style={{ fontFamily: mono, fontSize: "11px", color: palette.textMuted }}>{followedCount}/{total} followed</span>
                        <button type="button" onClick={() => deletePlaybookCheckin(c.id)} className={TAP} style={{ color: palette.textFaint }} aria-label={`Delete check-in for ${formatDayLabel(c.date)}`}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </PlanSection>
    </div>
  );
}
