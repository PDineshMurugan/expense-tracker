import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../core/services/notification.service';

@Component({
    selector: 'app-notification-toast',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="toast-container">
      @for (notification of notificationService.notifications(); track notification.id) {
        <div class="toast-item toast-item--{{ notification.type }}" [attr.id]="'toast-' + notification.id">
          <span class="toast-icon">{{ getIcon(notification.type) }}</span>
          <span class="toast-message">{{ notification.message }}</span>
          <button class="toast-dismiss" (click)="notificationService.dismiss(notification.id)">✕</button>
        </div>
      }
    </div>
  `,
    styles: [`
    :host {
      display: block;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 99999;
      pointer-events: none;
    }
  `]
})
export class NotificationToastComponent {
    protected readonly notificationService = inject(NotificationService);

    getIcon(type: string): string {
        switch (type) {
            case 'success': return '✅';
            case 'error': return '❌';
            case 'warning': return '⚠️';
            case 'info': return 'ℹ️';
            default: return '📣';
        }
    }
}
