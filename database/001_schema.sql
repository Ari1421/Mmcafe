-- ============================================================================
-- CAFE MANAGER — CORE DATABASE SCHEMA
-- Cafe: Madurai Meenakshi Cafe
-- Target: Supabase PostgreSQL
-- ============================================================================
-- This file creates all enums, tables, constraints and indexes needed for
-- Phase 1 (Auth, Layout, Dashboard, Sales, Expenses) AND the tables required
-- by later phases, so the schema never needs breaking changes as features
-- are added feature-by-feature.
-- ============================================================================

create extension if not exists "pgcrypto"; -- for gen_random_uuid()

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

create type user_role as enum ('admin', 'staff');

create type payment_mode as enum ('cash', 'online');

create type purchase_payment_type as enum ('credit', 'cash', 'online');

create type attendance_status as enum (
  'present', 'absent', 'half_day', 'paid_leave', 'unpaid_leave', 'weekly_off'
);

create type salary_type as enum ('monthly', 'daily');

create type salary_payment_status as enum ('pending', 'partially_paid', 'paid');

create type audit_action as enum (
  'created', 'updated', 'deleted',
  'day_closed', 'day_reopened',
  'salary_paid', 'dealer_payment_added'
);

-- ============================================================================
-- PROFILES  (extends auth.users)
-- ============================================================================

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role user_role not null default 'staff',
  -- granular permission overrides for staff role (admin ignores these, always full access)
  can_add_sales boolean not null default true,
  can_add_expenses boolean not null default true,
  can_add_attendance boolean not null default true,
  can_view_dashboard boolean not null default true,
  can_delete_records boolean not null default false,
  can_modify_salary_settings boolean not null default false,
  can_access_admin_settings boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table profiles is 'One row per authenticated user, extends auth.users with role/permissions.';

-- ============================================================================
-- CAFE SETTINGS (single-row configuration table)
-- ============================================================================

create table cafe_settings (
  id uuid primary key default gen_random_uuid(),
  cafe_name text not null default 'Madurai Meenakshi Cafe',
  address text,
  phone text,
  gst_number text,
  currency text not null default 'INR',
  timezone text not null default 'Asia/Kolkata',
  decimal_precision int not null default 2,
  -- Purchase settings
  default_milk_price numeric(10,2) not null default 56.00,
  default_curd_price numeric(10,2) not null default 70.00,
  -- Application settings
  allow_previous_date_editing boolean not null default true,
  allow_multiple_daily_sales_entries boolean not null default false,
  require_daily_closing boolean not null default false,
  -- Salary settings (JSON to stay flexible per-cafe)
  salary_settings jsonb not null default '{
    "calculation_method": "daily_rate",
    "weekly_off_paid": true,
    "half_day_factor": 0.5,
    "paid_leave_counts_as_present": true
  }'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enforce a single settings row
create unique index cafe_settings_single_row on cafe_settings ((true));

-- ============================================================================
-- EXPENSE CATEGORIES (master data, soft-delete via active flag)
-- ============================================================================

create table expense_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- SALES  (one row per day by default)
-- ============================================================================

create table sales (
  id uuid primary key default gen_random_uuid(),
  sale_date date not null,
  cash_amount numeric(10,2) not null default 0 check (cash_amount >= 0),
  online_amount numeric(10,2) not null default 0 check (online_amount >= 0),
  total_amount numeric(10,2) generated always as (cash_amount + online_amount) stored,
  notes text,
  created_by uuid references profiles(id),
  updated_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sales_amount_check check (cash_amount > 0 or online_amount > 0)
);

-- Enforced at DB level; app config `allow_multiple_daily_sales_entries` controls
-- whether the UI blocks duplicates before insert. The unique index below is the
-- safety net for the default (recommended) single-summary-per-day mode.
create unique index sales_one_per_day on sales (sale_date);

create index idx_sales_date on sales (sale_date);

-- ============================================================================
-- EXPENSES
-- ============================================================================

