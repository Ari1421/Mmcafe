import { Injectable } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase.service';
import { AuthService } from '../../core/services/auth.service';
import {
  StaffAdvance,
  StaffAdvanceFormValue,
  mapStaffAdvanceRow,
  toStaffAdvanceInsert
} from './staff-advance.model';

@Injectable({ providedIn: 'root' })
export class StaffAdvanceService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly auth: AuthService
  ) {}

  async getForStaff(staffId: string): Promise<StaffAdvance[]> {
    const { data, error } = await this.supabase.client
      .from('staff_advances')
      .select('*')
      .eq('staff_id', staffId)
      .order('advance_date', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapStaffAdvanceRow);
  }

  /** Sum of advances within a date range — the default suggestion for salary deduction. */
  async getTotalForPeriod(staffId: string, startDate: string, endDate: string): Promise<number> {
    const { data, error } = await this.supabase.client
      .from('staff_advances')
      .select('amount')
      .eq('staff_id', staffId)
      .gte('advance_date', startDate)
      .lte('advance_date', endDate);
    if (error) throw error;
    return (data ?? []).reduce((sum, row) => sum + Number(row.amount), 0);
  }

  async add(value: StaffAdvanceFormValue): Promise<void> {
    const userId = this.auth.session()?.user.id ?? null;
    const { error } = await this.supabase.client
      .from('staff_advances')
      .insert(toStaffAdvanceInsert(value, userId));
    if (error) throw error;
  }
}
