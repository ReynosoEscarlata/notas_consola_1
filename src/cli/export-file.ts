import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ExportFormat } from "../logic/export.js";
import type { Note } from "../types.js";
import { formatNotesAsJson, formatNotesAsMarkdown } from "./format-export.js";

function buildTimestamp(date: Date): string {
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
}

export function writeExportFile(exportsDir: string, notes: Note[], format: ExportFormat): string {
  mkdirSync(exportsDir, { recursive: true });

  const content = format === "json" ? formatNotesAsJson(notes) : formatNotesAsMarkdown(notes);
  const filename = `Export_notas_${buildTimestamp(new Date())}.${format}`;

  writeFileSync(join(exportsDir, filename), content, "utf-8");

  return filename;
}
