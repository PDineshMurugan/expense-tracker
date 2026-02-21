import { Injectable } from '@angular/core';
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Expense } from '../models/expense.model';
import { Category } from '../models/category.model';
import { AppSettings } from '../models/settings.model';
import { Account } from '../models/account.model';

interface ExpenseTrackerDB extends DBSchema {
    expenses: {
        key: string;
        value: Expense;
        indexes: {
            'by-date': string;
            'by-category': string;
        };
    };
    categories: {
        key: string;
        value: Category;
    };
    settings: {
        key: string;
        value: unknown;
    };
    accounts: {
        key: string;
        value: Account;
    };
}

const DB_NAME = 'expense-tracker-db';
const DB_VERSION = 2;

/**
 * Storage Service
 * 
 * Persists data using:
 * - IndexedDB on web browsers and Capacitor for reliable client-side storage
 * - Capacitor Storage as fallback for embedded webviews on mobile
 * 
 * All data is persisted locally on the device with no cloud sync.
 * For backup, use the export/import feature in Settings.
 */
@Injectable({ providedIn: 'root' })
export class StorageService {
    private db!: IDBPDatabase<ExpenseTrackerDB>;
    private dbReady: Promise<void>;
    private useCapacitorStorage = false;

    constructor() {
        this.dbReady = this.initDB();
        this.detectCapacitorStorage();
        this.syncWithBackup(); // Attempt to restore from secondary storage if IDB is empty
    }

    /**
     * Check if Capacitor Storage should be used as backup
     */
    private detectCapacitorStorage(): void {
        try {
            const cap = (window as any)?.Capacitor;
            // Support both old 'Storage' and new 'Preferences' plugins
            this.useCapacitorStorage = !!(cap?.Plugins?.Storage || cap?.Plugins?.Preferences);
        } catch {
            this.useCapacitorStorage = false;
        }
    }

    private async initDB(): Promise<void> {
        try {
            this.db = await openDB<ExpenseTrackerDB>(DB_NAME, DB_VERSION, {
                upgrade(db) {
                    // Expenses store
                    if (!db.objectStoreNames.contains('expenses')) {
                        const expenseStore = db.createObjectStore('expenses', { keyPath: 'id' });
                        expenseStore.createIndex('by-date', 'date');
                        expenseStore.createIndex('by-category', 'category');
                    }

                    // Categories store
                    if (!db.objectStoreNames.contains('categories')) {
                        db.createObjectStore('categories', { keyPath: 'id' });
                    }

                    // Settings store
                    if (!db.objectStoreNames.contains('settings')) {
                        db.createObjectStore('settings');
                    }

                    // Accounts store (v2)
                    if (!db.objectStoreNames.contains('accounts')) {
                        db.createObjectStore('accounts', { keyPath: 'id' });
                    }
                },
            });
        } catch (error) {
            console.error('Failed to initialize IndexedDB:', error);
            throw new Error('Storage initialization failed. Please check your browser settings.');
        }
    }

    private async ready(): Promise<void> {
        await this.dbReady;
    }

    // ── Expenses ──

    async getAllExpenses(): Promise<Expense[]> {
        await this.ready();
        return this.db.getAll('expenses');
    }

    async getExpensesByDateRange(startDate: string, endDate: string): Promise<Expense[]> {
        await this.ready();
        const range = IDBKeyRange.bound(startDate, endDate);
        return this.db.getAllFromIndex('expenses', 'by-date', range);
    }

    async putExpense(expense: Expense): Promise<void> {
        await this.ready();
        await this.db.put('expenses', expense);

        // Also backup to Capacitor Storage if available
        if (this.useCapacitorStorage) {
            this.backupExpenseToCapacitor(expense).catch(err =>
                console.warn('Capacitor backup failed:', err)
            );
        }
    }

    async deleteExpense(id: string): Promise<void> {
        await this.ready();
        await this.db.delete('expenses', id);

        if (this.useCapacitorStorage) {
            this.removeExpenseFromCapacitor(id).catch(err =>
                console.warn('Capacitor backup deletion failed:', err)
            );
        }
    }

    // ── Categories ──

    async getAllCategories(): Promise<Category[]> {
        await this.ready();
        return this.db.getAll('categories');
    }

