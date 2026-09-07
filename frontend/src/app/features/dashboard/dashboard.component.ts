import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { ChartModule } from 'primeng/chart';
import { ButtonModule } from 'primeng/button';
import { DashboardService } from './dashboard.service';
import { InrCurrencyPipe } from '../../shared/pipes/inr-currency.pipe';
import { IndiaDatePipe } from '../../shared/pipes/india-date.pipe';
import { ErrorHandlerService } from '../../core/services/error-handler.service';
import { AuthService } from '../../core/services/auth.service';
import { ReportDay } from '../../core/models/report.model';

// Chart color choices below follow the dataviz skill's method (form -> job ->
// validated palette), not picked by eye:
//  - Cash/Online and the weekly Cash-vs-Online bars are a 2-slot categorical
//    pair (brand green + the skill's categorical blue) — validated: worst
//    adjacent ΔE 20.1 CVD / 21.2 normal-vision, both clear of the floor.
//  - The Sales/Expenses/Net trend is a 3-slot categorical set (green, the
//    skill's categorical orange, categorical blue) — validated PASS, with a
//    6–8 band CVD warning on the green↔orange pair; the Expenses line uses a
//    dashed stroke as the required secondary encoding for that pair.
//  - Expense-category breakdown is identity data shown as a pie, which the
//    skill validates under "all adjacent pairs" (any two slices can end up
//    next to each other) — only the palette's first 3 categorical slots
//    clear that bar, so categories beyond the top 3 fold into a neutral
//    "Other" slice rather than getting a 4th+ hue that can't be told apart.
const COLOR_SALES = '#059669'; // brand emerald — "cash", "sales", "good"
const COLOR_ONLINE = '#2a78d6'; // categorical slot 1 (blue)
const COLOR_EXPENSE = '#eb6834'; // categorical slot 2 (orange) — cost/expense
const COLOR_GOOD = '#0ca30c'; // status: good (net income positive)
const COLOR_CRITICAL = '#d03b3b'; // status: critical (net income negative)
const CATEGORY_COLORS = ['#2a78d6', '#eb6834', '#1baf7a']; // top-3 categorical, all-pairs validated
const COLOR_OTHER = '#9c9c96'; // neutral bucket, not a data hue

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [ChartModule, ButtonModule, DecimalPipe, InrCurrencyPipe, IndiaDatePipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly errorHandler = inject(ErrorHandlerService);
  readonly dashboardService = inject(DashboardService);
  readonly auth = inject(AuthService);

  readonly todayLabel = new Date().toISOString().slice(0, 10);

  readonly greeting = computed(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  });

  // ---- Derived stats (all computed client-side from data already fetched
  // by DashboardService — no extra network calls) ----

  readonly salesDeltaPct = computed(() => dayOverDayPct(this.dashboardService.trend(), (d) => d.totalSales));
  readonly netIncomeDeltaPct = computed(() => dayOverDayPct(this.dashboardService.trend(), (d) => d.netIncome));

  readonly weekTotalSales = computed(() =>
    this.dashboardService.trend().reduce((sum, d) => sum + d.totalSales, 0)
  );

  readonly bestDay = computed(() => {
    const trend = this.dashboardService.trend();
    if (trend.length === 0) return null;
    return trend.reduce((best, d) => (d.totalSales > best.totalSales ? d : best), trend[0]);
  });

  readonly attendancePct = computed(() => {
    const s = this.dashboardService.summary();
    if (!s) return 0;
    const total = s.staffPresent + s.staffAbsent;
    return total === 0 ? 0 : Math.round((s.staffPresent / total) * 100);
  });

  readonly hasDealerOutstanding = computed(() => (this.dashboardService.summary()?.dealerOutstandingTotal ?? 0) > 0);

  // ---- Charts ----

  readonly salesPieData = computed(() => {
    const s = this.dashboardService.summary();
    if (!s) return null;
    return {
      labels: ['Cash', 'Online'],
      datasets: [{ data: [s.cashSales, s.onlineSales], backgroundColor: [COLOR_SALES, COLOR_ONLINE] }]
    };
  });

  readonly trendLineData = computed(() => {
    const trend = this.dashboardService.trend();
    return {
      labels: trend.map((d) => d.reportDate.slice(5)),
      datasets: [
        {
          label: 'Sales',
          data: trend.map((d) => d.totalSales),
          borderColor: COLOR_SALES,
          backgroundColor: 'rgba(5,150,105,0.12)',
          tension: 0.3,
          fill: true
        },
        {
          label: 'Expenses',
          // Dashed stroke: required secondary encoding for the green/orange
          // pair, which sits in the CVD 6–8 warning band (see note above).
          data: trend.map((d) => d.totalExpense),
          borderColor: COLOR_EXPENSE,
          borderDash: [6, 4],
          backgroundColor: 'transparent',
          tension: 0.3,
          fill: false
        },
        {
          label: 'Net Income',
          data: trend.map((d) => d.netIncome),
          borderColor: COLOR_ONLINE,
          backgroundColor: 'transparent',
          tension: 0.3,
          fill: false
        }
      ]
    };
  });

  readonly cashOnlineTrendData = computed(() => {
    const trend = this.dashboardService.trend();
    return {
      labels: trend.map((d) => d.reportDate.slice(5)),
      datasets: [
        { label: 'Cash', data: trend.map((d) => d.cashSales), backgroundColor: COLOR_SALES, borderRadius: 4 },
        { label: 'Online', data: trend.map((d) => d.onlineSales), backgroundColor: COLOR_ONLINE, borderRadius: 4 }
      ]
    };
  });

  readonly expensePieData = computed(() => {
    const breakdown = [...this.dashboardService.expenseBreakdown()].sort((a, b) => b.totalAmount - a.totalAmount);
    const top = breakdown.slice(0, 3);
    const rest = breakdown.slice(3);
    const otherTotal = rest.reduce((sum, b) => sum + b.totalAmount, 0);

    const labels = top.map((b) => b.categoryName);
    const data = top.map((b) => b.totalAmount);
    const colors = CATEGORY_COLORS.slice(0, top.length);

    if (otherTotal > 0) {
      labels.push(`Other (${rest.length})`);
      data.push(otherTotal);
      colors.push(COLOR_OTHER);
    }

    return { labels, datasets: [{ data, backgroundColor: colors }] };
  });

  readonly chartOptions = { plugins: { legend: { position: 'bottom' } }, maintainAspectRatio: false };

  netIncomeColor(value: number): string {
    return value < 0 ? COLOR_CRITICAL : COLOR_GOOD;
  }

  async ngOnInit(): Promise<void> {
    try {
      await this.dashboardService.loadAll();
    } catch (err) {
      this.errorHandler.handle(err, 'Dashboard');
    }
  }

  addSale(): void { this.router.navigate(['/sales/new']); }
  addExpense(): void { this.router.navigate(['/expenses']); }
  addPurchase(): void { this.router.navigate(['/purchases/new']); }
  markAttendance(): void { this.router.navigate(['/attendance']); }

  goToSales(): void { this.router.navigate(['/sales']); }
  goToExpenses(): void { this.router.navigate(['/expenses']); }
  goToPurchases(): void { this.router.navigate(['/purchases']); }
  goToDealers(): void { this.router.navigate(['/dealers']); }
  goToAttendance(): void { this.router.navigate(['/attendance']); }
}

/** % change of the last day in `trend` vs the day before it. Null when there isn't enough data yet. */
function dayOverDayPct(trend: ReportDay[], pick: (d: ReportDay) => number): number | null {
  if (trend.length < 2) return null;
  const today = pick(trend[trend.length - 1]);
  const yesterday = pick(trend[trend.length - 2]);
  if (yesterday === 0) return null;
  return ((today - yesterday) / Math.abs(yesterday)) * 100;
}
