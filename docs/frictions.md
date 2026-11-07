# Fricciones

Registro de lo que se ha atascado durante el proyecto: fallos, limitaciones y rodeos.

Sirve de material para el texto de Devpost sobre el uso de Kiro y para el feedback al equipo de Kiro.

Regla: una entrada el mismo día que ocurre. Si no se anota en el momento, se pierde.

Formato de cada entrada: qué intentaba, qué pasó, cómo lo rodeé, y si sigue abierto.

## 2026-11-06 — El formato de un Kiro Power no está claro en la documentación

- **Qué intentaba:** fijar en `tech.md` cómo se empaqueta el proyecto como Kiro Power.

- **Qué pasó:** la documentación describe un Power como instrucciones + herramientas MCP + steering opcional, pero no se pudo leer la página completa del formato.

- **Cómo lo rodeé:** dejar el formato sin fijar y decidirlo en la spec "empaquetar como Kiro Power".

- **Estado:** abierto.

## 2026-11-06 — La regla de testing choca con que la IA es el Kiro del usuario

- **Qué intentaba:** cumplir la regla de `.kiro/steering/testing.md` de probar todo servicio externo contra el servicio real.

- **Qué pasó:** la IA que explica y pregunta es el Kiro de cada usuario, y un test automático no puede invocarla.

- **Cómo lo rodeé:** excepción anotada en `docs/decisiones.md`; se cubre con el spike manual (punto 3 de `PLAN.md`).

- **Estado:** resuelto con excepción.

## 2026-11-06 — Un hook por guardado no distingue quién escribió el archivo

- **Qué intentaba:** marcar como "fantasma" el código escrito por la IA mediante un hook de Kiro.

- **Qué pasó:** un disparador por guardado marcaría también los archivos editados a mano, que es justo lo contrario de lo que mide el proyecto.

- **Cómo lo rodeé:** no fijar el disparador todavía; se decide en la spec de detección de fantasmas.

- **Estado:** abierto.

## 2026-11-06 — PowerShell rompió el cuerpo del PR por el carácter `#`

- **Qué intentaba:** crear un pull request con `gh pr create --body`, pasando el cuerpo como texto con varias líneas que empezaban por `#`.

- **Qué pasó:** PowerShell interpretó el `#` como comentario y partió el texto, así que `gh` recibió argumentos sueltos y falló.

- **Cómo lo rodeé:** escribir el cuerpo en un archivo temporal y pasarlo con `gh pr create --body-file`, borrando el archivo después.

- **Estado:** resuelto.