create table expenses (
  id uuid primary key default gen_random_uuid(),
  expense_date date not null,
  category_id uuid not null references expense_categories(id),
  description text,
  amount numeric(10,2) not null check (amount >= 0),
  payment_mode payment_mode not null default 'cash',
  notes text,
  created_by uuid references profiles(id),
  updated_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_expenses_date on expenses (expense_date);
create index idx_expenses_category on expenses (category_id);
create index idx_expenses_payment_mode on expenses (payment_mode);

-- ============================================================================
-- PRODUCTS (Milk, Curd, extensible)
-- ============================================================================

create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  unit text not null default 'Liter',
  default_rate numeric(10,2) not null check (default_rate >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- DEALERS
-- ============================================================================

create table dealers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  mobile text,
  address text,
  opening_balance numeric(10,2) not null default 0,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_dealers_active on dealers (active);

-- ============================================================================
-- DEALER PRODUCT RATES (dealer-specific pricing, time-versioned)
-- ============================================================================

create table dealer_product_rates (
  id uuid primary key default gen_random_uuid(),
  dealer_id uuid not null references dealers(id) on delete cascade,
  product_id uuid not null references products(id),
  rate numeric(10,2) not null check (rate >= 0),
  effective_from date not null default current_date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_dealer_rate_lookup on dealer_product_rates (dealer_id, product_id, effective_from desc);

-- ============================================================================
-- PURCHASES (Milk/Curd, rate snapshotted at time of purchase)
-- ============================================================================

create table purchases (
  id uuid primary key default gen_random_uuid(),
  purchase_date date not null,
  dealer_id uuid not null references dealers(id),
  product_id uuid not null references products(id),
  quantity numeric(10,3) not null check (quantity > 0),
  unit text not null default 'Liter',
  rate numeric(10,2) not null check (rate >= 0), -- snapshot, never recalculated later
  total_amount numeric(12,2) generated always as (quantity * rate) stored,
  payment_type purchase_payment_type not null default 'credit',
  notes text,
  created_by uuid references profiles(id),
  updated_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_purchases_date on purchases (purchase_date);
create index idx_purchases_dealer on purchases (dealer_id);
create index idx_purchases_product on purchases (product_id);

-- ============================================================================
-- DEALER PAYMENTS
-- ============================================================================

create table dealer_payments (
  id uuid primary key default gen_random_uuid(),
  dealer_id uuid not null references dealers(id),
  payment_date date not null,
  amount numeric(10,2) not null check (amount > 0),
  payment_mode payment_mode not null default 'cash',
  reference_number text,
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index idx_dealer_payments_dealer on dealer_payments (dealer_id);
create index idx_dealer_payments_date on dealer_payments (payment_date);

-- ============================================================================
-- STAFF
-- ============================================================================

create table staff (
  id uuid primary key default gen_random_uuid(),
  employee_code text unique,
  name text not null,
  mobile text,
  email text,
  joining_date date not null default current_date,
  designation text,
  salary_type salary_type not null default 'monthly',
  monthly_salary numeric(10,2) check (monthly_salary >= 0),
  daily_salary numeric(10,2) check (daily_salary >= 0),
  shift text,
  active boolean not null default true,
  address text,
  emergency_contact text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_staff_active on staff (active);

-- ============================================================================
-- ATTENDANCE (one row per staff per date)
-- ============================================================================

create table attendance (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff(id) on delete cascade,
  attendance_date date not null,
  status attendance_status not null,
  check_in time,
  check_out time,
  notes text,
  created_by uuid references profiles(id),
  updated_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (staff_id, attendance_date)
);

create index idx_attendance_date on attendance (attendance_date);
create index idx_attendance_staff on attendance (staff_id);

-- ============================================================================
-- STAFF ADVANCES
-- ============================================================================

create table staff_advances (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff(id),
  advance_date date not null,
  amount numeric(10,2) not null check (amount > 0),
  payment_mode payment_mode not null default 'cash',
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index idx_staff_advances_staff on staff_advances (staff_id);

-- ============================================================================
-- SALARIES
-- ============================================================================

create table salaries (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff(id),
  salary_month date not null, -- store as first-of-month for uniqueness/indexing
  base_salary numeric(10,2) not null default 0,
  working_days numeric(5,2) not null default 0,
  present_days numeric(5,2) not null default 0,
  absent_days numeric(5,2) not null default 0,
  half_days numeric(5,2) not null default 0,
  paid_leave_days numeric(5,2) not null default 0,
  unpaid_leave_days numeric(5,2) not null default 0,
  deduction numeric(10,2) not null default 0,
  advance_deduction numeric(10,2) not null default 0,
  bonus numeric(10,2) not null default 0,
  adjustment numeric(10,2) not null default 0,
  final_salary numeric(10,2) not null default 0,
  payment_status salary_payment_status not null default 'pending',
  payment_date date,
  payment_mode payment_mode,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (staff_id, salary_month)
);

create index idx_salaries_month on salaries (salary_month);
create index idx_salaries_staff on salaries (staff_id);

-- ============================================================================
-- DAILY CLOSING
-- ============================================================================

create table daily_closing (
  id uuid primary key default gen_random_uuid(),
  closing_date date not null unique,
  opening_cash numeric(10,2) not null default 0,
  cash_sales numeric(10,2) not null default 0,
  cash_expenses numeric(10,2) not null default 0,
  other_cash_out numeric(10,2) not null default 0, -- dealer cash payments + staff cash payments/advances
  expected_cash numeric(10,2) generated always as
    (opening_cash + cash_sales - cash_expenses - other_cash_out) stored,
  actual_cash numeric(10,2),
  difference numeric(10,2) generated always as
    (coalesce(actual_cash,0) - (opening_cash + cash_sales - cash_expenses - other_cash_out)) stored,
  notes text,
  closed_by uuid references profiles(id),
  closed_at timestamptz,
  is_closed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_daily_closing_date on daily_closing (closing_date);

-- ============================================================================
-- AUDIT LOGS
-- ============================================================================

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  action audit_action not null,
  entity_type text not null,
  entity_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create index idx_audit_entity on audit_logs (entity_type, entity_id);
create index idx_audit_created on audit_logs (created_at);

-- ============================================================================
-- updated_at auto-touch trigger (applied to every table that has the column)
-- ============================================================================

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare
  t text;
begin
  for t in select unnest(array[
    'profiles','cafe_settings','expense_categories','sales','expenses',
    'products','dealers','staff','attendance','salaries','daily_closing'
  ])
  loop
    execute format(
      'create trigger trg_set_updated_at before update on %I
       for each row execute function set_updated_at();', t
    );
  end loop;
end $$;
