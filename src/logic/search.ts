import type Database from "better-sqlite3";
import type { Note } from "../types.js";
import type { NotesPage } from "./list.js";

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 10;
const MAX_PER_PAGE = 20;

export interface SearchNotesOptions {
  word: string;
  page?: string;
  perPage?: string;
}

export type SearchNotesError =
  | { kind: "empty_word" }
  | { kind: "invalid_page" }
  | { kind: "invalid_per_page" }
  | { kind: "per_page_too_large" };

export type SearchNotesResult = { ok: true; result: NotesPage } | { ok: false; error: SearchNotesError };

function parsePositiveInt(raw: string | undefined, fallback: number): number | null {
  if (raw === undefined) {
    return fallback;
  }
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : null;
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

interface NoteRow {
  id: number;
  text: string;
  createdAt: string;
}

export function searchNotes(db: Database.Database, options: SearchNotesOptions): SearchNotesResult {
  const word = options.word.trim();
  if (word === "") {
    return { ok: false, error: { kind: "empty_word" } };
  }

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

  const offset = (page - 1) * perPage;
  const likePattern = `%${escapeLikePattern(word)}%`;

  const total = (
    db
      .prepare("SELECT COUNT(*) AS count FROM notes WHERE text LIKE ? ESCAPE '\\' COLLATE NOCASE")
      .get(likePattern) as { count: number }
  ).count;

  const rows = db
    .prepare(
      `SELECT id, text, created_at AS createdAt
       FROM notes
       WHERE text LIKE ? ESCAPE '\\' COLLATE NOCASE
       ORDER BY id DESC
       LIMIT ? OFFSET ?`,
    )
    .all(likePattern, perPage, offset) as NoteRow[];

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
