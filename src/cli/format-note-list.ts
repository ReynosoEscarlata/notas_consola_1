import type { Note } from "../types.js";

export function formatLocalDateTime(isoUtc: string): string {
  const date = new Date(isoUtc);
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function escapeNewlines(text: string): string {
  return text.replace(/\n/g, "\\n");
}

function formatNoteLine(note: Note): string {
  return `#${note.id}  [${note.tags.join(", ")}]  ${formatLocalDateTime(note.createdAt)}  ${escapeNewlines(note.text)}`;
}

export function printNoteList(
  notes: Note[],
  page: number,
  totalPages: number,
  total: number,
  emptyMessage: string,
): void {
  if (notes.length === 0) {
    console.log(emptyMessage);
    return;
  }

  for (const note of notes) {
    console.log(formatNoteLine(note));
  }
  console.log(`Página ${page} de ${totalPages} (${total} notas en total)`);
}
