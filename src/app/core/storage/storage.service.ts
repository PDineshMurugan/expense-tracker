import { Injectable } from '@angular/core';
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Expense } from '../models/expense.model';
import { Category } from '../models/category.model';
import { Account } from '../models/account.model';
import { Budget } from '../models/budget.model';
import { MerchantAlias } from '../models/merchant-alias.model';
import { RecurringPattern } from '../models/recurring-pattern.model';
import { MonthlySummary } from '../models/monthly-summary.model';

interface ExpenseTrackerDB extends DBSchema {
    expenses: {
        key: string;
        value: Expense;
        indexes: {
            'byDate': string;
            'byCategory': string;
            'byAccount': string;
            'byType': string;
        };
    };
    categories: {
        key: string;
        value: Category;
    };
    accounts: {
        key: string;
        value: Account;
    };
    budgets: {
        key: string;
        value: Budget;
    };
    merchantAliases: {
        key: string;
        value: MerchantAlias;
    };
    recurringPatterns: {
        key: string;
        value: RecurringPattern;
    };
    monthlySummaries: {
        key: string;
        value: MonthlySummary;
    };
    // Keep settings store for legacy app settings if needed
    settings: {
        key: string;
        value: unknown;
    };
}

const DB_NAME = 'expense-tracker-offline-db';
const DB_VERSION = 1;

/**
 * Storage Service
 * 
 * Persists data using IndexedDB (via idb library).
 * Designed for offline-first, avoiding full table scans.
 */
@Injectable({ providedIn: 'root' })
export class StorageService {
    private db!: IDBPDatabase<ExpenseTrackerDB>;
    private dbReady: Promise<void>;

    constructor() {
        this.dbReady = this.initDB();
    }

    private async initDB(): Promise<void> {
        try {
            this.db = await openDB<ExpenseTrackerDB>(DB_NAME, DB_VERSION, {
                upgrade(db) {
                    // Expenses store
                    if (!db.objectStoreNames.contains('expenses')) {
                        const expenseStore = db.createObjectStore('expenses', { keyPath: 'id' });
                        expenseStore.createIndex('byDate', 'date');
                        expenseStore.createIndex('byCategory', 'categoryId');
                        expenseStore.createIndex('byAccount', 'accountId');
                        expenseStore.createIndex('byType', 'type');
                    }

                    // Categories store
                    if (!db.objectStoreNames.contains('categories')) {
                        db.createObjectStore('categories', { keyPath: 'id' });
                    }

                    // Accounts store
                    if (!db.objectStoreNames.contains('accounts')) {
                        db.createObjectStore('accounts', { keyPath: 'id' });
                    }

                    // Budgets store
                    if (!db.objectStoreNames.contains('budgets')) {
                        db.createObjectStore('budgets', { keyPath: 'id' });
                    }

                    // Merchant Aliases store
                    if (!db.objectStoreNames.contains('merchantAliases')) {
                        db.createObjectStore('merchantAliases', { keyPath: 'id' });
                    }

                    // Recurring Patterns store
                    if (!db.objectStoreNames.contains('recurringPatterns')) {
                        db.createObjectStore('recurringPatterns', { keyPath: 'id' });
                    }

                    // Monthly Summaries store
                    if (!db.objectStoreNames.contains('monthlySummaries')) {
                        db.createObjectStore('monthlySummaries', { keyPath: 'month' });
                    }

                    // Settings store (key-value)
                    if (!db.objectStoreNames.contains('settings')) {
                        db.createObjectStore('settings');
                    }
                },
            });
        } catch (error) {
            console.error('Failed to initialize IndexedDB:', error);
            throw new Error('Storage initialization failed. Please check your browser settings.');
        }
    }

    async ready(): Promise<IDBPDatabase<ExpenseTrackerDB>> {
        await this.dbReady;
        return this.db;
    }

    // Example reusable method to fetch paginated data using indexes
    // Actual implementation of queries should arguably reside inside domain services (ExpenseService), 
    // but the IDB instance is exposed here via `ready()`.
}
