# Fricciones

Registro de lo que se ha atascado durante el proyecto: fallos, limitaciones y rodeos.

Sirve de material para el texto de Devpost sobre el uso de Kiro y para el feedback al equipo de Kiro.

Regla: una entrada el mismo día que ocurre. Si no se anota en el momento, se pierde.

Formato de cada entrada: qué intentaba, qué pasó, cómo lo rodeé, y si sigue abierto.

## 2026-11-06 — El formato de un Kiro Power no está claro en la documentación

- **Qué intentaba:** fijar en `tech.md` cómo se empaqueta el proyecto como Kiro Power.

- **Qué pasó:** la documentación describe un Power como instrucciones + herramientas MCP + steering opcional, pero no se pudo leer la página completa del formato.

- **Cómo lo rodeé:** dejar el formato sin fijar y decidirlo en la spec "empaquetar como Kiro Power".

- **Estado:** resuelto el 15 nov: ver la entrada "El formato de Power de la documentación no coincide con `tech.md`".

## 2026-11-06 — La regla de testing choca con que la IA es el Kiro del usuario

- **Qué intentaba:** cumplir la regla de `.kiro/steering/testing.md` de probar todo servicio externo contra el servicio real.

- **Qué pasó:** la IA que explica y pregunta es el Kiro de cada usuario, y un test automático no puede invocarla.

- **Cómo lo rodeé:** excepción anotada en `docs/decisiones.md`; se cubre con el spike manual (punto 3 de `PLAN.md`).

- **Estado:** resuelto con excepción.

## 2026-11-06 — Un hook por guardado no distingue quién escribió el archivo

- **Qué intentaba:** marcar como "fantasma" el código escrito por la IA mediante un hook de Kiro.

- **Qué pasó:** un disparador por guardado marcaría también los archivos editados a mano, que es justo lo contrario de lo que mide el proyecto.

- **Cómo lo rodeé:** no fijar el disparador todavía; se decide en la spec de detección de fantasmas.

- **Estado:** resuelto por el cambio de enfoque del 11 nov: ya no hay un hook que marque archivos.

## 2026-11-06 — PowerShell rompió el cuerpo del PR por el carácter `#`

- **Qué intentaba:** crear un pull request con `gh pr create --body`, pasando el cuerpo como texto con varias líneas que empezaban por `#`.

- **Qué pasó:** PowerShell interpretó el `#` como comentario y partió el texto, así que `gh` recibió argumentos sueltos y falló.

- **Cómo lo rodeé:** escribir el cuerpo en un archivo temporal y pasarlo con `gh pr create --body-file`, borrando el archivo después.

- **Estado:** resuelto.

## 2026-11-11 — No pude comprobar que el hook PostTaskExec devuelve el error al agente

- **Qué intentaba:** probar que `.kiro/hooks/test-after-task.json` (PostTaskExec → `npm run check`) detecta un test que falla y que el agente recibe el error.

- **Qué pasó:** creé una spec desechable con una tarea que añadía `expect(1).toBe(2)` y la marqué como hecha editando `tasks.md`. No apareció ninguna salida de hook en el contexto del agente, dos veces (con el hook de comando solo y con un segundo hook de agente). `npm run check` lanzado a mano sí fallaba como se esperaba. Probablemente PostTaskExec solo se dispara con el cambio de estado de la tarea hecho por el propio IDE, no al editar el archivo. Además, la documentación de triggers no dice que la salida de PostTaskExec llegue al agente.

- **Cómo lo rodeé:** añadí un segundo hook de tipo agente (opción B) que ejecuta `npm run check` y corrige fallos. La prueba real queda pendiente en la próxima spec (ver `PLAN.md`).

- **Estado:** resuelto: confirmado en la tarea 2.1 de ghost-detection (commit 6ed8f75, 11 nov). El 15 nov se decidió dejar solo el hook de comando; el de agente se borró.

## 2026-11-11 — `timeout` dentro de `action` daba error de formato

- **Qué intentaba:** poner un tiempo máximo de 120 s al hook de `npm run check`.

- **Qué pasó:** con `timeout` dentro de `action` Kiro daba un error de formato. La documentación actual lo define como campo del hook (`hooks[].timeout`), en segundos, solo para acciones de comando.

- **Cómo lo rodeé:** mover `timeout` al nivel del hook, junto a `trigger` y `action`.

- **Estado:** resuelto.

## 2026-11-11 — "Agent Hooks v2": no hay que migrar

- **Qué intentaba:** saber si el anuncio de Agent Hooks v2 obligaba a cambiar el formato de nuestro hook.

- **Qué pasó:** la documentación (kiro.dev/docs/hooks) usa `"version": "v1"` con `trigger`, `matcher` y `action`, igual que nuestro archivo. El único cambio de formato documentado es de IDE 0.x (`.kiro.hook`) a `.kiro/hooks/*.json`.

