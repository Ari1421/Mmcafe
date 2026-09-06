import { Injectable, computed, signal } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase.service';
import { ExpenseCategory, mapExpenseCategoryRow } from './expense-category.model';

@Injectable({ providedIn: 'root' })
export class ExpenseCategoryService {
  private readonly _categories = signal<ExpenseCategory[]>([]);
  private readonly _loading = signal(false);

  readonly categories = this._categories.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly activeCategories = computed(() => this._categories().filter((c) => c.active));

  constructor(private readonly supabase: SupabaseService) {}

  async loadAll(): Promise<void> {
    this._loading.set(true);
    const { data, error } = await this.supabase.client.from('expense_categories').select('*').order('name');
    this._loading.set(false);
    if (error) throw error;
    this._categories.set((data ?? []).map(mapExpenseCategoryRow));
  }

  async create(name: string): Promise<void> {
    const { error } = await this.supabase.client.from('expense_categories').insert({ name });
    if (error) throw error;
    await this.loadAll();
  }

  async rename(id: string, name: string): Promise<void> {
    const { error } = await this.supabase.client.from('expense_categories').update({ name }).eq('id', id);
    if (error) throw error;
    await this.loadAll();
  }

  /** Categories already used in transactions are never hard-deleted — only deactivated. */
  async setActive(id: string, active: boolean): Promise<void> {
    const { error } = await this.supabase.client.from('expense_categories').update({ active }).eq('id', id);
    if (error) throw error;
    await this.loadAll();
  }
}
