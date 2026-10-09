-- Brightpath Kenya: Supabase-native portal schema (parallel to the Prisma app tables).
-- Run: supabase db push  (or paste into the SQL Editor).
-- Roles: admin, financial_officer, monitor_evaluator, student.

-- 1. Profiles (one row per Supabase Auth user) -----------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role text not null default 'student'
    check (role in ('admin', 'financial_officer', 'monitor_evaluator', 'student')),
  created_at timestamptz not null default now()
);

-- 2. Auto-create a profile on signup (email or Google OAuth) ----------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'student'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3. Role helper (security definer so RLS policies can call it) ------------
create or replace function public.current_role()
returns text
language sql
security definer set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid()
$$;

-- 4. Domain tables ----------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  type text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'paid', 'rejected')),
  method text,
  reference text,
  receipt_url text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table if not exists public.student_documents (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  file_url text not null,
  status text not null default 'pending'
    check (status in ('pending', 'verified', 'rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('school', 'landlord')),
  contact_person text,
  contact_phone text,
  bank_name text,
  account_name text,
  account_number text,
  paybill_number text,
  verified boolean not null default false,
  last_payment_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.financial_literacy_resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  file_url text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

-- 5. RLS --------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.payments enable row level security;
alter table public.student_documents enable row level security;
alter table public.accounts enable row level security;
alter table public.financial_literacy_resources enable row level security;

-- profiles: students read own; admin reads/updates all
drop policy if exists "profiles_read_own" on public.profiles;
create policy "profiles_read_own" on public.profiles
  for select using (id = auth.uid() or public.current_role() = 'admin');

drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update" on public.profiles
  for update using (public.current_role() = 'admin');

-- payments: students read own; M&E reads pending/paid only; finance+admin full
drop policy if exists "payments_student_own" on public.payments;
create policy "payments_student_own" on public.payments
  for select using (student_id = auth.uid());

drop policy if exists "payments_me_limited" on public.payments;
create policy "payments_me_limited" on public.payments
  for select using (
    public.current_role() = 'monitor_evaluator' and status in ('pending', 'paid')
  );

drop policy if exists "payments_finance_all" on public.payments;
create policy "payments_finance_all" on public.payments
  for all using (public.current_role() in ('financial_officer', 'admin'))
  with check (public.current_role() in ('financial_officer', 'admin'));

-- student_documents: students manage own; staff read all; finance/admin verify
drop policy if exists "docs_student_own" on public.student_documents;
create policy "docs_student_own" on public.student_documents
  for all using (student_id = auth.uid())
  with check (student_id = auth.uid());

drop policy if exists "docs_staff_read" on public.student_documents;
create policy "docs_staff_read" on public.student_documents
  for select using (
    public.current_role() in ('admin', 'financial_officer', 'monitor_evaluator')
  );

drop policy if exists "docs_finance_update" on public.student_documents;
create policy "docs_finance_update" on public.student_documents
  for update using (public.current_role() in ('admin', 'financial_officer'));

-- accounts (schools/landlords): finance + admin only
drop policy if exists "accounts_finance_all" on public.accounts;
create policy "accounts_finance_all" on public.accounts
  for all using (public.current_role() in ('financial_officer', 'admin'))
  with check (public.current_role() in ('financial_officer', 'admin'));

-- literacy resources: M&E manage; students read; finance/admin read
drop policy if exists "literacy_read" on public.financial_literacy_resources;
create policy "literacy_read" on public.financial_literacy_resources
  for select using (true);

drop policy if exists "literacy_me_manage" on public.financial_literacy_resources;
create policy "literacy_me_manage" on public.financial_literacy_resources
  for all using (public.current_role() in ('monitor_evaluator', 'admin'))
  with check (public.current_role() in ('monitor_evaluator', 'admin'));

-- 6. Storage for student uploads --------------------------------------------
insert into storage.buckets (id, name, public)
values ('student-docs', 'student-docs', false)
on conflict (id) do nothing;

drop policy if exists "docs_upload_own" on storage.objects;
create policy "docs_upload_own" on storage.objects
  for insert with check (
    bucket_id = 'student-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "docs_read_own" on storage.objects;
create policy "docs_read_own" on storage.objects
  for select using (
    bucket_id = 'student-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
