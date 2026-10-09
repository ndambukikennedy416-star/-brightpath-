"use server";

import { requirePortalRole } from "@/lib/portal/server";

// Best-effort call to the send-payment-email Edge Function (shared by the
// payment, document, and application templates). Skipped when unconfigured.
export async function sendPortalTemplate(payload: Record<string, unknown>) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !serviceKey) return;
  await fetch(`${base}/functions/v1/send-payment-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify(payload),
  });
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
  await sendPortalTemplate({ template: "document_uploaded", documentId }).catch(
    () => undefined
  );
  return { ok: true };
}
