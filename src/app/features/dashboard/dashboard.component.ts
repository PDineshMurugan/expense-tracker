import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  IonContent, IonIcon, IonRefresher, IonRefresherContent, IonSkeletonText
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
  searchOutline, arrowUpOutline, pieChart, addCircleOutline, cardOutline,
  chevronForwardOutline, businessOutline, documentOutline, refreshOutline,
  contractOutline, addOutline, wallet, calendar, business, checkmarkCircle,
  addCircle, fileTrayOutline, sparklesOutline, add, phonePortraitOutline,
  warning, arrowForwardOutline, fastFood, car, cart, film, medkit, receipt,
  home, school, airplane, gift, swapHorizontal
} from 'ionicons/icons';

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
  protected readonly notificationService = inject(NotificationReaderService);

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
    const notifs = this.notificationService.detectedTransactions() || [];
    return [...sms, ...notifs].sort((a, b) => {
      const da = a.date instanceof Date ? a.date : new Date(a.date);
      const db = b.date instanceof Date ? b.date : new Date(b.date);
      return db.getTime() - da.getTime();
    });
  });

  constructor() {
    addIcons({
      searchOutline, arrowUpOutline, pieChart, addCircleOutline, cardOutline,
      chevronForwardOutline, businessOutline, documentOutline, refreshOutline,
      contractOutline, addOutline, wallet, calendar, business, checkmarkCircle,
      addCircle, fileTrayOutline, sparklesOutline, add, phonePortraitOutline,
      warning, arrowForwardOutline, fastFood, car, cart, film, medkit, receipt,
      home, school, airplane, gift, swapHorizontal
    });
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

  // ========== Refresh ==========
  async handleRefresh(event: any) {
    await this.expenseService.loadDashboardData();
    event.target.complete();
  }
}