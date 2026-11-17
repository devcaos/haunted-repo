# Prueba manual del Power instalado desde GitHub `main` (tarea 11.1)

Fecha: 17 nov 2026. Spec: `.kiro/specs/kiro-power/tasks.md`, tarea 11 (11.1 aquí; 11.2 más abajo). Hecha en vivo en Kiro IDE por Luis Miguel (el Student) con Kiro como Tutor. No se cambió ningún código.

Instalación: el Power se importó desde `https://github.com/devcaos/haunted-repo/tree/main/packages/power` (según Luis Miguel; Kiro no enseña de dónde vino la instalación, así que no se pudo comprobar desde dentro). Las seis herramientas (`find_ghosts`, `continue_house`, `pick_ghost`, `send_event`, `judge_answer`, `house_status`) y la skill `exorcise-ghosts` estaban disponibles.

## Qué se probó

1. `find_ghosts` sobre `https://github.com/lukeed/sirv`.
2. Un exorcismo del fantasma `bench/static.js`, siguiendo la skill: un "I don't know" y un veredicto con punto final (para forzar un `INVALID_VERDICT`).
3. Reglas del Tutor: solo inglés, una pregunta por mensaje, sin enseñar la respuesta modelo, un `warning` una sola vez, y preguntar antes de `replace: true`.

## Resultado

| Comprobación | Resultado |
|---|---|
| El Power se instala y las 6 herramientas y la skill están disponibles | Pasó |
| `find_ghosts` sobre lukeed/sirv | Pasó: 5 fantasmas, de fácil a difícil, `suggested: bench/static.js`, `hauntedShare: 1` |
| `pick_ghost` | Pasó: paso `explaining` con el texto real del archivo leído de GitHub |
| Explicación y `send_event` `explanation-done` | Pasó: paso `asking` |
| "I don't know" una vez | Pasó: paso `simplifying`, explicación más simple con otra analogía y la misma pregunta otra vez |
| Un `INVALID_VERDICT` (Verdict_Retry) | Pasó: ver el mensaje exacto más abajo. Con `triesLeft: 2`; al reenviar sin el punto, la respuesta fue aceptada |
| El Tutor escribió solo en inglés | Pasó. Ojo: el Student contestó una vez en español y el Tutor le pidió inglés (el Power no impone el idioma del Student) |
| Una pregunta por mensaje | Pasó (tres preguntas, cada una sola en su mensaje, con el juicio de la anterior delante) |
| No enseñar la respuesta modelo | Pasó, pero **no se probó de verdad**: el paso `model-answer` no apareció, porque hace falta un segundo "I don't know" en la misma pregunta |
| El `warning` solo una vez | **No probado**: ninguna respuesta trajo `warning` |
| Preguntar antes de `replace: true` | Pasó a medias: el Tutor preguntó (continuar, empezar de nuevo o parar) y Luis Miguel contestó "stop". `replace: true` nunca se envió y `continue_house` tampoco |
| Exorcizar un fantasma de principio a fin | **No pasó**: el fantasma quedó en `failed` (1 buena de 3: wrong, wrong, right; hacen falta 2). El paso `self-check` y `house-clean` no se vieron |

Respuestas del Student (para entender el resultado): P1 "in a database." (wrong); P2 primero "I don't know", luego una respuesta en español sobre un logger y `--quiet`, que no están en este archivo (parecen de `packages/sirv-cli`; wrong); P3 "a message like not found" (right).

## Mensajes exactos

Veredicto con punto final (`VERDICT: wrong.`), respuesta de `judge_answer`:

```
Your judgement was not accepted. The last line must be exactly one of: VERDICT: right, VERDICT: half-right, VERDICT: wrong, VERDICT: dont-know.
Write the judgement again (do not ask the Student again). Allowed last lines:
VERDICT: right | VERDICT: half-right | VERDICT: wrong | VERDICT: dont-know
Tries left: 2.
```

El JSON de esa respuesta: `{"ok":false,"code":"INVALID_VERDICT", ... ,"step":"asking","allowedEvents":["answer-rated","dont-know","leave-ghost"],"retry":true,"triesLeft":2}`.

