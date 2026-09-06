import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { TextareaModule } from 'primeng/textarea';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ExpenseService, ExpenseFilter } from '../expense.service';
import { ExpenseCategoryService } from '../expense-category.service';
import { Expense } from '../expense.model';
import { PaymentMode } from '../../../core/models/enums';
import { InrCurrencyPipe } from '../../../shared/pipes/inr-currency.pipe';
import { IndiaDatePipe } from '../../../shared/pipes/india-date.pipe';
import { AuthService } from '../../../core/services/auth.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';

@Component({
  selector: 'app-expense-list',
  standalone: true,
  imports: [
    ReactiveFormsModule, FormsModule, RouterLink, TableModule, ButtonModule, DialogModule,
    InputTextModule, InputNumberModule, SelectModule, DatePickerModule, TextareaModule,
    ConfirmDialogModule, InrCurrencyPipe, IndiaDatePipe
  ],
  providers: [ConfirmationService],
  templateUrl: './expense-list.component.html',
  styleUrl: './expense-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExpenseListComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly confirmation = inject(ConfirmationService);
  private readonly errorHandler = inject(ErrorHandlerService);
  readonly expenseService = inject(ExpenseService);
  readonly categoryService = inject(ExpenseCategoryService);
  readonly auth = inject(AuthService);

  // Default to "this month" instead of no filter — expenses grow forever,
  // so an unfiltered load was fetching the entire expense history every
  // time this page opened. Users can still widen/clear the date pickers
  // manually.
  readonly dateFrom = signal<Date | null>(startOfMonth(new Date()));
  readonly dateTo = signal<Date | null>(null);
  readonly categoryId = signal<string | null>(null);
  readonly paymentMode = signal<PaymentMode | null>(null);
  readonly search = signal('');

  readonly paymentModeOptions = [
    { label: 'Cash', value: 'cash' as PaymentMode },
    { label: 'Online', value: 'online' as PaymentMode }
  ];

  readonly dialogOpen = signal(false);
  readonly editing = signal<Expense | null>(null);
  readonly submitting = signal(false);

  readonly form = this.fb.group({
    expenseDate: [new Date(), Validators.required],
    categoryId: ['', Validators.required],
    description: [''],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    paymentMode: ['cash' as PaymentMode, Validators.required],
    notes: ['']
  });

  async ngOnInit(): Promise<void> {
    await Promise.all([this.categoryService.loadAll(), this.applyFilter()]);
  }

  async applyFilter(): Promise<void> {
    const filter: ExpenseFilter = {
      dateFrom: this.dateFrom() ? toIsoDate(this.dateFrom()!) : undefined,
      dateTo: this.dateTo() ? toIsoDate(this.dateTo()!) : undefined,
      categoryId: this.categoryId() ?? undefined,
      paymentMode: this.paymentMode() ?? undefined,
      search: this.search() || undefined
    };
    try {
      await this.expenseService.load(filter);
    } catch (err) {
      this.errorHandler.handle(err, 'Expenses');
    }
  }

  openCreate(): void {
    this.editing.set(null);
    this.form.reset({
      expenseDate: new Date(), categoryId: '', description: '', amount: 0, paymentMode: 'cash', notes: ''
    });
    this.dialogOpen.set(true);
  }

  openEdit(expense: Expense): void {
    this.editing.set(expense);
    this.form.reset({
      expenseDate: new Date(expense.expenseDate),
      categoryId: expense.categoryId,
      description: expense.description ?? '',
      amount: expense.amount,
      paymentMode: expense.paymentMode,
      notes: expense.notes ?? ''
    });
    this.dialogOpen.set(true);
  }

  async save(): Promise<void> {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    const raw = this.form.getRawValue();
    const value = { ...raw, expenseDate: toIsoDate(raw.expenseDate!) } as any;

    try {
      const editing = this.editing();
      if (editing) {
        await this.expenseService.update(editing.id, value);
      } else {
        await this.expenseService.create(value);
      }
      this.errorHandler.success(editing ? 'Expense updated.' : 'Expense recorded.');
      this.dialogOpen.set(false);
      await this.applyFilter();
    } catch (err) {
      this.errorHandler.handle(err, 'Save Expense');
    } finally {
      this.submitting.set(false);
    }
  }

  confirmDelete(id: string, event: Event): void {
    event.stopPropagation();
    this.confirmation.confirm({
      message: 'Delete this expense? This cannot be undone.',
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: async () => {
        try {
          await this.expenseService.delete(id);
          await this.applyFilter();
          this.errorHandler.success('Expense deleted.');
        } catch (err) {
          this.errorHandler.handle(err, 'Delete Expense');
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
