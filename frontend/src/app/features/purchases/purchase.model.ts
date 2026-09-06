import { PurchasePaymentType } from '../../core/models/enums';

export interface Purchase {
  id: string;
  purchaseDate: string;
  dealerId: string;
  dealerName?: string;
  productId: string;
  productName?: string;
  quantity: number;
  unit: string;
  rate: number;
  totalAmount: number;
  paymentType: PurchasePaymentType;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseFormValue {
  purchaseDate: string;
  dealerId: string;
  productId: string;
  quantity: number;
  unit: string;
  rate: number;
  paymentType: PurchasePaymentType;
  notes?: string | null;
}

export function mapPurchaseRow(row: any): Purchase {
  return {
    id: row.id,
    purchaseDate: row.purchase_date,
    dealerId: row.dealer_id,
    dealerName: row.dealers?.name,
    productId: row.product_id,
    productName: row.products?.name,
    quantity: Number(row.quantity),
    unit: row.unit,
    rate: Number(row.rate),
    totalAmount: Number(row.total_amount),
    paymentType: row.payment_type,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function toPurchaseInsert(value: PurchaseFormValue, createdBy: string | null) {
  return {
    purchase_date: value.purchaseDate,
    dealer_id: value.dealerId,
    product_id: value.productId,
    quantity: value.quantity,
    unit: value.unit,
    rate: value.rate,
    payment_type: value.paymentType,
    notes: value.notes ?? null,
    created_by: createdBy
  };
}

export function toPurchaseUpdate(value: PurchaseFormValue) {
  return {
    purchase_date: value.purchaseDate,
    dealer_id: value.dealerId,
    product_id: value.productId,
    quantity: value.quantity,
    unit: value.unit,
    rate: value.rate,
    payment_type: value.paymentType,
    notes: value.notes ?? null
  };
}
