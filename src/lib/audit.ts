import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

// Immutable audit trail (PRD §3.5): rows are created here only —
// no update/delete API exists anywhere in the codebase.
export async function logAudit(input: {
  actorId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}) {
  let ip = input.ipAddress ?? null;
  if (!ip) {
    try {
      const h = await headers();
      const forwarded = h.get("x-forwarded-for");
      ip = forwarded?.split(",")[0]?.trim() || h.get("x-real-ip");
    } catch {
      ip = null;
    }
  }
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
        ipAddress: ip,
      },
    });
  } catch {
    // Audit must never break the underlying operation.
  }
}
