# Nessa · modelo 3D oficial

La pantalla del asistente de Nexo (web, Android e iOS) utiliza **un único archivo**
`public/models/nessa.glb` para la versión femenina del asistente.

El archivo modelo preparado para el proyecto es `Nessa_Unica_Interactiva.glb`
(9 336 320 bytes; glTF 2.0) y debe guardarse con el nombre `nessa.glb` en esta carpeta.

Contiene cinco clips de animación (nombres exactos, sensibles a mayúsculas):
`Idle`, `Walking`, `Running`, `Greeting`, `Talking`.

El visor se ocupa de mezclar las animaciones, interpolar fotogramas y detener el
personaje cuando deja de hablar. El objetivo es **60 FPS** en equipos capaces;
no garantiza una frecuencia fija en todos los teléfonos.

IMPORTANTE: este README no es el modelo ni lo sustituye. Si `nessa.glb`
todavía no está en esta carpeta, el visor presenta la imagen oficial del
asistente como respaldo y **no indica que exista un modelo 3D cargado**.
