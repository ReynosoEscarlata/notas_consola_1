# nota

`nota` es una herramienta de línea de comandos para gestionar notas personales: agregarlas, listarlas, buscarlas, borrarlas y exportarlas, con soporte de etiquetas (tags). Corre 100% local — sin servidor, sin red, sin nube — y persiste todo en un archivo SQLite dentro del propio proyecto.

Este proyecto es el Challenge 1 de un programa de aprendizaje ("de junior a arquitecto"). El objetivo no es solo que la CLI funcione, sino dominar con ella la estructura de un proyecto Node + TypeScript bien hecho: tipos estrictos, errores controlados, persistencia real y una capa de lógica testeada de forma aislada de la CLI.

## Especificaciones técnicas

- **Node.js**: `>=20` (ver `engines` en `package.json`).
- **TypeScript**: `^6.0.3`, con `strict: true` (ver `tsconfig.json`).
- **Persistencia**: SQLite vía [`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3) `^12.11.1`.
- **Parsing de argumentos**: [`commander`](https://github.com/tj/commander.js) `^13.1.0`.
- **Tests**: [Vitest](https://vitest.dev/) `^3.2.6`, con `@vitest/coverage-v8` `^3.2.6` para cobertura.

## Instalación y arranque

Clonar el repositorio e instalar dependencias:

```bash
git clone https://github.com/ReynosoEscarlata/notas_consola_1.git
cd notas_consola_1
npm install
```

**Desarrollo** (recompila TypeScript en cada cambio):

```bash
npm run dev
```

**Build** (compila `src/` a `dist/`, necesario antes de usar la CLI):

```bash
npm run build
```

**Uso normal de la CLI**, una vez compilada, hay dos formas:

- Sin instalar nada más, invocando el archivo compilado directamente:
  ```bash
  node dist/cli.js add "Mi primera nota"
  ```
- Registrando `nota` como comando global en tu usuario (lo que se usó durante el desarrollo de este proyecto), para poder escribir solo `nota` desde cualquier carpeta:
  ```bash
  npm run build
  npm link
  nota add "Mi primera nota"
  ```

La base de datos (`db_core/notas.db`) y los archivos exportados (`exports/`) se crean automáticamente la primera vez que hacen falta, en la raíz del proyecto.

## Comandos

### `nota add "<texto>" [--tag tag1,tag2]`

Agrega una nota nueva. `--tag` es opcional, lista separada por comas (sin espacios internos, solo minúsculas/números/guion tras normalizar). Si no se pasa ningún tag, la nota queda con el tag por defecto `sin_tag`.

```
$ nota add "Revisar el PR de autenticación" --tag trabajo,ideas
Nota #1 creada (tags: trabajo, ideas)
```

### `nota list [--tag <tag>] [--page <n>] [--per-page <n>]`

Lista las notas, ordenadas por `id` descendente, paginadas (`--per-page` máximo 20). `--tag` filtra por una etiqueta exacta.

```
$ nota list
#4  [sin_tag]            2026-06-17 20:38  nota de pruebas
#3  [demo]                2026-06-17 20:37  Probando el comando global
#2  [trabajo, ideas]      2026-06-17 20:33  Tu texto acá
#1  [trabajo, ideas]      2026-06-17 20:31  Mi primera nota
Página 1 de 1 (4 notas en total)
```

### `nota search "<palabra>" [--page <n>] [--per-page <n>]`

Busca notas cuyo **texto** (no los tags) contenga la palabra, sin distinguir mayúsculas/minúsculas. Misma paginación y formato de salida que `list`.

```
$ nota search "PR"
#4  [sin_tag]            2026-06-17 20:38  nota de pruebas
#3  [demo]                2026-06-17 20:37  Probando el comando global
#1  [trabajo, ideas]      2026-06-17 20:31  Mi primera nota
Página 1 de 1 (3 notas en total)
```

### `nota delete <id>`

Borra la nota con ese `id` (entero positivo).

```
$ nota delete 4
Nota #4 eliminada.
```

### `nota export --format <json|md> [--file]`

Exporta todas las notas. Sin `--file`, vuelca el contenido a stdout (permite redirigirlo a mano, ej. `nota export --format json > backup.json`). Con `--file`, en cambio, escribe un archivo nuevo dentro de `exports/` y solo confirma la ruta.

```
$ nota export --format json
[{"id":1,"text":"Revisar el PR de autenticación","tags":["trabajo","ideas"],"created_at":"2026-06-18T05:16:52.112Z"}]

$ nota export --format md --file
Exportado a exports/Export_notas_2026-06-17_23-33-11.md
```

### `nota repair`

Repara la base de datos si está dañada (o la crea, si todavía no existe). Mueve el archivo actual a un backup con timestamp y crea uno nuevo y vacío en su lugar — es un reset, no una recuperación de datos.

```
$ nota repair
Archivo anterior movido a db_core/notas.db.corrupted-2026-06-18T05-44-23-326Z.
Base de datos nueva lista en db_core/notas.db.
```

> Para el detalle completo de validaciones, mensajes de error y exit codes de cada comando, ver [SPEC.md](./SPEC.md).

## Tests y cobertura

Correr toda la suite de tests:

```bash
npm test
```

Modo watch durante desarrollo:

```bash
npm run test:watch
```

Reporte de cobertura (medida solo sobre la capa de lógica en `src/logic/`, según el criterio del proyecto — la capa de CLI/parsing no cuenta):

```bash
npm run test:coverage
```

Al cierre de este challenge, la cobertura de la capa de lógica es del 100% (statements, branches, functions y lines) en los 6 módulos de `src/logic/`.

## Plan de desarrollo seguido

1. **Spec antes de código.** Antes de escribir una sola línea, se cerró `SPEC.md` en varias rondas: un primer borrador, preguntas de edge cases (notas vacías, tags duplicados, paginación inválida, ubicación de la base de datos, etc.) y ajustes posteriores a medida que aparecían casos nuevos durante la implementación.
2. **Reglas de trabajo fijadas en `CLAUDE.md`**: spec antes de código, diffs chicos explicados comando por comando, como máximo la mitad de los tests generados por la IA (el resto a mano), tipos estrictos sin `any`, errores controlados sin stack traces, y cobertura mínima del 70% en la capa de lógica.
3. **Scaffold inicial**: estructura de carpetas, `package.json`, `tsconfig.json` y Vitest configurados, con un test trivial para confirmar que la base funcionaba antes de implementar nada.
4. **Implementación comando por comando** (`add`, `list`, `search`, `delete`, `export`, `repair`), en ese orden. Para cada uno: explicación del approach y separación entre capa de lógica y capa de CLI antes de tocar archivos, diff completo mostrado para revisión antes de aplicarlo, mitad de los tests escritos en cada ronda (la otra mitad quedó para completar a mano), y verificación manual end-to-end además de la suite automatizada.
5. **Correcciones encontradas durante la verificación manual**, no en el diseño original: el manejo de números negativos como argumento de `delete` (commander los interpretaba como flags desconocidas), el orden de inicialización de `exitOverride`/`configureOutput` de commander respecto a la definición de subcomandos, y un catch-all final para no dejar pasar nunca un stack trace crudo al usuario.
6. **Cambios de alcance pedidos sobre la marcha**, incorporados primero al SPEC y después al código: ubicación de la base de datos movida de `~/.nota` a `db_core/` en la raíz del proyecto, y la flag `--file` agregada a `export` para escribir archivos directamente en `exports/`.
7. **Cierre**: cobertura de tests llevada al 100% en la capa de lógica, completando a propósito los casos que habían quedado pendientes de rondas anteriores.

## Decisiones tomadas

*(Sección para completar a mano.)*

- *¿Qué decisión de las que tomamos en el camino te costó más cerrar, y por qué?*
- *¿Hay alguna decisión del SPEC que hoy, con el proyecto terminado, cambiarías?*
- *¿Qué decisión te parece la más acertada del proyecto?*

## Qué haría diferente

*(Sección para completar a mano.)*

- *Si arrancaras este challenge de nuevo, ¿qué harías distinto en el proceso (no en el código)?*
- *¿Hubo algún momento en que aceptaste una sugerencia sin entenderla del todo? ¿Cuál?*
- *¿Qué parte del código no podrías explicar hoy sin volver a abrirlo?*

## Más detalle

- [SPEC.md](./SPEC.md) — especificación cerrada del proyecto: modelo de datos, comandos, manejo de errores y decisiones de diseño registradas.
- **ADRs**: el proyecto no llegó a generar ADRs formales como archivos separados — las decisiones con trade-offs reales (ubicación de la base de datos, versión de `commander`/`vitest`, formato de export, etc.) quedaron documentadas como parte de la sección "Decisiones de diseño registradas" dentro de `SPEC.md`, no en un ADR aparte. Si se retoma este proyecto, vale la pena extraerlas a ADRs individuales siguiendo la plantilla de `CLAUDE.md`.
