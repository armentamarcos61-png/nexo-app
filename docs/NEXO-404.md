# NEXO-404 — Vista de prueba no disponible

Nombre para el síntoma HTTP 404 en el enlace de Codespaces. No identifica por sí solo la causa.

## Recuperación
1. Abrir el Codespace existente e iniciar sesión con su propietario.
2. Sincronizar los cambios de GitHub conservando cualquier cambio local. No usar reset --hard.
3. Ejecutar `bash scripts/start-preview.sh` desde el repositorio.
4. Abrir el enlace del puerto 8081 en Puertos. La URL depende del Codespace actual.
5. Si Metro responde pero el enlace falla, comprobar el reenvío, la sesión de GitHub y que el Codespace siga activo.

El script conserva el puerto 8081, evita arranques simultáneos y no mata procesos ajenos. Diagnóstico: `.expo/nexo-preview.log`.
No sincroniza Git automáticamente ni modifica publicaciones o borradores.

## Arranque automático
La configuración `.devcontainer/devcontainer.json` instala dependencias al crear el entorno y arranca la vista al iniciar el contenedor.
En Codespaces existentes, los cambios deben sincronizarse y el contenedor debe reconstruirse para aplicar esa configuración.
El arranque automático no mantiene despierto el Codespace ni corrige la autenticación o un enlace de otro Codespace.
El enlace es temporal y no sustituye las aplicaciones Android/iOS.

## Verificación
`/status` confirma que Metro responde localmente. También hay que abrir la app para verificar compilación, reenvío y diseño.
