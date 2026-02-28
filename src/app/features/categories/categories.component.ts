import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent, IonIcon, IonRefresher, IonRefresherContent, ModalController, IonSpinner, IonFab, IonFabButton
} from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { CategoryService } from '../../core/services/category.service';
import { ExpenseService } from '../../core/services/expense.service';
import { NotificationService } from '../../core/services/notification.service';
import { Category } from '../../core/models/category.model';
import { Expense } from '../../core/models/expense.model';
import { CurrencyPipe } from '../../shared/pipes/currency.pipe';
import { CategorySpendsModalComponent } from './components/category-spends-modal.component';
import { addIcons } from 'ionicons';
import * as allIcons from 'ionicons/icons';
import { NgApexchartsModule, ApexOptions } from 'ng-apexcharts';

type TimeFilter = 'week' | 'month' | 'quarter' | 'year';

@Component({
  selector: 'app-categories',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule, CurrencyPipe,
    IonContent, IonIcon, IonRefresher, IonRefresherContent, IonSpinner, IonFab, IonFabButton,
    NgApexchartsModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './categories.component.html',
  styleUrls: ['./categories.component.scss']
})
export class CategoriesComponent implements OnInit {
  protected readonly categoryService = inject(CategoryService);
  private readonly expenseService = inject(ExpenseService);
  private readonly notificationService = inject(NotificationService);
  private readonly modalCtrl = inject(ModalController);

  constructor() {
    addIcons(allIcons);
  }

