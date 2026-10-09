"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { SaveDocumentSchema } from "@/lib/validations";
import { canAccessStudent, requireStaff } from "@/lib/rbac";

// Record an uploaded file in a student's vault (files via /api/upload).
export async function saveDocument(formData: FormData) {
  const session = await auth();
  if (!session?.user) return { ok: false, message: "Unauthorized" };

  const parsed = SaveDocumentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  const allowed = await canAccessStudent(session.user.id, session.user.role, parsed.data.studentId);
  if (!allowed && !["ADMIN", "FINANCE_OFFICER", "FIELD_AGENT"].includes(session.user.role)) {
    return { ok: false, message: "Forbidden" };
  }

  const doc = await prisma.document.create({ data: parsed.data });
  await logAudit({
    actorId: session.user.id,
    action: "DOCUMENT.UPLOADED",
    entity: "Document",
    entityId: doc.id,
    metadata: { studentId: parsed.data.studentId, type: parsed.data.type },
  });
  revalidatePath(`/students/${parsed.data.studentId}`);
  return { ok: true, documentId: doc.id };
}

export async function verifyDocument(formData: FormData) {
  const session = await requireStaff();
  const documentId = formData.get("documentId") as string;
  if (!documentId) return { ok: false, message: "Missing document" };

  const doc = await prisma.document.update({
    where: { id: documentId },
    data: { status: "VERIFIED", verifiedBy: session.user.id, verifiedAt: new Date() },
  });
  await logAudit({
    actorId: session.user.id,
    action: "DOCUMENT.VERIFIED",
    entity: "Document",
    entityId: doc.id,
    metadata: { studentId: doc.studentId },
  });
  revalidatePath(`/students/${doc.studentId}`);
  revalidatePath("/finance");
  return { ok: true };
}

export async function rejectDocument(formData: FormData) {
  const session = await requireStaff();
  const documentId = formData.get("documentId") as string;
  if (!documentId) return { ok: false, message: "Missing document" };

  const doc = await prisma.document.update({
    where: { id: documentId },
    data: { status: "REJECTED", verifiedBy: session.user.id, verifiedAt: new Date() },
  });
  await logAudit({
    actorId: session.user.id,
    action: "DOCUMENT.REJECTED",
    entity: "Document",
    entityId: doc.id,
    metadata: { studentId: doc.studentId },
  });
  revalidatePath(`/students/${doc.studentId}`);
  revalidatePath("/finance");
  return { ok: true };
}
