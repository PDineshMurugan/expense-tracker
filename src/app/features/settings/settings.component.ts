import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent, IonHeader, IonToolbar, IonTitle
} from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { BudgetService } from '../../core/services/budget.service';
import { ThemeService } from '../../core/services/theme.service';
import { StorageService } from '../../core/services/storage.service';
import { SmsService } from '../../core/services/sms.service';
import { NotificationService } from '../../core/services/notification.service';
import { CurrencyPipe } from '../../shared/pipes/currency.pipe';

@Component({
  selector: 'app-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule,
    IonContent, IonHeader, IonToolbar, IonTitle,
    CurrencyPipe
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>
          <span class="toolbar-title">⚙️ Settings</span>
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="settings-container animate-fade-in">

        <!-- Budget -->
        <div class="glass-card settings-section">
          <div class="section-header">
            <span class="section-icon">💰</span>
            <h3 class="section-title">Monthly Budget</h3>
          </div>
          <div class="budget-input-row">
            <span class="currency-label">₹</span>
            <input
              type="number"
              class="budget-input"
              [value]="budgetInput()"
              (input)="onBudgetInput($event)"
              placeholder="Set your monthly budget"
              inputmode="numeric"
              id="budget-input" />
            <button class="btn-gradient" (click)="saveBudget()" id="save-budget-btn">
              Save
            </button>
          </div>
          @if (budgetService.monthlyBudget() > 0) {
            <div class="budget-status">
              <span>Current: {{ budgetService.monthlyBudget() | currency }}</span>
              <span class="budget-dot">·</span>
              <span>Used: {{ budgetService.budgetUsagePercent() }}%</span>
            </div>
          }
        </div>

        <!-- SMS Auto-Read -->
        <div class="glass-card settings-section">
          <div class="section-header">
            <span class="section-icon">📱</span>
            <h3 class="section-title">SMS Auto-Read</h3>
          </div>
          <p class="section-desc">Automatically detect expenses from bank SMS messages</p>

          <div class="toggle-row" id="sms-toggle">
            <div class="toggle-info">
              <span class="toggle-label">Enable SMS Reading</span>
              @if (smsService.smsEnabled()) {
                <span class="status-badge status-badge--active">Active</span>
              }
            </div>
            <button
              class="toggle-switch"
              [class.toggle-switch--on]="smsService.smsEnabled()"
              (click)="toggleSms()">
              <span class="toggle-switch__knob"></span>
            </button>
          </div>

          @if (smsService.smsEnabled()) {
            <button class="scan-btn" (click)="scanSms()" [disabled]="smsService.isScanning()" id="scan-sms-btn">
              @if (smsService.isScanning()) {
                <span class="scan-btn__spinner"></span>
                <span>Scanning...</span>
              } @else {
                <span class="scan-btn__icon">🔍</span>
                <span>Scan SMS Now</span>
              }
            </button>

            @if (smsService.lastScanTime()) {
              <p class="scan-status">
                Last scan: {{ formatScanTime(smsService.lastScanTime()!) }}
                · Found {{ smsService.smsExpenses().length }} transactions
              </p>
            }
          }
        </div>

        <!-- Appearance -->
        <div class="glass-card settings-section">
          <div class="section-header">
            <span class="section-icon">🎨</span>
            <h3 class="section-title">Appearance</h3>
          </div>
          <div class="toggle-row" id="dark-mode-toggle">
            <span class="toggle-label">🌙 Dark Mode</span>
            <button
              class="toggle-switch"
              [class.toggle-switch--on]="themeService.isDark()"
              (click)="themeService.toggleDarkMode()">
              <span class="toggle-switch__knob"></span>
            </button>
          </div>
        </div>

        <!-- Data -->
        <div class="glass-card settings-section">
          <div class="section-header">
            <span class="section-icon">📦</span>
            <h3 class="section-title">Data</h3>
          </div>
          <button class="action-btn" (click)="exportData()" id="export-btn">
            <span class="action-btn__icon">📤</span>
            <div class="action-btn__text">
              <span class="action-btn__label">Export Data (JSON)</span>
              <span class="action-btn__desc">Download a backup of all your expenses</span>
            </div>
            <span class="action-btn__arrow">→</span>
          </button>
        </div>

        <!-- About -->
        <div class="glass-card settings-section">
          <div class="section-header">
            <span class="section-icon">ℹ️</span>
            <h3 class="section-title">About</h3>
          </div>
          <div class="about-content">
            <p class="about-name">Expense Tracker <span class="version-badge">V2</span></p>
            <p class="about-sub">Offline-first · Built with Angular + Ionic</p>
          </div>
        </div>

      </div>
    </ion-content>
  `,
  styles: [`
    .toolbar-title {
      font-weight: var(--font-weight-bold);
      font-size: var(--font-size-lg);
    }

    .settings-container {
      max-width: 600px;
      margin: 0 auto;
    }

    .settings-section {
      margin-bottom: var(--spacing-md);
      padding: var(--spacing-lg);
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      margin-bottom: var(--spacing-md);
    }

    .section-icon {
      font-size: 1.25rem;
    }

    .section-title {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-bold);
      color: var(--color-text);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .section-desc {
      font-size: var(--font-size-xs);
      color: var(--color-text-secondary);
      margin-bottom: var(--spacing-md);
      margin-top: calc(-1 * var(--spacing-sm));
    }

    /* ── Budget ── */
    .budget-input-row {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
    }

    .currency-label {
      font-size: var(--font-size-xl);
      font-weight: var(--font-weight-bold);
      color: var(--color-text-secondary);
    }

    .budget-input {
      flex: 1;
      padding: var(--spacing-sm) var(--spacing-md);
      border: 1px solid var(--color-surface-alt);
      border-radius: var(--radius-sm);
      background: var(--color-surface);
      color: var(--color-text);
      font-size: var(--font-size-base);
      font-family: var(--font-family);
      outline: none;
      -moz-appearance: textfield;
      transition: border-color var(--transition-fast);
    }

    .budget-input::-webkit-outer-spin-button,
    .budget-input::-webkit-inner-spin-button {
      -webkit-appearance: none;
    }

    .budget-input:focus {
      border-color: var(--color-primary);
    }

    .btn-gradient {
      padding: var(--spacing-sm) var(--spacing-lg);
      border: none;
      border-radius: var(--radius-full);
      background: var(--gradient-primary);
      color: white;
      font-weight: var(--font-weight-bold);
      font-size: var(--font-size-sm);
      cursor: pointer;
      font-family: var(--font-family);
      transition: all var(--transition-base);
      box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.25);
    }

    .btn-gradient:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(var(--color-primary-rgb), 0.35);
    }

    .budget-status {
      font-size: var(--font-size-xs);
      color: var(--color-text-secondary);
      margin-top: var(--spacing-sm);
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
    }

    .budget-dot {
      opacity: 0.5;
    }

    /* ── Toggle ── */
    .toggle-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--spacing-xs) 0;
    }

    .toggle-info {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
    }

    .toggle-label {
      font-size: var(--font-size-base);
      color: var(--color-text);
      font-weight: var(--font-weight-medium);
    }

    .status-badge {
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-bold);
      padding: 2px 8px;
      border-radius: var(--radius-full);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .status-badge--active {
      background: rgba(var(--color-accent-rgb), 0.12);
      color: var(--color-accent);
    }

    .toggle-switch {
      width: 52px;
      height: 28px;
      border: none;
      border-radius: var(--radius-full);
      background: var(--color-surface-alt);
      cursor: pointer;
      position: relative;
      transition: background var(--transition-base);
      padding: 0;
    }

    .toggle-switch--on {
      background: var(--color-accent);
    }

    .toggle-switch__knob {
      display: block;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: white;
      position: absolute;
      top: 3px;
      left: 3px;
      transition: transform var(--transition-spring);
      box-shadow: 0 1px 4px rgba(0,0,0,0.2);
    }

    .toggle-switch--on .toggle-switch__knob {
      transform: translateX(24px);
    }

    /* ── Scan Button ── */
    .scan-btn {
      width: 100%;
      padding: var(--spacing-sm) var(--spacing-md);
      border: 2px dashed var(--color-surface-alt);
      border-radius: var(--radius);
      background: transparent;
      color: var(--color-primary);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-bold);
      cursor: pointer;
      font-family: var(--font-family);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--spacing-sm);
      transition: all var(--transition-base);
      margin-top: var(--spacing-md);
    }

    .scan-btn:hover:not(:disabled) {
      border-color: var(--color-primary);
      background: rgba(var(--color-primary-rgb), 0.05);
    }

    .scan-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .scan-btn__icon {
      font-size: 1rem;
    }

    .scan-btn__spinner {
      width: 16px;
      height: 16px;
      border: 2px solid var(--color-surface-alt);
      border-top-color: var(--color-primary);
      border-radius: 50%;
      animation: spin 600ms linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .scan-status {
      font-size: var(--font-size-xs);
      color: var(--color-text-secondary);
      margin-top: var(--spacing-sm);
      text-align: center;
    }

    /* ── Action Button ── */
    .action-btn {
      width: 100%;
      padding: var(--spacing-md);
      border: 1px solid var(--color-surface-alt);
      border-radius: var(--radius);
      background: var(--color-surface);
      color: var(--color-text);
      cursor: pointer;
      font-family: var(--font-family);
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      transition: all var(--transition-base);
    }

    .action-btn:hover {
      background: var(--color-surface-alt);
      transform: translateY(-1px);
    }

    .action-btn__icon {
      font-size: 1.25rem;
    }

    .action-btn__text {
      flex: 1;
      text-align: left;
    }

    .action-btn__label {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-semibold);
      display: block;
    }

    .action-btn__desc {
      font-size: var(--font-size-xs);
      color: var(--color-text-secondary);
      display: block;
      margin-top: 2px;
    }

    .action-btn__arrow {
      color: var(--color-text-secondary);
      font-size: 1.25rem;
    }

    /* ── About ── */
    .about-content {
      text-align: center;
      padding: var(--spacing-sm) 0;
    }

    .about-name {
      font-weight: var(--font-weight-bold);
      color: var(--color-text);
      font-size: var(--font-size-base);
    }

    .version-badge {
      display: inline-block;
      background: var(--gradient-primary);
      color: #fff;
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-bold);
      padding: 2px 8px;
      border-radius: var(--radius-full);
      margin-left: var(--spacing-xs);
      vertical-align: middle;
    }

    .about-sub {
      font-size: var(--font-size-xs);
      color: var(--color-text-secondary);
      margin-top: var(--spacing-xs);
    }
  `]
})
export class SettingsComponent {
  protected readonly budgetService = inject(BudgetService);
  protected readonly themeService = inject(ThemeService);
  protected readonly smsService = inject(SmsService);
  private readonly notificationService = inject(NotificationService);
  private readonly storageService = inject(StorageService);

  readonly budgetInput = signal<number>(0);

  constructor() {
    const currentBudget = this.budgetService.monthlyBudget();
    if (currentBudget > 0) {
      this.budgetInput.set(currentBudget);
    }
  }

  onBudgetInput(event: Event): void {
    const val = parseFloat((event.target as HTMLInputElement).value) || 0;
    this.budgetInput.set(val);
  }

  async saveBudget(): Promise<void> {
    await this.budgetService.setBudget(this.budgetInput());
    this.notificationService.success('Budget saved successfully!');
  }

  toggleSms(): void {
    this.smsService.toggleSmsEnabled();
  }

  async scanSms(): Promise<void> {
    await this.smsService.scanSms();
  }

  formatScanTime(date: Date): string {
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }

  async exportData(): Promise<void> {
    const data = await this.storageService.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expense-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.notificationService.success('Data exported successfully!');
  }
}
