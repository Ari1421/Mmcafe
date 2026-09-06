import { Injectable, signal } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase.service';
import { AuthService } from '../../core/services/auth.service';
import { PaymentMode } from '../../core/models/enums';
import { Expense, ExpenseFormValue, mapExpenseRow, toExpenseInsert, toExpenseUpdate } from './expense.model';

export interface ExpenseFilter {
  dateFrom?: string;
  dateTo?: string;
  categoryId?: string;
  paymentMode?: PaymentMode;
  search?: string;
}

@Injectable({ providedIn: 'root' })
export class ExpenseService {
  private readonly _expenses = signal<Expense[]>([]);
  private readonly _loading = signal(false);

  readonly expenses = this._expenses.asReadonly();
  readonly loading = this._loading.asReadonly();

  constructor(
    private readonly supabase: SupabaseService,
    private readonly auth: AuthService
  ) {}

  async load(filter: ExpenseFilter = {}): Promise<void> {
    this._loading.set(true);
    let query = this.supabase.client
      .from('expenses')
      .select('*, expense_categories(name)')
      .order('expense_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (filter.dateFrom) query = query.gte('expense_date', filter.dateFrom);
    if (filter.dateTo) query = query.lte('expense_date', filter.dateTo);
    if (filter.categoryId) query = query.eq('category_id', filter.categoryId);
    if (filter.paymentMode) query = query.eq('payment_mode', filter.paymentMode);
    if (filter.search) query = query.ilike('description', `%${filter.search}%`);

    const { data, error } = await query;
    this._loading.set(false);
    if (error) throw error;
    this._expenses.set((data ?? []).map(mapExpenseRow));
  }

  async create(value: ExpenseFormValue): Promise<void> {
    const userId = this.auth.session()?.user.id ?? null;
    const { error } = await this.supabase.client.from('expenses').insert(toExpenseInsert(value, userId));
    if (error) throw error;
  }

  async update(id: string, value: ExpenseFormValue): Promise<void> {
    const { error } = await this.supabase.client.from('expenses').update(toExpenseUpdate(value)).eq('id', id);
    if (error) throw error;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.client.from('expenses').delete().eq('id', id);
    if (error) throw error;
  }

  get totalAmount(): number {
    return this._expenses().reduce((sum, e) => sum + e.amount, 0);
  }
  get totalCash(): number {
    return this._expenses().filter((e) => e.paymentMode === 'cash').reduce((sum, e) => sum + e.amount, 0);
  }
  get totalOnline(): number {
    return this._expenses().filter((e) => e.paymentMode === 'online').reduce((sum, e) => sum + e.amount, 0);
  }
}
