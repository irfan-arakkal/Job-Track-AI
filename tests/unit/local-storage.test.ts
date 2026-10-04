import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterAll, describe, expect, it } from "vitest";

import { LocalStorage } from "@/server/storage/local";

describe("LocalStorage", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "jobtrack-ls-"));
  const storage = new LocalStorage(dir);
  afterAll(() => rm(dir, { recursive: true, force: true }));

  it("puts, gets and deletes files", async () => {
    await storage.put("a/b.pdf", new Uint8Array([1, 2, 3]));
    expect([...(await storage.get("a/b.pdf"))]).toEqual([1, 2, 3]);
    await storage.delete("a/b.pdf");
    await expect(storage.get("a/b.pdf")).rejects.toThrow();
  });

  it("refuses keys that escape the storage folder (path traversal)", async () => {
    await expect(storage.put("../escape.txt", new Uint8Array([1]))).rejects.toThrow(
      "Invalid storage key",
    );
    await expect(storage.get("../../etc/passwd")).rejects.toThrow("Invalid storage key");
  });
});
