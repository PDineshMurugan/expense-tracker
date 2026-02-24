import { Component, ChangeDetectionStrategy, inject, signal, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent, IonIcon, IonBackButton, IonButtons
} from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { AccountService } from '../../core/services/account.service';
import { CurrencyPipe } from '../../shared/pipes/currency.pipe';
import { addIcons } from 'ionicons';
import {
  business, card, wallet, addCircle, create, trash, add, chevronDownOutline, trashOutline, walletOutline
} from 'ionicons/icons';
import { ExpenseService } from '../../core/services/expense.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-accounts',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule,
    IonContent, IonIcon, IonBackButton, IonButtons,
    CurrencyPipe
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './accounts.component.html',
  styleUrls: ['./accounts.component.scss']
})
export class AccountsComponent {
  protected readonly accountService = inject(AccountService);
  protected readonly expenseService = inject(ExpenseService);
  private readonly notificationService = inject(NotificationService);

  readonly newName = signal('');
  readonly newType = signal<'bank' | 'cash' | 'wallet'>('bank');
  readonly newIdentifier = signal('');

  constructor() {
    addIcons({ chevronDownOutline, addCircle, trashOutline, walletOutline, business, card, wallet, create, trash, add });
  }

  getAccountIcon(type: string): string {
    switch (type) {
      case 'bank': return 'business';
      case 'cash': return 'card';
      case 'wallet': return 'wallet';
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
      balance: 0, // default starting balance
      sensitiveInfo: this.newIdentifier().trim() ? { accountIdentifier: this.newIdentifier().trim() } : undefined,
    });

    this.notificationService.success('Account added successfully');

    // Reset form
    this.newName.set('');
    this.newIdentifier.set('');
    this.newType.set('bank');
  }

  async deleteAccount(id: string): Promise<void> {
    if (confirm('Are you sure you want to delete this account? Expenses linked to this account will remain, but lose their account link.')) {
      await this.accountService.deleteAccount(id);
      this.notificationService.success('Account deleted');
    }
  }
}
