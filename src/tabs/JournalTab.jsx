import { pokeCrab } from "../lib/mascot.js";
import { OnboardingTip } from "../components/onboarding.jsx";
import TradePlan from "../components/TradePlan.jsx";
import { Suspense } from "react";

// Journal: Journal (log + calendar), History, and Trade plan.
export default function JournalTab(props) {
  const {
    goals,
    persistGoals,
    startingBalance,
    trades,
    addPlaybookRule: addPlaybookRuleProp,
    deletePlaybookCheckin: deletePlaybookCheckinProp,
    isDesktop,
    journalSubTab,
    CurveTab,
    curveProps,
    newRuleText,
    persistSettings,
    playbookCheckins,
    playbookMsg,
    playbookRuleError,
    playbookRules,
    playbookRulesLoaded,
    removePlaybookRule: removePlaybookRuleProp,
    renderSubNav,
    setJournalSubTab: setJournalSubTabProp,
    setNewRuleText,
    setPlaybookRuleError,
    settings,
    submitCheckin: submitCheckinProp,
    todayResults,
    toggleTodayResult: toggleTodayResultProp,
  } = props;

  // Mascot reactions: wrap the handlers so every action pokes the crab.
  const withCrab = (fn, mood, detail) => (...args) => {
    pokeCrab(mood, detail);
    return fn(...args);
  };
  const addPlaybookRule = withCrab(addPlaybookRuleProp, "add");
  const deletePlaybookCheckin = withCrab(deletePlaybookCheckinProp, "poof");
  const removePlaybookRule = withCrab(removePlaybookRuleProp, "poof");
  const setJournalSubTab = withCrab(setJournalSubTabProp, "look");
  const submitCheckin = (...args) => {
    const clean = playbookRules.length > 0 && playbookRules.every((r) => todayResults[r.id]);
    pokeCrab(clean ? "party" : "check", { say: clean ? "Clean day!" : "Checked in" });
    return submitCheckinProp(...args);
  };
  const toggleTodayResult = (id, ...rest) => {
    pokeCrab(todayResults[id] ? "look" : "check", { say: "" });
    return toggleTodayResultProp(id, ...rest);
  };

  const JOURNAL_SUB_TABS = [
    { id: "log", label: "Journal" },
    { id: "history", label: "History" },
    { id: "playbook", label: "Trade plan" },
  ];
  const journalSubNav = renderSubNav(JOURNAL_SUB_TABS, journalSubTab, setJournalSubTab);

  if (journalSubTab === "log" || journalSubTab === "history") {
    return (
      <>
        {journalSubNav}
        <Suspense fallback={<div className="tz-tab-loading" aria-hidden="true" />}>
          <CurveTab {...curveProps} view={journalSubTab === "history" ? "history" : "overview"} />
        </Suspense>
      </>
    );
  }

  // Anything else (including an old saved "sheet" tab) lands on the Trade plan.
  return (
    <>
      {journalSubNav}

      <OnboardingTip
        id="playbook-intro"
        text="Write your plan once: goals, risk limits, setups and your daily check in. Tap the pencil on a card to edit it, and check off your rules each day to build a discipline streak."
        settings={settings}
        persistSettings={persistSettings}
      />

      <TradePlan
        {...{
          isDesktop,
          settings,
          persistSettings,
          trades,
          startingBalance,
          goals,
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
        }}
      />
    </>
  );
}
