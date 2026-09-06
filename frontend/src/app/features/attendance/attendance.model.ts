import { AttendanceStatus } from '../../core/models/enums';

/** One row per active staff member for a given date, joined with any existing attendance record. */
export interface AttendanceRowForDate {
  staffId: string;
  staffName: string;
  employeeCode: string | null;
  designation: string | null;
  attendanceId: string | null;
  status: AttendanceStatus | null;
  checkIn: string | null;
  checkOut: string | null;
  notes: string | null;
}

export interface AttendanceSummary {
  presentDays: number;
  absentDays: number;
  halfDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  weeklyOffDays: number;
  markedDays: number;
  totalDaysInRange: number;
}

export function mapAttendanceRowForDate(row: any): AttendanceRowForDate {
  return {
    staffId: row.staff_id,
    staffName: row.staff_name,
    employeeCode: row.employee_code,
    designation: row.designation,
    attendanceId: row.attendance_id,
    status: row.status,
    checkIn: row.check_in,
    checkOut: row.check_out,
    notes: row.notes
  };
}

export function mapAttendanceSummary(row: any): AttendanceSummary {
  return {
    presentDays: Number(row.present_days),
    absentDays: Number(row.absent_days),
    halfDays: Number(row.half_days),
    paidLeaveDays: Number(row.paid_leave_days),
    unpaidLeaveDays: Number(row.unpaid_leave_days),
    weeklyOffDays: Number(row.weekly_off_days),
    markedDays: Number(row.marked_days),
    totalDaysInRange: Number(row.total_days_in_range)
  };
}
