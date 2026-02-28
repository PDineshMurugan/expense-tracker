import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import {
  IonContent, IonIcon, IonRefresher, IonRefresherContent, IonSkeletonText
} from '@ionic/angular/standalone';
import { ExpenseService } from '../../core/services/expense.service';
import { BudgetService } from '../../core/services/budget.service';
import { CategoryService } from '../../core/services/category.service';
import { SmsService } from '../../core/services/sms.service';
import { AccountService } from '../../core/services/account.service';
import { NotificationReaderService } from '../../core/services/notification-reader.service';
import { NotificationService } from '../../core/services/notification.service';
import { CurrencyPipe } from '../../shared/pipes/currency.pipe';
import { addIcons } from 'ionicons';
import * as allIcons from 'ionicons/icons';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  imports: [
    CommonModule,
    RouterModule,
    IonContent, IonIcon, IonRefresher, IonRefresherContent, IonSkeletonText,
    CurrencyPipe
  ]
})
export class DashboardComponent {
  protected readonly expenseService = inject(ExpenseService);
  protected readonly budgetService = inject(BudgetService);
  protected readonly categoryService = inject(CategoryService);
  protected readonly smsService = inject(SmsService);
  protected readonly accountService = inject(AccountService);
  protected readonly notificationReaderService = inject(NotificationReaderService);
  protected readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  // Circle progress constants (r = 54)
  protected readonly circleCircumference = 2 * Math.PI * 54;

  // Current month name
  protected readonly currentMonthName = computed(() => {
    const date = new Date();
    return date.toLocaleDateString('en-IN', { month: 'long' });
  });

  // Combined recent transactions (SMS + notifications)
  protected readonly recentTransactions = computed<any[]>(() => {
    const sms = this.smsService.smsExpenses();
    const notifs = this.notificationReaderService.detectedTransactions() || [];
    return [...sms, ...notifs].sort((a, b) => {
      const da = a.date instanceof Date ? a.date : new Date(a.date);
      const db = b.date instanceof Date ? b.date : new Date(b.date);
      return db.getTime() - da.getTime();
    });
  });

  protected readonly detectedBanks = computed(() => {
    const smsExp = this.smsService.smsExpenses();
    if (!smsExp || smsExp.length === 0) return [];

    const existingAccounts = this.accountService.accounts().map(a => a.name.toLowerCase());
    const bankMap = new Map<string, { name: string, count: number, totalAmount: number, accIdentifier?: string }>();

    for (const e of smsExp) {
      const sender = e.sender || e.bank;
      if (sender && sender !== 'Unknown') {
        const isBankRelated = /bank|hdfc|sbi|icici|axis|kotak|pnb|paytm|idfc/i.test(sender);
        if (isBankRelated) {
          // Clean the sender name (remove "- " prefix, " BANK", etc.) to group properly
          let normalized = sender.toUpperCase().replace(/.*-/, '').trim();
          normalized = normalized.replace(' BANK', '').replace(' LTD', '');

          if (!existingAccounts.find(ea => normalized.toLowerCase().includes(ea) || ea.includes(normalized.toLowerCase()))) {
            if (!bankMap.has(normalized)) {
              bankMap.set(normalized, {
                name: normalized,
                count: 1,
                totalAmount: (e.type === 'debit' && e.amount > 0 && e.userCategory !== 'transfer' && !e.isTransfer) ? parseFloat(e.amount as any) : 0,
                accIdentifier: e.accountIdentifier
              });
            } else {
              const existing = bankMap.get(normalized)!;
              existing.count++;
              if (e.type === 'debit' && e.amount > 0 && e.userCategory !== 'transfer' && !e.isTransfer) {
                existing.totalAmount += parseFloat(e.amount as any);
              }
              if (!existing.accIdentifier && e.accountIdentifier) existing.accIdentifier = e.accountIdentifier;
            }
          }
        }
      }
    }

    return Array.from(bankMap.values()).sort((a, b) => b.count - a.count);
  });

