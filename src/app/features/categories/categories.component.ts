import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonIcon
} from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { CategoryService } from '../../core/services/category.service';
import { Category } from '../../core/models/category.model';
import { addIcons } from 'ionicons';
import {
  pricetag, add, helpOutline, trashOutline, close,
  fastFood, car, cart, film, medkit, receipt, home, school, airplane, gift
} from 'ionicons/icons';

@Component({
  selector: 'app-categories',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule,
    IonContent, IonHeader, IonToolbar, IonTitle, IonIcon
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>
          <span class="toolbar-title">
            <ion-icon name="pricetag" style="vertical-align: middle; margin-right: 6px;"></ion-icon>
            Categories
          </span>
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <!-- Add New Category -->
      @if (isAdding()) {
        <div class="glass-card add-form animate-fade-in-up">
          <h3 class="form-title">New Category</h3>
          <div class="form-row">
            <div class="icon-input-wrap">
              <ion-icon [name]="newIcon() || 'help-outline'" class="preview-icon"></ion-icon>
            </div>
            <div class="input-group">
                <input
                  type="text"
                  class="label-input"
                  placeholder="Icon name (e.g. pizza)"
                  [value]="newIcon()"
                  (input)="newIcon.set(getInputValue($event))"
                  id="new-icon-input" />
                <input
                  type="text"
                  class="label-input"
                  placeholder="Category label"
                  [value]="newLabel()"
                  (input)="newLabel.set(getInputValue($event))"
                  id="new-label-input" />
            </div>
          </div>
          <div class="form-actions">
            <button class="btn btn--ghost" (click)="cancelAdd()">Cancel</button>
            <button class="btn btn--gradient" (click)="addCategory()" [disabled]="!canAdd()" id="add-category-btn">Add</button>
          </div>
        </div>
      } @else {
        <button class="add-category-btn animate-fade-in" (click)="isAdding.set(true)" id="show-add-btn">
          <div class="add-category-btn__icon">
            <ion-icon name="add"></ion-icon>
          </div>
          <span>Add Category</span>
        </button>
      }

      <!-- Category List -->
      <div class="category-list stagger-children">
        @for (cat of categoryService.categories(); track cat.id) {
          <div class="glass-card category-card">
            <div class="category-color-bar" [style.background]="cat.color"></div>
            <div class="category-row">
              <div class="category-icon-wrap">
                <ion-icon [name]="cat.icon" class="category-icon"></ion-icon>
              </div>
              <span class="category-label">{{ cat.name }}</span>
              <button class="delete-btn" (click)="deleteCategory(cat.id)" [attr.id]="'delete-' + cat.id">
                <ion-icon name="trash-outline" class="delete-icon-native"></ion-icon>
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

    .icon-input-wrap {
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--color-surface-alt);
      border-radius: var(--radius-sm);
    }

    .preview-icon {
        font-size: 1.5rem;
        color: var(--color-primary);
    }
    
    .input-group {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: var(--spacing-xs);
    }

    .label-input {
      width: 100%;
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

    .category-icon-wrap {
      width: 40px;
      height: 40px;
      border-radius: var(--radius-sm);
      background: var(--color-surface-alt);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .category-icon {
        font-size: 1.5rem;
        color: var(--color-primary);
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

  constructor() {
    addIcons({
      pricetag, add, helpOutline, trashOutline, close,
      fastFood, car, cart, film, medkit, receipt, home, school, airplane, gift
    });
  }

  readonly isAdding = signal(false);
  readonly newIcon = signal('');
  readonly newLabel = signal('');

  canAdd(): boolean {
    return this.newIcon().trim().length > 0 && this.newLabel().trim().length > 0;
  }

  getInputValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  async addCategory(): Promise<void> {
    if (!this.canAdd()) return;
    const category: Category = {
      id: this.newLabel().toLowerCase().replace(/\s+/g, '-'),
      icon: this.newIcon().trim(),
      name: this.newLabel().trim(),
      color: '#78716c',
      type: 'expense',
      isSystem: false
    };
    await this.categoryService.addCategory(category);
    this.newIcon.set('');
    this.newLabel.set('');
    this.isAdding.set(false);
  }

  cancelAdd(): void {
    this.newIcon.set('');
    this.newLabel.set('');
    this.isAdding.set(false);
  }

  async deleteCategory(id: string): Promise<void> {
    await this.categoryService.deleteCategory(id);
  }
}
