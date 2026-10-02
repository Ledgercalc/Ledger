import { useState } from "react";
import { Brain, Check, ClipboardCheck, Crosshair, Flame, Pencil, Plus, Target, Trash2, X } from "lucide-react";
import { computeGoalProgress } from "../lib/analytics.js";
import { MAX_PLAYBOOK_RULES } from "../lib/constants.js";
import { dayKeyFromDate, dayKeyFromTs, fmtMoney, formatDayLabel, num } from "../lib/format.js";
import { computePlaybookStats, isCleanCheckin } from "../lib/playbook.js";
import { TAP, THEME_TRANSITION, display, mono, palette } from "../lib/theme.js";

const MAX_PLAN_LINES = 12;
const AMBER = "#E5A93B";

function Card({ icon: Icon, title, editing, onToggle, isDesktop, children }) {
  return (
    <section
      style={{
        background: palette.surface,
        border: `1px solid ${palette.border}`,
        borderRadius: 24,
        boxShadow: palette.shadow,
        padding: isDesktop ? "26px 28px 24px" : "20px 20px 18px",
        transition: THEME_TRANSITION,
        minWidth: 0,
        boxSizing: "border-box",
      }}
    >
      <div className="flex items-center gap-3" style={{ marginBottom: 20 }}>
        <Icon size={isDesktop ? 28 : 24} strokeWidth={2.2} style={{ color: palette.text, flexShrink: 0 }} />
        <h3
          className="flex-1 min-w-0"
          style={{ fontFamily: display, fontWeight: 700, fontSize: isDesktop ? "22px" : "20px", color: palette.text, margin: 0, letterSpacing: "-0.01em", lineHeight: 1.15 }}
        >
          {title}
        </h3>
        <button
          type="button"
          onClick={onToggle}
          className={`flex items-center justify-center flex-shrink-0 ${TAP}`}
          style={{
            width: 42,
            height: 42,
            borderRadius: 999,
            background: editing ? palette.gold : palette.field,
            color: editing ? "#fff" : palette.text,
            transition: "background 0.15s ease",
          }}
          aria-label={editing ? `Done editing ${title}` : `Edit ${title}`}
        >
          {editing ? <Check size={19} strokeWidth={2.6} /> : <Pencil size={18} strokeWidth={2.2} />}
        </button>
      </div>
      {children}
    </section>
  );
}

function BigValue({ label, value, unit, prefix, editing, onChange, placeholder, inputMode = "decimal", text, isDesktop }) {
  const size = isDesktop ? "30px" : "28px";
  return (
    <div className="min-w-0">
      <div style={{ color: palette.textMuted, fontSize: "14px", marginBottom: 4 }}>{label}</div>
      {editing ? (
        <div className="flex items-baseline gap-1.5" style={{ borderBottom: `2px solid ${palette.gold}`, paddingBottom: 2 }}>
          {prefix && <span style={{ color: palette.textMuted, fontSize: "16px", fontWeight: 600 }}>{prefix}</span>}
          <input
            type="text"
            inputMode={text ? "text" : inputMode}
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            aria-label={label}
            className="bg-transparent outline-none w-full min-w-0"
            style={{ color: palette.goldBright, fontFamily: display, fontWeight: 700, fontSize: size, padding: 0 }}
          />
          {unit && <span style={{ color: palette.textMuted, fontSize: "15px", fontWeight: 600 }}>{unit}</span>}
        </div>
      ) : (
        <div className="flex items-baseline gap-1.5 min-w-0">
          {prefix && value !== "" && value != null && <span style={{ color: palette.textMuted, fontSize: "16px", fontWeight: 600 }}>{prefix}</span>}
          <span className="truncate" style={{ color: value ? palette.goldBright : palette.textFaint, fontFamily: display, fontWeight: 700, fontSize: size, lineHeight: 1.1 }}>
            {value ? value : "\u2014"}
          </span>
          {unit && value ? <span style={{ color: palette.textMuted, fontSize: "15px", fontWeight: 600 }}>{unit}</span> : null}
        </div>
      )}
    </div>
  );
}