  // Calculate the combined total bank spend dynamically based on ID matching or suffix
  protected readonly accountSpends = computed<Record<string, number>>(() => {
    const smsExp = this.smsService.smsExpenses();

    const totals: Record<string, number> = {};
    for (const acc of this.accountService.accounts()) {
      let sum = this.expenseService.monthlyTotalByAccount(acc.id) || 0;

      // Find SMS transactions acting under this account
      const accountNameLower = acc.name.toLowerCase();

      for (const sms of smsExp) {
        let isMatch = false;

        if (sms.accountId === acc.id) isMatch = true;
        else if (sms.accountIdentifier && acc.accountIdentifier && sms.accountIdentifier.endsWith(acc.accountIdentifier)) isMatch = true;
        else {
          const sender = (sms.sender || sms.bank || '').toLowerCase();
          if (sender.includes(accountNameLower) || accountNameLower.includes(sender)) isMatch = true;
        }

        // Only add Debit for spends
        const amt = parseFloat(sms.amount as any) || 0;
        if (isMatch && sms.type === 'debit' && amt > 0 && sms.userCategory !== 'transfer' && !sms.isTransfer) {
          sum += amt;
        }
      }

      totals[acc.id] = sum;
    }

    return totals;
  });

  constructor() {
    addIcons(allIcons);
  }

  // ========== Circle progress offset ==========
  protected circleOffset(monthlyTotal: number): number {
    const budget = this.budgetService.monthlyBudget();
    if (budget <= 0) return 0; // no budget → no fill
    const ratio = Math.min(monthlyTotal / budget, 1);
    return this.circleCircumference * (1 - ratio);
  }

  // ========== Category helpers ==========
  protected getCategoryIcon(categoryId: string): string {
    const cat = this.categoryService.categories().find(c => c.id === categoryId);
    return cat?.icon || 'help-outline';
  }

  protected getCategoryName(categoryId: string): string {
    const cat = this.categoryService.categories().find(c => c.id === categoryId);
    return cat?.name || 'Unknown';
  }

  protected getCategoryColorClass(categoryId: string): string {
    // Map category to a set of predefined color classes
    const colorMap: Record<string, string> = {
      food: 'icon-orange',
      shopping: 'icon-pink',
      transport: 'icon-blue',
      entertainment: 'icon-purple',
      health: 'icon-red',
      default: 'icon-default'
    };
    return colorMap[categoryId] || colorMap['default'];
  }

  // ========== Account helpers ==========
  protected getAccountTheme(accountName: string): string {
    // Simple theme assignment based on name (could also use account.type)
    const name = accountName.toLowerCase();
    if (name.includes('hdfc') || name.includes('sbi')) return 'theme-blue';
    if (name.includes('icici') || name.includes('axis')) return 'theme-dark';
    return 'theme-gradient';
  }

  protected getAccountIcon(type: string): string {
    switch (type) {
      case 'Bank': return 'business';
      case 'Credit Card': return 'card';
      case 'Wallet': return 'wallet';
      default: return 'wallet';
    }
  }

  // ========== Date formatting ==========
  protected formatRelativeDetailed(date: any): string {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '';

    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  // ========== Transactions ==========
  editTransaction(tx: any) {
    this.router.navigate(['/tabs/add'], {
      queryParams: { id: tx.id }
    });
  }

  getTxTypeClass(tx: any): string {
    if (tx.categoryId === 'transfer' || tx.type === 'transfer') return 'tx-type-transfer';
    if (tx.type === 'credit' || tx.type === 'income') return 'tx-type-income';
    return 'tx-type-debit';
  }

  getTxTypeIcon(tx: any): string {
    if (tx.categoryId === 'transfer' || tx.type === 'transfer') return 'swap-horizontal';
    if (tx.type === 'credit' || tx.type === 'income') return 'arrow-down-outline';
    return 'arrow-up-outline';
  }

  // ========== Refresh ==========
  async handleRefresh(event: any) {
    await this.expenseService.loadDashboardData();
    event.target.complete();
  }

  showComingSoon() {
    this.notificationService.success('Feature coming soon in future updates!', 2000);
  }

  async addDetectedBank(bankName: string) {
    await this.accountService.addAccount({
      name: bankName,
      type: 'bank',
      balance: 0
    });
    this.notificationService.success(`${bankName} added to accounts!`);
  }
}