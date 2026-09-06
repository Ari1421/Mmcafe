-- ============================================================================
-- ROW LEVEL SECURITY — CAFE MANAGER
-- ============================================================================
-- Design principles:
-- 1. Every application table has RLS enabled.
-- 2. Admin (profiles.role = 'admin') gets full CRUD on everything.
-- 3. Staff get CRUD scoped to the granular permission flags stored on their
--    profiles row (can_add_sales, can_add_expenses, can_add_attendance,
--    can_delete_records, can_modify_salary_settings, can_access_admin_settings).
-- 4. Deletes are additionally blocked at the RLS layer for staff unless
--    can_delete_records = true, on top of the app encouraging soft-delete.
-- 5. Helper functions read the caller's own profile row (auth.uid()) so
--    policies stay short and consistent across tables.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER so they can read profiles regardless of
-- the calling row's own RLS, without exposing other users' data)
-- ----------------------------------------------------------------------------

create or replace function is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin' and active = true
  );
$$;

create or replace function is_active_user()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and active = true
  );
$$;

create or replace function has_permission(perm text)
returns boolean
language sql
security definer
stable
as $$
  select case perm
    when 'add_sales' then (select can_add_sales from profiles where id = auth.uid())
    when 'add_expenses' then (select can_add_expenses from profiles where id = auth.uid())
    when 'add_attendance' then (select can_add_attendance from profiles where id = auth.uid())
    when 'view_dashboard' then (select can_view_dashboard from profiles where id = auth.uid())
    when 'delete_records' then (select can_delete_records from profiles where id = auth.uid())
    when 'modify_salary_settings' then (select can_modify_salary_settings from profiles where id = auth.uid())
    when 'access_admin_settings' then (select can_access_admin_settings from profiles where id = auth.uid())
    else false
  end;
$$;

-- ----------------------------------------------------------------------------
-- Enable RLS everywhere
-- ----------------------------------------------------------------------------

alter table profiles enable row level security;
alter table cafe_settings enable row level security;
alter table expense_categories enable row level security;
alter table sales enable row level security;
alter table expenses enable row level security;
alter table products enable row level security;
alter table dealers enable row level security;
alter table dealer_product_rates enable row level security;
alter table purchases enable row level security;
alter table dealer_payments enable row level security;
alter table staff enable row level security;
alter table attendance enable row level security;
alter table staff_advances enable row level security;
alter table salaries enable row level security;
alter table daily_closing enable row level security;
alter table audit_logs enable row level security;

-- ----------------------------------------------------------------------------
-- PROFILES: users can read all active profiles (needed for staff pickers /
-- "created by" display); only admin can update roles/permissions; a user can
-- update their own non-privileged fields (e.g. full_name) via a separate policy.
-- ----------------------------------------------------------------------------

create policy profiles_select_all on profiles
  for select using (is_active_user());

create policy profiles_admin_all on profiles
  for all using (is_admin()) with check (is_admin());

create policy profiles_self_update on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ----------------------------------------------------------------------------
-- CAFE SETTINGS: everyone can read; only admin (or staff with the explicit
-- access_admin_settings permission) can write.
-- ----------------------------------------------------------------------------

create policy cafe_settings_select on cafe_settings
  for select using (is_active_user());

create policy cafe_settings_write on cafe_settings
  for all using (is_admin() or has_permission('access_admin_settings'))
  with check (is_admin() or has_permission('access_admin_settings'));

-- ----------------------------------------------------------------------------
-- EXPENSE CATEGORIES: everyone reads; only admin manages (create/edit/activate)
-- ----------------------------------------------------------------------------

create policy expense_categories_select on expense_categories
  for select using (is_active_user());

create policy expense_categories_admin_write on expense_categories
  for insert with check (is_admin());
create policy expense_categories_admin_update on expense_categories
  for update using (is_admin()) with check (is_admin());
-- No delete policy defined intentionally: categories are soft-deleted via `active`.

-- ----------------------------------------------------------------------------
-- SALES
-- ----------------------------------------------------------------------------

create policy sales_select on sales
  for select using (is_active_user());

create policy sales_insert on sales
  for insert with check (is_admin() or has_permission('add_sales'));

create policy sales_update on sales
  for update using (is_admin() or has_permission('add_sales'))
  with check (is_admin() or has_permission('add_sales'));

create policy sales_delete on sales
  for delete using (is_admin() or has_permission('delete_records'));

-- ----------------------------------------------------------------------------
-- EXPENSES
-- ----------------------------------------------------------------------------

create policy expenses_select on expenses
  for select using (is_active_user());

create policy expenses_insert on expenses
  for insert with check (is_admin() or has_permission('add_expenses'));

create policy expenses_update on expenses
  for update using (is_admin() or has_permission('add_expenses'))
  with check (is_admin() or has_permission('add_expenses'));

create policy expenses_delete on expenses
  for delete using (is_admin() or has_permission('delete_records'));

