import { Component, ChangeDetectionStrategy, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonBackButton, IonButtons, IonIcon, IonRefresher, IonRefresherContent } from '@ionic/angular/standalone';
import { AccountService } from '../../core/services/account.service';
import { ExpenseService } from '../../core/services/expense.service';
import { SmsService } from '../../core/services/sms.service';
import { CategoryService } from '../../core/services/category.service';
import { CurrencyPipe } from '../../shared/pipes/currency.pipe';
import { addIcons } from 'ionicons';
import * as allIcons from 'ionicons/icons';

@Component({
    selector: 'app-account-details',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule, RouterModule,
        IonContent, IonBackButton, IonButtons, IonIcon, IonRefresher, IonRefresherContent,
        CurrencyPipe
    ],
    templateUrl: './account-details.component.html',
    styleUrls: ['./account-details.component.scss']
})
export class AccountDetailsComponent {
    private readonly accountService = inject(AccountService);
    private readonly expenseService = inject(ExpenseService);
    private readonly smsService = inject(SmsService);
    private readonly categoryService = inject(CategoryService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);

    readonly accountId = computed(() => this.route.snapshot.paramMap.get('id') || '');

    readonly account = computed(() => {
        return this.accountService.accounts().find(a => a.id === this.accountId());
    });

    // Track natively added expenses for this account
    readonly nativeExpenses = signal<any[]>([]);

    readonly allTransactions = computed(() => {
        // 1. Get native expenses for this account
        const native = this.nativeExpenses();

        // 2. Get SMS expenses matching this account
        // (Using the account identifier or matching by sender name)
        const accountItem = this.account();
        const accountName = accountItem?.name.toLowerCase() || '';
        const accountIdentifier = accountItem?.accountIdentifier || '';

        const smsAll = this.smsService.smsExpenses();
        const smsMatches = smsAll.filter(sms => {
            if (sms.accountId && sms.accountId === this.accountId()) return true;
            if (accountIdentifier && sms.accountIdentifier && sms.accountIdentifier.endsWith(accountIdentifier)) return true;

            const sender = (sms.sender || sms.bank || '').toLowerCase();
            if (sender && accountName) {
                return sender.includes(accountName) || accountName.includes(sender);
            }
            return false;
        });

        const combined = [...native, ...smsMatches].sort((a, b) => {
            const da = a.date instanceof Date ? a.date : new Date(a.date);
            const db = b.date instanceof Date ? b.date : new Date(b.date);
            return db.getTime() - da.getTime();
        });

        return combined;
    });

    readonly totalSpend = computed(() => {
        // Calculate total DEBIT (money spent) for this specific account
        const txns = this.allTransactions();
        return txns.reduce((sum, tx) => {
            if (tx.type === 'debit' && tx.amount > 0 && tx.categoryId !== 'transfer') {
                return sum + parseFloat(tx.amount);
            }
            return sum;
        }, 0);
    });

    constructor() {
        addIcons(allIcons);
        this.loadNativeExpenses();
    }

    async loadNativeExpenses() {
        const id = this.accountId();
        if (!id) return;

        // Load historical data for the tab
        const expenses = await this.expenseService.getExpenses({ limit: 1000, offset: 0 });
        const filtered = expenses.filter(e => e.accountId === id);
        this.nativeExpenses.set(filtered);
    }

    async handleRefresh(event: any) {
        await this.loadNativeExpenses();
        event.target.complete();
    }

    getTxTypeClass(tx: any): string {
        if (tx.categoryId === 'transfer' || tx.type === 'transfer') return 'tx-type-transfer';
        if (tx.type === 'credit' || tx.type === 'income') return 'tx-type-income';
        return 'tx-type-debit';
    }

    getTxTypeIcon(tx: any): string {
        if (tx.categoryId === 'transfer' || tx.type === 'transfer') return 'swap-horizontal';
        if (tx.type === 'credit' || tx.type === 'income') return 'arrow-down-outline';
        return 'arrow-up-outline';
    }

    getCategoryIcon(categoryId: string): string {
        const cat = this.categoryService.categories().find(c => c.id === categoryId);
        return cat?.icon || 'help-outline';
    }

    getCategoryColorClass(categoryId: string): string {
        const colorMap: Record<string, string> = {
            food: 'icon-orange', shopping: 'icon-pink', transport: 'icon-blue',
            entertainment: 'icon-purple', health: 'icon-red', default: 'icon-default'
        };
        return colorMap[categoryId] || colorMap['default'];
    }

    formatRelativeDetailed(date: any): string {
        if (!date) return '';
        const d = date instanceof Date ? date : new Date(date);
        if (isNaN(d.getTime())) return '';

        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    editTransaction(tx: any) {
        if (tx.originalBody) {
            this.router.navigate(['/tabs/add'], { state: { smsInterop: tx } });
        } else {
            this.router.navigate(['/tabs/add'], { queryParams: { id: tx.id } });
        }
    }

    getAccountTheme(accountName: string): string {
        const name = accountName.toLowerCase();
        if (name.includes('hdfc') || name.includes('sbi')) return 'theme-blue';
        if (name.includes('icici') || name.includes('axis')) return 'theme-dark';
        return 'theme-gradient';
    }
}
