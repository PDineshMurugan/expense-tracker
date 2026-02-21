export type PaymentMode = 'Cash' | 'Credit Card' | 'Debit Card' | 'UPI' | 'Net Banking' | 'Wallet' | 'Other';
export const PAYMENT_MODES: PaymentMode[] = ['Cash', 'Credit Card', 'Debit Card', 'UPI', 'Net Banking', 'Wallet', 'Other'];
export interface Expense {
    id: string;

    amount: number;
    date: string; // ISO string 
    type: 'debit' | 'credit';

    categoryId: string;
    accountId: string;

    source: 'manual' | 'sms' | 'notification' | 'import';
    parserVersion?: number;

    encryptedPayload?: string; // Encrypted (merchantName, accountIdentifier, notes, rawSms)

    // Unencrypted legacy fields (remove these if enforcing full encryption, but keeping for compatibility if needed or strictly following prompt schema to move them to payload)
    // Removed raw category string, categoryLabel, note, paymentMode, isTransfer, smsBody, smsId, merchant to payload or handled by ID mappings

    createdAt: string; // ISO string
    updatedAt?: string; // ISO string
}
