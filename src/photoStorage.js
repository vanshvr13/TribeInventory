import { storage } from "./firebaseClient";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

export async function uploadPhoto(dataUrl) {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const storageRef = ref(storage, `photos/${crypto.randomUUID()}.jpg`);
  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
}

export async function deletePhoto(url) {
  try {
    await deleteObject(ref(storage, url));
  } catch {
    // best-effort cleanup — ignore failures (e.g. already deleted)
  }
}
