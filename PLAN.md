# PLAN

Estado del proyecto. Lo actualizan el coordinador de Claude y `#close-task` en Kiro. Aquí va el **estado**; las **reglas** van en `.kiro/steering/` y la idea en `docs/idea.md`.

**Entrega:** 4 dic 2026, 23:00 (España) · **Versión mínima funcionando:** 20 nov 2026 · **Código congelado:** 27 nov 2026 (después solo vídeo y textos) · **Demo en línea y gratis hasta:** 29 ene 2027

## En curso
- (nada)

## Siguientes (en orden; el coordinador puede reordenar con Luis Miguel)
1. [ ] Spec: esqueleto del proyecto (package.json con workspaces, TypeScript, ESLint, Prettier, Vitest y fast-check, `.gitattributes`) para que funcionen lint, build y test
2. [ ] Crear el hook de tests (Post Task Execution) cuando exista el stack
3. [ ] Spike: ¿las preguntas que genera Kiro sobre un archivo hacen pensar de verdad? (criterio: Luis Miguel responde a 3 preguntas sobre un archivo real y dice si le han obligado a entenderlo)
4. [ ] Spec: detección de fantasmas (qué archivos cuentan como fantasma y cómo se guardan)
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
- Low (PR #1): añadir `.gitattributes` con `* text=auto eol=lf` en la spec del esqueleto, para que Prettier no falle en Windows por los saltos de línea CRLF
- Low (PR #1): decidir si `npm run format:check` entra en la comprobación antes de cada commit (`tech.md` y `testing.md` solo piden lint, build y test)

## Hecho
- [x] Elegir idea (6 nov)
- [x] Créditos de Kiro (4.000) canjeados (6 nov)
- [x] Repo creado con licencia MIT (6 nov)
- [x] Generar `product.md` y `tech.md` con Kiro a partir de `docs/idea.md` (PR #1, 6 nov)
- [x] Crear `docs/frictions.md` y su recordatorio en el plan (PR #2, 6 nov)

## Para retomar (traspaso)
- Dónde lo dejé: PR #1 y #2 fusionados. `product.md` y `tech.md` ya cargan siempre en Kiro; `docs/frictions.md` existe con 4 entradas.
- Qué estaba a medias: nada. Todavía no hay `package.json`, así que lint, build y test no pueden ejecutarse hasta el esqueleto.
- Lo próximo: punto 1 de "Siguientes" (spec del esqueleto del proyecto).
