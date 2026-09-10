import { storage } from "./firebaseClient";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

export function resizePhoto(dataUrl, maxDim = 1024, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

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
