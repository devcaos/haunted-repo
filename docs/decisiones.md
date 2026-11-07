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

## Rechazado (no volver a proponer sin evidencia nueva)

| Fecha | Propuesta | Quién la hizo | Por qué no |
|---|---|---|---|
| 2026-11-05 | Agente `buscador` con un modelo barato | Plantilla Duly | Kiro ya busca en el repo; no consta que Kiro tenga Haiku |
| 2026-11-05 | Idea "Teletexto 2026" / "El teletexto de tu pueblo" | Hilo de ideas / Claude | Casi ningún mayor del pueblo tiene smart TV y no mirarían ahí esos datos: sin utilidad real |
| 2026-11-05 | Idea "Tu casa en internet" (páginas personales + webring) | Hilo de ideas | GeoSpirits (2025) ya lo hizo y no ganó; los negocios del pueblo no necesitan web |
| 2026-11-05 | Idea "Comandas" (foto de la libreta del bar → pantalla de cocina) | Claude | Problema poco doloroso, la foto añade un paso, sin gancho, no motiva |
| 2026-11-05 | Idea "Exorcista" (app Android para limpiar el móvil de mayores) | Claude | Android no deja ver lo necesario sin permisos especiales; instalarla fuera de Play Store sería un mal ejemplo de seguridad |
| 2026-11-05 | Ideas "Cementerio de Internet", "Kit de comunidad", "Muro Frankenstein" | Hilo de ideas | Poco originales, doble de trabajo o demo frágil |
