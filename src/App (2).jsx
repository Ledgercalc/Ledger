import { COMMUNITY_API_BASE, COMMUNITY_AVATAR_KEY, COMMUNITY_JOIN_REQUESTS_KEY, COMMUNITY_MEMBERSHIPS_KEY, COMMUNITY_MESSAGE_POLL_MS, COMMUNITY_ONBOARDING_KEY, COMMUNITY_SESSION_KEY, COMMUNITY_USERNAME_KEY, communityApi } from "./api/community.js";
import { pokeCrab } from "./lib/mascot.js";
import CrabMascot from "./components/CrabMascot.jsx";
import GroupCampfire from "./components/GroupCampfire.jsx";
import BrokerSyncRunner from "./components/BrokerSyncRunner.jsx";
import { computeGoalProgress } from "./lib/analytics.js";
import { OnboardingAmbientBG } from "./components/onboarding.jsx";
import { Avatar, PillGroup, SettingsSection, SettingsSubLabel } from "./components/ui.jsx";
import { FX_CACHE_MS, FX_LIVE_STORAGE_KEY, fetchLiveFxRates } from "./data/currencies.js";
import { ONBOARDING_SLIDES, TOUR_STEPS } from "./data/onboarding.js";
import { buildWeekRecap, computeConsistencyScore, computeDisciplineGrade, computeDisciplineStreak, computeDisciplineStreakTrend, computeHeadlineInsight, computeInsights, computeJournalCompleteness, computeMonthComparison, computeNoteTagAnalysis, computeOverconfidenceCheck, computePerformanceMetrics, computeRevengeCostSplit, computeSessionWinRates, computeStatementData, filledJournalRows, generateThreeCurveProjection, journalMistakeFrequency } from "./lib/analytics.js";
import { FMP_CACHE_MS, FMP_STORAGE_KEY, fetchEconomicCalendar, registerAlarmServiceWorker } from "./lib/calendar.js";
import { ACCOUNTS_ACTIVE_KEY, ACCOUNTS_LIST_KEY, ALARM_CHECK_INTERVAL_MS, ALARM_STALE_WINDOW_MS, CONFIDENCE_OPTIONS, CS_STORAGE_KEY, CUSTOM_MOODS_STORAGE_KEY, CUSTOM_SETUPS_STORAGE_KEY, DEFAULT_CS_INPUTS, DEFAULT_JOURNAL_COL_WIDTHS, DEFAULT_NOTEPAD_FONT_SIZE, DEFAULT_SETTINGS, EDGE_PROJECTION_PERIODS, EDGE_STORAGE_KEY, EMOTIONS, FX_LAST_PAIR_KEY, GOALS_STORAGE_KEY, HIDDEN_DEFAULT_SETUPS_KEY, JOURNAL_COLS_STORAGE_KEY, JOURNAL_COLUMNS, JOURNAL_COL_MAX, JOURNAL_COL_MIN, JOURNAL_STORAGE_KEY, LINKED_FIRM_KEY, MAX_CUSTOM_MOODS, MAX_CUSTOM_SETUPS, MAX_JOURNAL_PHOTOS_PER_ROW, MAX_PLAYBOOK_RULES, MOBILE_NAV_PRIMARY_COUNT, NEWS_STORAGE_KEY, NOTEPAD_FONT_SIZES, NOTEPAD_STORAGE_KEY, OUTCOME_OPTIONS, PLAYBOOK_CHECKINS_KEY, PLAYBOOK_RULES_KEY, PLAYBOOK_STARTER_RULES, PS_STORAGE_KEY, RUNTIME, SETTINGS_STORAGE_KEY, SETUPS, STORAGE_BAL_KEY, STORAGE_KEY, TABS as BASE_TABS, THEME_STORAGE_KEY, TREND_OPTIONS, WEEK_MS, confidenceLabel, emotionMeta, outcomeLabel, scopedKey, sessionLabelFor, setupMeta } from "./lib/constants.js";
import { STORY_SLIDE_MS, feedTimeAgo, isWithinStoryWindow } from "./lib/feed.js";
import { dayKeyFromDate, dayKeyFromTs, fmt, fmtMoney, fmtPct, formatDayLabel, num, pad2 } from "./lib/format.js";
import { SCREENSHOT_MAX_PER_TRADE, dataUrlToFile, readStickerFileRaw, resizeImageFile, resizeStickerFile, tradeScreenshots } from "./lib/images.js";
import { autoGrowBlock, blocksToExportText, countOccurrencesInBlocks, makeBlockId, migrateNoteShape, replaceAllInBlocks } from "./lib/notes.js";
import { isCleanCheckin } from "./lib/playbook.js";
import { MARKET_SESSIONS, sessionOpenAtUTCHour } from "./lib/sessions.js";
import { drawShareCard } from "./lib/shareCard.js";
import { DARK_PALETTE, LIGHT_PALETTE, TAP, THEME_TRANSITION, TREDZI_LOGO_SRC, VOID_PALETTE, display, mono, palette, sans } from "./lib/theme.js";
import { formatCountdown, formatMinSec, nextOccurrenceMs } from "./lib/time.js";
import { AlertTriangle, ArrowLeftRight, Bell, Building2, Camera, CandlestickChart, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Download, Flame, Heart, LayoutGrid, Lightbulb, LogOut, MessageCircle, Moon, Newspaper, Palette, Pencil, Plus, RotateCcw, Scale, Search, Send, Settings, Share2, ShieldAlert, Sun, Table2, Tags, Trash2, Upload, Users, X } from "lucide-react";
import React, { Suspense, lazy, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, useTransition } from "react";
import "./typography.css";

// Bottom-dock sliding pill helpers (mobile).
function readDockActive(root) {
  const el = root && root.querySelector('[data-dock-active="true"]');
  return el ? { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight } : null;
}
function paintDockPill(pill, r) {
  if (!pill) return;
  if (!r) { pill.style.opacity = "0"; return; }
  pill.style.opacity = "1";
  pill.style.width = `${r.w}px`;
  pill.style.height = `${r.h}px`;
  pill.style.transform = `translate3d(${r.x}px, ${r.y}px, 0)`;
}

// Lazy tab that can be preloaded. Once its chunk is in memory the tab renders
// synchronously (no Suspense fallback flash), so the enter animation always
// plays against real content instead of an empty box.
function lazyTab(loader) {
  let Loaded = null;
  const load = () => loader().then((mod) => { Loaded = mod.default; return mod; });
  const Lazy = lazy(load);
  function Tab(props) {
    const [Comp] = useState(() => Loaded || Lazy); // fixed per mount, so state is never remounted
    return <Comp {...props} />;
  }
  Tab.preload = load;
  return Tab;
}
const RiskTab = lazyTab(() => import("./tabs/RiskTab.jsx"));
const PropFirmTab = lazyTab(() => import("./tabs/PropFirmTab.jsx"));
const ConvertTab = lazyTab(() => import("./tabs/ConvertTab.jsx"));
const CurveTab = lazyTab(() => import("./tabs/CurveTab.jsx"));
const InsightsTab = lazyTab(() => import("./tabs/InsightsTab.jsx"));
const JournalTab = lazyTab(() => import("./tabs/JournalTab.jsx"));
const NotepadTab = lazyTab(() => import("./tabs/NotepadTab.jsx"));
const SessionsTab = lazyTab(() => import("./tabs/SessionsTab.jsx"));
const CommunityTab = lazyTab(() => import("./tabs/CommunityTab.jsx"));
const BacktestTab = lazyTab(() => import("./tabs/BacktestTab.jsx"));
const BrokerTab = lazyTab(() => import("./tabs/BrokerTab.jsx"));
const TAB_PRELOAD = {
  risk: RiskTab.preload, propfirm: PropFirmTab.preload, fx: ConvertTab.preload,
  curve: CurveTab.preload, insights: InsightsTab.preload, journal: JournalTab.preload,
  sessions: SessionsTab.preload, community: CommunityTab.preload, broker: BrokerTab.preload,
  backtest: BacktestTab.preload,
};

// The Backtest tab is added here so constants.js stays untouched. If you later add a
// "backtest" entry to TABS in constants.js, this line simply uses that one instead.
const TABS = BASE_TABS.some((t) => t.id === "backtest")
  ? BASE_TABS
  : [...BASE_TABS, { id: "backtest", label: "Backtest", icon: CandlestickChart }];

// Warm the tab chunks in the background so switching tabs feels instant.
if (typeof window !== "undefined") {
  const warm = () => {
    import("./tabs/RiskTab.jsx");
    import("./tabs/PropFirmTab.jsx");
    import("./tabs/ConvertTab.jsx");
    import("./tabs/CurveTab.jsx");
    import("./tabs/InsightsTab.jsx");
    import("./tabs/JournalTab.jsx");
    import("./tabs/NotepadTab.jsx");
    import("./tabs/SessionsTab.jsx");
    import("./tabs/CommunityTab.jsx");
    import("./tabs/BacktestTab.jsx");
  };
  (window.requestIdleCallback || ((fn) => setTimeout(fn, 1500)))(warm);
}

export { RUNTIME, WEEK_MS } from "./lib/constants";

export default function TredziApp() {
  const [activeTab, setActiveTab] = useState("risk");
  // Bottom bar feels instant: the highlight, header title and icon follow the tap right away (pendingTab),
  // while the heavy tab content renders in the background (startTabTransition) and slides in when ready.
  const [pendingTab, setPendingTab] = useState(null);
  const [, startTabTransition] = useTransition();
  const dockTab = pendingTab ?? activeTab;
  const lastBodyRef = useRef(null);
  useEffect(() => { setPendingTab(null); }, [activeTab]);
  const goToTab = (id) => {
    if (id === dockTab) return;
    setPendingTab(id);
    startTabTransition(() => setActiveTab(id));
  };
  const crabPrevTabRef = useRef("risk");
  useEffect(() => {
    if (crabPrevTabRef.current !== activeTab) {
      crabPrevTabRef.current = activeTab;
      pokeCrab("peek", { say: "" });
    }
  }, [activeTab]);
  // Remembers the previous tab so the mobile switch animation knows which way to slide.
  const tabDirRef = useRef({ tab: "risk", dir: 1 });
  const ActiveTabIcon = TABS.find((t) => t.id === dockTab)?.icon || Scale;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsMobileSection, setSettingsMobileSection] = useState(null);
  const [settingsSearchQuery, setSettingsSearchQuery] = useState("");
  const [pulseOpen, setPulseOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  const [accounts, setAccounts] = useState([]);
  const [accountsLoaded, setAccountsLoaded] = useState(false);
  const [activeAccountId, setActiveAccountId] = useState(null);
  const [addingAccount, setAddingAccount] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [accountNameError, setAccountNameError] = useState("");
  const [editingAccountId, setEditingAccountId] = useState(null);
  const [editAccountName, setEditAccountName] = useState("");
  const [pendingAccountDelete, setPendingAccountDelete] = useState(null);
  const [accountDataLoaded, setAccountDataLoaded] = useState(false);

  const [riskSubTab, setRiskSubTab] = useState("challenge");
  const [edgeProjectionPeriodIdx, setEdgeProjectionPeriodIdx] = useState(1);
  const [pfFirmId, setPfFirmId] = useState(null);
  const [linkedFirm, setLinkedFirm] = useState(null); // { firmName, planLabel } once applied from the Prop Firm tab
  const [pfPlanId, setPfPlanId] = useState(null);
  const [pfSizeAmount, setPfSizeAmount] = useState(null);
  const [pfPhaseIdx, setPfPhaseIdx] = useState(0);
  const [pfSearch, setPfSearch] = useState("");
  const [pfMarketType, setPfMarketType] = useState("all");
  const [pfCompareMode, setPfCompareMode] = useState(false);
  const [pfCompareIds, setPfCompareIds] = useState([]);
  const [pfSortBy, setPfSortBy] = useState(null);
  const [pfFilterDdMode, setPfFilterDdMode] = useState("all");
  const [pfFilterInstant, setPfFilterInstant] = useState("all");
  const [pfFilterPhases, setPfFilterPhases] = useState("all");
  const [pfFilterPanelOpen, setPfFilterPanelOpen] = useState(false);
  const [sessionsSubTab, setSessionsSubTab] = useState("sessions");
  const [theme, setTheme] = useState("dark");
  const [themeLoaded, setThemeLoaded] = useState(false);

Object.assign(
  palette,
  theme === "light" ? LIGHT_PALETTE
    : theme === "void" ? VOID_PALETTE
    : DARK_PALETTE
);

const [edge, setEdge] = useState({
  accountBalance: "",
  rr: "",
  riskPct: "1",
  buffer: "5",
  totalTrades: "",
  totalWinTrades: "",
  totalLossTrades: "",
  tradesPerMonth: "",
});

const [cs, setCs] = useState(DEFAULT_CS_INPUTS);

  const [ps, setPs] = useState({
    balance: "",
    riskPct: "1",
    riskDollar: "",
    stopPips: "",
    valuePerPip: "10",
    preset: "forex",
  });

const threeCurveResult = useMemo(() => {
  const ratioTC = num(edge.rr);
  if (!(ratioTC > 0)) return null;

  const totalTradesTC = Math.max(0, Math.floor(num(edge.totalTrades)));
  const hasWinsInputTC = edge.totalWinTrades !== "";
  const hasLossesInputTC = edge.totalLossTrades !== "";
  let winTradesTC = Math.max(0, Math.floor(num(edge.totalWinTrades)));
  let lossTradesTC = Math.max(0, Math.floor(num(edge.totalLossTrades)));
  if (totalTradesTC > 0 && hasWinsInputTC && !hasLossesInputTC) {
    winTradesTC = Math.min(winTradesTC, totalTradesTC);
    lossTradesTC = totalTradesTC - winTradesTC;
  } else if (totalTradesTC > 0 && hasLossesInputTC && !hasWinsInputTC) {
    lossTradesTC = Math.min(lossTradesTC, totalTradesTC);
    winTradesTC = totalTradesTC - lossTradesTC;
  } else if (totalTradesTC > 0) {
    winTradesTC = Math.min(winTradesTC, totalTradesTC);
    lossTradesTC = Math.min(lossTradesTC, totalTradesTC - winTradesTC);
  }
  const hasTradeStatsTC = totalTradesTC > 0 && (hasWinsInputTC || hasLossesInputTC);
  const rrBeWinTC = (1 / (1 + ratioTC)) * 100;
  const computedWinRateTC = hasTradeStatsTC ? (winTradesTC / totalTradesTC) * 100 : rrBeWinTC;

  const tradesPerMonthTC = Math.max(0, Math.floor(num(edge.tradesPerMonth)));
  const tradesPerDayTC = tradesPerMonthTC / 30;
  const periodTC = EDGE_PROJECTION_PERIODS[edgeProjectionPeriodIdx];
  const selTradesTC = tradesPerDayTC * periodTC.days;
  if (!(selTradesTC > 0)) return null;

  const riskPctTC = num(edge.riskPct) || 1;
  const accountBalTC = num(edge.accountBalance);
  const riskDollarPerTradeTC = accountBalTC > 0 ? accountBalTC * (riskPctTC / 100) : 0;
  const spreadTC = num(edge.buffer) || 5;

  return generateThreeCurveProjection({
    winRatePct: computedWinRateTC,
    rr: ratioTC,
    spreadPct: spreadTC,
    numTrades: selTradesTC,
    riskDollarPerTrade: riskDollarPerTradeTC,
  });
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [
  edge.rr,
  edge.totalTrades,
  edge.totalWinTrades,
  edge.totalLossTrades,
  edge.tradesPerMonth,
  edge.riskPct,
  edge.accountBalance,
  edge.buffer,
  edgeProjectionPeriodIdx,
]);










const resetPropFirmWizard = () => {
  setPfFirmId(null);
  setPfPlanId(null);
  setPfSizeAmount(null);
  setPfPhaseIdx(0);
  setPfMarketType("all");
  setPfCompareMode(false);
  setPfCompareIds([]);
};

  const applyPropFirmToChallenge = (firm, plan, phase) => {
    setCs({
      ...cs,
      startBal: pfSizeAmount ? String(pfSizeAmount) : cs.startBal,
      targetPct: phase.targetPct,
      dailyLossPct: phase.dailyLossPct,
      maxDrawdownPct: phase.maxDrawdownPct,
      ddMode: phase.ddMode,
      rule: phase.consistencyPct,
      minTradingDays: plan.minTradingDays != null ? String(plan.minTradingDays) : "0",
      minTrades: plan.minTrades != null ? String(plan.minTrades) : "0",
      minDayGainPct: plan.minDayGainPct != null ? String(plan.minDayGainPct) : "0",
      profitSplitPct: plan.profitSplitPct != null ? String(plan.profitSplitPct) : cs.profitSplitPct,
    });
    const newLinkedFirm = { firmName: firm.name, planLabel: plan.label };
    setLinkedFirm(newLinkedFirm);
    if (activeAccountId) {
      window.storage
        .set(scopedKey(LINKED_FIRM_KEY, activeAccountId), JSON.stringify(newLinkedFirm), false)
        .catch(() => {});
    }
    setActiveTab("risk");
    setRiskSubTab("challenge");
  };

  const [fx, setFx] = useState({ amount: "100", from: "USD", to: "BDT", customRate: "" });
  const [calcInputsLoaded, setCalcInputsLoaded] = useState(false);

  const [liveFxRates, setLiveFxRates] = useState(null);
  const [fxRatesDate, setFxRatesDate] = useState(null);
  const [fxRatesStatus, setFxRatesStatus] = useState("idle");

  const [trades, setTrades] = useState([]);
  const tradesRef = useRef([]);
  tradesRef.current = trades;
  const [tradesLoaded, setTradesLoaded] = useState(false);
  const [tradeInput, setTradeInput] = useState("");
  const [tradePair, setTradePair] = useState("");
  const [tradeNote, setTradeNote] = useState("");
  const [tradeEmotion, setTradeEmotion] = useState(null);
  const [tradeSetup, setTradeSetup] = useState(null);
  const [startingBalance, setStartingBalance] = useState("");
  const [tradesLoadError, setTradesLoadError] = useState("");
  const [calMonth, setCalMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [showStreakInfo, setShowStreakInfo] = useState(false);
  const [showDisciplineInfo, setShowDisciplineInfo] = useState(false);

  const [expandedMetric, setExpandedMetric] = useState(null);
  const [expandedHeatmapDay, setExpandedHeatmapDay] = useState(null);
  const [insightReportMsg, setInsightReportMsg] = useState("");
  const [insightsSubTab, setInsightsSubTab] = useState("overview");
  const [coachMessages, setCoachMessages] = useState([]);
  const [coachInput, setCoachInput] = useState("");
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachError, setCoachError] = useState("");
  const [coachRemaining, setCoachRemaining] = useState(null);
  const [coachChats, setCoachChats] = useState([]); // saved chats: [{ id, title, updatedAt }]
  const [coachChatId, setCoachChatId] = useState(null); // null = a fresh, unsaved chat
  const [coachChatsMax, setCoachChatsMax] = useState(5);
  const [coachHistoryOpen, setCoachHistoryOpen] = useState(false);
  const [coachDeleteConfirmId, setCoachDeleteConfirmId] = useState(null);
  const coachScrollRef = useRef(null);

  const [journalSubTab, setJournalSubTab] = useState("log");
  const [journalEntries, setJournalEntries] = useState([]);
  const [journalLoaded, setJournalLoaded] = useState(false);
  const [journalYear, setJournalYear] = useState(() => new Date().getFullYear());
  const [journalMonth, setJournalMonth] = useState(null);
  const [journalColWidths, setJournalColWidths] = useState(DEFAULT_JOURNAL_COL_WIDTHS);
  const journalResizeRef = useRef(null);
  const journalCellRefs = useRef({});
  const [journalFocusRowId, setJournalFocusRowId] = useState(null);
  const [journalExportMsg, setJournalExportMsg] = useState("");
  const journalImportInputRef = useRef(null);
  const [journalImportMsg, setJournalImportMsg] = useState("");
  const [journalExpandedRows, setJournalExpandedRows] = useState({});
  const journalPhotoInputRef = useRef(null);
  const [journalPhotoTarget, setJournalPhotoTarget] = useState(null);
  const [journalPhotoSaving, setJournalPhotoSaving] = useState(false);
  const [journalPhotoError, setJournalPhotoError] = useState("");
  const [viewingJournalPhoto, setViewingJournalPhoto] = useState(null);
  const [pendingJournalPhotoDelete, setPendingJournalPhotoDelete] = useState(null);
  const [journalInsightYear, setJournalInsightYear] = useState(() => new Date().getFullYear());
  const [journalInsightMonth, setJournalInsightMonth] = useState(null);

  const [playbookRules, setPlaybookRules] = useState([]);
  const [playbookRulesLoaded, setPlaybookRulesLoaded] = useState(false);
  const [playbookCheckins, setPlaybookCheckins] = useState([]);
  const [playbookCheckinsLoaded, setPlaybookCheckinsLoaded] = useState(false);
  const [newRuleText, setNewRuleText] = useState("");
  const [playbookRuleError, setPlaybookRuleError] = useState("");
  const [todayResults, setTodayResults] = useState({});
  const [playbookMsg, setPlaybookMsg] = useState("");

  const [editingTradeId, setEditingTradeId] = useState(null);
  const logFormRef = useRef(null);

  const [customSetups, setCustomSetups] = useState([]);
  const [customSetupsLoaded, setCustomSetupsLoaded] = useState(false);
  const [hiddenDefaultSetupIds, setHiddenDefaultSetupIds] = useState([]);
  const [hiddenDefaultSetupsLoaded, setHiddenDefaultSetupsLoaded] = useState(false);
  const [addingSetup, setAddingSetup] = useState(false);
  const [newSetupName, setNewSetupName] = useState("");
  const [setupError, setSetupError] = useState("");

  const [customMoods, setCustomMoods] = useState([]);
  const [customMoodsLoaded, setCustomMoodsLoaded] = useState(false);
  const [addingMood, setAddingMood] = useState(false);
  const [newMoodName, setNewMoodName] = useState("");
  const [newMoodEmoji, setNewMoodEmoji] = useState("🙂");
  const [moodError, setMoodError] = useState("");

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [pendingSettingsReset, setPendingSettingsReset] = useState(false);
  const [pendingRevengeLog, setPendingRevengeLog] = useState(false);
  const [tourActive, setTourActive] = useState(false);
const [tourStep, setTourStep] = useState(0);
const [tourRect, setTourRect] = useState(null);

const startTour = () => {
  setTourStep(0);
  setTourActive(true);
};

const endTour = (markComplete = true) => {
  setTourActive(false);
  setTourRect(null);
  if (markComplete && !settings.tourCompleted) {
    persistSettings({ ...settings, tourCompleted: true });
  }
};

const goToTourStep = (idx) => {
  if (idx < 0) return;
  if (idx >= TOUR_STEPS.length) {
    endTour(true);
    return;
  }
  setTourStep(idx);
};

useEffect(() => {
  if (!settingsLoaded) return;
  if (settings.tourCompleted) return;
  if (tourActive) return;
  const t = setTimeout(() => {
    setTourStep(0);
    setTourActive(true);
  }, 700);
  return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [settingsLoaded]);

useEffect(() => {
  const tpm = Math.max(0, Math.floor(num(edge.tradesPerMonth)));
  if (tpm <= 0) return;
  const period = EDGE_PROJECTION_PERIODS[edgeProjectionPeriodIdx];
  const tradesPerDay = tpm / 30;
  const projected = Math.round(tradesPerDay * period.days);
  setEdge((e) => {
    if (String(projected) === e.totalTrades) return e;
    return { ...e, totalTrades: String(projected) };
  });
}, [edge.tradesPerMonth, edgeProjectionPeriodIdx]);

useEffect(() => {
  if (!tourActive) return;
  const step = TOUR_STEPS[tourStep];
  if (!step) return;
  if (step.tabId) setActiveTab(step.tabId);

  let cancelled = false;
  const locate = (attemptsLeft) => {
    requestAnimationFrame(() => {
      if (cancelled) return;
      if (!step.target) {
        setTourRect(null);
        return;
      }
      const el = document.querySelector(`[data-tour-id="${step.target}"]`);
      if (el) {
        const r = el.getBoundingClientRect();
        setTourRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      } else if (attemptsLeft > 0) {
        locate(attemptsLeft - 1);
      } else {
        setTourRect(null);
        setTourStep((cur) => (cur === tourStep ? Math.min(cur + 1, TOUR_STEPS.length - 1) : cur));
      }
    });
  };
  locate(6);

  const onResize = () => {
    if (!step.target) return;
    const el = document.querySelector(`[data-tour-id="${step.target}"]`);
    if (el) {
      const r = el.getBoundingClientRect();
      setTourRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    }
  };
  window.addEventListener("resize", onResize);
  return () => {
    cancelled = true;
    window.removeEventListener("resize", onResize);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [tourActive, tourStep]);

RUNTIME.REVENGE_WINDOW_MINUTES = num(settings.revengeWindowMinutes) || 15;
RUNTIME.REVENGE_WINDOW_MS = RUNTIME.REVENGE_WINDOW_MINUTES * 60 * 1000;
RUNTIME.ALARM_LEAD_MINUTES = num(settings.alarmLeadMinutes) || 15;
RUNTIME.ALARM_LEAD_MS = RUNTIME.ALARM_LEAD_MINUTES * 60 * 1000;

  const [expandedTradeId, setExpandedTradeId] = useState(null);
  const screenshotInputRef = useRef(null);
  const [screenshotTargetId, setScreenshotTargetId] = useState(null);
  const [screenshotError, setScreenshotError] = useState("");
  const [screenshotSaving, setScreenshotSaving] = useState(false);
  const [viewingScreenshot, setViewingScreenshot] = useState(null);
  const [screenshotShareMsg, setScreenshotShareMsg] = useState("");
  const [pendingScreenshotDelete, setPendingScreenshotDelete] = useState(null);

  const [newsEvents, setNewsEvents] = useState([]);
  const [newsLoaded, setNewsLoaded] = useState(false);
  const [econEvents, setEconEvents] = useState([]);
  const [econStatus, setEconStatus] = useState("idle"); // idle | loading | live | error
  const [econError, setEconError] = useState("");
  const [newEventName, setNewEventName] = useState("");
  const [newEventImpact, setNewEventImpact] = useState("high");
  const [newEventDate, setNewEventDate] = useState("");
  const [newEventTime, setNewEventTime] = useState("18:30");
  const [newEventAlarm, setNewEventAlarm] = useState(true);
  const [newsLoadError, setNewsLoadError] = useState("");

  const [notifPermission, setNotifPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );
  const [ringingEvent, setRingingEvent] = useState(null);
  const audioCtxRef = useRef(null);
  const beepIntervalRef = useRef(null);

  const shareCanvasRef = useRef(null);
  const [shareImageUrl, setShareImageUrl] = useState(null);
  const [shareError, setShareError] = useState("");

  const [currentTime, setCurrentTime] = useState(() => new Date());

   const [viewportWidth, setViewportWidth] = useState(
   typeof window !== "undefined" ? window.innerWidth : 440
  );
  useEffect(() => {
   const onResize = () => setViewportWidth(window.innerWidth);
   window.addEventListener("resize", onResize);
   return () => window.removeEventListener("resize", onResize);
  }, []);

  const isDesktop = viewportWidth >= 1024;
  const isTablet = viewportWidth >= 640 && viewportWidth < 1024;
  const isNarrowScreen = viewportWidth < 640;
  const isPro = true;

  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const [goals, setGoals] = useState({ weeklyTargetPct: "", monthlyTargetPct: "" });
  const [statementPeriod, setStatementPeriod] = useState(null); // { year, type: 'month'|'quarter'|'year', index }
  const [goalsLoaded, setGoalsLoaded] = useState(false);
  const [swRegistration, setSwRegistration] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await window.storage.get(GOALS_STORAGE_KEY, false);
        if (cancelled) return;
        if (res && res.value) {
          const parsed = JSON.parse(res.value);
          if (parsed && typeof parsed === "object") {
            setGoals({ weeklyTargetPct: parsed.weeklyTargetPct || "", monthlyTargetPct: parsed.monthlyTargetPct || "" });
          }
        }
      } catch (err) {
        // non-critical, fail silently
      } finally {
        if (!cancelled) setGoalsLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const reg = await registerAlarmServiceWorker();
      if (!cancelled) setSwRegistration(reg);
    })();
    return () => { cancelled = true; };
  }, []);

  const persistGoals = async (next) => {
    setGoals(next);
    try {
      await window.storage.set(GOALS_STORAGE_KEY, JSON.stringify(next), false);
    } catch (err) {
      // non-critical, fail silently
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await window.storage.get(FX_LAST_PAIR_KEY, false);
        if (cancelled) return;
        if (res && res.value) {
          const parsed = JSON.parse(res.value);
          if (parsed && parsed.from && parsed.to) {
            setFx((f) => ({ ...f, from: parsed.from, to: parsed.to }));
          }
        }
      } catch (err) {
        // non-critical, fail silently
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    window.storage
      .set(FX_LAST_PAIR_KEY, JSON.stringify({ from: fx.from, to: fx.to }), false)
      .catch(() => {});
  }, [fx.from, fx.to]);

    useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [edgeRes, psRes] = await Promise.allSettled([
          window.storage.get(EDGE_STORAGE_KEY, false),
          window.storage.get(PS_STORAGE_KEY, false),
        ]);
        if (cancelled) return;
        if (edgeRes.status === "fulfilled" && edgeRes.value) {
          const parsed = JSON.parse(edgeRes.value.value);
          if (parsed && typeof parsed === "object") setEdge((e) => ({ ...e, ...parsed }));
        }
        if (psRes.status === "fulfilled" && psRes.value) {
          const parsed = JSON.parse(psRes.value.value);
          if (parsed && typeof parsed === "object") setPs((p) => ({ ...p, ...parsed }));
        }
      } catch (err) {
        // non-critical, fail silently
      } finally {
        if (!cancelled) setCalcInputsLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!calcInputsLoaded) return;
    window.storage.set(EDGE_STORAGE_KEY, JSON.stringify(edge), false).catch(() => {});
  }, [edge, calcInputsLoaded]);

  useEffect(() => {
    if (!accountDataLoaded || !activeAccountId) return;
    window.storage.set(scopedKey(CS_STORAGE_KEY, activeAccountId), JSON.stringify(cs), false).catch(() => {});
  }, [cs, accountDataLoaded, activeAccountId]);

  useEffect(() => {
    if (!calcInputsLoaded) return;
    window.storage.set(PS_STORAGE_KEY, JSON.stringify(ps), false).catch(() => {});
  }, [ps, calcInputsLoaded]);

  const [copyMsg, setCopyMsg] = useState("");
  const [copyFallbackText, setCopyFallbackText] = useState("");

  const fileInputRef = useRef(null);
  const [backupMsg, setBackupMsg] = useState("");
  const [pendingImport, setPendingImport] = useState(null);
  const masterImportInputRef = useRef(null);
  const [masterExportMsg, setMasterExportMsg] = useState("");
  const [pendingMasterImport, setPendingMasterImport] = useState(null);

  const [notepadNotes, setNotepadNotes] = useState([]);
  const [notepadLoaded, setNotepadLoaded] = useState(false);
  const [activeNoteId, setActiveNoteId] = useState(null);
  const [notepadSearch, setNotepadSearch] = useState("");
  const [notepadFindOpen, setNotepadFindOpen] = useState(false);
  const [notepadFindText, setNotepadFindText] = useState("");
  const [notepadReplaceText, setNotepadReplaceText] = useState("");
  const [notepadMsg, setNotepadMsg] = useState("");
  const notepadBlockRefs = useRef({});
  const notepadRefCallbackCache = useRef({});
  const getNotepadBlockRef = (noteId, blockId) => {
    const key = `${noteId}:${blockId}`;
    if (!notepadRefCallbackCache.current[key]) {
      notepadRefCallbackCache.current[key] = (el) => {
        if (el) {
          notepadBlockRefs.current[key] = el;
          autoGrowBlock(el);
        } else {
          delete notepadBlockRefs.current[key];
          delete notepadRefCallbackCache.current[key];
        }
      };
    }
    return notepadRefCallbackCache.current[key];
  };
  const notepadActiveBlockRef = useRef({ noteId: null, blockId: null, pos: 0 });
  const [notepadFocusBlock, setNotepadFocusBlock] = useState(null);
  const [pendingNoteDelete, setPendingNoteDelete] = useState(null);


  // --- Community state ---
  const [communityUsername, setCommunityUsername] = useState("");
  const [communityUsernameLoaded, setCommunityUsernameLoaded] = useState(false);
  const [communityUsernameDraft, setCommunityUsernameDraft] = useState("");
  const [communityUsernameError, setCommunityUsernameError] = useState("");
  const [communityUsernameBusy, setCommunityUsernameBusy] = useState(false);
  const [communityAvatar, setCommunityAvatar] = useState("");
  const [communityAvatarUploading, setCommunityAvatarUploading] = useState(false);

  // --- Community auth state ---
  const [session, setSession] = useState(null); // { token, userId, email } | null
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [authMode, setAuthMode] = useState("login"); // "login" | "signup"
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authScreenStep, setAuthScreenStep] = useState("choice"); // "choice" | "form"
  // Forgot-password flow: null (normal form) -> "request" (enter email) -> "reset" (enter code + new password)
  const [authForgotStep, setAuthForgotStep] = useState(null);
  const [authResetCode, setAuthResetCode] = useState("");
  const [authNewPassword, setAuthNewPassword] = useState("");
  const [authInfo, setAuthInfo] = useState("");
  const [authResendIn, setAuthResendIn] = useState(0);
  useEffect(() => {
    if (authResendIn <= 0) return undefined;
    const t = setTimeout(() => setAuthResendIn((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [authResendIn]);

  // --- Change password (Profile settings) ---
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = useState("");
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [changePasswordError, setChangePasswordError] = useState("");
  const [changePasswordMsg, setChangePasswordMsg] = useState("");
  const [changePasswordBusy, setChangePasswordBusy] = useState(false);
  const [accountProfileError, setAccountProfileError] = useState("");

  // --- Onboarding carousel state ---
  const [onboardingSeen, setOnboardingSeen] = useState(false);
  const [onboardingSeenLoaded, setOnboardingSeenLoaded] = useState(false);
  const [onboardingIndex, setOnboardingIndex] = useState(0);
  const [onboardingDragX, setOnboardingDragX] = useState(0);
  const [onboardingDragging, setOnboardingDragging] = useState(false);
  const onboardingDragStartXRef = useRef(null);
  const onboardingDraggingRef = useRef(false);
  const [myGroups, setMyGroups] = useState([]);
  const [myGroupsLoaded, setMyGroupsLoaded] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [groupMessages, setGroupMessages] = useState([]);
  const groupMessagesRef = useRef([]);
  groupMessagesRef.current = groupMessages;
  // Last-known messages per group (kept in memory). Opening a group shows these instantly,
  // then only the few new messages are fetched, instead of re-downloading the whole chat.
  const groupMessagesCacheRef = useRef({});
  const [groupMessagesLoaded, setGroupMessagesLoaded] = useState(false);
  const [communityApiError, setCommunityApiError] = useState("");
  const [addingGroup, setAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [newGroupCode, setNewGroupCode] = useState("");
  const [groupCodeError, setGroupCodeError] = useState("");
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [joinCodeError, setJoinCodeError] = useState("");
  const [joiningGroup, setJoiningGroup] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [communityMsgText, setCommunityMsgText] = useState("");
  const [communityMsgMode, setCommunityMsgMode] = useState("chat");
  const [stickerPacks, setStickerPacks] = useState([]);
  const [stickerPacksLoaded, setStickerPacksLoaded] = useState(false);
  const [stickerPickerOpen, setStickerPickerOpen] = useState(false);
  const [stickerManageMode, setStickerManageMode] = useState(false);
  const [stickerActivePackId, setStickerActivePackId] = useState(null);
  const [stickerNewPackName, setStickerNewPackName] = useState("");
  const [stickerUploading, setStickerUploading] = useState(false);
  const [stickerError, setStickerError] = useState("");
  const stickerFileInputRef = useRef(null);
  const [signalPair, setSignalPair] = useState("");
  const [signalDirection, setSignalDirection] = useState("buy");
  const [signalEntry, setSignalEntry] = useState("");
  const [signalSL, setSignalSL] = useState("");
  const [signalTP, setSignalTP] = useState("");
  const [signalComposerOpen, setSignalComposerOpen] = useState(false);
  const communityMessagesEndRef = useRef(null);
const [groupManageOpen, setGroupManageOpen] = useState(false);
const [groupManageTab, setGroupManageTab] = useState("members");
const [manageNameDraft, setManageNameDraft] = useState("");
const [manageDescDraft, setManageDescDraft] = useState("");
const [manageMsg, setManageMsg] = useState("");
const [pendingKick, setPendingKick] = useState(null);
const [pendingDeleteMsg, setPendingDeleteMsg] = useState(null);
const [pendingDeleteGroup, setPendingDeleteGroup] = useState(false);
const [regeneratingCode, setRegeneratingCode] = useState(false);
const [newInviteCode, setNewInviteCode] = useState("");
const [groupAvatarUploading, setGroupAvatarUploading] = useState(false);
const groupAvatarInputRef = useRef(null);
const [groupAvatarMap, setGroupAvatarMap] = useState({});
const [groupMembersList, setGroupMembersList] = useState([]);
const [groupMembersLoaded, setGroupMembersLoaded] = useState(false);
const [groupInfo, setGroupInfo] = useState(null);
const [groupIdeas, setGroupIdeas] = useState([]);
const [groupIdeasLoaded, setGroupIdeasLoaded] = useState(false);
const [newIdeaPair, setNewIdeaPair] = useState("");
const [newIdeaText, setNewIdeaText] = useState("");
const [newIdeaImage, setNewIdeaImage] = useState(null);
const [ideaImageUploading, setIdeaImageUploading] = useState(false);
const ideaImageInputRef = useRef(null);
const [groupQuestions, setGroupQuestions] = useState([]);
const [groupQuestionsLoaded, setGroupQuestionsLoaded] = useState(false);
const [newQuestionText, setNewQuestionText] = useState("");
const [qaReplyDrafts, setQaReplyDrafts] = useState({});
const [qaOpenId, setQaOpenId] = useState(null);
const [communityPanelTab, setCommunityPanelTab] = useState("chat");
const [communityChatSubView, setCommunityChatSubView] = useState("chat"); // "chat" | "signal"
const [communityFeedSubView, setCommunityFeedSubView] = useState("feed"); // "feed" | "wall"
const [communityOpenTabDropdown, setCommunityOpenTabDropdown] = useState(null); // group id currently showing its dropdown, or null
const [signalStatsOpen, setSignalStatsOpen] = useState(false);
const [leaderboardMetric, setLeaderboardMetric] = useState("winRate");
const [groupPosts, setGroupPosts] = useState([]);
const [groupPostsLoaded, setGroupPostsLoaded] = useState(false);
const [newPostText, setNewPostText] = useState("");
const [newPostImage, setNewPostImage] = useState(null);
const [postImageUploading, setPostImageUploading] = useState(false);
const postImageInputRef = useRef(null);
const [groupVault, setGroupVault] = useState([]);
const [groupVaultLoaded, setGroupVaultLoaded] = useState(false);
const [newVaultTitle, setNewVaultTitle] = useState("");
const [newVaultUrl, setNewVaultUrl] = useState("");
const [newVaultText, setNewVaultText] = useState("");
const [groupWall, setGroupWall] = useState([]);
const [groupWallLoaded, setGroupWallLoaded] = useState(false);
const [newWallText, setNewWallText] = useState("");
const [myWallIds, setMyWallIds] = useState([]);
const [relatedWallIds, setRelatedWallIds] = useState([]);
const [groupFeed, setGroupFeed] = useState([]);
const [groupFeedLoaded, setGroupFeedLoaded] = useState(false);
const [newFeedText, setNewFeedText] = useState("");
const [newFeedPnl, setNewFeedPnl] = useState("");
const [newFeedImage, setNewFeedImage] = useState(null);
const [feedImageUploading, setFeedImageUploading] = useState(false);
const feedImageInputRef = useRef(null);
const [likedFeedIds, setLikedFeedIds] = useState([]);
const [myFeedReactions, setMyFeedReactions] = useState({}); // { [postId]: reactionKey }
const [feedComments, setFeedComments] = useState({}); // { [postId]: [{id, author, text, ts}] }
const [feedCommentsOpenId, setFeedCommentsOpenId] = useState(null);
const [feedCommentsLoading, setFeedCommentsLoading] = useState({});
const [commentDrafts, setCommentDrafts] = useState({});
const [storyViewer, setStoryViewer] = useState(null); // { authorIdx, slideIdx }
const [storyPaused, setStoryPaused] = useState(false);
const [storyProgressPct, setStoryProgressPct] = useState(0);
// Stories live in their own table/endpoints — they are NOT feed posts.
const [groupStories, setGroupStories] = useState([]);
const [groupStoriesLoaded, setGroupStoriesLoaded] = useState(false);
const storyImageInputRef = useRef(null);
const [storyDraft, setStoryDraft] = useState(null); // { image } while the story composer is open
const [storyCaption, setStoryCaption] = useState("");
const [storyPosting, setStoryPosting] = useState(false);
const [myStoryReactions, setMyStoryReactions] = useState({}); // { [storyId]: reactionKey }
const [seenStoryIds, setSeenStoryIds] = useState(() => {
  try { return JSON.parse(localStorage.getItem("community:seen-stories") || "[]"); } catch (e) { return []; }
});
const [pinnedMessageId, setPinnedMessageId] = useState(null);
const [replyingTo, setReplyingTo] = useState(null); // { id, author, preview }
// --- Typing indicator + online presence ---
const [typingUsers, setTypingUsers] = useState([]); // usernames currently typing (excludes me)
const typingPingRef = useRef(0); // last time (ms) we told the server we're typing
// --- Message reactions (chat + signals) ---
const [reactionPickerFor, setReactionPickerFor] = useState(null); // message id with the emoji picker open
const REACTION_EMOJIS = ["👍", "🔥", "😂", "😮", "🎯", "❤️"];
// --- Signal threads (replying to a signal opens a mini conversation under it) ---
const [openThreadId, setOpenThreadId] = useState(null); // signal message id whose thread panel is open
const [threadReplies, setThreadReplies] = useState({}); // { [signalId]: [{id, author, text, ts}] }
const [threadLoading, setThreadLoading] = useState({}); // { [signalId]: bool }
const [threadDraft, setThreadDraft] = useState("");
// --- Followers (Instagram-style) ---
const [followBusy, setFollowBusy] = useState(false);
const [followListOpen, setFollowListOpen] = useState(null); // { username, kind: "followers"|"following" }
const [followListData, setFollowListData] = useState([]);
const [followListLoading, setFollowListLoading] = useState(false);
const [followListQuery, setFollowListQuery] = useState("");
const followListReqRef = useRef(0);

// --- Profile tab (Instagram-style profile page) ---
const [profileView, setProfileView] = useState(null); // username being viewed; null = my own profile
const [profileOpen, setProfileOpen] = useState(false); // the full-screen Profile section
const [profileHistory, setProfileHistory] = useState([]); // previous profiles, so Back walks back through them
const [profileData, setProfileData] = useState(null);
const [profileLoading, setProfileLoading] = useState(false);
const [profileError, setProfileError] = useState("");
const [profilePosts, setProfilePosts] = useState([]);
const [profilePostsLoaded, setProfilePostsLoaded] = useState(false);
const [profilePostsNext, setProfilePostsNext] = useState(null);
const [profileSubTab, setProfileSubTab] = useState("posts"); // "posts" | "stats"
const [profilePostOpen, setProfilePostOpen] = useState(null);
const [bioEditing, setBioEditing] = useState(false);
const [bioDraft, setBioDraft] = useState("");
const [bioSaving, setBioSaving] = useState(false);
const profileAvatarInputRef = useRef(null);
// New-post composer for the Profile tab's own Posts grid — Instagram-style, and separate
// from posting to a group's feed (different table on the backend: profile_posts).
const [profileComposerOpen, setProfileComposerOpen] = useState(false);
const [profilePostText, setProfilePostText] = useState("");
const [profilePostImage, setProfilePostImage] = useState(null);
const [profilePostImageUploading, setProfilePostImageUploading] = useState(false);
const [profilePostSubmitting, setProfilePostSubmitting] = useState(false);
const profilePostImageInputRef = useRef(null);
// Instagram-style thread under the open profile post
const [profileComments, setProfileComments] = useState([]);
const [profileCommentsLoading, setProfileCommentsLoading] = useState(false);
const [profileCommentDraft, setProfileCommentDraft] = useState("");
const [profileCommentSending, setProfileCommentSending] = useState(false);
const profileCommentInputRef = useRef(null);
const [profilePostMenuOpen, setProfilePostMenuOpen] = useState(false);
const [profileEmojiOpen, setProfileEmojiOpen] = useState(false);
const [openRoleMenuFor, setOpenRoleMenuFor] = useState(null); // username whose role menu is open
const [communityLobbyTab, setCommunityLobbyTab] = useState("global"); // "global" | "mine"
const [pendingJoinRequests, setPendingJoinRequests] = useState([]);
const [pendingJoinRequestsLoaded, setPendingJoinRequestsLoaded] = useState(false);
const [communitySearch, setCommunitySearch] = useState("");
const [communitySearchLoading, setCommunitySearchLoading] = useState(false);
const [communitySearchResults, setCommunitySearchResults] = useState(null);
const [globalFeed, setGlobalFeed] = useState([]);
const [globalFeedLoaded, setGlobalFeedLoaded] = useState(false);
const [communityMobileFeedOpen, setCommunityMobileFeedOpen] = useState(false);
const [mobileNavHidden, setMobileNavHidden] = useState(false);
useEffect(() => { setMobileNavHidden(false); }, [activeTab]);
const lastNavScrollYRef = useRef(0);
const dockRef = useRef(null);
useEffect(() => {
  // Warm all tab chunks once the app is idle so tab switches never wait on the network.
  const warm = () => Object.values(TAB_PRELOAD).forEach((p) => { try { p().catch(() => {}); } catch (e) { /* ignore */ } });
  const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 1200));
  const cancel = window.cancelIdleCallback || clearTimeout;
  const id = idle(warm, { timeout: 4000 });
  return () => cancel(id);
}, []);
// Dock: the active item carries its own highlight (CSS transition), so there is no per-frame measuring.
// After the label has unfolded, centre the active item in the scrollable dock.
useEffect(() => {
  if (isDesktop) return undefined;
  const root = dockRef.current;
  if (!root) return undefined;
  const center = () => {
    const btn = root.querySelector('[data-dock-active="true"]');
    const item = btn && btn.parentElement;
    if (!item) return;
    const left = Math.max(0, Math.min(root.scrollWidth - root.clientWidth, item.offsetLeft + item.offsetWidth / 2 - root.clientWidth / 2));
    if (Math.abs(root.scrollLeft - left) > 2) root.scrollTo({ left, behavior: "smooth" });
  };
  const t1 = setTimeout(center, 80);
  const t2 = setTimeout(center, 380);
  return () => { clearTimeout(t1); clearTimeout(t2); };
}, [dockTab, isDesktop]);
const [lightboxPost, setLightboxPost] = useState(null); // global-feed post being viewed full-screen, or null
const [globalFeedPending, setGlobalFeedPending] = useState([]);
const [globalFeedNewCount, setGlobalFeedNewCount] = useState(0);
const [globalFeedNext, setGlobalFeedNext] = useState(null);
const [globalFeedComposerOpen, setGlobalFeedComposerOpen] = useState(false);
const [globalPostText, setGlobalPostText] = useState("");
const [globalPostImage, setGlobalPostImage] = useState(null);
const [globalPostImageUploading, setGlobalPostImageUploading] = useState(false);
const [globalPostSubmitting, setGlobalPostSubmitting] = useState(false);
const globalPostImageInputRef = useRef(null);
const [globalFeedComments, setGlobalFeedComments] = useState({});
const [globalFeedCommentsOpenId, setGlobalFeedCommentsOpenId] = useState(null);
const [globalFeedCommentsLoading, setGlobalFeedCommentsLoading] = useState({});
const [globalFeedCommentDrafts, setGlobalFeedCommentDrafts] = useState({});
const [groupJoinRequests, setGroupJoinRequests] = useState([]);
const [groupJoinRequestsLoaded, setGroupJoinRequestsLoaded] = useState(false);
const [newGroupPublic, setNewGroupPublic] = useState(false);
const [newGroupTags, setNewGroupTags] = useState("");


const searchCommunity = async (value) => {
  const q = String(value || "").trim();
  if (!q || !session?.token) return;
  setCommunitySearch(q);
  setCommunitySearchLoading(true);
  setCommunityLobbyTab("search");
  setActiveGroupId(null);
  try {
    const data = await communityApi(`/community/search?q=${encodeURIComponent(q)}`, {
      headers: { Authorization: `Bearer ${session.token}` },
    });
    setCommunitySearchResults(data);
  } catch (err) {
    setCommunitySearchResults({
      query: q,
      profile: null,
      posts: [],
      relatedPosts: [],
      error: err.message || "Search failed.",
    });
  } finally {
    setCommunitySearchLoading(false);
  }
};

const renderCommunitySearch = () => {
  const result = communitySearchResults;
  const profile = result?.profile || null;
  const ownPosts = Array.isArray(result?.posts) ? result.posts : [];
  const relatedPosts = Array.isArray(result?.relatedPosts) ? result.relatedPosts : [];
  const postCard = (post, key) => (
    <button
      key={key}
      type="button"
      onClick={() => openCommunityMemberProfile(post.author)}
      className={`w-full text-left rounded-2xl p-3.5 mb-2 ${TAP}`}
      style={{ background: palette.surface, border: `1px solid ${palette.border}` }}
    >
      <div className="flex items-center gap-2.5">
        <Avatar name={post.author} size={34} src={avatarForAuthor(post.author)} />
        <div className="min-w-0 flex-1">
          <div className="truncate" style={{ color: palette.text, fontSize: "12.5px", fontWeight: 800 }}>{post.author}</div>
          <div style={{ color: palette.textFaint, fontSize: "9.5px", marginTop: "2px" }}>{feedTimeAgo(post.ts)}</div>
        </div>
        {post.likeCount > 0 && <span style={{ color: palette.textFaint, fontSize: "10px", fontFamily: mono }}>{post.likeCount} likes</span>}
      </div>
      {post.text && <div className="mt-2" style={{ color: palette.textMuted, fontSize: "12px", lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{post.text}</div>}
      {post.image && <img src={post.image} alt="" className="mt-2 rounded-xl w-full" style={{ maxHeight: "260px", objectFit: "cover" }} />}
    </button>
  );

  return (
    <div className="h-full overflow-y-auto" style={{ background: palette.bg }}>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Search size={15} style={{ color: palette.gold }} />
          <span style={{ color: palette.text, fontFamily: mono, fontSize: "12px", fontWeight: 800 }}>Search</span>
        </div>
        {communitySearchLoading ? (
          <div className="rounded-2xl p-5 text-center" style={{ background: palette.surface, border: `1px solid ${palette.border}`, color: palette.textMuted, fontSize: "12px" }}>Searching…</div>
        ) : result?.error ? (
          <div className="rounded-2xl p-5" style={{ background: palette.surface, border: `1px solid ${palette.border}`, color: palette.red, fontSize: "12px" }}>{result.error}</div>
        ) : !result || (!profile && ownPosts.length === 0 && relatedPosts.length === 0) ? (
          <div className="rounded-2xl p-5 text-center" style={{ background: palette.surface, border: `1px solid ${palette.border}` }}>
            <div style={{ color: palette.text, fontSize: "13px", fontWeight: 700 }}>No results</div>
            <div style={{ color: palette.textFaint, fontSize: "11px", marginTop: "4px" }}>Try another username or keyword.</div>
          </div>
        ) : (
          <>
            {profile && (
              <div className="mb-5">
                <div className="mb-2" style={{ color: palette.textFaint, fontFamily: mono, fontSize: "9.5px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>Profile</div>
                <button type="button" onClick={() => openCommunityMemberProfile(profile.username)} className={`w-full flex items-center gap-3 rounded-2xl p-4 text-left ${TAP}`} style={{ background: palette.surface, border: `1px solid ${palette.border}` }}>
                  <Avatar name={profile.username} size={46} src={profile.avatar || avatarForAuthor(profile.username)} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate" style={{ color: palette.text, fontSize: "14px", fontWeight: 800 }}>{profile.username}</div>
                    {profile.bio && <div className="mt-1" style={{ color: palette.textMuted, fontSize: "11px", lineHeight: 1.4 }}>{profile.bio}</div>}
                  </div>
                  <ChevronRight size={16} style={{ color: palette.textFaint }} />
                </button>
              </div>
            )}
            {ownPosts.length > 0 && (
              <div className="mb-5">
                <div className="mb-2" style={{ color: palette.textFaint, fontFamily: mono, fontSize: "9.5px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>{profile ? `${profile.username}'s posts` : "Posts"}</div>
                {ownPosts.map((p, i) => postCard(p, `own-${p.id || i}`))}
              </div>
            )}
            {relatedPosts.length > 0 && (
              <div>
                <div className="mb-2" style={{ color: palette.textFaint, fontFamily: mono, fontSize: "9.5px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>Related posts</div>
                {relatedPosts.map((p, i) => postCard(p, `related-${p.id || i}`))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const renameCommunityGroup = async () => {
  const membership = myGroups.find((g) => g.id === activeGroupId);
  if (!membership) return;
  const name = manageNameDraft.trim();
  if (!name) return;
  try {
    await communityApi(`/groups/${activeGroupId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${membership.token}` },
      body: JSON.stringify({ name, description: manageDescDraft.trim() }),
    });
    await persistMyGroups(myGroups.map((g) => g.id === activeGroupId ? { ...g, name, description: manageDescDraft.trim() } : g));
    setGroupInfo((cur) => cur ? { ...cur, name, description: manageDescDraft.trim() } : cur);
    setManageMsg("Group updated.");
  } catch (err) {
    setManageMsg(err.message || "Couldn't update the group.");
  }
};

const promoteToAdmin = async (username) => {
  const membership = myGroups.find((g) => g.id === activeGroupId);
  const myMember = groupMembersList.find((m) => m.username === communityUsername);
  const isOwner = membership?.role === "owner" || !!myMember?.isOwner;
  if (!membership || !isOwner) return;
  try {
    await communityApi(`/groups/${activeGroupId}/admins`, {
      method: "POST",
      headers: { Authorization: `Bearer ${membership.token}` },
      body: JSON.stringify({ member: username }),
    });
    setGroupMembersList((cur) => cur.map((m) => (m.username === username ? { ...m, isAdmin: true } : m)));
    setManageMsg(`${username} is now an admin.`);
  } catch (err) {
    setManageMsg(err.message || "Couldn't make them an admin.");
  }
};

const demoteAdmin = async (username) => {
  const membership = myGroups.find((g) => g.id === activeGroupId);
  const myMember = groupMembersList.find((m) => m.username === communityUsername);
  const isOwner = membership?.role === "owner" || !!myMember?.isOwner;
  if (!membership || !isOwner) return;
  try {
    await communityApi(`/groups/${activeGroupId}/admins/${encodeURIComponent(username)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${membership.token}` },
    });
    setGroupMembersList((cur) => cur.map((m) => (m.username === username ? { ...m, isAdmin: false } : m)));
    setManageMsg(`${username} is no longer an admin.`);
  } catch (err) {
    setManageMsg(err.message || "Couldn't remove admin.");
  }
};

const promoteToSignalProvider = async (username) => {
  const membership = myGroups.find((g) => g.id === activeGroupId);
  const myMember = groupMembersList.find((m) => m.username === communityUsername);
  const isOwner = membership?.role === "owner" || !!myMember?.isOwner;
  if (!membership || !isOwner) return;
  try {
    await communityApi(`/groups/${activeGroupId}/signal-providers`, {
      method: "POST",
      headers: { Authorization: `Bearer ${membership.token}` },
      body: JSON.stringify({ member: username }),
    });
    setGroupMembersList((cur) => cur.map((m) => (m.username === username ? { ...m, isSignalProvider: true } : m)));
    setManageMsg(`${username} can now post signals.`);
  } catch (err) {
    setManageMsg(err.message || "Couldn't update that member.");
  }
};

const demoteSignalProvider = async (username) => {
  const membership = myGroups.find((g) => g.id === activeGroupId);
  const myMember = groupMembersList.find((m) => m.username === communityUsername);
  const isOwner = membership?.role === "owner" || !!myMember?.isOwner;
  if (!membership || !isOwner) return;
  try {
    await communityApi(`/groups/${activeGroupId}/signal-providers/${encodeURIComponent(username)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${membership.token}` },
    });
    setGroupMembersList((cur) => cur.map((m) => (m.username === username ? { ...m, isSignalProvider: false } : m)));
    setManageMsg(`${username} can no longer post signals.`);
  } catch (err) {
    setManageMsg(err.message || "Couldn't update that member.");
  }
};

const kickCommunityMember = async (authorName) => {
  const membership = myGroups.find((g) => g.id === activeGroupId);
  if (!membership) return;
  try {
    await communityApi(`/groups/${activeGroupId}/kick`, {
      method: "POST",
      headers: { Authorization: `Bearer ${membership.token}` },
      body: JSON.stringify({ member: authorName }),
    });
    setManageMsg(`${authorName} removed.`);
  } catch (err) {
    setManageMsg(err.message || "Couldn't remove them.");
  }
  setPendingKick(null);
};


const deleteCommunityMessage = async (messageId) => {
  const membership = myGroups.find((g) => g.id === activeGroupId);
  if (!membership) return;
  try {
    await communityApi(`/groups/${activeGroupId}/messages/${messageId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${membership.token}` },
    });
    setGroupMessages((cur) => cur.filter((m) => m.id !== messageId));
  } catch (err) {
    setCommunityApiError(err.message || "Couldn't delete that message.");
  }
  setPendingDeleteMsg(null);
};

const regenerateGroupCode = async () => {
  const membership = myGroups.find((g) => g.id === activeGroupId);
  if (!membership) return;
  setRegeneratingCode(true);
  try {
    const data = await communityApi(`/groups/${activeGroupId}/regenerate-code`, {
      method: "POST",
      headers: { Authorization: `Bearer ${membership.token}` },
    });
    setNewInviteCode(data.code || "");
    setManageMsg("New invite code generated.");
  } catch (err) {
    setManageMsg(err.message || "Couldn't regenerate the code.");
  } finally {
    setRegeneratingCode(false);
  }
};

const deleteCommunityGroupPermanently = async () => {
  const membership = myGroups.find((g) => g.id === activeGroupId);
  if (!membership) return;
  try {
    await communityApi(`/groups/${activeGroupId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${membership.token}` },
    });
  } catch (err) {
    // even if the backend call fails, remove it locally so the owner isn't stuck
  }
  await persistMyGroups(myGroups.filter((g) => g.id !== activeGroupId));
  setActiveGroupId(null);
  setPendingDeleteGroup(false);
  setGroupManageOpen(false);
};


useEffect(() => {
  setCommunityPanelTab("chat");
  setOpenRoleMenuFor(null);
  setReplyingTo(null);
  if (!activeGroupId) {
    setGroupMembersList([]);
    setGroupMembersLoaded(false);
    setPinnedMessageId(null);
    setGroupInfo(null);
    return;
  }

  const membership = myGroups.find((g) => g.id === activeGroupId);
  if (!membership) return;
  let cancelled = false;

  const loadGroupAndMembers = async () => {
    const headers = { Authorization: `Bearer ${membership.token}` };
    // Both requests go out together (they used to run one after the other).
    const [infoRes, memRes] = await Promise.allSettled([
      communityApi(`/groups/${activeGroupId}`, { headers }),
      communityApi(`/groups/${activeGroupId}/members`, { headers }),
    ]);
    if (cancelled) return;
    if (infoRes.status === "fulfilled") {
      const data = infoRes.value;
      setPinnedMessageId(data.pinned_message_id || null);
      setGroupInfo(data);
      if (data.avatar) setGroupAvatarMap((cur) => ({ ...cur, [activeGroupId]: data.avatar }));
    }
    if (memRes.status === "fulfilled") setGroupMembersList(memRes.value.members || []);
    setGroupMembersLoaded(true);
  };

  loadGroupAndMembers();
  // Same cadence as message polling, so new joins/leaves and role changes
  // show up without the person having to leave and reopen the group.
  const id = setInterval(loadGroupAndMembers, 15000);
  return () => { cancelled = true; clearInterval(id); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [activeGroupId]);

// --- Presence heartbeat: keeps this member's green online dot alive while
// they have a group open. Fires immediately, then every 20s. ---
useEffect(() => {
  if (activeTab !== "community" || !activeGroupId) return;
  sendCommunityHeartbeat();
  const id = setInterval(sendCommunityHeartbeat, 20000);
  return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [activeTab, activeGroupId]);

// --- Typing indicator: poll who else is typing, every 2s, only while the
// chat sub-view is actually open. ---
useEffect(() => {
  if (activeTab !== "community" || !activeGroupId || communityPanelTab !== "chat") {
    setTypingUsers([]);
    return;
  }
  const membership = myGroups.find((g) => g.id === activeGroupId);
  if (!membership) return;
  let cancelled = false;
  const poll = async () => {
    try {
      const data = await communityApi(`/groups/${activeGroupId}/typing`, {
        headers: { Authorization: `Bearer ${membership.token}` },
      });
      if (!cancelled) setTypingUsers(data.typing || []);
    } catch (err) {}
  };
  poll();
  const id = setInterval(poll, 2500);
  return () => { cancelled = true; clearInterval(id); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [activeTab, activeGroupId, communityPanelTab]);

// Username -> profile photo, for showing everyone's real avatar in chat
// (not just group members you happen to have loaded avatars for locally).
// Own username always prefers the live communityAvatar so a just-uploaded
// photo shows immediately without waiting on a member-list refetch.
const memberAvatarByUsername = useMemo(() => {
  const map = {};
  for (const m of groupMembersList) {
    if (m.avatar) map[m.username] = m.avatar;
  }
  if (communityUsername && communityAvatar) map[communityUsername] = communityAvatar;
  return map;
}, [groupMembersList, communityUsername, communityAvatar]);
const avatarForAuthor = (author) => memberAvatarByUsername[author] || undefined;
const isAuthorOnline = (author) => !!groupMembersList.find((m) => m.username === author)?.isOnline;

// ---------- Stories (their own table — separate from feed posts) ----------
const storiesByAuthor = useMemo(() => {
  const map = {};
  groupStories.forEach((st) => {
    if (!isWithinStoryWindow(st.ts)) return;
    (map[st.author] = map[st.author] || []).push(st);
  });
  Object.values(map).forEach((arr) => arr.sort((x, y) => new Date(x.ts) - new Date(y.ts)));
  return map;
}, [groupStories]);

// Me first, then everyone else with an active story (newest story first).
// Order deliberately does NOT depend on "seen" so it can't reshuffle while the viewer is open.
const storyAuthorOrder = useMemo(() => {
  const latest = (u) => new Date(storiesByAuthor[u][storiesByAuthor[u].length - 1].ts).getTime();
  const mine = storiesByAuthor[communityUsername]?.length ? [communityUsername] : [];
  const others = Object.keys(storiesByAuthor)
    .filter((u) => u !== communityUsername && storiesByAuthor[u]?.length)
    .sort((x, y) => latest(y) - latest(x));
  return [...mine, ...others];
}, [storiesByAuthor, communityUsername]);

const authorHasUnseen = (u) => (storiesByAuthor[u] || []).some((st) => !seenStoryIds.includes(st.id));

const openStoryViewerFor = (username) => {
  const idx = storyAuthorOrder.indexOf(username);
  if (idx === -1) return;
  const slides = storiesByAuthor[username] || [];
  const firstUnseen = slides.findIndex((st) => !seenStoryIds.includes(st.id));
  setStoryPaused(false);
  setStoryViewer({ authorIdx: idx, slideIdx: firstUnseen === -1 ? 0 : firstUnseen });
};

const closeStoryViewer = () => setStoryViewer(null);

const advanceStory = (dir) => {
  setStoryViewer((cur) => {
    if (!cur) return cur;
    const author = storyAuthorOrder[cur.authorIdx];
    const slides = storiesByAuthor[author] || [];
    const nextSlide = cur.slideIdx + dir;
    if (nextSlide >= slides.length) {
      const nextAuthorIdx = cur.authorIdx + 1;
      if (nextAuthorIdx >= storyAuthorOrder.length) return null;
      return { authorIdx: nextAuthorIdx, slideIdx: 0 };
    }
    if (nextSlide < 0) {
      const prevAuthorIdx = cur.authorIdx - 1;
      if (prevAuthorIdx < 0) return { ...cur, slideIdx: 0 };
      const prevSlides = storiesByAuthor[storyAuthorOrder[prevAuthorIdx]] || [];
      return { authorIdx: prevAuthorIdx, slideIdx: Math.max(0, prevSlides.length - 1) };
    }
    return { ...cur, slideIdx: nextSlide };
  });
};

// Auto-advance progress bar for the open story slide
useEffect(() => {
  if (!storyViewer || storyPaused) return;
  setStoryProgressPct(0);
  const start = Date.now();
  const id = setInterval(() => {
    const pct = Math.min(100, ((Date.now() - start) / STORY_SLIDE_MS) * 100);
    setStoryProgressPct(pct);
    if (pct >= 100) {
      clearInterval(id);
      advanceStory(1);
    }
  }, 50);
  return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [storyViewer?.authorIdx, storyViewer?.slideIdx, storyPaused]);

// Profile is its own full-screen section. Tapping any username opens that person's profile;
// the profile button next to the group menu opens yours. Back walks back through profiles you
// opened from inside the profile, then closes the section.
const openCommunityMemberProfile = (username) => {
  if (!username) return;
  const next = username === communityUsername ? null : username;
  if (profileOpen) setProfileHistory((h) => [...h, profileView]);
  else setProfileHistory([]);
  setProfileView(next);
  setProfileSubTab("posts");
  setProfileOpen(true);
};
const openMyProfile = () => {
  setProfileHistory([]);
  setProfileView(null);
  setProfileSubTab("posts");
  setProfileOpen(true);
};
const closeProfileBack = () => {
  if (profileHistory.length) {
    setProfileView(profileHistory[profileHistory.length - 1]);
    setProfileHistory((h) => h.slice(0, -1));
  } else {
    setProfileOpen(false);
  }
};

const getCommunityMemberStats = (member) => {
  const isMe = member?.username === communityUsername;
  if (isMe) {
    const ordered = [...trades].sort((a, b) => (a.ts || 0) - (b.ts || 0));
    const wins = ordered.filter((t) => num(t.pnl) > 0).length;
    const winRate = ordered.length ? (wins / ordered.length) * 100 : null;
    const net = ordered.reduce((sum, t) => sum + (num(t.pnl) || 0), 0);
    const bal = num(startingBalance);
    const pnlPct = bal > 0 ? (net / bal) * 100 : null;
    let streak = 0;
    for (let i = ordered.length - 1; i >= 0; i -= 1) {
      if (num(ordered[i].pnl) > 0) streak += 1;
      else break;
    }
    const equityCurve = ordered.map((t) => num(t.pnl) || 0).reduce((arr, pnl) => {
      arr.push((arr[arr.length - 1] || 0) + pnl);
      return arr;
    }, []);
    return { winRate, pnlPct, streak, trades: ordered.length, avgR: null, equityCurve, statsPublic: true };
  }
  const pick = (...keys) => {
    for (const key of keys) {
      const value = member?.[key];
      if (value !== undefined && value !== null && value !== "") return value;
    }
    return null;
  };
  const curve = pick("equityCurve", "equity", "curve");
  const publicFields = ["winRate", "win_rate", "pnlPct", "pnlPercent", "pnl_percent", "streak", "winStreak", "win_streak", "trades", "tradeCount", "trade_count"];
  return {
    winRate: num(pick("winRate", "win_rate")),
    pnlPct: num(pick("pnlPct", "pnlPercent", "pnl_percent")),
    streak: num(pick("streak", "winStreak", "win_streak")),
    trades: num(pick("trades", "tradeCount", "trade_count")),
    avgR: num(pick("avgR", "avgRR", "avg_r")),
    equityCurve: Array.isArray(curve) ? curve.map((v) => num(v)).filter((v) => Number.isFinite(v)) : [],
    statsPublic: publicFields.some((key) => pick(key) !== null),
  };
};

useEffect(() => {
  if (!activeGroupId || communityPanelTab !== "posts") return;
  const membership = myGroups.find((g) => g.id === activeGroupId);
  if (!membership) return;
  let cancelled = false;
  setGroupPostsLoaded(false);
  (async () => {
    try {
      const data = await communityApi(`/groups/${activeGroupId}/posts`, {
        headers: { Authorization: `Bearer ${membership.token}` },
      });
      if (!cancelled) setGroupPosts(data.posts || []);
    } catch (err) {
      if (!cancelled) setCommunityApiError(err.message);
    } finally {
      if (!cancelled) setGroupPostsLoaded(true);
    }
  })();
  return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [activeGroupId, communityPanelTab]);

useEffect(() => {
  if (!activeGroupId || communityPanelTab !== "qa") return;
  const membership = myGroups.find((g) => g.id === activeGroupId);
  if (!membership) return;
  let cancelled = false;
  setGroupQuestionsLoaded(false);
  (async () => {
    try {
      const data = await communityApi(`/groups/${activeGroupId}/questions`, {
        headers: { Authorization: `Bearer ${membership.token}` },
      });
      if (!cancelled) setGroupQuestions(data.questions || []);
    } catch (err) {
      if (!cancelled) setCommunityApiError(err.message);
    } finally {
      if (!cancelled) setGroupQuestionsLoaded(true);
    }
  })();
  return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [activeGroupId, communityPanelTab]);

useEffect(() => {
  if (!activeGroupId || communityPanelTab !== "vault") return;
  const membership = myGroups.find((g) => g.id === activeGroupId);
  if (!membership) return;
  let cancelled = false;
  setGroupVaultLoaded(false);
  (async () => {
    try {
      const data = await communityApi(`/groups/${activeGroupId}/vault`, {
        headers: { Authorization: `Bearer ${membership.token}` },
      });
      if (!cancelled) setGroupVault(data.items || []);
    } catch (err) {
      if (!cancelled) setCommunityApiError(err.message);
    } finally {
      if (!cancelled) setGroupVaultLoaded(true);
    }
  })();
  return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [activeGroupId, communityPanelTab]);

useEffect(() => {
  if (!activeGroupId || communityPanelTab !== "wall") return;
  const membership = myGroups.find((g) => g.id === activeGroupId);
  if (!membership) return;
  let cancelled = false;
  setGroupWallLoaded(false);
  (async () => {
    try {
      const data = await communityApi(`/groups/${activeGroupId}/wall`, {
        headers: { Authorization: `Bearer ${membership.token}` },
      });
      if (!cancelled) setGroupWall(data.entries || []);
    } catch (err) {
      if (!cancelled) setCommunityApiError(err.message);
    } finally {
      if (!cancelled) setGroupWallLoaded(true);
    }
  })();
  return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [activeGroupId, communityPanelTab]);

useEffect(() => {
  if (!activeGroupId || communityPanelTab !== "feed") return;
  const membership = myGroups.find((g) => g.id === activeGroupId);
  if (!membership) return;
  let cancelled = false;
  setGroupFeedLoaded(false);
  (async () => {
    try {
      const data = await communityApi(`/groups/${activeGroupId}/feed`, {
        headers: { Authorization: `Bearer ${membership.token}` },
      });
      if (!cancelled) setGroupFeed(data.posts || []);
    } catch (err) {
      if (!cancelled) setCommunityApiError(err.message);
    } finally {
      if (!cancelled) setGroupFeedLoaded(true);
    }
  })();
  return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [activeGroupId, communityPanelTab]);


// Profile section: load the profile + their posts whenever it opens or the viewed account
// changes. This is a universal, account-wide profile now — it does NOT depend on
// activeGroupId, so switching groups while it's open no longer resets or reloads it.
useEffect(() => {
  if (!profileOpen || !session?.token) return;
  const target = profileView || communityUsername;
  if (!target) return;
  let cancelled = false;
  const headers = { Authorization: `Bearer ${session.token}` };
  setProfileData(null);
  setProfileError("");
  setProfileLoading(true);
  setProfilePosts([]);
  setProfilePostsLoaded(false);
  setProfilePostsNext(null);
  setBioEditing(false);
  (async () => {
    try {
      const enc = encodeURIComponent(target);
      const [prof, posts] = await Promise.all([
        communityApi(`/profile/${enc}`, { headers }),
        communityApi(`/profile/${enc}/posts`, { headers }),
      ]);
      if (cancelled) return;
      setProfileData(prof.profile);
      setProfilePosts(posts.posts || []);
      setProfilePostsNext(posts.nextCursor || null);
    } catch (err) {
      if (!cancelled) setProfileError(err.message || "Couldn't load this profile.");
    } finally {
      if (!cancelled) { setProfileLoading(false); setProfilePostsLoaded(true); }
    }
  })();
  return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [profileOpen, profileView, communityUsername, session?.token]);

// Profile post viewer: load the comment thread whenever a post is opened.
useEffect(() => {
  if (!profilePostOpen?.id || !session?.token) { setProfileComments([]); return; }
  let cancelled = false;
  setProfileComments([]);
  setProfileCommentDraft("");
  setProfileError("");
  setProfilePostMenuOpen(false);
  setProfileEmojiOpen(false);
  setProfileCommentsLoading(true);
  (async () => {
    try {
      const data = await communityApi(`/profile/posts/${profilePostOpen.id}/comments`, {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      if (!cancelled) setProfileComments(data.comments || []);
    } catch (err) {
      if (!cancelled) setProfileError(err.message || "Couldn't load comments.");
    } finally {
      if (!cancelled) setProfileCommentsLoading(false);
    }
  })();
  return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [profilePostOpen?.id, session?.token]);

// Stories: load when the Feed tab opens (separate endpoint from the feed itself)
useEffect(() => {
  if (!activeGroupId || communityPanelTab !== "feed") return;
  const membership = myGroups.find((g) => g.id === activeGroupId);
  if (!membership) return;
  let cancelled = false;
  setGroupStoriesLoaded(false);
  setGroupStories([]);
  fetchStories(membership)
    .then((list) => { if (!cancelled) applyStories(list); })
    .catch(() => { /* silent — the story row just stays empty */ })
    .finally(() => { if (!cancelled) setGroupStoriesLoaded(true); });
  return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [activeGroupId, communityPanelTab]);

// Mark the slide on screen as seen (drives the gold → grey ring, like Telegram)
useEffect(() => {
  if (!storyViewer) return;
  const author = storyAuthorOrder[storyViewer.authorIdx];
  const st = (storiesByAuthor[author] || [])[storyViewer.slideIdx];
  if (st && !seenStoryIds.includes(st.id)) setSeenStoryIds((cur) => [...cur, st.id]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [storyViewer?.authorIdx, storyViewer?.slideIdx]);

useEffect(() => {
  try { localStorage.setItem("community:seen-stories", JSON.stringify(seenStoryIds.slice(-500))); } catch (e) { /* ignore */ }
}, [seenStoryIds]);

const uploadGroupAvatar = async (file) => {
  const membership = myGroups.find((g) => g.id === activeGroupId);
  if (!membership || !file) return;
  setGroupAvatarUploading(true);
  try {
    const dataUrl = await resizeImageFile(file, 300);
    const data = await communityApi(`/groups/${activeGroupId}/avatar`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${membership.token}` },
      body: JSON.stringify({ avatar: dataUrl }),
    });
    setGroupAvatarMap((cur) => ({ ...cur, [activeGroupId]: data.avatar }));
    setManageMsg("Group photo updated.");
  } catch (err) {
    setManageMsg(err.message || "Couldn't update the group photo.");
  } finally {
    setGroupAvatarUploading(false);
  }
};

const handleGroupAvatarChange = (e) => {
  const file = e.target.files && e.target.files[0];
  e.target.value = "";
  if (file) uploadGroupAvatar(file);
};

const pinCommunityMessage = async (messageId) => {
  const membership = myGroups.find((g) => g.id === activeGroupId);
  if (!membership) return;
  try {
    await communityApi(`/groups/${activeGroupId}/pin`, {
      method: "POST",
      headers: { Authorization: `Bearer ${membership.token}` },
      body: JSON.stringify({ messageId }),
    });
    setPinnedMessageId(messageId);
  } catch (err) {
    setCommunityApiError(err.message || "Couldn't pin that message.");
  }
};

const unpinCommunityMessage = () => pinCommunityMessage(null);

const uploadPostImage = async (file) => {
  if (!file) return;
  setPostImageUploading(true);
  try {
    const dataUrl = await resizeImageFile(file, 800);
    setNewPostImage(dataUrl);
  } catch (err) {
    setManageMsg("Couldn't attach that image.");
  } finally {
    setPostImageUploading(false);
  }
};

const handlePostImageChange = (e) => {
  const file = e.target.files && e.target.files[0];
  e.target.value = "";
  if (file) uploadPostImage(file);
};

const createCommunityPost = async () => {
  const membership = myGroups.find((g) => g.id === activeGroupId);
  if (!membership) return;
  if (!newPostText.trim() && !newPostImage) return;
  try {
    await communityApi(`/groups/${activeGroupId}/posts`, {
      method: "POST",
      headers: { Authorization: `Bearer ${membership.token}` },
      body: JSON.stringify({ text: newPostText.trim(), image: newPostImage }),
    });
    setNewPostText("");
    setNewPostImage(null);
    const data = await communityApi(`/groups/${activeGroupId}/posts`, {
      headers: { Authorization: `Bearer ${membership.token}` },
    });
    setGroupPosts(data.posts || []);
  } catch (err) {
    setCommunityApiError(err.message || "Couldn't post that.");
  }
};

const deleteCommunityPost = async (postId) => {
  const membership = myGroups.find((g) => g.id === activeGroupId);
  if (!membership) return;
  try {
    await communityApi(`/groups/${activeGroupId}/posts/${postId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${membership.token}` },
    });
    setGroupPosts((cur) => cur.filter((p) => p.id !== postId));
  } catch (err) {
    setCommunityApiError(err.message || "Couldn't delete that post.");
  }
};

// ---------- Trade Ideas (real, backed by the Worker + D1) ----------
const uploadIdeaImage = async (file) => {
  if (!file) return;
  setIdeaImageUploading(true);
  try {
    const dataUrl = await resizeImageFile(file, 800);
    setNewIdeaImage(dataUrl);
  } catch (err) {
    setCommunityApiError("Couldn't attach that image.");
  } finally {
    setIdeaImageUploading(false);
  }
};

const handleIdeaImageChange = (e) => {
  const file = e.target.files && e.target.files[0];
  e.target.value = "";
  if (file) uploadIdeaImage(file);
};

const createGroupIdea = async () => {
  const membership = myGroups.find((g) => g.id === activeGroupId);
  if (!membership) return;
  if (!newIdeaPair.trim() && !newIdeaText.trim() && !newIdeaImage) return;
  try {
    await communityApi(`/groups/${activeGroupId}/ideas`, {
      method: "POST",
      headers: { Authorization: `Bearer ${membership.token}` },
      body: JSON.stringify({ pair: newIdeaPair.trim(), text: newIdeaText.trim(), image: newIdeaImage }),
    });
    setNewIdeaPair("");
    setNewIdeaText("");
    setNewIdeaImage(null);
    const data = await communityApi(`/groups/${activeGroupId}/ideas`, {
      headers: { Authorization: `Bearer ${membership.token}` },
    });
    setGroupIdeas(data.ideas || []);
  } catch (err) {
    setCommunityApiError(err.message || "Couldn't share that idea.");
  }
};

const deleteGroupIdea = async (ideaId) => {
  const membership = myGroups.find((g) => g.id === activeGroupId);
  if (!membership) return;
  try {
    await communityApi(`/groups/${activeGroupId}/ideas/${ideaId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${membership.token}` },
    });
    setGroupIdeas((cur) => cur.filter((i) => i.id !== ideaId));
  } catch (err) {
    setCommunityApiError(err.message || "Couldn't delete that idea.");
  }
};

// ---------- Q&A (real, backed by the Worker + D1) ----------
const askGroupQuestion = async () => {
  const membership = myGroups.find((g) => g.id === activeGroupId);
  if (!membership || !newQuestionText.trim()) return;
  try {
    const res = await communityApi(`/groups/${activeGroupId}/questions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${membership.token}` },
      body: JSON.stringify({ text: newQuestionText.trim() }),
    });
    setNewQuestionText("");
    const data = await communityApi(`/groups/${activeGroupId}/questions`, {
      headers: { Authorization: `Bearer ${membership.token}` },
    });
    setGroupQuestions(data.questions || []);
    setQaOpenId(res.id);
  } catch (err) {
    setCommunityApiError(err.message || "Couldn't post that question.");
  }
};

const answerGroupQuestion = async (questionId) => {
  const membership = myGroups.find((g) => g.id === activeGroupId);
  if (!membership) return;
  const draft = (qaReplyDrafts[questionId] || "").trim();
  if (!draft) return;
  try {
    await communityApi(`/groups/${activeGroupId}/questions/${questionId}/answers`, {
      method: "POST",
      headers: { Authorization: `Bearer ${membership.token}` },
      body: JSON.stringify({ text: draft }),
    });
    setQaReplyDrafts((cur) => ({ ...cur, [questionId]: "" }));
    const data = await communityApi(`/groups/${activeGroupId}/questions`, {
      headers: { Authorization: `Bearer ${membership.token}` },
    });
    setGroupQuestions(data.questions || []);
  } catch (err) {
    setCommunityApiError(err.message || "Couldn't post that answer.");
  }
};

const deleteGroupQuestion = async (questionId) => {
  const membership = myGroups.find((g) => g.id === activeGroupId);
  if (!membership) return;
  try {
    await communityApi(`/groups/${activeGroupId}/questions/${questionId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${membership.token}` },
    });
    setGroupQuestions((cur) => cur.filter((q) => q.id !== questionId));
  } catch (err) {
    setCommunityApiError(err.message || "Couldn't delete that question.");
  }
};

// ---------- Resource vault (real, backed by the Worker + D1) ----------
const createVaultItem = async () => {
  const membership = myGroups.find((g) => g.id === activeGroupId);
  if (!membership) return;
  if (!newVaultTitle.trim()) return;
  try {
    await communityApi(`/groups/${activeGroupId}/vault`, {
      method: "POST",
      headers: { Authorization: `Bearer ${membership.token}` },
      body: JSON.stringify({ title: newVaultTitle.trim(), url: newVaultUrl.trim(), text: newVaultText.trim() }),
    });
    setNewVaultTitle("");
    setNewVaultUrl("");
    setNewVaultText("");
    const data = await communityApi(`/groups/${activeGroupId}/vault`, {
      headers: { Authorization: `Bearer ${membership.token}` },
    });
    setGroupVault(data.items || []);
  } catch (err) {
    setCommunityApiError(err.message || "Couldn't save that to resources.");
  }
};

const deleteVaultItem = async (itemId) => {
  const membership = myGroups.find((g) => g.id === activeGroupId);
  if (!membership) return;
  try {
    await communityApi(`/groups/${activeGroupId}/vault/${itemId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${membership.token}` },
    });
    setGroupVault((cur) => cur.filter((i) => i.id !== itemId));
  } catch (err) {
    setCommunityApiError(err.message || "Couldn't remove that item.");
  }
};

// ---------- Anonymous mistake wall (real, backed by the Worker + D1) ----------
const postWallEntry = async () => {
  const membership = myGroups.find((g) => g.id === activeGroupId);
  if (!membership || !newWallText.trim()) return;
  try {
    const res = await communityApi(`/groups/${activeGroupId}/wall`, {
      method: "POST",
      headers: { Authorization: `Bearer ${membership.token}` },
      body: JSON.stringify({ text: newWallText.trim() }),
    });
    setNewWallText("");
    if (res && res.id) setMyWallIds((cur) => [...cur, res.id]);
    const data = await communityApi(`/groups/${activeGroupId}/wall`, {
      headers: { Authorization: `Bearer ${membership.token}` },
    });
    setGroupWall(data.entries || []);
  } catch (err) {
    setCommunityApiError(err.message || "Couldn't post that.");
  }
};

const relateWallEntry = async (entryId) => {
  const membership = myGroups.find((g) => g.id === activeGroupId);
  if (!membership || relatedWallIds.includes(entryId)) return;
  setRelatedWallIds((cur) => [...cur, entryId]);
  setGroupWall((cur) => cur.map((e) => (e.id === entryId ? { ...e, relateCount: (e.relateCount || 0) + 1 } : e)));
  try {
    await communityApi(`/groups/${activeGroupId}/wall/${entryId}/relate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${membership.token}` },
    });
  } catch (err) {
    // silent — a failed relate tap isn't worth surfacing an error banner for
  }
};

const deleteWallEntry = async (entryId) => {
  const membership = myGroups.find((g) => g.id === activeGroupId);
  if (!membership) return;
  try {
    await communityApi(`/groups/${activeGroupId}/wall/${entryId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${membership.token}` },
    });
    setGroupWall((cur) => cur.filter((e) => e.id !== entryId));
  } catch (err) {
    setCommunityApiError(err.message || "Couldn't remove that entry.");
  }
};

// ---------- Activity feed (real, backed by the Worker + D1) ----------
const uploadFeedImage = async (file) => {
  if (!file) return;
  setFeedImageUploading(true);
  try {
    const dataUrl = await resizeImageFile(file, 800);
    setNewFeedImage(dataUrl);
  } catch (err) {
    setCommunityApiError("Couldn't attach that image.");
  } finally {
    setFeedImageUploading(false);
  }
};

const handleFeedImageChange = (e) => {
  const file = e.target.files && e.target.files[0];
  e.target.value = "";
  if (file) uploadFeedImage(file);
};

const createFeedPost = async () => {
  const membership = myGroups.find((g) => g.id === activeGroupId);
  if (!membership) return;
  if (!newFeedText.trim() && !newFeedImage) return;
  try {
    await communityApi(`/groups/${activeGroupId}/feed`, {
      method: "POST",
      headers: { Authorization: `Bearer ${membership.token}` },
      body: JSON.stringify({ text: newFeedText.trim(), pnl: newFeedPnl.trim(), image: newFeedImage }),
    });
    setNewFeedText("");
    setNewFeedPnl("");
    setNewFeedImage(null);
    const data = await communityApi(`/groups/${activeGroupId}/feed`, {
      headers: { Authorization: `Bearer ${membership.token}` },
    });
    setGroupFeed(data.posts || []);
  } catch (err) {
    setCommunityApiError(err.message || "Couldn't share that.");
  }
};

const likeFeedPost = async (postId) => {
  const membership = myGroups.find((g) => g.id === activeGroupId);
  if (!membership || likedFeedIds.includes(postId)) return;
  setLikedFeedIds((cur) => [...cur, postId]);
  setGroupFeed((cur) => cur.map((p) => (p.id === postId ? { ...p, likeCount: (p.likeCount || 0) + 1 } : p)));
  try {
    await communityApi(`/groups/${activeGroupId}/feed/${postId}/like`, {
      method: "POST",
      headers: { Authorization: `Bearer ${membership.token}` },
    });
  } catch (err) {
    // silent — a failed like tap isn't worth surfacing an error banner for
  }
};

// Tap an emoji to react; tap the SAME emoji again to undo it. Only one active
// reaction per person per post, like Facebook/Instagram.
const toggleFeedReaction = async (postId, emojiKey) => {
  const membership = myGroups.find((g) => g.id === activeGroupId);
  if (!membership) return;
  const prevEmoji = myFeedReactions[postId];
  const removing = prevEmoji === emojiKey;

  setMyFeedReactions((cur) => {
    const next = { ...cur };
    if (removing) delete next[postId];
    else next[postId] = emojiKey;
    return next;
  });
  setGroupFeed((cur) => cur.map((p) => {
    if (p.id !== postId) return p;
    const reactions = { ...(p.reactions || {}) };
    if (prevEmoji) reactions[prevEmoji] = Math.max(0, (reactions[prevEmoji] || 0) - 1);
    if (!removing) reactions[emojiKey] = (reactions[emojiKey] || 0) + 1;
    return { ...p, reactions };
  }));

  try {
    if (removing) {
      await communityApi(`/groups/${activeGroupId}/feed/${postId}/react`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${membership.token}` },
      });
    } else {
      await communityApi(`/groups/${activeGroupId}/feed/${postId}/react`, {
        method: "POST",
        headers: { Authorization: `Bearer ${membership.token}` },
        body: JSON.stringify({ emoji: emojiKey, previous: prevEmoji || null }),
      });
    }
  } catch (err) {
    // silent — reactions are optimistic; a failed sync isn't worth an error banner
  }
};

// ---------- Feed comments (real, backed by the Worker + D1) ----------
const toggleFeedComments = (postId) => {
  setFeedCommentsOpenId((cur) => (cur === postId ? null : postId));
  if (!feedComments[postId]) loadFeedComments(postId);
};

const loadFeedComments = async (postId) => {
  const membership = myGroups.find((g) => g.id === activeGroupId);
  if (!membership) return;
  setFeedCommentsLoading((cur) => ({ ...cur, [postId]: true }));
  try {
    const data = await communityApi(`/groups/${activeGroupId}/feed/${postId}/comments`, {
      headers: { Authorization: `Bearer ${membership.token}` },
    });
    setFeedComments((cur) => ({ ...cur, [postId]: data.comments || [] }));
  } catch (err) {
    setFeedComments((cur) => ({ ...cur, [postId]: cur[postId] || [] }));
    setCommunityApiError(err.message || "Couldn't load comments.");
  } finally {
    setFeedCommentsLoading((cur) => ({ ...cur, [postId]: false }));
  }
};

const postFeedComment = async (postId) => {
  const membership = myGroups.find((g) => g.id === activeGroupId);
  const text = (commentDrafts[postId] || "").trim();
  if (!membership || !text) return;
  try {
    await communityApi(`/groups/${activeGroupId}/feed/${postId}/comments`, {
      method: "POST",
      headers: { Authorization: `Bearer ${membership.token}` },
      body: JSON.stringify({ text }),
    });
    setCommentDrafts((cur) => ({ ...cur, [postId]: "" }));
    setCommunityApiError("");
    setGroupFeed((cur) => cur.map((p) => (p.id === postId ? { ...p, commentCount: (p.commentCount || 0) + 1 } : p)));
    loadFeedComments(postId);
  } catch (err) {
    setCommunityApiError(err.message || "Couldn't post that comment.");
  }
};

const deleteFeedComment = async (postId, commentId) => {
  const membership = myGroups.find((g) => g.id === activeGroupId);
  if (!membership) return;
  try {
    await communityApi(`/groups/${activeGroupId}/feed/${postId}/comments/${commentId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${membership.token}` },
    });
    setFeedComments((cur) => ({ ...cur, [postId]: (cur[postId] || []).filter((c) => c.id !== commentId) }));
    setGroupFeed((cur) => cur.map((p) => (p.id === postId ? { ...p, commentCount: Math.max(0, (p.commentCount || 1) - 1) } : p)));
  } catch (err) {
    setCommunityApiError(err.message || "Couldn't delete that comment.");
  }
};

const deleteFeedPost = async (postId) => {
  const membership = myGroups.find((g) => g.id === activeGroupId);
  if (!membership) return;
  try {
    await communityApi(`/groups/${activeGroupId}/feed/${postId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${membership.token}` },
    });
    setGroupFeed((cur) => cur.filter((p) => p.id !== postId));
  } catch (err) {
    setCommunityApiError(err.message || "Couldn't delete that post.");
  }
};

// ---------- Stories (real, backed by the Worker + D1 — separate from the feed) ----------
const fetchStories = async (membership) => {
  const data = await communityApi(`/groups/${membership.id}/stories`, {
    headers: { Authorization: `Bearer ${membership.token}` },
  });
  return data.stories || [];
};

const applyStories = (list) => {
  setGroupStories(list);
  setMyStoryReactions(Object.fromEntries(list.filter((st) => st.myReaction).map((st) => [st.id, st.myReaction])));
};

const openStoryComposer = () => storyImageInputRef.current && storyImageInputRef.current.click();

const handleStoryImageChange = async (e) => {
  const file = e.target.files && e.target.files[0];
  e.target.value = "";
  if (!file) return;
  try {
    const dataUrl = await resizeImageFile(file, 1080);
    setStoryCaption("");
    setStoryDraft({ image: dataUrl });
  } catch (err) {
    setCommunityApiError("Couldn't open that image.");
  }
};

const cancelStoryDraft = () => { setStoryDraft(null); setStoryCaption(""); };

const postStory = async () => {
  const membership = myGroups.find((g) => g.id === activeGroupId);
  if (!membership || !storyDraft?.image || storyPosting) return;
  setStoryPosting(true);
  try {
    await communityApi(`/groups/${activeGroupId}/stories`, {
      method: "POST",
      headers: { Authorization: `Bearer ${membership.token}` },
      body: JSON.stringify({ image: storyDraft.image, text: storyCaption.trim() }),
    });
    setStoryDraft(null);
    setStoryCaption("");
    applyStories(await fetchStories(membership));
  } catch (err) {
    setCommunityApiError(err.message || "Couldn't post your story.");
  } finally {
    setStoryPosting(false);
  }
};

const deleteStory = async (storyId) => {
  const membership = myGroups.find((g) => g.id === activeGroupId);
  if (!membership) return;
  try {
    await communityApi(`/groups/${activeGroupId}/stories/${storyId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${membership.token}` },
    });
    setGroupStories((cur) => cur.filter((st) => st.id !== storyId));
  } catch (err) {
    setCommunityApiError(err.message || "Couldn't delete that story.");
  }
};

// Tap an emoji to react; tap the SAME emoji again to undo it (one reaction per person per story).
const toggleStoryReaction = async (storyId, emojiKey) => {
  const membership = myGroups.find((g) => g.id === activeGroupId);
  if (!membership) return;
  const prevEmoji = myStoryReactions[storyId];
  const removing = prevEmoji === emojiKey;
  setMyStoryReactions((cur) => {
    const next = { ...cur };
    if (removing) delete next[storyId]; else next[storyId] = emojiKey;
    return next;
  });
  setGroupStories((cur) => cur.map((st) => {
    if (st.id !== storyId) return st;
    const reactions = { ...(st.reactions || {}) };
    if (prevEmoji) reactions[prevEmoji] = Math.max(0, (reactions[prevEmoji] || 0) - 1);
    if (!removing) reactions[emojiKey] = (reactions[emojiKey] || 0) + 1;
    return { ...st, reactions };
  }));
  try {
    await communityApi(`/groups/${activeGroupId}/stories/${storyId}/react`, {
      method: removing ? "DELETE" : "POST",
      headers: { Authorization: `Bearer ${membership.token}` },
      ...(removing ? {} : { body: JSON.stringify({ emoji: emojiKey }) }),
    });
  } catch (err) {
    // silent — optimistic, same as feed reactions
  }
};


  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const themeRes = await window.storage.get(THEME_STORAGE_KEY, false);
        if (cancelled) return;
        if (themeRes && themeRes.value) {
          const t = themeRes.value;
          if (t === "light" || t === "dark" || t === "void") setTheme(t);
        }
      } catch (err) {
        // non-critical, fail silently
      } finally {
        if (!cancelled) setThemeLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);


  // Load username + this device's group memberships (personal/local — tokens live here)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [nameRes, membershipsRes, sessionRes, onboardingRes, avatarRes] = await Promise.allSettled([
          window.storage.get(COMMUNITY_USERNAME_KEY, false),
          window.storage.get(COMMUNITY_MEMBERSHIPS_KEY, false),
          window.storage.get(COMMUNITY_SESSION_KEY, false),
          window.storage.get(COMMUNITY_ONBOARDING_KEY, false),
          window.storage.get(COMMUNITY_AVATAR_KEY, false),
        ]);
        if (cancelled) return;
        if (nameRes.status === "fulfilled" && nameRes.value) setCommunityUsername(nameRes.value.value);
        if (membershipsRes.status === "fulfilled" && membershipsRes.value) {
          const parsed = JSON.parse(membershipsRes.value.value);
          if (Array.isArray(parsed)) setMyGroups(parsed);
        }
        if (sessionRes.status === "fulfilled" && sessionRes.value) {
          const parsedSession = JSON.parse(sessionRes.value.value);
          if (parsedSession && parsedSession.token) setSession(parsedSession);
        }
        if (avatarRes.status === "fulfilled" && avatarRes.value) setCommunityAvatar(avatarRes.value.value);
        if (onboardingRes.status === "fulfilled" && onboardingRes.value && onboardingRes.value.value === "1") {
          setOnboardingSeen(true);
        }
      } catch (err) {
        // non-critical, fail silently
      } finally {
        if (!cancelled) {
          setCommunityUsernameLoaded(true);
          setMyGroupsLoaded(true);
          setSessionLoaded(true);
          setOnboardingSeenLoaded(true);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);


  // Fetch today's remaining AI Coach messages as soon as we know who's signed
  // in, so the count is right the first time the Coach tab is opened rather
  // than only appearing after the first message is sent.
  // Load the saved Coach chats and reopen the most recent one, so history survives
  // switching tabs or coming back later (and follows the account across devices).
  useEffect(() => {
    if (!session?.token) {
      setCoachChats([]);
      setCoachChatId(null);
      setCoachMessages([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const list = await communityApi("/ai/coach/chats", { headers: { Authorization: `Bearer ${session.token}` } });
        if (cancelled) return;
        const chats = list.chats || [];
        setCoachChats(chats);
        if (typeof list.max === "number") setCoachChatsMax(list.max);
        if (chats.length > 0) {
          const first = await communityApi(`/ai/coach/chats/${chats[0].id}`, {
            headers: { Authorization: `Bearer ${session.token}` },
          });
          if (cancelled) return;
          setCoachChatId(first.id);
          setCoachMessages((first.messages || []).map((m, i) => ({ role: m.role, text: m.text, id: `cm-${first.id}-${i}` })));
        }
      } catch (err) {
        // non-critical — the Coach still works, just without saved history
      }
    })();
    return () => { cancelled = true; };
  }, [session?.token]);

  // Keep the newest Coach message in view (replies can now be long when explaining).
  useEffect(() => {
    const el = coachScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [coachMessages, coachLoading]);

  useEffect(() => {
    if (!session?.token) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await communityApi("/ai/coach/usage", {
          headers: { Authorization: `Bearer ${session.token}` },
        });
        if (!cancelled && typeof data.remaining === "number") setCoachRemaining(data.remaining);
      } catch (err) {
        // non-critical, fail silently \u2014 remaining will still update after the first send
      }
    })();
    return () => { cancelled = true; };
  }, [session?.token]);


  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await window.storage.get(COMMUNITY_JOIN_REQUESTS_KEY, false);
        if (!cancelled && res && res.value) {
          const parsed = JSON.parse(res.value);
          if (Array.isArray(parsed)) setPendingJoinRequests(parsed);
        }
      } catch (err) {
        // non-critical, fail silently
      } finally {
        if (!cancelled) setPendingJoinRequestsLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);


  // Load (and poll) messages for whichever group is open, from the real backend
  useEffect(() => {
    if (!activeGroupId) {
      setGroupMessages([]);
      setGroupMessagesLoaded(false);
      return;
    }
    const membership = myGroups.find((g) => g.id === activeGroupId);
    if (!membership) return;
    let cancelled = false;
    let haveFull = false; // first load per group is a full fetch; after that we only ask for what's new
    const cachedMsgs = groupMessagesCacheRef.current[activeGroupId];
    if (cachedMsgs && cachedMsgs.length) {
      // Show the last-known chat immediately, then just fetch what's new since then.
      groupMessagesRef.current = cachedMsgs;
      setGroupMessages(cachedMsgs);
      setGroupMessagesLoaded(true);
      haveFull = true;
    }
    let lastLoad = 0;
    let ws = null;
    let wsOpen = false;
    let retryTimer = null;
    let pingTimer = null;
    let fails = 0;
    const loadMessages = async () => {
      lastLoad = Date.now();
      try {
        const real = groupMessagesRef.current.filter((m) => !String(m.id).startsWith("tmp_"));
        const since = haveFull && real.length ? Math.max(...real.map((m) => m.ts || 0)) : 0;
        const data = await communityApi(
          since > 0 ? `/groups/${activeGroupId}/messages?since=${since}` : `/groups/${activeGroupId}/messages`,
          { headers: { Authorization: `Bearer ${membership.token}` } }
        );
        if (cancelled) return;
        if (data.resync) { haveFull = false; return loadMessages(); }
        if (data.delta) {
          setGroupMessages((prev) => {
            const idSet = new Set(data.ids || []);
            const known = new Set(prev.map((m) => m.id));
            const kept = prev
              .filter((m) => String(m.id).startsWith("tmp_") || idSet.has(m.id))
              .map((m) => {
                if (String(m.id).startsWith("tmp_")) return m;
                const mm = data.meta?.[m.id];
                return { ...m, reactions: mm?.reactions || {}, myReactions: mm?.myReactions || [], replyCount: mm?.replyCount || 0 };
              });
            const added = (data.messages || []).filter((m) => !known.has(m.id));
            return added.length ? [...kept, ...added].sort((a, b) => (a.ts || 0) - (b.ts || 0)) : kept;
          });
        } else {
          setGroupMessages(data.messages || []);
          haveFull = true;
        }
        setCommunityApiError("");
      } catch (err) {
        if (!cancelled) setCommunityApiError(err.message);
      } finally {
        if (!cancelled) setGroupMessagesLoaded(true);
      }
    };

    // --- Live socket: the worker pushes new messages / deletes the moment they happen. ---
    const connect = () => {
      if (cancelled || fails > 6) return;
      if (ws && (ws.readyState === 0 || ws.readyState === 1)) return;
      try {
        ws = new WebSocket(
          COMMUNITY_API_BASE.replace(/^http/, "ws") + `/groups/${activeGroupId}/ws?token=${encodeURIComponent(membership.token)}`
        );
      } catch (e) { return; }
      ws.onopen = () => {
        wsOpen = true;
        fails = 0;
        if (haveFull) loadMessages(); // catch anything missed while the socket was down
        clearInterval(pingTimer);
        pingTimer = setInterval(() => { try { ws.send("ping"); } catch (e) {} }, 25000);
      };
      ws.onmessage = (ev) => {
        if (typeof ev.data !== "string" || ev.data === "pong") return;
        let evt;
        try { evt = JSON.parse(ev.data); } catch (e) { return; }
        if (evt.t === "msg" && evt.message) {
          const m = evt.message;
          // Only auto-scroll if the reader is already at (or near) the bottom.
          const endEl = communityMessagesEndRef.current;
          const nearBottom = !endEl || endEl.getBoundingClientRect().top < window.innerHeight + 200;
          setGroupMessages((prev) => {
            if (prev.some((x) => x.id === m.id)) return prev;
            // Our own message echoing back: swap the "sending" bubble for the real one.
            const ti = prev.findIndex((x) => String(x.id).startsWith("tmp_") && x.author === m.author && x.type === m.type && x.text === m.text);
            if (ti >= 0) { const next = prev.slice(); next[ti] = m; return next; }
            return [...prev, m].sort((a, b) => (a.ts || 0) - (b.ts || 0));
          });
          if (nearBottom) setTimeout(() => communityMessagesEndRef.current?.scrollIntoView({ block: "end" }), 30);
        } else if (evt.t === "del") {
          setGroupMessages((prev) => prev.filter((x) => x.id !== evt.id));
        } else if (evt.t === "sync") {
          loadMessages();
        }
      };
      ws.onclose = () => {
        wsOpen = false;
        clearInterval(pingTimer);
        if (cancelled) return;
        fails += 1;
        retryTimer = setTimeout(connect, Math.min(1000 * 2 ** Math.min(fails, 4), 15000));
      };
      ws.onerror = () => { try { ws.close(); } catch (e) {} };
    };
    // Phones drop sockets when the tab sleeps — reconnect and re-sync when it wakes.
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (!wsOpen) { fails = 0; clearTimeout(retryTimer); connect(); }
      if (haveFull) loadMessages();
    };
    document.addEventListener("visibilitychange", onVisible);

    if (!haveFull) setGroupMessagesLoaded(false);
    loadMessages();
    connect();
    // Polling stays as a safety net; with a live socket it backs off to every 30s.
    const id = setInterval(() => {
      if (wsOpen && Date.now() - lastLoad < 30000) return;
      loadMessages();
    }, COMMUNITY_MESSAGE_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
      clearInterval(pingTimer);
      clearTimeout(retryTimer);
      document.removeEventListener("visibilitychange", onVisible);
      if (ws) { ws.onclose = null; ws.onerror = null; try { ws.close(); } catch (e) {} }
    };
  }, [activeGroupId, myGroups]);

  // Keep the per-group cache fresh (only messages that really belong to this group,
  // so a group switch can never leak the previous chat into the wrong cache slot).
  useEffect(() => {
    if (!activeGroupId || !groupMessagesLoaded || !groupMessages.length) return;
    const mine = groupMessages.filter((m) => !String(m.id).startsWith("tmp_") && m.group_id === activeGroupId);
    if (mine.length) groupMessagesCacheRef.current[activeGroupId] = mine.slice(-150);
  }, [activeGroupId, groupMessages, groupMessagesLoaded]);

  // Warm up: once the Community tab is open, quietly fetch the latest messages of the
  // user's other groups (a few, one at a time) so opening any of them is instant.
  useEffect(() => {
    if (activeTab !== "community" || !myGroupsLoaded || !myGroups.length) return;
    let cancelled = false;
    (async () => {
      for (const g of myGroups.slice(0, 6)) {
        if (cancelled) return;
        if (g.id === activeGroupId || groupMessagesCacheRef.current[g.id]) continue;
        try {
          const data = await communityApi(`/groups/${g.id}/messages`, {
            headers: { Authorization: `Bearer ${g.token}` },
          });
          if (!cancelled && data.messages && !groupMessagesCacheRef.current[g.id]) {
            groupMessagesCacheRef.current[g.id] = data.messages.slice(-150);
          }
        } catch (e) {}
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, myGroupsLoaded, myGroups]);

  // Land on the newest message whenever the chat opens — on first load, on
  // switching groups, and on coming back to the chat sub-tab from another one
  // (Members, Wall, Feed, etc). The bottom sentinel div was already in the
  // JSX (communityMessagesEndRef) but nothing ever scrolled it into view, so
  // the list defaulted to showing the top instead of the latest messages.
  useEffect(() => {
    if (!activeGroupId || communityPanelTab !== "chat") return;
    communityMessagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [activeGroupId, communityPanelTab, groupMessagesLoaded]);


  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [listRes, activeRes] = await Promise.allSettled([
          window.storage.get(ACCOUNTS_LIST_KEY, false),
          window.storage.get(ACCOUNTS_ACTIVE_KEY, false),
        ]);
        if (cancelled) return;

        let list = null;
        if (listRes.status === "fulfilled" && listRes.value) {
          const parsed = JSON.parse(listRes.value.value);
          if (Array.isArray(parsed) && parsed.length > 0) list = parsed;
        }

        let activeId = null;
        if (activeRes.status === "fulfilled" && activeRes.value) {
          activeId = activeRes.value.value;
        }

        if (!list) {
          const id = `acc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          list = [{ id, name: "My Account", createdAt: Date.now(), archived: false, legacy: true }];
          activeId = id;
          window.storage.set(ACCOUNTS_LIST_KEY, JSON.stringify(list), false).catch(() => {});
          window.storage.set(ACCOUNTS_ACTIVE_KEY, id, false).catch(() => {});
        } else if (!activeId || !list.some((a) => a.id === activeId)) {
          activeId = list[0].id;
          window.storage.set(ACCOUNTS_ACTIVE_KEY, activeId, false).catch(() => {});
        }

        if (!cancelled) {
          setAccounts(list);
          setActiveAccountId(activeId);
        }
      } catch (err) {
        // non-critical, fail silently
      } finally {
        if (!cancelled) setAccountsLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await window.storage.get(NEWS_STORAGE_KEY, false);
        if (cancelled) return;
        if (res && res.value) {
          const parsed = JSON.parse(res.value);
          if (Array.isArray(parsed)) setNewsEvents(parsed);
        }
      } catch (err) {
        if (!cancelled) setNewsLoadError("Couldn't load saved events.");
      } finally {
        if (!cancelled) setNewsLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await window.storage.get(CUSTOM_SETUPS_STORAGE_KEY, false);
        if (cancelled) return;
        if (res && res.value) {
          const parsed = JSON.parse(res.value);
          if (Array.isArray(parsed)) setCustomSetups(parsed.slice(0, MAX_CUSTOM_SETUPS));
        }
      } catch (err) {
        // non-critical, fail silently
      } finally {
        if (!cancelled) setCustomSetupsLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await window.storage.get(CUSTOM_MOODS_STORAGE_KEY, false);
        if (cancelled) return;
        if (res && res.value) {
          const parsed = JSON.parse(res.value);
          if (Array.isArray(parsed)) setCustomMoods(parsed.slice(0, MAX_CUSTOM_MOODS));
        }
      } catch (err) {
        // non-critical, fail silently
      } finally {
        if (!cancelled) setCustomMoodsLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await window.storage.get(SETTINGS_STORAGE_KEY, false);
        if (cancelled) return;
        if (res && res.value) {
          const parsed = JSON.parse(res.value);
          if (parsed && typeof parsed === "object") {
            setSettings({ ...DEFAULT_SETTINGS, ...parsed });
          }
        }
      } catch (err) {
        // non-critical, fail silently
      } finally {
        if (!cancelled) setSettingsLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const widthsRes = await window.storage.get(JOURNAL_COLS_STORAGE_KEY, false);
        if (cancelled) return;
        if (widthsRes && widthsRes.value) {
          const parsed = JSON.parse(widthsRes.value);
          if (parsed && typeof parsed === "object") {
            setJournalColWidths({ ...DEFAULT_JOURNAL_COL_WIDTHS, ...parsed });
          }
        }
      } catch (err) {
        // non-critical, fail silently
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!accountsLoaded || !activeAccountId) return;
    let cancelled = false;
    setAccountDataLoaded(false);
    (async () => {
      const acc = accounts.find((a) => a.id === activeAccountId);
      const isLegacy = !!(acc && acc.legacy);
      try {
const [balRes, csRes, tradesRes, journalRes, playbookRulesRes, playbookCheckinsRes, notepadRes, linkedFirmRes] =
  await Promise.allSettled([
    window.storage.get(scopedKey(STORAGE_BAL_KEY, activeAccountId), false),
    window.storage.get(scopedKey(CS_STORAGE_KEY, activeAccountId), false),
    window.storage.get(scopedKey(STORAGE_KEY, activeAccountId), false),
    window.storage.get(scopedKey(JOURNAL_STORAGE_KEY, activeAccountId), false),
    window.storage.get(scopedKey(PLAYBOOK_RULES_KEY, activeAccountId), false),
    window.storage.get(scopedKey(PLAYBOOK_CHECKINS_KEY, activeAccountId), false),
    window.storage.get(scopedKey(NOTEPAD_STORAGE_KEY, activeAccountId), false),
    window.storage.get(scopedKey(LINKED_FIRM_KEY, activeAccountId), false),
  ]);
        if (cancelled) return;

        // Starting balance
        if (balRes.status === "fulfilled" && balRes.value) {
          setStartingBalance(balRes.value.value);
        } else if (isLegacy) {
          const legacyBal = await window.storage.get(STORAGE_BAL_KEY, false).catch(() => null);
          if (!cancelled) setStartingBalance(legacyBal ? legacyBal.value : "");
        } else {
          setStartingBalance("");
        }

        // Challenge calculator inputs
        if (csRes.status === "fulfilled" && csRes.value) {
          const parsed = JSON.parse(csRes.value.value);
          if (parsed && typeof parsed === "object") setCs({ ...DEFAULT_CS_INPUTS, ...parsed });
        } else if (isLegacy) {
          const legacyCs = await window.storage.get(CS_STORAGE_KEY, false).catch(() => null);
          if (!cancelled && legacyCs) {
            const parsed = JSON.parse(legacyCs.value);
            setCs(parsed && typeof parsed === "object" ? { ...DEFAULT_CS_INPUTS, ...parsed } : DEFAULT_CS_INPUTS);
          } else if (!cancelled) {
            setCs(DEFAULT_CS_INPUTS);
          }
        } else {
          setCs(DEFAULT_CS_INPUTS);
        }

        // Trades
        if (tradesRes.status === "fulfilled" && tradesRes.value) {
          const parsed = JSON.parse(tradesRes.value.value);
          if (!cancelled) setTrades(Array.isArray(parsed) ? parsed : []);
        } else if (isLegacy) {
          const legacyTrades = await window.storage.get(STORAGE_KEY, false).catch(() => null);
          if (!cancelled) {
            try {
              const parsed = legacyTrades ? JSON.parse(legacyTrades.value) : [];
              setTrades(Array.isArray(parsed) ? parsed : []);
            } catch (e) {
              setTrades([]);
            }
          }
        } else if (!cancelled) {
          setTrades([]);
        }

        // Journal entries
        if (journalRes.status === "fulfilled" && journalRes.value) {
          const parsed = JSON.parse(journalRes.value.value);
          if (!cancelled) setJournalEntries(Array.isArray(parsed) ? parsed : []);
        } else if (isLegacy) {
          const legacyJournal = await window.storage.get(JOURNAL_STORAGE_KEY, false).catch(() => null);
          if (!cancelled) {
            try {
              const parsed = legacyJournal ? JSON.parse(legacyJournal.value) : [];
              setJournalEntries(Array.isArray(parsed) ? parsed : []);
            } catch (e) {
              setJournalEntries([]);
            }
          }
        } else if (!cancelled) {
          setJournalEntries([]);
        }

        // Playbook rules (seed starter rules for a brand-new account)
        let loadedRules = null;
        if (playbookRulesRes.status === "fulfilled" && playbookRulesRes.value) {
          const parsed = JSON.parse(playbookRulesRes.value.value);
          if (Array.isArray(parsed)) loadedRules = parsed;
        } else if (isLegacy) {
          const legacyRules = await window.storage.get(PLAYBOOK_RULES_KEY, false).catch(() => null);
          if (legacyRules) {
            try {
              const parsed = JSON.parse(legacyRules.value);
              if (Array.isArray(parsed)) loadedRules = parsed;
            } catch (e) {
              // ignore
            }
          }
        }
        if (!cancelled) {
          if (loadedRules) {
            setPlaybookRules(loadedRules);
          } else {
            const seeded = PLAYBOOK_STARTER_RULES.map((text, i) => ({
              id: `rule-${Date.now()}-${i}`,
              text,
            }));
            setPlaybookRules(seeded);
            window.storage
              .set(scopedKey(PLAYBOOK_RULES_KEY, activeAccountId), JSON.stringify(seeded), false)
              .catch(() => {});
          }
        }

        // Playbook check-ins
        if (playbookCheckinsRes.status === "fulfilled" && playbookCheckinsRes.value) {
          const parsed = JSON.parse(playbookCheckinsRes.value.value);
          if (!cancelled) setPlaybookCheckins(Array.isArray(parsed) ? parsed : []);
        } else if (isLegacy) {
          const legacyCheckins = await window.storage.get(PLAYBOOK_CHECKINS_KEY, false).catch(() => null);
          if (!cancelled) {
            try {
              const parsed = legacyCheckins ? JSON.parse(legacyCheckins.value) : [];
              setPlaybookCheckins(Array.isArray(parsed) ? parsed : []);
            } catch (e) {
              setPlaybookCheckins([]);
            }
          }
        } else if (!cancelled) {
          setPlaybookCheckins([]);
        }


        // Notepad notes
        if (notepadRes.status === "fulfilled" && notepadRes.value) {
          const parsed = JSON.parse(notepadRes.value.value);
          if (!cancelled) setNotepadNotes(Array.isArray(parsed) ? parsed.map(migrateNoteShape) : []);
        } else if (isLegacy) {
          const legacyNotes = await window.storage.get(NOTEPAD_STORAGE_KEY, false).catch(() => null);
          if (!cancelled) {
            try {
              const parsed = legacyNotes ? JSON.parse(legacyNotes.value) : [];
              setNotepadNotes(Array.isArray(parsed) ? parsed.map(migrateNoteShape) : []);
            } catch (e) {
              setNotepadNotes([]);
            }
          }
        } else if (!cancelled) {
          setNotepadNotes([]);
        }

        // Linked prop firm (shown under Profit Split on the Challenge tab)
        if (linkedFirmRes.status === "fulfilled" && linkedFirmRes.value) {
          try {
            const parsed = JSON.parse(linkedFirmRes.value.value);
            if (!cancelled) setLinkedFirm(parsed && typeof parsed === "object" ? parsed : null);
          } catch (e) {
            if (!cancelled) setLinkedFirm(null);
          }
        } else if (!cancelled) {
          setLinkedFirm(null);
        }

      } catch (err) {
        // non-critical, fail silently

      } finally {
        if (!cancelled) {
          setAccountDataLoaded(true);
          setTradesLoaded(true);
          setJournalLoaded(true);
          setPlaybookRulesLoaded(true);
          setPlaybookCheckinsLoaded(true);
          setNotepadLoaded(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountsLoaded, activeAccountId]);

  useEffect(() => {
    if (!playbookCheckinsLoaded) return;
    const todayKey = dayKeyFromDate(new Date());
    const existing = playbookCheckins.find((c) => c.date === todayKey);
    setTodayResults(existing ? { ...existing.results } : {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playbookCheckinsLoaded, activeAccountId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setFxRatesStatus("loading");
      let hadFreshCache = false;
      try {
        const cachedRes = await window.storage.get(FX_LIVE_STORAGE_KEY, false);
        if (cachedRes && cachedRes.value) {
          const cached = JSON.parse(cachedRes.value);
          if (cached.rates) {
            if (!cancelled) {
              setLiveFxRates(cached.rates);
              setFxRatesDate(cached.date || null);
              setFxRatesStatus("live");
            }
            hadFreshCache = cached.fetchedAt && Date.now() - cached.fetchedAt < FX_CACHE_MS;
          }
        }
      } catch (err) {
        // no usable cache, fall through to network fetch
      }
      if (hadFreshCache) return;

      const result = await fetchLiveFxRates();
      if (cancelled) return;
      if (result) {
        setLiveFxRates(result.rates);
        setFxRatesDate(result.date);
        setFxRatesStatus("live");
        window.storage
          .set(FX_LIVE_STORAGE_KEY, JSON.stringify({ ...result, fetchedAt: Date.now() }), false)
          .catch(() => {});
      } else {
        setFxRatesStatus((cur) => (cur === "live" ? cur : "error"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cached = await window.storage.get(FMP_STORAGE_KEY, false);
        if (cached && cached.value) {
          const parsed = JSON.parse(cached.value);
          if (Array.isArray(parsed.events)) {
            if (!cancelled) {
              setEconEvents(parsed.events);
              setEconStatus("live");
            }
            if (parsed.fetchedAt && Date.now() - parsed.fetchedAt < FMP_CACHE_MS) return;
          }
        }
      } catch (err) {
        // no cache yet — fall through to a fresh fetch
      }
      if (!cancelled) loadEconomicCalendar();
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    window.storage.set(THEME_STORAGE_KEY, next, false).catch(() => {});
  };

const setThemeMode = (mode) => {
  persistSettings({ ...settings, themeMode: mode });
  if (mode === "dark" || mode === "light" || mode === "void") {
    setTheme(mode);
    window.storage.set(THEME_STORAGE_KEY, mode, false).catch(() => {});
  }
};

  useEffect(() => {
    if (settings.themeMode !== "auto") return;
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => setTheme(mq.matches ? "dark" : "light");
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [settings.themeMode]);

useEffect(() => {
    // Ignore a saved landing tab that no longer exists (Notepad now lives inside the Journal tab).
    if (settingsLoaded && settings.defaultLandingTab && TABS.some((t) => t.id === settings.defaultLandingTab)) {
      setActiveTab(settings.defaultLandingTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsLoaded]);

  useEffect(() => {
    if (!settingsLoaded) return;
    const hidden = settings.hiddenTabs || [];
    if (hidden.includes(activeTab)) {
      const fallback = TABS.find((t) => !hidden.includes(t.id));
      if (fallback) setActiveTab(fallback.id);
    }
  }, [settings.hiddenTabs, activeTab, settingsLoaded]);

  useEffect(() => {
    if (settingsLoaded && settings.defaultInsightsTab) {
      setInsightsSubTab(settings.defaultInsightsTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsLoaded]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.style.backgroundColor = palette.letterbox;
    document.body.style.backgroundColor = palette.letterbox;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", palette.bg);
  }, [theme]);

  const persistNews = async (next) => {
    setNewsEvents(next);
    try {
      await window.storage.set(NEWS_STORAGE_KEY, JSON.stringify(next), false);
    } catch (err) {
      // non-critical, fail silently
    }
  };

  const ensureAudioContext = () => {
    if (!audioCtxRef.current) {
      const Ctx = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
      if (Ctx) {
        try {
          audioCtxRef.current = new Ctx();
        } catch (err) {
          audioCtxRef.current = null;
        }
      }
    }
    return audioCtxRef.current;
  };

  const startBeep = () => {
    const ctx = ensureAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    const playBeep = () => {
      if (!audioCtxRef.current) return;
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      } catch (err) {
        // audio unavailable \u2014 the notification and modal still show
      }
    };
    playBeep();
    beepIntervalRef.current = setInterval(playBeep, 900);
  };

  const stopBeep = () => {
    if (beepIntervalRef.current) {
      clearInterval(beepIntervalRef.current);
      beepIntervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => stopBeep();
  }, []);

  const requestAlarmPermission = async () => {
    if (typeof Notification === "undefined") {
      setNotifPermission("unsupported");
      return "unsupported";
    }
    if (Notification.permission === "granted" || Notification.permission === "denied") {
      setNotifPermission(Notification.permission);
      return Notification.permission;
    }
    try {
      const result = await Notification.requestPermission();
      setNotifPermission(result);
      return result;
    } catch (err) {
      setNotifPermission("denied");
      return "denied";
    }
  };

  const toggleNewEventAlarm = () => {
    const next = !newEventAlarm;
    setNewEventAlarm(next);
    if (next) {
      ensureAudioContext();
      requestAlarmPermission();
    }
  };

  const triggerAlarm = (ev) => {
    setRingingEvent(ev);
    startBeep();
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      const notifOptions = {
        body: `Scheduled for ${ev.time} today — open Tredzi to dismiss`,
        tag: `ledger-alarm-${ev.id}`,
      };
      if (swRegistration && swRegistration.active) {
        try {
          swRegistration.active.postMessage({
            type: "SHOW_NOTIFICATION",
            title: `\u23F0 ${ev.name}`,
            options: notifOptions,
          });
        } catch (err) {
          // fall through to the plain Notification below
        }
      }
      try {
        new Notification(`\u23F0 ${ev.name}`, notifOptions);
      } catch (err) {
        // ignore \u2014 sound + in-app modal still ring
      }
    }
  };
  const dismissAlarm = () => {
    stopBeep();
    setRingingEvent(null);
  };

  const snoozeAlarm = () => {
    if (!ringingEvent) return;
    stopBeep();
    const id = ringingEvent.id;
    persistNews(
      newsEvents.map((e) => (e.id === id ? { ...e, rung: false, snoozeUntil: Date.now() + 5 * 60000 } : e))
    );
    setRingingEvent(null);
  };

  useEffect(() => {
    if (!newsLoaded) return;
    const tick = () => {
      if (ringingEvent) return;
      const nowMs = Date.now();
      const due = newsEvents
        .filter((ev) => ev.alarm && !ev.rung)
        .map((ev) => ({ ev, occMs: nextOccurrenceMs(ev, new Date()) }))
        .filter(({ ev, occMs }) =>
          ev.snoozeUntil
            ? nowMs >= ev.snoozeUntil
            : Number.isFinite(occMs) && nowMs >= occMs - RUNTIME.ALARM_LEAD_MS && nowMs < occMs + ALARM_STALE_WINDOW_MS
        )
        .sort((a, b) => a.occMs - b.occMs);
      if (due.length > 0) {
        const { ev } = due[0];
        persistNews(newsEvents.map((e) => (e.id === ev.id ? { ...e, rung: true, snoozeUntil: undefined } : e)));
        triggerAlarm(ev);
      }
    };
    tick();
    const id = setInterval(tick, ALARM_CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [newsEvents, newsLoaded, ringingEvent]);

  const addNewsEvent = () => {
    if (!newEventName.trim() || !newEventTime || !newEventDate) return;
    const next = [
      ...newsEvents,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: newEventName.trim(),
        impact: newEventImpact,
        date: newEventDate,
        time: newEventTime,
        alarm: newEventAlarm,
        rung: false,
      },
    ];
    persistNews(next);
    setNewEventName("");
    setNewEventDate("");
  };

  const deleteNewsEvent = (id) => {
    persistNews(newsEvents.filter((e) => e.id !== id));
  };

  const loadEconomicCalendar = async () => {
    setEconError("");
    setEconStatus("loading");
    try {
      const events = await fetchEconomicCalendar();
      setEconEvents(events);
      setEconStatus("live");
      window.storage
        .set(FMP_STORAGE_KEY, JSON.stringify({ events, fetchedAt: Date.now() }), false)
        .catch(() => {});
    } catch (err) {
      setEconStatus("error");
      setEconError(err.message || "Couldn't load the economic calendar.");
    }
  };

  const persistTrades = async (next) => {
    setTrades(next);
    if (!activeAccountId) return;
    try {
      await window.storage.set(scopedKey(STORAGE_KEY, activeAccountId), JSON.stringify(next), false);
    } catch (err) {
      // non-critical, fail silently
    }
  };

  const persistStartingBalance = async (val) => {
    setStartingBalance(val);
    if (!activeAccountId) return;
    try {
      await window.storage.set(scopedKey(STORAGE_BAL_KEY, activeAccountId), val, false);
    } catch (err) {
      // starting balance is non-critical, fail silently
    }
  };

  const persistCustomSetups = async (next) => {
    setCustomSetups(next);
    try {
      await window.storage.set(CUSTOM_SETUPS_STORAGE_KEY, JSON.stringify(next), false);
    } catch (err) {
      // non-critical, fail silently
    }
  };

  const persistHiddenDefaultSetups = async (next) => {
    setHiddenDefaultSetupIds(next);
    try {
      await window.storage.set(HIDDEN_DEFAULT_SETUPS_KEY, JSON.stringify(next), false);
    } catch (err) {
      // non-critical, fail silently
    }
  };

  const persistCustomMoods = async (next) => {
    setCustomMoods(next);
    try {
      await window.storage.set(CUSTOM_MOODS_STORAGE_KEY, JSON.stringify(next), false);
    } catch (err) {
      // non-critical, fail silently
    }
  };

  const persistSettings = async (next) => {
    setSettings(next);
    try {
      await window.storage.set(SETTINGS_STORAGE_KEY, JSON.stringify(next), false);
    } catch (err) {
      // non-critical, fail silently
    }
  };



  // --- Community actions (talk to the real backend) ---
  const persistCommunityUsername = async (name) => {
    setCommunityUsername(name);
    try {
      await window.storage.set(COMMUNITY_USERNAME_KEY, name, false);
    } catch (err) {}
  };

  const persistSession = async (next) => {
    setSession(next);
    try {
      if (next) await window.storage.set(COMMUNITY_SESSION_KEY, JSON.stringify(next), false);
      else await window.storage.delete(COMMUNITY_SESSION_KEY, false);
    } catch (err) {}
  };

  // Upload/replace the user's own profile picture.
  // NOTE: this calls a backend route (PATCH /auth/avatar) that does not exist yet —
  // see the note in chat for the exact contract the Worker needs to support.
  const uploadCommunityAvatar = async (file) => {
    if (!file || !session?.token) return;
    setCommunityAvatarUploading(true);
    try {
      const dataUrl = await resizeImageFile(file, 300);
      const data = await communityApi("/auth/avatar", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({ avatar: dataUrl }),
      });
      setCommunityAvatar(data.avatar);
      try { await window.storage.set(COMMUNITY_AVATAR_KEY, data.avatar, false); } catch (err) {}
    } catch (err) {
      setCommunityUsernameError(err.message || "Couldn't update your profile photo.");
    } finally {
      setCommunityAvatarUploading(false);
    }
  };

  const handleCommunityAvatarChange = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (file) uploadCommunityAvatar(file);
  };

  // Change the account password.
  // NOTE: this calls a backend route (POST /auth/change-password) that does not
  // exist yet — see the note in chat for the exact contract the Worker needs to support.
  const submitChangePassword = async () => {
    setChangePasswordError("");
    setChangePasswordMsg("");
    if (!currentPasswordInput || !newPasswordInput) {
      setChangePasswordError("Enter your current and new password.");
      return;
    }
    if (newPasswordInput.length < 8) {
      setChangePasswordError("New password must be at least 8 characters.");
      return;
    }
    if (!session?.token) {
      setChangePasswordError("You need to be signed in.");
      return;
    }
    setChangePasswordBusy(true);
    try {
      await communityApi("/auth/change-password", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({ currentPassword: currentPasswordInput, newPassword: newPasswordInput }),
      });
      setChangePasswordMsg("Password updated.");
      setCurrentPasswordInput("");
      setNewPasswordInput("");
      setShowChangePassword(false);
    } catch (err) {
      setChangePasswordError(err.message || "Couldn't update your password.");
    } finally {
      setChangePasswordBusy(false);
    }
  };

  // Build a compact, plain-text summary of the user's own trade stats to send
  // alongside each Coach message, so the model answers from real numbers
  // instead of guessing. Kept short on purpose — every line here is tokens
  // the Worker pays for on each request.
  const buildCoachContext = () => {
    if (!trades.length) return "The user hasn't logged any trades yet.";
    const insights = computeInsights(trades, customSetups, customMoods);
    const perf = computePerformanceMetrics(trades);
    const headline = computeHeadlineInsight(trades, customSetups, customMoods);
    const monthCmp = computeMonthComparison(trades);
    const disciplineStreak = computeDisciplineStreak(trades);
    const consistency = computeConsistencyScore(trades);
    const overconfidence = computeOverconfidenceCheck(trades);
    // fmtMoney() always returns an unsigned amount, so wrap it ourselves \u2014 otherwise a
    // negative net P&L (or loss) gets sent to the model as a positive number.
    const money = (n) => (Number.isFinite(n) ? `${n < 0 ? "-" : ""}$${fmtMoney(n)}` : "$0");
    const lines = [];

    // --- Overall performance ---
    lines.push(`Total trades: ${trades.length}`);
    lines.push(`Win rate: ${(perf.winRate * 100).toFixed(0)}%`);
    lines.push(`Net P&L: ${money(perf.netProfit)}`);
    lines.push(`Profit factor: ${Number.isFinite(perf.profitFactor) ? perf.profitFactor.toFixed(2) : "\u221e"}`);
    lines.push(`Avg win: ${money(perf.avgWin)}, avg loss: ${money(-perf.avgLoss)}`);
    lines.push(`Largest win: ${money(perf.largestWin)}, largest loss: ${money(perf.largestLoss)}`);
    lines.push(`Max drawdown: ${money(perf.maxDD)}`);

    // --- Current win/loss streak, most recent trade first ---
    const byTime = [...trades].sort((a, b) => a.ts - b.ts);
    let streakLen = 0;
    let streakType = null;
    for (let i = byTime.length - 1; i >= 0; i--) {
      const isWin = byTime[i].pnl > 0;
      if (streakType === null) {
        streakType = isWin ? "win" : "loss";
        streakLen = 1;
      } else if ((isWin && streakType === "win") || (!isWin && streakType === "loss")) {
        streakLen += 1;
      } else break;
    }
    if (streakType) {
      lines.push(`Current streak: ${streakLen} ${streakType}${streakLen === 1 ? "" : "s"} in a row`);
    }
    if (disciplineStreak.hasData) {
      lines.push(
        `Discipline streak (consecutive days with no revenge trade): ${disciplineStreak.current} current, ${disciplineStreak.best} best ever`
      );
    }

    // --- Day-of-week breakdown \u2014 which day they trade most/least, best/worst day ---
    if (insights.weekdayRows.length) {
      const mostTraded = [...insights.weekdayRows].sort((a, b) => b.count - a.count)[0];
      const leastTraded = [...insights.weekdayRows].sort((a, b) => a.count - b.count)[0];
      const bestPnlDay = [...insights.weekdayRows].sort((a, b) => b.pnl - a.pnl)[0];
      const worstPnlDay = [...insights.weekdayRows].sort((a, b) => a.pnl - b.pnl)[0];
      lines.push(
        "By weekday: " +
          insights.weekdayRows
            .map((r) => `${r.label} \u2014 ${r.count} trades, ${r.winRate.toFixed(0)}% win rate, ${money(r.pnl)} P&L`)
            .join("; ")
      );
      lines.push(
        `Trades most often on ${mostTraded.label} (${mostTraded.count} trades), least often on ${leastTraded.label} (${leastTraded.count} trades)`
      );
      lines.push(
        `Most profitable weekday: ${bestPnlDay.label} (${money(bestPnlDay.pnl)}). Least profitable weekday: ${worstPnlDay.label} (${money(worstPnlDay.pnl)})`
      );
    }

    // --- Best/worst single calendar day ---
    const pnlByDay = {};
    trades.forEach((t) => {
      const k = dayKeyFromTs(t.ts);
      pnlByDay[k] = (pnlByDay[k] || 0) + t.pnl;
    });
    const dayEntries = Object.entries(pnlByDay);
    if (dayEntries.length) {
      const best = dayEntries.reduce((a, b) => (b[1] > a[1] ? b : a));
      const worst = dayEntries.reduce((a, b) => (b[1] < a[1] ? b : a));
      lines.push(`Best single day: ${best[0]} (${money(best[1])}). Worst single day: ${worst[0]} (${money(worst[1])})`);
    }

    // --- This month vs last month ---
    const now = new Date();
    const thisMonthName = now.toLocaleString("en-US", { month: "long", year: "numeric" });
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthName = lastMonthDate.toLocaleString("en-US", { month: "long", year: "numeric" });
    lines.push(
      `This month (${thisMonthName}): ${monthCmp.thisMonth.count} trades, ${monthCmp.thisMonth.winRate.toFixed(0)}% win rate, ${money(monthCmp.thisMonth.net)} net`
    );
    lines.push(
      `Last month (${lastMonthName}): ${monthCmp.lastMonth.count} trades, ${monthCmp.lastMonth.winRate.toFixed(0)}% win rate, ${money(monthCmp.lastMonth.net)} net`
    );

    // --- By setup / mood ---
    if (insights.setupRows.length) {
      lines.push(
        "By setup: " +
          insights.setupRows
            .map((r) => `${r.label} \u2014 ${r.winRate.toFixed(0)}% win rate, ${money(r.pnl)} P&L, ${r.count} trades`)
            .join("; ")
      );
    }
    if (insights.moodRows.length) {
      lines.push(
        "By mood: " +
          insights.moodRows
            .map((r) => `${r.label} \u2014 ${r.winRate.toFixed(0)}% win rate, ${money(r.pnl)} P&L, ${r.count} trades`)
            .join("; ")
      );
    }
    if (insights.revengeCount > 0) {
      lines.push(`Revenge trades: ${insights.revengeCount}, cost ${money(insights.revengePnl)}`);
    }
    if (consistency) {
      lines.push(`Day-to-day consistency: ${consistency.label}`);
    }
    if (overconfidence && overconfidence.detected) {
      lines.push(
        `After 3+ wins in a row, average trade size increases ${overconfidence.pctChange.toFixed(0)}% \u2014 possible overconfidence sizing up.`
      );
    }
    if (headline) lines.push(`Headline insight: ${headline}`);

    // --- Journal tab \u2014 separate structured entries (session, R:R, mistakes) ---
    const filledRows = filledJournalRows(journalEntries);
    if (filledRows.length) {
      lines.push(`Journal entries logged: ${filledRows.length}`);
      const mistakes = journalMistakeFrequency(filledRows, 3);
      if (mistakes.length) {
        lines.push("Most frequent mistakes: " + mistakes.map((m) => `${m.label} (${m.count}x)`).join(", "));
      }
      const rrValues = filledRows.map((r) => parseFloat(r.rr)).filter((v) => Number.isFinite(v));
      if (rrValues.length) {
        const avgRR = rrValues.reduce((s, v) => s + v, 0) / rrValues.length;
        lines.push(`Average R:R across journal entries: ${avgRR.toFixed(2)}`);
      }
      const sessionRows = computeSessionWinRates(filledRows).filter((s) => s.total > 0);
      if (sessionRows.length) {
        lines.push(
          "By session: " +
            sessionRows
              .map((s) => `${s.label} \u2014 ${s.total} trades, ${s.winRate !== null ? s.winRate.toFixed(0) + "% win rate" : "no outcome logged"}`)
              .join("; ")
        );
      }
    }

    // --- App guide, so the coach can also answer "what does X tab do" questions ---
    const tabGuide = TOUR_STEPS.filter((s) => s.tabId).map((s) => `${s.title}: ${s.text}`);
    tabGuide.push(
      "Community: join or create trading groups for chat, trade signals, and Q&A, or browse the account-wide Global Feed of everyone's posted trades."
    );
    lines.push("App guide \u2014 " + tabGuide.join(" | "));

    return lines.join("\n");
  };

  // Send one message to the AI Coach (POST /ai/coach on the same Worker used
  // for Community). Rate-limited per account by the backend; coachRemaining
  // tracks how many messages are left today so the UI can show/disable state.
  const openCoachChat = async (id) => {
    if (!session?.token || coachLoading) return;
    setCoachError("");
    setCoachHistoryOpen(false);
    setCoachDeleteConfirmId(null);
    if (id === coachChatId) return;
    try {
      const data = await communityApi(`/ai/coach/chats/${id}`, { headers: { Authorization: `Bearer ${session.token}` } });
      setCoachChatId(data.id);
      setCoachMessages((data.messages || []).map((m, i) => ({ role: m.role, text: m.text, id: `cm-${data.id}-${i}` })));
    } catch (err) {
      setCoachError(err.message || "Couldn't open that chat.");
    }
  };

  const newCoachChat = () => {
    if (coachLoading) return;
    if (coachChats.length >= coachChatsMax) {
      setCoachError(`You have ${coachChatsMax} saved chats \u2014 delete one to start a new one.`);
      setCoachHistoryOpen(true);
      return;
    }
    setCoachError("");
    setCoachChatId(null);
    setCoachMessages([]);
    setCoachHistoryOpen(false);
    setCoachDeleteConfirmId(null);
  };

  const deleteCoachChat = async (id) => {
    if (!session?.token) return;
    try {
      await communityApi(`/ai/coach/chats/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${session.token}` } });
      setCoachChats((cur) => cur.filter((c) => c.id !== id));
      if (id === coachChatId) {
        setCoachChatId(null);
        setCoachMessages([]);
      }
      setCoachError("");
    } catch (err) {
      setCoachError(err.message || "Couldn't delete that chat.");
    } finally {
      setCoachDeleteConfirmId(null);
    }
  };

  const sendCoachMessage = async () => {
    const text = coachInput.trim();
    if (!text || coachLoading) return;
    if (!session?.token) {
      setCoachError("Sign in to your account (Community tab) to use the AI Coach.");
      return;
    }
    setCoachError("");
    setCoachInput("");
    const userMsg = { role: "user", text, id: `cm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` };
    setCoachMessages((prev) => [...prev, userMsg]);
    setCoachLoading(true);
    try {
      const data = await communityApi("/ai/coach", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({ message: text, context: buildCoachContext(), chatId: coachChatId || undefined }),
      });
      setCoachMessages((prev) => [
        ...prev,
        { role: "assistant", text: data.reply, id: `cm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` },
      ]);
      if (typeof data.remaining === "number") setCoachRemaining(data.remaining);
      if (data.chatId) {
        setCoachChatId(data.chatId);
        setCoachChats((cur) => [
          { id: data.chatId, title: data.title || "Chat", updatedAt: data.updatedAt || Date.now() },
          ...cur.filter((c) => c.id !== data.chatId),
        ]);
      }
    } catch (err) {
      if (/no longer exists/i.test(err.message || "")) {
        // chat was deleted elsewhere — drop it locally and start fresh next time
        setCoachChats((cur) => cur.filter((c) => c.id !== coachChatId));
        setCoachChatId(null);
      }
      setCoachError(err.message || "Couldn't reach the AI Coach \u2014 try again in a moment.");
      setCoachMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
      setCoachInput(text);
    } finally {
      setCoachLoading(false);
    }
  };

  // Claim a unique username on the signed-in account. The backend rejects it if
  // another account already has it (case-insensitively) — this is what makes
  // usernames one-per-person instead of just a local display name.
  const claimCommunityUsername = async (name) => {
    setCommunityUsernameError("");
    if (!session?.token) {
      setCommunityUsernameError("You need to be signed in to set a username.");
      return;
    }
    setCommunityUsernameBusy(true);
    try {
      const data = await communityApi("/auth/username", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({ username: name }),
      });
      await persistCommunityUsername(data.username);
    } catch (err) {
      setCommunityUsernameError(err.message);
    } finally {
      setCommunityUsernameBusy(false);
    }
  };

  const handleAuthSubmit = async () => {
    setAuthError("");
    const email = authEmail.trim().toLowerCase();
    if (!email || !authPassword) {
      setAuthError("Enter an email and password.");
      return;
    }
    setAuthBusy(true);
    try {
      const data = await communityApi(`/auth/${authMode}`, {
        method: "POST",
        body: JSON.stringify({ email, password: authPassword }),
      });
      await persistSession({ token: data.token, userId: data.userId, email: data.email });
      // Trust the account's own saved username (or lack of one) rather than
      // guessing one from the email — guessed names were never checked for
      // uniqueness against other accounts.
      await persistCommunityUsername(data.username || "");
      if (data.avatar) {
        setCommunityAvatar(data.avatar);
        try { await window.storage.set(COMMUNITY_AVATAR_KEY, data.avatar, false); } catch (err) {}
      }
      setAuthPassword("");
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthBusy(false);
    }
  };

  const resetForgotFlow = () => {
    setAuthForgotStep(null);
    setAuthResetCode("");
    setAuthNewPassword("");
    setAuthResendIn(0);
  };

  // Step 1: ask the server to email a 6-digit code. The server answers the same way whether or not the
  // address has an account, so this screen never reveals who is registered.
  const handleForgotRequest = async () => {
    setAuthError("");
    setAuthInfo("");
    const email = authEmail.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setAuthError("Enter the email you signed up with.");
      return;
    }
    setAuthBusy(true);
    try {
      await communityApi("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setAuthForgotStep("reset");
      setAuthResendIn(30);
      setAuthInfo("If an account exists for that email, a 6-digit code is on its way. It expires in 15 minutes.");
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthBusy(false);
    }
  };

  // Step 2: send the code + new password; on success go back to Log In.
  const handleResetSubmit = async () => {
    setAuthError("");
    const email = authEmail.trim().toLowerCase();
    const code = authResetCode.replace(/\D/g, "");
    if (code.length !== 6) {
      setAuthError("Enter the 6-digit code from your email.");
      return;
    }
    if (authNewPassword.length < 8) {
      setAuthError("Your new password needs at least 8 characters.");
      return;
    }
    setAuthBusy(true);
    try {
      await communityApi("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ email, code, password: authNewPassword }),
      });
      resetForgotFlow();
      setAuthMode("login");
      setAuthPassword("");
      setAuthInfo("Password updated. Log in with your new password.");
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthBusy(false);
    }
  };

  // Refresh email / username / avatar / password from the server — the source
  // of truth for the Profile screen, since none of that (besides email) lives
  // in the locally-cached session.
  const fetchAccountProfile = async (token) => {
    if (!token) return;
    setAccountProfileError("");
    try {
      const data = await communityApi("/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.username) await persistCommunityUsername(data.username);
      if (data.avatar) {
        setCommunityAvatar(data.avatar);
        try { await window.storage.set(COMMUNITY_AVATAR_KEY, data.avatar, false); } catch (err) {}
      }
    } catch (err) {
      // Most likely cause: the backend hasn't been redeployed with the
      // /auth/me route (and migration_profile.sql) yet.
      setAccountProfileError(err.message || "Couldn't load your account details.");
    }
  };

  useEffect(() => {
    if (session?.token) fetchAccountProfile(session.token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.token]);

  const logout = async () => {
    try {
      if (session?.token) {
        await communityApi("/auth/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${session.token}` },
        });
      }
    } catch (err) {}
    await persistSession(null);
  };

  const persistOnboardingSeen = async () => {
    setOnboardingSeen(true);
    try {
      await window.storage.set(COMMUNITY_ONBOARDING_KEY, "1", false);
    } catch (err) {}
  };

  const clampOnboardingIndex = (i) => Math.max(0, Math.min(ONBOARDING_SLIDES.length, i));

  const onboardingDragStart = (clientX) => {
    onboardingDragStartXRef.current = clientX;
    onboardingDraggingRef.current = true;
    setOnboardingDragging(true);
  };
  const onboardingDragMove = (clientX) => {
    if (onboardingDragStartXRef.current == null) return;
    setOnboardingDragX(clientX - onboardingDragStartXRef.current);
  };
  const onboardingDragEnd = () => {
    if (!onboardingDraggingRef.current) return; // guard against double-firing
    onboardingDraggingRef.current = false;
    setOnboardingDragX((delta) => {
      const threshold = 45;
      if (delta <= -threshold) {
        setOnboardingIndex((i) => clampOnboardingIndex(i + 1));
      } else if (delta >= threshold) {
        setOnboardingIndex((i) => clampOnboardingIndex(i - 1));
      }
      return 0;
    });
    onboardingDragStartXRef.current = null;
    setOnboardingDragging(false);
  };

  // On PC, a fast swipe can carry the cursor outside the carousel's own
  // bounds before mouseup fires, which used to cut the drag short (or let a
  // stray mouseleave + mouseup both fire and double-advance the slide).
  // Tracking the drag on window instead keeps it to exactly one step.
  useEffect(() => {
    if (!onboardingDragging) return;
    const handleMove = (e) => onboardingDragMove(e.clientX);
    const handleUp = () => onboardingDragEnd();
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [onboardingDragging]);

  const persistMyGroups = async (next) => {
    setMyGroups(next);
    try {
      await window.storage.set(COMMUNITY_MEMBERSHIPS_KEY, JSON.stringify(next), false);
    } catch (err) {}
  };

  const createCommunityGroup = async () => {
    const name = newGroupName.trim();
    const code = newGroupCode.trim();
    setGroupCodeError("");
    if (!name || code.length < 4) {
      setGroupCodeError("Name and a code (4+ characters) are required.");
      return;
    }
    setCreatingGroup(true);
    try {
      const data = await communityApi("/groups", {
        method: "POST",
        body: JSON.stringify({
          name,
          description: newGroupDesc.trim(),
          code,
          username: communityUsername,
          isPublic: newGroupPublic,
          tags: newGroupTags.split(",").map((t) => t.trim()).filter(Boolean),
        }),
      });
      const membership = { id: data.id, token: data.token, name: data.name, description: data.description, role: "owner" };
      await persistMyGroups([...myGroups, membership]);
      setAddingGroup(false);
      setNewGroupName("");
      setNewGroupDesc("");
      setNewGroupCode("");
      setNewGroupPublic(false);
      setNewGroupTags("");
      setCommunityLobbyTab("mine");
      setActiveGroupId(data.id);
    } catch (err) {
      setGroupCodeError(err.message);
    } finally {
      setCreatingGroup(false);
    }
  };

  const joinGroupByCode = async () => {
    const code = joinCodeInput.trim();
    setJoinCodeError("");
    if (!code) return;
    setJoiningGroup(true);
    try {
      const data = await communityApi("/groups/join", {
        method: "POST",
        body: JSON.stringify({ code, username: communityUsername }),
      });
      const membership = { id: data.id, token: data.token, name: data.name, description: data.description, role: "member" };
      const already = myGroups.some((g) => g.id === data.id);
      await persistMyGroups(already ? myGroups : [...myGroups, membership]);
      setJoinCodeInput("");
      setCommunityLobbyTab("mine");
      setActiveGroupId(data.id);
    } catch (err) {
      setJoinCodeError(err.message);
    } finally {
      setJoiningGroup(false);
    }
  };

  const leaveCommunityGroup = (id) => {
    persistMyGroups(myGroups.filter((g) => g.id !== id));
    if (activeGroupId === id) setActiveGroupId(null);
  };

  const loadGroupJoinRequests = async () => {
    const membership = myGroups.find((g) => g.id === activeGroupId);
    if (!membership) return;
    setGroupJoinRequestsLoaded(false);
    try {
      const data = await communityApi(`/groups/${activeGroupId}/requests`, {
        headers: { Authorization: `Bearer ${membership.token}` },
      });
      setGroupJoinRequests(data.requests || []);
    } catch (err) {
      setManageMsg(err.message);
    } finally {
      setGroupJoinRequestsLoaded(true);
    }
  };

  const approveJoinRequest = async (username) => {
    const membership = myGroups.find((g) => g.id === activeGroupId);
    if (!membership) return;
    try {
      await communityApi(`/groups/${activeGroupId}/requests/${encodeURIComponent(username)}/approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${membership.token}` },
      });
      setGroupJoinRequests((cur) => cur.filter((r) => r.username !== username));
      setManageMsg(`${username} approved.`);
    } catch (err) {
      setManageMsg(err.message);
    }
  };

  const declineJoinRequest = async (username) => {
    const membership = myGroups.find((g) => g.id === activeGroupId);
    if (!membership) return;
    try {
      await communityApi(`/groups/${activeGroupId}/requests/${encodeURIComponent(username)}/decline`, {
        method: "POST",
        headers: { Authorization: `Bearer ${membership.token}` },
      });
      setGroupJoinRequests((cur) => cur.filter((r) => r.username !== username));
    } catch (err) {}
  };

  const sendCommunityMessage = async () => {
    if (!activeGroupId) return;
    const membership = myGroups.find((g) => g.id === activeGroupId);
    if (!membership) return;
const isSignal = communityPanelTab === "signal";
if (isSignal) {
  const membershipForCheck = myGroups.find((g) => g.id === activeGroupId);
  const myMemberForCheck = groupMembersList.find((m) => m.username === communityUsername);
  const allowed = membershipForCheck?.role === "owner" || !!myMemberForCheck?.isOwner || !!myMemberForCheck?.isAdmin || !!myMemberForCheck?.isSignalProvider;
  if (!allowed) return;
}
if (isSignal && !signalPair.trim()) return;
if (!isSignal && !communityMsgText.trim()) return;

    // Optimistic send: show the message instantly, POST in the background, and
    // skip the old full re-download of the whole chat (up to 300 rows, stickers
    // included as base64) that used to run after every send. Polling keeps
    // everyone else's view in sync.
    const draft = {
      text: communityMsgText.trim(),
      pair: signalPair.trim().toUpperCase(),
      direction: signalDirection,
      entry: signalEntry.trim(),
      sl: signalSL.trim(),
      tp: signalTP.trim(),
    };
    const replyTarget = replyingTo;
    const tempId = `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    // Replies to a signal become thread replies on the server and never show in the main list.
    const replyParent = replyTarget ? groupMessages.find((m) => m.id === replyTarget.id) : null;
    const goesToThread = !isSignal && !!replyParent && (replyParent.type === "signal" || replyParent.type === "thread_reply");
    if (!goesToThread) {
      setGroupMessages((cur) => [
        ...cur,
        {
          id: tempId,
          group_id: activeGroupId,
          author: communityUsername || "Anonymous",
          type: isSignal ? "signal" : "chat",
          text: draft.text,
          reply_to_id: !isSignal ? replyTarget?.id || null : null,
          pair: isSignal ? draft.pair : null,
          direction: isSignal ? draft.direction : null,
          entry: isSignal ? draft.entry : null,
          sl: isSignal ? draft.sl : null,
          tp: isSignal ? draft.tp : null,
          ts: Date.now(),
          reactions: {},
          myReactions: [],
          replyCount: 0,
          replyToAuthor: !isSignal && replyTarget ? replyTarget.author : undefined,
          replyToText: !isSignal && replyTarget ? String(replyTarget.preview || "") : undefined,
        },
      ]);
      setTimeout(() => communityMessagesEndRef.current?.scrollIntoView({ block: "end" }), 30);
    }
    setCommunityMsgText("");
    setSignalPair("");
    setSignalEntry("");
    setSignalSL("");
    setSignalTP("");
    setReplyingTo(null);

    try {
      const res = await communityApi(`/groups/${activeGroupId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${membership.token}` },
        body: JSON.stringify({
          author: communityUsername || "Anonymous",
          type: isSignal ? "signal" : "chat",
          text: draft.text,
          replyTo: !isSignal ? replyTarget?.id || undefined : undefined,
          pair: isSignal ? draft.pair : undefined,
          direction: isSignal ? draft.direction : undefined,
          entry: isSignal ? draft.entry : undefined,
          sl: isSignal ? draft.sl : undefined,
          tp: isSignal ? draft.tp : undefined,
        }),
      });
      setGroupMessages((cur) => {
        if (res?.id && cur.some((m) => m.id === res.id)) return cur.filter((m) => m.id !== tempId);
        return cur.map((m) => (m.id === tempId ? { ...m, id: res?.id || m.id, ts: res?.ts || m.ts } : m));
      });
    } catch (err) {
      // Roll back the optimistic bubble and give the text back so nothing is lost.
      setGroupMessages((cur) => cur.filter((m) => m.id !== tempId));
      setCommunityMsgText(draft.text);
      if (isSignal) {
        setSignalPair(draft.pair);
        setSignalEntry(draft.entry);
        setSignalSL(draft.sl);
        setSignalTP(draft.tp);
      }
      if (replyTarget) setReplyingTo(replyTarget);
      setCommunityApiError(err.message);
    }
  };

  // --- Sticker packs: personal, account-scoped (session token, not a group
  // membership token) so the same stickers follow the user into any group. ---
  const fetchStickerPacks = async () => {
    if (!session?.token) return;
    try {
      const data = await communityApi("/stickers", {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      setStickerPacks(data.packs || []);
    } catch (err) {
      // silent — sticker picker just shows empty, not worth a banner
    } finally {
      setStickerPacksLoaded(true);
    }
  };

  const createStickerPack = async () => {
    const name = stickerNewPackName.trim();
    if (!name || !session?.token) return;
    setStickerError("");
    try {
      const data = await communityApi("/stickers/packs", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({ name }),
      });
      setStickerPacks((cur) => [...cur, { id: data.id, name: data.name, stickers: [] }]);
      setStickerActivePackId(data.id);
      setStickerNewPackName("");
    } catch (err) {
      setStickerError(err.message);
    }
  };

  const deleteStickerPack = async (packId) => {
    if (!session?.token) return;
    setStickerPacks((cur) => cur.filter((p) => p.id !== packId));
    if (stickerActivePackId === packId) setStickerActivePackId(null);
    try {
      await communityApi(`/stickers/packs/${packId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.token}` },
      });
    } catch (err) {
      setStickerError(err.message);
      fetchStickerPacks(); // resync on failure
    }
  };

  const deleteSticker = async (stickerId, packId) => {
    if (!session?.token) return;
    setStickerPacks((cur) =>
      cur.map((p) => (p.id === packId ? { ...p, stickers: p.stickers.filter((s) => s.id !== stickerId) } : p))
    );
    try {
      await communityApi(`/stickers/${stickerId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.token}` },
      });
    } catch (err) {
      setStickerError(err.message);
      fetchStickerPacks();
    }
  };

  const handleStickerFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !stickerActivePackId || !session?.token) return;
    setStickerUploading(true);
    setStickerError("");
    try {
      const isAnimatable = file.type === "image/gif" || file.type === "image/webp";
      const image = isAnimatable ? await readStickerFileRaw(file) : await resizeStickerFile(file);
      const data = await communityApi(`/stickers/packs/${stickerActivePackId}/stickers`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({ image }),
      });
      setStickerPacks((cur) =>
        cur.map((p) =>
          p.id === stickerActivePackId ? { ...p, stickers: [...p.stickers, { id: data.id, image: data.image }] } : p
        )
      );
    } catch (err) {
      setStickerError(err.message);
    } finally {
      setStickerUploading(false);
    }
  };

  const sendSticker = async (image) => {
    if (!activeGroupId) return;
    const membership = myGroups.find((g) => g.id === activeGroupId);
    if (!membership) return;
    setStickerPickerOpen(false);
    // Optimistic: the sticker appears immediately; no full chat re-download afterwards.
    const replyTarget = replyingTo;
    const tempId = `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const replyParent = replyTarget ? groupMessages.find((m) => m.id === replyTarget.id) : null;
    const goesToThread = !!replyParent && (replyParent.type === "signal" || replyParent.type === "thread_reply");
    if (!goesToThread) {
      setGroupMessages((cur) => [
        ...cur,
        {
          id: tempId,
          group_id: activeGroupId,
          author: communityUsername || "Anonymous",
          type: "sticker",
          text: image,
          reply_to_id: replyTarget?.id || null,
          ts: Date.now(),
          reactions: {},
          myReactions: [],
          replyCount: 0,
          replyToAuthor: replyTarget ? replyTarget.author : undefined,
          replyToText: replyTarget ? String(replyTarget.preview || "") : undefined,
        },
      ]);
      setTimeout(() => communityMessagesEndRef.current?.scrollIntoView({ block: "end" }), 30);
    }
    setReplyingTo(null);
    try {
      const res = await communityApi(`/groups/${activeGroupId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${membership.token}` },
        body: JSON.stringify({
          author: communityUsername || "Anonymous",
          type: "sticker",
          stickerImage: image,
          replyTo: replyTarget?.id || undefined,
        }),
      });
      setGroupMessages((cur) => {
        if (res?.id && cur.some((m) => m.id === res.id)) return cur.filter((m) => m.id !== tempId);
        return cur.map((m) => (m.id === tempId ? { ...m, id: res?.id || m.id, ts: res?.ts || m.ts } : m));
      });
    } catch (err) {
      setGroupMessages((cur) => cur.filter((m) => m.id !== tempId));
      if (replyTarget) setReplyingTo(replyTarget);
      setCommunityApiError(err.message);
    }
  };

  // --- Typing indicator: called on every keystroke in the chat box, throttled to
  // one ping per ~2s so it doesn't spam the worker. ---
  const pingTyping = () => {
    if (!activeGroupId) return;
    const membership = myGroups.find((g) => g.id === activeGroupId);
    if (!membership) return;
    const now = Date.now();
    if (now - typingPingRef.current < 2000) return;
    typingPingRef.current = now;
    communityApi(`/groups/${activeGroupId}/typing`, {
      method: "POST",
      headers: { Authorization: `Bearer ${membership.token}` },
    }).catch(() => {});
  };

  // --- Heartbeat: keeps this member's green "online" dot alive for others. ---
  const sendCommunityHeartbeat = () => {
    if (!activeGroupId) return;
    const membership = myGroups.find((g) => g.id === activeGroupId);
    if (!membership) return;
    communityApi(`/groups/${activeGroupId}/heartbeat`, {
      method: "POST",
      headers: { Authorization: `Bearer ${membership.token}` },
    }).catch(() => {});
  };

  // --- Message reactions: toggle an emoji on a chat message or signal. ---
  const toggleMessageReaction = async (messageId, emoji) => {
    if (!activeGroupId) return;
    const membership = myGroups.find((g) => g.id === activeGroupId);
    if (!membership) return;
    setReactionPickerFor(null);
    // Optimistic update so the tap feels instant.
    setGroupMessages((cur) => cur.map((m) => {
      if (m.id !== messageId) return m;
      const mine = m.myReactions || [];
      const alreadyMine = mine.includes(emoji);
      const reactions = { ...(m.reactions || {}) };
      reactions[emoji] = Math.max(0, (reactions[emoji] || 0) + (alreadyMine ? -1 : 1));
      if (reactions[emoji] === 0) delete reactions[emoji];
      return { ...m, reactions, myReactions: alreadyMine ? mine.filter((e) => e !== emoji) : [...mine, emoji] };
    }));
    try {
      const data = await communityApi(`/groups/${activeGroupId}/messages/${messageId}/react`, {
        method: "POST",
        headers: { Authorization: `Bearer ${membership.token}` },
        body: JSON.stringify({ emoji }),
      });
      setGroupMessages((cur) => cur.map((m) => m.id === messageId ? { ...m, reactions: data.reactions || {}, myReactions: data.mine || [] } : m));
    } catch (err) {
      setCommunityApiError(err.message);
    }
  };

  // --- Signal threads: load / open / reply. ---
  const openSignalThread = async (signalId) => {
    setOpenThreadId(signalId);
    setThreadDraft("");
    if (!activeGroupId) return;
    const membership = myGroups.find((g) => g.id === activeGroupId);
    if (!membership) return;
    setThreadLoading((cur) => ({ ...cur, [signalId]: true }));
    try {
      const data = await communityApi(`/groups/${activeGroupId}/messages/${signalId}/thread`, {
        headers: { Authorization: `Bearer ${membership.token}` },
      });
      setThreadReplies((cur) => ({ ...cur, [signalId]: data.replies || [] }));
    } catch (err) {
      setCommunityApiError(err.message);
    } finally {
      setThreadLoading((cur) => ({ ...cur, [signalId]: false }));
    }
  };

  const sendThreadReply = async (signalId) => {
    if (!threadDraft.trim() || !activeGroupId) return;
    const membership = myGroups.find((g) => g.id === activeGroupId);
    if (!membership) return;
    try {
      await communityApi(`/groups/${activeGroupId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${membership.token}` },
        body: JSON.stringify({ author: communityUsername || "Anonymous", type: "chat", text: threadDraft.trim(), replyTo: signalId }),
      });
      setThreadDraft("");
      const data = await communityApi(`/groups/${activeGroupId}/messages/${signalId}/thread`, {
        headers: { Authorization: `Bearer ${membership.token}` },
      });
      setThreadReplies((cur) => ({ ...cur, [signalId]: data.replies || [] }));
      setGroupMessages((cur) => cur.map((m) => m.id === signalId ? { ...m, replyCount: (m.replyCount || 0) + 1 } : m));
    } catch (err) {
      setCommunityApiError(err.message);
    }
  };

  // --- Follow / unfollow (Instagram-style, account-wide). Works from the profile page,
  // the follower lists, and any group's member list. ---
  const toggleFollowMember = async (username, currentlyFollowing) => {
    if (!session?.token || followBusy) return;
    setFollowBusy(true);
    try {
      const data = await communityApi(`/follow/${encodeURIComponent(username)}`, {
        method: currentlyFollowing ? "DELETE" : "POST",
        headers: { Authorization: `Bearer ${session.token}` },
      });
      setGroupMembersList((cur) => cur.map((m) => m.username === username
        ? { ...m, isFollowedByMe: data.isFollowing, followerCount: data.followerCount }
        : m));
      setProfileData((cur) => {
        if (!cur) return cur;
        if (cur.username === username) return { ...cur, isFollowedByMe: data.isFollowing, followerCount: data.followerCount };
        // Following someone from a list while on my own profile changes my "Following" count.
        if (cur.username === communityUsername) return { ...cur, followingCount: Math.max(0, (cur.followingCount || 0) + (data.isFollowing ? 1 : -1)) };
        return cur;
      });
      setFollowListData((cur) => cur.map((r) => r.username === username ? { ...r, isFollowedByMe: data.isFollowing } : r));
    } catch (err) {
      setCommunityApiError(err.message);
    } finally {
      setFollowBusy(false);
    }
  };

  // Save my bio (account-level, so it shows in every group).
  const saveProfileBio = async () => {
    if (!session?.token || bioSaving) return;
    setBioSaving(true);
    try {
      const data = await communityApi("/auth/bio", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({ bio: bioDraft }),
      });
      setProfileData((cur) => (cur ? { ...cur, bio: data.bio } : cur));
      setBioEditing(false);
    } catch (err) {
      setProfileError(err.message || "Couldn't save your bio.");
    } finally {
      setBioSaving(false);
    }
  };

  // ---------- Global Community Feed (account-wide, independent of groups) ----------
  const loadGlobalFeed = async (before = null) => {
    if (!session?.token) return;
    try {
      const suffix = before ? `?before=${before}` : "";
      const data = await communityApi(`/feed${suffix}`, {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      setGlobalFeed((cur) => before ? [...cur, ...(data.posts || [])] : (data.posts || []));
      setGlobalFeedNext(data.nextCursor || null);
      setGlobalFeedLoaded(true);
      setGlobalFeedNewCount(0);
    } catch (err) {
      setGlobalFeedLoaded(true);
      setCommunityApiError(err.message || "Couldn't load the global feed.");
    }
  };

  // Live-update poll: while the feed is open, quietly check for posts newer than what's
  // on screen (from other people — your own posts already appear instantly on submit).
  // Rather than yanking the list around under the person's thumb, new posts wait behind
  // a "New posts" pill, same pattern X and Facebook use.
  const pollGlobalFeedForNew = async () => {
    if (!session?.token || !globalFeedLoaded) return;
    const newest = globalFeed[0]?.ts;
    if (!newest) return;
    try {
      const data = await communityApi(`/feed?since=${newest}`, {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      const fresh = (data.posts || []).filter((p) => p.author !== communityUsername && !globalFeed.some((g) => g.id === p.id));
      if (fresh.length > 0) {
        setGlobalFeedPending((cur) => {
          const merged = [...fresh, ...cur.filter((p) => !fresh.some((f) => f.id === p.id))];
          setGlobalFeedNewCount(merged.length);
          return merged;
        });
      }
    } catch (err) {
      // Silent — this is a background poll, not a user-initiated action.
    }
  };

  const revealPendingGlobalPosts = () => {
    setGlobalFeed((cur) => [...globalFeedPending, ...cur]);
    setGlobalFeedPending([]);
    setGlobalFeedNewCount(0);
  };

  useEffect(() => {
    const feedIsOpen = activeTab === "community" && communityLobbyTab === "global" && !activeGroupId && (isDesktop || communityMobileFeedOpen);
    if (!feedIsOpen || !session?.token) return;
    const interval = setInterval(pollGlobalFeedForNew, 12000);
    return () => clearInterval(interval);
  }, [activeTab, communityLobbyTab, activeGroupId, isDesktop, communityMobileFeedOpen, session?.token, globalFeed, globalFeedLoaded, globalFeedPending]);

  // Desktop opens on the Global Feed, so fetch it as soon as the Community tab is shown.
  useEffect(() => {
    if (activeTab === "community" && isDesktop && session?.token && communityUsername && communityLobbyTab === "global" && !globalFeedLoaded) {
      loadGlobalFeed();
    }
  }, [activeTab, isDesktop, session?.token, communityUsername, communityLobbyTab, globalFeedLoaded]);

  const uploadGlobalPostImage = async (file) => {
    if (!file) return;
    setGlobalPostImageUploading(true);
    try {
      setGlobalPostImage(await resizeImageFile(file, 800));
    } catch (err) {
      setCommunityApiError("Couldn't attach that image.");
    } finally {
      setGlobalPostImageUploading(false);
    }
  };

  const handleGlobalPostImageChange = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (file) uploadGlobalPostImage(file);
  };

  const createGlobalFeedPost = async () => {
    if (!session?.token || globalPostSubmitting) return;
    const text = globalPostText.trim();
    const image = globalPostImage;
    if (!text && !image) return;
    setGlobalPostSubmitting(true);
    try {
      const data = await communityApi("/feed", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({ text, image }),
      });
      // Drop it straight into the feed instead of waiting on a refetch, so it appears instantly.
      const optimisticPost = {
        id: data.id,
        author: communityUsername,
        avatar: communityAvatar || undefined,
        text: text || null,
        image: image || null,
        likeCount: 0,
        liked: false,
        commentCount: 0,
        ts: data.ts || Date.now(),
      };
      setGlobalFeed((cur) => [optimisticPost, ...cur]);
      setGlobalFeedLoaded(true);
      setGlobalPostText("");
      setGlobalPostImage(null);
      setGlobalFeedComposerOpen(false);
    } catch (err) {
      setCommunityApiError(err.message || "Couldn't share that.");
    } finally {
      setGlobalPostSubmitting(false);
    }
  };

  const likeGlobalFeedPost = async (postId) => {
    if (!session?.token) return;
    const current = globalFeed.find((p) => p.id === postId);
    if (!current) return;
    const wasLiked = !!current.liked;
    setGlobalFeed((cur) => cur.map((p) => p.id === postId
      ? { ...p, liked: !wasLiked, likeCount: Math.max(0, (p.likeCount || 0) + (wasLiked ? -1 : 1)) }
      : p));
    try {
      await communityApi(`/profile/posts/${postId}/like`, {
        method: wasLiked ? "DELETE" : "POST",
        headers: { Authorization: `Bearer ${session.token}` },
      });
    } catch (err) {
      setGlobalFeed((cur) => cur.map((p) => p.id === postId
        ? { ...p, liked: wasLiked, likeCount: Math.max(0, (p.likeCount || 0) + (wasLiked ? 1 : -1)) }
        : p));
    }
  };

  const openGlobalFeedComments = async (postId) => {
    if (globalFeedCommentsOpenId === postId) {
      setGlobalFeedCommentsOpenId(null);
      return;
    }
    setGlobalFeedCommentsOpenId(postId);
    if (globalFeedComments[postId]) return;
    setGlobalFeedCommentsLoading((cur) => ({ ...cur, [postId]: true }));
    try {
      const data = await communityApi(`/profile/posts/${postId}/comments`, {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      setGlobalFeedComments((cur) => ({ ...cur, [postId]: data.comments || [] }));
    } catch (err) {
      setCommunityApiError(err.message || "Couldn't load comments.");
    } finally {
      setGlobalFeedCommentsLoading((cur) => ({ ...cur, [postId]: false }));
    }
  };

  const postGlobalFeedComment = async (postId) => {
    const text = (globalFeedCommentDrafts[postId] || "").trim();
    if (!session?.token || !text) return;
    try {
      const res = await communityApi(`/profile/posts/${postId}/comments`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({ text }),
      });
      setGlobalFeedCommentDrafts((cur) => ({ ...cur, [postId]: "" }));
      setGlobalFeedComments((cur) => ({
        ...cur,
        [postId]: [...(cur[postId] || []), { id: res.id, author: communityUsername, text, ts: res.ts || Date.now() }],
      }));
      setGlobalFeed((cur) => cur.map((p) => p.id === postId ? { ...p, commentCount: (p.commentCount || 0) + 1 } : p));
    } catch (err) {
      setCommunityApiError(err.message || "Couldn't post that comment.");
    }
  };

  const deleteGlobalFeedPost = async (postId) => {
    if (!session?.token) return;
    if (typeof window !== "undefined" && !window.confirm("Delete this post?")) return;
    try {
      await communityApi(`/profile/posts/${postId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.token}` },
      });
      setGlobalFeed((cur) => cur.filter((p) => p.id !== postId));
    } catch (err) {
      setCommunityApiError(err.message || "Couldn't delete that post.");
    }
  };

  const renderGlobalFeed = () => (
    <div className="flex flex-col h-full" style={{ background: palette.bg }}>
      <div className="sticky top-0 z-10 flex items-center gap-3 px-5" style={{ height: "56px", borderBottom: `1px solid ${palette.border}`, background: `${palette.bg}F2`, backdropFilter: "blur(10px)" }}>
        {!isDesktop && (
          <button type="button" onClick={() => setCommunityMobileFeedOpen(false)} onMouseEnter={(e) => { e.currentTarget.style.background = palette.field; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }} className={`flex items-center justify-center rounded-full flex-shrink-0 ${TAP}`} style={{ width: "32px", height: "32px", color: palette.text, marginLeft: "-6px", transition: "background 0.15s ease" }} aria-label="Back to groups">
            <ChevronLeft size={19} />
          </button>
        )}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="rounded-full flex-shrink-0" style={{ width: "7px", height: "7px", background: palette.gold, boxShadow: `0 0 0 3px ${palette.gold}22` }} />
          <div style={{ fontFamily: display, fontSize: "17px", fontWeight: 800, color: palette.text, letterSpacing: "-0.01em" }}>Global Feed</div>
        </div>
        <button type="button" onClick={() => loadGlobalFeed()} onMouseEnter={(e) => { e.currentTarget.style.background = palette.field; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }} className={`flex items-center justify-center rounded-full flex-shrink-0 ${TAP}`} style={{ width: "32px", height: "32px", color: palette.textMuted, transition: "background 0.15s ease" }} aria-label="Refresh feed">
          <RotateCcw size={15} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto relative" style={{ minHeight: 0, paddingBottom: !isDesktop ? MOBILE_NAV_SPACE : undefined }} onScroll={handleMobileNavScroll}>
        {globalFeedNewCount > 0 && (
          <div className="sticky top-3 z-10 flex justify-center pointer-events-none">
            <button
              type="button"
              onClick={revealPendingGlobalPosts}
              className={`pointer-events-auto flex items-center gap-1.5 px-4 py-2 rounded-full ${TAP}`}
              style={{ background: palette.gold, color: palette.letterbox, fontSize: "12.5px", fontWeight: 800, boxShadow: `0 6px 18px ${palette.gold}4D` }}
            >
              <ChevronUp size={14} />{globalFeedNewCount === 1 ? "1 new post" : `${globalFeedNewCount} new posts`}
            </button>
          </div>
        )}
        <div className="max-w-xl mx-auto px-3 py-3">
          <div className="flex items-start gap-3 p-4 mb-3 rounded-2xl" style={{ background: palette.surface, border: `1px solid ${palette.border}` }}>
            <Avatar name={communityUsername || "?"} size={40} src={communityAvatar || undefined} />
            <div className="flex-1 min-w-0 pt-1.5">
              {!globalFeedComposerOpen ? (
                <button type="button" onClick={() => setGlobalFeedComposerOpen(true)} className={`w-full text-left ${TAP}`} style={{ background: "none", border: "none", padding: 0, color: palette.textFaint, fontSize: "15px" }}>What's happening in the market?</button>
              ) : (
                <>
                  <textarea autoFocus value={globalPostText} onChange={(e) => setGlobalPostText(e.target.value)} placeholder="What's happening in the market?" rows={3} className="w-full bg-transparent outline-none mb-2" style={{ color: palette.text, fontSize: "15px", resize: "none" }} />
                  {globalPostImage && <div className="relative inline-block mb-2.5"><img src={globalPostImage} alt="Post attachment" className="rounded-xl" style={{ width: "120px", height: "120px", objectFit: "cover", border: `1px solid ${palette.border}` }} /><button type="button" onClick={() => setGlobalPostImage(null)} className={`absolute flex items-center justify-center rounded-full ${TAP}`} style={{ top: "-6px", right: "-6px", width: "20px", height: "20px", background: palette.red, color: "#FFFFFF" }}><X size={12} /></button></div>}
                  <div className="flex items-center justify-between gap-2 pt-3 mt-1" style={{ borderTop: `1px solid ${palette.border}` }}>
                    <div className="flex items-center gap-1">
                      <input ref={globalPostImageInputRef} type="file" accept="image/*" onChange={handleGlobalPostImageChange} className="hidden" />
                      <button type="button" onClick={() => globalPostImageInputRef.current && globalPostImageInputRef.current.click()} disabled={globalPostImageUploading} onMouseEnter={(e) => { e.currentTarget.style.background = palette.field; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }} className={`flex items-center justify-center rounded-full ${TAP}`} style={{ width: "34px", height: "34px", color: palette.gold, transition: "background 0.15s ease" }} aria-label="Attach photo"><Camera size={17} /></button>
                      <button type="button" onClick={() => { setGlobalFeedComposerOpen(false); setGlobalPostText(""); setGlobalPostImage(null); }} className={`px-3 py-1.5 rounded-full ${TAP}`} style={{ background: "transparent", color: palette.textFaint, fontSize: "12px", fontWeight: 700 }}>Cancel</button>
                    </div>
                    <button type="button" onClick={createGlobalFeedPost} disabled={(!globalPostText.trim() && !globalPostImage) || globalPostSubmitting} className={`px-4 py-1.5 rounded-full ${TAP}`} style={{ background: (globalPostText.trim() || globalPostImage) ? palette.gold : palette.border, color: (globalPostText.trim() || globalPostImage) ? palette.letterbox : palette.textFaint, fontSize: "13px", fontWeight: 800, boxShadow: (globalPostText.trim() || globalPostImage) ? `0 3px 10px ${palette.gold}40` : "none", transition: "box-shadow 0.15s ease" }}>{globalPostSubmitting ? "Posting…" : "Post"}</button>
                  </div>
                </>
              )}
            </div>
          </div>
          {!globalFeedLoaded ? (
            <div className="flex flex-col gap-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-start gap-3 p-4 rounded-2xl" style={{ background: palette.surface, border: `1px solid ${palette.border}` }}>
                  <div className="rounded-full animate-pulse flex-shrink-0" style={{ width: "40px", height: "40px", background: palette.field }} />
                  <div className="flex-1 pt-1"><div className="rounded animate-pulse mb-2" style={{ width: "30%", height: "10px", background: palette.field }} /><div className="rounded animate-pulse mb-1.5" style={{ width: "85%", height: "10px", background: palette.field }} /><div className="rounded animate-pulse" style={{ width: "55%", height: "10px", background: palette.field }} /></div>
                </div>
              ))}
            </div>
          ) : globalFeed.length === 0 ? (
            <div className="flex flex-col items-center py-16 px-4 text-center rounded-2xl" style={{ background: palette.surface, border: `1px solid ${palette.border}` }}>
              <div className="rounded-full flex items-center justify-center mb-3.5" style={{ width: "52px", height: "52px", background: `${palette.gold}1A` }}>
                <Newspaper size={22} style={{ color: palette.gold }} />
              </div>
              <div style={{ color: palette.text, fontSize: "15px", fontWeight: 800 }}>No posts yet</div>
              <div style={{ color: palette.textFaint, fontSize: "12px", marginTop: "4px" }}>Be the first trader to share something with the community.</div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {globalFeed.map((post) => {
                const mine = post.author === communityUsername;
                const comments = globalFeedComments[post.id] || [];
                return <article key={post.id} className="flex items-start gap-3 p-4 rounded-2xl transition-colors" style={{ background: palette.surface, border: `1px solid ${palette.border}` }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = palette.gold + "55"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = palette.border; }}>
                  <button type="button" onClick={() => openCommunityMemberProfile(post.author)} className={`flex-shrink-0 rounded-full ${TAP}`} style={{ background: "none", border: `1px solid ${palette.border}`, padding: 0, lineHeight: 0, overflow: "hidden" }}><Avatar name={post.author} size={40} src={post.avatar || avatarForAuthor(post.author)} /></button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <button type="button" onClick={() => openCommunityMemberProfile(post.author)} className={TAP} style={{ background: "none", border: "none", padding: 0, color: palette.text, fontSize: "14px", fontWeight: 800 }}>{post.author}</button>
                      <span style={{ color: palette.textFaint, fontSize: "12.5px" }}>· {feedTimeAgo(post.ts)}</span>
                      {mine && <button type="button" onClick={() => deleteGlobalFeedPost(post.id)} onMouseEnter={(e) => { e.currentTarget.style.background = palette.field; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }} className={`flex items-center justify-center rounded-full ml-auto flex-shrink-0 ${TAP}`} style={{ width: "26px", height: "26px", color: palette.textFaint, transition: "background 0.15s ease" }} aria-label="Delete post"><Trash2 size={13} /></button>}
                    </div>
                    {post.text && <div className="mt-1" style={{ color: palette.text, fontSize: "14.5px", lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{post.text}</div>}
                    {post.image && (
                      <button type="button" onClick={() => setLightboxPost(post)} className={`block w-full mt-3 ${TAP}`} style={{ background: "none", border: `1px solid ${palette.border}`, padding: 0, borderRadius: "14px", overflow: "hidden" }} aria-label="Open photo">
                        <img src={post.image} alt="Community post" className="w-full" style={{ maxHeight: "440px", objectFit: "cover", display: "block" }} />
                      </button>
                    )}
                    <div className="flex items-center gap-2 mt-3 -ml-2">
                      <button type="button" onClick={() => likeGlobalFeedPost(post.id)} onMouseEnter={(e) => { e.currentTarget.style.background = palette.field; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full ${TAP}`} style={{ color: post.liked ? palette.red : palette.textFaint, background: "transparent", transition: "background 0.15s ease" }}>
                        <Heart size={16} fill={post.liked ? "currentColor" : "none"} /><span style={{ fontSize: "12px", fontWeight: 700 }}>{post.likeCount || 0}</span>
                      </button>
                      <button type="button" onClick={() => openGlobalFeedComments(post.id)} onMouseEnter={(e) => { e.currentTarget.style.background = palette.field; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full ${TAP}`} style={{ color: globalFeedCommentsOpenId === post.id ? palette.gold : palette.textFaint, background: "transparent", transition: "background 0.15s ease" }}>
                        <MessageCircle size={16} /><span style={{ fontSize: "12px", fontWeight: 700 }}>{post.commentCount || 0}</span>
                      </button>
                    </div>
                    {globalFeedCommentsOpenId === post.id && <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${palette.border}` }}>
                      {globalFeedCommentsLoading[post.id] ? <div className="pb-3 text-xs" style={{ color: palette.textFaint }}>Loading comments…</div> : comments.length > 0 ? <div className="flex flex-col gap-2 pb-3">{comments.map((c) => <div key={c.id} className="rounded-2xl px-3.5 py-2.5" style={{ background: palette.field }}><span style={{ color: palette.gold, fontSize: "11.5px", fontWeight: 800 }}>{c.author}</span><span style={{ color: palette.textMuted, fontSize: "11.5px", marginLeft: "7px" }}>{c.text}</span></div>)}</div> : <div className="pb-3 text-xs" style={{ color: palette.textFaint }}>No comments yet — start the conversation.</div>}
                      <div className="flex items-center gap-2"><input value={globalFeedCommentDrafts[post.id] || ""} onChange={(e) => setGlobalFeedCommentDrafts((cur) => ({ ...cur, [post.id]: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); postGlobalFeedComment(post.id); } }} placeholder="Write a comment…" className="flex-1 rounded-full px-3.5 py-2 outline-none" style={{ background: palette.field, border: `1px solid ${palette.border}`, color: palette.text, fontSize: "12px" }} /><button type="button" onClick={() => postGlobalFeedComment(post.id)} disabled={!(globalFeedCommentDrafts[post.id] || "").trim()} className={`flex items-center justify-center rounded-full flex-shrink-0 ${TAP}`} style={{ width: "36px", height: "36px", background: palette.gold, color: palette.letterbox, opacity: (globalFeedCommentDrafts[post.id] || "").trim() ? 1 : 0.5, transition: "opacity 0.15s ease" }}><Send size={14} /></button></div>
                    </div>}
                  </div>
                </article>;
              })}
              {globalFeedNext && <div className="pt-1"><button type="button" onClick={() => loadGlobalFeed(globalFeedNext)} onMouseEnter={(e) => { e.currentTarget.style.background = palette.field; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }} className={`w-full flex items-center justify-center gap-1.5 rounded-full py-2.5 ${TAP}`} style={{ background: "transparent", border: `1px solid ${palette.border}`, color: palette.gold, fontSize: "12.5px", fontWeight: 700, transition: "background 0.15s ease" }}>Show more posts<ChevronDown size={14} /></button></div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Create a post directly on the profile (own Instagram-style grid, not a group feed post).
  const uploadProfilePostImage = async (file) => {
    if (!file) return;
    setProfilePostImageUploading(true);
    try {
      const dataUrl = await resizeImageFile(file, 800);
      setProfilePostImage(dataUrl);
    } catch (err) {
      setProfileError("Couldn't attach that image.");
    } finally {
      setProfilePostImageUploading(false);
    }
  };

  const handleProfilePostImageChange = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (file) uploadProfilePostImage(file);
  };

  const createProfilePost = async () => {
    if (!session?.token || profilePostSubmitting) return;
    if (!profilePostText.trim() && !profilePostImage) return;
    setProfilePostSubmitting(true);
    try {
      await communityApi("/profile/posts", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({ text: profilePostText.trim(), image: profilePostImage }),
      });
      setProfilePostText("");
      setProfilePostImage(null);
      setProfileComposerOpen(false);
      const enc = encodeURIComponent(communityUsername);
      const data = await communityApi(`/profile/${enc}/posts`, {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      setProfilePosts(data.posts || []);
      setProfilePostsNext(data.nextCursor || null);
      setProfileData((cur) => (cur ? { ...cur, postCount: (cur.postCount || 0) + 1 } : cur));
    } catch (err) {
      setProfileError(err.message || "Couldn't share that.");
    } finally {
      setProfilePostSubmitting(false);
    }
  };

  // Instagram-style like: tap once to like, tap again to unlike.
  const likeProfilePost = async (postId) => {
    if (!session?.token) return;
    const current = profilePosts.find((p) => p.id === postId) || (profilePostOpen && profilePostOpen.id === postId ? profilePostOpen : null);
    if (!current) return;
    const wasLiked = !!current.liked;
    const shift = (liked, delta) => (p) => ({ ...p, liked, likeCount: Math.max(0, (p.likeCount || 0) + delta) });
    const apply = shift(!wasLiked, wasLiked ? -1 : 1);
    const revert = shift(wasLiked, wasLiked ? 1 : -1);
    setProfilePosts((cur) => cur.map((p) => (p.id === postId ? apply(p) : p)));
    setProfilePostOpen((cur) => (cur && cur.id === postId ? apply(cur) : cur));
    try {
      await communityApi(`/profile/posts/${postId}/like`, {
        method: wasLiked ? "DELETE" : "POST",
        headers: { Authorization: `Bearer ${session.token}` },
      });
    } catch (err) {
      setProfilePosts((cur) => cur.map((p) => (p.id === postId ? revert(p) : p)));
      setProfilePostOpen((cur) => (cur && cur.id === postId ? revert(cur) : cur));
    }
  };

  const bumpProfileCommentCount = (postId, delta) => {
    const f = (p) => ({ ...p, commentCount: Math.max(0, (p.commentCount || 0) + delta) });
    setProfilePosts((cur) => cur.map((p) => (p.id === postId ? f(p) : p)));
    setProfilePostOpen((cur) => (cur && cur.id === postId ? f(cur) : cur));
  };

  const postProfileComment = async () => {
    const po = profilePostOpen;
    const text = profileCommentDraft.trim();
    if (!session?.token || !po || !text || profileCommentSending) return;
    setProfileCommentSending(true);
    try {
      const res = await communityApi(`/profile/posts/${po.id}/comments`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({ text }),
      });
      setProfileCommentDraft("");
      setProfileError("");
      setProfileComments((cur) => [...cur, { id: res.id, author: communityUsername, text, ts: res.ts || Date.now() }]);
      bumpProfileCommentCount(po.id, 1);
    } catch (err) {
      setProfileError(err.message || "Couldn't post that comment.");
    } finally {
      setProfileCommentSending(false);
    }
  };

  const deleteProfileComment = async (commentId) => {
    const po = profilePostOpen;
    if (!session?.token || !po) return;
    try {
      await communityApi(`/profile/posts/${po.id}/comments/${commentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.token}` },
      });
      setProfileComments((cur) => cur.filter((c) => c.id !== commentId));
      bumpProfileCommentCount(po.id, -1);
    } catch (err) {
      setProfileError(err.message || "Couldn't delete that comment.");
    }
  };

  const deleteProfilePost = async (postId) => {
    if (!session?.token) return;
    if (typeof window !== "undefined" && !window.confirm("Delete this post?")) return;
    try {
      await communityApi(`/profile/posts/${postId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.token}` },
      });
      setProfilePosts((cur) => cur.filter((p) => p.id !== postId));
      setProfilePostOpen(null);
      setProfileData((cur) => (cur ? { ...cur, postCount: Math.max(0, (cur.postCount || 1) - 1) } : cur));
    } catch (err) {
      setProfileError(err.message || "Couldn't delete that post.");
    }
  };

  const loadMoreProfilePosts = async () => {
    if (!profileData || !profilePostsNext || !session?.token) return;
    try {
      const data = await communityApi(`/profile/${encodeURIComponent(profileData.username)}/posts?before=${profilePostsNext}`, {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      setProfilePosts((cur) => [...cur, ...(data.posts || [])]);
      setProfilePostsNext(data.nextCursor || null);
    } catch (err) {
      setProfileError(err.message);
    }
  };

  const openFollowList = async (username, kind) => {
    const reqId = ++followListReqRef.current;
    setFollowListOpen({ username, kind });
    setFollowListData([]);
    setFollowListQuery("");
    if (!session?.token) return;
    setFollowListLoading(true);
    try {
      const data = await communityApi(`/follow-list/${encodeURIComponent(username)}?kind=${kind}`, {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      if (followListReqRef.current !== reqId) return;   // user switched tabs — drop the stale reply
      setFollowListData(data[kind] || []);
    } catch (err) {
      if (followListReqRef.current === reqId) setCommunityApiError(err.message);
    } finally {
      if (followListReqRef.current === reqId) setFollowListLoading(false);
    }
  };

  const defaultBalanceInputRef = useRef(null);
  const defaultBalanceDebounceRef = useRef(null);

  const applyDefaultAccountBalance = (value) => {
    persistSettings({ ...settings, defaultAccountBalance: value });
    if (!value) return;
    setEdge((e) => (e.accountBalance === "" ? { ...e, accountBalance: value } : e));
    setCs((c) => (c.startBal === "" ? { ...c, startBal: value } : c));
    setPs((p) => (p.balance === "" ? { ...p, balance: value } : p));
    if (startingBalance === "") persistStartingBalance(value);
  };

  const scheduleDefaultBalanceApply = () => {
    if (defaultBalanceDebounceRef.current) clearTimeout(defaultBalanceDebounceRef.current);
    defaultBalanceDebounceRef.current = setTimeout(() => {
      const el = defaultBalanceInputRef.current;
      if (el) applyDefaultAccountBalance(el.value);
    }, 900);
  };

  const persistAccounts = async (next) => {
    setAccounts(next);
    try {
      await window.storage.set(ACCOUNTS_LIST_KEY, JSON.stringify(next), false);
    } catch (err) {
      // non-critical, fail silently
    }
  };

  const persistActiveAccountId = async (id) => {
    setActiveAccountId(id);
    try {
      await window.storage.set(ACCOUNTS_ACTIVE_KEY, id, false);
    } catch (err) {
      // non-critical, fail silently
    }
  };

const switchAccount = (id) => {
  if (id !== activeAccountId) {
    setAccountDataLoaded(false);
    setLinkedFirm(null);
    setActiveNoteId(null); // add this
    persistActiveAccountId(id);
  }
};

  const confirmAddAccount = () => {
    const name = newAccountName.trim();
    if (!name) return;
    if (name.length > 40) {
      setAccountNameError("Keep it under 40 characters.");
      return;
    }
    const id = `acc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const next = [...accounts, { id, name, createdAt: Date.now(), archived: false }];
    persistAccounts(next);
    persistActiveAccountId(id);
    setAddingAccount(false);
    setNewAccountName("");
    setAccountNameError("");
  };

  const confirmRenameAccount = () => {
    const name = editAccountName.trim();
    if (!name || !editingAccountId) {
      setEditingAccountId(null);
      return;
    }
    persistAccounts(accounts.map((a) => (a.id === editingAccountId ? { ...a, name } : a)));
    setEditingAccountId(null);
  };

  const confirmDeleteAccount = () => {
    if (!pendingAccountDelete) return;
    const remaining = accounts.filter((a) => a.id !== pendingAccountDelete);
    if (remaining.length === 0) {
      setPendingAccountDelete(null);
      return;
    }
    persistAccounts(remaining);
    if (activeAccountId === pendingAccountDelete) {
      persistActiveAccountId(remaining[0].id);
    }
    setPendingAccountDelete(null);
  };

const selectInsightsSubTab = (id) => {
    setInsightsSubTab(id);
    persistSettings({ ...settings, defaultInsightsTab: id });
  };

  const toggleHiddenTab = (tabId) => {
    const current = settings.hiddenTabs || [];
    const isHidden = current.includes(tabId);
    let next;
    if (isHidden) {
      next = current.filter((id) => id !== tabId);
    } else {
      if (current.length >= TABS.length - 1) return; // never hide the last visible tab
      next = [...current, tabId];
    }
    persistSettings({ ...settings, hiddenTabs: next });
  };

  const togglePinnedMobileTab = (tabId) => {
    const current = settings.mobileNavPinnedTabs || [];
    const isPinned = current.includes(tabId);
    let next;
    if (isPinned) {
      next = current.filter((id) => id !== tabId);
    } else {
      if (current.length >= MOBILE_NAV_PRIMARY_COUNT) return; // bar only fits this many + More
      next = [...current, tabId];
    }
    persistSettings({ ...settings, mobileNavPinnedTabs: next });
  };

  const removeDefaultSetup = (id) => {
    if (hiddenDefaultSetupIds.includes(id)) return;
    persistHiddenDefaultSetups([...hiddenDefaultSetupIds, id]);
    if (tradeSetup === id) setTradeSetup(null);
  };

  const restoreDefaultSetups = () => {
    persistHiddenDefaultSetups([]);
  };

  const findSetupLabel = (id) => setupMeta(id)?.label || customSetups.find((s) => s.id === id)?.label || id;

    const findMoodMeta = (id) => emotionMeta(id) || customMoods.find((m) => m.id === id);

  const openAddMood = () => {
    setMoodError("");
    setNewMoodName("");
    setNewMoodEmoji("🙂");
    setAddingMood(true);
  };

  const cancelAddMood = () => {
    setAddingMood(false);
    setNewMoodName("");
    setMoodError("");
  };

  const confirmAddMood = () => {
    const name = newMoodName.trim();
    if (!name) return;
    if (name.length > 16) {
      setMoodError("Keep it under 16 characters.");
      return;
    }
    const allLabels = [...EMOTIONS, ...customMoods].map((m) => m.label.toLowerCase());
    if (allLabels.includes(name.toLowerCase())) {
      setMoodError("That mood already exists.");
      return;
    }
    if (customMoods.length >= MAX_CUSTOM_MOODS) {
      setMoodError(`You can add up to ${MAX_CUSTOM_MOODS} custom moods.`);
      return;
    }
    const id = `custom-mood-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const next = [...customMoods, { id, label: name, emoji: newMoodEmoji || "🙂" }];
    persistCustomMoods(next);
    setAddingMood(false);
    setNewMoodName("");
    setMoodError("");
  };

  const removeCustomMood = (id) => {
    persistCustomMoods(customMoods.filter((m) => m.id !== id));
    if (tradeEmotion === id) setTradeEmotion(null);
  };

  const persistJournalEntries = async (next) => {
    setJournalEntries(next);
    if (!activeAccountId) return;
    try {
      await window.storage.set(scopedKey(JOURNAL_STORAGE_KEY, activeAccountId), JSON.stringify(next), false);
    } catch (err) {
      // non-critical, fail silently
    }
  };
const ensureJournalRowForDate = (dateKey, setupId) => {
    const exists = journalEntries.some((r) => r.date === dateKey);
    if (exists) return; // never overwrite a day you've already journaled
    const id = `j-auto-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    persistJournalEntries([
      ...journalEntries,
     { id, date: dateKey, pair: "", trend: "", rr: "", pnl: "", setup: setupId || "", outcome: "", mistake: "", note: "" },
    ]);
  };

const outcomeFromPnl = (pnl) => (pnl > 0 ? "win" : pnl < 0 ? "loss" : "breakeven");

const syncTradeToJournal = (trade) => {
  const alreadySynced = journalEntries.some((r) => r.sourceTradeId === trade.id);
  if (alreadySynced) return;
  const newRow = {
    id: `j-sync-${trade.id}`,
    date: dayKeyFromTs(trade.ts),
    pair: trade.pair || "",
    trend: "",
    rr: "",
    pnl: String(trade.pnl),
    setup: trade.setup || "",
    outcome: outcomeFromPnl(trade.pnl),
    session: "",
    mood: trade.emotion || "",
    confidence: "",
    mistake: "",
    note: trade.note || "",
    sourceTradeId: trade.id,
  };
  persistJournalEntries([...journalEntries, newRow]);
};

const updateSyncedJournalRow = (trade) => {
  persistJournalEntries(
    journalEntries.map((r) =>
      r.sourceTradeId === trade.id
        ? {
            ...r,
            pair: trade.pair || "",
            pnl: String(trade.pnl),
            setup: trade.setup || "",
            outcome: outcomeFromPnl(trade.pnl),
            mood: trade.emotion || "",
            note: trade.note || "",
          }
        : r
    )
  );
};

  const persistJournalColWidths = async (next) => {
    try {
      await window.storage.set(JOURNAL_COLS_STORAGE_KEY, JSON.stringify(next), false);
    } catch (err) {
      // non-critical, fail silently
    }
  };

  const updateJournalField = (id, field, value, dateForRow) => {
    const exists = journalEntries.some((r) => r.id === id);
    if (exists) {
      persistJournalEntries(journalEntries.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
      return;
    }
    const newRow = { id, date: dateForRow, pair: "", trend: "", rr: "", setup: "", mistake: "", note: "", [field]: value };
    persistJournalEntries([...journalEntries, newRow]);
  };

  const updateJournalPnl = (id, value, dateForRow) => {
    const n = parseFloat(value);
    const patch = { pnl: value };
    if (value !== "" && Number.isFinite(n) && n !== 0) {
      patch.outcome = n > 0 ? "win" : "loss";
    }
    const exists = journalEntries.some((r) => r.id === id);
    if (exists) {
      persistJournalEntries(journalEntries.map((r) => (r.id === id ? { ...r, ...patch } : r)));
      return;
    }
    const newRow = {
      id,
      date: dateForRow,
      pair: "",
      trend: "",
      rr: "",
      setup: "",
      outcome: "",
      mistake: "",
      note: "",
      ...patch,
    };
    persistJournalEntries([...journalEntries, newRow]);
  };

  const addJournalRow = (defaultDate) => {
    const id = `j-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const date = defaultDate || dayKeyFromDate(new Date());
    persistJournalEntries([
      ...journalEntries,
      { id, date, pair: "", trend: "", rr: "", pnl: "", setup: "", outcome: "", mistake: "", note: "" },
    ]);
    setJournalFocusRowId(id);
  };

    const deleteJournalRow = (id) => {
    persistJournalEntries(journalEntries.filter((r) => r.id !== id));
  };

  const toggleJournalRowExpanded = (id) => {
    setJournalExpandedRows((cur) => ({ ...cur, [id]: !cur[id] }));
  };

  const startJournalResize = (col) => (e) => {
    e.stopPropagation();
    journalResizeRef.current = { col, startX: e.clientX, startWidth: journalColWidths[col] };
    if (e.target.setPointerCapture) {
      try {
        e.target.setPointerCapture(e.pointerId);
      } catch (err) {
        // ignore \u2014 dragging still works without capture on most browsers
      }
    }
  };

  const openJournalPhotoPicker = (rowId) => {
    setJournalPhotoError("");
    setJournalPhotoTarget(rowId);
    if (journalPhotoInputRef.current) journalPhotoInputRef.current.click();
  };

  const handleJournalPhotoChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    const targetId = journalPhotoTarget;
    setJournalPhotoTarget(null);
    if (!file || !targetId) return;
    setJournalPhotoError("");
    setJournalPhotoSaving(true);
    try {
      const dataUrl = await resizeImageFile(file);
      persistJournalEntries(
        journalEntries.map((r) => {
          if (r.id !== targetId) return r;
          const existing = Array.isArray(r.photos) ? r.photos : [];
          if (existing.length >= MAX_JOURNAL_PHOTOS_PER_ROW) return r;
          return { ...r, photos: [...existing, dataUrl] };
        })
      );
    } catch (err) {
      setJournalPhotoError("Couldn't attach that image, please try again.");
    } finally {
      setJournalPhotoSaving(false);
    }
  };

  const removeJournalPhoto = (rowId, index) => {
    persistJournalEntries(
      journalEntries.map((r) => {
        if (r.id !== rowId) return r;
        return { ...r, photos: (r.photos || []).filter((_, i) => i !== index) };
      })
    );
  };

  const moveJournalResize = (e) => {
    if (!journalResizeRef.current) return;
    const { col, startX, startWidth } = journalResizeRef.current;
    const delta = e.clientX - startX;
    const next = Math.max(JOURNAL_COL_MIN, Math.min(JOURNAL_COL_MAX, startWidth + delta));
    setJournalColWidths((w) => ({ ...w, [col]: next }));
  };

  const endJournalResize = () => {
    if (!journalResizeRef.current) return;
    journalResizeRef.current = null;
    persistJournalColWidths(journalColWidths);
  };

  const focusJournalCell = (rowId, colId) => {
    const el = journalCellRefs.current[`${rowId}:${colId}`];
    if (el && typeof el.focus === "function") el.focus();
  };

  useEffect(() => {
    if (!journalFocusRowId) return;
    const el = journalCellRefs.current[`${journalFocusRowId}:pair`];
    if (el) {
      el.focus();
      setJournalFocusRowId(null);
    }
  }, [journalEntries, journalFocusRowId]);

  useEffect(() => {
    if (!notepadFocusBlock || !activeNoteId) return;
    const el = notepadBlockRefs.current[`${activeNoteId}:${notepadFocusBlock.blockId}`];
    if (el) {
      autoGrowBlock(el);
      el.focus();
      const pos = notepadFocusBlock.pos ?? el.value.length;
      try {
        el.setSelectionRange(pos, pos);
      } catch (err) {
        // ignore \u2014 focus still landed even if selection couldn't be set
      }
      setNotepadFocusBlock(null);
    }
  }, [notepadNotes, notepadFocusBlock, activeNoteId]);

  // ---------- FIRST-LAUNCH GATE: sign up / log in before anything else ----------
  if (!sessionLoaded || !onboardingSeenLoaded) {
    return (
      <div
        className="w-full flex items-center justify-center"
        style={{ background: palette.letterbox, height: "100dvh" }}
      >
        <img
          src={TREDZI_LOGO_SRC}
          alt="Tredzi"
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "16px",
            boxShadow: `0 8px 24px ${palette.gold}44`,
          }}
        />
      </div>
    );
  }

  if (!session) {
    if (!onboardingSeen) {
      // ---------- ONBOARDING CAROUSEL (swipeable) ----------
      const totalSlides = ONBOARDING_SLIDES.length + 1; // +1 for the closing "Get Started" slide
      const isLastSlide = onboardingIndex === ONBOARDING_SLIDES.length;
      return (
        <div
          className="w-full flex flex-col"
          style={{ background: palette.letterbox, height: "100dvh", position: "relative", overflow: "hidden" }}
        >
          <OnboardingAmbientBG />
          <div className="flex justify-end p-4" style={{ minHeight: "44px", position: "relative", zIndex: 1 }}>
            {!isLastSlide && (
              <button
                type="button"
                onClick={() => setOnboardingIndex(ONBOARDING_SLIDES.length)}
                className={TAP}
                style={{ color: palette.textFaint, fontFamily: mono, fontSize: "12.5px", background: "transparent" }}
              >
                Skip
              </button>
            )}
          </div>

          {!isLastSlide && (
            <button
              type="button"
              onClick={() => setOnboardingIndex((i) => clampOnboardingIndex(i + 1))}
              aria-label="Next"
              className={TAP}
              style={{
                position: "absolute",
                right: "18px",
                top: "50%",
                transform: "translateY(-50%)",
                zIndex: 2,
                width: "40px",
                height: "40px",
                borderRadius: "999px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: palette.field,
                border: `1px solid ${palette.border}`,
                color: palette.text,
              }}
            >
              <ChevronRight size={20} />
            </button>
          )}

          <div
            className="flex-1 overflow-hidden select-none"
            style={{ touchAction: "pan-y", cursor: onboardingDragging ? "grabbing" : "grab", position: "relative", zIndex: 1 }}
            onTouchStart={(e) => onboardingDragStart(e.touches[0].clientX)}
            onTouchMove={(e) => onboardingDragMove(e.touches[0].clientX)}
            onTouchEnd={onboardingDragEnd}
            onMouseDown={(e) => onboardingDragStart(e.clientX)}
          >
            <div
              className="flex h-full"
              style={{
                width: `${totalSlides * 100}%`,
                transform: `translateX(calc(${-onboardingIndex * (100 / totalSlides)}% + ${onboardingDragX}px))`,
                transition: onboardingDragging ? "none" : "transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            >
              {ONBOARDING_SLIDES.map((slide, i) => {
                const Icon = slide.icon;
                return (
                  <div
                    key={i}
                    className="flex flex-col items-center justify-center text-center px-8"
                    style={{ width: `${100 / totalSlides}%`, flexShrink: 0 }}
                  >
                    <div
                      className="flex items-center justify-center mb-6"
                      style={{
                        width: "88px",
                        height: "88px",
                        borderRadius: "24px",
                        background: palette.gold,
                        boxShadow: `0 10px 28px ${palette.gold}44`,
                      }}
                    >
                      <Icon size={40} color={palette.letterbox} strokeWidth={2} />
                    </div>
                    <div
                      style={{
                        fontFamily: display,
                        fontSize: "22px",
                        fontWeight: 800,
                        color: palette.text,
                        marginBottom: "10px",
                      }}
                    >
                      {slide.title}
                    </div>
                    <p className="text-sm" style={{ color: palette.textMuted, maxWidth: "280px", lineHeight: 1.5 }}>
                      {slide.desc}
                    </p>
                  </div>
                );
              })}

              <div
                className="flex flex-col items-center justify-center text-center px-8"
                style={{ width: `${100 / totalSlides}%`, flexShrink: 0 }}
              >
                <img
                  src={TREDZI_LOGO_SRC}
                  alt="Tredzi"
                  className="mb-5"
                  style={{
                    width: "88px",
                    height: "88px",
                    borderRadius: "24px",
                    boxShadow: `0 10px 28px ${palette.gold}55`,
                  }}
                />
                <div
                  style={{
                    fontFamily: display,
                    fontSize: "26px",
                    fontWeight: 800,
                    color: palette.text,
                    marginBottom: "8px",
                  }}
                >
                  Tredzi
                </div>
                <p className="text-sm mb-8" style={{ color: palette.textMuted, maxWidth: "280px", lineHeight: 1.5 }}>
                  Your trading journal, risk tools, and trader community, all in one place.
                </p>
                <button
                  type="button"
                  onClick={persistOnboardingSeen}
                  className={`rounded-2xl px-10 py-3.5 ${TAP}`}
                  style={{
                    background: palette.gold,
                    color: palette.letterbox,
                    fontFamily: mono,
                    fontSize: "14.5px",
                    fontWeight: 700,
                    boxShadow: `0 6px 18px ${palette.gold}44`,
                  }}
                >
                  Get Started
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 pb-8 pt-2" style={{ position: "relative", zIndex: 1 }}>
            {Array.from({ length: totalSlides }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setOnboardingIndex(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={TAP}
                style={{
                  width: i === onboardingIndex ? "22px" : "7px",
                  height: "7px",
                  borderRadius: "999px",
                  background: i === onboardingIndex ? palette.gold : palette.border,
                  transition: "width 0.25s ease, background 0.25s ease",
                  border: "none",
                  padding: 0,
                }}
              />
            ))}
          </div>
        </div>
      );
    }

    // ---------- LOGIN / SIGNUP ----------
    return (
      <div
        className="w-full flex items-center justify-center"
        style={{ background: palette.letterbox, height: "100dvh", padding: "24px" }}
      >
        <div
          className="w-full modal-in"
          style={{
            maxWidth: "380px",
            background: palette.surface,
            border: `1px solid ${palette.border}`,
            borderRadius: "28px",
            boxShadow: palette.shadow,
            padding: "36px 28px 28px",
          }}
        >
          <div className="flex flex-col items-center text-center mb-7">
            <img
              src={TREDZI_LOGO_SRC}
              alt="Tredzi"
              className="mb-4"
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "18px",
                boxShadow: `0 8px 24px ${palette.gold}55`,
              }}
            />
            <div
              style={{
                fontFamily: display,
                fontSize: "26px",
                fontWeight: 800,
                color: palette.text,
                letterSpacing: "-0.01em",
              }}
            >
              Tredzi
            </div>
            <p className="text-sm mt-1.5" style={{ color: palette.textMuted, maxWidth: "260px" }}>
              Your trading journal, risk tools, and trader community, all in one place.
            </p>
          </div>

          {authScreenStep === "choice" ? (
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => { setAuthMode("signup"); setAuthScreenStep("form"); setAuthError(""); }}
                className={`w-full rounded-2xl py-3.5 ${TAP}`}
                style={{
                  background: palette.gold,
                  color: palette.letterbox,
                  fontFamily: mono,
                  fontSize: "14.5px",
                  fontWeight: 700,
                  boxShadow: `0 6px 18px ${palette.gold}44`,
                }}
              >
                Create Account
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode("login"); setAuthScreenStep("form"); setAuthError(""); }}
                className={`w-full rounded-2xl py-3.5 ${TAP}`}
                style={{
                  background: "transparent",
                  border: `1px solid ${palette.border}`,
                  color: palette.text,
                  fontFamily: mono,
                  fontSize: "14.5px",
                  fontWeight: 700,
                }}
              >
                Log In
              </button>
              <p className="text-xs text-center mt-2" style={{ color: palette.textFaint }}>
                Free to join, no card required.
              </p>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  if (authForgotStep === "reset") setAuthForgotStep("request");
                  else if (authForgotStep === "request") resetForgotFlow();
                  else setAuthScreenStep("choice");
                  setAuthError("");
                  setAuthInfo("");
                }}
                className={`flex items-center gap-1 mb-4 ${TAP}`}
                style={{ color: palette.textFaint, fontFamily: mono, fontSize: "12px", background: "transparent" }}
              >
                <ChevronLeft size={14} /> Back
              </button>

              {authForgotStep ? (
                <>
                  <div style={{ fontFamily: display, fontSize: "17px", fontWeight: 700, color: palette.text, marginBottom: "6px" }}>
                    {authForgotStep === "request" ? "Reset your password" : "Check your email"}
                  </div>
                  <p className="text-xs mb-4" style={{ color: palette.textMuted, lineHeight: 1.5 }}>
                    {authForgotStep === "request"
                      ? "Enter the email you signed up with and we will send you a 6-digit code."
                      : `Enter the 6-digit code sent to ${authEmail.trim().toLowerCase()} and choose a new password.`}
                  </p>

                  {authForgotStep === "request" ? (
                    <>
                      <span className="block mb-1.5 uppercase" style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}>
                        Email
                      </span>
                      <input
                        type="email"
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleForgotRequest(); }}
                        placeholder="you@example.com"
                        autoComplete="email"
                        autoFocus
                        className="w-full rounded-2xl px-4 py-3.5 mb-3 bg-transparent outline-none"
                        style={{ background: palette.field, border: `1px solid ${palette.border}`, color: palette.text, fontFamily: mono, fontSize: "15px" }}
                      />
                      {authError && <p className="text-xs mb-3" style={{ color: palette.red }}>{authError}</p>}
                      <button
                        type="button"
                        onClick={handleForgotRequest}
                        disabled={authBusy || !authEmail.trim()}
                        className={`w-full rounded-2xl py-3.5 ${TAP}`}
                        style={{
                      background: palette.gold,
                      color: palette.letterbox,
                      fontFamily: mono,
                      fontSize: "14px",
                      fontWeight: 700,
                      boxShadow: `0 6px 18px ${palette.gold}44`,
                      opacity: authBusy ? 0.6 : 1,
                    }}
                      >
                        {authBusy ? "Sending…" : "Send code"}
                      </button>
                    </>
                  ) : (
                    <>
                      {authInfo && <p className="text-xs mb-3" style={{ color: palette.green, lineHeight: 1.5 }}>{authInfo}</p>}
                      <span className="block mb-1.5 uppercase" style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}>
                        6-digit code
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={authResetCode}
                        onChange={(e) => setAuthResetCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="123456"
                        autoFocus
                        className="w-full rounded-2xl px-4 py-3.5 mb-3 bg-transparent outline-none text-center"
                        style={{ background: palette.field, border: `1px solid ${palette.border}`, color: palette.text, fontFamily: mono, fontSize: "20px", letterSpacing: "0.4em", fontWeight: 700 }}
                      />
                      <span className="block mb-1.5 uppercase" style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}>
                        New password
                      </span>
                      <input
                        type="password"
                        autoComplete="new-password"
                        value={authNewPassword}
                        onChange={(e) => setAuthNewPassword(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleResetSubmit(); }}
                        placeholder="At least 8 characters"
                        className="w-full rounded-2xl px-4 py-3.5 mb-3 bg-transparent outline-none"
                        style={{ background: palette.field, border: `1px solid ${palette.border}`, color: palette.text, fontFamily: mono, fontSize: "15px" }}
                      />
                      {authError && <p className="text-xs mb-3" style={{ color: palette.red }}>{authError}</p>}
                      <button
                        type="button"
                        onClick={handleResetSubmit}
                        disabled={authBusy || authResetCode.length !== 6 || !authNewPassword}
                        className={`w-full rounded-2xl py-3.5 ${TAP}`}
                        style={{
                      background: palette.gold,
                      color: palette.letterbox,
                      fontFamily: mono,
                      fontSize: "14px",
                      fontWeight: 700,
                      boxShadow: `0 6px 18px ${palette.gold}44`,
                      opacity: authBusy ? 0.6 : 1,
                    }}
                      >
                        {authBusy ? "Please wait…" : "Reset password"}
                      </button>
                      <button
                        type="button"
                        onClick={handleForgotRequest}
                        disabled={authBusy || authResendIn > 0}
                        className={`w-full mt-3 ${TAP}`}
                        style={{ color: palette.textFaint, fontFamily: mono, fontSize: "12.5px", textDecoration: "underline", background: "transparent", opacity: authResendIn > 0 ? 0.6 : 1 }}
                      >
                        {authResendIn > 0 ? `Resend code in ${authResendIn}s` : "Resend code"}
                      </button>
                    </>
                  )}
                </>
              ) : (
              <>
              <div
                style={{
                  fontFamily: display,
                  fontSize: "17px",
                  fontWeight: 700,
                  color: palette.text,
                  marginBottom: "14px",
                }}
              >
                {authMode === "signup" ? "Create your account" : "Welcome back"}
              </div>
              {authInfo && <p className="text-xs mb-3" style={{ color: palette.green, lineHeight: 1.5 }}>{authInfo}</p>}

              <span className="block mb-1.5 uppercase" style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}>
                Email
              </span>
              <input
                type="email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="you@example.com"
                autoFocus
                className="w-full rounded-2xl px-4 py-3.5 mb-3 bg-transparent outline-none"
                style={{ background: palette.field, border: `1px solid ${palette.border}`, color: palette.text, fontFamily: mono, fontSize: "15px" }}
              />

              <span className="block mb-1.5 uppercase" style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}>
                Password
              </span>
              <input
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAuthSubmit(); }}
                placeholder="At least 8 characters"
                autoComplete={authMode === "signup" ? "new-password" : "current-password"}
                className="w-full rounded-2xl px-4 py-3.5 mb-3 bg-transparent outline-none"
                style={{ background: palette.field, border: `1px solid ${palette.border}`, color: palette.text, fontFamily: mono, fontSize: "15px" }}
              />

              {authMode === "login" && (
                <div className="flex justify-end mb-3" style={{ marginTop: "-4px" }}>
                  <button
                    type="button"
                    onClick={() => { setAuthForgotStep("request"); setAuthError(""); setAuthInfo(""); }}
                    className={TAP}
                    style={{ color: palette.goldBright, fontFamily: mono, fontSize: "12.5px", fontWeight: 600, background: "transparent" }}
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {authError && (
                <p className="text-xs mb-3" style={{ color: palette.red }}>{authError}</p>
              )}

              <button
                type="button"
                onClick={handleAuthSubmit}
                disabled={authBusy || !authEmail.trim() || !authPassword}
                className={`w-full rounded-2xl py-3.5 ${TAP}`}
                style={{
                  background: palette.gold,
                  color: palette.letterbox,
                  fontFamily: mono,
                  fontSize: "14px",
                  fontWeight: 700,
                  boxShadow: `0 6px 18px ${palette.gold}44`,
                  opacity: authBusy ? 0.6 : 1,
                }}
              >
                {authBusy ? "Please wait…" : authMode === "signup" ? "Sign Up" : "Log In"}
              </button>

              <button
                type="button"
                onClick={() => { setAuthMode(authMode === "login" ? "signup" : "login"); setAuthError(""); setAuthInfo(""); }}
                className={`w-full mt-3 ${TAP}`}
                style={{ color: palette.textFaint, fontFamily: mono, fontSize: "12.5px", textDecoration: "underline", background: "transparent" }}
              >
                {authMode === "login" ? "Need an account? Sign up" : "Already have an account? Log in"}
              </button>
              </>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  const handleJournalCellKeyDown = (e, rowIdx, colIdx, rows) => {
    if (!e.altKey) return;
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
    e.preventDefault();
    let nextRowIdx = rowIdx;
    let nextColIdx = colIdx;
    if (e.key === "ArrowLeft") nextColIdx = Math.max(0, colIdx - 1);
    if (e.key === "ArrowRight") nextColIdx = Math.min(JOURNAL_COLUMNS.length - 1, colIdx + 1);
    if (e.key === "ArrowUp") nextRowIdx = Math.max(0, rowIdx - 1);
    if (e.key === "ArrowDown") nextRowIdx = Math.min(rows.length - 1, rowIdx + 1);
    const nextRow = rows[nextRowIdx];
    const nextCol = JOURNAL_COLUMNS[nextColIdx];
    if (nextRow && nextCol) focusJournalCell(nextRow.id, nextCol.id);
  };

  const exportJournalCSV = () => {
    setJournalExportMsg("");
    if (journalMonth === null) return;
    const monthPrefix = `${journalYear}-${pad2(journalMonth + 1)}`;
    const rows = journalEntries
      .filter((r) => r.date && r.date.startsWith(monthPrefix))
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

    if (rows.length === 0) {
      setJournalExportMsg("No entries this month yet, nothing to download.");
      return;
    }

    const escapeCsv = (val) => {
      const s = String(val ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const header = ["Date", "Pair", "Trend", "R:R", "PnL", "Setup", "Outcome", "Session", "Mood", "Confidence", "Mistake", "Note"];
    const lines = [header.join(",")];
    rows.forEach((r) => {
      const trendLabel = TREND_OPTIONS.find((t) => t.id === r.trend)?.label || r.trend || "";
      const setupLabel = r.setup ? findSetupLabel(r.setup) : "";
      lines.push(
        [
          r.date || "",
          r.pair || "",
          trendLabel,
          r.rr || "",
          r.pnl || "",
          setupLabel,
          outcomeLabel(r.outcome),
          sessionLabelFor(r.session),
          r.mood ? findMoodMeta(r.mood)?.label || "" : "",
          confidenceLabel(r.confidence),
          r.mistake || "",
          r.note || "",
        ]
          .map(escapeCsv)
          .join(",")
      );
    });

    try {
      const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tredzi-journal-${monthPrefix}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      setJournalExportMsg("Downloaded.");
    } catch (err) {
      setJournalExportMsg("Couldn't create the file, please try again.");
    }
  };

  const parseJournalCSV = (text) => {
    const rows = [];
    let field = "";
    let row = [];
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          field += c;
        }
      } else if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        row.push(field);
        field = "";
      } else if (c === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else if (c === "\r") {
        // skip
      } else {
        field += c;
      }
    }
    if (field.length > 0 || row.length > 0) {
      row.push(field);
      rows.push(row);
    }
    return rows.filter((r) => r.some((v) => v && v.trim() !== ""));
  };

  const findTrendIdByLabel = (label) => {
    const l = (label || "").trim().toLowerCase();
    const found = TREND_OPTIONS.find((t) => t.label.toLowerCase() === l);
    return found ? found.id : "";
  };

    const findSetupIdByLabel = (label) => {
    const l = (label || "").trim().toLowerCase();
    if (!l) return "";
    const built = SETUPS.find((s) => s.label.toLowerCase() === l);
    if (built) return built.id;
    const custom = customSetups.find((s) => s.label.toLowerCase() === l);
    return custom ? custom.id : "";
  };

  const findOutcomeIdByLabel = (label) => {
    const l = (label || "").trim().toLowerCase();
    const found = OUTCOME_OPTIONS.find((o) => o.label.toLowerCase() === l);
    return found ? found.id : "";
  };
  const findSessionIdByLabel = (label) => {
    const l = (label || "").trim().toLowerCase();
    const found = MARKET_SESSIONS.find((s) => s.label.toLowerCase() === l);
    return found ? found.id : "";
  };
  const findMoodIdByLabel = (label) => {
    const l = (label || "").trim().toLowerCase();
    const found = EMOTIONS.find((e) => e.label.toLowerCase() === l);
    return found ? found.id : "";
  };
  const findConfidenceIdByLabel = (label) => {
    const l = (label || "").trim().toLowerCase();
    const found = CONFIDENCE_OPTIONS.find((c) => c.label.toLowerCase() === l);
    return found ? found.id : "";
  };

  const triggerJournalImport = () => {
    setJournalImportMsg("");
    if (journalImportInputRef.current) journalImportInputRef.current.click();
  };

  const importJournalCSV = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setJournalImportMsg("");
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const rows = parseJournalCSV(String(reader.result));
        if (rows.length < 2) {
          setJournalImportMsg("That file doesn't look like a Tredzi journal export.");
          return;
        }
                const header = rows[0].map((h) => h.trim().toLowerCase());
        const idx = {
          date: header.indexOf("date"),
          pair: header.indexOf("pair"),
          trend: header.indexOf("trend"),
          rr: header.indexOf("r:r"),
          pnl: header.indexOf("pnl"),
          setup: header.indexOf("setup"),
          outcome: header.indexOf("outcome"),
          session: header.indexOf("session"),
          mood: header.indexOf("mood"),
          confidence: header.indexOf("confidence"),
          mistake: header.indexOf("mistake"),
          note: header.indexOf("note"),
        };
        if (idx.date === -1) {
          setJournalImportMsg("That file doesn't look like a Tredzi journal export.");
          return;
        }
        const newEntries = rows
          .slice(1)
          .map((r, i) => ({
            id: `j-import-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
            date: (r[idx.date] || "").trim(),
            pair: idx.pair !== -1 ? (r[idx.pair] || "").trim() : "",
            trend: idx.trend !== -1 ? findTrendIdByLabel(r[idx.trend]) : "",
            rr: idx.rr !== -1 ? (r[idx.rr] || "").trim() : "",
            pnl: idx.pnl !== -1 ? (r[idx.pnl] || "").trim() : "",
            setup: idx.setup !== -1 ? findSetupIdByLabel(r[idx.setup]) : "",            
            outcome: idx.outcome !== -1 ? findOutcomeIdByLabel(r[idx.outcome]) : "",
            session: idx.session !== -1 ? findSessionIdByLabel(r[idx.session]) : "",
            mood: idx.mood !== -1 ? findMoodIdByLabel(r[idx.mood]) : "",
            confidence: idx.confidence !== -1 ? findConfidenceIdByLabel(r[idx.confidence]) : "",
            mistake: idx.mistake !== -1 ? (r[idx.mistake] || "").trim() : "",
            note: idx.note !== -1 ? (r[idx.note] || "").trim() : "",
          }))
          .filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.date));

        if (newEntries.length === 0) {
          setJournalImportMsg("No valid rows found in that file.");
          return;
        }
        persistJournalEntries([...journalEntries, ...newEntries]);
        setJournalImportMsg(`Imported ${newEntries.length} row${newEntries.length === 1 ? "" : "s"}.`);
      } catch (err) {
        setJournalImportMsg("Couldn't read that file, please try again.");
      }
    };
    reader.onerror = () => setJournalImportMsg("Couldn't read that file.");
    reader.readAsText(file);
  };

  const openAddSetup = () => {
    setSetupError("");
    setNewSetupName("");
    setAddingSetup(true);
  };

  const cancelAddSetup = () => {
    setAddingSetup(false);
    setNewSetupName("");
    setSetupError("");
  };

  const confirmAddSetup = () => {
    const name = newSetupName.trim();
    if (!name) return;
    if (name.length > 20) {
      setSetupError("Keep it under 20 characters.");
      return;
    }
    const allLabels = [...SETUPS, ...customSetups].map((s) => s.label.toLowerCase());
    if (allLabels.includes(name.toLowerCase())) {
      setSetupError("That setup already exists.");
      return;
    }
    if (customSetups.length >= MAX_CUSTOM_SETUPS) {
      setSetupError(`You can add up to ${MAX_CUSTOM_SETUPS} custom setups.`);
      return;
    }
    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const next = [...customSetups, { id, label: name }];
    persistCustomSetups(next);
    setTradeSetup(id);
    setAddingSetup(false);
    setNewSetupName("");
    setSetupError("");
  };

  const removeCustomSetup = (id) => {
    persistCustomSetups(customSetups.filter((s) => s.id !== id));
    if (tradeSetup === id) setTradeSetup(null);
  };

  const persistPlaybookRules = async (next) => {
    setPlaybookRules(next);
    if (!activeAccountId) return;
    try {
      await window.storage.set(scopedKey(PLAYBOOK_RULES_KEY, activeAccountId), JSON.stringify(next), false);
    } catch (err) {
      // non-critical, fail silently
    }
  };

  const persistPlaybookCheckins = async (next) => {
    setPlaybookCheckins(next);
    if (!activeAccountId) return;
    try {
      await window.storage.set(scopedKey(PLAYBOOK_CHECKINS_KEY, activeAccountId), JSON.stringify(next), false);
    } catch (err) {
      // non-critical, fail silently
    }
  };

  const addPlaybookRule = () => {
    const text = newRuleText.trim();
    if (!text) return;
    if (text.length > 80) {
      setPlaybookRuleError("Keep it under 80 characters.");
      return;
    }
    if (playbookRules.length >= MAX_PLAYBOOK_RULES) {
      setPlaybookRuleError(`You can track up to ${MAX_PLAYBOOK_RULES} rules at once.`);
      return;
    }
    const id = `rule-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    persistPlaybookRules([...playbookRules, { id, text }]);
    setNewRuleText("");
    setPlaybookRuleError("");
  };

  const removePlaybookRule = (id) => {
    persistPlaybookRules(playbookRules.filter((r) => r.id !== id));
    setTodayResults((cur) => {
      const next = { ...cur };
      delete next[id];
      return next;
    });
  };

  const toggleTodayResult = (ruleId) => {
    setTodayResults((cur) => ({ ...cur, [ruleId]: !cur[ruleId] }));
  };

  const submitCheckin = () => {
    if (playbookRules.length === 0) {
      setPlaybookMsg("Add at least one rule above first.");
      return;
    }
    const todayKey = dayKeyFromDate(new Date());
    const results = {};
    playbookRules.forEach((r) => {
      results[r.id] = !!todayResults[r.id];
    });
    const existingIdx = playbookCheckins.findIndex((c) => c.date === todayKey);
    let next;
    if (existingIdx >= 0) {
      next = playbookCheckins.map((c, i) => (i === existingIdx ? { ...c, results } : c));
    } else {
      next = [
        ...playbookCheckins,
        { id: `chk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, date: todayKey, results },
      ];
    }
    persistPlaybookCheckins(next);
    setTodayResults(results);
    setPlaybookMsg(isCleanCheckin({ results }) ? "Clean day \u2014 every rule followed." : "Check-in saved.");
  };

  const deletePlaybookCheckin = (id) => {
    const deleted = playbookCheckins.find((c) => c.id === id);
    persistPlaybookCheckins(playbookCheckins.filter((c) => c.id !== id));
    if (deleted && deleted.date === dayKeyFromDate(new Date())) {
      setTodayResults({});
    }
  };

  const resetTradeForm = () => {
    setTradeInput("");
    setTradePair("");
    setTradeNote("");
    setTradeEmotion(null);
    setTradeSetup(null);
    setEditingTradeId(null);
  };

  const startEditTrade = (t) => {
    setTradeInput(String(t.pnl));
    setTradePair(t.pair || "");
    setTradeNote(t.note || "");
    setTradeEmotion(t.emotion || null);
    setTradeSetup(t.setup || null);
    setEditingTradeId(t.id);
    setExpandedTradeId((cur) => (cur === t.id ? null : cur));
    if (logFormRef.current) {
      logFormRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Pulls a community signal into the trade log form, pre-filled, so a
  // member can log their own execution of it once they've actually taken
  // and closed the trade. Never fabricates a P/L — that part is left blank
  // for the member to fill in themselves.
  const shadowSignalToTrade = (m) => {
    resetTradeForm();
    setTradePair(m.pair || "");
    const dir = m.direction === "sell" ? "Sell" : "Buy";
    const parts = [`Shadowed from @${m.author}'s ${m.pair || "signal"} ${dir} call`];
    if (m.entry) parts.push(`Entry ${m.entry}`);
    if (m.sl) parts.push(`SL ${m.sl}`);
    if (m.tp) parts.push(`TP ${m.tp}`);
    if (m.text) parts.push(`"${m.text}"`);
    setTradeNote(parts.join(" \u00b7 "));
    setActiveTab("curve");
    setTimeout(() => {
      if (logFormRef.current) {
        logFormRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 60);
  };

  const cancelEditTrade = () => {
    resetTradeForm();
  };

  // Picks the crab's reaction to a freshly logged trade. Priority: revenge > limit > goal > streak > win/loss.
  const crabReactToTrade = (pnl, nextTrades, { revenge = false } = {}) => {
    try {
      const todayKey = dayKeyFromDate(new Date());
      const todayTrades = nextTrades.filter((t) => dayKeyFromTs(t.ts) === todayKey);
      const count = todayTrades.length;
      const lossTotal = todayTrades.filter((t) => t.pnl < 0).reduce((s, t) => s + t.pnl, 0);
      const prevLoss = lossTotal - (pnl < 0 ? pnl : 0);
      const lossLimit = num(settings.dailyLossLimit);
      const maxTrades = num(settings.maxTradesPerDay);
      const crossedLoss = lossLimit > 0 && Math.abs(lossTotal) >= lossLimit && Math.abs(prevLoss) < lossLimit;
      const crossedMax = maxTrades > 0 && count >= maxTrades && count - 1 < maxTrades;

      let goalMet = false;
      const startBal = num(startingBalance);
      [["weeklyTargetPct", "week"], ["monthlyTargetPct", "month"]].forEach(([key, period]) => {
        const target = num(goals[key]);
        if (goals[key] === "" || !(target > 0)) return;
        const before = computeGoalProgress(trades, startBal, period);
        const after = computeGoalProgress(nextTrades, startBal, period);
        if (after && after.pct >= target && !(before && before.pct >= target)) goalMet = true;
      });

      const sorted = [...nextTrades].sort((a, b) => a.ts - b.ts);
      let winStreak = 0;
      for (let i = sorted.length - 1; i >= 0 && sorted[i].pnl > 0; i--) winStreak++;

      if (revenge) return pokeCrab("revenge");
      if (crossedLoss || crossedMax) return pokeCrab("limit");
      if (goalMet) return pokeCrab("goal");
      if (pnl > 0 && winStreak >= 3) return pokeCrab("streak", { count: winStreak });
    } catch (err) {
      // The mascot must never break trade logging.
    }
    pokeCrab(pnl > 0 ? "win" : "loss", { amount: pnl });
  };

  const commitTrade = (opts = {}) => {
    const pnl = num(tradeInput);
    if (editingTradeId) {
      const next = trades.map((t) =>
        t.id === editingTradeId
          ? { ...t, pnl, pair: tradePair.trim(), note: tradeNote.trim(), emotion: tradeEmotion, setup: tradeSetup }
          : t
      );
      persistTrades(next);
      pokeCrab("edit");
      if (settings.autoSyncTradesToJournal) {
        const updated = next.find((t) => t.id === editingTradeId);
        if (updated) updateSyncedJournalRow(updated);
      }
      resetTradeForm();
      return;
    }

    const newTrade = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      pnl,
      pair: tradePair.trim(),
      note: tradeNote.trim(),
      emotion: tradeEmotion,
      setup: tradeSetup,
      ts: Date.now(),
    };
    const next = [...trades, newTrade];
    persistTrades(next);
    crabReactToTrade(pnl, next, { revenge: opts.revenge === true });
    if (settings.autoSyncTradesToJournal) {
      syncTradeToJournal(newTrade);
    } else {
      ensureJournalRowForDate(dayKeyFromDate(new Date()), tradeSetup);
    }
    resetTradeForm();
  };

  // Trades that arrive from a connected broker. Each carries an extId, so a trade is only ever added once.
  const importBrokerTrades = (incoming) => {
    const cur = tradesRef.current;
    const have = new Set(cur.map((t) => t.extId).filter(Boolean));
    const fresh = (incoming || [])
      .filter((t) => t && t.extId && !have.has(t.extId) && Number.isFinite(t.pnl) && t.ts > 0)
      .map((t) => ({
        id: `${t.ts}-${Math.random().toString(36).slice(2, 7)}`,
        pnl: t.pnl,
        pair: t.pair || "",
        note: t.note || "",
        emotion: "",
        setup: "",
        ts: t.ts,
        source: t.source || "broker",
        extId: t.extId,
      }));
    if (!fresh.length) return 0;
    const next = [...cur, ...fresh];
    tradesRef.current = next;
    persistTrades(next);
    if (settings.autoSyncTradesToJournal) {
      const done = new Set(journalEntries.map((r) => r.sourceTradeId));
      const rows = fresh
        .filter((t) => !done.has(t.id))
        .map((t) => ({
          id: `j-sync-${t.id}`,
          date: dayKeyFromTs(t.ts),
          pair: t.pair,
          trend: "",
          rr: "",
          pnl: String(t.pnl),
          setup: "",
          outcome: outcomeFromPnl(t.pnl),
          session: "",
          mood: "",
          confidence: "",
          mistake: "",
          note: t.note,
          sourceTradeId: t.id,
        }));
      if (rows.length) persistJournalEntries([...journalEntries, ...rows]);
    }
    return fresh.length;
  };

  const submitTrade = () => {
    const pnl = num(tradeInput);
    if (!tradeInput || pnl === 0) return;

    if (!editingTradeId && settings.revengeLockEnabled && trades.length > 0) {
      const sorted = [...trades].sort((a, b) => a.ts - b.ts);
      const lastTrade = sorted[sorted.length - 1];
if (lastTrade.pnl < 0 && Date.now() - lastTrade.ts <= RUNTIME.REVENGE_WINDOW_MS) {
        setPendingRevengeLog(true);
        return;
      }
    }

    commitTrade();
  };

  const confirmRevengeLog = () => {
    setPendingRevengeLog(false);
    commitTrade({ revenge: true });
  };

  const cancelRevengeLog = () => setPendingRevengeLog(false);

  const deleteTrade = (id) => {
    persistTrades(trades.filter((t) => t.id !== id));
    pokeCrab("poof");
    if (editingTradeId === id) resetTradeForm();
  };

  const clearTrades = () => {
    persistTrades([]);
    pokeCrab("poof");
    resetTradeForm();
  };

  const openScreenshotPicker = (tradeId) => {
    setScreenshotError("");
    setScreenshotTargetId(tradeId);
    if (screenshotInputRef.current) screenshotInputRef.current.click();
  };

  const handleScreenshotChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    const targetId = screenshotTargetId;
    setScreenshotTargetId(null);
    if (!file || !targetId) return;
    setScreenshotError("");
    setScreenshotSaving(true);
    try {
      const dataUrl = await resizeImageFile(file);
      await persistTrades(
        trades.map((t) => {
          if (t.id !== targetId) return t;
          const existing = tradeScreenshots(t);
          if (existing.length >= SCREENSHOT_MAX_PER_TRADE) return t;
          return { ...t, screenshots: [...existing, dataUrl], screenshot: undefined };
        })
      );
    } catch (err) {
      setScreenshotError("Couldn't attach that image, please try again.");
    } finally {
      setScreenshotSaving(false);
    }
  };

  const removeScreenshot = (tradeId, index) => {
    persistTrades(
      trades.map((t) => {
        if (t.id !== tradeId) return t;
        return { ...t, screenshots: tradeScreenshots(t).filter((_, i) => i !== index), screenshot: undefined };
      })
    );
  };

  const confirmDeleteScreenshot = () => {
    if (!pendingScreenshotDelete) return;
    removeScreenshot(pendingScreenshotDelete.tradeId, pendingScreenshotDelete.index);
    setPendingScreenshotDelete(null);
  };

  const cancelDeleteScreenshot = () => setPendingScreenshotDelete(null);

  const shareImageFile = async (src, trade) => {
    setScreenshotShareMsg("");
    const dayKey = trade ? dayKeyFromTs(trade.ts) : dayKeyFromDate(new Date());
    const pnlLabel = trade ? `${trade.pnl >= 0 ? "+" : "-"}$${fmtMoney(trade.pnl)}` : "";
    const filename = `tredzi-trade-${dayKey}${pnlLabel ? `-${pnlLabel.replace("+", "gain").replace("-", "loss").replace("$", "")}` : ""}.jpg`;

    let file;
    try {
      file = dataUrlToFile(src, filename);
    } catch (err) {
      setScreenshotShareMsg("Couldn't prepare that image to share.");
      return;
    }

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: "Trade Screenshot",
          text: trade ? `${pnlLabel} ${formatDayLabel(dayKey)}` : "Trade Screenshot",
        });
        return;
      } catch (err) {
        if (err && err.name === "AbortError") return;
      }
    }

    downloadImageFile(file, filename, "Sharing isn't available now \u2014 download instead.");
  };

  const downloadImageFile = (file, filename, successMsg = "Downloaded.") => {
    try {
      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      setScreenshotShareMsg(successMsg);
    } catch (err) {
      setScreenshotShareMsg("Couldn't share or download that image.");
    }
  };

  const downloadScreenshot = (src, trade) => {
    setScreenshotShareMsg("");
    const dayKey = trade ? dayKeyFromTs(trade.ts) : dayKeyFromDate(new Date());
    const pnlLabel = trade ? `${trade.pnl >= 0 ? "+" : "-"}$${fmtMoney(trade.pnl)}` : "";
    const filename = `tredzi-trade-${dayKey}${pnlLabel ? `-${pnlLabel.replace("+", "gain").replace("-", "loss").replace("$", "")}` : ""}.jpg`;
    try {
      const file = dataUrlToFile(src, filename);
      downloadImageFile(file, filename, "Downloaded.");
    } catch (err) {
      setScreenshotShareMsg("Couldn't prepare that image to download.");
    }
  };

  const applyPreset = (preset) => {
    const defaults = { forex: "10", gold: "1", custom: ps.valuePerPip };
    setPs({ ...ps, preset, valuePerPip: defaults[preset] });
  };

  const generateWeeklyShare = () => {
    setShareError("");
    const now = Date.now();
    const weekTrades = trades.filter((t) => now - t.ts <= WEEK_MS).sort((a, b) => a.ts - b.ts);

    if (weekTrades.length === 0) {
      setShareError("No trades logged in the last 7 days yet.");
      return;
    }
    const startBal = num(startingBalance);
    if (!(startBal > 0)) {
      setShareError("Add a starting balance below first \u2014 it's only used to compute %, never shown.");
      return;
    }

    const weekJournalRows = journalEntries.filter((r) => {
      if (!r.date) return false;
      const ts = new Date(`${r.date}T00:00:00`).getTime();
      return now - ts <= WEEK_MS;
    });

    const recap = buildWeekRecap(weekTrades, startBal, weekJournalRows, customSetups);
    const discipline = computeDisciplineStreak(trades);
    const weekPerf = computePerformanceMetrics(weekTrades);
    const weekConsistency = computeConsistencyScore(weekTrades);
    const activeDaySet = new Set(weekTrades.map((t) => dayKeyFromTs(t.ts)));

    try {
      if (!shareCanvasRef.current) {
        setShareError("Couldn't generate the image, please try again.");
        return;
      }
const weekNetDollar = weekTrades.reduce((s, t) => s + t.pnl, 0);
const dataUrl = drawShareCard(shareCanvasRef.current, {
  rangeLabel: recap.rangeLabel,
  tradeCount: recap.tradeCount,
  winRate: recap.winRate,
  netPct: recap.netPct,
  curve: recap.curve,
  bestStreak: recap.bestStreak,
  worstStreak: recap.worstStreak,
  topSetup: recap.topSetup,
  revengeCount: recap.revengeCount,
  disciplineStreak: discipline.current,
  profitFactor: recap.profitFactor,
  grade: recap.grade,
  topPair: recap.topPair,
  paceTrend: recap.paceTrend,
  recoveryFactor: weekPerf.recoveryFactor,
  consistencyLabel: weekConsistency ? weekConsistency.label : null,
  activeDays: activeDaySet.size,
  tone: recap.netPct >= 0 ? "good" : "bad",
  theme,
  showDollarAmount: !settings.hideDollarInShare,
  netDollar: weekNetDollar,
  traderAlias: settings.traderAlias,
});
      setShareImageUrl(dataUrl);
    } catch (err) {
      setShareError("Couldn't generate the image, please try again.");
    }
  };

  const closeShare = () => setShareImageUrl(null);

  const downloadShare = () => {
    if (!shareImageUrl) return;
    try {
      const a = document.createElement("a");
      a.href = shareImageUrl;
      a.download = "my-trading-week.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      pokeCrab("sent");
    } catch (err) {
      window.open(shareImageUrl, "_blank");
    }
  };

  const copyWeekSummary = async () => {
    setCopyMsg("");
    setCopyFallbackText("");
    const now = Date.now();
    const weekTrades = trades.filter((t) => now - t.ts <= WEEK_MS).sort((a, b) => a.ts - b.ts);

    if (weekTrades.length === 0) {
      setCopyMsg("No trades logged in the last 7 days yet.");
      return;
    }
    const startBal = num(startingBalance);
    if (!(startBal > 0)) {
      setCopyMsg("Add a starting balance below first \u2014 it's only used to compute %, never shown.");
      return;
    }

    const weekJournalRows = journalEntries.filter((r) => {
      if (!r.date) return false;
      const ts = new Date(`${r.date}T00:00:00`).getTime();
      return now - ts <= WEEK_MS;
    });

    const recap = buildWeekRecap(weekTrades, startBal, weekJournalRows, customSetups);
    const discipline = computeDisciplineStreak(trades);
    const fmtRatioLocal = (n) => (Number.isFinite(n) ? n.toFixed(2) : "\u221e");

    const weekNetDollarSummary = weekTrades.reduce((s, t) => s + t.pnl, 0);
    const lines = [
      `My Trading Week \u2014 ${recap.rangeLabel}`,
      `Grade: ${recap.grade}`,
      `Trades: ${recap.tradeCount}`,
      `Win Rate: ${fmt(recap.winRate, 0)}%`,
      `Net Return: ${fmtPct(recap.netPct)}`,
      ...(!settings.hideDollarInShare
        ? [`Net P&L: ${weekNetDollarSummary >= 0 ? "+" : "-"}$${fmtMoney(weekNetDollarSummary)}`]
        : []),
      `Profit Factor: ${fmtRatioLocal(recap.profitFactor)}`,
      `Best Streak: +${recap.bestStreak}    Worst Streak: ${recap.worstStreak}`,
      `Discipline Streak: ${discipline.current} day${discipline.current === 1 ? "" : "s"} (best: ${discipline.best})`,
      `Revenge Trades This Week: ${recap.revengeCount}`,
    ];
    if (recap.topSetup) {
      lines.push(`Top Setup: ${recap.topSetup.label} (${recap.topSetup.count}x)`);
    }
    if (recap.topPair) {
      lines.push(`Most Traded Pair: ${recap.topPair.pair} (${recap.topPair.count}x)`);
    }
    if (recap.avgRR !== null) {
      lines.push(`Average R:R: ${recap.avgRR.toFixed(1)}`);
    }
    lines.push("", "— Tredzi · no dollar amounts, just the process");
    const text = lines.join("\n");

    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) {
        throw new Error("Clipboard API unavailable");
      }
      await navigator.clipboard.writeText(text);
      setCopyMsg("Copied to clipboard.");
    } catch (err) {
      setCopyMsg("Couldn't copy automatically \u2014 select and copy the text below.");
      setCopyFallbackText(text);
    }
  };

  const exportInsightsReport = () => {
    setInsightReportMsg("");
    if (trades.length === 0) {
      setInsightReportMsg("Log some trades first \u2014 there's nothing to report on yet.");
      return;
    }
    const perf = computePerformanceMetrics(trades);
    const monthCmp = computeMonthComparison(trades);
    const completeness = computeJournalCompleteness(trades);
    const grade = computeDisciplineGrade(trades);
    const revengeCost = computeRevengeCostSplit(trades);
    const overconfidence = computeOverconfidenceCheck(trades);
    const noteTags = computeNoteTagAnalysis(trades);
    const consistency = computeConsistencyScore(trades);
    const insights = computeInsights(trades, customSetups);
    const headline = computeHeadlineInsight(trades, customSetups);

    const fmtSigned = (n) => `${n >= 0 ? "+" : "-"}$${fmtMoney(n)}`;
    const fmtRatio = (n) => (Number.isFinite(n) ? n.toFixed(2) : "\u221e");

    const lines = [
      "TREDZI — TRADING INSIGHTS REPORT",
      `Generated ${new Date().toLocaleString()}`,
      `${trades.length} trades logged`,
      "",
    ];
    if (headline) lines.push("HEADLINE", headline, "");

    lines.push(
      "PERFORMANCE OVERVIEW",
      `Profit Factor: ${fmtRatio(perf.profitFactor)} (${perf.tiers.profitFactor})`,
      `Recovery Factor: ${fmtRatio(perf.recoveryFactor)} (${perf.tiers.recoveryFactor})`,
      `Win/Loss Ratio: ${fmtRatio(perf.winLossRatio)} (${perf.tiers.winLossRatio})`,
      `Expectancy: ${fmtSigned(perf.expectancy)} per trade (${perf.tiers.expectancy})`,
      `Largest Win: ${fmtSigned(perf.largestWin)}`,
      `Largest Loss: ${fmtSigned(perf.largestLoss)}`,
      `Net Profit: ${fmtSigned(perf.netProfit)}`,
      "",
      "MONTH OVER MONTH",
      `This Month: ${monthCmp.thisMonth.count} trades, ${monthCmp.thisMonth.winRate.toFixed(0)}% win rate, ${fmtSigned(monthCmp.thisMonth.net)}`,
      `Last Month: ${monthCmp.lastMonth.count} trades, ${monthCmp.lastMonth.winRate.toFixed(0)}% win rate, ${fmtSigned(monthCmp.lastMonth.net)}`,
      "",
      `JOURNAL COMPLETENESS: ${completeness}%`,
      "",
      "BEHAVIOR",
      `Discipline Grade: ${grade.grade} (${grade.score}/100)`,
      `Revenge Trades: ${revengeCost.revengeCount} trades, ${fmtSigned(revengeCost.revengeTotal)}`,
      `Everything Else: ${revengeCost.cleanCount} trades, ${fmtSigned(revengeCost.cleanTotal)}`
    );
    if (overconfidence) {
      lines.push(
        `Post-Win-Streak Sizing: ${overconfidence.detected ? "UP" : "steady"} ${overconfidence.pctChange >= 0 ? "+" : ""}${overconfidence.pctChange.toFixed(0)}% vs normal after 3+ wins`
      );
    }
    if (consistency) {
      lines.push(`Consistency: ${consistency.label} day-to-day volatility`);
    }
    if (noteTags.length > 0) {
      lines.push("", "NOTE TAGS");
      noteTags.forEach((r) => lines.push(`${r.tag}: ${r.count} trades, ${r.winRate.toFixed(0)}% win rate, ${fmtSigned(r.pnl)}`));
    }
    if (insights.setupRows.length > 0) {
      lines.push("", "BY SETUP");
      insights.setupRows.forEach((r) =>
        lines.push(`${r.label}: ${r.count} trades, ${r.winRate.toFixed(0)}% win rate, ${fmtSigned(r.pnl)}`)
      );
    }
    if (insights.moodRows.length > 0) {
      lines.push("", "BY MOOD");
      insights.moodRows.forEach((r) =>
        lines.push(`${r.label}: ${r.count} trades, ${r.winRate.toFixed(0)}% win rate, ${fmtSigned(r.pnl)}`)
      );
    }
    lines.push("", "\u2014 Generated by Tredzi");

    try {
      const blob = new Blob([lines.join("\n")], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tredzi-insights-${dayKeyFromDate(new Date())}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      setInsightReportMsg("Press download to download the report.");
    } catch (err) {
      setInsightReportMsg("Couldn't create the report file, please try again.");
    }
  };

  const exportBackup = () => {
    setBackupMsg("");
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      startingBalance,
      trades,
      newsEvents,
      customSetups,
      journalEntries,
      journalColWidths,
      playbookRules,
      playbookCheckins,
      notepadNotes,
      theme,
    };
    try {
      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tredzi-backup-${dayKeyFromDate(new Date())}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      setBackupMsg("Press download to download the report.");
    } catch (err) {
      setBackupMsg("Couldn't create the backup file, please try again.");
    }
  };

  const validateBackup = (data) => {
    if (!data || !Array.isArray(data.trades)) {
      setBackupMsg("That file doesn't look like a Tredzi backup.");
      return null;
    }
    const tradesValid = data.trades.every(
      (t) => t && typeof t.pnl === "number" && Number.isFinite(t.pnl) && typeof t.ts === "number"
    );
    if (!tradesValid) {
      setBackupMsg("That file doesn't look like a Tredzi backup.");
      return null;
    }
    return data;
  };

  const importBackup = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setBackupMsg("");
    const reader = new FileReader();
    reader.onload = () => {
      let data;
      try {
        data = JSON.parse(reader.result);
      } catch (err) {
        setBackupMsg("Couldn't read that file — make sure it's a Tredzi backup JSON.");
        return;
      }
      const valid = validateBackup(data);
      if (!valid) return;
      setPendingImport(valid);
    };
    reader.onerror = () => setBackupMsg("Couldn't read that file.");
    reader.readAsText(file);
  };

  const confirmImport = () => {
    if (!pendingImport) return;
    const data = pendingImport;
    persistTrades(data.trades);
    if (typeof data.startingBalance === "string" || typeof data.startingBalance === "number") {
      persistStartingBalance(String(data.startingBalance));
    }
    if (Array.isArray(data.newsEvents)) {
      persistNews(data.newsEvents);
    }
    if (Array.isArray(data.customSetups)) {
      persistCustomSetups(data.customSetups.slice(0, MAX_CUSTOM_SETUPS));
    }
    if (Array.isArray(data.journalEntries)) {
      persistJournalEntries(data.journalEntries);
    }
    if (data.journalColWidths && typeof data.journalColWidths === "object") {
      const nextWidths = { ...DEFAULT_JOURNAL_COL_WIDTHS, ...data.journalColWidths };
      setJournalColWidths(nextWidths);
      persistJournalColWidths(nextWidths);
    }
    if (Array.isArray(data.playbookRules)) {
      persistPlaybookRules(data.playbookRules.slice(0, MAX_PLAYBOOK_RULES));
    }
    if (Array.isArray(data.playbookCheckins)) {
      persistPlaybookCheckins(data.playbookCheckins);
    }
    if (Array.isArray(data.notepadNotes)) {
      persistNotepadNotes(data.notepadNotes.map(migrateNoteShape));
    }
if (data.theme === "light" || data.theme === "dark" || data.theme === "void") {
  setTheme(data.theme);
  window.storage.set(THEME_STORAGE_KEY, data.theme, false).catch(() => {});
}
    setPendingImport(null);
    setBackupMsg("Backup restored.");
  };

  const cancelImport = () => {
    setPendingImport(null);
    setBackupMsg("");
  };
  
    const exportAllData = () => {
    setMasterExportMsg("");
    const payload = {
      version: 2,
      kind: "ledger-master-export",
      exportedAt: new Date().toISOString(),
      startingBalance,
      trades,
      newsEvents,
      customSetups,
      hiddenDefaultSetupIds,
      customMoods,
      journalEntries,
      journalColWidths,
      playbookRules,
      playbookCheckins,
      notepadNotes,
      theme,
      settings,
      goals,
      fxLastPair: { from: fx.from, to: fx.to },
      edge,
      cs,
      ps,
    };
    try {
      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tredzi-master-export-${dayKeyFromDate(new Date())}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      setMasterExportMsg("Downloaded full export.");
    } catch (err) {
      setMasterExportMsg("Couldn't create the export file, please try again.");
    }
  };

  const validateMasterImport = (data) => {
    if (!data || typeof data !== "object" || !Array.isArray(data.trades)) {
      setMasterExportMsg("That file doesn't look like a Tredzi export.");
      return null;
    }
    const tradesValid = data.trades.every(
      (t) => t && typeof t.pnl === "number" && Number.isFinite(t.pnl) && typeof t.ts === "number"
    );
    if (!tradesValid) {
      setMasterExportMsg("That file doesn't look like a Tredzi export.");
      return null;
    }
    return data;
  };

  const importAllDataFile = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setMasterExportMsg("");
    const reader = new FileReader();
    reader.onload = () => {
      let data;
      try {
        data = JSON.parse(reader.result);
      } catch (err) {
        setMasterExportMsg("Couldn't read that file — make sure it's a Tredzi export JSON.");
        return;
      }
      const valid = validateMasterImport(data);
      if (!valid) return;
      setPendingMasterImport(valid);
    };
    reader.onerror = () => setMasterExportMsg("Couldn't read that file.");
    reader.readAsText(file);
  };

  const confirmMasterImport = () => {
    if (!pendingMasterImport) return;
    const data = pendingMasterImport;

    persistTrades(data.trades);
    if (typeof data.startingBalance === "string" || typeof data.startingBalance === "number") {
      persistStartingBalance(String(data.startingBalance));
    }
    if (Array.isArray(data.newsEvents)) persistNews(data.newsEvents);
    if (Array.isArray(data.customSetups)) persistCustomSetups(data.customSetups.slice(0, MAX_CUSTOM_SETUPS));
    if (Array.isArray(data.hiddenDefaultSetupIds)) persistHiddenDefaultSetups(data.hiddenDefaultSetupIds);
    if (Array.isArray(data.customMoods)) persistCustomMoods(data.customMoods.slice(0, MAX_CUSTOM_MOODS));
    if (Array.isArray(data.journalEntries)) persistJournalEntries(data.journalEntries);
    if (data.journalColWidths && typeof data.journalColWidths === "object") {
      const nextWidths = { ...DEFAULT_JOURNAL_COL_WIDTHS, ...data.journalColWidths };
      setJournalColWidths(nextWidths);
      persistJournalColWidths(nextWidths);
    }
    if (Array.isArray(data.playbookRules)) persistPlaybookRules(data.playbookRules.slice(0, MAX_PLAYBOOK_RULES));
    if (Array.isArray(data.playbookCheckins)) persistPlaybookCheckins(data.playbookCheckins);
    if (Array.isArray(data.notepadNotes)) persistNotepadNotes(data.notepadNotes.map(migrateNoteShape));
    if (data.theme === "light" || data.theme === "dark" || data.theme === "void") {
      setTheme(data.theme);
      window.storage.set(THEME_STORAGE_KEY, data.theme, false).catch(() => {});
    }
    if (data.settings && typeof data.settings === "object") {
      persistSettings({ ...DEFAULT_SETTINGS, ...data.settings });
    }
    if (data.goals && typeof data.goals === "object") {
      persistGoals({
        weeklyTargetPct: data.goals.weeklyTargetPct || "",
        monthlyTargetPct: data.goals.monthlyTargetPct || "",
      });
    }
    if (data.fxLastPair && data.fxLastPair.from && data.fxLastPair.to) {
      setFx((f) => ({ ...f, from: data.fxLastPair.from, to: data.fxLastPair.to }));
    }
    if (data.edge && typeof data.edge === "object") {
      setEdge((e) => ({ ...e, ...data.edge }));
      window.storage.set(EDGE_STORAGE_KEY, JSON.stringify({ ...edge, ...data.edge }), false).catch(() => {});
    }
    if (data.cs && typeof data.cs === "object") {
      setCs((c) => ({ ...c, ...data.cs }));
      window.storage.set(CS_STORAGE_KEY, JSON.stringify({ ...cs, ...data.cs }), false).catch(() => {});
    }
    if (data.ps && typeof data.ps === "object") {
      setPs((p) => ({ ...p, ...data.ps }));
      window.storage.set(PS_STORAGE_KEY, JSON.stringify({ ...ps, ...data.ps }), false).catch(() => {});
    }

    setPendingMasterImport(null);
    setMasterExportMsg("Full backup restored.");
  };

  const cancelMasterImport = () => {
    setPendingMasterImport(null);
    setMasterExportMsg("");
  };

const persistNotepadNotes = async (next) => {
  setNotepadNotes(next);
  if (!activeAccountId) return;
  try {
    await window.storage.set(scopedKey(NOTEPAD_STORAGE_KEY, activeAccountId), JSON.stringify(next), false);
  } catch (err) {}
};

  const createNote = () => {
    const id = `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = Date.now();
    const firstBlockId = makeBlockId();
    const newNote = {
      id,
      title: "Untitled Note",
      blocks: [{ id: firstBlockId, type: "text", text: "" }],
      wordWrap: true,
      fontSize: DEFAULT_NOTEPAD_FONT_SIZE,
      createdAt: now,
      updatedAt: now,
    };
    persistNotepadNotes([newNote, ...notepadNotes]);
    setActiveNoteId(id);
    notepadActiveBlockRef.current = { noteId: id, blockId: firstBlockId, pos: 0 };
    setNotepadFindOpen(false);
    setNotepadMsg("");
  };

  const updateNote = (id, patch) => {
    persistNotepadNotes(
      notepadNotes.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n))
    );
  };

  const openNote = (id) => {
    setActiveNoteId(id);
    notepadActiveBlockRef.current = { noteId: null, blockId: null, pos: 0 };
    setNotepadFindOpen(false);
    setNotepadFindText("");
    setNotepadReplaceText("");
    setNotepadMsg("");
  };

  const closeNote = () => {
    setActiveNoteId(null);
    notepadActiveBlockRef.current = { noteId: null, blockId: null, pos: 0 };
    setNotepadFindOpen(false);
    setNotepadMsg("");
  };

  const requestDeleteNote = (id) => setPendingNoteDelete(id);
  const cancelDeleteNote = () => setPendingNoteDelete(null);
  const confirmDeleteNote = () => {
    if (!pendingNoteDelete) return;
    persistNotepadNotes(notepadNotes.filter((n) => n.id !== pendingNoteDelete));
    if (activeNoteId === pendingNoteDelete) setActiveNoteId(null);
    setPendingNoteDelete(null);
  };

    const toggleNoteWordWrap = (note) => updateNote(note.id, { wordWrap: note.wordWrap === false });

  const adjustNoteFontSize = (note, dir) => {
    const idx = NOTEPAD_FONT_SIZES.indexOf(note.fontSize || DEFAULT_NOTEPAD_FONT_SIZE);
    const nextIdx = Math.max(0, Math.min(NOTEPAD_FONT_SIZES.length - 1, (idx === -1 ? 2 : idx) + dir));
    updateNote(note.id, { fontSize: NOTEPAD_FONT_SIZES[nextIdx] });
  };

  const insertTextAtCursor = (note, text) => {
    const blocks = note.blocks;
    const ref = notepadActiveBlockRef.current;
    let targetIdx =
      ref.noteId === note.id ? blocks.findIndex((b) => b.id === ref.blockId && b.type === "text") : -1;
    if (targetIdx === -1) {
      for (let i = blocks.length - 1; i >= 0; i--) {
        if (blocks[i].type === "text") {
          targetIdx = i;
          break;
        }
      }
    }
    if (targetIdx === -1) {
      const newBlock = { id: makeBlockId(), type: "text", text };
      updateNote(note.id, { blocks: [...blocks, newBlock] });
      setNotepadFocusBlock({ blockId: newBlock.id, pos: text.length });
      return;
    }
    const block = blocks[targetIdx];
    const content = block.text || "";
    const pos =
      ref.noteId === note.id && ref.blockId === block.id
        ? Math.max(0, Math.min(ref.pos ?? content.length, content.length))
        : content.length;
    const nextText = content.slice(0, pos) + text + content.slice(pos);
    const newBlocks = blocks.map((b, i) => (i === targetIdx ? { ...b, text: nextText } : b));
    updateNote(note.id, { blocks: newBlocks });
    setNotepadFocusBlock({ blockId: block.id, pos: pos + text.length });
  };

  const insertDateTimeIntoNote = (note) => {
    insertTextAtCursor(note, new Date().toLocaleString());
  };

  const replaceAllInNote = (note) => {
    if (!notepadFindText) return;
    const count = countOccurrencesInBlocks(note.blocks, notepadFindText);
    if (count === 0) {
      setNotepadMsg("No matches found.");
      return;
    }
    updateNote(note.id, { blocks: replaceAllInBlocks(note.blocks, notepadFindText, notepadReplaceText) });
    setNotepadMsg(`Replaced ${count} occurrence${count === 1 ? "" : "s"}.`);
  };

  const trackNotepadCursor = (noteId, blockId) => (e) => {
    notepadActiveBlockRef.current = { noteId, blockId, pos: e.target.selectionStart };
  };

  const downloadNoteText = (note) => {
    setNotepadMsg("");
    try {
      const blob = new Blob([blocksToExportText(note.blocks)], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(note.title || "note").replace(/[^\w\-]+/g, "_") || "note"}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      setNotepadMsg("Downloaded.");
    } catch (err) {
      setNotepadMsg("Couldn't create the file, please try again.");
    }
  };

  // Scroll-aware bottom nav (mobile only): hides on scroll-down, reappears on
  // scroll-up or near the top — matches the Facebook / X app-shell behavior.
  const MOBILE_NAV_SPACE = "calc(84px + env(safe-area-inset-bottom, 0px))";
  const crabRest = (() => {
    const k = dayKeyFromDate(new Date());
    const today = trades.filter((t) => dayKeyFromTs(t.ts) === k);
    const lossLimit = num(settings.dailyLossLimit);
    const maxTrades = num(settings.maxTradesPerDay);
    const loss = today.filter((t) => t.pnl < 0).reduce((s, t) => s + t.pnl, 0);
    return (lossLimit > 0 && Math.abs(loss) >= lossLimit) || (maxTrades > 0 && today.length >= maxTrades) ? "worry" : undefined;
  })();
  const handleMobileNavScroll = (e) => {
    if (isDesktop) return;
    const y = e.currentTarget.scrollTop;
    const last = lastNavScrollYRef.current;
    const delta = y - last;
    if (y < 24) setMobileNavHidden(false);
    else if (delta > 6) setMobileNavHidden(true);
    else if (delta < -6) setMobileNavHidden(false);
    lastNavScrollYRef.current = y;
  };

const hiddenTabIds = settings.hiddenTabs || [];
  const visibleTabs = TABS.filter((t) => !hiddenTabIds.includes(t.id));
  const navTabs = visibleTabs.length > 0 ? visibleTabs : TABS;

  const pinnedTabIdsRaw = (settings.mobileNavPinnedTabs || []).filter((id) =>
    navTabs.some((t) => t.id === id)
  );
  const mobileNavPrimaryTabs =
    pinnedTabIdsRaw.length > 0
      ? pinnedTabIdsRaw.map((id) => navTabs.find((t) => t.id === id)).filter(Boolean)
      : navTabs.slice(0, MOBILE_NAV_PRIMARY_COUNT);
  const mobileNavOverflowTabs = navTabs.filter(
    (t) => !mobileNavPrimaryTabs.some((p) => p.id === t.id)
  );
  const activeInMobileOverflow = mobileNavOverflowTabs.some((t) => t.id === activeTab);

  // Shared sub-tab bar for Challenge / Journal / Sessions. Desktop uses the same underline
  // style as the Insights tabs; mobile keeps the original pill buttons.
  const renderSubNav = (tabs, activeId, onSelect) =>
    isDesktop ? (
      <div
        className="flex items-center gap-7 mb-8"
        style={{
          borderBottom: `1px solid ${palette.border}`,
          position: "sticky",
          top: 0,
          zIndex: 5,
          background: palette.bg,
          paddingTop: "14px",
        }}
      >
        {tabs.map((t) => {
          const active = activeId === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelect(t.id)}
              className={TAP}
              style={{
                background: "transparent",
                border: "none",
                borderBottom: `2.5px solid ${active ? palette.gold : "transparent"}`,
                color: active ? palette.text : palette.textFaint,
                fontFamily: display,
                fontSize: "14.5px",
                fontWeight: active ? 700 : 500,
                padding: "0 2px 14px 2px",
                marginBottom: "-1px",
                cursor: "pointer",
                transition: "color 0.15s ease, border-color 0.15s ease",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    ) : (
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 5,
          background: palette.bg,
          paddingTop: "8px",
          paddingBottom: "8px",
        }}
      >
        <div
          role="tablist"
          className="relative"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))`,
            padding: "4px",
            borderRadius: "14px",
            background: palette.field,
            border: `1px solid ${palette.border}`,
          }}
        >
          <span
            aria-hidden="true"
            className="ledger-seg-thumb"
            style={{
              position: "absolute",
              top: "4px",
              bottom: "4px",
              left: "4px",
              width: `calc((100% - 8px) / ${tabs.length})`,
              transform: `translateX(${Math.max(0, tabs.findIndex((t) => t.id === activeId)) * 100}%)`,
              borderRadius: "10px",
              background: palette.gold,
              boxShadow: "0 2px 10px rgba(0,0,0,0.25)",
            }}
          />
          {tabs.map((t) => {
            const active = activeId === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onSelect(t.id)}
                className={`relative ${TAP}`}
                style={{
                  zIndex: 1,
                  background: "transparent",
                  border: "none",
                  padding: "8px 4px",
                  minWidth: 0,
                  textAlign: "center",
                  color: active ? palette.letterbox : palette.textMuted,
                  fontFamily: display,
                  fontSize: tabs.length > 3 ? "12.5px" : "13.5px",
                  fontWeight: active ? 700 : 500,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  transition: "color 0.2s ease",
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>
    );

  // Direction of the tab switch (1 = moving right along the dock, -1 = moving left).
  {
    const order = [...mobileNavPrimaryTabs, ...mobileNavOverflowTabs].map((t) => t.id);
    const prev = tabDirRef.current;
    if (prev.tab !== activeTab) {
      const from = order.indexOf(prev.tab);
      const to = order.indexOf(activeTab);
      tabDirRef.current = { tab: activeTab, dir: from !== -1 && to !== -1 && to < from ? -1 : 1 };
    }
  }

  let body = null;

  if (activeTab === "risk") {
    body = <Suspense fallback={<div className="tz-tab-loading" aria-hidden="true" />}><RiskTab {...{ applyPreset, cs, edge, edgeProjectionPeriodIdx, isDesktop, linkedFirm, ps, renderSubNav, riskSubTab, setCs, setEdge, setEdgeProjectionPeriodIdx, setPs, setRiskSubTab, settings, threeCurveResult, trades }} /></Suspense>;
  }

    if (activeTab === "propfirm") {
    body = <Suspense fallback={<div className="tz-tab-loading" aria-hidden="true" />}><PropFirmTab {...{ applyPropFirmToChallenge, linkedFirm, pfCompareIds, pfCompareMode, pfFilterDdMode, pfFilterInstant, pfFilterPanelOpen, pfFilterPhases, pfFirmId, pfMarketType, pfPhaseIdx, pfPlanId, pfSearch, pfSizeAmount, pfSortBy, resetPropFirmWizard, setPfCompareIds, setPfCompareMode, setPfFilterDdMode, setPfFilterInstant, setPfFilterPanelOpen, setPfFilterPhases, setPfFirmId, setPfMarketType, setPfPhaseIdx, setPfPlanId, setPfSearch, setPfSizeAmount, setPfSortBy }} /></Suspense>;
  }

  if (activeTab === "fx") {
    body = <Suspense fallback={<div className="tz-tab-loading" aria-hidden="true" />}><ConvertTab {...{ fx, fxRatesDate, fxRatesStatus, isDesktop, liveFxRates, persistSettings, setFx, settings }} /></Suspense>;
  }

  if (activeTab === "curve") {
    body = <Suspense fallback={<div className="tz-tab-loading" aria-hidden="true" />}><CurveTab {...{ backupMsg, calMonth, cancelEditTrade, cancelImport, clearTrades, confirmImport, copyFallbackText, copyMsg, copyWeekSummary, customMoods, customMoodsLoaded, customSetups, customSetupsLoaded, deleteTrade, editingTradeId, expandedTradeId, exportBackup, fileInputRef, findSetupLabel, generateWeeklyShare, goals, handleScreenshotChange, importBackup, isDesktop, logFormRef, openScreenshotPicker, pendingImport, persistGoals, persistSettings, persistStartingBalance, screenshotError, screenshotInputRef, screenshotSaving, screenshotTargetId, selectedDay, setCalMonth, setCopyFallbackText, setExpandedTradeId, setPendingScreenshotDelete, setSelectedDay, setShowDisciplineInfo, setShowStreakInfo, setStatementPeriod, setTradeEmotion, setTradeInput, setTradeNote, setTradePair, setTradeSetup, setViewingScreenshot, settings, shareError, shareImageFile, showDisciplineInfo, showStreakInfo, startEditTrade, startingBalance, submitTrade, tradeEmotion, tradeInput, tradeNote, tradePair, tradeSetup, trades, tradesLoadError, tradesLoaded }} /></Suspense>;
  }

  if (activeTab === "insights") {
    body = <Suspense fallback={<div className="tz-tab-loading" aria-hidden="true" />}><InsightsTab {...{ coachChatId, coachChats, coachChatsMax, coachDeleteConfirmId, coachError, coachHistoryOpen, coachInput, coachLoading, coachMessages, coachRemaining, coachScrollRef, customMoods, customSetups, deleteCoachChat, expandedHeatmapDay, expandedMetric, exportInsightsReport, insightReportMsg, insightsSubTab, isDesktop, journalEntries, journalInsightMonth, journalInsightYear, journalLoaded, newCoachChat, openCoachChat, persistSettings, renderSubNav, selectInsightsSubTab, sendCoachMessage, session, setCoachDeleteConfirmId, setCoachHistoryOpen, setCoachInput, setExpandedHeatmapDay, setExpandedMetric, setJournalInsightMonth, setJournalInsightYear, settings, trades }} /></Suspense>;
  }

  if (activeTab === "journal") {
    body = <Suspense fallback={<div className="tz-tab-loading" aria-hidden="true" />}><JournalTab {...{ NotepadTab, notepadProps: { activeNoteId, adjustNoteFontSize, closeNote, createNote, downloadNoteText, getNotepadBlockRef, insertDateTimeIntoNote, isDesktop, notepadFindOpen, notepadFindText, notepadLoaded, notepadMsg, notepadNotes, notepadReplaceText, notepadSearch, openNote, persistSettings, replaceAllInNote, requestDeleteNote, setNotepadFindOpen, setNotepadFindText, setNotepadMsg, setNotepadReplaceText, setNotepadSearch, settings, toggleNoteWordWrap, trackNotepadCursor, updateNote }, goals, persistGoals, startingBalance, trades, addJournalRow, addPlaybookRule, addingSetup, cancelAddSetup, confirmAddSetup, customMoods, customSetups, deleteJournalRow, deletePlaybookCheckin, endJournalResize, exportJournalCSV, handleJournalCellKeyDown, handleJournalPhotoChange, hiddenDefaultSetupIds, importJournalCSV, isDesktop, isNarrowScreen, journalCellRefs, journalColWidths, journalEntries, journalExpandedRows, journalExportMsg, journalImportInputRef, journalImportMsg, journalLoaded, journalMonth, journalPhotoError, journalPhotoInputRef, journalPhotoSaving, journalPhotoTarget, journalSubTab, journalYear, moveJournalResize, newRuleText, newSetupName, openJournalPhotoPicker, persistSettings, playbookCheckins, playbookMsg, playbookRuleError, playbookRules, playbookRulesLoaded, removePlaybookRule, renderSubNav, setJournalMonth, setJournalSubTab, setJournalYear, setNewRuleText, setNewSetupName, setPendingJournalPhotoDelete, setPlaybookRuleError, setSetupError, setViewingJournalPhoto, settings, setupError, startJournalResize, submitCheckin, todayResults, toggleJournalRowExpanded, toggleTodayResult, triggerJournalImport, updateJournalField, updateJournalPnl }} /></Suspense>;
  }

  if (activeTab === "backtest") {
    body = <Suspense fallback={<div className="tz-tab-loading" aria-hidden="true" />}><BacktestTab {...{ activeAccountId, isDesktop }} /></Suspense>;
  }

  if (activeTab === "broker") {
    body = <Suspense fallback={<div className="tz-tab-loading" aria-hidden="true" />}><BrokerTab {...{ isDesktop }} /></Suspense>;
  }

  if (activeTab === "sessions") {
    body = <Suspense fallback={<div className="tz-tab-loading" aria-hidden="true" />}><SessionsTab {...{ addNewsEvent, currentTime, deleteNewsEvent, econError, econEvents, econStatus, isDesktop, loadEconomicCalendar, newEventAlarm, newEventDate, newEventImpact, newEventName, newEventTime, newsEvents, newsLoadError, newsLoaded, notifPermission, persistSettings, renderSubNav, sessionsSubTab, setNewEventDate, setNewEventImpact, setNewEventName, setNewEventTime, setSessionsSubTab, settings, toggleNewEventAlarm }} /></Suspense>;
  }



if (activeTab === "community") {
    body = <Suspense fallback={<div className="tz-tab-loading" aria-hidden="true" />}><CommunityTab {...{ REACTION_EMOJIS, activeGroupId, addingGroup, advanceStory, answerGroupQuestion, askGroupQuestion, authorHasUnseen, avatarForAuthor, bioDraft, bioEditing, bioSaving, cancelStoryDraft, claimCommunityUsername, closeProfileBack, closeStoryViewer, commentDrafts, communityApiError, communityAvatar, communityAvatarUploading, communityChatSubView, communityFeedSubView, communityLobbyTab, communityMessagesEndRef, communityMobileFeedOpen, communityMsgText, communityPanelTab, communitySearch, communityUsername, communityUsernameBusy, communityUsernameDraft, communityUsernameError, createCommunityGroup, createCommunityPost, createFeedPost, createProfilePost, createStickerPack, createVaultItem, creatingGroup, deleteCommunityPost, deleteFeedComment, deleteFeedPost, deleteGroupQuestion, deleteProfileComment, deleteProfilePost, deleteSticker, deleteStickerPack, deleteStory, deleteVaultItem, deleteWallEntry, feedComments, feedCommentsLoading, feedCommentsOpenId, feedImageInputRef, feedImageUploading, fetchStickerPacks, followBusy, followListData, followListLoading, followListOpen, followListQuery, getCommunityMemberStats, globalFeed, globalFeedLoaded, groupAvatarMap, groupCodeError, groupFeed, groupFeedLoaded, groupInfo, groupMembersList, groupMessages, groupMessagesLoaded, groupPosts, groupPostsLoaded, groupQuestions, groupQuestionsLoaded, groupVault, groupVaultLoaded, groupWall, groupWallLoaded, handleCommunityAvatarChange, handleFeedImageChange, handlePostImageChange, handleProfilePostImageChange, handleStickerFileChange, handleStoryImageChange, isAuthorOnline, isDesktop, joinCodeError, joinCodeInput, joinGroupByCode, joiningGroup, leaderboardMetric, lightboxPost, likeGlobalFeedPost, likeProfilePost, likedFeedIds, loadGlobalFeed, loadMoreProfilePosts, myFeedReactions, myGroups, myStoryReactions, myWallIds, newFeedImage, newFeedPnl, newFeedText, newGroupCode, newGroupDesc, newGroupName, newGroupPublic, newGroupTags, newPostImage, newPostText, newQuestionText, newVaultText, newVaultTitle, newVaultUrl, newWallText, openCommunityMemberProfile, openFollowList, openGlobalFeedComments, openMyProfile, openSignalThread, openStoryComposer, openStoryViewerFor, openThreadId, pinCommunityMessage, pingTyping, pinnedMessageId, postFeedComment, postImageInputRef, postImageUploading, postProfileComment, postStory, postWallEntry, profileAvatarInputRef, profileCommentDraft, profileCommentInputRef, profileCommentSending, profileComments, profileCommentsLoading, profileComposerOpen, profileData, profileEmojiOpen, profileError, profileLoading, profileOpen, profilePostImage, profilePostImageInputRef, profilePostImageUploading, profilePostMenuOpen, profilePostOpen, profilePostSubmitting, profilePostText, profilePosts, profilePostsLoaded, profilePostsNext, profileSubTab, profileView, qaOpenId, qaReplyDrafts, reactionPickerFor, relateWallEntry, relatedWallIds, renderCommunitySearch, renderGlobalFeed, replyingTo, saveProfileBio, searchCommunity, sendCommunityMessage, sendSticker, sendThreadReply, setActiveGroupId, setAddingGroup, setBioDraft, setBioEditing, setCommentDrafts, setCommunityChatSubView, setCommunityFeedSubView, setCommunityLobbyTab, setCommunityMobileFeedOpen, setCommunityMsgText, setCommunityOpenTabDropdown, setCommunityPanelTab, setCommunitySearch, setCommunityUsernameDraft, setCommunityUsernameError, setFollowListOpen, setFollowListQuery, setGroupCodeError, setGroupManageOpen, setGroupManageTab, setJoinCodeError, setJoinCodeInput, setLeaderboardMetric, setLightboxPost, setManageDescDraft, setManageMsg, setManageNameDraft, setNewFeedImage, setNewFeedPnl, setNewFeedText, setNewGroupCode, setNewGroupDesc, setNewGroupName, setNewGroupPublic, setNewGroupTags, setNewPostImage, setNewPostText, setNewQuestionText, setNewVaultText, setNewVaultTitle, setNewVaultUrl, setNewWallText, setOpenThreadId, setPendingDeleteMsg, setProfileCommentDraft, setProfileComposerOpen, setProfileEmojiOpen, setProfilePostImage, setProfilePostMenuOpen, setProfilePostOpen, setProfilePostText, setProfileSubTab, setQaOpenId, setQaReplyDrafts, setReactionPickerFor, setReplyingTo, setSignalComposerOpen, setSignalDirection, setSignalEntry, setSignalPair, setSignalSL, setSignalStatsOpen, setSignalTP, setStickerActivePackId, setStickerManageMode, setStickerNewPackName, setStickerPickerOpen, setStoryCaption, setStoryPaused, setStoryViewer, setThreadDraft, shadowSignalToTrade, signalComposerOpen, signalDirection, signalEntry, signalPair, signalSL, signalStatsOpen, signalTP, stickerActivePackId, stickerError, stickerFileInputRef, stickerManageMode, stickerNewPackName, stickerPacks, stickerPacksLoaded, stickerPickerOpen, stickerUploading, storiesByAuthor, storyAuthorOrder, storyCaption, storyDraft, storyImageInputRef, storyPosting, storyProgressPct, storyViewer, threadDraft, threadLoading, threadReplies, toggleFeedComments, toggleFeedReaction, toggleFollowMember, toggleMessageReaction, toggleStoryReaction, typingUsers, unpinCommunityMessage, uploadProfilePostImage }} /></Suspense>;
  }
  // end community tab

  // While a tab switch is pending, keep showing the exact same screen element (React skips re-rendering it),
  // so the tap itself stays cheap; the new tab is rendered right after in the background.
  if (pendingTab !== null && pendingTab !== activeTab && lastBodyRef.current && lastBodyRef.current.tab === activeTab) {
    body = lastBodyRef.current.el;
  } else {
    lastBodyRef.current = { tab: activeTab, el: body };
  }

  return (
    <div
      className="w-full flex justify-center"
      style={{
        background: palette.letterbox,
        height: "100dvh",
        opacity: themeLoaded ? 1 : 0,
        transition: `opacity 0.15s ease-out, ${THEME_TRANSITION}`,
      }}
    >
      <BrokerSyncRunner accountId={activeAccountId} importTrades={importBrokerTrades} />
<style>{`
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap');

  html, body, * { font-variant-numeric: normal; font-feature-settings: "zero" 0, "ss01" 0, "ss02" 0, "salt" 0; }

  * { -webkit-tap-highlight-color: transparent; }
  html, body { -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; overscroll-behavior-y: none; scroll-behavior: smooth; }
  main, div { -webkit-overflow-scrolling: touch; scrollbar-width: thin; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-thumb { background: ${palette.border}; border-radius: 999px; }
  ::-webkit-scrollbar-track { background: transparent; }
  input, select, textarea, button { font-family: inherit; }
  button { -webkit-appearance: none; }

  @media (prefers-reduced-motion: no-preference) {
    .ticker-glow { animation: pulse 3.2s ease-in-out infinite; }
  }

        @media (prefers-reduced-motion: no-preference) {
  	.flame-flicker {
   	  animation: flameFlicker 1.8s ease-in-out infinite;
   	   transform-origin: 50% 90%;
  	 }
	}
	  @keyframes flameFlicker {
    	  0%   { transform: scale(1) rotate(0deg); opacity: 1; }
  	  20%  { transform: scale(1.08, 0.95) rotate(-2deg); opacity: 0.92; }
  	  40%  { transform: scale(0.96, 1.05) rotate(2deg); opacity: 1; }
  	  60%  { transform: scale(1.05, 0.97) rotate(-1deg); opacity: 0.95; }
  	  80%  { transform: scale(0.98, 1.03) rotate(1deg); opacity: 1; }
  	  100% { transform: scale(1) rotate(0deg); opacity: 1; }
	}
        @keyframes pulse {
          0%, 100% { filter: drop-shadow(0 0 0px rgba(0,0,0,0)); }
          50% { filter: drop-shadow(0 0 8px var(--glow, rgba(231,198,135,0.28))); }
        }
        @media (prefers-reduced-motion: no-preference) {
          .alarm-ring { animation: alarmPulse 1s ease-in-out infinite; }
        }
        @keyframes alarmPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.96) translateY(6px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes ledgerPageIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes navIndicatorIn {
  from {
    opacity: 0;
    transform: scaleY(0.35);
  }
  to {
    opacity: 1;
    transform: scaleY(1);
  }
}

@keyframes navDotIn {
  from {
    opacity: 0;
    transform: scale(0.4);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.ledger-page-transition {
  animation: ledgerPageIn 0.22s cubic-bezier(0.22, 1, 0.36, 1);
  transform-origin: top center;
}

.ledger-nav-item {
  position: relative;
  overflow: visible;
  will-change: transform;
  transition:
    transform 0.18s cubic-bezier(0.22, 1, 0.36, 1),
    background 0.18s ease,
    color 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease;
}

.ledger-nav-item:hover {
  transform: translateX(2px);
}

.ledger-nav-item:active {
  transform: scale(0.97);
}

.ledger-dock-scroll {
  overflow-x: auto;
  contain: layout style;
  position: relative;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-x: contain;
  -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 12px, #000 calc(100% - 12px), transparent 100%);
  mask-image: linear-gradient(90deg, transparent 0, #000 12px, #000 calc(100% - 12px), transparent 100%);
}
.ledger-dock-scroll::-webkit-scrollbar { display: none; }
.ledger-dock-item { position: relative; z-index: 1; }
.ledger-dock-pill { position: absolute; left: 0; top: 0; width: 0; height: 0; border-radius: 999px; pointer-events: none; z-index: 0; opacity: 0; }
.ledger-dock-item:hover { transform: none; }
.ledger-seg-thumb { transition: transform 0.32s cubic-bezier(0.22, 1, 0.36, 1); will-change: transform; }
@media (prefers-reduced-motion: reduce) { .ledger-seg-thumb { transition: none !important; } }

/* Mobile tab switch: content slides in from the side you are moving towards */
@keyframes tabEnterFwd {
  from { opacity: 0; transform: translate3d(28px, 0, 0); }
  to   { opacity: 1; transform: translate3d(0, 0, 0); }
}
@keyframes tabEnterBack {
  from { opacity: 0; transform: translate3d(-28px, 0, 0); }
  to   { opacity: 1; transform: translate3d(0, 0, 0); }
}
@keyframes tabFadeOnly {
  from { opacity: 0; }
  to   { opacity: 1; }
}
/* "backwards" (not "both"): once finished no transform is left on the wrapper,
   so position:fixed sheets/modals inside tabs are not trapped by it. */
.ledger-tab-enter-fwd  { animation: tabEnterFwd 0.3s cubic-bezier(0.22, 1, 0.36, 1) backwards }
.ledger-tab-enter-back { animation: tabEnterBack 0.3s cubic-bezier(0.22, 1, 0.36, 1) backwards }

/* Dock pill: label unfolds and icon pops when a tab becomes active */
@keyframes dockIconPop {
  0%   { transform: scale(0.7); }
  60%  { transform: scale(1.18); }
  100% { transform: scale(1); }
}
/* Label accordion: collapses/expands to its natural width (no hard-coded max-width). */
.ledger-dock-label {
  display: grid;
  grid-template-columns: 0fr;
  opacity: 0;
  transition: grid-template-columns 0.32s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.22s ease;
}
.ledger-dock-label[data-open="true"] { grid-template-columns: 1fr; opacity: 1; }
.ledger-dock-label-clip { overflow: hidden; min-width: 0; }
.ledger-dock-label-text { display: block; white-space: nowrap; padding-left: 8px; }
.ledger-dock-item[data-dock-active="true"] svg {
  animation: dockIconPop 0.38s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@media (prefers-reduced-motion: reduce) {
  .ledger-tab-enter-fwd,
  .ledger-tab-enter-back { animation: tabFadeOnly 0.2s ease-out backwards !important; }
  .ledger-dock-label { transition: none !important; }
  .ledger-dock-item[data-dock-active="true"] svg { animation: none !important; }
}

.ledger-nav-dot {
  animation: navDotIn 0.22s cubic-bezier(0.22, 1, 0.36, 1);
}

.ledger-nav-indicator {
  animation: navIndicatorIn 0.22s cubic-bezier(0.22, 1, 0.36, 1);
  transform-origin: center;
}

@media (prefers-reduced-motion: reduce) {
  .ledger-page-transition,
  .ledger-nav-dot,
  .ledger-nav-indicator {
    animation: none !important;
  }

  .ledger-nav-item {
    transition: none !important;
  }
}
        .modal-in { animation: modalIn 0.18s ease-out; }
        @keyframes sheetUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .sheet-in { animation: sheetUp 0.2s ease-out; }
        input:focus, select:focus, textarea:focus { outline: none; }
        select option { background: ${palette.field}; }
        .journal-row-date-input::-webkit-calendar-picker-indicator { display: none; -webkit-appearance: none; }
        @media print {
          body * { visibility: hidden; }
          #ledger-statement, #ledger-statement * { visibility: visible; }
          .statement-print-wrapper {
            position: static !important;
            overflow: visible !important;
            background: none !important;
            display: block !important;
          }
          #ledger-statement {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          #ledger-statement * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          .statement-no-print { display: none !important; }
        }

      `}</style>
      <div
        className="w-full flex flex-col md:flex-row"
        style={{
          maxWidth: isDesktop ? "100%" : isTablet ? "760px" : "440px",
          height: "100%",
          background: palette.bg,
          fontFamily: sans,
          overflow: "hidden",
          border: "none",
          boxShadow: "none",
          transition: THEME_TRANSITION,
        }}
      >
        <div className="flex flex-col flex-1" style={{ minWidth: 0, minHeight: 0, overflow: "hidden" }}>

        {!(!isDesktop && activeTab === "community" && (!!activeGroupId || communityMobileFeedOpen)) && (
        <header
          className={isDesktop ? "px-8 flex-shrink-0 flex items-center justify-between" : "px-5 pt-2.5 pb-2 flex-shrink-0 flex items-center justify-between"}
          style={{ height: isDesktop ? "76px" : "auto", borderBottom: isDesktop ? "none" : `1px solid ${palette.border}`, transition: THEME_TRANSITION }}
        >
          <div style={{ marginLeft: isDesktop ? "8px" : 0 }}>
            {isDesktop ? (
              <div className="flex items-center gap-3">
                 <div
                   className="flex items-center justify-center rounded-xl"
                   style={{
                   width: "36px",
                   height: "36px",
                   background: palette.gold,
                   boxShadow: `0 3px 10px ${palette.gold}44`,
                    }}
                   >
                   <ActiveTabIcon size={18} style={{ color: palette.letterbox }} strokeWidth={2.2} />
                 </div>
                <div>
<div
  style={{
    fontFamily: display,
    fontSize: "17px",
    fontWeight: 700,
    color: palette.text,
    letterSpacing: "0.02em",
    lineHeight: 1.1,
  }}
>
  Tredzi
</div>
                  <div className="uppercase" style={{ fontFamily: mono, color: palette.textFaint, letterSpacing: "0.09em", fontSize: "10.5px", fontWeight: 600, lineHeight: 1 }}>
                    Trade Math Calculator
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <span
                  className="flex items-center justify-center rounded-xl flex-shrink-0"
                  style={{
                    width: "34px",
                    height: "34px",
                    background: palette.gold,
                    boxShadow: `0 3px 10px ${palette.gold}44`,
                  }}
                >
                  <ActiveTabIcon size={17} style={{ color: palette.letterbox }} strokeWidth={2.2} />
                </span>
                <div>
<h1
  style={{
    fontFamily: display,
    fontSize: "1.2rem",
    fontWeight: 700,
    color: palette.text,
    letterSpacing: "0.01em",
    lineHeight: 1.15,
    transition: THEME_TRANSITION,
  }}
>
  {TABS.find((t) => t.id === dockTab)?.label || "Tredzi"}
</h1>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle light/dark mode"
              className={`flex items-center justify-center rounded-full flex-shrink-0 ${TAP}`}
              style={{
                width: isDesktop ? "38px" : "34px",
                height: isDesktop ? "38px" : "34px",
                background: palette.field,
                border: `1px solid ${palette.border}`,
                color: palette.gold,
                boxShadow: palette.shadow,
                transition: `${THEME_TRANSITION}, transform 0.15s ease`,
              }}
            >
              {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            <button
              type="button"
	      data-tour-id="settings-btn"
              onClick={() => setSettingsOpen(true)}
              aria-label="Open settings"
              className={`flex items-center justify-center rounded-full flex-shrink-0 ${TAP}`}
              style={{
                width: isDesktop ? "38px" : "34px",
                height: isDesktop ? "38px" : "34px",
                background: palette.field,
                border: `1px solid ${palette.border}`,
                color: palette.textMuted,
                boxShadow: palette.shadow,
                transition: `${THEME_TRANSITION}, transform 0.15s ease`,
              }}
            >
              <Settings size={17} />
            </button>
          </div>
        </header>
        )}

        {settings.mascotEnabled !== false && !(!isDesktop && activeTab === "community" && (!!activeGroupId || communityMobileFeedOpen)) && (
          <div
            style={{
              position: "fixed",
              right: isDesktop ? "20px" : "10px",
              bottom: isDesktop ? "20px" : "calc(92px + env(safe-area-inset-bottom, 0px))",
              zIndex: 40,
            }}
          >
            <CrabMascot size={isDesktop ? 84 : 62} rest={crabRest} />
          </div>
        )}

        {(() => {
          const communityFullBleed = activeTab === "community" && (isDesktop || !!activeGroupId);
          // Insights > Coach is a fixed screen: the page does not scroll, only the chat's message list does.
          const coachFixed = !tourActive && activeTab === "insights" && insightsSubTab === "coach";
          const coachFillStyle = coachFixed ? { flex: "1 1 auto", minHeight: 0, display: "flex", flexDirection: "column" } : null;
          // Tabs whose first element is the sticky sub-tab bar start flush at the top, so the bar never slides up on scroll.
          const startsWithSubNav = ["risk", "journal", "sessions", "insights"].includes(activeTab);
          return (
<main
  key={activeTab}
  onScroll={communityFullBleed ? undefined : handleMobileNavScroll}
  className={`${tourActive || (!isDesktop && !communityFullBleed) ? "" : "ledger-page-transition"} ${tourActive || communityFullBleed ? "" : "tz-stagger"} ${
    communityFullBleed
      ? (isDesktop ? "" : "px-0")
      : (isDesktop ? "px-8 pt-0 pb-6" : "px-5 pt-0 pb-5")
  }`}
              style={{
                flex: "1 1 auto",
                minHeight: 0,
                overflowY: communityFullBleed || coachFixed ? "hidden" : "auto",
                overflowX: communityFullBleed ? undefined : "hidden",
                WebkitOverflowScrolling: "touch",
                overscrollBehavior: "contain",
                display: communityFullBleed || coachFixed ? "flex" : "block",
                flexDirection: "column",
                paddingLeft: communityFullBleed && isDesktop ? "12px" : undefined,
                paddingRight: communityFullBleed && isDesktop ? "12px" : undefined,
                paddingTop: communityFullBleed ? (isDesktop ? "2px" : 0) : undefined,
                paddingBottom: communityFullBleed ? (isDesktop ? "6px" : MOBILE_NAV_SPACE) : (!isDesktop ? MOBILE_NAV_SPACE : undefined),
              }}
            >
              {communityFullBleed ? (
                body
              ) : !isDesktop ? (
                <div
                  className={tourActive ? undefined : tabDirRef.current.dir < 0 ? "ledger-tab-enter-back" : "ledger-tab-enter-fwd"}
                  style={{ paddingTop: startsWithSubNav ? "0px" : "20px", ...coachFillStyle }}
                >
                  {body}
                </div>
              ) : (
                <div style={{ width: "100%", maxWidth: "1400px", margin: "0 auto", paddingTop: startsWithSubNav ? "0px" : "24px", ...coachFillStyle }}>
                  {body}
                </div>
              )}
            </main>
          );
        })()}
        </div>


        <nav
          className={isDesktop ? "flex flex-col order-first" : "flex items-stretch"}
          style={{
            flexShrink: 0,
            border: isDesktop ? "none" : `1px solid ${palette.border}`,
            borderRadius: isDesktop ? undefined : "999px",
            background: isDesktop
              ? palette.surface
              : `${palette.surface}F2`,
            backdropFilter: isDesktop ? undefined : "blur(10px)",
            WebkitBackdropFilter: isDesktop ? undefined : "blur(10px)",
            boxShadow: isDesktop ? palette.navShadow : "0 8px 24px rgba(0,0,0,0.35)",
            paddingBottom: isDesktop ? "20px" : 0,
            paddingTop: isDesktop ? 0 : 0,
            width: isDesktop ? "252px" : "auto",
            height: isDesktop ? "100%" : "auto",
            overflowY: isDesktop ? "auto" : "visible",
            overflowX: "hidden",
            position: isDesktop ? "static" : "fixed",
            left: isDesktop ? "auto" : "12px",
            right: isDesktop ? "auto" : "12px",
            bottom: isDesktop ? "auto" : "calc(12px + env(safe-area-inset-bottom, 0px))",
            zIndex: isDesktop ? "auto" : 60,
            transform: isDesktop ? "none" : mobileNavHidden ? "translateY(calc(100% + 32px))" : "translateY(0)",
            transition: `${THEME_TRANSITION}, transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)`,
          }}
        >
          <div ref={dockRef} className={isDesktop ? "flex flex-col px-4 pt-6 gap-1" : "ledger-dock-scroll flex flex-1 items-center gap-1 p-1.5"}>
          {isDesktop && (
            <div
              className="uppercase mb-2 px-2"
              style={{ color: palette.textFaint, letterSpacing: "0.14em", fontSize: "10px", fontWeight: 700 }}
            >
              Navigate
            </div>
          )}


{(isDesktop ? navTabs : [...mobileNavPrimaryTabs, ...mobileNavOverflowTabs]).map((tab) => {
  const Icon = tab.icon;
  const active = dockTab === tab.id;

  return (
    <div
      key={tab.id}
      className={isDesktop ? "flex relative" : "flex flex-shrink-0 items-stretch"}
    >
      {isDesktop && active && (
        <span
          className="ledger-nav-indicator"
          style={{
            position: "absolute",
            left: "-16px",
            top: "8px",
            bottom: "8px",
            width: "3px",
            borderRadius: "0 3px 3px 0",
            background: palette.gold,
            boxShadow: `0 0 12px ${palette.gold}55`,
          }}
        />
      )}

      <button
        type="button"
        data-tour-id={`tab-${tab.id}`}
        data-dock-active={!isDesktop && active ? "true" : undefined}
        aria-label={tab.label}
        aria-current={active ? "page" : undefined}
        onPointerDown={() => { try { TAB_PRELOAD[tab.id]?.().catch(() => {}); } catch (e) { /* ignore */ } }}
        onClick={() => {
          goToTab(tab.id);
          setMoreMenuOpen(false);
        }}
        className={
          isDesktop
            ? `ledger-nav-item w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl ${TAP}`
            : `ledger-nav-item ledger-dock-item flex flex-row items-center justify-center px-4 py-3 ${TAP}`
        }
        style={{
          color: active ? palette.goldBright : palette.textMuted,
          background: active ? `${palette.gold}16` : "transparent",
          borderRadius: isDesktop ? "10px" : "999px",
          border: isDesktop
            ? `1px solid ${active ? `${palette.gold}3A` : "transparent"}`
            : "none",
          boxShadow: isDesktop && active
            ? `0 2px 10px ${palette.gold}22`
            : "none",
          transition: isDesktop
            ? `${THEME_TRANSITION}, transform 0.15s ease, background 0.15s ease`
            : "background-color 0.3s cubic-bezier(0.22, 1, 0.36, 1), color 0.2s ease, transform 0.15s ease",
        }}
      >
        <span className={isDesktop ? "flex items-center gap-3 min-w-0" : "contents"}>
          <span
            className="flex items-center justify-center flex-shrink-0 relative"
            style={{
              width: isDesktop ? "30px" : "auto",
              height: isDesktop ? "30px" : "auto",
              borderRadius: isDesktop ? "9px" : 0,
              background: isDesktop && active
                ? `${palette.gold}20`
                : "transparent",
            }}
          >
            <Icon
              size={isDesktop ? 17 : 20}
              strokeWidth={active ? 2.4 : 1.8}
            />
          </span>

          {isDesktop ? (
            <span className="whitespace-nowrap" style={{ fontSize: "14px", letterSpacing: "0.02em", fontWeight: 600 }}>
              {tab.label}
            </span>
          ) : (
            <span className="ledger-dock-label" data-open={active ? "true" : "false"} aria-hidden="true">
              <span className="ledger-dock-label-clip">
                <span className="ledger-dock-label-text" style={{ fontSize: "12.5px", letterSpacing: "0.02em", fontWeight: 600 }}>
                  {tab.label}
                </span>
              </span>
            </span>
          )}
        </span>

        {isDesktop && (
          <ChevronRight
            size={14}
            strokeWidth={2.2}
            className="flex-shrink-0"
            style={{ color: palette.gold, opacity: active ? 0.75 : 0 }}
          />
        )}
      </button>
    </div>
  );
})}

</div>

{isDesktop && <div style={{ flex: "1 1 auto", minHeight: "12px" }} />}

{isDesktop && (() => {
            const pulseTodayKey = dayKeyFromDate(new Date());
            const pulseTodayTrades = trades.filter((t) => dayKeyFromTs(t.ts) === pulseTodayKey);
            const pulseTodayNet = pulseTodayTrades.reduce((s, t) => s + t.pnl, 0);
            const { current: pulseStreak } = computeDisciplineStreak(trades);
            const pulseHasTrades = trades.length > 0;
            const pulseIsProfitable = pulseTodayTrades.length > 0 && pulseTodayNet > 0;
	    const pulseFlameActive = pulseIsProfitable || pulseStreak > 0;
            return (
              <button
                type="button"
                onClick={() => setPulseOpen(true)}
                className={`mx-4 mb-1 rounded-xl px-3.5 py-3 text-left ${TAP}`}
                style={{
                  background: `${palette.gold}12`,
                  border: `1px solid ${palette.gold}2A`,
                  boxShadow: palette.shadow,
                  cursor: "pointer",
                }}
              >
                <div
                  className="flex items-center justify-between mb-2"
                  style={{ fontFamily: mono, fontSize: "10px", color: palette.gold, letterSpacing: "0.08em", fontWeight: 700 }}
                >
                  <span className="flex items-center gap-1.5">
                      <LiveFlame size={30} active={pulseFlameActive} dimColor={palette.textFaint} style={{ margin: "-10px -3px -8px -3px" }} />
                    TODAY'S PULSE
                  </span>
                  <ChevronRight size={12} style={{ color: palette.gold, opacity: 0.7 }} />
                </div>
                {pulseHasTrades ? (
                  <>
                    <div className="flex items-center justify-between mb-1.5">
                      <span style={{ fontSize: "11px", color: palette.textFaint }}>Net today</span>
                      <span
                        style={{
                          fontFamily: mono,
                          fontSize: "12px",
                          fontWeight: 600,
                          color: pulseTodayTrades.length
                            ? pulseTodayNet >= 0
                              ? palette.green
                              : palette.red
                            : palette.textFaint,
                        }}
                      >
                        {pulseTodayTrades.length ? `${pulseTodayNet >= 0 ? "+" : "-"}$${fmtMoney(pulseTodayNet)}` : "No trades yet"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span style={{ fontSize: "11px", color: palette.textFaint }}>Discipline streak</span>
                      <span
                        style={{
                          fontFamily: mono,
                          fontSize: "12px",
                          fontWeight: 600,
                          color: pulseStreak > 0 ? palette.gold : palette.textFaint,
                        }}
                      >
                        {pulseStreak} day{pulseStreak === 1 ? "" : "s"}
                      </span>
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: "11px", color: palette.textFaint }}>
                    Log your first trade to start tracking your pulse.
                  </div>
                )}
              </button>
            );
          })()}
        </nav>
      </div>

      <canvas ref={shareCanvasRef} style={{ display: "none" }} />

      {moreMenuOpen && (
        <div
          className="fixed inset-0 flex items-end justify-center"
          style={{ zIndex: 70, background: "rgba(5,7,12,0.75)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
          onClick={() => setMoreMenuOpen(false)}
        >
          <div
            className="w-full sheet-in flex flex-col"
            style={{
              maxWidth: "440px",
              maxHeight: "calc(80vh - env(safe-area-inset-bottom, 0px))",
              background: palette.surface,
              border: `1px solid ${palette.border}`,
              borderTopLeftRadius: "22px",
              borderTopRightRadius: "22px",
              boxShadow: palette.shadow,
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <span style={{ width: "36px", height: "4px", borderRadius: "999px", background: palette.border }} />
            </div>
            <div className="flex items-center justify-between px-5 pt-2 pb-3 flex-shrink-0">
              <span style={{ fontFamily: display, fontSize: "15px", fontWeight: 700, color: palette.text }}>
                More
              </span>
              <button
                type="button"
                onClick={() => setMoreMenuOpen(false)}
                className={`flex items-center justify-center rounded-full ${TAP}`}
                style={{ width: "30px", height: "30px", color: palette.textFaint, background: palette.field, border: `1px solid ${palette.border}` }}
                aria-label="Close"
              >
                <X size={15} />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2 px-4 pb-6" style={{ overflowY: "auto" }}>
              {mobileNavOverflowTabs.map((tab) => {
                const Icon = tab.icon;
                const active = dockTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      goToTab(tab.id);
                      setMoreMenuOpen(false);
                    }}
                    className={`flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-xl ${TAP}`}
                    style={{
                      background: active ? `${palette.gold}16` : palette.field,
                      border: `1px solid ${active ? palette.gold : palette.border}`,
                      color: active ? palette.goldBright : palette.textMuted,
                    }}
                  >
                    <Icon size={19} strokeWidth={active ? 2.4 : 1.8} />
                    <span style={{ fontSize: "10.5px", fontWeight: active ? 600 : 400 }}>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

{settingsOpen && (() => {
  const settingsCategories = [
    communityUsername && { id: "profile", label: "Profile", icon: Users, group: "Account", subtitle: "Avatar, email, password" },
    { id: "accounts", label: "Accounts", icon: Building2, group: "Account", subtitle: "Balances & active account" },
    session && !communityUsername && { id: "community", label: "Community", icon: Users, group: "Account", subtitle: "Public profile & handle" },
    { id: "appearance", label: "Appearance", icon: Palette, group: "Preferences", subtitle: "Theme & color palette" },
    { id: "navigation", label: "Navigation", icon: LayoutGrid, group: "Preferences", subtitle: "Tabs & default screens" },
    { id: "trading-defaults", label: "Trading Defaults", icon: Scale, group: "Trading", subtitle: "Balance, period, sizing" },
    { id: "risk-discipline", label: "Risk & Discipline", icon: ShieldAlert, group: "Trading", subtitle: "Cooldowns & daily limits" },
    { id: "custom-tags", label: "Custom Tags", icon: Tags, group: "Trading", subtitle: "Setup & mood tags" },
    { id: "notifications", label: "Notifications", icon: Bell, group: "Data & Alerts", subtitle: "News alarm lead time" },
    { id: "sharing-reports", label: "Sharing & Reports", icon: Share2, group: "Data & Alerts", subtitle: "Share card & trader alias" },
    { id: "journal-data", label: "Journal & Data", icon: Table2, group: "Data & Alerts", subtitle: "Heatmap range & layout" },
    { id: "backup", label: "Full Backup", icon: Download, group: "Data & Alerts", subtitle: "Export everything" },
    { id: "help-tips", label: "Help & Tips", icon: Lightbulb, group: "Support", subtitle: "Guides & onboarding tour" },
    { id: "danger-zone", label: "Danger Zone", icon: AlertTriangle, danger: true, group: "Danger Zone", subtitle: "Reset settings to defaults" },
  ].filter(Boolean);
  const mobileListMode = !isDesktop && !settingsMobileSection;
  const activeCategory = settingsCategories.find((c) => c.id === settingsMobileSection);
  const settingsGroupOrder = ["Account", "Preferences", "Trading", "Data & Alerts", "Support", "Danger Zone"];
  const settingsGroups = settingsGroupOrder
    .map((name) => ({ name, items: settingsCategories.filter((c) => c.group === name) }))
    .filter((g) => g.items.length > 0);
  return (
  <div
    className="fixed inset-0 z-50 flex flex-col"
    style={{ background: palette.bg, transition: THEME_TRANSITION }}
  >
    <div
      className={isDesktop ? "flex items-center justify-between px-8 flex-shrink-0" : "flex items-center justify-between px-5 pt-4 pb-3 flex-shrink-0"}
      style={{
        height: isDesktop ? "76px" : "auto",
        borderBottom: `1px solid ${palette.border}`,
        background: palette.surface,
        boxShadow: palette.shadow,
        transition: THEME_TRANSITION,
        zIndex: 2,
      }}
    >
      <div className="flex items-center gap-2.5">
        {!isDesktop && activeCategory ? (
          <button
            type="button"
            onClick={() => setSettingsMobileSection(null)}
            className={`flex items-center justify-center rounded-full flex-shrink-0 ${TAP}`}
            style={{ width: "34px", height: "34px", color: palette.textMuted, background: palette.field, border: `1px solid ${palette.border}` }}
            aria-label="Back to Settings"
          >
            <ChevronLeft size={18} />
          </button>
        ) : (
          <span
            className="flex items-center justify-center rounded-xl flex-shrink-0"
            style={{
              width: isDesktop ? "38px" : "34px",
              height: isDesktop ? "38px" : "34px",
              background: palette.gold,
              boxShadow: `0 3px 10px ${palette.gold}44`,
            }}
          >
            <Settings size={isDesktop ? 18 : 16} style={{ color: palette.letterbox }} strokeWidth={2.3} />
          </span>
        )}
        <div>
<div style={{ fontFamily: display, fontSize: isDesktop ? "17px" : "15px", fontWeight: 700, color: palette.text, lineHeight: 1.15 }}>
  {!isDesktop && activeCategory ? activeCategory.label : "Settings"}
</div>
          <div
            className="uppercase"
            style={{ fontFamily: mono, fontSize: "10px", color: palette.textFaint, letterSpacing: "0.09em" }}
          >
            {!isDesktop && activeCategory ? "Settings" : "Customize Tredzi"}
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => { setSettingsOpen(false); setSettingsMobileSection(null); setSettingsSearchQuery(""); }}
        className={`flex items-center justify-center rounded-full flex-shrink-0 ${TAP}`}
        style={{ width: "38px", height: "38px", color: palette.textMuted, background: palette.field, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
        aria-label="Close settings"
      >
        <X size={17} />
      </button>
    </div>

    <div className="flex-1 sheet-in" style={{ overflowY: "auto", background: palette.bg }}>
      <div
        className="mx-auto"
        style={{
          maxWidth: isDesktop ? "1080px" : "100%",
          padding: isDesktop ? "28px 32px 56px" : "16px 16px 32px",
        }}
      >
        {mobileListMode && (
          <div className="flex flex-col">
            <div
              className="flex items-center gap-2 rounded-xl px-3.5 mb-5"
              style={{ height: "40px", background: palette.field, border: `1px solid ${palette.border}` }}
            >
              <Search size={15} style={{ color: palette.textFaint, flexShrink: 0 }} />
              <input
                value={settingsSearchQuery}
                onChange={(e) => setSettingsSearchQuery(e.target.value)}
                placeholder="Search settings"
                className="flex-1 bg-transparent outline-none"
                style={{ color: palette.text, fontSize: "13.5px" }}
              />
              {settingsSearchQuery && (
                <button type="button" onClick={() => setSettingsSearchQuery("")} className={TAP} style={{ color: palette.textFaint }} aria-label="Clear search">
                  <X size={14} />
                </button>
              )}
            </div>

            {settingsGroups.map(({ name, items }) => {
              const filteredItems = items.filter((cat) => {
                const q = settingsSearchQuery.trim().toLowerCase();
                if (!q) return true;
                return cat.label.toLowerCase().includes(q) || (cat.subtitle || "").toLowerCase().includes(q);
              });
              if (filteredItems.length === 0) return null;
              return (
                <div key={name} className="mb-6">
                  <div
                    className="uppercase mb-2 px-1"
                    style={{
                      fontFamily: mono,
                      fontSize: "10.5px",
                      fontWeight: 600,
                      letterSpacing: "0.08em",
                      color: name === "Danger Zone" ? palette.red : palette.textFaint,
                    }}
                  >
                    {name}
                  </div>
                  <div
                    className="rounded-xl overflow-hidden"
                    style={{
                      background: palette.field,
                      border: `1px solid ${name === "Danger Zone" ? `${palette.red}45` : palette.border}`,
                    }}
                  >
                    {filteredItems.map((cat, i) => {
                      const CatIcon = cat.icon;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSettingsMobileSection(cat.id)}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left ${TAP}`}
                          style={{
                            background: "transparent",
                            borderTop: i === 0 ? "none" : `1px solid ${palette.border}`,
                          }}
                        >
                          <span
                            className="flex items-center justify-center rounded-lg flex-shrink-0"
                            style={{
                              width: "30px",
                              height: "30px",
                              background: `${cat.danger ? palette.red : palette.gold}1E`,
                              color: cat.danger ? palette.red : palette.gold,
                            }}
                          >
                            <CatIcon size={14} strokeWidth={2.2} />
                          </span>
                          <span className="flex-1 min-w-0">
                            <span
                              className="block truncate"
                              style={{
                                fontFamily: display,
                                fontSize: "13.5px",
                                fontWeight: 600,
                                color: cat.danger ? palette.red : palette.text,
                              }}
                            >
                              {cat.label}
                            </span>
                            {cat.subtitle && (
                              <span className="block truncate" style={{ fontSize: "11px", color: palette.textFaint, marginTop: "1px" }}>
                                {cat.subtitle}
                              </span>
                            )}
                          </span>
                          <ChevronRight size={15} style={{ color: palette.textFaint, flexShrink: 0 }} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div style={{ display: mobileListMode ? "none" : "block" }}>
        <div className={isDesktop ? "flex items-start" : ""} style={isDesktop ? { gap: "20px" } : {}}>
        <div className={isDesktop ? "flex flex-col" : ""} style={isDesktop ? { flex: "0 0 340px", minWidth: 0, position: "sticky", top: 0 } : {}}>
        {/* PROFILE */}
        {communityUsername && (
          <SettingsSection icon={Users} title="Profile" defaultOpen isDesktop={isDesktop} hidden={!isDesktop && settingsMobileSection !== "profile"}>
            <div
              className="flex items-center gap-3 rounded-xl px-3 py-3 mb-3"
              style={{ background: palette.field, border: `1px solid ${palette.border}` }}
            >
              <div className="relative flex-shrink-0">
                <Avatar name={communityUsername} size={52} ring src={communityAvatar} />
                <label
                  htmlFor="profile-avatar-input"
                  className={`absolute flex items-center justify-center rounded-full ${TAP}`}
                  style={{
                    width: "22px",
                    height: "22px",
                    bottom: "-2px",
                    right: "-2px",
                    background: palette.gold,
                    color: palette.letterbox,
                    border: `2px solid ${palette.field}`,
                    cursor: communityAvatarUploading ? "default" : "pointer",
                    opacity: communityAvatarUploading ? 0.6 : 1,
                  }}
                  aria-label="Change profile picture"
                >
                  <Camera size={11} />
                </label>
                <input
                  id="profile-avatar-input"
                  type="file"
                  accept="image/*"
                  onChange={handleCommunityAvatarChange}
                  disabled={communityAvatarUploading}
                  style={{ display: "none" }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <div className="truncate" style={{ color: palette.text, fontSize: "14px", fontWeight: 700 }}>
                    {communityUsername}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCommunityUsernameDraft(communityUsername);
                      setCommunityUsernameError("");
                      persistCommunityUsername("");
                      setActiveTab("community");
                      setSettingsOpen(false);
                    }}
                    className={`flex items-center justify-center rounded-lg flex-shrink-0 ${TAP}`}
                    style={{ width: "22px", height: "22px", background: palette.surface, border: `1px solid ${palette.border}`, color: palette.textMuted }}
                    aria-label="Edit name"
                  >
                    <Pencil size={10} />
                  </button>
                </div>
                <div style={{ color: palette.textFaint, fontSize: "11px", fontFamily: mono }}>
                  {myGroups.length} group{myGroups.length === 1 ? "" : "s"}
                  {communityAvatarUploading ? " · uploading photo…" : ""}
                </div>
              </div>
            </div>

            {session?.email && (
              <>
                <SettingsSubLabel>Email</SettingsSubLabel>
                <div
                  className="rounded-lg px-3 py-2.5 mb-3"
                  style={{ background: palette.surface, border: `1px solid ${palette.border}`, color: palette.textMuted, fontFamily: mono, fontSize: "12px" }}
                >
                  {session.email}
                </div>
              </>
            )}

            <SettingsSubLabel>Password</SettingsSubLabel>
            <div
              className="flex items-center justify-between gap-2 rounded-lg px-3 py-2.5"
              style={{ background: palette.surface, border: `1px solid ${palette.border}` }}
            >
              <span style={{ color: palette.text, fontFamily: mono, fontSize: "13px", letterSpacing: "0.1em" }}>••••••••</span>
              <button
                type="button"
                onClick={() => { setShowChangePassword((v) => !v); setChangePasswordError(""); setChangePasswordMsg(""); }}
                className={TAP}
                style={{ color: palette.gold, fontFamily: mono, fontSize: "11px", fontWeight: 700 }}
              >
                {showChangePassword ? "Cancel" : "Change"}
              </button>
            </div>
            <p className="text-xs mt-1.5" style={{ color: palette.textFaint }}>
              For your security, we never store or show your actual password — only you know it.
            </p>

            {showChangePassword && (
              <div className="rounded-xl p-3 mt-2" style={{ background: palette.field, border: `1px solid ${palette.gold}55` }}>
                <input
                  type="password"
                  value={currentPasswordInput}
                  onChange={(e) => setCurrentPasswordInput(e.target.value)}
                  placeholder="Current password"
                  className="w-full rounded-lg px-2.5 py-2 mb-1.5 bg-transparent outline-none"
                  style={{ background: palette.surface, border: `1px solid ${palette.border}`, color: palette.text, fontFamily: mono, fontSize: "12.5px" }}
                />
                <input
                  type="password"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="New password (8+ characters)"
                  className="w-full rounded-lg px-2.5 py-2 mb-1.5 bg-transparent outline-none"
                  style={{ background: palette.surface, border: `1px solid ${palette.border}`, color: palette.text, fontFamily: mono, fontSize: "12.5px" }}
                />
                {changePasswordError && <p className="text-xs mb-1.5" style={{ color: palette.red }}>{changePasswordError}</p>}
                {changePasswordMsg && <p className="text-xs mb-1.5" style={{ color: palette.green }}>{changePasswordMsg}</p>}
                <button
                  type="button"
                  onClick={submitChangePassword}
                  disabled={changePasswordBusy || !currentPasswordInput || !newPasswordInput}
                  className={`w-full rounded-lg py-2 ${TAP}`}
                  style={{
                    background: currentPasswordInput && newPasswordInput ? palette.gold : palette.border,
                    color: currentPasswordInput && newPasswordInput ? palette.letterbox : palette.textFaint,
                    fontFamily: mono, fontSize: "12.5px", fontWeight: 700,
                  }}
                >
                  {changePasswordBusy ? "Updating…" : "Update Password"}
                </button>
              </div>
            )}

            {session && (
              <button
                type="button"
                onClick={() => { logout(); setSettingsOpen(false); }}
                className={`w-full flex items-center justify-center gap-2 rounded-lg py-2.5 mt-3 ${TAP}`}
                style={{ background: palette.field, border: `1px solid ${palette.border}`, color: palette.textMuted, fontFamily: mono, fontSize: "12.5px", fontWeight: 600 }}
              >
                <LogOut size={13} />
                Log Out
              </button>
            )}
          </SettingsSection>
        )}

        {/* ACCOUNTS */}
        <SettingsSection icon={Building2} title="Accounts" defaultOpen isDesktop={isDesktop} hidden={!isDesktop && settingsMobileSection !== "accounts"}>
          <SettingsSubLabel>Active Account</SettingsSubLabel>

          {!accountsLoaded ? (
            <p className="text-xs mb-2" style={{ color: palette.textFaint }}>Loading accounts\u2026</p>
          ) : (
            accounts.map((acc) => {
              const isActive = acc.id === activeAccountId;
              const isEditing = editingAccountId === acc.id;
              return (
                <div
                  key={acc.id}
                  className="rounded-lg mb-2 px-3 py-2.5"
                  style={{
                    background: isActive ? `${palette.gold}14` : palette.surface,
                    border: `1px solid ${isActive ? palette.gold : palette.border}`,
                  }}
                >
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editAccountName}
                        onChange={(e) => setEditAccountName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { e.preventDefault(); confirmRenameAccount(); }
                          else if (e.key === "Escape") setEditingAccountId(null);
                        }}
                        autoFocus
                        maxLength={40}
                        className="flex-1 rounded-lg px-2.5 py-1.5 bg-transparent outline-none"
                        style={{ background: palette.field, border: `1px solid ${palette.border}`, color: palette.text, fontFamily: mono, fontSize: "11.5px" }}
                      />
                      <button
                        type="button"
                        onClick={confirmRenameAccount}
                        className={`flex items-center justify-center rounded-lg flex-shrink-0 ${TAP}`}
                        style={{ width: "26px", height: "26px", background: palette.gold, color: palette.letterbox }}
                        aria-label="Save name"
                      >
                        <Check size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingAccountId(null)}
                        className={`flex items-center justify-center rounded-lg flex-shrink-0 ${TAP}`}
                        style={{ width: "26px", height: "26px", background: "transparent", border: `1px solid ${palette.border}`, color: palette.textFaint }}
                        aria-label="Cancel"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          switchAccount(acc.id);
                          setSettingsOpen(false);
                        }}
                        className="flex items-center gap-2 flex-1 text-left"
                        style={{ minWidth: 0 }}
                      >
                        <span
                          className="flex items-center justify-center rounded-full flex-shrink-0"
                          style={{
                            width: "14px",
                            height: "14px",
                            border: `1.5px solid ${isActive ? palette.gold : palette.textFaint}`,
                            background: isActive ? palette.gold : "transparent",
                          }}
                        >
                          {isActive && <Check size={8} strokeWidth={3} style={{ color: palette.letterbox }} />}
                        </span>
                        <span className="truncate" style={{ color: palette.text, fontSize: "12px", fontWeight: isActive ? 600 : 400 }}>
                          {acc.name}
                        </span>
                      </button>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => { setEditingAccountId(acc.id); setEditAccountName(acc.name); }}
                          className={TAP}
                          style={{ color: palette.textFaint, padding: "4px" }}
                          aria-label={`Rename ${acc.name}`}
                        >
                          <Pencil size={11} />
                        </button>
                        {accounts.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setPendingAccountDelete(acc.id)}
                            className={TAP}
                            style={{ color: palette.textFaint, padding: "4px" }}
                            aria-label={`Delete ${acc.name}`}
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {addingAccount ? (
            <div className="flex items-center gap-2 mt-1">
              <input
                type="text"
                value={newAccountName}
                onChange={(e) => { setNewAccountName(e.target.value); if (accountNameError) setAccountNameError(""); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); confirmAddAccount(); }
                  else if (e.key === "Escape") { setAddingAccount(false); setNewAccountName(""); }
                }}
                placeholder="e.g. FundingPips 2-Step $50K"
                autoFocus
                maxLength={40}
                className="flex-1 rounded-lg px-3 py-2 bg-transparent outline-none"
                style={{ background: palette.surface, border: `1px solid ${palette.border}`, color: palette.text, fontFamily: mono, fontSize: "11.5px" }}
              />
              <button
                type="button"
                onClick={confirmAddAccount}
                className={`rounded-lg px-3 py-2 flex-shrink-0 ${TAP}`}
                style={{ background: palette.gold, color: palette.letterbox, fontFamily: mono, fontSize: "11.5px", fontWeight: 600 }}
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => { setAddingAccount(false); setNewAccountName(""); setAccountNameError(""); }}
                className={`flex items-center justify-center rounded-lg flex-shrink-0 ${TAP}`}
                style={{ width: "34px", height: "34px", background: "transparent", border: `1px solid ${palette.border}`, color: palette.textFaint }}
                aria-label="Cancel"
              >
                <X size={13} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => { setAddingAccount(true); setNewAccountName(""); setAccountNameError(""); }}
              className={`w-full flex items-center justify-center gap-2 rounded-lg py-2.5 mt-1 ${TAP}`}
              style={{
                background: "transparent",
                border: `1px dashed ${palette.gold}88`,
                color: palette.gold,
                fontFamily: mono,
                fontSize: "11.5px",
                fontWeight: 600,
              }}
            >
              <Plus size={12} />
              Add Account
            </button>
          )}
          {accountNameError && (
            <p className="text-xs mt-2" style={{ color: palette.red }}>{accountNameError}</p>
          )}

          <p className="text-xs mt-3" style={{ color: palette.textFaint }}>
            Each account keeps its own starting balance, Challenge calculator inputs, trades, journal entries,
            and Trade plan check-ins. Setup/mood tags, notes, news events, and goals stay shared across every
            account. Switching here changes which one is active.
          </p>
        </SettingsSection>

        {/* APPEARANCE */}
        <SettingsSection icon={Palette} title="Appearance" defaultOpen isDesktop={isDesktop} hidden={!isDesktop && settingsMobileSection !== "appearance"}>
          <SettingsSubLabel>Theme</SettingsSubLabel>
          <div className="flex gap-2 mb-1 flex-wrap">
            {[
              { id: "dark", label: "Night" },
              { id: "light", label: "Light" },
              { id: "void", label: "Void" },
              { id: "auto", label: "Auto" },
            ].map((opt) => {
              const active = settings.themeMode === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setThemeMode(opt.id)}
                  className={`px-3 py-2 rounded-lg transition-colors ${TAP}`}
                  style={{
                    background: active ? palette.gold : palette.surface,
                    color: active ? palette.letterbox : palette.textMuted,
                    border: `1px solid ${active ? palette.gold : palette.border}`,
                    fontFamily: mono,
                    fontSize: "12.5px",
                    fontWeight: 600,
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </SettingsSection>

        {/* NAVIGATION */}
        <SettingsSection icon={LayoutGrid} title="Navigation" isDesktop={isDesktop} hidden={!isDesktop && settingsMobileSection !== "navigation"}>
          <SettingsSubLabel>Default Landing Tab</SettingsSubLabel>
          <div className="flex gap-2 flex-wrap mb-1">
            {navTabs.map((t) => {
              const active = settings.defaultLandingTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => persistSettings({ ...settings, defaultLandingTab: t.id })}
                  className={`px-3 py-1.5 rounded-full transition-colors ${TAP}`}
                  style={{
                    background: active ? palette.gold : palette.surface,
                    color: active ? palette.letterbox : palette.textMuted,
                    border: `1px solid ${active ? palette.gold : palette.border}`,
                    fontFamily: mono,
                    fontSize: "12.5px",
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
            Opens automatically the next time you launch Tredzi.
          </p>

          <SettingsSubLabel>Visible Tabs</SettingsSubLabel>
          <div className="flex gap-2 flex-wrap mb-1">
            {TABS.map((t) => {
              const hidden = (settings.hiddenTabs || []).includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleHiddenTab(t.id)}
                  className={`px-3 py-1.5 rounded-full transition-colors ${TAP}`}
                  style={{
                    background: hidden ? palette.surface : palette.gold,
                    color: hidden ? palette.textFaint : palette.letterbox,
                    border: `1px solid ${hidden ? palette.border : palette.gold}`,
                    fontFamily: mono,
                    fontSize: "12.5px",
                    textDecoration: hidden ? "line-through" : "none",
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
            Tap to hide a tab from your navigation. At least one must stay visible.
          </p>

          <SettingsSubLabel>Mobile Bottom Bar</SettingsSubLabel>
          <div className="flex gap-2 flex-wrap mb-1">
            {navTabs.map((t) => {
              const pinnedList = settings.mobileNavPinnedTabs || [];
              const isPinned = pinnedList.includes(t.id);
              const pinnedIndex = pinnedList.indexOf(t.id);
              const atLimit = pinnedList.length >= MOBILE_NAV_PRIMARY_COUNT;
              const disabled = !isPinned && atLimit;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => togglePinnedMobileTab(t.id)}
                  disabled={disabled}
                  className={`px-3 py-1.5 rounded-full transition-colors ${disabled ? "" : TAP}`}
                  style={{
                    background: isPinned ? palette.gold : palette.surface,
                    color: isPinned ? palette.letterbox : disabled ? palette.textFaint : palette.textMuted,
                    border: `1px solid ${isPinned ? palette.gold : palette.border}`,
                    fontFamily: mono,
                    fontSize: "12.5px",
                    opacity: disabled ? 0.5 : 1,
                  }}
                >
                  {isPinned ? `${pinnedIndex + 1}. ` : ""}
                  {t.label}
                </button>
              );
            })}
          </div>
          {(settings.mobileNavPinnedTabs || []).length > 0 && (
            <button
              type="button"
              onClick={() => persistSettings({ ...settings, mobileNavPinnedTabs: [] })}
              className={`mb-2 block ${TAP}`}
              style={{ color: palette.textFaint, fontSize: "11px", fontFamily: mono, textDecoration: "underline" }}
            >
              Reset to default
            </button>
          )}
          <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
            Pick up to {MOBILE_NAV_PRIMARY_COUNT} tabs to pin in the mobile bottom bar (numbered in tap order) —
            everything else lands in "More." Leave empty to use the first {MOBILE_NAV_PRIMARY_COUNT} tabs
            automatically.
          </p>

          <SettingsSubLabel>Default Insights Tab</SettingsSubLabel>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "overview", label: "Overview" },
              { id: "behavior", label: "Behavior" },
              { id: "journal", label: "Journal" },
            ].map((opt) => {
              const active = (settings.defaultInsightsTab || "overview") === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => persistSettings({ ...settings, defaultInsightsTab: opt.id })}
                  className={`px-1 py-2 rounded-lg transition-colors ${TAP}`}
                  style={{
                    background: active ? palette.gold : palette.surface,
                    color: active ? palette.letterbox : palette.textMuted,
                    border: `1px solid ${active ? palette.gold : palette.border}`,
                    fontFamily: mono,
                    fontSize: "12px",
                    fontWeight: 600,
                    minWidth: 0,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </SettingsSection>
        </div>

        <div className={isDesktop ? "flex flex-col flex-1" : ""} style={isDesktop ? { minWidth: 0 } : {}}>
        {/* TRADING DEFAULTS */}
        <SettingsSection icon={Scale} title="Trading Defaults" isDesktop={isDesktop} hidden={!isDesktop && settingsMobileSection !== "trading-defaults"}>
          <SettingsSubLabel>Default Account Balance</SettingsSubLabel>
          <div
            className="flex items-center rounded-lg px-3 mb-1"
            style={{ background: palette.surface, border: `1px solid ${palette.border}` }}
          >
            <span className="text-sm pr-1" style={{ color: palette.textFaint }}>$</span>
            <input
              ref={defaultBalanceInputRef}
              type="text"
              inputMode="decimal"
              defaultValue={settings.defaultAccountBalance}
              onChange={scheduleDefaultBalanceApply}
              onBlur={() => {
                if (defaultBalanceDebounceRef.current) clearTimeout(defaultBalanceDebounceRef.current);
                const el = defaultBalanceInputRef.current;
                if (el) applyDefaultAccountBalance(el.value);
              }}
              placeholder="10000"
              className="w-full bg-transparent py-2.5 outline-none"
              style={{ color: palette.text, fontFamily: mono, fontSize: "14px" }}
            />
          </div>
          <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
            Pre-fills the balance field on the Challenge, Edge, and Size calculators when empty.
          </p>

          <SettingsSubLabel>Statement Period</SettingsSubLabel>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "month", label: "Monthly" },
              { id: "quarter", label: "Quarterly" },
              { id: "year", label: "Annual" },
            ].map((opt) => {
              const active = (settings.statementPeriodType || "month") === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => persistSettings({ ...settings, statementPeriodType: opt.id })}
                  className={`px-1 py-2 rounded-lg transition-colors ${TAP}`}
                  style={{
                    background: active ? palette.gold : palette.surface,
                    color: active ? palette.letterbox : palette.textMuted,
                    border: `1px solid ${active ? palette.gold : palette.border}`,
                    fontFamily: mono,
                    fontSize: "12.5px",
                    fontWeight: 600,
                    minWidth: 0,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <SettingsSubLabel>Size Tab Risk Input</SettingsSubLabel>
          <div className="flex gap-2">
            {[
              { id: "percent", label: "Percent (%)" },
              { id: "dollar", label: "Dollar ($)" },
            ].map((opt) => {
              const active = (settings.sizeRiskInputMode || "percent") === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => persistSettings({ ...settings, sizeRiskInputMode: opt.id })}
                  className={`flex-1 px-3 py-2 rounded-lg transition-colors ${TAP}`}
                  style={{
                    background: active ? palette.gold : palette.surface,
                    color: active ? palette.letterbox : palette.textMuted,
                    border: `1px solid ${active ? palette.gold : palette.border}`,
                    fontFamily: mono,
                    fontSize: "12.5px",
                    fontWeight: 600,
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs mt-1" style={{ color: palette.textFaint }}>
            Choose whether the Size tab's "Risk per Trade" field takes a percentage of your balance or a fixed dollar amount.
          </p>
        </SettingsSection>

        {/* RISK & DISCIPLINE */}
        <SettingsSection icon={ShieldAlert} title="Risk & Discipline" isDesktop={isDesktop} hidden={!isDesktop && settingsMobileSection !== "risk-discipline"}>
          <SettingsSubLabel>Revenge Trade Cooldown</SettingsSubLabel>
          <button
            type="button"
            onClick={() => persistSettings({ ...settings, revengeLockEnabled: !settings.revengeLockEnabled })}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-1 transition-colors ${TAP}`}
            style={{
              background: settings.revengeLockEnabled ? palette.gold : palette.surface,
              color: settings.revengeLockEnabled ? palette.letterbox : palette.textMuted,
              border: `1px solid ${settings.revengeLockEnabled ? palette.gold : palette.border}`,
              fontFamily: mono,
              fontSize: "12.5px",
            }}
          >
            <Bell size={14} />
            {settings.revengeLockEnabled ? "Cooldown warning is on" : "Cooldown warning is off"}
          </button>
          <p className="text-xs mb-3" style={{ color: palette.textFaint }}>
            Logging a trade within the revenge window after a loss shows a warning first.
          </p>

          <SettingsSubLabel>Revenge Window (minutes)</SettingsSubLabel>
          <PillGroup
            options={[5, 10, 15, 20, 30]}
            suffix="m"
            value={settings.revengeWindowMinutes}
            onChange={(v) => persistSettings({ ...settings, revengeWindowMinutes: v })}
          />
          <p className="text-xs -mt-2 mb-3" style={{ color: palette.textFaint }}>
            Currently {RUNTIME.REVENGE_WINDOW_MINUTES} minutes — drives the "revenge" tag, the discipline streak, and the cooldown warning.
          </p>

          <button
            type="button"
            onClick={() => persistSettings({ ...settings, showRevengeTag: settings.showRevengeTag === false ? true : false })}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-3 transition-colors ${TAP}`}
            style={{
              background: settings.showRevengeTag !== false ? palette.gold : palette.surface,
              color: settings.showRevengeTag !== false ? palette.letterbox : palette.textMuted,
              border: `1px solid ${settings.showRevengeTag !== false ? palette.gold : palette.border}`,
              fontFamily: mono,
              fontSize: "12.5px",
            }}
          >
            <Flame size={14} />
            {settings.showRevengeTag !== false ? "Revenge tag is shown on trades" : "Revenge tag is hidden"}
          </button>

          <SettingsSubLabel>Daily Loss Limit</SettingsSubLabel>
          <div
            className="flex items-center rounded-lg px-3 mb-1"
            style={{ background: palette.surface, border: `1px solid ${palette.border}` }}
          >
            <span className="text-sm pr-1" style={{ color: palette.textFaint }}>$</span>
            <input
              type="text"
              inputMode="decimal"
              value={settings.dailyLossLimit}
              onChange={(e) => persistSettings({ ...settings, dailyLossLimit: e.target.value })}
              placeholder="200"
              className="w-full bg-transparent py-2.5 outline-none"
              style={{ color: palette.text, fontFamily: mono, fontSize: "14px" }}
            />
          </div>
          <p className="text-xs mb-3" style={{ color: palette.textFaint }}>
            A personal step-away line, separate from any prop-firm rule. Leave blank to disable.
          </p>

          <SettingsSubLabel>Max Trades per Day</SettingsSubLabel>
          <input
            type="text"
            inputMode="numeric"
            value={settings.maxTradesPerDay}
            onChange={(e) => persistSettings({ ...settings, maxTradesPerDay: e.target.value })}
            placeholder="5"
            className="w-full rounded-lg px-3 py-2.5 bg-transparent outline-none"
            style={{ background: palette.surface, border: `1px solid ${palette.border}`, color: palette.text, fontFamily: mono, fontSize: "14px" }}
          />
          <p className="text-xs mt-1" style={{ color: palette.textFaint }}>
            Shows a nudge on the Curve tab once you hit this count. Leave blank to disable.
          </p>
        </SettingsSection>

        {/* TAGS */}
        <SettingsSection icon={Tags} title="Custom Tags" isDesktop={isDesktop} hidden={!isDesktop && settingsMobileSection !== "custom-tags"}>
          <SettingsSubLabel>Setup Tags</SettingsSubLabel>
          <div className="flex gap-2 flex-wrap mb-1 items-center">
            {SETUPS.filter((s) => !hiddenDefaultSetupIds.includes(s.id)).map((s) => (
              <span key={s.id} className="relative inline-flex">
                <span
                  className="px-3 py-1.5 rounded-full inline-block"
                  style={{ background: palette.surface, color: palette.textMuted, border: `1px solid ${palette.border}`, fontSize: "12.5px" }}
                >
                  {s.label}
                </span>
                <button
                  type="button"
                  onClick={() => removeDefaultSetup(s.id)}
                  className={`absolute flex items-center justify-center rounded-full ${TAP}`}
                  style={{ top: "-5px", right: "-5px", width: "15px", height: "15px", background: palette.red, color: "#FFFFFF" }}
                  aria-label={`Remove ${s.label} setup`}
                >
                  <X size={9} />
                </button>
              </span>
            ))}
            {customSetupsLoaded &&
              customSetups.map((s) => (
                <span key={s.id} className="relative inline-flex">
                  <span
                    className="px-3 py-1.5 rounded-full inline-block"
                    style={{ background: palette.surface, color: palette.textMuted, border: `1px dashed ${palette.border}`, fontSize: "12.5px" }}
                  >
                    {s.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeCustomSetup(s.id)}
                    className={`absolute flex items-center justify-center rounded-full ${TAP}`}
                    style={{ top: "-5px", right: "-5px", width: "15px", height: "15px", background: palette.red, color: "#FFFFFF" }}
                    aria-label={`Remove ${s.label} setup`}
                  >
                    <X size={9} />
                  </button>
                </span>
              ))}
            {customSetupsLoaded && customSetups.length < MAX_CUSTOM_SETUPS && !addingSetup && (
              <button
                type="button"
                onClick={openAddSetup}
                className={`flex items-center justify-center rounded-full flex-shrink-0 ${TAP}`}
                style={{ width: "28px", height: "28px", background: "transparent", border: `1px dashed ${palette.border}`, color: palette.textFaint }}
                aria-label="Add custom setup"
                title="Add your own setup tag"
              >
                <Plus size={13} />
              </button>
            )}
          </div>
          {addingSetup && (
            <div className="flex items-center gap-2 mb-1">
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
                style={{ background: palette.surface, border: `1px solid ${palette.border}`, color: palette.text, fontFamily: mono, fontSize: "12.5px" }}
              />
              <button
                type="button"
                onClick={confirmAddSetup}
                className={`rounded-lg px-3 py-2 flex-shrink-0 ${TAP}`}
                style={{ background: palette.gold, color: palette.letterbox, fontFamily: mono, fontSize: "12.5px", fontWeight: 600 }}
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
            <p className="text-xs mb-2" style={{ color: palette.red }}>{setupError}</p>
          )}
          {hiddenDefaultSetupsLoaded && hiddenDefaultSetupIds.length > 0 && (
            <button
              type="button"
              onClick={restoreDefaultSetups}
              className={`mb-2 block ${TAP}`}
              style={{ color: palette.textFaint, fontSize: "11px", fontFamily: mono, textDecoration: "underline" }}
            >
              Restore default setups
            </button>
          )}
          <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
            Up to {MAX_CUSTOM_SETUPS}. Shows up on the Curve tab's trade log and the Journal tab's Setup field.
          </p>

          <SettingsSubLabel>Mood Tags</SettingsSubLabel>
          <div className="flex gap-2 flex-wrap mb-1 items-center">
            {customMoodsLoaded &&
              customMoods.map((m) => (
                <span key={m.id} className="relative inline-flex">
                  <span
                    className="px-3 py-1.5 rounded-full inline-flex items-center gap-1.5"
                    style={{ background: palette.surface, color: palette.textMuted, border: `1px dashed ${palette.border}`, fontSize: "12.5px" }}
                  >
                    <span>{m.emoji}</span>
                    {m.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeCustomMood(m.id)}
                    className={`absolute flex items-center justify-center rounded-full ${TAP}`}
                    style={{ top: "-5px", right: "-5px", width: "15px", height: "15px", background: palette.red, color: "#FFFFFF" }}
                    aria-label={`Remove ${m.label} mood`}
                  >
                    <X size={9} />
                  </button>
                </span>
              ))}
            {customMoodsLoaded && customMoods.length < MAX_CUSTOM_MOODS && !addingMood && (
              <button
                type="button"
                onClick={openAddMood}
                className={`flex items-center justify-center rounded-full flex-shrink-0 ${TAP}`}
                style={{ width: "28px", height: "28px", background: "transparent", border: `1px dashed ${palette.border}`, color: palette.textFaint }}
                aria-label="Add custom mood"
                title="Add your own mood tag"
              >
                <Plus size={13} />
              </button>
            )}
          </div>
          {addingMood && (
            <div className="flex items-center gap-2 mb-1">
              <input
                type="text"
                value={newMoodEmoji}
                onChange={(e) => setNewMoodEmoji(e.target.value.slice(0, 2))}
                className="rounded-lg px-2 py-2 bg-transparent outline-none text-center"
                style={{ width: "44px", background: palette.surface, border: `1px solid ${palette.border}`, color: palette.text, fontSize: "16px" }}
              />
              <input
                type="text"
                value={newMoodName}
                onChange={(e) => {
                  setNewMoodName(e.target.value);
                  if (moodError) setMoodError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    confirmAddMood();
                  } else if (e.key === "Escape") {
                    cancelAddMood();
                  }
                }}
                placeholder="New mood name"
                autoFocus
                maxLength={16}
                className="flex-1 rounded-lg px-3 py-2 bg-transparent outline-none"
                style={{ background: palette.surface, border: `1px solid ${palette.border}`, color: palette.text, fontFamily: mono, fontSize: "12.5px" }}
              />
              <button
                type="button"
                onClick={confirmAddMood}
                className={`rounded-lg px-3 py-2 flex-shrink-0 ${TAP}`}
                style={{ background: palette.gold, color: palette.letterbox, fontFamily: mono, fontSize: "12.5px", fontWeight: 600 }}
              >
                Add
              </button>
              <button
                type="button"
                onClick={cancelAddMood}
                className={`flex items-center justify-center rounded-lg flex-shrink-0 ${TAP}`}
                style={{ width: "34px", height: "34px", background: "transparent", border: `1px solid ${palette.border}`, color: palette.textFaint }}
                aria-label="Cancel adding mood"
              >
                <X size={14} />
              </button>
            </div>
          )}
          {moodError && (
            <p className="text-xs mb-2" style={{ color: palette.red }}>{moodError}</p>
          )}
          <p className="text-xs" style={{ color: palette.textFaint }}>
            Up to {MAX_CUSTOM_MOODS}. Shows up on the Curve tab's trade log and the Journal tab's Mood field.
          </p>
        </SettingsSection>

        {/* NOTIFICATIONS */}
        <SettingsSection icon={Bell} title="Notifications" isDesktop={isDesktop} hidden={!isDesktop && settingsMobileSection !== "notifications"}>
          <SettingsSubLabel>News Alarm Lead Time</SettingsSubLabel>
          <PillGroup
            options={[5, 10, 15, 20, 30]}
            suffix="m"
            value={settings.alarmLeadMinutes}
            onChange={(v) => persistSettings({ ...settings, alarmLeadMinutes: v })}
          />
          <p className="text-xs -mt-2" style={{ color: palette.textFaint }}>
            Currently rings {RUNTIME.ALARM_LEAD_MINUTES} minutes before a flagged event on the Sessions tab.
          </p>
        </SettingsSection>

        {/* SHARING & REPORTS */}
        <SettingsSection icon={Share2} title="Sharing & Reports" isDesktop={isDesktop} hidden={!isDesktop && settingsMobileSection !== "sharing-reports"}>
          <SettingsSubLabel>Weekly Share Card</SettingsSubLabel>
          <button
            type="button"
            onClick={() => persistSettings({ ...settings, hideDollarInShare: !settings.hideDollarInShare })}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-1 transition-colors ${TAP}`}
            style={{
              background: settings.hideDollarInShare ? palette.gold : palette.surface,
              color: settings.hideDollarInShare ? palette.letterbox : palette.textMuted,
              border: `1px solid ${settings.hideDollarInShare ? palette.gold : palette.border}`,
              fontFamily: mono,
              fontSize: "12.5px",
            }}
          >
            <Share2 size={14} />
            {settings.hideDollarInShare ? "Dollar amounts hidden" : "Dollar amounts shown"}
          </button>
          <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
            Controls whether "Share My Week" and "Copy Summary" include your net P&amp;L in dollars.
          </p>

          <SettingsSubLabel>Trader Alias</SettingsSubLabel>
          <input
            type="text"
            value={settings.traderAlias}
            onChange={(e) => persistSettings({ ...settings, traderAlias: e.target.value })}
            placeholder="e.g. J. Rahman"
            maxLength={40}
            className="w-full rounded-lg px-3 py-2.5 bg-transparent outline-none"
            style={{ background: palette.surface, border: `1px solid ${palette.border}`, color: palette.text, fontFamily: mono, fontSize: "14px" }}
          />
          <p className="text-xs mt-1" style={{ color: palette.textFaint }}>
            Shown on printed Statements and the Weekly Share Card. Leave blank to omit.
          </p>
        </SettingsSection>

        {/* JOURNAL & DATA */}
        <SettingsSection icon={Table2} title="Journal & Data" isDesktop={isDesktop} hidden={!isDesktop && settingsMobileSection !== "journal-data"}>
          <SettingsSubLabel>Journal Table Layout</SettingsSubLabel>
          <div className="flex gap-2 mb-1">
            {[
              { id: "auto", label: "Auto" },
              { id: "cards", label: "Cards" },
              { id: "table", label: "Table" },
            ].map((opt) => {
              const active = (settings.journalTableLayout || "auto") === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => persistSettings({ ...settings, journalTableLayout: opt.id })}
                  className={`flex-1 px-3 py-2 rounded-lg transition-colors ${TAP}`}
                  style={{
                    background: active ? palette.gold : palette.surface,
                    color: active ? palette.letterbox : palette.textMuted,
                    border: `1px solid ${active ? palette.gold : palette.border}`,
                    fontFamily: mono,
                    fontSize: "12.5px",
                    fontWeight: 600,
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
            Auto uses Cards on narrow screens, Table on wider ones.
          </p>

          <button
            type="button"
            onClick={() => persistSettings({ ...settings, autoSyncTradesToJournal: !settings.autoSyncTradesToJournal })}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-1 transition-colors ${TAP}`}
            style={{
              background: settings.autoSyncTradesToJournal ? palette.gold : palette.surface,
              color: settings.autoSyncTradesToJournal ? palette.letterbox : palette.textMuted,
              border: `1px solid ${settings.autoSyncTradesToJournal ? palette.gold : palette.border}`,
              fontFamily: mono,
              fontSize: "12.5px",
            }}
          >
            <ArrowLeftRight size={14} />
            {settings.autoSyncTradesToJournal ? "Auto-sync is on" : "Auto-sync is off"}
          </button>
          <p className="text-xs" style={{ color: palette.textFaint }}>
            Mirrors every logged trade into a matching Journal row. One-way — editing a Journal row never
            changes the trade.
          </p>
        </SettingsSection>

        {/* HELP */}
        <SettingsSection icon={Lightbulb} title="Help & Tips" isDesktop={isDesktop} hidden={!isDesktop && settingsMobileSection !== "help-tips"}>
          <button
            type="button"
            onClick={() => persistSettings({ ...settings, showOnboardingTips: !settings.showOnboardingTips })}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-2 transition-colors ${TAP}`}
            style={{
              background: settings.showOnboardingTips ? palette.gold : palette.surface,
              color: settings.showOnboardingTips ? palette.letterbox : palette.textMuted,
              border: `1px solid ${settings.showOnboardingTips ? palette.gold : palette.border}`,
              fontFamily: mono,
              fontSize: "12.5px",
            }}
          >
            <Lightbulb size={14} />
            {settings.showOnboardingTips ? "Tips are showing" : "Tips are hidden"}
          </button>
          <p className="text-xs mb-3" style={{ color: palette.textFaint }}>
            Dismissible callouts pointing out tagging, the Trade plan, and other features. Dismissing one hides
            only that tip.
          </p>
          <button
            type="button"
            onClick={() => {
              setSettingsOpen(false);
              startTour();
            }}
            className={`w-full flex items-center justify-center gap-2 rounded-lg py-2.5 ${TAP}`}
            style={{
              background: palette.surface,
              border: `1px solid ${palette.border}`,
              color: palette.text,
              fontFamily: mono,
              fontSize: "12.5px",
              fontWeight: 600,
            }}
          >
            <ChevronRight size={14} />
            Restart App Tour
          </button>
        </SettingsSection>

                {/* FULL BACKUP */}
        <SettingsSection icon={Download} title="Full Backup (Everything)" isDesktop={isDesktop} hidden={!isDesktop && settingsMobileSection !== "backup"}>
          <p className="text-xs mb-3" style={{ color: palette.textFaint }}>
            Exports absolutely everything — trades, journal, playbook, notes, settings, goals, and calculator
            inputs — in one file. This is separate from the Curve tab's "Backup &amp; Restore," which only
            covers the core data.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={exportAllData}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 ${TAP}`}
              style={{
                background: palette.surface,
                border: `1px solid ${palette.border}`,
                color: palette.text,
                fontFamily: mono,
                fontSize: "12.5px",
                fontWeight: 600,
              }}
            >
              <Download size={14} />
              Export All
            </button>
            <button
              type="button"
              onClick={() => masterImportInputRef.current && masterImportInputRef.current.click()}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 ${TAP}`}
              style={{
                background: palette.surface,
                border: `1px solid ${palette.border}`,
                color: palette.text,
                fontFamily: mono,
                fontSize: "12.5px",
                fontWeight: 600,
              }}
            >
              <Upload size={14} />
              Import All
            </button>
            <input
              ref={masterImportInputRef}
              type="file"
              accept="application/json,.json"
              onChange={importAllDataFile}
              style={{ display: "none" }}
            />
          </div>
          {masterExportMsg && (
            <p className="text-xs mt-2" style={{ color: palette.textFaint }}>
              {masterExportMsg}
            </p>
          )}
          {pendingMasterImport && (
            <div
              className="rounded-lg p-3 mt-3"
              style={{ background: palette.surface, border: `1px solid ${palette.gold}` }}
            >
              <p className="text-xs mb-3" style={{ color: palette.text }}>
                This will replace ALL data on this device — trades, journal, playbook, notes, settings, goals,
                and calculator inputs — with this backup ({pendingMasterImport.trades.length} trade
                {pendingMasterImport.trades.length === 1 ? "" : "s"}). This can't be undone.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={confirmMasterImport}
                  className={`flex-1 rounded-lg py-2 ${TAP}`}
                  style={{ background: palette.gold, color: palette.letterbox, fontFamily: mono, fontSize: "13px" }}
                >
                  Replace Everything
                </button>
                <button
                  type="button"
                  onClick={cancelMasterImport}
                  className={`flex-1 rounded-lg py-2 ${TAP}`}
                  style={{
                    background: "transparent",
                    border: `1px solid ${palette.border}`,
                    color: palette.textMuted,
                    fontFamily: mono,
                    fontSize: "13px",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </SettingsSection>

        {/* If signed in but no community username set yet, still offer sign-out here */}
        {session && !communityUsername && (
          <SettingsSection icon={Users} title="Community" isDesktop={isDesktop} hidden={!isDesktop && settingsMobileSection !== "community"}>
            <SettingsSubLabel>Signed In As</SettingsSubLabel>
            <div
              className="rounded-lg px-3 py-2.5 mb-3"
              style={{ background: palette.surface, border: `1px solid ${palette.border}`, color: palette.textMuted, fontFamily: mono, fontSize: "12px" }}
            >
              {session.email}
            </div>
            <button
              type="button"
              onClick={() => { logout(); setSettingsOpen(false); }}
              className={`w-full flex items-center justify-center gap-2 rounded-lg py-2.5 ${TAP}`}
              style={{ background: palette.field, border: `1px solid ${palette.border}`, color: palette.textMuted, fontFamily: mono, fontSize: "12.5px", fontWeight: 600 }}
            >
              <LogOut size={13} />
              Log Out
            </button>
          </SettingsSection>
        )}

        {/* DANGER ZONE */}
        <SettingsSection icon={AlertTriangle} title="Danger Zone" danger isDesktop={isDesktop} hidden={!isDesktop && settingsMobileSection !== "danger-zone"}>
          {!pendingSettingsReset ? (
            <button
              type="button"
              onClick={() => setPendingSettingsReset(true)}
              className={`w-full flex items-center justify-center gap-2 rounded-lg py-2.5 ${TAP}`}
              style={{ background: "transparent", border: `1px solid ${palette.red}`, color: palette.red, fontFamily: mono, fontSize: "12.5px", fontWeight: 600 }}
            >
              <RotateCcw size={14} />
              Reset Settings to Defaults
            </button>
          ) : (
            <div className="rounded-lg p-3" style={{ background: palette.surface, border: `1px solid ${palette.red}` }}>
              <p className="text-xs mb-3" style={{ color: palette.text }}>
                This resets theme, limits, alarms, and other preferences here — it does NOT touch your trades,
                journal, or notes. Continue?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    persistSettings(DEFAULT_SETTINGS);
                    setPendingSettingsReset(false);
                  }}
                  className={`flex-1 rounded-lg py-2 ${TAP}`}
                  style={{ background: palette.red, color: "#FFFFFF", fontFamily: mono, fontSize: "12.5px", fontWeight: 600 }}
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setPendingSettingsReset(false)}
                  className={`flex-1 rounded-lg py-2 ${TAP}`}
                  style={{ background: "transparent", border: `1px solid ${palette.border}`, color: palette.textMuted, fontFamily: mono, fontSize: "12.5px" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </SettingsSection>
        </div>
        </div>
        </div>
      </div>
    </div>
  </div>
  );
})()}

{pendingAccountDelete && (
  <div
    className="fixed inset-0 flex items-center justify-center z-50 p-6"
    style={{ background: "rgba(5,7,12,0.85)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
    onClick={() => setPendingAccountDelete(null)}
  >
    <div
      className="w-full modal-in rounded-2xl p-5"
      style={{ maxWidth: "300px", background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ color: palette.text, fontSize: "14px", fontWeight: 600, marginBottom: "6px" }}>
        Delete this account?
      </div>
      <p className="text-xs mb-4" style={{ color: palette.textMuted }}>
        This removes it from your account list. This can't be undone.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setPendingAccountDelete(null)}
          className={`flex-1 rounded-lg py-2.5 ${TAP}`}
          style={{ background: "transparent", border: `1px solid ${palette.border}`, color: palette.textMuted, fontFamily: mono, fontSize: "13px" }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={confirmDeleteAccount}
          className={`flex-1 rounded-lg py-2.5 ${TAP}`}
          style={{ background: palette.red, color: "#FFFFFF", fontFamily: mono, fontSize: "13px", fontWeight: 600 }}
        >
          Delete
        </button>
      </div>
    </div>
  </div>
)}

  {pulseOpen && (() => {
  const fmtSignedShort = (n) => `${n >= 0 ? "+" : "-"}$${fmtMoney(n)}`;
  const nowPulse = currentTime;
  const todayKeyPulse = dayKeyFromDate(nowPulse);
  const todayTradesPulse = trades.filter((t) => dayKeyFromTs(t.ts) === todayKeyPulse);
  const todayNetPulse = todayTradesPulse.reduce((s, t) => s + t.pnl, 0);

  // A1 — time since last trade
  const sortedTradesPulse = [...trades].sort((a, b) => a.ts - b.ts);
  const lastTradePulse = sortedTradesPulse[sortedTradesPulse.length - 1];
  const msSinceLastTrade = lastTradePulse ? nowPulse.getTime() - lastTradePulse.ts : null;
  const lastTradeWasLoss = lastTradePulse && lastTradePulse.pnl < 0;
  const inCooldownPulse = lastTradeWasLoss && msSinceLastTrade !== null && msSinceLastTrade <= RUNTIME.REVENGE_WINDOW_MS;

  // A2 — trades remaining
  const maxTradesNumPulse = num(settings.maxTradesPerDay);
  const tradesRemainingPulse = maxTradesNumPulse > 0 ? Math.max(0, maxTradesNumPulse - todayTradesPulse.length) : null;

  // A3 — risk budget burn
  const dailyLossLimitNumPulse = num(settings.dailyLossLimit);
  const todayLossTotalPulse = todayTradesPulse.filter((t) => t.pnl < 0).reduce((s, t) => s + t.pnl, 0);
  const lossBudgetPctPulse =
    dailyLossLimitNumPulse > 0 ? Math.min(100, (Math.abs(todayLossTotalPulse) / dailyLossLimitNumPulse) * 100) : null;

  // A4 — active session(s) + historical win rate for them
  const nowUTCHourPulse = nowPulse.getUTCHours() + nowPulse.getUTCMinutes() / 60;
  const openSessionsPulse = MARKET_SESSIONS.filter((s) => sessionOpenAtUTCHour(s, nowUTCHourPulse));
  const sessionWinRatesPulse = computeSessionWinRates(filledJournalRows(journalEntries));
  const openSessionStatsPulse = openSessionsPulse
    .map((s) => sessionWinRatesPulse.find((r) => r.id === s.id))
    .filter(Boolean);

  // B5 — today vs average day
  const dayTotalsPulse = {};
  trades.forEach((t) => {
    const k = dayKeyFromTs(t.ts);
    dayTotalsPulse[k] = (dayTotalsPulse[k] || 0) + t.pnl;
  });
  const pastDayKeysPulse = Object.keys(dayTotalsPulse).filter((k) => k !== todayKeyPulse);
  const avgDayPnlPulse = pastDayKeysPulse.length
    ? pastDayKeysPulse.reduce((s, k) => s + dayTotalsPulse[k], 0) / pastDayKeysPulse.length
    : null;

  // B6 — same-weekday track record
  const insightsPulse = computeInsights(trades, customSetups, customMoods);
  const todayWeekdayNumPulse = nowPulse.getDay();
  const weekdayRowPulse = insightsPulse.weekdayRows.find((r) => Number(r.id) === todayWeekdayNumPulse);

  // B7 — today's mood track record
  const firstTradeTodayWithMood = todayTradesPulse.find((t) => t.emotion);
  const moodRowPulse = firstTradeTodayWithMood
    ? insightsPulse.moodRows.find((r) => r.id === firstTradeTodayWithMood.emotion)
    : null;

  // C8 — live win-streak risk flag
  let liveWinStreakPulse = 0;
  for (let i = sortedTradesPulse.length - 1; i >= 0; i--) {
    if (sortedTradesPulse[i].pnl > 0) liveWinStreakPulse += 1;
    else break;
  }
  const overconfidencePulse = computeOverconfidenceCheck(trades);
  const streakRiskFlagPulse = liveWinStreakPulse >= 3 && overconfidencePulse && overconfidencePulse.detected;

  // C9 — discipline streak "at risk"/record framing
  const disciplinePulse = computeDisciplineStreak(trades);
  const disciplineTrendPulse = computeDisciplineStreakTrend(trades);
  const last6WeeksPulse = disciplineTrendPulse.slice(-42);
  const bestInWindowPulse = last6WeeksPulse.length ? Math.max(...last6WeeksPulse.map((d) => d.streak)) : 0;
  const isNewRecordWindowPulse = disciplinePulse.current > 0 && disciplinePulse.current >= bestInWindowPulse;
  const oneMoreTiesRecordPulse = disciplinePulse.best - disciplinePulse.current === 1 && disciplinePulse.current > 0;

  // C10 — next flagged news event
  const upcomingNewsPulse = newsEvents
    .filter((ev) => ev.alarm)
    .map((ev) => ({ ev, occMs: nextOccurrenceMs(ev, nowPulse) }))
    .filter((x) => Number.isFinite(x.occMs) && x.occMs >= nowPulse.getTime())
    .sort((a, b) => a.occMs - b.occMs)[0];

  const pulseRow = (label, value, valueColor, sub) => (
    <div
      className="flex items-center justify-between rounded-lg px-3 py-2.5 mb-2"
      style={{ background: palette.field, border: `1px solid ${palette.border}` }}
    >
      <div style={{ flex: 1, marginRight: "8px" }}>
        <div style={{ color: palette.text, fontSize: "13px" }}>{label}</div>
        {sub && <div style={{ color: palette.textFaint, fontSize: "11px", marginTop: "2px" }}>{sub}</div>}
      </div>
      <span style={{ fontFamily: mono, fontSize: "13px", color: valueColor || palette.text, flexShrink: 0 }}>
        {value}
      </span>
    </div>
  );

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: "rgba(5,7,12,0.85)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
      onClick={() => setPulseOpen(false)}
    >
      <div
        className="w-full modal-in rounded-2xl overflow-y-auto"
        style={{
          maxWidth: isDesktop ? "560px" : "440px",
          maxHeight: "85vh",
          background: palette.surface,
          border: `1px solid ${palette.border}`,
          boxShadow: palette.shadow,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between p-5"
          style={{ borderBottom: `1px solid ${palette.border}`, position: "sticky", top: 0, background: palette.surface, zIndex: 2 }}
        >
<div className="flex items-center gap-2">
  <LiveFlame size={44} active={(todayTradesPulse.length > 0 && todayNetPulse > 0) || disciplinePulse.current > 0} dimColor={palette.textFaint} style={{ margin: "-10px -2px -10px -2px" }} />
  <span style={{ fontFamily: mono, fontSize: "16px", fontWeight: 700, color: palette.text }}>
    Today's Pulse
  </span>
</div>
          <button type="button" onClick={() => setPulseOpen(false)} className={TAP} style={{ color: palette.textFaint }} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="p-5">
          {!trades.length ? (
            <p className="text-xs mb-2" style={{ color: palette.textFaint }}>
              Log your first trade to start tracking your pulse.
            </p>
          ) : (
            <>
              <span className="block mb-1.5 uppercase" style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}>
                Right Now
              </span>

              {pulseRow(
                "Time Since Last Trade",
                lastTradePulse ? formatMinSec(msSinceLastTrade) : "N/A",
                inCooldownPulse ? palette.red : palette.text,
                lastTradePulse
                  ? inCooldownPulse
                    ? `Last trade was a loss — inside your ${RUNTIME.REVENGE_WINDOW_MINUTES}-minute cooldown`
                    : lastTradeWasLoss
                    ? "Last trade was a loss, cooldown has passed"
                    : "Last trade was a win"
                  : "No trades logged yet"
              )}

              {tradesRemainingPulse !== null &&
                pulseRow(
                  "Trades Left Before Caution",
                  `${tradesRemainingPulse} / ${maxTradesNumPulse}`,
                  tradesRemainingPulse === 0 ? palette.red : tradesRemainingPulse <= 1 ? palette.gold : palette.text,
                  `${todayTradesPulse.length} logged today`
                )}

              {lossBudgetPctPulse !== null &&
                pulseRow(
                  "Risk Budget Used Today",
                  `${lossBudgetPctPulse.toFixed(0)}%`,
                  lossBudgetPctPulse >= 100 ? palette.red : lossBudgetPctPulse >= 70 ? palette.gold : palette.green,
                  `$${fmtMoney(Math.abs(todayLossTotalPulse))} of $${fmt(dailyLossLimitNumPulse, 0)} limit`
                )}

              {openSessionsPulse.length > 0 &&
                pulseRow(
                  `Active Session${openSessionsPulse.length > 1 ? "s" : ""}`,
                  openSessionsPulse.map((s) => s.label).join(" + "),
                  palette.gold,
                  openSessionStatsPulse.length
                    ? openSessionStatsPulse
                        .map((s) =>
                          s.winRate !== null ? `${s.label} win rate: ${s.winRate.toFixed(0)}%` : `${s.label}: not enough journal data`
                        )
                        .join(" \u00b7 ")
                    : "No journaled session data yet"
                )}

              <span className="block mt-4 mb-1.5 uppercase" style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}>
                Compared to Your History
              </span>

              {pulseRow(
                "Today vs. Your Average Day",
                avgDayPnlPulse === null ? "N/A" : fmtSignedShort(todayNetPulse - avgDayPnlPulse),
                avgDayPnlPulse === null ? palette.textFaint : todayNetPulse >= avgDayPnlPulse ? palette.green : palette.red,
                avgDayPnlPulse === null
                  ? "Not enough history yet"
                  : `Today: ${fmtSignedShort(todayNetPulse)} vs. your average of ${fmtSignedShort(avgDayPnlPulse)}/day`
              )}

              {pulseRow(
                "This Weekday's Track Record",
                weekdayRowPulse ? `${weekdayRowPulse.winRate.toFixed(0)}% win rate` : "N/A",
                weekdayRowPulse ? (weekdayRowPulse.winRate >= 50 ? palette.green : palette.red) : palette.textFaint,
                weekdayRowPulse
                  ? `${weekdayRowPulse.count} trade${weekdayRowPulse.count === 1 ? "" : "s"} logged on ${weekdayRowPulse.label}s`
                  : "Log more trades to build this up"
              )}

              {firstTradeTodayWithMood &&
                pulseRow(
                  "Today's Mood Track Record",
                  moodRowPulse ? `${moodRowPulse.winRate.toFixed(0)}% win rate` : "N/A",
                  moodRowPulse ? (moodRowPulse.winRate >= 50 ? palette.green : palette.red) : palette.textFaint,
                  moodRowPulse
                    ? `${moodRowPulse.emoji} ${moodRowPulse.label} \u2014 ${moodRowPulse.count} trade${moodRowPulse.count === 1 ? "" : "s"} historically`
                    : "Tag a mood on today's trades to see this"
                )}

              <span className="block mt-4 mb-1.5 uppercase" style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}>
                Watch For
              </span>

              {liveWinStreakPulse >= 2 &&
                pulseRow(
                  "Current Win Streak",
                  `${liveWinStreakPulse} in a row`,
                  streakRiskFlagPulse ? palette.red : palette.green,
                  streakRiskFlagPulse
                    ? `You've historically sized up ${overconfidencePulse.pctChange.toFixed(0)}% after streaks like this`
                    : "No oversizing pattern detected yet"
                )}

              {disciplinePulse.hasData &&
                pulseRow(
                  "Discipline Streak Status",
                  `${disciplinePulse.current} day${disciplinePulse.current === 1 ? "" : "s"}`,
                  isNewRecordWindowPulse ? palette.gold : palette.text,
                  isNewRecordWindowPulse
                    ? "Matches or beats your best in the last ~6 weeks"
                    : oneMoreTiesRecordPulse
                    ? `One more clean day ties your best streak of ${disciplinePulse.best}`
                    : `Best streak: ${disciplinePulse.best} days`
                )}

              {upcomingNewsPulse &&
                pulseRow(
                  "Next Flagged Event",
                  formatCountdown(upcomingNewsPulse.occMs - nowPulse.getTime()),
                  upcomingNewsPulse.ev.impact === "high" ? palette.red : palette.textMuted,
                  `${upcomingNewsPulse.ev.name} \u2014 ${upcomingNewsPulse.ev.date} ${upcomingNewsPulse.ev.time}`
                )}
            </>
          )}
        </div>
      </div>
    </div>
  );
})()}

{shareImageUrl && (
  <div
    className="fixed inset-0 flex items-start justify-center z-50 p-4 overflow-y-auto"
    style={{ background: "rgba(5,7,12,0.85)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
    onClick={closeShare}
  >
    <div
      className="w-full flex flex-col items-center modal-in"
      style={{ maxWidth: "420px", margin: "20px 0" }}
      onClick={(e) => e.stopPropagation()}
    >
            <div className="w-full flex items-center justify-between mb-3">
              <span style={{ color: "#EDEFF3", fontFamily: mono, fontSize: "13px" }}>
                Preview
              </span>
              <button type="button" onClick={closeShare} className={TAP} style={{ color: "#7C8AA0" }} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <img
              src={shareImageUrl}
              alt="My trading week recap"
              className="w-full rounded-2xl mb-3"
              style={{ border: `1px solid ${palette.border}` }}
            />
            <p className="text-xs mb-3 text-center" style={{ color: "#7C8AA0" }}>
              Tip: press and hold (or right-click) the image above to save it directly.
            </p>
            <button
              type="button"
              onClick={downloadShare}
              className={`w-full flex items-center justify-center gap-2 rounded-lg py-3 ${TAP}`}
              style={{
                background: palette.gold,
                color: palette.letterbox,
                fontFamily: mono,
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              <Download size={16} />
              Save Image
            </button>
          </div>
        </div>
      )}

        {viewingJournalPhoto && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: "rgba(5,7,12,0.9)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
          onClick={() => setViewingJournalPhoto(null)}
        >
          <div className="w-full flex flex-col items-center modal-in" style={{ maxWidth: "480px" }} onClick={(e) => e.stopPropagation()}>
            <div className="w-full flex items-center justify-between mb-3">
              <span style={{ color: "#EDEFF3", fontFamily: mono, fontSize: "13px" }}>Trade Photo</span>
              <button type="button" onClick={() => setViewingJournalPhoto(null)} className={TAP} style={{ color: "#7C8AA0" }} aria-label="Close"><X size={20} /></button>
            </div>
            <img src={viewingJournalPhoto.src} alt="Trade photo" className="w-full rounded-2xl mb-3" style={{ border: `1px solid ${palette.border}` }} />
            <button
              type="button"
              onClick={() => { setPendingJournalPhotoDelete({ rowId: viewingJournalPhoto.rowId, index: viewingJournalPhoto.index }); setViewingJournalPhoto(null); }}
              className={`w-full flex items-center justify-center gap-2 rounded-lg py-3 ${TAP}`}
              style={{ background: palette.red, color: "#FFFFFF", fontFamily: mono, fontSize: "14px", fontWeight: 600 }}
            >
              <Trash2 size={16} /> Delete Photo
            </button>
          </div>
        </div>
      )}

       {pendingJournalPhotoDelete && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-6"
          style={{ background: "rgba(5,7,12,0.85)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
          onClick={() => setPendingJournalPhotoDelete(null)}
        >
          <div className="w-full modal-in rounded-2xl p-5" style={{ maxWidth: "300px", background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }} onClick={(e) => e.stopPropagation()}>
            <div style={{ color: palette.text, fontSize: "14px", fontWeight: 600, marginBottom: "6px" }}>Delete this photo?</div>
            <p className="text-xs mb-4" style={{ color: palette.textMuted }}>This can't be undone.</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPendingJournalPhotoDelete(null)} className={`flex-1 rounded-lg py-2.5 ${TAP}`} style={{ background: "transparent", border: `1px solid ${palette.border}`, color: palette.textMuted, fontFamily: mono, fontSize: "13px" }}>Cancel</button>
              <button type="button" onClick={() => { removeJournalPhoto(pendingJournalPhotoDelete.rowId, pendingJournalPhotoDelete.index); setPendingJournalPhotoDelete(null); }} className={`flex-1 rounded-lg py-2.5 ${TAP}`} style={{ background: palette.red, color: "#FFFFFF", fontFamily: mono, fontSize: "13px", fontWeight: 600 }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {viewingScreenshot && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: "rgba(5,7,12,0.9)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
          onClick={() => {
            setViewingScreenshot(null);
            setScreenshotShareMsg("");
          }}
        >
          <div
            className="w-full flex flex-col items-center modal-in"
            style={{ maxWidth: "480px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between mb-3">
              <div>
                <span style={{ color: "#EDEFF3", fontFamily: mono, fontSize: "13px" }}>
                  Trade Screenshot
                </span>
                {viewingScreenshot.trade && (
                  <div style={{ color: "#7C8AA0", fontSize: "12px", marginTop: "2px" }}>
                    {formatDayLabel(dayKeyFromTs(viewingScreenshot.trade.ts))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setViewingScreenshot(null);
                  setScreenshotShareMsg("");
                }}
                className={TAP}
                style={{ color: "#7C8AA0" }}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <img
              src={viewingScreenshot.src}
              alt="Trade screenshot"
              className="w-full rounded-2xl mb-3"
              style={{ border: `1px solid ${palette.border}` }}
            />
            <div className="flex gap-2 w-full">
              <button
                type="button"
                onClick={() => shareImageFile(viewingScreenshot.src, viewingScreenshot.trade)}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-3 ${TAP}`}
                style={{
                  background: palette.gold,
                  color: palette.letterbox,
                  fontFamily: mono,
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                <Share2 size={16} />
                Share
              </button>
              <button
                type="button"
                onClick={() => downloadScreenshot(viewingScreenshot.src, viewingScreenshot.trade)}
                className={`flex items-center justify-center rounded-lg py-3 px-4 ${TAP}`}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "#EDEFF3",
                }}
                aria-label="Download screenshot"
                title="Download"
              >
                <Download size={16} />
              </button>
            </div>
            {screenshotShareMsg && (
              <p className="text-xs mt-2 text-center" style={{ color: "#7C8AA0" }}>
                {screenshotShareMsg}
              </p>
            )}
          </div>
        </div>
      )}


{groupManageOpen && (() => {
const membership = myGroups.find((g) => g.id === activeGroupId);
const myMember = groupMembersList.find((m) => m.username === communityUsername);
const isOwner = membership?.role === "owner" || !!myMember?.isOwner;
  const authors = Array.from(new Set(groupMessages.map((m) => m.author))).filter(Boolean);
  const tabs = ["info", "members", ...(isOwner ? ["requests", "settings", "danger"] : [])];

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: "rgba(5,7,12,0.85)", backdropFilter: "blur(6px)" }}
      onClick={() => setGroupManageOpen(false)}>
      <div className="w-full modal-in rounded-2xl overflow-hidden"
        style={{ maxWidth: "420px", maxHeight: "80vh", background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow, display: "flex", flexDirection: "column" }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4" style={{ borderBottom: `1px solid ${palette.border}` }}>
          <div>
            <div style={{ fontFamily: display, fontSize: "15px", fontWeight: 700, color: palette.text }}>
              {membership?.name || "Group"}
            </div>
            <div style={{ color: isOwner ? palette.gold : palette.textFaint, fontSize: "10.5px", fontFamily: mono, textTransform: "uppercase", fontWeight: isOwner ? 700 : 400 }}>
              {isOwner ? "★ You own this group" : "Member"}
            </div>
          </div>
          <button type="button" onClick={() => { setGroupManageOpen(false); setOpenRoleMenuFor(null); }} className={TAP} style={{ color: palette.textFaint }}>
            <X size={18} />
          </button>
        </div>

        <div className="flex gap-2 px-4 pt-3">
          {tabs.map((t) => {
            const active = groupManageTab === t;
            return (
              <button key={t} type="button" onClick={() => { setGroupManageTab(t); if (t === "requests") loadGroupJoinRequests(); }}
                className={`px-3 py-1.5 rounded-full ${TAP}`}
                style={{
                  background: active ? (t === "danger" ? palette.red : palette.gold) : palette.field,
                  color: active ? (t === "danger" ? "#FFFFFF" : palette.letterbox) : palette.textMuted,
                  border: `1px solid ${active ? (t === "danger" ? palette.red : palette.gold) : palette.border}`,
                  fontFamily: mono, fontSize: "12px", fontWeight: 700, textTransform: "capitalize",
                }}>
                {t}
              </button>
            );
          })}
        </div>

        <div className="p-4" style={{ overflowY: "auto" }}>



          {groupManageTab === "info" ? (
            <>
              <div className="flex flex-col items-center text-center mb-4">
                <Avatar name={membership?.name || "?"} size={64} src={groupAvatarMap[activeGroupId]} />
                <div style={{ color: palette.text, fontSize: "16px", fontWeight: 700, marginTop: "10px" }}>
                  {membership?.name || "Group"}
                </div>
                {groupInfo?.description && (
                  <p className="text-xs mt-1" style={{ color: palette.textMuted, maxWidth: "300px" }}>{groupInfo.description}</p>
                )}
              </div>

              <div className="mb-4">
                <GroupCampfire
                  members={groupMembersList}
                  messages={groupMessages.filter((m) => !m.group_id || m.group_id === activeGroupId)}
                  memberCount={groupInfo?.memberCount}
                  me={communityUsername}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="rounded-lg py-2 text-center" style={{ background: palette.field, border: `1px solid ${palette.border}` }}>
                  <div style={{ color: palette.text, fontSize: "15px", fontWeight: 700, fontFamily: mono }}>{groupInfo?.memberCount ?? groupMembersList.length ?? 0}</div>
                  <div style={{ color: palette.textFaint, fontSize: "9.5px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Members</div>
                </div>
                <div className="rounded-lg py-2 text-center" style={{ background: palette.field, border: `1px solid ${palette.border}` }}>
                  <div style={{ color: palette.text, fontSize: "15px", fontWeight: 700, fontFamily: mono }}>{groupMessages.length || 0}</div>
                  <div style={{ color: palette.textFaint, fontSize: "9.5px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Messages</div>
                </div>
              </div>

              <div className="rounded-xl p-3.5 mb-2" style={{ background: palette.field, border: `1px solid ${palette.border}` }}>
                <div className="flex items-center justify-between py-1.5" style={{ borderBottom: `1px solid ${palette.border}` }}>
                  <span style={{ color: palette.textFaint, fontSize: "11.5px" }}>Owner</span>
                  <span style={{ color: palette.text, fontSize: "12.5px", fontWeight: 600 }}>{groupInfo?.createdBy || "—"}</span>
                </div>
                <div className="flex items-center justify-between py-1.5" style={{ borderBottom: `1px solid ${palette.border}` }}>
                  <span style={{ color: palette.textFaint, fontSize: "11.5px" }}>Visibility</span>
                  <span style={{ color: palette.text, fontSize: "12.5px", fontWeight: 600 }}>{groupInfo?.isPublic ? "Public" : "Private"}</span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span style={{ color: palette.textFaint, fontSize: "11.5px" }}>Created</span>
                  <span style={{ color: palette.text, fontSize: "12.5px", fontWeight: 600 }}>
                    {groupInfo?.createdAt ? new Date(groupInfo.createdAt).toLocaleDateString() : "—"}
                  </span>
                </div>
              </div>

              {groupInfo?.tags && groupInfo.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {groupInfo.tags.map((tag) => (
                    <span key={tag} style={{ fontSize: "10px", fontFamily: mono, color: palette.textMuted, background: palette.field, border: `1px solid ${palette.border}`, borderRadius: "999px", padding: "3px 9px" }}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {isOwner && (
                <p className="text-xs mt-3" style={{ color: palette.textFaint }}>
                  You own this group — edit the name, photo, or invite code under Settings.
                </p>
              )}
            </>
          ) : groupManageTab === "members" ? (
            <>
              {!groupMembersLoaded ? (
                <p className="text-xs" style={{ color: palette.textFaint }}>Loading members…</p>
              ) : (
                <>
{groupMembersList.map((mem) => {
  const memberIsAdmin = !!mem.isAdmin;
  const memberIsSignal = !!mem.isSignalProvider;
  return (
    <div key={mem.username} className="relative flex items-center justify-between rounded-xl px-3 py-2.5 mb-2"
      style={{
        background: palette.field,
        border: `1px solid ${mem.isOwner ? palette.gold + "55" : (memberIsAdmin || memberIsSignal) ? palette.green + "55" : palette.border}`,
      }}>
      <div className="flex items-center gap-2">
        <Avatar name={mem.username} size={26} src={mem.avatar} online={mem.isOnline} />
        <div>
          <div style={{ color: palette.text, fontSize: "13px", fontWeight: mem.isOwner || memberIsAdmin ? 600 : 400 }}>
            {mem.username}
          </div>
          <div style={{ color: palette.textFaint, fontSize: "10px", fontFamily: mono }}>
            {mem.isOnline ? <span style={{ color: palette.green }}>Online</span> : `Joined ${new Date(mem.joinedAt).toLocaleDateString()}`}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {mem.isOwner && (
          <span style={{ fontSize: "9px", fontFamily: mono, color: palette.gold, border: `1px solid ${palette.gold}`, borderRadius: "999px", padding: "1px 7px", textTransform: "uppercase" }}>
            Owner
          </span>
        )}
        {!mem.isOwner && memberIsAdmin && (
          <span style={{ fontSize: "9px", fontFamily: mono, color: palette.green, border: `1px solid ${palette.green}`, borderRadius: "999px", padding: "1px 7px", textTransform: "uppercase" }}>
            Admin
          </span>
        )}
        {!mem.isOwner && memberIsSignal && (
          <span style={{ fontSize: "9px", fontFamily: mono, color: palette.goldBright, border: `1px solid ${palette.goldBright}`, borderRadius: "999px", padding: "1px 7px", textTransform: "uppercase" }}>
            Signal
          </span>
        )}

        {isOwner && !mem.isOwner && (
          <div className="relative flex-shrink-0">
            <button
              type="button"
              onClick={() => setOpenRoleMenuFor(openRoleMenuFor === mem.username ? null : mem.username)}
              className={`flex items-center justify-center rounded-lg ${TAP}`}
              style={{
                width: "24px",
                height: "24px",
                background: openRoleMenuFor === mem.username ? palette.gold : palette.field,
                border: `1px solid ${openRoleMenuFor === mem.username ? palette.gold : palette.border}`,
                color: openRoleMenuFor === mem.username ? palette.letterbox : palette.textMuted,
              }}
              aria-label={`Manage role for ${mem.username}`}
            >
              <ChevronDown
                size={13}
                style={{
                  transform: openRoleMenuFor === mem.username ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.15s ease",
                }}
              />
            </button>

            {openRoleMenuFor === mem.username && (
              <div
                className="rounded-xl overflow-hidden"
                style={{
                  position: "absolute",
                  top: "28px",
                  right: 0,
                  zIndex: 5,
                  width: "170px",
                  background: palette.surface,
                  border: `1px solid ${palette.border}`,
                  boxShadow: palette.shadow,
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    memberIsAdmin ? demoteAdmin(mem.username) : promoteToAdmin(mem.username);
                    setOpenRoleMenuFor(null);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-left ${TAP}`}
                  style={{ borderBottom: `1px solid ${palette.border}` }}
                >
                  <span style={{ color: palette.text, fontSize: "12px" }}>Admin</span>
                  {memberIsAdmin && <Check size={13} style={{ color: palette.green }} />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    memberIsSignal ? demoteSignalProvider(mem.username) : promoteToSignalProvider(mem.username);
                    setOpenRoleMenuFor(null);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-left ${TAP}`}
                  style={{ borderBottom: `1px solid ${palette.border}` }}
                >
                  <span style={{ color: palette.text, fontSize: "12px" }}>Signal Provider</span>
                  {memberIsSignal && <Check size={13} style={{ color: palette.goldBright }} />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpenRoleMenuFor(null);
                    setPendingKick(mem.username);
                  }}
                  className={`w-full flex items-center gap-1.5 px-3 py-2.5 text-left ${TAP}`}
                >
                  <Trash2 size={12} style={{ color: palette.red }} />
                  <span style={{ color: palette.red, fontSize: "12px" }}>Remove from Group</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
})}
                  {groupMembersList.length === 0 && (
                    <p className="text-xs" style={{ color: palette.textFaint }}>No members found.</p>
                  )}
                  {isOwner && (
                    <p className="text-xs mt-3" style={{ color: palette.textFaint }}>
                      As owner, you can remove members and delete anyone's messages from the chat.
                    </p>
                  )}
                </>
              )}
            </>
          ) : groupManageTab === "requests" ? (
            <>
              {!groupJoinRequestsLoaded ? (
                <p className="text-xs" style={{ color: palette.textFaint }}>Loading requests\u2026</p>
              ) : groupJoinRequests.length === 0 ? (
                <p className="text-xs" style={{ color: palette.textFaint }}>No pending join requests.</p>
              ) : (
                groupJoinRequests.map((r) => (
                  <div key={r.username} className="flex items-center justify-between rounded-xl px-3 py-2.5 mb-2" style={{ background: palette.field, border: `1px solid ${palette.border}` }}>
                    <div className="flex items-center gap-2">
                      <Avatar name={r.username} size={26} />
                      <span style={{ color: palette.text, fontSize: "13px" }}>{r.username}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => approveJoinRequest(r.username)} className={TAP} style={{ color: palette.green, fontSize: "11px", fontFamily: mono, fontWeight: 700 }}>
                        Approve
                      </button>
                      <button type="button" onClick={() => declineJoinRequest(r.username)} className={TAP} style={{ color: palette.red, fontSize: "11px", fontFamily: mono, fontWeight: 700 }}>
                        Decline
                      </button>
                    </div>
                  </div>
                ))
              )}
            </>
          ) : groupManageTab === "settings" ? (
            <>
              <span className="block mb-1.5 uppercase" style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "10.5px" }}>Group Photo</span>
              <div className="flex items-center gap-3 mb-4">
                <Avatar name={membership?.name || "?"} size={56} src={groupAvatarMap[activeGroupId]} />
                <button
                  type="button"
                  onClick={() => groupAvatarInputRef.current && groupAvatarInputRef.current.click()}
                  disabled={groupAvatarUploading}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg ${TAP}`}
                  style={{ background: palette.field, border: `1px solid ${palette.border}`, color: palette.text, fontFamily: mono, fontSize: "12px", fontWeight: 600 }}
                >
                  <Camera size={13} />
                  {groupAvatarUploading ? "Uploading…" : "Change Photo"}
                </button>
                <input ref={groupAvatarInputRef} type="file" accept="image/*" onChange={handleGroupAvatarChange} style={{ display: "none" }} />
              </div>

              <span className="block mb-1.5 uppercase" style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "10.5px" }}>Group Name</span>
              <input type="text" value={manageNameDraft} onChange={(e) => setManageNameDraft(e.target.value)} maxLength={40}
                className="w-full rounded-xl px-3 py-2.5 mb-3 bg-transparent outline-none"
                style={{ background: palette.field, border: `1px solid ${palette.border}`, color: palette.text, fontFamily: mono, fontSize: "13.5px" }} />
              <span className="block mb-1.5 uppercase" style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "10.5px" }}>Description</span>
              <input type="text" value={manageDescDraft} onChange={(e) => setManageDescDraft(e.target.value)} maxLength={100}
                className="w-full rounded-xl px-3 py-2.5 mb-3 bg-transparent outline-none"
                style={{ background: palette.field, border: `1px solid ${palette.border}`, color: palette.text, fontFamily: mono, fontSize: "13px" }} />
              <button type="button" onClick={renameCommunityGroup} className={`w-full rounded-xl py-2.5 mb-4 ${TAP}`}
                style={{ background: palette.gold, color: palette.letterbox, fontFamily: mono, fontSize: "13px", fontWeight: 700 }}>
                Save Changes
              </button>

              <span className="block mb-1.5 uppercase" style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "10.5px" }}>Invite Code</span>
              <p className="text-xs mb-2" style={{ color: palette.textFaint }}>
                Regenerating invalidates the old code — anyone who hasn't joined yet will need the new one.
              </p>
              <button type="button" onClick={regenerateGroupCode} disabled={regeneratingCode}
                className={`w-full flex items-center justify-center gap-2 rounded-xl py-2.5 ${TAP}`}
                style={{ background: palette.field, border: `1px solid ${palette.border}`, color: palette.text, fontFamily: mono, fontSize: "12.5px", fontWeight: 600 }}>
                <RotateCcw size={13} />
                {regeneratingCode ? "Generating…" : "Regenerate Invite Code"}
              </button>
              {newInviteCode && (
                <div className="rounded-xl px-3 py-2.5 mt-2" style={{ background: `${palette.gold}14`, border: `1px solid ${palette.gold}55` }}>
                  <div style={{ fontSize: "9.5px", color: palette.gold, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "2px" }}>New Code</div>
                  <div style={{ fontFamily: mono, fontSize: "14px", fontWeight: 700, color: palette.text }}>{newInviteCode}</div>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="rounded-xl p-3.5 mb-3" style={{ background: `${palette.red}0E`, border: `1px solid ${palette.red}44` }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <AlertTriangle size={14} style={{ color: palette.red }} />
                  <span style={{ color: palette.red, fontSize: "12.5px", fontWeight: 700 }}>Danger Zone</span>
                </div>
                <p className="text-xs" style={{ color: palette.textMuted }}>
                  Deleting the group removes it for every member permanently. This can't be undone.
                </p>
              </div>
              <button type="button" onClick={() => setPendingDeleteGroup(true)}
                className={`w-full flex items-center justify-center gap-2 rounded-xl py-2.5 ${TAP}`}
                style={{ background: palette.red, color: "#FFFFFF", fontFamily: mono, fontSize: "13px", fontWeight: 700 }}>
                <Trash2 size={14} />
                Delete Group Permanently
              </button>
            </>
          )}
          {manageMsg && <p className="text-xs mt-3" style={{ color: palette.textFaint }}>{manageMsg}</p>}
        </div>

        <div className="p-4" style={{ borderTop: `1px solid ${palette.border}` }}>
          <button type="button" onClick={() => { setGroupManageOpen(false); leaveCommunityGroup(activeGroupId); }}
            className={`w-full rounded-xl py-2.5 ${TAP}`}
            style={{ background: "transparent", border: `1px solid ${palette.red}`, color: palette.red, fontFamily: mono, fontSize: "13px", fontWeight: 600 }}>
            Leave Group
          </button>
        </div>
      </div>
    </div>
  );
})()}

{pendingDeleteMsg && (
  <div className="fixed inset-0 flex items-center justify-center z-50 p-6" style={{ background: "rgba(5,7,12,0.85)" }} onClick={() => setPendingDeleteMsg(null)}>
    <div className="w-full modal-in rounded-2xl p-5" style={{ maxWidth: "300px", background: palette.surface, border: `1px solid ${palette.border}` }} onClick={(e) => e.stopPropagation()}>
      <div style={{ color: palette.text, fontSize: "14px", fontWeight: 600, marginBottom: "6px" }}>Delete this message?</div>
      <p className="text-xs mb-4" style={{ color: palette.textMuted }}>This can't be undone.</p>
      <div className="flex gap-2">
        <button type="button" onClick={() => setPendingDeleteMsg(null)} className={`flex-1 rounded-lg py-2.5 ${TAP}`} style={{ background: "transparent", border: `1px solid ${palette.border}`, color: palette.textMuted, fontFamily: mono, fontSize: "13px" }}>Cancel</button>
        <button type="button" onClick={() => deleteCommunityMessage(pendingDeleteMsg)} className={`flex-1 rounded-lg py-2.5 ${TAP}`} style={{ background: palette.red, color: "#FFFFFF", fontFamily: mono, fontSize: "13px", fontWeight: 600 }}>Delete</button>
      </div>
    </div>
  </div>
)}

{pendingDeleteGroup && (
  <div className="fixed inset-0 flex items-center justify-center z-50 p-6" style={{ background: "rgba(5,7,12,0.85)" }} onClick={() => setPendingDeleteGroup(false)}>
    <div className="w-full modal-in rounded-2xl p-5" style={{ maxWidth: "320px", background: palette.surface, border: `1px solid ${palette.red}` }} onClick={(e) => e.stopPropagation()}>
      <div style={{ color: palette.text, fontSize: "14px", fontWeight: 600, marginBottom: "6px" }}>Delete this group permanently?</div>
      <p className="text-xs mb-4" style={{ color: palette.textMuted }}>Every member loses access and all messages are lost. This can't be undone.</p>
      <div className="flex gap-2">
        <button type="button" onClick={() => setPendingDeleteGroup(false)} className={`flex-1 rounded-lg py-2.5 ${TAP}`} style={{ background: "transparent", border: `1px solid ${palette.border}`, color: palette.textMuted, fontFamily: mono, fontSize: "13px" }}>Cancel</button>
        <button type="button" onClick={deleteCommunityGroupPermanently} className={`flex-1 rounded-lg py-2.5 ${TAP}`} style={{ background: palette.red, color: "#FFFFFF", fontFamily: mono, fontSize: "13px", fontWeight: 700 }}>Delete Forever</button>
      </div>
    </div>
  </div>
)}


{pendingKick && (
  <div className="fixed inset-0 flex items-center justify-center z-50 p-6" style={{ background: "rgba(5,7,12,0.85)" }} onClick={() => setPendingKick(null)}>
    <div className="w-full modal-in rounded-2xl p-5" style={{ maxWidth: "300px", background: palette.surface, border: `1px solid ${palette.border}` }} onClick={(e) => e.stopPropagation()}>
      <div style={{ color: palette.text, fontSize: "14px", fontWeight: 600, marginBottom: "6px" }}>Remove {pendingKick}?</div>
      <p className="text-xs mb-4" style={{ color: palette.textMuted }}>They'll lose access to this group.</p>
      <div className="flex gap-2">
        <button type="button" onClick={() => setPendingKick(null)} className={`flex-1 rounded-lg py-2.5 ${TAP}`} style={{ background: "transparent", border: `1px solid ${palette.border}`, color: palette.textMuted, fontFamily: mono, fontSize: "13px" }}>Cancel</button>
        <button type="button" onClick={() => kickCommunityMember(pendingKick)} className={`flex-1 rounded-lg py-2.5 ${TAP}`} style={{ background: palette.red, color: "#FFFFFF", fontFamily: mono, fontSize: "13px", fontWeight: 600 }}>Remove</button>
      </div>
    </div>
  </div>
)}

      {pendingScreenshotDelete && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-6"
          style={{ background: "rgba(5,7,12,0.85)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
          onClick={cancelDeleteScreenshot}
        >
          <div
            className="w-full modal-in rounded-2xl p-5"
            style={{ maxWidth: "300px", background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ color: palette.text, fontSize: "14px", fontWeight: 600, marginBottom: "6px", transition: THEME_TRANSITION }}>
              Delete this screenshot?
            </div>
            <p className="text-xs mb-4" style={{ color: palette.textMuted, transition: THEME_TRANSITION }}>
              This can't be undone.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={cancelDeleteScreenshot}
                className={`flex-1 rounded-lg py-2.5 ${TAP}`}
                style={{
                  background: "transparent",
                  border: `1px solid ${palette.border}`,
                  color: palette.textMuted,
                  fontFamily: mono,
                  fontSize: "13px",
                  transition: THEME_TRANSITION,
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteScreenshot}
                className={`flex-1 rounded-lg py-2.5 ${TAP}`}
                style={{
                  background: palette.red,
                  color: "#FFFFFF",
                  fontFamily: mono,
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingRevengeLog && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-6"
          style={{ background: "rgba(5,7,12,0.85)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
          onClick={cancelRevengeLog}
        >
          <div
            className="w-full modal-in rounded-2xl p-5"
            style={{ maxWidth: "340px", background: palette.surface, border: `1px solid ${palette.red}`, boxShadow: palette.shadow }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ color: palette.text, fontSize: "14px", fontWeight: 600, marginBottom: "6px" }}>
              Cooldown active
            </div>
            <p className="text-xs mb-4" style={{ color: palette.textMuted }}>
              Your last trade was a loss within the last {RUNTIME.REVENGE_WINDOW_MINUTES} minutes. Take a breath before
              logging another one \u2014 is this still your plan, or emotion?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={cancelRevengeLog}
                className={`flex-1 rounded-lg py-2.5 ${TAP}`}
                style={{
                  background: palette.gold,
                  color: palette.letterbox,
                  fontFamily: mono,
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                Wait it out
              </button>
              <button
                type="button"
                onClick={confirmRevengeLog}
                className={`flex-1 rounded-lg py-2.5 ${TAP}`}
                style={{
                  background: "transparent",
                  border: `1px solid ${palette.border}`,
                  color: palette.textMuted,
                  fontFamily: mono,
                  fontSize: "13px",
                }}
              >
                Log anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingNoteDelete && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-6"
          style={{ background: "rgba(5,7,12,0.85)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
          onClick={cancelDeleteNote}
        >
          <div
            className="w-full modal-in rounded-2xl p-5"
            style={{ maxWidth: "300px", background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ color: palette.text, fontSize: "14px", fontWeight: 600, marginBottom: "6px", transition: THEME_TRANSITION }}>
              Delete this note?
            </div>
            <p className="text-xs mb-4" style={{ color: palette.textMuted, transition: THEME_TRANSITION }}>
              This can't be undone.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={cancelDeleteNote}
                className={`flex-1 rounded-lg py-2.5 ${TAP}`}
                style={{
                  background: "transparent",
                  border: `1px solid ${palette.border}`,
                  color: palette.textMuted,
                  fontFamily: mono,
                  fontSize: "13px",
                  transition: THEME_TRANSITION,
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteNote}
                className={`flex-1 rounded-lg py-2.5 ${TAP}`}
                style={{
                  background: palette.red,
                  color: "#FFFFFF",
                  fontFamily: mono,
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {statementPeriod && (() => {
        const S = { text: "#19170F", muted: "#68624F", faint: "#9D9782", border: "#E6E1D4", green: "#0D9463", red: "#C43B2E", gold: "#2E5C9A", bg: "#FFFFFF", bgAlt: "#F4F2EB" };
        const data = computeStatementData(trades, journalEntries, customSetups, playbookCheckins, startingBalance, statementPeriod, customMoods);
        const fmtSigned = (n) => `${n >= 0 ? "+" : "-"}$${fmtMoney(n)}`;
        const fmtRatio = (n) => (Number.isFinite(n) ? n.toFixed(2) : "\u221e");

        return (
          <div
            className="fixed inset-0 flex items-start justify-center z-50 p-4 statement-print-wrapper"
            style={{ background: "rgba(5,7,12,0.9)", overflowY: "auto" }}
            onClick={() => setStatementPeriod(null)}
          >
            <div
              className="w-full modal-in"
              style={{ maxWidth: "600px", margin: "20px 0" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3 statement-no-print">
                <span style={{ color: "#EDEFF3", fontFamily: mono, fontSize: "14px", fontWeight: 600 }}>
                  Statement Preview
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 ${TAP}`}
                    style={{ background: S.gold, color: "#FFFFFF", fontFamily: mono, fontSize: "13px", fontWeight: 600 }}
                  >
                    <Download size={15} />
                    Print / Save as PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatementPeriod(null)}
                    className={`flex items-center justify-center rounded-lg px-3 ${TAP}`}
                    style={{ background: "transparent", border: "1px solid #7C8AA0", color: "#EDEFF3" }}
                    aria-label="Close"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div
                id="ledger-statement"
                style={{ background: S.bg, borderRadius: "12px", padding: "28px", fontFamily: sans }}
              >
                <div className="flex items-start justify-between mb-1" style={{ borderBottom: `2px solid ${S.gold}`, paddingBottom: "12px" }}>
                  <div>
                    <div style={{ fontFamily: mono, fontSize: "10px", letterSpacing: "0.14em", color: S.gold, textTransform: "uppercase" }}>
                      Tredzi — {statementPeriod.type === "month" ? "Monthly" : statementPeriod.type === "quarter" ? "Quarterly" : "Annual"} Statement
                    </div>
                    <div style={{ fontFamily: mono, fontSize: "1.4rem", fontWeight: 700, color: S.text }}>
                      {data.periodLabel}
                    </div>
                    {settings.traderAlias && (
                      <div style={{ fontSize: "11px", color: S.muted, marginTop: "2px" }}>{settings.traderAlias}</div>
                    )}
                  </div>
                  <div style={{ textAlign: "right", fontSize: "10px", color: S.faint, fontFamily: mono }}>
                    Generated {new Date().toLocaleDateString()}
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 my-4">
                  {[
                    { label: "Net P&L", value: fmtSigned(data.netPnl), color: data.netPnl >= 0 ? S.green : S.red },
                    { label: "% of Account", value: data.netPct === null ? "N/A" : fmtPct(data.netPct), color: S.text },
                    { label: "Trades", value: String(data.tradeCount), color: S.text },
                    { label: "Win Rate", value: `${data.winRate.toFixed(1)}%`, color: S.text },
                  ].map((c) => (
                    <div key={c.label} style={{ background: S.bgAlt, borderRadius: "8px", padding: "10px", textAlign: "center" }}>
                      <div style={{ fontSize: "9px", color: S.faint, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "3px" }}>{c.label}</div>
                      <div style={{ fontFamily: mono, fontSize: "13px", fontWeight: 700, color: c.color }}>{c.value}</div>
                    </div>
                  ))}
                </div>

                <div style={{ fontSize: "11px", fontWeight: 700, color: S.text, textTransform: "uppercase", letterSpacing: "0.06em", margin: "16px 0 8px" }}>
                  {statementPeriod.type === "month" ? "Daily P&L" : "Monthly P&L"}
                </div>
                <div style={{ background: S.bgAlt, borderRadius: "8px", padding: "12px 10px 4px" }}>
                  <div className="flex items-end" style={{ height: "80px", gap: "2px" }}>
                    {data.series.map((d, i) => (
                      <div
                        key={i}
                        title={`${d.label}: ${fmtSigned(d.pnl)}`}
                        style={{
                          flex: 1,
                          height: `${d.pnl === 0 ? 2 : Math.max(4, (Math.abs(d.pnl) / data.maxAbs) * 80)}px`,
                          background: d.pnl > 0 ? S.green : d.pnl < 0 ? S.red : S.faint,
                          borderRadius: "1px",
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between" style={{ fontSize: "8px", color: S.faint, fontFamily: mono, marginTop: "4px" }}>
                    <span>{data.series[0]?.label}</span>
                    <span>{data.series[data.series.length - 1]?.label}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 my-4">
                  <div>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: S.text, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>
                      Performance
                    </div>
                    {[
                      ["Profit Factor", fmtRatio(data.perf.profitFactor)],
                      ["Win/Loss Ratio", fmtRatio(data.perf.winLossRatio)],
                      ["Expectancy", fmtSigned(data.perf.expectancy)],
                      ["Largest Win", fmtSigned(data.perf.largestWin)],
                      ["Largest Loss", fmtSigned(data.perf.largestLoss)],
                      ["Max Drawdown", `$${fmtMoney(data.perf.maxDD)}`],
                    ].map(([l, v]) => (
                      <div key={l} className="flex justify-between" style={{ fontSize: "11px", padding: "3px 0", borderBottom: `1px solid ${S.border}` }}>
                        <span style={{ color: S.muted }}>{l}</span>
                        <span style={{ fontFamily: mono, color: S.text, fontWeight: 600 }}>{v}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: S.text, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>
                      Process & Discipline
                    </div>
                    {[
                      ["Best Period", data.bestBucket ? `${fmtSigned(data.bestBucket.pnl)} (${data.bestBucket.label})` : "N/A"],
                      ["Worst Period", data.worstBucket ? `${fmtSigned(data.worstBucket.pnl)} (${data.worstBucket.label})` : "N/A"],
                      ["Revenge Trades", `${data.revengeCost.revengeCount} (${fmtSigned(data.revengeCost.revengeTotal)})`],
                      ["Discipline Streak", `${data.discipline.current}d (best ${data.discipline.best}d)`],
                      ["Journal Completeness", `${data.completeness}%`],
                      ["Trade Plan Clean Days", data.cleanPct === null ? "N/A" : `${data.cleanPct}% (${data.checkinCount} check-ins)`],
                      ["Most Traded Pair", data.mostTradedPair ? `${data.mostTradedPair.pair} (${data.mostTradedPair.count}x)` : "N/A"],
                    ].map(([l, v]) => (
                      <div key={l} className="flex justify-between" style={{ fontSize: "11px", padding: "3px 0", borderBottom: `1px solid ${S.border}` }}>
                        <span style={{ color: S.muted }}>{l}</span>
                        <span style={{ fontFamily: mono, color: S.text, fontWeight: 600 }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {(data.bestSetup || data.bestMood) && (
                  <div className="flex gap-2 mb-2">
                    {data.bestSetup && (
                      <div style={{ flex: 1, background: `${S.gold}14`, border: `1px solid ${S.gold}55`, borderRadius: "8px", padding: "8px 10px" }}>
                        <div style={{ fontSize: "9px", color: S.gold, textTransform: "uppercase", letterSpacing: "0.06em" }}>Top Setup</div>
                        <div style={{ fontSize: "12px", color: S.text, fontWeight: 600 }}>{data.bestSetup.label}</div>
                      </div>
                    )}
                    {data.bestMood && (
                      <div style={{ flex: 1, background: `${S.green}14`, border: `1px solid ${S.green}55`, borderRadius: "8px", padding: "8px 10px" }}>
                        <div style={{ fontSize: "9px", color: S.green, textTransform: "uppercase", letterSpacing: "0.06em" }}>Best Mood</div>
                        <div style={{ fontSize: "12px", color: S.text, fontWeight: 600 }}>{data.bestMood.emoji} {data.bestMood.label}</div>
                      </div>
                    )}
                  </div>
                )}

                <div style={{ marginTop: "16px", paddingTop: "10px", borderTop: `1px solid ${S.border}`, fontSize: "9px", color: S.faint, fontFamily: mono }}>
                  Generated by Tredzi — not a substitute for broker-issued account statements.
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {tourActive && (() => {
  const step = TOUR_STEPS[tourStep];
  const rect = tourRect;
  const pad = 8;
  const vw = typeof window !== "undefined" ? window.innerWidth : 400;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const cardWidth = isDesktop ? 340 : Math.min(340, vw - 32);

  let cardStyle;
  if (!rect) {
    cardStyle = { position: "fixed", left: "50%", top: "50%", transform: "translate(-50%, -50%)", width: cardWidth };
  } else {
    const spaceBelow = vh - (rect.top + rect.height);
    const spaceAbove = rect.top;
    const placeBelow = spaceBelow > 200 || spaceBelow > spaceAbove;
    let left = rect.left + rect.width / 2 - cardWidth / 2;
    left = Math.max(16, Math.min(left, vw - cardWidth - 16));
    cardStyle = placeBelow
      ? { position: "fixed", left, top: rect.top + rect.height + pad + 8, width: cardWidth }
      : { position: "fixed", left, bottom: vh - rect.top + pad + 8, width: cardWidth };
  }

  return (
    <div className="fixed inset-0" style={{ zIndex: 90 }}>
      {rect ? (
        <>
          <div onClick={() => endTour(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, height: Math.max(0, rect.top - pad), background: "transparent" }} />
          <div onClick={() => endTour(false)} style={{ position: "fixed", top: rect.top + rect.height + pad, left: 0, right: 0, bottom: 0, background: "transparent" }} />
          <div onClick={() => endTour(false)} style={{ position: "fixed", top: rect.top - pad, left: 0, width: Math.max(0, rect.left - pad), height: rect.height + pad * 2, background: "transparent" }} />
          <div onClick={() => endTour(false)} style={{ position: "fixed", top: rect.top - pad, left: rect.left + rect.width + pad, right: 0, height: rect.height + pad * 2, background: "transparent" }} />
          <div
            style={{
              position: "fixed",
              top: rect.top - pad,
              left: rect.left - pad,
              width: rect.width + pad * 2,
              height: rect.height + pad * 2,
              borderRadius: "9999px",
              boxShadow: "0 0 0 9999px rgba(5,7,12,0.78)",
              pointerEvents: "none",
              transition: "top 0.25s ease, left 0.25s ease, width 0.2s ease, height 0.2s ease",
            }}
          />
        </>
      ) : (
        <div onClick={() => endTour(false)} style={{ position: "fixed", inset: 0, background: "rgba(5,7,12,0.82)" }} />
      )}

      <div
        className="modal-in rounded-2xl p-5"
        style={{ ...cardStyle, transition: "top 0.2s ease, left 0.2s ease, bottom 0.2s ease", background: palette.surface, border: `1px solid ${palette.gold}55`, boxShadow: palette.shadow, zIndex: 91 }}
      >
        <div className="flex items-center justify-between mb-2">
          <span style={{ fontFamily: mono, fontSize: "10px", color: palette.gold, letterSpacing: "0.1em" }}>
            STEP {tourStep + 1} OF {TOUR_STEPS.length}
          </span>
          <button type="button" onClick={() => endTour(true)} className={TAP} style={{ color: palette.textFaint }} aria-label="Skip tour">
            <X size={16} />
          </button>
        </div>
        <div style={{ fontFamily: display, fontSize: "16px", fontWeight: 700, color: palette.text, marginBottom: "6px" }}>
          {step.title}
        </div>
        <p className="text-sm mb-4" style={{ color: palette.textMuted }}>
          {step.text}
        </p>
        <div className="flex items-center gap-2">
          {tourStep > 0 && (
            <button type="button" onClick={() => goToTourStep(tourStep - 1)} className={`px-3 py-2 rounded-lg ${TAP}`} style={{ background: "transparent", border: `1px solid ${palette.border}`, color: palette.textMuted, fontFamily: mono, fontSize: "12.5px" }}>
              Back
            </button>
          )}
          <button type="button" onClick={() => endTour(true)} className={`px-3 py-2 rounded-lg ${TAP}`} style={{ background: "transparent", color: palette.textFaint, fontFamily: mono, fontSize: "12.5px" }}>
            Skip
          </button>
          <button
            type="button"
            onClick={() => goToTourStep(tourStep + 1)}
            className={`flex-1 rounded-lg py-2.5 ${TAP}`}
            style={{ background: palette.gold, color: palette.letterbox, fontFamily: mono, fontSize: "13px", fontWeight: 600 }}
          >
            {tourStep === TOUR_STEPS.length - 1 ? "Finish" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
})()}

      {ringingEvent && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-6"
          style={{ background: "rgba(5,7,12,0.92)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
        >
          <div className="w-full flex flex-col items-center text-center modal-in" style={{ maxWidth: "360px" }}>
            <div className="alarm-ring mb-4" style={{ color: palette.gold }}>
              <Bell size={48} />
            </div>
            <div
              className="uppercase mb-1"
              style={{ color: "#7C8AA0", letterSpacing: "0.12em", fontSize: "11px" }}
            >
              Alarm
            </div>
            <div
              style={{ fontFamily: mono, fontSize: "1.4rem", fontWeight: 700, color: "#EDEFF3", marginBottom: "6px" }}
            >
              {ringingEvent.name}
            </div>
            <div style={{ color: "#7C8AA0", fontSize: "13px", marginBottom: "28px" }}>
              Scheduled for {ringingEvent.time} today
            </div>
            <div className="flex gap-2 w-full">
              <button
                type="button"
                onClick={snoozeAlarm}
                className={`flex-1 rounded-lg py-3 ${TAP}`}
                style={{
                  background: palette.field,
                  border: `1px solid ${palette.border}`,
                  color: "#EDEFF3",
                  fontFamily: mono,
                  fontSize: "14px",
                }}
              >
                Snooze 5m
              </button>
              <button
                type="button"
                onClick={dismissAlarm}
                className={`flex-1 rounded-lg py-3 ${TAP}`}
                style={{
                  background: palette.gold,
                  color: palette.letterbox,
                  fontFamily: mono,
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// LiveFlame — animated fire used by Today's Pulse (kept in this file so App.jsx is self-contained)
// ─────────────────────────────────────────────────────────────
/**
 * LiveFlame — a layered, animated fire (SVG + SMIL, no images, no libraries).
 * Layers: soft glow -> red/orange body -> yellow middle -> white-hot core -> blue base,
 * plus two side licks and rising embers. Every layer morphs on its own timing, so it
 * never loops in an obvious way. Respects "reduce motion" (shows a still flame).
 *
 * props: size = height in px, active = lit or dim/out, dimColor = colour when inactive
 */
function LiveFlame({ size = 28, active = true, dimColor = "#68738F", style, className }) {
  const uid = useId().replace(/:/g, "");
  const id = (n) => `${n}-${uid}`;
  const [still, setStill] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setStill(mq.matches);
    apply();
    mq.addEventListener ? mq.addEventListener("change", apply) : mq.addListener(apply);
    return () => { mq.removeEventListener ? mq.removeEventListener("change", apply) : mq.removeListener(apply); };
  }, []);

  const width = Math.round(size * 0.72);
  const animate = active && !still;
  const embers = animate && size >= 20;

  const OUTER = [
    "M53.1 16.7 C54.1 51.3 87.6 65.1 85.6 95.1 C85.1 120.5 69.7 132.0 50.0 132.0 C30.3 132.0 14.2 120.5 13.5 92.8 C18.8 67.4 40.6 49.0 53.1 16.7Z",
    "M62.2 16.7 C58.0 51.3 87.1 65.1 86.7 95.1 C85.1 120.5 69.7 132.0 50.0 132.0 C30.3 132.0 14.1 120.5 15.2 92.8 C20.4 67.4 56.4 49.0 62.2 16.7Z",
    "M61.1 19.1 C60.8 53.0 87.0 66.5 87.7 95.9 C87.2 120.7 70.9 132.0 50.0 132.0 C29.1 132.0 12.0 120.7 13.9 93.6 C11.1 68.8 50.6 50.7 61.1 19.1Z",
    "M46.6 9.1 C54.6 45.9 86.3 60.7 84.7 92.7 C85.8 119.7 70.1 132.0 50.0 132.0 C29.9 132.0 13.4 119.7 12.1 90.2 C15.8 63.2 44.3 43.5 46.6 9.1Z",
    "M39.6 7.7 C47.3 45.0 92.9 59.9 89.6 92.2 C88.0 119.6 71.3 132.0 50.0 132.0 C28.7 132.0 11.2 119.6 9.5 89.7 C12.4 62.4 38.9 42.5 39.6 7.7Z",
    "M40.9 18.4 C54.1 52.4 89.5 66.1 88.0 95.6 C86.9 120.6 70.7 132.0 50.0 132.0 C29.3 132.0 12.4 120.6 14.3 93.4 C11.7 68.4 40.6 50.2 40.9 18.4Z",
    "M53.1 16.7 C54.1 51.3 87.6 65.1 85.6 95.1 C85.1 120.5 69.7 132.0 50.0 132.0 C30.3 132.0 14.2 120.5 13.5 92.8 C18.8 67.4 40.6 49.0 53.1 16.7Z",
  ];
  const MID = [
    "M58.1 34.8 C54.8 64.0 84.0 75.6 80.1 100.9 C78.6 122.3 66.1 132.0 50.0 132.0 C33.9 132.0 20.8 122.3 20.1 98.9 C20.3 77.6 48.6 62.0 58.1 34.8Z",
    "M57.8 40.0 C60.4 67.6 81.8 78.7 80.2 102.6 C77.6 122.8 65.5 132.0 50.0 132.0 C34.5 132.0 21.8 122.8 20.0 100.7 C23.7 80.5 50.0 65.8 57.8 40.0Z",
    "M52.8 40.5 C57.3 68.0 77.6 78.9 79.0 102.7 C76.9 122.9 65.1 132.0 50.0 132.0 C34.9 132.0 22.6 122.9 22.5 100.9 C24.5 80.8 45.1 66.1 52.8 40.5Z",
    "M40.6 41.1 C57.0 68.4 83.4 79.3 78.8 102.9 C79.5 122.9 66.6 132.0 50.0 132.0 C33.4 132.0 19.9 122.9 18.3 101.1 C24.4 81.1 41.5 66.6 40.6 41.1Z",
    "M44.6 39.0 C56.9 66.9 85.0 78.0 77.6 102.2 C78.4 122.7 65.9 132.0 50.0 132.0 C34.1 132.0 21.0 122.7 20.0 100.4 C24.6 79.9 38.9 65.0 44.6 39.0Z",
    "M58.1 34.8 C54.8 64.0 84.0 75.6 80.1 100.9 C78.6 122.3 66.1 132.0 50.0 132.0 C33.9 132.0 20.8 122.3 20.1 98.9 C20.3 77.6 48.6 62.0 58.1 34.8Z",
  ];
  const CORE = [
    "M51.0 80.4 C57.5 95.9 66.2 102.1 62.5 115.5 C63.9 126.8 57.8 132.0 50.0 132.0 C42.2 132.0 35.8 126.8 37.7 114.5 C39.9 103.1 42.1 94.9 51.0 80.4Z",
    "M54.3 86.0 C58.2 99.8 67.5 105.3 64.0 117.3 C65.1 127.4 58.5 132.0 50.0 132.0 C41.5 132.0 34.6 127.4 34.1 116.4 C39.1 106.3 47.2 98.9 54.3 86.0Z",
    "M45.3 85.1 C55.7 99.2 64.5 104.8 63.8 117.0 C65.4 127.3 58.6 132.0 50.0 132.0 C41.4 132.0 34.3 127.3 32.9 116.1 C34.8 105.7 44.8 98.2 45.3 85.1Z",
    "M47.6 80.7 C56.3 96.1 64.3 102.3 65.9 115.6 C63.9 126.9 57.8 132.0 50.0 132.0 C42.2 132.0 35.8 126.9 34.3 114.6 C32.5 103.3 37.1 95.1 47.6 80.7Z",
    "M51.0 80.4 C57.5 95.9 66.2 102.1 62.5 115.5 C63.9 126.8 57.8 132.0 50.0 132.0 C42.2 132.0 35.8 126.8 37.7 114.5 C39.9 103.1 42.1 94.9 51.0 80.4Z",
  ];
  const TL = [
    "M24.0 80.0 C28.0 68.0 30.0 56.0 19.2 42.0 C18.0 56.0 16.0 68.0 24.0 80.0Z",
    "M24.0 80.0 C22.0 68.0 24.0 56.0 9.6 42.0 C12.0 56.0 16.0 68.0 24.0 80.0Z",
    "M24.0 80.0 C30.0 68.0 32.0 56.0 22.4 42.0 C20.0 56.0 16.0 68.0 24.0 80.0Z",
    "M24.0 80.0 C25.0 68.0 27.0 56.0 14.4 42.0 C15.0 56.0 16.0 68.0 24.0 80.0Z",
    "M24.0 80.0 C28.0 68.0 30.0 56.0 19.2 42.0 C18.0 56.0 16.0 68.0 24.0 80.0Z",
  ];
  const TR = [
    "M76.0 86.0 C86.0 75.8 87.7 65.6 82.4 53.7 C77.5 65.6 69.2 75.8 76.0 86.0Z",
    "M76.0 86.0 C91.0 75.8 92.7 65.6 90.4 53.7 C82.5 65.6 69.2 75.8 76.0 86.0Z",
    "M76.0 86.0 C84.0 75.8 85.7 65.6 79.2 53.7 C75.5 65.6 69.2 75.8 76.0 86.0Z",
    "M76.0 86.0 C89.0 75.8 90.7 65.6 87.2 53.7 C80.5 65.6 69.2 75.8 76.0 86.0Z",
    "M76.0 86.0 C86.0 75.8 87.7 65.6 82.4 53.7 C77.5 65.6 69.2 75.8 76.0 86.0Z",
  ];

  // --- inactive: a quiet, dim silhouette (no motion) ---
  if (!active) {
    return (
      <svg width={width} height={size} viewBox="0 0 100 140" className={className} style={{ display: "inline-block", overflow: "visible", ...style }} aria-hidden="true">
        <path d={OUTER[0]} fill={dimColor} opacity="0.28" />
        <path d={CORE[0]} fill={dimColor} opacity="0.35" transform="translate(0 0)" />
      </svg>
    );
  }

  const A = (list, dur, begin) => {
    const n = list.length;
    const kts = Array.from({ length: n }, (_, i) => (i / (n - 1)).toFixed(3)).join(";");
    const ks = Array.from({ length: n - 1 }, () => "0.42 0 0.58 1").join(";");
    return (
      <animate attributeName="d" dur={`${dur}s`} begin={`${begin}s`} repeatCount="indefinite"
        calcMode="spline" keyTimes={kts} keySplines={ks} values={list.join(";")} />
    );
  };

  return (
    <svg width={width} height={size} viewBox="0 0 100 140" className={className}
      style={{ display: "inline-block", overflow: "visible", ...style }} aria-hidden="true">
      <defs>
        <radialGradient id={id("glow")} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#ff8a1e" stopOpacity="0.5" />
          <stop offset="0.5" stopColor="#ff5a00" stopOpacity="0.16" />
          <stop offset="1" stopColor="#ff5a00" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id("out")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffb340" stopOpacity="0.75" />
          <stop offset="0.35" stopColor="#ff7a10" />
          <stop offset="0.8" stopColor="#f0380a" />
          <stop offset="1" stopColor="#b81c00" />
        </linearGradient>
        <linearGradient id={id("mid")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe270" stopOpacity="0.9" />
          <stop offset="0.5" stopColor="#ffb21e" />
          <stop offset="1" stopColor="#ff7d0a" />
        </linearGradient>
        <linearGradient id={id("core")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fffbe0" />
          <stop offset="1" stopColor="#ffe688" />
        </linearGradient>
        <radialGradient id={id("blue")} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#5aa5ff" stopOpacity="0.8" />
          <stop offset="1" stopColor="#2f6bff" stopOpacity="0" />
        </radialGradient>
        <filter id={id("soft")} x="-30%" y="-20%" width="160%" height="140%">
          <feGaussianBlur stdDeviation="1.1" />
        </filter>
        <filter id={id("heat")} x="-20%" y="-10%" width="140%" height="130%">
          <feTurbulence type="fractalNoise" baseFrequency="0.018 0.05" numOctaves="2" seed="4" result="n">
            {animate && <animate attributeName="baseFrequency" dur="3.2s" repeatCount="indefinite"
              values="0.018 0.050;0.024 0.062;0.016 0.046;0.018 0.050" />}
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="n" scale="3.6" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>

      {/* warm glow that breathes */}
      <ellipse cx="50" cy="98" rx="60" ry="66" fill={`url(#${id("glow")})`}>
        {animate && <animate attributeName="opacity" dur="1.7s" repeatCount="indefinite"
          values="0.85;1;0.7;0.95;0.8;0.85" keyTimes="0;0.2;0.45;0.65;0.85;1" />}
      </ellipse>

      {/* the whole fire sways from its base and shimmers with heat */}
      <g filter={`url(#${id("heat")})`}>
        <g>
          {animate && <animateTransform attributeName="transform" type="rotate" dur="2.6s" repeatCount="indefinite"
            calcMode="spline" keyTimes="0;0.18;0.4;0.62;0.82;1" keySplines=".4 0 .6 1;.4 0 .6 1;.4 0 .6 1;.4 0 .6 1;.4 0 .6 1"
            values="0 50 132;2.4 50 132;-1.8 50 132;3 50 132;-2.6 50 132;0 50 132" />}

          {/* side licks that flick up and vanish */}
          <path d={TL[0]} fill={`url(#${id("out")})`} opacity="0.85" filter={`url(#${id("soft")})`}>
            {animate && A(TL, 1.35, -0.3)}
            {animate && <animate attributeName="opacity" dur="1.35s" begin="-0.3s" repeatCount="indefinite" values="0.2;0.9;0.75;0.1;0.2" keyTimes="0;0.3;0.6;0.9;1" />}
          </path>
          <path d={TR[0]} fill={`url(#${id("out")})`} opacity="0.85" filter={`url(#${id("soft")})`}>
            {animate && A(TR, 1.1, -0.7)}
            {animate && <animate attributeName="opacity" dur="1.1s" begin="-0.7s" repeatCount="indefinite" values="0.15;0.85;0.7;0.1;0.15" keyTimes="0;0.25;0.6;0.9;1" />}
          </path>

          {/* red / orange body */}
          <path d={OUTER[0]} fill={`url(#${id("out")})`} filter={`url(#${id("soft")})`}>
            {animate && A(OUTER, 1.9, 0)}
          </path>
          {/* yellow middle */}
          <path d={MID[0]} fill={`url(#${id("mid")})`} style={{ mixBlendMode: "screen" }}>
            {animate && A(MID, 1.35, -0.4)}
          </path>
          {/* white-hot core */}
          <path d={CORE[0]} fill={`url(#${id("core")})`} style={{ mixBlendMode: "screen" }}>
            {animate && A(CORE, 0.95, -0.2)}
          </path>
        </g>
        {/* blue base, like a real flame */}
        <ellipse cx="50" cy="127" rx="21" ry="8" fill={`url(#${id("blue")})`}>
          {animate && <animate attributeName="opacity" dur="1.2s" repeatCount="indefinite" values="0.9;0.6;0.95;0.7;0.9" />}
        </ellipse>
      </g>

      {/* rising embers */}
      {embers && [
        { x: 40, dx: -10, dur: 2.6, begin: 0, r: 1.8 },
        { x: 58, dx: 12, dur: 3.1, begin: -1.1, r: 1.5 },
        { x: 50, dx: 4, dur: 2.2, begin: -1.7, r: 1.2 },
      ].map((e, i) => (
        <circle key={i} cx={e.x} cy="110" r={e.r} fill="#ffc14d" opacity="0">
          <animate attributeName="cy" dur={`${e.dur}s`} begin={`${e.begin}s`} repeatCount="indefinite" values="112;60;-10" keyTimes="0;0.5;1" />
          <animate attributeName="cx" dur={`${e.dur}s`} begin={`${e.begin}s`} repeatCount="indefinite" values={`${e.x};${e.x + e.dx * 0.4};${e.x + e.dx}`} keyTimes="0;0.5;1" />
          <animate attributeName="opacity" dur={`${e.dur}s`} begin={`${e.begin}s`} repeatCount="indefinite" values="0;0.95;0.6;0" keyTimes="0;0.15;0.6;1" />
        </circle>
      ))}
    </svg>
  );
}
