import { Injectable, signal } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';
import { AuditLogEntry, mapAuditLogRow } from './audit-log.model';

export interface AuditLogFilter {
  entityType?: string;
  dateFrom?: string;
  dateTo?: string;
}

@Injectable({ providedIn: 'root' })
export class AuditLogService {
  readonly entries = signal<AuditLogEntry[]>([]);
  readonly loading = signal(false);

  constructor(private readonly supabase: SupabaseService) {}

  async load(filter: AuditLogFilter = {}): Promise<void> {
    this.loading.set(true);
    let query = this.supabase.client
      .from('audit_logs')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false })
      .limit(500);

    if (filter.entityType) query = query.eq('entity_type', filter.entityType);
    if (filter.dateFrom) query = query.gte('created_at', filter.dateFrom);
    if (filter.dateTo) query = query.lte('created_at', filter.dateTo + 'T23:59:59');

    const { data, error } = await query;
    this.loading.set(false);
    if (error) throw error;
    this.entries.set((data ?? []).map(mapAuditLogRow));
  }
}
