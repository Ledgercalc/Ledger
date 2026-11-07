// Shared by the Community feed, the profile post composer and the profile post grid.
// A post is stored in the existing `profile_posts.text` column, so the worker needs no change:
//   [tz]{"b":"Setups","t":{...trade}}\n<title>\n<details>
// Posts written before this (plain text) still work: they show as General posts with no title.

export const BOARDS = ["Setups", "Reviews", "Psychology", "Risk", "General"];
export const POST_MAX = 1000;
const MARK = "[tz]";

export function tradeMeta(t) {
  const pnl = Number(t && t.pnl) || 0;
  const dir = String((t && t.direction) || "").toLowerCase();
  return {
    s: String((t && t.pair) || "").slice(0, 20),
    d: /^(buy|long)/.test(dir) ? 1 : -1,
    o: pnl > 0 ? "Win" : pnl < 0 ? "Loss" : "BE",
    u: String((t && t.setup) || "").slice(0, 30),
    n: String((t && t.session) || "").slice(0, 20),
  };
}

export function encodePost({ board, title, note, trade }) {
  const meta = {};
  if (board && board !== "General") meta.b = board;
  if (trade) meta.t = trade;
  const ttl = String(title || "").replace(/\s+/g, " ").trim().slice(0, 90);
  const body = String(note || "").trim();
  if (!Object.keys(meta).length && !ttl) return body.slice(0, POST_MAX);
  const head = `${MARK}${JSON.stringify(meta)}\n`;
  const room = Math.max(0, POST_MAX - head.length - ttl.length - 1);
  return `${head}${ttl}\n${body.slice(0, room)}`;
}

export function decodePost(text) {
  const raw = String(text || "");
  if (raw.startsWith(MARK)) {
    const nl = raw.indexOf("\n");
    try {
      const meta = JSON.parse(raw.slice(MARK.length, nl < 0 ? undefined : nl));
      const rest = nl < 0 ? "" : raw.slice(nl + 1);
      const k = rest.indexOf("\n");
      return {
        board: BOARDS.includes(meta.b) ? meta.b : "General",
        title: (k < 0 ? rest : rest.slice(0, k)).trim(),
        note: (k < 0 ? "" : rest.slice(k + 1)).trim(),
        trade: meta.t && meta.t.s ? meta.t : null,
      };
    } catch (e) { /* fall through to plain */ }
  }
  return { board: "General", title: "", note: raw.trim(), trade: null };
}

// Readable text for places that just print the caption (profile grid, detail view).
export function plainOf(text) {
  const d = decodePost(text);
  return [d.title, d.note].filter(Boolean).join("\n\n");
}

// Shrink a photo to a JPEG data URL that fits the worker's 400 KB limit.
export function shrinkImage(file, max = 800) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(img.width * k));
        c.height = Math.max(1, Math.round(img.height * k));
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        let q = 0.82, out = c.toDataURL("image/jpeg", q);
        while (out.length > 380000 && q > 0.35) { q -= 0.1; out = c.toDataURL("image/jpeg", q); }
        URL.revokeObjectURL(url);
        if (out.length > 390000) reject(new Error("That photo is too large."));
        else resolve(out);
      } catch (e) { URL.revokeObjectURL(url); reject(e); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Couldn't read that photo.")); };
    img.src = url;
  });
}
