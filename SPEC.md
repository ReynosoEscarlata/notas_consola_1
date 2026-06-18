# SPEC.md — `nota` (CLI de notas personales)

**Versión:** v1 (pendiente)
**Estado:** decisiones y preguntas abiertas resueltas — lista para pedirle el scaffold a Claude Code.

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

## 3. Modelo de datos

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

## 4. Comandos

### `nota add "<texto>" [--tag tag1,tag2]`

- `texto`: obligatorio.
  - Si falta el argumento por completo (ej. `nota add --tag trabajo`) → stderr `Error: falta el argumento <texto>. Uso: nota add "<texto>" [--tag tag1,tag2]`, exit code 2.
  - Si se pasa vacío o solo espacios (ej. `nota add ""`) → stderr `Error: el texto de la nota no puede estar vacío`, exit code 2.
  - Son dos validaciones distintas con mensajes distintos: una es "no me diste el argumento", la otra es "me lo diste pero no sirve".
- `--tag`: opcional. Lista separada por comas. Cada tag se normaliza con `trim()` y minúsculas, y debe ser una sola palabra sin espacios internos.
  - Tags vacíos tras separar por coma (ej. `--tag trabajo,,ideas`) se descartan sin error.
  - Un tag con espacio interno (ej. `--tag "proyecto x"`) rechaza el comando completo: stderr `Error: el tag "proyecto x" no puede contener espacios`, exit code 2.
- Salida en éxito (stdout):
  ```
  Nota #4 creada (tags: trabajo, ideas)
  ```

### `nota list [--tag <tag>] [--page <n>] [--per-page <n>]`

- Orden: siempre por `id` **descendente** (no por `created_at`) — en la práctica casi siempre coincide, pero `id` es la fuente de verdad para el orden.
- `--tag`: filtra por esa etiqueta exacta (no parcial).
- Paginación: `--page` (default `1`) y `--per-page` (default `10`).
- `created_at` se muestra convertido a hora local del sistema, formato `YYYY-MM-DD HH:mm`.
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
- Mismo orden (`id` descendente), paginación y formato de salida que `list`.
- Sin resultados: `No se encontraron notas que coincidan con "<palabra>".`, exit code 0.

### `nota delete <id>`

- `id`: obligatorio, debe ser un entero positivo existente.
- Éxito: `Nota #4 eliminada.` en stdout, exit code 0.
- Error — `id` no numérico: stderr `Error: el id debe ser un número entero`, exit code 2.
- Error — `id` no existe: stderr `Error: no existe una nota con id 4`, exit code 3.

### `nota export --format <json|md>`

- Exporta todas las notas a **stdout** (permite `nota export --format json > backup.json`).
- `--format` obligatorio; valor distinto de `json`/`md` → stderr `Error: formato no soportado: <valor>`, exit code 2.
- Formato `json`: array de objetos `{ id, text, tags, created_at }`, con `created_at` en **UTC crudo** (ISO 8601) para que el archivo sea portable entre husos horarios.
- Formato `md`: una sección por nota, con `created_at` en **hora local** (igual criterio que `list`):
  ```
  ## Nota #4
  - Tags: trabajo, ideas
  - Fecha: 2026-06-15 09:14

  Revisar el PR de autenticación
  ```

### `nota --help` / `nota <comando> --help`

Muestra descripción de la CLI, lista de comandos y, para cada uno, sus flags y un ejemplo de uso.

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
- `nota repair`: mueve el archivo corrupto a algo como `notas.db.corrupted-<timestamp>` y crea una base de datos nueva y vacía en su lugar. **No intenta recuperar el contenido** — es un reset, no una reparación de datos.
- Salida de `nota repair` en éxito: confirma la ruta del backup creado y que la base nueva está lista. Exit code 0.

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
| 6 | Tags de una sola palabra, sin espacios | Evita ambigüedad al parsear `--tag a,b,c`. |
| 7 | Mensaje distinto para "falta el argumento" vs "argumento vacío" | Son errores de usuario distintos y merecen feedback distinto. |
| 8 | `list`/`search` paginados, orden por `id` descendente | Evita volcar cientos de notas en una sola pantalla. |
| 9 | `created_at`: UTC en la base, local en la presentación (excepto en `export --format json`, que queda en UTC) | Consistencia interna + legibilidad humana donde corresponde, portabilidad donde corresponde. |

> Nota: los nombres de flags `--page`/`--per-page`, el tamaño de página por defecto (10), y el criterio de mantener `export --format json` en UTC mientras todo lo demás se muestra en local son propuestas mías para cerrar la spec — si prefieres otros nombres o un comportamiento distinto en el JSON, este es el momento de cambiarlo, antes de pedir el scaffold.
