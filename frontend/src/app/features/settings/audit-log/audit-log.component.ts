import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { TagModule } from 'primeng/tag';
import { AuditLogService } from './audit-log.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';

@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [FormsModule, DatePipe, TableModule, SelectModule, DatePickerModule, TagModule],
  templateUrl: './audit-log.component.html',
  styleUrl: './audit-log.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuditLogComponent implements OnInit {
  private readonly errorHandler = inject(ErrorHandlerService);
  readonly auditLogService = inject(AuditLogService);

  readonly entityTypeOptions = [
    { label: 'Sales', value: 'sales' },
    { label: 'Expenses', value: 'expenses' },
    { label: 'Purchases', value: 'purchases' },
    { label: 'Dealer Payments', value: 'dealer_payments' },
    { label: 'Staff', value: 'staff' },
    { label: 'Dealers', value: 'dealers' },
    { label: 'Staff Advances', value: 'staff_advances' },
    { label: 'Salaries', value: 'salaries' },
    { label: 'Daily Closing', value: 'daily_closing' }
  ];

  readonly entityType = signal<string | null>(null);
  readonly dateFrom = signal<Date | null>(null);
  readonly dateTo = signal<Date | null>(null);

  async ngOnInit(): Promise<void> {
    await this.applyFilter();
  }

  async applyFilter(): Promise<void> {
    try {
      await this.auditLogService.load({
        entityType: this.entityType() ?? undefined,
        dateFrom: this.dateFrom() ? toIsoDate(this.dateFrom()!) : undefined,
        dateTo: this.dateTo() ? toIsoDate(this.dateTo()!) : undefined
      });
    } catch (err) {
      this.errorHandler.handle(err, 'Audit Log');
    }
  }

  severityFor(action: string): 'success' | 'info' | 'warn' | 'secondary' | 'contrast' | 'danger' {
    if (action === 'deleted') return 'danger';
    if (action === 'created') return 'success';
    if (action === 'day_closed' || action === 'salary_paid') return 'info';
    return 'warn';
  }
}

function toIsoDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
