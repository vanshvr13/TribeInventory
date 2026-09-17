import React, { useState } from "react";
import { useSettings, CURRENCIES } from "../lib/i18n.jsx";
import { trimNum } from "../lib/format.js";
import { Modal, Field, inputCls, btnPrimary, btnGhost } from "./ui.jsx";

export function ShoppingPreviewModal({ items, onExport, onClose }) {
  const { t, fmtMoney } = useSettings();
  const cost = (it) => Math.max(0, it.minLevel - it.quantity) * Number(it.price || 0);
  const totalCost = items.reduce((sum, it) => sum + cost(it), 0);

  return (
    <Modal
      title={t("shopping.preview")}
      onClose={onClose}
      maxW="max-w-lg"
      footer={
        <>
          <span className="text-sm text-stone-600">
            {t("shopping.total")}: <b className="text-stone-900">{fmtMoney(totalCost)}</b>
          </span>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className={btnGhost}>
              {t("btn.cancel")}
            </button>
            <button onClick={onExport} className={btnPrimary}>
              {t("btn.export")}
            </button>
          </div>
        </>
      }
    >
      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.id} className="flex items-center justify-between gap-3 border border-stone-200 rounded-md px-3 py-2 text-sm">
            <div className="min-w-0">
              <div className="font-medium text-stone-900 truncate">{it.name}</div>
              <div className="text-xs text-stone-500 truncate">{it.provider || t("shopping.noProvider")}</div>
              <div className="text-xs text-stone-400">{fmtMoney(it.price)} / {t(`unit.${it.unit}`)}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-amber-700 font-medium">
                {trimNum(it.minLevel - it.quantity)} {t(`unit.${it.unit}`)}
              </div>
              <div className="text-xs text-stone-500 mt-0.5">{fmtMoney(cost(it))}</div>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

export function FolderModal({ flatFolders, initialParentId, onCreate, onClose }) {
  const { t } = useSettings();
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState(initialParentId || null);

  return (
    <Modal
      title={t("folder.add")}
      onClose={onClose}
      maxW="max-w-sm"
      footer={
        <>
          <span />
          <div className="flex items-center gap-2">
            <button onClick={onClose} className={btnGhost}>
              {t("btn.cancel")}
            </button>
            <button onClick={() => onCreate(name, parentId)} disabled={!name.trim()} className={btnPrimary}>
              {t("btn.addFolder")}
            </button>
          </div>
        </>
      }
    >
      <Field label={t("folder.name")}>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputCls}
          placeholder={t("folder.namePh")}
          onKeyDown={(e) => e.key === "Enter" && name.trim() && onCreate(name, parentId)}
        />
      </Field>
      <Field label={t("folder.parent")}>
        <select value={parentId || ""} onChange={(e) => setParentId(e.target.value || null)} className={inputCls}>
          <option value="">{t("folder.noParent")}</option>
          {flatFolders.map((f) => (
            <option key={f.id} value={f.id}>
              {"—".repeat(f.depth)} {f.name}
            </option>
          ))}
        </select>
      </Field>
    </Modal>
  );
}

export function DeleteFolderModal({ folder, subfolderCount, itemCount, onConfirm, onClose }) {
  const { t } = useSettings();
  return (
    <Modal
      title={t("folder.deleteQ", { name: folder?.name || "" })}
      onClose={onClose}
      maxW="max-w-sm"
      footer={
        <>
          <span />
          <div className="flex items-center gap-2">
            <button onClick={onClose} className={btnGhost}>
              {t("btn.cancel")}
            </button>
            <button onClick={onConfirm} className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded">
              {t("btn.deleteFolder")}
            </button>
          </div>
        </>
      }
    >
      <div className="text-sm text-stone-600">
        {subfolderCount > 0 || itemCount > 0
          ? t("folder.deleteCascade", { folders: subfolderCount, items: itemCount })
          : t("folder.deleteSimple")}
      </div>
    </Modal>
  );
}

export function SettingsModal({ onClose }) {
  const { t, lang, setLang, currency, setCurrency } = useSettings();
  return (
    <Modal
      title={t("settings.title")}
      onClose={onClose}
      maxW="max-w-sm"
      footer={
        <>
          <span />
          <button onClick={onClose} className={btnPrimary}>
            {t("btn.done")}
          </button>
        </>
      }
    >
      <Field label={t("settings.language")}>
        <select value={lang} onChange={(e) => setLang(e.target.value)} className={inputCls}>
          <option value="en">English</option>
          <option value="ro">Română</option>
        </select>
      </Field>
      <Field label={t("settings.currency")}>
        <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputCls}>
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <div className="text-xs text-stone-400 mt-1">{t("settings.currencyNote")}</div>
      </Field>
    </Modal>
  );
}
