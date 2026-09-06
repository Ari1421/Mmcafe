import { Injectable, signal } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase.service';
import { AuthService } from '../../core/services/auth.service';
import { SaleRecord, SaleFormValue, mapSaleRow, toSaleInsert, toSaleUpdate } from './sales.model';

export interface SalesFilter {
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

@Injectable({ providedIn: 'root' })
export class SalesService {
  private readonly _sales = signal<SaleRecord[]>([]);
  private readonly _loading = signal(false);

  readonly sales = this._sales.asReadonly();
  readonly loading = this._loading.asReadonly();

  constructor(
    private readonly supabase: SupabaseService,
    private readonly auth: AuthService
  ) {}

  async load(filter: SalesFilter = {}): Promise<void> {
    this._loading.set(true);
    let query = this.supabase.client.from('sales').select('*').order('sale_date', { ascending: false });

    if (filter.dateFrom) query = query.gte('sale_date', filter.dateFrom);
    if (filter.dateTo) query = query.lte('sale_date', filter.dateTo);
    if (filter.search) query = query.ilike('notes', `%${filter.search}%`);

    // Safety net: this table grows by one row a day forever. The list page
    // defaults to "this month" so this limit shouldn't normally bind, but
    // it stops a manually-cleared date filter from pulling years of history.
    query = query.limit(1000);

    const { data, error } = await query;
    this._loading.set(false);
    if (error) throw error;
    this._sales.set((data ?? []).map(mapSaleRow));
  }

  /**
   * Per the "one summary per day" default behavior: checks whether a sales
   * row already exists for the date so the Add flow can offer to edit it
   * instead of hitting the DB's unique constraint.
   */
  async findByDate(date: string): Promise<SaleRecord | null> {
    const { data, error } = await this.supabase.client
      .from('sales')
      .select('*')
      .eq('sale_date', date)
      .maybeSingle();
    if (error) throw error;
    return data ? mapSaleRow(data) : null;
  }

  async create(value: SaleFormValue): Promise<void> {
    const userId = this.auth.session()?.user.id ?? null;
    const { error } = await this.supabase.client.from('sales').insert(toSaleInsert(value, userId));
    if (error) throw error;
  }

  async update(id: string, value: SaleFormValue): Promise<void> {
    const { error } = await this.supabase.client.from('sales').update(toSaleUpdate(value)).eq('id', id);
    if (error) throw error;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.client.from('sales').delete().eq('id', id);
    if (error) throw error;
  }

  get totalCash(): number {
    return this._sales().reduce((sum, s) => sum + s.cashAmount, 0);
  }
  get totalOnline(): number {
    return this._sales().reduce((sum, s) => sum + s.onlineAmount, 0);
  }
  get totalSales(): number {
    return this._sales().reduce((sum, s) => sum + s.totalAmount, 0);
  }
}
