import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent, IonHeader, IonToolbar, IonTitle
} from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { CategoryService } from '../../core/services/category.service';
import { Category } from '../../core/models/category.model';

@Component({
  selector: 'app-categories',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule,
    IonContent, IonHeader, IonToolbar, IonTitle
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>
          <span class="toolbar-title">🏷️ Categories</span>
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <!-- Add New Category -->
      @if (isAdding()) {
        <div class="glass-card add-form animate-fade-in-up">
          <h3 class="form-title">New Category</h3>
          <div class="form-row">
            <div class="emoji-input-wrap">
              <input
                type="text"
                class="emoji-input"
                placeholder="😀"
                [value]="newEmoji()"
                (input)="newEmoji.set(getInputValue($event))"
                maxlength="4"
                id="new-emoji-input" />
            </div>
            <input
              type="text"
              class="label-input"
              placeholder="Category name"
              [value]="newLabel()"
              (input)="newLabel.set(getInputValue($event))"
              id="new-label-input" />
          </div>
          <div class="form-actions">
            <button class="btn btn--ghost" (click)="cancelAdd()">Cancel</button>
            <button class="btn btn--gradient" (click)="addCategory()" [disabled]="!canAdd()" id="add-category-btn">Add</button>
          </div>
        </div>
      } @else {
        <button class="add-category-btn animate-fade-in" (click)="isAdding.set(true)" id="show-add-btn">
          <span class="add-category-btn__icon">+</span>
          <span>Add Category</span>
        </button>
      }

      <!-- Category List -->
      <div class="category-list stagger-children">
        @for (cat of categoryService.categories(); track cat.id) {
          <div class="glass-card category-card">
            <div class="category-color-bar" [style.background]="cat.color"></div>
            <div class="category-row">
              <div class="category-emoji-wrap">
                <span class="emoji-icon">{{ cat.emoji }}</span>
              </div>
              <span class="category-label">{{ cat.label }}</span>
              <button class="delete-btn" (click)="deleteCategory(cat.id)" [attr.id]="'delete-' + cat.id">
                <span class="delete-icon">✕</span>
              </button>
            </div>
          </div>
        }
      </div>
    </ion-content>
  `,
  styles: [`
    .toolbar-title {
      font-weight: var(--font-weight-bold);
      font-size: var(--font-size-lg);
    }

    /* ── Add Button ── */
    .add-category-btn {
      width: 100%;
      padding: var(--spacing-md);
      border: 2px dashed var(--color-surface-alt);
      border-radius: var(--radius);
      background: transparent;
      color: var(--color-primary);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-bold);
      cursor: pointer;
      font-family: var(--font-family);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--spacing-sm);
      transition: all var(--transition-base);
      margin-bottom: var(--spacing-lg);
    }

    .add-category-btn:hover {
      border-color: var(--color-primary);
      background: rgba(var(--color-primary-rgb), 0.05);
    }

    .add-category-btn__icon {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: var(--gradient-primary);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      line-height: 1;
    }

    /* ── Add Form ── */
    .add-form {
      padding: var(--spacing-lg);
      margin-bottom: var(--spacing-lg);
    }

    .form-title {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-bold);
      color: var(--color-text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: var(--spacing-md);
    }

    .form-row {
      display: flex;
      gap: var(--spacing-sm);
      margin-bottom: var(--spacing-md);
    }

    .emoji-input-wrap {
      width: 56px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--color-surface-alt);
      border-radius: var(--radius-sm);
      overflow: hidden;
    }

    .emoji-input {
      width: 100%;
      height: 100%;
      padding: 0;
      text-align: center;
      font-size: var(--font-size-xl);
      border: none;
      background: transparent;
      outline: none;
    }

    .label-input {
      flex: 1;
      padding: var(--spacing-sm) var(--spacing-md);
      border: 1px solid var(--color-surface-alt);
      border-radius: var(--radius-sm);
      background: var(--color-surface);
      color: var(--color-text);
      font-size: var(--font-size-sm);
      font-family: var(--font-family);
      outline: none;
      transition: border-color var(--transition-fast);
    }

    .label-input:focus {
      border-color: var(--color-primary);
    }

    .form-actions {
      display: flex;
      gap: var(--spacing-sm);
      justify-content: flex-end;
    }

    .btn {
      padding: var(--spacing-sm) var(--spacing-lg);
      border: none;
      border-radius: var(--radius-full);
      font-weight: var(--font-weight-bold);
      font-size: var(--font-size-sm);
      cursor: pointer;
      font-family: var(--font-family);
      transition: all var(--transition-base);
    }

    .btn--gradient {
      background: var(--gradient-primary);
      color: white;
      box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.25);
    }

    .btn--gradient:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(var(--color-primary-rgb), 0.35);
    }

    .btn--gradient:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      transform: none;
    }

    .btn--ghost {
      background: var(--color-surface-alt);
      color: var(--color-text);
    }

    .btn--ghost:hover {
      background: var(--color-surface-alt);
      opacity: 0.8;
    }

    /* ── Category List ── */
    .category-list {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
    }

    .category-card {
      padding: 0;
      overflow: hidden;
      position: relative;
    }

    .category-color-bar {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 4px;
      border-radius: var(--radius) 0 0 var(--radius);
    }

    .category-row {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-md);
      padding-left: calc(var(--spacing-md) + 4px);
    }

    .category-emoji-wrap {
      width: 40px;
      height: 40px;
      border-radius: var(--radius-sm);
      background: var(--color-surface-alt);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .category-label {
      flex: 1;
      font-weight: var(--font-weight-semibold);
      color: var(--color-text);
      font-size: var(--font-size-sm);
    }

    .delete-btn {
      width: 32px;
      height: 32px;
      border: none;
      border-radius: 50%;
      background: transparent;
      color: var(--color-text-secondary);
      font-size: var(--font-size-sm);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all var(--transition-fast);
    }

    .delete-btn:hover {
      background: rgba(var(--color-danger-rgb), 0.1);
      color: var(--color-danger);
    }

    .delete-icon {
      font-size: 0.75rem;
    }
  `]
})
export class CategoriesComponent {
  protected readonly categoryService = inject(CategoryService);

  readonly isAdding = signal(false);
  readonly newEmoji = signal('');
  readonly newLabel = signal('');

  canAdd(): boolean {
    return this.newEmoji().trim().length > 0 && this.newLabel().trim().length > 0;
  }

  getInputValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  async addCategory(): Promise<void> {
    if (!this.canAdd()) return;
    const category: Category = {
      id: this.newLabel().toLowerCase().replace(/\s+/g, '-'),
      emoji: this.newEmoji().trim(),
      label: this.newLabel().trim(),
      color: '#78716c',
    };
    await this.categoryService.addCategory(category);
    this.newEmoji.set('');
    this.newLabel.set('');
    this.isAdding.set(false);
  }

  cancelAdd(): void {
    this.newEmoji.set('');
    this.newLabel.set('');
    this.isAdding.set(false);
  }

  async deleteCategory(id: string): Promise<void> {
    await this.categoryService.deleteCategory(id);
  }
}
