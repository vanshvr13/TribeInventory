export const UNITS = ["unit", "box", "kg", "g", "l", "ml", "pack"];
export const STOCK_REASONS = ["Restock", "Inventory count", "Consumed", "Returned"];

const LOCALES = { en: "en-GB", ro: "ro-RO" };

export function trimNum(n) {
  return Number.isInteger(n) ? n : Math.round(n * 100) / 100;
}

export function expiryStatus(expiry) {
  if (!expiry) return "";
  const daysUntil = (new Date(expiry) - new Date(new Date().toDateString())) / 86400000;
  if (daysUntil < 0) return "expired";
  if (daysUntil <= 7) return "soon";
  return "ok";
}

export function formatDate(iso, lang = "en") {
  return new Date(iso).toLocaleDateString(LOCALES[lang], {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// "20:29" today, "Yesterday, 20:29", "12 Sep, 20:29", "12 Sep 2025, 20:29"
export function formatWhen(iso, lang = "en") {
  const d = new Date(iso);
  const now = new Date();
  const time = d.toLocaleTimeString(LOCALES[lang], { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === now.toDateString()) return time;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString())
    return `${lang === "ro" ? "Ieri" : "Yesterday"}, ${time}`;
  const opts = { day: "numeric", month: "short" };
  if (d.getFullYear() !== now.getFullYear()) opts.year = "numeric";
  return `${d.toLocaleDateString(LOCALES[lang], opts)}, ${time}`;
}

export function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}
