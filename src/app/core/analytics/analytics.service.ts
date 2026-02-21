import { Injectable } from '@angular/core';
import { StorageService } from '../storage/storage.service';
// import { Expense } from '../models/expense.model';
// import { Budget } from '../models/budget.model';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {

    constructor(private storage: StorageService) { }

    /**
     * Compute Category Distribution for a specific date range.
     * Uses the 'byDate' index on the expenses store to avoid full table scans.
     */
    async getCategoryDistribution(startDate: string, endDate: string): Promise<Record<string, number>> {
        const db = await this.storage.ready();
        const tx = db.transaction('expenses', 'readonly');
        const index = tx.store.index('byDate');

        let cursor = await index.openCursor(IDBKeyRange.bound(startDate, endDate));
        const distribution: Record<string, number> = {};

        while (cursor) {
            const expense = cursor.value;
            if (expense.type === 'debit') {
                distribution[expense.categoryId] = (distribution[expense.categoryId] || 0) + expense.amount;
            }
            cursor = await cursor.continue();
        }

        return distribution;
    }

    /**
     * Compute Budget vs Actual per category for a given month prefix (e.g., '2023-10')
     */
    async getBudgetUsage(monthPrefix: string): Promise<Array<{ categoryId: string, limit: number, actual: number, ratio: number }>> {
        const db = await this.storage.ready();

        // 1. Get all budgets
        const budgets = await db.getAll('budgets');

        // 2. Get expenses for the month
        const startDate = `${monthPrefix}-01`;
        const endDate = `${monthPrefix}-31`; // Simplified, assumes max 31 days

        const distribution = await this.getCategoryDistribution(startDate, endDate);

        return budgets.map(b => {
            const actual = distribution[b.categoryId] || 0;
            return {
                categoryId: b.categoryId,
                limit: b.monthlyLimit,
                actual,
                ratio: b.monthlyLimit > 0 ? actual / b.monthlyLimit : 0
            };
        });
    }

    /**
     * Identify recurring payments
     * (Same merchant, amt +- 5%, >= 3 occurrences, ~30 days apart)
     * For performance, this should be incrementally evaluated over recent data, not the full history.
     */
    async detectRecurringPayments(recentDays: number = 90): Promise<void> {
        // Implementation logic to group recent paginated expenses by merchant
        // Calculate standard deviations on dates & amounts
        // Update the 'recurringPatterns' store with matches
        throw new Error('Not implemented: requires complex incremental grouping logic');
    }

    /**
     * Return top merchants by transaction count over a paginated slice
     */
    async getMerchantFrequency(limit: number = 10, days: number = 30): Promise<Array<{ merchantName: string, count: number }>> {
        // Dummy implementation framework
        throw new Error('Not implemented: Merchant data is encrypted in the payload, requiring in-memory decryption of the recent paginated slice to calculate frequency.');
    }

    /**
     * Flag anomalies in recent spending
     */
    async detectAnomalies(todaySpend: number): Promise<boolean> {
        const db = await this.storage.ready();
        const tx = db.transaction('monthlySummaries', 'readonly');
        // Fetch recent monthly summaries to calculate daily avg and std dev
        // For accurate std deviation, requires historical data analysis
        // Placeholder anomaly check return:
        return false;
    }
}
