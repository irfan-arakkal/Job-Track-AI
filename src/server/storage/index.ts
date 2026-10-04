import "server-only";

import { env } from "@/env";

import { LocalStorage } from "./local";
import { S3Storage } from "./s3";

/**
 * Where uploaded files live. Code depends on this small interface, not on a specific backend,
 * so development (local folder) and production (S3/R2 bucket) are a config change.
 * Files are always PRIVATE: nothing here produces a public URL — downloads go through an
 * authenticated route that checks ownership first.
 */
export interface FileStorage {
  put(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<Uint8Array>;
  delete(key: string): Promise<void>;
}

let instance: FileStorage | undefined;

export function getStorage(): FileStorage {
  instance ??=
    env.STORAGE_DRIVER === "s3"
      ? new S3Storage({
          bucket: env.S3_BUCKET!,
          region: env.S3_REGION,
          endpoint: env.S3_ENDPOINT,
          accessKeyId: env.S3_ACCESS_KEY_ID!,
          secretAccessKey: env.S3_SECRET_ACCESS_KEY!,
        })
      : new LocalStorage(env.STORAGE_LOCAL_DIR);
  return instance;
}
