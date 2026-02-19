import { Injectable, signal } from '@angular/core';
import { ParsedSMS, parseMultipleSMS } from '../utils/sms-parser.util';
import { NotificationService } from './notification.service';

@Injectable({ providedIn: 'root' })
export class SmsService {
    private _smsEnabled = signal<boolean>(false);
    private _isScanning = signal<boolean>(false);
    private _lastScanTime = signal<Date | null>(null);
    private _smsExpenses = signal<ParsedSMS[]>([]);

    readonly smsEnabled = this._smsEnabled.asReadonly();
    readonly isScanning = this._isScanning.asReadonly();
    readonly lastScanTime = this._lastScanTime.asReadonly();
    readonly smsExpenses = this._smsExpenses.asReadonly();

    constructor(private notificationService: NotificationService) {
        // Load saved state
        const saved = localStorage.getItem('sms-enabled');
        if (saved === 'true') {
            this._smsEnabled.set(true);
        }
    }

    toggleSmsEnabled(): void {
        const newValue = !this._smsEnabled();
        this._smsEnabled.set(newValue);
        localStorage.setItem('sms-enabled', String(newValue));

        if (newValue) {
            this.notificationService.info('SMS reading enabled. Tap "Scan SMS Now" to detect expenses.');
        } else {
            this._smsExpenses.set([]);
            this.notificationService.info('SMS reading disabled.');
        }
    }

    async scanSms(): Promise<void> {
        if (this._isScanning()) return;

        this._isScanning.set(true);

        try {
            const messages = await this.readSmsMessages();
            const parsed = parseMultipleSMS(messages);

            this._smsExpenses.set(parsed);
            this._lastScanTime.set(new Date());

            if (parsed.length > 0) {
                this.notificationService.success(
                    `✅ SMS read successfully! Found ${parsed.length} transaction${parsed.length > 1 ? 's' : ''}.`
                );
            } else {
                this.notificationService.info('No bank transactions found in recent SMS.');
            }
        } catch (error) {
            this.notificationService.error('Failed to read SMS. Please check permissions.');
            console.error('SMS scan error:', error);
        } finally {
            this._isScanning.set(false);
        }
    }

    /**
     * Read SMS messages from the device.
     * This method requires a native Capacitor SMS plugin to be installed.
     */
    private async readSmsMessages(): Promise<{ body: string; date?: Date }[]> {
        // Attempt to read from native device
        const messages = await this.readNativeSms();
        
        if (messages.length === 0) {
            throw new Error(
                'No SMS messages found. Ensure the device has SMS permissions enabled. ' +
                'For development, install a Capacitor SMS plugin (e.g., capacitor-community/sms-reader) ' +
                'and add READ_SMS permission in AndroidManifest.xml'
            );
        }
        
        return messages;
    }

    /**

     * Read SMS from native device using Capacitor plugin.
     * Requires a Capacitor SMS reader plugin to be installed.
     * 
     * Installation:
     * ```
     * npm install capacitor-community/sms-reader
     * npx cap sync
     * ```
     * 
     * For Android, add READ_SMS permission to AndroidManifest.xml
     */
    private async readNativeSms(): Promise<{ body: string; date?: Date }[]> {
        try {
            const cap = (window as any)?.Capacitor;
            
            // Check if the device is native
            if (!cap?.isNativePlatform?.()) {
                throw new Error('Not running on a native platform');
            }

            const SmsReader = cap?.Plugins?.SmsReader;

            if (!SmsReader) {
                throw new Error(
                    'SMS Reader plugin not available. ' +
                    'Install it with: npm install capacitor-community/sms-reader'
                );
            }

            // Request READ_SMS permission first (Android)
            if (cap?.Plugins?.Permissions) {
                try {
                    await cap.Plugins.Permissions.query({ name: 'READ_SMS' });
                } catch (e) {
                    console.warn('Could not verify SMS permission:', e);
                }
            }

            const result = await SmsReader.getSms({
                maxCount: 100,
                filter: 'inbox'
            });

            if (!result?.messages || result.messages.length === 0) {
                throw new Error('No SMS messages found on device');
            }

            return result.messages.map((msg: any) => ({
                body: msg.body || msg.text || '',
                date: msg.date ? new Date(msg.date) : new Date()
            }));
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to read SMS: ${errorMsg}`);
        }
    }
}
