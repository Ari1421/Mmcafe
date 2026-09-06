export interface DailyClosing {
  id: string;
  closingDate: string;
  openingCash: number;
  cashSales: number;
  cashExpenses: number;
  otherCashOut: number;
  expectedCash: number;
  actualCash: number | null;
  difference: number | null;
  notes: string | null;
  closedBy: string | null;
  closedAt: string | null;
  isClosed: boolean;
}

export interface DailyCashFlow {
  cashSales: number;
  cashExpenses: number;
  dealerCashPayments: number;
  staffCashAdvances: number;
  staffCashSalary: number;
  otherCashOut: number;
}

export function mapDailyClosingRow(row: any): DailyClosing {
  return {
    id: row.id,
    closingDate: row.closing_date,
    openingCash: Number(row.opening_cash),
    cashSales: Number(row.cash_sales),
    cashExpenses: Number(row.cash_expenses),
    otherCashOut: Number(row.other_cash_out),
    expectedCash: Number(row.expected_cash),
    actualCash: row.actual_cash !== null ? Number(row.actual_cash) : null,
    difference: row.difference !== null ? Number(row.difference) : null,
    notes: row.notes,
    closedBy: row.closed_by,
    closedAt: row.closed_at,
    isClosed: row.is_closed
  };
}

export function mapDailyCashFlow(row: any): DailyCashFlow {
  return {
    cashSales: Number(row.cash_sales),
    cashExpenses: Number(row.cash_expenses),
    dealerCashPayments: Number(row.dealer_cash_payments),
    staffCashAdvances: Number(row.staff_cash_advances),
    staffCashSalary: Number(row.staff_cash_salary),
    otherCashOut: Number(row.other_cash_out)
  };
}
