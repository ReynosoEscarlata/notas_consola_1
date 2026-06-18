# SPEC.md — `nota` (CLI de notas personales)

**Versión:** v2 (cerrada)
**Estado:** cerrada — lista para pedirle el scaffold a Claude Code.

## 1. Propósito

`nota` es una herramienta de línea de comandos para gestionar notas personales con etiquetas y búsqueda. Corre 100% local: sin servidor, sin red, sin nube. El objetivo de este proyecto no es la herramienta en sí, sino dominar con ella la estructura de un proyecto Node + TypeScript bien hecho: tipos estrictos, errores controlados, tests y persistencia real en SQLite.

## 2. Alcance

**Incluido en v1:**

- Agregar, listar, buscar, borrar y exportar notas.
- Persistencia en SQLite local.
- Manejo de errores sin stack traces crudos hacia el usuario.
- Comando de reparación ante base de datos corrupta.

**Fuera de alcance en v1** (stretch goals, no se tocan hasta cerrar lo de arriba):

- Modo interactivo (`nota` sin argumentos abre un prompt).
- Sincronización con una carpeta de archivos `.md`.
- Publicación en npm como paquete privado.

## 3. Modelo de datos y archivos

```sql
CREATE TABLE notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL,
  created_at TEXT NOT NULL  -- ISO 8601 en UTC, ej. 2026-06-17T14:32:00.000Z
);

CREATE TABLE tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE note_tags (
  note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  tag_id  INTEGER NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
  PRIMARY KEY (note_id, tag_id)
);
```

- `id` es un entero autoincremental (no UUID), para que sea cómodo escribirlo a mano en `nota delete <id>`.
- `created_at` se guarda **siempre en UTC**. La conversión a hora local ocurre únicamente en la capa de presentación (ver sección 4), nunca en la base de datos ni en la lógica de negocio — esto evita bugs de doble conversión.
- **Ubicación del archivo de base de datos:** `~/.nota/notas.db` (resuelto vía `os.homedir()`), independiente del directorio desde el que se ejecute `nota`. La carpeta `~/.nota/` se crea automáticamente si no existe.
  - Nota de diseño para la implementación: la capa de lógica (la que se testea, sección 7) debe recibir la ruta de la base de datos como parámetro en vez de resolverla ella misma — así los tests usan una ruta temporal y nunca tocan `~/.nota/notas.db` real.

## 4. Comandos

### `nota add "<texto>" [--tag tag1,tag2]`

- `texto`: obligatorio.
  - Si falta el argumento por completo (ej. `nota add --tag trabajo`) → stderr `Error: falta el argumento <texto>. Uso: nota add "<texto>" [--tag tag1,tag2]`, exit code 2.
  - Si se pasa vacío o solo espacios (ej. `nota add ""`) → stderr `Error: el texto de la nota no puede estar vacío`, exit code 2.
  - Son dos validaciones distintas con mensajes distintos: una es "no me diste el argumento", la otra es "me lo diste pero no sirve".
- `--tag`: opcional. Lista separada por comas únicamente.
  - Cada tag se normaliza con `trim()` y minúsculas, y debe cumplir el charset `[a-z0-9-]+` tras la normalización. Cualquier otro carácter (espacios, acentos, símbolos, emojis) rechaza el comando completo: stderr `Error: el tag "<tag>" contiene caracteres no permitidos (solo se aceptan minúsculas, números y guion)`, exit code 2.
  - Tags vacíos tras separar por coma (ej. `--tag trabajo,,ideas`) se descartan sin error.
  - Tags repetidos dentro de la misma lista (ej. `--tag trabajo,trabajo`) son un error: stderr `Error: el tag "trabajo" está repetido`, exit code 2.
  - La flag `--tag` no puede repetirse en la misma llamada (ej. `--tag trabajo --tag ideas`): stderr `Error: opción duplicada: --tag`, exit code 2. Solo se admite la forma de lista separada por comas.
  - `--tag` sin valor a continuación (ej. `nota add "texto" --tag`) se trata como lista vacía: la nota se crea sin tags, sin error (hereda la regla de "tags vacíos se descartan sin error").
