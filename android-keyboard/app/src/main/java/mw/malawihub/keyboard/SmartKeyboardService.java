package mw.malawihub.keyboard;

import android.inputmethodservice.InputMethodService;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.View;
import android.view.inputmethod.EditorInfo;
import android.view.inputmethod.InputConnection;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

/** Offline Android keyboard. No network code or INTERNET permission is used. */
public class SmartKeyboardService extends InputMethodService {
    private static final int ABC = 0, MATH = 1, COMPUTER = 2;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private int layout = ABC;
    private boolean shift = false;
    private boolean capsLock = false;
    private LinearLayout root;

    private final Runnable repeatDelete = new Runnable() {
        @Override public void run() {
            deleteOne();
            handler.postDelayed(this, 65);
        }
    };

    @Override public View onCreateInputView() {
        root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(dp(5), dp(5), dp(5), dp(7));
        root.setBackgroundColor(Color.rgb(25, 37, 30));
        if (getWindow() != null && getWindow().getWindow() != null) {
            getWindow().getWindow().setSoftInputMode(
                android.view.WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
        }
        buildKeyboard();
        return root;
    }

    private void buildKeyboard() {
        if (root == null) return;
        root.removeAllViews();
        addHeader();
        if (layout == ABC) buildAbcLayout();
        else if (layout == MATH) buildMathLayout();
        else buildComputerLayout();
    }

    private String layoutName() {
        if (layout == MATH) return "∑ Mathematical keyboard";
        if (layout == COMPUTER) return "⌨ Computer keyboard";
        return "ABC Normal keyboard";
    }

    private void addHeader() {
        LinearLayout row = new LinearLayout(this);
        row.setGravity(Gravity.CENTER_VERTICAL);
        row.setPadding(dp(2), 0, dp(2), dp(3));
        TextView title = new TextView(this);
        title.setText(layoutName() + " · Offline");
        title.setTextColor(Color.WHITE);
        title.setTextSize(12);
        title.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        title.setGravity(Gravity.CENTER_VERTICAL);
        row.addView(title, new LinearLayout.LayoutParams(0, dp(30), 1));
        Button switchKey = key("⇄", 0.8f, this::switchLayout, "Switch keyboard layout");
        switchKey.setTextSize(20);
        switchKey.setBackground(background(Color.rgb(8, 127, 63)));
        row.addView(switchKey, new LinearLayout.LayoutParams(dp(60), dp(30)));
        root.addView(row, new LinearLayout.LayoutParams(-1, dp(34)));
    }

    private void buildAbcLayout() {
        addRow(new String[]{"1","2","3","4","5","6","7","8","9","0"});
        addRow(new String[]{"q","w","e","r","t","y","u","i","o","p"});
        addRow(new String[]{"a","s","d","f","g","h","j","k","l"});
        addSpecialLetterRow();
        addBottomRow(false);
    }

    private void buildMathLayout() {
        addRow(new String[]{"1","2","3","4","5","6","7","8","9","0"});
        addRow(new String[]{"π","√","∑","∫","∞","≈","≠","≤","≥"});
        addRow(new String[]{"⁰","¹","²","³","⁴","⁵","⁶","⁷","⁸","⁹"});
        addRow(new String[]{"α","β","γ","δ","ε","θ","λ","μ","Ω","ω"});
        addRow(new String[]{"+","−","×","÷","=","(",")","<",">"});
        addBottomRow(true);
    }

    private void buildComputerLayout() {
        addRow(new String[]{"Esc","Tab","Ctrl","Alt","F1","F2","F3","F4"}, true);
        addRow(new String[]{"~","1","2","3","4","5","6","7","8","9","0","-","="});
        addRow(new String[]{"q","w","e","r","t","y","u","i","o","p","[","]","|"});
        addRow(new String[]{"a","s","d","f","g","h","j","k","l",";","'"});
        addComputerLetterRow();
        addComputerBottomRow();
    }

    private void addRow(String[] labels) { addRow(labels, false); }

    private void addRow(String[] labels, boolean compact) {
        LinearLayout row = new LinearLayout(this);
        row.setGravity(Gravity.CENTER);
        int height = compact ? 38 : 43;
        for (String label : labels) {
            float weight = label.length() > 1 ? 1.25f : 1f;
            Button b = key(label, weight, () -> handleTextKey(label), "Type " + label);
            b.setTextSize(compact ? 10 : (layout == MATH ? 17 : 13));
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(0, dp(height), weight);
            lp.setMargins(dp(1), dp(2), dp(1), dp(2));
            row.addView(b, lp);
        }
        root.addView(row, new LinearLayout.LayoutParams(-1, dp(height + 4)));
    }

    private void addSpecialLetterRow() {
        LinearLayout row = new LinearLayout(this);
        row.setGravity(Gravity.CENTER);
        Button shiftKey = makeShiftKey();
        addToRow(row, shiftKey, 1.35f);
        for (String letter : new String[]{"z","x","c","v","b","n","m"}) {
            addToRow(row, key(displayLetter(letter), 1f,
                () -> handleTextKey(letter), "Type " + letter), 1f);
        }
        addBackspace(row, 1.5f);
        root.addView(row, new LinearLayout.LayoutParams(-1, dp(48)));
    }

    private void addComputerLetterRow() {
        LinearLayout row = new LinearLayout(this);
        row.setGravity(Gravity.CENTER);
        addToRow(row, makeShiftKey(), 1.5f);
        for (String letter : new String[]{"z","x","c","v","b","n","m",",",".","/"}) {
            addToRow(row, key(displayLetter(letter), 1f,
                () -> handleTextKey(letter), "Type " + letter), 1f);
        }
        addBackspace(row, 1.5f);
        root.addView(row, new LinearLayout.LayoutParams(-1, dp(48)));
    }

    private Button makeShiftKey() {
        Button b = key(shift || capsLock ? "⇧" : "⬆", 1.35f,
            () -> { shift = !shift; if (capsLock) capsLock = false; buildKeyboard(); },
            "Shift; long press for Caps Lock");
        b.setBackground(background((shift || capsLock) ? Color.rgb(8,127,63) : Color.rgb(205,218,210)));
        b.setTextColor((shift || capsLock) ? Color.WHITE : Color.rgb(25,37,30));
        b.setOnLongClickListener(v -> {
            capsLock = !capsLock;
            shift = false;
            buildKeyboard();
            return true;
        });
        return b;
    }

    private void addBottomRow(boolean math) {
        LinearLayout row = new LinearLayout(this);
        row.setGravity(Gravity.CENTER);
        addToRow(row, key("⇄", 1f, this::switchLayout, "Switch keyboard layout"), 1f);
        addToRow(row, key(",", 0.8f, () -> commit(","), "Comma"), 0.8f);
        addToRow(row, key("space", 3.4f, () -> commit(" "), "Space"), 3.4f);
        if (math) {
            addBackspace(row, 1f);
        } else {
            addToRow(row, key(".", 0.8f, () -> commit("."), "Full stop"), 0.8f);
            addBackspace(row, 1.15f);
        }
        Button enter = key("↵", 1.2f, this::enter, "Enter");
        enter.setBackground(background(Color.rgb(8,127,63)));
        enter.setTextColor(Color.WHITE);
        addToRow(row, enter, 1.2f);
        root.addView(row, new LinearLayout.LayoutParams(-1, dp(49)));
    }

    private void addComputerBottomRow() {
        LinearLayout row = new LinearLayout(this);
        row.setGravity(Gravity.CENTER);
        addToRow(row, key("⇄", 0.9f, this::switchLayout, "Switch keyboard layout"), 0.9f);
        addToRow(row, key("Ctrl", 0.9f, () -> sendKey(KeyEvent.KEYCODE_CTRL_LEFT), "Control"), 0.9f);
        addToRow(row, key("Alt", 0.9f, () -> sendKey(KeyEvent.KEYCODE_ALT_LEFT), "Alt"), 0.9f);
        addToRow(row, key("←", 0.85f, () -> sendKey(KeyEvent.KEYCODE_DPAD_LEFT), "Move cursor left"), 0.85f);
        addToRow(row, key("space", 2.5f, () -> commit(" "), "Space"), 2.5f);
        addToRow(row, key("→", 0.85f, () -> sendKey(KeyEvent.KEYCODE_DPAD_RIGHT), "Move cursor right"), 0.85f);
        addToRow(row, key("↑", 0.85f, () -> sendKey(KeyEvent.KEYCODE_DPAD_UP), "Move cursor up"), 0.85f);
        addToRow(row, key("↓", 0.85f, () -> sendKey(KeyEvent.KEYCODE_DPAD_DOWN), "Move cursor down"), 0.85f);
        Button enter = key("↵", 1f, this::enter, "Enter");
        enter.setBackground(background(Color.rgb(8,127,63)));
        enter.setTextColor(Color.WHITE);
        addToRow(row, enter, 1f);
        root.addView(row, new LinearLayout.LayoutParams(-1, dp(49)));
    }

    private void addBackspace(LinearLayout row, float weight) {
        Button back = key("⌫", weight, this::deleteOne, "Backspace; hold to repeat");
        back.setBackground(background(Color.rgb(205,218,210)));
        back.setOnTouchListener((v, event) -> {
            if (event.getAction() == MotionEvent.ACTION_DOWN) {
                deleteOne();
                handler.removeCallbacks(repeatDelete);
                handler.postDelayed(repeatDelete, 400);
                return true;
            }
            if (event.getAction() == MotionEvent.ACTION_UP || event.getAction() == MotionEvent.ACTION_CANCEL) {
                handler.removeCallbacks(repeatDelete);
                v.performClick();
                return true;
            }
            return true;
        });
        back.setOnClickListener(v -> { });
        addToRow(row, back, weight);
    }

    private Button key(String label, float weight, Runnable action, String description) {
        Button b = new Button(this);
        b.setText(label);
        b.setTextSize(13);
        b.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        b.setAllCaps(false);
        b.setGravity(Gravity.CENTER);
        b.setMinWidth(0);
        b.setMinimumWidth(0);
        b.setPadding(dp(1), 0, dp(1), 0);
        b.setContentDescription(description);
        b.setBackground(background(Color.rgb(248,249,248)));
        b.setOnClickListener(v -> action.run());
        return b;
    }

    private void addToRow(LinearLayout row, Button button, float weight) {
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(0, dp(44), weight);
        lp.setMargins(dp(1), dp(2), dp(1), dp(2));
        row.addView(button, lp);
    }

    private GradientDrawable background(int color) {
        GradientDrawable bg = new GradientDrawable();
        bg.setColor(color);
        bg.setCornerRadius(dp(7));
        return bg;
    }

    private int dp(int value) {
        return (int) (value * getResources().getDisplayMetrics().density + 0.5f);
    }

    private String displayLetter(String label) {
        if (label.length() == 1 && Character.isLetter(label.charAt(0)) && (shift || capsLock)) {
            return label.toUpperCase();
        }
        return label;
    }

    private void handleTextKey(String label) {
        if (label.length() == 1 && Character.isLetter(label.charAt(0))) {
            commit((shift || capsLock) ? label.toUpperCase() : label.toLowerCase());
            if (shift && !capsLock) { shift = false; buildKeyboard(); }
            return;
        }
        if (label.length() == 1) {
            commit(label);
            if (shift && !capsLock) { shift = false; buildKeyboard(); }
            return;
        }
        if ("Tab".equals(label)) { sendKey(KeyEvent.KEYCODE_TAB); return; }
        if ("Esc".equals(label)) { sendKey(KeyEvent.KEYCODE_ESCAPE); return; }
        if ("Ctrl".equals(label)) { sendKey(KeyEvent.KEYCODE_CTRL_LEFT); return; }
        if ("Alt".equals(label)) { sendKey(KeyEvent.KEYCODE_ALT_LEFT); return; }
        if (label.matches("F[1-4]")) {
            sendKey(KeyEvent.KEYCODE_F1 + Integer.parseInt(label.substring(1)) - 1);
            return;
        }
        commit(label);
    }

    private void switchLayout() {
        layout = (layout + 1) % 3;
        shift = false;
        capsLock = false;
        buildKeyboard();
    }

    private void commit(String text) {
        InputConnection ic = getCurrentInputConnection();
        if (ic != null) ic.commitText(text, 1);
    }

    private void sendKey(int keyCode) {
        InputConnection ic = getCurrentInputConnection();
        if (ic != null) {
            ic.sendKeyEvent(new KeyEvent(KeyEvent.ACTION_DOWN, keyCode));
            ic.sendKeyEvent(new KeyEvent(KeyEvent.ACTION_UP, keyCode));
        }
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
        int action = info == null ? EditorInfo.IME_ACTION_NONE
            : (info.imeOptions & EditorInfo.IME_MASK_ACTION);
        if (action != EditorInfo.IME_ACTION_NONE && action != EditorInfo.IME_ACTION_UNSPECIFIED) {
            ic.performEditorAction(action);
        } else {
            ic.commitText("\n", 1);
        }
        shift = false;
        buildKeyboard();
    }

    @Override public void onStartInput(EditorInfo attribute, boolean restarting) {
        super.onStartInput(attribute, restarting);
        shift = false;
        capsLock = false;
    }

    @Override public void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        super.onDestroy();
    }
}
