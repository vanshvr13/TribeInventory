import { jsPDF } from "jspdf";
import { trimNum } from "./format.js";

const MARGIN = 14;
const PAGE_W = 210;
const PAGE_H = 297;
const THUMB_MM = 14;
const THUMB_PX = 72; // small + heavily compressed keeps the PDF light enough to forward easily

const INK = [28, 25, 23]; // stone-900
const MUTED = [120, 113, 108]; // stone-500
const ACCENT = [180, 83, 9]; // amber-700
const RULE = [214, 211, 209]; // stone-300
const PLACEHOLDER = [245, 245, 244]; // stone-100

// Firebase Storage doesn't send CORS headers, so a direct cross-origin fetch() is
// blocked by the browser. Routing through this site's own /storage-proxy (see
// netlify.toml and vite.config.js) makes it same-origin instead, which sidesteps
// CORS entirely without needing any bucket configuration.
function proxied(url) {
  return url.replace(/^https:\/\/firebasestorage\.googleapis\.com/, "/storage-proxy");
}

// Fetches a photo and re-encodes it as a tiny square JPEG data URL for embedding.
// Returns null (never throws) so one broken photo can't fail the whole export.
async function toThumbnail(url) {
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
    return canvas.toDataURL("image/jpeg", 0.5);
  } catch {
    return null;
  }
}

function groupCostOf(items) {
  return items.reduce((sum, it) => sum + Math.max(0, it.minLevel - it.quantity) * Number(it.price || 0), 0);
}

// groups: output of groupByProvider(shoppingItems). Returns a Blob (application/pdf).
export async function generateShoppingListPdf(groups, { t, fmtMoney, totalCost }) {
  const thumbs = new Map();
  await Promise.all(
    groups
      .flatMap((g) => g.items)
      .map(async (it) => {
        if (it.photos[0]) thumbs.set(it.id, await toThumbnail(it.photos[0]));
      })
  );

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN;

  function ensureSpace(h) {
    if (y + h > PAGE_H - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...INK);
  doc.text(t("nav.shopping"), MARGIN, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(new Date().toLocaleDateString(), PAGE_W - MARGIN, y, { align: "right" });
  y += 7;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text(`${t("shopping.total")}: ${fmtMoney(totalCost)}`, PAGE_W - MARGIN, y, { align: "right" });
  y += 9;

  for (const group of groups) {
    ensureSpace(14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...INK);
    doc.text(group.provider || t("shopping.noProvider"), MARGIN, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(fmtMoney(groupCostOf(group.items)), PAGE_W - MARGIN, y, { align: "right" });
    y += 2;
    doc.setDrawColor(...RULE);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 5;

    for (const it of group.items) {
      ensureSpace(THUMB_MM + 3);
      const need = it.minLevel - it.quantity;
      const unit = t(`unit.${it.unit}`);
      const cost = Math.max(0, need) * Number(it.price || 0);

      const thumb = thumbs.get(it.id);
      if (thumb) {
        doc.addImage(thumb, "JPEG", MARGIN, y, THUMB_MM, THUMB_MM);
      } else {
        doc.setFillColor(...PLACEHOLDER);
        doc.rect(MARGIN, y, THUMB_MM, THUMB_MM, "F");
      }

      const textX = MARGIN + THUMB_MM + 4;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...INK);
      doc.text(it.name, textX, y + 5, { maxWidth: 95 });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...MUTED);
      doc.text(
        `${t("shopping.have")} ${trimNum(it.quantity)} · ${t("shopping.min")} ${trimNum(it.minLevel)} ${unit}`,
        textX,
        y + 10.5
      );

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...ACCENT);
      doc.text(`${t("shopping.needLabel")} ${trimNum(need)} ${unit}`, PAGE_W - MARGIN, y + 5, { align: "right" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...MUTED);
      doc.text(fmtMoney(cost), PAGE_W - MARGIN, y + 10.5, { align: "right" });

      y += THUMB_MM + 3;
    }
    y += 4;
  }

  return doc.output("blob");
}
