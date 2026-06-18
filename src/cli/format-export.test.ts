import { describe, expect, it } from "vitest";
import type { Note } from "../types.js";
import { formatNotesAsJson, formatNotesAsMarkdown } from "./format-export.js";
import { formatLocalDateTime } from "./format-note-list.js";

const sampleNote: Note = {
  id: 4,
  text: "Revisar el PR de autenticación",
  tags: ["trabajo", "ideas"],
  createdAt: "2026-06-15T12:14:00.000Z",
};

describe("formatNotesAsJson", () => {
  it("devuelve un array vacío válido cuando no hay notas", () => {
    expect(formatNotesAsJson([])).toBe("[]");
  });

  it("usa snake_case en created_at y conserva el UTC crudo (sin convertir)", () => {
    const json = JSON.parse(formatNotesAsJson([sampleNote])) as unknown[];

    expect(json).toEqual([
      {
        id: 4,
        text: "Revisar el PR de autenticación",
        tags: ["trabajo", "ideas"],
        created_at: "2026-06-15T12:14:00.000Z",
      },
    ]);
  });

  it("preserva saltos de línea reales en el texto (JSON.stringify los auto-escapa)", () => {
    const noteWithNewline: Note = { ...sampleNote, text: "línea 1\nlínea 2" };

    const json = formatNotesAsJson([noteWithNewline]);

    expect(json).toContain('"línea 1\\nlínea 2"');
  });
});

describe("formatNotesAsMarkdown", () => {
  it("devuelve el mensaje de 'sin notas' cuando la lista está vacía", () => {
    expect(formatNotesAsMarkdown([])).toBe("No hay notas para exportar.");
  });

  it("genera una sección con fecha en hora local y tags, para una sola nota", () => {
    const md = formatNotesAsMarkdown([sampleNote]);

    expect(md).toContain("## Nota #4");
    expect(md).toContain("- Tags: trabajo, ideas");
    expect(md).toContain("Revisar el PR de autenticación");
  });

  it("escapa los saltos de línea del texto como \\n literal", () => {
    const noteWithNewline: Note = { ...sampleNote, text: "línea 1\nlínea 2" };

    const md = formatNotesAsMarkdown([noteWithNewline]);

    expect(md).toContain("línea 1\\nlínea 2");
    expect(md).not.toContain("línea 1\nlínea 2");
  });

  it("separa varias notas con una línea en blanco entre secciones", () => {
    const second: Note = { ...sampleNote, id: 3, text: "Comprar pan", tags: ["personal"] };
    const fecha = formatLocalDateTime(sampleNote.createdAt);

    const md = formatNotesAsMarkdown([sampleNote, second]);

    expect(md).toBe(
      `## Nota #4\n- Tags: trabajo, ideas\n- Fecha: ${fecha}\n\nRevisar el PR de autenticación\n\n` +
        `## Nota #3\n- Tags: personal\n- Fecha: ${fecha}\n\nComprar pan`,
    );
  });
});
