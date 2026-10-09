"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CompleteLessonSchema, CreateLessonSchema } from "@/lib/validations";
import { getOwnStudentId, requireFinance } from "@/lib/rbac";

// Students complete lessons themselves (unlocks stipend disbursement).
export async function completeLesson(formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "STUDENT") {
    return { ok: false, message: "Students only" };
  }
  const parsed = CompleteLessonSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Invalid input" };

  const studentId = await getOwnStudentId(session.user.id);
  if (!studentId) return { ok: false, message: "No student profile" };

  await prisma.lessonProgress.upsert({
    where: { studentId_lessonId: { studentId, lessonId: parsed.data.lessonId } },
    update: { completed: true, completedAt: new Date() },
    create: { studentId, lessonId: parsed.data.lessonId, completed: true, completedAt: new Date() },
  });
  revalidatePath("/literacy");
  return { ok: true };
}

export async function createLesson(formData: FormData) {
  await requireFinance();
  const parsed = CreateLessonSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }
  const lesson = await prisma.financialLiteracyLesson.create({ data: parsed.data });
  revalidatePath("/literacy");
  return { ok: true, lessonId: lesson.id };
}
