"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { CreatePaymentSchema, UpdatePaymentStatusSchema } from "@/lib/validations";

async function requireFinance() {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user || (role !== "ADMIN" && role !== "FINANCE_OFFICER")) {
    throw new Error("Unauthorized: finance only");
  }
  return session;
}

// Unique feature (PRD §3.4): STIPEND disbursal blocked until required lessons complete.
export async function hasCompletedRequiredLessons(studentId: string) {
  const required = await prisma.financialLiteracyLesson.findMany({
    select: { id: true },
  });
  if (required.length === 0) return true;
  const done = await prisma.lessonProgress.count({
    where: { studentId, completed: true, lessonId: { in: required.map((l) => l.id) } },
  });
  return done >= required.length;
}

export async function createPayment(formData: FormData) {
  const session = await requireFinance();
  const parsed = CreatePaymentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Invalid input" };

  const payment = await prisma.payment.create({ data: parsed.data });
  await logAudit({
    actorId: session.user.id,
    action: "PAYMENT.CREATED",
    entity: "Payment",
    entityId: payment.id,
    metadata: { ...parsed.data },
  });
  revalidatePath(`/students/${parsed.data.studentId}`);
  revalidatePath("/finance");
  revalidateTag("pending-counts", { expire: 0 });
  revalidateTag("budget-totals", { expire: 0 });
  return { ok: true, paymentId: payment.id };
}

export async function updatePaymentStatus(formData: FormData) {
  const session = await requireFinance();
  const parsed = UpdatePaymentStatusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Invalid input" };

  const payment = await prisma.payment.findUnique({
    where: { id: parsed.data.paymentId },
  });
  if (!payment) return { ok: false, message: "Payment not found" };

  // Financial Literacy "Unlock" gate
  if (parsed.data.status === "DISBURSED" && payment.type === "STIPEND") {
    const unlocked = await hasCompletedRequiredLessons(payment.studentId);
    if (!unlocked) {
      return {
        ok: false,
        message: "Blocked: student must complete financial literacy lessons first",
      };
    }
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: parsed.data.status },
  });
  await logAudit({
    actorId: session.user.id,
    action: `PAYMENT.${parsed.data.status}`,
    entity: "Payment",
    entityId: payment.id,
    metadata: { studentId: payment.studentId, type: payment.type, amount: Number(payment.amount) },
  });
  revalidatePath(`/students/${payment.studentId}`);
  revalidatePath("/finance");
  revalidateTag("pending-counts", { expire: 0 });
  revalidateTag("budget-totals", { expire: 0 });
  return { ok: true };
}
