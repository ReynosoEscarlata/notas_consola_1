import Database from "better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import { openDatabase } from "../db/connection.js";
import { addNote } from "./notes.js";

let db: Database.Database;

beforeEach(() => {
  db = openDatabase(":memory:");
});

describe("addNote", () => {
  it("crea una nota normalizando tags (trim + minúsculas)", () => {
    const result = addNote(db, "Revisar PR", " Trabajo , IDEAS ");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.note.text).toBe("Revisar PR");
      expect(result.note.tags).toEqual(["trabajo", "ideas"]);
      expect(result.note.id).toBeGreaterThan(0);
    }
  });

  it("rechaza texto vacío o solo espacios", () => {
    const result = addNote(db, "   ", undefined);

    expect(result).toEqual({ ok: false, error: { kind: "empty_text" } });
  });

  it("rechaza un tag con caracteres no permitidos, mostrando el texto tal cual lo escribió el usuario", () => {
    const result = addNote(db, "texto", "Proyecto X");

    expect(result).toEqual({
      ok: false,
      error: { kind: "invalid_tag_charset", tag: "Proyecto X" },
    });
  });

  it("rechaza tags repetidos dentro de la misma lista (comparación normalizada)", () => {
    const result = addNote(db, "texto", "trabajo,Trabajo");

    expect(result).toEqual({
      ok: false,
      error: { kind: "duplicate_tag", tag: "Trabajo" },
    });
  });

  it("descarta segmentos vacíos tras separar por coma, sin error", () => {
    const result = addNote(db, "texto", "trabajo,,ideas");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.note.tags).toEqual(["trabajo", "ideas"]);
    }
  });
});
