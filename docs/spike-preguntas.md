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

- Archivo: `lib/hosts.ts` de Duly (50 líneas). No se ha copiado al repo.
- Qué hace: decide qué dominios (hosts) puede usar el servidor y devuelve un error 403 si el dominio de una petición no está permitido.

> **Aviso de método.** Este documento dice que se rellena a mano durante el spike. En esta ejecución Kiro hizo de examinador en el chat y anotó las respuestas reales de Luis Miguel. Dos desviaciones: (a) en la pregunta 2 Kiro añadió una pista que no está en el prompt, así que esa pregunta no es del todo limpia; (b) Luis se examinó de un archivo escrito en TypeScript con expresiones regulares, y está en primero de DAM, aprendiendo Java (bucles). Eso condiciona todo el resultado (ver Veredicto).

## Preguntas

Preguntas escritas por Kiro siguiendo el prompt final (en inglés el prompt, preguntas aquí en español). No se pegó el archivo; las líneas se citan por número.

1. Una petición llega con la cabecera `Host: Localhost:99999`. ¿Qué devuelve `forbiddenHostResponse`: el 403 o `undefined`? Explica por qué.
2. La línea 22 corta el puerto y el camino con `.replace(/[:/].*$/, "")`, pero la línea 32 solo corta el camino (`/\/.*$/`) y deja el puerto. ¿Por qué la segunda no corta también el puerto?
3. ¿Qué pasaría con una petición `Host: LOCALHOST` si se borrara `.toLowerCase()` de la línea 43?

## Mis respuestas

Respuestas reales de Luis Miguel (mirando el código, sin leer ninguna explicación):

1. "No lo sé."
2. "No lo sé." (con la pista de Kiro sobre la línea 33)
3. "No lo sé."

Sobre si podía acertarlas sin abrir el código: no dio un sí o un no por pregunta. Al contestar "no lo sé" en las tres, no hubo intento de adivinar, así que no se puede decir que acertara por intuición. Su comentario literal sobre las preguntas: "supongo que serán buenas, el problema es que me haces preguntas sobre código que yo no entiendo porque está hecho por IA supervisada por mí, pero estoy en primero de DAM, aprendiendo Java, en la parte de bucles."

Respuestas esperadas (las comprobó Kiro leyendo el código y probando la expresión de la línea 6 en Node; no son las de Luis):

1. `undefined` (permitido). La línea 43 pasa el valor a minúsculas, la expresión de la línea 6 acepta de 1 a 5 dígitos de puerto sin comprobar el rango, y el hostname `localhost` está en `ownHosts()` (línea 15). Un puerto como 99999 no es válido en la realidad, pero este código no lo comprueba.
2. Porque el valor de la línea 32 pasa después por `hostnameOf` (línea 33), cuya expresión ya acepta un puerto opcional y devuelve solo el hostname (grupo 1). La línea 22 trabaja con valores de Vercel sin ninguna validación posterior, así que tiene que quitar el puerto ella misma.
3. Se devolvería 403. La expresión de la línea 6 no tiene la marca `i` y solo admite letras minúsculas, así que `LOCALHOST` no encaja, `hostnameOf` devuelve `undefined` y la petición se rechaza aunque el host sea el correcto.

Prueba de la respuesta absurda (la hizo Kiro, no Luis): a la pregunta 1 se contesta "Devuelve 403, porque 99999 pasa de 65535 y no es un puerto válido". Suena convincente.

## Corrección de Kiro

Corrección de Kiro a las respuestas reales de Luis:

- Pregunta 1: **FAIL** ("no lo sé"). Respuesta correcta: `undefined` (host permitido).
- Pregunta 2: **FAIL** ("no lo sé"). Respuesta correcta: la línea 33 pasa el valor por `hostnameOf`, que ya quita el puerto.
- Pregunta 3: **FAIL** ("no lo sé"). Respuesta correcta: 403, porque la expresión solo admite minúsculas.

Como las tres fueron "no lo sé", no se pudo comprobar si Kiro detecta una respuesta vaga o una adivinanza, ni si aprueba una respuesta absurda dada por Luis.

Lo que sí se pudo comprobar sin Luis:

- Respuesta absurda de la pregunta 1 ("403 porque 99999 no es un puerto válido"): **FAIL**. El código no comprueba el rango (línea 6, `\d{1,5}`), y la prueba en Node dio `localhost` como hostname. Matiz: Kiro corrigió su propia respuesta absurda sabiendo que era falsa. Es una prueba débil. Para que valga, Luis debe dar una respuesta absurda **sin avisar** y ver si Kiro la aprueba.
- Las 3 respuestas esperadas se verificaron: la 1 y la 3 con la expresión de la línea 6 en Node (`localhost:99999` da `localhost`, `LOCALHOST` da `undefined`); la 2 leyendo las líneas 22, 32 y 33.

## Veredicto

**No concluyente.** El spike no falla según los criterios, pero tampoco sale bien. No mide lo que queríamos medir.

| Criterio | Estado |
|---|---|
| Al menos 2 de 3 preguntas no se podían acertar sin leer el código | Sí en la práctica: Luis no acertó ninguna y no hubo adivinanzas. Pero fue porque el código estaba muy por encima de su nivel, no porque las preguntas fueran especialmente buenas. |
| Kiro no aprueba la respuesta absurda | No probado con Luis. La prueba de Kiro sobre sí mismo es débil. |
| La corrección detecta los errores reales de Luis | No probado: las tres respuestas fueron "no lo sé". |
| Luis dice que le obligaron a entender el archivo (sí / a medias / no) | Sin respuesta clara. Dijo "supongo que serán buenas", y explicó que no puede responder porque no entiende el código. Se anota tal cual, sin convertirlo en sí / a medias / no. |

**Lo que se aprendió (importante para Haunted Repo):**

1. El público principal son estudiantes de primer año que dirigen a una IA. Un ejemplo real: Luis está en bucles de Java y el archivo usaba TypeScript, expresiones regulares y cabeceras HTTP. Con ese salto, una pregunta fría sobre el código no obliga a pensar: obliga a rendirse. El fantasma del producto es justo el código que el usuario no entiende, así que este caso es el normal, no una rareza.
2. El spike quitó la explicación (Luis no debía leerla antes de responder). En el producto la explicación va **antes** de las preguntas. Ese flujo (explicar con palabras sencillas y luego preguntar) **no se ha probado**.
3. "No lo sé" es una respuesta honesta y frecuente. El producto no debe tratarla solo como FAIL, sino como el momento en que la explicación debe ayudar.

**Ajustes propuestos (para decidir con Luis, no están aprobados):**

- El prompt debe recibir el nivel del usuario (qué sabe ya) y adaptar el vocabulario y la dificultad. Las preguntas deben poder hacerse sobre lo que el código hace, en lenguaje sencillo, sin exigir leer una expresión regular.
- El flujo del exorcismo: explicación primero, preguntas después, y "no lo sé" lleva a una explicación más sencilla y a una pregunta nueva.
- Repetir el spike de la forma real: Luis lee primero la explicación de Kiro y luego responde. Mejor con un archivo más cercano a su nivel (por ejemplo uno pequeño con bucles y condiciones).
- Pedir que cada pregunta cite una línea o una entrada concreta y que Kiro guarde la respuesta de referencia aparte.
- Hacer la prueba de la respuesta absurda con una respuesta que Kiro no conozca de antemano.

No se ha escrito nada en `docs/decisiones.md`: la decisión sobre cómo seguir es de Luis. Si decide cambiar el flujo del exorcismo o el prompt, debería quedar allí.
