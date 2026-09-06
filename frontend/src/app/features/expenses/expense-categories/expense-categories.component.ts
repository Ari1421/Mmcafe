import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { ExpenseCategoryService } from '../expense-category.service';
import { ExpenseCategory } from '../expense-category.model';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';

@Component({
  selector: 'app-expense-categories',
  standalone: true,
  imports: [ReactiveFormsModule, TableModule, ButtonModule, DialogModule, InputTextModule, TagModule],
  templateUrl: './expense-categories.component.html',
  styleUrl: './expense-categories.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExpenseCategoriesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly errorHandler = inject(ErrorHandlerService);
  readonly categoryService = inject(ExpenseCategoryService);

  readonly dialogOpen = signal(false);
  readonly editing = signal<ExpenseCategory | null>(null);
  readonly submitting = signal(false);

  readonly form = this.fb.group({
    name: ['', Validators.required]
  });

  async ngOnInit(): Promise<void> {
    try {
      await this.categoryService.loadAll();
    } catch (err) {
      this.errorHandler.handle(err, 'Expense Categories');
    }
  }

  openCreate(): void {
    this.editing.set(null);
    this.form.reset({ name: '' });
    this.dialogOpen.set(true);
  }

  openEdit(category: ExpenseCategory): void {
    this.editing.set(category);
    this.form.reset({ name: category.name });
    this.dialogOpen.set(true);
  }

  async save(): Promise<void> {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    const { name } = this.form.getRawValue();

    try {
      const editing = this.editing();
      if (editing) {
        await this.categoryService.rename(editing.id, name!);
      } else {
        await this.categoryService.create(name!);
      }
      this.errorHandler.success(editing ? 'Category updated.' : 'Category added.');
      this.dialogOpen.set(false);
    } catch (err) {
      this.errorHandler.handle(err, 'Save Category');
    } finally {
      this.submitting.set(false);
    }
  }

  async toggleActive(category: ExpenseCategory): Promise<void> {
    try {
      await this.categoryService.setActive(category.id, !category.active);
    } catch (err) {
      this.errorHandler.handle(err, 'Update Category');
    }
  }
}
