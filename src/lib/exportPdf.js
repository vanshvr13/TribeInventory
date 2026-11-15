import { jsPDF } from "jspdf";
import { trimNum } from "./format.js";
import { toThumbnail } from "./photoThumbnail.js";

const MARGIN = 14;
const PAGE_W = 210;
const PAGE_H = 297;
const THUMB_MM = 18;

const INK = [28, 25, 23]; // stone-900
const MUTED = [120, 113, 108]; // stone-500
const RULE = [214, 211, 209]; // stone-300
const PLACEHOLDER = [245, 245, 244]; // stone-100

// groups: [{ path: "Folder > Sub", items: [...] }], sorted by caller. Returns a Blob.
export async function generateItemsPdf(groups, { t, fmtMoney, title }) {
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
  doc.text(title, MARGIN, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(new Date().toLocaleDateString(), PAGE_W - MARGIN, y, { align: "right" });
  y += 9;

  for (const group of groups) {
    ensureSpace(14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...INK);
    doc.text(group.path, MARGIN, y);
    y += 2;
    doc.setDrawColor(...RULE);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 5;

    for (const it of group.items) {
      ensureSpace(THUMB_MM + 3);
      const unit = t(`unit.${it.unit}`);

      const thumb = thumbs.get(it.id);
      if (thumb) {
        doc.addImage(thumb, "JPEG", MARGIN, y, THUMB_MM, THUMB_MM);
      } else {
        doc.setFillColor(...PLACEHOLDER);
        doc.rect(MARGIN, y, THUMB_MM, THUMB_MM, "F");
      }

      const textX = MARGIN + THUMB_MM + 4;
      const midY = y + THUMB_MM / 2;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...INK);
      doc.text(it.name, textX, midY - 3, { maxWidth: 95 });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...MUTED);
      const minPart = it.minLevel !== null ? ` · ${t("shopping.min")} ${trimNum(it.minLevel)} ${unit}` : "";
      doc.text(`${trimNum(it.quantity)} ${unit}${minPart}`, textX, midY + 3);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(...INK);
      doc.text(fmtMoney(it.price * it.quantity), PAGE_W - MARGIN, midY - 3, { align: "right" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...MUTED);
      doc.text(it.provider || "", PAGE_W - MARGIN, midY + 3, { align: "right" });

      y += THUMB_MM + 3;
    }
    y += 4;
  }

  return doc.output("blob");
}
