package com.nexo.desarrollador;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public final class MainActivity extends Activity {
 private static final String HOME="https://armentamarcos61-png.github.io/nexo-app/desarrollador/";
 private static final String HOST="armentamarcos61-png.github.io";
 private static final String PATH="/nexo-app/desarrollador/";
 private static final int AUDIO_PERMISSION=920;
 private WebView browser;
 private PermissionRequest audioRequest;

 private static boolean isTrustedOrigin(Uri uri) {
  return "https".equalsIgnoreCase(uri.getScheme())
    && HOST.equalsIgnoreCase(uri.getHost());
 }
 private static boolean isTrusted(Uri uri) {
  return isTrustedOrigin(uri)
    && uri.getPath()!=null && uri.getPath().startsWith(PATH);
 }
 private void openExternally(Uri uri) {
  if (!"https".equalsIgnoreCase(uri.getScheme()) && !"mailto".equalsIgnoreCase(uri.getScheme())) return;
  try { startActivity(new Intent(Intent.ACTION_VIEW,uri)); } catch (Exception ignored) {}
 }
 @Override public void onCreate(Bundle state) {
  super.onCreate(state);
  getWindow().setStatusBarColor(android.graphics.Color.rgb(6,19,33));
  getWindow().setNavigationBarColor(android.graphics.Color.rgb(6,19,33));
  WebView.setWebContentsDebuggingEnabled(false);
  browser=new WebView(this);
  browser.setBackgroundColor(android.graphics.Color.rgb(6,19,33));
  WebSettings settings=browser.getSettings();
  settings.setJavaScriptEnabled(true);
  settings.setDomStorageEnabled(true);
  settings.setAllowFileAccess(false);
  settings.setAllowContentAccess(false);
  settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
  settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
  settings.setSupportMultipleWindows(false);
  browser.setWebViewClient(new WebViewClient(){
   @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){
    if(isTrusted(request.getUrl()))return false;
    if(request.isForMainFrame())openExternally(request.getUrl());
    return true;
   }
  });
  browser.setWebChromeClient(new WebChromeClient(){
   @Override public void onPermissionRequest(final PermissionRequest request){
    runOnUiThread(()->{
     Uri origin=request.getOrigin();
     if(!isTrustedOrigin(origin)){request.deny();return;}
     boolean audio=false;
     for(String resource:request.getResources())
      if(PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource))audio=true;
     if(!audio){request.deny();return;}
     if(Build.VERSION.SDK_INT>=23 && checkSelfPermission(Manifest.permission.RECORD_AUDIO)
        !=PackageManager.PERMISSION_GRANTED){
      audioRequest=request;
      requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO},AUDIO_PERMISSION);
     } else request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
    });
   }
  });
  setContentView(browser);
  browser.loadUrl(HOME);
 }
 @Override public void onRequestPermissionsResult(int requestCode,String[] permissions,int[] results){
  super.onRequestPermissionsResult(requestCode,permissions,results);
  if(requestCode!=AUDIO_PERMISSION || audioRequest==null)return;
  if(results.length>0 && results[0]==PackageManager.PERMISSION_GRANTED)
   audioRequest.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
  else audioRequest.deny();
  audioRequest=null;
 }
 @Override public void onBackPressed(){
  if(browser!=null && browser.canGoBack())browser.goBack();
  else super.onBackPressed();
 }
 @Override protected void onDestroy(){
  if(audioRequest!=null){audioRequest.deny();audioRequest=null;}
  if(browser!=null){browser.destroy();browser=null;}
  super.onDestroy();
 }
}
