"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { CreateExpenseClaimSchema, ReviewClaimSchema } from "@/lib/validations";
import { getOwnStudentId, requireFinance } from "@/lib/rbac";

// Students submit for themselves; staff may submit on behalf via `studentId`.
export async function submitClaim(formData: FormData) {
  const session = await auth();
  if (!session?.user) return { ok: false, message: "Unauthorized" };

  const raw = Object.fromEntries(formData);
  const parsed = CreateExpenseClaimSchema.safeParse({
    ...raw,
    isEmergency: raw.isEmergency === "on" || raw.isEmergency === "true",
  });
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  let studentId = formData.get("studentId") as string | null;
  if (session.user.role === "STUDENT") {
    studentId = await getOwnStudentId(session.user.id);
    if (!studentId) return { ok: false, message: "No student profile" };
  }
  if (!studentId) return { ok: false, message: "Missing student" };

  const claim = await prisma.expenseClaim.create({
    data: { studentId, ...parsed.data },
  });
  await logAudit({
    actorId: session.user.id,
    action: parsed.data.isEmergency ? "CLAIM.EMERGENCY_SUBMITTED" : "CLAIM.SUBMITTED",
    entity: "ExpenseClaim",
    entityId: claim.id,
    metadata: { studentId, amount: parsed.data.amount },
  });
  revalidatePath(`/students/${studentId}`);
  revalidateTag("pending-counts", { expire: 0 });
  return { ok: true, claimId: claim.id };
}

export async function reviewClaim(formData: FormData) {
  const session = await requireFinance();
  const parsed = ReviewClaimSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Invalid input" };

  const claim = await prisma.expenseClaim.findUnique({ where: { id: parsed.data.claimId } });
  if (!claim) return { ok: false, message: "Claim not found" };
  if (claim.status !== "PENDING") return { ok: false, message: "Claim already reviewed" };

  await prisma.expenseClaim.update({
    where: { id: claim.id },
    data: { status: parsed.data.status, reviewedBy: session.user.id },
  });

  // Approved claims become reimbursable stipend payouts (PRD §3.3).
  if (parsed.data.status === "APPROVED") {
    await prisma.payment.create({
      data: {
        studentId: claim.studentId,
        type: "STIPEND",
        amount: claim.amount,
        status: "APPROVED",
      },
    });
  }

  await logAudit({
    actorId: session.user.id,
    action: `CLAIM.${parsed.data.status}`,
    entity: "ExpenseClaim",
    entityId: claim.id,
    metadata: { studentId: claim.studentId, amount: Number(claim.amount) },
  });
  revalidatePath(`/students/${claim.studentId}`);
  revalidatePath("/finance");
  revalidateTag("pending-counts", { expire: 0 });
  return { ok: true };
}
