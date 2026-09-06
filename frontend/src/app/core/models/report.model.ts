export interface ReportDay {
  reportDate: string;
  cashSales: number;
  onlineSales: number;
  totalSales: number;
  cashExpenses: number;
  onlineExpenses: number;
  operatingExpenses: number;
  milkQty: number;
  milkCost: number;
  curdQty: number;
  curdCost: number;
  purchasesTotal: number;
  dealerPaymentsTotal: number;
  staffCost: number;
  totalExpense: number;
  netIncome: number;
}

export interface ExpenseCategoryBreakdown {
  categoryName: string;
  totalAmount: number;
}

export function mapReportDay(row: any): ReportDay {
  return {
    reportDate: row.report_date,
    cashSales: Number(row.cash_sales),
    onlineSales: Number(row.online_sales),
    totalSales: Number(row.total_sales),
    cashExpenses: Number(row.cash_expenses),
    onlineExpenses: Number(row.online_expenses),
    operatingExpenses: Number(row.operating_expenses),
    milkQty: Number(row.milk_qty),
    milkCost: Number(row.milk_cost),
    curdQty: Number(row.curd_qty),
    curdCost: Number(row.curd_cost),
    purchasesTotal: Number(row.purchases_total),
    dealerPaymentsTotal: Number(row.dealer_payments_total),
    staffCost: Number(row.staff_cost),
    totalExpense: Number(row.total_expense),
    netIncome: Number(row.net_income)
  };
}

export function mapExpenseCategoryBreakdown(row: any): ExpenseCategoryBreakdown {
  return { categoryName: row.category_name, totalAmount: Number(row.total_amount) };
}
