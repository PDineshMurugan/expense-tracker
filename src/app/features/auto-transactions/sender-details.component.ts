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
  imports: [CommonModule, RouterModule, IonContent, IonBackButton, IonButtons, IonIcon, CurrencyPipe],
  templateUrl: './sender-details.component.html',
  styleUrls: ['./sender-details.component.scss']
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
