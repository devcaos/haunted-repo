# Decisiones

Una línea por decisión importante: qué se eligió y por qué.

| Fecha | Decisión | Por qué | Alternativas descartadas |
|---|---|---|---|
| 2026-11-05 | Kiro escribe todo el código; Claude (proyecto "Kiroween 2026") solo investiga, revisa PR en solo lectura y redacta textos | Las bases exigen construir con Kiro; una segunda IA aporta revisión independiente | Claude Code escribiendo código |
| 2026-11-05 | Reglas de trabajo en `.kiro/steering/` (sin `CLAUDE.md` ni `AGENTS.md`) | Kiro carga el steering siempre; tener las reglas en dos sitios crea contradicciones | Mantener `CLAUDE.md` + `AGENTS.md` |
| 2026-11-05 | Una spec de Kiro por funcionalidad; cada tarea de `tasks.md` = un commit | Commits pequeños y revisables | Un `SPEC.md` único para todo |
| 2026-11-05 | El crítico de planes y la explicación de cada PR los hace un hilo de Claude | Revisión con otro modelo y sin gastar créditos de Kiro | Custom agents de Kiro para esas dos tareas |
| 2026-11-05 | Método de trabajo basado en una plantilla propia previa (reglas y flujo, sin código) | Se declara como trabajo previo, como piden las bases | — |
| 2026-11-06 | Idea: **Haunted Repo** (ver `docs/idea.md`) | Problema real vivido, demo gratis sin APIs de pago, gancho de Halloween, encaje con el jurado de Kiro | Las ideas de la tabla "Rechazado" |
| 2026-11-06 | Público principal: estudiantes y profesores | Convierte las preguntas en algo que alguien necesita, no en deberes | Público general de "vibe coders" |
| 2026-11-06 | Repo en `C:\proyectos\haunted-repo` en los dos ordenadores, fuera de OneDrive | Misma ruta en ambos; OneDrive no puede sincronizarlo por error | Carpeta en el Escritorio |
| 2026-11-06 | Stack: TypeScript + Vite + GitHub Pages, sin base de datos | Gratis sin intervención hasta el 29 ene 2027, un solo lenguaje | Python, HTML puro, Astro, Cloudflare Pages, Netlify, Biome |
| 2026-11-06 | Excepción a la regla de test con servicio real para la IA del usuario | Un test automático no puede llamar al Kiro del usuario; se cubre con el spike manual (punto 3 de PLAN.md) | — |
| 2026-11-06 | "Certificado de exorcismo" fuera de alcance por ahora | No cabe antes de la versión mínima del 20 nov. Sigue en "Pendientes" de `PLAN.md` | — |
| 2026-11-06 | Las fricciones se anotan en `docs/frictions.md` el mismo día que ocurren | Si se escriben al final de memoria, el texto de Devpost sale genérico. `frictions.md` es para fallos y rodeos al usar Kiro; `kiro-usage-log.md` es para qué se construyó con Kiro y cómo | Reconstruirlas al final del proyecto |
| 2026-11-11 | Fantasmas = hasta 5 archivos clave de un repo público de GitHub, de fácil a difícil, en tres plantas | Enfoque aprobado el 11 nov: sirve para cualquier repo público sin instalar nada y empieza por lo fácil | Hook de Kiro que marca cada archivo escrito por el agente (.haunted/ghosts.json); una habitación por carpeta |
| 2026-11-11 | Repo de la demo: lukeed/sirv (licencia MIT) | Ya lo usan el spike 3 y el test en vivo, con un commit fijado | Repo de ejemplo nuevo hecho para la demo |
| 2026-11-11 | Publicar la web en GitHub Pages (spec pages-deploy) antes del exorcismo | Auditoría del 11 nov: el enlace público es obligatorio y aún no existía | Dejar el despliegue para el final |
| 2026-11-11 | Público: principiantes que hacen proyectos con IA sin entender el código (sustituye a la fila "estudiantes y profesores" del 6 nov) | El prompt de `docs/spike-explicacion.md` (PR #9) ya define al alumno así. Motivo del cambio: to confirm with Luis Miguel | — |
| 2026-11-11 | Regla de inglés ampliada a títulos y descripciones de PR, nombres de rama y textos de la app; los documentos internos (`PLAN.md`, `docs/*.md`, specs internas) pueden seguir en español | PR #10. Motivo: to confirm with Luis Miguel (la PR #10 no lo explica; en ella solo se tradujeron a mano el título de la PR #9 y las líneas en español de la PR #8) | — |
| 2026-11-11 | Dos hooks PostTaskExec que ejecutan `npm run check`: uno de comando y uno de agente | PR #5: la documentación no dice que la salida de un hook de comando llegue al agente, así que el de agente hace de respaldo. Cuál de los dos se deja sigue abierto (`PLAN.md`) | — |
| 2026-11-11 | Spike con preguntas de comportamiento (qué hace el archivo, qué entra y qué sale, cuándo falla) en vez de preguntas por línea | PR #9 (`docs/spike-explicacion.md`) sustituye al enfoque de `spike-preguntas.md`: aquel spike fue no concluyente porque las preguntas solo le hicieron rendirse a Luis Miguel | Preguntas sobre líneas concretas |
| 2026-11-11 | `npm run test:live` queda fuera de `npm run check` y de `npm test` | `PLAN.md`: llama al GitHub real sin token y gasta hasta 8 de las 60 peticiones por hora. Motivo escrito de dejarlo fuera: to confirm with Luis Miguel | — |
| 2026-11-12 | Motor del exorcismo = funciones puras en packages/core, sin red, disco ni IA | Lo reutilizan la web (grabación) y el Power, y se prueba sin red | — |
| 2026-11-12 | Un fantasma queda exorcizado con al menos 2 de 3 respuestas buenas, si la primera (pregunta central) no está mal | Requisitos aprobados de la spec exorcism | — |
| 2026-11-12 | La spec del exorcismo va en una sola PR (#14) | Decisión de Luis Miguel: partirla al final era inviable para él | Partir la PR en varias |

## Rechazado (no volver a proponer sin evidencia nueva)

| Fecha | Propuesta | Quién la hizo | Por qué no |
|---|---|---|---|
| 2026-11-05 | Agente `buscador` con un modelo barato | Plantilla Duly | Kiro ya busca en el repo; no consta que Kiro tenga Haiku |
| 2026-11-05 | Idea "Teletexto 2026" / "El teletexto de tu pueblo" | Hilo de ideas / Claude | Casi ningún mayor del pueblo tiene smart TV y no mirarían ahí esos datos: sin utilidad real |
| 2026-11-05 | Idea "Tu casa en internet" (páginas personales + webring) | Hilo de ideas | GeoSpirits (2025) ya lo hizo y no ganó; los negocios del pueblo no necesitan web |
| 2026-11-05 | Idea "Comandas" (foto de la libreta del bar → pantalla de cocina) | Claude | Problema poco doloroso, la foto añade un paso, sin gancho, no motiva |
| 2026-11-05 | Idea "Exorcista" (app Android para limpiar el móvil de mayores) | Claude | Android no deja ver lo necesario sin permisos especiales; instalarla fuera de Play Store sería un mal ejemplo de seguridad |
| 2026-11-05 | Ideas "Cementerio de Internet", "Kit de comunidad", "Muro Frankenstein" | Hilo de ideas | Poco originales, doble de trabajo o demo frágil |
| 2026-11-11 | Aplicar `npm audit fix` a los 10 avisos moderados de minimatch (solo dev) | to confirm with Luis Miguel (sale del aviso de la tarea 1.1) | Bajaría ESLint a 9 (PR #4). Revisar cuando typescript-eslint/eslint publiquen una versión corregida (`PLAN.md`) |
