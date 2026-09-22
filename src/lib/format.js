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

// Groups items by provider (insertion order preserved within each group), providers
// sorted A-Z with items that have no provider set grouped last.
export function groupByProvider(items) {
  const map = new Map();
  for (const it of items) {
    const key = it.provider || "";
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(it);
  }
  return [...map.entries()]
    .map(([provider, groupItems]) => ({ provider, items: groupItems }))
    .sort((a, b) => {
      if (!a.provider && !b.provider) return 0;
      if (!a.provider) return 1;
      if (!b.provider) return -1;
      return a.provider.localeCompare(b.provider);
    });
}
