package mw.malawihub.admin;

import android.app.Activity;
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

public class MainActivity extends Activity {
    private static final String ADMIN_URL = "https://malawihub.pages.dev/admin/login.html?v=20260920-adminapp6";
    private WebView webView;
    private ProgressBar progress;
    private final Handler handler = new Handler();

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
        webView.setWebChromeClient(new WebChromeClient());
        webView.loadUrl(ADMIN_URL);
    }

    private void showError() {
        TextView message=new TextView(this);
        message.setText("Unable to open MalawiHub Admin. Check your internet connection and try again.");
        message.setTextSize(17);
        message.setTextColor(Color.DKGRAY);
        message.setGravity(Gravity.CENTER);
        message.setPadding(40,80,40,40);
        setContentView(message);
    }

    @Override public void onBackPressed() {
        if(webView!=null&&webView.canGoBack()) webView.goBack(); else super.onBackPressed();
    }

    @Override protected void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        if(webView!=null){webView.stopLoading();webView.destroy();}
        super.onDestroy();
    }
}
