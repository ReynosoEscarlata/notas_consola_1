import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { openDatabase } from "../db/connection.js";
import { repairDatabase } from "./repair.js";

let dir: string;
let dbPath: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "nota-repair-test-"));
  dbPath = join(dir, "notas.db");
});

describe("repairDatabase", () => {
  it("si el archivo no existe, crea la base nueva sin backup", () => {
    const result = repairDatabase(dbPath);

    expect(result.backupPath).toBeUndefined();
    expect(existsSync(dbPath)).toBe(true);
  });

  it("si el archivo existe (corrupto), lo mueve a un backup y crea uno nuevo en la ruta original", () => {
    writeFileSync(dbPath, "contenido corrupto");

    const result = repairDatabase(dbPath);

    expect(result.backupPath).toBeDefined();
    expect(existsSync(result.backupPath as string)).toBe(true);
    expect(existsSync(dbPath)).toBe(true);
  });

  it("el nombre del backup sigue el patrón <ruta>.corrupted-<timestamp>", () => {
    writeFileSync(dbPath, "contenido corrupto");

    const result = repairDatabase(dbPath);

    expect(result.backupPath).toMatch(/notas\.db\.corrupted-.+$/);
  });

  it("la base nueva tiene el esquema completo y se puede insertar después", () => {
    writeFileSync(dbPath, "contenido corrupto");

    repairDatabase(dbPath);

    const db = openDatabase(dbPath);
    db.prepare("INSERT INTO notes (text, created_at) VALUES (?, ?)").run("prueba", new Date().toISOString());
    const count = (db.prepare("SELECT COUNT(*) AS count FROM notes").get() as { count: number }).count;
    db.close();

    expect(count).toBe(1);
  });

  it("el contenido del backup queda exactamente igual al original, sin truncar ni modificar", () => {
    const originalContent = "contenido corrupto con bytes raros: \x00\x01\x02";
    writeFileSync(dbPath, originalContent, "binary");

    const result = repairDatabase(dbPath);

    expect(readFileSync(result.backupPath as string, "binary")).toBe(originalContent);
  });

  it("correr repair dos veces seguidas funciona ambas veces (la segunda repara la ya reparada)", () => {
    writeFileSync(dbPath, "contenido corrupto");

    const first = repairDatabase(dbPath);
    const second = repairDatabase(dbPath);

    expect(first.backupPath).toBeDefined();
    expect(second.backupPath).toBeDefined();
    expect(first.backupPath).not.toBe(second.backupPath);
    expect(existsSync(dbPath)).toBe(true);
    expect(existsSync(first.backupPath as string)).toBe(true);
    expect(existsSync(second.backupPath as string)).toBe(true);
  });

  it("repair sobre una base válida (no corrupta) también la resetea, perdiendo el contenido anterior", () => {
    const db = openDatabase(dbPath);
    db.prepare("INSERT INTO notes (text, created_at) VALUES (?, ?)").run("nota previa", new Date().toISOString());
    db.close();

    const result = repairDatabase(dbPath);

    const reopened = openDatabase(dbPath);
    const count = (reopened.prepare("SELECT COUNT(*) AS count FROM notes").get() as { count: number }).count;
    reopened.close();

    expect(result.backupPath).toBeDefined();
    expect(count).toBe(0);
  });
});
