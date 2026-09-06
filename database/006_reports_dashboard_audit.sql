-- ============================================================================
-- PHASE 4 — REPORTING, DASHBOARD, DAILY CLOSING, AUDIT TRIGGERS
-- ============================================================================
-- Key accounting decision (per "avoid double-counting purchase expenses" and
-- "milk/curd purchases should automatically contribute to business expenses"):
--
--   Total Expense (for a day/range) = Operating Expenses (expenses table)
--                                    + Purchases (purchases table, milk/curd)
--                                    + Staff Cost (salaries paid in that range)
--
-- Milk/Curd purchases are NEVER also entered in the Expenses module, so they
-- are added once, here, at the reporting layer. Staff cost only counts once
-- a salary's payment_status = 'paid' with a payment_date in range — matching
-- "staff salary should contribute to expenses after salary payment is
-- recorded". Net Income = Total Sales - Total Expense.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. UNIFIED REPORT RANGE — one row per calendar day in [p_start, p_end].
--    Powers Daily Report (single day), Weekly/Monthly Report (many days,
--    summed client-side or via get_report_totals below), the Dashboard, and
--    CSV export — all from one optimized query instead of N frontend calls.
-- ----------------------------------------------------------------------------

create or replace function get_report_range(p_start date, p_end date)
returns table (
  report_date date,
  cash_sales numeric,
  online_sales numeric,
  total_sales numeric,
  cash_expenses numeric,
  online_expenses numeric,
  operating_expenses numeric,
  milk_qty numeric,
  milk_cost numeric,
  curd_qty numeric,
  curd_cost numeric,
  purchases_total numeric,
  dealer_payments_total numeric,
  staff_cost numeric,
  total_expense numeric,
  net_income numeric
)
language sql
security invoker
stable
as $$
  with days as (
    select generate_series(p_start, p_end, interval '1 day')::date as d
  ),
  sales_agg as (
    select sale_date as d, sum(cash_amount) as cash_sales, sum(online_amount) as online_sales, sum(total_amount) as total_sales
    from sales
    where sale_date between p_start and p_end
    group by sale_date
  ),
  expenses_agg as (
    select
      expense_date as d,
      sum(amount) filter (where payment_mode = 'cash')   as cash_expenses,
      sum(amount) filter (where payment_mode = 'online')  as online_expenses,
      sum(amount)                                         as operating_expenses
    from expenses
    where expense_date between p_start and p_end
    group by expense_date
  ),
  purchases_agg as (
    select
      pu.purchase_date as d,
      sum(pu.quantity) filter (where pr.name = 'Milk')      as milk_qty,
      sum(pu.total_amount) filter (where pr.name = 'Milk')  as milk_cost,
      sum(pu.quantity) filter (where pr.name = 'Curd')      as curd_qty,
      sum(pu.total_amount) filter (where pr.name = 'Curd')  as curd_cost,
      sum(pu.total_amount)                                  as purchases_total
    from purchases pu
    join products pr on pr.id = pu.product_id
    where pu.purchase_date between p_start and p_end
    group by pu.purchase_date
  ),
  dealer_payments_agg as (
    select payment_date as d, sum(amount) as dealer_payments_total
    from dealer_payments
    where payment_date between p_start and p_end
    group by payment_date
  ),
  staff_cost_agg as (
    select payment_date as d, sum(final_salary) as staff_cost
    from salaries
    where payment_status = 'paid' and payment_date between p_start and p_end
    group by payment_date
  )
  select
    days.d,
    coalesce(sa.cash_sales, 0),
    coalesce(sa.online_sales, 0),
    coalesce(sa.total_sales, 0),
    coalesce(ea.cash_expenses, 0),
    coalesce(ea.online_expenses, 0),
    coalesce(ea.operating_expenses, 0),
    coalesce(pa.milk_qty, 0),
    coalesce(pa.milk_cost, 0),
    coalesce(pa.curd_qty, 0),
    coalesce(pa.curd_cost, 0),
    coalesce(pa.purchases_total, 0),
    coalesce(dpa.dealer_payments_total, 0),
    coalesce(sca.staff_cost, 0),
    coalesce(ea.operating_expenses, 0) + coalesce(pa.purchases_total, 0) + coalesce(sca.staff_cost, 0),
    coalesce(sa.total_sales, 0) - (coalesce(ea.operating_expenses, 0) + coalesce(pa.purchases_total, 0) + coalesce(sca.staff_cost, 0))
  from days
  left join sales_agg sa on sa.d = days.d
  left join expenses_agg ea on ea.d = days.d
  left join purchases_agg pa on pa.d = days.d
  left join dealer_payments_agg dpa on dpa.d = days.d
  left join staff_cost_agg sca on sca.d = days.d
  order by days.d;
$$;

comment on function get_report_range is
  'One row per day in range with sales/expense/purchase/staff-cost breakdown and net income. Backs Daily/Weekly/Monthly reports, CSV export, and the Dashboard.';

-- ----------------------------------------------------------------------------
-- 2. EXPENSE CATEGORY BREAKDOWN (for pie charts on Dashboard/Reports)
-- ----------------------------------------------------------------------------

