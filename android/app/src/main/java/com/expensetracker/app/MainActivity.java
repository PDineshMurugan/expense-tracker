package com.expensetracker.app;

import android.Manifest;
import android.content.pm.PackageManager;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final int SMS_PERMISSION_CODE = 101;
    private NotificationReceiver notificationReceiver;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestSmsPermission();
        registerPlugin(NotificationSettingsPlugin.class);

        notificationReceiver = new NotificationReceiver();
        android.content.IntentFilter filter = new android.content.IntentFilter("com.expensetracker.app.NOTIFICATION_LISTENER");
        registerReceiver(notificationReceiver, filter);
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
                getBridge().triggerWindowJSEvent("notificationReceived", data.toString());
            }
        }
    }
}
