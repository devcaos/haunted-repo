# PLAN

Estado del proyecto. Lo actualizan el coordinador de Claude y `#close-task` en Kiro. Aquí va el **estado**; las **reglas** van en `.kiro/steering/`, la idea en `docs/idea.md` y los motivos de cada decisión en `docs/decisiones.md`.

| Hito | Fecha | Estado |
|---|---|---|
| Versión mínima funcionando | 20 nov 2026 | Hecho |
| Código congelado | viernes 27 nov 2026 | Después solo vídeo y textos |
| Entrega en Devpost | 4 dic 2026, 23:00 (España) | Se envía el 4 dic por la mañana |
| Demo en línea y gratis | hasta el 29 ene 2027 | GitHub Pages, sin coste |

## En curso
- Vídeo (decidido el 26 nov): menos de 3 minutos, **sin voz**, con carteles y subtítulos en inglés, en YouTube público. Las tomas de la web y un primer montaje ya existen (fuera del repo); faltan las dos tomas de Kiro que graba Luis Miguel: el Power sobre `packages/sirv-cli/bin.js` y las specs, el steering y los tests.
- Créditos de Kiro (25 nov): usados 3.129,51 de 4.000. El modelo por defecto es **Auto**.

## Siguientes (en orden)
El código está terminado: las siete specs están cerradas y solo siguen abiertas a propósito las tareas opcionales marcadas con `*` (exorcism 8.1 a 8.7, kiro-power 5.4 y 7.7, web-demo 16.1 y 16.2). Lo que queda no toca el código:

1. [ ] Vídeo terminado y subido a YouTube (28 a 30 nov).
2. [ ] Textos de Devpost: descripción y texto de cómo se usó Kiro (30 nov a 2 dic).
3. [ ] Bonus: entrada de blog en DEV.to y post con #KiroweenHackathon26 (30 nov a 2 dic; se hacen todos, decidido el 15 nov).
4. [ ] Datos y justificante de estudiante preparados (antes del 3 dic).
5. [ ] Rellenar el formulario de Devpost (3 dic) y enviarlo (4 dic por la mañana; límite 23:00, hora de España).

## Pendientes (después de entregar)
Nada de esta lista bloquea la entrega. Se revisa después del 4 dic, salvo que algo rompa la demo.

### Seguridad (revisión del 25 nov: 0 Critical, 0 High, 0 Medium, 4 Low)
- Low: `npm audit` da 9 avisos moderados de minimatch, que llega por eslint y typescript-eslint (solo dev; sin dev, 0 avisos). No aplicar `npm audit fix`: bajaría ESLint a 9. Revisar cuando eslint y typescript-eslint publiquen versión corregida.
- Low: la ruta del fantasma va fuera del bloque de código en las instrucciones del Tutor (`packages/core/src/exorcism/instructions.ts`); git admite saltos de línea en rutas.
- Low: las acciones de GitHub de `ci.yml` y `deploy.yml` están fijadas por versión, no por hash de commit.
- Low: la web no tiene Content-Security-Policy. GitHub Pages no deja poner cabeceras; se podría con una etiqueta `meta`.

