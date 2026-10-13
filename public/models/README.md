# Nexa · modelo 3D oficial

La pantalla del asistente de Nexo (web, Android e iOS) utiliza **un único archivo**
`public/models/Nexa_Unica_Interactiva.glb` para la versión femenina del asistente.

El archivo modelo preparado para el proyecto es `Nexa_Unica_Interactiva.glb`
(9 336 320 bytes; glTF 2.0) y debe guardarse con el nombre `Nexa_Unica_Interactiva.glb` en esta carpeta.

Contiene cinco clips de animación (nombres exactos, sensibles a mayúsculas):
`Idle`, `Walking`, `Running`, `Greeting`, `Talking`.

El visor se ocupa de mezclar las animaciones, interpolar fotogramas y detener el
personaje cuando deja de hablar. El objetivo es **60 FPS** en equipos capaces;
no garantiza una frecuencia fija en todos los teléfonos.

IMPORTANTE: este README no es el modelo ni lo sustituye. Si `Nexa_Unica_Interactiva.glb`
todavía no está en esta carpeta, el visor presenta la imagen oficial del
asistente como respaldo y **no indica que exista un modelo 3D cargado**.


## Asistente masculino Nexo

El visor masculino es distinto al de Nexa y espera el recurso
`public/models/Nexo_FacialReady_v1.glb`.
El binario consolidado a partir del ZIP Meshy debe incluir, en **un solo GLB**:

- Los clips originales `Wave_One_Hand`, `Confused_Scratch`, `Running`,
  `Walking`, `walking_2_inplace`.
- Las 13 formas faciales `EyeBlinkLeft`, `EyeBlinkRight`, `EyeLookLeft`,
  `EyeLookRight`, `EyeLookUp`, `EyeLookDown`, `BrowRaiseLeft`,
  `BrowRaiseRight`, `BrowFrown`, `MouthOpen`, `MouthO`,
  `MouthWide`, `MouthSmile`.
- Esqueleto Mixamo, skinning, UV y texturas de la fuente.

Comprobar con `node scripts/verify-nexo-biped.cjs public/models/Nexo_FacialReady_v1.glb`.
Si el archivo todavía no está publicado, el visor muestra la identidad 2D
oficial e incluye un botón para importar el GLB al almacenamiento local del
navegador. Ese respaldo **no debe presentarse como un modelo 3D ya desplegado**.
Los gestos faciales están coordinados con el evento de habla, sin marcas
temporales de fonemas: la boca hace sincronización aproximada, no fonética exacta.

La pantalla «Elige tu asistente» debe permitir alternar Nexa y Nexo sin
reemplazar ni duplicar la malla de uno con la del otro.
