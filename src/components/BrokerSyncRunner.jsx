import { useEffect, useRef } from "react";
import { getBrokerState, initBroker, registerImporter, syncNow } from "../lib/broker.js";

const CHECK_EVERY_MS = 60 * 1000;

// Mount once in App. Keeps the broker sync running on every tab, not only on the Broker tab.
export default function BrokerSyncRunner({ accountId, importTrades }) {
  const importRef = useRef(importTrades);
  importRef.current = importTrades;

  useEffect(() => {
    initBroker(accountId);
  }, [accountId]);

  useEffect(() => registerImporter((list) => (importRef.current ? importRef.current(list) : 0)), []);

  useEffect(() => {
    const due = (gap) => {
      const s = getBrokerState();
      const c = s.conn;
      if (!c || !c.autoLog) return false;
      if (s.phase === "connecting" || s.phase === "choose" || s.phase === "signin" || s.phase === "syncing") return false;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return false;
      if (typeof navigator !== "undefined" && navigator.onLine === false) return false;
      return Date.now() - (c.lastSyncAt || 0) >= gap;
    };
    const tick = () => {
      if (due(CHECK_EVERY_MS - 2000)) syncNow();
    };
    const wake = () => {
      if (due(30 * 1000)) syncNow();
    };
    const id = setInterval(tick, CHECK_EVERY_MS);
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("focus", wake);
    window.addEventListener("online", wake);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("focus", wake);
      window.removeEventListener("online", wake);
    };
  }, []);

  return null;
}
