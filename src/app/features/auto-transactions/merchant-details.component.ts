import { Component, ChangeDetectionStrategy, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonBackButton, IonButtons, IonIcon, IonModal } from '@ionic/angular/standalone';
import { SmsService } from '../../core/services/sms.service';
import { CurrencyPipe } from '../../shared/pipes/currency.pipe';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { addIcons } from 'ionicons';
import { cardOutline, createOutline, closeOutline, swapHorizontal, fastFood, cart, car } from 'ionicons/icons';

@Component({
  selector: 'app-merchant-details',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule, IonContent, IonHeader, IonToolbar, IonTitle, IonBackButton, IonButtons, IonIcon, CurrencyPipe, IonModal],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar class="glass-header">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/auto-transactions" color="dark"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ merchantName() }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="bg-pattern">
      <div class="page-container animate-fade-in">
        
        <!-- Summary Header -->
        <div class="summary-header">
          <div class="summary-icon">
            <ion-icon name="card-outline"></ion-icon>
          </div>
          <div class="summary-total">{{ totalAmount() | currency }}</div>
          <div class="summary-count">{{ transactions().length }} Transactions</div>
          
          <button class="bulk-edit-btn" (click)="openBulkEdit()">
            <ion-icon name="create-outline"></ion-icon> Edit All Categories
          </button>
        </div>

        <!-- Date Grouped Transactions -->
        <div class="transaction-timeline">
          @for (group of groupedTransactions(); track group.dateStr) {
            <div class="date-group">
              <div class="date-header">
                <span class="date-text">{{ group.dateStr }}</span>
              </div>
              
              <div class="transaction-list stagger-children">
                @for (txn of group.items; track txn.id) {
                  <div class="glass-card transaction-row animate-fade-in-up">
                    <div class="transaction-icon-wrap" [class.transfer]="txn.isTransfer">
                      <ion-icon [name]="getTxnIcon(txn)"></ion-icon>
                    </div>
                    
                    <div class="transaction-info">
                      <span class="transaction-title">{{ txn.userCategoryLabel ?? (txn.isTransfer ? 'Transfer' : 'Expense') }}</span>
                      <span class="transaction-meta">{{ formatTime(txn.date) }}</span>
                    </div>

                    <div class="transaction-amount-wrap">
                      <span class="transaction-amount" [class.transfer]="txn.isTransfer">
                        {{ txn.isTransfer ? '' : '-' }}{{ txn.amount | currency }}
                      </span>
                      <button class="edit-btn" (click)="openSingleEdit(txn.id, txn)">
                        <ion-icon name="create-outline"></ion-icon>
                      </button>
                    </div>
                  </div>
                  @if (txn.originalBody) {
                    <div class="transaction-raw-sms animate-fade-in">
                      {{ txn.originalBody }}
                    </div>
                  }
                }
              </div>
            </div>
          }
          @if (groupedTransactions().length === 0) {
            <p class="empty-text">No transactions found.</p>
          }
        </div>

      </div>

      <!-- Category Edit Modal -->
      <ion-modal [isOpen]="isEditModalOpen()" [initialBreakpoint]="1" [breakpoints]="[0, 1]" (didDismiss)="closeEditModal()">
        <ng-template>
          <ion-header class="ion-no-border">
            <ion-toolbar class="glass-header">
              <ion-title>{{ editMode() === 'bulk' ? 'Edit All' : 'Edit Transaction' }}</ion-title>
              <ion-buttons slot="end">
                <button class="icon-btn" (click)="closeEditModal()"><ion-icon name="close-outline"></ion-icon></button>
              </ion-buttons>
            </ion-toolbar>
          </ion-header>
          <ion-content class="ion-padding bg-pattern">
            
            <div class="modal-body">
              <h3 class="category-title">Select Category</h3>
              
              <div class="category-grid">
                @for (cat of availableCategories; track cat.label) {
                  <div class="category-pill" 
                       [class.category-pill--selected]="tempSelectedCategory() === cat.icon"
                       (click)="selectCategory(cat.icon, cat.label)">
                    <div class="category-pill__icon"><ion-icon [name]="cat.icon"></ion-icon></div>
                    <span class="category-pill__name">{{ cat.label }}</span>
                  </div>
                }
                
                <!-- Transfer Option built-in -->
                <div class="category-pill" 
                     [class.category-pill--selected]="tempIsTransfer()"
                     (click)="selectTransfer()">
                  <div class="category-pill__icon"><ion-icon name="swap-horizontal"></ion-icon></div>
                  <span class="category-pill__name">Transfer</span>
                </div>
              </div>

              <button class="save-btn save-btn--ready mt-4" (click)="saveCategory()">
                <span class="save-btn__text">Save Changes</span>
              </button>
            </div>

          </ion-content>
        </ng-template>
      </ion-modal>

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
      margin-bottom: var(--spacing-xl);
      box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.2);
    }

    .summary-icon {
      width: 48px;
      height: 48px;
      margin: 0 auto var(--spacing-sm) auto;
      border-radius: 50%;
      background: rgba(255,255,255,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
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

    .bulk-edit-btn {
      margin-top: var(--spacing-md);
      background: rgba(255,255,255,0.2);
      border: 1px solid rgba(255,255,255,0.4);
      color: white;
      padding: 6px 16px;
      border-radius: var(--radius-full);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    /* Timeline */
    .transaction-timeline {
      padding: 0 var(--spacing-md);
      display: flex;
      flex-direction: column;
      gap: var(--spacing-lg);
    }

    .date-group {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
    }

    .date-header {
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
      font-weight: var(--font-weight-bold);
      text-transform: uppercase;
      letter-spacing: 1px;
      padding-left: 4px;
    }

    .transaction-list {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);
    }

    .transaction-row {
      display: flex;
      align-items: center;
      padding: var(--spacing-md);
      gap: var(--spacing-md);
    }

    .transaction-icon-wrap {
      width: 40px;
      height: 40px;
      border-radius: var(--radius-sm);
      background: rgba(var(--color-primary-rgb), 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-primary);
      font-size: 1.25rem;
    }

    .transaction-icon-wrap.transfer {
      background: var(--color-surface-alt);
      color: var(--color-text-secondary);
    }

    .transaction-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .transaction-title {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-bold);
      color: var(--color-text);
    }

    .transaction-meta {
      font-size: var(--font-size-xs);
      color: var(--color-text-secondary);
    }

    .transaction-amount-wrap {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
    }

    .transaction-amount {
      font-size: var(--font-size-base);
      font-weight: var(--font-weight-bold);
      color: var(--color-danger);
    }
    
    .transaction-amount.transfer {
      color: var(--color-text-secondary);
    }

    .edit-btn {
      background: transparent;
      border: none;
      color: var(--color-primary);
      font-size: 1.1rem;
      padding: 4px;
      opacity: 0.7;
    }

    .empty-text {
      text-align: center;
      color: var(--color-text-secondary);
      font-size: var(--font-size-sm);
    }

    .transaction-raw-sms {
      font-size: 0.7rem;
      color: var(--color-text-secondary);
      background: rgba(255, 255, 255, 0.4);
      padding: var(--spacing-sm) var(--spacing-md);
      margin-top: -var(--spacing-xs);
      border-bottom-left-radius: var(--radius-md);
      border-bottom-right-radius: var(--radius-md);
      border: 1px solid var(--color-surface-alt);
      border-top: none;
      line-height: 1.4;
      font-style: italic;
    }

    /* Modal Styling */
    .icon-btn {
      background: transparent;
      border: none;
      color: var(--color-text);
      font-size: 1.5rem;
      padding: 8px;
    }
    .modal-body {
      padding: var(--spacing-md) 0;
    }
    .category-title {
      font-size: var(--font-size-base);
      color: var(--color-text);
      font-weight: var(--font-weight-bold);
      margin-bottom: var(--spacing-md);
    }

    .category-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: var(--spacing-sm);
      margin-bottom: var(--spacing-lg);
    }

    .category-pill {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--spacing-xs);
      padding: var(--spacing-sm);
      border-radius: var(--radius-md);
      background: var(--glass-bg);
      border: 1px solid var(--color-surface-alt);
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .category-pill--selected {
      background: rgba(var(--color-primary-rgb), 0.1);
      border-color: var(--color-primary);
    }

    .category-pill__icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: var(--color-surface-alt);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      color: var(--color-text-secondary);
      transition: all var(--transition-fast);
    }

    .category-pill--selected .category-pill__icon {
      background: var(--gradient-primary);
      color: #fff;
    }

    .category-pill__name {
      font-size: 0.65rem;
      color: var(--color-text-secondary);
      text-align: center;
      line-height: 1.2;
      font-weight: var(--font-weight-medium);
    }

    .category-pill--selected .category-pill__name {
      color: var(--color-primary);
      font-weight: var(--font-weight-semibold);
    }

    .save-btn {
      width: 100%;
      padding: var(--spacing-md) var(--spacing-lg);
      border: none;
      border-radius: var(--radius);
      background: var(--color-surface-alt);
      color: var(--color-text-secondary);
      font-size: var(--font-size-base);
      font-weight: var(--font-weight-bold);
      cursor: pointer;
      font-family: var(--font-family);
    }

    .save-btn--ready {
      background: var(--gradient-primary);
      color: #fff;
      box-shadow: 0 4px 16px rgba(var(--color-primary-rgb), 0.35);
    }
  `]
})
export class MerchantDetailsComponent {
  private readonly smsService = inject(SmsService);
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
    this.closeEditModal();
  }
}
