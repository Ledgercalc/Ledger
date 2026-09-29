import { palette } from "./theme.js";

export const AVATAR_HUES = [
  { bg: palette.gold, fg: palette.letterbox },
  { bg: palette.green, fg: "#08150F" },
  { bg: palette.red, fg: "#1A0806" },
  { bg: "#5B8AC4", fg: "#08131F" },
  { bg: "#C792E4", fg: "#170A1F" },
];

export const getInitials = (name) =>
  (name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";

export const feedTimeAgo = (ts) => {
  const diffMs = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString([], { month: "short", day: "numeric" });
};

export const FEED_REACTIONS = [
  { key: "fire", emoji: "🔥" },
  { key: "like", emoji: "👍" },
  { key: "love", emoji: "❤️" },
  { key: "laugh", emoji: "😂" },
  { key: "wow", emoji: "😮" },
];

export const STORY_WINDOW_MS = 24 * 60 * 60 * 1000;

export const isWithinStoryWindow = (ts) => !!ts && (Date.now() - new Date(ts).getTime()) < STORY_WINDOW_MS;

export const STORY_SLIDE_MS = 5000;

export const avatarStyleFor = (seed) => {
  let h = 0;
  for (let i = 0; i < (seed || "").length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_HUES[h % AVATAR_HUES.length];
};
