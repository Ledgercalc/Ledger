import { MARKET_SESSIONS } from "./sessions.js";
import { ArrowLeftRight, BookOpen, Building2, Clock, LineChart as CurveIcon, Lightbulb, Link2, Scale, Users } from "lucide-react";

export const EMOTIONS = [
  { id: "calm", label: "Calm", emoji: "\u{1F60C}" },
  { id: "confident", label: "Confident", emoji: "\u{1F4AA}" },
  { id: "rushed", label: "Rushed", emoji: "\u26A1" },
  { id: "tilted", label: "Tilted", emoji: "\u{1F624}" },
];

export const emotionMeta = (id) => EMOTIONS.find((e) => e.id === id);

export const SETUPS = [
  { id: "reversal", label: "Reversal" },
  { id: "pullback", label: "Pullback" },
  { id: "trend", label: "Trend" },
  { id: "breakout", label: "Breakout" },
];

export const setupMeta = (id) => SETUPS.find((s) => s.id === id);

export const MAX_CUSTOM_SETUPS = 6;

export const CUSTOM_SETUPS_STORAGE_KEY = "equity-curve:custom-setups";

export const HIDDEN_DEFAULT_SETUPS_KEY = "equity-curve:hidden-default-setups";

export const MAX_CUSTOM_MOODS = 6;

export const CUSTOM_MOODS_STORAGE_KEY = "equity-curve:custom-moods";

export const SETTINGS_STORAGE_KEY = "ledger:settings:v1";

export const DEFAULT_SETTINGS = {
  themeMode: "dark",
  defaultLandingTab: "risk",
  defaultAccountBalance: "",
  sizeRiskInputMode: "percent", // "percent" | "dollar"
  revengeLockEnabled: false,
  revengeWindowMinutes: "15",
  dailyLossLimit: "",
  maxTradesPerDay: "",
  alarmLeadMinutes: "15",
  hideDollarInShare: true,
  autoSyncTradesToJournal: false,
  showOnboardingTips: true,
  onboardingDismissed: [],
  traderAlias: "",
  statementPeriodType: "month",
  defaultInsightsTab: "overview",
  heatmapWeeksBack: "26",
  hiddenTabs: [],
  mobileNavPinnedTabs: [],
  journalTableLayout: "auto", // "auto" | "cards" | "table"
  showRevengeTag: true,
  tourCompleted: false,
};

export const NOTE_TAGS = ["FOMO", "Followed plan", "News trade"];

export const RUNTIME = {
  REVENGE_WINDOW_MINUTES: 15,
  REVENGE_WINDOW_MS: 15 * 60 * 1000,
  ALARM_LEAD_MINUTES: 15,
  ALARM_LEAD_MS: 15 * 60 * 1000,
};

export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export const ALARM_CHECK_INTERVAL_MS = 15000;

export const ALARM_STALE_WINDOW_MS = 10 * 60 * 1000;

export const TABS = [
  { id: "risk", label: "Challenge", icon: Scale },
  { id: "propfirm", label: "Prop Firm", icon: Building2 },
  { id: "fx", label: "Convert", icon: ArrowLeftRight },
  { id: "curve", label: "Curve", icon: CurveIcon },
  { id: "insights", label: "Insights", icon: Lightbulb },
  { id: "journal", label: "Journal", icon: BookOpen },
  { id: "broker", label: "Broker", icon: Link2 },
  { id: "sessions", label: "Sessions", icon: Clock },
  { id: "community", label: "Community", icon: Users },
];

export const MOBILE_NAV_PRIMARY_COUNT = 4;

export const NOTEPAD_STORAGE_KEY = "notepad:notes";

export const NOTEPAD_FONT_SIZES = [12, 13, 14, 16, 18, 20, 24];

export const DEFAULT_NOTEPAD_FONT_SIZE = 14;

export const MAX_JOURNAL_PHOTOS_PER_ROW = 2;

export const JOURNAL_STORAGE_KEY = "journal:entries";

export const JOURNAL_COLS_STORAGE_KEY = "journal:col-widths";

export const TREND_OPTIONS = [
  { id: "uptrend", label: "Uptrend" },
  { id: "downtrend", label: "Downtrend" },
  { id: "range", label: "Range" },
];

