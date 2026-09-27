package mw.malawihub.keyboard;

import android.inputmethodservice.InputMethodService;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.inputmethod.EditorInfo;
import android.view.inputmethod.InputConnection;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.Space;

import java.util.LinkedHashMap;
import java.util.Map;

public class SmartKeyboardService extends InputMethodService {
    private LinearLayout root;
    private boolean shift = false;

    @Override
    public View onCreateInputView() {
        root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(6, 6, 6, 6);
        root.setBackgroundColor(Color.WHITE);

        // Keep the IME compact like a modern Android keyboard so the editor remains visible.
        getWindow().setSoftInputMode(android.view.WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
        buildKeyboard();
        return root;
    }

    private void buildKeyboard() {
        root.removeAllViews();
        addRow("QWERTYUIOP");
        addRow("ASDFGHJKL");
        addRow("ZXCVBNM");
        addBottomRow();
    }

    private void addRow(String letters) {
        LinearLayout row = new LinearLayout(this);
        row.setGravity(Gravity.CENTER);
        row.setWeightSum(letters.length());
        for (char c : letters.toCharArray()) {
            Button b = key(String.valueOf(shift ? c : Character.toLowerCase(c)));
            row.addView(b, new LinearLayout.LayoutParams(0, 48, 1));
        }
        root.addView(row, new LinearLayout.LayoutParams(-1, 50));
    }

    private void addBottomRow() {
        LinearLayout row = new LinearLayout(this);
        row.setGravity(Gravity.CENTER);

        Button shiftKey = key(shift ? "SHIFT" : "shift");
        shiftKey.setOnClickListener(v -> { shift = !shift; buildKeyboard(); });
        row.addView(shiftKey, new LinearLayout.LayoutParams(0, 50, 1.2f));

        Button space = key("space");
        space.setOnClickListener(v -> commit(" "));
        row.addView(space, new LinearLayout.LayoutParams(0, 50, 3.0f));

        Button back = key("⌫");
        back.setOnClickListener(v -> deleteOne());
        row.addView(back, new LinearLayout.LayoutParams(0, 50, 1.2f));

        Button enter = key("↵");
        enter.setOnClickListener(v -> enter());
        row.addView(enter, new LinearLayout.LayoutParams(0, 50, 1.2f));

        root.addView(row, new LinearLayout.LayoutParams(-1, 54));
    }

    private Button key(String label) {
        Button b = new Button(this);
        b.setText(label);
        b.setTextSize(14);
        b.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        b.setAllCaps(false);
        b.setGravity(Gravity.CENTER);
        GradientDrawable bg = new GradientDrawable();
        bg.setColor(Color.rgb(245,245,245));
        bg.setCornerRadius(12);
        b.setBackground(bg);
        b.setOnClickListener(v -> {
            if (!label.equals("shift") && !label.equals("SHIFT") &&
                !label.equals("space") && !label.equals("⌫") && !label.equals("↵")) {
                commit(label);
                shift = false;
                buildKeyboard();
            }
        });
        return b;
    }

    private void commit(String s) {
        InputConnection ic = getCurrentInputConnection();
        if (ic != null) ic.commitText(s, 1);
    }

    private void deleteOne() {
        InputConnection ic = getCurrentInputConnection();
        if (ic == null) return;
        CharSequence selected = ic.getSelectedText(0);
        if (selected != null && selected.length() > 0) {
            ic.commitText("", 1);
            return;
        }
        ic.deleteSurroundingText(1, 0);
    }

    private void enter() {
        InputConnection ic = getCurrentInputConnection();
        if (ic == null) return;
        EditorInfo info = getCurrentInputEditorInfo();
        int action = info == null ? EditorInfo.IME_ACTION_NONE : (info.imeOptions & EditorInfo.IME_MASK_ACTION);
        if (action != EditorInfo.IME_ACTION_NONE && action != EditorInfo.IME_ACTION_UNSPECIFIED) {
            ic.performEditorAction(action);
        } else {
            ic.commitText("\n", 1);
        }
        // Intentionally do not enable shift after Enter: the writer controls capitalization.
    }

    @Override
    public void onStartInput(EditorInfo attribute, boolean restarting) {
        super.onStartInput(attribute, restarting);
        shift = false;
    }
}
