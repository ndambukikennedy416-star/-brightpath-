"use server";

import { requirePortalRole } from "@/lib/portal/server";
import { createServiceClient } from "@/lib/portal/server";

// Best-effort call to the send-payment-email Edge Function (shared by the
// payment, document, and application templates). Skipped when unconfigured.
// Returns ok:false (never throws) so callers can log the failure.
export async function sendPortalTemplate(payload: Record<string, unknown>) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !serviceKey) {
    return { ok: false as const, error: "Email service not configured." };
  }
  try {
    const res = await fetch(`${base}/functions/v1/send-payment-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return { ok: false as const, error: `Email service ${res.status}.` };
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "Email service unreachable." };
  }
}

// Persist a dispatch failure for the error log. Service client only —
// callers never have direct write access to notification_log.
export async function logEmailFailure(entry: {
  template: string;
  paymentId?: string;
  documentId?: string;
  recipient?: string;
  error: string;
}) {
  try {
    const admin = await createServiceClient();
    await admin.from("notification_log").insert({
      template: entry.template,
      payment_id: entry.paymentId ?? null,
      document_id: entry.documentId ?? null,
      recipient_email: entry.recipient ?? null,
      status: "failed",
      error: entry.error,
      attempts: 1,
    });
  } catch {
    // Logging must never break the finance flow.
  }
}

// Student confirms their own upload: verifies ownership first (RLS is the
// second layer), then queues the document_uploaded confirmation email.
export async function notifyDocumentUploaded(documentId: string) {
  const ctx = await requirePortalRole("student");
  if (!ctx || !documentId) return { ok: false };
  const { data } = await ctx.supabase
    .from("student_documents")
    .select("id")
    .eq("id", documentId)
    .eq("student_id", ctx.user.id)
    .single();
  if (!data) return { ok: false };
  const sent = await sendPortalTemplate({ template: "document_uploaded", documentId });
  if (!sent.ok) {
    await logEmailFailure({
      template: "document_uploaded",
      documentId,
      recipient: ctx.profile.email,
      error: sent.error,
    });
  }
  return { ok: true };
}
