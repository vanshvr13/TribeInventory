import React, { useState, useRef, useEffect } from "react";
import {
  Search,
  Plus,
  X,
  ImagePlus,
  Camera,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderPlus,
  AlertTriangle,
  Package,
  Trash2,
  Menu,
} from "lucide-react";
import { supabase } from "./supabaseClient";

const UNITS = ["unit", "box", "kg", "g", "l", "ml", "pack"];

function trimNum(n) {
  return Number.isInteger(n) ? n : Math.round(n * 100) / 100;
}

function folderFromRow(row) {
  return { id: row.id, name: row.name, parentId: row.parent_id };
}

function itemFromRow(row) {
  return {
    id: row.id,
    name: row.name,
    quantity: row.quantity,
    unit: row.unit,
    minLevel: row.min_level,
    price: row.price,
    brand: row.brand || "",
    expiry: row.expiry || "",
    photos: row.photos || [],
    folderId: row.folder_id,
  };
}

function buildEmptyForm(defaultFolderId) {
  return {
    name: "",
    quantity: "1",
    unit: "unit",
    minLevel: "",
    price: "",
    brand: "",
    expiry: "",
    photos: [],
    folderId: defaultFolderId || null,
  };
}

function InventoryApp() {
  const [folders, setFolders] = useState([]);
  const [items, setItems] = useState([]);
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    supabase
      .from("folders")
      .select("*")
      .then(({ data }) => setFolders((data || []).map(folderFromRow)));
    supabase
      .from("items")
      .select("*")
      .then(({ data }) => setItems((data || []).map(itemFromRow)));
  }, []);

  const [showModal, setShowModal] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [confirmingDeleteItem, setConfirmingDeleteItem] = useState(false);
  const [form, setForm] = useState(buildEmptyForm(null));
  const [showInlineFolderForm, setShowInlineFolderForm] = useState(false);
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

  const [showFolderModal, setShowFolderModal] = useState(false);
  const [folderForm, setFolderForm] = useState({ name: "", parentId: null });
  const [deleteFolderId, setDeleteFolderId] = useState(null);

  const formTotal = (Number(form.quantity) || 0) * (Number(form.price) || 0);

  const rootFolders = folders.filter((f) => f.parentId === null);
  const childrenOf = (id) => folders.filter((f) => f.parentId === id);

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
    const kids = folders.filter((f) => f.parentId === parentId);
    let out = [];
    kids.forEach((k) => {
      out.push({ ...k, depth });
      out = out.concat(flattenFolders(k.id, depth + 1));
    });
    return out;
  }
  const flatFolders = flattenFolders(null, 0);

  const currentPath = currentFolderId ? folderPath(currentFolderId) : [];

  const folderItems = currentFolderId
    ? items.filter((it) => it.folderId === currentFolderId)
    : items;

  const visibleItems = folderItems.filter((it) =>
    it.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalUnits = folderItems.reduce((sum, it) => sum + Number(it.quantity), 0);

  const totalValue = folderItems.reduce(
    (sum, it) => sum + Number(it.quantity) * Number(it.price || 0),
    0
  );

  function toggleExpand(id) {
    setExpanded((e) => ({ ...e, [id]: !e[id] }));
  }

  function selectFolder(id) {
    setCurrentFolderId(id);
    setSidebarOpen(false);
  }

  function expandAncestors(id) {
    let cur = folders.find((f) => f.id === id);
    const toExpand = {};
    while (cur) {
      toExpand[cur.id] = true;
      cur = folders.find((f) => f.id === cur.parentId);
    }
    setExpanded((e) => ({ ...e, ...toExpand }));
  }

  async function createFolder(name, parentId) {
    const { data, error } = await supabase
      .from("folders")
      .insert({ name: name.trim(), parent_id: parentId || null })
      .select()
      .single();
    if (error) {
      alert(error.message);
      return null;
    }
    const newFolder = folderFromRow(data);
    setFolders((fs) => [...fs, newFolder]);
    if (parentId) expandAncestors(parentId);
    return newFolder.id;
  }

  function getDescendantFolderIds(id) {
    const direct = folders.filter((f) => f.parentId === id).map((f) => f.id);
    return direct.concat(direct.flatMap((d) => getDescendantFolderIds(d)));
  }

  // ---- Add / edit item modal ----
  function openAddModal() {
    setEditingItemId(null);
    setForm(buildEmptyForm(currentFolderId));
    setShowInlineFolderForm(false);
    setInlineFolderName("");
    setConfirmingDeleteItem(false);
    setShowModal(true);
  }

  function openEditModal(item) {
    setEditingItemId(item.id);
    setForm({
      name: item.name,
      quantity: String(item.quantity),
      unit: item.unit,
      minLevel: item.minLevel === null || item.minLevel === undefined ? "" : String(item.minLevel),
      price: String(item.price),
      brand: item.brand || "",
      expiry: item.expiry || "",
      photos: item.photos,
      folderId: item.folderId,
    });
    setShowInlineFolderForm(false);
    setInlineFolderName("");
    setConfirmingDeleteItem(false);
    setShowModal(true);
  }

  function closeItemModal() {
    setShowModal(false);
    setConfirmingDeleteItem(false);
    closeCamera();
  }

  function handlePhotoSelect(e) {
    const files = Array.from(e.target.files || []).slice(0, 8 - form.photos.length);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setForm((f) => ({ ...f, photos: [...f.photos, reader.result].slice(0, 8) }));
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
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

  function capturePhoto() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setForm((f) => ({ ...f, photos: [...f.photos, dataUrl].slice(0, 8) }));
    closeCamera();
  }

  function removePhoto(idx) {
    setForm((f) => ({ ...f, photos: f.photos.filter((_, i) => i !== idx) }));
  }

  function selectFormFolder(id) {
    setForm((f) => ({ ...f, folderId: id }));
  }

  async function submitInlineFolder() {
    if (!inlineFolderName.trim()) return;
    const id = await createFolder(inlineFolderName, null);
    setForm((f) => ({ ...f, folderId: id }));
    setInlineFolderName("");
    setShowInlineFolderForm(false);
  }

  async function handleSaveItem() {
    if (!form.name.trim() || !form.folderId) return;
    const fields = {
      name: form.name.trim(),
      quantity: Number(form.quantity) || 0,
      unit: form.unit,
      minLevel: form.minLevel === "" ? null : Number(form.minLevel),
      price: Number(form.price) || 0,
      brand: form.brand.trim() || null,
      expiry: form.expiry === "" ? null : form.expiry,
      photos: form.photos,
      folderId: form.folderId,
    };
    const row = {
      name: fields.name,
      quantity: fields.quantity,
      unit: fields.unit,
      min_level: fields.minLevel,
      price: fields.price,
      brand: fields.brand,
      expiry: fields.expiry,
      photos: fields.photos,
      folder_id: fields.folderId,
    };
    if (editingItemId) {
      const { data, error } = await supabase
        .from("items")
        .update(row)
        .eq("id", editingItemId)
        .select()
        .single();
      if (error) {
        alert(error.message);
        return;
      }
      const updated = itemFromRow(data);
      setItems((its) => its.map((it) => (it.id === editingItemId ? updated : it)));
    } else {
      const { data, error } = await supabase.from("items").insert(row).select().single();
      if (error) {
        alert(error.message);
        return;
      }
      const created = itemFromRow(data);
      setItems((its) => [created, ...its]);
    }
    closeItemModal();
  }

  async function handleDeleteItemConfirmed() {
    await supabase.from("items").delete().eq("id", editingItemId);
    setItems((its) => its.filter((it) => it.id !== editingItemId));
    closeItemModal();
  }

  // ---- Add folder modal ----
  function openAddFolderModal() {
    setFolderForm({ name: "", parentId: currentFolderId });
    setShowFolderModal(true);
  }

  async function handleCreateFolderSubmit() {
    if (!folderForm.name.trim()) return;
    const id = await createFolder(folderForm.name, folderForm.parentId);
    setCurrentFolderId(id);
    setShowFolderModal(false);
  }

  function requestDeleteFolder(id) {
    setDeleteFolderId(id);
  }

  async function confirmDeleteFolder() {
    if (!deleteFolderId) return;
    const idsToDelete = [deleteFolderId, ...getDescendantFolderIds(deleteFolderId)];
    await supabase.from("folders").delete().eq("id", deleteFolderId);
    setFolders((fs) => fs.filter((f) => !idsToDelete.includes(f.id)));
    setItems((its) => its.filter((it) => !idsToDelete.includes(it.folderId)));
    if (idsToDelete.includes(currentFolderId)) setCurrentFolderId(null);
    setDeleteFolderId(null);
  }

  function renderFolderNode(folder, depth) {
    const kids = childrenOf(folder.id);
    const isOpen = expanded[folder.id];
    const isActive = currentFolderId === folder.id;
    return (
      <div key={folder.id}>
        <div
          className={`group flex items-center gap-1 rounded pr-1 ${
            isActive ? "bg-teal-50" : "hover:bg-stone-50"
          }`}
          style={{ paddingLeft: `${8 + depth * 16}px` }}
        >
          {kids.length > 0 ? (
            <button onClick={() => toggleExpand(folder.id)} className="p-0.5 shrink-0 text-stone-500">
              {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          ) : (
            <span className="w-4 shrink-0" />
          )}
          <button
            onClick={() => selectFolder(folder.id)}
            className={`flex-1 flex items-center gap-1.5 py-1.5 text-sm text-left min-w-0 ${
              isActive ? "text-teal-800 font-medium" : "text-stone-700"
            }`}
          >
            <Folder size={15} className={isActive ? "text-teal-700" : "text-stone-400"} />
            <span className="truncate">{folder.name}</span>
          </button>
          <button
            onClick={() => requestDeleteFolder(folder.id)}
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
    <div
      className="relative flex bg-stone-100 text-stone-900 sm:rounded-lg overflow-hidden sm:border sm:border-stone-200 font-sans h-screen sm:h-[640px] w-full sm:w-auto"
    >
      {/* Mobile backdrop for sidebar drawer */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="absolute inset-0 z-20 bg-stone-900/40 sm:hidden"
        />
      )}

      {/* Sidebar */}
      <div
        className={`absolute sm:static inset-y-0 left-0 z-30 w-64 shrink-0 bg-white border-r border-stone-200 flex flex-col transition-transform duration-200 sm:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-3 border-b border-stone-200">
          <div className="flex items-center gap-2 bg-stone-100 rounded px-2 py-1.5">
            <Search size={15} className="text-stone-400" />
            <input
              placeholder="Search folders"
              className="bg-transparent outline-none text-sm flex-1 placeholder:text-stone-400"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <button
            onClick={() => selectFolder(null)}
            className={`w-full flex items-center gap-2 rounded px-2 py-1.5 text-sm mb-1 ${
              currentFolderId === null
                ? "bg-teal-50 text-teal-800 font-medium"
                : "text-stone-700 hover:bg-stone-50"
            }`}
          >
            <Package size={15} className={currentFolderId === null ? "text-teal-700" : "text-stone-400"} />
            All folders
          </button>
          {rootFolders.map((f) => renderFolderNode(f, 0))}
        </div>
        <div className="p-2 border-t border-stone-200">
          <button
            onClick={openAddFolderModal}
            className="w-full flex items-center justify-center gap-1.5 border border-stone-300 hover:bg-stone-50 text-stone-700 text-sm font-medium px-3 py-2 rounded"
          >
            <FolderPlus size={16} /> New folder
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between px-5 py-3 border-b border-stone-200 bg-white">
          <div className="flex items-center gap-1.5 text-sm text-stone-500 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="sm:hidden -ml-1 mr-0.5 p-1.5 text-stone-500 hover:text-stone-900 shrink-0"
            >
              <Menu size={18} />
            </button>
            <button onClick={() => setCurrentFolderId(null)} className="hover:text-stone-900">
              All folders
            </button>
            {currentPath.map((f) => (
              <React.Fragment key={f.id}>
                <ChevronRight size={14} />
                <button onClick={() => setCurrentFolderId(f.id)} className="hover:text-stone-900 truncate">
                  {f.name}
                </button>
              </React.Fragment>
            ))}
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 bg-teal-700 hover:bg-teal-800 text-white text-sm font-medium px-3 py-2 rounded"
          >
            <Plus size={16} /> Add item
          </button>
        </div>

        <div className="px-5 py-3 border-b border-stone-200 bg-white">
          <div className="flex items-center gap-2 bg-stone-100 rounded px-3 py-2 mb-3">
            <Search size={15} className="text-stone-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${currentPath.length ? currentPath[currentPath.length - 1].name : "all folders"}`}
              className="bg-transparent outline-none text-sm flex-1 placeholder:text-stone-400"
            />
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-stone-600">
            <span>
              Folders: <b className="text-stone-900">{childrenOf(currentFolderId).length}</b>
            </span>
            <span>
              Items: <b className="text-stone-900">{folderItems.length}</b>
            </span>
            <span>
              Units: <b className="text-stone-900">{trimNum(totalUnits)}</b>
            </span>
            <span>
              Total value: <b className="text-stone-900">${totalValue.toFixed(2)}</b>
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {visibleItems.length === 0 ? (
            <div className="text-center text-stone-400 text-sm mt-16">No items here yet.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {visibleItems.map((it) => {
                const lowStock = it.minLevel !== null && it.quantity < it.minLevel;
                return (
                  <div
                    key={it.id}
                    onClick={() => openEditModal(it)}
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
                        {trimNum(it.quantity)} {it.unit}
                      </div>
                      <div className="text-sm font-semibold text-stone-900 mt-0.5">
                        ${(it.quantity * it.price).toFixed(2)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add item modal */}
      {showModal && (
        <div className="fixed inset-0 bg-stone-900 bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md max-h-full overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200">
              <h2 className="text-base font-semibold text-stone-900">
                {editingItemId ? "Edit item" : "Add item"}
              </h2>
              <button onClick={closeItemModal} className="text-stone-400 hover:text-stone-700">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs text-stone-500">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full border border-stone-300 rounded px-2.5 py-2 text-sm mt-1 outline-none focus:border-teal-600"
                  placeholder="e.g. Cheesecake 1.6kg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-stone-500">Brand</label>
                  <input
                    value={form.brand}
                    onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
                    className="w-full border border-stone-300 rounded px-2.5 py-2 text-sm mt-1 outline-none focus:border-teal-600"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="text-xs text-stone-500">Expiry date</label>
                  <input
                    type="date"
                    value={form.expiry}
                    onChange={(e) => setForm((f) => ({ ...f, expiry: e.target.value }))}
                    className="w-full border border-stone-300 rounded px-2.5 py-2 text-sm mt-1 outline-none focus:border-teal-600"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-stone-500">Quantity</label>
                  <input
                    type="number"
                    value={form.quantity}
                    onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                    className="w-full border border-stone-300 rounded px-2.5 py-2 text-sm mt-1 outline-none focus:border-teal-600"
                  />
                </div>
                <div>
                  <label className="text-xs text-stone-500">Unit</label>
                  <select
                    value={form.unit}
                    onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                    className="w-full border border-stone-300 rounded px-2.5 py-2 text-sm mt-1 outline-none focus:border-teal-600"
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-stone-500">Min level</label>
                  <input
                    type="number"
                    value={form.minLevel}
                    onChange={(e) => setForm((f) => ({ ...f, minLevel: e.target.value }))}
                    className="w-full border border-stone-300 rounded px-2.5 py-2 text-sm mt-1 outline-none focus:border-teal-600"
                    placeholder="Alert threshold"
                  />
                </div>
                <div>
                  <label className="text-xs text-stone-500">Price per unit</label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                    className="w-full border border-stone-300 rounded px-2.5 py-2 text-sm mt-1 outline-none focus:border-teal-600"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between bg-stone-50 border border-stone-200 rounded px-3 py-2">
                <span className="text-xs text-stone-500">Item total valuation</span>
                <span className="text-sm font-semibold text-stone-900">${formTotal.toFixed(2)}</span>
              </div>

              <div>
                <label className="text-xs text-stone-500">Photos ({form.photos.length}/8)</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {form.photos.map((p, idx) => (
                    <div key={idx} className="relative w-16 h-16 rounded overflow-hidden border border-stone-200">
                      <img src={p} className="w-full h-full object-cover" alt="" />
                      <button
                        onClick={() => removePhoto(idx)}
                        className="absolute top-0.5 right-0.5 bg-stone-900 bg-opacity-60 text-white rounded-full p-0.5"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                  {form.photos.length < 8 && (
                    <button
                      onClick={() => fileInputRef.current && fileInputRef.current.click()}
                      className="w-16 h-16 rounded border border-dashed border-stone-300 flex items-center justify-center text-stone-400 hover:border-teal-500 hover:text-teal-600"
                      title="Upload photo"
                    >
                      <ImagePlus size={18} />
                    </button>
                  )}
                  {form.photos.length < 8 && (
                    <button
                      onClick={openCamera}
                      className="w-16 h-16 rounded border border-dashed border-stone-300 flex items-center justify-center text-stone-400 hover:border-teal-500 hover:text-teal-600"
                      title="Take photo"
                    >
                      <Camera size={18} />
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handlePhotoSelect}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-stone-500">Folder</label>
                <div className="border border-stone-200 rounded mt-1 max-h-40 overflow-y-auto">
                  {folders.map((f) => (
                    <label
                      key={f.id}
                      className="flex items-center gap-2 px-2.5 py-1.5 text-sm hover:bg-stone-50 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="item-folder"
                        checked={form.folderId === f.id}
                        onChange={() => selectFormFolder(f.id)}
                      />
                      {f.parentId && <span className="text-stone-300">↳</span>}
                      {f.name}
                    </label>
                  ))}
                  <div className="border-t border-stone-200">
                    {!showInlineFolderForm ? (
                      <button
                        onClick={() => setShowInlineFolderForm(true)}
                        className="w-full text-left px-2.5 py-1.5 text-sm text-teal-700 hover:bg-stone-50"
                      >
                        + New folder
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5">
                        <input
                          autoFocus
                          value={inlineFolderName}
                          onChange={(e) => setInlineFolderName(e.target.value)}
                          placeholder="Folder name"
                          className="flex-1 border border-stone-300 rounded px-2 py-1 text-sm outline-none focus:border-teal-600"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") submitInlineFolder();
                          }}
                        />
                        <button
                          onClick={submitInlineFolder}
                          className="text-xs text-teal-700 font-medium px-2 py-1 hover:bg-teal-50 rounded"
                        >
                          Add
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between px-5 py-4 border-t border-stone-200">
              {confirmingDeleteItem ? (
                <>
                  <span className="text-sm text-stone-600">Delete this item?</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setConfirmingDeleteItem(false)}
                      className="text-sm text-stone-600 px-3 py-2 hover:bg-stone-50 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteItemConfirmed}
                      className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded"
                    >
                      Yes, delete
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {editingItemId ? (
                    <button
                      onClick={() => setConfirmingDeleteItem(true)}
                      className="text-sm text-red-600 hover:bg-red-50 px-3 py-2 rounded"
                    >
                      Delete item
                    </button>
                  ) : (
                    <span />
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={closeItemModal}
                      className="text-sm text-stone-600 px-3 py-2 hover:bg-stone-50 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveItem}
                      disabled={!form.name.trim() || !form.folderId}
                      className="bg-teal-700 hover:bg-teal-800 disabled:bg-stone-300 text-white text-sm font-medium px-4 py-2 rounded"
                    >
                      {editingItemId ? "Save changes" : "Add item"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Camera capture modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-stone-900 bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200">
              <h2 className="text-base font-semibold text-stone-900">Take photo</h2>
              <button onClick={closeCamera} className="text-stone-400 hover:text-stone-700">
                <X size={18} />
              </button>
            </div>
            <div className="p-4">
              <video ref={videoRef} autoPlay playsInline className="w-full rounded bg-stone-900" />
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-stone-200">
              <button
                onClick={closeCamera}
                className="text-sm text-stone-600 px-3 py-2 hover:bg-stone-50 rounded"
              >
                Cancel
              </button>
              <button
                onClick={capturePhoto}
                className="bg-teal-700 hover:bg-teal-800 text-white text-sm font-medium px-4 py-2 rounded"
              >
                Capture
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add folder modal */}
      {showFolderModal && (
        <div className="fixed inset-0 bg-stone-900 bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200">
              <h2 className="text-base font-semibold text-stone-900">Add folder</h2>
              <button onClick={() => setShowFolderModal(false)} className="text-stone-400 hover:text-stone-700">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs text-stone-500">Name</label>
                <input
                  autoFocus
                  value={folderForm.name}
                  onChange={(e) => setFolderForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full border border-stone-300 rounded px-2.5 py-2 text-sm mt-1 outline-none focus:border-teal-600"
                  placeholder="e.g. Beverages"
                />
              </div>
              <div>
                <label className="text-xs text-stone-500">Parent folder</label>
                <select
                  value={folderForm.parentId || ""}
                  onChange={(e) => setFolderForm((f) => ({ ...f, parentId: e.target.value || null }))}
                  className="w-full border border-stone-300 rounded px-2.5 py-2 text-sm mt-1 outline-none focus:border-teal-600"
                >
                  <option value="">No parent (top level)</option>
                  {flatFolders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {"—".repeat(f.depth)} {f.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-stone-200">
              <button
                onClick={() => setShowFolderModal(false)}
                className="text-sm text-stone-600 px-3 py-2 hover:bg-stone-50 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolderSubmit}
                disabled={!folderForm.name.trim()}
                className="bg-teal-700 hover:bg-teal-800 disabled:bg-stone-300 text-white text-sm font-medium px-4 py-2 rounded"
              >
                Add folder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete folder confirmation */}
      {deleteFolderId &&
        (() => {
          const folder = folders.find((f) => f.id === deleteFolderId);
          const idsToDelete = [deleteFolderId, ...getDescendantFolderIds(deleteFolderId)];
          const subfolderCount = idsToDelete.length - 1;
          const itemCount = items.filter((it) => idsToDelete.includes(it.folderId)).length;
          return (
            <div className="fixed inset-0 bg-stone-900 bg-opacity-40 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg w-full max-w-sm">
                <div className="px-5 py-4 border-b border-stone-200">
                  <h2 className="text-base font-semibold text-stone-900">
                    Delete "{folder ? folder.name : ""}"?
                  </h2>
                </div>
                <div className="px-5 py-4 text-sm text-stone-600">
                  {subfolderCount > 0 || itemCount > 0 ? (
                    <>
                      This also deletes{" "}
                      {subfolderCount > 0 && (
                        <b className="text-stone-900">
                          {subfolderCount} subfolder{subfolderCount === 1 ? "" : "s"}
                        </b>
                      )}
                      {subfolderCount > 0 && itemCount > 0 && " and "}
                      {itemCount > 0 && (
                        <b className="text-stone-900">
                          {itemCount} item{itemCount === 1 ? "" : "s"}
                        </b>
                      )}{" "}
                      inside it. This can't be undone.
                    </>
                  ) : (
                    "This can't be undone."
                  )}
                </div>
                <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-stone-200">
                  <button
                    onClick={() => setDeleteFolderId(null)}
                    className="text-sm text-stone-600 px-3 py-2 hover:bg-stone-50 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDeleteFolder}
                    className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded"
                  >
                    Delete folder
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-stone-200 flex items-center justify-center p-0 sm:p-6">
      <InventoryApp />
    </div>
  );
}
