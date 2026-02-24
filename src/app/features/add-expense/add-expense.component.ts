import { Component, ChangeDetectionStrategy, inject, signal, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import {
  IonContent, IonBackButton, IonButtons, IonIcon
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
  fastFood, car, cart, film, medkit, receipt, home, school, airplane, gift, swapHorizontal, chevronBackOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-add-expense',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule,
    IonContent, IonBackButton, IonButtons, IonIcon
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './add-expense.component.html',
  styleUrls: ['./add-expense.component.scss']
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
