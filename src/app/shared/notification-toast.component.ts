import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../core/services/notification.service';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmarkCircle, closeCircle, alertCircle, informationCircle, notifications, close } from 'ionicons/icons';

@Component({
  selector: 'app-notification-toast',
  standalone: true,
  imports: [CommonModule, IonIcon],
  template: `
    <div class="toast-container">
      @for (notification of notificationService.notifications(); track notification.id) {
        <div class="toast-item toast-item--{{ notification.type }}" [attr.id]="'toast-' + notification.id">
          <ion-icon [name]="getIcon(notification.type)" class="toast-icon-native"></ion-icon>
          <span class="toast-message">{{ notification.message }}</span>
          <button class="toast-dismiss" (click)="notificationService.dismiss(notification.id)">
            <ion-icon name="close"></ion-icon>
          </button>
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
    .toast-icon-native {
      font-size: 1.25rem;
      flex-shrink: 0;
    }
    .toast-item--success .toast-icon-native { color: var(--color-accent); }
    .toast-item--error .toast-icon-native { color: var(--color-danger); }
    .toast-item--warning .toast-icon-native { color: var(--color-warning); }
    .toast-item--info .toast-icon-native { color: var(--color-info); }
  `]
})
export class NotificationToastComponent {
  protected readonly notificationService = inject(NotificationService);

  constructor() {
    addIcons({ checkmarkCircle, closeCircle, alertCircle, informationCircle, notifications, close });
  }

  getIcon(type: string): string {
    switch (type) {
      case 'success': return 'checkmark-circle';
      case 'error': return 'close-circle';
      case 'warning': return 'alert-circle';
      case 'info': return 'information-circle';
      default: return 'notifications';
    }
  }
}
