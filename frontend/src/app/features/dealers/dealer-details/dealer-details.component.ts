import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TagModule } from 'primeng/tag';
import { DealerService } from '../dealer.service';
import { ProductService } from '../../products/product.service';
import { Dealer } from '../dealer.model';
import { DealerLedgerEntry } from '../dealer-ledger.model';
import { DealerProductRate } from '../dealer-rate.model';
import { PaymentMode } from '../../../core/models/enums';
import { InrCurrencyPipe } from '../../../shared/pipes/inr-currency.pipe';
import { IndiaDatePipe } from '../../../shared/pipes/india-date.pipe';
import { AuthService } from '../../../core/services/auth.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';

@Component({
  selector: 'app-dealer-details',
  standalone: true,
  imports: [
    ReactiveFormsModule, TableModule, ButtonModule, DialogModule, InputTextModule,
    InputNumberModule, SelectModule, DatePickerModule, ToggleSwitchModule, TagModule,
    InrCurrencyPipe, IndiaDatePipe
  ],
  templateUrl: './dealer-details.component.html',
  styleUrl: './dealer-details.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DealerDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly errorHandler = inject(ErrorHandlerService);
  readonly dealerService = inject(DealerService);
  readonly productService = inject(ProductService);
  readonly auth = inject(AuthService);

  readonly dealer = signal<Dealer | null>(null);
  readonly ledger = signal<DealerLedgerEntry[]>([]);
  readonly rates = signal<DealerProductRate[]>([]);
  readonly loading = signal(false);

  readonly paymentDialogOpen = signal(false);
  readonly rateDialogOpen = signal(false);
  readonly submittingPayment = signal(false);
  readonly submittingRate = signal(false);

  readonly paymentModeOptions = [
    { label: 'Cash', value: 'cash' as PaymentMode },
    { label: 'Online', value: 'online' as PaymentMode }
  ];

  readonly paymentForm = this.fb.group({
    paymentDate: [new Date(), Validators.required],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    paymentMode: ['cash' as PaymentMode, Validators.required],
    referenceNumber: [''],
    notes: ['']
  });

  readonly rateForm = this.fb.group({
    productId: ['', Validators.required],
    rate: [0, [Validators.required, Validators.min(0.01)]],
    effectiveFrom: [new Date(), Validators.required],
    active: [true]
  });

  private dealerId!: string;

  async ngOnInit(): Promise<void> {
    this.dealerId = this.route.snapshot.paramMap.get('id')!;
    await Promise.all([this.productService.loadAll(), this.reloadAll()]);
  }

  private async reloadAll(): Promise<void> {
    this.loading.set(true);
    try {
      await this.dealerService.loadAll();
      const dealer = await this.dealerService.getById(this.dealerId);
      this.dealer.set(dealer);
      this.ledger.set(await this.dealerService.getLedger(this.dealerId));
      this.rates.set(await this.dealerService.getRatesForDealer(this.dealerId));
    } catch (err) {
      this.errorHandler.handle(err, 'Dealer Details');
    } finally {
      this.loading.set(false);
    }
  }

  outstanding(): number {
    return this.dealerService.outstandingFor(this.dealerId)?.outstandingBalance
      ?? this.dealer()?.openingBalance ?? 0;
  }

  openPaymentDialog(): void {
    this.paymentForm.reset({
      paymentDate: new Date(), amount: 0, paymentMode: 'cash', referenceNumber: '', notes: ''
    });
    this.paymentDialogOpen.set(true);
  }

  async savePayment(): Promise<void> {
    if (this.paymentForm.invalid || this.submittingPayment()) {
      this.paymentForm.markAllAsTouched();
      return;
    }
    this.submittingPayment.set(true);
    const value = this.paymentForm.getRawValue();
    try {
      await this.dealerService.addPayment({
        dealerId: this.dealerId,
        paymentDate: toIsoDate(value.paymentDate!),
        amount: value.amount!,
        paymentMode: value.paymentMode!,
        referenceNumber: value.referenceNumber,
        notes: value.notes
      });
      this.errorHandler.success('Payment recorded. Dealer balance updated.');
      this.paymentDialogOpen.set(false);
      await this.reloadAll();
    } catch (err) {
      this.errorHandler.handle(err, 'Record Payment');
    } finally {
      this.submittingPayment.set(false);
    }
  }

  openRateDialog(): void {
    this.rateForm.reset({ productId: '', rate: 0, effectiveFrom: new Date(), active: true });
    this.rateDialogOpen.set(true);
  }

  async saveRate(): Promise<void> {
    if (this.rateForm.invalid || this.submittingRate()) {
      this.rateForm.markAllAsTouched();
      return;
    }
    this.submittingRate.set(true);
    const value = this.rateForm.getRawValue();
    try {
      await this.dealerService.addRate({
        dealerId: this.dealerId,
        productId: value.productId!,
        rate: value.rate!,
        effectiveFrom: toIsoDate(value.effectiveFrom!),
        active: value.active!
      });
      this.errorHandler.success('Dealer rate saved. Historical purchases are unaffected.');
      this.rateDialogOpen.set(false);
      this.rates.set(await this.dealerService.getRatesForDealer(this.dealerId));
    } catch (err) {
      this.errorHandler.handle(err, 'Save Rate');
    } finally {
      this.submittingRate.set(false);
    }
  }

  async toggleRateActive(rate: DealerProductRate): Promise<void> {
    try {
      await this.dealerService.setRateActive(rate.id, !rate.active);
      this.rates.set(await this.dealerService.getRatesForDealer(this.dealerId));
    } catch (err) {
      this.errorHandler.handle(err, 'Update Rate');
    }
  }
}

function toIsoDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
