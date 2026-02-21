package com.expensetracker.app;

import android.content.Intent;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

public class NotificationListener extends NotificationListenerService {

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        String packageName = sbn.getPackageName();
        String title = "";
        String text = "";

        if (sbn.getNotification().extras.containsKey("android.title")) {
            title = sbn.getNotification().extras.getString("android.title");
        }
        
        if (sbn.getNotification().extras.containsKey("android.text")) {
             CharSequence textCharSeq = sbn.getNotification().extras.getCharSequence("android.text");
             if (textCharSeq != null) {
                 text = textCharSeq.toString();
             }
        }

        if (!title.isEmpty() || !text.isEmpty()) {
            Intent intent = new Intent("com.expensetracker.app.NOTIFICATION_LISTENER");
            intent.putExtra("package", packageName);
            intent.putExtra("title", title);
            intent.putExtra("text", text);
            intent.putExtra("postTime", sbn.getPostTime());
            sendBroadcast(intent);
        }
    }

    @Override
    public void onNotificationRemoved(StatusBarNotification sbn) {
        // Optional
    }
}
