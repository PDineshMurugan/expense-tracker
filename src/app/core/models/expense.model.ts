export interface Expense {
    id: string;
    amount: number;
    category: string;       // emoji character
    categoryLabel: string;  // human label
    note: string;
    date: string;           // ISO date string (YYYY-MM-DD)
    paymentMode: PaymentMode;
    createdAt: string;      // ISO datetime
    source?: 'manual' | 'sms';  // origin of expense
    smsBody?: string;       // original SMS text if from SMS
}

export type PaymentMode = 'UPI' | 'Cash' | 'Card';

export const PAYMENT_MODES: PaymentMode[] = ['UPI', 'Cash', 'Card'];
