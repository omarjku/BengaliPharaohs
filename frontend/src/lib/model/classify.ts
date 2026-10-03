// On-device rice-leaf classifier: onnxruntime-web, WASM backend, single thread, self-hosted files (never a CDN).
// Hand-off files from Omar (same names forever): public/model/{rice.onnx, labels.json, preprocess.json, threshold.json}.
import type { Prediction } from "../engine/types";

type Preprocess = { size: number; resize_short_side: number; mean: number[]; std: number[]; layout: string; input_name: string; output_name: string };
export type ThresholdFile = { temperature: number; min_prob: number; min_margin: number; dummy?: boolean; metrics?: Record<string, unknown> };

// Minimal typing of the global `ort` from /ort/ort.wasm.min.js (loaded at runtime so the bundler never touches it).
type OrtTensor = { data: Float32Array };
type OrtSession = { run(feeds: Record<string, unknown>): Promise<Record<string, OrtTensor>> };
type Ort = {
  env: { wasm: { wasmPaths: string; numThreads: number; proxy?: boolean } };
  Tensor: new (type: "float32", data: Float32Array, dims: number[]) => unknown;
  InferenceSession: { create(model: ArrayBuffer | Uint8Array, opts: object): Promise<OrtSession> };
};
declare global {
  interface Window {
    ort?: Ort;
  }
}

export type Model = { session: OrtSession; ort: Ort; labels: string[]; pre: Preprocess; th: ThresholdFile };
let loading: Promise<Model> | null = null;

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    if (window.ort) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Could not load ${src}`));
    document.head.appendChild(s);
  });
}

const json = <T,>(url: string) => fetch(url).then((r) => (r.ok ? (r.json() as Promise<T>) : Promise.reject(new Error(`${url}: ${r.status}`))));

/** Load once, warm up once. Safe to call many times. */
export function loadModel(): Promise<Model> {
  loading ??= (async () => {
    await loadScript("/ort/ort.wasm.min.js");
    const ort = window.ort!;
    ort.env.wasm.wasmPaths = "/ort/";
    ort.env.wasm.numThreads = 1; // multi-thread needs COOP/COEP headers; cheap phones gain little
    const [labels, pre, th, bytes] = await Promise.all([
      json<string[]>("/model/labels.json"),
      json<Preprocess>("/model/preprocess.json"),
      json<ThresholdFile>("/model/threshold.json"),
      fetch("/model/rice.onnx").then((r) => r.arrayBuffer()),
    ]);
    const session = await ort.InferenceSession.create(new Uint8Array(bytes), { executionProviders: ["wasm"], graphOptimizationLevel: "all" });
    const m: Model = { session, ort, labels, pre, th };
    await run(m, new Float32Array(3 * pre.size * pre.size)); // warm-up so the first real photo is fast
    return m;
  })().catch((e) => {
    loading = null;
    throw e;
  });
  return loading;
}

async function run(m: Model, input: Float32Array) {
  const { size, input_name, output_name } = m.pre;
  const out = await m.session.run({ [input_name]: new m.ort.Tensor("float32", input, [1, 3, size, size]) });
  return out[output_name].data;
}

/** Resize short side → resize_short_side, centre-crop size×size, normalise, NCHW. Must match ml/common.py exactly. */
export async function toTensor(img: Blob, pre: Preprocess): Promise<Float32Array> {
  const bmp = await createImageBitmap(img);
  const scale = pre.resize_short_side / Math.min(bmp.width, bmp.height);
  const crop = pre.size / scale; // crop side in source pixels
  const sx = (bmp.width - crop) / 2;
  const sy = (bmp.height - crop) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = pre.size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, sx, sy, crop, crop, 0, 0, pre.size, pre.size);
  bmp.close();
  const { data } = ctx.getImageData(0, 0, pre.size, pre.size);
  const n = pre.size * pre.size;
  const out = new Float32Array(3 * n);
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < 3; c++) out[c * n + i] = (data[i * 4 + c] / 255 - pre.mean[c]) / pre.std[c];
  }
  return out;
}

export function softmax(logits: ArrayLike<number>, temperature = 1): number[] {
  const z = Array.from(logits, (x) => x / temperature);
  const max = Math.max(...z);
  const e = z.map((x) => Math.exp(x - max));
  const sum = e.reduce((a, b) => a + b, 0);
  return e.map((x) => x / sum);
}

export async function classify(img: Blob): Promise<{ pred: Prediction; ms: number; dummy: boolean; th: ThresholdFile }> {
  const m = await loadModel();
  const t0 = performance.now();
  const probs = softmax(await run(m, await toTensor(img, m.pre)), m.th.temperature);
  const ms = Math.round(performance.now() - t0);
  const order = probs.map((p, i) => [p, i] as const).sort((a, b) => b[0] - a[0]);
  const pred: Prediction = {
    top1: m.labels[order[0][1]],
    p1: order[0][0],
    top2: m.labels[order[1][1]],
    p2: order[1][0],
    probs: Object.fromEntries(m.labels.map((l, i) => [l, probs[i]])),
  };
  return { pred, ms, dummy: !!m.th.dummy, th: m.th };
}

/** Decode an image as small as possible. Decoding a 12 MP camera photo at full size can crash a 1 GB phone. */
async function decodeSmall(img: Blob, maxSide: number): Promise<CanvasImageSource & { width: number; height: number; close?: () => void }> {
  try {
    // Decodes straight to a small size (aspect kept). EXIF rotation is applied by default.
    return await createImageBitmap(img, { resizeWidth: maxSide, resizeQuality: "medium" });
  } catch {}
  try {
    return await createImageBitmap(img);
  } catch {}
  // Last resort: the <img> decoder handles a few formats createImageBitmap rejects.
  const url = URL.createObjectURL(img);
  try {
    const el = new Image();
    el.src = url;
    await el.decode();
    return Object.assign(el, { width: el.naturalWidth, height: el.naturalHeight });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Small JPEG copy for storage/sharing. Re-encoding through a canvas drops EXIF (GPS, phone model). */
export async function shrinkPhoto(img: Blob, maxSide = 640): Promise<Blob> {
  const bmp = await decodeSmall(img, maxSide);
  const s = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * s);
  canvas.height = Math.round(bmp.height * s);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close?.();
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("encode failed"))), "image/jpeg", 0.85));
}
