import { Injectable } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase.service';
import { AuthService } from '../../core/services/auth.service';
import { AttendanceStatus } from '../../core/models/enums';
import {
  AttendanceRowForDate,
  AttendanceSummary,
  mapAttendanceRowForDate,
  mapAttendanceSummary
} from './attendance.model';

@Injectable({ providedIn: 'root' })
export class AttendanceService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly auth: AuthService
  ) {}

  /** Every active staff member for the date, with any existing attendance row joined in. */
  async getForDate(date: string): Promise<AttendanceRowForDate[]> {
    const { data, error } = await this.supabase.client.rpc('get_attendance_for_date', {
      p_date: date
    });
    if (error) throw error;
    return (data ?? []).map(mapAttendanceRowForDate);
  }

  /**
   * Saves the whole day's attendance in one batch upsert keyed on
   * (staff_id, attendance_date) — the same constraint that prevents
   * duplicate attendance at the database level.
   */
  async saveDay(
    date: string,
    rows: { staffId: string; status: AttendanceStatus; checkIn?: string | null; checkOut?: string | null; notes?: string | null }[]
  ): Promise<void> {
    const userId = this.auth.session()?.user.id ?? null;
    const payload = rows.map((r) => ({
      staff_id: r.staffId,
      attendance_date: date,
      status: r.status,
      check_in: r.checkIn || null,
      check_out: r.checkOut || null,
      notes: r.notes || null,
      created_by: userId,
      updated_by: userId
    }));

    const { error } = await this.supabase.client
      .from('attendance')
      .upsert(payload, { onConflict: 'staff_id,attendance_date' });
    if (error) throw error;
  }

  /** Aggregate counts for a staff member over a date range — feeds Salary calculation. */
  async getSummary(staffId: string, startDate: string, endDate: string): Promise<AttendanceSummary> {
    const { data, error } = await this.supabase.client
      .rpc('get_attendance_summary', { p_staff_id: staffId, p_start: startDate, p_end: endDate })
      .single();
    if (error) throw error;
    return mapAttendanceSummary(data);
  }
}
