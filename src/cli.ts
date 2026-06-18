#!/usr/bin/env node
import { Command } from "commander";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { openDatabase } from "./db/connection.js";
import { addNote, type AddNoteError } from "./logic/notes.js";
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

const program = new Command();

program.name("nota").description("CLI de notas personales con etiquetas, búsqueda y persistencia en SQLite.");

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
  .action(() => notImplemented("list"));

program
  .command("search")
  .description("Busca notas por texto")
  .argument("<palabra>", "término de búsqueda")
  .option("--page <n>", "número de página", "1")
  .option("--per-page <n>", "notas por página (máx. 20)", "10")
  .action(() => notImplemented("search"));

program
  .command("delete")
  .description("Elimina una nota por id")
  .argument("<id>", "id entero positivo de la nota")
  .action(() => notImplemented("delete"));

program
  .command("export")
  .description("Exporta todas las notas")
  .requiredOption("--format <json|md>", "formato de salida")
  .action(() => notImplemented("export"));

program
  .command("repair")
  .description("Repara la base de datos si está dañada")
  .action(() => notImplemented("repair"));

program.parse();
