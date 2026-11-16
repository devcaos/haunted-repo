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

## Impact on the requirements

Esta sección contesta las Open Questions 2 y 5 de `.kiro/specs/kiro-power/requirements.md` con el resultado del spike, y **propone** cambios a los requisitos. No cambia `requirements.md`: lo decide Luis Miguel.

### Open Question 2: cómo ejecuta su servidor el Power instalado

Respuesta del spike: Kiro ejecuta `node ${PLUGIN_ROOT}/<archivo>` desde una copia exacta de la carpeta `packages/power/`, sin `node_modules/`, sin `npm ci` y sin compilar. Node 24 ejecuta un `.ts` sin dependencias.

Consecuencia para el diseño: el servidor real necesita `@modelcontextprotocol/sdk` y `@haunted-repo/core`, y ninguno de los dos estará en la carpeta instalada. Además, Node no puede ejecutar el código fuente de `core` directamente: sus imports apuntan a archivos `.js` (`./ghost-detection/index.js`) y su `package.json` apunta a `dist/`, que no está en git. De las tres opciones de la pregunta:

- **Un solo archivo del servidor, empaquetado y guardado en git** (con el SDK y `core` dentro): encaja con lo que se ha visto. Es lo único que no pide pasos al estudiante ni servicios externos. El diseño debe decidir la herramienta que empaqueta y cómo comprobar en CI que el archivo guardado está al día.
- Paquete de npm con `npx`: no probado. Además, obliga a publicar en npm y depende de un servicio externo.
- Pedir `npm ci` y `npm run build`: es justo el paso manual que el requisito 1.5 quiere evitar.

`${PLUGIN_ROOT}` está probado; la ruta relativa no. El diseño debe usar `${PLUGIN_ROOT}`.

### Open Question 5: la Power_Data_Folder

Respuesta del spike: el servidor **no puede encontrar el Workspace por sí solo** (conclusión b). La única carpeta de escritura que Kiro le da es `PLUGIN_DATA`, que está fuera del proyecto del estudiante. Por eso la pregunta de añadir la carpeta al `.gitignore` del estudiante solo tiene sentido con la opción B de abajo.

### Requisitos que dependen de encontrar el Workspace

- Glosario, **Power_Data_Folder**: "the single folder inside the Workspace".
- **Requisito 7**: la historia de usuario ("saved only in my own project folder"), 7.1 ("inside the Power_Data_Folder of the Workspace"), 7.6 (Workspace de solo lectura) y 7.10 ("cannot find the Workspace folder").
- Usan la Power_Data_Folder: 2.2 (guardar el informe), 2.7 (sustituir el informe guardado), 7.2, 7.3, 7.5, 7.8, 9.1 y 9.2 (seguir después de reiniciar).
- Edge Cases: "The Workspace is read-only" y "The Workspace folder cannot be found".
- Open Question 5.

### Opciones propuestas

**Opción A: guardar el informe y el progreso en `PLUGIN_DATA`.** (Recomendada)

- Qué ve el estudiante: el progreso sigue al cerrar y abrir Kiro, pero se guarda en una carpeta de Kiro de su usuario, no en su proyecto. Hay una sola casa guardada para todos sus proyectos (el requisito 2.7 ya pide confirmación para cambiarla).
- Riesgo para el vídeo: bajo. Kiro ya da la ruta y no hay pasos extra. Falta probar si la carpeta sobrevive a actualizar o reinstalar el Power.
- Cambios: el glosario define la Power_Data_Folder como la carpeta de `PLUGIN_DATA`. 7.1 dice "inside the Power_Data_Folder" sin "of the Workspace". La historia del 7 dice "only on my own computer". 7.10 pasa a "IF `PLUGIN_DATA` is missing" (todo en memoria y se avisa). Se quita del Edge Case la palabra Workspace. La parte de `.gitignore` de la Open Question 5 deja de aplicar.

**Opción B: el Tutor le pasa al servidor la ruta del proyecto en cada herramienta.**

- Qué ve el estudiante: una carpeta (por ejemplo `.haunted-repo/`) dentro de su proyecto, que puede ver y subir a git.
- Riesgo para el vídeo: medio. Depende de que el modelo mande la ruta correcta en cada llamada. Si la ruta está mal, el progreso se guarda en otra carpeta o "desaparece". La ruta viene del modelo, así que el servidor tiene que validarla antes de escribir en el disco.
- Cambios: un nuevo dato de entrada (la ruta) en las herramientas que guardan o leen. 7.10 pasa a "IF the path is missing or is not an existing folder". Un criterio nuevo para validar la ruta. La Open Question 5 sigue abierta (`.gitignore`).

**Opción C: todo solo en memoria.**

- Qué ve el estudiante: los fantasmas y el exorcismo funcionan, pero al cerrar Kiro todos los fantasmas vuelven a estar `haunted`.
- Riesgo para el vídeo: el más bajo en lo técnico, porque no se escribe nada en el disco. Pero el vídeo no puede enseñar que la casa sigue más limpia otro día.
- Cambios: se quitan 7.1 a 7.3, 7.5, 7.6, 7.8 (y su test de propiedad en 11.4), 9.2, 2.7 y los Edge Cases de archivos. 7.4, 7.7 y 7.9 se quedan.

**Recomendación: opción A.** Es la que usa lo que Kiro ya da, sin pasos extra ni rutas que dependan del modelo, y conserva el progreso entre sesiones. Si `PLUGIN_DATA` falta, el servidor pasa al comportamiento de la opción C y avisa (el nuevo 7.10).

## Folder-import check (task 1.6, 2026-11-16)

Luis Miguel imported the Power in Kiro IDE with "Import power from a folder" from `packages/power/` of the PR 1 branch `feat/kiro-power-bundle` (merged as PR #37): it loads and the six tools appear.
A call to `house_status` from the chat answered `NO_SESSION`, as expected with no saved house.
