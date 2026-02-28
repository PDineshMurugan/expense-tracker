export interface ParsedSMS {
    id: string;
    amount: number;
    description: string;
    merchantName?: string;
    userCategory?: string;
    userCategoryLabel?: string;

    type: 'debit' | 'credit';
    status: 'success' | 'failed' | 'pending' | 'reversed';

    date: Date;

    accountType?: string;
    accountIdentifier?: string;
    accountId?: string;

    availableBalance?: number;

    upiId?: string;
    upiRef?: string;

    sender?: string;
    bank?: string;
    bankConfidence?: number;
    confidence: number;

    isTransfer?: boolean;
    transferPairId?: string;
    smsId?: string;
    originalBody: string;
}
