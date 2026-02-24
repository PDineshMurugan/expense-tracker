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
  imports: [CommonModule, RouterModule, IonContent, IonBackButton, IonButtons, IonIcon, CurrencyPipe],
  templateUrl: './auto-transactions.component.html',
  styleUrls: ['./auto-transactions.component.scss']
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
