import { PaymentMode, SalaryPaymentStatus } from '../../core/models/enums';

export interface Salary {
  id: string;
  staffId: string;
  staffName?: string;
  salaryMonth: string; // stored as first-of-month date
  baseSalary: number;
  workingDays: number;
  presentDays: number;
  absentDays: number;
  halfDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  deduction: number;
  advanceDeduction: number;
  bonus: number;
  adjustment: number;
  finalSalary: number;
  paymentStatus: SalaryPaymentStatus;
  paymentDate: string | null;
  paymentMode: PaymentMode | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SalarySaveValue {
  staffId: string;
  salaryMonth: string;
  baseSalary: number;
  workingDays: number;
  presentDays: number;
  absentDays: number;
  halfDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  deduction: number;
  advanceDeduction: number;
  bonus: number;
  adjustment: number;
  finalSalary: number;
  paymentStatus: SalaryPaymentStatus;
  paymentDate?: string | null;
  paymentMode?: PaymentMode | null;
  notes?: string | null;
}

export function mapSalaryRow(row: any): Salary {
  return {
    id: row.id,
    staffId: row.staff_id,
    staffName: row.staff?.name,
    salaryMonth: row.salary_month,
    baseSalary: Number(row.base_salary),
    workingDays: Number(row.working_days),
    presentDays: Number(row.present_days),
    absentDays: Number(row.absent_days),
    halfDays: Number(row.half_days),
    paidLeaveDays: Number(row.paid_leave_days),
    unpaidLeaveDays: Number(row.unpaid_leave_days),
    deduction: Number(row.deduction),
    advanceDeduction: Number(row.advance_deduction),
    bonus: Number(row.bonus),
    adjustment: Number(row.adjustment),
    finalSalary: Number(row.final_salary),
    paymentStatus: row.payment_status,
    paymentDate: row.payment_date,
    paymentMode: row.payment_mode,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function toSalaryUpsert(value: SalarySaveValue) {
  return {
    staff_id: value.staffId,
    salary_month: value.salaryMonth,
    base_salary: value.baseSalary,
    working_days: value.workingDays,
    present_days: value.presentDays,
    absent_days: value.absentDays,
    half_days: value.halfDays,
    paid_leave_days: value.paidLeaveDays,
    unpaid_leave_days: value.unpaidLeaveDays,
    deduction: value.deduction,
    advance_deduction: value.advanceDeduction,
    bonus: value.bonus,
    adjustment: value.adjustment,
    final_salary: value.finalSalary,
    payment_status: value.paymentStatus,
    payment_date: value.paymentDate ?? null,
    payment_mode: value.paymentMode ?? null,
    notes: value.notes ?? null
  };
}
