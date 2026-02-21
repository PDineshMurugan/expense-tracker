import { Injectable, signal } from '@angular/core';
import { StorageService } from '../storage/storage.service';
import { Category, DEFAULT_CATEGORIES } from '../models/category.model';

@Injectable({ providedIn: 'root' })
export class CategoryService {
    private _categories = signal<Category[]>([]);
    readonly categories = this._categories.asReadonly();

    constructor(private storage: StorageService) {
        this.loadCategories();
    }

    async loadCategories(): Promise<void> {
        const db = await this.storage.ready();
        let categories = await db.getAll('categories');

        if (categories.length === 0) {
            const tx = db.transaction('categories', 'readwrite');
            const store = tx.objectStore('categories');
            for (const cat of DEFAULT_CATEGORIES) {
                await store.put(cat);
            }
            await tx.done;
            categories = [...DEFAULT_CATEGORIES];
        }

        this._categories.set(categories);
    }

    async addCategory(category: Category): Promise<void> {
        const db = await this.storage.ready();
        await db.put('categories', category);
        await this.loadCategories();
    }

    async updateCategory(category: Category): Promise<void> {
        const db = await this.storage.ready();
        await db.put('categories', category);
        await this.loadCategories();
    }

    async deleteCategory(id: string): Promise<void> {
        const db = await this.storage.ready();
        const cat = await db.get('categories', id);
        if (cat?.isSystem) {
            throw new Error('Cannot delete system category');
        }
        await db.delete('categories', id);
        await this.loadCategories();
    }
}
