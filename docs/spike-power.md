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

- [x] 1. Abre Kiro IDE con la carpeta `haunted-repo`. En la barra de la izquierda pulsa el panel **Powers**, después **Add Custom Power** y después **Import power from GitHub**.
- [x] 2. Pega esta URL y confirma: `https://github.com/devcaos/haunted-repo/tree/feat/power-spike/packages/power`. Si da error, mira el aviso de arriba y usa después `https://github.com/devcaos/haunted-repo/tree/main/packages/power`. **Anota** qué URL funcionó y, si hubo error, copia el mensaje o haz una captura.
- [ ] 3. Mira la lista de servidores MCP de Kiro (en el panel de Kiro, sección **MCP Servers**). Busca dos servidores cuyo nombre acaba en `spike-root` y `spike-relative`. **Anota** cuál está en marcha y cuál tiene error (una captura vale).
- [x] 4. Abre un chat nuevo y escribe exactamente: `haunted spike: call the tool spike_where_am_i once and show me the JSON it returns`. Si Kiro pregunta si puede usar la herramienta, pulsa el botón que la permite (por ejemplo **Run** o **Accept**).
- [x] 5. **Anota** si la llamada funcionó (sí o no), qué servidor contestó, y copia el JSON entero en la sección "Result" de abajo (o haz una captura y guárdala en `docs/`).

Cuando termines, dile a Kiro "spike hecho" y Kiro rellenará el resto del resultado a partir de lo que anotaste.

## Result

Spike hecho por Luis Miguel en Kiro IDE el 2026-11-15, después de fusionar la PR #32. En este documento el nombre de usuario de Windows se sustituye por `<user>`.

**Veredicto: el spike pasa (criterio 0.3), con hallazgos que cambian los requisitos** (ver "Impact on the requirements").

### Qué pasó en cada paso

1. Import: se usó la URL de `main` (`https://github.com/devcaos/haunted-repo/tree/main/packages/power`), porque la PR ya estaba fusionada. Funcionó sin errores.
2. El Power aparece instalado, con la skill `haunted-spike`.
3. La lista de servidores MCP (paso 3) no se anotó.
4. La llamada a `spike_where_am_i` desde el chat funcionó. Contestó el servidor `spike-root` (`node ${PLUGIN_ROOT}/src/spike/server.ts`).
5. `spike-relative` (`node src/spike/server.ts`) **no se llamó**: la skill pide llamar a la herramienta una sola vez, y Kiro eligió `spike-root`. Su comportamiento queda sin probar.

### JSON que devolvió la herramienta

```json
{
  "cwd": "C:\\Users\\<user>\\.kiro\\powers\\installed\\power",
  "roots": "the client did not declare the roots capability",
  "argv": [
    "node.exe",
    "C:\\Users\\<user>\\.kiro\\powers\\installed\\power\\src\\spike\\server.ts"
  ],
  "node": "v24.20.0",
  "platform": "win32",
  "env": {
    "PLUGIN_ROOT": "C:\\Users\\<user>\\.kiro\\powers\\installed\\power",
    "PLUGIN_DATA": "C:\\Users\\<user>\\.kiro\\powers\\data\\power",
    "PWD": null,
    "INIT_CWD": null
  }
}
```

### Cómo arrancó Kiro el servidor

Kiro ejecutó `node.exe` con la ruta completa del archivo `.ts` dentro de la carpeta de instalación. Sustituyó `${PLUGIN_ROOT}` por esa carpeta y arrancó el proceso con esa misma carpeta como `cwd` (la carpeta de trabajo del proceso).

### Conclusiones

a. El servidor se ejecuta en la carpeta de instalación del Power (`C:\Users\<user>\.kiro\powers\installed\power`), no en el proyecto del usuario.

b. Kiro no declara la capacidad `roots` de MCP (la forma en que un cliente le dice al servidor qué carpetas tiene abiertas). Por eso el servidor no puede saber por sí solo cuál es el Workspace. `PWD` e `INIT_CWD` tampoco ayudan: llegan vacíos.

c. Kiro le da al Power una carpeta de datos propia en `PLUGIN_DATA` (`C:\Users\<user>\.kiro\powers\data\power`).

d. Node 24 ejecuta los archivos `.ts` directamente, sin compilar.

### Datos extra que miró Kiro en el disco después del spike

Estos datos no son parte de la prueba de Luis Miguel. Kiro los miró en el disco el mismo día, sin cambiar nada:

- La carpeta instalada tiene `mcp.json`, `package.json`, `plugin.json`, `tsconfig.json`, `skills/` y `src/` (con los `*.test.ts`). **No tiene `node_modules/`**: Kiro copia la carpeta tal cual y no ejecuta `npm ci`.
- La carpeta de instalación se llama `power` (el último trozo de la URL), no `haunted-repo` (el `name` de `plugin.json`). `PLUGIN_DATA` usa el mismo nombre.
- La carpeta de `PLUGIN_DATA` existe y está vacía: Kiro la creó, aunque el servidor del spike no escribe nada.
