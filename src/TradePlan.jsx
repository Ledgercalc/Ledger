import { useEffect, useRef, useState } from "react";
import { ArrowLeftRight, Brain, Check, Flame, Pencil, Plus, Target, Trash2, X } from "lucide-react";
import { computeGoalProgress } from "../lib/analytics.js";
import { fmt, num } from "../lib/format.js";
import { pokeCrab } from "../lib/mascot.js";
import { TAP, THEME_TRANSITION, display, mono, palette } from "../lib/theme.js";

/* ──────────────────────────────────────────────────────────────────────────
   Trade plan: four cards (Goals, Risk management, Trade setups, Psychology).

   Where the data lives (nothing new needed in App.jsx):
     goals.weeklyTargetPct / monthlyTargetPct   existing goals store (moved here from the Curve tab)
     settings.dailyLossLimit / maxTradesPerDay  the same limits the Settings tab and Curve alerts use
     settings.tradePlan                         everything else (min R:R, setup tools, written rules)
   Because it sits inside settings, it is included in backups and imports automatically.
   ────────────────────────────────────────────────────────────────────────── */

const MAX_RULES = 12;
const MAX_RULE_LEN = 160;
const newId = () => Math.random().toString(36).slice(2, 9);
const cleanNum = (v) => String(v).replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1").slice(0, 9);

const fieldStyle = {
  background: palette.field,
  border: `1px solid ${palette.border}`,
  color: palette.text,
  fontSize: "14px",
  outline: "none",
};

/* ── card shell with icon, title and the round edit button ── */
function PlanCard({ icon: Icon, title, editing, onToggle, children }) {
  return (
    <section
      className="rounded-3xl p-5 mb-4 lg:mb-0"
      style={{
        background: palette.surface,
        border: `1px solid ${palette.border}`,
        boxShadow: palette.shadow,
        transition: THEME_TRANSITION,
      }}
    >
      <div className="flex items-center gap-3 mb-5">
        <Icon size={30} strokeWidth={2.2} style={{ color: palette.text, flexShrink: 0 }} />
        <h3
          style={{
            flex: 1,
            margin: 0,
            fontFamily: display,
            fontSize: "21px",
            fontWeight: 700,
            lineHeight: 1.2,
            color: palette.text,
          }}
        >
          {title}
        </h3>
        <button
          type="button"
          onClick={onToggle}
          aria-label={editing ? `Done editing ${title}` : `Edit ${title}`}
          className={`flex items-center justify-center rounded-full flex-shrink-0 ${TAP}`}
          style={{
            width: "42px",
            height: "42px",
            background: editing ? palette.gold : palette.field,
            color: editing ? palette.letterbox : palette.text,
            transition: `${THEME_TRANSITION}, transform 0.15s ease`,
          }}
        >
          {editing ? <Check size={18} strokeWidth={2.6} /> : <Pencil size={17} />}
        </button>
      </div>
      {children}
    </section>
  );
}

/* ── a big number with a small label, like "Minimum Risk:Reward  1 : 2" ── */
function Stat({ label, value, unit, prefix, editing, onChange, placeholder }) {
  const empty = value === "" || value === undefined || value === null;
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ color: palette.textMuted, fontSize: "13px", lineHeight: 1.3, marginBottom: "6px" }}>{label}</div>
      {editing ? (
        <div className="flex items-center gap-2">
          {prefix && <span style={{ color: palette.textMuted, fontFamily: mono, fontSize: "16px", whiteSpace: "nowrap", flexShrink: 0 }}>{prefix}</span>}
          <input
            type="text"
            inputMode="decimal"
            value={empty ? "" : value}
            onChange={(e) => onChange(cleanNum(e.target.value))}
            placeholder={placeholder}
            aria-label={label}
            className="rounded-xl px-3 py-2"
            style={{ ...fieldStyle, width: "100%", minWidth: 0, fontFamily: mono, fontSize: "17px" }}
          />
          {unit && <span style={{ color: palette.textMuted, fontSize: "13px", fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}>{unit}</span>}
        </div>
      ) : empty ? (
        <div style={{ color: palette.textFaint, fontSize: "20px", fontWeight: 600 }}>Not set</div>
      ) : (
        <div className="flex items-baseline gap-1.5">
          <span style={{ fontFamily: display, fontSize: "28px", fontWeight: 700, lineHeight: 1.1, color: palette.gold }}>
            {prefix ? `${prefix} ` : ""}
            {value}
          </span>
          {unit && <span style={{ color: palette.textMuted, fontSize: "15px", fontWeight: 600 }}>{unit}</span>}
        </div>
      )}
    </div>
  );
}

