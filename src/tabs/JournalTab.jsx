import { pokeCrab } from "../lib/mascot.js";
import { OnboardingTip } from "../components/onboarding.jsx";
import TradePlan from "../components/TradePlan.jsx";
import { CONFIDENCE_OPTIONS, EMOTIONS, JOURNAL_COLUMNS, JOURNAL_DETAIL_FIELDS, JOURNAL_TOGGLE_COL_WIDTH, MAX_JOURNAL_PHOTOS_PER_ROW, MAX_PLAYBOOK_RULES, OUTCOME_OPTIONS, SETUPS, TREND_OPTIONS } from "../lib/constants.js";
import { MONTH_NAMES, MONTH_SHORT, dayKeyFromDate, formatDayLabel, pad2 } from "../lib/format.js";
import { computePlaybookStats, isCleanCheckin } from "../lib/playbook.js";
import { MARKET_SESSIONS } from "../lib/sessions.js";
import { TAP, THEME_TRANSITION, mono, palette } from "../lib/theme.js";
import { Camera, Check, ChevronDown, ChevronLeft, ChevronRight, ClipboardCheck, Download, Flame, Plus, Target, Trash2, TrendingUp, Upload, X } from "lucide-react";
import { Fragment } from "react";

export default function JournalTab(props) {
  const {
    goals,
    persistGoals,
    startingBalance,
    trades,
    addJournalRow: addJournalRowProp,
    addPlaybookRule: addPlaybookRuleProp,
    addingSetup,
    cancelAddSetup,
    confirmAddSetup: confirmAddSetupProp,
    customMoods,
    customSetups,
    deleteJournalRow: deleteJournalRowProp,
    deletePlaybookCheckin: deletePlaybookCheckinProp,
    endJournalResize,
    exportJournalCSV: exportJournalCSVProp,
    handleJournalCellKeyDown,
    handleJournalPhotoChange: handleJournalPhotoChangeProp,
    hiddenDefaultSetupIds,
    importJournalCSV: importJournalCSVProp,
    isDesktop,
    isNarrowScreen,
    journalCellRefs,
    journalColWidths,
    journalEntries,
    journalExpandedRows,
    journalExportMsg,
    journalImportInputRef,
    journalImportMsg,
    journalLoaded,
    journalMonth,
    journalPhotoError,
    journalPhotoInputRef,
    journalPhotoSaving,
    journalPhotoTarget,
    journalSubTab,
    journalYear,
    moveJournalResize,
    newRuleText,
    newSetupName,
    openJournalPhotoPicker,
    persistSettings,
    playbookCheckins,
    playbookMsg,
    playbookRuleError,
    playbookRules,
    playbookRulesLoaded,
    removePlaybookRule: removePlaybookRuleProp,
    renderSubNav,
    setJournalMonth,
    setJournalSubTab: setJournalSubTabProp,
    setJournalYear,
    setNewRuleText,
    setNewSetupName,
    setPendingJournalPhotoDelete,
    setPlaybookRuleError,
    setSetupError,
    setViewingJournalPhoto,
    settings,
    setupError,
    startJournalResize,
    submitCheckin: submitCheckinProp,
    todayResults,
    toggleJournalRowExpanded,
    toggleTodayResult: toggleTodayResultProp,
    triggerJournalImport,
    updateJournalField: updateJournalFieldProp,
    updateJournalPnl: updateJournalPnlProp
  } = props;
  // ── Mascot reactions: wrap the handlers so every action pokes the crab ──
  const withCrab = (fn, mood, detail) => (...args) => {
    pokeCrab(mood, detail);
    return fn(...args);
  };
  const addJournalRow = withCrab(addJournalRowProp, "add");
  const addPlaybookRule = withCrab(addPlaybookRuleProp, "add");
  const confirmAddSetup = withCrab(confirmAddSetupProp, "add");
  const deleteJournalRow = withCrab(deleteJournalRowProp, "poof");
  const deletePlaybookCheckin = withCrab(deletePlaybookCheckinProp, "poof");
  const removePlaybookRule = withCrab(removePlaybookRuleProp, "poof");
  const exportJournalCSV = withCrab(exportJournalCSVProp, "save");
  const importJournalCSV = withCrab(importJournalCSVProp, "add", { say: "Importing" });
  const handleJournalPhotoChange = withCrab(handleJournalPhotoChangeProp, "check", { say: "Photo added" });
  const setJournalSubTab = withCrab(setJournalSubTabProp, "look");
  const updateJournalField = withCrab(updateJournalFieldProp, "type");
  const updateJournalPnl = withCrab(updateJournalPnlProp, "type");
  const submitCheckin = (...args) => {
    const clean = playbookRules.length > 0 && playbookRules.every((r) => todayResults[r.id]);
    pokeCrab(clean ? "party" : "check", { say: clean ? "Clean day!" : "Checked in" });
    return submitCheckinProp(...args);
  };
  const toggleTodayResult = (id, ...rest) => {
    pokeCrab(todayResults[id] ? "look" : "check", { say: "" });
    return toggleTodayResultProp(id, ...rest);
  };
  let body = null;
    const JOURNAL_SUB_TABS = [
      { id: "log", label: "Journal" },
      { id: "playbook", label: "Trade plan" },
    ];

    const journalSubNav = renderSubNav(JOURNAL_SUB_TABS, journalSubTab, setJournalSubTab);

    if (journalSubTab === "playbook") {
      const stats = computePlaybookStats(playbookRules, playbookCheckins);
      const todayKey = dayKeyFromDate(new Date());
      const alreadyCheckedInToday = playbookCheckins.some((c) => c.date === todayKey);
      const recentCheckins = [...playbookCheckins]
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
        .slice(0, 7);

      body = (
        <>
          {journalSubNav}

          <TradePlan
            settings={settings}
            persistSettings={persistSettings}
            goals={goals}
            persistGoals={persistGoals}
            startingBalance={startingBalance}
            trades={trades}
          />

          <OnboardingTip
            id="playbook-intro"
            text="Write your plan in the cards above, then check off which rules you followed each day below to build a discipline streak, separate from your P&L."
            settings={settings}
            persistSettings={persistSettings}
          />

          <div className="flex items-center justify-between mb-1.5">
            <span
              className="uppercase"
              style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
            >
              Today's Check-In
            </span>
            <span style={{ color: palette.textFaint, fontSize: "11px", fontFamily: mono }}>
              {formatDayLabel(todayKey)}
            </span>
          </div>

          {!playbookRulesLoaded ? (
            <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
              Loading trade plan…
            </p>
          ) : playbookRules.length === 0 ? (
            <div
              className="rounded-2xl p-6 mb-6 text-center"
              style={{ background: palette.surface, border: `1px dashed ${palette.border}` }}
            >
              <ClipboardCheck size={22} style={{ color: palette.textFaint, margin: "0 auto 8px" }} />
              <p className="text-xs" style={{ color: palette.textFaint }}>
                Add a rule below to start checking in against your trade plan.
              </p>
            </div>
          ) : (
            <div
              className="rounded-2xl overflow-hidden mb-2"
              style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow, transition: THEME_TRANSITION }}
            >
              {playbookRules.map((r, i) => {
                const followed = !!todayResults[r.id];
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => toggleTodayResult(r.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left ${TAP}`}
                    style={{
                      background: followed ? `${palette.green}12` : "transparent",
                      borderBottom: i < playbookRules.length - 1 ? `1px solid ${palette.border}` : "none",
                    }}
                  >
                    <span
                      className="flex items-center justify-center rounded-md flex-shrink-0"
                      style={{
                        width: "20px",
                        height: "20px",
                        border: `1.5px solid ${followed ? palette.green : palette.textFaint}`,
                        background: followed ? palette.green : "transparent",
                        color: palette.letterbox,
                      }}
                    >
                      {followed && <Check size={13} strokeWidth={3} />}
                    </span>
                    <span style={{ color: followed ? palette.text : palette.textMuted, fontSize: "13px", flex: 1 }}>
                      {r.text}
                    </span>
                  </button>
                );
              })}
              <div className="p-3" style={{ borderTop: `1px solid ${palette.border}`, background: palette.field }}>
                <button
                  type="button"
                  onClick={submitCheckin}
                  className={`w-full flex items-center justify-center gap-2 rounded-lg py-2.5 ${TAP}`}
                  style={{
                    background: palette.gold,
                    color: palette.letterbox,
                    fontFamily: mono,
                    fontSize: "13px",
                    fontWeight: 600,
                    transition: `${THEME_TRANSITION}, transform 0.15s ease`,
                  }}
                >
                  <ClipboardCheck size={16} />
                  {alreadyCheckedInToday ? "Update Today's Check-In" : "Save Today's Check-In"}
                </button>
              </div>
            </div>
          )}
          {playbookMsg && (
            <p className="text-xs mb-4" style={{ color: palette.gold }}>
              {playbookMsg}
            </p>
          )}
          {!playbookMsg && <div className="mb-4" />}

          {playbookRulesLoaded && stats.hasData && (
            <>
              <span
                className="block mb-1.5 uppercase"
                style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
              >
                Check-In Stats
              </span>
              <div className="grid grid-cols-3 gap-3 lg:gap-4 mb-6">
                <div
                  className={isDesktop ? "rounded-lg p-5" : "rounded-lg p-3"}
                  style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow, transition: THEME_TRANSITION }}
                >
                  <div
                    className="flex items-center gap-1 mb-1"
                    style={{ color: palette.textFaint, fontSize: isDesktop ? "12px" : "10px", letterSpacing: "0.06em" }}
                  >
                    <Flame size={isDesktop ? 13 : 11} style={{ color: stats.current > 0 ? palette.gold : palette.textFaint }} />
                    STREAK
                  </div>
                  <div style={{ fontFamily: mono, fontSize: isDesktop ? "1.6rem" : "1.1rem", color: palette.text }}>
                    {stats.current}
                    <span style={{ fontSize: "11px", color: palette.textFaint }}>d</span>
                  </div>
                </div>
                <div
                  className={isDesktop ? "rounded-lg p-5" : "rounded-lg p-3"}
                  style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow, transition: THEME_TRANSITION }}
                >
                  <div
                    className="flex items-center gap-1 mb-1"
                    style={{ color: palette.textFaint, fontSize: isDesktop ? "12px" : "10px", letterSpacing: "0.06em" }}
                  >
                    <TrendingUp size={isDesktop ? 13 : 11} />
                    BEST
                  </div>
                  <div style={{ fontFamily: mono, fontSize: isDesktop ? "1.6rem" : "1.1rem", color: palette.text }}>
                    {stats.best}
                    <span style={{ fontSize: isDesktop ? "13px" : "11px", color: palette.textFaint }}>d</span>
                  </div>
                </div>
                <div
                  className={isDesktop ? "rounded-lg p-5" : "rounded-lg p-3"}
                  style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow, transition: THEME_TRANSITION }}
                >
                  <div
                    className="flex items-center gap-1 mb-1"
                    style={{ color: palette.textFaint, fontSize: isDesktop ? "12px" : "10px", letterSpacing: "0.06em" }}
                  >
                    <Target size={isDesktop ? 13 : 11} />
                    CLEAN
                  </div>
                  <div style={{ fontFamily: mono, fontSize: isDesktop ? "1.6rem" : "1.1rem", color: palette.text }}>
                    {stats.overallPct}
                    <span style={{ fontSize: isDesktop ? "13px" : "11px", color: palette.textFaint }}>%</span>
                  </div>
                </div>
              </div>

              <span
                className="block mb-1.5 uppercase"
                style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
              >
                Per-Rule Follow Rate
              </span>
              <div
                className="rounded-2xl p-4 mb-6"
                style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow, transition: THEME_TRANSITION }}
              >
                {stats.ruleStats.map((r, i) => (
                  <div key={r.id} style={{ marginBottom: i < stats.ruleStats.length - 1 ? "14px" : 0 }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span style={{ color: palette.text, fontSize: "12px", flex: 1, marginRight: "8px" }}>{r.text}</span>
                      <span
                        style={{
                          fontFamily: mono,
                          fontSize: "11px",
                          color: r.pct === null ? palette.textFaint : r.pct >= 80 ? palette.green : r.pct >= 50 ? palette.gold : palette.red,
                          flexShrink: 0,
                        }}
                      >
                        {r.pct === null ? "\u2014" : `${r.pct}%`}
                      </span>
                    </div>
                    <div style={{ height: "5px", borderRadius: "999px", background: palette.field, overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${r.pct ?? 0}%`,
                          background:
                            r.pct === null ? "transparent" : r.pct >= 80 ? palette.green : r.pct >= 50 ? palette.gold : palette.red,
                          borderRadius: "999px",
                          transition: "width 0.3s ease",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <span
            className="block mb-1.5 uppercase"
            style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
          >
            Your Rules
          </span>
          {playbookRulesLoaded && playbookRules.length > 0 && (
            <div className="mb-2">
              {playbookRules.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-lg px-3 py-3 mb-2"
                  style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow, transition: THEME_TRANSITION }}
                >
                  <span style={{ color: palette.text, fontSize: "13px", flex: 1, marginRight: "8px" }}>{r.text}</span>
                  <button
                    type="button"
                    onClick={() => removePlaybookRule(r.id)}
                    className={`flex-shrink-0 ${TAP}`}
                    style={{ color: palette.textFaint }}
                    aria-label={`Remove rule: ${r.text}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {playbookRulesLoaded && playbookRules.length < MAX_PLAYBOOK_RULES && (
            <div className="flex items-center gap-2 mb-1">
              <input
                type="text"
                value={newRuleText}
                onChange={(e) => {
                  setNewRuleText(e.target.value);
                  if (playbookRuleError) setPlaybookRuleError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addPlaybookRule();
                  }
                }}
                placeholder="New rule, e.g. Min 1:2 R:R"
                maxLength={80}
                className="flex-1 rounded-lg px-3 py-2.5 bg-transparent outline-none"
                style={{
                  background: palette.field,
                  border: `1px solid ${palette.border}`,
                  color: palette.text,
                  fontSize: "13px",
                }}
              />
              <button
                type="button"
                onClick={addPlaybookRule}
                className={`flex items-center justify-center rounded-lg flex-shrink-0 ${TAP}`}
                style={{ width: "42px", height: "42px", background: palette.gold, color: palette.letterbox }}
                aria-label="Add rule"
              >
                <Plus size={18} strokeWidth={2.4} />
              </button>
            </div>
          )}
          {playbookRuleError && (
            <p className="text-xs mb-2" style={{ color: palette.red }}>
              {playbookRuleError}
            </p>
          )}
          <p className="text-xs mt-1 mb-6" style={{ color: palette.textFaint }}>
            Track up to {MAX_PLAYBOOK_RULES} rules at once. Removing a rule only affects future check-ins,
            past history keeps whatever was recorded for it.
          </p>

          {recentCheckins.length > 0 && (
            <>
              <span
                className="block mb-1.5 uppercase"
                style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
              >
                Recent Check-Ins
              </span>
              <div
                className="rounded-2xl px-3 mb-4"
                style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow, transition: THEME_TRANSITION }}
              >
                {recentCheckins.map((c, i) => {
                  const clean = isCleanCheckin(c);
                  const total = Object.keys(c.results || {}).length;
                  const followedCount = Object.values(c.results || {}).filter(Boolean).length;
                  return (
                    <div
                      key={c.id}
                      className="flex items-center justify-between py-2.5"
                      style={{ borderBottom: i < recentCheckins.length - 1 ? `1px solid ${palette.border}` : "none" }}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="flex items-center justify-center rounded-full flex-shrink-0"
                          style={{
                            width: "18px",
                            height: "18px",
                            background: clean ? `${palette.green}22` : `${palette.red}18`,
                            color: clean ? palette.green : palette.red,
                          }}
                        >
                          {clean ? <Check size={11} strokeWidth={3} /> : <X size={11} strokeWidth={3} />}
                        </span>
                        <span style={{ color: palette.text, fontSize: "13px" }}>{formatDayLabel(c.date)}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span style={{ fontFamily: mono, fontSize: "11px", color: palette.textMuted }}>
                          {followedCount}/{total} followed
                        </span>
                        <button
                          type="button"
                          onClick={() => deletePlaybookCheckin(c.id)}
                          className={TAP}
                          style={{ color: palette.textFaint }}
                          aria-label={`Delete check-in for ${formatDayLabel(c.date)}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      );
    } else if (journalMonth === null) {
      const countsByMonth = {};
      journalEntries.forEach((r) => {
        if (!r.date) return;
        const [y, m] = r.date.split("-").map(Number);
        if (y !== journalYear) return;
        const filled = [r.pair, r.trend, r.rr, r.setup, r.mistake, r.note].some((v) => v && String(v).trim());
        if (filled) countsByMonth[m - 1] = (countsByMonth[m - 1] || 0) + 1;
      });

      body = (
        <>
          {journalSubNav}

          <div className="flex items-center justify-between mb-6">
            <button
              type="button"
              onClick={() => setJournalYear((y) => y - 1)}
              className={TAP}
              style={{ color: palette.textMuted, padding: "4px" }}
              aria-label="Previous year"
            >
              <ChevronLeft size={20} />
            </button>
            <span style={{ fontFamily: mono, fontSize: "1.1rem", color: palette.text, letterSpacing: "0.04em" }}>
              {journalYear}
            </span>
            <button
              type="button"
              onClick={() => setJournalYear((y) => y + 1)}
              className={TAP}
              style={{ color: palette.textMuted, padding: "4px" }}
              aria-label="Next year"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {!journalLoaded ? (
            <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
              Loading journal\u2026
            </p>
          ) : (
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
              {MONTH_NAMES.map((m, i) => {
                const count = countsByMonth[i] || 0;
                const isCurrentMonth =
                  journalYear === new Date().getFullYear() && i === new Date().getMonth();
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setJournalMonth(i)}
                    className={`relative flex flex-col items-center justify-center gap-1.5 rounded-2xl ${TAP}`}
                    style={{
                      aspectRatio: "1",
                      background: count > 0 ? `${palette.gold}0D` : palette.surface,
                      border: `1px solid ${
                        isCurrentMonth ? palette.gold : count > 0 ? `${palette.gold}55` : palette.border
                      }`,
                      boxShadow: palette.shadow,
                      transition: THEME_TRANSITION,
                    }}
                  >
                    <span
                      className="uppercase"
                      style={{ fontFamily: mono, fontSize: "13px", fontWeight: 600, color: palette.text, letterSpacing: "0.04em" }}
                    >
                      {MONTH_SHORT[i]}
                    </span>
                    <span
                      style={{
                        fontFamily: mono,
                        fontSize: "10px",
                        color: count > 0 ? palette.gold : palette.textFaint,
                        border: count > 0 ? `1px solid ${palette.gold}55` : "none",
                        borderRadius: "999px",
                        padding: count > 0 ? "1px 8px" : 0,
                      }}
                    >
                      {count > 0 ? `${count} entr${count === 1 ? "y" : "ies"}` : "no entries"}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          <p className="text-xs mt-4" style={{ color: palette.textFaint }}>
            Tap a month to open its trade journal.
          </p>
        </>
      );
    } else {
            const year = journalYear;
      const monthIdx = journalMonth;
      const monthPrefix = `${year}-${pad2(monthIdx + 1)}`;
      const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
      const monthMinDate = `${monthPrefix}-01`;
      const monthMaxDate = `${monthPrefix}-${pad2(daysInMonth)}`;

      const realRows = journalEntries
        .filter((r) => r.date && r.date.startsWith(monthPrefix))
        .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
      const allRows =
        realRows.length > 0
          ? realRows
          : [
               {
                id: `placeholder-${monthPrefix}`,
                date: monthMinDate,
                pair: "",
                trend: "",
                rr: "",
                pnl: "",
                setup: "",
                outcome: "",
                session: "",
                mood: "",
                confidence: "",
                mistake: "",
                note: "",
                _placeholder: true,
              },
            ];

      const totalTableWidth =
        JOURNAL_TOGGLE_COL_WIDTH + JOURNAL_COLUMNS.reduce((s, c) => s + journalColWidths[c.id], 0) + 36;

      const cellInputStyle = { color: palette.text, fontFamily: mono, fontSize: isDesktop ? "14px" : "12px", border: "none" };
      const detailFieldStyle = { color: palette.text, fontFamily: mono, fontSize: isDesktop ? "14px" : "13px", border: "none" }; // desktop matches cellInputStyle (14px) so expanding a row doesn't change text size

      const autoResizeTextarea = (el) => {
        if (!el) return;
        el.style.height = "auto";
        el.style.height = `${el.scrollHeight}px`;
      };

      const renderCell = (row, col, rowIdx, colIdx, rows) => {
        const dateForRow = row.date;
        const cellKey = `${row.id}:${col.id}`;
        const registerRef = (el) => {
          if (el) journalCellRefs.current[cellKey] = el;
          else delete journalCellRefs.current[cellKey];
        };
        const onCellKeyDown = (e) => handleJournalCellKeyDown(e, rowIdx, colIdx, rows);

        if (col.id === "date") {
          return (
            <input
              type="date"
              ref={registerRef}
              onKeyDown={onCellKeyDown}
              value={row.date || ""}
              min={monthMinDate}
              max={monthMaxDate}
              onChange={(e) => updateJournalField(row.id, "date", e.target.value, dateForRow)}
              className="w-full bg-transparent outline-none"
              style={cellInputStyle}
            />
          );
        }
        if (col.id === "trend") {
          const val = row.trend || "";
          return (
            <select
              ref={registerRef}
              onKeyDown={onCellKeyDown}
              value={val}
              onChange={(e) => updateJournalField(row.id, "trend", e.target.value, dateForRow)}
              className="w-full bg-transparent outline-none appearance-none"
              style={{ ...cellInputStyle, color: val ? palette.text : palette.textFaint }}
            >
              <option value="" style={{ background: palette.field, color: palette.textFaint }}>
                Add trend
              </option>
              {TREND_OPTIONS.map((t) => (
                <option key={t.id} value={t.id} style={{ background: palette.field, color: palette.text }}>
                  {t.label}
                </option>
              ))}
            </select>
          );
        }

        if (col.id === "setup") {
          const val = row.setup || "";
          const visibleDefaultSetups = SETUPS.filter((s) => !hiddenDefaultSetupIds.includes(s.id));
          const allSetups = [...visibleDefaultSetups, ...customSetups];
          return (
            <select
              ref={registerRef}
              onKeyDown={onCellKeyDown}
              value={val}
              onChange={(e) => updateJournalField(row.id, "setup", e.target.value, dateForRow)}
              className="w-full bg-transparent outline-none appearance-none"
              style={{ ...cellInputStyle, color: val ? palette.text : palette.textFaint }}
            >
              <option value="" style={{ background: palette.field, color: palette.textFaint }}>
                Add setup
              </option>
              {allSetups.map((s) => (
                <option key={s.id} value={s.id} style={{ background: palette.field, color: palette.text }}>
                  {s.label}
                </option>
              ))}
            </select>
          );
        }

        if (col.id === "pnl") {
          const val = row.pnl || "";
          const n = parseFloat(val);
          const hasVal = val !== "" && Number.isFinite(n);
          return (
            <input
              type="text"
              inputMode="decimal"
              ref={registerRef}
              onKeyDown={onCellKeyDown}
              value={val}
              onChange={(e) => updateJournalPnl(row.id, e.target.value, dateForRow)}
              placeholder="PnL"
              className="w-full bg-transparent outline-none"
              style={{ ...cellInputStyle, color: hasVal ? (n >= 0 ? palette.green : palette.red) : palette.textFaint }}
            />
          );
        }

        if (col.id === "outcome") {
          const val = row.outcome || "";
          return (
            <select
              ref={registerRef}
              onKeyDown={onCellKeyDown}
              value={val}
              onChange={(e) => updateJournalField(row.id, "outcome", e.target.value, dateForRow)}
              className="w-full bg-transparent outline-none appearance-none"
              style={{
                ...cellInputStyle,
                color:
                  val === "win" ? palette.green : val === "loss" ? palette.red : val ? palette.text : palette.textFaint,
              }}
            >
              <option value="" style={{ background: palette.field, color: palette.textFaint }}>
                Add outcome
              </option>
              {OUTCOME_OPTIONS.map((o) => (
                <option key={o.id} value={o.id} style={{ background: palette.field, color: palette.text }}>
                  {o.label}
                </option>
              ))}
            </select>
          );
        }

        const placeholderText = col.id === "pair" ? "Add pair" : "Add R:R";
        return (
          <input
            type="text"
            ref={registerRef}
            onKeyDown={onCellKeyDown}
            value={row[col.id] || ""}
            onChange={(e) => updateJournalField(row.id, col.id, e.target.value, dateForRow)}
            placeholder={placeholderText}
            className="w-full bg-transparent outline-none"
            style={cellInputStyle}
          />
        );
      };

      const renderDetailField = (row, field) => {
        const dateForRow = row.date;

        const selectStyle = {
          ...detailFieldStyle,
          border: `1px solid ${palette.border}`,
          borderRadius: "6px",
          padding: isDesktop ? "6px 10px" : "4px 8px",
          width: "100%",
          display: "block",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          ...(isDesktop ? { lineHeight: "1.5", minHeight: "34px", boxSizing: "border-box" } : {}),
        };

        if (field.id === "session") {
          const val = row.session || "";
          return (
            <select
              value={val}
              onChange={(e) => updateJournalField(row.id, "session", e.target.value, dateForRow)}
              className="bg-transparent outline-none appearance-none"
              style={{ ...selectStyle, color: val ? palette.text : palette.textFaint }}
            >
              <option value="" style={{ background: palette.field, color: palette.textFaint }}>
                Choose
              </option>
              {MARKET_SESSIONS.map((s) => (
                <option key={s.id} value={s.id} style={{ background: palette.field, color: palette.text }}>
                  {s.label}
                </option>
              ))}
            </select>
          );
        }
        if (field.id === "mood") {
          const val = row.mood || "";
          return (
            <select
              value={val}
              onChange={(e) => updateJournalField(row.id, "mood", e.target.value, dateForRow)}
              className="bg-transparent outline-none appearance-none"
              style={{ ...selectStyle, color: val ? palette.text : palette.textFaint }}
            >
              <option value="" style={{ background: palette.field, color: palette.textFaint }}>
                Select
              </option>
              {EMOTIONS.map((e) => (
                <option key={e.id} value={e.id} style={{ background: palette.field, color: palette.text }}>
                  {e.emoji} {e.label}
                </option>
              ))}
              {customMoods.map((m) => (
                <option key={m.id} value={m.id} style={{ background: palette.field, color: palette.text }}>
                  {m.emoji} {m.label}
                </option>
              ))}
            </select>
          );
        }
        if (field.id === "confidence") {
          const val = row.confidence || "";
          return (
            <select
              value={val}
              onChange={(e) => updateJournalField(row.id, "confidence", e.target.value, dateForRow)}
              className="bg-transparent outline-none appearance-none"
              style={{ ...selectStyle, color: val ? palette.text : palette.textFaint }}
            >
              <option value="" style={{ background: palette.field, color: palette.textFaint }}>
                Select
              </option>
              {CONFIDENCE_OPTIONS.map((c) => (
                <option key={c.id} value={c.id} style={{ background: palette.field, color: palette.text }}>
                  {c.label}
                </option>
              ))}
            </select>
          );
        }

        if (field.id === "entryPrice" || field.id === "closingPrice") {
          const val = row[field.id] || "";
          return (
            <input
              type="text"
              inputMode="decimal"
              value={val}
              onChange={(e) => updateJournalField(row.id, field.id, e.target.value, dateForRow)}
              placeholder={field.id === "entryPrice" ? "2415.20" : "2410.00"}
              className="w-full bg-transparent outline-none"
              style={{ ...selectStyle, color: val ? palette.text : palette.textFaint }}
            />
          );
        }

        if (field.id === "mistake") {
          const val = row.mistake || "";
          return (
            <textarea
              value={val}
              onChange={(e) => {
                updateJournalField(row.id, "mistake", e.target.value, dateForRow);
                e.target.style.height = "auto";
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              ref={(el) => {
                if (el) {
                  el.style.height = "auto";
                  el.style.height = `${el.scrollHeight}px`;
                }
              }}
              placeholder="Add mistake"
              rows={1}
              className="w-full bg-transparent outline-none block"
              style={{
                ...detailFieldStyle,
                border: `1px solid ${palette.border}`,
                borderRadius: "6px",
                padding: "6px 10px",
                resize: "none",
                overflow: "hidden",
                whiteSpace: "pre-wrap",
                overflowWrap: "break-word",
                wordBreak: "break-word",
                lineHeight: "1.5",
                minHeight: "34px",
              }}
            />
          );
        }

        // Note — auto-growing textarea, no reserved blank space
        return (
          <textarea
            value={row[field.id] || ""}
            onChange={(e) => {
              updateJournalField(row.id, field.id, e.target.value, dateForRow);
              e.target.style.height = "auto";
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
            ref={(el) => {
              if (el) {
                el.style.height = "auto";
                el.style.height = `${el.scrollHeight}px`;
              }
            }}
            placeholder="Add note"
            rows={1}
            className="w-full bg-transparent outline-none block"
            style={{
              ...detailFieldStyle,
              border: `1px solid ${palette.border}`,
              borderRadius: "6px",
              padding: "6px 10px",
              resize: "none",
              overflow: "hidden",
              whiteSpace: "pre-wrap",
              overflowWrap: "break-word",
              wordBreak: "break-word",
              lineHeight: "1.5",
              minHeight: "34px",
            }}
          />
        );
      };

      const cardFieldBoxStyle = {
        border: `1px solid ${palette.border}`,
        borderRadius: "6px",
        padding: "4px 8px",
        width: "100%",
        display: "block",
        background: "transparent",
      };

      const renderCardField = (row, col, rowIdx, colIdx, rows) => {
        const dateForRow = row.date;

        if (col.id === "date") {
          return (
            <input
              type="date"
              value={row.date || ""}
              min={monthMinDate}
              max={monthMaxDate}
              onChange={(e) => updateJournalField(row.id, "date", e.target.value, dateForRow)}
              className="w-full bg-transparent outline-none journal-row-date-input"
              style={{ ...detailFieldStyle, ...cardFieldBoxStyle }}
            />
          );
        }
        if (col.id === "trend") {
          const val = row.trend || "";
          return (
            <select
              value={val}
              onChange={(e) => updateJournalField(row.id, "trend", e.target.value, dateForRow)}
              className="w-full bg-transparent outline-none appearance-none"
              style={{ ...detailFieldStyle, ...cardFieldBoxStyle, color: val ? palette.text : palette.textFaint }}
            >
              <option value="" style={{ background: palette.field, color: palette.textFaint }}>
                Add trend
              </option>
              {TREND_OPTIONS.map((t) => (
                <option key={t.id} value={t.id} style={{ background: palette.field, color: palette.text }}>
                  {t.label}
                </option>
              ))}
            </select>
          );
        }
        if (col.id === "setup") {
          const val = row.setup || "";
          const visibleDefaultSetups = SETUPS.filter((s) => !hiddenDefaultSetupIds.includes(s.id));
          const allSetups = [...visibleDefaultSetups, ...customSetups];
          return (
            <select
              value={val}
              onChange={(e) => updateJournalField(row.id, "setup", e.target.value, dateForRow)}
              className="w-full bg-transparent outline-none appearance-none"
              style={{ ...detailFieldStyle, ...cardFieldBoxStyle, color: val ? palette.text : palette.textFaint }}
            >
              <option value="" style={{ background: palette.field, color: palette.textFaint }}>
                Add setup
              </option>
              {allSetups.map((s) => (
                <option key={s.id} value={s.id} style={{ background: palette.field, color: palette.text }}>
                  {s.label}
                </option>
              ))}
            </select>
          );
        }
        if (col.id === "pnl") {
          const val = row.pnl || "";
          const n = parseFloat(val);
          const hasVal = val !== "" && Number.isFinite(n);
          return (
            <input
              type="text"
              inputMode="decimal"
              value={val}
              onChange={(e) => updateJournalPnl(row.id, e.target.value, dateForRow)}
              placeholder="PnL"
              className="w-full bg-transparent outline-none"
              style={{
                ...detailFieldStyle,
                ...cardFieldBoxStyle,
                color: hasVal ? (n >= 0 ? palette.green : palette.red) : palette.textFaint,
              }}
            />
          );
        }
        if (col.id === "outcome") {
          const val = row.outcome || "";
          return (
            <select
              value={val}
              onChange={(e) => updateJournalField(row.id, "outcome", e.target.value, dateForRow)}
              className="w-full bg-transparent outline-none appearance-none"
              style={{
                ...detailFieldStyle,
                ...cardFieldBoxStyle,
                color:
                  val === "win" ? palette.green : val === "loss" ? palette.red : val ? palette.text : palette.textFaint,
              }}
            >
              <option value="" style={{ background: palette.field, color: palette.textFaint }}>
                W/L/BE 
              </option>
              {OUTCOME_OPTIONS.map((o) => (
                <option key={o.id} value={o.id} style={{ background: palette.field, color: palette.text }}>
                  {o.label}
                </option>
              ))}
            </select>
          );
        }

        const placeholderText = col.id === "pair" ? "Add pair" : "Add R";
        return (
          <input
            type="text"
            value={row[col.id] || ""}
            onChange={(e) => updateJournalField(row.id, col.id, e.target.value, dateForRow)}
            placeholder={placeholderText}
            className="w-full bg-transparent outline-none"
            style={{ ...detailFieldStyle, ...cardFieldBoxStyle }}
          />
        );
      };

      const journalLayoutPref = settings.journalTableLayout || "auto";
      const useCardLayout = journalLayoutPref === "cards" || (journalLayoutPref === "auto" && isNarrowScreen);

      body = (
        <>
          {journalSubNav}

          <OnboardingTip
            id="journal-table-intro"
            text="Tap any cell to edit it. Tap the arrow on the left of a row to reveal Session, Mood, Confidence, Mistake, and Note without widening the table."
            settings={settings}
            persistSettings={persistSettings}
          />

          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => setJournalMonth(null)}
              className={`flex items-center gap-1 ${TAP}`}
              style={{ color: palette.textMuted, fontSize: "12px", fontFamily: mono }}
            >
              <ChevronLeft size={16} />
              {year}
            </button>
            <span style={{ fontFamily: mono, fontSize: "13px", color: palette.text, letterSpacing: "0.04em" }}>
              {MONTH_NAMES[monthIdx]} {year}
            </span>
            <span style={{ width: "40px" }} />
          </div>

          {!journalLoaded ? (
            <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
              Loading journal\u2026
            </p>
          ) : useCardLayout ? (
            <div className="mb-3">
              {allRows.map((row, rowIdx) => {
                const isExpanded = !!journalExpandedRows[row.id];
                return (
                  <div
                    key={row.id}
                    className="rounded-2xl mb-3 p-3"
                    style={{
                      background: palette.surface,
                      border: `1px solid ${palette.border}`,
                      boxShadow: palette.shadow,
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {!row._placeholder && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleJournalRowExpanded(row.id);
                          }}
                          className={TAP}
                          style={{
                            color: palette.textMuted,
                            flexShrink: 0,
                            width: "28px",
                            height: "28px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          aria-label={isExpanded ? "Collapse row" : "Expand row"}
                        >
                          {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                        </button>
                      )}
   <div
     className="flex-1 min-w-0"
     style={{ overflow: "hidden" }}
     onClick={(e) => e.stopPropagation()}
   >
    <input
      type="date"
      value={row.date || ""}
      min={monthMinDate}
      max={monthMaxDate}
      onChange={(e) => updateJournalField(row.id, "date", e.target.value, row.date)}
      className="bg-transparent outline-none journal-row-date-input"
      style={{ ...detailFieldStyle, fontSize: "12px", width: "calc(100% + 24px)" }}
    />
</div>
                      {!row._placeholder && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteJournalRow(row.id);
                          }}
                          className={TAP}
                          style={{
                            color: palette.textFaint,
                            flexShrink: 0,
                            width: "28px",
                            height: "28px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          aria-label="Delete row"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 mb-2">
                      {JOURNAL_COLUMNS.filter((c) => c.id !== "date").map((col, colIdx) => (
                        <div key={col.id}>
                          <span
                            className="block mb-1 uppercase"
                            style={{ color: palette.textFaint, letterSpacing: "0.06em", fontSize: "10px" }}
                          >
                            {col.label}
                          </span>
                          {renderCardField(row, col, rowIdx, colIdx, allRows)}
                        </div>
                      ))}
                    </div>

                    {isExpanded && !row._placeholder && (
                      <>
                        <div className="grid grid-cols-3 gap-1.5 mb-2">
                          {JOURNAL_DETAIL_FIELDS.filter(
                            (f) => f.id === "session" || f.id === "mood" || f.id === "confidence"
                          ).map((field) => (
                            <div key={field.id}>
                              <span
                                className="block mb-1 uppercase"
                                style={{ color: palette.textFaint, letterSpacing: "0.06em", fontSize: "10px" }}
                              >
                                {field.label}
                              </span>
                              {renderDetailField(row, field)}
                            </div>
                          ))}
                        </div>

                        <div className="grid grid-cols-2 gap-1.5 mb-2">
                          {["entryPrice", "closingPrice"].map((fid) => {
                            const field = JOURNAL_DETAIL_FIELDS.find((f) => f.id === fid);
                            return (
                              <div key={fid}>
                                <span
                                  className="block mb-1 uppercase"
                                  style={{ color: palette.textFaint, letterSpacing: "0.06em", fontSize: "10px" }}
                                >
                                  {field.label}
                                </span>
                                {renderDetailField(row, field)}
                              </div>
                            );
                          })}
                        </div>

                        <div className="mb-2">
                          <span
                            className="block mb-1 uppercase"
                            style={{ color: palette.textFaint, letterSpacing: "0.06em", fontSize: "10px" }}
                          >
                            Mistake
                          </span>
                          {renderDetailField(row, JOURNAL_DETAIL_FIELDS.find((f) => f.id === "mistake"))}
                        </div>

                        <div className="mb-3">
                          <span
                            className="block mb-1 uppercase"
                            style={{ color: palette.textFaint, letterSpacing: "0.06em", fontSize: "10px" }}
                          >
                            Note
                          </span>
                          {renderDetailField(row, JOURNAL_DETAIL_FIELDS.find((f) => f.id === "note"))}
                        </div>

                        <div>
                          <span
                            className="block mb-1 uppercase"
                            style={{ color: palette.textFaint, letterSpacing: "0.06em", fontSize: "10px" }}
                          >
                            Trade Photos
                          </span>
                          <div className="flex flex-col gap-2" style={{ width: "80px" }}>
                            {(row.photos || []).map((src, idx) => (
                              <div key={idx} className="relative inline-block">
                                <img
                                  src={src}
                                  alt={`Trade photo ${idx + 1}`}
                                  onClick={() => setViewingJournalPhoto({ src, rowId: row.id, index: idx })}
                                  className={`rounded-lg ${TAP}`}
                                  style={{
                                    width: "80px",
                                    height: "80px",
                                    objectFit: "cover",
                                    border: `1px solid ${palette.border}`,
                                    cursor: "pointer",
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => setPendingJournalPhotoDelete({ rowId: row.id, index: idx })}
                                  className={`absolute flex items-center justify-center rounded-full ${TAP}`}
                                  style={{
                                    top: "-5px",
                                    right: "-5px",
                                    width: "16px",
                                    height: "16px",
                                    background: palette.red,
                                    color: "#FFFFFF",
                                  }}
                                  aria-label="Remove photo"
                                >
                                  <X size={9} />
                                </button>
                              </div>
                            ))}
                            {(row.photos || []).length < MAX_JOURNAL_PHOTOS_PER_ROW && (
                              <button
                                type="button"
                                onClick={() => openJournalPhotoPicker(row.id)}
                                disabled={journalPhotoSaving && journalPhotoTarget === row.id}
                                className={`flex flex-col items-center justify-center gap-1 rounded-lg ${TAP}`}
                                style={{
                                  width: "80px",
                                  height: "80px",
                                  background: "transparent",
                                  border: `1px dashed ${palette.border}`,
                                  color: palette.textFaint,
                                }}
                              >
                                <Camera size={14} />
                                <span style={{ fontSize: "9px", fontFamily: mono }}>
                                  {journalPhotoSaving && journalPhotoTarget === row.id ? "Saving…" : "Add photo"}
                                </span>
                              </button>
                            )}
                          </div>
                          {journalPhotoError && (
                            <p className="text-xs mt-1" style={{ color: palette.red }}>
                              {journalPhotoError}
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              className="rounded-2xl mb-3"
              style={{
                background: palette.surface,
                border: `1px solid ${palette.border}`,
                boxShadow: palette.shadow,
                overflow: "hidden",
                maxHeight: isDesktop ? "680px" : "480px",
              }}
            >
              <div style={{ overflowY: "auto", overflowX: "auto", maxHeight: isDesktop ? "680px" : "480px", WebkitOverflowScrolling: "touch" }}>
                <table style={{ borderCollapse: "collapse", width: isDesktop ? "100%" : `${totalTableWidth}px`, minWidth: `${totalTableWidth}px` }}>
                  <thead>
                    <tr>
                      <th
                        style={{
                          position: "sticky",
                          top: 0,
                          zIndex: 1,
                          width: `${JOURNAL_TOGGLE_COL_WIDTH}px`,
                          minWidth: `${JOURNAL_TOGGLE_COL_WIDTH}px`,
                          background: palette.field,
                          borderBottom: `1px solid ${palette.gold}55`,
                        }}
                      />
                      {JOURNAL_COLUMNS.map((col) => (
                        <th
                          key={col.id}
                          style={{
                            position: "sticky",
                            top: 0,
                            zIndex: 1,
                            width: `${journalColWidths[col.id]}px`,
                            minWidth: `${journalColWidths[col.id]}px`,
                            maxWidth: `${journalColWidths[col.id]}px`,
                            background: palette.field,
                            borderBottom: `1px solid ${palette.gold}55`,
                            borderRight: `1px solid ${palette.border}`,
                            textAlign: "left",
                            padding: isDesktop ? "14px 12px" : "9px 8px",
                          }}
                        >
                          <div className="flex items-center justify-between" style={{ position: "relative" }}>
                            <span
                              className="uppercase"
                              style={{ fontSize: "10px", color: palette.textMuted, letterSpacing: "0.07em", fontWeight: 600 }}
                            >
                              {col.label}
                            </span>
                            <div
                              onPointerDown={startJournalResize(col.id)}
                              onPointerMove={moveJournalResize}
                              onPointerUp={endJournalResize}
                              onPointerCancel={endJournalResize}
                              style={{
                                position: "absolute",
                                right: "-9px",
                                top: "-10px",
                                bottom: "-10px",
                                width: "18px",
                                cursor: "col-resize",
                                touchAction: "none",
                              }}
                            />
                          </div>
                        </th>
                      ))}
                      <th
                        style={{
                          position: "sticky",
                          top: 0,
                          zIndex: 1,
                          width: "36px",
                          minWidth: "36px",
                          background: palette.field,
                          borderBottom: `1px solid ${palette.gold}55`,
                        }}
                      />
                    </tr>
                  </thead>
                  <tbody>
                    {allRows.map((row, rowIdx) => {
                      const isExpanded = !!journalExpandedRows[row.id];
                      return (
                        <Fragment key={row.id}>
                          <tr style={{ background: rowIdx % 2 === 1 ? `${palette.field}55` : "transparent" }}>
                            <td
                              style={{
                                width: `${JOURNAL_TOGGLE_COL_WIDTH}px`,
                                minWidth: `${JOURNAL_TOGGLE_COL_WIDTH}px`,
                                borderBottom: `1px solid ${palette.border}`,
                            textAlign: "center",
                            verticalAlign: "top",
                            paddingTop: "6px",
                              }}
                            >
                              {!row._placeholder && (
                                <button
                                  type="button"
                                  onClick={() => toggleJournalRowExpanded(row.id)}
                                  className={TAP}
                                  style={{
                                    color: palette.textMuted,
                                    width: "28px",
                                    height: "28px",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                  aria-label={isExpanded ? "Collapse row" : "Expand row"}
                                >
                                  {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                                </button>
                              )}
                            </td>
                            {JOURNAL_COLUMNS.map((col, colIdx) => (
                              <td
                                key={col.id}
                                style={{
                                  width: `${journalColWidths[col.id]}px`,
                                  minWidth: `${journalColWidths[col.id]}px`,
                                  maxWidth: `${journalColWidths[col.id]}px`,
                                  borderBottom: `1px solid ${palette.border}`,
                                  borderRight: `1px solid ${palette.border}`,
                                  padding: isDesktop ? "10px 12px" : "5px 8px",
                                  verticalAlign: "top",
                                }}
                              >
                                {renderCell(row, col, rowIdx, colIdx, allRows)}
                              </td>
                            ))}
                            <td
                              style={{
                            width: "36px",
                            minWidth: "36px",
                            borderBottom: `1px solid ${palette.border}`,
                            textAlign: "center",
                            verticalAlign: "top",
                            paddingTop: "6px",
                              }}
                            >
                              {!row._placeholder && (
                                <button
                                  type="button"
                                  onClick={() => deleteJournalRow(row.id)}
                                  className={TAP}
                                  style={{ color: palette.textFaint }}
                                  aria-label="Delete row"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </td>
                          </tr>
                          {isExpanded && !row._placeholder && (
                            <tr>
                              <td
                                colSpan={JOURNAL_COLUMNS.length + 2}
                                style={{
                                  borderBottom: `1px solid ${palette.border}`,
                                  background: `${palette.field}55`,
                                  padding: "10px 12px",
                                }}
                              >
                                <div className="grid grid-cols-3 gap-1.5 mb-2">
                                  {JOURNAL_DETAIL_FIELDS.filter(
                                    (f) => f.id === "session" || f.id === "mood" || f.id === "confidence"
                                  ).map((field) => (
                                    <div key={field.id}>
                                      <span
                                        className="block mb-1 uppercase"
                                        style={{ color: palette.textFaint, letterSpacing: "0.06em", fontSize: "10px" }}
                                      >
                                        {field.label}
                                      </span>
                                      {renderDetailField(row, field)}
                                    </div>
                                  ))}
                                </div>

                                <div className="grid grid-cols-3 gap-1.5 mb-2">
                                  {["mistake", "entryPrice", "closingPrice"].map((fid) => {
                                    const field = JOURNAL_DETAIL_FIELDS.find((f) => f.id === fid);
                                    return (
                                      <div key={fid}>
                                        <span
                                          className="block mb-1 uppercase"
                                          style={{ color: palette.textFaint, letterSpacing: "0.06em", fontSize: "10px" }}
                                        >
                                          {field.label}
                                        </span>
                                        {renderDetailField(row, field)}
                                      </div>
                                    );
                                  })}
                                </div>

                                <div className="grid grid-cols-3 gap-1.5 mb-3">
                                  {["note"].map((fid) => {
                                    const field = JOURNAL_DETAIL_FIELDS.find((f) => f.id === fid);
                                    return (
                                      <div key={fid}>
                                        <span
                                          className="block mb-1 uppercase"
                                          style={{ color: palette.textFaint, letterSpacing: "0.06em", fontSize: "10px" }}
                                        >
                                          {field.label}
                                        </span>
                                        {renderDetailField(row, field)}
                                      </div>
                                    );
                                  })}
                                </div>

                        <div>
                          <span
                            className="block mb-1 uppercase"
                            style={{ color: palette.textFaint, letterSpacing: "0.06em", fontSize: "10px" }}
                          >
                            Trade Photos
                          </span>
                                <div className="flex gap-2 flex-wrap">
                                  {(row.photos || []).map((src, idx) => (
                                    <div key={idx} className="relative inline-block">
                     <img
                      src={src}
                      alt={`Trade photo ${idx + 1}`}
                      onClick={() => setViewingJournalPhoto({ src, rowId: row.id, index: idx })}
                      className={`rounded-lg ${TAP}`}
                      style={{ width: "80px", height: "80px", objectFit: "cover", border: `1px solid ${palette.border}`, cursor: "pointer" }}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => setPendingJournalPhotoDelete({ rowId: row.id, index: idx })}
                                        className={`absolute flex items-center justify-center rounded-full ${TAP}`}
                                        style={{ top: "-5px", right: "-5px", width: "16px", height: "16px", background: palette.red, color: "#FFFFFF" }}
                                        aria-label="Remove photo"
                                      >
                                        <X size={9} />
                                      </button>
                                    </div>
                                  ))}
                                  {(row.photos || []).length < MAX_JOURNAL_PHOTOS_PER_ROW && (
                 <button
                  type="button"
                  onClick={() => openJournalPhotoPicker(row.id)}
                  disabled={journalPhotoSaving && journalPhotoTarget === row.id}
                  className={`flex flex-col items-center justify-center gap-1 rounded-lg ${TAP}`}
                  style={{ width: "80px", height: "80px", background: "transparent", border: `1px dashed ${palette.border}`, color: palette.textFaint }}
                                    >
                                      <Camera size={14} />
                                      <span style={{ fontSize: "9px", fontFamily: mono }}>
                                        {journalPhotoSaving && journalPhotoTarget === row.id ? "Saving…" : "Add photo"}
                                      </span>
                                    </button>
                                  )}
                                </div>
                                {journalPhotoError && (
                                  <p className="text-xs mt-1" style={{ color: palette.red }}>{journalPhotoError}</p>
                                )}
                              </div>
                             </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {addingSetup && (
            <div className="flex items-center gap-2 mb-3">
              <input
                type="text"
                value={newSetupName}
                onChange={(e) => {
                  setNewSetupName(e.target.value);
                  if (setupError) setSetupError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    confirmAddSetup();
                  } else if (e.key === "Escape") {
                    cancelAddSetup();
                  }
                }}
                placeholder="New setup name"
                autoFocus
                maxLength={20}
                className="flex-1 rounded-lg px-3 py-2 bg-transparent outline-none"
                style={{
                  background: palette.field,
                  border: `1px solid ${palette.border}`,
                  color: palette.text,
                  fontFamily: mono,
                  fontSize: "13px",
                }}
              />
              <button
                type="button"
                onClick={confirmAddSetup}
                className={`rounded-lg px-3 py-2 flex-shrink-0 ${TAP}`}
                style={{ background: palette.gold, color: palette.letterbox, fontFamily: mono, fontSize: "13px", fontWeight: 600 }}
              >
                Add
              </button>
              <button
                type="button"
                onClick={cancelAddSetup}
                className={`flex items-center justify-center rounded-lg flex-shrink-0 ${TAP}`}
                style={{ width: "34px", height: "34px", background: "transparent", border: `1px solid ${palette.border}`, color: palette.textFaint }}
                aria-label="Cancel adding setup"
              >
                <X size={14} />
              </button>
            </div>
          )}
          {setupError && (
            <p className="text-xs mb-2" style={{ color: palette.red }}>
              {setupError}
            </p>
          )}

          <button
            type="button"
            onClick={() => {
              const today = new Date();
              const isCurrentMonth = today.getFullYear() === year && today.getMonth() === monthIdx;
              addJournalRow(isCurrentMonth ? dayKeyFromDate(today) : monthMinDate);
            }}
            className={`w-full flex items-center justify-center gap-2 rounded-lg py-3 mb-3 ${TAP}`}
            style={{
              background: "transparent",
              border: `1px dashed ${palette.gold}88`,
              color: palette.gold,
              fontFamily: mono,
              fontSize: "13px",
              fontWeight: 600,
              transition: `${THEME_TRANSITION}, transform 0.15s ease`,
            }}
          >
            <Plus size={16} />
            Add Trade Row
          </button>

          <button
            type="button"
            onClick={exportJournalCSV}
            className={`w-full flex items-center justify-center gap-2 rounded-lg py-3 mb-2 ${TAP}`}
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
            Download Journal (CSV)
          </button>
          {journalExportMsg && (
            <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
              {journalExportMsg}
            </p>
          )}

          <button
            type="button"
            onClick={triggerJournalImport}
            className={`w-full flex items-center justify-center gap-2 rounded-lg py-3 mb-2 ${TAP}`}
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
            <Upload size={16} />
            Import Journal (CSV)
          </button>
          <input
            ref={journalImportInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={importJournalCSV}
            style={{ display: "none" }}
          />

          <input
            ref={journalPhotoInputRef}
            type="file"
            accept="image/*"
            onChange={handleJournalPhotoChange}
            style={{ display: "none" }}
          />

          {journalImportMsg && (
            <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
              {journalImportMsg}
            </p>
          )}

          <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
            Tap any cell to edit, Trend, Setup, and Outcome are quick-select. Tap the arrow on the left of a row
            to open Session, Mood, Confidence, Mistake, and Note without widening the table. The date only lets
            you pick a day within {MONTH_NAMES[monthIdx]} {year}. Drag a column header's right edge to resize it.
            Rows sort by date automatically, so add extra rows for multiple trades on the same day. Hold Alt and
            press an arrow key to jump between the visible cells. Use Download Journal to save this month's
            entries, including the expanded fields, as a CSV file.
          </p>
        </>
      );
    }
  
  return body;
}
