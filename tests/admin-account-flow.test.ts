// Integration coverage for the "Create Account" flow data contract.
// Runs only with RUN_DB_TESTS=1 (writes to the configured database, then
// cleans up everything it creates). Mirrors src/lib/actions/admin.ts:
// Zod validation -> bcrypt hash -> unique email -> update/reset/deactivate.
import "dotenv/config";
import { describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  CreateStaffSchema,
  ResetPasswordSchema,
  SetUserActiveSchema,
  UpdateUserSchema,
} from "@/lib/validations";
import { sanitizeText } from "@/lib/sanitize";

const RUN = process.env.RUN_DB_TESTS === "1";

describe.skipIf(!RUN)("create-account flow (DB)", () => {
  const email = `test.user.${Date.now()}@example.com`;
  let userId = "";

  it("creates a staff account with a hashed password", async () => {
    const parsed = CreateStaffSchema.safeParse({
      name: "Test <b>User</b>",
      email,
      password: "Secret123!",
      role: "FIELD_AGENT",
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    const user = await prisma.user.create({
      data: {
        email: parsed.data.email,
        name: sanitizeText(parsed.data.name, 200),
        role: parsed.data.role,
        passwordHash: await bcrypt.hash(parsed.data.password, 10),
      },
    });
    userId = user.id;
    expect(user.name).toBe("Test User");
    expect(user.passwordHash).not.toContain("Secret123!");
    expect(await bcrypt.compare("Secret123!", user.passwordHash!)).toBe(true);
  });

  it("rejects a duplicate email", async () => {
    await expect(
      prisma.user.create({
        data: { email, name: "Dupe", role: "DONOR" },
      })
    ).rejects.toThrow();
  });

  it("updates name and role", async () => {
    const parsed = UpdateUserSchema.safeParse({ userId, name: "Renamed", role: "DONOR" });
    expect(parsed.success).toBe(true);
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { name: parsed.success ? parsed.data.name : "", role: "DONOR" },
    });
    expect(updated.name).toBe("Renamed");
  });

  it("resets the password", async () => {
    const parsed = ResetPasswordSchema.safeParse({ userId, newPassword: "NewSecret123!" });
    expect(parsed.success).toBe(true);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash("NewSecret123!", 10) },
    });
    const row = await prisma.user.findUnique({ where: { id: userId } });
    expect(await bcrypt.compare("NewSecret123!", row!.passwordHash!)).toBe(true);
    expect(await bcrypt.compare("Secret123!", row!.passwordHash!)).toBe(false);
  });

  it("deactivates and reactivates", async () => {
    const off = SetUserActiveSchema.safeParse({ userId, isActive: "false" });
    expect(off.data).toEqual({ userId, isActive: false });
    await prisma.user.update({ where: { id: userId }, data: { isActive: false } });
    expect((await prisma.user.findUnique({ where: { id: userId } }))!.isActive).toBe(false);
    await prisma.user.update({ where: { id: userId }, data: { isActive: true } });
    expect((await prisma.user.findUnique({ where: { id: userId } }))!.isActive).toBe(true);
  });

  it("cleans up", async () => {
    await prisma.auditLog.deleteMany({ where: { entityId: userId } });
    await prisma.user.delete({ where: { id: userId } });
    expect(await prisma.user.findUnique({ where: { id: userId } })).toBeNull();
  });
});
