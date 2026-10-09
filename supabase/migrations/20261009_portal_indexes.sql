-- Brightpath portal query indexes (2026-10-09).
-- Apply: node apply-sql.mjs supabase/migrations/20261009_portal_indexes.sql
-- or paste into the Supabase SQL Editor. Idempotent, additive only.
--
-- NOTE: student_documents has no `uploaded_at` column — the timestamp is
-- `created_at`. Indexing a nonexistent column would fail, so created_at is
-- intentionally NOT indexed (all created_at orderings are limit-capped).

-- payments: filtered by student (dashboards), status (queues/counts),
-- and disbursement_date (monthly metrics).
create index if not exists payments_student_id_idx
  on public.payments (student_id);
create index if not exists payments_status_idx
  on public.payments (status);
create index if not exists payments_disbursement_date_idx
  on public.payments (disbursement_date desc);

-- student_documents: filtered by owner (student views), status (verify
-- queues/counts), and type (finance-scoped RLS policy checks).
create index if not exists student_documents_student_id_idx
  on public.student_documents (student_id);
create index if not exists student_documents_status_idx
  on public.student_documents (status);
create index if not exists student_documents_type_idx
  on public.student_documents (type);

-- profiles: role-filtered roster queries (student dropdowns, admin counts).
create index if not exists profiles_role_idx
  on public.profiles (role);
