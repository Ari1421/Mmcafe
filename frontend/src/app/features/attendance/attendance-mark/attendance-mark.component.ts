import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { AttendanceService } from '../attendance.service';
import { SettingsService } from '../../../core/services/settings.service';
import { AttendanceRowForDate } from '../attendance.model';
import { AttendanceStatus, ATTENDANCE_STATUS_LABELS } from '../../../core/models/enums';
import { AuthService } from '../../../core/services/auth.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';

interface EditableRow extends AttendanceRowForDate {
  currentStatus: AttendanceStatus;
}

@Component({
  selector: 'app-attendance-mark',
  standalone: true,
  imports: [FormsModule, DatePickerModule, ButtonModule, SelectModule, TableModule],
  templateUrl: './attendance-mark.component.html',
  styleUrl: './attendance-mark.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AttendanceMarkComponent implements OnInit {
  private readonly attendanceService = inject(AttendanceService);
  private readonly settingsService = inject(SettingsService);
  private readonly errorHandler = inject(ErrorHandlerService);
  readonly auth = inject(AuthService);

  readonly selectedDate = signal<Date>(new Date());
  readonly rows = signal<EditableRow[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly allowPreviousDateEditing = signal(true);

  readonly statusOptions = (Object.keys(ATTENDANCE_STATUS_LABELS) as AttendanceStatus[]).map((value) => ({
    label: ATTENDANCE_STATUS_LABELS[value],
    value
  }));

  readonly isPastDate = computed(() => {
    const d = this.selectedDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const check = new Date(d);
    check.setHours(0, 0, 0, 0);
    return check.getTime() < today.getTime();
  });

  readonly canEdit = computed(() => {
    if (!this.isPastDate()) return true;
    return this.auth.isAdmin() || this.allowPreviousDateEditing();
  });

  async ngOnInit(): Promise<void> {
    try {
      const settings = await this.settingsService.load();
      this.allowPreviousDateEditing.set(settings.allowPreviousDateEditing);
    } catch {
      // Settings not critical here — default stays permissive if the load fails.
    }
    await this.loadDay();
  }

  async loadDay(): Promise<void> {
    this.loading.set(true);
    try {
      const data = await this.attendanceService.getForDate(toIsoDate(this.selectedDate()));
      this.rows.set(
        data.map((r) => ({ ...r, currentStatus: r.status ?? 'present' }))
      );
    } catch (err) {
      this.errorHandler.handle(err, 'Attendance');
    } finally {
      this.loading.set(false);
    }
  }

  setStatus(row: EditableRow, status: AttendanceStatus): void {
    this.rows.update((rows) =>
      rows.map((r) => (r.staffId === row.staffId ? { ...r, currentStatus: status } : r))
    );
  }

  markAllPresent(): void {
    this.rows.update((rows) => rows.map((r) => ({ ...r, currentStatus: 'present' })));
  }

  async save(): Promise<void> {
    if (this.saving() || !this.canEdit()) return;
    this.saving.set(true);
    try {
      await this.attendanceService.saveDay(
        toIsoDate(this.selectedDate()),
        this.rows().map((r) => ({ staffId: r.staffId, status: r.currentStatus }))
      );
      this.errorHandler.success('Attendance saved for ' + toIsoDate(this.selectedDate()));
    } catch (err) {
      this.errorHandler.handle(err, 'Save Attendance');
    } finally {
      this.saving.set(false);
    }
  }
}

function toIsoDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
