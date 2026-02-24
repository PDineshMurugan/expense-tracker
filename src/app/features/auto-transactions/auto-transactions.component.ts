import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonBackButton, IonButtons, IonIcon } from '@ionic/angular/standalone';
import { SmsService } from '../../core/services/sms.service';
import { CurrencyPipe } from '../../shared/pipes/currency.pipe';
import { addIcons } from 'ionicons';
import { phonePortraitOutline, business, arrowForwardOutline, cardOutline } from 'ionicons/icons';

@Component({
  selector: 'app-auto-transactions',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule, IonContent, IonHeader, IonToolbar, IonTitle, IonBackButton, IonButtons, IonIcon, CurrencyPipe],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar class="glass-header">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/dashboard" color="dark"></ion-back-button>
        </ion-buttons>
        <ion-title>Auto-Detected ({{ smsService.getValidSmsCount() }})</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="bg-pattern">
      <div class="page-container animate-fade-in">
        
        <!-- Senders Horizontal Scroll -->
        <section class="section pt-3">
          <h2 class="section-title">By Bank / Sender</h2>
          <div class="horizontal-scroll hide-scrollbar">
            @for (sender of senderSummary(); track sender.name; let i = $index) {
              <div class="glass-card sender-card animate-fade-in-up" 
                   [style.animation-delay]="(i * 50) + 'ms'"
                   (click)="goToSender(sender.name)">
                <div class="sender-card__top">
                  <div class="sender-card__icon" [style.color]="sender.ui.color" [style.backgroundColor]="sender.ui.color + '20'">
                    <ion-icon [name]="sender.ui.icon"></ion-icon>
                  </div>
                  <span class="sender-card__name">{{ sender.name }}</span>
                </div>
                <div class="sender-card__bottom">
                  <span class="sender-card__amount">{{ sender.total | currency }}</span>
                  <span class="sender-card__count">{{ sender.count }} transactions</span>
                </div>
              </div>
            }
            @if (senderSummary().length === 0) {
              <p class="empty-text">No senders found.</p>
            }
          </div>
        </section>

        <!-- Top Merchants List -->
        <section class="section">
          <h2 class="section-title">Top Merchants</h2>
          <div class="merchant-list stagger-children">
            @for (merchant of topMerchants().slice(0, 15); track merchant.originalName) {
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
            @if (topMerchants().length === 0) {
              <p class="empty-text">No merchants detected.</p>
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

    .section {
      margin-bottom: var(--spacing-xl);
    }
    .section-title {
      font-size: var(--font-size-md);
      font-weight: var(--font-weight-bold);
      color: var(--color-text);
      margin: 0 var(--spacing-md) var(--spacing-sm) var(--spacing-md);
    }
    .pt-3 { padding-top: var(--spacing-md); }

    /* Horizontal Senders */
    .horizontal-scroll {
      display: flex;
      overflow-x: auto;
      gap: var(--spacing-md);
      padding: 0 var(--spacing-md) var(--spacing-sm) var(--spacing-md);
      scroll-snap-type: x mandatory;
    }
    
    .sender-card {
      min-width: 160px;
      padding: var(--spacing-md);
      scroll-snap-align: start;
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
      cursor: pointer;
      border-top: 3px solid var(--color-primary);
      transition: transform 0.2s ease;
    }

    .sender-card:active {
      transform: scale(0.97);
    }

    .sender-card__top {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .sender-card__icon {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-sm);
      background: rgba(var(--color-primary-rgb), 0.1);
      color: var(--color-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
    }

    .sender-card__name {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-bold);
      color: var(--color-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .sender-card__bottom {
      display: flex;
      flex-direction: column;
    }

    .sender-card__amount {
      font-size: var(--font-size-base);
      font-weight: var(--font-weight-bold);
      color: var(--color-danger);
    }

    .sender-card__count {
      font-size: 0.65rem;
      color: var(--color-text-secondary);
      margin-top: 2px;
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
export class AutoTransactionsComponent {
  protected readonly smsService = inject(SmsService);
  private readonly router = inject(Router);

  readonly senderSummary = computed(() => this.smsService.getSenderSummary());
  readonly topMerchants = computed(() => this.smsService.getTopMerchants());

  constructor() {
    addIcons({ phonePortraitOutline, business, arrowForwardOutline, cardOutline });
  }

  goToSender(sender: string) {
    this.router.navigate(['/tabs/auto-transactions/sender', encodeURIComponent(sender)]);
  }

  goToMerchant(merchant: string) {
    this.router.navigate(['/tabs/auto-transactions/merchant', encodeURIComponent(merchant)]);
  }
}
