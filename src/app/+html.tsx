import {ScrollViewStyleReset} from 'expo-router/html';
import type {PropsWithChildren} from 'react';

/** Expo Router SDK 57 custom web document for every statically exported route.
 * Expo injects the RN Web CSS, assets and hydration scripts into this HTML.
 * Keep native <html>/<head>/<body>, not non-existent Html/Head exports.
 */
export default function NexoHtml({children}:PropsWithChildren){
 return (
  <html lang="es-MX">
   <head>
    <meta charSet="utf-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/>
    <meta name="theme-color" content="#0B0E13"/>
    <meta name="application-name" content="Nexo"/>
    <meta name="mobile-web-app-capable" content="yes"/>
    <meta name="apple-mobile-web-app-capable" content="yes"/>
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
    <meta name="apple-mobile-web-app-title" content="Nexo"/>
    <link rel="manifest" href="/nexo-app/manifest.webmanifest"/>
    <link rel="apple-touch-icon" sizes="192x192" href="/nexo-app/icons/nexo-192.png"/>
    <link rel="icon" type="image/png" sizes="192x192" href="/nexo-app/icons/nexo-192.png"/>
    <title>Nexo · Empleos, servicios y productos</title>
    <ScrollViewStyleReset/>
   </head>
   <body>{children}</body>
  </html>
 );
}
