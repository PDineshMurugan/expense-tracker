import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  IonContent
} from '@ionic/angular/standalone';
import { ExpenseService } from '../../core/services/expense.service';
import { BudgetService } from '../../core/services/budget.service';
import { CategoryService } from '../../core/services/category.service';
import { SmsService } from '../../core/services/sms.service';
import { CurrencyPipe } from '../../shared/pipes/currency.pipe';
import { RelativeDatePipe } from '../../shared/pipes/relative-date.pipe';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, RouterModule,
    IonContent,
    CurrencyPipe, RelativeDatePipe
  ],
  template: `
    <ion-content [fullscreen]="true">
      <!-- Gradient Hero Header -->
      <div class="hero-section">
        <div class="hero-bg"></div>
        <div class="hero-content">
          <div class="hero-greeting">
            <span class="hero-emoji">💰</span>
            <h1 class="hero-title">Expense Tracker</h1>
          </div>
          <div class="hero-amount-block">
            <span class="hero-label">This Month</span>
            <span class="hero-amount">{{ expenseService.monthlyTotal() | currency }}</span>
          </div>
        </div>
        <!-- Decorative Orbs -->
        <div class="hero-orb hero-orb--1"></div>
        <div class="hero-orb hero-orb--2"></div>
      </div>

      <div class="content-body">
        <!-- Budget Warning -->
        @if (budgetService.isWarningState()) {
          <div class="warning-banner">
            ⚠️ You've used {{ budgetService.budgetUsagePercent() }}% of your monthly budget!
          </div>
        }

        <!-- KPI Cards -->
        <div class="kpi-row stagger-children">
          <div class="glass-card kpi-card">
            <div class="kpi-icon-wrap kpi-icon--budget">📊</div>
            <span class="kpi-label">Budget Left</span>
            <span class="kpi-value" [class.kpi-value--accent]="!budgetService.isWarningState()" [class.kpi-value--danger]="budgetService.isWarningState()">
              {{ budgetService.budgetRemaining() | currency }}
            </span>
            @if (budgetService.monthlyBudget() > 0) {
              <div class="budget-progress">
                <div class="budget-progress__track">
                  <div class="budget-progress__fill"
                       [style.width.%]="budgetService.budgetUsagePercent()"
                       [class.budget-progress__fill--warning]="budgetService.isWarningState()">
                  </div>
                </div>
                <span class="budget-progress__label">{{ budgetService.budgetUsagePercent() }}%</span>
              </div>
            }
          </div>
          <div class="glass-card kpi-card">
            <div class="kpi-icon-wrap kpi-icon--today">📅</div>
            <span class="kpi-label">Today</span>
            <span class="kpi-value">{{ expenseService.todaySpend() | currency }}</span>
          </div>
        </div>

        <!-- SMS Auto-Detected (if any) -->
        @if (smsService.smsExpenses().length > 0) {
          <div class="section animate-fade-in-up">
            <div class="section-header">
              <h3 class="section-title">📱 SMS Detected</h3>
              <span class="section-badge">{{ smsService.smsExpenses().length }}</span>
            </div>
            <div class="sms-scroll">
              @for (sms of smsService.smsExpenses().slice(0, 3); track sms.id) {
                <div class="glass-card sms-card">
                  <div class="sms-card__row">
                    <span class="sms-card__icon">🏦</span>
                    <div class="sms-card__info">
                      <span class="sms-card__desc">{{ sms.description }}</span>
                      <span class="sms-card__meta">{{ sms.type === 'debit' ? 'Debited' : 'Credited' }}</span>
                    </div>
                    <span class="sms-card__amount" [class.sms-card__amount--credit]="sms.type === 'credit'">
                      {{ sms.type === 'debit' ? '-' : '+' }}{{ sms.amount | currency }}
                    </span>
                  </div>
                </div>
              }
            </div>
          </div>
        }

        <!-- Charts Section -->
        <div class="charts-row">
          <!-- Category Breakdown -->
          <div class="glass-card chart-card animate-fade-in-up">
            <h3 class="chart-title">Category Breakdown</h3>
            @if (expenseService.categoryBreakdown().length > 0) {
              <div class="category-chart stagger-children">
                @for (cat of expenseService.categoryBreakdown(); track cat.label) {
                  <div class="category-row">
                    <span class="category-row__emoji">{{ cat.emoji }}</span>
                    <div class="category-row__info">
                      <div class="category-row__top">
                        <span class="category-row__label">{{ cat.label }}</span>
                        <span class="category-row__amount">{{ cat.total | currency }}</span>
                      </div>
                      <div class="category-row__bar">
                        <div class="category-row__bar-fill"
                             [style.width.%]="getCategoryPercent(cat.total)">
                        </div>
                      </div>
                    </div>
                  </div>
                }
              </div>
            } @else {
              <div class="empty-state">
                <span class="empty-state__icon">📭</span>
                <p class="empty-state__text">No expenses this month</p>
              </div>
            }
          </div>

          <!-- 7-Day Trend -->
          <div class="glass-card chart-card animate-fade-in-up" style="animation-delay: 100ms">
            <h3 class="chart-title">7-Day Trend</h3>
            <div class="trend-chart">
              @for (day of expenseService.last7DaysTrend(); track day.date; let i = $index) {
                <div class="trend-col">
                  <div class="trend-bar-wrap">
                    <div class="trend-bar"
                         [style.height.%]="getTrendBarHeight(day.total)"
                         [style.animation-delay]="(i * 80) + 'ms'">
                    </div>
                  </div>
                  <span class="trend-day">{{ formatDay(day.date) }}</span>
                  <span class="trend-amt">{{ day.total > 0 ? (day.total | currency) : '' }}</span>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Recent Transactions -->
        <div class="section">
          <h3 class="section-title">Recent Transactions</h3>
          @if (expenseService.topFiveTransactions().length > 0) {
            <div class="transaction-list stagger-children">
              @for (expense of expenseService.topFiveTransactions(); track expense.id) {
                <div class="glass-card transaction-card">
                  <div class="transaction-row">
                    <div class="transaction-emoji-wrap">
                      <span class="emoji-icon">{{ expense.category }}</span>
                    </div>
                    <div class="transaction-info">
                      <span class="transaction-label">{{ expense.categoryLabel }}</span>
                      <span class="transaction-date">{{ expense.date | relativeDate }} · {{ expense.paymentMode }}</span>
                    </div>
                    <span class="transaction-amount">-{{ expense.amount | currency }}</span>
                  </div>
                  @if (expense.note) {
                    <p class="transaction-note">{{ expense.note }}</p>
                  }
                </div>
              }
            </div>
          } @else {
            <div class="glass-card empty-card">
              <div class="empty-state">
                <span class="empty-state__icon">✨</span>
                <p class="empty-state__text">No expenses yet. Tap + to add one!</p>
              </div>
            </div>
          }
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    /* ── Hero Section ── */
    .hero-section {
      position: relative;
      padding: calc(env(safe-area-inset-top, 16px) + 24px) var(--spacing-lg) var(--spacing-2xl);
      overflow: hidden;
      min-height: 200px;
    }

    .hero-bg {
      position: absolute;
      inset: 0;
      background: var(--gradient-hero);
      background-size: 200% 200%;
      animation: gradientShift 8s ease infinite;
    }

    .hero-orb {
      position: absolute;
      border-radius: 50%;
      opacity: 0.15;
      filter: blur(40px);
    }

    .hero-orb--1 {
      width: 180px;
      height: 180px;
      background: #7c3aed;
      top: -40px;
      right: -30px;
    }

    .hero-orb--2 {
      width: 120px;
      height: 120px;
      background: #10b981;
      bottom: -20px;
      left: -20px;
    }

    .hero-content {
      position: relative;
      z-index: 1;
    }

    .hero-greeting {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      margin-bottom: var(--spacing-lg);
    }

    .hero-emoji {
      font-size: 1.75rem;
    }

    .hero-title {
      font-size: var(--font-size-xl);
      font-weight: var(--font-weight-bold);
      color: #fff;
      letter-spacing: -0.3px;
    }

    .hero-amount-block {
      animation: fadeInUp 500ms ease both;
    }

    .hero-label {
      display: block;
      font-size: var(--font-size-sm);
      color: rgba(255, 255, 255, 0.7);
      font-weight: var(--font-weight-medium);
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: var(--spacing-xs);
    }

    .hero-amount {
      font-size: 2.5rem;
      font-weight: 800;
      color: #fff;
      font-variant-numeric: tabular-nums;
      letter-spacing: -1px;
      text-shadow: 0 2px 12px rgba(0,0,0,0.15);
    }

    /* ── Content Body ── */
    .content-body {
      padding: 0 var(--spacing-md) var(--spacing-xl);
      margin-top: -16px;
      position: relative;
      z-index: 1;
    }

    /* ── KPI Cards ── */
    .kpi-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--spacing-sm);
      margin-bottom: var(--spacing-lg);
    }

    .kpi-card {
      padding: var(--spacing-md);
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--spacing-xs);
    }

    .kpi-icon-wrap {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-sm);
      font-size: 1.25rem;
      margin-bottom: var(--spacing-xs);
    }

    .kpi-icon--budget {
      background: rgba(var(--color-accent-rgb), 0.12);
    }

    .kpi-icon--today {
      background: rgba(var(--color-primary-rgb), 0.12);
    }

    .kpi-label {
      font-size: var(--font-size-xs);
      color: var(--color-text-secondary);
      font-weight: var(--font-weight-semibold);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .kpi-value {
      font-size: var(--font-size-xl);
      font-weight: var(--font-weight-bold);
      color: var(--color-text);
      font-variant-numeric: tabular-nums;
    }

    .kpi-value--accent { color: var(--color-accent); }
    .kpi-value--danger { color: var(--color-danger); }

    /* ── Budget Progress ── */
    .budget-progress {
      width: 100%;
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      margin-top: var(--spacing-xs);
    }

    .budget-progress__track {
      flex: 1;
      height: 6px;
      background: var(--color-surface-alt);
      border-radius: var(--radius-full);
      overflow: hidden;
    }

    .budget-progress__fill {
      height: 100%;
      background: var(--gradient-accent);
      border-radius: var(--radius-full);
      transition: width 600ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    .budget-progress__fill--warning {
      background: var(--gradient-danger);
    }

    .budget-progress__label {
      font-size: var(--font-size-xs);
      color: var(--color-text-secondary);
      font-weight: var(--font-weight-semibold);
      font-variant-numeric: tabular-nums;
      min-width: 32px;
      text-align: right;
    }

    /* ── SMS Section ── */
    .section-header {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      margin-bottom: var(--spacing-sm);
    }

    .section-badge {
      background: var(--gradient-primary);
      color: #fff;
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-bold);
      padding: 2px 8px;
      border-radius: var(--radius-full);
    }

    .sms-scroll {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
    }

    .sms-card {
      padding: var(--spacing-md);
    }

    .sms-card__row {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
    }

    .sms-card__icon {
      font-size: 1.5rem;
    }

    .sms-card__info {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .sms-card__desc {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      color: var(--color-text);
    }

    .sms-card__meta {
      font-size: var(--font-size-xs);
      color: var(--color-text-secondary);
    }

    .sms-card__amount {
      font-weight: var(--font-weight-bold);
      font-size: var(--font-size-base);
      color: var(--color-danger);
      font-variant-numeric: tabular-nums;
    }

    .sms-card__amount--credit {
      color: var(--color-accent);
    }

    /* ── Charts ── */
    .charts-row {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
      margin-bottom: var(--spacing-lg);
    }

    .chart-card {
      padding: var(--spacing-lg);
    }

    .chart-title {
      font-size: var(--font-size-base);
      font-weight: var(--font-weight-bold);
      margin-bottom: var(--spacing-md);
      color: var(--color-text);
    }

    .category-chart {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
    }

    .category-row {
      display: flex;
      align-items: flex-start;
      gap: var(--spacing-sm);
    }

    .category-row__emoji {
      font-size: 1.5rem;
      margin-top: 2px;
    }

    .category-row__info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .category-row__top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .category-row__label {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      color: var(--color-text);
    }

    .category-row__amount {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-bold);
      font-variant-numeric: tabular-nums;
      color: var(--color-text);
    }

    .category-row__bar {
      height: 6px;
      background: var(--color-surface-alt);
      border-radius: var(--radius-full);
      overflow: hidden;
    }

    .category-row__bar-fill {
      height: 100%;
      background: var(--gradient-primary);
      border-radius: var(--radius-full);
      transition: width 800ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    /* ── Trend Chart ── */
    .trend-chart {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      height: 140px;
      gap: var(--spacing-xs);
      padding-top: var(--spacing-md);
    }

    .trend-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      height: 100%;
      justify-content: flex-end;
      gap: 4px;
    }

    .trend-bar-wrap {
      width: 100%;
      display: flex;
      justify-content: center;
      flex: 1;
      align-items: flex-end;
    }

    .trend-bar {
      width: 100%;
      max-width: 28px;
      background: var(--gradient-primary);
      border-radius: var(--radius-sm) var(--radius-sm) 0 0;
      min-height: 4px;
      transform-origin: bottom;
      animation: barGrow 600ms cubic-bezier(0.4, 0, 0.2, 1) both;
    }

    .trend-day {
      font-size: var(--font-size-xs);
      color: var(--color-text-secondary);
      font-weight: var(--font-weight-medium);
    }

    .trend-amt {
      font-size: 0.65rem;
      color: var(--color-text-secondary);
      font-variant-numeric: tabular-nums;
      min-height: 14px;
    }

    /* ── Section ── */
    .section {
      margin-bottom: var(--spacing-lg);
    }

    .section-title {
      font-size: var(--font-size-base);
      font-weight: var(--font-weight-bold);
      margin-bottom: var(--spacing-sm);
      color: var(--color-text);
    }

    /* ── Transaction List ── */
    .transaction-list {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
    }

    .transaction-card {
      padding: var(--spacing-md);
      border-left: 3px solid var(--color-primary);
    }

    .transaction-row {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
    }

    .transaction-emoji-wrap {
      width: 40px;
      height: 40px;
      border-radius: var(--radius-sm);
      background: var(--color-surface-alt);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .transaction-info {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .transaction-label {
      font-weight: var(--font-weight-semibold);
      font-size: var(--font-size-sm);
      color: var(--color-text);
    }

    .transaction-date {
      font-size: var(--font-size-xs);
      color: var(--color-text-secondary);
    }

    .transaction-amount {
      font-weight: var(--font-weight-bold);
      font-size: var(--font-size-base);
      font-variant-numeric: tabular-nums;
      color: var(--color-danger);
    }

    .transaction-note {
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
    }

    .empty-state__text {
      color: var(--color-text-secondary);
      font-size: var(--font-size-sm);
    }

    .empty-card {
      padding: var(--spacing-md);
    }

    .warning-banner {
      margin-bottom: var(--spacing-md);
    }
  `]
})
export class DashboardComponent {
  protected readonly expenseService = inject(ExpenseService);
  protected readonly budgetService = inject(BudgetService);
  protected readonly categoryService = inject(CategoryService);
  protected readonly smsService = inject(SmsService);

  getCategoryPercent(total: number): number {
    const breakdown = this.expenseService.categoryBreakdown();
    const max = Math.max(...breakdown.map(c => c.total), 1);
    return Math.max(3, (total / max) * 100);
  }

  getTrendBarHeight(total: number): number {
    const trend = this.expenseService.last7DaysTrend();
    const max = Math.max(...trend.map(d => d.total), 1);
    return Math.max(3, (total / max) * 100);
  }

  formatDay(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { weekday: 'short' }).slice(0, 2);
  }
}
