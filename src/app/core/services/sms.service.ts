import { Injectable, signal } from '@angular/core';
import { ParsedSMS } from '../sms/models/parsed-sms.model';
import { SmsParserService } from '../sms/sms-parser.service';
import { NotificationService } from './notification.service';
import { registerPlugin } from '@capacitor/core';

// Legacy Capacitor Plugin import removed

@Injectable({ providedIn: 'root' })
export class SmsService {
    private _smsEnabled = signal<boolean>(false);
    private _isScanning = signal<boolean>(false);
    private _lastScanTime = signal<Date | null>(null);
    private _smsExpenses = signal<ParsedSMS[]>([]);

    // Progress signals for UI feedback during heavy scans
    private _totalMessagesToScan = signal<number>(0);
    private _messagesScanned = signal<number>(0);

    readonly smsEnabled = this._smsEnabled.asReadonly();
    readonly isScanning = this._isScanning.asReadonly();
    readonly lastScanTime = this._lastScanTime.asReadonly();
    readonly smsExpenses = this._smsExpenses.asReadonly();
    readonly totalMessagesToScan = this._totalMessagesToScan.asReadonly();
    readonly messagesScanned = this._messagesScanned.asReadonly();

    constructor(
        private notificationService: NotificationService,
        private smsParserService: SmsParserService
    ) {
        // Load persistent enabled state
        const saved = localStorage.getItem('sms-enabled');
        if (saved === 'true') {
            this._smsEnabled.set(true);
        }

        // Load persisted detected expenses from previous scans
        try {
            const rawExp = localStorage.getItem('persisted-sms-expenses');
            if (rawExp) {
                const parsed = JSON.parse(rawExp);
                parsed.forEach((p: any) => {
                    if (p.date) p.date = new Date(p.date);
                });
                this._smsExpenses.set(parsed);
            }
        } catch (e) {
            console.warn('[SmsService] Failed to load persisted SMS expenses', e);
        }
    }

    private FINGERPRINT_STORAGE_KEY = 'sms-fingerprints-v1';

    private loadSeenFingerprints(): Record<string, number> {
        try {
            const raw = localStorage.getItem(this.FINGERPRINT_STORAGE_KEY) || '{}';
            return JSON.parse(raw) as Record<string, number>;
        } catch (e) {
            return {};
        }
    }

    private saveSeenFingerprints(map: Record<string, number>) {
        try {
            localStorage.setItem(this.FINGERPRINT_STORAGE_KEY, JSON.stringify(map));
        } catch (e) {
            console.warn('[SmsService] Failed saving fingerprints', e);
        }
    }

    private fingerprintOf(s: string): string {
        let h = 5381;
        for (let i = 0; i < s.length; i++) {
            h = ((h << 5) + h) + s.charCodeAt(i);
            h = h >>> 0;
        }
        return h.toString(36);
    }

    async toggleSmsEnabled(): Promise<void> {
        const newValue = !this._smsEnabled();

        if (newValue) {
            const hasPermission = await this.requestSmsPermission();
            if (!hasPermission) {
                this.notificationService.error(
                    'SMS permission denied. Please grant permission in Android settings to use this feature.'
                );
                return;
            }
            this._smsEnabled.set(true);
            localStorage.setItem('sms-enabled', 'true');
            this.notificationService.info('✅ SMS features enabled! Use "Scan SMS Now" to find past transactions.');
        } else {
            this._smsEnabled.set(false);
            localStorage.setItem('sms-enabled', 'false');
            this.notificationService.info('SMS features disabled.');
        }
    }

