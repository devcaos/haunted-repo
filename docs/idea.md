# Haunted Repo: la idea

## Cambios desde la idea inicial (13 nov)
- Los fantasmas ya no los marca un hook: Haunted Repo elige hasta 5 archivos clave de un repo público de GitHub y los ordena de fácil a difícil.
- La casa tiene tres plantas (desván, planta media y sótano); se quitaron las habitaciones por carpeta.
- La demo usa el repo público lukeed/sirv (licencia MIT, hay que mostrar su aviso), no un repo nuevo.
- El certificado de exorcismo sigue fuera de alcance (ver "Pendientes" de PLAN.md).

Documento de partida. Lo usa Kiro para generar `.kiro/steering/product.md` y `tech.md`, y lo lee el coordinador de Claude.

## En una frase
Haunted Repo elige los archivos clave de tu repo que todavía no entiendes (los "fantasmas") y te ayuda a "exorcizarlos" entendiéndolos de verdad, con explicaciones y preguntas.

## El problema
- Cada vez más gente construye software dirigiendo a una IA. El código funciona, pero nadie lo ha leído ni lo entiende.
- A esto se le llama **comprehension debt** (deuda de comprensión): la distancia entre el código que tiene un proyecto y el que alguien entiende. Fuentes: Addy Osmani (addyosmani.com/blog/comprehension-debt) y O'Reilly Radar.
- Según esas fuentes, no existe ninguna herramienta que **mida** esa comprensión. Ese es el hueco.
- Origen real: en mi proyecto anterior (Duly, otro hackathon) nadie leía el código que hacía la IA. Soy estudiante de 1.º de DAM, vengo de Derecho, y dirijo a una IA que programa por mí.

## Para quién (público concreto)
1. **Público principal:** principiantes que hacen proyectos con IA sin entender el código (por ejemplo, estudiantes de 1.º de FP). Primero van las explicaciones, con palabras sencillas, y las preguntas son sobre comportamiento.
2. **Secundario:** cualquiera que programe dirigiendo agentes (vibe coding).
3. **Idea para más adelante, no en esta versión:** profesores que quieren saber si el alumno entiende el código que entrega, con el "certificado de exorcismo" (descartado para la entrega el 19 nov; ver `docs/decisiones.md`).

## Cómo funciona (concepto)
- El repo es una **casa encantada** con tres plantas: desván (fácil), planta media y sótano (difícil). No hay una habitación por carpeta. La web la dibuja como una ilustración SVG (`house-scene.svg`) con aspecto de videojuego (estilo Halloween, con animación y un diseño de fantasma distinto para cada planta), decidido el 16 nov.
- Los **fantasmas** son los archivos clave que elige la detección (hasta 5, de fácil a difícil). La detección no sabe quién escribió cada archivo: el caso típico es código hecho por una IA que nadie ha leído, pero vale para cualquier código. Un fantasma por archivo, no por línea.
- Para exorcizar un fantasma: explicación para principiantes y **preguntas que hacen pensar** (abiertas o de predecir qué devuelve el código), corregidas por la IA. Si las superas, el fantasma desaparece.
- Un mapa muestra cuánta parte del proyecto está encantada.

## Piezas previstas
- **Kiro Power** (paquete instalable de Kiro con herramientas MCP e instrucciones): la herramienta real. La IA que explica y corrige es la del Kiro de cada usuario, así que no hay APIs de pago.
- **Detección de fantasmas** (cambio del 2026-11-11, ver `docs/decisiones.md`): hasta 5 archivos clave de un repo público de GitHub, de fácil a difícil, en tres plantas. Sustituye al hook de Kiro que marcaba cada archivo escrito por el agente.
- **Web de demostración estática** con un repo de ejemplo ya "encantado" y preguntas ya generadas, para que el jurado pruebe sin instalar nada. Las bases exigen una aplicación que funcione en un enlace público, gratis hasta el 29 ene 2027.

## Categoría
Decidida: **Costume Contest** (interfaz de terror que ayuda a la función).

## Riesgos conocidos
1. "Nadie quiere deberes": por eso el público principal son principiantes que hacen proyectos con IA y necesitan entender su código (cambio del 11 nov; antes eran estudiantes y profesores).
2. Que las preguntas no midan comprensión de verdad. **Probarlo lo primero** (spike).
3. La demo necesita una web, aparte del Power.
4. Ya existen modos de "explicar código". La diferencia: medir y seguir qué partes entiendes.
5. Decisiones técnicas: qué cuenta como fantasma, qué pasa cuando el código cambia.
6. Costume Contest exige diseño excelente.

## Reglas de Kiroween que afectan a la idea
- La demo se abre sobre el repo público lukeed/sirv (licencia MIT), no sobre un repo nuevo. No usar código de Duly en público.
- Sin marcas ni música de terceros en el vídeo.
- Objetivo realista: Best Student Project de la categoría. Elegible confirmado en Discussions (la FP cuenta).
