import { describe, expect, it } from "vitest";
import {
  ChangeOwnPasswordSchema,
  CreatePartnerSchema,
  CreateStaffSchema,
  KenyanMobileNumberSchema,
  ResetPasswordSchema,
  SetUserActiveSchema,
  UpdateOwnProfileSchema,
  UpdateUserSchema,
} from "@/lib/validations";
import { sanitizeOptionalText, sanitizeText } from "@/lib/sanitize";
import { bankDisplay, maskAccount } from "@/lib/bank";

describe("CreateStaffSchema", () => {
  it("accepts a valid staff account", () => {
    const r = CreateStaffSchema.safeParse({
      name: "Wanjiru Mwangi",
      email: "WANJIRU@Example.com ",
      password: "Secret123!",
      role: "FINANCE_OFFICER",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBe("wanjiru@example.com");
  });

  it("rejects bad email, short password, and bad role", () => {
    expect(CreateStaffSchema.safeParse({ name: "A", email: "x", password: "1234567", role: "FINANCE_OFFICER" }).success).toBe(false);
    expect(CreateStaffSchema.safeParse({ name: "Ann", email: "a@b.co", password: "short", role: "DONOR" }).success).toBe(false);
    expect(CreateStaffSchema.safeParse({ name: "Ann", email: "a@b.co", password: "Secret123!", role: "HACKER" }).success).toBe(false);
  });
});

describe("CreatePartnerSchema", () => {
  it("accepts a valid partner and rejects missing organization", () => {
    expect(
      CreatePartnerSchema.safeParse({
        name: "John Doe",
        email: "j@school.co.ke",
        password: "Secret123!",
        partnerType: "SCHOOL",
        organizationName: "Alliance High School",
      }).success
    ).toBe(true);
    expect(
      CreatePartnerSchema.safeParse({
        name: "John Doe",
        email: "j@school.co.ke",
        password: "Secret123!",
        partnerType: "HOTEL",
        organizationName: "X",
      }).success
    ).toBe(false);
  });
});

describe("KenyanMobileNumberSchema", () => {
  it.each(["0712345678", "0112345678", "254712345678", "254112345678"])(
    "accepts %s",
    (n) => {
      expect(KenyanMobileNumberSchema.safeParse(n).success).toBe(true);
    }
  );
  it.each(["0612345678", "071234567", "+254712345678", "0712 345 678"])(
    "rejects %s",
    (n) => {
      expect(KenyanMobileNumberSchema.safeParse(n).success).toBe(false);
    }
  );
  it("is optional", () => {
    expect(KenyanMobileNumberSchema.safeParse(undefined).success).toBe(true);
  });
});

describe("row-action schemas", () => {
  it("UpdateUserSchema requires id, name, valid role", () => {
    expect(UpdateUserSchema.safeParse({ userId: "x", name: "Bo", role: "DONOR" }).success).toBe(true);
    expect(UpdateUserSchema.safeParse({ userId: "", name: "Bo", role: "DONOR" }).success).toBe(false);
  });
  it("ResetPasswordSchema enforces min length", () => {
    expect(ResetPasswordSchema.safeParse({ userId: "x", newPassword: "Secret123!" }).success).toBe(true);
    expect(ResetPasswordSchema.safeParse({ userId: "x", newPassword: "short" }).success).toBe(false);
  });
  it("SetUserActiveSchema maps FormData strings correctly", () => {
    expect(SetUserActiveSchema.safeParse({ userId: "x", isActive: "true" }).data).toEqual({ userId: "x", isActive: true });
    expect(SetUserActiveSchema.safeParse({ userId: "x", isActive: "false" }).data).toEqual({ userId: "x", isActive: false });
    expect(SetUserActiveSchema.safeParse({ userId: "x", isActive: "on" }).data).toEqual({ userId: "x", isActive: true });
  });
});

describe("sanitize", () => {
  it("strips tags and angle brackets", () => {
    expect(sanitizeText('<script>alert(1)</script>Alliance <b>High</b>')).toBe("alert(1)Alliance High");
    expect(sanitizeText("  KCB Ruiru  ")).toBe("KCB Ruiru");
  });
  it("optional helper returns undefined for empty", () => {
    expect(sanitizeOptionalText("")).toBeUndefined();
    expect(sanitizeOptionalText("  ")).toBeUndefined();
    expect(sanitizeOptionalText("Acct 123")).toBe("Acct 123");
  });
});

describe("bankDisplay", () => {
  it("shows full value to finance roles and masks others", () => {
    expect(bankDisplay("ADMIN", "KCB 1234567890")).toBe("KCB 1234567890");
    expect(bankDisplay("FINANCE_OFFICER", "KCB 1234567890")).toBe("KCB 1234567890");
    expect(bankDisplay("FIELD_AGENT", "KCB 1234567890")).toBe("••••7890");
    expect(bankDisplay("STUDENT", "KCB 1234567890")).toBe("••••7890");
  });
  it("handles empty values", () => {
    expect(maskAccount(null)).toBe("—");
    expect(bankDisplay("ADMIN", null)).toBe("—");
  });
});

describe("ChangeOwnPasswordSchema", () => {
  it("accepts a distinct new password", () => {
    expect(
      ChangeOwnPasswordSchema.safeParse({
        currentPassword: "Temp1234!",
        newPassword: "MyOwn5678!",
      }).success
    ).toBe(true);
  });
  it("rejects short or identical passwords", () => {
    expect(
      ChangeOwnPasswordSchema.safeParse({ currentPassword: "Temp1234!", newPassword: "short" })
        .success
    ).toBe(false);
    expect(
      ChangeOwnPasswordSchema.safeParse({
        currentPassword: "Same12345!",
        newPassword: "Same12345!",
      }).success
    ).toBe(false);
  });
});

describe("UpdateOwnProfileSchema", () => {
  it("accepts contact, payout, and emergency fields", () => {
    expect(
      UpdateOwnProfileSchema.safeParse({
        phone: "0712345678",
        mobileMoneyNumber: "254712345678",
        emergencyContactName: "Jane Doe",
        emergencyContactPhone: "0733111222",
      }).success
    ).toBe(true);
  });
  it("rejects bad M-PESA format", () => {
    expect(
      UpdateOwnProfileSchema.safeParse({ mobileMoneyNumber: "0612345678" }).success
    ).toBe(false);
  });
});
