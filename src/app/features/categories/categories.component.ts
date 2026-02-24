import { Component, ChangeDetectionStrategy, inject, signal, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent, IonIcon
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
    IonContent, IonIcon
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './categories.component.html',
  styleUrls: ['./categories.component.scss']
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
