import { Component, ChangeDetectionStrategy, inject, signal, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  IonContent, IonIcon
} from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { BudgetService } from '../../core/services/budget.service';
import { ThemeService } from '../../core/services/theme.service';
import { StorageService } from '../../core/services/storage.service';
import { SmsService } from '../../core/services/sms.service';
import { NotificationReaderService } from '../../core/services/notification-reader.service';
import { NotificationService } from '../../core/services/notification.service';
import { CurrencyPipe } from '../../shared/pipes/currency.pipe';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { addIcons } from 'ionicons';
import {
  cash, phonePortrait, notifications, colorPalette, moon,
  briefcase, cloudDownload, informationCircle, search, arrowForward,
  wallet, settings, card, pricetag
} from 'ionicons/icons';

@Component({
  selector: 'app-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule, RouterModule,
    IonContent,
    CurrencyPipe, IonIcon
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent {
  protected readonly budgetService = inject(BudgetService);
  protected readonly themeService = inject(ThemeService);
  protected readonly smsService = inject(SmsService);
  protected readonly notificationReaderService = inject(NotificationReaderService);
  private readonly notificationService = inject(NotificationService);
  private readonly storageService = inject(StorageService);

  readonly budgetInput = signal<number>(0);

  constructor() {
    addIcons({
      cash, phonePortrait, notifications, colorPalette, moon,
      briefcase, cloudDownload, informationCircle, search, arrowForward,
      wallet, settings, card, pricetag
    });

    const currentBudget = this.budgetService.monthlyBudget();
    if (currentBudget > 0) {
      this.budgetInput.set(currentBudget);
    }
  }

  onBudgetInput(event: Event): void {
    const val = parseFloat((event.target as HTMLInputElement).value) || 0;
    this.budgetInput.set(val);
  }

  async saveBudget(): Promise<void> {
    await this.budgetService.setBudget(this.budgetInput());
    this.notificationService.success('Budget saved successfully!');
  }

  async toggleSms(): Promise<void> {
    await this.smsService.toggleSmsEnabled();
  }

  async scanSms(): Promise<void> {
    await this.smsService.scanSms();
  }

  formatScanTime(date: Date): string {
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }

  async exportDataJson(): Promise<void> {
    const data = await this.storageService.exportAll();
    const jsonStr = JSON.stringify(data, null, 2);
    const fileName = `expense-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
    await this.downloadOrShare(jsonStr, fileName, 'application/json');
  }

  async exportDataCsv(): Promise<void> {
    const data = await this.storageService.exportAll();
    const expenses: any[] = data.expenses || [];
    if (expenses.length === 0) {
      this.notificationService.success('No data to export.');
      return;
    }

    // Sort expenses by date descending
    expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const headers = ['Date', 'Amount', 'Type', 'Category', 'Account', 'Notes'];
    const rows = expenses.map(e => [
      e.date,
      e.amount,
      e.type,
      e.categoryId,
      e.accountId,
      `"${(e.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\\n');
    const fileName = `expense-tracker-backup-${new Date().toISOString().split('T')[0]}.csv`;
    await this.downloadOrShare(csvContent, fileName, 'text/csv');
  }

  private async downloadOrShare(content: string, fileName: string, mimeType: string): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      try {
        const result = await Filesystem.writeFile({
          path: fileName,
          data: content,
          directory: Directory.Cache,
          encoding: Encoding.UTF8
        });

        await Share.share({
          title: 'Exported Data',
          text: 'Here is your expense tracker backup.',
          url: result.uri,
          dialogTitle: 'Share or Save Data'
        });
        this.notificationService.success('Data exported successfully!');
      } catch (err) {
        console.error('Export failed', err);
        this.notificationService.error('Failed to export data');
      }
    } else {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      this.notificationService.success('Data exported successfully!');
    }
  }
}