export const OUTCOME_OPTIONS = [
  { id: "win", label: "Win" },
  { id: "loss", label: "Loss" },
  { id: "breakeven", label: "Breakeven" },
];

export const CONFIDENCE_OPTIONS = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
];

export const outcomeLabel = (id) => OUTCOME_OPTIONS.find((o) => o.id === id)?.label || "";

export const confidenceLabel = (id) => CONFIDENCE_OPTIONS.find((c) => c.id === id)?.label || "";

export const moodLabelFor = (id) => emotionMeta(id)?.label || "";

export const sessionLabelFor = (id) => MARKET_SESSIONS.find((s) => s.id === id)?.label || "";

export const JOURNAL_COLUMNS = [
  { id: "date", label: "Date" },
  { id: "pair", label: "Pair" },
  { id: "trend", label: "Trend" },
  { id: "rr", label: "R:R" },
  { id: "pnl", label: "PnL" },
  { id: "setup", label: "Setup" },
  { id: "outcome", label: "Outcome" },
];

export const JOURNAL_DETAIL_FIELDS = [
  { id: "session", label: "Session" },
  { id: "mood", label: "Mood" },
  { id: "confidence", label: "Confidence" },
  { id: "entryPrice", label: "Entry Price" },
  { id: "closingPrice", label: "Closing Price" },
  { id: "mistake", label: "Mistake" },
  { id: "note", label: "Note" },
];

export const DEFAULT_JOURNAL_COL_WIDTHS = { date: 140, pair: 110, trend: 130, rr: 80, pnl: 90, setup: 130, outcome: 110 };

export const JOURNAL_TOGGLE_COL_WIDTH = 34;

export const JOURNAL_COL_MIN = 56;

export const JOURNAL_COL_MAX = 280;

export const PLAYBOOK_RULES_KEY = "playbook:rules";

export const PLAYBOOK_CHECKINS_KEY = "playbook:checkins";

export const PLAYBOOK_STARTER_RULES = [
  "Only trade my planned setups",
  "Never risk more than 1-2% per trade",
  "No trades within 15 minutes of a loss",
];

export const MAX_PLAYBOOK_RULES = 10;

export const STORAGE_KEY = "equity-curve:trades";

export const STORAGE_BAL_KEY = "equity-curve:starting-balance";

export const NEWS_STORAGE_KEY = "news:events:v4";

export const THEME_STORAGE_KEY = "ledger:theme";

export const GOALS_STORAGE_KEY = "ledger:goals";

export const FX_LAST_PAIR_KEY = "fx:last-pair";

export const EDGE_STORAGE_KEY = "ledger:edge-inputs";

export const CS_STORAGE_KEY = "ledger:challenge-inputs";

export const LINKED_FIRM_KEY = "ledger:linked-firm";

export const PS_STORAGE_KEY = "ledger:size-inputs";

export const ACCOUNTS_LIST_KEY = "ledger:accounts:list";

export const ACCOUNTS_ACTIVE_KEY = "ledger:accounts:active";

export const scopedKey = (base, accountId) => `${base}:${accountId}`;

export const DEFAULT_CS_INPUTS = {
  startBal: "",
  currentBal: "",
  targetPct: "10",
  dailyLossPct: "5",
  todayLoss: "",
  bestDay: "",
  rule: "30",
  maxDrawdownPct: "4",
  ddMode: "trail",
  minTradingDays: "0",
  minTrades: "0",
  minDayGainPct: "0",
  profitSplitPct: "80",
  profitSplitEnabled: true,
};

export const PROFIT_TARGET_OPTIONS = [5, 6, 8, 10, 12];

// The projection is computed over ALL projected trades (so final R / $ figures are correct),
// and only the chart is thinned to ~EDGE_CHART_MAX_POINTS points for readability/performance.
export const EDGE_CURVE_MAX_TRADES = 250000;

// safety ceiling only (10 years at ~68 trades/day)
export const EDGE_CHART_MAX_POINTS = 400;

export const EDGE_PROJECTION_PERIODS = [
  { label: "1 Week", days: 7 },
  { label: "1 Month", days: 30 },
  { label: "3 Months", days: 90 },
  { label: "6 Months", days: 180 },
  { label: "1 Year", days: 365 },
  { label: "5 Years", days: 1825 },
  { label: "10 Years", days: 3650 },
];
