"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { ATTENDANCE_THRESHOLD, GPA_THRESHOLD } from "@/lib/alerts";
import { CreateAcademicRecordSchema } from "@/lib/validations";
import { requireStaff } from "@/lib/rbac";

// Field agents and admins record termly grades/attendance (PRD §3.4).
export async function upsertAcademicRecord(formData: FormData) {
  const session = await requireStaff();
  const parsed = CreateAcademicRecordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  const record = await prisma.academicRecord.upsert({
    where: { studentId_term: { studentId: parsed.data.studentId, term: parsed.data.term } },
    update: { gpa: parsed.data.gpa, attendance: parsed.data.attendance },
    create: parsed.data,
  });

  // Automated alert flags (PRD §3.4).
  const reasons: string[] = [];
  if (parsed.data.gpa != null && parsed.data.gpa < GPA_THRESHOLD)
    reasons.push(`GPA ${parsed.data.gpa} below ${GPA_THRESHOLD}`);
  if (parsed.data.attendance != null && parsed.data.attendance < ATTENDANCE_THRESHOLD)
    reasons.push(`Attendance ${parsed.data.attendance}% below ${ATTENDANCE_THRESHOLD}%`);

  await logAudit({
    actorId: session.user.id,
    action: reasons.length > 0 ? "ACADEMIC.AT_RISK_FLAGGED" : "ACADEMIC.RECORDED",
    entity: "AcademicRecord",
    entityId: record.id,
    metadata: { studentId: parsed.data.studentId, term: parsed.data.term, reasons },
  });

  revalidatePath(`/students/${parsed.data.studentId}`);
  revalidatePath("/academics");
  revalidateTag("at-risk", { expire: 0 });
  return { ok: true, atRisk: reasons };
}
