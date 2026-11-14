import { ASSET_SLOTS } from "./manifest.js";
import type { AssetFallback, AssetSlotId } from "./manifest.js";

// Built URLs of every local asset file, keyed by "./files/<name>".
// No file means an empty map, and every slot falls back.
const URLS = import.meta.glob("./files/*", {
  query: "?url",
  import: "default",
  eager: true,
}) as Record<string, string>;

export type ResolvedSlot =
  | { kind: "layers"; layers: { url: string; alt: string }[] }
  | { kind: "fallback"; fallback: AssetFallback };

/** Layers with built URLs, or the fallback when the slot is empty or any listed file is missing. Never throws. */
export function resolveSlot(id: AssetSlotId): ResolvedSlot {
  const slot = ASSET_SLOTS.find((s) => s.id === id);
  if (slot === undefined) {
    return { kind: "fallback", fallback: "none" };
  }
  if (slot.layers.length === 0) {
    return { kind: "fallback", fallback: slot.fallback };
  }
  const layers: { url: string; alt: string }[] = [];
  for (const layer of slot.layers) {
    const url = URLS[`./files/${layer.file}`];
    if (typeof url !== "string") {
      return { kind: "fallback", fallback: slot.fallback };
    }
    layers.push({ url, alt: layer.alt });
  }
  return { kind: "layers", layers };
}
