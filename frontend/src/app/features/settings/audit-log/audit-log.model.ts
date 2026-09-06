import { AuditAction } from '../../../core/models/enums';

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  userName?: string;
  action: AuditAction;
  entityType: string;
  entityId: string | null;
  oldData: unknown;
  newData: unknown;
  createdAt: string;
}

export function mapAuditLogRow(row: any): AuditLogEntry {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.profiles?.full_name,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    oldData: row.old_data,
    newData: row.new_data,
    createdAt: row.created_at
  };
}
