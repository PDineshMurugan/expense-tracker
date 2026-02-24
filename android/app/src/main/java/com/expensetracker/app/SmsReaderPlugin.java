package com.expensetracker.app;

import android.Manifest;
import android.content.ContentResolver;
import android.database.Cursor;
import android.provider.Telephony;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "SmsReader",
    permissions = {
        @Permission(
            alias = "sms",
            strings = { Manifest.permission.READ_SMS, Manifest.permission.RECEIVE_SMS }
        )
    }
)
public class SmsReaderPlugin extends Plugin {

    @PluginMethod
    public void getMessages(PluginCall call) {
        if (!hasPermission("sms")) {
            requestPermissionForAlias("sms", call, "smsPermsCallback");
            return;
        }
        readSms(call);
    }

    @PermissionCallback
    private void smsPermsCallback(PluginCall call) {
        if (hasPermission("sms")) {
            readSms(call);
        } else {
            call.reject("SMS permission is required");
        }
    }

    private void readSms(PluginCall call) {
        int maxCount = call.getInt("maxCount", 1000);
        JSArray messages = new JSArray();
        
        try {
            ContentResolver contentResolver = getContext().getContentResolver();
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

                    JSObject msg = new JSObject();
                    msg.put("address", address);
                    msg.put("body", body);
                    msg.put("date", date);
                    messages.put(msg);
                } while (cursor.moveToNext());
                cursor.close();
            }
            JSObject result = new JSObject();
            result.put("messages", messages);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to read SMS: " + e.getMessage());
        }
    }
}
