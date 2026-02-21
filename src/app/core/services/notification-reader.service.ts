import { Injectable, signal, inject } from '@angular/core';
import { Platform } from '@ionic/angular/standalone';
import { parseSMS, ParsedSMS } from '../utils/sms-parser.util';
import { NotificationService } from './notification.service';
import { registerPlugin } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Router } from '@angular/router';

interface NotificationSettingsPlugin {
    open(): Promise<void>;
}

const NotificationSettings = registerPlugin<NotificationSettingsPlugin>('NotificationSettings');

@Injectable({ providedIn: 'root' })
export class NotificationReaderService {
    private platform = inject(Platform);
    private notificationService = inject(NotificationService);
    private router = inject(Router);

    private _isEnabled = signal<boolean>(false);
    private _detectedTransactions = signal<ParsedSMS[]>([]);

    readonly isEnabled = this._isEnabled.asReadonly();
    readonly detectedTransactions = this._detectedTransactions.asReadonly();

    constructor() {
        this.loadState();
        this.initListener();
        this.initNotificationActions();
    }

    private loadState() {
        const saved = localStorage.getItem('notification-reader-enabled');
        if (saved === 'true') {
            this._isEnabled.set(true);
        }

        // Load persisted transactions
        try {
            const raw = localStorage.getItem('persisted-notif-transactions');
            if (raw) {
                const parsed = JSON.parse(raw);
                parsed.forEach((p: any) => p.date = new Date(p.date));
                this._detectedTransactions.set(parsed);
            }
        } catch (e) { }
    }


    async toggleEnabled(): Promise<void> {
        const newState = !this._isEnabled();

        if (newState) {
            const hasPermission = await this.requestPermission();
            if (hasPermission) {
                this._isEnabled.set(true);
                localStorage.setItem('notification-reader-enabled', 'true');
                this.startListening();
            }
        } else {
            this._isEnabled.set(false);
            localStorage.setItem('notification-reader-enabled', 'false');
            this.stopListening();
        }
    }

    private async requestPermission(): Promise<boolean> {
        if (!this.platform.is('android')) {
            this.notificationService.error('Notification reading is only supported on Android devices.');
            return false;
        }

        // Guide the user to Notification Listener Settings
        // We use the custom plugin to open the native settings screen
        try {
            this.notificationService.info('Please enable "Expense Tracker" in the Notification Access settings to auto-detect transactions.');

            // Wait slightly so the user can read the toast
            await new Promise(resolve => setTimeout(resolve, 1500));

            await NotificationSettings.open();

            // We return true here and assume the user will enable it.
            // When they return to the app, the init logic will re-check enabling state.
            return true;
        } catch (error) {
            console.error('Failed to open notification settings:', error);
            this.notificationService.error('Could not open settings. Please enable Notification Access manually for Expense Tracker.');
            return false;
        }
    }

    private initListener() {
        if (this._isEnabled()) {
            this.startListening();
        }
    }

    private startListening() {
        if (!this.platform.is('android')) return;

        console.log('Starting notification listener...');
        window.addEventListener('notificationReceived', this.handleNotification);
    }

    private initNotificationActions() {
        if (!this.platform.is('capacitor')) return;

        LocalNotifications.registerActionTypes({
            types: [
                {
                    id: 'TXN_ACTION',
                    actions: [
                        {
                            id: 'view',
                            title: 'View SMS',
                        },
                        {
                            id: 'add',
                            title: 'Add Expense',
                        }
                    ]
                }
            ]
        });

        LocalNotifications.addListener('localNotificationActionPerformed', (notificationAction) => {
            if (notificationAction.actionId === 'add') {
                const data = notificationAction.notification.extra;
                if (data && data.amount) {
                    this.router.navigate(['/tabs/add-expense'], {
                        queryParams: {
                            amount: data.amount,
                            note: data.merchant || 'SMS Transaction',
                            prefilled: true
                        }
                    });
                }
            }
        });
    }

    private stopListening() {
        window.removeEventListener('notificationReceived', this.handleNotification);
    }

    private handleNotification = (event: any) => {
        let notification: any;
        try {
            // Capacitor event detail might be a JSON string if triggered via triggerWindowJSEvent inside a broadcast receiver
            notification = typeof event.detail === 'string' ? JSON.parse(event.detail) : event.detail;
        } catch (e) {
            console.error('Failed to parse notification detail', e);
            return;
        }

        if (!notification) return;

        console.log('Notification received:', notification);

        // Filter for relevant apps (GPay, PhonePe, Paytm, Bank Apps)
        const relevantPackages = [
            'com.google.android.apps.nbu.paisa.user', // GPay
            'com.phonepe.app', // PhonePe
            'net.one97.paytm', // Paytm
        ];

        // Also allow if it looks like a bank sms/notification
        const pkg = (notification.package || '').toLowerCase();
        if (relevantPackages.includes(pkg) || pkg.includes('bank') || pkg.includes('wallet')) {
            this.processNotification(notification);
        }
    };

    private processNotification(notification: any) {
        const text = `${notification.title} ${notification.text}`;
        const parsed = parseSMS(text, notification.title); // Re-use SMS parser

        if (parsed) {
            // Use native postTime if available
            if (notification.postTime) {
                parsed.date = new Date(Number(notification.postTime));
            }

            console.log('Parsed Notification Transaction:', parsed);
            this._detectedTransactions.update(list => {
                const newList = [parsed, ...list].slice(0, 50); // Keep last 50
                localStorage.setItem('persisted-notif-transactions', JSON.stringify(newList));
                return newList;
            });

            // Push Real Local Notification
            if (this.platform.is('capacitor')) {
                LocalNotifications.schedule({
                    notifications: [
                        {
                            title: 'Transaction Detected',
                            body: `Spent ₹${parsed.amount} at ${parsed.merchantName || 'Merchant'}`,
                            id: new Date().getTime(),
                            schedule: { at: new Date(Date.now() + 1000) },
                            actionTypeId: 'TXN_ACTION',
                            extra: {
                                amount: parsed.amount,
                                merchant: parsed.merchantName
                            }
                        }
                    ]
                });
            } else {
                this.notificationService.success(`Transaction detected: ${parsed.amount}`);
            }
        }
    }

}
