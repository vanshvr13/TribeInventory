import React, { useState } from "react";
import { Search, AlertTriangle, ImagePlus, ArrowUpDown, Folder as FolderIcon } from "lucide-react";
import { useSettings } from "../lib/i18n.jsx";
import { trimNum, expiryStatus, formatDate } from "../lib/format.js";
import { getDescendantFolderIds } from "../lib/folders.js";

const SORTS = {
  name: (a, b) => a.name.localeCompare(b.name),
  quantity: (a, b) => b.quantity - a.quantity,
  newest: (a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""),
  oldest: (a, b) => (a.updatedAt || "").localeCompare(b.updatedAt || ""),
};

function ItemCard({ item, onClick, folderLabel }) {
  const { t, lang, fmtMoney } = useSettings();
  const lowStock = item.minLevel !== null && item.quantity < item.minLevel;
  const status = expiryStatus(item.expiry);
  return (
    <div
      onClick={onClick}
      className={`bg-white border rounded-md overflow-hidden cursor-pointer hover:border-teal-400 transition-colors ${
        lowStock ? "border-amber-300" : "border-stone-200"
      }`}
    >
      <div className="aspect-square bg-stone-100 flex items-center justify-center relative">
        {item.photos[0] ? (
          <img src={item.photos[0]} alt={item.name} className="w-full h-full object-cover" />
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
        <div className="text-sm font-medium text-stone-900 truncate">{item.name}</div>
        <div className="text-xs text-stone-500 mt-1">
          {trimNum(item.quantity)} {t(`unit.${item.unit}`)}
          {folderLabel && <> · {folderLabel}</>}
        </div>
        <div className="text-sm font-semibold text-stone-900 mt-0.5">{fmtMoney(item.quantity * (item.price || 0))}</div>
        {item.expiry && (
          <div
            className={`text-xs mt-1 inline-block px-1.5 py-0.5 rounded ${
              status === "expired" ? "bg-red-100 text-red-700" : status === "soon" ? "bg-amber-100 text-amber-700" : "bg-stone-100 text-stone-500"
            }`}
          >
            {formatDate(item.expiry, lang)}
          </div>
        )}
      </div>
    </div>
  );
}

function FolderCard({ folder, itemCount, totalValue, thumbnail, onClick }) {
  const { t, fmtMoney } = useSettings();
  return (
    <div onClick={onClick} className="bg-white border border-stone-200 rounded-md overflow-hidden cursor-pointer hover:border-teal-400 transition-colors">
      <div className="aspect-square bg-stone-200 flex items-center justify-center">
        {thumbnail ? (
          <img src={thumbnail} alt={folder.name} className="w-full h-full object-cover" />
        ) : (
          <FolderIcon size={32} className="text-white" fill="currentColor" />
        )}
      </div>
      <div className="p-2.5">
        <div className="text-sm font-semibold text-stone-900 truncate">{folder.name}</div>
        <div className="text-xs text-stone-500 mt-1">
          {t("stats.items")}: {itemCount}
        </div>
        <div className="text-sm font-semibold text-stone-900 mt-0.5">{fmtMoney(totalValue)}</div>
      </div>
    </div>
  );
}

export default function ItemsView({ view, items, folders, shoppingItems, expiringItems, onOpenItem, onOpenFolder }) {
  const { t, fmtMoney } = useSettings();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("name");
  const [expiringOnly, setExpiringOnly] = useState(false);

  const isFolderView = view.kind === "folder";
  const currentFolderId = isFolderView ? view.folderId ?? null : null;
  const searching = search.trim() !== "";

  const recursiveItemsOf = (folderId) => {
    const ids = [folderId, ...getDescendantFolderIds(folders, folderId)];
    return items.filter((it) => ids.includes(it.folderId));
  };

  const subfolders = isFolderView ? folders.filter((f) => f.parentId === currentFolderId) : [];
  const directItems = isFolderView ? items.filter((it) => it.folderId === currentFolderId) : [];
  const recursiveScope = isFolderView ? recursiveItemsOf(currentFolderId) : [];

  // Browsing a folder with no active search/filter shows subfolders as cards, not a flattened item list
  const showFolderCards = isFolderView && !searching && !expiringOnly;

  const statsItems = view.kind === "expiring" ? expiringItems : view.kind === "shopping" ? shoppingItems : recursiveScope;
  const localExpiring = recursiveScope.filter((it) => ["soon", "expired"].includes(expiryStatus(it.expiry)));

  const scopeItems =
    view.kind === "expiring" ? expiringItems : view.kind === "shopping" ? shoppingItems : searching ? items : expiringOnly ? localExpiring : directItems;

  const q = search.trim().toLowerCase();
  const visible = scopeItems
    .filter((it) => !q || it.name.toLowerCase().includes(q) || (it.brand || "").toLowerCase().includes(q) || (it.provider || "").toLowerCase().includes(q))
    .sort(SORTS[sort]);

  const totalUnits = statsItems.reduce((sum, it) => sum + Number(it.quantity), 0);
  const totalValue = statsItems.reduce((sum, it) => sum + Number(it.quantity) * Number(it.price || 0), 0);
  const folderName = (id) => folders.find((f) => f.id === id)?.name;

  const visibleFolders = [...subfolders].sort((a, b) => a.name.localeCompare(b.name));
  const isEmpty = showFolderCards ? visibleFolders.length === 0 && visible.length === 0 : visible.length === 0;

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
          {isFolderView && (
            <span>
              {t("stats.folders")}: <b className="text-stone-900">{subfolders.length}</b>
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
        {isEmpty ? (
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
            {showFolderCards &&
              visibleFolders.map((f) => {
                const scoped = recursiveItemsOf(f.id);
                const thumbnail = scoped.find((it) => it.photos[0])?.photos[0] || null;
                return (
                  <FolderCard
                    key={f.id}
                    folder={f}
                    itemCount={items.filter((it) => it.folderId === f.id).length}
                    totalValue={scoped.reduce((sum, it) => sum + Number(it.quantity) * Number(it.price || 0), 0)}
                    thumbnail={thumbnail}
                    onClick={() => onOpenFolder(f.id)}
                  />
                );
              })}
            {visible.map((it) => (
              <ItemCard
                key={it.id}
                item={it}
                onClick={() => onOpenItem(it)}
                folderLabel={searching ? folderName(it.folderId) : null}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
