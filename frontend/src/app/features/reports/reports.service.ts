import { Injectable, signal } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase.service';
import { ReportDay, ExpenseCategoryBreakdown, mapReportDay, mapExpenseCategoryBreakdown } from '../../core/models/report.model';
import { exportToCsv } from '../../shared/utils/csv-export.util';

@Injectable({ providedIn: 'root' })
export class ReportsService {
  readonly days = signal<ReportDay[]>([]);
  readonly expenseBreakdown = signal<ExpenseCategoryBreakdown[]>([]);
  readonly loading = signal(false);

  constructor(private readonly supabase: SupabaseService) {}

  async load(startDate: string, endDate: string): Promise<void> {
    this.loading.set(true);
    try {
      const [rangeRes, breakdownRes] = await Promise.all([
        this.supabase.client.rpc('get_report_range', { p_start: startDate, p_end: endDate }),
        this.supabase.client.rpc('get_expense_category_breakdown', { p_start: startDate, p_end: endDate })
      ]);
      if (rangeRes.error) throw rangeRes.error;
      if (breakdownRes.error) throw breakdownRes.error;

      this.days.set((rangeRes.data ?? []).map(mapReportDay));
      this.expenseBreakdown.set((breakdownRes.data ?? []).map(mapExpenseCategoryBreakdown));
    } finally {
      this.loading.set(false);
    }
  }

  get totals() {
    const days = this.days();
    return {
      totalSales: sum(days, (d) => d.totalSales),
      totalCashSales: sum(days, (d) => d.cashSales),
      totalOnlineSales: sum(days, (d) => d.onlineSales),
      totalOperatingExpenses: sum(days, (d) => d.operatingExpenses),
      totalPurchases: sum(days, (d) => d.purchasesTotal),
      totalStaffCost: sum(days, (d) => d.staffCost),
      totalExpense: sum(days, (d) => d.totalExpense),
      netIncome: sum(days, (d) => d.netIncome),
      milkQty: sum(days, (d) => d.milkQty),
      milkCost: sum(days, (d) => d.milkCost),
      curdQty: sum(days, (d) => d.curdQty),
      curdCost: sum(days, (d) => d.curdCost),
      avgDailySales: days.length ? sum(days, (d) => d.totalSales) / days.length : 0,
      highestSalesDay: days.reduce((best, d) => (!best || d.totalSales > best.totalSales ? d : best), null as ReportDay | null),
      lowestSalesDay: days.reduce((worst, d) => (!worst || d.totalSales < worst.totalSales ? d : worst), null as ReportDay | null)
    };
  }

  exportCsv(filenamePrefix: string): void {
    const headers = [
      'Date', 'Cash Sales', 'Online Sales', 'Total Sales',
      'Operating Expenses', 'Purchases (Milk/Curd)', 'Staff Cost', 'Total Expense', 'Net Income',
      'Milk Qty (L)', 'Milk Cost', 'Curd Qty (L)', 'Curd Cost'
    ];
    const rows = this.days().map((d) => [
      d.reportDate, d.cashSales, d.onlineSales, d.totalSales,
      d.operatingExpenses, d.purchasesTotal, d.staffCost, d.totalExpense, d.netIncome,
      d.milkQty, d.milkCost, d.curdQty, d.curdCost
    ]);
    exportToCsv(`${filenamePrefix}-${new Date().toISOString().slice(0, 10)}`, headers, rows);
  }
}

function sum(days: ReportDay[], selector: (d: ReportDay) => number): number {
  return Math.round(days.reduce((acc, d) => acc + selector(d), 0) * 100) / 100;
}