    /**
     * Scans device SMS for bank transactions.
     * Uses deduping and limits scan range for performance.
     */
    async scanSms(): Promise<void> {
        if (this._isScanning()) return;

        this._isScanning.set(true);
        console.log('[SmsService] Starting SMS history scan...');

        try {
            const messages = await this.readSmsMessages();

            // Performance: Limit to last 2000 messages in production
            const messagesToScan = messages.slice(0, 2000);
            this._totalMessagesToScan.set(messagesToScan.length);
            this._messagesScanned.set(0);

            const parsedResults: ParsedSMS[] = [];
            const seen = this.loadSeenFingerprints();
            const newFingerprints: Record<string, number> = {};

            for (let i = 0; i < messagesToScan.length; i++) {
                const msg = messagesToScan[i];
                try {
                    const sender = (msg as any).address || (msg as any).sender || (msg as any).from;
                    const p = this.smsParserService.processSMS(msg.body, sender as string | undefined);

                    if (p) {
                        if (!p.sender) p.sender = (sender as string);
                        if (msg.date) p.date = msg.date;

                        // Create unique fingerprint for deduping
                        const keySeed = `${p.amount}|${p.description}|${p.date ? p.date.getTime() : ''}`;
                        const fp = this.fingerprintOf(keySeed);
                        const seenTs = seen[fp];
                        const ts = (p.date && p.date.getTime()) || Date.now();

                        // Ignore if seen in last year
                        if (fp && seenTs && Math.abs(ts - seenTs) < (365 * 24 * 60 * 60 * 1000)) {
                            // duplicate
                        } else {
                            parsedResults.push(p);
                            if (fp) newFingerprints[fp] = ts;
                        }
                    }
                } catch (e) {
                    // Fail silently for individual bad messages
                }

                // Periodic UI update
                if (i % 20 === 0 || i === messagesToScan.length - 1) {
                    this._messagesScanned.set(i + 1);
                }
            }

            // Production Filter: Ensure it's a success transaction and from a likely bank header
            const filteredResults = parsedResults.filter(p => {
                const isSuccess = p.status === 'success';
                const isBankSender = !p.sender || /^[A-Z]{2}-/.test(p.sender) || p.sender.length >= 6;
                return isSuccess && isBankSender;
            });

            // Persist fingerprints for future scans
            const merged = { ...seen };
            for (const k of Object.keys(newFingerprints)) merged[k] = newFingerprints[k];
            this.saveSeenFingerprints(merged);

            const existing = this._smsExpenses();
            const existingIds = new Set(existing.map(e => e.id));
            const trulyNew = filteredResults.filter(r => !existingIds.has(r.id));
            const updatedExpenses = [...trulyNew, ...existing];

            this._smsExpenses.set(updatedExpenses);
            localStorage.setItem('persisted-sms-expenses', JSON.stringify(updatedExpenses));
            this._lastScanTime.set(new Date());

            if (filteredResults.length > 0) {
                this.notificationService.success(`Found ${filteredResults.length} new bank transactions!`);
            } else {
                this.notificationService.info('Scan complete. No new bank transactions found.');
            }

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Scan failed';
            console.error('[SmsService] Scan error:', error);
            this.notificationService.error(`SMS Scan Error: ${errorMsg}`);
        } finally {
            this._isScanning.set(false);
        }
    }

    removeSmsExpense(id: string): void {
        const current = this._smsExpenses();
        const updated = current.filter(e => e.id !== id);
        this._smsExpenses.set(updated);
        localStorage.setItem('persisted-sms-expenses', JSON.stringify(updated));
    }

    // --- Auto-Detected Dashboard Aggregations ---

    // 1. Get total valid detected messages (excluding transfers if needed, but requirements say include all)
    getValidSmsCount(): number {
        return this._smsExpenses().length;
    }

    getBankUI(bankName: string) {
        const lower = bankName.toLowerCase();
        if (lower.includes('hdfc')) return { icon: 'business', color: '#1d4ed8' }; // blue
        if (lower.includes('sbi')) return { icon: 'business', color: '#0369a1' }; // light blue
        if (lower.includes('icici')) return { icon: 'business', color: '#b91c1c' }; // red
        if (lower.includes('axis')) return { icon: 'business', color: '#831843' }; // burgundy
        if (lower.includes('indbnk') || lower.includes('indian')) return { icon: 'business', color: '#c2410c' }; // orange
        if (lower.includes('kotak')) return { icon: 'business', color: '#dc2626' }; // red
        if (lower.includes('pnb')) return { icon: 'business', color: '#f59e0b' }; // yellow
        if (lower.includes('paytm')) return { icon: 'wallet', color: '#002970' }; // dark blue
        return { icon: 'card-outline', color: '#6366f1' }; // default indigo
    }

    // 2. Group by Sender (Bank/Wallet)
    getSenderSummary() {
        const expenses = this._smsExpenses();
        const map = new Map<string, { total: number, count: number }>();

        for (const exp of expenses) {
            const sender = exp.sender || 'Unknown Bank';
            const existing = map.get(sender) || { total: 0, count: 0 };
            existing.total += exp.amount;
            existing.count += 1;
            map.set(sender, existing);
        }

        return Array.from(map.entries())
            .map(([name, data]) => ({
                name,
                total: data.total,
                count: data.count,
                ui: this.getBankUI(name)
            }))
            .sort((a, b) => b.total - a.total);
    }

