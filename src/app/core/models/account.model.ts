export interface Account {
    id: string;
    name: string;
    type: 'bank' | 'cash' | 'wallet';
    balance: number;
    accountIdentifier?: string; // Merged at runtime from encryptedPayload
    encryptedPayload?: string; // Encrypted (accountNumber, bankName, etc.)

    createdAt: string;
    updatedAt: string;
}
