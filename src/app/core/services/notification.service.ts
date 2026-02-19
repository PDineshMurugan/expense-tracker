import { Injectable, signal } from '@angular/core';

export interface AppNotification {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    timeout: number;
    createdAt: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
    private _notifications = signal<AppNotification[]>([]);
    readonly notifications = this._notifications.asReadonly();

    success(message: string, timeout = 4000): void {
        this.addNotification('success', message, timeout);
    }

    error(message: string, timeout = 5000): void {
        this.addNotification('error', message, timeout);
    }

    warning(message: string, timeout = 4500): void {
        this.addNotification('warning', message, timeout);
    }

    info(message: string, timeout = 3500): void {
        this.addNotification('info', message, timeout);
    }

    dismiss(id: string): void {
        this._notifications.update(list => list.filter(n => n.id !== id));
    }

    private addNotification(type: AppNotification['type'], message: string, timeout: number): void {
        const notification: AppNotification = {
            id: crypto.randomUUID(),
            type,
            message,
            timeout,
            createdAt: Date.now(),
        };

        this._notifications.update(list => [...list, notification]);

        // Auto-dismiss after timeout
        setTimeout(() => {
            this.dismiss(notification.id);
        }, timeout);
    }
}
