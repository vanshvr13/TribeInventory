import React, { useState, useRef, useEffect } from "react";
import { Plus, ChevronRight, Menu, Download } from "lucide-react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { db, auth } from "./firebaseClient";
import { uploadPhoto, deletePhoto, resizePhoto } from "./photoStorage";
import { identifyItemFromPhotos } from "./gemini";
import { SettingsProvider, useSettings } from "./lib/i18n.jsx";
import { trimNum, expiryStatus, csvCell } from "./lib/format.js";
import Sidebar from "./components/Sidebar.jsx";
import Dashboard from "./components/Dashboard.jsx";
import ActivityView from "./components/ActivityView.jsx";
import ItemsView from "./components/ItemsView.jsx";
import ItemModal from "./components/ItemModal.jsx";
import LoginScreen from "./components/LoginScreen.jsx";
import { FolderModal, DeleteFolderModal, SettingsModal } from "./components/modals.jsx";

function folderFromDoc(d) {
  const data = d.data();
  return { id: d.id, name: data.name, parentId: data.parentId ?? null };
}

function itemFromDoc(d) {
  const data = d.data();
  return {
    id: d.id,
    name: data.name,
    quantity: data.quantity ?? 0,
    unit: data.unit || "unit",
    minLevel: data.minLevel ?? null,
    price: data.price ?? 0,
    brand: data.brand || "",
    provider: data.provider || "",
    expiry: data.expiry || "",
    photos: data.photos || [],
    folderId: data.folderId,
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
  };
}

function logFromDoc(d) {
  const data = d.data();
  return { ...data, id: d.id, type: data.type || "quantity", user: data.user || "" };
}

function buildEmptyForm(defaultFolderId) {
  return {
    name: "",
    quantity: "1",
    unit: "unit",
    minLevel: "",
    price: "",
    brand: "",
    provider: "",
    expiry: "",
    photos: [],
    folderId: defaultFolderId || null,
  };
}

// Which item fields (besides quantity) changed in an edit — used for the activity feed
function diffFields(orig, fields) {
  const out = [];
  if (fields.name !== orig.name) out.push("name");
  if ((fields.brand || "") !== (orig.brand || "")) out.push("brand");
  if ((fields.provider || "") !== (orig.provider || "")) out.push("provider");
  if ((fields.expiry || "") !== (orig.expiry || "")) out.push("expiry");
  if ((fields.minLevel ?? null) !== (orig.minLevel ?? null)) out.push("minLevel");
  if (fields.price !== Number(orig.price || 0)) out.push("price");
  if (fields.unit !== orig.unit) out.push("unit");
  if (fields.folderId !== orig.folderId) out.push("folder");
  if (JSON.stringify(fields.photos) !== JSON.stringify(orig.photos)) out.push("photos");
  return out;
}