/* ── written rules: paragraphs in view mode, editable rows in edit mode ── */
function RuleList({ rules, derived = [], editing, onChange, placeholder }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (adding && inputRef.current) inputRef.current.focus();
  }, [adding]);

  const full = rules.length >= MAX_RULES;
  const add = () => {
    const text = draft.trim().slice(0, MAX_RULE_LEN);
    if (!text || full) return;
    onChange([...rules, { id: newId(), text }]);
    setDraft("");
    pokeCrab("add", { say: "Rule added" });
  };
  const remove = (id) => {
    onChange(rules.filter((r) => r.id !== id));
    pokeCrab("poof", { say: "" });
  };
  const edit = (id, text) => onChange(rules.map((r) => (r.id === id ? { ...r, text: text.slice(0, MAX_RULE_LEN) } : r)));

  const para = { color: palette.text, fontSize: "16px", lineHeight: 1.55, margin: "0 0 14px" };
  const nothing = derived.length === 0 && rules.length === 0;

  return (
    <div>
      {derived.map((line, i) => (
        <p key={`d${i}`} style={para}>
          {line}
        </p>
      ))}

      {editing
        ? rules.map((r) => (
            <div key={r.id} className="flex items-start gap-2 mb-3">
              <textarea
                value={r.text}
                rows={2}
                onChange={(e) => edit(r.id, e.target.value)}
                aria-label="Rule text"
                className="flex-1 rounded-xl px-3 py-2"
                style={{ ...fieldStyle, resize: "none", lineHeight: 1.45 }}
              />
              <button
                type="button"
                onClick={() => remove(r.id)}
                aria-label={`Remove rule: ${r.text}`}
                className={`flex items-center justify-center rounded-full flex-shrink-0 ${TAP}`}
                style={{ width: "34px", height: "34px", marginTop: "4px", background: palette.field, color: palette.red }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))
        : rules.map((r) => (
            <p key={r.id} style={para}>
              {r.text}
            </p>
          ))}

      {nothing && !editing && !adding && (
        <p style={{ ...para, color: palette.textFaint, fontSize: "14px" }}>
          No rules yet. Add the ones you refuse to break.
        </p>
      )}

      {adding ? (
        <div className="flex items-center gap-2 mt-1">
          <input
            ref={inputRef}
            type="text"
            value={draft}
            maxLength={MAX_RULE_LEN}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              } else if (e.key === "Escape") {
                setDraft("");
                setAdding(false);
              }
            }}
            placeholder={placeholder}
            aria-label="New rule"
            className="flex-1 rounded-xl px-3 py-2.5"
            style={fieldStyle}
          />
          <button
            type="button"
            onClick={add}
            aria-label="Add rule"
            className={`flex items-center justify-center rounded-xl flex-shrink-0 ${TAP}`}
            style={{ width: "42px", height: "42px", background: palette.gold, color: palette.letterbox }}
          >
            <Plus size={18} strokeWidth={2.4} />
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft("");
              setAdding(false);
            }}
            aria-label="Cancel"
            className={`flex items-center justify-center rounded-xl flex-shrink-0 ${TAP}`}
            style={{ width: "42px", height: "42px", background: palette.field, color: palette.textMuted }}
          >
            <X size={17} />
          </button>
        </div>
      ) : full ? (
        <p style={{ color: palette.textFaint, fontSize: "12px", margin: 0 }}>Up to {MAX_RULES} rules per card.</p>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className={`flex items-center gap-1.5 ${TAP}`}
          style={{ color: palette.textMuted, fontSize: "16px", fontWeight: 600, padding: "4px 0", background: "transparent" }}
        >
          <Plus size={16} strokeWidth={2.4} />
          Add a new rule
        </button>
      )}
    </div>
  );
}

