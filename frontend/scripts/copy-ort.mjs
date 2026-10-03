// Self-host onnxruntime-web (never load it from a CDN: that breaks offline). Copies the WASM build into public/ort/.
import { copyFileSync, mkdirSync } from "node:fs";

const src = new URL("../node_modules/onnxruntime-web/dist/", import.meta.url);
const dst = new URL("../public/ort/", import.meta.url);
mkdirSync(dst, { recursive: true });
for (const f of ["ort.wasm.min.js", "ort-wasm-simd-threaded.mjs", "ort-wasm-simd-threaded.wasm"]) {
  copyFileSync(new URL(f, src), new URL(f, dst));
}
console.log("onnxruntime-web copied to public/ort/");
