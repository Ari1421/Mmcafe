import { Injectable } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase.service';
import { AuthService } from '../../core/services/auth.service';
import { DailyClosing, DailyCashFlow, mapDailyClosingRow, mapDailyCashFlow } from './daily-closing.model';

@Injectable({ providedIn: 'root' })
export class DailyClosingService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly auth: AuthService
  ) {}

  async getCashFlow(date: string): Promise<DailyCashFlow> {
    const { data, error } = await this.supabase.client
      .rpc('get_daily_cash_flow', { p_date: date })
      .single();
    if (error) throw error;
    return mapDailyCashFlow(data);
  }

  async getForDate(date: string): Promise<DailyClosing | null> {
    const { data, error } = await this.supabase.client
      .from('daily_closing')
      .select('*')
      .eq('closing_date', date)
      .maybeSingle();
    if (error) throw error;
    return data ? mapDailyClosingRow(data) : null;
  }

  /** Previous day's actual cash becomes today's suggested opening cash. */
  async getPreviousClosingCash(date: string): Promise<number> {
    const { data, error } = await this.supabase.client
      .from('daily_closing')
      .select('actual_cash')
      .lt('closing_date', date)
      .order('closing_date', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data?.actual_cash !== undefined && data?.actual_cash !== null ? Number(data.actual_cash) : 0;
  }

  /** Saves the draft (not yet closed) — opening cash and actual cash can still change until closed. */
  async saveDraft(
    date: string,
    openingCash: number,
    cashFlow: DailyCashFlow,
    actualCash: number | null,
    notes: string | null
  ): Promise<void> {
    const { error } = await this.supabase.client.from('daily_closing').upsert(
      {
        closing_date: date,
        opening_cash: openingCash,
        cash_sales: cashFlow.cashSales,
        cash_expenses: cashFlow.cashExpenses,
        other_cash_out: cashFlow.otherCashOut,
        actual_cash: actualCash,
        notes,
        is_closed: false
      },
      { onConflict: 'closing_date' }
    );
    if (error) throw error;
  }

  /** Closing the day locks it — normal staff can no longer edit that date's transactions. */
  async closeDay(date: string): Promise<void> {
    const userId = this.auth.session()?.user.id ?? null;
    const { error } = await this.supabase.client
      .from('daily_closing')
      .update({ is_closed: true, closed_by: userId, closed_at: new Date().toISOString() })
      .eq('closing_date', date);
    if (error) throw error;

    await this.logAuditAction('day_closed', date);
  }

  /** Only Admin can reopen a closed day. */
  async reopenDay(date: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('daily_closing')
      .update({ is_closed: false, closed_by: null, closed_at: null })
      .eq('closing_date', date);
    if (error) throw error;

    await this.logAuditAction('day_reopened', date);
  }

  private async logAuditAction(action: 'day_closed' | 'day_reopened', date: string): Promise<void> {
    const userId = this.auth.session()?.user.id ?? null;
    // Best-effort: the generic CRUD trigger already logs the update row; this
    // adds the semantic action so Reports/audit views can filter by intent.
    await this.supabase.client.from('audit_logs').insert({
      user_id: userId,
      action,
      entity_type: 'daily_closing',
      new_data: { closing_date: date }
    });
  }
}
