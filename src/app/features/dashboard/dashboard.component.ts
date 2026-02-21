import { Component, ChangeDetectionStrategy, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import {
  IonContent, IonIcon, IonFab, IonFabButton
} from '@ionic/angular/standalone';
import { ExpenseService } from '../../core/services/expense.service';
import { BudgetService } from '../../core/services/budget.service';
import { CategoryService } from '../../core/services/category.service';
import { SmsService } from '../../core/services/sms.service';
import { AccountService } from '../../core/services/account.service';
import { NotificationReaderService } from '../../core/services/notification-reader.service';
import { CurrencyPipe } from '../../shared/pipes/currency.pipe';
import { addIcons } from 'ionicons';
import {
  wallet, pieChart, calendar, business, checkmarkCircle, addCircle,
  fileTrayOutline, sparklesOutline, add, phonePortraitOutline, warning,
  arrowForwardOutline, fastFood, car, cart, film, medkit, receipt, home, school, airplane, gift,
  swapHorizontal
} from 'ionicons/icons';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, RouterModule,
    IonContent, IonIcon, IonFab, IonFabButton,
    CurrencyPipe
  ],
  template: `
    <ion-content [fullscreen]="true">
      <!-- Gradient Hero Header -->
      <div class="hero-section">
        <div class="hero-bg"></div>
        <div class="hero-content">
          <div class="hero-greeting">
            <ion-icon name="wallet" class="hero-icon"></ion-icon>
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
            <ion-icon name="warning" style="vertical-align: middle; margin-right: 4px;"></ion-icon>
            You've used {{ budgetService.budgetUsagePercent() }}% of your monthly budget!
          </div>
        }

        <!-- KPI Cards -->
        <div class="kpi-row stagger-children">
          <div class="glass-card kpi-card">
            <div class="kpi-icon-wrap kpi-icon--budget"><ion-icon name="pie-chart"></ion-icon></div>
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
            <div class="kpi-icon-wrap kpi-icon--today"><ion-icon name="calendar"></ion-icon></div>
            <span class="kpi-label">Today</span>
            <span class="kpi-value">{{ expenseService.todaySpend() | currency }}</span>
          </div>
        </div>

        <!-- SMS & Notification Auto-Detected -->
        @if (recentTransactions().length > 0) {
          <div class="section animate-fade-in-up">
            <div class="section-header">
              <h3 class="section-title">
                <ion-icon name="phone-portrait-outline" style="vertical-align: middle; margin-right: 4px;"></ion-icon>
                Auto-Detected
              </h3>
              <span class="section-badge">{{ recentTransactions().length }}</span>
            </div>
            <div class="sms-scroll">
              @for (sms of recentTransactions().slice(0, 10); track sms.id) {
                <div class="glass-card sms-card animate-fade-in-up">
                  <div class="sms-card__row">
                    <div class="sms-card__icon-wrap" [class.sms-card__icon-wrap--transfer]="sms.isTransfer">
                        <ion-icon [name]="sms.isTransfer ? 'swap-horizontal' : 'business'" class="sms-card__icon"></ion-icon>
                    </div>
                    <div class="sms-card__info">
                      <div class="sms-card__desc-row">
                        <span class="sms-card__desc">{{ sms.description }}</span>
                        @if (sms.isTransfer) {
                          <span class="transfer-tag">Transfer</span>
                        }
                      </div>
                      <span class="sms-card__meta">{{ formatRelative(sms.date) }} · {{ sms.accountIdentifier || 'Bank' }}</span>
                    </div>
                    <div class="sms-card__actions">
                        <span class="sms-card__amount" [class.sms-card__amount--credit]="sms.type === 'credit'">
                          {{ sms.type === 'debit' ? '-' : '+' }}{{ sms.amount | currency }}
                        </span>
                        <button class="sms-import-btn" (click)="importSmsTransaction(sms)">
                            <ion-icon name="add-circle"></ion-icon>
                        </button>
                    </div>
                  </div>
                </div>
              }
            </div>

          </div>
        }

        <!-- Accounts Summary -->
        @if (accountService.accounts().length > 0) {
          <div class="section animate-fade-in-up">
            <h3 class="section-title">Accounts Summary</h3>
            <div class="kpi-row stagger-children">
              @for (acc of accountService.accounts(); track acc.id) {
                <div class="glass-card account-card">
                  <div class="account-card__top">
                    <ion-icon [name]="getAccountIcon(acc.type)" class="account-card__icon"></ion-icon>
                    <span class="account-card__name">{{ acc.name }}</span>
                  </div>
                  <span class="account-card__identifier">{{ acc.accountIdentifier }}</span>
                  <div class="account-card__bottom">
                    <span class="account-card__label">Spent</span>
                    <span class="account-card__amount">{{ expenseService.monthlyTotalByAccount(acc.id) | currency }}</span>
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
                    <ion-icon [name]="cat.icon" class="category-row__icon"></ion-icon>
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
                <ion-icon name="file-tray-outline" class="empty-state__icon"></ion-icon>
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
            <div class="recent-header">
              <h3 class="recent-title">Recent Transactions</h3>
              <button class="recent-more" [routerLink]="['/reports']">
                View All <ion-icon name="arrow-forward-outline"></ion-icon>
              </button>
            </div>
          @if (expenseService.topFiveTransactions().length > 0) {
            <div class="transaction-list stagger-children">
              @for (expense of expenseService.topFiveTransactions(); track expense.id) {
                <div class="glass-card transaction-card">
                  <div class="transaction-row">
                    <div class="transaction-icon-wrap">
                      <ion-icon [name]="expense.category" class="transaction-icon"></ion-icon>
                    </div>
                    <div class="transaction-info">
                      <div style="display: flex; align-items: center; gap: 6px;">
                        <span class="transaction-label">{{ expense.categoryLabel }}</span>
                        @if (expense.isTransfer) {
                          <span class="transfer-tag">Transfer</span>
                        }
                      </div>
                      <span class="transaction-date">{{ formatRelative(expense.date) }} · {{ expense.paymentMode }}</span>
                    </div>
                    <span class="transaction-amount" [class.transaction-amount--transfer]="expense.isTransfer">
                      {{ expense.isTransfer ? '' : '-' }}{{ expense.amount | currency }}
                    </span>
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
                <ion-icon name="sparkles-outline" class="empty-state__icon"></ion-icon>
                <p class="empty-state__text">No expenses yet. Tap + to add one!</p>
              </div>
            </div>
          }
        </div>
      </div>


      <!-- FAB -->
      <ion-fab vertical="bottom" horizontal="end" slot="fixed" class="animate-fade-in">
        <ion-fab-button routerLink="/add-expense" class="fab-btn">
          <ion-icon name="add"></ion-icon>
        </ion-fab-button>
      </ion-fab>
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

    .hero-icon {
      font-size: 1.75rem;
      color: #fff;
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
      border-left: 3px solid var(--color-accent);
    }
    
    .sms-card__icon-wrap {
      width: 40px;
      height: 40px;
      border-radius: var(--radius-sm);
      background: rgba(var(--color-accent-rgb), 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-accent);
      flex-shrink: 0;
    }

    .sms-card__icon-wrap--transfer {
      background: rgba(var(--color-primary-rgb), 0.1);
      color: var(--color-primary);
    }
    
    .sms-card__icon {
      font-size: 1.25rem;
    }

    .sms-card__row {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
    }

    .sms-card__info {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .sms-card__desc-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .transfer-tag {
      font-size: 0.6rem;
      background: var(--color-surface-alt);
      color: var(--color-text-secondary);
      padding: 1px 6px;
      border-radius: 4px;
      font-weight: var(--font-weight-bold);
      text-transform: uppercase;
      flex-shrink: 0;
    }

    .sms-card__desc {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-bold);
      color: var(--color-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .sms-card__meta {
      font-size: var(--font-size-xs);
      color: var(--color-text-secondary);
    }

    .sms-card__actions {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
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

    .sms-import-btn {
        background: transparent;
        border: none;
        color: var(--color-primary);
        font-size: 1.75rem;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: transform 0.2s ease;
    }

    .sms-import-btn:active {
        transform: scale(0.9);
    }

    .sms-import-btn:disabled {
        color: var(--color-accent);
        cursor: default;
    }

    .imported-icon {
        font-size: 1.5rem;
    }

    /* ── Accounts Summary ── */
    .account-card {
      padding: var(--spacing-md);
      display: flex;
      flex-direction: column;
      gap: 4px;
      border-top: 3px solid var(--color-primary);
    }
    
    .account-card__top {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .account-card__icon {
      color: var(--color-primary);
      font-size: 1rem;
    }

    .account-card__name {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-bold);
      color: var(--color-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .account-card__identifier {
      font-size: 0.65rem;
      color: var(--color-text-secondary);
      font-family: monospace;
      letter-spacing: 0.5px;
    }

    .account-card__bottom {
      margin-top: var(--spacing-sm);
      display: flex;
      flex-direction: column;
    }

    .account-card__label {
      font-size: 0.6rem;
      text-transform: uppercase;
      color: var(--color-text-secondary);
      font-weight: var(--font-weight-bold);
    }

    .account-card__amount {
      font-size: var(--font-size-base);
      font-weight: var(--font-weight-bold);
      color: var(--color-text);
      font-variant-numeric: tabular-nums;
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

    .transaction-icon {
        font-size: 1.25rem;
        color: var(--color-primary);
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

    .transaction-amount--transfer {
      color: var(--color-text-secondary);
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

    ion-fab-button {
      --background: var(--gradient-primary);
      --box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.3);
    }
  `]
})
export class DashboardComponent {
  protected readonly expenseService = inject(ExpenseService);
  protected readonly budgetService = inject(BudgetService);
  protected readonly categoryService = inject(CategoryService);
  protected readonly smsService = inject(SmsService);
  protected readonly accountService = inject(AccountService);
  protected readonly notificationService = inject(NotificationReaderService);
  protected readonly router = inject(Router);

