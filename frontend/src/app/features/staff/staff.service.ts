import { Injectable, computed, signal } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase.service';
import { Staff, StaffFormValue, mapStaffRow, toStaffInsert } from './staff.model';

@Injectable({ providedIn: 'root' })
export class StaffService {
  private readonly _staff = signal<Staff[]>([]);
  private readonly _loading = signal(false);

  readonly staff = this._staff.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly activeStaff = computed(() => this._staff().filter((s) => s.active));

  constructor(private readonly supabase: SupabaseService) {}

  async loadAll(): Promise<void> {
    this._loading.set(true);
    const { data, error } = await this.supabase.client.from('staff').select('*').order('name');
    this._loading.set(false);
    if (error) throw error;
    this._staff.set((data ?? []).map(mapStaffRow));
  }

  async getById(id: string): Promise<Staff> {
    const { data, error } = await this.supabase.client
      .from('staff')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return mapStaffRow(data);
  }

  async create(value: StaffFormValue): Promise<void> {
    const { error } = await this.supabase.client.from('staff').insert(toStaffInsert(value));
    if (error) throw error;
    await this.loadAll();
  }

  async update(id: string, value: StaffFormValue): Promise<void> {
    const { error } = await this.supabase.client
      .from('staff')
      .update(toStaffInsert(value))
      .eq('id', id);
    if (error) throw error;
    await this.loadAll();
  }

  /** Staff are referenced by attendance/salary history — soft deactivate only, never delete. */
  async setActive(id: string, active: boolean): Promise<void> {
    const { error } = await this.supabase.client.from('staff').update({ active }).eq('id', id);
    if (error) throw error;
    await this.loadAll();
  }
}
