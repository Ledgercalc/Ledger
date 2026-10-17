// The current stay-out lock, kept in localStorage so every screen can read it, not just the Partner tab.
// `until` is when the lock ends (ms), `by` is the partner who asked you to stay out.
const KEY = "tredzi.stayOut";

export function readStayOut() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "null");
    return v && v.until > Date.now() ? v : null;
  } catch (e) {
    return null;
  }
}

export function writeStayOut(v) {
  try {
    if (v) localStorage.setItem(KEY, JSON.stringify(v));
    else localStorage.removeItem(KEY);
    window.dispatchEvent(new Event("tredzi-stayout"));
  } catch (e) {
    /* storage unavailable: the lock still works from the server */
  }
}

// Handy for an "Add trade" button: disable it while this returns true.
export function isStayedOut() {
  return !!readStayOut();
}
