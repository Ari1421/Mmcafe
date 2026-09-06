export interface Dealer {
  id: string;
  name: string;
  mobile: string | null;
  address: string | null;
  openingBalance: number;
  active: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DealerFormValue {
  name: string;
  mobile?: string | null;
  address?: string | null;
  openingBalance: number;
  active: boolean;
  notes?: string | null;
}

export interface DealerOutstanding {
  dealerId: string;
  dealerName: string;
  openingBalance: number;
  totalCreditPurchases: number;
  totalPayments: number;
  outstandingBalance: number;
}

export function mapDealerRow(row: any): Dealer {
  return {
    id: row.id,
    name: row.name,
    mobile: row.mobile,
    address: row.address,
    openingBalance: Number(row.opening_balance),
    active: row.active,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function toDealerInsert(value: DealerFormValue) {
  return {
    name: value.name,
    mobile: value.mobile ?? null,
    address: value.address ?? null,
    opening_balance: value.openingBalance,
    active: value.active,
    notes: value.notes ?? null
  };
}

export function mapDealerOutstandingRow(row: any): DealerOutstanding {
  return {
    dealerId: row.dealer_id,
    dealerName: row.dealer_name,
    openingBalance: Number(row.opening_balance),
    totalCreditPurchases: Number(row.total_credit_purchases),
    totalPayments: Number(row.total_payments),
    outstandingBalance: Number(row.outstanding_balance)
  };
}
