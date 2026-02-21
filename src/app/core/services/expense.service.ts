import { Injectable, signal, computed } from '@angular/core';
import { StorageService } from './storage.service';
import { Expense, PaymentMode } from '../models/expense.model';

@Injectable({ providedIn: 'root' })
export class ExpenseService {
    private _expenses = signal<Expense[]>([]);

    readonly expenses = this._expenses.asReadonly();

    readonly monthlyTotal = computed(() => {
        const now = new Date();
        const month = now.getMonth();
        const year = now.getFullYear();
        return this._expenses()
            .filter(e => {
                const d = new Date(e.date);
                return d.getMonth() === month && d.getFullYear() === year && !e.isTransfer;
            })
            .reduce((sum, e) => sum + e.amount, 0);
    });

    readonly todaySpend = computed(() => {
        const today = new Date().toISOString().split('T')[0];
        return this._expenses()
            .filter(e => e.date === today && !e.isTransfer)
            .reduce((sum, e) => sum + e.amount, 0);
    });

    monthlyTotalByAccount(accountId: string): number {
        const now = new Date();
        const month = now.getMonth();
        const year = now.getFullYear();
        return this._expenses()
            .filter(e => {
                const d = new Date(e.date);
                return d.getMonth() === month && d.getFullYear() === year && e.accountId === accountId && !e.isTransfer;
            })
            .reduce((sum, e) => sum + e.amount, 0);
    }

    readonly topFiveTransactions = computed(() => {
        return [...this._expenses()]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5);
    });

    readonly last7DaysTrend = computed(() => {
        const days: { date: string; total: number }[] = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const total = this._expenses()
                .filter(e => e.date === dateStr && !e.isTransfer)
                .reduce((sum, e) => sum + e.amount, 0);
            days.push({ date: dateStr, total });
        }
        return days;
    });

    readonly categoryBreakdown = computed(() => {
        const now = new Date();
        const month = now.getMonth();
        const year = now.getFullYear();
        const map = new Map<string, { icon: string; label: string; total: number; color?: string }>();

        this._expenses()
            .filter(e => {
                const d = new Date(e.date);
                return d.getMonth() === month && d.getFullYear() === year && !e.isTransfer;
            })
            .forEach(e => {
                const existing = map.get(e.category) || { icon: e.category, label: e.categoryLabel, total: 0 };
                existing.total += e.amount;
                map.set(e.category, existing);
            });

        return Array.from(map.values()).sort((a, b) => b.total - a.total);
    });

    constructor(private storage: StorageService) {
        this.loadExpenses();
    }

    async loadExpenses(): Promise<void> {
        const expenses = await this.storage.getAllExpenses();
        this._expenses.set(expenses);
    }

    async addExpense(data: {
        amount: number;
        category: string;
        categoryLabel: string;
        note?: string;
        date?: string;
        paymentMode?: PaymentMode;
        accountId?: string;
        type?: 'debit' | 'credit';
        isTransfer?: boolean;
        source?: 'manual' | 'sms';
        smsBody?: string;
        smsId?: string;
        merchant?: string;
    }): Promise<void> {
        const expense: Expense = {
            id: crypto.randomUUID(),
            amount: data.amount,
            category: data.category,
            categoryLabel: data.categoryLabel,
            note: data.note || '',
            date: data.date || new Date().toISOString().split('T')[0],
            paymentMode: data.paymentMode || 'UPI',
            createdAt: new Date().toISOString(),
            accountId: data.accountId,
            type: data.type || 'debit',
            isTransfer: data.isTransfer || false,
            source: data.source || 'manual',
            smsBody: data.smsBody,
            smsId: data.smsId,
            merchant: data.merchant
        };

        await this.storage.putExpense(expense);
        this._expenses.update(list => [expense, ...list]);
    }

    async deleteExpense(id: string): Promise<void> {
        await this.storage.deleteExpense(id);
        this._expenses.update(list => list.filter(e => e.id !== id));
    }

    getExpensesByMonth(year: number, month: number): Expense[] {
        return this._expenses().filter(e => {
            const d = new Date(e.date);
            return d.getFullYear() === year && d.getMonth() === month;
        });
    }

    getExpensesByCategory(category: string): Expense[] {
        return this._expenses().filter(e => e.category === category);
    }
}
