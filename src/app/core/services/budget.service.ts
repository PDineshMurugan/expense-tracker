import { Injectable, signal, computed } from '@angular/core';
import { StorageService } from './storage.service';
import { ExpenseService } from './expense.service';
import { DEFAULT_SETTINGS } from '../models/settings.model';

@Injectable({ providedIn: 'root' })
export class BudgetService {
    private _monthlyBudget = signal<number>(DEFAULT_SETTINGS.monthlyBudget);

    readonly monthlyBudget = this._monthlyBudget.asReadonly();

    readonly budgetRemaining = computed(() => {
        const budget = this._monthlyBudget();
        if (budget <= 0) return 0;
        return Math.max(0, budget - this.expenseService.monthlyTotal());
    });

    readonly budgetUsagePercent = computed(() => {
        const budget = this._monthlyBudget();
        if (budget <= 0) return 0;
        return Math.min(100, Math.round((this.expenseService.monthlyTotal() / budget) * 100));
    });

    readonly isWarningState = computed(() => {
        return this._monthlyBudget() > 0 && this.budgetUsagePercent() >= 80;
    });

    constructor(
        private storage: StorageService,
        private expenseService: ExpenseService
    ) {
        this.loadBudget();
    }

    private async loadBudget(): Promise<void> {
        const budget = await this.storage.getSetting<number>('monthlyBudget');
        if (budget !== undefined) {
            this._monthlyBudget.set(budget);
        }
    }

    async setBudget(amount: number): Promise<void> {
        this._monthlyBudget.set(amount);
        await this.storage.putSetting('monthlyBudget', amount);
    }
}
