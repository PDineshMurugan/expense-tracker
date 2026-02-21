export interface Expense {
    id: string;
    amount: number;
    category: string;       // icon name
    categoryLabel: string;  // human label
    note: string;
    date: string;           // ISO date string (YYYY-MM-DD)
    paymentMode: PaymentMode;
    createdAt: string;      // ISO datetime
    source?: 'manual' | 'sms';  // origin of expense
    smsBody?: string;       // original SMS text if from SMS

    // Account & Transaction Enhancements
    accountId?: string;     // links transaction to account
    type?: 'debit' | 'credit';
    isTransfer?: boolean;   // marks transfer transactions
    transferPairId?: string; // links both sides of transfer
    smsId?: string;         // unique SMS reference for deduplication
    merchant?: string;      // extracted payee name
    rawText?: string;       // original SMS text for debugging
}

export type PaymentMode = 'UPI' | 'Cash' | 'Card';

export const PAYMENT_MODES: PaymentMode[] = ['UPI', 'Cash', 'Card'];
