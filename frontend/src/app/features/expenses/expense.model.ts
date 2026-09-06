import { PaymentMode } from '../../core/models/enums';

export interface Expense {
  id: string;
  expenseDate: string;
  categoryId: string;
  categoryName?: string;
  description: string | null;
  amount: number;
  paymentMode: PaymentMode;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseFormValue {
  expenseDate: string;
  categoryId: string;
  description?: string | null;
  amount: number;
  paymentMode: PaymentMode;
  notes?: string | null;
}

export function mapExpenseRow(row: any): Expense {
  return {
    id: row.id,
    expenseDate: row.expense_date,
    categoryId: row.category_id,
    categoryName: row.expense_categories?.name,
    description: row.description,
    amount: Number(row.amount),
    paymentMode: row.payment_mode,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function toExpenseInsert(value: ExpenseFormValue, createdBy: string | null) {
  return {
    expense_date: value.expenseDate,
    category_id: value.categoryId,
    description: value.description ?? null,
    amount: value.amount,
    payment_mode: value.paymentMode,
    notes: value.notes ?? null,
    created_by: createdBy
  };
}

export function toExpenseUpdate(value: ExpenseFormValue) {
  return {
    expense_date: value.expenseDate,
    category_id: value.categoryId,
    description: value.description ?? null,
    amount: value.amount,
    payment_mode: value.paymentMode,
    notes: value.notes ?? null
  };
}