function InventoryApp() {
  const { t, lang } = useSettings();
  const [folders, setFolders] = useState([]);
  const [items, setItems] = useState([]);
  const [logs, setLogs] = useState([]);
  const [view, setView] = useState({ kind: "dashboard" });
  const [expanded, setExpanded] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Item modal: form === null means closed
  const [form, setForm] = useState(null);
  const [editingItemId, setEditingItemId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [identifying, setIdentifying] = useState(false);
  const [stockReason, setStockReason] = useState("");
  const originalQuantityRef = useRef(null);
  const originalPhotosRef = useRef([]);
  // Photos upload in the background as soon as they're added, so saving is fast.
  // Maps the photo's local data URL -> upload promise resolving to the storage URL.
  const pendingUploads = useRef(new Map());

  const [showFolderModal, setShowFolderModal] = useState(false);
  const [deleteFolderId, setDeleteFolderId] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    getDocs(collection(db, "folders")).then((snap) => setFolders(snap.docs.map(folderFromDoc)));
    getDocs(collection(db, "items")).then((snap) => setItems(snap.docs.map(itemFromDoc)));
    getDocs(collection(db, "stockLogs")).then((snap) => setLogs(snap.docs.map(logFromDoc)));
  }, []);

  const expiringItems = items.filter((it) => ["soon", "expired"].includes(expiryStatus(it.expiry)));
  const shoppingItems = items
    .filter((it) => it.minLevel !== null && it.quantity < it.minLevel)
    .sort((a, b) => (a.provider || "").localeCompare(b.provider || ""));

  const editingItem = editingItemId ? items.find((it) => it.id === editingItemId) : null;
  const currentFolderId = view.kind === "folder" ? view.folderId : null;

  function folderPath(id) {
    const path = [];
    let cur = folders.find((f) => f.id === id);
    while (cur) {
      path.unshift(cur);
      cur = folders.find((f) => f.id === cur.parentId);
    }
    return path;
  }

  function flattenFolders(parentId, depth) {
    return folders
      .filter((f) => f.parentId === parentId)
      .flatMap((f) => [{ ...f, depth }, ...flattenFolders(f.id, depth + 1)]);
  }

  function getDescendantFolderIds(id) {
    const direct = folders.filter((f) => f.parentId === id).map((f) => f.id);
    return direct.concat(direct.flatMap(getDescendantFolderIds));
  }

  function selectView(v) {
    setView(v);
    setSidebarOpen(false);
  }

  // ---- Folders ----
  async function createFolder(name, parentId) {
    try {
      const trimmedName = name.trim();
      const docRef = await addDoc(collection(db, "folders"), { name: trimmedName, parentId: parentId || null });
      setFolders((fs) => [...fs, { id: docRef.id, name: trimmedName, parentId: parentId || null }]);
      if (parentId) {
        const toExpand = {};
        folderPath(parentId).forEach((f) => (toExpand[f.id] = true));
        setExpanded((e) => ({ ...e, ...toExpand }));
      }
      return docRef.id;
    } catch (err) {
      alert(err.message);
      return null;
    }
  }

  async function handleCreateFolder(name, parentId) {
    const id = await createFolder(name, parentId);
    if (id) selectView({ kind: "folder", folderId: id });
    setShowFolderModal(false);
  }

  async function confirmDeleteFolder() {
    const idsToDelete = [deleteFolderId, ...getDescendantFolderIds(deleteFolderId)];
    const itemsToDelete = items.filter((it) => idsToDelete.includes(it.folderId));
    try {
      await Promise.all([
        ...idsToDelete.map((id) => deleteDoc(doc(db, "folders", id))),
        ...itemsToDelete.map((it) => deleteDoc(doc(db, "items", it.id))),
      ]);
    } catch (err) {
      alert(err.message);
      return;
    }
    itemsToDelete.forEach((it) => (it.photos || []).forEach(deletePhoto));
    setFolders((fs) => fs.filter((f) => !idsToDelete.includes(f.id)));
    setItems((its) => its.filter((it) => !idsToDelete.includes(it.folderId)));
    if (view.kind === "folder" && idsToDelete.includes(view.folderId)) setView({ kind: "folder", folderId: null });
    setDeleteFolderId(null);
  }

  // ---- Item modal ----
  function openAddModal() {
    setEditingItemId(null);
    originalQuantityRef.current = null;
    originalPhotosRef.current = [];
    pendingUploads.current = new Map();
    setStockReason("");
    setForm(buildEmptyForm(currentFolderId));
  }

  function openEditModal(item) {
    setEditingItemId(item.id);
    originalQuantityRef.current = item.quantity;
    originalPhotosRef.current = item.photos;
    pendingUploads.current = new Map();
    setStockReason("");
    setForm({
      name: item.name,
      quantity: String(item.quantity),
      unit: item.unit,
      minLevel: item.minLevel === null ? "" : String(item.minLevel),
      price: String(item.price),
      brand: item.brand || "",
      provider: item.provider || "",
      expiry: item.expiry || "",
      photos: item.photos,
      folderId: item.folderId,
    });
  }

  function closeItemModal() {
    // discard uploads for photos that were never saved
    for (const [, p] of pendingUploads.current) p.then(deletePhoto).catch(() => {});
    pendingUploads.current = new Map();
    setForm(null);
    setEditingItemId(null);
  }

  async function addPhoto(rawDataUrl) {
    const resized = await resizePhoto(rawDataUrl);
    setForm((f) => (f && f.photos.length < 8 ? { ...f, photos: [...f.photos, resized] } : f));
    const upload = uploadPhoto(resized);
    upload.catch(() => pendingUploads.current.delete(resized));
    pendingUploads.current.set(resized, upload);
  }

  function removePhoto(idx) {
    setForm((f) => ({ ...f, photos: f.photos.filter((_, i) => i !== idx) }));
  }

  async function handleIdentify() {
    if (!form || form.photos.length === 0) return;
    setIdentifying(true);
    try {
      const folderOptions = folders.map((f) => ({
        id: f.id,
        path: folderPath(f.id).map((p) => p.name).join(" > "),
      }));
      const result = await identifyItemFromPhotos(form.photos, folderOptions.map((o) => o.path), {
        exampleNames: items.slice(0, 12).map((it) => it.name),
        language: lang,
      });
      const matchedFolder = folderOptions.find((o) => o.path === result.category);
      setForm((f) => ({
        ...f,
        name: result.name || f.name,
        brand: result.brand || f.brand,
        expiry: result.expiryIso || f.expiry,
        folderId: matchedFolder ? matchedFolder.id : f.folderId,
      }));
    } catch (err) {
      alert("Could not identify photo: " + err.message);
    } finally {
      setIdentifying(false);
    }
  }

  async function handleSaveItem() {
    if (!form.name.trim() || !form.folderId) return;
    const newQuantity = Number(form.quantity) || 0;
    const editing = editingItemId !== null;
    const orig = editing ? items.find((it) => it.id === editingItemId) : null;
    const quantityChanged = editing && newQuantity !== originalQuantityRef.current;
    if (quantityChanged && !stockReason) return;

    setSaving(true);
    try {
      // photos already uploaded in the background when added; retry any that failed
      const photos = await Promise.all(
        form.photos.map((p) =>
          p.startsWith("data:")
            ? (pendingUploads.current.get(p) || Promise.reject()).catch(() => uploadPhoto(p))
            : Promise.resolve(p)
        )
      );

      const now = new Date().toISOString();
      const fields = {
        name: form.name.trim(),
        quantity: newQuantity,
        unit: form.unit,
        minLevel: form.minLevel === "" ? null : Number(form.minLevel),
        price: Number(form.price) || 0,
        brand: form.brand.trim() || null,
        provider: form.provider.trim() || null,
        expiry: form.expiry || null,
        photos,
        folderId: form.folderId,
        createdAt: editing ? orig?.createdAt ?? null : now,
        updatedAt: now,
      };

      let itemId = editingItemId;
      // local copy keeps the same shape as itemFromDoc (empty strings, not nulls)
      const stateItem = {
        ...fields,
        brand: fields.brand || "",
        provider: fields.provider || "",
        expiry: fields.expiry || "",
      };
      if (editing) {
        await updateDoc(doc(db, "items", editingItemId), fields);
        setItems((its) => its.map((it) => (it.id === itemId ? { id: itemId, ...stateItem } : it)));
      } else {
        const docRef = await addDoc(collection(db, "items"), fields);
        itemId = docRef.id;
        setItems((its) => [{ id: itemId, ...stateItem }, ...its]);
      }

      const user = auth.currentUser?.email || "";
      const entries = [];
      if (!editing) {
        entries.push({ type: "created", itemId, itemName: fields.name, user, timestamp: now });
      } else {
        if (quantityChanged) {
          entries.push({
            type: "quantity",
            itemId,
            itemName: fields.name,
            user,
            timestamp: now,
            previousQuantity: originalQuantityRef.current,
            newQuantity,
            delta: newQuantity - originalQuantityRef.current,
            reason: stockReason,
            unit: fields.unit,
          });
        }
        const changed = diffFields(orig, fields);
        if (changed.length) {
          entries.push({ type: "updated", itemId, itemName: fields.name, user, timestamp: now, changedFields: changed });
        }
      }
      if (entries.length) {
        const refs = await Promise.all(entries.map((e) => addDoc(collection(db, "stockLogs"), e)));
        setLogs((ls) => [...refs.map((r, i) => ({ id: r.id, ...entries[i] })), ...ls]);
      }

      // clean up photos no longer referenced (removed from an edited item, or uploaded then removed)
      originalPhotosRef.current.filter((url) => !photos.includes(url)).forEach(deletePhoto);
      for (const [dataUrl, p] of pendingUploads.current) {
        if (!form.photos.includes(dataUrl)) p.then(deletePhoto).catch(() => {});
      }
      pendingUploads.current = new Map();
      setForm(null);
      setEditingItemId(null);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteItem() {
    const item = items.find((it) => it.id === editingItemId);
    try {
      await deleteDoc(doc(db, "items", editingItemId));
      const entry = {
        type: "deleted",
        itemId: editingItemId,
        itemName: item?.name || "",
        user: auth.currentUser?.email || "",
        timestamp: new Date().toISOString(),
      };
      const ref = await addDoc(collection(db, "stockLogs"), entry);
      setLogs((ls) => [{ id: ref.id, ...entry }, ...ls]);
      (item?.photos || []).forEach(deletePhoto);
      setItems((its) => its.filter((it) => it.id !== editingItemId));
      closeItemModal();
    } catch (err) {
      alert(err.message);
    }
  }

  // ---- Shopping list export ----
  async function handleExportShoppingList() {
    const header = ["csv.provider", "csv.name", "csv.brand", "csv.have", "csv.need", "csv.unit"]
      .map((k) => csvCell(t(k)))
      .join(",");
    const rows = shoppingItems.map((it) =>
      [it.provider, it.name, it.brand, trimNum(it.quantity), trimNum(it.minLevel - it.quantity), t(`unit.${it.unit}`)]
        .map(csvCell)
        .join(",")
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const file = new File([blob], "shopping-list.csv", { type: "text/csv" });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: t("nav.shopping") });
        return;
      } catch {
        // user cancelled the share sheet — fall through to download
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "shopping-list.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const viewLabels = {
    dashboard: t("nav.dashboard"),
    expiring: t("nav.expiring"),
    shopping: t("nav.shopping"),
    activity: t("nav.activity"),
  };

  const deletingFolder = deleteFolderId ? folders.find((f) => f.id === deleteFolderId) : null;
  const deleteIds = deleteFolderId ? [deleteFolderId, ...getDescendantFolderIds(deleteFolderId)] : [];

  return (
    <div className="h-screen flex bg-stone-100 text-stone-900 font-sans overflow-hidden">
      <Sidebar
        open={sidebarOpen}
        onCloseDrawer={() => setSidebarOpen(false)}
        view={view}
        onSelect={selectView}
        folders={folders}
        expanded={expanded}
        onToggleExpand={(id) => setExpanded((e) => ({ ...e, [id]: !e[id] }))}
        expiringCount={expiringItems.length}
        shoppingCount={shoppingItems.length}
        onNewFolder={() => setShowFolderModal(true)}
        onDeleteFolder={setDeleteFolderId}
        onOpenSettings={() => setShowSettings(true)}
        onSignOut={() => signOut(auth)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between px-5 py-3 border-b border-stone-200 bg-white">
          <div className="flex items-center gap-1.5 text-sm text-stone-500 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="sm:hidden -ml-1 mr-0.5 p-1.5 text-stone-500 hover:text-stone-900 shrink-0"
            >
              <Menu size={18} />
            </button>
            {view.kind === "folder" ? (
              <>
                <button onClick={() => selectView({ kind: "folder", folderId: null })} className="hover:text-stone-900">
                  {t("nav.allFolders")}
                </button>
                {folderPath(view.folderId).map((f) => (
                  <React.Fragment key={f.id}>
                    <ChevronRight size={14} />
                    <button
                      onClick={() => selectView({ kind: "folder", folderId: f.id })}
                      className="hover:text-stone-900 truncate"
                    >
                      {f.name}
                    </button>
                  </React.Fragment>
                ))}
              </>
            ) : (
              <span className="text-stone-900 font-medium truncate">{viewLabels[view.kind]}</span>
            )}
          </div>
          {view.kind === "shopping" ? (
            <button
              onClick={handleExportShoppingList}
              disabled={shoppingItems.length === 0}
              className="flex items-center gap-1.5 bg-teal-700 hover:bg-teal-800 disabled:bg-stone-300 text-white text-sm font-medium px-3 py-2 rounded shrink-0"
            >
              <Download size={16} /> {t("btn.export")}
            </button>
          ) : view.kind === "folder" || view.kind === "dashboard" ? (
            <button
              onClick={openAddModal}
              className="flex items-center gap-1.5 bg-teal-700 hover:bg-teal-800 text-white text-sm font-medium px-3 py-2 rounded shrink-0"
            >
              <Plus size={16} /> {t("btn.addItem")}
            </button>
          ) : null}
        </div>

        {view.kind === "dashboard" ? (
          <div className="flex-1 overflow-y-auto p-5">
            <Dashboard items={items} folders={folders} logs={logs} onOpenItem={openEditModal} onGo={selectView} />
          </div>
        ) : view.kind === "activity" ? (
          <div className="flex-1 overflow-y-auto p-5">
            <ActivityView logs={logs} />
          </div>
        ) : (
          <ItemsView
            key={`${view.kind}-${view.folderId || "all"}`}
            view={view}
            items={items}
            folders={folders}
            shoppingItems={shoppingItems}
            expiringItems={expiringItems}
            onOpenItem={openEditModal}
          />
        )}
      </div>

      {form && (
        <ItemModal
          editingItem={editingItem}
          form={form}
          setForm={setForm}
          folders={folders}
          stockReason={stockReason}
          setStockReason={setStockReason}
          originalQuantity={originalQuantityRef.current}
          saving={saving}
          identifying={identifying}
          onIdentify={handleIdentify}
          onSave={handleSaveItem}
          onClose={closeItemModal}
          onDelete={handleDeleteItem}
          onAddPhoto={addPhoto}
          onRemovePhoto={removePhoto}
          onCreateFolder={(name) => createFolder(name, null)}
        />
      )}
      {showFolderModal && (
        <FolderModal
          flatFolders={flattenFolders(null, 0)}
          initialParentId={currentFolderId}
          onCreate={handleCreateFolder}
          onClose={() => setShowFolderModal(false)}
        />
      )}
      {deleteFolderId && (
        <DeleteFolderModal
          folder={deletingFolder}
          subfolderCount={deleteIds.length - 1}
          itemCount={items.filter((it) => deleteIds.includes(it.folderId)).length}
          onConfirm={confirmDeleteFolder}
          onClose={() => setDeleteFolderId(null)}
        />
      )}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}

function AuthGate() {
  const { t } = useSettings();
  const [user, setUser] = useState(undefined);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  if (user === undefined) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center text-sm text-stone-400">
        {t("app.loading")}
      </div>
    );
  }
  return user ? <InventoryApp /> : <LoginScreen />;
}

export default function App() {
  return (
    <SettingsProvider>
      <AuthGate />
    </SettingsProvider>
  );
}
