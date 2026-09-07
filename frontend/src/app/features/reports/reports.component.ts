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

// See dashboard.component.ts for how these are validated (dataviz skill):
// green/orange/blue is a 3-slot categorical set that passes, with Expenses
// getting a dashed stroke as the required secondary encoding for its 6-8
// band CVD warning against green. The expense-category pie caps at 3
// distinct hues + a neutral "Other" bucket for the same reason.
const COLOR_SALES = '#059669';
const COLOR_EXPENSE = '#eb6834';
const COLOR_NET = '#2a78d6';
const COLOR_ONLINE = '#2a78d6';
const CATEGORY_COLORS = ['#2a78d6', '#eb6834', '#1baf7a'];
const COLOR_OTHER = '#9c9c96';

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
        { label: 'Sales', data: days.map((d) => d.totalSales), borderColor: COLOR_SALES, tension: 0.3 },
        // Dashed: required secondary encoding for the green/orange CVD warning pair.
        { label: 'Expenses', data: days.map((d) => d.totalExpense), borderColor: COLOR_EXPENSE, borderDash: [6, 4], tension: 0.3 },
        { label: 'Net Income', data: days.map((d) => d.netIncome), borderColor: COLOR_NET, tension: 0.3 }
      ]
    };
  };

  readonly cashVsOnlineData = () => {
    const days = this.reportsService.days();
    return {
      labels: days.map((d) => d.reportDate.slice(5)),
      datasets: [
        { label: 'Cash', data: days.map((d) => d.cashSales), backgroundColor: COLOR_SALES },
        { label: 'Online', data: days.map((d) => d.onlineSales), backgroundColor: COLOR_ONLINE }
      ]
    };
  };

  readonly expensePieData = () => {
    // A pie's slices can end up adjacent in any order, so this is validated
    // under "all pairs" rather than a fixed sequence — only the palette's
    // first 3 categorical hues clear that bar. Categories beyond the top 3
    // (by amount) fold into one neutral "Other" slice instead of getting a
    // 4th+ hue that can't reliably be told apart.
    const breakdown = [...this.reportsService.expenseBreakdown()].sort((a, b) => b.totalAmount - a.totalAmount);
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
