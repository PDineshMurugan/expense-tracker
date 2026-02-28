import { Component, Input, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
  IonList, IonItem, IonLabel, ModalController, IonSpinner
} from '@ionic/angular/standalone';
import { Expense } from '../../../core/models/expense.model';
import { ExpenseService } from '../../../core/services/expense.service';
import { CurrencyPipe } from '../../../shared/pipes/currency.pipe';
import { ExpenseDetailsModalComponent } from './expense-details-modal.component';
import { addIcons } from 'ionicons';
import { closeOutline, documentTextOutline, searchOutline } from 'ionicons/icons';

@Component({
  selector: 'app-category-spends-modal',
  standalone: true,
  imports: [
    CommonModule, CurrencyPipe,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
    IonSpinner
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar class="transparent-toolbar">
        <ion-title>{{ categoryName }} Spends</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="close()">
            <ion-icon name="close-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding glass-bg">
      <div class="period-header">
        <span class="period-dates">{{ startDate | date:'mediumDate' }} - {{ endDate | date:'mediumDate' }}</span>
        <h2 class="total-amount">{{ totalSpend() | currency }}</h2>
      </div>

      @if (isLoading()) {
        <div class="loading-state">
          <ion-spinner name="crescent"></ion-spinner>
          <p>Loading transactions...</p>
        </div>
      } @else if (expenses().length === 0) {
        <div class="empty-state glass-card">
          <div class="icon-circle">
            <ion-icon name="search-outline"></ion-icon>
          </div>
          <p>No transactions found for this period.</p>
        </div>
      } @else {
        <div class="transactions-list stagger-children">
          @for (expense of expenses(); track expense.id) {
            <div class="tx-item" (click)="openExpenseDetails(expense)">
              <div class="tx-icon custom-bg">
                <ion-icon [name]="categoryIcon"></ion-icon>
              </div>
              <div class="tx-details">
                <span class="tx-name">{{ $any(expense).merchantName || categoryName }}</span>
                @if ($any(expense).notes) {
                  <span class="tx-subtext">{{ $any(expense).notes }}</span>
                } @else if ($any(expense).accountIdentifier) {
                  <span class="tx-subtext">{{ $any(expense).accountIdentifier }}</span>
                }
              </div>
              <div class="tx-amount-col">
                <span class="tx-amount">{{ expense.amount | currency }}</span>
                <span class="tx-date">{{ expense.date | date:'MMM d' }}</span>
              </div>
            </div>
          }
        </div>
      }
    </ion-content>
  `,
  styles: [`
    .period-header {
      text-align: center;
      margin-bottom: 24px;
      padding: 20px;
      background: var(--glass-bg);
      border-radius: var(--radius-lg);
      border: 1px solid var(--glass-border);
      
      .period-dates {
        display: block;
        font-size: 13px;
        color: var(--color-text-secondary);
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .total-amount {
        margin: 0;
        font-size: 32px;
        font-weight: 700;
        background: var(--gradient-primary);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 0;
      color: var(--color-text-secondary);
      
      ion-spinner {
        margin-bottom: 16px;
      }
    }

    .tx-item {
      display: flex;
      align-items: center;
      padding: 16px;
      margin-bottom: 12px;
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-md);
      transition: all var(--transition-base);
      cursor: pointer;

      &:hover, &:active {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        background: rgba(255, 255, 255, 0.8);
      }

      .tx-icon {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 16px;
        font-size: 24px;
        background: rgba(var(--color-primary-rgb), 0.1);
        color: var(--color-primary);

        &.custom-bg {
          background: rgba(var(--color-tertiary-rgb), 0.1);
          color: var(--color-tertiary);
        }
      }

      .tx-details {
        flex: 1;
        display: flex;
        flex-direction: column;
        
        .tx-name {
          font-weight: 600;
          font-size: 16px;
          color: var(--color-text);
          margin-bottom: 4px;
        }
        
        .tx-subtext {
          font-size: 13px;
          color: var(--color-text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 180px;
        }
      }

      .tx-amount-col {
        text-align: right;
        display: flex;
        flex-direction: column;
        
        .tx-amount {
          font-weight: 700;
          font-size: 16px;
          color: var(--color-text);
          margin-bottom: 4px;
        }
        
        .tx-date {
          font-size: 12px;
          color: var(--color-text-secondary);
        }
      }
    }
  `]
})
export class CategorySpendsModalComponent implements OnInit {
  @Input() categoryId!: string;
  @Input() categoryName!: string;
  @Input() categoryIcon!: string;
  @Input() startDate!: string;
  @Input() endDate!: string;

  private readonly expenseService = inject(ExpenseService);
  private readonly modalCtrl = inject(ModalController);

  readonly expenses = signal<Expense[]>([]);
  readonly isLoading = signal<boolean>(true);

  readonly totalSpend = computed(() => {
    return this.expenses().reduce((sum, e) => sum + e.amount, 0);
  });

  constructor() {
    addIcons({ closeOutline, documentTextOutline, searchOutline });
  }

  ngOnInit() {
    this.loadExpenses();
  }

  async loadExpenses() {
    this.isLoading.set(true);
    let allExpenses = await this.expenseService.getExpenses({
      limit: 1000,
      offset: 0,
      startDate: this.startDate,
      endDate: this.endDate
    });

    // Filter by category
    const categoryExpenses = allExpenses
      .filter(e => e.categoryId === this.categoryId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    this.expenses.set(categoryExpenses);
    this.isLoading.set(false);
  }

  async openExpenseDetails(expense: Expense) {
    const modal = await this.modalCtrl.create({
      component: ExpenseDetailsModalComponent,
      componentProps: {
        expense,
        categoryName: this.categoryName
      },
      breakpoints: [0, 0.75, 1],
      initialBreakpoint: 0.75
    });
    await modal.present();
  }

  close() {
    this.modalCtrl.dismiss();
  }
}
