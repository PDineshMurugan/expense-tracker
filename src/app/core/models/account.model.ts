export interface Account {
    id: string;
    name: string; // e.g., "HDFC Salary Account"
    type: 'Bank' | 'Credit Card' | 'Wallet';
    bankName?: string;
    accountIdentifier?: string; // e.g., "*6493"
    openingBalance?: number;
    currentBalance?: number;
    color?: string; // UI color tag
    icon?: string; // optional bank icon
    createdAt: string;
    updatedAt: string;
}
