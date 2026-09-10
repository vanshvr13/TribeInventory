export function getDescendantFolderIds(folders, id) {
  const direct = folders.filter((f) => f.parentId === id).map((f) => f.id);
  return direct.concat(direct.flatMap((d) => getDescendantFolderIds(folders, d)));
}

export function folderPath(folders, id) {
  const path = [];
  let cur = folders.find((f) => f.id === id);
  while (cur) {
    path.unshift(cur);
    cur = folders.find((f) => f.id === cur.parentId);
  }
  return path;
}

export function flattenFolders(folders, parentId, depth) {
  return folders
    .filter((f) => f.parentId === parentId)
    .flatMap((f) => [{ ...f, depth }, ...flattenFolders(folders, f.id, depth + 1)]);
}
