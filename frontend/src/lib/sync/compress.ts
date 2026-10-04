// Shrink a case photo for upload, once, at share time (never at send time: phones stall decoding big images on a bad link).
// JPEG only: iOS Safari cannot encode WebP. Re-encoding through a canvas also strips EXIF (GPS, phone model).
// The source is the 640 px copy made at capture (shrinkPhoto), so photo1024 is "up to 1024 px": we never upscale.
import { getBlob, putBlob } from "../store/db";

export const thumbKey = (id: string) => `thumb:${id}`;
export const photoKey = (id: string) => `photo1024:${id}`;
export const voiceKey = (id: string) => `voice:${id}`;

export async function toJpeg(src: Blob, maxSide: number, quality: number): Promise<Blob> {
  const bmp = await createImageBitmap(src);
  const s = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * s));
  const h = Math.max(1, Math.round(bmp.height * s));
  let out: Blob;
  if (typeof OffscreenCanvas !== "undefined") {
    const c = new OffscreenCanvas(w, h);
    c.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
    out = await c.convertToBlob({ type: "image/jpeg", quality });
  } else {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    c.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
    out = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("encode failed"))), "image/jpeg", quality));
  }
  bmp.close?.();
  if (out.type !== "image/jpeg") throw new Error(`expected image/jpeg, got ${out.type || "empty"}`); // e.g. a browser that fell back to PNG
  return out;
}

/** Writes thumb:<id> (256 px, q0.6) and photo1024:<id> (q0.7) from the stored photo. False if there is no photo. */
export async function prepareImages(caseId: string): Promise<boolean> {
  const src = await getBlob(caseId);
  if (!src) return false;
  await putBlob(thumbKey(caseId), await toJpeg(src, 256, 0.6));
  await putBlob(photoKey(caseId), await toJpeg(src, 1024, 0.7));
  return true;
}
