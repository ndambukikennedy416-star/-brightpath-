import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { requirePortalRole } from "@/lib/portal/server";

// GET /api/portal-receipts/[id] — PDF receipt for a paid portal payment.
// Finance and admin only.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requirePortalRole("financial_officer", "admin");
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { data: payment } = await ctx.supabase
    .from("payments")
    .select("id,amount,type,status,method,reference,created_at,student_id")
    .eq("id", id)
    .single();
  if (!payment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (payment.status !== "paid") {
    return NextResponse.json(
      { error: "Receipts are issued for paid payments only" },
      { status: 400 }
    );
  }
  const { data: student } = await ctx.supabase
    .from("profiles")
    .select("full_name,email")
    .eq("id", payment.student_id)
    .single();

  const doc = await PDFDocument.create();
  const page = doc.addPage([420, 560]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const dark = rgb(0.1, 0.1, 0.1);
  const grey = rgb(0.4, 0.4, 0.4);

  let y = 510;
  const line = (text: string, size = 11, f = font, color = dark, gap = 22) => {
    page.drawText(text.slice(0, 90), { x: 40, y, size, font: f, color });
    y -= gap;
  };

  line("Brightpath Kenya", 16, bold, dark, 28);
  line("Payment Receipt", 12, bold, grey, 30);
  line(`Receipt no: ${payment.id.slice(0, 8).toUpperCase()}`, 11, font, dark);
  line(
    `Date: ${new Date(payment.created_at).toLocaleDateString("en-KE")}`,
    11,
    font,
    dark
  );
  line(`Beneficiary: ${student?.full_name || student?.email || "—"}`, 11, font, dark);
  line(`Type: ${payment.type}`, 11, font, dark);
  line(
    `Amount: KSh ${Number(payment.amount).toLocaleString("en-KE", { maximumFractionDigits: 0 })}`,
    13,
    bold,
    dark,
    30
  );
  line(`Method: ${payment.method ?? "—"}`, 11, font, dark);
  line(`Reference: ${payment.reference ?? "—"}`, 11, font, dark);

  const pdf = await doc.save();
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="receipt-${payment.id.slice(0, 8)}.pdf"`,
    },
  });
}
