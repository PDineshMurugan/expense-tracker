import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonBackButton, IonButtons, IonIcon } from '@ionic/angular/standalone';
import { SmsService } from '../../core/services/sms.service';
import { CurrencyPipe } from '../../shared/pipes/currency.pipe';
import { addIcons } from 'ionicons';
import { cardOutline, arrowForwardOutline, filterOutline } from 'ionicons/icons';

@Component({
    selector: 'app-sender-details',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, RouterModule, IonContent, IonHeader, IonToolbar, IonTitle, IonBackButton, IonButtons, IonIcon, CurrencyPipe],
    template: `
    <ion-header class="ion-no-border">
      <ion-toolbar class="glass-header">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/auto-transactions" color="dark"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ senderName() }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="bg-pattern">
      <div class="page-container animate-fade-in">
        
        <!-- Summary Header -->
        <div class="summary-header">
          <div class="summary-total">{{ totalAmount() | currency }}</div>
          <div class="summary-count">{{ totalTransactions() }} Transactions</div>
        </div>

        <!-- Filter Row (UI Only for now) -->
        <div class="filter-row">
           <span class="filter-label">Sort By: Highest Amount</span>
           <ion-icon name="filter-outline" class="filter-icon"></ion-icon>
        </div>

        <!-- Merchant List for this Sender -->
        <section class="section">
          <h2 class="section-title">Merchants</h2>
          <div class="merchant-list stagger-children">
            @for (merchant of merchants(); track merchant.originalName) {
              <div class="glass-card merchant-row" (click)="goToMerchant(merchant.originalName)">
                <div class="merchant-icon-wrap">
                  <ion-icon name="card-outline"></ion-icon>
                </div>
                <div class="merchant-info">
                  <span class="merchant-name">{{ merchant.originalName }}</span>
                  <span class="merchant-count">{{ merchant.count }} transactions</span>
                </div>
                <div class="merchant-total">
                  <span class="merchant-amount">{{ merchant.total | currency }}</span>
                  <ion-icon name="arrow-forward-outline" class="merchant-arrow"></ion-icon>
                </div>
              </div>
            }
            @if (merchants().length === 0) {
              <p class="empty-text">No merchants detected for this sender.</p>
            }
          </div>
        </section>

      </div>
    </ion-content>
  `,
    styles: [`
    .page-container {
      padding: 0 0 var(--spacing-2xl) 0;
    }

    .summary-header {
      padding: var(--spacing-xl) var(--spacing-md);
      text-align: center;
      background: var(--gradient-primary);
      color: white;
      border-bottom-left-radius: var(--radius-lg);
      border-bottom-right-radius: var(--radius-lg);
      margin-bottom: var(--spacing-md);
      box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.2);
    }

    .summary-total {
      font-size: 2.5rem;
      font-weight: 800;
      letter-spacing: -1px;
    }

    .summary-count {
      font-size: var(--font-size-sm);
      opacity: 0.8;
      font-weight: 500;
      margin-top: 4px;
    }

    .filter-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 var(--spacing-md);
      margin-bottom: var(--spacing-md);
      color: var(--color-text-secondary);
      font-size: var(--font-size-sm);
    }

    .filter-icon {
      font-size: 1.25rem;
    }

    .section {
      margin-bottom: var(--spacing-xl);
    }
    .section-title {
      font-size: var(--font-size-md);
      font-weight: var(--font-weight-bold);
      color: var(--color-text);
      margin: 0 var(--spacing-md) var(--spacing-sm) var(--spacing-md);
    }

    /* Merchants List */
    .merchant-list {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
      padding: 0 var(--spacing-md);
    }

    .merchant-row {
      display: flex;
      align-items: center;
      padding: var(--spacing-md);
      gap: var(--spacing-md);
      cursor: pointer;
      transition: transform 0.2s ease;
    }

    .merchant-row:active {
      transform: scale(0.98);
    }

    .merchant-icon-wrap {
      width: 40px;
      height: 40px;
      border-radius: var(--radius-sm);
      background: var(--color-surface-alt);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-text-secondary);
      font-size: 1.25rem;
    }

    .merchant-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      overflow: hidden;
    }

    .merchant-name {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-bold);
      color: var(--color-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .merchant-count {
      font-size: var(--font-size-xs);
      color: var(--color-text-secondary);
    }

    .merchant-total {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
    }

    .merchant-amount {
      font-size: var(--font-size-base);
      font-weight: var(--font-weight-bold);
      color: var(--color-danger);
    }

    .merchant-arrow {
      color: var(--color-text-secondary);
      font-size: 1rem;
      opacity: 0.5;
    }

    .empty-text {
      color: var(--color-text-secondary);
      font-size: var(--font-size-sm);
      padding: var(--spacing-md);
      text-align: center;
    }
  `]
})
export class SenderDetailsComponent {
    private readonly smsService = inject(SmsService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);

    readonly senderName = computed(() => decodeURIComponent(this.route.snapshot.paramMap.get('id') || 'Unknown Sender'));

    readonly merchants = computed(() => this.smsService.getTopMerchants(this.senderName()));

    readonly totalAmount = computed(() => this.merchants().reduce((sum, m) => sum + m.total, 0));
    readonly totalTransactions = computed(() => this.merchants().reduce((sum, m) => sum + m.count, 0));

    constructor() {
        addIcons({ cardOutline, arrowForwardOutline, filterOutline });
    }

    goToMerchant(merchant: string) {
        this.router.navigate(['/tabs/auto-transactions/merchant', encodeURIComponent(merchant)]);
    }
}
