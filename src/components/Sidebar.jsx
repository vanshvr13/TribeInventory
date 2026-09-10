import React, { useState } from "react";
import {
  LayoutDashboard,
  Package,
  AlertTriangle,
  ShoppingCart,
  BarChart3,
  Folder,
  FolderPlus,
  ChevronRight,
  ChevronDown,
  Trash2,
  Settings,
  LogOut,
} from "lucide-react";
import { useSettings } from "../lib/i18n.jsx";

function NavButton({ active, icon: Icon, label, count, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 rounded px-2 py-1.5 text-sm mb-1 ${
        active ? "bg-teal-50 text-teal-800 font-medium" : "text-stone-700 hover:bg-stone-50"
      }`}
    >
      <Icon size={15} className={active ? "text-teal-700" : "text-stone-400"} />
      <span className="flex-1 text-left truncate">{label}</span>
      {count > 0 && <span className="text-xs text-stone-400">{count}</span>}
    </button>
  );
}

export default function Sidebar({
  open,
  onCloseDrawer,
  view,
  onSelect,
  folders,
  expanded,
  onToggleExpand,
  expiringCount,
  shoppingCount,
  onNewFolder,
  onDeleteFolder,
  onOpenSettings,
  onSignOut,
}) {
  const { t } = useSettings();
  const [foldersOpen, setFoldersOpen] = useState(true);
  const rootFolders = folders.filter((f) => f.parentId === null);
  const childrenOf = (id) => folders.filter((f) => f.parentId === id);
  const allFoldersActive = view.kind === "folder" && view.folderId === null;

  function renderFolderNode(folder, depth) {
    const kids = childrenOf(folder.id);
    const isOpen = expanded[folder.id];
    const isActive = view.kind === "folder" && view.folderId === folder.id;
    return (
      <div key={folder.id}>
        <div
          className={`group flex items-center gap-1 rounded pr-1 ${isActive ? "bg-teal-50" : "hover:bg-stone-50"}`}
          style={{ paddingLeft: `${8 + depth * 16}px` }}
        >
          {kids.length > 0 ? (
            <button onClick={() => onToggleExpand(folder.id)} className="p-0.5 shrink-0 text-stone-500">
              {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          ) : (
            <span className="w-4 shrink-0" />
          )}
          <button
            onClick={() => onSelect({ kind: "folder", folderId: folder.id })}
            className={`flex-1 flex items-center gap-1.5 py-1.5 text-sm text-left min-w-0 ${
              isActive ? "text-teal-800 font-medium" : "text-stone-700"
            }`}
          >
            <Folder size={15} className={isActive ? "text-teal-700" : "text-stone-400"} />
            <span className="truncate">{folder.name}</span>
          </button>
          <button
            onClick={() => onDeleteFolder(folder.id)}
            className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-stone-400 hover:text-red-600 p-1 rounded shrink-0"
          >
            <Trash2 size={13} />
          </button>
        </div>
        {isOpen && kids.map((k) => renderFolderNode(k, depth + 1))}
      </div>
    );
  }

  return (
    <>
      {open && <div onClick={onCloseDrawer} className="fixed inset-0 z-20 bg-stone-900/40 sm:hidden" />}
      <div
        className={`fixed sm:static inset-y-0 left-0 z-30 w-64 shrink-0 bg-white border-r border-stone-200 flex flex-col transition-transform duration-200 sm:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-4 py-4 border-b border-stone-200">
          <div className="text-base font-semibold text-stone-900">Tribe Inventory</div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <NavButton
            active={view.kind === "dashboard"}
            icon={LayoutDashboard}
            label={t("nav.dashboard")}
            onClick={() => onSelect({ kind: "dashboard" })}
          />
          <div
            className={`flex items-center gap-1 rounded mb-1 ${allFoldersActive ? "bg-teal-50" : "hover:bg-stone-50"}`}
          >
            <button
              onClick={() => onSelect({ kind: "folder", folderId: null })}
              className={`flex-1 flex items-center gap-2 px-2 py-1.5 text-sm min-w-0 ${
                allFoldersActive ? "text-teal-800 font-medium" : "text-stone-700"
              }`}
            >
              <Package size={15} className={allFoldersActive ? "text-teal-700" : "text-stone-400"} />
              <span className="flex-1 text-left truncate">{t("nav.allFolders")}</span>
            </button>
            {rootFolders.length > 0 && (
              <button
                onClick={() => setFoldersOpen((v) => !v)}
                className="p-1.5 shrink-0 text-stone-400 hover:text-stone-700"
              >
                {foldersOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            )}
          </div>
          {foldersOpen && rootFolders.map((f) => renderFolderNode(f, 1))}
          <NavButton
            active={view.kind === "expiring"}
            icon={AlertTriangle}
            label={t("nav.expiring")}
            count={expiringCount}
            onClick={() => onSelect({ kind: "expiring" })}
          />
          <NavButton
            active={view.kind === "shopping"}
            icon={ShoppingCart}
            label={t("nav.shopping")}
            count={shoppingCount}
            onClick={() => onSelect({ kind: "shopping" })}
          />
          <NavButton
            active={view.kind === "activity"}
            icon={BarChart3}
            label={t("nav.activity")}
            onClick={() => onSelect({ kind: "activity" })}
          />
        </div>
        <div className="p-2 border-t border-stone-200 space-y-1.5">
          <button
            onClick={onNewFolder}
            className="w-full flex items-center justify-center gap-1.5 border border-stone-300 hover:bg-stone-50 text-stone-700 text-sm font-medium px-3 py-2 rounded"
          >
            <FolderPlus size={16} /> {t("nav.newFolder")}
          </button>
          <div className="flex gap-1.5">
            <button
              onClick={onOpenSettings}
              className="flex-1 flex items-center justify-center gap-1.5 text-stone-500 hover:bg-stone-50 text-sm px-3 py-2 rounded"
            >
              <Settings size={14} /> {t("nav.settings")}
            </button>
            <button
              onClick={onSignOut}
              className="flex-1 flex items-center justify-center gap-1.5 text-stone-500 hover:bg-stone-50 text-sm px-3 py-2 rounded"
            >
              <LogOut size={14} /> {t("nav.signOut")}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
