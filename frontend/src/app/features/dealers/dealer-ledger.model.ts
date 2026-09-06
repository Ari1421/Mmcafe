export interface DealerLedgerEntry {
  entryDate: string;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

export function mapLedgerRow(row: any): DealerLedgerEntry {
  return {
    entryDate: row.entry_date,
    description: row.description,
    debit: Number(row.debit),
    credit: Number(row.credit),
    runningBalance: Number(row.running_balance)
  };
}