Primera llamada a `pick_ghost` (la cancelaron antes de aprobarla):

```
The tool call was cancelled before it was approved.
```

Fin del ghost, respuesta de `judge_answer` tras la tercera pregunta: `The ghost stays haunted for now. Let the Student choose: try the same ghost again after a new explanation (send_event with retry-ghost), or pick another ghost (pick_ghost).` (`step: "failed"`, `allowedEvents: ["retry-ghost","pick-ghost"]`).

## Cosas que se vieron por el camino

- Kiro IDE pide aprobación en cada llamada a una herramienta del Power (una llamada se canceló sin aprobar). Esto contesta el Low de "Allow" de `PLAN.md` solo en parte: no se probó si hay forma de marcar el Power como de confianza.
- La pregunta de la skill "does the Student know Java?" es de sí o no; Luis Miguel contestó "I don't know" y el Tutor lo tomó como `false`. La skill no dice qué hacer con esa respuesta.
- Los tres veredictos de la prueba (wrong, wrong, right) dejaron el fantasma en `failed` aunque la 3.ª pregunta fuera `right`: es lo que pide el motor (mínimo 2 buenas de 3), no un fallo.

## Qué falta para cerrar la 11.1

Una segunda ronda corta, sin cambiar código: (a) dos "I don't know" seguidos en la misma pregunta, para ver el paso `model-answer`; (b) dos buenas respuestas, para llegar a `self-check` y a `house-clean`; (c) un `continue_house` y un `find_ghosts` con `replace: true` después de un "yes" claro; (d) forzar un `warning` si hay manera (por ejemplo, una carpeta de datos sin permiso de escritura).

## Segunda ronda de la 11.1 (17 nov 2026)
Misma instalación (Power desde GitHub `main`), sin cambiar código. Luis Miguel contestó bien; el Tutor siguió la skill. Sin `replace: true`.

| Comprobación | Resultado |
|---|---|
| `continue_house` sobre lukeed/sirv (`knowsJava: false`) | **Pasó.** Mensaje: "Continuing the saved house of lukeed/sirv. Exorcised ghosts stay exorcised; an unfinished attempt starts again." Paso `choosing`, `hauntedShare: 1`, `bench/static.js` otra vez en la lista (el intento fallado se reinició) |
| `pick_ghost` `builder.js` | Pasó: paso `explaining` con el texto real del archivo |
| Tres preguntas, una por mensaje, con juicio en inglés | Pasó: P1 `right`, P2 `right`, P3 `half-right` |
| Respuesta modelo (`model-answer`) | **No apareció y no se probó.** No hubo ningún "I don't know"; solo se comprobó que nunca se mostró antes de tiempo |
| `warning` | **No apareció.** Ninguna respuesta de herramienta trajo `warning` |
| `self-check` | **Pasó.** Tras la 3.ª pregunta, la herramienta dijo "The ghost is exorcised" y pidió el autojuicio; `hauntedShare` bajó de 1 a 0.8. El Student contestó "yes" y `send_event` `self-check-answered` devolvió el paso `choosing` con 4 fantasmas |
| `house-clean` | No se llegó (quedan 4 fantasmas) |
| `replace: true` tras un "yes" claro | No se probó (la orden era no usarlo) |

Notas:
- La 3.ª pregunta preguntaba qué pasa si `bundt` no está instalado. El Student dijo que se imprime `ERROR`. Probablemente no es así: la búsqueda de `bundt` (`require.resolve`) está fuera del bloque que captura errores, así que Node muestra su propio error. El Tutor lo juzgó `half-right`. Con 2 `right` ya bastaba para exorcizar.
- Las preguntas pedidas por el motor fueron: qué hace el archivo, qué entra y sale, y cuándo falla.

## Qué sigue faltando para cerrar la 11.1
(a) `model-answer`: dos "I don't know" seguidos en la misma pregunta. (b) `warning`, si hay manera de forzarlo. (c) `house-clean`: exorcizar los 4 fantasmas que quedan. (d) `find_ghosts` con `replace: true` tras un "yes" claro. La 11.1 sigue sin marcar.
## Tarea 11.2: repetir una llamada en la misma instalación

