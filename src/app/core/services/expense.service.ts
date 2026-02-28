import { Injectable, signal, computed } from '@angular/core';
import { StorageService } from '../storage/storage.service';
import { Expense } from '../models/expense.model';
import { CryptoService } from '../crypto/crypto.service';

@Injectable({ providedIn: 'root' })
export class ExpenseService {

    // --- DASHBOARD SIGNALS ---
    private _isLoaded = signal<boolean>(false);
    readonly isLoaded = this._isLoaded.asReadonly();

    private _monthlyTotal = signal<number>(0);
    readonly monthlyTotal = this._monthlyTotal.asReadonly();

    private _todaySpend = signal<number>(0);
    readonly todaySpend = this._todaySpend.asReadonly();

    private _topFiveTransactions = signal<Expense[]>([]);
    readonly topFiveTransactions = this._topFiveTransactions.asReadonly();

    private _categoryBreakdown = signal<any[]>([]);
    readonly categoryBreakdown = this._categoryBreakdown.asReadonly();

    private _last7DaysTrend = signal<any[]>([]);
    readonly last7DaysTrend = this._last7DaysTrend.asReadonly();

    private _accountMonthlyTotals = signal<Record<string, number>>({});

    constructor(
        private storage: StorageService,
        private crypto: CryptoService
    ) {
        this.loadDashboardData();
    }

    monthlyTotalByAccount(accountId: string): number {
        return this._accountMonthlyTotals()[accountId] || 0;
    }

    async loadDashboardData(): Promise<void> {
        const db = await this.storage.ready();

        const now = new Date();
        const tzOffset = now.getTimezoneOffset() * 60000;
        const localISO = new Date(now.getTime() - tzOffset).toISOString();
        const monthPrefix = localISO.substring(0, 7); // YYYY-MM
        const todayStr = localISO.split('T')[0];

        // 1. Monthly Total
        const summaryStore = db.transaction('monthlySummaries', 'readonly').objectStore('monthlySummaries');
        const currentSummary = await summaryStore.get(monthPrefix);
        this._monthlyTotal.set(currentSummary?.totalExpense || 0);

        // 2. Fetch recent expenses for the current month
        const expenses = await this.getExpenses({ limit: 1000, offset: 0, startDate: `${monthPrefix}-01`, endDate: `${monthPrefix}-31` });

        let tSpend = 0;
        const catMap = new Map<string, number>();
        const accMap: Record<string, number> = {};

        const trendMap = new Map<string, number>();
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            trendMap.set(d.toISOString().split('T')[0], 0);
        }

        for (const e of expenses) {
            if (e.type === 'debit') {
                if (e.date === todayStr) tSpend += e.amount;

                catMap.set(e.categoryId, (catMap.get(e.categoryId) || 0) + e.amount);
                accMap[e.accountId] = (accMap[e.accountId] || 0) + e.amount;

                if (trendMap.has(e.date)) {
                    trendMap.set(e.date, trendMap.get(e.date)! + e.amount);
                }
            }
        }

        this._todaySpend.set(tSpend);
        this._accountMonthlyTotals.set(accMap);

        // Top 5
        this._topFiveTransactions.set(expenses.slice(0, 5));

        // Category Breakdown
        const catArr = Array.from(catMap.entries()).map(([categoryId, total]) => ({
            categoryId,
            label: categoryId, // Mapped in UI
            icon: 'receipt',   // Fallback icon
            total
        })).sort((a, b) => b.total - a.total);
        this._categoryBreakdown.set(catArr);

        // Trend
        const trendArr = Array.from(trendMap.entries()).map(([date, total]) => ({ date, total }));
        this._last7DaysTrend.set(trendArr);

