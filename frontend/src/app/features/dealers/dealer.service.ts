import { Injectable, signal } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase.service';
import { AuthService } from '../../core/services/auth.service';
import {
  Dealer,
  DealerFormValue,
  DealerOutstanding,
  mapDealerRow,
  mapDealerOutstandingRow,
  toDealerInsert
} from './dealer.model';
import {
  DealerPaymentFormValue,
  toDealerPaymentInsert
} from './dealer-payment.model';
import { DealerLedgerEntry, mapLedgerRow } from './dealer-ledger.model';
import {
  DealerProductRate,
  DealerProductRateFormValue,
  mapDealerRateRow,
  toDealerRateInsert
} from './dealer-rate.model';

@Injectable({ providedIn: 'root' })
export class DealerService {
  private readonly _dealers = signal<Dealer[]>([]);
  private readonly _outstanding = signal<DealerOutstanding[]>([]);
  private readonly _loading = signal(false);

  readonly dealers = this._dealers.asReadonly();
  readonly outstanding = this._outstanding.asReadonly();
  readonly loading = this._loading.asReadonly();

  constructor(
    private readonly supabase: SupabaseService,
    private readonly auth: AuthService
  ) {}

  // ---------------------------------------------------------------------
  // Dealers (master data)
  // ---------------------------------------------------------------------

  async loadAll(): Promise<void> {
    this._loading.set(true);
    const [dealersRes, outstandingRes] = await Promise.all([
      this.supabase.client.from('dealers').select('*').order('name'),
      this.supabase.client.from('dealer_outstanding_view').select('*')
    ]);
    this._loading.set(false);

    if (dealersRes.error) throw dealersRes.error;
    if (outstandingRes.error) throw outstandingRes.error;

    this._dealers.set((dealersRes.data ?? []).map(mapDealerRow));
    this._outstanding.set((outstandingRes.data ?? []).map(mapDealerOutstandingRow));
  }

  outstandingFor(dealerId: string): DealerOutstanding | undefined {
    return this._outstanding().find((o) => o.dealerId === dealerId);
  }

  async getById(id: string): Promise<Dealer> {
    const { data, error } = await this.supabase.client
      .from('dealers')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return mapDealerRow(data);
  }

  async create(value: DealerFormValue): Promise<void> {
    const { error } = await this.supabase.client.from('dealers').insert(toDealerInsert(value));
    if (error) throw error;
    await this.loadAll();
  }

  async update(id: string, value: DealerFormValue): Promise<void> {
    const { error } = await this.supabase.client
      .from('dealers')
      .update(toDealerInsert(value))
      .eq('id', id);
    if (error) throw error;
    await this.loadAll();
  }

  /** Dealers are master data referenced by purchase history — soft delete only. */
  async setActive(id: string, active: boolean): Promise<void> {
    const { error } = await this.supabase.client.from('dealers').update({ active }).eq('id', id);
    if (error) throw error;
    await this.loadAll();
  }

  // ---------------------------------------------------------------------
  // Dealer-specific product rates
  // ---------------------------------------------------------------------

  async getRatesForDealer(dealerId: string): Promise<DealerProductRate[]> {
    const { data, error } = await this.supabase.client
      .from('dealer_product_rates')
      .select('*, products(name)')
      .eq('dealer_id', dealerId)
      .order('effective_from', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapDealerRateRow);
  }

  async addRate(value: DealerProductRateFormValue): Promise<void> {
    const { error } = await this.supabase.client
      .from('dealer_product_rates')
      .insert(toDealerRateInsert(value));
    if (error) throw error;
  }

  async setRateActive(id: string, active: boolean): Promise<void> {
    const { error } = await this.supabase.client
      .from('dealer_product_rates')
      .update({ active })
      .eq('id', id);
    if (error) throw error;
  }

  /** Calls the get_applicable_rate() SQL function so the Purchase form auto-fills the rate. */
  async getApplicableRate(dealerId: string, productId: string, asOf: string): Promise<number | null> {
    const { data, error } = await this.supabase.client.rpc('get_applicable_rate', {
      p_dealer_id: dealerId,
      p_product_id: productId,
      p_as_of: asOf
    });
    if (error) throw error;
    return data === null ? null : Number(data);
  }

  // ---------------------------------------------------------------------
  // Dealer payments
  // ---------------------------------------------------------------------

  async addPayment(value: DealerPaymentFormValue): Promise<void> {
    const userId = this.auth.session()?.user.id ?? null;
    const { error } = await this.supabase.client
      .from('dealer_payments')
      .insert(toDealerPaymentInsert(value, userId));
    if (error) throw error;
    await this.loadAll(); // refresh outstanding balances
  }

  // ---------------------------------------------------------------------
  // Ledger (Date | Description | Debit | Credit | Balance)
  // ---------------------------------------------------------------------

  async getLedger(dealerId: string): Promise<DealerLedgerEntry[]> {
    const { data, error } = await this.supabase.client.rpc('get_dealer_ledger', {
      p_dealer_id: dealerId
    });
    if (error) throw error;
    return (data ?? []).map(mapLedgerRow);
  }
}
