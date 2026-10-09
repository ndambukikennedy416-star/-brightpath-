-- FO dashboard support tables/columns (2026-10-09).
-- Apply: node apply-sql.mjs supabase/migrations/20261009_fo_workspace.sql
-- Idempotent, additive only (no drops, no renames).

-- Optional payment -> account link (workspace initiation).
alter table public.payments
  add column if not exists account_id uuid
  references public.accounts (id) on delete set null;

-- Optional account -> student link (directory association).
alter table public.accounts
  add column if not exists student_id uuid
  references public.profiles (id) on delete set null;

-- Email dispatch failure log (error-log section + retry).
create table if not exists public.notification_log (
  id uuid primary key default gen_random_uuid(),
  template text not null,
  payment_id uuid references public.payments (id) on delete set null,
  document_id uuid references public.student_documents (id) on delete set null,
  recipient_email text,
  status text not null default 'failed'
    check (status in ('failed', 'sent')),
  error text,
  attempts integer not null default 1,
  created_at timestamptz not null default now()
);

alter table public.notification_log enable row level security;

drop policy if exists "notif_finance_all" on public.notification_log;
create policy "notif_finance_all" on public.notification_log
  for all using (public.current_role() in ('financial_officer', 'admin'))
  with check (public.current_role() in ('financial_officer', 'admin'));

create index if not exists notification_log_status_idx
  on public.notification_log (status, created_at desc);
