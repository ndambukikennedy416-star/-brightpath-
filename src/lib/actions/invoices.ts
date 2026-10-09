"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { CreateInvoiceSchema, ReviewInvoiceSchema } from "@/lib/validations";
import { requireFinance } from "@/lib/rbac";

// Partners submit invoices for their students; staff may submit on behalf.
export async function submitInvoice(formData: FormData) {
  const session = await auth();
  if (!session?.user) return { ok: false, message: "Unauthorized" };

  const parsed = CreateInvoiceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  let partnerId = formData.get("partnerId") as string | null;
  if (session.user.role === "EXTERNAL_PARTNER") {
    const partner = await prisma.externalPartner.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!partner) return { ok: false, message: "No partner profile" };
    partnerId = partner.id;
  }
  if (!partnerId) return { ok: false, message: "Missing partner" };

  const invoice = await prisma.invoice.create({ data: { ...parsed.data, partnerId } });
  await logAudit({
    actorId: session.user.id,
    action: "INVOICE.SUBMITTED",
    entity: "Invoice",
    entityId: invoice.id,
    metadata: { ...parsed.data, partnerId },
  });
  revalidatePath(`/students/${parsed.data.studentId}`);
  revalidatePath("/finance");
  revalidateTag("pending-counts", { expire: 0 });
  return { ok: true, invoiceId: invoice.id };
}

export async function reviewInvoice(formData: FormData) {
  const session = await requireFinance();
  const parsed = ReviewInvoiceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Invalid input" };

  const invoice = await prisma.invoice.findUnique({ where: { id: parsed.data.invoiceId } });
  if (!invoice) return { ok: false, message: "Invoice not found" };
  if (invoice.status !== "PENDING") return { ok: false, message: "Invoice already reviewed" };

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: { status: parsed.data.status },
  });

  // Approved invoices become payable disbursements to the institution/landlord.
  if (parsed.data.status === "APPROVED") {
    await prisma.payment.create({
      data: {
        studentId: invoice.studentId,
        type: invoice.type,
        amount: invoice.amount,
        status: "APPROVED",
      },
    });
  }

  await logAudit({
    actorId: session.user.id,
    action: `INVOICE.${parsed.data.status}`,
    entity: "Invoice",
    entityId: invoice.id,
    metadata: { studentId: invoice.studentId, amount: Number(invoice.amount) },
  });
  revalidatePath(`/students/${invoice.studentId}`);
  revalidatePath("/finance");
  revalidateTag("pending-counts", { expire: 0 });
  return { ok: true };
}
