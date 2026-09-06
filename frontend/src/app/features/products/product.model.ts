export interface Product {
  id: string;
  name: string;
  unit: string;
  defaultRate: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductFormValue {
  name: string;
  unit: string;
  defaultRate: number;
  active: boolean;
}

export function mapProductRow(row: any): Product {
  return {
    id: row.id,
    name: row.name,
    unit: row.unit,
    defaultRate: Number(row.default_rate),
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function toProductInsert(value: ProductFormValue) {
  return {
    name: value.name,
    unit: value.unit,
    default_rate: value.defaultRate,
    active: value.active
  };
}
