import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { DatabaseCorruptedError, openDatabase } from "./connection.js";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "nota-connection-test-"));
});

describe("openDatabase", () => {
  it("crea el esquema completo en una ruta nueva", () => {
    const db = openDatabase(join(dir, "nueva.db"));

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name != 'sqlite_sequence' ORDER BY name")
      .all() as { name: string }[];
    db.close();

    expect(tables.map((t) => t.name)).toEqual(["note_tags", "notes", "tags"]);
  });

  it("lanza DatabaseCorruptedError si el archivo no es una base SQLite válida", () => {
    const corruptedPath = join(dir, "corrupta.db");
    writeFileSync(corruptedPath, "esto no es una base de datos sqlite, son bytes cualquiera");

    expect(() => openDatabase(corruptedPath)).toThrow(DatabaseCorruptedError);
  });

  it("no modifica ni borra el archivo corrupto al fallar", () => {
    const corruptedPath = join(dir, "corrupta.db");
    const originalContent = "esto no es una base de datos sqlite, son bytes cualquiera";
    writeFileSync(corruptedPath, originalContent);

    try {
      openDatabase(corruptedPath);
    } catch {
      // esperado
    }

    expect(existsSync(corruptedPath)).toBe(true);
    expect(readFileSync(corruptedPath, "utf-8")).toBe(originalContent);
  });

  it("conserva la causa original del error en DatabaseCorruptedError.cause", () => {
    const corruptedPath = join(dir, "corrupta.db");
    writeFileSync(corruptedPath, "no es sqlite");

    try {
      openDatabase(corruptedPath);
      expect.unreachable("openDatabase debía lanzar");
    } catch (error) {
      expect(error).toBeInstanceOf(DatabaseCorruptedError);
      expect((error as DatabaseCorruptedError).cause).toBeDefined();
    }
  });

  it("permite reabrir la misma ruta válida varias veces sin error", () => {
    const dbPath = join(dir, "reabrible.db");

    const first = openDatabase(dbPath);
    first.close();
    const second = openDatabase(dbPath);
    second.close();
    const third = openDatabase(dbPath);
    third.close();

    expect(existsSync(dbPath)).toBe(true);
  });
});
