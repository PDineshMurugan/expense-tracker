import { Injectable, signal, computed } from '@angular/core';
import { StorageService } from './storage.service';
import { Account } from '../models/account.model';

@Injectable({ providedIn: 'root' })
export class AccountService {
    private _accounts = signal<Account[]>([]);

    readonly accounts = this._accounts.asReadonly();

    // Default or Fallback account mapping can be derived if needed
    readonly primaryAccount = computed(() => {
        return this._accounts().find(a => a.type === 'Bank') || this._accounts()[0] || null;
    });

    constructor(private storage: StorageService) {
        this.loadAccounts();
    }

    async loadAccounts(): Promise<void> {
        const accounts = await this.storage.getAllAccounts();
        this._accounts.set(accounts);
    }

    async addAccount(accountData: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
        const now = new Date().toISOString();
        const account: Account = {
            id: crypto.randomUUID(),
            ...accountData,
            createdAt: now,
            updatedAt: now,
        };

        await this.storage.putAccount(account);
        this._accounts.update(list => [...list, account]);
    }

    async updateAccount(id: string, updates: Partial<Omit<Account, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
        const existing = this._accounts().find(a => a.id === id);
        if (!existing) return;

        const updated: Account = {
            ...existing,
            ...updates,
            updatedAt: new Date().toISOString(),
        };

        await this.storage.putAccount(updated);
        this._accounts.update(list => list.map(a => a.id === id ? updated : a));
    }

    async deleteAccount(id: string): Promise<void> {
        await this.storage.deleteAccount(id);
        this._accounts.update(list => list.filter(a => a.id !== id));
    }

    getAccountByIdentifier(identifier: string): Account | undefined {
        return this._accounts().find(a => a.accountIdentifier === identifier);
    }
}
