import Database from "better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import { openDatabase } from "../db/connection.js";
import { addNote } from "./notes.js";
import { deleteNote } from "./delete.js";

let db: Database.Database;

beforeEach(() => {
  db = openDatabase(":memory:");
});

describe("deleteNote", () => {
  it("elimina una nota existente", () => {
    const created = addNote(db, "para borrar", undefined);
    if (!created.ok) throw new Error("setup falló");

    const result = deleteNote(db, String(created.note.id));

    expect(result).toEqual({ ok: true, id: created.note.id });
  });

  it("rechaza un id no numérico", () => {
    const result = deleteNote(db, "abc");

    expect(result).toEqual({ ok: false, error: { kind: "invalid_id" } });
  });

  it("rechaza un id negativo o cero", () => {
    expect(deleteNote(db, "-3")).toEqual({ ok: false, error: { kind: "invalid_id" } });
    expect(deleteNote(db, "0")).toEqual({ ok: false, error: { kind: "invalid_id" } });
  });

  it("rechaza un id decimal", () => {
    const result = deleteNote(db, "4.5");

    expect(result).toEqual({ ok: false, error: { kind: "invalid_id" } });
  });

  it("devuelve not_found si el id no existe", () => {
    const result = deleteNote(db, "999");

    expect(result).toEqual({ ok: false, error: { kind: "not_found", id: 999 } });
  });

  it("borrar dos veces el mismo id da not_found la segunda vez", () => {
    const created = addNote(db, "para borrar dos veces", undefined);
    if (!created.ok) throw new Error("setup falló");
    const id = String(created.note.id);

    expect(deleteNote(db, id)).toEqual({ ok: true, id: created.note.id });
    expect(deleteNote(db, id)).toEqual({ ok: false, error: { kind: "not_found", id: created.note.id } });
  });

  it("borrar una nota no afecta a otras", () => {
    const first = addNote(db, "primera", undefined);
    const second = addNote(db, "segunda", undefined);
    if (!first.ok || !second.ok) throw new Error("setup falló");

    deleteNote(db, String(first.note.id));

    const remaining = db.prepare("SELECT id, text FROM notes").all() as { id: number; text: string }[];
    expect(remaining).toEqual([{ id: second.note.id, text: "segunda" }]);
  });

  it("el ON DELETE CASCADE limpia las filas de note_tags al borrar", () => {
    const created = addNote(db, "con tags", "trabajo,ideas");
    if (!created.ok) throw new Error("setup falló");

    deleteNote(db, String(created.note.id));

    const orphanRows = db.prepare("SELECT * FROM note_tags WHERE note_id = ?").all(created.note.id);
    expect(orphanRows).toEqual([]);
  });

  it("la fila en tags sobrevive aunque ninguna nota la use más", () => {
    const created = addNote(db, "con tag único", "exclusivo");
    if (!created.ok) throw new Error("setup falló");

    deleteNote(db, String(created.note.id));

    const tagRow = db.prepare("SELECT name FROM tags WHERE name = ?").get("exclusivo");
    expect(tagRow).toEqual({ name: "exclusivo" });
  });
});