### Power y motor
- Medium (revisión backend, 24 nov): cada respuesta del Power repite el archivo entero del fantasma (con `power.ts`, unos 23 KB por respuesta y unas 6 respuestas por fantasma). Enviarlo solo al elegir el fantasma.
- Medium (revisión backend, 24 nov): el Power lee el fantasma por nombre de rama, no por commit; si el alumno borra o renombra el archivo, ese fantasma no se puede exorcizar y la casa nunca queda limpia.
- Low: todo 403 de GitHub se toma como límite de peticiones, aunque GitHub también lo usa para repos bloqueados.
- Low: el informe guarda el dueño como se escribió en la URL, no como está en GitHub.
- Low: los 6 archivos se leen uno tras otro (1,7 a 2,2 s); en paralelo serían unos 0,5 s, pero cambia el corte por límite de peticiones.
- Low: el límite de 10 s cubre también la descarga del árbol; un repo enorme con red lenta puede dar "Could not reach GitHub". Sin verificar en vivo.
- Low: los archivos `*.testutil.ts` cuentan como elegibles y pueden salir como fantasmas. En este mismo repo salen en el ático 3 fantasmas casi vacíos (`core/src/ghost-detection/index.ts`, `power/src/server.ts` y `core/src/exorcism/index.ts`) y ninguno en la planta media. La demo usa sirv, que no cambia.
- Low: si falla por red la lectura de un solo archivo, `detectGhosts` devuelve error y descarta los ya leídos; solo el límite de peticiones da informe parcial (así lo pide la spec).
- Low: `parseReport` acepta campos desconocidos sin quitarlos y no comprueba que el informe sea coherente (el fixture `tinySession` no lo es).
- Low: el error del límite de peticiones del cliente de core es un `Error` sin `code`, así que el Student recibe el mensaje general en inglés y no el texto de core. `pick_ghost` crea un cliente nuevo en cada llamada, así que su límite de 8 peticiones solo se prueba con `coreMessage`.
- Low: la skill no puede provocar un `warning`, así que no se probó con el Student; `warning`, `house-clean` y `replace: true` solo tienen test automático.
- Low: un fantasma con 2 `right` de 3 puede quedar en `failed` si la pregunta principal terminó en dos "I don't know". Valorar un aviso en la skill.
- Low: la skill exige inglés al Tutor, pero el Student a veces contesta en español y el Tutor lo acepta. Decidir si la skill debe decirlo.
- Low: Kiro IDE pide aprobación en cada llamada a una herramienta del Power; no se probó si se puede marcar el Power como de confianza.
- Low: el razonamiento del Judgement puede citar la respuesta del alumno: que la skill lo prohíba y que el servidor nunca lo registre en logs.
- Low: almacén del Power. Sin `fsync` antes del `rename`; archivos `.tmp` sueltos si el servidor muere a mitad de una escritura (inofensivos); la sonda `haunted-repo--probe.tmp` tiene nombre fijo; un archivo de datos sin permiso de lectura se informa como `INVALID_REPORT`; el mensaje de error de Node puede llevar la ruta de la carpeta del usuario al campo `warning` (`store.ts`).
- Low: avisos del Power. `partial` y el aviso de almacenamiento se juntan con un espacio en el único campo `warning`; el aviso de almacenamiento espera a la siguiente respuesta aceptada; un argumento inválido devuelve el error -32602 del SDK y no `{ok:false, code}` (la skill debe tratarlo como `INVALID_EVENT`).
- Low: la carpeta de `PLUGIN_DATA` se llama `power`, como el último trozo de la URL de import, y choca con cualquier otro Power importado desde una URL que acabe en `/power`.
- Low: npm avisa de que el script de instalación de esbuild no está aprobado en `allowScripts`; el build funciona igual.
- Low: los mensajes en inglés de `src/dataFile.ts` siguen dentro del módulo, no en `src/messages.ts`.
- Low (motor de exorcismo): `buildInstructions` lanza un Error con un estado imposible; el formato del VERDICT va como regla y no como sección propia; `classifyFileKind` no reconoce un barrel con import en varias líneas; al repetir una pregunta el motor no comprueba que el texto sea el de `pendingQuestion`; `advance` comparte arrays con el estado de entrada; el comentario de `tinySession.testutil.ts` dice que los eventos salen del motor, pero están escritos a mano.
- Low (redacción de la spec `kiro-power`): la línea de corte no incluye 7.8; no dice qué pasa con `INVALID_REPORT` si se recorta 7.5; el glosario dice "3 rejections before the failure"; 7.6 y 7.10 se solapan; 7.6 debería avisar en cada guardado fallido.

