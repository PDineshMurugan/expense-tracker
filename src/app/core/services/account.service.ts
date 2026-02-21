import { Injectable, signal } from '@angular/core';
import { StorageService } from '../storage/storage.service';
import { Account } from '../models/account.model';
import { CryptoService } from '../crypto/crypto.service';

@Injectable({ providedIn: 'root' })
export class AccountService {
    private _accounts = signal<Account[]>([]);
    readonly accounts = this._accounts.asReadonly();

    constructor(
        private storage: StorageService,
        private crypto: CryptoService
    ) {
        this.loadAccounts();
    }

    async loadAccounts(): Promise<void> {
        const db = await this.storage.ready();
        const accounts = await db.getAll('accounts');

        for (const acc of accounts) {
            if (acc.encryptedPayload) {
                try {
                    const decrypted = await this.crypto.decrypt(acc.encryptedPayload);
                    Object.assign(acc, decrypted);
                } catch (e) {
                    console.error('Failed decrypting account payload', acc.id);
                }
            }
        }

        this._accounts.set(accounts);
    }

    async addAccount(data: { name: string, type: 'bank' | 'cash' | 'wallet', balance: number, sensitiveInfo?: object }): Promise<void> {
        const now = new Date().toISOString();
        let encryptedPayload;

        if (data.sensitiveInfo) {
            encryptedPayload = await this.crypto.encrypt(data.sensitiveInfo);
        }

        const account: Account = {
            id: crypto.randomUUID(),
            name: data.name,
            type: data.type,
            balance: data.balance || 0,
            encryptedPayload,
            createdAt: now,
            updatedAt: now
        };

        const db = await this.storage.ready();
        await db.put('accounts', account);
        await this.loadAccounts();
    }

    async deleteAccount(id: string): Promise<void> {
        const db = await this.storage.ready();
        await db.delete('accounts', id);
        await this.loadAccounts();
    }
}
