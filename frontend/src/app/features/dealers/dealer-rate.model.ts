export interface DealerProductRate {
  id: string;
  dealerId: string;
  productId: string;
  productName?: string;
  rate: number;
  effectiveFrom: string;
  active: boolean;
  createdAt: string;
}

export interface DealerProductRateFormValue {
  dealerId: string;
  productId: string;
  rate: number;
  effectiveFrom: string;
  active: boolean;
}

export function mapDealerRateRow(row: any): DealerProductRate {
  return {
    id: row.id,
    dealerId: row.dealer_id,
    productId: row.product_id,
    productName: row.products?.name,
    rate: Number(row.rate),
    effectiveFrom: row.effective_from,
    active: row.active,
    createdAt: row.created_at
  };
}

export function toDealerRateInsert(value: DealerProductRateFormValue) {
  return {
    dealer_id: value.dealerId,
    product_id: value.productId,
    rate: value.rate,
    effective_from: value.effectiveFrom,
    active: value.active
  };
}
