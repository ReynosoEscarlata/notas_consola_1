import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS note_tags (
  note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  tag_id  INTEGER NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
  PRIMARY KEY (note_id, tag_id)
);
`;

export class DatabaseCorruptedError extends Error {
  constructor(dbPath: string, cause: unknown) {
    super(`No se pudo abrir la base de datos en ${dbPath}`, { cause });
    this.name = "DatabaseCorruptedError";
  }
}

export function openDatabase(dbPath: string): Database.Database {
  mkdirSync(dirname(dbPath), { recursive: true });

  try {
    const db = new Database(dbPath);
    db.pragma("foreign_keys = ON");
    db.exec(SCHEMA);
    return db;
  } catch (error) {
    throw new DatabaseCorruptedError(dbPath, error);
  }
}
