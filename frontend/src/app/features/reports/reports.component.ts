import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { ChartModule } from 'primeng/chart';
import { ReportsService } from './reports.service';
import { InrCurrencyPipe } from '../../shared/pipes/inr-currency.pipe';
import { IndiaDatePipe } from '../../shared/pipes/india-date.pipe';
import { ErrorHandlerService } from '../../core/services/error-handler.service';

type PresetKey = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'custom';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [FormsModule, SelectModule, DatePickerModule, ButtonModule, TableModule, ChartModule, InrCurrencyPipe, IndiaDatePipe],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReportsComponent implements OnInit {
  private readonly errorHandler = inject(ErrorHandlerService);
  readonly reportsService = inject(ReportsService);

  readonly presetOptions: { label: string; value: PresetKey }[] = [
    { label: 'Today', value: 'today' },
    { label: 'Yesterday', value: 'yesterday' },
    { label: 'This Week', value: 'thisWeek' },
    { label: 'Last Week', value: 'lastWeek' },
    { label: 'This Month', value: 'thisMonth' },
    { label: 'Last Month', value: 'lastMonth' },
    { label: 'Custom Range', value: 'custom' }
  ];

  readonly preset = signal<PresetKey>('thisMonth');
  readonly customFrom = signal<Date | null>(null);
  readonly customTo = signal<Date | null>(null);

  readonly salesTrendData = () => {
    const days = this.reportsService.days();
    return {
      labels: days.map((d) => d.reportDate.slice(5)),
      datasets: [
        { label: 'Sales', data: days.map((d) => d.totalSales), borderColor: '#8b5e34', tension: 0.3 },
        { label: 'Expenses', data: days.map((d) => d.totalExpense), borderColor: '#d32f2f', tension: 0.3 },
        { label: 'Net Income', data: days.map((d) => d.netIncome), borderColor: '#2e7d32', tension: 0.3 }
      ]
    };
  };

  readonly cashVsOnlineData = () => {
    const days = this.reportsService.days();
    return {
      labels: days.map((d) => d.reportDate.slice(5)),
      datasets: [
        { label: 'Cash', data: days.map((d) => d.cashSales), backgroundColor: '#8b5e34' },
        { label: 'Online', data: days.map((d) => d.onlineSales), backgroundColor: '#c9a06a' }
      ]
    };
  };

  readonly expensePieData = () => {
    const breakdown = this.reportsService.expenseBreakdown();
    const palette = ['#8b5e34', '#c9a06a', '#a3785a', '#6b4a2f', '#d9bd9a', '#5a3d24', '#e0c9ac'];
    return {
      labels: breakdown.map((b) => b.categoryName),
      datasets: [{ data: breakdown.map((b) => b.totalAmount), backgroundColor: palette }]
    };
  };

  readonly chartOptions = { plugins: { legend: { position: 'bottom' } }, maintainAspectRatio: false };

  async ngOnInit(): Promise<void> {
    await this.applyPreset();
  }

  async onPresetChange(): Promise<void> {
    if (this.preset() !== 'custom') {
      await this.applyPreset();
    }
  }

  async applyCustomRange(): Promise<void> {
    if (this.customFrom() && this.customTo()) {
      await this.loadRange(toIsoDate(this.customFrom()!), toIsoDate(this.customTo()!));
    }
  }

  private async applyPreset(): Promise<void> {
    const { start, end } = this.resolveRange(this.preset());
    await this.loadRange(start, end);
  }

  private resolveRange(preset: PresetKey): { start: string; end: string } {
    const today = new Date();
    const startOfWeek = (d: Date) => {
      const day = d.getDay(); // 0 = Sunday
      const diff = new Date(d);
      diff.setDate(d.getDate() - day);
      return diff;
    };

    switch (preset) {
      case 'today':
        return { start: toIsoDate(today), end: toIsoDate(today) };
      case 'yesterday': {
        const y = addDays(today, -1);
        return { start: toIsoDate(y), end: toIsoDate(y) };
      }
      case 'thisWeek': {
        const s = startOfWeek(today);
        return { start: toIsoDate(s), end: toIsoDate(today) };
      }
      case 'lastWeek': {
        const s = addDays(startOfWeek(today), -7);
        const e = addDays(s, 6);
        return { start: toIsoDate(s), end: toIsoDate(e) };
      }
      case 'thisMonth': {
        const s = new Date(today.getFullYear(), today.getMonth(), 1);
        return { start: toIsoDate(s), end: toIsoDate(today) };
      }
      case 'lastMonth': {
        const s = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const e = new Date(today.getFullYear(), today.getMonth(), 0);
        return { start: toIsoDate(s), end: toIsoDate(e) };
      }
      default:
        return { start: toIsoDate(today), end: toIsoDate(today) };
    }
  }

  private async loadRange(start: string, end: string): Promise<void> {
    try {
      await this.reportsService.load(start, end);
    } catch (err) {
      this.errorHandler.handle(err, 'Reports');
    }
  }

  exportCsv(): void {
    this.reportsService.exportCsv(`report-${this.preset()}`);
  }
}

function toIsoDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}
