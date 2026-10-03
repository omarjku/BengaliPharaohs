"use client";

import { Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/i18n";

/**
 * Camera inside the page (getUserMedia). Opening the phone's own camera app can make cheap Androids kill this
 * tab to free memory, and the photo is lost when it comes back. Staying in the page avoids that.
 * Calls onFallback if the camera can't be opened (no permission, no camera, old browser) so the caller can
 * use the native <input capture> instead.
 */
export function CameraSheet({ onPhoto, onClose, onFallback }: { onPhoto: (b: Blob) => void; onClose: () => void; onFallback: () => void }) {
  const { t } = useLang();
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const fallback = useRef(onFallback);
  fallback.current = onFallback;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("no getUserMedia");
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 960 } },
          audio: false,
        });
        if (!alive) return s.getTracks().forEach((tr) => tr.stop());
        stream.current = s;
        if (video.current) {
          video.current.srcObject = s;
          await video.current.play().catch(() => {});
        }
        setReady(true);
      } catch {
        if (alive) fallback.current();
      }
    })();
    return () => {
      alive = false;
      stream.current?.getTracks().forEach((tr) => tr.stop());
    };
  }, []);

  function shoot() {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    setBusy(true);
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d")!.drawImage(v, 0, 0);
    c.toBlob(
      (b) => {
        stream.current?.getTracks().forEach((tr) => tr.stop());
        if (b) onPhoto(b);
        else onClose();
      },
      "image/jpeg",
      0.9,
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black" role="dialog" aria-modal="true" aria-label={t("photo_camera")}>
      <video ref={video} playsInline muted className="min-h-0 flex-1 object-cover" />
      {/* Frame guide: one leaf, filling the box. */}
      <div className="pointer-events-none absolute inset-x-8 top-1/2 h-40 -translate-y-1/2 rounded-3xl border-4 border-white/70" />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center text-white">
          <Loader2 className="size-10 animate-spin" />
        </div>
      )}
      <p className="absolute inset-x-0 top-[calc(env(safe-area-inset-top)+1rem)] px-6 text-center text-base font-semibold text-white drop-shadow">
        {t("camera_guide")}
      </p>
      <div className="flex items-center justify-between px-8 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-5">
        <button onClick={onClose} className="flex size-14 items-center justify-center rounded-full bg-white/15 text-white" aria-label={t("back")}>
          <X className="size-7" />
        </button>
        <button
          onClick={shoot}
          disabled={!ready || busy}
          aria-label={t("camera_shoot")}
          className="flex size-20 items-center justify-center rounded-full border-4 border-white bg-white/25 active:scale-95 disabled:opacity-40"
        >
          {busy ? <Loader2 className="size-8 animate-spin text-white" /> : <span className="size-14 rounded-full bg-white" />}
        </button>
        <span className="size-14" />
      </div>
    </div>
  );
}
