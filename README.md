# Brightpath Kenya — Scholarship Management System

Supports accepted scholarship students with school fees, upkeep, and academic
guidance. Two apps in one repo:

- **Main app** (Next.js + Prisma + NextAuth): staff workflows for students,
  finance, academics, donors, reports, literacy, audit.
- **Portal** (Next.js + Supabase Auth/Storage/Edge Functions): role dashboards
  for admin, financial officers, M&E, and students (payments, documents,
  accounts, notifications).

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Prisma 7 ·
PostgreSQL via Supabase (session pooler, port 5432) · Supabase Auth/Storage/
Edge Functions · NextAuth v5 (credentials + Google) · Resend (email) ·
Tailwind 4 · Vitest.

## Getting started

```bash
npm install
cp .env.example .env   # then fill in values (never commit .env)
npx prisma migrate status
npm run dev            # http://localhost:3000
```

Seed the first admin + Kenyan lessons/fee caps:

```bash
npx prisma db seed
# admin@brightpath.local / Admin123! (change immediately)
```

## Scripts

| Command          | Purpose                                  |
| ---------------- | ---------------------------------------- |
| `npm run dev`    | Dev server with Turbopack                |
| `npm run build`  | Production build                         |
| `npm run lint`   | ESLint (must be zero errors + warnings)  |
| `npm test`       | Vitest (unit; DB tests need RUN_DB_TESTS) |
| `RUN_DB_TESTS=1 npm test` | Full suite incl. live-DB integration |
| `npm run db:migrate` | `prisma migrate dev`                  |
| `npm run db:seed`    | Seed admin + lessons + fee caps       |
| `npm run db:studio`  | Prisma Studio                         |

## Entry points

- `/` redirects to `/login` (signed out) or `/dashboard` (signed in).
- Staff sign in at `/login` (email/password or Google for provisioned accounts).
  New students/officers register at `/signup` (officers need admin approval).
- Portal users sign in at `/portal-login`; role homepages: `/portal/admin`,
  `/portal/finance`, `/portal/me` (M&E), `/portal/student`.
- Portal staff roles are assigned in SQL, see `supabase/bootstrap_roles.sql`.

## Supabase

- SQL migrations live in `supabase/migrations/` and are applied with
  `node apply-sql.mjs <file>` (pooler owner connection).
- Edge Function `send-payment-email` (Resend templates for receipts, status,
  uploads, applications): `npx supabase functions deploy send-payment-email`.
- Storage bucket `student-docs` (private). Uploads go to
  `{student_id}/{tag}/{file}` with PDF/JPG-only, 5 MB enforcement.

## Rules for contributors

- Students never see money amounts or budgets — status labels only.
- Finance officers work in `/finance` (main) and `/portal/finance`; admins
  own `/dashboard`, `/admin/*`, and portal account management.
- Keep UI minimal: standard rounded buttons, neutral colors, no animations,
  no em dashes in user-facing copy.
- `npm run lint`, `npx tsc --noEmit`, and `npm test` must all pass before push.