- **Cómo lo rodeé:** no hizo falta.

- **Estado:** resuelto.

## 2026-11-11 — tasks.md de ghost-detection apuntaba a la rama equivocada (anotada con retraso el 2026-11-13)

- **Qué intentaba:** seguir las tareas de la spec de detección de fantasmas tras fusionar la PR #11.

- **Qué pasó:** `tasks.md` seguía apuntando a la rama vieja; había que redirigir las tareas restantes a la rama `feat/ghost-detection-fetch`.

- **Cómo lo rodeé:** corregir la rama en `tasks.md` (commit f3f877b).

- **Estado:** resuelto.

## 2026-11-11 — estado de las tareas desordenado (anotada con retraso el 2026-11-13)

- **Qué intentaba:** marcar las tareas como hechas en `tasks.md`.

- **Qué pasó:** las tareas se marcaron en commits aparte (77aa29c, c803487, 81c1fcf) y se olvidaron las tareas padre (7d5194f).

- **Cómo lo rodeé:** de ahí salió la regla de marcar `[x]` en el mismo commit que la tarea (commit 23adca4).

- **Estado:** resuelto.

## 2026-11-11 — spike 1: Kiro añadió una pista y rellenó un documento que dice "a mano" (anotada con retraso el 2026-11-13)

- **Qué intentaba:** hacer el spike 1 de preguntas sobre un archivo real.

