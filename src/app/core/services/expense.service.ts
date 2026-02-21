import { Injectable, signal, computed } from '@angular/core';
import { StorageService } from '../storage/storage.service';
import { Expense } from '../models/expense.model';
import { CryptoService } from '../crypto/crypto.service';

@Injectable({ providedIn: 'root' })
export class ExpenseService {

    // --- DASHBOARD SIGNALS ---
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
        const monthPrefix = now.toISOString().substring(0, 7); // YYYY-MM
        const todayStr = now.toISOString().split('T')[0];

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

    /**
     * Add expense and incrementally update dependent state (Account Balance, MonthlySummery)
     */
    async addExpense(expenseData: Partial<Expense> & {
        merchantName?: string,
        accountIdentifier?: string,
        notes?: string,
        rawSms?: string
    }): Promise<void> {
        const now = new Date().toISOString();

        const payloadData = {
            merchantName: expenseData.merchantName,
            accountIdentifier: expenseData.accountIdentifier,
            notes: expenseData.notes,
            rawSms: expenseData.rawSms
        };

        const encryptedPayload = await this.crypto.encrypt(payloadData);

        const expense: Expense = {
            id: crypto.randomUUID(),
            amount: expenseData.amount || 0,
            date: expenseData.date || now.split('T')[0],
            type: expenseData.type || 'debit',
            categoryId: expenseData.categoryId || 'unknown',
            accountId: expenseData.accountId || 'unknown',
            source: expenseData.source || 'manual',
            parserVersion: expenseData.parserVersion || 1,
            encryptedPayload,
            createdAt: now,
            updatedAt: now
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
                account.updatedAt = now;
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

    async deleteExpense(id: string): Promise<void> {
        const db = await this.storage.ready();
        await db.delete('expenses', id);
        this.loadDashboardData();
    }
}
