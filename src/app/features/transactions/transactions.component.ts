import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { computed } from '@angular/core';
import {
    IonContent, IonIcon, IonRefresher, IonRefresherContent, IonSkeletonText,
    IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton
} from '@ionic/angular/standalone';
import { ExpenseService } from '../../core/services/expense.service';
import { CategoryService } from '../../core/services/category.service';
import { Expense } from '../../core/models/expense.model';
import { CurrencyPipe } from '@angular/common';
import { SmsService } from '../../core/services/sms.service';
import { NotificationReaderService } from '../../core/services/notification-reader.service';
import { AccountService } from '../../core/services/account.service';
import { addIcons } from 'ionicons';
import * as allIcons from 'ionicons/icons';

@Component({
    selector: 'app-transactions',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule, RouterModule,
        IonContent, IonIcon, IonRefresher, IonRefresherContent, IonSkeletonText, IonBackButton, IonButtons,
        CurrencyPipe
    ],
    templateUrl: './transactions.component.html',
    styleUrls: ['./transactions.component.scss']
})
export class TransactionsComponent implements OnInit {
    protected readonly expenseService = inject(ExpenseService);
    protected readonly categoryService = inject(CategoryService);
    protected readonly accountService = inject(AccountService);
    private readonly smsService = inject(SmsService);
    private readonly notificationReaderService = inject(NotificationReaderService);
    private readonly router = inject(Router);

    readonly allTransactions = signal<any[]>([]);
    readonly isLoaded = signal<boolean>(false);

    readonly topMerchants = computed(() => {
        const txs = this.allTransactions();
        if (txs.length === 0) return [];

        const map = new Map<string, { name: string, total: number, count: number }>();

        for (const tx of txs) {
            // Only count debits towards spend
            if (tx.type === 'debit' && tx.amount > 0 && tx.categoryId !== 'transfer') {
                // Use merchantName or fallback to description/category
                const merchant = tx.merchantName || tx.description || this.getCategoryName(tx.categoryId);
                if (merchant && merchant !== 'Unknown') {
                    const key = merchant.toLowerCase();
                    const existing = map.get(key) || { name: merchant, total: 0, count: 0 };
                    existing.total += parseFloat(tx.amount);
                    existing.count += 1;
                    map.set(key, existing);
                }
            }
        }

        return Array.from(map.values())
            .sort((a, b) => b.total - a.total)
            .slice(0, 5); // Top 5
    });

    readonly detectedBanks = computed(() => {
        const smsExp = this.smsService.smsExpenses();
        if (!smsExp || smsExp.length === 0) return [];

        const existingAccounts = this.accountService.accounts().map(a => a.name.toLowerCase());
        const bankMap = new Map<string, { name: string, count: number, totalAmount: number, accIdentifier?: string }>();

        for (const e of smsExp) {
            const sender = e.sender || e.bank;
            if (sender && sender !== 'Unknown') {
                const isBankRelated = /bank|hdfc|sbi|icici|axis|kotak|pnb|paytm|idfc/i.test(sender);
                if (isBankRelated) {
                    let normalized = sender.toUpperCase().replace(/.*-/, '').replace(' BANK', '').replace(' LTD', '').trim(); // Clean prefixes

                    if (!existingAccounts.find(ea => normalized.toLowerCase().includes(ea) || ea.includes(normalized.toLowerCase()))) {
                        if (!bankMap.has(normalized)) {
                            bankMap.set(normalized, {
                                name: normalized,
                                count: 1,
                                totalAmount: (e.type === 'debit' && e.amount > 0 && e.userCategory !== 'transfer' && !e.isTransfer) ? parseFloat(e.amount as any) : 0,
                                accIdentifier: e.accountIdentifier
                            });
                        } else {
                            const existing = bankMap.get(normalized)!;
                            existing.count++;
                            if (e.type === 'debit' && e.amount > 0 && e.userCategory !== 'transfer' && !e.isTransfer) {
                                existing.totalAmount += parseFloat(e.amount as any);
                            }
                            if (!existing.accIdentifier && e.accountIdentifier) existing.accIdentifier = e.accountIdentifier;
                        }
                    }
                }
            }
        }

        return Array.from(bankMap.values()).sort((a, b) => b.count - a.count);
    });

    constructor() {
        addIcons(allIcons);
    }

    ngOnInit() {
        this.loadData();
    }

    async loadData() {
        this.isLoaded.set(false);
        // Load native expenses
        const expenses = await this.expenseService.getExpenses({ limit: 500, offset: 0 });

        // Merge SMS and notifications
        const sms = this.smsService.smsExpenses();
        const notifs = this.notificationReaderService.detectedTransactions();

        const combined = [...expenses, ...sms, ...notifs].sort((a, b) => {
            const dateA = a.date instanceof Date ? a.date.getTime() : new Date(a.date).getTime();
            const dateB = b.date instanceof Date ? b.date.getTime() : new Date(b.date).getTime();
            return dateB - dateA;
        });

        this.allTransactions.set(combined);
        this.isLoaded.set(true);
    }

    async handleRefresh(event: any) {
        await this.loadData();
        event.target.complete();
    }

    getCategoryIcon(categoryId: string): string {
        const cat = this.categoryService.categories().find(c => c.id === categoryId);
        return cat?.icon || 'help-outline';
    }

    getCategoryName(categoryId: string): string {
        const cat = this.categoryService.categories().find(c => c.id === categoryId);
        return cat?.name || 'Unknown';
    }

    getCategoryColorClass(categoryId: string): string {
        const colorMap: Record<string, string> = {
            food: 'icon-orange', shopping: 'icon-pink', transport: 'icon-blue',
            entertainment: 'icon-purple', health: 'icon-red', default: 'icon-default'
        };
        return colorMap[categoryId] || colorMap['default'];
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
        if (tx.originalBody) { // It's from SMS/Notification
            this.router.navigate(['/tabs/add'], { state: { smsInterop: tx } });
        } else {
            this.router.navigate(['/tabs/add'], {
                queryParams: { id: tx.id }
            });
        }
    }

    async addDetectedBank(bankName: string) {
        await this.accountService.addAccount({
            name: bankName,
            type: 'bank',
            balance: 0
        });
        // We don't need to expressly call loadData() because accountService.accounts() is a signal, 
        // the generic computed properties should auto-update.
    }
}
