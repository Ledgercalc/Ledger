import { useSyncExternalStore } from "react";

// Tiny shared store so any component can ask "what plan is this user on?" without prop drilling.
//  - byName:  lowercase username -> "pro" | "creator" (filled from the `plans` map the Worker attaches
//             to every JSON response; free users are simply absent)
//  - me:      the signed-in account's own plan (from /auth/me)
//  - modal:   whether the Plans / upgrade screen is open
const byName = new Map();
let me = { plan: "free", interval: null, expiresAt: null, username: null };
let modal = { open: false, reason: "" };
let version = 0;
const listeners = new Set();
const emit = () => { version++; listeners.forEach((l) => l()); };
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };

export function mergePlans(map) {
  if (!map || typeof map !== "object") return;
  let changed = false;
  for (const [k, v] of Object.entries(map)) {
    const key = k.toLowerCase();
    if (byName.get(key) !== v) { byName.set(key, v); changed = true; }
  }
  if (changed) emit();
}

export function setMyPlan(data) {
  const plan = data && ["pro", "creator"].includes(data.plan) ? data.plan : "free";
  me = { plan, interval: data?.planInterval || null, expiresAt: data?.planExpiresAt || null, username: data?.username || me.username };
  if (me.username) { if (plan === "free") byName.delete(me.username.toLowerCase()); else byName.set(me.username.toLowerCase(), plan); }
  emit();
}
export function resetMyPlan() {
  if (me.username) byName.delete(me.username.toLowerCase());
  me = { plan: "free", interval: null, expiresAt: null, username: null };
  emit();
}
export const getMyPlan = () => me;
export const openPlans = (reason = "") => { modal = { open: true, reason }; emit(); };
export const closePlans = () => { modal = { open: false, reason: "" }; emit(); };

export const usePlanOf = (name) => {
  const get = () => (name ? byName.get(String(name).toLowerCase()) || "free" : "free");
  return useSyncExternalStore(subscribe, get, get);
};
export const useMyPlan = () => {
  useSyncExternalStore(subscribe, () => version, () => version);
  return me;
};
export const usePlansModal = () => {
  useSyncExternalStore(subscribe, () => version, () => version);
  return modal;
};
