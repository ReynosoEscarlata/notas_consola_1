import Database from "better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import { openDatabase } from "../db/connection.js";
import { addNote } from "./notes.js";
import { exportNotes } from "./export.js";

let db: Database.Database;

beforeEach(() => {
  db = openDatabase(":memory:");
});

describe("exportNotes", () => {
  it("exporta todas las notas con sus tags, sin paginar", () => {
    addNote(db, "primera", "a,b");
    addNote(db, "segunda", undefined);

    const result = exportNotes(db, "json");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.notes).toHaveLength(2);
      expect(result.notes[0]?.text).toBe("segunda");
      expect(result.notes[1]?.tags).toEqual(["a", "b"]);
    }
  });

  it("rechaza un formato no soportado, conservando el valor tal cual se escribió", () => {
    const result = exportNotes(db, "xml");

    expect(result).toEqual({ ok: false, error: { kind: "unsupported_format", format: "xml" } });
  });

  it("acepta el formato sin distinguir mayúsculas/minúsculas (json)", () => {
    const result = exportNotes(db, "JSON");

    expect(result).toEqual({ ok: true, format: "json", notes: [] });
  });

  it("acepta el formato sin distinguir mayúsculas/minúsculas (md)", () => {
    const result = exportNotes(db, "MD");

    expect(result).toEqual({ ok: true, format: "md", notes: [] });
  });

  it("sin notas devuelve notes: [] sin error", () => {
    const result = exportNotes(db, "md");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.notes).toEqual([]);
    }
  });

  it("ordena por id descendente con varias notas", () => {
    addNote(db, "uno", undefined);
    addNote(db, "dos", undefined);
    addNote(db, "tres", undefined);

    const result = exportNotes(db, "json");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.notes.map((n) => n.id)).toEqual([3, 2, 1]);
      expect(result.notes.map((n) => n.text)).toEqual(["tres", "dos", "uno"]);
    }
  });

  it("mantiene created_at en UTC crudo, sin convertir a hora local", () => {
    const created = addNote(db, "con fecha", undefined);
    if (!created.ok) throw new Error("setup falló");

    const result = exportNotes(db, "json");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.notes[0]?.createdAt).toBe(created.note.createdAt);
      expect(result.notes[0]?.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    }
  });
});
