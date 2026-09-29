import { pad2 } from "./format.js";

export function nextOccurrenceMs(ev, now) {
  if (!ev.date) return Infinity;
  const [h, m] = ev.time.split(":").map(Number);
  const [y, mo, da] = ev.date.split("-").map(Number);
  return new Date(y, mo - 1, da, h, m, 0, 0).getTime();
}

export function formatCountdown(ms) {
  if (!Number.isFinite(ms) || ms < 0) return "N/A";
  const totalMin = Math.floor(ms / 60000);
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export function formatMinSec(ms) {
  if (!Number.isFinite(ms) || ms < 0) return "0:00";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${pad2(m)}:${pad2(s)}`;
  return `${m}:${pad2(s)}`;
}