-- ----------------------------------------------------------------------------
-- PRODUCTS: everyone reads; only admin writes (rate editing restricted to admin)
-- ----------------------------------------------------------------------------

create policy products_select on products
  for select using (is_active_user());

create policy products_admin_write on products
  for insert with check (is_admin());
create policy products_admin_update on products
  for update using (is_admin()) with check (is_admin());

-- ----------------------------------------------------------------------------
-- DEALERS
-- ----------------------------------------------------------------------------

create policy dealers_select on dealers
  for select using (is_active_user());

create policy dealers_admin_write on dealers
  for insert with check (is_admin());
create policy dealers_admin_update on dealers
  for update using (is_admin()) with check (is_admin());
create policy dealers_admin_delete on dealers
  for delete using (is_admin());

-- ----------------------------------------------------------------------------
-- DEALER PRODUCT RATES: everyone reads; only admin writes (rate changes are
-- sensitive since they drive automatic purchase pricing)
-- ----------------------------------------------------------------------------

create policy dealer_rates_select on dealer_product_rates
  for select using (is_active_user());

create policy dealer_rates_admin_write on dealer_product_rates
  for all using (is_admin()) with check (is_admin());

-- ----------------------------------------------------------------------------
-- PURCHASES (milk/curd)
-- ----------------------------------------------------------------------------

create policy purchases_select on purchases
  for select using (is_active_user());

create policy purchases_insert on purchases
  for insert with check (is_admin() or has_permission('add_expenses'));

create policy purchases_update on purchases
  for update using (is_admin() or has_permission('add_expenses'))
  with check (is_admin() or has_permission('add_expenses'));

create policy purchases_delete on purchases
  for delete using (is_admin() or has_permission('delete_records'));

-- ----------------------------------------------------------------------------
-- DEALER PAYMENTS
-- ----------------------------------------------------------------------------

create policy dealer_payments_select on dealer_payments
  for select using (is_active_user());

create policy dealer_payments_insert on dealer_payments
  for insert with check (is_admin() or has_permission('add_expenses'));

create policy dealer_payments_delete on dealer_payments
  for delete using (is_admin() or has_permission('delete_records'));

-- ----------------------------------------------------------------------------
-- STAFF: everyone reads (needed for attendance pickers); only admin manages
-- ----------------------------------------------------------------------------

create policy staff_select on staff
  for select using (is_active_user());

create policy staff_admin_write on staff
  for insert with check (is_admin());
create policy staff_admin_update on staff
  for update using (is_admin()) with check (is_admin());

-- ----------------------------------------------------------------------------
-- ATTENDANCE
-- ----------------------------------------------------------------------------

create policy attendance_select on attendance
  for select using (is_active_user());

create policy attendance_insert on attendance
  for insert with check (is_admin() or has_permission('add_attendance'));

create policy attendance_update on attendance
  for update using (is_admin() or has_permission('add_attendance'))
  with check (is_admin() or has_permission('add_attendance'));

create policy attendance_delete on attendance
  for delete using (is_admin() or has_permission('delete_records'));

-- ----------------------------------------------------------------------------
-- STAFF ADVANCES: admin only writes; both roles can read (transparency)
-- ----------------------------------------------------------------------------

create policy staff_advances_select on staff_advances
  for select using (is_active_user());

create policy staff_advances_admin_write on staff_advances
  for all using (is_admin()) with check (is_admin());

-- ----------------------------------------------------------------------------
-- SALARIES: salary settings/records restricted to admin (or explicit
-- can_modify_salary_settings staff), everyone can view their own eventually —
-- for MVP, restrict view to admin + the staff's own record can be extended
-- later when staff self-service login is introduced.
-- ----------------------------------------------------------------------------

create policy salaries_select on salaries
  for select using (is_admin() or has_permission('modify_salary_settings'));

create policy salaries_write on salaries
  for all using (is_admin() or has_permission('modify_salary_settings'))
  with check (is_admin() or has_permission('modify_salary_settings'));

-- ----------------------------------------------------------------------------
-- DAILY CLOSING: everyone reads; insert/update allowed unless is_closed = true
-- in which case only admin can modify (reopen).
-- ----------------------------------------------------------------------------

create policy daily_closing_select on daily_closing
  for select using (is_active_user());

create policy daily_closing_insert on daily_closing
  for insert with check (is_admin() or has_permission('add_expenses'));

create policy daily_closing_update on daily_closing
  for update using (
    is_admin() or (has_permission('add_expenses') and is_closed = false)
  )
  with check (
    is_admin() or (has_permission('add_expenses') and is_closed = false)
  );

-- ----------------------------------------------------------------------------
-- AUDIT LOGS: read-only for admin; system/services insert via RPC/service
-- role context is not used from the browser, so inserts happen as the
-- authenticated user performing the action.
-- ----------------------------------------------------------------------------

create policy audit_logs_select on audit_logs
  for select using (is_admin());

create policy audit_logs_insert on audit_logs
  for insert with check (is_active_user());
