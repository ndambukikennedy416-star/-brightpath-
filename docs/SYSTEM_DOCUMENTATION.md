# Brightpath Kenya — System Documentation

Scholarship Management System for Brightpath Kenya. Manages school fees,
accommodation, and living-expense disbursements to needy students, plus
academic monitoring, documents, financial literacy, and donor reporting.

## 1. Architecture

One repo, two cooperating apps sharing one Supabase Postgres database:

| Layer | Tech | Purpose |
| ----- | ---- | ------- |
| Main app | Next.js 16 App Router, Prisma 7, NextAuth v5 | Staff workflows: students, finance, academics, donors, reports, literacy, audit, admin |
| Portal | Next.js routes + Supabase Auth/Storage/Edge Functions | Role dashboards: admin, financial officer, M&E, student |
| Database | Supabase Postgres (session pooler 5432) | Prisma-managed tables + Supabase-native portal tables |
| Email | Resend via `send-payment-email` Edge Function | Receipts, status, upload, and application notifications |
| Storage | Supabase Storage bucket `student-docs` (private) | Student document uploads |

Canonical project location: `C:\Projects\brightpath`.
GitHub: `https://github.com/ndambukikennedy416-star/-brightpath-.git` (branch `master`).

## 2. Roles and dashboards

Main app roles (`UserRole`): ADMIN, FINANCE_OFFICER, FIELD_AGENT, STUDENT,
EXTERNAL_PARTNER, DONOR.

| Role | Home | Can access |
| ---- | ---- | ---------- |
| ADMIN | `/dashboard` | Everything, `/admin/*`, `/audit` |
| FINANCE_OFFICER | `/finance` | Finance queues, students, reports, partners, literacy |
| FIELD_AGENT | `/dashboard` | Students, academics, literacy |
| STUDENT | `/student` + own `/students/[id]` | Own scholarship, profile, literacy. Status labels only, never amounts |
| EXTERNAL_PARTNER | `/partners` | Own invoices |
| DONOR | `/donors/impact` | Impact window + reports |

Portal roles (`profiles.role`): admin, financial_officer, monitor_evaluator,
student. Homes: `/portal/admin`, `/portal/finance`, `/portal/me`, `/portal/student`.

Enforcement is two-layer: `src/proxy.ts` prefix rules at the edge, plus
per-page checks via `auth()` and `src/lib/rbac.ts`. Portal writes additionally
pass Supabase RLS as the signed-in user.

## 3. Authentication

- Staff/students (main): email + password (bcrypt) or Google OAuth.
- Google sign-in works only for provisioned accounts, except self-registered
  STUDENT (instant) and FINANCE_OFFICER (PENDING until an admin approves in
  `/admin/users`). Other roles are admin-provisioned only.
- Signup lives at `/signup` (role choice stored in a short-lived cookie).
- Portal: separate Supabase Auth accounts at `/portal-login` (password or
  Google). Portal roles are assigned in SQL, see `supabase/bootstrap_roles.sql`.
- Google Cloud Console holds one OAuth 2.0 client (project `brightpath-kenya`)
  used by both NextAuth and Supabase Auth. Registered callbacks:
  `http://localhost:3000/api/auth/callback/google` and the Supabase
  `/auth/v1/callback` URL. Add production URLs before deploying.

## 4. Money flows

Main app (`/finance`): record payment (PENDING) -> approve -> disburse
(DISBURSED), plus invoices, expense claims, leases, fee structures, receipts
(PDF). Stipends are literacy-gated.

Portal (`/portal/finance`): initiate (method + reference required) -> approve
(stamps officer) -> mark paid (stamps date, queues receipt email). Ledger shows
Date | Student | Type | Amount | Status (Processing/Completed/Failed labels) |
Reference, 20 per page with status/type/date filters. Account directory is
read-only for finance; admins manage accounts in `/portal/admin`.

## 5. Privacy rules (non-negotiable)

- Students see payment STATUS only (pending/approved/paid), never amounts,
  budgets, utilization, rents, or invoice values. Enforced on `/student/*`
  and `/students/[id]` (staff see full figures on the same pages).
- Donor impact page shows aggregates only, no student PII.
- Portal finance officers see only fee/invoice document rows and files;
  admins and M&E see all.

## 6. Documents

- Uploads go to `student-docs/{student_id}/{tag}/{file}` where tag is
  `fee_structure`, `result_slip`, `landlord_invoice`, `id`, or `other`.
- Validation: PDF/JPG only, 5 MB max, immutable cache headers.
- RLS: students own files only; admin/M&E read all; finance reads
  fee/invoice files only. `student_documents.verified` is generated from
  `status`, so there is a single source of truth.

## 7. Email

Edge Function `supabase/functions/send-payment-email` (Resend). Templates:
`payment_receipt`, `payment_status`, `document_uploaded`,
`application_received`. Triggers: mark-paid/approve/reject, portal doc
upload, first profile completion. Failures land in `notification_log` and the
portal finance Error Log with Retry. Requires function secrets
(`RESEND_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) and a
verified sender domain in Resend.

## 8. Environment

Required in `.env` (never committed): `DATABASE_URL` (5432 session pooler;
Prisma cannot use 6543 transaction mode), `AUTH_SECRET`, `AUTH_URL`,
`GOOGLE_CLIENT_ID/SECRET`, `ENCRYPTION_KEY`, `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server only).
See `.env.example` for shapes.

## 9. Workflows

```bash
npm install
npx prisma migrate status   # schema must report "up to date"
npm run dev                 # http://localhost:3000
npm run lint                # zero errors/warnings required
npx tsc --noEmit
npm test                    # unit; RUN_DB_TESTS=1 for live-DB integration
npm run build               # production check
node apply-sql.mjs supabase/migrations/<file>.sql  # portal SQL
npx supabase functions deploy send-payment-email
```

Seed: `npx prisma db seed` (first admin + lessons + fee caps).

## 10. Key files

- `src/app/*/page.tsx` + `src/app/portal/*` — screens
- `src/lib/actions/*` — main-app mutations; `src/lib/portal/*` — portal actions
- `src/lib/auth.ts`, `src/lib/rbac.ts`, `src/proxy.ts` — access control
- `prisma/schema.prisma`, `prisma/seed.ts` — main data model
- `supabase/migrations/` — portal schema, RLS, indexes
- `supabase/bootstrap_roles.sql` — portal role assignment runbook
- `tools/` — maintenance scripts (temporary `tmp-*` scripts are deleted after use)

## 11. Troubleshooting

- Stale Turbopack chunks (old errors, `(stale)` badge): restart dev, hard-refresh.
- Google login rejected: email not provisioned/approved, or Testing-mode app.
- `redirect_uri_mismatch`: register the exact callback URL in Google Console.
- Email not arriving: check portal Error Log; verify Resend domain + secrets.
- Push hangs: sign in via VS Code terminal once so credentials cache.
