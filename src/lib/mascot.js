// Tiny event bus so any file can make the crab react without prop drilling.
//   pokeCrab("win", { amount: 25 })   pokeCrab("loss", { amount: -40 })
//   pokeCrab("save") | "poof" | "type" | "tap" | "wave"  (optional { say: "custom text" })
export const CRAB_EVENT = "tredzi:crab";

export function pokeCrab(mood, detail = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CRAB_EVENT, { detail: { mood, ...detail } }));
}
