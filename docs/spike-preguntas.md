# Spike: ¿las preguntas de Kiro obligan a entender un archivo?

Punto 3 de `PLAN.md`. Prueba rápida y desechable. Responde a una duda antes de construir: si las preguntas que genera Kiro sobre un archivo obligan de verdad a leer y entender el código.

## Reglas del spike

- El archivo es de Duly. **No se copia al repo.** Solo se anota su nombre y qué hace (regla de Kiroween: no usar código de Duly en público).
- Luis Miguel responde **mirando solo el código**, sin leer la explicación de Kiro.
- Este documento se rellena a mano durante el spike. No lo rellena Kiro en una sola pasada.

## Prompt final

Se pega en un chat de Kiro con el archivo adjunto.

```
You are a patient tutor for a first-year programming student.
Write everything in Spanish, in simple words.

Read the attached file. Do two things.

1) Explain it: what it does, step by step. Define each technical term the
   first time you use it. Max 150 words.

2) Write exactly 3 questions that force me to think about THIS code:
   - Question 1: "What does this return/do if...?" with a concrete input,
     focusing on an edge case.
   - Question 2: "Why does the code do X and not Y?"
   - Question 3: "What would break if line N changed to ...?"

Rules for the questions:
- No question may be answerable from the file name, the comments, or
  general programming knowledge.
- Do not give the answers yet.
- After I answer, correct me and say PASS or FAIL for each question,
  with a short reason.
```

## Criterios

### Una pregunta es buena si

- No se puede acertar sin leer el código.

### Cómo se comprueba

1. Luis Miguel responde las 3 preguntas **mirando solo el código**, sin leer la explicación de Kiro.
2. Después apunta, pregunta por pregunta, si la habría podido acertar sin abrir el código (de memoria, por intuición o por el nombre del archivo).
3. Prueba de la respuesta absurda: una de las preguntas se contesta con una tontería que suene convincente. Si Kiro la da por buena (PASS), la corrección no sirve.

### El spike sale bien si

- Al menos 2 de 3 preguntas son buenas (no se podían acertar sin leer el código), **y**
- Kiro no aprueba la respuesta absurda, **y**
- la corrección de Kiro detecta los errores reales de Luis Miguel (no aprueba respuestas vagas que él sabe que eran una adivinanza), **y**
- Luis Miguel dice que las preguntas le han obligado a entender el archivo (sí / a medias / no).

### El spike sale mal si

- 2 o más preguntas se podían contestar sin leer el código, **o**
- Kiro aprueba la respuesta absurda, **o**
- Kiro aprueba una respuesta que Luis Miguel sabe que era una adivinanza.

## Archivo usado

<!-- Nombre del archivo de Duly, qué hace en una frase, cuántas líneas tiene. No pegar el código. -->

## Preguntas

<!-- Las 3 preguntas que generó Kiro, tal cual. -->

## Mis respuestas

<!-- Mis respuestas mirando solo el código. Para cada pregunta: ¿la podía acertar sin abrir el código? Sí / no. -->

## Corrección de Kiro

<!-- PASS / FAIL de cada pregunta con su motivo. Resultado de la prueba de la respuesta absurda. -->

## Veredicto

<!-- Bien / mal / a medias, según los criterios. Qué cambiaríamos del prompt. Si falla, apuntarlo también en docs/decisiones.md. -->
