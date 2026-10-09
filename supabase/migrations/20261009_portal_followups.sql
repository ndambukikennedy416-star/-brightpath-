-- Portal FO follow-ups (2026-10-09).
-- Apply: node apply-sql.mjs supabase/migrations/20261009_portal_followups.sql
-- Idempotent, additive only.
--
-- NOTE: student_documents has no `uploaded_at` column (its timestamp is
-- created_at). The composites below match the real filter patterns instead.

-- School display for the finance workspace, kept portal-side so the
-- portal reads only via supabase-js (backfilled once from the registry).
alter table public.profiles
  add column if not exists school text;

-- Ledger month/status queues filter on both columns together.
create index if not exists payments_status_disbursement_idx
  on public.payments (status, disbursement_date desc);

-- Student views filter owner + status together.
create index if not exists student_documents_student_status_idx
  on public.student_documents (student_id, status);

-- notification_log already indexed by (status, created_at desc) in
-- 20260927_portal_enhancements.sql; RLS policies already resolve roles via
-- the STABLE SECURITY DEFINER current_role() helper (measured 0.2 ms),
-- so no policy rewrites are included here.