function Meter({ label, valueText, ratio }) {
  const color = ratio >= 1 ? palette.red : ratio >= 0.6 ? AMBER : palette.green;
  return (
    <div style={{ marginTop: 16 }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
        <span style={{ color: palette.textMuted, fontSize: "14px" }}>{label}</span>
        <span style={{ color, fontFamily: mono, fontSize: "14px", fontWeight: 600 }}>{valueText}</span>
      </div>
      <div style={{ height: 8, borderRadius: 999, background: palette.field, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${Math.max(0, Math.min(1, ratio)) * 100}%`, background: color, borderRadius: 999, transition: "width 0.3s ease" }} />
      </div>
    </div>
  );
}

const ruleText = { color: palette.text, fontSize: "15px", lineHeight: 1.5 };

function AddLink({ onAdd, placeholder, disabled, value, onValueChange, maxLength = 140 }) {
  // Uncontrolled by default (text kept here, onAdd(text)); controlled when value/onValueChange are given
  // (text lives in the parent, onAdd() is called with no argument after the parent state is current).
  const controlled = typeof onValueChange === "function";
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState("");
  if (disabled) return null;
  const text = controlled ? value || "" : local;
  const setText = controlled ? onValueChange : setLocal;
  const submit = () => {
    const t = text.trim();
    if (!t) return;
    if (controlled) onAdd();
    else {
      onAdd(t);
      setLocal("");
    }
  };
  const close = () => {
    setOpen(false);
    setText("");
  };
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={TAP}
        style={{ color: palette.textMuted, fontSize: "15px", fontWeight: 600, marginTop: 14, padding: "4px 0" }}
      >
        + Add a new rule
      </button>
    );
  }
  return (
    <div className="flex items-center gap-2" style={{ marginTop: 14 }}>
      <input
        autoFocus
        type="text"
        value={text}
        maxLength={maxLength}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); submit(); }
          if (e.key === "Escape") close();
        }}
        placeholder={placeholder}
        className="flex-1 min-w-0 outline-none"
        style={{ background: palette.field, border: `1px solid ${palette.border}`, borderRadius: 12, color: palette.text, fontSize: "15px", padding: "10px 14px" }}
      />
      <button
        type="button"
        onClick={submit}
        className={`flex items-center justify-center flex-shrink-0 ${TAP}`}
        style={{ width: 42, height: 42, borderRadius: 12, background: palette.gold, color: "#fff" }}
        aria-label="Add rule"
      >
        <Plus size={19} strokeWidth={2.4} />
      </button>
      <button
        type="button"
        onClick={close}
        className={`flex items-center justify-center flex-shrink-0 ${TAP}`}
        style={{ width: 42, height: 42, borderRadius: 12, background: palette.field, color: palette.textMuted }}
        aria-label="Cancel"
      >
        <X size={18} />
      </button>
    </div>
  );
}

// A list of plain-text rules stored as an array of strings inside settings.tradePlan.
function RuleLines({ lines, editing, onChange, emptyText, placeholder }) {
  const setLine = (i, v) => onChange(lines.map((l, idx) => (idx === i ? v : l)));
  const removeLine = (i) => onChange(lines.filter((_, idx) => idx !== i));
  return (
    <>
      {lines.length === 0 && !editing && <p style={{ color: palette.textFaint, fontSize: "15px", margin: 0 }}>{emptyText}</p>}
      <div className="flex flex-col" style={{ gap: editing ? 10 : 16 }}>
        {lines.map((l, i) =>
          editing ? (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={l}
                maxLength={140}
                onChange={(e) => setLine(i, e.target.value)}
                aria-label={`Rule ${i + 1}`}
                className="flex-1 min-w-0 outline-none"
                style={{ background: palette.field, border: `1px solid ${palette.border}`, borderRadius: 12, color: palette.text, fontSize: "15px", padding: "10px 14px" }}
              />
              <button type="button" onClick={() => removeLine(i)} className={`flex-shrink-0 ${TAP}`} style={{ color: palette.red, padding: 6 }} aria-label={`Delete rule ${i + 1}`}>
                <Trash2 size={18} />
              </button>
            </div>
          ) : (
            <p key={i} style={{ ...ruleText, margin: 0 }}>{l}</p>
          )
        )}
      </div>
      <AddLink
        placeholder={placeholder}
        disabled={lines.length >= MAX_PLAN_LINES}
        onAdd={(t) => onChange([...lines, t])}
      />
    </>
  );
}

export default function TradePlan(props) {
  const {
    isDesktop,
    settings,
    persistSettings,
    trades,
    startingBalance,
    goals: goalsProp,
    persistGoals,
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

  const goals = goalsProp || { weeklyTargetPct: "", monthlyTargetPct: "" };
  const plan = settings.tradePlan || {};
  const [editing, setEditing] = useState({ goals: false, risk: false, setups: false, psych: false });
  const toggle = (k) => setEditing((e) => ({ ...e, [k]: !e[k] }));
  const setPlan = (patch) => persistSettings({ ...settings, tradePlan: { ...plan, ...patch } });
  const setSetting = (k, v) => persistSettings({ ...settings, [k]: v });
  const lines = (k) => (Array.isArray(plan[k]) ? plan[k] : []);

  // Goals
  const startBal = num(startingBalance);
  const monthTarget = num(goals.monthlyTargetPct);
  const weekTarget = num(goals.weeklyTargetPct);
  const monthProg = computeGoalProgress(trades, startBal, "month");
  const weekProg = computeGoalProgress(trades, startBal, "week");
  const goalBar = (label, target, prog) => {
    if (!(target > 0) || !prog) return null;
    return <Meter key={label} label={label} valueText={`${prog.pct >= 0 ? "+" : ""}${prog.pct.toFixed(1)}% of ${target}%`} ratio={prog.pct / target} />;
  };

  // Risk
  const lossLimit = num(settings.dailyLossLimit);
  const todayKey = dayKeyFromDate(new Date());
  const todayPnl = trades.filter((t) => dayKeyFromTs(t.ts) === todayKey).reduce((s, t) => s + t.pnl, 0);
  const lossUsed = Math.max(0, -todayPnl);

  // Psychology
  const stats = computePlaybookStats(playbookRules, playbookCheckins);
  const alreadyCheckedInToday = playbookCheckins.some((c) => c.date === todayKey);
  const recent = [...playbookCheckins].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)).slice(0, 5);
  const canAddPsych = playbookRulesLoaded && playbookRules.length < MAX_PLAYBOOK_RULES;

  const grid2 = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "18px 16px", marginBottom: 22, alignItems: "end" };

  return (
    <div
      style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(2, minmax(0, 1fr))" : "minmax(0, 1fr)", gap: isDesktop ? 20 : 16, alignItems: "stretch", marginBottom: 24 }}
    >
      {/* GOALS */}
      <Card icon={Target} title="My Goal" editing={editing.goals} onToggle={() => toggle("goals")} isDesktop={isDesktop}>
        <div style={grid2}>
          <BigValue label="Monthly Target" value={goals.monthlyTargetPct} unit="%" editing={editing.goals} onChange={(v) => persistGoals({ ...goals, monthlyTargetPct: v })} placeholder="10" isDesktop={isDesktop} />
          <BigValue label="Weekly Target" value={goals.weeklyTargetPct} unit="%" editing={editing.goals} onChange={(v) => persistGoals({ ...goals, weeklyTargetPct: v })} placeholder="3" isDesktop={isDesktop} />
        </div>
        {startBal > 0 && monthTarget > 0 && !editing.goals && (
          <p style={{ ...ruleText, margin: "0 0 4px" }}>
            Aiming for about ${fmtMoney((startBal * monthTarget) / 100)} a month{weekTarget > 0 ? ` and $${fmtMoney((startBal * weekTarget) / 100)} a week` : ""} on a ${fmtMoney(startBal)} account.
          </p>
        )}
        {!startBal && (monthTarget > 0 || weekTarget > 0) && (
          <p style={{ color: palette.textFaint, fontSize: "14px", margin: "0 0 4px" }}>Set a starting balance in the Curve tab to track progress toward these targets.</p>
        )}
        {goalBar("This month", monthTarget, monthProg)}
        {goalBar("This week", weekTarget, weekProg)}
        <div style={{ marginTop: 22 }}>
          <RuleLines lines={lines("goalNotes")} editing={editing.goals} onChange={(v) => setPlan({ goalNotes: v })} emptyText="Write what you want from trading, in your own words." placeholder="e.g. Earn 50 USD each trading day" />
        </div>
      </Card>

      {/* RISK MANAGEMENT */}
      <Card icon={Flame} title="Risk Management" editing={editing.risk} onToggle={() => toggle("risk")} isDesktop={isDesktop}>
        <div style={grid2}>
          <BigValue label="Minimum Risk:Reward" value={plan.minRR} prefix="1 :" editing={editing.risk} onChange={(v) => setPlan({ minRR: v })} placeholder="2" isDesktop={isDesktop} />
          <BigValue label="Maximum Daily Drawdown" value={settings.dailyLossLimit} prefix="$" editing={editing.risk} onChange={(v) => setSetting("dailyLossLimit", v)} placeholder="100" isDesktop={isDesktop} />
          <BigValue label="Max Risk Per Trade" value={plan.riskPerTradePct} unit="%" editing={editing.risk} onChange={(v) => setPlan({ riskPerTradePct: v })} placeholder="1" isDesktop={isDesktop} />
          <BigValue label="Max Trades Per Day" value={settings.maxTradesPerDay} editing={editing.risk} inputMode="numeric" onChange={(v) => setSetting("maxTradesPerDay", v)} placeholder="5" isDesktop={isDesktop} />
        </div>
        {lossLimit > 0 && !editing.risk && (
          <div style={{ marginBottom: 22, marginTop: -6 }}>
            <Meter label="Today's loss vs. daily limit" valueText={`$${fmtMoney(lossUsed)} of $${fmtMoney(lossLimit)}`} ratio={lossUsed / lossLimit} />
          </div>
        )}
        <RuleLines lines={lines("riskRules")} editing={editing.risk} onChange={(v) => setPlan({ riskRules: v })} emptyText="Add the risk rules you will not break." placeholder="e.g. I will not risk more than 100 USD in a day" />
      </Card>

      {/* TRADE SETUPS */}
      <Card icon={Crosshair} title="Trade Setups" editing={editing.setups} onToggle={() => toggle("setups")} isDesktop={isDesktop}>
        <div style={{ marginBottom: 22 }}>
          <BigValue label="Setup tools" value={plan.setupTools} text editing={editing.setups} onChange={(v) => setPlan({ setupTools: v })} placeholder="e.g. Volume Profile, Order Blocks" isDesktop={isDesktop} />
        </div>
        <RuleLines lines={lines("setupRules")} editing={editing.setups} onChange={(v) => setPlan({ setupRules: v })} emptyText="Write exactly when you enter and when you exit." placeholder="e.g. I will exit when price reaches my profit target" />
      </Card>

      {/* PSYCHOLOGY */}
      <Card icon={Brain} title="Psychology Rules" editing={editing.psych} onToggle={() => toggle("psych")} isDesktop={isDesktop}>
        {!playbookRulesLoaded ? (
          <p style={{ color: palette.textFaint, fontSize: "15px", margin: 0 }}>Loading rules{"\u2026"}</p>
        ) : (
          <>
            {playbookRules.length === 0 && <p style={{ color: palette.textFaint, fontSize: "15px", margin: 0 }}>Add the habits you want to keep under pressure.</p>}
            <div className="flex flex-col" style={{ gap: 4 }}>
              {playbookRules.map((r) => {
                const followed = !!todayResults[r.id];
                return (
                  <div key={r.id} className="flex items-center gap-3">
                    {!editing.psych && (
                      <button
                        type="button"
                        onClick={() => toggleTodayResult(r.id)}
                        className={`flex items-center justify-center flex-shrink-0 ${TAP}`}
                        style={{ width: 26, height: 26, borderRadius: 8, border: `2px solid ${followed ? palette.green : palette.textFaint}`, background: followed ? palette.green : "transparent", color: "#fff" }}
                        aria-label={`${followed ? "Unmark" : "Mark"} followed today: ${r.text}`}
                        aria-pressed={followed}
                      >
                        {followed && <Check size={16} strokeWidth={3} />}
                      </button>
                    )}
                    <span className="flex-1 min-w-0" style={{ ...ruleText, padding: "7px 0" }}>{r.text}</span>
                    {editing.psych && (
                      <button type="button" onClick={() => removePlaybookRule(r.id)} className={`flex-shrink-0 ${TAP}`} style={{ color: palette.red, padding: 6 }} aria-label={`Delete rule: ${r.text}`}>
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <AddLink
              value={newRuleText}
              onValueChange={(v) => { setNewRuleText(v); if (playbookRuleError) setPlaybookRuleError(""); }}
              onAdd={addPlaybookRule}
              maxLength={80}
              disabled={!canAddPsych}
              placeholder="e.g. No trades within 15 minutes of a loss"
            />
            {playbookRuleError && <p style={{ color: palette.red, fontSize: "14px", marginTop: 8 }}>{playbookRuleError}</p>}

            {playbookRules.length > 0 && !editing.psych && (
              <button
                type="button"
                onClick={submitCheckin}
                className={`w-full flex items-center justify-center gap-2 ${TAP}`}
                style={{ marginTop: 20, padding: "13px 0", borderRadius: 14, background: palette.gold, color: "#fff", fontSize: "15px", fontWeight: 600 }}
              >
                <ClipboardCheck size={18} />
                {alreadyCheckedInToday ? "Update today's check-in" : "Save today's check-in"}
              </button>
            )}
            {playbookMsg && <p style={{ color: palette.goldBright, fontSize: "14px", marginTop: 10 }}>{playbookMsg}</p>}

            {stats.hasData && (
              <div className="grid grid-cols-3 gap-2.5" style={{ marginTop: 18 }}>
                {[["Streak", `${stats.current}d`], ["Best", `${stats.best}d`], ["Clean days", stats.overallPct === null ? "\u2014" : `${stats.overallPct}%`]].map(([l, v]) => (
                  <div key={l} style={{ background: palette.field, borderRadius: 14, padding: "10px 12px" }}>
                    <div style={{ color: palette.textFaint, fontSize: "13px" }}>{l}</div>
                    <div style={{ color: palette.text, fontFamily: display, fontWeight: 700, fontSize: "19px", marginTop: 2 }}>{v}</div>
                  </div>
                ))}
              </div>
            )}

            {recent.length > 0 && (
              <div style={{ marginTop: 18 }}>
                <div style={{ color: palette.textMuted, fontSize: "14px", fontWeight: 600, marginBottom: 6 }}>Recent check-ins</div>
                {recent.map((c) => {
                  const clean = isCleanCheckin(c);
                  const total = Object.keys(c.results || {}).length;
                  const done = Object.values(c.results || {}).filter(Boolean).length;
                  return (
                    <div key={c.id} className="flex items-center justify-between" style={{ padding: "8px 0", borderTop: `1px solid ${palette.border}` }}>
                      <div className="flex items-center gap-2.5">
                        <span className="flex items-center justify-center rounded-full flex-shrink-0" style={{ width: 18, height: 18, background: clean ? `${palette.green}26` : `${palette.red}1E`, color: clean ? palette.green : palette.red }}>
                          {clean ? <Check size={11} strokeWidth={3} /> : <X size={11} strokeWidth={3} />}
                        </span>
                        <span style={{ color: palette.text, fontSize: "15px" }}>{formatDayLabel(c.date)}</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span style={{ fontFamily: mono, fontSize: "13px", color: palette.textMuted }}>{done}/{total}</span>
                        <button type="button" onClick={() => deletePlaybookCheckin(c.id)} className={TAP} style={{ color: palette.textFaint }} aria-label={`Delete check-in for ${formatDayLabel(c.date)}`}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
