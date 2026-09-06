import { Injectable, signal } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase.service';
import { ReportDay, ExpenseCategoryBreakdown, mapReportDay, mapExpenseCategoryBreakdown } from '../../core/models/report.model';
import { DashboardSummary, mapDashboardSummary } from './dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  readonly summary = signal<DashboardSummary | null>(null);
  readonly trend = signal<ReportDay[]>([]);
  readonly expenseBreakdown = signal<ExpenseCategoryBreakdown[]>([]);
  readonly loading = signal(false);

  constructor(private readonly supabase: SupabaseService) {}

  async loadAll(): Promise<void> {
    this.loading.set(true);
    const today = toIsoDate(new Date());
    const sevenDaysAgo = toIsoDate(daysAgo(6));
    const monthStart = toIsoDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

    try {
      const [summaryRes, trendRes, breakdownRes] = await Promise.all([
        this.supabase.client.rpc('get_dashboard_summary', { p_date: today }).single(),
        this.supabase.client.rpc('get_report_range', { p_start: sevenDaysAgo, p_end: today }),
        this.supabase.client.rpc('get_expense_category_breakdown', { p_start: monthStart, p_end: today })
      ]);

      if (summaryRes.error) throw summaryRes.error;
      if (trendRes.error) throw trendRes.error;
      if (breakdownRes.error) throw breakdownRes.error;

      this.summary.set(mapDashboardSummary(summaryRes.data));
      this.trend.set((trendRes.data ?? []).map(mapReportDay));
      this.expenseBreakdown.set((breakdownRes.data ?? []).map(mapExpenseCategoryBreakdown));
    } finally {
      this.loading.set(false);
    }
  }
}

function toIsoDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
