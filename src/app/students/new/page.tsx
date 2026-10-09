import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { NewStudentForm } from "@/components/forms";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function NewStudentPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!["ADMIN", "FINANCE_OFFICER"].includes(session.user.role)) redirect("/students");

  return (
    <main className="mx-auto max-w-2xl p-4 md:p-6">
      <Card title="Onboard accepted beneficiary (no public signup)">
        <NewStudentForm />
      </Card>
    </main>
  );
}
