import { cache } from "react";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

// Two-layer caching (per caching-without-cache-components guide):
// - unstable_cache: shared across requests, time-bounded (revalidate) +
//   on-demand invalidated via revalidateTag in mutation actions.
// - React.cache: dedupes duplicate calls within the same request (Nav in root
//   layout + page both read the same counts).
// Stale windows are short (30-60s) and every mutation that changes these
// numbers calls revalidateTag, so approve/disburse flows stay fresh.

const getPendingCountsUncached = unstable_cache(
  async () => {
    const [payments, invoices, claims] = await Promise.all([
      prisma.payment.count({ where: { status: "PENDING" } }),
      prisma.invoice.count({ where: { status: "PENDING" } }),
      prisma.expenseClaim.count({ where: { status: "PENDING" } }),
    ]);
    return { payments, invoices, claims };
  },
  ["pending-counts"],
  { tags: ["pending-counts"], revalidate: 30 }
);

const getBudgetTotalsUncached = unstable_cache(
  async () => {
    const [disbursedAgg, budgetAgg] = await Promise.all([
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: "DISBURSED" },
      }),
      prisma.student.aggregate({ _sum: { totalBudget: true } }),
    ]);
    return {
      disbursed: Number(disbursedAgg._sum.amount ?? 0),
      budget: Number(budgetAgg._sum.totalBudget ?? 0),
    };
  },
  ["budget-totals"],
  { tags: ["budget-totals"], revalidate: 60 }
);

const getStudentsNeedingSetupCountUncached = unstable_cache(
  async () => {
    return prisma.user.count({
      where: { role: "STUDENT", isActive: true, student: { is: null } },
    });
  },
  ["students-needing-setup"],
  { tags: ["setup-count"], revalidate: 60 }
);

export const getPendingCounts = cache(() => getPendingCountsUncached());

export const getBudgetTotals = cache(() => getBudgetTotalsUncached());

// Single COUNT instead of findMany + JS filter: counts STUDENT users with no
// beneficiary profile (Google self-registrations needing setup).
export const getStudentsNeedingSetupCount = cache(() =>
  getStudentsNeedingSetupCountUncached()
);
