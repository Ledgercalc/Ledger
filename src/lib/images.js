export const SCREENSHOT_MAX_DIM = 1600;

export const SCREENSHOT_START_QUALITY = 0.92;

export const SCREENSHOT_MIN_QUALITY = 0.5;

export const SCREENSHOT_MAX_BYTES = 1_200_000;

export const SCREENSHOT_MAX_PER_TRADE = 2;

export function tradeScreenshots(t) {
  if (Array.isArray(t.screenshots)) return t.screenshots;
  if (t.screenshot) return [t.screenshot];
  return [];
}

export function dataUrlBytes(dataUrl) {
  const commaIdx = dataUrl.indexOf(",");
  const base64Len = dataUrl.length - (commaIdx + 1);
  return Math.floor((base64Len * 3) / 4);
}

export function dataUrlToFile(dataUrl, filename) {
  const [header, base64] = dataUrl.split(",");
  const mimeMatch = header.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
}

export function drawScaled(img, dim) {
  let { width, height } = img;
  if (width > dim || height > dim) {
    if (width > height) {
      height = Math.round((height * dim) / width);
      width = dim;
    } else {
      width = Math.round((width * dim) / height);
      height = dim;
    }
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, width, height);
  return canvas;
}

export function resizeImageFile(file, maxDim = SCREENSHOT_MAX_DIM) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const encodeAt = (dim) => {
          const canvas = drawScaled(img, dim);
          let quality = SCREENSHOT_START_QUALITY;
          let dataUrl = canvas.toDataURL("image/jpeg", quality);
          while (dataUrlBytes(dataUrl) > SCREENSHOT_MAX_BYTES && quality > SCREENSHOT_MIN_QUALITY) {
            quality = Math.max(SCREENSHOT_MIN_QUALITY, quality - 0.1);
            dataUrl = canvas.toDataURL("image/jpeg", quality);
          }
          return dataUrl;
        };

        let dataUrl = encodeAt(maxDim);
        if (dataUrlBytes(dataUrl) > SCREENSHOT_MAX_BYTES && maxDim > 800) {
          dataUrl = encodeAt(Math.round(maxDim * 0.75));
        }
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error("Couldn't read that image"));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error("Couldn't read that file"));
    reader.readAsDataURL(file);
  });
}

export const STICKER_MAX_DIM = 320;

export const STICKER_MAX_BYTES = 140_000;

// headroom under the worker's stored limit, for canvas-resized static stickers
export const STICKER_RAW_MAX_BYTES = 2_000_000;

// animated GIF/WebP go through untouched (canvas would flatten the animation), so just cap the raw file size

// Static images only — draws to canvas to resize/compress, which flattens any animation
// to a single frame. GIF/WebP go through readStickerFileRaw instead so animation survives.
export function resizeStickerFile(file, maxDim = STICKER_MAX_DIM) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let dim = maxDim;
        let dataUrl = drawScaled(img, dim).toDataURL("image/png");
        while (dataUrlBytes(dataUrl) > STICKER_MAX_BYTES && dim > 96) {
          dim = Math.round(dim * 0.8);
          dataUrl = drawScaled(img, dim).toDataURL("image/png");
        }
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error("Couldn't read that image"));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error("Couldn't read that file"));
    reader.readAsDataURL(file);
  });
}

// GIF/WebP pass through unmodified so their animation is preserved — no canvas step,
// just a straight base64 read, gated by a raw file-size cap instead of a re-encoded one.
export function readStickerFileRaw(file) {
  return new Promise((resolve, reject) => {
    if (file.size > STICKER_RAW_MAX_BYTES) {
      reject(new Error("That file's too large — try a GIF/WebP under 2MB (trim it or shrink the resolution)."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Couldn't read that file"));
    reader.readAsDataURL(file);
  });
}
