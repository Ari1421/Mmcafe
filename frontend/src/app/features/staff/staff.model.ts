import { SalaryType } from '../../core/models/enums';

export interface Staff {
  id: string;
  employeeCode: string | null;
  name: string;
  mobile: string | null;
  email: string | null;
  joiningDate: string;
  designation: string | null;
  salaryType: SalaryType;
  monthlySalary: number | null;
  dailySalary: number | null;
  shift: string | null;
  active: boolean;
  address: string | null;
  emergencyContact: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StaffFormValue {
  employeeCode?: string | null;
  name: string;
  mobile?: string | null;
  email?: string | null;
  joiningDate: string;
  designation?: string | null;
  salaryType: SalaryType;
  monthlySalary?: number | null;
  dailySalary?: number | null;
  shift?: string | null;
  active: boolean;
  address?: string | null;
  emergencyContact?: string | null;
  notes?: string | null;
}

export function mapStaffRow(row: any): Staff {
  return {
    id: row.id,
    employeeCode: row.employee_code,
    name: row.name,
    mobile: row.mobile,
    email: row.email,
    joiningDate: row.joining_date,
    designation: row.designation,
    salaryType: row.salary_type,
    monthlySalary: row.monthly_salary !== null ? Number(row.monthly_salary) : null,
    dailySalary: row.daily_salary !== null ? Number(row.daily_salary) : null,
    shift: row.shift,
    active: row.active,
    address: row.address,
    emergencyContact: row.emergency_contact,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function toStaffInsert(value: StaffFormValue) {
  return {
    employee_code: value.employeeCode || null,
    name: value.name,
    mobile: value.mobile || null,
    email: value.email || null,
    joining_date: value.joiningDate,
    designation: value.designation || null,
    salary_type: value.salaryType,
    monthly_salary: value.monthlySalary ?? null,
    daily_salary: value.dailySalary ?? null,
    shift: value.shift || null,
    active: value.active,
    address: value.address || null,
    emergency_contact: value.emergencyContact || null,
    notes: value.notes || null
  };
}
