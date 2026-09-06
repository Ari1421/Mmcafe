// Mirrors PostgreSQL enum types 1:1 so the frontend and DB never drift.

export type UserRole = 'admin' | 'staff';

export type PaymentMode = 'cash' | 'online';

export type PurchasePaymentType = 'credit' | 'cash' | 'online';

export type AttendanceStatus =
  | 'present'
  | 'absent'
  | 'half_day'
  | 'paid_leave'
  | 'unpaid_leave'
  | 'weekly_off';

export type SalaryType = 'monthly' | 'daily';

export type SalaryPaymentStatus = 'pending' | 'partially_paid' | 'paid';

export type AuditAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'day_closed'
  | 'day_reopened'
  | 'salary_paid'
  | 'dealer_payment_added';

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: 'Present',
  absent: 'Absent',
  half_day: 'Half Day',
  paid_leave: 'Paid Leave',
  unpaid_leave: 'Unpaid Leave',
  weekly_off: 'Weekly Off'
};

export const PAYMENT_MODE_LABELS: Record<PaymentMode, string> = {
  cash: 'Cash',
  online: 'Online'
};
