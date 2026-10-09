// Supabase Edge Function: send-payment-email
// Deploy: supabase functions deploy send-payment-email
// Secrets: supabase secrets set RESEND_API_KEY=... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
// Called by the app (finance-actions.ts) with { paymentId } after a payment
// is marked paid. Sends a receipt to the student and a copy to all admins.
//
// deno.json: { "imports": { "resend": "npm:resend@4" } }

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "resend";

const resend = new Resend(Deno.env.get("RESEND_API_KEY")!);
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  const { paymentId } = await req.json();
  if (!paymentId) return new Response("Missing paymentId", { status: 400 });

  const { data: payment, error } = await supabase
    .from("payments")
    .select("id,amount,type,status,method,reference,created_at,student_id")
    .eq("id", paymentId)
    .single();
  if (error || !payment || payment.status !== "paid") {
    return new Response("Payment not found or not paid", { status: 404 });
  }

  const { data: student } = await supabase
    .from("profiles")
    .select("email,full_name")
    .eq("id", payment.student_id)
    .single();
  const { data: admins } = await supabase
    .from("profiles")
    .select("email")
    .eq("role", "admin");

  const amount = `KSh ${Number(payment.amount).toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
  const date = new Date(payment.created_at).toLocaleDateString("en-KE");
  const name = student?.full_name || "Student";

  const studentHtml = `
    <h2>Payment received</h2>
    <p>Hello ${name},</p>
    <p>Brightpath Kenya has disbursed <strong>${amount}</strong> (${payment.type}) on ${date}.</p>
    <p>Reference: ${payment.reference ?? "—"}</p>
  `;
  const adminHtml = `
    <h2>Disbursement recorded</h2>
    <p>${amount} (${payment.type}) marked paid for ${student?.email ?? payment.student_id} on ${date}.</p>
    <p>Reference: ${payment.reference ?? "—"} · Payment ID: ${payment.id}</p>
  `;

  const sends = [];
  if (student?.email) {
    sends.push(
      resend.emails.send({
        from: "Brightpath Kenya <no-reply@brightpathkenya.org>",
        to: student.email,
        subject: `Payment received: ${amount}`,
        html: studentHtml,
      })
    );
  }
  for (const a of admins ?? []) {
    sends.push(
      resend.emails.send({
        from: "Brightpath Kenya <no-reply@brightpathkenya.org>",
        to: a.email,
        subject: `Disbursement recorded: ${amount}`,
        html: adminHtml,
      })
    );
  }
  await Promise.all(sends);
  return Response.json({ ok: true, emailed: sends.length });
});
