import { Injectable } from '@angular/core';
import { StorageService } from '../storage/storage.service';
import { Budget } from '../models/budget.model';

@Injectable({ providedIn: 'root' })
export class BudgetService {

    constructor(private storage: StorageService) { }

    async getBudgets(): Promise<Budget[]> {
        const db = await this.storage.ready();
        return db.getAll('budgets');
    }

    async setBudget(categoryId: string, monthlyLimit: number): Promise<void> {
        const db = await this.storage.ready();

        // Logic to check if budget for category already exists
        const tx = db.transaction('budgets', 'readwrite');
        const store = tx.objectStore('budgets');

        // Create an index by Category ID if needed, 
        // for now we'll iterate since budgets count is small <= number of categories.
        const budgets = await store.getAll();
        const existing = budgets.find(b => b.categoryId === categoryId);

        if (existing) {
            existing.monthlyLimit = monthlyLimit;
            await store.put(existing);
        } else {
            await store.put({
                id: crypto.randomUUID(),
                categoryId,
                monthlyLimit
            });
        }
        await tx.done;
    }

    async deleteBudget(id: string): Promise<void> {
        const db = await this.storage.ready();
        await db.delete('budgets', id);
    }
}
