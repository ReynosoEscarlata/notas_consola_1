import Database from "better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import { openDatabase } from "../db/connection.js";
import { addNote } from "./notes.js";
import { listNotes } from "./list.js";

let db: Database.Database;

beforeEach(() => {
  db = openDatabase(":memory:");
});

describe("listNotes", () => {
  it("ordena por id descendente y devuelve metadata de paginación", () => {
    addNote(db, "primera", undefined);
    addNote(db, "segunda", undefined);
    addNote(db, "tercera", undefined);

    const result = listNotes(db, {});

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.result.notes.map((n) => n.text)).toEqual(["tercera", "segunda", "primera"]);
      expect(result.result.total).toBe(3);
      expect(result.result.page).toBe(1);
      expect(result.result.perPage).toBe(10);
    }
  });

  it("filtra por tag exacto, mostrando todas las etiquetas de la nota encontrada", () => {
    addNote(db, "con trabajo", "trabajo,ideas");
    addNote(db, "sin trabajo", "personal");

    const result = listNotes(db, { tag: "TRABAJO" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.result.notes).toHaveLength(1);
      expect(result.result.notes[0]?.text).toBe("con trabajo");
      expect(result.result.notes[0]?.tags).toEqual(["trabajo", "ideas"]);
    }
  });

  it("rechaza --page que no sea un entero positivo", () => {
    const result = listNotes(db, { page: "abc" });

    expect(result).toEqual({ ok: false, error: { kind: "invalid_page" } });
  });

  it("rechaza --per-page mayor a 20", () => {
    const result = listNotes(db, { perPage: "21" });

    expect(result).toEqual({ ok: false, error: { kind: "per_page_too_large" } });
  });
});
