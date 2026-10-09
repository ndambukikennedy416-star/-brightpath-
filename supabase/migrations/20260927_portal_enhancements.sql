-- Brightpath portal enhancements (2026-09-27).
-- Apply: node apply-sql.mjs supabase/migrations/20260927_portal_enhancements.sql
-- Idempotent: safe to re-run (IF NOT EXISTS / DROP IF EXISTS throughout).

-- 1. Payment tracking fields on portal payments ------------------------------
alter table public.payments
  add column if not exists disbursement_date timestamptz;
alter table public.payments
  add column if not exists payment_method text
  check (payment_method in ('bank_transfer', 'mobile_money', 'check'));
alter table public.payments
  add column if not exists transaction_reference text unique;
alter table public.payments
  add column if not exists approved_by uuid
  references public.profiles (id) on delete set null;

-- 2. Verified flag derived from status (single source of truth, no drift) ----
alter table public.student_documents
  add column if not exists verified boolean
  generated always as (status = 'verified') stored;

-- 3. Document table access: finance sees fee/invoice rows only --------------
drop policy if exists "docs_staff_read" on public.student_documents;
create policy "docs_staff_read" on public.student_documents
  for select using (
    public.current_role() in ('admin', 'monitor_evaluator')
  );

drop policy if exists "docs_finance_fee_read" on public.student_documents;
create policy "docs_finance_fee_read" on public.student_documents
  for select using (
    public.current_role() = 'financial_officer'
    and type in ('Fee Structure', 'Landlord Invoice')
  );

-- 4. Storage objects: staff read-all + finance fee/invoice scope -------------
-- Upload paths are {student_id}/{tag}/{file}, so foldername(name)[1] is the
-- owner uid (existing own-file policies keep working) and [2] is the tag.
drop policy if exists "docs_staff_read_all" on storage.objects;
create policy "docs_staff_read_all" on storage.objects
  for select using (
    bucket_id = 'student-docs'
    and public.current_role() in ('admin', 'monitor_evaluator')
  );

drop policy if exists "docs_finance_fee_read" on storage.objects;
create policy "docs_finance_fee_read" on storage.objects
  for select using (
    bucket_id = 'student-docs'
    and public.current_role() = 'financial_officer'
    and (storage.foldername(name))[2] in ('fee_structure', 'landlord_invoice')
  );