Misma instalación que la 11.1 (desde GitHub `main`), mismo día. Segunda llamada a `find_ghosts` con `url: "https://github.com/lukeed/sirv"` y `knowsJava: false`, sin `replace`. Resultado: **pasó**; la herramienta no pisó el progreso y devolvió `DATA_EXISTS`:

```
A saved house already exists for this repository (file "haunted-repo--lukeed@sirv.json"). Use continue_house to continue it. Ask the Student before calling find_ghosts again with replace: true, which replaces the saved ghosts and progress of this repository.
```

JSON: `{"ok":false,"code":"DATA_EXISTS","message":"..."}`. El archivo guardado tiene el nombre con el repositorio (`haunted-repo--lukeed@sirv.json`), como pide el requisito 7.11.

## Tercera ronda de la 11.1 (17 nov 2026)
Misma instalación (Power desde GitHub `main`), sin cambiar código. Luis Miguel contestó según el guion: dos "I don't know" seguidos en la pregunta 1, y bien las otras dos. Sin `replace: true`.
| Comprobación | Resultado |
|---|---|
| `continue_house` sobre lukeed/sirv (`knowsJava: false`), sin `replace` | **Pasó.** Paso `choosing`, `hauntedShare: 0.8` (un fantasma exorcizado antes, `builder.js`), 4 fantasmas en la lista |
| `pick_ghost` `packages/sirv-cli/bin.js` | Pasó: paso `explaining` con el texto real del archivo |
| Primer "I don't know" (P1, pregunta principal) | Pasó: paso `simplifying`, explicación más simple con otra analogía (un mando de televisión) y la misma pregunta |
| Segundo "I don't know" seguido en la misma pregunta | **Pasó: apareció el paso `model-answer`**, solo después del segundo y nunca antes. El Tutor escribió la respuesta modelo y `send_event` `explanation-done` pasó a la pregunta 2 |
| P2 (qué partes usa y en qué orden), P3 (qué pasa si `index.js` falla) | Pasaron: las dos `right`, una pregunta por mensaje, juicio con la línea `VERDICT:` al final |
| Resultado del fantasma | Paso `failed`, con 2 `right` de 3 (ver la nota de abajo). `hauntedShare` se quedó en 0.8. No se vio `self-check` en esta ronda (ya se vio en la segunda) |
| `warning` | **No apareció y no se pudo probar.** La skill no tiene ninguna forma de provocarlo: solo dice cómo avisar si llega. Según el código, sale cuando no hay carpeta de datos con permiso de escritura (`MEMORY_MODE_WARNING`) o falla un guardado (`saveFailedWarning`); eso depende del entorno, no de lo que haga el Student |
| `house-clean` | No se llegó (quedan 4 fantasmas) |
| `replace: true` tras un "yes" claro | No se probó (la orden era no usarlo) |
| El Tutor escribe solo en inglés | Pasó para el Tutor. El Student contestó la P3 en español y esta vez el Tutor la aceptó sin pedir inglés (en la primera ronda sí lo pidió): la skill no fija qué hacer |
Notas:
- El fantasma quedó en `failed` aunque hubo 2 `right` de 3. No es un fallo: en el motor, el segundo "I don't know" en la misma pregunta se guarda como `wrong` (`engine.ts`), la P1 es la pregunta principal, y `decide` exige que la principal no sea `wrong`. Coincide con `product.md`. Para el Student puede sorprender.
- Antes de empezar se cargaron a mano los esquemas de `pick_ghost`, `send_event` y `judge_answer`, así que no volvió a salir el error "has not been loaded yet".
## Qué queda sin ver tras la tercera ronda
`warning` (sin forma de provocarlo), `house-clean` y `replace: true` tras un "yes" claro. La 11.1 se marca porque `model-answer` apareció y funcionó, que era lo que faltaba de las rondas anteriores; esas tres comprobaciones siguen **sin probarse**.