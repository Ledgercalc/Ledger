// Injects a <style> block once (idempotent), same pattern as the mascot and plan badge.
export function useCss(id, css) {
  if (typeof document === "undefined" || document.getElementById(id)) return;
  const el = document.createElement("style");
  el.id = id;
  el.textContent = css;
  document.head.appendChild(el);
}
export const clamp01 = (n) => Math.max(0, Math.min(1, Number(n) || 0));
