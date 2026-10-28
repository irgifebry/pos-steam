import type { AppDatabase } from "./schema";

let instance: AppDatabase | undefined;

export function setDatabase(db: AppDatabase): void {
  instance = db;
}

export function getDatabase(): AppDatabase {
  if (!instance) {
    throw new Error("Database belum diinisialisasi. Panggil setDatabase() lebih dulu.");
  }
  return instance;
}
