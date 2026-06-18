import type Database from "better-sqlite3";

export type DeleteNoteError = { kind: "invalid_id" } | { kind: "not_found"; id: number };

export type DeleteNoteResult = { ok: true; id: number } | { ok: false; error: DeleteNoteError };

function parsePositiveInt(raw: string): number | null {
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : null;
}

export function deleteNote(db: Database.Database, rawId: string): DeleteNoteResult {
  const id = parsePositiveInt(rawId);
  if (id === null) {
    return { ok: false, error: { kind: "invalid_id" } };
  }

  const result = db.prepare("DELETE FROM notes WHERE id = ?").run(id);
  if (result.changes === 0) {
    return { ok: false, error: { kind: "not_found", id } };
  }

  return { ok: true, id };
}
