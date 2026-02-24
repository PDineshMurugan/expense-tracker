import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent, IonIcon,
  IonRefresher, IonRefresherContent
} from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { ExpenseService } from '../../core/services/expense.service';
import { CategoryService } from '../../core/services/category.service';
import { CurrencyPipe } from '../../shared/pipes/currency.pipe';
import { Expense } from '../../core/models/expense.model';
import { addIcons } from 'ionicons';
import {
  barChart, wallet, receipt, trendingUp, search, calendar,
  fastFood, car, cart, film, medkit, home, school, airplane, gift, helpOutline, chevronDownOutline, arrowUpOutline, searchOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-reports',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule,
    IonContent,
    CurrencyPipe, IonIcon, IonRefresher, IonRefresherContent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss']
})
export class ReportsComponent implements OnInit {
  protected readonly expenseService = inject(ExpenseService);
  protected readonly categoryService = inject(CategoryService);

  constructor() {
    addIcons({ chevronDownOutline, wallet, receipt, trendingUp, arrowUpOutline, searchOutline, barChart, search, calendar, fastFood, car, cart, film, medkit, home, school, airplane, gift, helpOutline });
  }

  readonly selectedMonth = signal<string>(this.getCurrentMonth());
  readonly selectedCategoryId = signal<string>('all');

  readonly currentExpenses = signal<Expense[]>([]);

  readonly months = this.generateMonths();

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    const [year, month] = this.selectedMonth().split('-');
    // In our model format is YYYY-MM-DD
    const prefix = `${year}-${month}`;
    const start = `${prefix}-01`;
    const end = `${prefix}-31`;

    let expenses = await this.expenseService.getExpenses({ limit: 1000, offset: 0, startDate: start, endDate: end });

    if (this.selectedCategoryId() !== 'all') {
      expenses = expenses.filter(e => e.categoryId === this.selectedCategoryId());
    }

    expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    this.currentExpenses.set(expenses);
  }

  readonly filteredTotal = computed(() =>
    this.currentExpenses().reduce((sum, e) => sum + e.amount, 0)
  );

  readonly filteredAvg = computed(() => {
    const list = this.currentExpenses();
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
    this.loadData();
  }

  onCategoryChange(event: Event): void {
    this.selectedCategoryId.set((event.target as HTMLSelectElement).value);
    this.loadData();
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  getCategoryIcon(id: string): string {
    const cat = this.categoryService.categories().find(c => c.id === id);
    return cat?.icon || 'help-outline';
  }

  getCategoryName(id: string): string {
    const cat = this.categoryService.categories().find(c => c.id === id);
    return cat?.name || 'Unknown';
  }

  getNote(expense: Expense): string {
    return (expense as any).notes || '';
  }

  async handleRefresh(event: any) {
    await this.loadData();
    event.target.complete();
  }
}
