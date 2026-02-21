import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
    IonContent, IonHeader, IonToolbar, IonTitle, IonIcon, IonBackButton, IonButtons, IonList, IonItem, IonLabel, IonNote
} from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { AccountService } from '../../core/services/account.service';
import { CurrencyPipe } from '../../shared/pipes/currency.pipe';
import { addIcons } from 'ionicons';
import {
    business, card, wallet, addCircle, create, trash, add
} from 'ionicons/icons';
import { ExpenseService } from '../../core/services/expense.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
    selector: 'app-accounts',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule, FormsModule,
        IonContent, IonHeader, IonToolbar, IonTitle, IonIcon, IonBackButton, IonButtons,
        CurrencyPipe
    ],
    template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/settings"></ion-back-button>
        </ion-buttons>
        <ion-title>Accounts & Cards</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="accounts-container animate-fade-in">

        <!-- Add New Account Form -->
        <div class="glass-card new-account-card">
          <h3 class="section-title">Add New Account</h3>
          
          <div class="form-group">
            <label>Name</label>
            <input type="text" [value]="newName()" (input)="newName.set($any($event.target).value)" placeholder="e.g. HDFC Salary, SBI Credit Card" class="form-input" />
          </div>

          <div class="form-row">
            <div class="form-group" style="flex: 1;">
              <label>Type</label>
              <select [value]="newType()" (change)="newType.set($any($event.target).value)" class="form-input">
                <option value="Bank">Bank Account</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Wallet">Wallet</option>
              </select>
            </div>
            
            <div class="form-group" style="flex: 1;">
              <label>Identifier (optional)</label>
              <input type="text" [value]="newIdentifier()" (input)="newIdentifier.set($any($event.target).value)" placeholder="e.g. *6493" class="form-input" />
            </div>
          </div>

          <button class="btn-gradient add-btn" (click)="addAccount()" [disabled]="!canAdd()">
            <ion-icon name="add-circle" class="btn-icon"></ion-icon>
            Add Account
          </button>
        </div>

        <!-- Existing Accounts List -->
        <div class="accounts-list stagger-children">
          @for (acc of accountService.accounts(); track acc.id) {
            <div class="glass-card account-item animate-fade-in-up">
              <div class="account-icon-wrap" [ngClass]="acc.type.toLowerCase().replace(' ', '-')">
                <ion-icon [name]="getAccountIcon(acc.type)" class="account-icon"></ion-icon>
              </div>
              
              <div class="account-info">
                <div class="account-title-row">
                  <span class="account-name">{{ acc.name }}</span>
                  <span class="account-type-badge">{{ acc.type }}</span>
                </div>
                <div class="account-meta">
                  <span class="account-identifier">{{ acc.accountIdentifier || 'No Identifier' }}</span>
                  <span class="account-spent">Monthly Spent: {{ expenseService.monthlyTotalByAccount(acc.id) | currency }}</span>
                </div>
              </div>

              <div class="account-actions">
                <button class="action-btn delete-btn" (click)="deleteAccount(acc.id)">
                  <ion-icon name="trash"></ion-icon>
                </button>
              </div>
            </div>
          }

          @if (accountService.accounts().length === 0) {
            <div class="empty-state">
              <ion-icon name="wallet" class="empty-state-icon"></ion-icon>
              <p>No accounts added yet.</p>
              <small>Add bank accounts or credit cards to track expenses per account.</small>
            </div>
          }
        </div>

      </div>
    </ion-content>
  `,
    styles: [`
    .accounts-container {
      max-width: 600px;
      margin: 0 auto;
      padding-bottom: var(--spacing-xl);
    }

    .section-title {
      font-size: var(--font-size-base);
      font-weight: var(--font-weight-bold);
      color: var(--color-text);
      margin-bottom: var(--spacing-md);
    }

    /* ── Form ── */
    .new-account-card {
      padding: var(--spacing-lg);
      margin-bottom: var(--spacing-xl);
      border-top: 3px solid var(--color-accent);
    }

    .form-row {
      display: flex;
      gap: var(--spacing-md);
      margin-bottom: var(--spacing-md);
    }

    .form-group {
      margin-bottom: var(--spacing-md);
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .form-group label {
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-bold);
      color: var(--color-text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .form-input {
      padding: var(--spacing-sm) var(--spacing-md);
      border: 1px solid var(--color-surface-alt);
      border-radius: var(--radius-sm);
      background: var(--color-surface);
      color: var(--color-text);
      font-size: var(--font-size-sm);
      outline: none;
      font-family: var(--font-family);
      transition: border-color var(--transition-fast);
    }

    .form-input:focus {
      border-color: var(--color-primary);
    }

    .add-btn {
      width: 100%;
      padding: var(--spacing-md);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--spacing-xs);
      font-size: var(--font-size-sm);
      margin-top: var(--spacing-sm);
    }

    .btn-gradient {
      border: none;
      border-radius: var(--radius-sm);
      background: var(--gradient-primary);
      color: white;
      font-weight: var(--font-weight-bold);
      cursor: pointer;
      font-family: var(--font-family);
      transition: all var(--transition-base);
      box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.25);
    }

    .btn-gradient:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* ── List ── */
    .accounts-list {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
    }

    .account-item {
      padding: var(--spacing-md);
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
    }

    .account-icon-wrap {
      width: 44px;
      height: 44px;
      border-radius: var(--radius-full);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      flex-shrink: 0;
    }

    .bank {
      background: rgba(var(--color-primary-rgb), 0.1);
      color: var(--color-primary);
    }

    .credit-card {
      background: rgba(var(--color-accent-rgb), 0.1);
      color: var(--color-accent);
    }

    .wallet {
      background: rgba(var(--color-danger-rgb), 0.1);
      color: var(--color-danger);
    }

    .account-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .account-title-row {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
    }

    .account-name {
      font-weight: var(--font-weight-bold);
      font-size: var(--font-size-sm);
      color: var(--color-text);
    }

    .account-type-badge {
      font-size: 0.6rem;
      text-transform: uppercase;
      font-weight: var(--font-weight-bold);
      background: var(--color-surface-alt);
      color: var(--color-text-secondary);
      padding: 2px 6px;
      border-radius: 4px;
    }

    .account-meta {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .account-identifier {
      font-family: monospace;
      font-size: var(--font-size-xs);
      color: var(--color-text-secondary);
      letter-spacing: 0.5px;
    }

    .account-spent {
      font-size: var(--font-size-xs);
      color: var(--color-text-secondary);
      font-weight: var(--font-weight-medium);
    }

    .account-actions {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
    }

    .action-btn {
      width: 36px;
      height: 36px;
      border-radius: var(--radius-sm);
      border: none;
      background: transparent;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      cursor: pointer;
      transition: background var(--transition-fast);
    }

    .delete-btn {
      color: var(--color-danger);
    }

    .delete-btn:hover {
      background: rgba(var(--color-danger-rgb), 0.1);
    }

    /* ── Empty State ── */
    .empty-state {
      text-align: center;
      padding: var(--spacing-2xl) 0;
      color: var(--color-text-secondary);
    }

    .empty-state-icon {
      font-size: 3rem;
      margin-bottom: var(--spacing-sm);
      opacity: 0.5;
    }

    .empty-state p {
      font-weight: var(--font-weight-bold);
      margin-bottom: 4px;
    }

    .empty-state small {
      font-size: var(--font-size-xs);
      opacity: 0.8;
    }
  `]
})
export class AccountsComponent {
    protected readonly accountService = inject(AccountService);
    protected readonly expenseService = inject(ExpenseService);
    private readonly notificationService = inject(NotificationService);

    readonly newName = signal('');
    readonly newType = signal<'Bank' | 'Credit Card' | 'Wallet'>('Bank');
    readonly newIdentifier = signal('');

    constructor() {
        addIcons({ business, card, wallet, addCircle, create, trash, add });
    }

    getAccountIcon(type: string): string {
        switch (type) {
            case 'Bank': return 'business';
            case 'Credit Card': return 'card';
            case 'Wallet': return 'wallet';
            default: return 'wallet';
        }
    }

    canAdd(): boolean {
        return this.newName().trim().length > 0;
    }

    async addAccount(): Promise<void> {
        if (!this.canAdd()) return;

        await this.accountService.addAccount({
            name: this.newName().trim(),
            type: this.newType(),
            accountIdentifier: this.newIdentifier().trim() || undefined,
        });

        this.notificationService.success('Account added successfully');

        // Reset form
        this.newName.set('');
        this.newIdentifier.set('');
        this.newType.set('Bank');
    }

    async deleteAccount(id: string): Promise<void> {
        if (confirm('Are you sure you want to delete this account? Expenses linked to this account will remain, but lose their account link.')) {
            await this.accountService.deleteAccount(id);
            this.notificationService.success('Account deleted');
        }
    }
}
