import { Injectable, signal } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase.service';
import { SettingsService } from '../../core/services/settings.service';
import { AttendanceService } from '../attendance/attendance.service';
import { StaffAdvanceService } from '../staff/staff-advance.service';
import { Staff } from '../staff/staff.model';
import { Salary, SalarySaveValue, mapSalaryRow, toSalaryUpsert } from './salary.model';

export interface SalaryDraft {
  workingDays: number;
  presentDays: number;
  absentDays: number;
  halfDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  dailyRate: number;
  deduction: number;
  suggestedAdvanceDeduction: number;
}

@Injectable({ providedIn: 'root' })
export class SalaryService {
  private readonly _salaries = signal<Salary[]>([]);
  private readonly _loading = signal(false);

  readonly salaries = this._salaries.asReadonly();
  readonly loading = this._loading.asReadonly();

  constructor(
    private readonly supabase: SupabaseService,
    private readonly settings: SettingsService,
    private readonly attendance: AttendanceService,
    private readonly advances: StaffAdvanceService
  ) {}

  /** Loads all salary records for a given month (first-of-month date, e.g. '2026-09-01'). */
  async loadForMonth(salaryMonth: string): Promise<void> {
    this._loading.set(true);
    const { data, error } = await this.supabase.client
      .from('salaries')
      .select('*, staff(name)')
      .eq('salary_month', salaryMonth)
      .order('created_at');
    this._loading.set(false);
    if (error) throw error;
    this._salaries.set((data ?? []).map(mapSalaryRow));
  }

  existingFor(staffId: string): Salary | undefined {
    return this._salaries().find((s) => s.staffId === staffId);
  }

  /**
   * Builds a salary draft for a staff member + month, per the spec's
   * suggested calculation:
   *   Daily Rate = Monthly Salary / Working Days
   *   Absent Deduction = Daily Rate × Unpaid Absent Days
   *   Half Day Deduction = Daily Rate × 0.5 × Half Days
   *
   * ASSUMPTION (calculation rule is configurable per cafe_settings.salary_settings,
   * documented here since the spec leaves the exact rule up to the cafe):
   *   - "Working Days" = total days in the month minus Weekly Off days,
   *     UNLESS salary_settings.weekly_off_paid is false, in which case
   *     Weekly Off days are treated like unpaid absence instead of being
   *     excluded from the divisor.
   *   - Paid Leave counts as a present day for pay purposes when
   *     salary_settings.paid_leave_counts_as_present is true (the default),
   *     so it does not reduce final salary.
   *   - Unpaid Leave is treated the same as Absent for deduction purposes.
   */
  async buildDraft(staff: Staff, monthStart: string, monthEnd: string): Promise<SalaryDraft> {
    const cafeSettings = await this.settings.load();
    const rules = cafeSettings.salarySettings;
    const summary = await this.attendance.getSummary(staff.id, monthStart, monthEnd);

    const totalDays = summary.totalDaysInRange;
    const weeklyOffDays = summary.weeklyOffDays;

    const workingDays = rules.weekly_off_paid
      ? totalDays - weeklyOffDays
      : totalDays;

    const unpaidAbsentEquivalent =
      summary.absentDays + summary.unpaidLeaveDays + (rules.weekly_off_paid ? 0 : weeklyOffDays);

    const monthlySalary = staff.monthlySalary ?? 0;
    const dailyRate = workingDays > 0 ? monthlySalary / workingDays : 0;
    const halfDayFactor = rules.half_day_factor ?? 0.5;

    const absentDeduction = dailyRate * unpaidAbsentEquivalent;
    const halfDayDeduction = dailyRate * halfDayFactor * summary.halfDays;
    const deduction = round2(absentDeduction + halfDayDeduction);

    const suggestedAdvanceDeduction = round2(
      await this.advances.getTotalForPeriod(staff.id, monthStart, monthEnd)
    );

    return {
      workingDays: round2(workingDays),
      presentDays: summary.presentDays,
      absentDays: summary.absentDays,
      halfDays: summary.halfDays,
      paidLeaveDays: summary.paidLeaveDays,
      unpaidLeaveDays: summary.unpaidLeaveDays,
      dailyRate: round2(dailyRate),
      deduction,
      suggestedAdvanceDeduction
    };
  }

  /** Upserts on (staff_id, salary_month) — recalculating replaces the previous draft for that month. */
  async save(value: SalarySaveValue): Promise<void> {
    const { error } = await this.supabase.client
      .from('salaries')
      .upsert(toSalaryUpsert(value), { onConflict: 'staff_id,salary_month' });
    if (error) throw error;
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
