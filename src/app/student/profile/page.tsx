import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOwnStudentId } from "@/lib/rbac";
import { Badge, Card, statusTone } from "@/components/ui";
import ProfileForm from "../_components/ProfileForm";
import ChangePasswordForm from "../_components/ChangePasswordForm";
import DocumentUploadForm from "../_components/DocumentUploadForm";
import ToastHost from "@/app/admin/users/_components/Toast";

export const dynamic = "force-dynamic";

export default async function StudentProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "STUDENT") redirect("/dashboard");

  const studentId = await getOwnStudentId(session.user.id);

  const student = studentId
    ? await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          user: { select: { name: true, email: true } },
          documents: { orderBy: { createdAt: "desc" } },
        },
      })
    : null;

  if (!student) {
    return (
      <main className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
        <h1 className="text-2xl font-semibold">My profile</h1>
        <Card>
          <p className="text-sm text-zinc-600">
            No beneficiary profile is linked to this account yet. Please contact your
            administrator to complete your setup.
          </p>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">{student.user.name}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-zinc-600">
          {student.user.email} · {student.schoolName} · Year {student.currentYear} ·{" "}
          <Badge tone={statusTone(student.status)}>{student.status}</Badge>
        </p>
      </div>
      <ProfileForm
        defaults={{
          phone: student.phone ?? "",
          bankName: student.bankName ?? "",
          bankAccountNumber: student.bankAccountNumber ?? "",
          mobileMoneyProvider: student.mobileMoneyProvider ?? "",
          mobileMoneyNumber: student.mobileMoneyNumber ?? "",
          emergencyContactName: student.emergencyContactName ?? "",
          emergencyContactPhone: student.emergencyContactPhone ?? "",
        }}
      />
      <Card title={`My documents (${student.documents.length})`}>
        <ul className="space-y-1 text-sm">
          {student.documents.map((d) => (
            <li
              key={d.id}
              className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2"
            >
              <span className="font-medium">{d.type.replace(/_/g, " ")}</span>
              <Badge
                tone={d.status === "VERIFIED" ? "green" : d.status === "REJECTED" ? "red" : "amber"}
              >
                {d.status}
              </Badge>
              <a href={d.fileUrl} target="_blank" rel="noreferrer" className="underline">
                view
              </a>
            </li>
          ))}
          {student.documents.length === 0 && <li>No documents uploaded yet.</li>}
        </ul>
        <div className="mt-3">
          <DocumentUploadForm studentId={student.id} />
        </div>
      </Card>
      <ChangePasswordForm />
      <ToastHost />
    </main>
  );
}
