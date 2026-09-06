import { PaymentMode } from '../../core/models/enums';

export interface StaffAdvance {
  id: string;
  staffId: string;
  advanceDate: string;
  amount: number;
  paymentMode: PaymentMode;
  notes: string | null;
  createdAt: string;
}

export interface StaffAdvanceFormValue {
  staffId: string;
  advanceDate: string;
  amount: number;
  paymentMode: PaymentMode;
  notes?: string | null;
}

export function mapStaffAdvanceRow(row: any): StaffAdvance {
  return {
    id: row.id,
    staffId: row.staff_id,
    advanceDate: row.advance_date,
    amount: Number(row.amount),
    paymentMode: row.payment_mode,
    notes: row.notes,
    createdAt: row.created_at
  };
}

export function toStaffAdvanceInsert(value: StaffAdvanceFormValue, createdBy: string | null) {
  return {
    staff_id: value.staffId,
    advance_date: value.advanceDate,
    amount: value.amount,
    payment_mode: value.paymentMode,
    notes: value.notes ?? null,
    created_by: createdBy
  };
}