### Web
- Low (1280x720, sin movimiento reducido): el hueco entre el botón de relámpagos y la línea de licencia es de 12 px, menos de los 13 px del criterio. Igual que antes de la PR #92.
- Low: a 1024 de ancho la barra lateral tapa hasta x 550 y el porche de la casa queda medio detrás (camera.ts cuenta con x 400). A 1024x768 el raíl de Nameplates aún hace un poco de scroll con cuatro Cards.
- Low: con red muy lenta (0,4 Mbit/s y CPU 4x) los fantasmas, las campanas y los botones se ven unos 10 s sobre fondo oscuro antes de que llegue la casa.
- Low: el aviso del límite de GitHub no dice a qué hora se puede volver a probar, aunque el motor ya lo sabe.
- Low: el motivo de los carteles por decisiones dice "if/elif/..." ("elif" es de Python). El texto sale de `packages/core/src/ghost-detection/factors.ts` y lo usan también el Power, la muestra y tres specs.
- Low: la explicación del fantasma de la planta media dice "calls the next function it was given" sin definir esa función.
- Low: la ilustración `house-scene.svg` trae lluvia pintada, que sigue débil sobre el amanecer del final.
- Low: el fuego, el péndulo y los faroles de la ilustración están quietos; si se animan, con capas propias encima y sin filtros. Quedan tokens sin uso en `scenic-tokens.css` (`--sc-depth-*`, `--sc-dur-motes`, `--sc-fg-rim-opacity`, entre otros).
- Low: en el marco del sótano la fila de botones de planta queda sobre el interior de la casa; la cámara también se desliza al cambiar de pantalla ancha a estrecha.
- Low: en la carga inicial el foco se queda en `body` a propósito; durante un análisis en vivo algunos navegadores sueltan el foco del botón desactivado.
- Low: la función que elige las etiquetas de las acciones del fantasma está repetida en `simple/ghost.ts` y `scenic/model/grimoireView.ts`, y la lista de pasos del fantasma en `page.ts` y `exorcism.ts`.
- Low: `go-to-floor` sigue disponible durante un análisis en vivo y el estado "Live report ready" se queda al cambiar de planta.
- Low (dev): en la galería de desarrollo la luz de la vela se corta en el borde de las tarjetas; los ids de degradado del SVG se repiten en cada hueco (se ve bien porque son idénticos); la Cloche del ático es un 5 % más pequeña (aceptado).
- Low (diseño): el diseño dice a la vez "room backs Night" y paredes del sótano Slate; se hizo fondo Slate y detalles Night.
- Comprobación a mano sin hacer (PR 1b): con `npm run dev`, en DevTools, comprobar que las dos fuentes `.woff2` se cargan desde el propio sitio y que, bloqueadas, el texto sigue visible.

### Tests y herramientas
- Medium: varios tests de `packages/web` importan utilidades de test de core con rutas relativas a `packages/core/src` (`page.test.ts`, `exorcism.test.ts`, `houseView.test.ts` y otros); se rompen si core las mueve.
- Low: el test de la Propiedad 5 de `houseView.test.ts` recalcula con la misma lógica que `buildWarnings`; el test "Reload" casi nunca puede fallar; de "yes", "half" y "no" solo "yes" tiene test sobre la tarjeta; el test de la caja de respuesta solo funciona si la variable se llama `answerBox`; el foco real del renderizador no tiene test.
- Low: `resolve.ts` y `house.ts` no tienen tests, y `ghostStateNodes` repite el `map` de `slotImages`.
- Low: en la propiedad P4 del exorcismo solo se comprueban los objetivos del tipo general.
- Low: `vitest.config.ts` y `eslint.config.js` no los comprueba tsc.
- Low: `tech.md` repite reglas de `testing.md` (mocks) y de `git-workflow.md` (secretos); dejar solo una referencia.
- Low: en `docs/kiro-usage-log.md` la fila del 22 nov va después de la del 23, y la entrada del stash (15 nov) no dice que se borró el 25 nov.
- Low (spike del Power, 15 nov): no se anotó cuál de `spike-root` y `spike-relative` estaba en marcha.

### Ideas
- Certificado de exorcismo para profesores: fuera de alcance para la entrega (ver `docs/decisiones.md`).
- Siete propiedades opcionales del exorcismo (grupo 8 de su `tasks.md`) y las 5.4 y 7.7 del Power, en una rama nueva.
- Textos del Tutor para los otros dos fantasmas de sirv (web-demo 16.1 y 16.2). `packages/sirv-cli/bin.js` sigue bloqueado en la web a propósito, para el vídeo del Power.
- Web en varios idiomas.

