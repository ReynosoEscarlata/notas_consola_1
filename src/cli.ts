#!/usr/bin/env node
import { Command, CommanderError } from "commander";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { formatNotesAsJson, formatNotesAsMarkdown } from "./cli/format-export.js";
import { printNoteList } from "./cli/format-note-list.js";
import { openDatabase } from "./db/connection.js";
import { deleteNote, type DeleteNoteError } from "./logic/delete.js";
import { exportNotes, type ExportNotesError } from "./logic/export.js";
import { listNotes, type ListNotesError } from "./logic/list.js";
import { addNote, type AddNoteError } from "./logic/notes.js";
import { searchNotes, type SearchNotesError } from "./logic/search.js";
import { EXIT_CODE } from "./types.js";

const PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const DEFAULT_DB_PATH = join(PROJECT_ROOT, "db_core", "notas.db");

function notImplemented(command: string): void {
  console.error(`Comando "${command}" todavía no está implementado.`);
  process.exitCode = 1;
}

function formatAddNoteError(error: AddNoteError): string {
  switch (error.kind) {
    case "empty_text":
      return "Error: el texto de la nota no puede estar vacío";
    case "invalid_tag_charset":
      return `Error: el tag "${error.tag}" contiene caracteres no permitidos (solo se aceptan minúsculas, números y guion)`;
    case "duplicate_tag":
      return `Error: el tag "${error.tag}" está repetido`;
  }
}

function formatListNotesError(error: ListNotesError): string {
  switch (error.kind) {
    case "invalid_page":
      return "Error: --page debe ser un entero positivo";
    case "invalid_per_page":
      return "Error: --per-page debe ser un entero positivo";
    case "per_page_too_large":
      return "Error: --per-page no puede ser mayor a 20";
  }
}

function formatSearchNotesError(error: SearchNotesError): string {
  switch (error.kind) {
    case "empty_word":
      return "Error: el término de búsqueda no puede estar vacío";
    case "invalid_page":
      return "Error: --page debe ser un entero positivo";
    case "invalid_per_page":
      return "Error: --per-page debe ser un entero positivo";
    case "per_page_too_large":
      return "Error: --per-page no puede ser mayor a 20";
  }
}

function formatDeleteNoteError(error: DeleteNoteError): string {
  switch (error.kind) {
    case "invalid_id":
      return "Error: Id no válido para eliminar";
    case "not_found":
      return `Error: no existe una nota con id ${error.id}`;
  }
}

function formatExportNotesError(error: ExportNotesError): string {
  switch (error.kind) {
    case "unsupported_format":
      return `Error: formato no soportado: ${error.format}`;
  }
}

const program = new Command();

program.name("nota").description("CLI de notas personales con etiquetas, búsqueda y persistencia en SQLite.");

// Deben ir antes de definir los subcomandos: commander copia esta configuración
// a cada subcomando en el momento de program.command(...), no al momento de parse().
program.exitOverride();

let bufferedStderr = "";
program.configureOutput({
  writeErr: (str) => {
    bufferedStderr += str;
  },
});

let tagOptionCallCount = 0;

program
  .command("add")
  .description("Agrega una nota nueva")
  .argument("[texto]", "texto de la nota")
  .option("--tag <tags>", "lista de tags separados por coma", (value: string) => {
    tagOptionCallCount += 1;
    return value;
  })
  .action((texto: string | undefined, options: { tag?: string }) => {
    if (texto === undefined) {
      console.error('Error: falta el argumento <texto>. Uso: nota add "<texto>" [--tag tag1,tag2]');
      process.exitCode = EXIT_CODE.INVALID_INPUT;
      return;
    }

    if (tagOptionCallCount > 1) {
      console.error("Error: opción duplicada: --tag");
      process.exitCode = EXIT_CODE.INVALID_INPUT;
      return;
    }

    const db = openDatabase(DEFAULT_DB_PATH);
    const result = addNote(db, texto, options.tag);
    db.close();

    if (!result.ok) {
      console.error(formatAddNoteError(result.error));
      process.exitCode = EXIT_CODE.INVALID_INPUT;
      return;
    }

    console.log(`Nota #${result.note.id} creada (tags: ${result.note.tags.join(", ")})`);
  });

