import { Injectable, signal } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase.service';
import { AuthService } from '../../core/services/auth.service';
import {
  Purchase,
  PurchaseFormValue,
  mapPurchaseRow,
  toPurchaseInsert,
  toPurchaseUpdate
} from './purchase.model';

export interface PurchaseFilter {
  dateFrom?: string;
  dateTo?: string;
  dealerId?: string;
  productId?: string;
}

@Injectable({ providedIn: 'root' })
export class PurchaseService {
  private readonly _purchases = signal<Purchase[]>([]);
  private readonly _loading = signal(false);

  readonly purchases = this._purchases.asReadonly();
  readonly loading = this._loading.asReadonly();

  constructor(
    private readonly supabase: SupabaseService,
    private readonly auth: AuthService
  ) {}

  async load(filter: PurchaseFilter = {}): Promise<void> {
    this._loading.set(true);

    let query = this.supabase.client
      .from('purchases')
      .select('*, dealers(name), products(name)')
      .order('purchase_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (filter.dateFrom) query = query.gte('purchase_date', filter.dateFrom);
    if (filter.dateTo) query = query.lte('purchase_date', filter.dateTo);
    if (filter.dealerId) query = query.eq('dealer_id', filter.dealerId);
    if (filter.productId) query = query.eq('product_id', filter.productId);

    // Safety net: this table grows forever. The list page defaults to
    // "this month" so this limit shouldn't normally bind, but it stops a
    // manually-cleared date filter from pulling years of joined history.
    query = query.limit(1000);

    const { data, error } = await query;
    this._loading.set(false);

    if (error) throw error;
    this._purchases.set((data ?? []).map(mapPurchaseRow));
  }

  async create(value: PurchaseFormValue): Promise<void> {
    const userId = this.auth.session()?.user.id ?? null;
    const { error } = await this.supabase.client
      .from('purchases')
      .insert(toPurchaseInsert(value, userId));
    if (error) throw error;
    await this.load();
  }

  async update(id: string, value: PurchaseFormValue): Promise<void> {
    const { error } = await this.supabase.client
      .from('purchases')
      .update(toPurchaseUpdate(value))
      .eq('id', id);
    if (error) throw error;
    await this.load();
  }

  /** Only Admin, or staff with delete_records permission, can reach this per RLS. */
  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.client.from('purchases').delete().eq('id', id);
    if (error) throw error;
    await this.load();
  }

  get totalQuantity(): number {
    return this._purchases().reduce((sum, p) => sum + p.quantity, 0);
  }

  get totalAmount(): number {
    return this._purchases().reduce((sum, p) => sum + p.totalAmount, 0);
  }
}
