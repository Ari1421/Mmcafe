import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { SelectModule } from 'primeng/select';
import { SettingsService } from '../../core/services/settings.service';
import { ErrorHandlerService } from '../../core/services/error-handler.service';

@Component({
  selector: 'app-settings-form',
  standalone: true,
  imports: [
    ReactiveFormsModule, FormsModule, RouterLink, ButtonModule, InputTextModule,
    InputNumberModule, ToggleSwitchModule, SelectModule
  ],
  templateUrl: './settings-form.component.html',
  styleUrl: './settings-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly settingsService = inject(SettingsService);
  private readonly errorHandler = inject(ErrorHandlerService);

  readonly loading = signal(false);
  readonly submitting = signal(false);

  // Kept short deliberately — PrimeNG's select label doesn't truncate long
  // text on its own, and a disabled single-option dropdown doesn't need the
  // full explanation inline anyway. The full explanation is in the hint
  // paragraph below the field instead (see the template).
  readonly calculationMethodOptions = [
    { label: 'Daily Rate', value: 'daily_rate' }
  ];

  readonly form = this.fb.group({
    cafeName: ['', Validators.required],
    address: [''],
    phone: [''],
    gstNumber: [''],
    defaultMilkPrice: [0, [Validators.required, Validators.min(0)]],
    defaultCurdPrice: [0, [Validators.required, Validators.min(0)]],
    allowPreviousDateEditing: [true],
    allowMultipleDailySalesEntries: [false],
    requireDailyClosing: [false],
    weeklyOffPaid: [true],
    halfDayFactor: [0.5, [Validators.min(0), Validators.max(1)]],
    paidLeaveCountsAsPresent: [true]
  });

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    try {
      const s = await this.settingsService.load();
      this.form.reset({
        cafeName: s.cafeName,
        address: s.address ?? '',
        phone: s.phone ?? '',
        gstNumber: s.gstNumber ?? '',
        defaultMilkPrice: s.defaultMilkPrice,
        defaultCurdPrice: s.defaultCurdPrice,
        allowPreviousDateEditing: s.allowPreviousDateEditing,
        allowMultipleDailySalesEntries: s.allowMultipleDailySalesEntries,
        requireDailyClosing: s.requireDailyClosing,
        weeklyOffPaid: s.salarySettings?.weekly_off_paid ?? true,
        halfDayFactor: s.salarySettings?.half_day_factor ?? 0.5,
        paidLeaveCountsAsPresent: s.salarySettings?.paid_leave_counts_as_present ?? true
      });
    } catch (err) {
      this.errorHandler.handle(err, 'Settings');
    } finally {
      this.loading.set(false);
    }
  }

  async save(): Promise<void> {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    const v = this.form.getRawValue();

    try {
      await this.settingsService.update({
        cafeName: v.cafeName!,
        address: v.address,
        phone: v.phone,
        gstNumber: v.gstNumber,
        defaultMilkPrice: v.defaultMilkPrice!,
        defaultCurdPrice: v.defaultCurdPrice!,
        allowPreviousDateEditing: v.allowPreviousDateEditing!,
        allowMultipleDailySalesEntries: v.allowMultipleDailySalesEntries!,
        requireDailyClosing: v.requireDailyClosing!,
        salarySettings: {
          calculation_method: 'daily_rate',
          weekly_off_paid: v.weeklyOffPaid!,
          half_day_factor: v.halfDayFactor!,
          paid_leave_counts_as_present: v.paidLeaveCountsAsPresent!
        }
      });
      this.errorHandler.success('Settings saved.');
    } catch (err) {
      this.errorHandler.handle(err, 'Save Settings');
    } finally {
      this.submitting.set(false);
    }
  }
}
