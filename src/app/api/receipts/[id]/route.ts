import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

// GET /api/receipts/[id] — PDF receipt for a DISBURSED payment.
// Finance roles only; students get read-only history in the portal, not PDFs.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "FINANCE_OFFICER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: { student: { include: { user: { select: { name: true, email: true } } } } },
  });
  if (!payment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (payment.status !== "DISBURSED") {
    return NextResponse.json({ error: "Receipts are issued for disbursed payments only" }, { status: 400 });
  }

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
  line("Scholarship Disbursement Receipt", 12, bold, grey, 30);
  line(`Receipt no: ${payment.id.slice(0, 8).toUpperCase()}`, 11, font, dark);
  line(`Date: ${payment.createdAt.toLocaleDateString("en-KE")}`, 11, font, dark);
  line(`Beneficiary: ${payment.student.user.name}`, 11, font, dark);
  line(`School: ${payment.student.schoolName}`, 11, font, dark);
  line(`Type: ${payment.type}`, 11, font, dark);
  line(
    `Amount: KSh ${Number(payment.amount).toLocaleString("en-KE", { maximumFractionDigits: 0 })}`,
    13,
    bold,
    dark,
    30
  );
  line(`Reference: ${payment.reference ?? "—"}`, 11, font, dark);
  line(`Issued by: ${session.user.email ?? session.user.role}`, 10, font, grey);

  const pdf = await doc.save();
  await logAudit({
    actorId: session.user.id,
    action: "RECEIPT.ISSUED",
    entity: "Payment",
    entityId: payment.id,
  });

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="receipt-${payment.id.slice(0, 8)}.pdf"`,
    },
  });
}
