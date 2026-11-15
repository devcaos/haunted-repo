# Spike del Kiro Power (requisito 0)

Spec: `.kiro/specs/kiro-power/requirements.md`, requisito 0. Sirve para ver cómo arranca Kiro un Power instalado desde GitHub antes de escribir `design.md`. `design.md` no se empieza hasta que este spike pase (criterio 0.3: una llamada a la herramienta funciona desde el chat).

## Qué se prueba

El Power mínimo está en `packages/power/`: `plugin.json`, una skill (`skills/haunted-spike/SKILL.md`), `mcp.json` y un servidor MCP (un programa que le da herramientas a Kiro) con una sola herramienta, `spike_where_am_i`. La herramienta devuelve:

- `cwd`: la carpeta desde la que Kiro arrancó el servidor.
- `roots`: las carpetas del Workspace (la carpeta que tienes abierta en Kiro) que Kiro le deja ver al servidor.
- `argv` y `env`: con qué comando lo arrancó Kiro y si le pasó `PLUGIN_ROOT` y `PLUGIN_DATA`.

`mcp.json` declara el mismo servidor dos veces, para probar las dos formas de escribir la ruta del archivo:

- `spike-root`: `node ${PLUGIN_ROOT}/src/spike/server.ts` (la forma que pide la especificación Agent Plugins).
- `spike-relative`: `node src/spike/server.ts` (ruta relativa a la carpeta del Power).

El servidor no tiene dependencias y Node 24 lo ejecuta directamente desde el archivo `.ts`, sin `npm ci` ni compilar. Si arranca al menos uno de los dos, el spike pasa.

## Aviso: puede que Kiro solo lea la rama `main`

"Import power from GitHub" puede leer solo la rama `main`. Si en el paso 2 la URL de la rama da error, o Kiro instala un Power sin `mcp.json` ni la skill `haunted-spike`, entonces: fusiona primero esta PR en GitHub y vuelve a importar con la URL de `main` que está en el paso 2.

## Pasos para Luis Miguel

Necesitas Kiro IDE y Node.js 24 (ya lo tienes). No hace falta la terminal.

- [ ] 1. Abre Kiro IDE con la carpeta `haunted-repo`. En la barra de la izquierda pulsa el panel **Powers**, después **Add Custom Power** y después **Import power from GitHub**.
- [ ] 2. Pega esta URL y confirma: `https://github.com/devcaos/haunted-repo/tree/feat/power-spike/packages/power`. Si da error, mira el aviso de arriba y usa después `https://github.com/devcaos/haunted-repo/tree/main/packages/power`. **Anota** qué URL funcionó y, si hubo error, copia el mensaje o haz una captura.
- [ ] 3. Mira la lista de servidores MCP de Kiro (en el panel de Kiro, sección **MCP Servers**). Busca dos servidores cuyo nombre acaba en `spike-root` y `spike-relative`. **Anota** cuál está en marcha y cuál tiene error (una captura vale).
- [ ] 4. Abre un chat nuevo y escribe exactamente: `haunted spike: call the tool spike_where_am_i once and show me the JSON it returns`. Si Kiro pregunta si puede usar la herramienta, pulsa el botón que la permite (por ejemplo **Run** o **Accept**).
- [ ] 5. **Anota** si la llamada funcionó (sí o no), qué servidor contestó, y copia el JSON entero en la sección "Result" de abajo (o haz una captura y guárdala en `docs/`).

Cuando termines, dile a Kiro "spike hecho" y Kiro rellenará el resto del resultado a partir de lo que anotaste.

## Result
