"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { sanitizeOptionalText, sanitizeText } from "@/lib/sanitize";
import {
  RecipientSchema,
  ReviewRecipientSchema,
  SetRecipientActiveSchema,
  UpdateRecipientSchema,
} from "@/lib/validations";
import { requireFinance } from "@/lib/rbac";

// Payment recipients are DATA ONLY — this module never creates User accounts,
// so schools/landlords cannot authenticate, by construction.
function secretsFrom(data: {
  accountNumber?: string;
  paybillNumber?: string;
}) {
  return {
    accountNumberEnc: data.accountNumber ? encryptSecret(data.accountNumber.trim()) : null,
    paybillNumberEnc: data.paybillNumber ? encryptSecret(data.paybillNumber.trim()) : null,
  };
}

export async function createRecipient(formData: FormData) {
  const session = await requireFinance();
  const parsed = RecipientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }
  const d = parsed.data;
  const recipient = await prisma.paymentRecipient.create({
    data: {
      displayName: sanitizeText(d.displayName, 200),
      institutionType: d.institutionType,
      contactPersonName: sanitizeText(d.contactPersonName, 200),
      contactPhone: sanitizeText(d.contactPhone, 30),
      accountName: sanitizeText(d.accountName, 200),
      bankName: sanitizeOptionalText(d.bankName, 100),
      mobileMoneyRef: sanitizeOptionalText(d.mobileMoneyRef, 100),
      notes: sanitizeOptionalText(d.notes, 1000),
      createdById: session.user.id,
      ...secretsFrom(d),
    },
  });
  await logAudit({
    actorId: session.user.id,
    action: "RECIPIENT.CREATED",
    entity: "PaymentRecipient",
    entityId: recipient.id,
    metadata: { displayName: d.displayName, type: d.institutionType },
  });
  revalidatePath("/finance/recipients");
  return { ok: true, recipientId: recipient.id };
}

export async function updateRecipient(formData: FormData) {
  const session = await requireFinance();
  const parsed = UpdateRecipientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }
  const { recipientId, accountNumber, paybillNumber, ...rest } = parsed.data;
  const existing = await prisma.paymentRecipient.findUnique({ where: { id: recipientId } });
  if (!existing) return { ok: false, message: "Recipient not found" };

  await prisma.paymentRecipient.update({
    where: { id: recipientId },
    data: {
      displayName: sanitizeText(rest.displayName, 200),
      institutionType: rest.institutionType,
      contactPersonName: sanitizeText(rest.contactPersonName, 200),
      contactPhone: sanitizeText(rest.contactPhone, 30),
      accountName: sanitizeText(rest.accountName, 200),
      bankName: sanitizeOptionalText(rest.bankName, 100),
      mobileMoneyRef: sanitizeOptionalText(rest.mobileMoneyRef, 100),
      notes: sanitizeOptionalText(rest.notes, 1000),
      // Only overwrite secrets when a new value is supplied.
      ...(accountNumber ? { accountNumberEnc: encryptSecret(accountNumber.trim()) } : {}),
      ...(paybillNumber ? { paybillNumberEnc: encryptSecret(paybillNumber.trim()) } : {}),
    },
  });
  await logAudit({
    actorId: session.user.id,
    action: "RECIPIENT.UPDATED",
    entity: "PaymentRecipient",
    entityId: recipientId,
  });
  revalidatePath("/finance/recipients");
  return { ok: true };
}

export async function reviewRecipient(formData: FormData) {
  const session = await requireFinance();
  const parsed = ReviewRecipientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Invalid input" };

  await prisma.paymentRecipient.update({
    where: { id: parsed.data.recipientId },
    data: { verificationStatus: parsed.data.verificationStatus },
  });
  await logAudit({
    actorId: session.user.id,
    action: `RECIPIENT.${parsed.data.verificationStatus}`,
    entity: "PaymentRecipient",
    entityId: parsed.data.recipientId,
  });
  revalidatePath("/finance/recipients");
  return { ok: true };
}

export async function setRecipientActive(formData: FormData) {
  const session = await requireFinance();
  const parsed = SetRecipientActiveSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Invalid input" };

  await prisma.paymentRecipient.update({
    where: { id: parsed.data.recipientId },
    data: { isActive: parsed.data.isActive },
  });
  await logAudit({
    actorId: session.user.id,
    action: parsed.data.isActive ? "RECIPIENT.REACTIVATED" : "RECIPIENT.DEACTIVATED",
    entity: "PaymentRecipient",
    entityId: parsed.data.recipientId,
  });
  revalidatePath("/finance/recipients");
  return { ok: true };
}

// Decrypt for display — finance-only page; callers must already be authorized.
export async function getRecipientSecrets(recipientId: string) {
  await requireFinance();
  const r = await prisma.paymentRecipient.findUnique({
    where: { id: recipientId },
    select: { accountNumberEnc: true, paybillNumberEnc: true },
  });
  if (!r) return { ok: false as const, message: "Recipient not found" };
  return {
    ok: true as const,
    accountNumber: r.accountNumberEnc ? decryptSecret(r.accountNumberEnc) : "",
    paybillNumber: r.paybillNumberEnc ? decryptSecret(r.paybillNumberEnc) : "",
  };
}
