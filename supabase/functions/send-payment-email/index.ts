// Supabase Edge Function: send-payment-email (extended)
// Deploy: supabase functions deploy send-payment-email
// Secrets: supabase secrets set RESEND_API_KEY=... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
//
// Templates (JSON body must include "template"):
//   { template: "payment_receipt", paymentId }            — paid receipt (existing behavior)
//   { template: "payment_status", paymentId, toStatus }   — approved/rejected notice
//   { template: "document_uploaded", documentId }         — upload confirmation
//   { template: "application_received", studentEmail, studentName, detail? }
// Back-compat: { paymentId } with no template == payment_receipt.
// NOTE: the Resend import uses the full npm: specifier so no deno.json
// import map is required at deploy time.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@4";

const resend = new Resend(Deno.env.get("RESEND_API_KEY")!);
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const FROM = "Brightpath Kenya <no-reply@brightpathkenya.org>";
const kes = (n: number) =>
  `KSh ${Number(n).toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
const keDate = (d: string) => new Date(d).toLocaleDateString("en-KE");

async function studentOf(studentId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("email,full_name")
    .eq("id", studentId)
    .single();
  return data as { email: string; full_name: string } | null;
}

async function adminEmails(): Promise<string[]> {
  const { data } = await supabase
    .from("profiles")
    .select("email")
    .eq("role", "admin");
  return (data ?? []).map((a: { email: string }) => a.email);
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  const body = await req.json();
  const template = body.template ?? (body.paymentId ? "payment_receipt" : null);

  const sends: Promise<unknown>[] = [];

  if (template === "payment_receipt") {
    const { data: payment } = await supabase
      .from("payments")
      .select("id,amount,type,status,method,payment_method,reference,transaction_reference,disbursement_date,created_at,student_id")
      .eq("id", body.paymentId)
      .single();
    if (!payment || payment.status !== "paid") {
      return new Response("Payment not found or not paid", { status: 404 });
    }
    const student = await studentOf(payment.student_id);
    const amount = kes(Number(payment.amount));
    const date = keDate(payment.disbursement_date ?? payment.created_at);
    const name = student?.full_name || "Student";
    const ref = payment.transaction_reference ?? payment.reference ?? "—";
    const method = payment.payment_method ?? payment.method ?? "—";

    const studentHtml = `
      <h2>Payment received</h2>
      <p>Hello ${name},</p>
      <p>Brightpath Kenya has disbursed <strong>${amount}</strong> (${payment.type}) on ${date}.</p>
      <p>Method: ${method} · Reference: ${ref}</p>
    `;
    const adminHtml = `
      <h2>Disbursement recorded</h2>
      <p>${amount} (${payment.type}) marked paid for ${student?.email ?? payment.student_id} on ${date}.</p>
      <p>Method: ${method} · Reference: ${ref} · Payment ID: ${payment.id}</p>
    `;
    if (student?.email) {
      sends.push(resend.emails.send({ from: FROM, to: student.email, subject: `Payment received: ${amount}`, html: studentHtml }));
    }
    for (const email of await adminEmails()) {
      sends.push(resend.emails.send({ from: FROM, to: email, subject: `Disbursement recorded: ${amount}`, html: adminHtml }));
    }
  } else if (template === "payment_status") {
    const { data: payment } = await supabase
      .from("payments")
      .select("id,amount,type,status,created_at,student_id")
      .eq("id", body.paymentId)
      .single();
    if (!payment) return new Response("Payment not found", { status: 404 });
    const student = await studentOf(payment.student_id);
    if (!student?.email) return new Response("Student has no email", { status: 404 });
    const toStatus = body.toStatus ?? payment.status;
    const amount = kes(Number(payment.amount));
    sends.push(resend.emails.send({
      from: FROM,
      to: student.email,
      subject: `Payment ${toStatus}: ${payment.type} ${amount}`,
      html: `
        <h2>Payment status update</h2>
        <p>Hello ${student.full_name || "Student"},</p>
        <p>Your ${payment.type} payment of <strong>${amount}</strong> submitted on ${keDate(payment.created_at)} is now <strong>${toStatus}</strong>.</p>
        ${toStatus === "approved" ? "<p>It is queued for disbursement. You will receive a receipt once it is paid.</p>" : ""}
        ${toStatus === "rejected" ? "<p>Contact your Finance Officer if you have questions about this decision.</p>" : ""}
      `,
    }));
  } else if (template === "document_uploaded") {
    const { data: doc } = await supabase
      .from("student_documents")
      .select("id,type,status,created_at,student_id")
      .eq("id", body.documentId)
      .single();
    if (!doc) return new Response("Document not found", { status: 404 });
    const student = await studentOf(doc.student_id);
    if (!student?.email) return new Response("Student has no email", { status: 404 });
    sends.push(resend.emails.send({
      from: FROM,
      to: student.email,
      subject: `Document received: ${doc.type}`,
      html: `
        <h2>Document received</h2>
        <p>Hello ${student.full_name || "Student"},</p>
        <p>We received your <strong>${doc.type}</strong> uploaded on ${keDate(doc.created_at)}.</p>
        <p>Status: pending verification. We will notify you once it is reviewed.</p>
      `,
    }));
  } else if (template === "application_received") {
    const email = body.studentEmail as string | undefined;
    const name = body.studentName as string | undefined;
    if (!email) return new Response("Missing studentEmail", { status: 400 });
    sends.push(resend.emails.send({
      from: FROM,
      to: email,
      subject: "Application received — Brightpath Kenya",
      html: `
        <h2>Application received</h2>
        <p>Hello ${name || "Student"},</p>
        <p>Your scholarship application details${body.detail ? ` (${body.detail})` : ""} were received on ${keDate(new Date().toISOString())}.</p>
        <p>What happens next: document verification, then disbursement scheduling. We will email you at each step.</p>
      `,
    }));
  } else {
    return new Response("Unknown template", { status: 400 });
  }

  await Promise.all(sends);
  return Response.json({ ok: true, emailed: sends.length });
});
