package mw.malawihub.connector;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.provider.Telephony;
import android.telephony.SmsMessage;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class SmsReceiver extends BroadcastReceiver {
    private static final String API = "https://cdqrdovgdidzxmyygoee.supabase.co/functions/v1/business-device";
    private static final Pattern AMOUNT_AFTER = Pattern.compile(
            "(?i)(?:received|sent|deposit(?:ed)?|withdraw(?:n|al)?|credited|debited|amount|payment)[^0-9]{0,32}([0-9][0-9,]*(?:\\.[0-9]{1,2})?)");
    private static final Pattern AMOUNT_BEFORE = Pattern.compile(
            "(?i)([0-9][0-9,]*(?:\\.[0-9]{1,2})?)[^0-9]{0,24}(?:MWK|MK|received|sent|deposit(?:ed)?|withdraw(?:n|al)?|credited|debited|payment)");
    private static final Pattern BALANCE = Pattern.compile(
            "(?i)(?:balance|available balance|new balance|remaining|bal(?:ance)?)[^0-9]{0,32}([0-9][0-9,]*(?:\\.[0-9]{1,2})?)");
    private static final Pattern REFERENCE = Pattern.compile(
            "(?i)(?:ref(?:erence)?|transaction(?:\\s+id)?|txn(?:\\s+id)?)[\\s:#-]*([A-Z0-9-]{4,40})");

    @Override
    public void onReceive(Context context, Intent intent) {
        if (!Telephony.Sms.Intents.SMS_RECEIVED_ACTION.equals(intent.getAction())) return;

        android.content.SharedPreferences prefs = context.getSharedPreferences("hub", Context.MODE_PRIVATE);
        String token = prefs.getString("token", "");
        if (token.isEmpty()) return;

        SmsMessage[] messages = Telephony.Sms.Intents.getMessagesFromIntent(intent);
        if (messages == null || messages.length == 0) return;

        StringBuilder combined = new StringBuilder();
        for (SmsMessage sms : messages) {
            if (sms != null && sms.getMessageBody() != null) {
                if (combined.length() > 0) combined.append(' ');
                combined.append(sms.getMessageBody());
            }
        }
        String body = combined.toString().trim();
        if (body.isEmpty()) return;

        String lower = body.toLowerCase(Locale.ROOT);
        final String provider;
        if (lower.contains("mpamba") || lower.contains("tnm")) {
            provider = "mpamba";
        } else if (lower.contains("airtel")) {
            provider = "airtel_money";
        } else {
            return;
        }

        final BroadcastReceiver.PendingResult pending = goAsync();
        new Thread(() -> {
            try {
                send(token, provider, body);
            } finally {
                pending.finish();
            }
        }, "malawihub-sms").start();
    }

    private static void send(String token, String provider, String body) {
        try {
            String lower = body.toLowerCase(Locale.ROOT);
            String type = "transaction";
            if (containsAny(lower, "received", "deposit", "credited", "cash in", "payment received")) {
                type = "received";
            } else if (containsAny(lower, "sent", "withdraw", "debited", "cash out", "payment sent")) {
                type = "sent";
            }

            Double amount = firstAmount(body, AMOUNT_AFTER, AMOUNT_BEFORE);
            Double balance = firstAmount(body, BALANCE);
            String reference = firstMatch(body, REFERENCE);
            String eventAt = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssXXX", Locale.US).format(new Date());
            String summary = provider + " " + type
                    + (amount != null ? " — MWK " + amount : "")
                    + (balance != null ? " — displayed balance: MWK " + balance : "");
            String rawHash = sha256(body);

            JSONObject payload = new JSONObject()
                    .put("action", "ingest")
                    .put("provider", provider)
                    .put("transaction_type", type)
                    .put("amount", amount)
                    .put("balance", balance)
                    .put("reference", reference)
                    .put("event_at", eventAt)
                    .put("message", summary)
                    .put("raw_hash", rawHash);

            HttpURLConnection connection = (HttpURLConnection) new URL(API).openConnection();
            connection.setRequestMethod("POST");
            connection.setConnectTimeout(10000);
            connection.setReadTimeout(15000);
            connection.setDoOutput(true);
            connection.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
            connection.setRequestProperty("Authorization", "Bearer " + token);
            byte[] bytes = payload.toString().getBytes(StandardCharsets.UTF_8);
            try (OutputStream output = connection.getOutputStream()) {
                output.write(bytes);
            }
            int status = connection.getResponseCode();
            if (status >= 300) {
                read(connection.getErrorStream());
            }
            connection.disconnect();
        } catch (Exception ignored) {
            // SMS broadcasts must never crash because the network is unavailable.
        }
    }

    private static boolean containsAny(String text, String... values) {
        for (String value : values) if (text.contains(value)) return true;
        return false;
    }

    private static Double firstAmount(String text, Pattern... patterns) {
        for (Pattern pattern : patterns) {
            Matcher matcher = pattern.matcher(text);
            if (matcher.find()) {
                try {
                    return Double.parseDouble(matcher.group(1).replace(",", ""));
                } catch (Exception ignored) { }
            }
        }
        return null;
    }

    private static String firstMatch(String text, Pattern pattern) {
        Matcher matcher = pattern.matcher(text);
        return matcher.find() ? matcher.group(1).substring(0, Math.min(120, matcher.group(1).length())) : null;
    }

    private static String sha256(String value) throws Exception {
        byte[] digest = MessageDigest.getInstance("SHA-256")
                .digest(value.getBytes(StandardCharsets.UTF_8));
        StringBuilder result = new StringBuilder(digest.length * 2);
        for (byte b : digest) result.append(String.format(Locale.ROOT, "%02x", b));
        return result.toString();
    }

    private static String read(InputStream input) {
        if (input == null) return "";
        try (InputStream in = input; ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[2048];
            int n;
            while ((n = in.read(buffer)) != -1) out.write(buffer, 0, n);
            return out.toString(StandardCharsets.UTF_8.name());
        } catch (Exception ignored) {
            return "";
        }
    }
}
