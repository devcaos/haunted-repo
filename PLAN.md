# PLAN

Estado del proyecto. Lo actualizan el coordinador de Claude y `#close-task` en Kiro. Aquí va el **estado**; las **reglas** van en `.kiro/steering/` y la idea en `docs/idea.md`.

**Entrega:** 4 dic 2026, 23:00 (España) · **Versión mínima funcionando:** 20 nov 2026 · **Código congelado:** 27 nov 2026 (después solo vídeo y textos) · **Demo en línea y gratis hasta:** 29 ene 2027

## En curso
- Spec de detección de fantasmas: terminada (tareas 1 a 15). PR #11 (tareas 1 a 9) ya fusionada en main. Las tareas 10 a 15 están en la rama `feat/ghost-detection-fetch`, pendientes de PR. Siguiente: spec de exorcismo.

## Siguientes (en orden; el coordinador puede reordenar con Luis Miguel)
1. [x] Spec: esqueleto del proyecto (package.json con workspaces, TypeScript, ESLint, Prettier, Vitest y fast-check, `.gitattributes`) para que funcionen lint, build y test
2. [x] Crear el hook de tests (Post Task Execution) cuando exista el stack (PR #5; confirmado en real: se dispara al completar una tarea)
3. [ ] Spike: ¿las preguntas que genera Kiro sobre un archivo hacen pensar de verdad? (criterio: Luis Miguel responde a 3 preguntas sobre un archivo real y dice si le han obligado a entenderlo)
4. [x] Spec: detección de fantasmas (qué archivos cuentan como fantasma y cómo se guardan)
5. [ ] Spec: exorcismo (explicación + preguntas + corrección)
6. [ ] Spec: web de demostración con repo de ejemplo encantado
7. [ ] Spec: empaquetar como Kiro Power
8. [ ] Anotar en docs/frictions.md cada fricción el mismo día que ocurra

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
- Medium (spec ghost-detection, enfoque aprobado 11 nov): actualizar product.md y tech.md. El enfoque nuevo (elegir de 3 a 5 archivos clave de un repo público de GitHub, ordenados de fácil a difícil) sustituye a la idea de un hook que marca cada archivo escrito por el agente. Revisar también las secciones 'Deliverables', 'Kiro hook' y 'Ghost state'.
- Medium (PR #11, revisión): la frase de cada fantasma empieza siempre por "It is hard mostly because…", también en archivos fáciles. Resolver en la spec de la web o del exorcismo.
- Low (PR #11, revisión): `parseReport` acepta campos desconocidos sin quitarlos.
- Por comprobar por Luis Miguel (tarea 1.2 de ghost-detection): prueba manual del hook PostTaskExec con un test que falla a propósito. Falta saber si el hook de comando y el de agente devuelven el fallo a Kiro. Ya está confirmado que el hook se dispara al completar una tarea (tarea 2.1); no hay resultado anotado sobre el fallo. Si no funciona, anotarlo en `docs/decisiones.md` ("Rechazado") o como Low.

## Hecho
- [x] Elegir idea (6 nov)
- [x] Créditos de Kiro (4.000) canjeados (6 nov)
- [x] Repo creado con licencia MIT (6 nov)
- [x] Generar `product.md` y `tech.md` con Kiro a partir de `docs/idea.md` (PR #1, 6 nov)
- [x] Crear `docs/frictions.md` y su recordatorio en el plan (PR #2, 6 nov)
- [x] Esqueleto del proyecto: workspaces, TypeScript, ESLint, Prettier, Vitest y fast-check (PR #4)
- [x] Hook de tests con acción de comando y de agente (PR #5; confirmado en real: se dispara al completar una tarea)
- [x] Spec de detección de fantasmas: `packages/core` con `detectGhosts`, cliente de GitHub, GitHub falso estricto y test en vivo (PR #11 y siguiente)

## Para retomar (traspaso)

- Dónde lo dejé: spec de detección de fantasmas terminada (tareas 1 a 15). PR #11 (tareas 1 a 9) fusionada en main; las tareas 10 a 15 están en la rama `feat/ghost-detection-fetch` y falta crear su PR (se prevé más de 500 líneas sin lockfile: valorar dividirla).
- Qué existe en `packages/core` (`@haunted-repo/core`, carpeta `src/ghost-detection/`): `detectGhosts(url, opts)` devuelve un `Result` con un `HauntedReport`; `parseReport`, `parseRepoUrl`, `isEligible`, `pickKeyFiles`, `measureFactors`, `difficultyScore`, `floorOf`, `buildReport` y `createGitHubClient`, todo exportado desde `src/index.ts`. Solo usa `fetch`, `TextDecoder` y `AbortSignal` (sin APIs de Node), para que funcione en el navegador.
- Test en vivo: `npm run test:live` llama al GitHub real (`lukeed/sirv`, sin token) y gasta hasta 8 de las 60 peticiones por hora. No forma parte de `npm run check` ni de `npm test`. Si falla por límite de peticiones, esperar a que se reinicie y repetir.
- `power` y `web` todavía NO dependen de `core`. Cada spec posterior que lo use debe añadir `"@haunted-repo/core": "0.0.0"` en su `package.json` y actualizar `package-lock.json`. El script `build` de la raíz lista `core`, `power` y `web` en ese orden; un paquete nuevo se añade en el sitio correcto.
- Qué estaba a medias: el hook está confirmado que se dispara al completar una tarea (tarea 2.1). Falta que Luis Miguel haga la prueba manual del test que falla (ver "Pendientes") y decidir si se deja el hook de comando o el de agente.
- Lo próximo: crear la PR de las tareas 10 a 15 (con el visto bueno de Luis Miguel). Después, spec de exorcismo (punto 5) y el punto 3 de "Siguientes" (spike, `docs/spike-preguntas.md`) si sigue pendiente.
- Notas para specs futuras: (a) Power: no empaquetar los tests compilados de `dist/`; (b) web: cambiar `types: ["node"]` de `tsconfig.base.json` por tipos DOM; (c) GitHub Pages: comprobar que `npm ci` funciona en Linux con un lockfile creado en Windows.
