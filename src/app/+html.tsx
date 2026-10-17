import { Html, Head, Body } from 'expo-router/html';
import type { ReactNode } from 'react';

/** Expo Router's static document. Head links must be emitted during the
 * static export, not injected after load, for Chrome installability audits.
 */
export default function NexoHtml({children}:{children:ReactNode}){
 return (
  <Html lang="es-MX">
   <Head>
    <meta charSet="utf-8"/>
    <meta name="viewport"
      content="width=device-width,initial-scale=1,viewport-fit=cover"/>
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
   </Head>
   <Body>{children}</Body>
  </Html>
 );
}
