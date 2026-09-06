import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TextareaModule } from 'primeng/textarea';
import { TagModule } from 'primeng/tag';
import { StaffService } from '../staff.service';
import { Staff } from '../staff.model';
import { SalaryType } from '../../../core/models/enums';
import { InrCurrencyPipe } from '../../../shared/pipes/inr-currency.pipe';
import { AuthService } from '../../../core/services/auth.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';

@Component({
  selector: 'app-staff-list',
  standalone: true,
  imports: [
    ReactiveFormsModule, TableModule, ButtonModule, DialogModule, InputTextModule,
    InputNumberModule, SelectModule, DatePickerModule, ToggleSwitchModule, TextareaModule,
    TagModule, InrCurrencyPipe
  ],
  templateUrl: './staff-list.component.html',
  styleUrl: './staff-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StaffListComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly errorHandler = inject(ErrorHandlerService);
  readonly staffService = inject(StaffService);
  readonly auth = inject(AuthService);

  readonly dialogOpen = signal(false);
  readonly editing = signal<Staff | null>(null);
  readonly submitting = signal(false);

  readonly salaryTypeOptions = [
    { label: 'Monthly', value: 'monthly' as SalaryType },
    { label: 'Daily', value: 'daily' as SalaryType }
  ];

  readonly form = this.fb.group({
    employeeCode: [''],
    name: ['', Validators.required],
    mobile: [''],
    email: [''],
    joiningDate: [new Date(), Validators.required],
    designation: [''],
    salaryType: ['monthly' as SalaryType, Validators.required],
    monthlySalary: [0],
    dailySalary: [0],
    shift: [''],
    active: [true],
    address: [''],
    emergencyContact: [''],
    notes: ['']
  });

  async ngOnInit(): Promise<void> {
    try {
      await this.staffService.loadAll();
    } catch (err) {
      this.errorHandler.handle(err, 'Staff');
    }
  }

  openCreate(): void {
    this.editing.set(null);
    this.form.reset({
      employeeCode: '', name: '', mobile: '', email: '', joiningDate: new Date(),
      designation: '', salaryType: 'monthly', monthlySalary: 0, dailySalary: 0,
      shift: '', active: true, address: '', emergencyContact: '', notes: ''
    });
    this.dialogOpen.set(true);
  }

  openEdit(staff: Staff): void {
    this.editing.set(staff);
    this.form.reset({
      employeeCode: staff.employeeCode ?? '',
      name: staff.name,
      mobile: staff.mobile ?? '',
      email: staff.email ?? '',
      joiningDate: new Date(staff.joiningDate),
      designation: staff.designation ?? '',
      salaryType: staff.salaryType,
      monthlySalary: staff.monthlySalary ?? 0,
      dailySalary: staff.dailySalary ?? 0,
      shift: staff.shift ?? '',
      active: staff.active,
      address: staff.address ?? '',
      emergencyContact: staff.emergencyContact ?? '',
      notes: staff.notes ?? ''
    });
    this.dialogOpen.set(true);
  }

  async save(): Promise<void> {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    const raw = this.form.getRawValue();
    const value = { ...raw, joiningDate: toIsoDate(raw.joiningDate!) };

    try {
      const editing = this.editing();
      if (editing) {
        await this.staffService.update(editing.id, value as any);
      } else {
        await this.staffService.create(value as any);
      }
      this.errorHandler.success(editing ? 'Staff updated.' : 'Staff added.');
      this.dialogOpen.set(false);
    } catch (err) {
      this.errorHandler.handle(err, 'Save Staff');
    } finally {
      this.submitting.set(false);
    }
  }

  async toggleActive(staff: Staff): Promise<void> {
    try {
      await this.staffService.setActive(staff.id, !staff.active);
    } catch (err) {
      this.errorHandler.handle(err, 'Update Staff');
    }
  }

  viewDetails(staff: Staff): void {
    this.router.navigate(['/staff', staff.id]);
  }
}

function toIsoDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
