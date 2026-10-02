// Subscription plans. Keep the numbers in sync with PLAN_LIMITS / PLAN_PRICES in worker.js
// (the server is the source of truth and enforces them; GET /billing/plans returns the same data).
export const PLAN_IDS = ["free", "pro", "creator"];
export const PLAN_NAMES = { free: "Free", pro: "Pro", creator: "Creator" };
export const PLAN_RANK = { free: 0, pro: 1, creator: 2 };

export const PLAN_PRICES = {
  free: { monthly: 0, yearly: 0 },
  pro: { monthly: 7.99, yearly: 69.99 },
  creator: { monthly: 14.99, yearly: 119 },
};

export const PLAN_LIMITS = {
  free: { accounts: 1, coachDaily: 3, coachChats: 5, groupsOwned: 1, membersPerGroup: 10, historyDays: 30 },
  pro: { accounts: 5, coachDaily: 20, coachChats: 5, groupsOwned: 3, membersPerGroup: 100, historyDays: 365 },
  creator: { accounts: 10, coachDaily: 50, coachChats: 5, groupsOwned: 10, membersPerGroup: 1000, historyDays: 0 },
};

// Features that are simply on/off per plan: the minimum plan that unlocks each.
export const FEATURE_MIN_PLAN = {
  behaviorInsights: "pro",
  journalInsights: "pro",
  multiPropFirm: "pro",
  shareCardsNoWatermark: "pro",
  pdfReports: "pro",
  autoCloudBackup: "pro",
  groupExtras: "pro", // wall, pins, group avatar, join approvals
  creatorGroupTools: "creator", // vault, signal providers, member analytics, discovery
};
export const hasFeature = (plan, feature) => PLAN_RANK[plan || "free"] >= PLAN_RANK[FEATURE_MIN_PLAN[feature] || "free"];

const fmtHistory = (d) => (d === 0 ? "Unlimited" : d >= 365 ? `${Math.round(d / 365)} year${d >= 730 ? "s" : ""}` : `${d} days`);

// Comparison table rows (star = headline feature). Sections mirror the pricing sheet.
export const PLAN_TABLE = [
  { section: "Trading tools" },
  { label: "Accounts", values: PLAN_IDS.map((p) => String(PLAN_LIMITS[p].accounts)) },
  { label: "Screenshots per trade", star: true, values: ["2", "2", "2"] },
  { label: "Backtest", star: true, values: ["Yes", "Yes", "Yes"] },
  { label: "Behaviour insights", star: true, values: ["No", "Yes", "Yes"] },
  { label: "Journal insights", star: true, values: ["No", "Yes", "Yes"] },
  { label: "Multi prop firm accounts", star: true, values: ["No", "Yes", "Yes"] },
  { section: "AI Coach" },
  { label: "Messages per day", values: PLAN_IDS.map((p) => String(PLAN_LIMITS[p].coachDaily)) },
  { label: "Saved chats", values: PLAN_IDS.map((p) => String(PLAN_LIMITS[p].coachChats)) },
  { section: "Extras" },
  { label: "Share cards without watermark", values: ["No", "Yes", "Yes"] },
  { label: "PDF reports", values: ["No", "Yes", "Yes"] },
  { label: "Auto cloud backup", values: ["No", "Yes", "Yes"] },
  { section: "Groups" },
  { label: "Groups you can own", values: PLAN_IDS.map((p) => String(PLAN_LIMITS[p].groupsOwned)) },
  { label: "Members per group", star: true, values: PLAN_IDS.map((p) => String(PLAN_LIMITS[p].membersPerGroup)) },
  { label: "Group history", values: PLAN_IDS.map((p) => fmtHistory(PLAN_LIMITS[p].historyDays)) },
  { label: "Wall, pins, group avatar, join approvals", values: ["No", "Yes", "Yes"] },
  { label: "Vault, signal providers, member analytics, discovery", values: ["No", "No", "Yes"] },
];