  // --- Spend Analysis State ---
  readonly selectedFilter = signal<TimeFilter>('month');
  readonly currentExpenses = signal<Expense[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly dateRangeLabel = signal<string>('');

  private currentStartDate = '';
  private currentEndDate = '';

  // --- Add Category State ---
  readonly isAdding = signal(false);
  readonly newIcon = signal('');
  readonly newLabel = signal('');
  readonly searchResults = signal<string[]>([]);

  readonly categorySpends = computed(() => {
    const expenses = this.currentExpenses();
    const categories = this.categoryService.categories();

    const spendMap = new Map<string, number>();
    for (const e of expenses) {
      if (e.type === 'debit') {
        spendMap.set(e.categoryId, (spendMap.get(e.categoryId) || 0) + e.amount);
      }
    }

    const result = categories.map(cat => ({
      ...cat,
      totalSpend: spendMap.get(cat.id) || 0,
      expenseCount: expenses.filter(e => e.categoryId === cat.id && e.type === 'debit').length
    }));

    // Sort by spend descending
    return result.sort((a, b) => b.totalSpend - a.totalSpend);
  });

  readonly totalPeriodSpend = computed(() => {
    return this.categorySpends().reduce((sum, cat) => sum + cat.totalSpend, 0);
  });

  readonly chartOptions = computed<ApexOptions>(() => {
    const spends = this.categorySpends().filter(c => c.totalSpend > 0);
    const hasData = spends.length > 0;

    return {
      series: hasData ? spends.map(c => c.totalSpend) : [1],
      labels: hasData ? spends.map(c => c.name) : ['No Expenses'],
      chart: {
        type: 'donut',
        height: 250,
        animations: { enabled: true, speed: 400 }
      },
      colors: hasData ? spends.map(c => c.color || 'var(--ion-color-primary)') : ['#e2e8f0'],
      dataLabels: { enabled: false },
      legend: { show: false },
      stroke: { width: 0 },
      tooltip: {
        theme: 'dark',
        y: { formatter: (val) => '₹' + val.toLocaleString('en-IN') }
      },
      plotOptions: {
        pie: {
          donut: {
            size: '75%',
            labels: {
              show: true,
              name: { show: true, fontSize: '14px', color: '#64748b' },
              value: {
                show: true,
                fontSize: '24px',
                fontWeight: 600,
                color: 'var(--ion-color-dark, #0f172a)',
                formatter: (val: string | number) => '₹' + parseInt(val.toString()).toLocaleString('en-IN')
              },
              total: {
                show: true,
                showAlways: true,
                label: 'Total Spend',
                fontSize: '14px',
                color: '#64748b',
                formatter: (w) => {
                  if (!hasData) return '₹0';
                  const total = w.globals.seriesTotals.reduce((a: any, b: any) => a + b, 0);
                  return '₹' + total.toLocaleString('en-IN');
                }
              }
            }
          }
        }
      }
    };
  });

  ngOnInit() {
    this.updateDateRangeAndLoad();
  }

  setFilter(filter: TimeFilter) {
    this.selectedFilter.set(filter);
    this.updateDateRangeAndLoad();
  }

  private updateDateRangeAndLoad() {
    const now = new Date();
    const filter = this.selectedFilter();
    let start: Date;
    let end: Date;
    let label = '';

    if (filter === 'week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
      start = new Date(now.getFullYear(), now.getMonth(), diff);
      end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
      label = 'This Week';
    } else if (filter === 'quarter') {
      const quarter = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), quarter * 3, 1);
      end = new Date(start.getFullYear(), start.getMonth() + 3, 0);
      label = `Q${quarter + 1} ${now.getFullYear()}`;
    } else if (filter === 'year') {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31);
      label = `${now.getFullYear()}`;
    } else { // month
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      label = start.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    }

    // Adjust for local timezone offset when converting to ISO YYYY-MM-DD
    const tzoStart = start.getTimezoneOffset() * 60000;
    this.currentStartDate = new Date(start.getTime() - tzoStart).toISOString().split('T')[0];

    const tzoEnd = end.getTimezoneOffset() * 60000;
    this.currentEndDate = new Date(end.getTime() - tzoEnd).toISOString().split('T')[0];

    this.dateRangeLabel.set(label);

    this.loadData();
  }

  async loadData() {
    this.isLoading.set(true);
    const expenses = await this.expenseService.getExpenses({
      limit: 10000,
      offset: 0,
      startDate: this.currentStartDate,
      endDate: this.currentEndDate
    });
    this.currentExpenses.set(expenses);
    this.isLoading.set(false);
  }

  async handleRefresh(event: any) {
    await this.loadData();
    event.target.complete();
  }

  async openCategorySpends(category: any) {
    if (category.totalSpend === 0) return; // Optional: Don't open if no spends

    const modal = await this.modalCtrl.create({
      component: CategorySpendsModalComponent,
      componentProps: {
        categoryId: category.id,
        categoryName: category.name,
        categoryIcon: category.icon,
        startDate: this.currentStartDate,
        endDate: this.currentEndDate
      },
      breakpoints: [0, 0.85, 1],
      initialBreakpoint: 0.85
    });
    await modal.present();
  }

  // --- Category Add/Delete Logic ---

  onIconInput(event: Event) {
    const val = this.getInputValue(event);
    this.newIcon.set(val);

    if (val.trim().length > 1) {
      const lowerVal = val.toLowerCase().trim();
      const matches = Object.keys(allIcons).filter(iconName =>
        iconName.toLowerCase().includes(lowerVal) &&
        typeof (allIcons as any)[iconName] === 'string'
      ).slice(0, 15);

      const kebabMatches = matches.map(m => m.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase());
      this.searchResults.set(kebabMatches);
    } else {
      this.searchResults.set([]);
    }
  }

  selectIcon(iconPath: string) {
    this.newIcon.set(iconPath);
    this.searchResults.set([]);
  }

  canAdd(): boolean {
    return this.newIcon().trim().length > 0 && this.newLabel().trim().length > 0;
  }

  getInputValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  async addCategory(): Promise<void> {
    if (!this.canAdd()) return;
    const category: Category = {
      id: this.newLabel().toLowerCase().replace(/\s+/g, '-'),
      icon: this.newIcon().trim(),
      name: this.newLabel().trim(),
      color: '#78716c',
      type: 'expense',
      isSystem: false
    };
    await this.categoryService.addCategory(category);
    this.notificationService.success('Category added');
    this.cancelAdd();
  }

  cancelAdd(): void {
    this.newIcon.set('');
    this.newLabel.set('');
    this.searchResults.set([]);
    this.isAdding.set(false);
  }

  async deleteCategory(id: string, event: Event): Promise<void> {
    event.stopPropagation(); // prevent opening modal
    await this.categoryService.deleteCategory(id);
    this.notificationService.success('Category deleted');
  }
}
