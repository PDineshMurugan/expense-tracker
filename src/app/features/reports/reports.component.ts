import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonIcon
} from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { ExpenseService } from '../../core/services/expense.service';
import { CategoryService } from '../../core/services/category.service';
import { CurrencyPipe } from '../../shared/pipes/currency.pipe';
import { Expense } from '../../core/models/expense.model';
import { addIcons } from 'ionicons';
import {
  barChart, wallet, receipt, trendingUp, search, calendar,
  fastFood, car, cart, film, medkit, home, school, airplane, gift
} from 'ionicons/icons';

@Component({
  selector: 'app-reports',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule,
    IonContent, IonHeader, IonToolbar, IonTitle,
    CurrencyPipe, IonIcon
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>
          <span class="toolbar-title">
            <ion-icon name="bar-chart" style="vertical-align: middle; margin-right: 6px;"></ion-icon>
            Reports
          </span>
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <!-- Filters -->
      <div class="glass-card filter-card animate-fade-in">
        <div class="filter-row">
          <div class="filter-group">
            <label class="filter-label">Month</label>
            <div class="select-wrapper">
              <select class="filter-select" [value]="selectedMonth()" (change)="onMonthChange($event)" id="month-select">
                @for (m of months; track m.value) {
                  <option [value]="m.value">{{ m.label }}</option>
                }
              </select>
              <span class="select-arrow">▾</span>
            </div>
          </div>
          <div class="filter-group">
            <label class="filter-label">Category</label>
            <div class="select-wrapper">
              <select class="filter-select" [value]="selectedCategoryId()" (change)="onCategoryChange($event)" id="category-select">
                <option value="all">All Categories</option>
                @for (cat of categoryService.categories(); track cat.id) {
                  <option [value]="cat.id">{{ cat.label }}</option>
                }
              </select>
              <span class="select-arrow">▾</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Summary KPIs -->
      <div class="kpi-row stagger-children">
        <div class="glass-card kpi-card kpi-card--total">
          <ion-icon name="wallet" class="kpi-icon"></ion-icon>
          <span class="kpi-label">Total</span>
          <span class="kpi-value">{{ filteredTotal() | currency }}</span>
        </div>
        <div class="glass-card kpi-card kpi-card--count">
          <ion-icon name="receipt" class="kpi-icon"></ion-icon>
          <span class="kpi-label">Count</span>
          <span class="kpi-value">{{ filteredExpenses().length }}</span>
        </div>
        <div class="glass-card kpi-card kpi-card--avg">
          <ion-icon name="trending-up" class="kpi-icon"></ion-icon>
          <span class="kpi-label">Average</span>
          <span class="kpi-value">{{ filteredAvg() | currency }}</span>
        </div>
      </div>

      <!-- Expense List -->
      @if (filteredExpenses().length > 0) {
        <div class="expense-list stagger-children">
          @for (expense of filteredExpenses(); track expense.id) {
            <div class="glass-card expense-card">
              <div class="expense-row">
                <div class="expense-icon-wrap">
                  <ion-icon [name]="expense.category" class="expense-icon"></ion-icon>
                </div>
                <div class="expense-info">
                  <span class="expense-label">{{ expense.categoryLabel }}</span>
                  <span class="expense-meta">{{ formatDate(expense.date) }} · {{ expense.paymentMode }}</span>
                </div>
                <span class="expense-amount">-{{ expense.amount | currency }}</span>
              </div>
              @if (expense.note) {
                <p class="expense-note">{{ expense.note }}</p>
              }
            </div>
          }
        </div>
      } @else {
        <div class="glass-card empty-card">
          <div class="empty-state">
            <ion-icon name="search" class="empty-state__icon"></ion-icon>
            <p class="empty-state__text">No expenses found for this filter</p>
          </div>
        </div>
      }
    </ion-content>
  `,
  styles: [`
    .toolbar-title {
      font-weight: var(--font-weight-bold);
      font-size: var(--font-size-lg);
    }

    /* ── Filters ── */
    .filter-card {
      margin-bottom: var(--spacing-md);
      padding: var(--spacing-lg);
    }

    .filter-row {
      display: flex;
      gap: var(--spacing-md);
    }

    .filter-group {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);
    }

    .filter-label {
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-bold);
      color: var(--color-text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .select-wrapper {
      position: relative;
    }

    .filter-select {
      width: 100%;
      padding: var(--spacing-sm) var(--spacing-md);
      padding-right: 28px;
      border: 1px solid var(--color-surface-alt);
      border-radius: var(--radius-sm);
      background: var(--color-surface);
      color: var(--color-text);
      font-size: var(--font-size-sm);
      font-family: var(--font-family);
      outline: none;
      appearance: none;
      -webkit-appearance: none;
      cursor: pointer;
      transition: border-color var(--transition-fast);
    }

    .filter-select:focus {
      border-color: var(--color-primary);
    }

    .select-arrow {
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 0.75rem;
      color: var(--color-text-secondary);
      pointer-events: none;
    }

    /* ── KPI Row ── */
    .kpi-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--spacing-sm);
      margin-bottom: var(--spacing-lg);
    }

    .kpi-card {
      text-align: center;
      padding: var(--spacing-md);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }

    .kpi-icon {
      font-size: 1.5rem;
      margin-bottom: var(--spacing-xs);
      color: var(--color-primary);
    }

    .kpi-label {
      font-size: var(--font-size-xs);
      color: var(--color-text-secondary);
      font-weight: var(--font-weight-semibold);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .kpi-value {
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-bold);
      color: var(--color-text);
      font-variant-numeric: tabular-nums;
    }

    /* ── Expense List ── */
    .expense-list {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
    }

    .expense-card {
      padding: var(--spacing-md);
      border-left: 3px solid var(--color-primary);
    }

    .expense-row {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
    }

    .expense-icon-wrap {
      width: 40px;
      height: 40px;
      border-radius: var(--radius-sm);
      background: var(--color-surface-alt);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .expense-icon {
        font-size: 1.25rem;
        color: var(--color-primary);
    }

    .expense-info {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .expense-label {
      font-weight: var(--font-weight-semibold);
      font-size: var(--font-size-sm);
      color: var(--color-text);
    }

    .expense-meta {
      font-size: var(--font-size-xs);
      color: var(--color-text-secondary);
    }

    .expense-amount {
      font-weight: var(--font-weight-bold);
      font-variant-numeric: tabular-nums;
      color: var(--color-danger);
      font-size: var(--font-size-base);
    }

    .expense-note {
      font-size: var(--font-size-xs);
      color: var(--color-text-secondary);
      margin-top: var(--spacing-xs);
      padding-left: 52px;
    }

    /* ── Empty State ── */
    .empty-state {
      text-align: center;
      padding: var(--spacing-xl) 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--spacing-sm);
    }

    .empty-state__icon {
      font-size: 2.5rem;
      color: var(--color-text-secondary);
    }

    .empty-state__text {
      color: var(--color-text-secondary);
      font-size: var(--font-size-sm);
    }

    .empty-card {
      padding: var(--spacing-md);
    }
  `]
})
export class ReportsComponent {
  protected readonly expenseService = inject(ExpenseService);
  protected readonly categoryService = inject(CategoryService);

  constructor() {
    addIcons({
      barChart, wallet, receipt, trendingUp, search, calendar,
      fastFood, car, cart, film, medkit, home, school, airplane, gift
    });
  }

  readonly selectedMonth = signal<string>(this.getCurrentMonth());
  readonly selectedCategoryId = signal<string>('all');

  readonly months = this.generateMonths();

  readonly filteredExpenses = computed((): Expense[] => {
    const [year, month] = this.selectedMonth().split('-').map(Number);
    let expenses = this.expenseService.getExpensesByMonth(year, month - 1);

    if (this.selectedCategoryId() !== 'all') {
      const cat = this.categoryService.categories().find(c => c.id === this.selectedCategoryId());
      if (cat) {
        expenses = expenses.filter(e => e.category === cat.icon);
      }
    }

    return expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  });

  readonly filteredTotal = computed(() =>
    this.filteredExpenses().reduce((sum, e) => sum + e.amount, 0)
  );

  readonly filteredAvg = computed(() => {
    const list = this.filteredExpenses();
    return list.length > 0 ? Math.round(this.filteredTotal() / list.length) : 0;
  });

  private getCurrentMonth(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  private generateMonths(): { value: string; label: string }[] {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
      });
    }
    return months;
  }

  onMonthChange(event: Event): void {
    this.selectedMonth.set((event.target as HTMLSelectElement).value);
  }

  onCategoryChange(event: Event): void {
    this.selectedCategoryId.set((event.target as HTMLSelectElement).value);
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }
}
