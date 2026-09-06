-- ============================================================================
-- SEED DATA — safe to run once in any environment (idempotent via ON CONFLICT)
-- ============================================================================

-- Cafe settings (single row)
insert into cafe_settings (cafe_name, currency, timezone, default_milk_price, default_curd_price)
values ('Madurai Meenakshi Cafe', 'INR', 'Asia/Kolkata', 56.00, 70.00)
on conflict do nothing;

-- Default expense categories
insert into expense_categories (name) values
  ('Milk'), ('Curd'), ('Vegetables'), ('Groceries'), ('Bakery Items'),
  ('Tea/Coffee Materials'), ('Sugar'), ('Gas'), ('Electricity'), ('Water'),
  ('Rent'), ('Staff Salary'), ('Cleaning'), ('Maintenance'), ('Packaging'),
  ('Delivery'), ('Transportation'), ('Internet'), ('Marketing'), ('Repairs'),
  ('Miscellaneous')
on conflict (name) do nothing;

-- Products (Milk / Curd) — sample seed rates, editable by Admin in Settings
insert into products (name, unit, default_rate) values
  ('Milk', 'Liter', 56.00),
  ('Curd', 'Liter', 70.00)
on conflict (name) do nothing;

-- NOTE: Demo/development data (a full month of sales, expenses, purchases,
-- 5 staff, attendance, dealer payments) belongs in a separate
-- 999_demo_data.sql that is NEVER run against production. It will be
-- generated in a later phase alongside the Sales/Expenses modules so the
-- shapes match the real service layer exactly.