- **Qué pasó:** Kiro añadió una pista a la pregunta 2 que no estaba en el prompt, y rellenó un documento que dice que se rellena a mano (cuerpo de la PR #8).

- **Cómo lo rodeé:** se anotó en el documento; el veredicto quedó provisional hasta que Luis Miguel respondiera.

- **Estado:** resuelto.

## 2026-11-11 — cuerpo de la PR #8 en español y con acentos rotos (anotada con retraso el 2026-11-13)

- **Qué intentaba:** abrir la PR #8 con su cuerpo.

- **Qué pasó:** el cuerpo salió en español y con los acentos rotos.

- **Cómo lo rodeé:** se tradujo a mano en GitHub (PR #10).

- **Estado:** resuelto. Causa: to confirm with Luis Miguel.

## 2026-11-12 — tasks.md de exorcism mandaba crear una rama que ya existía (anotada con retraso el 2026-11-13)

- **Qué intentaba:** empezar las tareas de la spec de exorcismo.

- **Qué pasó:** `tasks.md` mandaba crear con `git checkout -b` una rama (`feat/exorcism`) que ya existía y traía la spec.

- **Cómo lo rodeé:** cambiar el paso para usar `git checkout` + `git pull` en vez de crear la rama (commit eff8408).

- **Estado:** resuelto.

## 2026-11-12 — orden de tareas de exorcism corregido (anotada con retraso el 2026-11-13)

- **Qué intentaba:** seguir el orden de tareas de la spec de exorcismo.

- **Qué pasó:** hubo que mover progreso y sugerencia antes de las instrucciones (commit eff8408).

- **Cómo lo rodeé:** reordenar las tareas en `tasks.md`.

- **Estado:** resuelto. Causa probable: las instrucciones del paso "choosing" necesitan `suggestGhost`; to confirm with Luis Miguel.

## 2026-11-12 — el navegador no deja fijar la cabecera User-Agent (anotada con retraso el 2026-11-13)

- **Qué intentaba:** probar la llamada real a GitHub desde la web.

- **Qué pasó:** el navegador no deja fijar la cabecera `User-Agent`, que la llamada real necesita.

- **Cómo lo rodeé:** la llamada real a GitHub desde la web solo se comprueba a mano en el sitio desplegado (cuerpo de la PR #13).

- **Estado:** resuelto con comprobación manual.

## Aviso del validador de specs (anotada con retraso el 2026-11-13)

- Sin rastro en el repo (commits, PR ni archivos). Fecha, qué pasó y cómo se rodeó: to confirm with Luis Miguel.

## 2026-11-13 — el chat no puede poner una tarea de la spec en curso

- **Qué intentaba:** empezar la tarea 0 de la spec web-demo desde el chat.

- **Qué pasó:** el ejecutor de tareas de la spec necesita que la tarea esté marcada como en curso. El chat no pudo poner ese estado editando `tasks.md` (cambiar `[ ]` por `[-]` no funcionó) y el ejecutor rechazó la tarea dos veces.

- **Cómo lo rodeé:** Luis Miguel empieza cada tarea con el botón Start task de `tasks.md`, una a una.

- **Estado:** resuelto.

## 2026-11-14 — la PR 1 de web-demo salió mucho más grande que la estimación del diseño

- **Qué intentaba:** abrir la PR 1 de la spec web-demo (tarea 7.2) con el tamaño que estimaba el diseño, unas 2.350 líneas cambiadas.

- **Qué pasó:** al contar las líneas en la tarea 7.1 salieron 3.492 (sin los datos JSON, el texto de la licencia ni `.kiro/`), unas 1.752 de ellas de tests.

- **Cómo lo rodeé:** Luis Miguel aprobó partirla en 4 pull requests apilados (`feat/web-demo-1` a `feat/web-demo-4`), creados como ramas sobre commits que ya existían, sin reescribir la historia (tarea 7.2 de `tasks.md`).

- **Estado:** resuelto.

## 2026-11-14 — la herramienta de tareas cambió `tasks.md` sin commit y desmarcó la tarea 7.1

- **Qué intentaba:** seguir con las tareas de la PR 1 de la spec web-demo.

- **Qué pasó:** la herramienta de tareas de Kiro cambió `tasks.md` sin hacer commit y dejó la tarea 7.1 sin marcar, aunque ya estaba hecha.

- **Cómo lo rodeé:** se restauró a mano la marca `[x]` de la tarea 7.1.

- **Estado:** resuelto.

## 2026-11-14 — la revisión de la PR #20 comparó tamaños medidos con reglas distintas

- **Qué intentaba:** revisar la PR #20 (pieza 2 de 4 de web-demo) y comprobar su tamaño.

- **Qué pasó:** la revisión contó 1.037 líneas añadidas frente a las 959 anunciadas y dio un reparto de 311 de código y 726 de tests. Las 1.037 incluían `.kiro/specs/web-demo/` (78 líneas de marcas de tareas), que el cuerpo de la PR excluía a propósito; el reparto también estaba mal: lo real es 213 de código (`page.ts` 194, `outcome.ts` 19) y 746 de tests. La cifra de la PR era correcta.

- **Cómo lo rodeé:** Kiro lo detectó al ir a anotar la fricción y Luis Miguel eligió anotarla corregida, con las cifras de `git diff --numstat`. Al revisar tamaños, medir con la misma regla que el cuerpo de la PR (qué carpetas se excluyen).

- **Estado:** resuelto.

## 2026-11-15 — la PR 2 de web-demo (el exorcismo) salió de 2.973 líneas y hubo que partirla en 4

- **Qué intentaba:** abrir la PR 2 de la spec web-demo (rama `feat/web-exorcism`, el exorcismo grabado) como una sola pull request (tarea 15.1).

- **Qué pasó:** la comprobación final midió 2.973 líneas cambiadas (código 1.000, tests 1.960, docs 13), sin `.kiro/`, `package-lock.json` ni datos JSON (`demo-script.json`, 46 líneas, aparte). El límite de Luis Miguel es 900.

- **Cómo lo rodeé:** partirla en 4 pull requests apiladas (`feat/web-exorcism-1` a `feat/web-exorcism-4`), creadas como ramas sobre commits que ya existían, sin reescribir la historia. Tamaños medidos con `git diff --numstat` contra la pieza anterior, con la misma regla: 787 (más 46 de JSON), 859, 685 y 678. Suman 3.009, más que 2.973, porque algunas líneas cambian en más de una pieza.

- **Estado:** resuelto: las 4 piezas están fusionadas (#24, #25, #27 y #29).

## 2026-11-15 — `git checkout main` se bloqueó por un cambio de `README.md` sin commit

- **Qué intentaba:** cambiar a `main` para abrir la pieza 4 de la PR 2 de web-demo, después de fusionar la PR #28 (README v2).

- **Qué pasó:** la rama `docs/readme-v2` tenía `README.md` modificado sin commit, y git no dejaba cambiar de rama. El archivo era idéntico al README de antes de la PR #28 (el mismo blob `132e2d7`), así que deshacía el README nuevo. No sé qué lo cambió.

- **Cómo lo rodeé:** guardarlo con `git stash` (sin borrarlo; está en `stash@{0}`, con un mensaje que lo explica) y seguir desde `main`.

- **Estado:** abierto: falta saber la causa y decidir si se borra el stash.

## 2026-11-15 — El formato de Power de la documentación no coincide con `tech.md`

- **Qué intentaba:** escribir los requisitos de la spec `kiro-power` siguiendo `tech.md`.

- **Qué pasó:** `tech.md` dice que un Power es "`POWER.md` + steering + servidor MCP". La documentación actual (kiro.dev/docs/powers y kiro.dev/docs/powers/create, leídas el 15 nov) dice que un Power sigue la especificación Agent Plugins: una carpeta con `plugin.json` obligatorio, `skills/` (un `SKILL.md` por skill) y `mcp.json` opcional. Además, `dist/` está en `.gitignore`, así que un Power importado desde GitHub no traería el servidor compilado.

- **Cómo lo rodeé:** los requisitos siguen la documentación actual; corregir `tech.md` queda en "Pendientes" de `PLAN.md`, y cómo se ejecuta el servidor instalado queda como pregunta abierta para el diseño.

- **Estado:** abierto (falta corregir `tech.md` y decidir cómo se distribuye el servidor).
