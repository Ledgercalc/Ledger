import { Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { COMMUNITY_API_BASE } from "../api/community.js";
import { readStayOut, writeStayOut } from "../lib/stayOut.js";
import { sans } from "../lib/theme.js";

// Mount this once, near the top of the app (for example next to your header), and it keeps a lock banner on every
// screen while a partner has asked you to stay out. It checks the server regularly and counts down live.
// To also stop logging trades, disable your "Add trade" button while isStayedOut() (from lib/stayOut.js) is true.
const countdown = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
};

export default function StayOutGate({ session }) {
  const token = session && session.token;
  const [lock, setLock] = useState(readStayOut());
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const sync = () => setLock(readStayOut());
    window.addEventListener("tredzi-stayout", sync);
    return () => window.removeEventListener("tredzi-stayout", sync);
  }, []);

  // Checks the server every 30 seconds, and every 6 seconds while a request to your partner is waiting for an answer.
  useEffect(() => {
    if (!token) return undefined;
    let stop = false;
    let timer = null;
    const loop = async () => {
      if (stop) return;
      let next = 30000;
      if (document.visibilityState === "visible") {
        try {
          const res = await fetch(`${COMMUNITY_API_BASE}/partners/lock`, { headers: { Authorization: `Bearer ${token}` } });
          if (res.ok && !stop) {
            const d = await res.json();
            const cur = readStayOut();
            writeStayOut(d.lock && d.lock.active ? { until: d.lock.until, by: cur && cur.until === d.lock.until ? cur.by : "" } : null);
            if (d.pending) next = 6000;
          }
        } catch (e) {
          /* offline: keep showing what we last knew */
        }
      }
      if (!stop) timer = setTimeout(loop, next);
    };
    const wake = () => { if (document.visibilityState === "visible") { clearTimeout(timer); loop(); } };
    loop();
    document.addEventListener("visibilitychange", wake);
    return () => { stop = true; clearTimeout(timer); document.removeEventListener("visibilitychange", wake); };
  }, [token]);

  useEffect(() => {
    if (!lock) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [lock]);

  if (!lock || lock.until <= now) return null;
  return (
    <div role="alert" style={{ position: "fixed", left: 0, right: 0, top: 0, zIndex: 900, padding: "calc(8px + env(safe-area-inset-top, 0px)) 14px 8px", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: "#f43f5e", color: "#fff", fontFamily: sans, fontSize: 12.5, fontWeight: 700, boxShadow: "0 2px 10px rgba(0,0,0,0.2)" }}>
      <Lock size={14} />
      <span>
        Locked out{lock.by ? ` by ${lock.by}` : ""} for {countdown(lock.until - now)}. Don't open new trades.
      </span>
    </div>
  );
}
