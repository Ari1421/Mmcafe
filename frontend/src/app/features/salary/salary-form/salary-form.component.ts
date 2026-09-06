import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { TextareaModule } from 'primeng/textarea';
import { StaffService } from '../../staff/staff.service';
import { SalaryService, SalaryDraft } from '../salary.service';
import { Staff } from '../../staff/staff.model';
import { PaymentMode, SalaryPaymentStatus } from '../../../core/models/enums';
import { InrCurrencyPipe } from '../../../shared/pipes/inr-currency.pipe';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';

@Component({
  selector: 'app-salary-form',
  standalone: true,
  imports: [
    ReactiveFormsModule, ButtonModule, InputNumberModule, SelectModule,
    DatePickerModule, TextareaModule, InrCurrencyPipe
  ],
  templateUrl: './salary-form.component.html',
  styleUrl: './salary-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SalaryFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly staffService = inject(StaffService);
  private readonly salaryService = inject(SalaryService);
  private readonly errorHandler = inject(ErrorHandlerService);

  readonly staff = signal<Staff | null>(null);
  readonly salaryMonth = signal<string>('');
  readonly draft = signal<SalaryDraft | null>(null);
  readonly loading = signal(false);
  readonly submitting = signal(false);

  readonly paymentStatusOptions = [
    { label: 'Pending', value: 'pending' as SalaryPaymentStatus },
    { label: 'Partially Paid', value: 'partially_paid' as SalaryPaymentStatus },
    { label: 'Paid', value: 'paid' as SalaryPaymentStatus }
  ];
  readonly paymentModeOptions = [
    { label: 'Cash', value: 'cash' as PaymentMode },
    { label: 'Online', value: 'online' as PaymentMode }
  ];

  readonly form = this.fb.group({
    deduction: [0, [Validators.min(0)]],
    advanceDeduction: [0, [Validators.min(0)]],
    bonus: [0, [Validators.min(0)]],
    adjustment: [0],
    paymentStatus: ['pending' as SalaryPaymentStatus, Validators.required],
    paymentDate: [null as Date | null],
    paymentMode: [null as PaymentMode | null],
    notes: ['']
  });

  finalSalary(): number {
    const base = this.staff()?.monthlySalary ?? 0;
    const v = this.form.getRawValue();
    return round2(base - (v.deduction ?? 0) - (v.advanceDeduction ?? 0) + (v.bonus ?? 0) + (v.adjustment ?? 0));
  }

  async ngOnInit(): Promise<void> {
    const staffId = this.route.snapshot.paramMap.get('staffId')!;
    const month = this.route.snapshot.queryParamMap.get('month') ?? isoFirstOfMonth(new Date());
    this.salaryMonth.set(month);

    this.loading.set(true);
    try {
      if (this.staffService.staff().length === 0) await this.staffService.loadAll();
      const staff = this.staffService.staff().find((s) => s.id === staffId) ?? (await this.staffService.getById(staffId));
      this.staff.set(staff);

      await this.recalculate();

      const existing = (await this.loadExistingForMonth(staffId, month));
      if (existing) {
        this.form.patchValue({
          deduction: existing.deduction,
          advanceDeduction: existing.advanceDeduction,
          bonus: existing.bonus,
          adjustment: existing.adjustment,
          paymentStatus: existing.paymentStatus,
          paymentDate: existing.paymentDate ? new Date(existing.paymentDate) : null,
          paymentMode: existing.paymentMode,
          notes: existing.notes ?? ''
        });
      }
    } catch (err) {
      this.errorHandler.handle(err, 'Salary');
    } finally {
      this.loading.set(false);
    }
  }

  private async loadExistingForMonth(staffId: string, month: string) {
    await this.salaryService.loadForMonth(month);
    return this.salaryService.existingFor(staffId);
  }

  private monthRange(): { start: string; end: string } {
    const [y, m] = this.salaryMonth().split('-').map(Number);
    const start = `${y}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const end = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return { start, end };
  }

  async recalculate(): Promise<void> {
    const staff = this.staff();
    if (!staff) return;
    const { start, end } = this.monthRange();
    const draft = await this.salaryService.buildDraft(staff, start, end);
    this.draft.set(draft);
    this.form.patchValue({
      deduction: draft.deduction,
      advanceDeduction: draft.suggestedAdvanceDeduction
    });
  }

  async save(): Promise<void> {
    const staff = this.staff();
    const draft = this.draft();
    if (!staff || !draft || this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    const v = this.form.getRawValue();

    try {
      await this.salaryService.save({
        staffId: staff.id,
        salaryMonth: this.salaryMonth(),
        baseSalary: staff.monthlySalary ?? 0,
        workingDays: draft.workingDays,
        presentDays: draft.presentDays,
        absentDays: draft.absentDays,
        halfDays: draft.halfDays,
        paidLeaveDays: draft.paidLeaveDays,
        unpaidLeaveDays: draft.unpaidLeaveDays,
        deduction: v.deduction ?? 0,
        advanceDeduction: v.advanceDeduction ?? 0,
        bonus: v.bonus ?? 0,
        adjustment: v.adjustment ?? 0,
        finalSalary: this.finalSalary(),
        paymentStatus: v.paymentStatus!,
        paymentDate: v.paymentDate ? toIsoDate(v.paymentDate) : null,
        paymentMode: v.paymentMode,
        notes: v.notes
      });
      this.errorHandler.success('Salary saved.');
      await this.router.navigate(['/salary']);
    } catch (err) {
      this.errorHandler.handle(err, 'Save Salary');
    } finally {
      this.submitting.set(false);
    }
  }

  cancel(): void {
    this.router.navigate(['/salary']);
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function isoFirstOfMonth(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function toIsoDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
