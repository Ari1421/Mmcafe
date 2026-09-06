import { PaymentMode } from '../../core/models/enums';

export interface DealerPayment {
  id: string;
  dealerId: string;
  paymentDate: string;
  amount: number;
  paymentMode: PaymentMode;
  referenceNumber: string | null;
  notes: string | null;
  createdAt: string;
}

export interface DealerPaymentFormValue {
  dealerId: string;
  paymentDate: string;
  amount: number;
  paymentMode: PaymentMode;
  referenceNumber?: string | null;
  notes?: string | null;
}

export function toDealerPaymentInsert(value: DealerPaymentFormValue, createdBy: string | null) {
  return {
    dealer_id: value.dealerId,
    payment_date: value.paymentDate,
    amount: value.amount,
    payment_mode: value.paymentMode,
    reference_number: value.referenceNumber ?? null,
    notes: value.notes ?? null,
    created_by: createdBy
  };
}
