# PLAN

Estado del proyecto. Lo actualizan el coordinador de Claude y `#close-task` en Kiro. Aquí va el **estado**; las **reglas** van en `.kiro/steering/` y la idea en `docs/idea.md`.

**Entrega:** 4 dic 2026, 23:00 (España) · **Versión mínima funcionando:** 20 nov 2026 · **Código congelado:** 27 nov 2026 (después solo vídeo y textos) · **Demo en línea y gratis hasta:** 29 ene 2027

## En curso
- Nada en curso. Lo siguiente es la spec de la web de demostración (punto 6 de "Siguientes").

## Siguientes (en orden; el coordinador puede reordenar con Luis Miguel)
1. [x] Spec: esqueleto del proyecto (package.json con workspaces, TypeScript, ESLint, Prettier, Vitest y fast-check, `.gitattributes`) para que funcionen lint, build y test
2. [x] Crear el hook de tests (Post Task Execution) cuando exista el stack (PR #5; confirmado en real: se dispara al completar una tarea)
3. [ ] Spike: ¿las preguntas que genera Kiro sobre un archivo hacen pensar de verdad? (criterio: Luis Miguel responde a 3 preguntas sobre un archivo real y dice si le han obligado a entenderlo)
4. [x] Spec: detección de fantasmas (qué archivos cuentan como fantasma y cómo se guardan)
5. [x] Spec: exorcismo (explicación + preguntas + corrección; rama `feat/exorcism`, PR #14)
6. [ ] Spec: web de demostración con repo de ejemplo encantado
7. [ ] Spec: empaquetar como Kiro Power
8. [ ] Anotar en docs/frictions.md cada fricción el mismo día que ocurra
9. [x] Spec: despliegue en GitHub Pages (`pages-deploy`: Vite en `packages/web`, botón de comprobación, CI y deploy; PR #13 fusionada)

## Pendientes (Low, ideas, "después si da tiempo")
- Decidir la categoría definitiva (Costume Contest u otra con menos competencia)
- "Certificado de exorcismo" para profesores
- Bonus: entrada de blog (DEV.to) y post con #KiroweenHackathon26
- Low (PR #1): comprobar en kiro.dev/docs el formato real de los hooks (nombre y extensión del archivo en `.kiro/hooks/`) y si hay un trigger que distinga lo que escribe el agente de lo que guarda el usuario; corregir `tech.md` en la spec de detección de fantasmas
- Low (PR #1): quitar de `tech.md` las reglas repetidas de `testing.md` (mocks) y `git-workflow.md` (secretos) y dejar solo una referencia, para que no se contradigan si se cambia una
- Low (tarea 1.1): npm audit: 10 avisos moderados de minimatch (solo dev). No aplicar npm audit fix: bajaría eslint a 9. Revisar cuando typescript-eslint/eslint publiquen versión corregida.
- Cerrado (hook de tests, historial): en la sesión de la PR de `feat/test-hook` no se pudo disparar PostTaskExec editando `tasks.md`. Se añadió la opción B (segundo hook de tipo agente que ejecuta `npm run check`). La prueba real en la spec de detección confirmó que el hook se dispara al completar una tarea (ver la siguiente línea).
- Cerrado (hook de tests, prueba real en la tarea 2.1): el hook PostTaskExec está confirmado. Se dispara al marcar una tarea como completada, no al pulsar Start task. Al completar la 2.1 llegó al agente la instrucción de ejecutar `npm run check`. Queda decidir cuál de los dos hooks (comando o agente) se deja.
- Cerrado (hook de tests): 'Agent Hooks v2' no obliga a migrar. La documentación actual (kiro.dev/docs/hooks, actualizada oct 2026) usa `"version": "v1"` con `trigger` y `action`, igual que nuestro archivo. `timeout` va al nivel del hook, no dentro de `action`. Solo cambió el formato de IDE 0.x (`.kiro.hook`) a `.kiro/hooks/*.json`. La documentación no dice que la salida de un hook PostTaskExec llegue al agente.
- Low (PR #4): `vitest.config.ts` y `eslint.config.js` no los comprueba tsc (solo `src/`). Valorar un tsconfig para la raíz si los configs crecen.
- Cerrado (13 nov, docs/pre-web-cleanup): Medium (spec ghost-detection, enfoque aprobado 11 nov): actualizar product.md y tech.md. El enfoque nuevo (elegir de 3 a 5 archivos clave de un repo público de GitHub, ordenados de fácil a difícil) sustituye a la idea de un hook que marca cada archivo escrito por el agente. Revisar también las secciones 'Deliverables', 'Kiro hook' y 'Ghost state'.
- Low (PR #11, revisión): `parseReport` acepta campos desconocidos sin quitarlos.
- Cerrado (13 nov, docs/pre-web-cleanup): Medium (auditoría 11 nov): la línea .kiro/specs/*/tasks.meta.json de .gitignore puede chocar con las bases; decidir si se quita
- Medium (auditoría 11 nov): la demo debe mostrar el aviso de licencia MIT de lukeed/sirv
- Low (spec exorcism): siete propiedades opcionales aplazadas (grupo 8 de `tasks.md`): P3 tipo de archivo estable, P7 ida y vuelta del progreso, P8 rango de `hauntedShare`, P9 `hauntedShare` monótono, P10 frase del fantasma determinista, P15 ida y vuelta de la grabación, P17 las `sampleAnswer` se ignoran. Si se hacen, van en una rama nueva (feat/exorcism-properties) y una PR nueva, solo si hay tiempo (la PR #14 ya está fusionada).
- Low (revisión exorcism): `buildInstructions` lanza un Error si el estado no trae `current` o `pendingQuestion` (solo pasa con un estado imposible; el motor no lo produce).
- Low (revisión exorcism): las instrucciones no tienen una sección aparte de "formato de salida": el formato del VERDICT va como regla `verdict-format`.
- Low (revisión exorcism): `classifyFileKind` no reconoce como barrel un import de TypeScript escrito en varias líneas.
- Low (revisión exorcism): al repetir una pregunta tras simplificar, el motor acepta `answer-rated` aunque el texto de la pregunta no sea el de `pendingQuestion` (el Power debe mandar el mismo texto).
- Low (revisión exorcism): en la propiedad P4 el texto del driver siempre da el tipo general, así que solo se comprueban los objetivos de ese tipo.
- Low (revisión exorcism): `advance` comparte con el estado de entrada los arrays que no cambian (`ghosts`, `asked`): quien lo use no debe modificar estados antiguos.
- Low (revisión exorcism): el comentario de `tinySession.testutil.ts` dice que los eventos se generaron ejecutando el motor, pero están escritos a mano (el test de replay los valida).
- Low (revisión 13 nov): si falla por red la lectura de un solo archivo, detectGhosts devuelve error y descarta los ya leídos; solo el límite de peticiones da informe parcial (así lo pide la spec).
- Low (revisión 13 nov): cualquier respuesta 403 de GitHub se trata como límite de peticiones, aunque la causa sea otra.
- Low (revisión 13 nov): parseReport no comprueba que el informe sea coherente (picked igual al número de fantasmas, planta según la puntuación, rutas sin repetir). El fixture tinySession no lo es (fewFiles: true con 3 fantasmas).

## Hecho
- [x] Elegir idea (6 nov)
- [x] Créditos de Kiro (4.000) canjeados (6 nov)
- [x] Repo creado con licencia MIT (6 nov)
- [x] Generar `product.md` y `tech.md` con Kiro a partir de `docs/idea.md` (PR #1, 6 nov)
- [x] Crear `docs/frictions.md` y su recordatorio en el plan (PR #2, 6 nov)
- [x] Esqueleto del proyecto: workspaces, TypeScript, ESLint, Prettier, Vitest y fast-check (PR #4)
- [x] Hook de tests con acción de comando y de agente (PR #5; confirmado en real: se dispara al completar una tarea)
- [x] Spec de detección de fantasmas: `packages/core` con `detectGhosts`, cliente de GitHub, GitHub falso estricto y test en vivo (PR #11 y #12)
- [x] Spec de exorcismo: motor puro en `packages/core/src/exorcism/` (sesión, eventos, preguntas, veredicto, progreso, grabación y repetición) y nueva frase del fantasma según la planta (PR #14, 12 nov)
- [x] Despliegue en GitHub Pages: web pública, CI en cada PR y despliegue al fusionar (PR #13, 12 nov)

## Para retomar (traspaso)

- Dónde lo dejé: Detección de fantasmas (PR #11 y #12), despliegue en Pages (PR #13) y motor del exorcismo (PR #14, 12 nov) están en main. La web es pública en https://devcaos.github.io/haunted-repo/.
- Qué existe en `packages/core` (`@haunted-repo/core`, carpeta `src/ghost-detection/`): `detectGhosts(url, opts)` devuelve un `Result` con un `HauntedReport`; `parseReport`, `parseRepoUrl`, `isEligible`, `pickKeyFiles`, `measureFactors`, `difficultyScore`, `floorOf`, `buildReport` y `createGitHubClient`, todo exportado desde `src/index.ts`. Solo usa `fetch`, `TextDecoder` y `AbortSignal` (sin APIs de Node), para que funcione en el navegador.
- Test en vivo: `npm run test:live` llama al GitHub real (`lukeed/sirv`, sin token) y gasta hasta 8 de las 60 peticiones por hora. No forma parte de `npm run check` ni de `npm test`. Si falla por límite de peticiones, esperar a que se reinicie y repetir.
- `web` ya depende de `@haunted-repo/core`; `power` todavía NO. Cada spec posterior que use `core` en un paquete que aún no lo tenga debe añadir `"@haunted-repo/core": "0.0.0"` en su `package.json` y actualizar `package-lock.json`. El script `build` de la raíz lista `core`, `power` y `web` en ese orden; un paquete nuevo se añade en el sitio correcto.
- Qué estaba a medias: el hook está confirmado que se dispara al completar una tarea (tarea 2.1). Falta que Luis Miguel haga la prueba manual del test que falla (ver "Pendientes") y decidir si se deja el hook de comando o el de agente.
- Lo próximo: spec de la web de demostración (punto 6 de "Siguientes"); después, la del Power (punto 7). Sigue pendiente el spike (punto 3).
- Spec de exorcismo (fusionada, PR #14):
  - Qué existe en `packages/core/src/exorcism/`: funciones puras, sin red, sin `Date` ni `Math.random` (lo vigila `purity.test.ts`). `startSession`, `advance` (devuelve un `Transition`: un objeto con `ok: true`, el nuevo estado y las instrucciones; o con `ok: false`, un error y el mismo estado), `decide`, `buildInstructions`, `parseEvent`, `ALLOWED_EVENTS`, `formatVerdict`/`parseVerdict`, `classifyFileKind`, `QUESTION_SETS`, `suggestGhost`, `isPickable`, progreso (`normaliseProgress`, `parseProgress`, `formatProgress`, `hauntedShare`) y grabación (`parseRecording`, `formatRecording`, `replay`). Todo se exporta desde `src/index.ts`.
  - Cómo empezar una sesión: `startSession(report, { progress, profile })` y después `advance(state, event)` con cada evento (`pick-ghost`, `explanation-done`, `answer-rated`, `dont-know`, ...). El estado y las instrucciones son JSON puro, así que se pueden guardar.
  - Cómo repetir una grabación: `parseRecording(jsonText)` y `replay(recording)` devuelve todos los pasos; los `sampleAnswer` se ignoran. La grabación de ejemplo está en `exorcism/tinySession.testutil.ts` (JSON incluido).
  - El texto del Tutor (explicaciones, preguntas, corrección) solo se comprueba con los spikes manuales (`docs/spike-explicacion.md` y el spike del 11 nov); ningún test automático puede llamar a Kiro.
  - Las specs siguientes (Power y web) usarán este motor y la grabación del fixture. La web puede enseñar la grabación sin Kiro; el Power conecta el motor con el Kiro del usuario (debe enviar la misma pregunta al repetirla; ver "Pendientes").
  - `.kiro/specs/ghost-detection/design.md` tiene un puntero a la sección "Ghost_Sentence" del diseño de exorcismo, que sustituye a su tabla de frases.
- Notas para specs futuras: (a) Power: no empaquetar los tests compilados de `dist/`; (c) npm ci comprobado en Linux con el lockfile de Windows (11 nov)
  - (d) web: el informe guardado de la demo sale de una ejecución real de detectGhosts sobre el commit fijado de lukeed/sirv, no escrito a mano, y se carga con parseReport; la página no llama a GitHub al arrancar.
  - (e) web: en el navegador se guarda solo el progreso (formatProgress/parseProgress), nunca el SessionState entero (no hay validador de estado).
  - (f) web: la grabación no guarda el texto del "por qué" de cada veredicto; si la demo lo enseña, necesita un campo propio, y una grabación más rica que tinySession.
  - (g) web: npm test sin npm run build antes usa el dist/ compilado de core (falla si no existe y prueba código viejo si está desfasado); en el diseño, valorar un alias de @haunted-repo/core a packages/core/src en vitest.config.ts.
  - (h) Power: parseVerdict rechaza "**VERDICT: right**", un espacio delante o un punto final; el Power debe volver a pedir el veredicto si recibe INVALID_VERDICT.
