import Database from "better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import { openDatabase } from "../db/connection.js";
import { addNote } from "./notes.js";
import { searchNotes } from "./search.js";

let db: Database.Database;

beforeEach(() => {
  db = openDatabase(":memory:");
});

describe("searchNotes", () => {
  it("busca coincidencia parcial case-insensitive en el texto", () => {
    addNote(db, "Revisar el PR de autenticación", undefined);
    addNote(db, "Comprar pan", undefined);

    const result = searchNotes(db, { word: "REVISAR" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.result.notes).toHaveLength(1);
      expect(result.result.notes[0]?.text).toBe("Revisar el PR de autenticación");
    }
  });

  it("no busca en los tags, solo en el texto", () => {
    addNote(db, "nota cualquiera", "trabajo");

    const result = searchNotes(db, { word: "trabajo" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.result.notes).toHaveLength(0);
    }
  });

  it("rechaza palabra vacía o solo espacios", () => {
    const result = searchNotes(db, { word: "   " });

    expect(result).toEqual({ ok: false, error: { kind: "empty_word" } });
  });

  it("rechaza --per-page mayor a 20, igual que list", () => {
    const result = searchNotes(db, { word: "algo", perPage: "21" });

    expect(result).toEqual({ ok: false, error: { kind: "per_page_too_large" } });
  });

  it("sin coincidencias devuelve notes: [] sin error", () => {
    addNote(db, "Comprar pan", undefined);

    const result = searchNotes(db, { word: "inexistente" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.result.notes).toEqual([]);
      expect(result.result.total).toBe(0);
    }
  });

  it("pagina correctamente cruzando páginas", () => {
    addNote(db, "tarea uno", undefined);
    addNote(db, "tarea dos", undefined);
    addNote(db, "tarea tres", undefined);

    const firstPage = searchNotes(db, { word: "tarea", page: "1", perPage: "2" });
    const secondPage = searchNotes(db, { word: "tarea", page: "2", perPage: "2" });

    expect(firstPage.ok).toBe(true);
    expect(secondPage.ok).toBe(true);
    if (firstPage.ok && secondPage.ok) {
      expect(firstPage.result.notes.map((n) => n.text)).toEqual(["tarea tres", "tarea dos"]);
      expect(secondPage.result.notes.map((n) => n.text)).toEqual(["tarea uno"]);
      expect(secondPage.result.totalPages).toBe(2);
    }
  });

  it("ordena por id descendente cuando hay varias coincidencias", () => {
    addNote(db, "alfa proyecto", undefined);
    addNote(db, "beta proyecto", undefined);
    addNote(db, "gamma proyecto", undefined);

    const result = searchNotes(db, { word: "proyecto" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.result.notes.map((n) => n.id)).toEqual([3, 2, 1]);
    }
  });

  it("escapa los caracteres especiales de LIKE (%, _) en la búsqueda", () => {
    addNote(db, "avance 100%", undefined);
    addNote(db, "avance 100x", undefined);
    addNote(db, "archivo a_b", undefined);
    addNote(db, "archivo axb", undefined);

    const percentResult = searchNotes(db, { word: "100%" });
    const underscoreResult = searchNotes(db, { word: "a_b" });

    expect(percentResult.ok).toBe(true);
    expect(underscoreResult.ok).toBe(true);
    if (percentResult.ok && underscoreResult.ok) {
      expect(percentResult.result.notes.map((n) => n.text)).toEqual(["avance 100%"]);
      expect(underscoreResult.result.notes.map((n) => n.text)).toEqual(["archivo a_b"]);
    }
  });
});
