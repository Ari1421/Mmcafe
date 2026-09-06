import { UserRole } from './enums';

export interface Profile {
  id: string;
  fullName: string;
  role: UserRole;
  canAddSales: boolean;
  canAddExpenses: boolean;
  canAddAttendance: boolean;
  canViewDashboard: boolean;
  canDeleteRecords: boolean;
  canModifySalarySettings: boolean;
  canAccessAdminSettings: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Maps a raw Supabase row (snake_case) to the strongly-typed Profile model. */
export function mapProfileRow(row: any): Profile {
  return {
    id: row.id,
    fullName: row.full_name,
    role: row.role,
    canAddSales: row.can_add_sales,
    canAddExpenses: row.can_add_expenses,
    canAddAttendance: row.can_add_attendance,
    canViewDashboard: row.can_view_dashboard,
    canDeleteRecords: row.can_delete_records,
    canModifySalarySettings: row.can_modify_salary_settings,
    canAccessAdminSettings: row.can_access_admin_settings,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
