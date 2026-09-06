-- ============================================================================
-- PHASE 3 — STAFF / ATTENDANCE / SALARY SUPPORTING FUNCTIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ATTENDANCE SUMMARY FOR A STAFF MEMBER OVER A DATE RANGE
-- Used by the Salary module to derive present/absent/half-day/leave counts
-- for the selected salary period without pulling every attendance row into
-- the browser and counting client-side.
-- ----------------------------------------------------------------------------

create or replace function get_attendance_summary(
  p_staff_id uuid,
  p_start date,
  p_end date
)
returns table (
  present_days numeric,
  absent_days numeric,
  half_days numeric,
  paid_leave_days numeric,
  unpaid_leave_days numeric,
  weekly_off_days numeric,
  marked_days numeric,
  total_days_in_range numeric
)
language sql
security invoker
stable
as $$
  select
    count(*) filter (where status = 'present')::numeric        as present_days,
    count(*) filter (where status = 'absent')::numeric         as absent_days,
    count(*) filter (where status = 'half_day')::numeric        as half_days,
    count(*) filter (where status = 'paid_leave')::numeric      as paid_leave_days,
    count(*) filter (where status = 'unpaid_leave')::numeric    as unpaid_leave_days,
    count(*) filter (where status = 'weekly_off')::numeric      as weekly_off_days,
    count(*)::numeric                                           as marked_days,
    (p_end - p_start + 1)::numeric                              as total_days_in_range
  from attendance
  where staff_id = p_staff_id
    and attendance_date between p_start and p_end;
$$;

comment on function get_attendance_summary is
  'Aggregates a staff member''s attendance for a date range (typically a salary month). Feeds the Salary module''s configurable calculation instead of the client counting rows.';

-- ----------------------------------------------------------------------------
-- ATTENDANCE FOR A GIVEN DATE, JOINED WITH ALL ACTIVE STAFF
-- Powers the "Quick Attendance" screen: every active employee appears even
-- if they have no attendance row yet for the selected date.
-- ----------------------------------------------------------------------------

create or replace function get_attendance_for_date(p_date date)
returns table (
  staff_id uuid,
  staff_name text,
  employee_code text,
  designation text,
  attendance_id uuid,
  status attendance_status,
  check_in time,
  check_out time,
  notes text
)
language sql
security invoker
stable
as $$
  select
    s.id,
    s.name,
    s.employee_code,
    s.designation,
    a.id,
    a.status,
    a.check_in,
    a.check_out,
    a.notes
  from staff s
  left join attendance a on a.staff_id = s.id and a.attendance_date = p_date
  where s.active = true
  order by s.name;
$$;

comment on function get_attendance_for_date is
  'Returns every active staff member for a date, with their existing attendance row (if any) joined in — powers the quick attendance marking screen.';
