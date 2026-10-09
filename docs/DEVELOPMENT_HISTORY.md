# Brightpath Kenya Scholarship System - Development History

## 1. Origins

The project began with a study document, Brightpath Kenya Project Trial, a Project Study Guide for a Scholarship Management System covering school fees, accommodation, and living expenses for needy students. It defined the scholarship lifecycle (sourcing, onboarding, commitment, disbursement, monitoring, alumni), six core modules, PostgreSQL data architecture, and invoice approval workflows.

Stack chosen: Next.js 16 App Router, React 19, TypeScript, Prisma 7, Supabase Postgres/Auth/Storage/Edge Functions, NextAuth v5 (credentials plus Google), Resend for email, Tailwind 4, Vitest. Two apps share one database: a main staff app (NextAuth plus Prisma) and a Supabase-native portal (Supabase Auth plus RLS).

## 2. Recovery: finding and securing the project

- Located the real codebase at C:\Projects\brightpath after the Desktop folder turned out to be an empty decoy. VS Code history confirmed it.

- Verified identity: Prisma schema titled Scholarship Management System, Kenyan school seed data, M-PESA lessons, Brightpath Kenya landing page.

- Initialized git, then purged history after finding a hardcoded live database password committed and pushed. Rewrote to one clean commit and force-pushed. The password was rotated in Supabase and .env updated.

- Pinned six VS Code extensions (ESLint, Prisma, Tailwind, Vitest, Prettier, GitLens) and committed the recommendations file.

## 3. Stabilization

- Fixed all lint errors and warnings: ESM apply-sql script reading DATABASE_URL from env, purity-safe dashboard dates, effect-free dark-mode init, removed dead imports. Zero errors, zero warnings.

- Fixed a server rendering crash: NavShell used usePathname() with no Suspense boundary. Wrapped it in the root layout.

- Root URL now redirects to login for visitors and dashboard for signed-in users. Login page links to student portal sign-in.

## 4. Access control

- Audited every route: edge prefix rules in proxy.ts plus per-page checks. Closed the one gap (donor impact page).

- Google self-signup for Students (instant approval) and Financial Officers (PENDING until an admin approves). Other roles stay admin-provisioned. Signup page handles signed-in users with a sign-out notice instead of a silent bounce.

- Finance officers got their own dashboard: /dashboard redirects them to /finance, and the nav no longer shows them the admin dashboard.

- Enabled Google sign-in end to end and provisioned the owner account as ADMIN.

## 5. Student privacy

- Removed the Total award card from the student dashboard.

- Removed all amounts from student views: received totals, upcoming and recent payment values, application-status totals. Students see type, status, and date only.

- Closed the records-page leak: /students/[id] showed budget, disbursed totals, payment, invoice, claim, and rent figures to students. All money figures are now staff-gated on that page.

## 6. Portal feature build

- Document management: student-docs bucket with {student_id}/{tag}/{file} paths, PDF/JPG only, 5 MB cap, immutable cache headers. RLS: students own files, admin and M&E read all, finance reads fee/invoice files only. Verification flag derived from status.

- Email: send-payment-email Edge Function extended to four templates (receipt, status change, upload confirmation, application received), all with student name and specific details. Triggers wired into payment review, doc upload, and profile completion. Failures log to notification_log with an Error Log and Retry UI.

- Payment tracking: disbursement_date, payment_method, transaction_reference, approved_by, plus optional account links. Finance dashboard shows a disbursement ledger; method and reference are mandatory at initiation.

- Admin metrics: real head-count cards for applications, pending verification, and monthly disbursements. No fake counters.

## 7. Performance pass

- Added ten B-tree indexes on portal hot paths (payments, documents, profiles, notification log).

- Removed the only select(*), narrowed the admin total to paid amounts, capped every list query, added follow-up composite indexes.

- Declined with measured reasons: RLS already resolves roles in 0.2 ms via a security-definer helper (a JWT-claim rewrite would have broken authorization); no React Query (new dependency for behavior React.cache plus revalidation already provides); no thumbnail pipeline (lists render no images); no pooler port swap (Prisma requires session mode 5432).

## 8. FO dashboard build

- Rebuilt /portal/finance into four sections: initiation workspace with student search (name, school, status only), server-paginated ledger (20 per page with status/type/date filters), read-only account directory with school/landlord tabs and masked numbers, and the error log with retry.

- Account add/verify moved to /portal/admin and restricted to admins. Portal school column added so the portal reads only via supabase-js.

## 9. Email go-live

- Fixed a deploy-blocking import bug (bare resend specifier with no import map).

- Linked the Supabase project via CLI, set function secrets, deployed send-payment-email (ACTIVE v1).

- Remaining external step: verify brightpathkenya.org in Resend, then confirm live delivery.

## 10. Quality gates and docs

- 29 of 29 tests pass including live-DB integration with cleanup. Lint, typecheck, and production build are green.

- Wrote README runbook, full system documentation, portal bootstrap SQL, and UAT fixtures (labeled test accounts for both apps).

## 11. Key decisions log

- Portal layer hosts finance features because profiles, RLS, and the Edge Function live there; Prisma stays the staff system of record.

- Approval workflow kept two-step so receipts are never sent for unapproved money.

- Finance signups require approval; student signups do not (students see status only).

- Server-rendered pagination and filters instead of client libraries, per the minimal-UI rule.

## 12. Outstanding work

- UAT walkthrough as each role (fixtures ready).

- Resend domain verification and live email confirmation.

- Production deploy: hosting, Google prod redirect URLs, AUTH_URL, backups.
