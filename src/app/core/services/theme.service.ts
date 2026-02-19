import { Injectable, signal } from '@angular/core';
import { StorageService } from './storage.service';
import { DEFAULT_SETTINGS } from '../models/settings.model';

@Injectable({ providedIn: 'root' })
export class ThemeService {
    private _isDark = signal<boolean>(DEFAULT_SETTINGS.darkMode);

    readonly isDark = this._isDark.asReadonly();

    constructor(private storage: StorageService) {
        this.loadTheme();
    }

    private async loadTheme(): Promise<void> {
        const darkMode = await this.storage.getSetting<boolean>('darkMode');
        if (darkMode !== undefined) {
            this._isDark.set(darkMode);
            this.applyTheme(darkMode);
        }
    }

    async toggleDarkMode(): Promise<void> {
        const newValue = !this._isDark();
        this._isDark.set(newValue);
        this.applyTheme(newValue);
        await this.storage.putSetting('darkMode', newValue);
    }

    private applyTheme(isDark: boolean): void {
        document.body.classList.toggle('dark', isDark);
    }
}
