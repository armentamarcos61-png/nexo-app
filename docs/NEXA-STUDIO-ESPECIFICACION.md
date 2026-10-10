# Nexa Studio 3D — especificación de implementación

**Objetivo:** usar como base visual el nuevo busto Meshy enviado por el propietario de Nexo. Debe seguir siendo un modelo 3D real, manipulable y con las mismas texturas originales; no sustituirlo con una fotografía plana.

## Prompt maestro (arte + animación)

> Personaje virtual femenino llamado Nexa, asistente profesional de Nexo. Mantener el aspecto del busto Meshy aprobado: rostro amable de proporciones estilizadas, ojos violetas naturales y bien alineados, cejas finas, cabello oscuro, gorra y chamarra blanco/negro con la letra N claramente legible en gorra y pecho. Piel mate con detalles suaves, sin brillo metálico ni apariencia de plástico. Iluminación de estudio neutra con un borde violeta sutil. Movimientos coordinados, lentos y discretos: mirada natural independiente de cejas, parpadeo breve y completo usando únicamente párpados, cejas expresivas con amplitud mínima, articulación de labios asociada al periodo real de voz, microgiros de cabeza menores de un grado, gestos suaves de manos al hablar y retorno reposado a posición neutra. Nunca mover el cráneo o deformar mejillas para simular un parpadeo. No crear gestos aleatorios bruscos, duplicar la gorra ni añadir un segundo personaje. Priorizar parecido al material de referencia, rendimiento estable en Android y legibilidad de insignias.

## Trabajo en código
- Nuevo modelo preparado: `Nexa_Studio_Busto_v1.glb`, optimizado con 13 blendshapes; los archivos originales de Meshy estaban en `Meshy_AI_Neon_Nexus_biped.zip`.
- Ubicación de publicación cuando el binario esté disponible: `public/models/Nexa_Studio_Busto_v1.glb`.
- `assistant-stage.web.tsx` usa versión Studio automáticamente **solo si el recurso remoto responde 200**, y mientras tanto muestra el modelo existente (sin 404 visible).
- `nexa-face-rig.ts` separa sonrisa/boca, párpados, 4 direcciones de mirada, cejas y microgesto de cabeza.
- `nexa-animation-controller.ts` en modo voz usa solo clip Talking corporal con transición suave; los tracks de cabeza, cuello, mandíbula y cadera están filtrados.
- El modelo Studio usa sus propias texturas y logos N, no recibe gorra o peluca de la versión antigua.
- La voz de Expo Speech no entrega tiempos de fonemas fiables en todos los navegadores: el movimiento de boca es una aproximación temporal durante habla; no se debe afirmar lip-sync fonético perfecto.

## Control de calidad
- Descargar y analizar GLB 2.0: validar bytes, bufferViews, 13 morph targets, piel y esqueleto.
- Ejercitar a 20/30/60/120 FPS: labios cierran al parar, no hay deriva de cuello, parpadeo completo, movimientos de cejas independientes y valores dentro de [0,1].
- Verificar que no se oculte logo gorra/pecho a tamaño móvil, sin doble gorra o segunda Nexa.
- Verificar WebGL en Android real con vídeo; TypeScript, lint y compilación de la web **no sustituyen** esa prueba visual.
- No cerrar incidencia de fidelidad (#20) hasta revisar la imagen final y los movimientos reales con el usuario.

**Estado de integración:** el archivo binario Studio fue generado a partir del ZIP adjunto a la conversación, pero todavía no está subido al repositorio: las herramientas de GitHub disponibles en este entorno no aceptan una ruta de archivo local para cargar binarios. El visor ha quedado listo para adoptarlo cuando exista en `public/models`; no afirmar que el reemplazo visual Studio ya está en GitHub Pages antes de comprobar el archivo remoto.
