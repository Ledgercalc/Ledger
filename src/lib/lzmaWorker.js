// Runs in a background thread so decoding Dukascopy files never freezes the page.
import { lzmaDecode } from "./lzma.js";

self.onmessage = (e) => {
  const { id, buf } = e.data;
  try {
    const out = lzmaDecode(buf);
    self.postMessage({ id, out }, [out.buffer]);
  } catch (err) {
    self.postMessage({ id, error: String((err && err.message) || err) });
  }
};
