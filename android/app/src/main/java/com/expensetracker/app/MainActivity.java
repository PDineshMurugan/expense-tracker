package com.expensetracker.app;

import android.Manifest;
import android.content.pm.PackageManager;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import android.os.Bundle;
import android.provider.Settings;
import android.content.ComponentName;
import android.text.TextUtils;
import android.webkit.JavascriptInterface;
import com.getcapacitor.BridgeActivity;
import android.content.ContentResolver;
import android.database.Cursor;
import android.provider.Telephony;
import org.json.JSONArray;
import org.json.JSONObject;

public class MainActivity extends BridgeActivity {

    private static final int SMS_PERMISSION_CODE = 101;
    private NotificationReceiver notificationReceiver;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestSmsPermission();

        // Inject Native Bridge Directly into WebView
        getBridge().getWebView().addJavascriptInterface(new WebAppInterface(), "AndroidNative");

        notificationReceiver = new NotificationReceiver();
        android.content.IntentFilter filter = new android.content.IntentFilter("com.expensetracker.app.NOTIFICATION_LISTENER");
        registerReceiver(notificationReceiver, filter);

        if (!isNotificationServiceEnabled()) {
            try {
                startActivity(new android.content.Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS"));
            } catch (Exception e) {
                // Ignore if device does not support this direct intent
                e.printStackTrace();
            }
        }
    }
    
    @Override
    public void onDestroy() {
        super.onDestroy();
        if (notificationReceiver != null) {
            unregisterReceiver(notificationReceiver);
        }
    }

    private void requestSmsPermission() {

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_SMS)
                != PackageManager.PERMISSION_GRANTED) {

            ActivityCompat.requestPermissions(
                    this,
                    new String[]{
                            Manifest.permission.READ_SMS,
                            Manifest.permission.RECEIVE_SMS
                    },
                    SMS_PERMISSION_CODE
            );
        }
    }

    private boolean isNotificationServiceEnabled() {
        String pkgName = getPackageName();
        final String flat = Settings.Secure.getString(getContentResolver(), "enabled_notification_listeners");
        if (!TextUtils.isEmpty(flat)) {
            final String[] names = flat.split(":");
            for (int i = 0; i < names.length; i++) {
                ComponentName cn = ComponentName.unflattenFromString(names[i]);
                if (cn != null && TextUtils.equals(pkgName, cn.getPackageName())) {
                    return true;
                }
            }
        }
        return false;
    }

    private class NotificationReceiver extends android.content.BroadcastReceiver {
        @Override
        public void onReceive(android.content.Context context, android.content.Intent intent) {
            if (intent.getAction().equals("com.expensetracker.app.NOTIFICATION_LISTENER")) {
                String packageName = intent.getStringExtra("package");
                String title = intent.getStringExtra("title");
                String text = intent.getStringExtra("text");
                long postTime = intent.getLongExtra("postTime", System.currentTimeMillis());

                com.getcapacitor.JSObject data = new com.getcapacitor.JSObject();
                data.put("package", packageName);
                data.put("title", title);
                data.put("text", text);
                data.put("postTime", postTime);
                
                // Trigger window event: window.addEventListener('notificationReceived', (e) => ...)
                if (getBridge() != null && getBridge().getWebView() != null) {
                    getBridge().triggerWindowJSEvent("notificationReceived", data.toString());
                }
            }
        }
    }

    // Direct Native JS Interface
    public class WebAppInterface {

        @JavascriptInterface
        public void openNotificationSettings() {
            try {
                android.content.Intent intent = new android.content.Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS");
                intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(intent);
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        @JavascriptInterface
        public String getSmsMessages(int maxCount) {
            JSONArray messages = new JSONArray();
            try {
                ContentResolver contentResolver = getContentResolver();
                Cursor cursor = contentResolver.query(
                        Telephony.Sms.Inbox.CONTENT_URI,
                        new String[] { Telephony.Sms.ADDRESS, Telephony.Sms.BODY, Telephony.Sms.DATE },
                        null,
                        null,
                        Telephony.Sms.DATE + " DESC LIMIT " + maxCount
                );

                if (cursor != null && cursor.moveToFirst()) {
                    do {
                        String address = cursor.getString(cursor.getColumnIndexOrThrow(Telephony.Sms.ADDRESS));
                        String body = cursor.getString(cursor.getColumnIndexOrThrow(Telephony.Sms.BODY));
                        long date = cursor.getLong(cursor.getColumnIndexOrThrow(Telephony.Sms.DATE));

                        JSONObject msg = new JSONObject();
                        msg.put("address", address);
                        msg.put("body", body);
                        msg.put("date", date);
                        messages.put(msg);
                    } while (cursor.moveToNext());
                    cursor.close();
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
            return messages.toString();
        }
    }
}
