const THUMB_PX = 220; // ~250dpi at the 22mm size used in PDFs — crisp even zoomed in on a phone
const THUMB_QUALITY = 0.8;

// Firebase Storage doesn't send CORS headers, so a direct cross-origin fetch() is
// blocked by the browser. Routing through this site's own /storage-proxy (see
// netlify.toml and vite.config.js) makes it same-origin instead, which sidesteps
// CORS entirely without needing any bucket configuration.
function proxied(url) {
  return url.replace(/^https:\/\/firebasestorage\.googleapis\.com/, "/storage-proxy");
}

// Fetches a photo and re-encodes it as a tiny square JPEG data URL for embedding
// in a PDF. Returns null (never throws) so one broken photo can't fail the export.
export async function toThumbnail(url) {
  try {
    const res = await fetch(proxied(url));
    if (!res.ok) return null;
    const blob = await res.blob();
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(1, THUMB_PX / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = THUMB_PX;
    canvas.height = THUMB_PX;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#f5f5f4";
    ctx.fillRect(0, 0, THUMB_PX, THUMB_PX);
    ctx.drawImage(bitmap, (THUMB_PX - w) / 2, (THUMB_PX - h) / 2, w, h);
    return canvas.toDataURL("image/jpeg", THUMB_QUALITY);
  } catch {
    return null;
  }
}
