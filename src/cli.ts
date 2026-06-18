#!/usr/bin/env node
import { Command } from "commander";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const DEFAULT_DB_PATH = join(PROJECT_ROOT, "db_core", "notas.db");

function notImplemented(command: string): void {
  console.error(`Comando "${command}" todavía no está implementado.`);
  process.exitCode = 1;
}

const program = new Command();

program.name("nota").description("CLI de notas personales con etiquetas, búsqueda y persistencia en SQLite.");

program
  .command("add")
  .description("Agrega una nota nueva")
  .argument("<texto>", "texto de la nota")
  .option("--tag <tags>", "lista de tags separados por coma")
  .action(() => notImplemented("add"));

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
