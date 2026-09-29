export const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

export const fmt = (n, d = 2) => (Number.isFinite(n) ? n.toFixed(d) : (0).toFixed(d));

export const fmtThousands = (n, d = 2) => {
  if (!Number.isFinite(n)) return (0).toFixed(d);
  return n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
};

export const fmtPct = (n, d = 1) => `${n >= 0 ? "+" : ""}${fmt(n, d)}%`;

export const fmtMoney = (n) => fmt(Math.abs(n), 2);

export const pad2 = (n) => String(n).padStart(2, "0");

export const dayKeyFromDate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export const dayKeyFromTs = (ts) => dayKeyFromDate(new Date(ts));

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export const formatDayLabel = (key) => {
  const [y, m, d] = key.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} ${d}, ${y}`;
};

export const formatShortDate = (ts) => {
  const d = new Date(ts);
  return `${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`;
};
