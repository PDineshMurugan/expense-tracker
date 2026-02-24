import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import {
  IonContent, IonHeader, IonToolbar, IonTitle,
  IonBackButton, IonButtons, IonIcon
} from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { ExpenseService } from '../../core/services/expense.service';
import { CategoryService } from '../../core/services/category.service';
import { AccountService } from '../../core/services/account.service';
import { NotificationService } from '../../core/services/notification.service';
import { SmsService } from '../../core/services/sms.service';
import { PAYMENT_MODES, PaymentMode } from '../../core/models/expense.model';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { addIcons } from 'ionicons';
import {
  phonePortraitOutline, cashOutline, cardOutline, walletOutline, createOutline,
  fastFood, car, cart, film, medkit, receipt, home, school, airplane, gift, swapHorizontal
} from 'ionicons/icons';

@Component({
  selector: 'app-add-expense',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule,
    IonContent, IonHeader, IonToolbar, IonTitle,
    IonBackButton, IonButtons, IonIcon
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/dashboard"></ion-back-button>
        </ion-buttons>
        <ion-title>Add Expense</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="add-expense-form animate-fade-in">

        <!-- Amount Input -->
        <div class="amount-section">
          <div class="amount-input-section">
            <span class="currency-symbol">₹</span>
            <input
              type="number"
              class="amount-input"
              placeholder="0"
              [value]="amount()"
              (input)="onAmountChange($event)"
              inputmode="decimal"
              min="0"
              autofocus
              id="amount-input" />
          </div>
          <div class="amount-underline">
            <div class="amount-underline__fill" [class.amount-underline__fill--active]="amount() > 0"></div>
          </div>
        </div>

        <!-- Account Selection & Transfer Toggle -->
        @if (accountService.accounts().length > 0) {
          <div class="section toggle-section animate-fade-in-up">
            <div class="account-select-wrapper">
              <span class="section-label" style="margin-bottom: 0;">Account</span>
              <select class="account-select" [ngModel]="selectedAccountId()" (ngModelChange)="selectedAccountId.set($event)">
                <option value="">No Account</option>
                @for (acc of accountService.accounts(); track acc.id) {
                  <option [value]="acc.id">{{ acc.name }} ({{ acc.accountIdentifier }})</option>
                }
              </select>
            </div>
            
            <div class="transfer-toggle-wrapper">
              <label class="transfer-label">
                <ion-icon name="swap-horizontal"></ion-icon>
                Is Transfer?
              </label>
              <div class="toggle-switch">
                <input type="checkbox" [checked]="isTransfer()" (change)="toggleTransfer($event)" id="transfer-toggle" />
                <span class="slider"></span>
              </div>
            </div>
          </div>
        }

        <!-- Date Picker -->
        <div class="section">
          <h3 class="section-label">Date</h3>
          <div class="date-picker-wrapper">
             <input type="date" class="date-input" [ngModel]="transactionDate()" (ngModelChange)="transactionDate.set($event)" id="expense-date" />
          </div>
        </div>

        <!-- Category Grid -->
        <div class="section">
          <h3 class="section-label">Category</h3>
          <div class="category-grid stagger-children">
            @for (cat of categoryService.categories(); track cat.id) {
              <button
                class="category-pill"
                [class.category-pill--selected]="selectedCategory() === cat.id"
                (click)="selectCategory(cat.id, cat.name)"
                [attr.id]="'cat-' + cat.id">
                <ion-icon [name]="cat.icon" class="category-pill__icon"></ion-icon>
                <span class="category-pill__name">{{ cat.name }}</span>
              </button>
            }
          </div>
        </div>

        <!-- Payment Mode -->
        <div class="section">
          <h3 class="section-label">Payment</h3>
          <div class="payment-modes">
            @for (mode of paymentModes; track mode) {
              <button
                class="payment-chip"
                [class.payment-chip--selected]="selectedPaymentMode() === mode"
                (click)="selectedPaymentMode.set(mode)"
                [attr.id]="'pay-' + mode">
                <ion-icon [name]="getPaymentIcon(mode)" class="payment-chip__icon"></ion-icon>
                {{ mode }}
              </button>
            }
          </div>
        </div>

        <!-- Note -->
        <div class="section">
          <div class="note-wrapper">
            <ion-icon name="create-outline" class="note-icon"></ion-icon>
            <input
              type="text"
              class="note-input"
              placeholder="Add a note (optional)"
              [value]="note()"
              (input)="onNoteChange($event)"
              id="note-input" />
          </div>
        </div>

        <!-- Save Button -->
        <button
          class="save-btn"
          [disabled]="!canSave()"
          [class.save-btn--ready]="canSave()"
          (click)="save()"
          id="save-btn">
          <span class="save-btn__text">Save Expense</span>
        </button>
      </div>
    </ion-content>
  `,
  styles: [`
    .add-expense-form {
      max-width: 500px;
      margin: 0 auto;
    }

    /* ── Amount ── */
    .amount-section {
      padding: var(--spacing-xl) 0 var(--spacing-lg);
    }

    .amount-input-section {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--spacing-sm);
    }

    .currency-symbol {
      font-size: var(--font-size-3xl);
      font-weight: var(--font-weight-bold);
      color: var(--color-text-secondary);
      opacity: 0.6;
    }

    .amount-input {
      font-size: 3.5rem;
      font-weight: 800;
      color: var(--color-text);
      background: transparent;
      border: none;
      outline: none;
      width: 200px;
      text-align: center;
      font-variant-numeric: tabular-nums;
      -moz-appearance: textfield;
      font-family: var(--font-family);
      letter-spacing: -1px;
    }

    .amount-input::-webkit-outer-spin-button,
    .amount-input::-webkit-inner-spin-button {
      -webkit-appearance: none;
    }

    .amount-input::placeholder {
      color: var(--color-surface-alt);
    }

    .amount-underline {
      height: 3px;
      background: var(--color-surface-alt);
      border-radius: var(--radius-full);
      margin: var(--spacing-sm) auto 0;
      width: 120px;
      overflow: hidden;
    }

    .amount-underline__fill {
      height: 100%;
      width: 0%;
      background: var(--gradient-primary);
      border-radius: var(--radius-full);
      transition: width 400ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    .amount-underline__fill--active {
      width: 100%;
    }

    /* ── Section ── */
    .section {
      margin-bottom: var(--spacing-lg);
    }

    .section-label {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-bold);
      color: var(--color-text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: var(--spacing-sm);
    }

    /* ── Toggles & Selects ── */
    .toggle-section {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
      background: var(--glass-bg);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1px solid var(--color-surface-alt);
      border-radius: var(--radius);
      padding: var(--spacing-md);
    }

    .account-select-wrapper {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .account-select {
      background: rgba(var(--color-primary-rgb), 0.1);
      color: var(--color-primary);
      border: none;
      border-radius: var(--radius-sm);
      padding: var(--spacing-xs) var(--spacing-sm);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-semibold);
      outline: none;
      cursor: pointer;
    }

    .transfer-toggle-wrapper {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: var(--spacing-sm);
      border-top: 1px solid var(--color-surface-alt);
    }

    .transfer-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      color: var(--color-text);
    }
    
    .transfer-label ion-icon {
      color: var(--color-primary);
      font-size: 1.25rem;
    }

    /* Custom Toggle Switch */
    .toggle-switch {
      position: relative;
      display: inline-block;
      width: 44px;
      height: 24px;
    }

    .toggle-switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: var(--color-surface-alt);
      transition: .4s;
      border-radius: 24px;
    }

    .slider:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: .4s;
      border-radius: 50%;
    }

    input:checked + .slider {
      background: var(--gradient-primary);
    }

    input:checked + .slider:before {
      transform: translateX(20px);
    }

    /* ── Category Pills ── */
    .category-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: var(--spacing-sm);
    }

    .category-pill {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: var(--spacing-sm) var(--spacing-xs);
      border: 2px solid transparent;
      border-radius: var(--radius);
      background: var(--glass-bg);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      cursor: pointer;
      transition: all var(--transition-base);
      box-shadow: var(--shadow);
    }

    .category-pill:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
    }

    .category-pill--selected {
      border-color: var(--color-primary);
      background: rgba(var(--color-primary-rgb), 0.1);
      box-shadow: var(--shadow-glow);
      transform: translateY(-2px);
    }

    .category-pill__icon {
      font-size: 1.75rem;
      color: var(--color-primary);
    }

    .category-pill__name {
      font-size: 0.65rem;
      color: var(--color-text-secondary);
      text-align: center;
      line-height: 1.2;
      font-weight: var(--font-weight-medium);
    }

    .category-pill--selected .category-pill__name {
      color: var(--color-primary);
      font-weight: var(--font-weight-semibold);
    }

    /* ── Payment Chips ── */
    .payment-modes {
      display: flex;
      gap: var(--spacing-sm);
    }

    .payment-chip {
      flex: 1;
      padding: var(--spacing-sm) var(--spacing-md);
      border: 2px solid var(--color-surface-alt);
      border-radius: var(--radius-full);
      background: var(--color-surface);
      color: var(--color-text);
      font-weight: var(--font-weight-medium);
      font-size: var(--font-size-sm);
      cursor: pointer;
      transition: all var(--transition-base);
      font-family: var(--font-family);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--spacing-xs);
    }

    .payment-chip:hover {
      border-color: var(--color-primary-light);
    }

    .payment-chip--selected {
      border-color: var(--color-primary);
      background: var(--gradient-primary);
      color: #fff;
      font-weight: var(--font-weight-semibold);
      box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.25);
    }

    .payment-chip__icon {
      font-size: 1.25rem;
    }

    /* ── Note ── */
    .note-wrapper {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-sm) var(--spacing-md);
      border: 1px solid var(--color-surface-alt);
      border-radius: var(--radius);
      background: var(--glass-bg);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      transition: border-color var(--transition-fast);
    }

    .note-wrapper:focus-within {
      border-color: var(--color-primary);
    }

    .note-icon {
      font-size: 1.25rem;
      color: var(--color-text-secondary);
    }

    /* ── Date Picker ── */
    .date-picker-wrapper {
      padding: var(--spacing-sm) var(--spacing-md);
      border: 1px solid var(--color-surface-alt);
      border-radius: var(--radius);
      background: var(--glass-bg);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }
    
    .date-input {
      width: 100%;
      background: transparent;
      border: none;
      color: var(--color-text);
      font-size: var(--font-size-sm);
      outline: none;
      font-family: var(--font-family);
    }

    .note-input {
      flex: 1;
      background: transparent;
      border: none;
      color: var(--color-text);
      font-size: var(--font-size-sm);
      outline: none;
      font-family: var(--font-family);
    }

    .note-input::placeholder {
      color: var(--color-text-secondary);
    }

    /* ── Save Button ── */
    .save-btn {
      width: 100%;
      padding: var(--spacing-md) var(--spacing-lg);
      border: none;
      border-radius: var(--radius);
      background: var(--color-surface-alt);
      color: var(--color-text-secondary);
      font-size: var(--font-size-base);
      font-weight: var(--font-weight-bold);
      cursor: pointer;
      transition: all var(--transition-base);
      margin-top: var(--spacing-lg);
      font-family: var(--font-family);
      position: relative;
      overflow: hidden;
    }

    .save-btn--ready {
      background: var(--gradient-primary);
      color: #fff;
      box-shadow: 0 4px 16px rgba(var(--color-primary-rgb), 0.35);
    }

    .save-btn--ready:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(var(--color-primary-rgb), 0.45);
    }

    .save-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .save-btn__text {
      position: relative;
      z-index: 1;
    }
  `]
})
export class AddExpenseComponent {
  protected readonly categoryService = inject(CategoryService);
  protected readonly accountService = inject(AccountService);
  private readonly expenseService = inject(ExpenseService);
  private readonly notificationService = inject(NotificationService);
  private readonly smsService = inject(SmsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private pendingSmsId?: string;

  constructor() {
    addIcons({
      phonePortraitOutline, cashOutline, cardOutline, walletOutline, createOutline,
      fastFood, car, cart, film, medkit, receipt, home, school, airplane, gift, swapHorizontal
    });

    const state = this.router.getCurrentNavigation()?.extras.state || history.state;
    if (state?.smsInterop) {
      const sms = state.smsInterop;
      this.amount.set(sms.amount || 0);
      this.note.set(sms.description || '');

      const accounts = this.accountService.accounts();
      if (sms.accountIdentifier) {
        const matchingAcc = accounts.find(a =>
          a.accountIdentifier && a.accountIdentifier.includes(sms.accountIdentifier!)
        );
        if (matchingAcc) this.selectedAccountId.set(matchingAcc.id);
      }

      this.isTransfer.set(sms.isTransfer || false);
      if (sms.isTransfer) {
        this.selectedCategory.set('transfer');
        this.selectedCategoryLabel.set('Transfer');
      }
      if (sms.date) {
        const d = sms.date instanceof Date ? sms.date : new Date(sms.date);
        if (!isNaN(d.getTime())) {
          this.transactionDate.set(d.toISOString().split('T')[0]);
        }
      }
      this.pendingSmsId = sms.id;
    }

    const queryParams = this.route.snapshot.queryParams;
    if (queryParams['amount']) {
      this.amount.set(parseFloat(queryParams['amount']) || 0);
    }
    if (queryParams['note']) {
      this.note.set(queryParams['note']);
    }
    if (queryParams['date']) {
      this.transactionDate.set(queryParams['date']);
    }
  }

  readonly paymentModes = PAYMENT_MODES;

  readonly amount = signal<number>(0);
  readonly selectedCategory = signal<string>('');
  readonly selectedCategoryLabel = signal<string>('');
  readonly selectedPaymentMode = signal<PaymentMode>('UPI');
  readonly note = signal<string>('');
  readonly selectedAccountId = signal<string>('');
  readonly isTransfer = signal<boolean>(false);

  private static getLocalISOString(): string {
    const d = new Date();
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().split('T')[0];
  }

  readonly transactionDate = signal<string>(AddExpenseComponent.getLocalISOString());

  canSave(): boolean {
    // If it's a transfer, we don't strictly enforce category selection
    if (this.isTransfer() && this.amount() > 0) return true;
    return this.amount() > 0 && this.selectedCategory() !== '';
  }

  selectCategory(id: string, name: string): void {
    if (this.isTransfer()) return; // Don't change category manually if transfer is forced
    this.selectedCategory.set(id);
    this.selectedCategoryLabel.set(name);
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => { });
  }

  toggleTransfer(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.isTransfer.set(checked);
    if (checked) {
      this.selectedCategory.set('transfer');
      this.selectedCategoryLabel.set('Transfer');
    } else {
      this.selectedCategory.set('');
      this.selectedCategoryLabel.set('');
    }
  }

  onAmountChange(event: Event): void {
    let val = parseFloat((event.target as HTMLInputElement).value) || 0;
    if (val < 0) {
      val = 0;
      (event.target as HTMLInputElement).value = '0';
      this.notificationService.error('Amount cannot be negative');
    }
    this.amount.set(val);
  }

  onNoteChange(event: Event): void {
    this.note.set((event.target as HTMLInputElement).value);
  }

  getPaymentIcon(mode: PaymentMode): string {
    switch (mode) {
      case 'UPI': return 'phone-portrait-outline';
      case 'Cash': return 'cash-outline';
      case 'Credit Card':
      case 'Debit Card': return 'card-outline';
      default: return 'wallet-outline';
    }
  }

  async save(): Promise<void> {
    if (!this.canSave()) {
      this.notificationService.error('Please enter a valid amount and select a category');
      return;
    }

    await this.expenseService.addExpense({
      amount: this.amount(),
      categoryId: this.selectedCategory(),
      accountId: this.selectedAccountId() || undefined,
      type: 'debit', // Transfsers modelled as debits for simplicity or user should manually add credit
      notes: (this.isTransfer() ? '[Transfer] ' : '') + `[${this.selectedPaymentMode()}] ${this.note()}`,
      date: this.transactionDate(),
      timestampStr: new Date().getTime().toString()
    });

    if (this.pendingSmsId) {
      this.smsService.removeSmsExpense(this.pendingSmsId);
      this.pendingSmsId = undefined;
      history.replaceState({}, '');
    }

    Haptics.notification({ type: NotificationType.Success }).catch(() => { });
    this.router.navigate(['/tabs/dashboard']);
  }
}
