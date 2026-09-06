import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TagModule } from 'primeng/tag';
import { ProductService } from '../product.service';
import { Product } from '../product.model';
import { InrCurrencyPipe } from '../../../shared/pipes/inr-currency.pipe';
import { AuthService } from '../../../core/services/auth.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [
    ReactiveFormsModule, TableModule, ButtonModule, DialogModule,
    InputTextModule, InputNumberModule, ToggleSwitchModule, TagModule, InrCurrencyPipe
  ],
  templateUrl: './product-list.component.html',
  styleUrl: './product-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductListComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly errorHandler = inject(ErrorHandlerService);
  readonly productService = inject(ProductService);
  readonly auth = inject(AuthService);

  readonly dialogOpen = signal(false);
  readonly editing = signal<Product | null>(null);
  readonly submitting = signal(false);

  readonly form = this.fb.group({
    name: ['', Validators.required],
    unit: ['Liter', Validators.required],
    defaultRate: [0, [Validators.required, Validators.min(0.01)]],
    active: [true]
  });

  async ngOnInit(): Promise<void> {
    await this.reload();
  }

  private async reload(): Promise<void> {
    try {
      await this.productService.loadAll();
    } catch (err) {
      this.errorHandler.handle(err, 'Products');
    }
  }

  openCreate(): void {
    this.editing.set(null);
    this.form.reset({ name: '', unit: 'Liter', defaultRate: 0, active: true });
    this.dialogOpen.set(true);
  }

  openEdit(product: Product): void {
    this.editing.set(product);
    this.form.reset({
      name: product.name,
      unit: product.unit,
      defaultRate: product.defaultRate,
      active: product.active
    });
    this.dialogOpen.set(true);
  }

  async save(): Promise<void> {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    const value = this.form.getRawValue() as any;

    try {
      const editing = this.editing();
      if (editing) {
        await this.productService.update(editing.id, value);
      } else {
        await this.productService.create(value);
      }
      this.errorHandler.success(editing ? 'Product updated.' : 'Product added.');
      this.dialogOpen.set(false);
    } catch (err) {
      this.errorHandler.handle(err, 'Save Product');
    } finally {
      this.submitting.set(false);
    }
  }

  async toggleActive(product: Product): Promise<void> {
    try {
      await this.productService.setActive(product.id, !product.active);
    } catch (err) {
      this.errorHandler.handle(err, 'Update Product');
    }
  }
}
