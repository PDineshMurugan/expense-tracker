import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonContent, IonHeader, IonToolbar, IonTitle,
  IonBackButton, IonButtons
} from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { ExpenseService } from '../../core/services/expense.service';
import { CategoryService } from '../../core/services/category.service';
import { NotificationService } from '../../core/services/notification.service';
import { PAYMENT_MODES, PaymentMode } from '../../core/models/expense.model';

@Component({
  selector: 'app-add-expense',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule,
    IonContent, IonHeader, IonToolbar, IonTitle,
    IonBackButton, IonButtons
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
              autofocus
              id="amount-input" />
          </div>
          <div class="amount-underline">
            <div class="amount-underline__fill" [class.amount-underline__fill--active]="amount() > 0"></div>
          </div>
        </div>

        <!-- Category Grid -->
        <div class="section">
          <h3 class="section-label">Category</h3>
          <div class="category-grid stagger-children">
            @for (cat of categoryService.categories(); track cat.id) {
              <button
                class="category-pill"
                [class.category-pill--selected]="selectedCategory() === cat.emoji"
                (click)="selectCategory(cat.emoji, cat.label)"
                [attr.id]="'cat-' + cat.id">
                <span class="category-pill__emoji">{{ cat.emoji }}</span>
                <span class="category-pill__name">{{ cat.label }}</span>
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
                <span class="payment-chip__icon">{{ getPaymentIcon(mode) }}</span>
                {{ mode }}
              </button>
            }
          </div>
        </div>

        <!-- Note -->
        <div class="section">
          <div class="note-wrapper">
            <span class="note-icon">📝</span>
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

    .category-pill__emoji {
      font-size: 1.75rem;
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
      font-size: 1rem;
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
      font-size: 1rem;
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
  private readonly expenseService = inject(ExpenseService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  readonly paymentModes = PAYMENT_MODES;

  readonly amount = signal<number>(0);
  readonly selectedCategory = signal<string>('');
  readonly selectedCategoryLabel = signal<string>('');
  readonly selectedPaymentMode = signal<PaymentMode>('UPI');
  readonly note = signal<string>('');

  canSave(): boolean {
    return this.amount() > 0 && this.selectedCategory() !== '';
  }

  selectCategory(emoji: string, label: string): void {
    this.selectedCategory.set(emoji);
    this.selectedCategoryLabel.set(label);
  }

  onAmountChange(event: Event): void {
    const val = parseFloat((event.target as HTMLInputElement).value) || 0;
    this.amount.set(val);
  }

  onNoteChange(event: Event): void {
    this.note.set((event.target as HTMLInputElement).value);
  }

  getPaymentIcon(mode: PaymentMode): string {
    switch (mode) {
      case 'UPI': return '📱';
      case 'Cash': return '💵';
      case 'Card': return '💳';
      default: return '💰';
    }
  }

  async save(): Promise<void> {
    if (!this.canSave()) return;

    await this.expenseService.addExpense({
      amount: this.amount(),
      category: this.selectedCategory(),
      categoryLabel: this.selectedCategoryLabel(),
      note: this.note(),
      paymentMode: this.selectedPaymentMode(),
    });

    this.notificationService.success(`₹${this.amount()} expense saved!`);
    this.router.navigate(['/tabs/dashboard']);
  }
}
