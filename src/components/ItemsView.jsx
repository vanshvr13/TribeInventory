import React, { useState } from "react";
import { Search, AlertTriangle, ImagePlus, ArrowUpDown } from "lucide-react";
import { useSettings } from "../lib/i18n.jsx";
import { trimNum, expiryStatus, formatDate } from "../lib/format.js";

const SORTS = {
  name: (a, b) => a.name.localeCompare(b.name),
  quantity: (a, b) => b.quantity - a.quantity,
  newest: (a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""),
  oldest: (a, b) => (a.updatedAt || "").localeCompare(b.updatedAt || ""),
};

export default function ItemsView({ view, items, folders, shoppingItems, expiringItems, onOpenItem }) {
  const { t, lang, fmtMoney } = useSettings();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("name");
  const [expiringOnly, setExpiringOnly] = useState(false);

  const isFolderView = view.kind === "folder";
  const searching = search.trim() !== "";

  // In folder views a non-empty search looks across ALL items; special views filter within themselves
  const baseItems =
    view.kind === "expiring"
      ? expiringItems
      : view.kind === "shopping"
      ? shoppingItems
      : searching || view.folderId === null
      ? items
      : items.filter((it) => it.folderId === view.folderId);

  const localExpiring = baseItems.filter((it) => ["soon", "expired"].includes(expiryStatus(it.expiry)));

  const q = search.trim().toLowerCase();
  const visible = (expiringOnly && isFolderView ? localExpiring : baseItems)
    .filter(
      (it) =>
        !q ||
        it.name.toLowerCase().includes(q) ||
        (it.brand || "").toLowerCase().includes(q) ||
        (it.provider || "").toLowerCase().includes(q)
    )
    .sort(SORTS[sort]);

  const totalUnits = baseItems.reduce((sum, it) => sum + Number(it.quantity), 0);
  const totalValue = baseItems.reduce((sum, it) => sum + Number(it.quantity) * Number(it.price || 0), 0);
  const subfolderCount = folders.filter((f) => f.parentId === (view.folderId ?? null)).length;
  const folderName = (id) => folders.find((f) => f.id === id)?.name;

  return (
    <>
      <div className="px-5 py-3 border-b border-stone-200 bg-white">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="flex items-center gap-2 bg-stone-100 rounded px-3 py-2 flex-1 min-w-[180px]">
            <Search size={15} className="text-stone-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isFolderView ? t("search.all") : t("search.items")}
              className="bg-transparent outline-none text-sm flex-1 placeholder:text-stone-400"
            />
          </div>
          <div className="flex items-center gap-1.5 text-sm text-stone-600">
            <ArrowUpDown size={14} className="text-stone-400" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="border border-stone-300 rounded px-2 py-1.5 text-sm outline-none focus:border-teal-600 bg-white"
            >
              <option value="name">{t("sort.name")}</option>
              <option value="quantity">{t("sort.quantity")}</option>
              <option value="newest">{t("sort.newest")}</option>
              <option value="oldest">{t("sort.oldest")}</option>
            </select>
          </div>
        </div>
        {isFolderView && (localExpiring.length > 0 || expiringOnly) && (
          <button
            onClick={() => setExpiringOnly((v) => !v)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border mb-3 ${
              expiringOnly ? "bg-amber-500 border-amber-500 text-white" : "border-stone-300 text-stone-600 hover:bg-stone-50"
            }`}
          >
            <AlertTriangle size={12} /> {t("stats.expiringSoon", { n: localExpiring.length })}
          </button>
        )}
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-stone-600">
          {isFolderView && !searching && (
            <span>
              {t("stats.folders")}: <b className="text-stone-900">{subfolderCount}</b>
            </span>
          )}
          <span>
            {t("stats.items")}: <b className="text-stone-900">{visible.length}</b>
          </span>
          <span>
            {t("stats.units")}: <b className="text-stone-900">{trimNum(totalUnits)}</b>
          </span>
          <span>
            {t("stats.totalValue")}: <b className="text-stone-900">{fmtMoney(totalValue)}</b>
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {visible.length === 0 ? (
          <div className="text-center text-stone-400 text-sm mt-16">
            {searching ? t("empty.search") : view.kind === "shopping" ? t("empty.shopping") : t("empty.items")}
          </div>
        ) : view.kind === "shopping" ? (
          <div className="space-y-2 max-w-3xl">
            {visible.map((it) => (
              <div
                key={it.id}
                onClick={() => onOpenItem(it)}
                className="flex items-center justify-between gap-3 bg-white border border-amber-200 rounded-md px-4 py-3 cursor-pointer hover:border-teal-400 transition-colors"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-stone-900 truncate">{it.name}</div>
                  <div className="text-xs text-stone-500 truncate">{it.provider || t("shopping.noProvider")}</div>
                </div>
                <div className="text-sm font-semibold text-amber-700 shrink-0">
                  {t("dash.need", { n: trimNum(it.minLevel - it.quantity), unit: t(`unit.${it.unit}`) })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
            {visible.map((it) => {
              const lowStock = it.minLevel !== null && it.quantity < it.minLevel;
              const status = expiryStatus(it.expiry);
              return (
                <div
                  key={it.id}
                  onClick={() => onOpenItem(it)}
                  className={`bg-white border rounded-md overflow-hidden cursor-pointer hover:border-teal-400 transition-colors ${
                    lowStock ? "border-amber-300" : "border-stone-200"
                  }`}
                >
                  <div className="aspect-square bg-stone-100 flex items-center justify-center relative">
                    {it.photos[0] ? (
                      <img src={it.photos[0]} alt={it.name} className="w-full h-full object-cover" />
                    ) : (
                      <ImagePlus size={28} className="text-stone-300" />
                    )}
                    {lowStock && (
                      <div className="absolute top-1.5 right-1.5 bg-amber-500 text-white rounded-full p-1">
                        <AlertTriangle size={12} />
                      </div>
                    )}
                  </div>
                  <div className="p-2.5">
                    <div className="text-sm font-medium text-stone-900 truncate">{it.name}</div>
                    <div className="text-xs text-stone-500 mt-1">
                      {trimNum(it.quantity)} {t(`unit.${it.unit}`)}
                      {searching && folderName(it.folderId) && <> · {folderName(it.folderId)}</>}
                    </div>
                    <div className="text-sm font-semibold text-stone-900 mt-0.5">
                      {fmtMoney(it.quantity * (it.price || 0))}
                    </div>
                    {it.expiry && (
                      <div
                        className={`text-xs mt-1 inline-block px-1.5 py-0.5 rounded ${
                          status === "expired"
                            ? "bg-red-100 text-red-700"
                            : status === "soon"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-stone-100 text-stone-500"
                        }`}
                      >
                        {formatDate(it.expiry, lang)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
