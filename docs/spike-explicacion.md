# Spike: ¿puede una IA dar a un principiante una visión general de un archivo?

Sustituye el enfoque de `spike-preguntas.md` (preguntas sobre líneas concretas). Resultado de aquel spike: no concluyente, porque Luis Miguel no entendía el código y las preguntas solo le hicieron rendirse.

## Objetivo

Comprobar si una IA, siguiendo un prompt, puede explicar un archivo clave a un principiante (1.º DAM, Java básico, sin JS/TS) en lenguaje llano, de modo que luego sepa responder preguntas de **comportamiento** sobre ese archivo. No se pregunta por líneas concretas ni por detalles de sintaxis.

## Reglas del spike

- El archivo es de Duly. **No se copia al repo.** Solo se anota su nombre, qué hace y fragmentos de 1 o 2 líneas como máximo (regla de Kiroween: no usar código de Duly en público).
- Sobre la carpeta de Duly solo se lee (`Get-ChildItem`, `Get-Content`). No se escribe, mueve, copia ni se ejecuta git o npm allí.
- Kiro hace de guía en el chat y anota las respuestas reales de Luis Miguel, sin corregirlas ni mejorarlas al copiarlas.

## Prompt de la IA de la web

```
You are a patient tutor for a beginner who builds projects with AI
and does not understand the code. The student is in the first year of
vocational training, knows basic Java (variables, loops, conditions)
and does not know JavaScript or TypeScript.
Write everything in Spanish, in simple words.

Rules for the explanation:
- No jargon. If you must use a technical term, define it in one
  sentence with an everyday analogy.
- Explain first WHAT the file does (its job in the project), and only
  then HOW it does it, step by step, in small pieces.
- When you say WHY the code does something, present it as the PROBABLE
  reason, never as a fact ("probablemente...", "seguramente porque...").
- Compare with Java when it helps (for example, a type is like a class
  with only fields).
- Do not ask about specific lines or syntax details.

Rules for the questions:
- After the explanation, ask exactly 3 behavior questions, ONE AT A
  TIME, waiting for my answer before the next one:
  1) What does this file do?
  2) What goes in and what comes out?
  3) When does it fail or what can go wrong?
- If I answer "no lo sé", explain that part again in an easier way
  (new analogy, shorter) and ask the question again.
- After each answer, say if it is right, half right or wrong, and why.
- At the end, ask me if I understood the file: sí / a medias / no.
```

## Criterios de éxito

El spike sale bien si:

- Luis Miguel responde bien (o medio bien) **al menos 2 de las 3** preguntas de comportamiento **después** de la explicación, **y**
- dice que ha entendido el archivo (**sí** o **a medias**), **y**
- la IA no presenta como hecho seguro ningún "por qué" que sea una suposición.

Sale mal si responde bien menos de 2 de 3, o si dice que no ha entendido nada.

## Archivo usado

- Archivo: `lib/types.ts` de Duly (unas 65 líneas). No se ha copiado al repo.
- Qué hace: define el "modelo de datos" del proyecto, es decir, qué campos tiene un documento (factura, seguro, garantía...) y un plazo. No guarda ni calcula nada.
- Por qué este: es corto y enseña de qué va Duly (papeles de casa y sus plazos) sin lógica compleja.
- Ejemplo de fragmento citado: `amount?: number;` (el `?` marca un campo opcional).

## Explicación dada

Kiro la dio en el chat, siguiendo el prompt, en este orden:

1. Primero el "qué": el archivo es la ficha en blanco de los papeles de casa; no guarda nada.
2. Luego el "cómo", en 4 piezas: los tipos de documento y de plazo (comparados con un `enum` de Java), `Deadline`, `Document` (comparado con un objeto que contiene un `ArrayList` de otros), y `ToolResult`.
3. Los "por qué" se dieron como probables ("probablemente es opcional porque...").

## Preguntas y respuestas

| # | Pregunta | Respuesta de Luis Miguel | Valoración |
|---|---|---|---|
| 1 | Qué hace el archivo | "sirve para delimitar los valores y guardarlos?" | A medias. "Delimitar" es correcto; "guardarlos" no (el archivo no guarda nada). |
| 2 | Qué entra y qué sale | "deadline, document, product, toolresult" | Mal. Nombró piezas del archivo, no datos de entrada. La pregunta estaba mal planteada (ver Problemas). |
| 3 | Cuándo falla | Primero: "no lo se". Tras una explicación más fácil (formulario de correos): "si se olvida el tittle lo marca en rojo y dara error, y si falta product no pasa nada porque es opcional" | Bien, pero **solo después** de la segunda explicación. |

## Resultado

- Respuesta final de Luis Miguel a "¿lo has entendido?": **a medias**.
- Sus palabras: la última explicación le ayudó "un poco más" en la pregunta 3; lo que más le costó fue la pregunta 2, "porque la propia pregunta estaba mal planteada".

| Criterio | Estado |
|---|---|
| Al menos 2 de 3 preguntas bien o medio bien tras la explicación | Cumplido por poco: P1 a medias, P3 bien (tras repetir la explicación). P2 mal. Sin la repetición, serían 1 de 3. |
| Dice que entendió el archivo (sí o a medias) | Cumplido: "a medias". |
| La IA no presenta suposiciones como hechos | Cumplido: los "por qué" iban con "probablemente". |

Veredicto: **sale bien, pero justo**. La explicación sola no bastó; funcionó la repetición con una analogía más sencilla.

## Problemas detectados

1. **La pregunta 2 estaba mal planteada.** Un archivo de tipos no es una función, así que "qué entra y qué sale" no encaja. Luis Miguel lo notó. Hay que adaptar las tres preguntas al tipo de archivo (por ejemplo, para un archivo de datos: "para qué sirve", "qué datos lleva una ficha", "qué pasa si falta uno").
2. **Confusión entre "describir" y "guardar".** La primera respuesta mezcló ambas cosas. La explicación debería separar mejor qué archivo define la forma de los datos y qué archivo los guarda.
3. **El "no lo sé" funciona.** Con una analogía nueva y más corta, Luis Miguel acertó. Es el flujo que queremos.
4. **Un solo archivo y un solo alumno.** Un archivo de tipos es de los más fáciles de explicar. No se sabe si funciona con archivos con lógica (bucles, condiciones, expresiones regulares).

## Conclusión

1. Una IA puede dar a un principiante una visión general útil de un archivo, pero necesita una segunda explicación más sencilla cuando el alumno dice "no lo sé".
2. Las preguntas de comportamiento deben ajustarse al tipo de archivo; "qué entra y qué sale" no sirve para todos.
3. Siguiente paso a decidir por Luis Miguel: repetir con un archivo con lógica sencilla (por ejemplo, uno con bucles) antes de construir el flujo completo.
