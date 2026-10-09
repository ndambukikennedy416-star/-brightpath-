import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOwnStudentId } from "@/lib/rbac";
import { completeLesson, createLesson } from "@/lib/actions/lessons";
import { Badge, Card, Field, btnGhostCls, inputCls } from "@/components/ui";
import SubmitForm from "@/components/SubmitForm";

export const dynamic = "force-dynamic";

export default async function LiteracyPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { role } = session.user;
  if (!["FINANCE_OFFICER", "FIELD_AGENT", "STUDENT"].includes(role)) {
    redirect("/dashboard");
  }

  const lessons = await prisma.financialLiteracyLesson.findMany({ orderBy: { order: "asc" } });

  let done = new Set<string>();
  if (role === "STUDENT") {
    const studentId = await getOwnStudentId(session.user.id);
    if (studentId) {
      const progress = await prisma.lessonProgress.findMany({
        where: { studentId, completed: true },
        select: { lessonId: true },
      });
      done = new Set(progress.map((p) => p.lessonId));
    }
  }

  const allDone = lessons.length > 0 && lessons.every((l) => done.has(l.id));

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
      <h1 className="text-2xl font-semibold">Financial literacy</h1>
      {role === "STUDENT" && (
        <p className="text-sm text-zinc-600">
          {allDone
            ? "All lessons complete — your stipend disbursements are unlocked."
            : `Complete all ${lessons.length} lessons to unlock stipend disbursements (${done.size}/${lessons.length} done).`}
        </p>
      )}

      <div className="space-y-3">
        {lessons.map((l) => (
          <Card key={l.id} title={`${l.order + 1}. ${l.title}`}>
            <p className="whitespace-pre-wrap text-sm text-zinc-700">{l.content}</p>
            <div className="mt-2">
              {role === "STUDENT" ? (
                done.has(l.id) ? (
                  <Badge tone="green">completed</Badge>
                ) : (
                  <SubmitForm action={completeLesson}>
                    <input type="hidden" name="lessonId" value={l.id} />
                    <button type="submit" className={btnGhostCls}>Mark complete</button>
                  </SubmitForm>
                )
              ) : null}
            </div>
          </Card>
        ))}
        {lessons.length === 0 && <p className="text-sm text-zinc-600">No lessons yet.</p>}
      </div>

      {role === "FINANCE_OFFICER" && (
        <Card title="Add lesson (finance)">
          <SubmitForm action={createLesson} className="space-y-2 text-sm">
            <Field label="Title"><input name="title" required minLength={3} className={inputCls} /></Field>
            <Field label="Content"><textarea name="content" required minLength={10} rows={4} className={inputCls} /></Field>
            <Field label="Order"><input name="order" type="number" min={0} defaultValue={lessons.length} required className={inputCls} /></Field>
            <button type="submit" className={btnGhostCls}>Add lesson</button>
          </SubmitForm>
        </Card>
      )}
    </main>
  );
}
