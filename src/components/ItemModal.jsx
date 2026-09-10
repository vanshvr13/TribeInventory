import React, { useState, useRef, useEffect } from "react";
import { X, ImagePlus, Camera, Sparkles } from "lucide-react";
import { useSettings } from "../lib/i18n.jsx";
import { UNITS, STOCK_REASONS, formatDate } from "../lib/format.js";
import { Modal, Field, inputCls, btnPrimary, btnGhost } from "./ui.jsx";

export default function ItemModal({
  editingItem,
  form,
  setForm,
  folders,
  stockReason,
  setStockReason,
  originalQuantity,
  saving,
  identifying,
  onIdentify,
  onSave,
  onClose,
  onDelete,
  onAddPhoto,
  onRemovePhoto,
  onCreateFolder,
}) {
  const { t, lang, fmtMoney } = useSettings();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [showInlineFolder, setShowInlineFolder] = useState(false);
  const [inlineFolderName, setInlineFolderName] = useState("");
  const fileInputRef = useRef(null);

  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (showCamera && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [showCamera]);

  useEffect(() => closeCamera, []); // stop the stream if the modal unmounts

  const formTotal = (Number(form.quantity) || 0) * (Number(form.price) || 0);
  const quantityChanged = editingItem && Number(form.quantity) !== originalQuantity;
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  async function handleFileSelect(e) {
    const files = Array.from(e.target.files || []).slice(0, 8 - form.photos.length);
    e.target.value = "";
    for (const file of files) {
      const dataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
      await onAddPhoto(dataUrl);
    }
  }

  async function openCamera() {
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      setShowCamera(true);
    } catch (err) {
      alert("Could not access camera: " + err.message);
    }
  }

  function closeCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  }

  async function capturePhoto() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    closeCamera();
    await onAddPhoto(canvas.toDataURL("image/jpeg", 0.9));
  }

  async function submitInlineFolder() {
    if (!inlineFolderName.trim()) return;
    const id = await onCreateFolder(inlineFolderName);
    if (id) set({ folderId: id });
    setInlineFolderName("");
    setShowInlineFolder(false);
  }

  function handleClose() {
    closeCamera();
    onClose();
  }

  const footer = confirmingDelete ? (
    <>
      <span className="text-sm text-stone-600">{t("item.deleteQ")}</span>
      <div className="flex items-center gap-2">
        <button onClick={() => setConfirmingDelete(false)} className={btnGhost}>
          {t("btn.cancel")}
        </button>
        <button
          onClick={onDelete}
          className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded"
        >
          {t("btn.yesDelete")}
        </button>
      </div>
    </>
  ) : (
    <>
      {editingItem ? (
        <button onClick={() => setConfirmingDelete(true)} className="text-sm text-red-600 hover:bg-red-50 px-3 py-2 rounded">
          {t("btn.deleteItem")}
        </button>
      ) : (
        <span />
      )}
      <div className="flex items-center gap-2">
        <button onClick={handleClose} className={btnGhost}>
          {t("btn.cancel")}
        </button>
        <button
          onClick={onSave}
          disabled={!form.name.trim() || !form.folderId || saving || (quantityChanged && !stockReason)}
          className={btnPrimary}
        >
          {saving ? t("btn.saving") : editingItem ? t("btn.save") : t("btn.addItem")}
        </button>
      </div>
    </>
  );

  return (
    <>
      <Modal title={editingItem ? t("item.edit") : t("item.add")} onClose={handleClose} footer={footer}>
        <Field label={t("item.name")}>
          <input value={form.name} onChange={(e) => set({ name: e.target.value })} className={inputCls} placeholder={t("item.namePh")} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("item.brand")}>
            <input value={form.brand} onChange={(e) => set({ brand: e.target.value })} className={inputCls} placeholder={t("item.optional")} />
          </Field>
          <Field label={t("item.expiry")}>
            <input type="date" value={form.expiry} onChange={(e) => set({ expiry: e.target.value })} className={inputCls} />
          </Field>
        </div>
        <Field label={t("item.provider")}>
          <input value={form.provider} onChange={(e) => set({ provider: e.target.value })} className={inputCls} placeholder={t("item.providerPh")} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("item.quantity")}>
            <input type="number" value={form.quantity} onChange={(e) => set({ quantity: e.target.value })} className={inputCls} />
          </Field>
          <Field label={t("item.unit")}>
            <select value={form.unit} onChange={(e) => set({ unit: e.target.value })} className={inputCls}>
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {t(`unit.${u}`)}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {quantityChanged && (
          <Field label={t("item.reason")}>
            <select value={stockReason} onChange={(e) => setStockReason(e.target.value)} className={inputCls}>
              <option value="">{t("item.reasonPh")}</option>
              {STOCK_REASONS.map((r) => (
                <option key={r} value={r}>
                  {t(`reason.${r}`)}
                </option>
              ))}
            </select>
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("item.minLevel")}>
            <input type="number" value={form.minLevel} onChange={(e) => set({ minLevel: e.target.value })} className={inputCls} placeholder={t("item.minLevelPh")} />
          </Field>
          <Field label={t("item.price")}>
            <input type="number" value={form.price} onChange={(e) => set({ price: e.target.value })} className={inputCls} placeholder="0.00" />
          </Field>
        </div>

        <div className="flex items-center justify-between bg-stone-50 border border-stone-200 rounded px-3 py-2">
          <span className="text-xs text-stone-500">{t("item.total")}</span>
          <span className="text-sm font-semibold text-stone-900">{fmtMoney(formTotal)}</span>
        </div>

        <div>
          <label className="text-xs text-stone-500">{t("item.photos", { n: form.photos.length })}</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {form.photos.map((p, idx) => (
              <div key={idx} className="relative w-16 h-16 rounded overflow-hidden border border-stone-200">
                <img src={p} className="w-full h-full object-cover" alt="" />
                <button
                  onClick={() => onRemovePhoto(idx)}
                  className="absolute top-0.5 right-0.5 bg-stone-900 bg-opacity-60 text-white rounded-full p-0.5"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
            {form.photos.length < 8 && (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-16 h-16 rounded border border-dashed border-stone-300 flex items-center justify-center text-stone-400 hover:border-teal-500 hover:text-teal-600"
                >
                  <ImagePlus size={18} />
                </button>
                <button
                  onClick={openCamera}
                  className="w-16 h-16 rounded border border-dashed border-stone-300 flex items-center justify-center text-stone-400 hover:border-teal-500 hover:text-teal-600"
                >
                  <Camera size={18} />
                </button>
              </>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
          </div>
          {form.photos.length > 0 && (
            <button
              onClick={onIdentify}
              disabled={identifying}
              className="mt-2 w-full flex items-center justify-center gap-1.5 border border-teal-600 text-teal-700 hover:bg-teal-50 disabled:opacity-50 text-sm font-medium px-3 py-2 rounded"
            >
              <Sparkles size={15} />
              {identifying ? t("item.identifying") : t("item.identify")}
            </button>
          )}
        </div>

        <div>
          <label className="text-xs text-stone-500">{t("item.folder")}</label>
          <div className="border border-stone-200 rounded mt-1 max-h-40 overflow-y-auto">
            {folders.map((f) => (
              <label key={f.id} className="flex items-center gap-2 px-2.5 py-1.5 text-sm hover:bg-stone-50 cursor-pointer">
                <input type="radio" name="item-folder" checked={form.folderId === f.id} onChange={() => set({ folderId: f.id })} />
                {f.parentId && <span className="text-stone-300">↳</span>}
                {f.name}
              </label>
            ))}
            <div className="border-t border-stone-200">
              {!showInlineFolder ? (
                <button
                  onClick={() => setShowInlineFolder(true)}
                  className="w-full text-left px-2.5 py-1.5 text-sm text-teal-700 hover:bg-stone-50"
                >
                  {t("item.newFolderInline")}
                </button>
              ) : (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5">
                  <input
                    autoFocus
                    value={inlineFolderName}
                    onChange={(e) => setInlineFolderName(e.target.value)}
                    placeholder={t("item.folderNamePh")}
                    className="flex-1 border border-stone-300 rounded px-2 py-1 text-sm outline-none focus:border-teal-600"
                    onKeyDown={(e) => e.key === "Enter" && submitInlineFolder()}
                  />
                  <button onClick={submitInlineFolder} className="text-xs text-teal-700 font-medium px-2 py-1 hover:bg-teal-50 rounded">
                    {t("btn.add")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {editingItem && (editingItem.createdAt || editingItem.updatedAt) && (
          <div className="text-xs text-stone-400">
            {editingItem.createdAt && t("item.added", { date: formatDate(editingItem.createdAt, lang) })}
            {editingItem.createdAt && editingItem.updatedAt && " · "}
            {editingItem.updatedAt && t("item.updatedAt", { date: formatDate(editingItem.updatedAt, lang) })}
          </div>
        )}
      </Modal>

      {showCamera && (
        <Modal
          title={t("camera.title")}
          onClose={closeCamera}
          footer={
            <>
              <span />
              <div className="flex items-center gap-2">
                <button onClick={closeCamera} className={btnGhost}>
                  {t("btn.cancel")}
                </button>
                <button onClick={capturePhoto} className={btnPrimary}>
                  {t("btn.capture")}
                </button>
              </div>
            </>
          }
        >
          <video ref={videoRef} autoPlay playsInline className="w-full rounded bg-stone-900" />
        </Modal>
      )}
    </>
  );
}
