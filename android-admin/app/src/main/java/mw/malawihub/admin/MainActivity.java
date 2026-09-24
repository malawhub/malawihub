package mw.malawihub.admin;

import android.app.Activity;
import android.graphics.Color;
import android.media.AudioManager;
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
    private static final String ADMIN_URL = "https://malawihub.pages.dev/admin/login.html?v=20260924-audio-duplex3";
    private WebView webView;
    private ProgressBar progress;
    private android.webkit.ValueCallback<android.net.Uri[]> fileCallback;
    private static final int FILE_PICK_REQUEST=8001;
    private final Handler handler = new Handler();
    private NativeScreenShareManager nativeScreen;

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        showBrandedSplash();
        handler.postDelayed(this::openAdmin, 1200);
    }

    private void showBrandedSplash() {
        LinearLayout splash = new LinearLayout(this);
        splash.setOrientation(LinearLayout.VERTICAL);
        splash.setGravity(Gravity.CENTER);
        splash.setPadding(32,32,32,32);
        splash.setBackgroundColor(Color.WHITE);

        ImageView logo = new ImageView(this);
        logo.setImageResource(R.drawable.malawihub_logo);
        logo.setContentDescription("MalawiHub logo");
        splash.addView(logo, new LinearLayout.LayoutParams(150,150));

        TextView brand = new TextView(this);
        brand.setText("MalawiHub");
        brand.setTextSize(30);
        brand.setTextColor(Color.rgb(17,17,17));
        brand.setGravity(Gravity.CENTER);
        brand.setTypeface(null, android.graphics.Typeface.BOLD);
        LinearLayout.LayoutParams bp = new LinearLayout.LayoutParams(-1,-2);
        bp.topMargin=18;
        splash.addView(brand,bp);

        TextView admin = new TextView(this);
        admin.setText("ADMIN");
        admin.setTextSize(15);
        admin.setTextColor(Color.rgb(233,29,37));
        admin.setGravity(Gravity.CENTER);
        admin.setTypeface(null, android.graphics.Typeface.BOLD);
        splash.addView(admin,new LinearLayout.LayoutParams(-1,-2));

        TextView status = new TextView(this);
        status.setText("Secure administrator access");
        status.setTextSize(14);
        status.setTextColor(Color.DKGRAY);
        status.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams sp = new LinearLayout.LayoutParams(-1,-2);
        sp.topMargin=28;
        splash.addView(status,sp);
        setContentView(splash);
    }

    private void openAdmin() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.WHITE);
        progress = new ProgressBar(this);
        progress.setIndeterminate(true);
        root.addView(progress,new LinearLayout.LayoutParams(-1,6));
        webView = new WebView(this);
        root.addView(webView,new LinearLayout.LayoutParams(-1,0,1));
        setContentView(root);

        WebSettings settings=webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        settings.setSupportMultipleWindows(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setLoadWithOverviewMode(false);
        settings.setUseWideViewPort(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        webView.clearCache(true);
        webView.clearHistory();

        CookieManager cookies=CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        cookies.setAcceptThirdPartyCookies(webView,true);

        webView.setWebViewClient(new WebViewClient() {
            @Override public void onPageStarted(WebView view,String url,android.graphics.Bitmap favicon){progress.setVisibility(View.VISIBLE);}
            @Override public void onPageFinished(WebView view,String url){progress.setVisibility(View.GONE);}
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){return false;}
            @Override public void onReceivedError(WebView view,android.webkit.WebResourceRequest request,android.webkit.WebResourceError error){if(request.isForMainFrame())showError();}
        });
        nativeScreen=new NativeScreenShareManager(this,new NativeScreenShareManager.SignalBridge(){
            @Override public void send(JSONObject payload){ runOnUiThread(()->{ if(webView!=null) webView.evaluateJavascript("window.__malawiNativeSend("+JSONObject.quote(payload.toString())+");",null); }); }
            @Override public void status(String text){ runOnUiThread(()->{ if(webView!=null) webView.evaluateJavascript("window.__malawiNativeStatus("+JSONObject.quote(text)+");",null); }); }
        });
        webView.setWebChromeClient(new WebChromeClient(){
            @Override public void onPermissionRequest(final android.webkit.PermissionRequest request){runOnUiThread(()->{if(request.getOrigin()!=null&&request.getOrigin().toString().startsWith("https://malawihub.pages.dev/")){
                boolean micOk=android.os.Build.VERSION.SDK_INT<23 || checkSelfPermission(android.Manifest.permission.RECORD_AUDIO)==android.content.pm.PackageManager.PERMISSION_GRANTED;
                boolean cameraOk=android.os.Build.VERSION.SDK_INT<23 || checkSelfPermission(android.Manifest.permission.CAMERA)==android.content.pm.PackageManager.PERMISSION_GRANTED;
                java.util.ArrayList<String> allowed=new java.util.ArrayList<>();
                for(String resource:request.getResources()){
                    if(android.webkit.PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)&&micOk)allowed.add(resource);
                    if(android.webkit.PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)&&cameraOk)allowed.add(resource);
                }
                if(!allowed.isEmpty())request.grant(allowed.toArray(new String[0]));else request.deny();
            }else request.deny();});}
        });
        requestMediaPermissions();
        webView.addJavascriptInterface(new Object(){
            @android.webkit.JavascriptInterface public void requestNativeScreenShare(String roomCode,String nativeId){runOnUiThread(()->{if(nativeScreen!=null&&nativeScreen.isActive()){nativeScreen.stop();return;}getIntent().putExtra("native_room",roomCode);getIntent().putExtra("native_id",nativeId);android.media.projection.MediaProjectionManager m=(android.media.projection.MediaProjectionManager)getSystemService(MEDIA_PROJECTION_SERVICE);startActivityForResult(m.createScreenCaptureIntent(),7001);});}
            @android.webkit.JavascriptInterface public void nativeStudentJoined(String id){if(nativeScreen!=null)nativeScreen.studentJoined(id);}
            @android.webkit.JavascriptInterface public void nativeSignal(String json){try{if(nativeScreen!=null)nativeScreen.signal(new JSONObject(json));}catch(Exception ignored){}}
        },"MalawiHubNative");
        AudioManager audioManager=(AudioManager)getSystemService(AUDIO_SERVICE);
        audioManager.setMode(AudioManager.MODE_IN_COMMUNICATION);
        audioManager.setSpeakerphoneOn(true);
        loadAdminUrlAfterPermissions();
    }

    private void requestMediaPermissions(){
        if(android.os.Build.VERSION.SDK_INT>=23){
            boolean mic=checkSelfPermission(android.Manifest.permission.RECORD_AUDIO)==android.content.pm.PackageManager.PERMISSION_GRANTED;
            if(!mic){requestPermissions(new String[]{android.Manifest.permission.RECORD_AUDIO},7002);return;}
        }
        loadAdminUrlAfterPermissions();
    }
    private void showMediaPermissionError(){TextView m=new TextView(this);m.setText("Microphone permission is required for MalawiHub Live Class. Open Android Settings > Apps > admin > Permissions and allow Microphone, then reopen the app.");m.setTextSize(16);m.setTextColor(Color.DKGRAY);m.setGravity(Gravity.CENTER);m.setPadding(32,60,32,40);setContentView(m);}
    private void loadAdminUrlAfterPermissions(){if(webView!=null && webView.getUrl()==null) webView.loadUrl(ADMIN_URL);}
    @Override public void onRequestPermissionsResult(int requestCode,String[] permissions,int[] grantResults){super.onRequestPermissionsResult(requestCode,permissions,grantResults);if(requestCode==7002){boolean granted=android.os.Build.VERSION.SDK_INT<23 || checkSelfPermission(android.Manifest.permission.RECORD_AUDIO)==android.content.pm.PackageManager.PERMISSION_GRANTED;if(granted)loadAdminUrlAfterPermissions();else showMediaPermissionError();}}
        private void showError() {
        TextView message=new TextView(this);
        message.setText("Unable to open MalawiHub Admin. Check your internet connection and try again.");
        message.setTextSize(17);
        message.setTextColor(Color.DKGRAY);
        message.setGravity(Gravity.CENTER);
        message.setPadding(40,80,40,40);
        setContentView(message);
    }

    @Override protected void onActivityResult(int requestCode,int resultCode,android.content.Intent data){super.onActivityResult(requestCode,resultCode,data);if(requestCode==FILE_PICK_REQUEST){if(fileCallback!=null){fileCallback.onReceiveValue(resultCode==RESULT_OK&&data!=null?new android.net.Uri[]{data.getData()}:null);fileCallback=null;}return;}if(requestCode==7001&&resultCode==RESULT_OK&&data!=null){android.content.Intent s=new android.content.Intent(this,ScreenShareService.class);if(android.os.Build.VERSION.SDK_INT>=26)startForegroundService(s);else startService(s);if(nativeScreen!=null)nativeScreen.start(data,getIntent().getStringExtra("native_room"),getIntent().getStringExtra("native_id"));}}
    @Override public void onBackPressed() {
        if(webView!=null&&webView.canGoBack()) webView.goBack(); else super.onBackPressed();
    }

    @Override protected void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        if(webView!=null){webView.stopLoading();webView.destroy();}
        super.onDestroy();
    }
}