        this._isLoaded.set(true);
    }

    /**
     * Get paginated expenses with optional date range bounds.
     * Never loads the full array into memory.
     */
    async getExpenses(options: {
        limit: number;
        offset: number;
        startDate?: string; // YYYY-MM-DD
        endDate?: string; // YYYY-MM-DD
    }): Promise<Expense[]> {
        const db = await this.storage.ready();

        const tx = db.transaction('expenses', 'readonly');
        const index = tx.store.index('byDate');

        let range: IDBKeyRange | undefined;
        if (options.startDate && options.endDate) {
            range = IDBKeyRange.bound(options.startDate, options.endDate);
        } else if (options.startDate) {
            range = IDBKeyRange.lowerBound(options.startDate);
        }

        let cursor = await index.openCursor(range, 'prev');

        const results: Expense[] = [];

        if (options.offset > 0 && cursor) {
            await cursor.advance(options.offset);
        }

        while (cursor && results.length < options.limit) {
            let expense = cursor.value;
            if (expense.encryptedPayload) {
                try {
                    const decrypted = await this.crypto.decrypt(expense.encryptedPayload);
                    expense = { ...expense, ...decrypted };
                } catch (e) {
                    console.error('Decryption failed for expense', expense.id);
                }
            }

            results.push(expense);
            cursor = await cursor.continue();
        }

        return results;
    }

    async addExpense(expenseData: Partial<Expense> & {
        merchantName?: string,
        accountIdentifier?: string,
        notes?: string,
        rawSms?: string,
        timestampStr?: string // Injectable ID prefix
    }): Promise<void> {
        const now = new Date();
        const tzOffset = now.getTimezoneOffset() * 60000;
        const localISO = new Date(now.getTime() - tzOffset).toISOString();

        // Sorting Prefix (Allows tying the ID to the date instead of pure randomness)
        const idPrefix = expenseData.timestampStr || now.getTime().toString();

        const payloadData = {
            merchantName: expenseData.merchantName,
            accountIdentifier: expenseData.accountIdentifier,
            notes: expenseData.notes,
            rawSms: expenseData.rawSms
        };

        const encryptedPayload = await this.crypto.encrypt(payloadData);

        const expense: Expense = {
            id: `${idPrefix}-${crypto.randomUUID()}`,
            amount: expenseData.amount || 0,
            date: expenseData.date || localISO.split('T')[0],
            type: expenseData.type || 'debit',
            categoryId: expenseData.categoryId || 'unknown',
            accountId: expenseData.accountId || 'unknown',
            source: expenseData.source || 'manual',
            parserVersion: expenseData.parserVersion || 1,
            encryptedPayload,
            createdAt: localISO,
            updatedAt: localISO
        };

        const db = await this.storage.ready();
        const tx = db.transaction(['expenses', 'accounts', 'monthlySummaries'], 'readwrite');

        try {
            await tx.objectStore('expenses').put(expense);

            const accountStore = tx.objectStore('accounts');
            const account = await accountStore.get(expense.accountId);
            if (account) {
                if (expense.type === 'debit') {
                    account.balance -= expense.amount;
                } else {
                    account.balance += expense.amount;
                }
                account.updatedAt = localISO;
                await accountStore.put(account);
            }

            const monthPrefix = expense.date.substring(0, 7);
            const summaryStore = tx.objectStore('monthlySummaries');
            let summary = await summaryStore.get(monthPrefix);

            if (!summary) {
                summary = { month: monthPrefix, totalExpense: 0, totalIncome: 0 };
            }

            if (expense.type === 'debit') {
                summary.totalExpense += expense.amount;
            } else {
                summary.totalIncome += expense.amount;
            }
            await summaryStore.put(summary);

            await tx.done;
            this.loadDashboardData();
        } catch (error) {
            console.error('Transaction Failed, rolling back', error);
            tx.abort();
            throw error;
        }
    }

    async getExpenseById(id: string): Promise<Expense | undefined> {
        const db = await this.storage.ready();
        const tx = db.transaction('expenses', 'readonly');
        const store = tx.objectStore('expenses');
        let expense: Expense = await store.get(id);

        if (expense && expense.encryptedPayload) {
            try {
                const decrypted = await this.crypto.decrypt(expense.encryptedPayload);
                expense = { ...expense, ...decrypted };
            } catch (e) {
                console.error('Decryption failed for expense', expense.id);
            }
        }
        return expense;
    }

    async updateExpense(id: string, updates: Partial<Expense> & {
        merchantName?: string,
        accountIdentifier?: string,
        notes?: string,
        rawSms?: string,
    }): Promise<void> {
        const now = new Date();
        const tzOffset = now.getTimezoneOffset() * 60000;
        const localISO = new Date(now.getTime() - tzOffset).toISOString();

        const db = await this.storage.ready();

        // Use a transaction across expenses, accounts, and monthlySummaries to safely adjust balances
        const tx = db.transaction(['expenses', 'accounts', 'monthlySummaries'], 'readwrite');
        const expenseStore = tx.objectStore('expenses');
        const accountStore = tx.objectStore('accounts');
        const summaryStore = tx.objectStore('monthlySummaries');

        try {
            const existingExpense = await expenseStore.get(id);
            if (!existingExpense) {
                throw new Error(`Expense with id ${id} not found`);
            }

            // 1. Revert previous balances
            const oldAccount = await accountStore.get(existingExpense.accountId);
            if (oldAccount) {
                if (existingExpense.type === 'debit') {
                    oldAccount.balance += existingExpense.amount; // Revert debit
                } else {
                    oldAccount.balance -= existingExpense.amount; // Revert credit
                }
                oldAccount.updatedAt = localISO;
                await accountStore.put(oldAccount);
            }

            const oldMonthPrefix = existingExpense.date.substring(0, 7);
            const oldSummary = await summaryStore.get(oldMonthPrefix);
            if (oldSummary) {
                if (existingExpense.type === 'debit') {
                    oldSummary.totalExpense -= existingExpense.amount;
                } else {
                    oldSummary.totalIncome -= existingExpense.amount;
                }
                await summaryStore.put(oldSummary);
            }

            // 2. Prepare new data
            let decryptedExistingPayload: any = {};
            if (existingExpense.encryptedPayload) {
                try {
                    decryptedExistingPayload = await this.crypto.decrypt(existingExpense.encryptedPayload);
                } catch (e) { /* ignore */ }
            }

            const payloadData = {
                merchantName: updates.merchantName !== undefined ? updates.merchantName : decryptedExistingPayload.merchantName,
                accountIdentifier: updates.accountIdentifier !== undefined ? updates.accountIdentifier : decryptedExistingPayload.accountIdentifier,
                notes: updates.notes !== undefined ? updates.notes : decryptedExistingPayload.notes,
                rawSms: updates.rawSms !== undefined ? updates.rawSms : decryptedExistingPayload.rawSms
            };

            const encryptedPayload = await this.crypto.encrypt(payloadData);

            const updatedExpense: Expense = {
                ...existingExpense,
                ...updates,
                encryptedPayload,
                updatedAt: localISO
            };

            // 3. Apply new balances
            const newAccount = await accountStore.get(updatedExpense.accountId);
            if (newAccount) {
                if (updatedExpense.type === 'debit') {
                    newAccount.balance -= updatedExpense.amount;
                } else {
                    newAccount.balance += updatedExpense.amount;
                }
                newAccount.updatedAt = localISO;
                await accountStore.put(newAccount);
            }

            const newMonthPrefix = updatedExpense.date.substring(0, 7);
            let newSummary = await summaryStore.get(newMonthPrefix);
            if (!newSummary) {
                newSummary = { month: newMonthPrefix, totalExpense: 0, totalIncome: 0 };
            }

            if (updatedExpense.type === 'debit') {
                newSummary.totalExpense += updatedExpense.amount;
            } else {
                newSummary.totalIncome += updatedExpense.amount;
            }
            await summaryStore.put(newSummary);

            // 4. Save updated expense
            await expenseStore.put(updatedExpense);

            await tx.done;
            this.loadDashboardData();
        } catch (error) {
            console.error('Update Transaction Failed, rolling back', error);
            tx.abort();
            throw error;
        }
    }

    async updateBulkCategoryForVendor(merchantName: string, categoryId: string): Promise<number> {
        if (!merchantName || !categoryId) return 0;

        const db = await this.storage.ready();
        const tx = db.transaction('expenses', 'readwrite');
        const store = tx.objectStore('expenses');
        let cursor = await store.openCursor();
        let updatedCount = 0;

        const now = new Date();
        const tzOffset = now.getTimezoneOffset() * 60000;
        const localISO = new Date(now.getTime() - tzOffset).toISOString();

        while (cursor) {
            let expense = cursor.value;
            let currentMerchant = (expense as any).merchantName;

            if (expense.encryptedPayload && !currentMerchant) {
                try {
                    const decrypted: any = await this.crypto.decrypt(expense.encryptedPayload);
                    currentMerchant = decrypted.merchantName;
                } catch (e) { }
            }

            if (currentMerchant === merchantName && expense.categoryId !== categoryId) {
                expense.categoryId = categoryId;
                expense.updatedAt = localISO;
                await cursor.update(expense);
                updatedCount++;
            }
            cursor = await cursor.continue();
        }

        await tx.done;

        if (updatedCount > 0) {
            this.loadDashboardData();
        }
        return updatedCount;
    }

    async deleteExpense(id: string): Promise<void> {
        const db = await this.storage.ready();
        await db.delete('expenses', id);
        this.loadDashboardData();
    }
}