/* ── the whole tab body ── */
export default function TradePlan({ settings, persistSettings, goals: goalsProp, persistGoals, startingBalance, trades }) {
  const goals = goalsProp || { weeklyTargetPct: "", monthlyTargetPct: "" };
  const plan = settings.tradePlan || {};
  const [editing, setEditing] = useState({ goals: false, risk: false, setups: false, psych: false });

  const toggle = (k) => {
    const was = editing[k];
    setEditing((e) => ({ ...e, [k]: !was }));
    pokeCrab(was ? "save" : "look", { say: was ? "Plan saved" : "" });
  };
  const sec = (k) => plan[k] || {};
  const savePlan = (k, patch) => persistSettings({ ...settings, tradePlan: { ...plan, [k]: { ...sec(k), ...patch } } });

  /* Goals */
  const startBal = num(startingBalance);
  const wPct = num(goals.weeklyTargetPct);
  const mPct = num(goals.monthlyTargetPct);
  const hasW = goals.weeklyTargetPct !== "" && wPct > 0;
  const hasM = goals.monthlyTargetPct !== "" && mPct > 0;
  const about = (pct) => (startBal > 0 ? ` (about $${fmt((startBal * pct) / 100, 0)})` : "");
  const goalLines = [];
  if (hasW && hasM) {
    goalLines.push(`My goal is to grow my account ${wPct}% each week${about(wPct)}, aiming for a consistent ${mPct}% per month${about(mPct)}.`);
  } else if (hasW) {
    goalLines.push(`My goal is to grow my account ${wPct}% each week${about(wPct)}.`);
  } else if (hasM) {
    goalLines.push(`My goal is to grow my account ${mPct}% per month${about(mPct)}.`);
  }
  const periods = [
    { key: "weeklyTargetPct", period: "week", label: "This week" },
    { key: "monthlyTargetPct", period: "month", label: "This month" },
  ];

  /* Risk */
  const risk = sec("risk");
  const ddNum = num(settings.dailyLossLimit);
  const rrNum = num(risk.minRR);
  const tradesNum = num(settings.maxTradesPerDay);
  const riskLines = [];
  if (rrNum > 0) riskLines.push(`I will only take trades that offer at least 1:${rrNum} risk to reward.`);
  if (ddNum > 0) riskLines.push(`I will stop trading for the day once I have lost ${ddNum} USD.`);
  if (tradesNum > 0) riskLines.push(`I will take no more than ${tradesNum} trade${tradesNum === 1 ? "" : "s"} in a single day.`);

  const setups = sec("setups");
  const psych = sec("psychology");

  return (
    <div className="mb-6">
      <div className="lg:grid lg:grid-cols-2 lg:gap-4 lg:items-start">
        {/* ═══ Goals ═══ */}
        <PlanCard icon={Target} title="Goals" editing={editing.goals} onToggle={() => toggle("goals")}>
          <div className="grid grid-cols-2 gap-4 mb-5">
            <Stat
              label="Weekly Target"
              value={goals.weeklyTargetPct}
              unit="%"
              editing={editing.goals}
              placeholder="2.5"
              onChange={(v) => {
                persistGoals({ ...goals, weeklyTargetPct: v });
                pokeCrab("type");
              }}
            />
            <Stat
              label="Monthly Target"
              value={goals.monthlyTargetPct}
              unit="%"
              editing={editing.goals}
              placeholder="10"
              onChange={(v) => {
                persistGoals({ ...goals, monthlyTargetPct: v });
                pokeCrab("type");
              }}
            />
          </div>

          {(hasW || hasM) && (
            <div className="mb-5">
              {periods.map(({ key, period, label }, idx) => {
                const targetPct = num(goals[key]);
                if (!(goals[key] !== "" && targetPct > 0)) return null;
                const progress = computeGoalProgress(trades || [], startBal, period);
                const pct = progress ? progress.pct : 0;
                const toward = Math.max(0, Math.min(100, (pct / targetPct) * 100));
                const met = pct >= targetPct;
                return (
                  <div key={key} style={{ marginBottom: idx === 0 && hasW && hasM ? "14px" : 0 }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span style={{ color: palette.textMuted, fontSize: "13px" }}>{label}</span>
                      <span
                        style={{
                          fontFamily: mono,
                          fontSize: "12px",
                          color: !startBal ? palette.textFaint : met ? palette.green : pct < 0 ? palette.red : palette.textMuted,
                        }}
                      >
                        {startBal ? `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%` : "N/A"} / {targetPct}%
                      </span>
                    </div>
                    <div style={{ height: "6px", borderRadius: "999px", background: palette.field, overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${toward}%`,
                          background: met ? palette.green : palette.gold,
                          borderRadius: "999px",
                          transition: "width 0.3s ease",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
              {!startBal && (
                <p style={{ color: palette.textFaint, fontSize: "12px", margin: "10px 0 0" }}>
                  Set a starting balance on the Curve tab so progress can be shown as a percentage.
                </p>
              )}
            </div>
          )}

          <RuleList
            rules={sec("goals").rules || []}
            derived={goalLines}
            editing={editing.goals}
            onChange={(next) => savePlan("goals", { rules: next })}
            placeholder="e.g. Protect the week's profit once I'm up"
          />
        </PlanCard>

        {/* ═══ Risk management ═══ */}
        <PlanCard icon={Flame} title="Risk Management" editing={editing.risk} onToggle={() => toggle("risk")}>
          <div className="grid grid-cols-2 gap-x-4 gap-y-5 mb-5">
            <Stat
              label="Minimum Risk:Reward"
              value={risk.minRR}
              prefix="1 :"
              editing={editing.risk}
              placeholder="2"
              onChange={(v) => {
                savePlan("risk", { minRR: v });
                pokeCrab("type");
              }}
            />
            <Stat
              label="Maximum Daily Drawdown"
              value={settings.dailyLossLimit}
              unit="USD"
              editing={editing.risk}
              placeholder="100"
              onChange={(v) => {
                persistSettings({ ...settings, dailyLossLimit: v });
                pokeCrab("type");
              }}
            />
            <Stat
              label="Max Trades per Day"
              value={settings.maxTradesPerDay}
              unit="trades"
              editing={editing.risk}
              placeholder="3"
              onChange={(v) => {
                persistSettings({ ...settings, maxTradesPerDay: v });
                pokeCrab("type");
              }}
            />
          </div>
          <RuleList
            rules={risk.rules || []}
            derived={riskLines}
            editing={editing.risk}
            onChange={(next) => savePlan("risk", { rules: next })}
            placeholder="e.g. Never move my stop further away"
          />
        </PlanCard>

        {/* ═══ Trade setups ═══ */}
        <PlanCard icon={ArrowLeftRight} title="Trade Setups" editing={editing.setups} onToggle={() => toggle("setups")}>
          {(editing.setups || setups.tools) && (
            <div className="mb-5">
              <div style={{ color: palette.textMuted, fontSize: "13px", marginBottom: "6px" }}>Setup tools</div>
              {editing.setups ? (
                <input
                  type="text"
                  value={setups.tools || ""}
                  maxLength={80}
                  onChange={(e) => {
                    savePlan("setups", { tools: e.target.value });
                    pokeCrab("type");
                  }}
                  placeholder="e.g. Volume Profile, VWAP, 20 EMA"
                  aria-label="Setup tools"
                  className="w-full rounded-xl px-3 py-2.5"
                  style={fieldStyle}
                />
              ) : (
                <div style={{ color: palette.text, fontSize: "17px", fontWeight: 700 }}>{setups.tools}</div>
              )}
            </div>
          )}
          <RuleList
            rules={setups.rules || []}
            editing={editing.setups}
            onChange={(next) => savePlan("setups", { rules: next })}
            placeholder="e.g. I will enter on a retest of the value area"
          />
        </PlanCard>

        {/* ═══ Psychology ═══ */}
        <PlanCard icon={Brain} title="Psychology Rules" editing={editing.psych} onToggle={() => toggle("psych")}>
          <RuleList
            rules={psych.rules || []}
            editing={editing.psych}
            onChange={(next) => savePlan("psychology", { rules: next })}
            placeholder="e.g. I will walk away after two losses in a row"
          />
        </PlanCard>
      </div>
    </div>
  );
}
