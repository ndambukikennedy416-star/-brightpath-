import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ImportStudentsForm } from "@/components/forms";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ImportStudentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!["ADMIN", "FINANCE_OFFICER"].includes(session.user.role)) redirect("/students");

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4 md:p-6">
      <Card title="Bulk import accepted beneficiaries (CSV)">
        <p className="mb-3 text-sm text-zinc-600">
          One per line, no header: <code>name,email,password,schoolName,currentYear,totalBudget</code>
        </p>
        <ImportStudentsForm />
      </Card>
    </main>
  );
}
