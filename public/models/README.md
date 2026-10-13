
## Nexa actual · modelo Android con rostro articulado

La pantalla de Nexa ahora carga **Nexa_Android_FacialReady_v1.glb** (12,287,436 bytes) de forma predeterminada.
Se reconstruye sin CDNs a partir de los 50 bloques Base64 en `.nexa-android-parts/`
mediante `node scripts/restore-nexa-android.cjs`. La reconstrucción verifica SHA-256:
`0bfe6d6c385852d1970b0d4e96da0bb51ae05a237098c57142a4b24dac2cff16`.

El GLB conserva exactamente las cinco animaciones originales del nuevo Meshy
Android Prototype: Running, Walking, Confused_Scratch, Skip_Forward y Wave_One_Hand.
El importador añadió trece gestos faciales localizados: MouthOpen, MouthO,
MouthWide, MouthSmile, EyeBlinkLeft, EyeBlinkRight, BrowRaiseLeft, BrowRaiseRight,
BrowFrown, EyeLookLeft, EyeLookRight, EyeLookUp, EyeLookDown.

**No borrar** el busto anterior `Nexa_Studio_Busto_v1.glb` ni el cuerpo
`Nexa_FacialRig_V2.glb` ni la versión ligera `Nexa_Unica_Interactiva.glb`.
Están archivados como respaldo, pero **no se muestran automáticamente** en el
visor. Nexo masculino conserva su propio archivo `Nexo_FacialReady_v1.glb`.

Los movimientos de boca se aproximan al texto y al estado de voz; no hay marcas
fonéticas reales suministradas por el motor TTS. El parpadeo y las miradas
provienen de deformaciones 3D, no imágenes estáticas.

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
