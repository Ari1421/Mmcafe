-- ============================================================================
-- PHASE 2 — DEALER / PURCHASE SUPPORTING VIEWS & FUNCTIONS
-- ============================================================================
-- These implement:
--   - the "Dealer Outstanding View" requirement (optimized query, not
--     client-side aggregation)
--   - the dealer ledger (Date | Description | Debit | Credit | Balance)
--   - automatic dealer+product rate lookup used by the Purchase form
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. DEALER OUTSTANDING VIEW
--    outstanding_balance = opening_balance + credit_purchases - payments
-- ----------------------------------------------------------------------------

create or replace view dealer_outstanding_view as
select
  d.id                                   as dealer_id,
  d.name                                 as dealer_name,
  d.opening_balance                      as opening_balance,
  coalesce(p.total_credit_purchases, 0)  as total_credit_purchases,
  coalesce(pay.total_payments, 0)        as total_payments,
  d.opening_balance
    + coalesce(p.total_credit_purchases, 0)
    - coalesce(pay.total_payments, 0)    as outstanding_balance
from dealers d
left join (
  select dealer_id, sum(total_amount) as total_credit_purchases
  from purchases
  where payment_type = 'credit'
  group by dealer_id
) p on p.dealer_id = d.id
left join (
  select dealer_id, sum(amount) as total_payments
  from dealer_payments
  group by dealer_id
) pay on pay.dealer_id = d.id;

comment on view dealer_outstanding_view is
  'One row per dealer: opening balance + credit purchases - payments = outstanding balance. Used by Dealers list and Dashboard.';

-- RLS note: views inherit RLS from their base tables in Postgres only when
-- created with security_invoker. Supabase defaults to security_invoker=on
-- for views on recent Postgres versions; if your project predates that
-- default, recreate with: alter view dealer_outstanding_view set (security_invoker = true);
alter view dealer_outstanding_view set (security_invoker = true);

-- ----------------------------------------------------------------------------
-- 2. DEALER LEDGER FUNCTION
--    Returns a running-balance ledger: purchases are Debit, payments are Credit.
-- ----------------------------------------------------------------------------

create or replace function get_dealer_ledger(p_dealer_id uuid)
returns table (
  entry_date date,
  description text,
  debit numeric,
  credit numeric,
  running_balance numeric
)
language plpgsql
security invoker
stable
as $$
declare
  v_opening numeric;
begin
  select opening_balance into v_opening from dealers where id = p_dealer_id;

  return query
  with entries as (
    select
      pu.purchase_date as entry_date,
      (pr.name || ' Purchase (' || pu.quantity || ' ' || pu.unit || ')') as description,
      case when pu.payment_type = 'credit' then pu.total_amount else 0 end as debit,
      0::numeric as credit,
      pu.created_at as sort_ts
    from purchases pu
    join products pr on pr.id = pu.product_id
    where pu.dealer_id = p_dealer_id

    union all

    select
      dp.payment_date as entry_date,
      'Payment' || case when dp.reference_number is not null then ' (' || dp.reference_number || ')' else '' end as description,
      0::numeric as debit,
      dp.amount as credit,
      dp.created_at as sort_ts
    from dealer_payments dp
    where dp.dealer_id = p_dealer_id
  ),
  ordered as (
    select *,
      row_number() over (order by entry_date, sort_ts) as rn
    from entries
  )
  select
    o.entry_date,
    o.description,
    o.debit,
    o.credit,
    v_opening + sum(o.debit - o.credit) over (order by o.rn) as running_balance
  from ordered o
  order by o.entry_date, o.rn;
end;
$$;

comment on function get_dealer_ledger is
  'Chronological Debit/Credit ledger with running balance for a single dealer, starting from their opening_balance.';

-- ----------------------------------------------------------------------------
-- 3. APPLICABLE RATE LOOKUP
--    Finds the latest active dealer-specific rate effective on/before a given
--    date; falls back to the product's default_rate if no dealer rate exists.
-- ----------------------------------------------------------------------------

create or replace function get_applicable_rate(
  p_dealer_id uuid,
  p_product_id uuid,
  p_as_of date default current_date
)
returns numeric
language plpgsql
security invoker
stable
as $$
declare
  v_rate numeric;
begin
  select rate into v_rate
  from dealer_product_rates
  where dealer_id = p_dealer_id
    and product_id = p_product_id
    and active = true
    and effective_from <= p_as_of
  order by effective_from desc
  limit 1;

  if v_rate is null then
    select default_rate into v_rate from products where id = p_product_id;
  end if;

  return v_rate;
end;
$$;

comment on function get_applicable_rate is
  'Returns the dealer-specific rate effective as of the given date, or the product default_rate as fallback. Called by the Purchase form when dealer+product are selected; the resolved value is then stored as a snapshot on the purchases row.';
