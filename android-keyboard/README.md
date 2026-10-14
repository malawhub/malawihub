# MalawiHub Keyboard

A standalone, fully offline Android Input Method Editor (IME). Once installed and enabled in Android's keyboard settings, it can type into compatible text fields across apps without opening the MalawiHub website.

## Layouts

- **ABC normal keyboard** — lowercase QWERTY, number row, punctuation, one-shot Shift and long-press Caps Lock.
- **Mathematical keyboard** — Greek letters, operators, roots, sums, integrals, infinity, comparisons and superscript digits.
- **Computer keyboard** — Esc, Tab, Ctrl, Alt, F1–F4, punctuation and cursor arrow keys.

Tap **⇄** in the keyboard header or bottom row to cycle through ABC → Math → Computer → ABC. Backspace supports press-and-hold repeat. Space and Enter work locally through Android's input connection.

## Offline and privacy

- No account, registration, server or internet connection is required for typing.
- The Android app does not request the INTERNET permission.
- Key presses are sent directly to the focused app through Android's InputMethodService interface.

## Install

Install the APK, then open Android Settings → System & updates / Language & input (menu names vary by device) → Keyboard and input method. Enable **MalawiHub Keyboard** and select it as the current keyboard.

Package: `mw.malawihub.keyboard`  
Version: `1.0.0`
