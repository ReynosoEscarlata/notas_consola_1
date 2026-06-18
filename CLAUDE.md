# CLAUDE.md

Este archivo es tu contexto persistente para este proyecto. Léelo antes de proponer cualquier cambio.

## Qué es este proyecto

`nota` es una CLI de notas personales en Node + TypeScript (Challenge 1 de un programa de aprendizaje: "de junior a arquitecto"). El objetivo no es que el código funcione — es que la persona que lo construye entienda cada línea y pueda explicarla sin tenerte abierto. Si en algún momento el código avanza más rápido que el entendimiento de la persona, frena y pregunta en vez de seguir generando.

## Fuente de verdad

`SPEC.md`, en la raíz del proyecto, es la spec cerrada de este challenge. No implementes nada que no esté ahí. Si aparece un caso que la spec no cubre, paráte y pregunta — no asumas un comportamiento "razonable" por tu cuenta.

## Stack y comandos

- Node.js 20+, TypeScript con `strict: true`.
- Persistencia: SQLite vía `better-sqlite3`.
- Tests: Vitest.
- Parsing de argumentos: commander o yargs — decisión ya tomada por la persona, no la cambies sin que lo pida.
- Usa `npm run build` / `npm test` / `npm run lint` si existen antes de asumir otros scripts.

## Reglas no negociables

1. **Spec antes de código.** Si `SPEC.md` no cubre lo que se va a construir, no escribas código — ayuda primero a cerrar la spec haciendo preguntas, no proponiendo la respuesta tú mismo.
2. **Diffs chicos y explicados.** Un comando o una función a la vez, nunca la CLI completa de una. Antes de tocar archivos, explica en 2-3 líneas el approach y espera confirmación.
3. **No generes más del 50% de los tests.** El resto los escribe la persona a mano. Si te pide "escribe todos los tests", recuérdaselo en vez de hacerlo.
4. **Dependencias bajo justificación.** Antes de correr `npm install <paquete>`, explica por qué se necesita y qué alternativa hay sin él. No instales nada "por si acaso".
5. **Tipos estrictos.** Ninguna función pública sin tipos explícitos. Cero `any` — si te ves tentado a usarlo, es señal de que el tipo está mal modelado, no una salida rápida.
6. **Errores controlados.** Nunca dejes que un stack trace de Node llegue al usuario final. Todo error esperado se captura y sale por `stderr` con el exit code que define `SPEC.md`.
7. **ADR para decisiones importantes.** Si proponés algo con trade-offs reales (ej. estructura de la BD, librería de parsing), sugerí registrarlo en un ADR antes de implementarlo, no después.
8. **Cobertura ≥ 70% en la capa de lógica.** La capa de CLI (parsing de argumentos, impresión) no cuenta para ese mínimo.

## Qué SÍ podés hacer sin pedir permiso de más

- Proponer el scaffold inicial de carpetas y configuración, una vez que la spec esté cerrada.
- Configurar Vitest, tsconfig y linting.
- Sugerir patrones de manejo de errores — la persona decide cuál usar.
- Generar hasta la mitad de los tests de una función ya implementada.

## Qué no hacer nunca

- No implementes los 5 comandos de una sola vez aunque te lo pidan así — proponé hacerlo comando por comando.
- No "arregles" silenciosamente algo fuera del scope de lo pedido, ni reformatees archivos enteros sin que se solicite.
- No avances sobre una ambigüedad de la spec asumiendo la opción más común — pregunta.
- No redactes el commit message solo y lo apliques sin mostrarlo antes.

## Convenciones de commits

Commits atómicos (un cambio lógico por commit), mensaje en imperativo. Si el commit instala una dependencia nueva, el mensaje explica por qué.
