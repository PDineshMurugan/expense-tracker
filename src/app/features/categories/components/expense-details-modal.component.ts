import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
  IonList, IonItem, IonLabel, ModalController, IonNote
} from '@ionic/angular/standalone';
import { Expense } from '../../../core/models/expense.model';
import { CurrencyPipe } from '../../../shared/pipes/currency.pipe';
import { addIcons } from 'ionicons';
import { closeOutline, documentTextOutline, businessOutline, walletOutline, alertCircleOutline } from 'ionicons/icons';

@Component({
  selector: 'app-expense-details-modal',
  standalone: true,
  imports: [
    CommonModule, CurrencyPipe,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
    IonList, IonItem, IonLabel
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar class="transparent-toolbar">
        <ion-title>Expense Details</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="close()">
            <ion-icon name="close-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding glass-bg">
      <div class="details-card form-card">
        <div class="amount-header warning-theme">
          <h3>{{ expense.amount | currency }}</h3>
          <span class="date">{{ expense.date | date:'mediumDate' }}</span>
        </div>

        <ion-list lines="full" class="details-list">
          <ion-item class="glass-item">
            <ion-icon name="wallet-outline" slot="start" color="primary"></ion-icon>
            <ion-label>
              <h2>Category</h2>
              <p>{{ categoryName }}</p>
            </ion-label>
          </ion-item>

          @if ($any(expense).merchantName) {
            <ion-item class="glass-item">
              <ion-icon name="business-outline" slot="start" color="secondary"></ion-icon>
              <ion-label>
                <h2>Merchant</h2>
                <p>{{ $any(expense).merchantName }}</p>
              </ion-label>
            </ion-item>
          }

          @if ($any(expense).accountIdentifier) {
            <ion-item class="glass-item">
              <ion-icon name="alert-circle-outline" slot="start" color="tertiary"></ion-icon>
              <ion-label>
                <h2>Account Info</h2>
                <p>{{ $any(expense).accountIdentifier }}</p>
              </ion-label>
            </ion-item>
          }

          @if ($any(expense).rawSms) {
            <ion-item class="glass-item sms-item">
              <ion-icon name="documentTextOutline" slot="start" color="medium"></ion-icon>
              <ion-label class="ion-text-wrap">
                <h2>Raw SMS Message</h2>
                <div class="sms-content">
                  {{ $any(expense).rawSms }}
                </div>
              </ion-label>
            </ion-item>
          }

          @if ($any(expense).notes) {
            <ion-item class="glass-item">
              <ion-icon name="documentTextOutline" slot="start" color="medium"></ion-icon>
              <ion-label class="ion-text-wrap">
                <h2>Notes</h2>
                <p>{{ $any(expense).notes }}</p>
              </ion-label>
            </ion-item>
          }
        </ion-list>
      </div>
    </ion-content>
  `,
  styles: [`
    .amount-header {
      text-align: center;
      padding: 30px 16px;
      margin-bottom: 20px;
      border-radius: var(--radius-lg);
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      
      h3 {
        margin: 0;
        font-size: 36px;
        font-weight: 700;
        color: var(--color-warning);
      }
      .date {
        display: block;
        margin-top: 8px;
        font-size: 14px;
        color: var(--color-text-secondary);
      }
    }
    
    .details-list {
      background: transparent;
      margin-top: 10px;
    }

    .sms-item {
      --padding-end: 16px;
      align-items: flex-start;
      
      ion-icon {
        margin-top: 14px;
      }
    }

    .sms-content {
      background: rgba(0, 0, 0, 0.03);
      padding: 12px;
      border-radius: var(--radius-md);
      margin-top: 8px;
      font-size: 13px;
      color: var(--color-text-secondary);
      line-height: 1.5;
      font-family: monospace;
      white-space: pre-wrap;
      word-break: break-word;
    }
  `]
})
export class ExpenseDetailsModalComponent {
  @Input() expense!: Expense;
  @Input() categoryName: string = 'Unknown';
  private readonly modalCtrl = inject(ModalController);

  constructor() {
    addIcons({ closeOutline, documentTextOutline, businessOutline, walletOutline, alertCircleOutline });
  }

  close() {
    this.modalCtrl.dismiss();
  }
}
