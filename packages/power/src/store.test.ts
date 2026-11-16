import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createFolderStore,
  createMemoryStore,
  nodeFolderFs,
  openStore,
} from "./store.js";

const NAME = "haunted-repo--lukeed@sirv.json";

let folder: string;

beforeEach(async () => {
  folder = await mkdtemp(join(tmpdir(), "haunted-store-"));
});

afterEach(async () => {
  await rm(folder, { recursive: true, force: true });
});

describe("folder store", () => {
  it("reads back what it wrote", async () => {
    const store = createFolderStore(folder);
    expect(await store.write(NAME, "hello")).toEqual({ ok: true });
    expect(await store.read(NAME)).toEqual({ kind: "found", text: "hello" });
    expect(await readFile(join(folder, NAME), "utf8")).toBe("hello");
  });

  it("leaves no temporary file after a write", async () => {
    const store = createFolderStore(folder);
    await store.write(NAME, "one");
    await store.write(NAME, "two");
    expect(await readdir(folder)).toEqual([NAME]);
  });

  it("says missing for a file that does not exist", async () => {
    const store = createFolderStore(folder);
    expect(await store.read(NAME)).toEqual({ kind: "missing" });
  });

  it("reports other read errors apart from missing", async () => {
    // A folder with the name of the data file cannot be read as a file.
    await mkdir(join(folder, NAME));
    const result = await createFolderStore(folder).read(NAME);
    expect(result.kind).toBe("error");
  });

  it("keeps the old file and removes the temporary one when rename fails", async () => {
    await createFolderStore(folder).write(NAME, "old");
    const failing = createFolderStore(folder, {
      ...nodeFolderFs,
      rename: () =>
        Promise.reject(
          Object.assign(new Error("disk full"), { code: "ENOSPC" }),
        ),
    });
    const result = await failing.write(NAME, "new");
    expect(result.ok).toBe(false);
    expect(await readFile(join(folder, NAME), "utf8")).toBe("old");
    expect(await readdir(folder)).toEqual([NAME]);
  });

  it("refuses names that are not Haunted Repo data files", async () => {
    await writeFile(join(folder, "other.json"), "foreign");
    const store = createFolderStore(folder);
    expect((await store.read("other.json")).kind).toBe("error");
    expect((await store.write("other.json", "x")).ok).toBe(false);
    expect((await store.write("../" + NAME, "x")).ok).toBe(false);
    expect(await readFile(join(folder, "other.json"), "utf8")).toBe("foreign");
  });
});

describe("memory store", () => {
  it("reads back what it wrote and says missing otherwise", async () => {
    const store = createMemoryStore();
    expect(await store.read(NAME)).toEqual({ kind: "missing" });
    expect(await store.write(NAME, "hello")).toEqual({ ok: true });
    expect(await store.read(NAME)).toEqual({ kind: "found", text: "hello" });
  });

  it("refuses names that are not Haunted Repo data files", async () => {
    const store = createMemoryStore();
    expect((await store.write("other.json", "x")).ok).toBe(false);
  });
});

describe("openStore", () => {
  it("uses the folder when PLUGIN_DATA can be written, and leaves no probe", async () => {
    const data = join(folder, "data");
    const { store, storageOk } = await openStore(data);
    expect(storageOk).toBe(true);
    expect(await readdir(data)).toEqual([]);
    await store.write(NAME, "saved");
    expect(await readFile(join(data, NAME), "utf8")).toBe("saved");
  });

  it("falls back to memory without PLUGIN_DATA", async () => {
    for (const value of [undefined, ""]) {
      const { store, storageOk } = await openStore(value);
      expect(storageOk).toBe(false);
      expect(await store.write(NAME, "x")).toEqual({ ok: true });
      expect(await store.read(NAME)).toEqual({ kind: "found", text: "x" });
    }
  });

  it("falls back to memory when PLUGIN_DATA is a file", async () => {
    const file = join(folder, "not-a-folder");
    await writeFile(file, "content");
    const { store, storageOk } = await openStore(file);
    expect(storageOk).toBe(false);
    await store.write(NAME, "x");
    expect(await readFile(file, "utf8")).toBe("content");
    expect(await readdir(folder)).toEqual(["not-a-folder"]);
  });
});
