# Cafe Manager — Madurai Meenakshi Cafe

Phase 1 delivery: **Supabase schema + RLS, Angular architecture, environment
config, Supabase client, Authentication, Application layout.**

## What's in this package

```
cafe-manager/
├── database/
│   ├── 001_schema.sql                          -- all tables, enums, constraints, indexes
│   ├── 002_rls_policies.sql                     -- RLS enabled + policies for every table
│   ├── 003_seed_data.sql                        -- default categories, products, cafe_settings
│   ├── 004_dealer_purchase_functions.sql        -- dealer outstanding view, ledger, rate lookup
│   ├── 005_staff_attendance_salary_functions.sql-- attendance summary + quick-attendance RPCs
│   └── 006_reports_dashboard_audit.sql          -- unified reporting RPC, dashboard, cash flow, audit triggers
└── frontend/
    └── src/app/
        ├── core/                -- services, guards, models, constants (shared across every module)
        ├── layout/               -- sidebar, navbar, app-layout shell
        └── features/
            ├── auth/             -- login, forgot/change password
            ├── dashboard/        -- today's summary, charts, quick actions
            ├── sales/            -- daily sales summary (one row/day), history, filters
            ├── expenses/         -- expense entries + category admin
            ├── products/         -- Milk/Curd master data (reached from Purchases)
            ├── dealers/          -- dealer master, ledger, payments, product rates
            ├── purchases/        -- milk/curd purchases with auto rate + total
            ├── staff/            -- staff master + advances
            ├── attendance/       -- quick daily attendance marking
            ├── salary/           -- configurable salary calculation + slip
            ├── daily-closing/    -- cash reconciliation, close/reopen day
            ├── reports/          -- daily/weekly/monthly reports, charts, CSV export
            └── settings/         -- cafe info, purchase/salary/app settings, audit log
```

## Status: all four build phases are now implemented

- **Phase 1** — Auth, layout, real Dashboard, Sales, Expenses + categories. ✅
- **Phase 2** — Dealers, Products, Dealer Rates, Purchases, Dealer Payments, Dealer Outstanding. ✅
- **Phase 3** — Staff, Attendance, Staff Advances, Salary. ✅
- **Phase 4** — Daily Closing, Reports + CSV export, Settings, Audit Log. ✅

## How to run it

1. **Create a Supabase project.**
2. Run the SQL files **in order** in the Supabase SQL editor:
   `001` → `002` → `003` → `004` → `005` → `006`.
3. Create your first user in Authentication → Users, then in the SQL editor:
   ```sql
   insert into profiles (id, full_name, role)
   values ('<the-auth-user-uuid>', 'Owner Name', 'admin');
   ```
4. Copy your Project URL and **anon public key** into `frontend/src/environments/environment.ts`.
5. `cd frontend && npm install && npm start`.

## Key assumptions made (per "choose the safest accounting behavior")

- **One sales record per day by default** (`sales_one_per_day` unique index). The Sales form checks for an existing entry on the selected date and redirects to editing it instead of erroring.
- **Purchase rates are snapshotted** on the `purchases` row itself, so historical totals never change when dealer prices update later.
- **Total Expense (for Dashboard/Reports) = Operating Expenses + Purchases (Milk/Curd) + Staff Cost.** Milk/Curd purchases are *never* re-entered in the Expenses module — they flow into reporting automatically at the SQL layer (`get_report_range`). Staff salary only counts once its `payment_status = 'paid'`, matching "staff salary should contribute to expenses after salary payment is recorded."
- **"Working days" for salary** = days in the month minus Weekly Off days, unless `salary_settings.weekly_off_paid` is `false` (then Weekly Off counts as unpaid absence). Paid Leave never reduces salary; Unpaid Leave is treated like Absent. This rule lives in `cafe_settings.salary_settings` (JSONB) and is editable from Settings without a schema change.
- **Audit logging** is generic (created/updated/deleted) via a single trigger function applied to every financially-sensitive table, *plus* explicit `day_closed` / `day_reopened` entries logged by the app when Daily Closing state changes — matching the spec's semantic action list.
- **Staff permissions** are boolean flags on `profiles` rather than a separate roles table (only two roles exist today); the `has_permission()` SQL function and `user_role` enum are the extension points for adding roles later.

## Known follow-ups (flagged, not silently skipped)

- `allowMultipleDailySalesEntries` is exposed as a Settings toggle, but actually relaxing it requires dropping/adjusting the `sales_one_per_day` unique index — the toggle alone does not change database behavior yet. A migration comment is left in the Settings screen.
- PDF/Excel export are not implemented (spec marks these as "can be added later"); CSV export is fully implemented for Reports.
- Report performance is fine at cafe scale (single query with `generate_series`); if the date range grows very large (multi-year), consider materializing `get_report_range` results.