- Salida en éxito (stdout):
  ```
  Nota #4 creada (tags: trabajo, ideas)
  ```

### `nota list [--tag <tag>] [--page <n>] [--per-page <n>]`

- Orden: siempre por `id` **descendente** (no por `created_at`) — en la práctica casi siempre coincide, pero `id` es la fuente de verdad para el orden.
- `--tag`: filtra por esa etiqueta exacta (no parcial).
- Paginación: `--page` (default `1`) y `--per-page` (default `10`, máximo `20`).
  - `--page` y `--per-page` deben ser enteros positivos (`1`, `2`, `3`...). Cualquier otro valor (`0`, negativo, decimal como `1.5`, no numérico como `"abc"`) → error de validación: stderr `Error: --page debe ser un entero positivo` (o el mensaje análogo para `--per-page`), exit code 2.
  - `--per-page` mayor a `20` → stderr `Error: --per-page no puede ser mayor a 20`, exit code 2.
  - `--page` más allá de la última página existente (ej. pedir página 5 cuando solo hay 2) **no es un error**: se muestra el mismo mensaje que "sin resultados" (`No hay notas para mostrar.`), exit code 0.
- `created_at` se muestra convertido a hora local del sistema, formato `YYYY-MM-DD HH:mm`.
- Si el texto de una nota contiene saltos de línea, se muestran como `\n` literal (texto escapado, no un salto real) para no romper el alineado de columnas.
- Salida (stdout):
  ```
  #25  [trabajo, ideas]  2026-06-15 09:14  Revisar el PR de autenticación
  #24  [personal]        2026-06-10 18:02  Comprar regalo de cumpleaños
  ...
  Página 1 de 3 (25 notas en total)
  ```
- Sin notas (o sin coincidencias con el tag): `No hay notas para mostrar.` en stdout, exit code 0 — no es un error.

### `nota search "<palabra>" [--page <n>] [--per-page <n>]`

- Búsqueda case-insensitive por coincidencia parcial en el **texto** de la nota (no en los tags).
- `palabra` vacío o solo espacios (ej. `nota search ""`) → error de validación, mismo criterio que `add`: stderr `Error: el término de búsqueda no puede estar vacío`, exit code 2.
- Mismo orden (`id` descendente), reglas de paginación (incl. `--per-page` máx. 20 y página fuera de rango) y formato de salida (incl. `\n` literal en texto multilínea) que `list`.
- Sin resultados: `No se encontraron notas que coincidan con "<palabra>".`, exit code 0.

### `nota delete <id>`

- `id`: obligatorio, debe ser un entero positivo (`1`, `2`, `3`...).
- Éxito: `Nota #4 eliminada.` en stdout, exit code 0.
- Error — `id` no es un entero positivo (ej. `4.5`, `"abc"`, `-3`, `0`): stderr `Error: Id no válido para eliminar`, exit code 2.
- Error — `id` es un entero positivo válido pero no existe una nota con ese id: stderr `Error: no existe una nota con id <id>`, exit code 3.

### `nota export --format <json|md>`

- Exporta todas las notas a **stdout** (permite `nota export --format json > backup.json`).
- `--format` obligatorio y case-insensitive (`json`, `JSON`, `Json` son equivalentes); valor distinto de `json`/`md` → stderr `Error: formato no soportado: <valor>`, exit code 2.
- Formato `json`: array de objetos `{ id, text, tags, created_at }`, con `created_at` en **UTC crudo** (ISO 8601). Los saltos de línea en `text` quedan como saltos reales dentro del string — `JSON.stringify` ya los serializa como `\n` escapado en el archivo de salida, sin lógica especial.
  - Sin notas: stdout `[]` (array JSON vacío, válido), exit code 0.
- Formato `md`: una sección por nota, con `created_at` en **hora local** (igual criterio que `list`). Los saltos de línea en el texto se muestran como `\n` literal (igual criterio que `list`):
  ```
  ## Nota #4
  - Tags: trabajo, ideas
  - Fecha: 2026-06-15 09:14

  Revisar el PR de autenticación
  ```
  - Sin notas: stdout `No hay notas para exportar.`, exit code 0.

### `nota --help` / `nota <comando> --help`

