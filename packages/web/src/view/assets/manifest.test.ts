/// <reference types="node" />
import { existsSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ASSET_SLOTS } from "./manifest.js";
import type { AssetSlotId } from "./manifest.js";

const FILES_DIR = new URL("./files/", import.meta.url);

const ALL_IDS: readonly AssetSlotId[] = [
  "scene.house",
  "scene.attic",
  "scene.middle-floor",
  "scene.basement",
  "scene.ghost-room",
  "ghost.haunted",
  "ghost.exorcised",
  "ghost.locked",
  "prop.door",
  "prop.candle",
];

const FALLBACKS = ["none", "token-colour", "text-label"];

const allLayers = ASSET_SLOTS.flatMap((slot) => slot.layers);

describe("asset manifest", () => {
  it("declares every slot id exactly once", () => {
    const ids = ASSET_SLOTS.map((slot) => slot.id);
    expect([...ids].sort()).toEqual([...ALL_IDS].sort());
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every slot a fallback and a non-blank purpose", () => {
    for (const slot of ASSET_SLOTS) {
      expect(FALLBACKS).toContain(slot.fallback);
      expect(slot.purpose.trim()).not.toBe("");
    }
  });

  it("gives every layer a non-blank source", () => {
    for (const layer of allLayers) {
      expect(layer.source.trim()).not.toBe("");
    }
  });

  it("lists only files that exist in files/", () => {
    for (const layer of allLayers) {
      expect(existsSync(new URL(layer.file, FILES_DIR))).toBe(true);
    }
  });

  it("lists every file in files/ except .gitkeep", () => {
    const listed = new Set(allLayers.map((layer) => layer.file));
    const onDisk = readdirSync(FILES_DIR).filter((name) => name !== ".gitkeep");
    for (const name of onDisk) {
      expect(listed.has(name)).toBe(true);
    }
  });

  it("never uses an address as a layer file", () => {
    for (const layer of allLayers) {
      expect(layer.file).not.toMatch(/^[a-z][a-z0-9+.-]*:/i);
      expect(layer.file).not.toMatch(/^\/\//);
      expect(layer.file).not.toMatch(/[/\\]/);
    }
  });

  it("leaves every layers list empty in this spec", () => {
    for (const slot of ASSET_SLOTS) {
      expect(slot.layers).toEqual([]);
    }
  });
});
