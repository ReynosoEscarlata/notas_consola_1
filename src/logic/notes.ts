import type Database from "better-sqlite3";
import type { Note } from "../types.js";

export const DEFAULT_TAG = "sin_tag";

export type AddNoteError =
  | { kind: "empty_text" }
  | { kind: "invalid_tag_charset"; tag: string }
  | { kind: "duplicate_tag"; tag: string };

export type AddNoteResult = { ok: true; note: Note } | { ok: false; error: AddNoteError };

const TAG_PATTERN = /^[a-z0-9-]+$/;

type ParseTagsResult = { ok: true; tags: string[] } | { ok: false; error: AddNoteError };

function parseTags(rawTags: string | undefined): ParseTagsResult {
  if (rawTags === undefined) {
    return { ok: true, tags: [] };
  }

  const seen = new Set<string>();
  const tags: string[] = [];

  for (const rawPiece of rawTags.split(",")) {
    const original = rawPiece.trim();
    if (original === "") {
      continue;
    }

    const normalized = original.toLowerCase();

    if (!TAG_PATTERN.test(normalized)) {
      return { ok: false, error: { kind: "invalid_tag_charset", tag: original } };
    }
    if (seen.has(normalized)) {
      return { ok: false, error: { kind: "duplicate_tag", tag: original } };
    }

    seen.add(normalized);
    tags.push(normalized);
  }

  return { ok: true, tags };
}

export function addNote(db: Database.Database, rawText: string, rawTags: string | undefined): AddNoteResult {
  const text = rawText.trim();
  if (text === "") {
    return { ok: false, error: { kind: "empty_text" } };
  }

  const tagsResult = parseTags(rawTags);
  if (!tagsResult.ok) {
    return { ok: false, error: tagsResult.error };
  }
  const tags = tagsResult.tags.length > 0 ? tagsResult.tags : [DEFAULT_TAG];

  const createdAt = new Date().toISOString();

  const insertNote = db.transaction((): number => {
    const noteRow = db.prepare("INSERT INTO notes (text, created_at) VALUES (?, ?)").run(text, createdAt);
    const noteId = Number(noteRow.lastInsertRowid);

    for (const tag of tags) {
      db.prepare("INSERT OR IGNORE INTO tags (name) VALUES (?)").run(tag);
      const tagRow = db.prepare("SELECT id FROM tags WHERE name = ?").get(tag) as { id: number };
      db.prepare("INSERT INTO note_tags (note_id, tag_id) VALUES (?, ?)").run(noteId, tagRow.id);
    }

    return noteId;
  });

  const id = insertNote();

  return { ok: true, note: { id, text, tags, createdAt } };
}
