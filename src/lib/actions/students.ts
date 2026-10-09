"use server";

import bcrypt from "bcryptjs";
import { revalidatePath, revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { CreateStudentSchema,
  ChangeOwnPasswordSchema,
  UpdateOwnProfileSchema,
  UpdateStudentProfileSchema,
  UpdateStudentStatusSchema,
} from "@/lib/validations";
import { getOwnStudentId, requireFinance } from "@/lib/rbac";
import { sanitizeOptionalText } from "@/lib/sanitize";
import { logEmailFailure, sendPortalTemplate } from "@/lib/portal/notify";

// Admin-only: onboarding happens post-acceptance, no public signup (PRD §3.1).
async function requireAdmin() {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user || (role !== "ADMIN" && role !== "FINANCE_OFFICER")) {
    throw new Error("Unauthorized: admin only");
  }
  return session;
}

export async function createStudent(formData: FormData) {
  const session = await requireAdmin();
  const parsed = CreateStudentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }
  const { name, email, password, schoolName, currentYear, totalBudget, ...payout } =
    parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { ok: false, message: "Email already exists" };

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      name,
      role: "STUDENT",
      passwordHash,
      student: {
        create: { schoolName, currentYear, totalBudget, ...payout },
      },
    },
    include: { student: true },
  });

  await logAudit({
    actorId: session.user.id,
    action: "STUDENT.CREATED",
    entity: "Student",
    entityId: user.student?.id,
    metadata: { email, schoolName },
  });
  revalidatePath("/students");
  revalidateTag("budget-totals", { expire: 0 });
  return { ok: true, studentId: user.student?.id };
}

export async function updateStudentStatus(formData: FormData) {
  const session = await requireAdmin();
  const parsed = UpdateStudentStatusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Invalid input" };

  await prisma.student.update({
    where: { id: parsed.data.studentId },
    data: { status: parsed.data.status },
  });
  await logAudit({
    actorId: session.user.id,
    action: `STUDENT.STATUS_${parsed.data.status}`,
    entity: "Student",
    entityId: parsed.data.studentId,
  });
  revalidatePath(`/students/${parsed.data.studentId}`);
  revalidatePath("/students");
  revalidateTag("at-risk", { expire: 0 });
  return { ok: true };
}

export async function updateStudentProfile(formData: FormData) {
  const session = await requireAdmin();
  const parsed = UpdateStudentProfileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }
  const { studentId, ...data } = parsed.data;
  await prisma.student.update({ where: { id: studentId }, data });
  await logAudit({
    actorId: session.user.id,
    action: "STUDENT.UPDATED",
    entity: "Student",
    entityId: studentId,
  });
  revalidatePath(`/students/${studentId}`);
  return { ok: true };
}

// Student self-service: a signed-in student may update only their OWN
// contact/payout fields. School, year, and budget stay staff-managed.
export async function updateOwnProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "STUDENT") {
    return { ok: false, message: "Students only" };
  }
  const studentId = await getOwnStudentId(session.user.id);
  if (!studentId) return { ok: false, message: "No beneficiary profile yet — contact your administrator." };

  const parsed = UpdateOwnProfileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }
  const before = await prisma.student.findUnique({
    where: { id: studentId },
    select: { phone: true, mobileMoneyNumber: true },
  });
  await prisma.student.update({
    where: { id: studentId },
    data: {
      phone: sanitizeOptionalText(parsed.data.phone, 30),
      bankName: sanitizeOptionalText(parsed.data.bankName, 100),
      bankAccountNumber: sanitizeOptionalText(parsed.data.bankAccountNumber, 50),
      mobileMoneyProvider: sanitizeOptionalText(parsed.data.mobileMoneyProvider, 50),
      mobileMoneyNumber: parsed.data.mobileMoneyNumber,
      emergencyContactName: sanitizeOptionalText(parsed.data.emergencyContactName, 200),
      emergencyContactPhone: sanitizeOptionalText(parsed.data.emergencyContactPhone, 30),
    },
  });
  await logAudit({
    actorId: session.user.id,
    action: "STUDENT.SELF_UPDATED",
    entity: "Student",
    entityId: studentId,
  });
  // First-time contact completion counts as the application submission:
  // confirm receipt once, with the student's own details.
  const hadContact = Boolean(before?.phone || before?.mobileMoneyNumber);
  const hasContact = Boolean(parsed.data.phone || parsed.data.mobileMoneyNumber);
  if (!hadContact && hasContact && session.user.email) {
    const sent = await sendPortalTemplate({
      template: "application_received",
      studentEmail: session.user.email,
      studentName: session.user.name ?? "Student",
      detail: "contact and payout details",
    });
    if (!sent.ok) {
      await logEmailFailure({
        template: "application_received",
        recipient: session.user.email,
        error: sent.error,
      });
    }
  }
  revalidatePath("/student/profile");
  return { ok: true };
}

// A signed-in student changes their own password (e.g. replaces the
// admin-issued temporary one). Current password must verify first.
export async function changeOwnPassword(formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "STUDENT") {
    return { ok: false, message: "Students only" };
  }
  const parsed = ChangeOwnPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.passwordHash) return { ok: false, message: "No password set — contact your administrator." };
  const ok = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!ok) return { ok: false, errors: { currentPassword: ["Current password is incorrect."] } };

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 10) },
  });
  await logAudit({
    actorId: session.user.id,
    action: "STUDENT.PASSWORD_CHANGED",
    entity: "User",
    entityId: user.id,
  });
  return { ok: true };
}

// Bulk-import accepted beneficiaries from CSV:
// name,email,password,schoolName,currentYear,totalBudget (one per line, no header).
export async function bulkImportStudents(formData: FormData) {
  const session = await requireFinance();
  const csv = (formData.get("csv") as string | null)?.trim();
  if (!csv) return { ok: false, message: "Paste CSV rows first" };

  let created = 0;
  const errors: string[] = [];
  const lines = csv.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());
    if (cols.length < 6 || cols.every((c) => c === "")) {
      if (cols.some((c) => c !== "")) errors.push(`Row ${i + 1}: need 6 columns`);
      continue;
    }
    const [name, email, password, schoolName, currentYear, totalBudget] = cols;
    const parsed = CreateStudentSchema.safeParse({
      name, email, password, schoolName, currentYear, totalBudget,
    });
    if (!parsed.success) {
      errors.push(`Row ${i + 1}: ${parsed.error.issues[0]?.message ?? "invalid"}`);
      continue;
    }
    try {
      const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
      if (existing) {
        errors.push(`Row ${i + 1}: email exists`);
        continue;
      }
      await prisma.user.create({
        data: {
          email: parsed.data.email,
          name: parsed.data.name,
          role: "STUDENT",
          passwordHash: await bcrypt.hash(parsed.data.password, 10),
          student: {
            create: {
              schoolName: parsed.data.schoolName,
              currentYear: parsed.data.currentYear,
              totalBudget: parsed.data.totalBudget,
            },
          },
        },
      });
      created++;
    } catch {
      errors.push(`Row ${i + 1}: save failed`);
    }
  }

  await logAudit({
    actorId: session.user.id,
    action: "STUDENT.BULK_IMPORTED",
    entity: "Student",
    metadata: { created, failed: errors.length },
  });
  revalidatePath("/students");
  return { ok: true, created, errors };
}
