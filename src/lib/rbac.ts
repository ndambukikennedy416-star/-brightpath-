import { auth } from "@/lib/auth";
import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const STAFF_ROLES: UserRole[] = ["ADMIN", "FINANCE_OFFICER", "FIELD_AGENT"];
export const FINANCE_ROLES: UserRole[] = ["ADMIN", "FINANCE_OFFICER"];

export async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized: sign in required");
  return session;
}

export async function requireRole(...roles: UserRole[]) {
  const session = await requireSession();
  if (!roles.includes(session.user.role)) {
    throw new Error(`Forbidden: requires ${roles.join(" or ")}`);
  }
  return session;
}

export const requireStaff = () => requireRole(...STAFF_ROLES);
export const requireFinance = () => requireRole(...FINANCE_ROLES);
export const requireAdmin = () => requireRole("ADMIN");
export const requireStudent = () => requireRole("STUDENT");

// Resolve the Student row owned by the signed-in user (STUDENT role).
export async function getOwnStudentId(userId: string) {
  const student = await prisma.student.findUnique({
    where: { userId },
    select: { id: true },
  });
  return student?.id ?? null;
}

// Staff may access any student; students only their own; partners/donors none.
export async function canAccessStudent(userId: string, role: UserRole, studentId: string) {
  if (STAFF_ROLES.includes(role)) return true;
  if (role === "STUDENT") {
    const own = await getOwnStudentId(userId);
    return own === studentId;
  }
  return false;
}
