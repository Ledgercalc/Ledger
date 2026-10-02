// --- Community (real backend — Cloudflare Worker + D1) ---
import { mergePlans } from "../lib/planStore.js";
export const COMMUNITY_API_BASE = "https://ledger-community.ledgercalc.workers.dev";

export const COMMUNITY_USERNAME_KEY = "community:username";

export const COMMUNITY_MEMBERSHIPS_KEY = "community:memberships";

export const COMMUNITY_SESSION_KEY = "community:session";

export const COMMUNITY_AVATAR_KEY = "community:avatar";

export const COMMUNITY_ONBOARDING_KEY = "community:onboarding_seen";

export const COMMUNITY_MESSAGE_POLL_MS = 6000;

export const COMMUNITY_JOIN_REQUESTS_KEY = "community:join-requests";

export async function communityApi(path, options = {}) {
  if (!COMMUNITY_API_BASE || COMMUNITY_API_BASE.includes("PASTE-YOUR")) {
    throw new Error("Set COMMUNITY_API_BASE to your deployed Worker URL first.");
  }
  const res = await fetch(`${COMMUNITY_API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  // The Worker attaches { plans: { username: "pro" | "creator" } } to responses that mention users,
  // so plan badges can show next to any name without extra requests.
  if (data && data.plans) mergePlans(data.plans);
  if (!res.ok) throw new Error(data.error || "Request failed.");
  return data;
}
