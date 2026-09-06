import { Injectable, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface SalarySettings {
  calculation_method: string;
  weekly_off_paid: boolean;
  half_day_factor: number;
  paid_leave_counts_as_present: boolean;
}

export interface CafeSettings {
  id: string;
  cafeName: string;
  address: string | null;
  phone: string | null;
  gstNumber: string | null;
  currency: string;
  timezone: string;
  decimalPrecision: number;
  defaultMilkPrice: number;
  defaultCurdPrice: number;
  allowPreviousDateEditing: boolean;
  allowMultipleDailySalesEntries: boolean;
  requireDailyClosing: boolean;
  salarySettings: SalarySettings;
}

function mapSettingsRow(row: any): CafeSettings {
  return {
    id: row.id,
    cafeName: row.cafe_name,
    address: row.address,
    phone: row.phone,
    gstNumber: row.gst_number,
    currency: row.currency,
    timezone: row.timezone,
    decimalPrecision: row.decimal_precision,
    defaultMilkPrice: Number(row.default_milk_price),
    defaultCurdPrice: Number(row.default_curd_price),
    allowPreviousDateEditing: row.allow_previous_date_editing,
    allowMultipleDailySalesEntries: row.allow_multiple_daily_sales_entries,
    requireDailyClosing: row.require_daily_closing,
    salarySettings: row.salary_settings
  };
}

/**
 * Thin read (+ admin write, for Phase 4's Settings screen) accessor over the
 * single-row `cafe_settings` table. Cached in a signal after first load since
 * these values rarely change within a session.
 */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly _settings = signal<CafeSettings | null>(null);
  readonly settings = this._settings.asReadonly();

  constructor(private readonly supabase: SupabaseService) {}

  async load(): Promise<CafeSettings> {
    if (this._settings()) return this._settings()!;

    const { data, error } = await this.supabase.client
      .from('cafe_settings')
      .select('*')
      .single();
    if (error) throw error;

    const mapped = mapSettingsRow(data);
    this._settings.set(mapped);
    return mapped;
  }

  async update(partial: Partial<CafeSettings>): Promise<void> {
    const current = this._settings();
    if (!current) await this.load();

    const payload: Record<string, unknown> = {};
    if (partial.cafeName !== undefined) payload['cafe_name'] = partial.cafeName;
    if (partial.address !== undefined) payload['address'] = partial.address;
    if (partial.phone !== undefined) payload['phone'] = partial.phone;
    if (partial.gstNumber !== undefined) payload['gst_number'] = partial.gstNumber;
    if (partial.defaultMilkPrice !== undefined) payload['default_milk_price'] = partial.defaultMilkPrice;
    if (partial.defaultCurdPrice !== undefined) payload['default_curd_price'] = partial.defaultCurdPrice;
    if (partial.allowPreviousDateEditing !== undefined) payload['allow_previous_date_editing'] = partial.allowPreviousDateEditing;
    if (partial.allowMultipleDailySalesEntries !== undefined) payload['allow_multiple_daily_sales_entries'] = partial.allowMultipleDailySalesEntries;
    if (partial.requireDailyClosing !== undefined) payload['require_daily_closing'] = partial.requireDailyClosing;
    if (partial.salarySettings !== undefined) payload['salary_settings'] = partial.salarySettings;

    const { data, error } = await this.supabase.client
      .from('cafe_settings')
      .update(payload)
      .eq('id', this._settings()!.id)
      .select()
      .single();
    if (error) throw error;
    this._settings.set(mapSettingsRow(data));
  }
}
