export function makeBlockId() {
  return `blk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function migrateNoteShape(n) {
  if (Array.isArray(n.blocks)) return n;
  const blocks = [{ id: makeBlockId(), type: "text", text: n.content || "" }];
  (Array.isArray(n.images) ? n.images : []).forEach((src) => {
    blocks.push({ id: makeBlockId(), type: "image", src });
  });
  const { content, images, ...rest } = n;
  return { ...rest, blocks };
}

export function blocksText(blocks) {
  return (blocks || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text || "")
    .join("");
}

export function countWords(text) {
  const trimmed = (text || "").trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function countLines(blocks) {
  const text = blocksText(blocks);
  if (!text) return 1;
  return text.split("\n").length;
}

export function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function countOccurrencesInBlocks(blocks, find) {
  if (!find) return 0;
  const re = new RegExp(escapeRegExp(find), "gi");
  let total = 0;
  (blocks || []).forEach((b) => {
    if (b.type !== "text") return;
    const matches = (b.text || "").match(re);
    if (matches) total += matches.length;
  });
  return total;
}

export function replaceAllInBlocks(blocks, find, replaceWith) {
  const re = new RegExp(escapeRegExp(find), "gi");
  return (blocks || []).map((b) =>
    b.type === "text" ? { ...b, text: (b.text || "").replace(re, replaceWith) } : b
  );
}

export function notePreview(blocks, maxLen = 90) {
  const flat = blocksText(blocks).replace(/\s+/g, " ").trim();
  if (!flat) return "";
  return flat.length > maxLen ? `${flat.slice(0, maxLen)}\u2026` : flat;
}

export function blocksToExportText(blocks) {
  return (blocks || []).map((b) => (b.type === "image" ? "\n[Image attached]\n" : b.text || "")).join("");
}

export function autoGrowBlock(el) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}