Muestra descripción de la CLI, lista de comandos y, para cada uno, sus flags y un ejemplo de uso.

### Comando o flag desconocidos

- Comando no reconocido (ej. `nota foo`): stderr `Error: Comando desconocido: foo`, seguido de la lista de comandos válidos (`add`, `list`, `search`, `delete`, `export`, `repair`, `--help`), exit code 2.
- Flag no reconocida para un comando válido (ej. `nota list --bogus`): stderr `Error: opción desconocida: --bogus`, exit code 2.

## 5. Manejo de errores y exit codes

| Code | Significado                                |
|------|---------------------------------------------|
| 0    | Éxito (incluye "sin resultados")             |
| 1    | Error interno no anticipado                  |
| 2    | Entrada inválida (validación)                |
| 3    | Recurso no encontrado (ej. id inexistente)   |
| 4    | Error de almacenamiento / BD corrupta        |

Regla general: ningún stack trace de Node llega a la terminal del usuario. Todo error esperado se captura y se transforma en un mensaje en `stderr` con el código correspondiente.

## 6. Base de datos corrupta y `nota repair`

- Si al abrir la conexión SQLite falla (archivo corrupto, formato inválido, etc.): la app no crashea. Mensaje en stderr: `Error: la base de datos parece estar dañada. Ejecuta "nota repair" para más información.`, exit code 4.
- `nota repair`: mueve el archivo corrupto a `~/.nota/notas.db.corrupted-<timestamp>` y crea una base de datos nueva y vacía en `~/.nota/notas.db`. **No intenta recuperar el contenido** — es un reset, no una reparación de datos.
- Si `nota repair` se ejecuta y el archivo no existe todavía (primera vez que se usa `nota`): simplemente crea la base de datos nueva, sin backup (no hay nada que respaldar). Mismo mensaje de éxito que el caso normal.
- Salida de `nota repair` en éxito: confirma la ruta del backup creado (si aplica) y que la base nueva está lista. Exit code 0.

## 7. Requisitos no funcionales (del brief del challenge)

- TypeScript con `strict: true`, sin `any` en funciones públicas.
- Cobertura de tests ≥ 70% en la capa de lógica (no en la capa de CLI/parsing de argumentos).
- Cero dependencias innecesarias; cada `npm install` se justifica en el commit message.
- Commits atómicos, no un commit gigante al final.

## 8. Decisiones de diseño registradas

| # | Decisión | Por qué |
|---|----------|---------|
| 1 | 3 tablas normalizadas (`notes`, `tags`, `note_tags`) | Relacionalmente correcto; el `JOIN` extra es aceptable para el alcance. |
| 2 | `id` autoincremental, no UUID | Más fácil de teclear en `delete`. |
| 3 | `export` escribe a stdout | El usuario decide si redirige la salida a un archivo. |
| 4 | `search` busca solo en el texto, no en tags | Simplifica el caso de uso principal de búsqueda. |
| 5 | `nota repair` = backup + BD nueva vacía | No intenta recuperación de datos; es el camino simple y predecible. |
| 6 | Tags restringidos a `[a-z0-9-]`, sin duplicados, solo formato lista por comas | Evita ambigüedad al parsear `--tag a,b,c` y problemas de codificación/orden en filtros. |
| 7 | Mensaje distinto para "falta el argumento" vs "argumento vacío" | Son errores de usuario distintos y merecen feedback distinto. |
| 8 | `list`/`search` paginados (máx. 20 por página), orden por `id` descendente | Evita volcar cientos de notas en una sola pantalla. |
| 9 | `created_at`: UTC en la base, local en la presentación (excepto en `export --format json`, que queda en UTC) | Consistencia interna + legibilidad humana donde corresponde, portabilidad donde corresponde. |
| 10 | Base de datos en `~/.nota/notas.db`, fija (no relativa al cwd) | Una sola fuente de verdad por usuario; `nota list` da el mismo resultado sin importar desde dónde se invoque. |
| 11 | Saltos de línea en texto: `\n` literal en `list`/`search`/`md`; reales (auto-escapados) en `json` | El JSON ya tiene una representación correcta de saltos de línea; la salida de texto plano no, así que se hace explícito. |

