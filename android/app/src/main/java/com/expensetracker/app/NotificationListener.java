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

        android.os.Bundle extras = sbn.getNotification().extras;
        if (extras != null) {
            if (extras.containsKey("android.title")) {
                CharSequence titleSeq = extras.getCharSequence("android.title");
                if (titleSeq != null) title = titleSeq.toString();
            }
            
            if (extras.containsKey("android.text")) {
                CharSequence textSeq = extras.getCharSequence("android.text");
                if (textSeq != null) text = textSeq.toString();
            }
        }

        if (title == null) title = "";
        if (text == null) text = "";

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
