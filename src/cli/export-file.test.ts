import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Note } from "../types.js";
import { writeExportFile } from "./export-file.js";

const sampleNotes: Note[] = [
  { id: 1, text: "una nota", tags: ["sin_tag"], createdAt: "2026-06-15T12:14:00.000Z" },
];

let exportsDir: string;

beforeEach(() => {
  exportsDir = mkdtempSync(join(tmpdir(), "nota-export-test-"));
});

afterEach(() => {
  rmSync(exportsDir, { recursive: true, force: true });
});

describe("writeExportFile", () => {
  it("crea la carpeta si no existe y escribe el archivo json con el contenido correcto", () => {
    const nestedDir = join(exportsDir, "nested");

    const filename = writeExportFile(nestedDir, sampleNotes, "json");

    expect(existsSync(join(nestedDir, filename))).toBe(true);
    expect(JSON.parse(readFileSync(join(nestedDir, filename), "utf-8"))).toEqual([
      { id: 1, text: "una nota", tags: ["sin_tag"], created_at: "2026-06-15T12:14:00.000Z" },
    ]);
  });

  it("usa la extensión .md y el contenido markdown cuando format es md", () => {
    const filename = writeExportFile(exportsDir, sampleNotes, "md");

    expect(filename.endsWith(".md")).toBe(true);
    expect(readFileSync(join(exportsDir, filename), "utf-8")).toContain("## Nota #1");
  });

  it("el nombre de archivo sigue el patrón Export_notas_<fecha-hora-local>.<ext>", () => {
    const filename = writeExportFile(exportsDir, sampleNotes, "json");

    expect(filename).toMatch(/^Export_notas_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.json$/);
  });
});
