package mw.malawihub.teacher;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.media.projection.MediaProjectionManager;
import android.os.Build;
import android.graphics.Color;
import android.os.Bundle;
import android.os.Handler;
import android.view.Gravity;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import org.json.JSONObject;

public class MainActivity extends Activity {
    private static final int SCREEN_CAPTURE_REQUEST=7001;
    private static final String TEACHER_URL = "https://malawihub.pages.dev/online-class/teacher-portal.html";
    private WebView webView; private ProgressBar progress; private final Handler handler=new Handler();
    private NativeScreenShareManager nativeScreen;
    @Override protected void onCreate(Bundle state){super.onCreate(state);showBrandedSplash();handler.postDelayed(this::openTeacher,1200);}
    private void showBrandedSplash(){
        LinearLayout splash=new LinearLayout(this);splash.setOrientation(LinearLayout.VERTICAL);splash.setGravity(Gravity.CENTER);splash.setPadding(32,32,32,32);splash.setBackgroundColor(Color.WHITE);
        ImageView logo=new ImageView(this);logo.setImageResource(R.drawable.malawihub_logo);logo.setContentDescription("MalawiHub logo");splash.addView(logo,new LinearLayout.LayoutParams(150,150));
        TextView brand=text("MalawiHub",30,Color.rgb(17,17,17));brand.setTypeface(null,android.graphics.Typeface.BOLD);LinearLayout.LayoutParams bp=new LinearLayout.LayoutParams(-1,-2);bp.topMargin=18;splash.addView(brand,bp);
        TextView portal=text("TEACHER PORTAL",15,Color.rgb(233,29,37));portal.setTypeface(null,android.graphics.Typeface.BOLD);splash.addView(portal,new LinearLayout.LayoutParams(-1,-2));
        TextView status=text("Secure Online Class teacher access",14,Color.DKGRAY);LinearLayout.LayoutParams sp=new LinearLayout.LayoutParams(-1,-2);sp.topMargin=28;splash.addView(status,sp);setContentView(splash);
    }
    private TextView text(String s,float size,int color){TextView t=new TextView(this);t.setText(s);t.setTextSize(size);t.setTextColor(color);t.setGravity(Gravity.CENTER);return t;}
    private void openTeacher(){
        LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setBackgroundColor(Color.WHITE);progress=new ProgressBar(this);progress.setIndeterminate(true);root.addView(progress,new LinearLayout.LayoutParams(-1,6));webView=new WebView(this);root.addView(webView,new LinearLayout.LayoutParams(-1,0,1));setContentView(root);
        WebSettings s=webView.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setDatabaseEnabled(true);s.setJavaScriptCanOpenWindowsAutomatically(true);s.setSupportMultipleWindows(false);s.setBuiltInZoomControls(false);s.setDisplayZoomControls(false);s.setAllowFileAccess(false);s.setAllowContentAccess(false);s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        CookieManager c=CookieManager.getInstance();c.setAcceptCookie(true);c.setAcceptThirdPartyCookies(webView,true);
        webView.setWebViewClient(new WebViewClient(){@Override public void onPageStarted(WebView v,String u,android.graphics.Bitmap b){progress.setVisibility(View.VISIBLE);}@Override public void onPageFinished(WebView v,String u){progress.setVisibility(View.GONE);}@Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){return false;}@Override public void onReceivedError(WebView v,WebResourceRequest r,android.webkit.WebResourceError e){if(r.isForMainFrame())showError();}});nativeScreen=new NativeScreenShareManager(this,new NativeScreenShareManager.SignalBridge(){
            @Override public void send(JSONObject payload){ runOnUiThread(()->{ if(webView!=null) webView.evaluateJavascript("window.__malawiNativeSend("+JSONObject.quote(payload.toString())+");",null); }); }
            @Override public void status(String text){ runOnUiThread(()->{ if(webView!=null) webView.evaluateJavascript("window.__malawiNativeStatus("+JSONObject.quote(text)+");",null); }); }
        });
        webView.setWebChromeClient(new WebChromeClient(){
            @Override public void onPermissionRequest(final android.webkit.PermissionRequest request){
                runOnUiThread(()->{
                    if(request.getOrigin()!=null && request.getOrigin().toString().startsWith("https://malawihub.pages.dev/")){
                        request.grant(request.getResources());
                    } else request.deny();
                });
            }
        });
        requestMediaPermissions();
        webView.addJavascriptInterface(new Object(){
            @android.webkit.JavascriptInterface public void requestNativeScreenShare(String roomCode,String nativeId){
                runOnUiThread(()->{
                    if(nativeScreen!=null&&nativeScreen.isActive()){nativeScreen.stop();return;}
                    getIntent().putExtra("native_room",roomCode);
                    getIntent().putExtra("native_id",nativeId);
                    MediaProjectionManager m=(MediaProjectionManager)getSystemService(MEDIA_PROJECTION_SERVICE);
                    startActivityForResult(m.createScreenCaptureIntent(),SCREEN_CAPTURE_REQUEST);
                });
            }
            @android.webkit.JavascriptInterface public void nativeStudentJoined(String id){if(nativeScreen!=null)nativeScreen.studentJoined(id);}
            @android.webkit.JavascriptInterface public void nativeSignal(String json){try{if(nativeScreen!=null)nativeScreen.signal(new JSONObject(json));}catch(Exception ignored){}}
        },"MalawiHubNative");
        loadTeacherUrlAfterPermissions();
    }
    private void requestMediaPermissions(){\n        if(Build.VERSION.SDK_INT>=23){\n            boolean camera=checkSelfPermission(android.Manifest.permission.CAMERA)==PackageManager.PERMISSION_GRANTED;\n            boolean mic=checkSelfPermission(android.Manifest.permission.RECORD_AUDIO)==PackageManager.PERMISSION_GRANTED;\n            if(!camera||!mic){requestPermissions(new String[]{android.Manifest.permission.CAMERA,android.Manifest.permission.RECORD_AUDIO},7002);return;}\n        }\n        loadTeacherUrlAfterPermissions();\n    }\n    private void loadTeacherUrlAfterPermissions(){if(webView!=null && webView.getUrl()==null) webView.loadUrl(TEACHER_URL);}\n    @Override public void onRequestPermissionsResult(int requestCode,String[] permissions,int[] grantResults){super.onRequestPermissionsResult(requestCode,permissions,grantResults);if(requestCode==7002){loadTeacherUrlAfterPermissions();}}\n        private void showError(){TextView m=text("Unable to open MalawiHub Teacher Portal. Check your internet connection and try again.",17,Color.DKGRAY);m.setPadding(40,80,40,40);setContentView(m);}
    
    @Override protected void onActivityResult(int requestCode,int resultCode,Intent data){
        super.onActivityResult(requestCode,resultCode,data);
        if(requestCode==SCREEN_CAPTURE_REQUEST && resultCode==RESULT_OK && data!=null){
            Intent s=new Intent(this,ScreenShareService.class);
            s.putExtra("resultCode",resultCode);s.putExtra("data",data);
            if(Build.VERSION.SDK_INT>=26)startForegroundService(s);else startService(s);
            if(nativeScreen!=null) nativeScreen.start(data,getIntent().getStringExtra("native_room"),getIntent().getStringExtra("native_id"));
        }
    }
    @Override public void onBackPressed(){if(webView!=null&&webView.canGoBack())webView.goBack();else super.onBackPressed();}
    @Override protected void onDestroy(){handler.removeCallbacksAndMessages(null);if(webView!=null){webView.stopLoading();webView.destroy();}super.onDestroy();}
}