    // 3. Top Merchants (Overall or By Sender)
    getTopMerchants(senderFilter?: string) {
        const expenses = this._smsExpenses();
        const map = new Map<string, { total: number, count: number, originalName: string }>();

        for (const exp of expenses) {
            if (senderFilter && exp.sender !== senderFilter) continue;

            const merchant = exp.merchantName || 'Unknown Merchant';
            // Case-insensitive grouping
            const key = merchant.toLowerCase();

            const existing = map.get(key) || { total: 0, count: 0, originalName: merchant };
            existing.total += exp.amount;
            existing.count += 1;
            map.set(key, existing);
        }

        return Array.from(map.values())
            .sort((a, b) => b.total - a.total);
    }

    // 4. Merchant Transactions Date-Grouped
    getMerchantTransactions(merchantName: string) {
        const expenses = this._smsExpenses().filter(
            e => (e.merchantName || 'Unknown Merchant').toLowerCase() === merchantName.toLowerCase()
        );

        // Sort latest first
        expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return expenses;
    }

    // --- Bulk & Individual Editing ---

    updateTransactionCategory(id: string, userCategory: string, userCategoryLabel: string, isTransfer: boolean) {
        const expenses = [...this._smsExpenses()];
        const idx = expenses.findIndex(e => e.id === id);
        if (idx !== -1) {
            expenses[idx] = { ...expenses[idx], userCategory, userCategoryLabel, isTransfer };
            this._smsExpenses.set(expenses);
            localStorage.setItem('persisted-sms-expenses', JSON.stringify(expenses));
        }
    }

    updateBulkCategory(merchantName: string, userCategory: string, userCategoryLabel: string, isTransfer: boolean) {
        const expenses = [...this._smsExpenses()];
        const target = merchantName.toLowerCase();
        let updated = false;

        for (let i = 0; i < expenses.length; i++) {
            const m = (expenses[i].merchantName || 'Unknown Merchant').toLowerCase();
            if (m === target) {
                expenses[i] = { ...expenses[i], userCategory, userCategoryLabel, isTransfer };
                updated = true;
            }
        }

        if (updated) {
            this._smsExpenses.set(expenses);
            localStorage.setItem('persisted-sms-expenses', JSON.stringify(expenses));
        }
    }

    private async readSmsMessages(): Promise<{ body: string; date?: Date; address?: string }[]> {
        return await this.readNativeSms();
    }

    private async readNativeSms(): Promise<{ body: string; date?: Date; address?: string }[]> {
        const cap = (window as any)?.Capacitor;
        if (!cap?.isNativePlatform?.()) {
            throw new Error('Native platform required for SMS access.');
        }

        try {
            const hasPerms = await this.requestSmsPermission();
            if (!hasPerms) {
                throw new Error('Permission denied.');
            }

            if (!(window as any)?.AndroidNative?.getSmsMessages) {
                throw new Error('Native SmsReader bridge not found. Did you recompile in Android Studio?');
            }

            // The native method returns a JSON string, so we must parse it
            const rawJson = (window as any).AndroidNative.getSmsMessages(2000);
            const messages = JSON.parse(rawJson || '[]');

            return messages.map((item: any) => ({
                body: item.body || item.message || item.text || '',
                address: item.address || item.from || item.sender || '',
                date: item.date ? new Date(Number(item.date)) : undefined
            })).filter((m: any) => m.body);

        } catch (e: any) {
            console.error('[SmsService] Custom SmsReader plugin failure:', e);
            this.notificationService.error('SMS Plugin Error: ' + (e?.message || e));
            throw new Error('No compatible SMS plugin found or permission missing.');
        }
    }

    private async requestSmsPermission(): Promise<boolean> {
        const cap = (window as any)?.Capacitor;
        if (!cap?.isNativePlatform?.()) return true;

        // Note: With JavascriptInterface, permissions must be handled by standard Capacitor plugins
        // or the Permission API. Since we removed SmsReader cap plugin, we rely solely on standard Permissions
        const Permissions = cap?.Plugins?.Permissions;
        if (!Permissions) return true;

        try {
            const result = await Permissions.requestPermissions([
                { name: 'READ_SMS' },
                { name: 'RECEIVE_SMS' }
            ]);
            return result?.permissions?.every((p: any) => p.state === 'granted') ?? false;
        } catch (e) {
            return true; // Let the actual read attempt handle failures
        }
    }
}
