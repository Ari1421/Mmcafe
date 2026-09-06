import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { SalesService } from '../sales.service';
import { InrCurrencyPipe } from '../../../shared/pipes/inr-currency.pipe';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';

function atLeastOnePositive(control: AbstractControl): ValidationErrors | null {
  const cash = control.get('cashAmount')?.value ?? 0;
  const online = control.get('onlineAmount')?.value ?? 0;
  return cash > 0 || online > 0 ? null : { atLeastOne: true };
}

@Component({
  selector: 'app-sales-form',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, DatePickerModule, InputNumberModule, TextareaModule, InrCurrencyPipe],
  templateUrl: './sales-form.component.html',
  styleUrl: './sales-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SalesFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly errorHandler = inject(ErrorHandlerService);
  private readonly salesService = inject(SalesService);

  readonly submitting = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly checkingDate = signal(false);

  readonly form = this.fb.group(
    {
      saleDate: [new Date(), Validators.required],
      cashAmount: [0, [Validators.min(0)]],
      onlineAmount: [0, [Validators.min(0)]],
      notes: ['']
    },
    { validators: atLeastOnePositive }
  );

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editingId.set(id);
      await this.salesService.load();
      const existing = this.salesService.sales().find((s) => s.id === id);
      if (existing) {
        this.form.patchValue({
          saleDate: new Date(existing.saleDate),
          cashAmount: existing.cashAmount,
          onlineAmount: existing.onlineAmount,
          notes: existing.notes ?? ''
        });
      }
    } else {
      // New entry: watch date changes and redirect to edit if a summary already exists.
      this.form.controls.saleDate.valueChanges.subscribe((d) => this.checkExisting(d));
    }
  }

  private async checkExisting(date: Date | null): Promise<void> {
    if (!date) return;
    this.checkingDate.set(true);
    try {
      const existing = await this.salesService.findByDate(toIsoDate(date));
      if (existing) {
        this.errorHandler.success('A sales entry already exists for this date — opening it for editing.', 'Existing Entry Found');
        await this.router.navigate(['/sales', existing.id, 'edit'], { replaceUrl: true });
      }
    } catch (err) {
      this.errorHandler.handle(err, 'Check Existing Sale');
    } finally {
      this.checkingDate.set(false);
    }
  }

  currentTotal(): number {
    const { cashAmount, onlineAmount } = this.form.getRawValue();
    return (cashAmount ?? 0) + (onlineAmount ?? 0);
  }

  async save(): Promise<void> {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    const raw = this.form.getRawValue();
    const value = {
      saleDate: toIsoDate(raw.saleDate!),
      cashAmount: raw.cashAmount ?? 0,
      onlineAmount: raw.onlineAmount ?? 0,
      notes: raw.notes
    };

    try {
      const id = this.editingId();
      if (id) {
        await this.salesService.update(id, value);
        this.errorHandler.success('Sales entry updated.');
      } else {
        await this.salesService.create(value);
        this.errorHandler.success('Sales entry recorded.');
      }
      await this.router.navigate(['/sales']);
    } catch (err) {
      this.errorHandler.handle(err, 'Save Sales Entry');
    } finally {
      this.submitting.set(false);
    }
  }

  cancel(): void {
    this.router.navigate(['/sales']);
  }
}

function toIsoDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
