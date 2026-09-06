import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DatePickerModule } from 'primeng/datepicker';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { StaffService } from '../../staff/staff.service';
import { SalaryService } from '../salary.service';
import { Staff } from '../../staff/staff.model';
import { InrCurrencyPipe } from '../../../shared/pipes/inr-currency.pipe';

@Component({
  selector: 'app-salary-list',
  standalone: true,
  imports: [FormsModule, DatePickerModule, TableModule, ButtonModule, TagModule, InrCurrencyPipe],
  templateUrl: './salary-list.component.html',
  styleUrl: './salary-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SalaryListComponent implements OnInit {
  private readonly router = inject(Router);
  readonly staffService = inject(StaffService);
  readonly salaryService = inject(SalaryService);

  // A "month picker" represented as any date within the target month.
  readonly selectedMonth = signal<Date>(startOfMonth(new Date()));

  async ngOnInit(): Promise<void> {
    // Independent requests — the staff list and this month's salaries
    // don't depend on each other, so fetch them together.
    await Promise.all([this.staffService.loadAll(), this.reload()]);
  }

  async reload(): Promise<void> {
    await this.salaryService.loadForMonth(toIsoDate(this.selectedMonth()));
  }

  async onMonthChange(date: Date): Promise<void> {
    this.selectedMonth.set(startOfMonth(date));
    await this.reload();
  }

  statusFor(staff: Staff): string {
    return this.salaryService.existingFor(staff.id)?.paymentStatus ?? 'Not Generated';
  }

  finalSalaryFor(staff: Staff): number | null {
    return this.salaryService.existingFor(staff.id)?.finalSalary ?? null;
  }

  openSalaryForm(staff: Staff): void {
    this.router.navigate(['/salary', staff.id], {
      queryParams: { month: toIsoDate(this.selectedMonth()) }
    });
  }
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function toIsoDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}-01`;
}
