import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { TagModule } from 'primeng/tag';
import { StaffService } from '../staff.service';
import { StaffAdvanceService } from '../staff-advance.service';
import { Staff } from '../staff.model';
import { StaffAdvance } from '../staff-advance.model';
import { PaymentMode } from '../../../core/models/enums';
import { InrCurrencyPipe } from '../../../shared/pipes/inr-currency.pipe';
import { IndiaDatePipe } from '../../../shared/pipes/india-date.pipe';
import { AuthService } from '../../../core/services/auth.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';

@Component({
  selector: 'app-staff-details',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterLink, TableModule, ButtonModule, DialogModule,
    InputNumberModule, SelectModule, DatePickerModule, TagModule, InrCurrencyPipe, IndiaDatePipe
  ],
  templateUrl: './staff-details.component.html',
  styleUrl: './staff-details.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StaffDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly errorHandler = inject(ErrorHandlerService);
  private readonly staffService = inject(StaffService);
  private readonly advanceService = inject(StaffAdvanceService);
  readonly auth = inject(AuthService);

  readonly staff = signal<Staff | null>(null);
  readonly advances = signal<StaffAdvance[]>([]);
  readonly loading = signal(false);
  readonly dialogOpen = signal(false);
  readonly submitting = signal(false);

  readonly paymentModeOptions = [
    { label: 'Cash', value: 'cash' as PaymentMode },
    { label: 'Online', value: 'online' as PaymentMode }
  ];

  readonly form = this.fb.group({
    advanceDate: [new Date(), Validators.required],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    paymentMode: ['cash' as PaymentMode, Validators.required],
    notes: ['']
  });

  private staffId!: string;

  async ngOnInit(): Promise<void> {
    this.staffId = this.route.snapshot.paramMap.get('id')!;
    await this.reload();
  }

  private async reload(): Promise<void> {
    this.loading.set(true);
    try {
      // Independent lookups — fetch both at once instead of one after
      // the other.
      const [staff, advances] = await Promise.all([
        this.staffService.getById(this.staffId),
        this.advanceService.getForStaff(this.staffId)
      ]);
      this.staff.set(staff);
      this.advances.set(advances);
    } catch (err) {
      this.errorHandler.handle(err, 'Staff Details');
    } finally {
      this.loading.set(false);
    }
  }

  get totalAdvances(): number {
    return this.advances().reduce((sum, a) => sum + a.amount, 0);
  }

  openAddAdvance(): void {
    this.form.reset({ advanceDate: new Date(), amount: 0, paymentMode: 'cash', notes: '' });
    this.dialogOpen.set(true);
  }

  async saveAdvance(): Promise<void> {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    const value = this.form.getRawValue();
    try {
      await this.advanceService.add({
        staffId: this.staffId,
        advanceDate: toIsoDate(value.advanceDate!),
        amount: value.amount!,
        paymentMode: value.paymentMode!,
        notes: value.notes
      });
      this.errorHandler.success('Advance recorded.');
      this.dialogOpen.set(false);
      await this.reload();
    } catch (err) {
      this.errorHandler.handle(err, 'Record Advance');
    } finally {
      this.submitting.set(false);
    }
  }
}

function toIsoDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
