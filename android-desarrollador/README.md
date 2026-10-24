# Nexo Desarrollador — Android

Aplicación Android independiente del marketplace Nexo: nombre y paquete
`com.nexo.desarrollador` propios. Abre exclusivamente el origen HTTPS
`https://armentamarcos61-png.github.io/nexo-app/desarrollador/`, cuya API
se autentica en Supabase y controla el Nexo original.

El APK publicado como **vista previa / debug** está firmado con una clave de
pruebas de GitHub Actions (no apta como clave estable para Google Play). Las
actualizaciones APK con claves debug diferentes pueden requerir desinstalar
la anterior. Para uso continuo es preferible instalar la PWA desde Chrome;
no almacena el panel en caché, tiene su propio icono y se actualiza sola.

No hay credenciales administrativas ni claves privadas en el APK. Solo se
permite navegación interna HTTPS al sitio oficial de desarrolladores; los
vínculos externos se abren con el navegador habitual. No ignora errores TLS.
Se solicita permiso de micrófono únicamente cuando la página confiable lo usa.

Para construir localmente, instalar JDK 17, Android SDK 35 y Gradle 8.10+.
Crear iconos: `node scripts/build-nexo-pwa-icons.cjs` y
`node scripts/build-nexo-developer-pwa.cjs public`, copiar el PNG de 512
a `app/src/main/res/drawable/developer_icon.png`, y ejecutar
`gradle assembleDebug` desde esta carpeta.
