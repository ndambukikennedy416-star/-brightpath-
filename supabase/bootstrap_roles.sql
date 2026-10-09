-- Portal role bootstrap (run in Supabase SQL Editor).
-- Everyone who signs in on the portal auto-gets role='student' (see
-- 20260926150000_portal_schema.sql handle_new_user trigger). Promote staff
-- with the statements below. Role changes apply on the next request;
-- nobody needs to sign out and back in.

-- 1. Who is on the portal?
select email, full_name, role, created_at
from public.profiles
order by created_at desc;

-- 2. Promote to financial officer (portal finance dashboard + queues).
update public.profiles
set role = 'financial_officer'
where email = 'officer@example.com';

-- 3. Promote to admin (portal admin dashboard + account management).
update public.profiles
set role = 'admin'
where email = 'owner@example.com';

-- 4. Verify.
select email, role from public.profiles order by email;

-- Allowed values (enforced by CHECK): admin, financial_officer,
-- monitor_evaluator, student. Main-app (NextAuth) accounts are separate;
-- everyone needs their own portal sign-in.
