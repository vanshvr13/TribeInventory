import { csvCell, trimNum } from "./format.js";

const HEADER = ["Folder", "Name", "Quantity", "Unit", "Min Level", "Price", "Provider", "Expiry"];

// items: flat list. folderPathLabel(folderId) -> "Folder > Sub" string. Returns a Blob.
export function generateItemsCsv(items, { t, folderPathLabel }) {
  const rows = items.map((it) =>
    [
      folderPathLabel(it.folderId),
      it.name,
      trimNum(it.quantity),
      t(`unit.${it.unit}`),
      it.minLevel === null ? "" : trimNum(it.minLevel),
      it.price || 0,
      it.provider || "",
      it.expiry || "",
    ]
      .map(csvCell)
      .join(",")
  );
  return new Blob([[HEADER.map(csvCell).join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
}
