import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptSecret, maskSecret } from "@/lib/crypto";
import RecipientForm from "./_components/RecipientForm";
import RecipientsTable, { type RecipientRow } from "./_components/RecipientsTable";
import ToastHost from "@/app/admin/users/_components/Toast";

export const dynamic = "force-dynamic";

export default async function RecipientsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!["ADMIN", "FINANCE_OFFICER"].includes(session.user.role)) redirect("/dashboard");

  const recipients = await prisma.paymentRecipient.findMany({
    orderBy: { createdAt: "desc" },
  });

  const rows: RecipientRow[] = recipients.map((r) => ({
    id: r.id,
    displayName: r.displayName,
    institutionType: r.institutionType,
    contactPersonName: r.contactPersonName,
    contactPhone: r.contactPhone,
    verificationStatus: r.verificationStatus,
    accountName: r.accountName,
    accountMasked: r.accountNumberEnc ? maskSecret(decryptSecret(r.accountNumberEnc)) : "—",
    paybillMasked: r.paybillNumberEnc ? maskSecret(decryptSecret(r.paybillNumberEnc)) : "—",
    bankName: r.bankName ?? "",
    mobileMoneyRef: r.mobileMoneyRef ?? "",
    isActive: r.isActive,
    lastPaymentDate: r.lastPaymentDate ? r.lastPaymentDate.toLocaleDateString() : "—",
  }));

  return (
    <main className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Payment recipients</h1>
        <p className="text-sm text-zinc-600">
          Schools and landlords as disbursement records only — no logins, no portal.
          Bank and M-PESA details are encrypted at rest.
        </p>
      </div>
      <RecipientForm />
      <RecipientsTable rows={rows} />
      <ToastHost />
    </main>
  );
}
