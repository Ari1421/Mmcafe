import { Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';

/**
 * Supabase-js is not an HttpClient-based library, so there is no HTTP
 * interceptor to hook into. Instead, every feature service routes its
 * Supabase errors through this single service, which:
 *   1. Translates known Postgres/Supabase error codes into human messages.
 *   2. Shows a PrimeNG Toast.
 *   3. Never leaks raw database internals to non-technical staff.
 */
@Injectable({ providedIn: 'root' })
export class ErrorHandlerService {
  constructor(private readonly messageService: MessageService) {}

  handle(error: unknown, context?: string): void {
    const message = this.toFriendlyMessage(error);
    this.messageService.add({
      severity: 'error',
      summary: context ?? 'Error',
      detail: message,
      life: 5000
    });
  }

  success(message: string, summary = 'Success'): void {
    this.messageService.add({ severity: 'success', summary, detail: message, life: 3000 });
  }

  private toFriendlyMessage(error: unknown): string {
    const raw = (error as any)?.message ?? String(error);
    const code = (error as any)?.code;

    // Postgres unique_violation
    if (code === '23505' || raw.includes('duplicate key value')) {
      if (raw.includes('sales_one_per_day')) {
        return 'Sales have already been entered for this date. Please edit the existing entry instead.';
      }
      if (raw.includes('attendance_staff_id_attendance_date_key')) {
        return 'Attendance has already been marked for this employee on this date.';
      }
      if (raw.includes('salaries_staff_id_salary_month_key')) {
        return 'Salary has already been calculated for this staff member this month.';
      }
      return 'This record already exists.';
    }

    // Postgres foreign_key_violation
    if (code === '23503' || raw.includes('violates foreign key constraint')) {
      return 'This record is linked to other data and cannot be changed this way.';
    }

    // Postgres check_violation
    if (code === '23514' || raw.includes('violates check constraint')) {
      return 'Please check the values you entered — one or more amounts are invalid.';
    }

    // RLS denial
    if (raw.includes('row-level security') || raw.includes('permission denied')) {
      return 'You do not have permission to perform this action.';
    }

    if (raw.includes('Invalid login credentials')) {
      return 'Incorrect email or password.';
    }

    return 'Something went wrong. Please try again.';
  }
}
