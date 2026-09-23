package mw.malawihub.student;

import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.os.Handler;
import android.view.Gravity;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.media.AudioManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

public class MainActivity extends Activity {
    private static final String STUDENT_URL = "https://malawihub.pages.dev/student-portal/index.html?v=20260923-student-mic2";
    private WebView webView;
    private ProgressBar progress;
    private android.webkit.ValueCallback<android.net.Uri[]> fileCallback;
    private static final int FILE_PICK_REQUEST=8001;
    private final Handler handler = new Handler();

    @Override protected void onCreate(Bundle state) { super.onCreate(state); showBrandedSplash(); handler.postDelayed(this::requestAppPermissions, 1200); }
    private void showBrandedSplash() { LinearLayout splash=new LinearLayout(this); splash.setOrientation(LinearLayout.VERTICAL); splash.setGravity(Gravity.CENTER); splash.setPadding(32,32,32,32); splash.setBackgroundColor(Color.WHITE); ImageView logo=new ImageView(this); logo.setImageResource(R.drawable.malawihub_logo); logo.setContentDescription("MalawiHub logo"); splash.addView(logo,new LinearLayout.LayoutParams(150,150)); TextView brand=text("MalawiHub",30,Color.rgb(17,17,17)); brand.setTypeface(null,android.graphics.Typeface.BOLD); LinearLayout.LayoutParams bp=new LinearLayout.LayoutParams(-1,-2); bp.topMargin=18; splash.addView(brand,bp); TextView portal=text("STUDENT PORTAL",15,Color.rgb(233,29,37)); portal.setTypeface(null,android.graphics.Typeface.BOLD); splash.addView(portal,new LinearLayout.LayoutParams(-1,-2)); TextView status=text("Secure Online Class student access",14,Color.DKGRAY); LinearLayout.LayoutParams sp=new LinearLayout.LayoutParams(-1,-2); sp.topMargin=28; splash.addView(status,sp); setContentView(splash); }
    private TextView text(String s,float size,int color){TextView t=new TextView(this);t.setText(s);t.setTextSize(size);t.setTextColor(color);t.setGravity(Gravity.CENTER);return t;}
    private void requestAppPermissions(){ if(android.os.Build.VERSION.SDK_INT>=23){ java.util.ArrayList<String> needed=new java.util.ArrayList<>(); if(checkSelfPermission(android.Manifest.permission.CAMERA)!=android.content.pm.PackageManager.PERMISSION_GRANTED) needed.add(android.Manifest.permission.CAMERA); if(checkSelfPermission(android.Manifest.permission.RECORD_AUDIO)!=android.content.pm.PackageManager.PERMISSION_GRANTED) needed.add(android.Manifest.permission.RECORD_AUDIO); if(android.os.Build.VERSION.SDK_INT>=33 && checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)!=android.content.pm.PackageManager.PERMISSION_GRANTED) needed.add(android.Manifest.permission.POST_NOTIFICATIONS); if(!needed.isEmpty()){requestPermissions(needed.toArray(new String[0]),7003);return;} } openStudent(); }
    private void openStudent(){ LinearLayout root=new LinearLayout(this); root.setOrientation(LinearLayout.VERTICAL); root.setBackgroundColor(Color.WHITE); progress=new ProgressBar(this); progress.setIndeterminate(true); root.addView(progress,new LinearLayout.LayoutParams(-1,6)); webView=new WebView(this); root.addView(webView,new LinearLayout.LayoutParams(-1,0,1)); setContentView(root); WebSettings s=webView.getSettings(); s.setJavaScriptEnabled(true); s.setDomStorageEnabled(true); s.setDatabaseEnabled(true); s.setJavaScriptCanOpenWindowsAutomatically(true); s.setSupportMultipleWindows(false); s.setBuiltInZoomControls(false); s.setDisplayZoomControls(false); s.setAllowFileAccess(false); s.setAllowContentAccess(false); s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW); CookieManager c=CookieManager.getInstance(); c.setAcceptCookie(true); c.setAcceptThirdPartyCookies(webView,true); webView.setWebViewClient(new WebViewClient(){@Override public void onPageStarted(WebView v,String u,android.graphics.Bitmap b){progress.setVisibility(View.VISIBLE);}@Override public void onPageFinished(WebView v,String u){progress.setVisibility(View.GONE);}@Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){return false;}@Override public void onReceivedError(WebView v,WebResourceRequest r,android.webkit.WebResourceError e){if(r.isForMainFrame())showError();}}); webView.setWebChromeClient(new WebChromeClient(){ @Override public void onPermissionRequest(final android.webkit.PermissionRequest request){ runOnUiThread(()->{ if(request.getOrigin()!=null && request.getOrigin().toString().startsWith("https://malawihub.pages.dev/")){ boolean micOk=android.os.Build.VERSION.SDK_INT<23 || checkSelfPermission(android.Manifest.permission.RECORD_AUDIO)==android.content.pm.PackageManager.PERMISSION_GRANTED; boolean cameraOk=android.os.Build.VERSION.SDK_INT<23 || checkSelfPermission(android.Manifest.permission.CAMERA)==android.content.pm.PackageManager.PERMISSION_GRANTED; java.util.ArrayList<String> allowed=new java.util.ArrayList<>(); for(String resource:request.getResources()){ if(android.webkit.PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)&&micOk) allowed.add(resource); if(android.webkit.PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)&&cameraOk) allowed.add(resource); } if(!allowed.isEmpty()) request.grant(allowed.toArray(new String[0])); else request.deny(); } else request.deny(); }); } @Override public boolean onShowFileChooser(WebView view, android.webkit.ValueCallback<android.net.Uri[]> callback, FileChooserParams params){ if(fileCallback!=null) fileCallback.onReceiveValue(null); fileCallback=callback; try{android.content.Intent i=params.createIntent();startActivityForResult(i,FILE_PICK_REQUEST);return true;}catch(Exception e){fileCallback=null;callback.onReceiveValue(null);return false;} } }); ((AudioManager)getSystemService(AUDIO_SERVICE)).setMode(AudioManager.MODE_IN_COMMUNICATION); webView.loadUrl(STUDENT_URL); }
    @Override protected void onActivityResult(int requestCode,int resultCode,android.content.Intent data){super.onActivityResult(requestCode,resultCode,data);if(requestCode==FILE_PICK_REQUEST&&fileCallback!=null){fileCallback.onReceiveValue(resultCode==RESULT_OK&&data!=null?new android.net.Uri[]{data.getData()}:null);fileCallback=null;}}
    private void showError(){TextView m=text("Unable to open MalawiHub Student Portal. Check your internet connection and try again.",17,Color.DKGRAY);m.setPadding(40,80,40,40);setContentView(m);}
    @Override public void onRequestPermissionsResult(int requestCode,String[] permissions,int[] grantResults){ super.onRequestPermissionsResult(requestCode,permissions,grantResults); if(requestCode==7003){ boolean mic=android.os.Build.VERSION.SDK_INT<23 || checkSelfPermission(android.Manifest.permission.RECORD_AUDIO)==android.content.pm.PackageManager.PERMISSION_GRANTED; if(mic) openStudent(); else { TextView m=text("Microphone permission is required for MalawiHub Live Class. Open Android Settings > Apps > student > Permissions and allow Microphone, then reopen the app.",16,Color.DKGRAY); m.setPadding(32,60,32,40); setContentView(m); } } }
    @Override public void onBackPressed(){if(webView!=null&&webView.canGoBack())webView.goBack();else super.onBackPressed();}
    @Override protected void onDestroy(){handler.removeCallbacksAndMessages(null);if(webView!=null){webView.stopLoading();webView.destroy();}super.onDestroy();}
}
