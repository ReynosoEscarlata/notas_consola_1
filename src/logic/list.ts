import type Database from "better-sqlite3";
import type { Note } from "../types.js";

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 10;
const MAX_PER_PAGE = 20;

export interface ListNotesOptions {
  tag?: string;
  page?: string;
  perPage?: string;
}

export interface NotesPage {
  notes: Note[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export type ListNotesError =
  | { kind: "invalid_page" }
  | { kind: "invalid_per_page" }
  | { kind: "per_page_too_large" };

export type ListNotesResult = { ok: true; result: NotesPage } | { ok: false; error: ListNotesError };

function parsePositiveInt(raw: string | undefined, fallback: number): number | null {
  if (raw === undefined) {
    return fallback;
  }
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : null;
}

interface NoteRow {
  id: number;
  text: string;
  createdAt: string;
}

export function listNotes(db: Database.Database, options: ListNotesOptions): ListNotesResult {
  const page = parsePositiveInt(options.page, DEFAULT_PAGE);
  if (page === null) {
    return { ok: false, error: { kind: "invalid_page" } };
  }

  const perPage = parsePositiveInt(options.perPage, DEFAULT_PER_PAGE);
  if (perPage === null) {
    return { ok: false, error: { kind: "invalid_per_page" } };
  }
  if (perPage > MAX_PER_PAGE) {
    return { ok: false, error: { kind: "per_page_too_large" } };
  }

  const tag = options.tag?.trim().toLowerCase();
  const offset = (page - 1) * perPage;

  const total = tag
    ? (
        db
          .prepare(
            `SELECT COUNT(*) AS count
             FROM notes n
             JOIN note_tags nt ON nt.note_id = n.id
             JOIN tags t ON t.id = nt.tag_id
             WHERE t.name = ?`,
          )
          .get(tag) as { count: number }
      ).count
    : (db.prepare("SELECT COUNT(*) AS count FROM notes").get() as { count: number }).count;

  const rows = tag
    ? (db
        .prepare(
          `SELECT n.id AS id, n.text AS text, n.created_at AS createdAt
           FROM notes n
           JOIN note_tags nt ON nt.note_id = n.id
           JOIN tags t ON t.id = nt.tag_id
           WHERE t.name = ?
           ORDER BY n.id DESC
           LIMIT ? OFFSET ?`,
        )
        .all(tag, perPage, offset) as NoteRow[])
    : (db
        .prepare(
          `SELECT id, text, created_at AS createdAt
           FROM notes
           ORDER BY id DESC
           LIMIT ? OFFSET ?`,
        )
        .all(perPage, offset) as NoteRow[]);

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

  const totalPages = Math.ceil(total / perPage);

  return { ok: true, result: { notes, page, perPage, total, totalPages } };
}
