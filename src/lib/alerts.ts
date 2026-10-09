import { cache } from "react";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

// M&E thresholds (PRD §3.4)
export const GPA_THRESHOLD = 2.0;
export const ATTENDANCE_THRESHOLD = 80;

export type AtRiskStudent = {
  id: string;
  name: string;
  email: string;
  schoolName: string;
  status: string;
  term: string;
  gpa: number | null;
  attendance: number | null;
  reasons: string[];
};

// DB-side prefilter: instead of loading ALL active students + latest record
// and filtering in JS, first ask the DB for ACTIVE students having ANY
// breaching record (usually a small subset), then load the latest record only
// for those candidates and keep the ones whose LATEST record still breaches.
// Column selection is narrowed to what the dashboard/M&E pages render.
async function fetchAtRiskStudents(): Promise<AtRiskStudent[]> {
  const candidates = await prisma.academicRecord.findMany({
    where: {
      student: { status: "ACTIVE" },
      OR: [{ gpa: { lt: GPA_THRESHOLD } }, { attendance: { lt: ATTENDANCE_THRESHOLD } }],
    },
    select: { studentId: true },
    distinct: ["studentId"],
    take: 500,
  });
  if (candidates.length === 0) return [];

  const ids = candidates.map((c) => c.studentId);
  const students = await prisma.student.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      schoolName: true,
      status: true,
      user: { select: { name: true, email: true } },
      academicRecords: {
        orderBy: { recordedAt: "desc" },
        take: 1,
        select: { term: true, gpa: true, attendance: true },
      },
    },
  });

  const atRisk: AtRiskStudent[] = [];
  for (const s of students) {
    const latest = s.academicRecords[0];
    if (!latest) continue;
    const gpa = latest.gpa == null ? null : Number(latest.gpa);
    const attendance = latest.attendance == null ? null : Number(latest.attendance);
    const reasons: string[] = [];
    if (gpa != null && gpa < GPA_THRESHOLD) reasons.push(`GPA ${gpa} below ${GPA_THRESHOLD}`);
    if (attendance != null && attendance < ATTENDANCE_THRESHOLD)
      reasons.push(`Attendance ${attendance}% below ${ATTENDANCE_THRESHOLD}%`);
    if (reasons.length > 0) {
      atRisk.push({
        id: s.id,
        name: s.user.name,
        email: s.user.email,
        schoolName: s.schoolName,
        status: s.status,
        term: latest.term,
        gpa,
        attendance,
        reasons,
      });
    }
  }
  return atRisk;
}

const getAtRiskCached = unstable_cache(fetchAtRiskStudents, ["at-risk-students"], {
  tags: ["at-risk"],
  revalidate: 60,
});

// Flag students whose latest academic record breaches thresholds.
// React.cache shares one call between Nav (FIELD_AGENT bell) and the page in
// the same request; unstable_cache shares across requests for 60s.
// Invalidated on demand in upsertAcademicRecord via revalidateTag("at-risk").
export const getAtRiskStudents = cache((): Promise<AtRiskStudent[]> => getAtRiskCached());
