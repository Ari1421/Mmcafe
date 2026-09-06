export interface SaleRecord {
  id: string;
  saleDate: string;
  cashAmount: number;
  onlineAmount: number;
  totalAmount: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SaleFormValue {
  saleDate: string;
  cashAmount: number;
  onlineAmount: number;
  notes?: string | null;
}

export function mapSaleRow(row: any): SaleRecord {
  return {
    id: row.id,
    saleDate: row.sale_date,
    cashAmount: Number(row.cash_amount),
    onlineAmount: Number(row.online_amount),
    totalAmount: Number(row.total_amount),
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function toSaleInsert(value: SaleFormValue, createdBy: string | null) {
  return {
    sale_date: value.saleDate,
    cash_amount: value.cashAmount,
    online_amount: value.onlineAmount,
    notes: value.notes ?? null,
    created_by: createdBy
  };
}

export function toSaleUpdate(value: SaleFormValue) {
  return {
    sale_date: value.saleDate,
    cash_amount: value.cashAmount,
    online_amount: value.onlineAmount,
    notes: value.notes ?? null
  };
}
