import { existsSync, renameSync } from "node:fs";
import { openDatabase } from "../db/connection.js";

export interface RepairResult {
  backupPath: string | undefined;
}

export function repairDatabase(dbPath: string): RepairResult {
  let backupPath: string | undefined;

  if (existsSync(dbPath)) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    backupPath = `${dbPath}.corrupted-${timestamp}`;
    renameSync(dbPath, backupPath);
  }

  const db = openDatabase(dbPath);
  db.close();

  return { backupPath };
}
