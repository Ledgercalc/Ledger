// Subscription plans. Keep the numbers in sync with PLAN_LIMITS / PLAN_PRICES in worker.js
// (the server is the source of truth and enforces them; GET /billing/plans returns the same data).
export const PLAN_IDS = ["free", "pro", "creator"];
export const PLAN_NAMES = { free: "Free", pro: "Pro", creator: "Creator" };
export const PLAN_RANK = { free: 0, pro: 1, creator: 2 };

export const PLAN_PRICES = {
  free: { monthly: 0, yearly: 0 },
  pro: { monthly: 9.99, yearly: 89 },
  creator: { monthly: 19.99, yearly: 179 },
};

export const PLAN_LIMITS = {
  free: { accounts: 1, coachDaily: 3, coachChats: 5, groupsOwned: 0, membersPerGroup: 10, historyDays: 30 },
  pro: { accounts: 3, coachDaily: 30, coachChats: 5, groupsOwned: 0, membersPerGroup: 100, historyDays: 365 },
  creator: { accounts: 10, coachDaily: 60, coachChats: 5, groupsOwned: 1, membersPerGroup: 1000, historyDays: 0 },
};

// Features that are simply on/off per plan: the minimum plan that unlocks each.
export const FEATURE_MIN_PLAN = {
  behaviorInsights: "pro",
  journalInsights: "pro",
  multiPropFirm: "pro",
  shareCardsNoWatermark: "pro",
  pdfReports: "pro",
  autoCloudBackup: "pro",
  cloudSync: "pro", // same data on every device you sign in on
  brokerSync: "pro", // MT5 / broker auto-logging and the live Active trade panel
  groupExtras: "pro", // wall, pins, group avatar, join approvals
  creatorGroupTools: "creator", // vault, signal providers, member analytics, discovery
};
export const hasFeature = (plan, feature) => PLAN_RANK[plan || "free"] >= PLAN_RANK[FEATURE_MIN_PLAN[feature] || "free"];

const fmtHistory = (d) => (d === 0 ? "Unlimited" : d >= 365 ? `${Math.round(d / 365)} year${d >= 730 ? "s" : ""}` : `${d} days`);

export const PLAN_TAGLINES = {
  free: "Start journaling your trades",
  pro: "Your journal on every device",
  creator: "Run your own trading community",
};

// Headline bullets shown on each plan card (built from the limits so they never drift from the numbers).
export const PLAN_HIGHLIGHTS = {
  free: [
    `${PLAN_LIMITS.free.accounts} trading account`,
    "Manual trade logging and calendar",
    "Basic Insights",
    `AI Coach: ${PLAN_LIMITS.free.coachDaily} messages a day`,
    "Join any community group",
  ],
  pro: [
    `${PLAN_LIMITS.pro.accounts} trading accounts`,
    "Cloud sync across all your devices",
    "MT5 auto-sync and live Active trade",
    "Full Insights and PDF reports",
    `AI Coach: ${PLAN_LIMITS.pro.coachDaily} messages a day`,
    "Share cards without watermark",
  ],
  creator: [
    "Everything in Pro",
    `${PLAN_LIMITS.creator.accounts} trading accounts`,
    "Create your own community group",
    "Vault, signal tools and member analytics",
    `AI Coach: ${PLAN_LIMITS.creator.coachDaily} messages a day`,
    "More broker accounts (coming soon)",
  ],
};

// Comparison table rows (star = headline feature). Sections mirror the pricing sheet.
export const PLAN_TABLE = [
  { section: "Trading tools" },
  { label: "Trading accounts", values: PLAN_IDS.map((p) => String(PLAN_LIMITS[p].accounts)) },
  { label: "Screenshots per trade", values: ["2", "2", "2"] },
  { label: "Backtest", values: ["Yes", "Yes", "Yes"] },
  { label: "Behaviour insights", star: true, values: ["No", "Yes", "Yes"] },
  { label: "Journal insights", star: true, values: ["No", "Yes", "Yes"] },
  { label: "Multi prop firm accounts", values: ["No", "Yes", "Yes"] },
  { section: "Sync" },
  { label: "Cloud sync across devices", star: true, values: ["No", "Yes", "Yes"] },
  { label: "MT5 auto-sync and live Active trade", star: true, values: ["No", "Yes", "Yes"] },
  { section: "AI Coach" },
  { label: "Messages per day", values: PLAN_IDS.map((p) => String(PLAN_LIMITS[p].coachDaily)) },
  { label: "Saved chats", values: PLAN_IDS.map((p) => String(PLAN_LIMITS[p].coachChats)) },
  { section: "Extras" },
  { label: "Share cards without watermark", values: ["No", "Yes", "Yes"] },
  { label: "PDF reports", values: ["No", "Yes", "Yes"] },
  { section: "Community groups" },
  { label: "Join groups", values: ["Yes", "Yes", "Yes"] },
  { label: "Create your own group", star: true, values: ["No", "No", String(PLAN_LIMITS.creator.groupsOwned)] },
  { label: "Members in your group", values: ["-", "-", String(PLAN_LIMITS.creator.membersPerGroup)] },
  { label: "Group history", values: ["-", "-", fmtHistory(PLAN_LIMITS.creator.historyDays)] },
  { label: "Wall, pins, group avatar, join approvals", values: ["-", "-", "Yes"] },
  { label: "Vault, signal providers, member analytics, discovery", values: ["-", "-", "Yes"] },
];