create or replace function get_expense_category_breakdown(p_start date, p_end date)
returns table (category_name text, total_amount numeric)
language sql
security invoker
stable
as $$
  select ec.name, sum(e.amount)
  from expenses e
  join expense_categories ec on ec.id = e.category_id
  where e.expense_date between p_start and p_end
  group by ec.name
  order by sum(e.amount) desc;
$$;

-- ----------------------------------------------------------------------------
-- 3. DASHBOARD SUMMARY (single call — avoids 10-15 separate frontend requests)
-- ----------------------------------------------------------------------------

create or replace function get_dashboard_summary(p_date date default current_date)
returns table (
  cash_sales numeric,
  online_sales numeric,
  total_sales numeric,
  cash_expenses numeric,
  online_expenses numeric,
  total_expense numeric,
  net_income numeric,
  milk_qty numeric,
  curd_qty numeric,
  dealer_outstanding_total numeric,
  staff_present integer,
  staff_absent integer
)
language plpgsql
security invoker
stable
as $$
declare
  r record;
begin
  select * into r from get_report_range(p_date, p_date) limit 1;

  return query
  select
    r.cash_sales, r.online_sales, r.total_sales,
    r.cash_expenses, r.online_expenses, r.total_expense, r.net_income,
    r.milk_qty, r.curd_qty,
    (select coalesce(sum(outstanding_balance), 0) from dealer_outstanding_view),
    (select count(*)::int from attendance where attendance_date = p_date and status = 'present'),
    (select count(*)::int from attendance where attendance_date = p_date and status = 'absent');
end;
$$;

comment on function get_dashboard_summary is
  'Single optimized call for the Dashboard: today''s sales/expense/net figures, milk & curd quantities, total dealer outstanding, and staff present/absent counts.';

-- ----------------------------------------------------------------------------
-- 4. DAILY CASH FLOW (feeds the Daily Closing screen)
--    Cash In  = Cash Sales
--    Cash Out = Cash Expenses + Dealer Cash Payments + Staff Cash Salary + Staff Cash Advances
-- ----------------------------------------------------------------------------

create or replace function get_daily_cash_flow(p_date date)
returns table (
  cash_sales numeric,
  cash_expenses numeric,
  dealer_cash_payments numeric,
  staff_cash_advances numeric,
  staff_cash_salary numeric,
  other_cash_out numeric
)
language sql
security invoker
stable
as $$
  select
    coalesce((select sum(cash_amount) from sales where sale_date = p_date), 0),
    coalesce((select sum(amount) from expenses where expense_date = p_date and payment_mode = 'cash'), 0),
    coalesce((select sum(amount) from dealer_payments where payment_date = p_date and payment_mode = 'cash'), 0),
    coalesce((select sum(amount) from staff_advances where advance_date = p_date and payment_mode = 'cash'), 0),
    coalesce((select sum(final_salary) from salaries where payment_date = p_date and payment_mode = 'cash' and payment_status = 'paid'), 0),
    coalesce((select sum(amount) from dealer_payments where payment_date = p_date and payment_mode = 'cash'), 0)
      + coalesce((select sum(amount) from staff_advances where advance_date = p_date and payment_mode = 'cash'), 0)
      + coalesce((select sum(final_salary) from salaries where payment_date = p_date and payment_mode = 'cash' and payment_status = 'paid'), 0);
$$;

comment on function get_daily_cash_flow is
  'Cash-only inflow/outflow for a single date, used to compute Expected Closing Cash on the Daily Closing screen and the Cash Book.';

-- ----------------------------------------------------------------------------
-- 5. GENERIC AUDIT TRIGGER
--    Applies created/updated/deleted logging to the financially-sensitive
--    tables. Domain-specific actions (day_closed, day_reopened, salary_paid,
--    dealer_payment_added) are logged explicitly by the application in
--    addition to this generic row, since they carry meaning beyond plain CRUD.
-- ----------------------------------------------------------------------------

create or replace function audit_trigger_fn()
returns trigger
language plpgsql
security definer
as $$
declare
  v_action audit_action;
  v_entity_id uuid;
begin
  if tg_op = 'INSERT' then
    v_action := 'created';
    v_entity_id := new.id;
  elsif tg_op = 'UPDATE' then
    v_action := 'updated';
    v_entity_id := new.id;
  elsif tg_op = 'DELETE' then
    v_action := 'deleted';
    v_entity_id := old.id;
  end if;

  insert into audit_logs (user_id, action, entity_type, entity_id, old_data, new_data)
  values (
    auth.uid(),
    v_action,
    tg_table_name,
    v_entity_id,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

do $$
declare
  t text;
begin
  for t in select unnest(array[
    'sales', 'expenses', 'purchases', 'dealer_payments',
    'staff', 'dealers', 'staff_advances', 'salaries', 'daily_closing'
  ])
  loop
    execute format(
      'drop trigger if exists trg_audit_%1$s on %1$s;
       create trigger trg_audit_%1$s after insert or update or delete on %1$s
       for each row execute function audit_trigger_fn();',
      t
    );
  end loop;
end $$;
