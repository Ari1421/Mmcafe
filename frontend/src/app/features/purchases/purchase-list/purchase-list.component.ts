import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { PurchaseService, PurchaseFilter } from '../purchase.service';
import { DealerService } from '../../dealers/dealer.service';
import { ProductService } from '../../products/product.service';
import { InrCurrencyPipe } from '../../../shared/pipes/inr-currency.pipe';
import { IndiaDatePipe } from '../../../shared/pipes/india-date.pipe';
import { AuthService } from '../../../core/services/auth.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';

@Component({
  selector: 'app-purchase-list',
  standalone: true,
  imports: [
    FormsModule, TableModule, ButtonModule, SelectModule, DatePickerModule,
    ConfirmDialogModule, InrCurrencyPipe, IndiaDatePipe
  ],
  providers: [ConfirmationService],
  templateUrl: './purchase-list.component.html',
  styleUrl: './purchase-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PurchaseListComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly confirmation = inject(ConfirmationService);
  private readonly errorHandler = inject(ErrorHandlerService);
  readonly purchaseService = inject(PurchaseService);
  readonly dealerService = inject(DealerService);
  readonly productService = inject(ProductService);
  readonly auth = inject(AuthService);

  readonly dateFrom = signal<Date | null>(null);
  readonly dateTo = signal<Date | null>(null);
  readonly dealerId = signal<string | null>(null);
  readonly productId = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.dealerService.loadAll(),
      this.productService.loadAll(),
      this.applyFilter()
    ]);
  }

  async applyFilter(): Promise<void> {
    const filter: PurchaseFilter = {
      dateFrom: this.dateFrom() ? toIsoDate(this.dateFrom()!) : undefined,
      dateTo: this.dateTo() ? toIsoDate(this.dateTo()!) : undefined,
      dealerId: this.dealerId() ?? undefined,
      productId: this.productId() ?? undefined
    };
    try {
      await this.purchaseService.load(filter);
    } catch (err) {
      this.errorHandler.handle(err, 'Purchases');
    }
  }

  addPurchase(): void {
    this.router.navigate(['/purchases/new']);
  }

  editPurchase(id: string): void {
    this.router.navigate(['/purchases', id, 'edit']);
  }

  confirmDelete(id: string, event: Event): void {
    event.stopPropagation();
    this.confirmation.confirm({
      message: 'Delete this purchase record? This cannot be undone.',
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: async () => {
        try {
          await this.purchaseService.delete(id);
          this.errorHandler.success('Purchase deleted.');
        } catch (err) {
          this.errorHandler.handle(err, 'Delete Purchase');
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
