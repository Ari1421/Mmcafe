import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { PurchaseService } from '../purchase.service';
import { DealerService } from '../../dealers/dealer.service';
import { ProductService } from '../../products/product.service';
import { PurchasePaymentType } from '../../../core/models/enums';
import { AuthService } from '../../../core/services/auth.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { InrCurrencyPipe } from '../../../shared/pipes/inr-currency.pipe';

@Component({
  selector: 'app-purchase-form',
  standalone: true,
  imports: [
    ReactiveFormsModule, InrCurrencyPipe, ButtonModule, SelectModule, DatePickerModule,
    InputNumberModule, TextareaModule
  ],
  templateUrl: './purchase-form.component.html',
  styleUrl: './purchase-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PurchaseFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly errorHandler = inject(ErrorHandlerService);
  readonly purchaseService = inject(PurchaseService);
  readonly dealerService = inject(DealerService);
  readonly productService = inject(ProductService);
  readonly auth = inject(AuthService);

  readonly submitting = signal(false);
  readonly rateLoading = signal(false);
  readonly editingId = signal<string | null>(null);

  readonly paymentTypeOptions = [
    { label: 'Credit', value: 'credit' as PurchasePaymentType },
    { label: 'Cash', value: 'cash' as PurchasePaymentType },
    { label: 'Online', value: 'online' as PurchasePaymentType }
  ];

  readonly form = this.fb.group({
    purchaseDate: [new Date(), Validators.required],
    dealerId: ['', Validators.required],
    productId: ['', Validators.required],
    quantity: [0, [Validators.required, Validators.min(0.001)]],
    unit: ['Liter'],
    rate: [{ value: 0, disabled: !this.auth.isAdmin() }, [Validators.required, Validators.min(0.01)]],
    paymentType: ['credit' as PurchasePaymentType, Validators.required],
    notes: ['']
  });

  async ngOnInit(): Promise<void> {
    await Promise.all([this.dealerService.loadAll(), this.productService.loadAll()]);

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editingId.set(id);
      if (this.purchaseService.purchases().length === 0) {
        await this.purchaseService.load();
      }
      const existing = this.purchaseService.purchases().find((p) => p.id === id);
      if (existing) {
        this.form.patchValue({
          purchaseDate: new Date(existing.purchaseDate),
          dealerId: existing.dealerId,
          productId: existing.productId,
          quantity: existing.quantity,
          unit: existing.unit,
          rate: existing.rate,
          paymentType: existing.paymentType,
          notes: existing.notes ?? ''
        });
      }
    }

    this.form.controls.dealerId.valueChanges.subscribe(() => this.refreshRate());
    this.form.controls.productId.valueChanges.subscribe(() => this.refreshRate());
  }

  private async refreshRate(): Promise<void> {
    const { dealerId, productId, purchaseDate } = this.form.getRawValue();
    if (!dealerId || !productId) return;

    this.rateLoading.set(true);
    try {
      const rate = await this.dealerService.getApplicableRate(
        dealerId,
        productId,
        toIsoDate(purchaseDate ?? new Date())
      );
      if (rate !== null) {
        this.form.controls.rate.setValue(rate);
      }
      const product = this.productService.products().find((p) => p.id === productId);
      if (product) {
        this.form.controls.unit.setValue(product.unit);
      }
    } catch (err) {
      this.errorHandler.handle(err, 'Rate Lookup');
    } finally {
      this.rateLoading.set(false);
    }
  }

  currentTotal(): number {
    const { quantity, rate } = this.form.getRawValue();
    return (quantity ?? 0) * (rate ?? 0);
  }

  async save(): Promise<void> {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    const raw = this.form.getRawValue();
    const value = {
      purchaseDate: toIsoDate(raw.purchaseDate!),
      dealerId: raw.dealerId!,
      productId: raw.productId!,
      quantity: raw.quantity!,
      unit: raw.unit!,
      rate: raw.rate!,
      paymentType: raw.paymentType!,
      notes: raw.notes
    };

    try {
      const id = this.editingId();
      if (id) {
        await this.purchaseService.update(id, value);
        this.errorHandler.success('Purchase updated.');
      } else {
        await this.purchaseService.create(value);
        this.errorHandler.success('Purchase recorded.');
      }
      await this.router.navigate(['/purchases']);
    } catch (err) {
      this.errorHandler.handle(err, 'Save Purchase');
    } finally {
      this.submitting.set(false);
    }
  }

  cancel(): void {
    this.router.navigate(['/purchases']);
  }
}

function toIsoDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
