import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ChartModule } from 'primeng/chart';
import { ButtonModule } from 'primeng/button';
import { DashboardService } from './dashboard.service';
import { InrCurrencyPipe } from '../../shared/pipes/inr-currency.pipe';
import { IndiaDatePipe } from '../../shared/pipes/india-date.pipe';
import { ErrorHandlerService } from '../../core/services/error-handler.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [ChartModule, ButtonModule, InrCurrencyPipe, IndiaDatePipe],
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

  readonly salesPieData = computed(() => {
    const s = this.dashboardService.summary();
    if (!s) return null;
    return {
      labels: ['Cash', 'Online'],
      datasets: [{ data: [s.cashSales, s.onlineSales], backgroundColor: ['#8b5e34', '#c9a06a'] }]
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
          borderColor: '#8b5e34',
          backgroundColor: 'rgba(139,94,52,0.15)',
          tension: 0.3,
          fill: true
        }
      ]
    };
  });

  readonly expensePieData = computed(() => {
    const breakdown = this.dashboardService.expenseBreakdown();
    const palette = ['#8b5e34', '#c9a06a', '#a3785a', '#6b4a2f', '#d9bd9a', '#5a3d24', '#e0c9ac'];
    return {
      labels: breakdown.map((b) => b.categoryName),
      datasets: [{ data: breakdown.map((b) => b.totalAmount), backgroundColor: palette }]
    };
  });

  readonly chartOptions = { plugins: { legend: { position: 'bottom' } }, maintainAspectRatio: false };

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
}
