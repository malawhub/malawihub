package mw.malawihub.keyboard;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.provider.Settings;
import android.view.Gravity;
import android.view.inputmethod.InputMethodManager;
import android.content.Context;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

public class MainActivity extends Activity {
    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER);
        root.setPadding(28, 32, 28, 32);
        root.setBackgroundColor(Color.WHITE);

        TextView title = new TextView(this);
        title.setText("MalawiHub Smart Keyboard");
        title.setTextSize(25);
        title.setTextColor(Color.rgb(170, 20, 30));
        title.setGravity(Gravity.CENTER);
        title.setTypeface(null, android.graphics.Typeface.BOLD);
        root.addView(title, new LinearLayout.LayoutParams(-1, -2));

        TextView info = new TextView(this);
        info.setText("To use the keyboard, enable it in Android settings, then select it as your current keyboard. Your typing stays on your device; this keyboard does not need internet access.");
        info.setTextSize(16);
        info.setTextColor(Color.DKGRAY);
        info.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams ip = new LinearLayout.LayoutParams(-1, -2);
        ip.topMargin = 22;
        root.addView(info, ip);

        Button enable = new Button(this);
        enable.setText("Enable MalawiHub Smart Keyboard");
        LinearLayout.LayoutParams ep = new LinearLayout.LayoutParams(-1, -2);
        ep.topMargin = 24;
        root.addView(enable, ep);
        enable.setOnClickListener(v -> {
            try { startActivity(new Intent(Settings.ACTION_INPUT_METHOD_SETTINGS)); }
            catch (Exception ignored) { }
        });

        Button select = new Button(this);
        select.setText("Select keyboard");
        LinearLayout.LayoutParams sp = new LinearLayout.LayoutParams(-1, -2);
        sp.topMargin = 8;
        root.addView(select, sp);
        select.setOnClickListener(v -> {
            InputMethodManager imm = (InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
            if (imm != null) imm.showInputMethodPicker();
        });

        setContentView(root);
    }
}
