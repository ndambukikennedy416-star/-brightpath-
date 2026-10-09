"use server";

import { revalidatePath } from "next/cache";
import { requirePortalRole } from "@/lib/portal/server";

// Finance writes go through RLS as the signed-in officer (policies check
// current_role()), so no service key is needed for CRUD here.
export async function initiatePayment(formData: FormData) {
  const ctx = await requirePortalRole("financial_officer", "admin");
  if (!ctx) return { ok: false, message: "Finance only" };
  if (ctx.profile.role !== "financial_officer") {
    return { ok: false, message: "Admins cannot process payments" };
  }
  const { supabase, user } = ctx;
  const studentId = String(formData.get("studentId") ?? "");
  const amount = Number(formData.get("amount") ?? 0);
  const type = String(formData.get("type") ?? "").trim();
  if (!studentId || !Number.isFinite(amount) || amount <= 0 || !type) {
    return { ok: false, message: "Student, positive amount, and type are required." };
  }
  const { data, error } = await supabase
    .from("payments")
    .insert({ student_id: studentId, amount, type, status: "pending", created_by: user.id })
    .select("id")
    .single();
  if (error) return { ok: false, message: error.message };
  revalidatePath("/portal/finance");
  return { ok: true, paymentId: data.id };
}

export async function reviewPortalPayment(formData: FormData) {
  const ctx = await requirePortalRole("financial_officer");
  if (!ctx) return { ok: false, message: "Finance only" };
  const { supabase } = ctx;
  const paymentId = String(formData.get("paymentId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!paymentId || !["approved", "paid", "rejected"].includes(status)) {
    return { ok: false, message: "Invalid payment or status." };
  }
  const { error } = await supabase.from("payments").update({ status }).eq("id", paymentId);
  if (error) return { ok: false, message: error.message };

  // Receipt email via Edge Function (best-effort; skipped when unconfigured).
  if (status === "paid") {
    await triggerReceiptEmail(paymentId).catch(() => undefined);
  }
  revalidatePath("/portal/finance");
  return { ok: true };
}

async function triggerReceiptEmail(paymentId: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !serviceKey) return;
  await fetch(`${base}/functions/v1/send-payment-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ paymentId }),
  });
}

export async function saveAccount(formData: FormData) {
  const ctx = await requirePortalRole("financial_officer", "admin");
  if (!ctx) return { ok: false, message: "Finance only" };
  if (ctx.profile.role !== "financial_officer") {
    return { ok: false, message: "Admins cannot manage accounts" };
  }
  const { supabase } = ctx;
  const name = String(formData.get("name") ?? "").trim();
  const kind = String(formData.get("kind") ?? "");
  if (name.length < 2 || !["school", "landlord"].includes(kind)) {
    return { ok: false, message: "Name and valid account type are required." };
  }
  const { error } = await supabase.from("accounts").insert({
    name,
    kind,
    contact_person: String(formData.get("contactPerson") ?? "").trim() || null,
    contact_phone: String(formData.get("contactPhone") ?? "").trim() || null,
    bank_name: String(formData.get("bankName") ?? "").trim() || null,
    account_name: String(formData.get("accountName") ?? "").trim() || null,
    account_number: String(formData.get("accountNumber") ?? "").trim() || null,
    paybill_number: String(formData.get("paybillNumber") ?? "").trim() || null,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/portal/finance");
  return { ok: true };
}

export async function verifyAccount(formData: FormData) {
  const ctx = await requirePortalRole("financial_officer");
  if (!ctx) return { ok: false, message: "Finance only" };
  const accountId = String(formData.get("accountId") ?? "");
  const verified = formData.get("verified") === "true";
  if (!accountId) return { ok: false, message: "Missing account." };
  const { error } = await ctx.supabase.from("accounts").update({ verified }).eq("id", accountId);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/portal/finance");
  return { ok: true };
}
