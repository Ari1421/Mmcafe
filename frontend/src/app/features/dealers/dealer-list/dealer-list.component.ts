import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TextareaModule } from 'primeng/textarea';
import { TagModule } from 'primeng/tag';
import { DealerService } from '../dealer.service';
import { Dealer } from '../dealer.model';
import { InrCurrencyPipe } from '../../../shared/pipes/inr-currency.pipe';
import { AuthService } from '../../../core/services/auth.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';

@Component({
  selector: 'app-dealer-list',
  standalone: true,
  imports: [
    ReactiveFormsModule, TableModule, ButtonModule, DialogModule,
    InputTextModule, InputNumberModule, ToggleSwitchModule, TextareaModule, TagModule, InrCurrencyPipe
  ],
  templateUrl: './dealer-list.component.html',
  styleUrl: './dealer-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DealerListComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly errorHandler = inject(ErrorHandlerService);
  private readonly router = inject(Router);
  readonly dealerService = inject(DealerService);
  readonly auth = inject(AuthService);

  readonly dialogOpen = signal(false);
  readonly editing = signal<Dealer | null>(null);
  readonly submitting = signal(false);

  readonly form = this.fb.group({
    name: ['', Validators.required],
    mobile: [''],
    address: [''],
    openingBalance: [0, [Validators.required, Validators.min(0)]],
    active: [true],
    notes: ['']
  });

  async ngOnInit(): Promise<void> {
    await this.reload();
  }

  private async reload(): Promise<void> {
    try {
      await this.dealerService.loadAll();
    } catch (err) {
      this.errorHandler.handle(err, 'Dealers');
    }
  }

  outstandingFor(dealer: Dealer): number {
    return this.dealerService.outstandingFor(dealer.id)?.outstandingBalance ?? dealer.openingBalance;
  }

  openCreate(): void {
    this.editing.set(null);
    this.form.reset({ name: '', mobile: '', address: '', openingBalance: 0, active: true, notes: '' });
    this.dialogOpen.set(true);
  }

  openEdit(dealer: Dealer, event: Event): void {
    event.stopPropagation();
    this.editing.set(dealer);
    this.form.reset({
      name: dealer.name,
      mobile: dealer.mobile ?? '',
      address: dealer.address ?? '',
      openingBalance: dealer.openingBalance,
      active: dealer.active,
      notes: dealer.notes ?? ''
    });
    this.dialogOpen.set(true);
  }

  async save(): Promise<void> {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    const value = this.form.getRawValue() as any;

    try {
      const editing = this.editing();
      if (editing) {
        await this.dealerService.update(editing.id, value);
      } else {
        await this.dealerService.create(value);
      }
      this.errorHandler.success(editing ? 'Dealer updated.' : 'Dealer added.');
      this.dialogOpen.set(false);
    } catch (err) {
      this.errorHandler.handle(err, 'Save Dealer');
    } finally {
      this.submitting.set(false);
    }
  }

  viewDetails(dealer: Dealer): void {
    this.router.navigate(['/dealers', dealer.id]);
  }
}
