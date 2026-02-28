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
      // Force parse into float to prevent showing "45" randomly if amount was saved weirdly
      this.amount.set(parseFloat(sms.amount) || 0);
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
      } else if (sms.userCategory) {
        this.selectedCategory.set(sms.userCategory);
        this.selectedCategoryLabel.set(sms.userCategoryLabel || '');
      }

      if (sms.date) {
        const d = sms.date instanceof Date ? sms.date : new Date(sms.date);
        if (!isNaN(d.getTime())) {
          this.transactionDate.set(AddExpenseComponent.getLocalISOString(d));
        }
      }

      this.rawSms.set(sms.originalBody || '');
      this.merchantName.set(sms.merchantName || '');
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
    const id = queryParams['id'];
    if (id) {
      this.isEditMode.set(true);
      this.editId = id;
      this.loadExpense(id);
    }

    // Treat SMS interoperability from Transactions page as Edit mode
    if (this.pendingSmsId || id) {
      this.isEditMode.set(true);
    }
  }

  readonly isEditMode = signal<boolean>(false);
  editId?: string;

  async loadExpense(id: string) {
    const expense = await this.expenseService.getExpenseById(id);
    if (expense) {
      this.amount.set(parseFloat(expense.amount as any) || 0);

      let expDate = expense.date;
      if (expDate && expDate.includes('T')) {
        expDate = expDate.split('T')[0];
      }
      this.transactionDate.set(expDate);

      this.selectedCategory.set(expense.categoryId);
      const catName = this.categoryService.categories().find(c => c.id === expense.categoryId)?.name || '';
      this.selectedCategoryLabel.set(catName);
      if (expense.accountId) this.selectedAccountId.set(expense.accountId);
      this.isTransfer.set((expense as any).type === 'transfer' || expense.categoryId === 'transfer');

      let merchantName = (expense as any).merchantName || '';
      let exNote = (expense as any).notes || '';
      this.note.set(merchantName ? merchantName + (exNote ? ' - ' + exNote : '') : exNote);

      // Reverse parsing the note to extract payment mode from the string e.g. [UPI]
      const noteStr = this.note();
      for (const mode of this.paymentModes) {
        if (noteStr.includes(`[${mode}]`)) {
          this.selectedPaymentMode.set(mode);
          this.note.set(noteStr.replace(`[${mode}] `, '').trim());
          break;
        }
      }
      if (this.note().startsWith('[Transfer] ')) {
        this.note.set(this.note().replace('[Transfer] ', '').trim());
      }

      const raw = (expense as any).rawSms || '';
      this.rawSms.set(raw);
      this.merchantName.set(merchantName);
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

  readonly rawSms = signal<string>('');
  readonly merchantName = signal<string>('');
  readonly applyToPastTransactions = signal<boolean>(false);

  private static getLocalISOString(d: Date = new Date()): string {
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

    if (this.isEditMode() && this.editId) {
      await this.expenseService.updateExpense(this.editId, {
        amount: this.amount(),
        categoryId: this.selectedCategory(),
        accountId: this.selectedAccountId() || undefined,
        notes: (this.isTransfer() ? '[Transfer] ' : '') + `[${this.selectedPaymentMode()}] ${this.note()}`,
        date: this.transactionDate(),
        merchantName: this.merchantName() || undefined,
        rawSms: this.rawSms() || undefined
      });
      if (this.applyToPastTransactions() && this.merchantName() && this.selectedCategory() !== 'transfer') {
        const cCount = await this.expenseService.updateBulkCategoryForVendor(this.merchantName(), this.selectedCategory());
        if (cCount > 0) {
          this.notificationService.info(`Updated category for ${cCount} past transactions of ${this.merchantName()}`);
        }
      }
      Haptics.notification({ type: NotificationType.Success }).catch(() => { });
      this.notificationService.success('Expense updated successfully');
    } else {
      await this.expenseService.addExpense({
        amount: this.amount(),
        categoryId: this.selectedCategory(),
        accountId: this.selectedAccountId() || undefined,
        type: 'debit', // Transfers modelled as debits for simplicity
        notes: (this.isTransfer() ? '[Transfer] ' : '') + `[${this.selectedPaymentMode()}] ${this.note()}`,
        date: this.transactionDate(),
        merchantName: this.merchantName() || undefined,
        rawSms: this.rawSms() || undefined,
        timestampStr: new Date().getTime().toString()
      });

      if (this.pendingSmsId) {
        this.smsService.removeSmsExpense(this.pendingSmsId);
        this.pendingSmsId = undefined;
        history.replaceState({}, '');
      }

      Haptics.notification({ type: NotificationType.Success }).catch(() => { });
      this.notificationService.success('Expense added successfully');
    }

    this.router.navigate(['/tabs/dashboard']);
  }
}
