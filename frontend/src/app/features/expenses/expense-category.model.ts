export interface ExpenseCategory {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export function mapExpenseCategoryRow(row: any): ExpenseCategory {
  return {
    id: row.id,
    name: row.name,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
