// Cosmetics catalog + helpers. Single source of truth for what exists and how it unlocks.
// Cosmetics are visual only: no cosmetic ever changes a calculation or a limit.
//
// source:  "free" | "season:<week>" (free season track) | "pass:<week>" (supporter pass track)
//          | "plan:pro" | "plan:creator"

export const COSMETICS_KEY = "cosmetics:equipped";

export const RARITY = {
  common: { label: "Common", color: "#9AA6B8" },
  rare: { label: "Rare", color: "#4DA3FF" },
  epic: { label: "Epic", color: "#B77CFF" },
  legendary: { label: "Legendary", color: "#FFB84D" },
};

export const FRAMES = [
  { id: "none", label: "No frame", rarity: "common", source: "free" },
  { id: "aurora", label: "Aurora", rarity: "epic", source: "pass:4" },
  { id: "inferno", label: "Inferno", rarity: "epic", source: "pass:8" },
  { id: "galaxy", label: "Galaxy", rarity: "legendary", source: "season:8" },
  { id: "royal", label: "Royal Gold", rarity: "legendary", source: "plan:creator" },
];

export const TRACK_SKINS = [
  { id: "bar", label: "Classic bar", rarity: "common", source: "free" },
  { id: "mountain", label: "Mountain climb", rarity: "common", source: "free" },
  { id: "road", label: "Road to the flag", rarity: "rare", source: "season:4" },
  { id: "rocket", label: "Rocket launch", rarity: "rare", source: "pass:2" },
  { id: "ladder", label: "Ladder", rarity: "rare", source: "plan:pro" },
];

export const METER_SKINS = [
  { id: "bar", label: "Classic bar", rarity: "common", source: "free" },
  { id: "gauge", label: "Fuel gauge", rarity: "common", source: "free" },
  { id: "battery", label: "Battery", rarity: "rare", source: "season:6" },
  { id: "health", label: "Health bar", rarity: "rare", source: "pass:6" },
  { id: "shield", label: "Cracking shield", rarity: "epic", source: "plan:pro" },
];

export const CHIPS = [
  { id: "streak", label: "Streak", rarity: "common", source: "free" },
  { id: "journal", label: "Journals daily", rarity: "common", source: "free" },
  { id: "discipline", label: "Disciplined", rarity: "rare", source: "season:2" },
  { id: "no_revenge", label: "No revenge trades", rarity: "rare", source: "pass:2" },
  { id: "london", label: "London session", rarity: "common", source: "free" },
  { id: "newyork", label: "New York session", rarity: "common", source: "free" },
  { id: "funded", label: "Funded", rarity: "epic", source: "pass:6" },
  { id: "passed", label: "Challenge passed", rarity: "epic", source: "free" }, // earned by passing, see achievements
  { id: "mentor", label: "Mentor", rarity: "rare", source: "plan:creator" },
  { id: "early", label: "Early member", rarity: "legendary", source: "free" }, // granted manually
];

export const CATALOG = { frame: FRAMES, trackSkin: TRACK_SKINS, meterSkin: METER_SKINS, chip: CHIPS };

export const SEASON = { id: "s1", name: "Season 1", subtitle: "Discipline", weeks: 8 };

export const DEFAULT_EQUIPPED = { frame: "none", trackSkin: "mountain", meterSkin: "gauge", chips: [] };

export function isUnlockedSource(source, ctx = {}) {
  const { planId = "free", weeksDone = 0, hasPass = false } = ctx;
  if (!source || source === "free") return true;
  const [kind, arg] = source.split(":");
  if (kind === "plan") return arg === "pro" ? planId === "pro" || planId === "creator" : planId === arg;
  if (kind === "season") return weeksDone >= Number(arg);
  if (kind === "pass") return hasPass && weeksDone >= Number(arg);
  return false;
}

// ctx = { planId, weeksDone, hasPass } -> { frame:Set, trackSkin:Set, meterSkin:Set, chip:Set }
export function unlockedIds(ctx) {
  const out = {};
  Object.keys(CATALOG).forEach((kind) => {
    out[kind] = new Set(CATALOG[kind].filter((c) => isUnlockedSource(c.source, ctx)).map((c) => c.id));
  });
  return out;
}

// What each season node hands out, built from the catalog so there is one place to edit.
export function seasonRewards() {
  const free = {};
  const pass = {};
  Object.entries(CATALOG).forEach(([kind, list]) => {
    list.forEach((c) => {
      const [type, week] = (c.source || "").split(":");
      if (type === "season") free[week] = { kind, id: c.id, label: c.label, rarity: c.rarity };
      if (type === "pass") pass[week] = { kind, id: c.id, label: c.label, rarity: c.rarity };
    });
  });
  return { free, pass };
}

export function sanitizeEquipped(raw, unlocked) {
  const eq = { ...DEFAULT_EQUIPPED };
  if (!raw || typeof raw !== "object") return eq;
  const ok = (kind, id) => CATALOG[kind].some((c) => c.id === id) && (!unlocked || unlocked[kind].has(id));
  if (ok("frame", raw.frame)) eq.frame = raw.frame;
  if (ok("trackSkin", raw.trackSkin)) eq.trackSkin = raw.trackSkin;
  if (ok("meterSkin", raw.meterSkin)) eq.meterSkin = raw.meterSkin;
  if (Array.isArray(raw.chips)) eq.chips = raw.chips.filter((id) => ok("chip", id)).slice(0, 3);
  return eq;
}

export async function loadEquipped(unlocked) {
  try {
    const r = await window.storage.get(COSMETICS_KEY, false);
    return sanitizeEquipped(JSON.parse(r.value), unlocked);
  } catch (e) {
    return { ...DEFAULT_EQUIPPED };
  }
}
export async function saveEquipped(eq) {
  try {
    await window.storage.set(COSMETICS_KEY, JSON.stringify(eq), false);
  } catch (e) {
    /* storage unavailable: cosmetics just won't persist */
  }
}

// Challenge helpers: pure math, so skins never affect any rule calculation.
export const profitProgress = (pnl, target) => (target > 0 ? Math.max(0, Math.min(1, pnl / target)) : 0);
export const bufferLeft = (usedDrawdown, maxDrawdown) => (maxDrawdown > 0 ? Math.max(0, Math.min(1, 1 - usedDrawdown / maxDrawdown)) : 1);
