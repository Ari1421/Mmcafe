import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SalesService, SalesFilter } from '../sales.service';
import { InrCurrencyPipe } from '../../../shared/pipes/inr-currency.pipe';
import { IndiaDatePipe } from '../../../shared/pipes/india-date.pipe';
import { AuthService } from '../../../core/services/auth.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';

@Component({
  selector: 'app-sales-list',
  standalone: true,
  imports: [
    FormsModule, TableModule, ButtonModule, DatePickerModule, InputTextModule,
    ConfirmDialogModule, InrCurrencyPipe, IndiaDatePipe
  ],
  providers: [ConfirmationService],
  templateUrl: './sales-list.component.html',
  styleUrl: './sales-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SalesListComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly confirmation = inject(ConfirmationService);
  private readonly errorHandler = inject(ErrorHandlerService);
  readonly salesService = inject(SalesService);
  readonly auth = inject(AuthService);

  // Default to "this month" instead of no filter at all — sales grow by one
  // row a day forever, so an unfiltered load was fetching the entire
  // history of the cafe every time this page opened, and getting slower
  // every month. Users can still widen/clear the date pickers manually.
  readonly dateFrom = signal<Date | null>(startOfMonth(new Date()));
  readonly dateTo = signal<Date | null>(null);
  readonly search = signal('');

  async ngOnInit(): Promise<void> {
    await this.applyFilter();
  }

  async applyFilter(): Promise<void> {
    const filter: SalesFilter = {
      dateFrom: this.dateFrom() ? toIsoDate(this.dateFrom()!) : undefined,
      dateTo: this.dateTo() ? toIsoDate(this.dateTo()!) : undefined,
      search: this.search() || undefined
    };
    try {
      await this.salesService.load(filter);
    } catch (err) {
      this.errorHandler.handle(err, 'Sales');
    }
  }

  addSale(): void {
    this.router.navigate(['/sales/new']);
  }

  editSale(id: string): void {
    this.router.navigate(['/sales', id, 'edit']);
  }

  confirmDelete(id: string, event: Event): void {
    event.stopPropagation();
    this.confirmation.confirm({
      message: 'Delete this sales entry? This cannot be undone.',
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: async () => {
        try {
          await this.salesService.delete(id);
          await this.applyFilter();
          this.errorHandler.success('Sales entry deleted.');
        } catch (err) {
          this.errorHandler.handle(err, 'Delete Sales Entry');
        }
      }
    });
  }
}

function toIsoDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
