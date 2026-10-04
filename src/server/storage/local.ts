import "server-only";

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import type { FileStorage } from "./index";

/** Stores files in a folder on disk (development). The folder is outside /public and git-ignored. */
export class LocalStorage implements FileStorage {
  private readonly root: string;

  constructor(root: string) {
    this.root = path.resolve(root);
  }

  /** Resolves a key to a path and refuses anything that escapes the root (e.g. "../../etc"). */
  private resolve(key: string) {
    const target = path.resolve(this.root, key);
    if (!target.startsWith(this.root + path.sep)) {
      throw new Error("Invalid storage key.");
    }
    return target;
  }

  async put(key: string, bytes: Uint8Array) {
    const target = this.resolve(key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes);
  }

  async get(key: string) {
    return new Uint8Array(await readFile(this.resolve(key)));
  }

  async delete(key: string) {
    await rm(this.resolve(key), { force: true });
  }
}
