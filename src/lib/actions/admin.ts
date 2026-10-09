"use server";

import bcrypt from "bcryptjs";
import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { sanitizeOptionalText, sanitizeText } from "@/lib/sanitize";
import {
  CreateFeeStructureSchema,
  CreateLeaseSchema,
  CreatePartnerSchema,
  CreateStaffSchema,
  ResetPasswordSchema,
  SetUserActiveSchema,
  UpdateUserSchema,
} from "@/lib/validations";
import { requireFinance, requireAdmin } from "@/lib/rbac";

// Admin creates staff, donor, and partner accounts (no public signup).
export async function createStaff(formData: FormData) {
  const session = await requireAdmin();
  const parsed = CreateStaffSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }
  const name = sanitizeText(parsed.data.name, 200);
  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return { ok: false, message: "Email already exists" };

  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      name,
      role: parsed.data.role,
      passwordHash: await bcrypt.hash(parsed.data.password, 10),
    },
  });
  await logAudit({
    actorId: session.user.id,
    action: "USER.CREATED",
    entity: "User",
    entityId: user.id,
    metadata: { email: user.email, role: user.role },
  });
  revalidatePath("/admin/users");
  revalidateTag("setup-count", { expire: 0 });
  return { ok: true, userId: user.id };
}

export async function createPartner(formData: FormData) {
  const session = await requireAdmin();
  const parsed = CreatePartnerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }
  const name = sanitizeText(parsed.data.name, 200);
  const organizationName = sanitizeText(parsed.data.organizationName, 200);
  const bankDetails = sanitizeOptionalText(parsed.data.bankDetails, 1000);
  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return { ok: false, message: "Email already exists" };

  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      name,
      role: "EXTERNAL_PARTNER",
      passwordHash: await bcrypt.hash(parsed.data.password, 10),
      externalPartner: {
        create: {
          partnerType: parsed.data.partnerType,
          organizationName,
          bankDetails,
        },
      },
    },
  });
  await logAudit({
    actorId: session.user.id,
    action: "PARTNER.CREATED",
    entity: "User",
    entityId: user.id,
    metadata: { organization: organizationName, type: parsed.data.partnerType },
  });
  revalidatePath("/admin/users");
  revalidateTag("setup-count", { expire: 0 });
  return { ok: true, userId: user.id };
}

// Row actions for the /admin/users table. All ADMIN only.
export async function updateUser(formData: FormData) {
  const session = await requireAdmin();
  const parsed = UpdateUserSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }
  const target = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
  if (!target) return { ok: false, message: "Account not found" };
  if (target.id === session.user.id && parsed.data.role !== target.role) {
    return { ok: false, message: "You cannot change your own role" };
  }
  await prisma.user.update({
    where: { id: target.id },
    data: { name: sanitizeText(parsed.data.name, 200), role: parsed.data.role },
  });
  await logAudit({
    actorId: session.user.id,
    action: "USER.UPDATED",
    entity: "User",
    entityId: target.id,
    metadata: { name: parsed.data.name, role: parsed.data.role },
  });
  revalidatePath("/admin/users");
  revalidateTag("setup-count", { expire: 0 });
  return { ok: true };
}

export async function resetUserPassword(formData: FormData) {
  const session = await requireAdmin();
  const parsed = ResetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }
  const target = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
  if (!target) return { ok: false, message: "Account not found" };
  await prisma.user.update({
    where: { id: target.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 10) },
  });
  await logAudit({
    actorId: session.user.id,
    action: "USER.PASSWORD_RESET",
    entity: "User",
    entityId: target.id,
  });
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function setUserActive(formData: FormData) {
  const session = await requireAdmin();
  const parsed = SetUserActiveSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }
  const target = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
  if (!target) return { ok: false, message: "Account not found" };
  if (target.id === session.user.id && !parsed.data.isActive) {
    return { ok: false, message: "You cannot deactivate your own account" };
  }
  await prisma.user.update({
    where: { id: target.id },
    data: { isActive: parsed.data.isActive },
  });
  await logAudit({
    actorId: session.user.id,
    action: parsed.data.isActive ? "USER.REACTIVATED" : "USER.DEACTIVATED",
    entity: "User",
    entityId: target.id,
  });
  revalidatePath("/admin/users");
  revalidateTag("setup-count", { expire: 0 });
  return { ok: true };
}

// Fee structures with caps (PRD §3.2).
export async function createFeeStructure(formData: FormData) {
  const session = await requireFinance();
  const parsed = CreateFeeStructureSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }
  const fee = await prisma.feeStructure.upsert({
    where: {
      schoolName_academicYear: {
        schoolName: parsed.data.schoolName,
        academicYear: parsed.data.academicYear,
      },
    },
    update: { tuitionCap: parsed.data.tuitionCap, notes: parsed.data.notes },
    create: parsed.data,
  });
  await logAudit({
    actorId: session.user.id,
    action: "FEE_STRUCTURE.SAVED",
    entity: "FeeStructure",
    entityId: fee.id,
    metadata: { ...parsed.data },
  });
  revalidatePath("/finance/fees");
  return { ok: true };
}

// Lease tracking (PRD §3.2).
export async function createLease(formData: FormData) {
  const session = await requireFinance();
  const parsed = CreateLeaseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }
  const lease = await prisma.lease.create({
    data: {
      ...parsed.data,
      monthlyRent: parsed.data.monthlyRent,
      startDate: new Date(parsed.data.startDate),
      endDate: new Date(parsed.data.endDate),
    },
  });
  await logAudit({
    actorId: session.user.id,
    action: "LEASE.CREATED",
    entity: "Lease",
    entityId: lease.id,
    metadata: { studentId: parsed.data.studentId, landlord: parsed.data.landlordName },
  });
  revalidatePath(`/students/${parsed.data.studentId}`);
  return { ok: true, leaseId: lease.id };
}
