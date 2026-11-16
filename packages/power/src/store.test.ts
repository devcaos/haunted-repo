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

  it("keeps the old file and removes the temporary one when writeFile fails after writing", async () => {
    await createFolderStore(folder).write(NAME, "old");
    const failing = createFolderStore(folder, {
      ...nodeFolderFs,
      writeFile: async (file, text) => {
        // Half of the text reaches the disk, then the write fails.
        await nodeFolderFs.writeFile(file, text.slice(0, 2));
        throw Object.assign(new Error("disk full"), { code: "ENOSPC" });
      },
    });
    const result = await failing.write(NAME, "new text");
    expect(result.ok).toBe(false);
    expect(await readFile(join(folder, NAME), "utf8")).toBe("old");
    expect(await readdir(folder)).toEqual([NAME]);
  });

  it("leaves one valid file and no temporary file after two concurrent writes", async () => {
    const store = createFolderStore(folder);
    const results = await Promise.all([
      store.write(NAME, "first"),
      store.write(NAME, "second"),
    ]);
    expect(results.some((r) => r.ok)).toBe(true);
    expect(["first", "second"]).toContain(
      await readFile(join(folder, NAME), "utf8"),
    );
    expect(await readdir(folder)).toEqual([NAME]);
  });

  it("fails with ENOENT and does not retry when the folder is deleted after opening", async () => {
    const data = join(folder, "data");
    const opened = await openStore(data);
    expect(opened.storageOk).toBe(true);
    let renames = 0;
    const waits: number[] = [];
    const spied = createFolderStore(data, {
      ...nodeFolderFs,
      rename: (from, to) => {
        renames++;
        return nodeFolderFs.rename(from, to);
      },
      wait: (ms) => {
        waits.push(ms);
        return Promise.resolve();
      },
    });
    await rm(data, { recursive: true, force: true });
    for (const store of [opened.store, spied]) {
      const result = await store.write(NAME, "x");
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.message).toContain("ENOENT");
    }
    expect(renames).toBe(0);
    expect(waits).toEqual([]);
    expect(await readdir(folder)).toEqual([]);
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

describe("folder store rename retries", () => {
  function codeError(code: string): Error {
    return Object.assign(new Error(code), { code });
  }

  /** A rename that fails with the given codes, in order, then really renames. */
  function scripted(codes: readonly string[]) {
    const waits: number[] = [];
    let attempts = 0;
    const fs = {
      ...nodeFolderFs,
      rename: (from: string, to: string) => {
        const code = codes[attempts];
        attempts++;
        return code === undefined
          ? nodeFolderFs.rename(from, to)
          : Promise.reject(codeError(code));
      },
      wait: (ms: number) => {
        waits.push(ms);
        return Promise.resolve();
      },
    };
    return { fs, waits, attempts: () => attempts };
  }

  it("saves after a rename that fails twice with EPERM", async () => {
    const { fs, waits, attempts } = scripted(["EPERM", "EPERM"]);
    const result = await createFolderStore(folder, fs).write(NAME, "saved");
    expect(result).toEqual({ ok: true });
    expect(attempts()).toBe(3);
    expect(waits).toEqual([50, 100]);
    expect(await readFile(join(folder, NAME), "utf8")).toBe("saved");
    expect(await readdir(folder)).toEqual([NAME]);
  });

  it("fails after 6 attempts when rename always fails with EBUSY", async () => {
    await createFolderStore(folder).write(NAME, "old");
    const { fs, waits, attempts } = scripted(Array(10).fill("EBUSY"));
    const result = await createFolderStore(folder, fs).write(NAME, "new");
    expect(result.ok).toBe(false);
    expect(attempts()).toBe(6);
    expect(waits).toEqual([50, 100, 200, 400, 800]);
    expect(await readFile(join(folder, NAME), "utf8")).toBe("old");
    expect(await readdir(folder)).toEqual([NAME]);
  });

  it("retries EACCES too", async () => {
    const { fs, attempts } = scripted(["EACCES"]);
    expect(await createFolderStore(folder, fs).write(NAME, "x")).toEqual({
      ok: true,
    });
    expect(attempts()).toBe(2);
  });

  it("does not retry ENOSPC", async () => {
    const { fs, waits, attempts } = scripted(["ENOSPC"]);
    const result = await createFolderStore(folder, fs).write(NAME, "x");
    expect(result.ok).toBe(false);
    expect(attempts()).toBe(1);
    expect(waits).toEqual([]);
    expect(await readdir(folder)).toEqual([]);
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
