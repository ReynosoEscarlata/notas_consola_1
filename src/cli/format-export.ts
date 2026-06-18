import type { Note } from "../types.js";
import { escapeNewlines, formatLocalDateTime } from "./format-note-list.js";

interface ExportedNoteJson {
  id: number;
  text: string;
  tags: string[];
  created_at: string;
}

export function formatNotesAsJson(notes: Note[]): string {
  const data: ExportedNoteJson[] = notes.map((note) => ({
    id: note.id,
    text: note.text,
    tags: note.tags,
    created_at: note.createdAt,
  }));
  return JSON.stringify(data);
}

export function formatNotesAsMarkdown(notes: Note[]): string {
  if (notes.length === 0) {
    return "No hay notas para exportar.";
  }

  return notes
    .map(
      (note) =>
        `## Nota #${note.id}\n- Tags: ${note.tags.join(", ")}\n- Fecha: ${formatLocalDateTime(note.createdAt)}\n\n${escapeNewlines(note.text)}`,
    )
    .join("\n\n");
}
