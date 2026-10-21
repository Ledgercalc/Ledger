// Minimal LZMA decoder (the ".lzma" / LZMA-alone container that Dukascopy's .bi5 files use).
// Header: 1 byte props, 4 bytes dictionary size, 8 bytes uncompressed size (all ff = unknown).
// Pure JavaScript, no dependencies. Returns a Uint8Array.

export function lzmaDecode(input) {
  let ip = 0;
  const props = input[ip++];
  if (props >= 225) throw new Error("Not an LZMA file");
  const lc = props % 9;
  const lp = Math.floor(props / 9) % 5;
  const pb = Math.floor(props / 45);
  ip += 4; // dictionary size (unused: we keep the whole output in memory)
  const sizeLo = (input[ip] | (input[ip + 1] << 8) | (input[ip + 2] << 16) | (input[ip + 3] << 24)) >>> 0;
  const sizeHi = (input[ip + 4] | (input[ip + 5] << 8) | (input[ip + 6] << 16) | (input[ip + 7] << 24)) >>> 0;
  ip += 8;
  const known = !(sizeLo === 0xffffffff && sizeHi === 0xffffffff);
  let outSize = known ? sizeHi * 4294967296 + sizeLo : Math.max(1 << 16, input.length * 6);
  if (outSize > 1 << 30) throw new Error("LZMA output too large");
  let out = new Uint8Array(outSize);
  let op = 0;

  // range decoder
  // range / code are kept as signed 32-bit ints (fast in JS); unsigned compares use the XOR 0x80000000 trick
  // (kept in an Int32Array: plain closure variables would be boxed as heap numbers and be ~50x slower)
  const rc = new Int32Array(2);
  rc[0] = -1;
  if (input[ip++] !== 0) throw new Error("Bad LZMA stream");
  for (let i = 0; i < 4; i++) rc[1] = (rc[1] << 8) | input[ip++];

  const PROB = 1024;
  const mk = (n) => new Uint16Array(n).fill(PROB);
  const isMatch = mk(12 << 4);
  const isRep = mk(12);
  const isRepG0 = mk(12);
  const isRepG1 = mk(12);
  const isRepG2 = mk(12);
  const isRep0Long = mk(12 << 4);
  const posSlot = mk(4 << 6);
  const posSpecial = mk(115);
  const align = mk(16);
  const mkLen = () => ({ choice: mk(2), low: mk(16 << 3), mid: mk(16 << 3), high: mk(256) });
  const lenDec = mkLen();
  const repLenDec = mkLen();
  const literal = mk(0x300 << (lc + lp));

  const bit = (probs, i) => {
    const p = probs[i];
    let range = rc[0];
    let code = rc[1];
    const bound = Math.imul(range >>> 11, p);
    let r;
    if ((code ^ 0x80000000) < (bound ^ 0x80000000)) {
      range = bound;
      probs[i] = p + ((2048 - p) >>> 5);
      r = 0;
    } else {
      range = (range - bound) | 0;
      code = (code - bound) | 0;
      probs[i] = p - (p >>> 5);
      r = 1;
    }
    if ((range & 0xff000000) === 0) {
      range <<= 8;
      code = (code << 8) | input[ip++];
    }
    rc[0] = range;
    rc[1] = code;
    return r;
  };
  const tree = (probs, off, n) => {
    let m = 1;
    for (let i = 0; i < n; i++) m = (m << 1) | bit(probs, off + m);
    return m - (1 << n);
  };
  const treeRev = (probs, off, n) => {
    let m = 1;
    let sym = 0;
    for (let i = 0; i < n; i++) {
      const b = bit(probs, off + m);
      m = (m << 1) | b;
      sym |= b << i;
    }
    return sym;
  };
  const direct = (n) => {
    let res = 0;
    let range = rc[0];
    let code = rc[1];
    for (let i = 0; i < n; i++) {
      range >>>= 1;
      let b = 0;
      if ((code ^ 0x80000000) >= (range ^ 0x80000000)) {
        code = (code - range) | 0;
        b = 1;
      }
      res = ((res << 1) | b) >>> 0;
      if ((range & 0xff000000) === 0) {
        range <<= 8;
        code = (code << 8) | input[ip++];
      }
    }
    rc[0] = range;
    rc[1] = code;
    return res;
  };
  const decodeLen = (ld, posState) => {
    if (!bit(ld.choice, 0)) return tree(ld.low, posState << 3, 3);
    if (!bit(ld.choice, 1)) return 8 + tree(ld.mid, posState << 3, 3);
    return 16 + tree(ld.high, 0, 8);
  };

  let state = 0;
  let rep0 = 0;
  let rep1 = 0;
  let rep2 = 0;
  let rep3 = 0;
  const pbMask = (1 << pb) - 1;
  const lpMask = (1 << lp) - 1;
  const grow = (need) => {
    if (known || need <= out.length) return;
    let n = out.length;
    while (n < need) n *= 2;
    const bigger = new Uint8Array(n);
    bigger.set(out);
    out = bigger;
  };

  while (known ? op < outSize : true) {
    if (ip > input.length + 8) throw new Error("LZMA data ended early");
    const posState = op & pbMask;
    if (!bit(isMatch, (state << 4) + posState)) {
      const prev = op > 0 ? out[op - 1] : 0;
      const base = 0x300 * (((op & lpMask) << lc) + (prev >> (8 - lc)));
      let sym = 1;
      if (state >= 7) {
        let matchByte = out[op - rep0 - 1];
        while (sym < 0x100) {
          const matchBit = (matchByte >> 7) & 1;
          matchByte <<= 1;
          const b = bit(literal, base + ((1 + matchBit) << 8) + sym);
          sym = (sym << 1) | b;
          if (matchBit !== b) break;
        }
      }
      while (sym < 0x100) sym = (sym << 1) | bit(literal, base + sym);
      grow(op + 1);
      out[op++] = sym & 0xff;
      state = state < 4 ? 0 : state < 10 ? state - 3 : state - 6;
      continue;
    }
    let len;
    if (!bit(isRep, state)) {
      rep3 = rep2;
      rep2 = rep1;
      rep1 = rep0;
      len = decodeLen(lenDec, posState);
      state = state < 7 ? 7 : 10;
      const lenState = len < 4 ? len : 3;
      const slot = tree(posSlot, lenState << 6, 6);
      let dist;
      if (slot < 4) dist = slot;
      else {
        const nd = (slot >> 1) - 1;
        dist = ((2 | (slot & 1)) << nd) >>> 0;
        if (slot < 14) dist += treeRev(posSpecial, dist - slot - 1, nd);
        else {
          dist += direct(nd - 4) * 16;
          dist += treeRev(align, 0, 4);
        }
      }
      if (dist === 0xffffffff) break; // end marker
      rep0 = dist;
    } else {
      if (!bit(isRepG0, state)) {
        if (!bit(isRep0Long, (state << 4) + posState)) {
          state = state < 7 ? 9 : 11;
          grow(op + 1);
          out[op] = out[op - rep0 - 1];
          op++;
          continue;
        }
      } else {
        let d;
        if (!bit(isRepG1, state)) d = rep1;
        else {
          if (!bit(isRepG2, state)) d = rep2;
          else {
            d = rep3;
            rep3 = rep2;
          }
          rep2 = rep1;
        }
        rep1 = rep0;
        rep0 = d;
      }
      len = decodeLen(repLenDec, posState);
      state = state < 7 ? 8 : 11;
    }
    len += 2;
    if (rep0 >= op) throw new Error("Corrupt LZMA data");
    if (known && op + len > outSize) len = outSize - op;
    grow(op + len);
    for (let i = 0; i < len; i++) {
      out[op] = out[op - rep0 - 1];
      op++;
    }
  }
  return known ? out : out.subarray(0, op);
}
