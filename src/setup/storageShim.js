// --- localStorage shim for window.storage (drop-in replacement) ---
if (typeof window !== "undefined" && !window.storage) {
  window.storage = {
    async get(key, shared = false) {
      const raw = localStorage.getItem(key);
      if (raw === null) {
        // Matches the original API: missing keys throw, not return null
        throw new Error(`Key not found: ${key}`);
      }
      return { key, value: raw, shared: !!shared };
    },

    async set(key, value, shared = false) {
      try {
        localStorage.setItem(key, value);
        return { key, value, shared: !!shared };
      } catch (err) {
        // e.g. quota exceeded (common with lots of base64 screenshots)
        console.error("localStorage set failed:", err);
        return null;
      }
    },

    async delete(key, shared = false) {
      try {
        localStorage.removeItem(key);
        return { key, deleted: true, shared: !!shared };
      } catch (err) {
        console.error("localStorage delete failed:", err);
        return null;
      }
    },

    async list(prefix = "", shared = false) {
      try {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(prefix)) keys.push(k);
        }
        return { keys, prefix, shared: !!shared };
      } catch (err) {
        console.error("localStorage list failed:", err);
        return null;
      }
    },
  };
}
