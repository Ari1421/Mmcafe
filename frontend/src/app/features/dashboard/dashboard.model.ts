export interface DashboardSummary {
  cashSales: number;
  onlineSales: number;
  totalSales: number;
  cashExpenses: number;
  onlineExpenses: number;
  totalExpense: number;
  netIncome: number;
  milkQty: number;
  curdQty: number;
  dealerOutstandingTotal: number;
  staffPresent: number;
  staffAbsent: number;
}

export function mapDashboardSummary(row: any): DashboardSummary {
  return {
    cashSales: Number(row.cash_sales),
    onlineSales: Number(row.online_sales),
    totalSales: Number(row.total_sales),
    cashExpenses: Number(row.cash_expenses),
    onlineExpenses: Number(row.online_expenses),
    totalExpense: Number(row.total_expense),
    netIncome: Number(row.net_income),
    milkQty: Number(row.milk_qty),
    curdQty: Number(row.curd_qty),
    dealerOutstandingTotal: Number(row.dealer_outstanding_total),
    staffPresent: Number(row.staff_present),
    staffAbsent: Number(row.staff_absent)
  };
}
