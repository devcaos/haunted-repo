// Where the Repository_Data_Files live (design sections 5 and 6): a folder
// store on disk (the Power_Data_Folder in PLUGIN_DATA) or a memory store.
// This is the only module of the Power that imports node:fs.
import { randomUUID } from "node:crypto";
import * as fsp from "node:fs/promises";
import * as path from "node:path";
import { isOwnDataFile } from "./dataFile.js";

/** Result of reading one file. "missing" means the file does not exist. */
export type ReadResult =
  | { kind: "found"; text: string }
  | { kind: "missing" }
  | { kind: "error"; message: string };

/** Result of writing one file. */
export type WriteResult = { ok: true } | { ok: false; message: string };

export interface Store {
  read(name: string): Promise<ReadResult>;
  write(name: string, text: string): Promise<WriteResult>;
}

/** The disk operations the folder store uses, injectable for tests. */
export interface FolderFs {
  readFile(file: string): Promise<string>;
  writeFile(file: string, text: string): Promise<void>;
  rename(from: string, to: string): Promise<void>;
  unlink(file: string): Promise<void>;
}

export const nodeFolderFs: FolderFs = {
  readFile: (file) => fsp.readFile(file, "utf8"),
  writeFile: (file, text) => fsp.writeFile(file, text, "utf8"),
  rename: (from, to) => fsp.rename(from, to),
  unlink: (file) => fsp.unlink(file),
};

const PROBE_NAME = "haunted-repo--probe.tmp";

function errorCode(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function notOwn(name: string): string {
  return `"${name}" is not a Haunted Repo data file name.`;
}

/**
 * A store on disk. It opens only names that pass isOwnDataFile and never
 * lists the folder. A write goes to "<name>.<random>.tmp" and is then
 * renamed over the final name, so the final file is never half written.
 */
export function createFolderStore(
  folder: string,
  fs: FolderFs = nodeFolderFs,
): Store {
  return {
    async read(name) {
      if (!isOwnDataFile(name)) {
        return { kind: "error", message: notOwn(name) };
      }
      try {
        const text = await fs.readFile(path.join(folder, name));
        return { kind: "found", text };
      } catch (error) {
        if (errorCode(error) === "ENOENT") {
          return { kind: "missing" };
        }
        return {
          kind: "error",
          message: `The saved file "${name}" could not be read: ${errorMessage(error)}`,
        };
      }
    },

    async write(name, text) {
      if (!isOwnDataFile(name)) {
        return { ok: false, message: notOwn(name) };
      }
      const finalFile = path.join(folder, name);
      const tempFile = path.join(folder, `${name}.${randomUUID()}.tmp`);
      try {
        await fs.writeFile(tempFile, text);
        await fs.rename(tempFile, finalFile);
        return { ok: true };
      } catch (error) {
        try {
          await fs.unlink(tempFile);
        } catch {
          // The temporary file may not exist; nothing else to clean.
        }
        return {
          ok: false,
          message: `The file "${name}" could not be saved: ${errorMessage(error)}`,
        };
      }
    },
  };
}

/** A store in memory: a Map of file name to text. Nothing reaches the disk. */
export function createMemoryStore(): Store {
  const files = new Map<string, string>();
  return {
    read(name) {
      if (!isOwnDataFile(name)) {
        return Promise.resolve({ kind: "error", message: notOwn(name) });
      }
      const text = files.get(name);
      return Promise.resolve(
        text === undefined ? { kind: "missing" } : { kind: "found", text },
      );
    },
    write(name, text) {
      if (!isOwnDataFile(name)) {
        return Promise.resolve({ ok: false, message: notOwn(name) });
      }
      files.set(name, text);
      return Promise.resolve({ ok: true });
    },
  };
}

export interface OpenedStore {
  store: Store;
  storageOk: boolean;
}

/**
 * Chooses the store at start-up (Requirement 7.10): the folder store when
 * PLUGIN_DATA is set, the folder can be created, and a probe file can be
 * written and deleted; otherwise the memory store with storageOk false.
 */
export async function openStore(
  pluginData: string | undefined,
): Promise<OpenedStore> {
  if (pluginData === undefined || pluginData === "") {
    return { store: createMemoryStore(), storageOk: false };
  }
  try {
    await fsp.mkdir(pluginData, { recursive: true });
    const probe = path.join(pluginData, PROBE_NAME);
    await fsp.writeFile(probe, "probe", "utf8");
    await fsp.unlink(probe);
  } catch {
    return { store: createMemoryStore(), storageOk: false };
  }
  return { store: createFolderStore(pluginData), storageOk: true };
}
