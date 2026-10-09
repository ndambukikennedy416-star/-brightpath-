import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PartnerForm from "./_components/PartnerForm";
import StaffForm from "./_components/StaffForm";
import ToastHost from "./_components/Toast";
import UsersTable, { type AdminUserRow } from "./_components/UsersTable";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const users = await prisma.user.findMany({
    include: {
      externalPartner: true,
      student: { select: { status: true, schoolName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const rows: AdminUserRow[] = users.map((u) => {
    const type = u.externalPartner
      ? `${u.externalPartner.partnerType} · ${u.externalPartner.organizationName}`
      : u.student
        ? `STUDENT · ${u.student.schoolName}`
        : u.role;
    const status = u.isActive
      ? u.student
        ? `Active · ${u.student.status}`
        : "Active"
      : "Inactive";
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      type,
      status,
      self: u.id === session.user.id,
    };
  });

  return (
    <main className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
      <h1 className="text-2xl font-semibold">User management</h1>
      <p className="text-sm text-zinc-600">Admin-managed accounts only — no public signup.</p>

      <div className="grid gap-4 md:grid-cols-2">
        <StaffForm />
        <PartnerForm />
      </div>

      <UsersTable users={rows} />
      <ToastHost />
    </main>
  );
}
