import { Injectable, signal } from '@angular/core';
import { StorageService } from './storage.service';
import { Category, DEFAULT_CATEGORIES } from '../models/category.model';

@Injectable({ providedIn: 'root' })
export class CategoryService {
    private _categories = signal<Category[]>([]);

    readonly categories = this._categories.asReadonly();

    constructor(private storage: StorageService) {
        this.loadCategories();
    }

    private async loadCategories(): Promise<void> {
        let categories = await this.storage.getAllCategories();

        // Seed defaults if empty
        if (categories.length === 0) {
            for (const cat of DEFAULT_CATEGORIES) {
                await this.storage.putCategory(cat);
            }
            categories = DEFAULT_CATEGORIES;
        }

        this._categories.set(categories);
    }

    async addCategory(category: Category): Promise<void> {
        await this.storage.putCategory(category);
        this._categories.update(list => [...list, category]);
    }

    async updateCategory(category: Category): Promise<void> {
        await this.storage.putCategory(category);
        this._categories.update(list =>
            list.map(c => c.id === category.id ? category : c)
        );
    }

    async deleteCategory(id: string): Promise<void> {
        await this.storage.deleteCategory(id);
        this._categories.update(list => list.filter(c => c.id !== id));
    }

    getCategoryByIcon(icon: string): Category | undefined {
        return this._categories().find(c => c.icon === icon);
    }
}