    async putCategory(category: Category): Promise<void> {
        await this.ready();
        await this.db.put('categories', category);
    }

    async deleteCategory(id: string): Promise<void> {
        await this.ready();
        await this.db.delete('categories', id);
    }

    // ── Accounts ──

    async getAllAccounts(): Promise<Account[]> {
        await this.ready();
        return this.db.getAll('accounts');
    }

    async putAccount(account: Account): Promise<void> {
        await this.ready();
        await this.db.put('accounts', account);
    }

    async deleteAccount(id: string): Promise<void> {
        await this.ready();
        await this.db.delete('accounts', id);
    }

    // ── Settings ──

    async getSetting<T>(key: string): Promise<T | undefined> {
        await this.ready();
        return this.db.get('settings', key) as Promise<T | undefined>;
    }

    async putSetting(key: string, value: unknown): Promise<void> {
        await this.ready();
        await this.db.put('settings', value, key);
    }

    // ── Bulk Operations ──

    async exportAll(): Promise<{ expenses: Expense[]; categories: Category[]; settings: Record<string, unknown> }> {
        await this.ready();
        const expenses = await this.db.getAll('expenses');
        const categories = await this.db.getAll('categories');

        const tx = this.db.transaction('settings', 'readonly');
        const settingsStore = tx.objectStore('settings');
        const keys = await settingsStore.getAllKeys();
        const settings: Record<string, unknown> = {};
        for (const key of keys) {
            settings[key as string] = await settingsStore.get(key);
        }

        return { expenses, categories, settings };
    }

    async importAll(data: { expenses: Expense[]; categories: Category[]; settings: Record<string, unknown> }): Promise<void> {
        await this.ready();

        // Clear existing data
        const tx = this.db.transaction(['expenses', 'categories', 'settings'], 'readwrite');
        await tx.objectStore('expenses').clear();
        await tx.objectStore('categories').clear();
        await tx.objectStore('settings').clear();

        // Import expenses
        for (const expense of data.expenses) {
            await this.db.put('expenses', expense);
        }

        // Import categories
        for (const category of data.categories) {
            await this.db.put('categories', category);
        }

        // Import settings
        for (const [key, value] of Object.entries(data.settings)) {
            await this.db.put('settings', value, key);
        }
    }

    private async syncWithBackup(): Promise<void> {
        if (!this.useCapacitorStorage) return;
        await this.ready();

        try {
            const expenses = await this.db.getAll('expenses');
            if (expenses.length > 0) return; // DB already has data

            console.log('[StorageService] IDB is empty, checking Capacitor Storage for backup...');
            const cap = (window as any)?.Capacitor?.Plugins;
            const storage = cap?.Storage || cap?.Preferences;

            if (!storage) return;

            const { keys } = await storage.keys();
            for (const key of keys) {
                if (key.startsWith('expense_')) {
                    const { value } = await storage.get({ key });
                    if (value) {
                        const expense = JSON.parse(value);
                        await this.db.put('expenses', expense);
                    }
                }
            }
            console.log('[StorageService] Backup sync complete.');
        } catch (error) {
            console.warn('[StorageService] Sync with backup failed:', error);
        }
    }

    // ── Capacitor Storage Backup (Mobile) ──

    private async backupExpenseToCapacitor(expense: Expense): Promise<void> {
        if (!this.useCapacitorStorage) return;

        try {
            const cap = (window as any)?.Capacitor?.Plugins;
            const storage = cap?.Storage || cap?.Preferences;
            if (storage) {
                await storage.set({
                    key: `expense_${expense.id}`,
                    value: JSON.stringify(expense)
                });
            }
        } catch (error) {
            console.warn('Failed to backup expense to Capacitor Storage:', error);
        }
    }

    private async removeExpenseFromCapacitor(id: string): Promise<void> {
        if (!this.useCapacitorStorage) return;

        try {
            const cap = (window as any)?.Capacitor?.Plugins;
            const storage = cap?.Storage || cap?.Preferences;
            if (storage) {
                await storage.remove({ key: `expense_${id}` });
            }
        } catch (error) {
            console.warn('Failed to remove expense from Capacitor Storage:', error);
        }
    }
}
