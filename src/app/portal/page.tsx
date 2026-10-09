import { redirect } from "next/navigation";
import { requirePortalRole } from "@/lib/portal/server";

const DASHBOARDS = {
  admin: "/portal/admin",
  financial_officer: "/portal/finance",
  monitor_evaluator: "/portal/me",
  student: "/portal/student",
} as const;

// Role router: signed-out users go to login, signed-in users to their dashboard.
export default async function PortalIndex() {
  const ctx = await requirePortalRole(
    "admin",
    "financial_officer",
    "monitor_evaluator",
    "student"
  );
  if (!ctx) redirect("/portal-login");
  redirect(DASHBOARDS[ctx.profile.role]);
}
