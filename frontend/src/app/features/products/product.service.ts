import { Injectable, computed, signal } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase.service';
import { Product, ProductFormValue, mapProductRow, toProductInsert } from './product.model';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly _products = signal<Product[]>([]);
  private readonly _loading = signal(false);

  readonly products = this._products.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly activeProducts = computed(() => this._products().filter((p) => p.active));

  constructor(private readonly supabase: SupabaseService) {}

  async loadAll(): Promise<void> {
    this._loading.set(true);
    const { data, error } = await this.supabase.client
      .from('products')
      .select('*')
      .order('name');

    this._loading.set(false);
    if (error) throw error;
    this._products.set((data ?? []).map(mapProductRow));
  }

  async create(value: ProductFormValue): Promise<void> {
    const { error } = await this.supabase.client.from('products').insert(toProductInsert(value));
    if (error) throw error;
    await this.loadAll();
  }

  async update(id: string, value: ProductFormValue): Promise<void> {
    const { error } = await this.supabase.client
      .from('products')
      .update(toProductInsert(value))
      .eq('id', id);
    if (error) throw error;
    await this.loadAll();
  }

  /** Products are master data used by historical purchases — never hard-deleted, only deactivated. */
  async setActive(id: string, active: boolean): Promise<void> {
    const { error } = await this.supabase.client.from('products').update({ active }).eq('id', id);
    if (error) throw error;
    await this.loadAll();
  }
}
