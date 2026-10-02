// Usage (from your project root):
//   node tools/normalize-font-sizes.mjs src            -> dry run, shows what would change
//   node tools/normalize-font-sizes.mjs src --write    -> rewrites the files
//
// Moves every tab onto the same, larger type scale used by the Trade plan tab:
//   12 caption / 13 secondary / 14 body / 15 emphasis / 16 large body
// Headlines and big numbers (17px and up) and rem sizes are left alone.
// To make everything bigger or smaller, edit the two tables below and run again.
import fs from "node:fs";
import path from "node:path";

// fontSize: "12.5px"  and  text-[12.5px]
const PX = {
  8: 12, 9: 12, 9.5: 12, 10: 12, 10.5: 12, 11: 12, 11.5: 12,
  12: 13, 12.5: 13,
  13: 14, 13.5: 14,
  14: 15, 14.5: 15,
  15: 16, 16: 16,
};
// chart axis labels written as plain numbers, e.g. tick={{ fontSize: 10 }}
const NUM = { 8: 10, 9: 11, 10: 11, 11: 12 };

const [dir = "src", ...flags] = process.argv.slice(2);
const write = flags.includes("--write");
const exts = new Set([".jsx", ".js", ".tsx", ".ts"]);
const skip = new Set(["node_modules", "dist", "build", ".git"]);
let totalFiles = 0, totalChanges = 0;

export function fix(src) {
  let n = 0;
  let out = src.replace(/fontSize:(\s*)(["'])(\d+(?:\.\d+)?)px\2/g, (m, sp, q, v) => {
    const t = PX[Number(v)];
    if (t === undefined || t === Number(v)) return m;
    n++;
    return `fontSize:${sp}${q}${t}px${q}`;
  });
  out = out.replace(/text-\[(\d+(?:\.\d+)?)px\]/g, (m, v) => {
    const t = PX[Number(v)];
    if (t === undefined || t === Number(v)) return m;
    n++;
    return `text-[${t}px]`;
  });
  out = out.replace(/fontSize:(\s*)(\d+)(\s*[,}])/g, (m, sp, v, tail) => {
    const t = NUM[Number(v)];
    if (t === undefined) return m;
    n++;
    return `fontSize:${sp}${t}${tail}`;
  });
  return [out, n];
}

function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (skip.has(e.name)) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (exts.has(path.extname(e.name))) {
      const src = fs.readFileSync(p, "utf8");
      const [out, n] = fix(src);
      if (n) {
        totalFiles++; totalChanges += n;
        console.log(`${write ? "changed" : "would change"} ${n} sizes in ${p}`);
        if (write) fs.writeFileSync(p, out);
      }
    }
  }
}
walk(dir);
console.log(`\n${totalChanges} font sizes in ${totalFiles} files ${write ? "updated" : "would be updated (dry run, add --write to apply)"}.`);
