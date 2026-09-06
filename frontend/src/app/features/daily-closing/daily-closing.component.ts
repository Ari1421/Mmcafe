import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DailyClosingService } from './daily-closing.service';
import { DailyCashFlow } from './daily-closing.model';
import { InrCurrencyPipe } from '../../shared/pipes/inr-currency.pipe';
import { AuthService } from '../../core/services/auth.service';
import { ErrorHandlerService } from '../../core/services/error-handler.service';

@Component({
  selector: 'app-daily-closing',
  standalone: true,
  imports: [
    FormsModule, DatePickerModule, InputNumberModule, TextareaModule, ButtonModule,
    TagModule, ConfirmDialogModule, InrCurrencyPipe
  ],
  providers: [ConfirmationService],
  templateUrl: './daily-closing.component.html',
  styleUrl: './daily-closing.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DailyClosingComponent implements OnInit {
  private readonly service = inject(DailyClosingService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly errorHandler = inject(ErrorHandlerService);
  readonly auth = inject(AuthService);

  readonly selectedDate = signal<Date>(new Date());
  readonly cashFlow = signal<DailyCashFlow | null>(null);
  readonly openingCash = signal(0);
  readonly actualCash = signal<number | null>(null);
  readonly notes = signal('');
  readonly isClosed = signal(false);
  readonly loading = signal(false);
  readonly saving = signal(false);

  expectedCash(): number {
    const cf = this.cashFlow();
    if (!cf) return 0;
    return this.openingCash() + cf.cashSales - cf.cashExpenses - cf.otherCashOut;
  }

  difference(): number | null {
    const actual = this.actualCash();
    if (actual === null) return null;
    return round2(actual - this.expectedCash());
  }

  async ngOnInit(): Promise<void> {
    await this.loadDay();
  }

  async loadDay(): Promise<void> {
    this.loading.set(true);
    const date = toIsoDate(this.selectedDate());
    try {
      const [cashFlow, existing, previousCash] = await Promise.all([
        this.service.getCashFlow(date),
        this.service.getForDate(date),
        this.service.getPreviousClosingCash(date)
      ]);
      this.cashFlow.set(cashFlow);

      if (existing) {
        this.openingCash.set(existing.openingCash);
        this.actualCash.set(existing.actualCash);
        this.notes.set(existing.notes ?? '');
        this.isClosed.set(existing.isClosed);
      } else {
        this.openingCash.set(previousCash);
        this.actualCash.set(null);
        this.notes.set('');
        this.isClosed.set(false);
      }
    } catch (err) {
      this.errorHandler.handle(err, 'Daily Closing');
    } finally {
      this.loading.set(false);
    }
  }

  async saveDraft(): Promise<void> {
    const cf = this.cashFlow();
    if (!cf || this.saving()) return;
    this.saving.set(true);
    try {
      await this.service.saveDraft(
        toIsoDate(this.selectedDate()),
        this.openingCash(),
        cf,
        this.actualCash(),
        this.notes() || null
      );
      this.errorHandler.success('Daily closing draft saved.');
    } catch (err) {
      this.errorHandler.handle(err, 'Save Daily Closing');
    } finally {
      this.saving.set(false);
    }
  }

  confirmClose(): void {
    this.confirmation.confirm({
      message: 'Close this business day? Normal staff will no longer be able to edit transactions for this date.',
      header: 'Close Day',
      icon: 'pi pi-lock',
      accept: async () => {
        try {
          await this.saveDraft();
          await this.service.closeDay(toIsoDate(this.selectedDate()));
          this.isClosed.set(true);
          this.errorHandler.success('Day closed.');
        } catch (err) {
          this.errorHandler.handle(err, 'Close Day');
        }
      }
    });
  }

  confirmReopen(): void {
    this.confirmation.confirm({
      message: 'Reopen this day for editing? Only Admin can do this.',
      header: 'Reopen Day',
      icon: 'pi pi-lock-open',
      accept: async () => {
        try {
          await this.service.reopenDay(toIsoDate(this.selectedDate()));
          this.isClosed.set(false);
          this.errorHandler.success('Day reopened.');
        } catch (err) {
          this.errorHandler.handle(err, 'Reopen Day');
        }
      }
    });
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function toIsoDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