program
  .command("list")
  .description("Lista las notas")
  .option("--tag <tag>", "filtra por una etiqueta exacta")
  .option("--page <n>", "número de página", "1")
  .option("--per-page <n>", "notas por página (máx. 20)", "10")
  .action((options: { tag?: string; page: string; perPage: string }) => {
    const db = openDatabase(DEFAULT_DB_PATH);
    const result = listNotes(db, {
      ...(options.tag !== undefined ? { tag: options.tag } : {}),
      page: options.page,
      perPage: options.perPage,
    });
    db.close();

    if (!result.ok) {
      console.error(formatListNotesError(result.error));
      process.exitCode = EXIT_CODE.INVALID_INPUT;
      return;
    }

    printNoteList(
      result.result.notes,
      result.result.page,
      result.result.totalPages,
      result.result.total,
      "No hay notas para mostrar.",
    );
  });

program
  .command("search")
  .description("Busca notas por texto")
  .argument("<palabra>", "término de búsqueda")
  .option("--page <n>", "número de página", "1")
  .option("--per-page <n>", "notas por página (máx. 20)", "10")
  .action((palabra: string, options: { page: string; perPage: string }) => {
    const db = openDatabase(DEFAULT_DB_PATH);
    const result = searchNotes(db, { word: palabra, page: options.page, perPage: options.perPage });
    db.close();

    if (!result.ok) {
      console.error(formatSearchNotesError(result.error));
      process.exitCode = EXIT_CODE.INVALID_INPUT;
      return;
    }

    printNoteList(
      result.result.notes,
      result.result.page,
      result.result.totalPages,
      result.result.total,
      `No se encontraron notas que coincidan con "${palabra}".`,
    );
  });

program
  .command("delete")
  .description("Elimina una nota por id")
  .argument("<id>", "id entero positivo de la nota")
  .action((id: string) => {
    const db = openDatabase(DEFAULT_DB_PATH);
    const result = deleteNote(db, id);
    db.close();

    if (!result.ok) {
      console.error(formatDeleteNoteError(result.error));
      process.exitCode = result.error.kind === "not_found" ? EXIT_CODE.NOT_FOUND : EXIT_CODE.INVALID_INPUT;
      return;
    }

    console.log(`Nota #${result.id} eliminada.`);
  });

program
  .command("export")
  .description("Exporta todas las notas")
  .requiredOption("--format <json|md>", "formato de salida")
  .action((options: { format: string }) => {
    const db = openDatabase(DEFAULT_DB_PATH);
    const result = exportNotes(db, options.format);
    db.close();

    if (!result.ok) {
      console.error(formatExportNotesError(result.error));
      process.exitCode = EXIT_CODE.INVALID_INPUT;
      return;
    }

    console.log(result.format === "json" ? formatNotesAsJson(result.notes) : formatNotesAsMarkdown(result.notes));
  });

program
  .command("repair")
  .description("Repara la base de datos si está dañada")
  .action(() => notImplemented("repair"));

// commander trata cualquier token que empiece con "-" como un intento de opción,
// incluso números negativos; sin esto, "nota delete -3" falla con el error
// genérico de commander en vez del mensaje propio de delete.ts.
const rawArgs = process.argv.slice(2);
const deleteIndex = rawArgs.indexOf("delete");
if (deleteIndex !== -1 && /^-\d/.test(rawArgs[deleteIndex + 1] ?? "")) {
  rawArgs.splice(deleteIndex + 1, 0, "--");
}

try {
  program.parse(rawArgs, { from: "user" });
} catch (error) {
  if (!(error instanceof CommanderError)) {
    throw error;
  }

  if (error.code === "commander.unknownOption") {
    const flag = /'([^']+)'/.exec(error.message)?.[1] ?? error.message;
    console.error(`Error: opción desconocida: ${flag}`);
    process.exitCode = EXIT_CODE.INVALID_INPUT;
  } else {
    if (bufferedStderr !== "") {
      process.stderr.write(bufferedStderr);
    }
    process.exitCode = error.exitCode;
  }
}
