export interface RecurringPattern {
    id: string;
    merchantName: string;
    averageAmount: number;
    frequency: 'monthly' | 'weekly';
    lastDetected: number; // timestamp
}
