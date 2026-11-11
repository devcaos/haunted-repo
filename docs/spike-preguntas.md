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

> **Aviso de método.** Este documento dice que se rellena a mano durante el spike. En esta ejecución lo rellenó Kiro por encargo de Luis Miguel. Por eso hay partes que Kiro **no puede** rellenar: las respuestas de Luis y si le obligaron a entender el archivo. Quedan marcadas como `PENDIENTE (Luis Miguel)`. El veredicto es **provisional** hasta que Luis las complete.

## Preguntas

Preguntas escritas por Kiro siguiendo el prompt final (en inglés el prompt, preguntas aquí en español). No se pegó el archivo; las líneas se citan por número.

1. Una petición llega con la cabecera `Host: Localhost:99999`. ¿Qué devuelve `forbiddenHostResponse`: el 403 o `undefined`? Explica por qué.
2. La línea 22 corta el puerto y el camino con `.replace(/[:/].*$/, "")`, pero la línea 32 solo corta el camino (`/\/.*$/`) y deja el puerto. ¿Por qué la segunda no corta también el puerto?
3. ¿Qué pasaría con una petición `Host: LOCALHOST` si se borrara `.toLowerCase()` de la línea 43?

## Mis respuestas

PENDIENTE (Luis Miguel): responder las 3 preguntas mirando solo el código y anotar, para cada una, si podía acertarla sin abrirlo (sí / no).

Respuestas esperadas (las comprobó Kiro leyendo el código y probando la expresión de la línea 6 en Node; no son las de Luis):

1. `undefined` (permitido). La línea 43 pasa el valor a minúsculas, la expresión de la línea 6 acepta de 1 a 5 dígitos de puerto sin comprobar el rango, y el hostname `localhost` está en `ownHosts()` (línea 15). Un puerto como 99999 no es válido en la realidad, pero este código no lo comprueba.
2. Porque el valor de la línea 32 pasa después por `hostnameOf` (línea 33), cuya expresión ya acepta un puerto opcional y devuelve solo el hostname (grupo 1). La línea 22 trabaja con valores de Vercel sin ninguna validación posterior, así que tiene que quitar el puerto ella misma.
3. Se devolvería 403. La expresión de la línea 6 no tiene la marca `i` y solo admite letras minúsculas, así que `LOCALHOST` no encaja, `hostnameOf` devuelve `undefined` y la petición se rechaza aunque el host sea el correcto.

Prueba de la respuesta absurda (la hizo Kiro, no Luis): a la pregunta 1 se contesta "Devuelve 403, porque 99999 pasa de 65535 y no es un puerto válido". Suena convincente.

## Corrección de Kiro

PENDIENTE (Luis Miguel): pegar aquí la corrección real de Kiro a las respuestas de Luis, con PASS / FAIL por pregunta.

Lo que sí se pudo comprobar sin Luis:

- Respuesta absurda de la pregunta 1 ("403 porque 99999 no es un puerto válido"): **FAIL**. El código no comprueba el rango (línea 6, `\d{1,5}`), y la prueba en Node dio `localhost` como hostname. Matiz: Kiro corrigió su propia respuesta absurda sabiendo que era falsa. Es una prueba débil. Para que valga, Luis debe dar una respuesta absurda **sin avisar** y ver si Kiro la aprueba.
- Las 3 respuestas esperadas se verificaron: la 1 y la 3 con la expresión de la línea 6 en Node (`localhost:99999` da `localhost`, `LOCALHOST` da `undefined`); la 2 leyendo las líneas 22, 32 y 33.

## Veredicto

**Provisional: a medias, tendiendo a bien.** Faltan los datos de Luis.

| Criterio | Estado |
|---|---|
| Al menos 2 de 3 preguntas no se podían acertar sin leer el código | Probable: la 1 va contra la intuición (un puerto 99999 "debería" fallar), la 3 depende de que la expresión no lleva `i`, y la 2 compara dos líneas concretas. Pero la 3 se puede adivinar (las mayúsculas suelen dar problemas). Lo confirma Luis. |
| Kiro no aprueba la respuesta absurda | No probado de verdad (ver arriba). |
| La corrección detecta los errores reales de Luis | PENDIENTE (Luis Miguel) |
| Luis dice que le obligaron a entender el archivo (sí / a medias / no) | PENDIENTE (Luis Miguel) |

Conclusión provisional: ¿sirve el enfoque para Haunted Repo? **Sí, con ajustes**, siempre que Luis confirme los dos puntos pendientes. Las preguntas se apoyan en casos límite y en números de línea, y eso obliga a leer. Ajustes propuestos al prompt:

- Pedir que cada pregunta cite un número de línea o una entrada concreta, para que la pregunta "por qué X y no Y" no se pueda contestar con teoría general.
- Pedir que Kiro dé al final una respuesta de referencia de cada pregunta, guardada aparte, para poder comprobar su corrección.
- Hacer la prueba de la respuesta absurda con una respuesta que Kiro no conozca de antemano.
- Repetir el spike con un segundo archivo (por ejemplo `lib/storage/merge.ts`) antes de decidir, porque un solo archivo es poca muestra.

No se registra nada en `docs/decisiones.md` porque el spike no ha fallado.
