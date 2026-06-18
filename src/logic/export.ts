import type Database from "better-sqlite3";
import type { Note } from "../types.js";

export type ExportFormat = "json" | "md";

export type ExportNotesError = { kind: "unsupported_format"; format: string };

export type ExportNotesResult =
  | { ok: true; format: ExportFormat; notes: Note[] }
  | { ok: false; error: ExportNotesError };

interface NoteRow {
  id: number;
  text: string;
  createdAt: string;
}

export function exportNotes(db: Database.Database, rawFormat: string): ExportNotesResult {
  const normalized = rawFormat.toLowerCase();
  if (normalized !== "json" && normalized !== "md") {
    return { ok: false, error: { kind: "unsupported_format", format: rawFormat } };
  }

  const rows = db
    .prepare(
      `SELECT id, text, created_at AS createdAt
       FROM notes
       ORDER BY id DESC`,
    )
    .all() as NoteRow[];

  const tagsStatement = db.prepare(
    `SELECT t.name AS name
     FROM note_tags nt
     JOIN tags t ON t.id = nt.tag_id
     WHERE nt.note_id = ?
     ORDER BY nt.rowid`,
  );

  const notes: Note[] = rows.map((row) => ({
    id: row.id,
    text: row.text,
    createdAt: row.createdAt,
    tags: (tagsStatement.all(row.id) as { name: string }[]).map((t) => t.name),
  }));

  return { ok: true, format: normalized, notes };
}