## Hecho
- [x] Idea elegida, 4.000 créditos de Kiro canjeados y repo creado con licencia MIT (6 nov)
- [x] `product.md` y `tech.md` generados con Kiro a partir de `docs/idea.md` (PR #1) y `docs/frictions.md` creado (PR #2) (6 nov)
- [x] Esqueleto del proyecto: workspaces, TypeScript, ESLint, Prettier, Vitest y fast-check (PR #4)
- [x] Hook de tests (PR #5; se dispara al completar una tarea). Desde el 15 nov solo queda el hook de comando
- [x] Spikes de preguntas y explicaciones con Kiro (11 nov; `docs/spike-preguntas.md` y `docs/spike-explicacion.md`)
- [x] Spec de detección de fantasmas: `detectGhosts` en `packages/core`, cliente de GitHub, GitHub falso estricto y test en vivo (PR #11 y #12)
- [x] Despliegue en GitHub Pages: web pública, CI en cada PR y despliegue al fusionar (PR #13, 12 nov)
- [x] Spec de exorcismo: motor puro en `packages/core/src/exorcism/` (PR #14, 12 nov)
- [x] Web de demostración, PR 1: fantasmas de lukeed/sirv por plantas, formulario en vivo, informe de ejemplo y aviso de licencia (PR #19 a #22, 14-15 nov)
- [x] Web de demostración, PR 2: exorcismo de ejemplo de los 2 fantasmas más fáciles, con progreso y fantasmas bloqueados (PR #24, #25, #27 y #29)
- [x] Categoría decidida: Costume Contest (15 nov)
- [x] Kiro Power: bundle, almacén, las seis herramientas con veredicto estricto, skill del Tutor, manifiesto y test en vivo (PR #34 a #46, 16 nov). Instalado desde GitHub `main` y probado en vivo (tarea 11, 17 nov; ver `docs/spike-power-e2e.md`)
- [x] Spec `scenic-web`: requisitos, diseño y tareas (PR #50 a #52, 17 nov)
- [x] Web escénica, PR 1a a 1f (#53 a #59, 17-18 nov): la casa es una ilustración declarada, hecha con Claude (`house-scene.svg`), integrada, animada y conectada a la app por Kiro
- [x] Web escénica, PR 2a a 2c (#62 a #67, 19 nov): fantasmas por planta, botones de planta, teléfono y raíl de Nameplates
- [x] Puerta de piedra (Gate_Panel) parte 1 y parte 2 con su movimiento (PR #68 y #70, 20 nov)
- [x] Regla de cambios visuales `.kiro/steering/visual-changes.md` (PR #71, 21 nov)
- [x] Web escénica, PR 3a a 4b (#72 a #80, 22 nov): sala del fantasma, exorcismo, amanecer final y vista escénica por defecto. Prueba a mano de la página pública (tarea 17.1, 23 nov)
- [x] Fantasma de la planta media exorcizable en la web (web-demo 16.3, PR #84, 23 nov)
- [x] Orden de fantasmas y redirecciones (PR #85), SVG optimizados (PR #86), favicon (PR #87) y arreglos de la vista simple y del Grimoire en móvil (PR #88 y #89) (24 nov)
- [x] Planta vacía de la muestra (PR #90), enlace "Get the Power" en el final (PR #91) y solape de la licencia con movimiento reducido (PR #92) (25 nov)
- [x] README final con la captura de la casa (PR #93) y limpieza final de fricciones, registro de uso de Kiro, steering y decisiones (PR #94 y #95) (25 nov)
- [x] Revisión de seguridad de `main` en solo lectura: 0 Critical, 0 High, 0 Medium, 4 Low (25 nov)
- [x] Arreglo: la línea de copyright de sirv ya no tapa el Bestiary de la puerta tras el análisis en vivo (PR #96)

## Para retomar (traspaso)
- Traspaso (26 nov): el código está terminado y no hay PR abiertas. Lo que queda está en "Siguientes" y no toca el código. Si hay que cambiar un documento del repo, sigue yendo por Kiro, en una rama `docs/...` desde `main` y contra `main`.
- Cada fricción se anota en `docs/frictions.md` el mismo día que ocurre.
- Power: el bundle `packages/power/bundle/server.mjs` se reconstruye en cada `npm run check`, y cualquier cambio que llegue a `src/server.ts` debe subir también ese archivo. `.kiro/specs/kiro-power/tasks.meta.json` se sube a git y nunca se ignora (las bases exigen `.kiro/` completo).
- Power: antes de importar el Power real hay que desinstalar el del spike (`spike-root` y `spike-relative`), porque los dos usan una carpeta llamada `power` y chocan.
- Core solo usa `fetch`, `TextDecoder` y `AbortSignal`, sin APIs de Node, para que funcione en el navegador. El motor de exorcismo es puro: sin red, sin `Date` ni `Math.random` (lo vigila `purity.test.ts`).
- Web: la demo carga un informe guardado de una ejecución real de `detectGhosts` sobre un commit fijado de lukeed/sirv, no llama a GitHub al arrancar y no guarda nada en el navegador (lo vigila `packages/web/src/source.test.ts`).
- Tests: `npm run test:live` llama al GitHub real sin token (unas 17 de las 60 peticiones por hora) y no forma parte de `npm run check`. El texto del Tutor solo se comprueba con los spikes manuales: ningún test automático puede llamar a Kiro.
