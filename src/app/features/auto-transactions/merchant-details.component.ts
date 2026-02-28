import { Component, ChangeDetectionStrategy, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonBackButton, IonButtons, IonIcon, IonModal } from '@ionic/angular/standalone';
import { SmsService } from '../../core/services/sms.service';
import { CurrencyPipe } from '../../shared/pipes/currency.pipe';
import { NotificationService } from '../../core/services/notification.service';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { addIcons } from 'ionicons';
import { cardOutline, createOutline, closeOutline, swapHorizontal, fastFood, cart, car } from 'ionicons/icons';

@Component({
  selector: 'app-merchant-details',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule, IonContent, IonBackButton, IonButtons, IonIcon, CurrencyPipe, IonModal],
  templateUrl: './merchant-details.component.html',
  styleUrls: ['./merchant-details.component.scss']
})
export class MerchantDetailsComponent {
  private readonly smsService = inject(SmsService);
  private readonly notificationService = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);

  readonly merchantName = computed(() => decodeURIComponent(this.route.snapshot.paramMap.get('id') || 'Unknown Merchant'));
  readonly transactions = computed(() => this.smsService.getMerchantTransactions(this.merchantName()));
  readonly totalAmount = computed(() => this.transactions().reduce((sum, t) => sum + t.amount, 0));

  readonly groupedTransactions = computed(() => {
    const groups = new Map<string, any[]>();
    for (const txn of this.transactions()) {
      const d = new Date(txn.date);
      // Group by specific date string
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const existing = groups.get(dateStr) || [];
      existing.push(txn);
      groups.set(dateStr, existing);
    }

    return Array.from(groups.entries()).map(([dateStr, items]) => ({ dateStr, items }));
  });

  // Modal State
  readonly isEditModalOpen = signal(false);
  readonly editMode = signal<'bulk' | 'single'>('bulk');
  readonly editTargetId = signal<string | null>(null);

  readonly tempSelectedCategory = signal<string>('card-outline');
  readonly tempSelectedLabel = signal<string>('Other');
  readonly tempIsTransfer = signal<boolean>(false);

  readonly availableCategories = [
    { icon: 'fast-food', label: 'Food' },
    { icon: 'cart', label: 'Shopping' },
    { icon: 'car', label: 'Transport' },
    { icon: 'card-outline', label: 'Other' }
  ];

  constructor() {
    addIcons({ cardOutline, createOutline, closeOutline, swapHorizontal, fastFood, cart, car });
  }

  getTxnIcon(txn: any): string {
    if (txn.isTransfer || txn.userCategoryLabel === 'Transfer') return 'swap-horizontal';
    return txn.userCategory || 'card-outline';
  }

  formatTime(d: Date): string {
    return new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  openBulkEdit() {
    this.editMode.set('bulk');
    this.editTargetId.set(null);
    this.resetEditorState();
    this.isEditModalOpen.set(true);
  }

  openSingleEdit(id: string, txn: any) {
    this.editMode.set('single');
    this.editTargetId.set(id);

    if (txn.isTransfer) {
      this.selectTransfer();
    } else if (txn.userCategory) {
      this.selectCategory(txn.userCategory, txn.userCategoryLabel);
    } else {
      this.resetEditorState();
    }

    this.isEditModalOpen.set(true);
  }

  closeEditModal() {
    this.isEditModalOpen.set(false);
  }

  resetEditorState() {
    this.tempSelectedCategory.set('card-outline');
    this.tempSelectedLabel.set('Other');
    this.tempIsTransfer.set(false);
  }

  selectCategory(icon: string, label: string) {
    this.tempSelectedCategory.set(icon);
    this.tempSelectedLabel.set(label);
    this.tempIsTransfer.set(false);
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => { });
  }

  selectTransfer() {
    this.tempSelectedCategory.set('swap-horizontal');
    this.tempSelectedLabel.set('Transfer');
    this.tempIsTransfer.set(true);
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => { });
  }

  saveCategory() {
    if (this.editMode() === 'bulk') {
      this.smsService.updateBulkCategory(
        this.merchantName(),
        this.tempSelectedCategory(),
        this.tempSelectedLabel(),
        this.tempIsTransfer()
      );
    } else {
      const id = this.editTargetId();
      if (id) {
        this.smsService.updateTransactionCategory(
          id,
          this.tempSelectedCategory(),
          this.tempSelectedLabel(),
          this.tempIsTransfer()
        );
      }
    }

    Haptics.notification({ type: NotificationType.Success }).catch(() => { });
    this.notificationService.success('Categories updated successfully');
    this.closeEditModal();
  }
}