  constructor() {
    addIcons({
      wallet, pieChart, calendar, business, checkmarkCircle, addCircle,
      fileTrayOutline, sparklesOutline, add, phonePortraitOutline, warning,
      arrowForwardOutline, fastFood, car, cart, film, medkit, receipt, home, school, airplane, gift,
      swapHorizontal
    });
  }

  readonly recentTransactions = computed(() => {
    const sms = this.smsService.smsExpenses();
    const notifs = this.notificationService.detectedTransactions() || [];
    return [...sms, ...notifs].sort((a, b) => {
      const da = a.date instanceof Date ? a.date : new Date(a.date);
      const db = b.date instanceof Date ? b.date : new Date(b.date);
      return db.getTime() - da.getTime();
    });
  });

  async importSmsTransaction(sms: any): Promise<void> {
    this.router.navigate(['/tabs/add'], {
      state: { smsInterop: sms }
    });
  }

  getAccountIcon(type: string): string {
    switch (type) {
      case 'Bank': return 'business';
      case 'Credit Card': return 'card';
      case 'Wallet': return 'wallet';
      default: return 'wallet';
    }
  }

  getCategoryPercent(amount: number): number {
    const breakdown = this.expenseService.categoryBreakdown();
    const max = Math.max(...breakdown.map(c => c.total), 1);
    return Math.max(3, (amount / max) * 100);
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

  formatRelative(date: any): string {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '';

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.floor((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }
}
