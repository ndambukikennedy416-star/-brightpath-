import { z } from "zod";
import { PaymentStatus, PaymentType, StudentStatus } from "@prisma/client";

// Kenyan mobile-money number: 2547XXXXXXXX / 2541XXXXXXXX or 07XXXXXXXX / 01XXXXXXXX.
export const KenyanMobileNumberSchema = z
  .string()
  .trim()
  .regex(/^(?:254[17]\d{8}|0[17]\d{8})$/, "Use a valid Kenyan mobile number (e.g. 0712345678).")
  .optional();

// Admin creates accepted beneficiaries only — no public signup (PRD §3.1, scope boundary).
export const CreateStudentSchema = z.object({
  name: z.string().min(2).trim(),
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(8),
  schoolName: z.string().min(2).trim(),
  currentYear: z.coerce.number().int().min(1).max(10),
  totalBudget: z.coerce.number().positive(),
  phone: z.string().optional(),
  bankName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  mobileMoneyProvider: z.string().optional(),
  mobileMoneyNumber: KenyanMobileNumberSchema,
});

export const UpdateStudentStatusSchema = z.object({
  studentId: z.string().min(1),
  status: z.nativeEnum(StudentStatus),
});

export const CreatePaymentSchema = z.object({
  studentId: z.string().min(1),
  type: z.nativeEnum(PaymentType),
  amount: z.coerce.number().positive(),
});

export const UpdatePaymentStatusSchema = z.object({
  paymentId: z.string().min(1),
  status: z.nativeEnum(PaymentStatus),
});

export const CreateExpenseClaimSchema = z.object({
  amount: z.coerce.number().positive(),
  description: z.string().min(3).max(1000),
  receiptUrl: z.string().url(),
  isEmergency: z.coerce.boolean().optional().default(false),
});

export const ReviewClaimSchema = z.object({
  claimId: z.string().min(1),
  status: z.enum(["APPROVED", "REJECTED"]),
});

export const CreateAcademicRecordSchema = z.object({
  studentId: z.string().min(1),
  term: z.string().min(2).max(50),
  gpa: z.coerce.number().min(0).max(4).optional(),
  attendance: z.coerce.number().min(0).max(100).optional(),
});

export const CreateInvoiceSchema = z.object({
  studentId: z.string().min(1),
  type: z.nativeEnum(PaymentType),
  amount: z.coerce.number().positive(),
  documentUrl: z.string().url(),
});

export const CreateLessonSchema = z.object({
  title: z.string().min(3).max(200),
  content: z.string().min(10),
  order: z.coerce.number().int().min(0),
});

export const UpdateStudentProfileSchema = z.object({
  studentId: z.string().min(1),
  schoolName: z.string().min(2).trim(),
  currentYear: z.coerce.number().int().min(1).max(10),
  totalBudget: z.coerce.number().positive(),
  phone: z.string().optional(),
  bankName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  mobileMoneyProvider: z.string().optional(),
  mobileMoneyNumber: KenyanMobileNumberSchema,
});

export const ReviewInvoiceSchema = z.object({
  invoiceId: z.string().min(1),
  status: z.enum(["APPROVED", "REJECTED"]),
});

// Student self-service password change (knows the admin-issued temp password).
export const ChangeOwnPasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: z.string().min(8, "New password must be at least 8 characters."),
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    message: "New password must differ from the current one.",
    path: ["newPassword"],
  });

// Student self-service: contact + payout details only (school/year/budget stay staff-managed).
export const UpdateOwnProfileSchema = z.object({
  phone: z.string().max(30).optional(),
  bankName: z.string().max(100).optional(),
  bankAccountNumber: z.string().max(50).optional(),
  mobileMoneyProvider: z.string().max(50).optional(),
  mobileMoneyNumber: KenyanMobileNumberSchema,
  emergencyContactName: z.string().max(200).optional(),
  emergencyContactPhone: z.string().max(30).optional(),
});

export const SaveDocumentSchema = z.object({
  studentId: z.string().min(1),
  type: z.enum(["ID", "ADMISSION_LETTER", "LEASE_AGREEMENT", "OTHER"]),
  fileUrl: z.string().url(),
});

export const CreateFeeStructureSchema = z.object({
  schoolName: z.string().min(2).trim(),
  academicYear: z.coerce.number().int().min(2000).max(2100),
  tuitionCap: z.coerce.number().positive(),
  notes: z.string().max(1000).optional(),
});

export const CreateLeaseSchema = z.object({
  studentId: z.string().min(1),
  landlordName: z.string().min(2).trim(),
  address: z.string().max(500).optional(),
  monthlyRent: z.coerce.number().positive(),
  startDate: z.string().min(1), // YYYY-MM-DD
  endDate: z.string().min(1),
});

export const CreateStaffSchema = z.object({
  name: z.string().min(2).trim(),
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(8),
  role: z.enum(["ADMIN", "FINANCE_OFFICER", "FIELD_AGENT", "DONOR"]),
});

export const CreatePartnerSchema = z.object({
  name: z.string().min(2).trim(),
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(8),
  partnerType: z.enum(["SCHOOL", "LANDLORD"]),
  organizationName: z.string().min(2).trim(),
  bankDetails: z.string().max(1000).optional(),
});

// Payment recipients: institutions as DATA ONLY — never user accounts.
export const RecipientSchema = z.object({
  displayName: z.string().min(2).max(200).trim(),
  institutionType: z.enum([
    "PRIMARY_SCHOOL",
    "SECONDARY_SCHOOL",
    "UNIVERSITY",
    "PRIVATE_LANDLORD",
    "HOSTEL",
  ]),
  contactPersonName: z.string().min(2).max(200).trim(),
  contactPhone: z.string().min(7).max(30).trim(),
  accountName: z.string().min(2).max(200).trim(),
  accountNumber: z.string().max(100).optional(),
  bankName: z.string().max(100).optional(),
  paybillNumber: z.string().max(50).optional(),
  mobileMoneyRef: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
});

export const UpdateRecipientSchema = RecipientSchema.extend({
  recipientId: z.string().min(1),
});

export const ReviewRecipientSchema = z.object({
  recipientId: z.string().min(1),
  verificationStatus: z.enum(["VERIFIED", "REJECTED"]),
});

export const SetRecipientActiveSchema = z.object({
  recipientId: z.string().min(1),
  isActive: z.preprocess(
    (v) => v === true || v === "true" || v === "on",
    z.boolean()
  ),
});

// Row actions on /admin/users (ADMIN only — enforced in actions).
export const UpdateUserSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(2).trim(),
  role: z.enum(["ADMIN", "FINANCE_OFFICER", "FIELD_AGENT", "DONOR"]),
});

export const ResetPasswordSchema = z.object({
  userId: z.string().min(1),
  newPassword: z.string().min(8, "Password must be at least 8 characters."),
});

export const SetUserActiveSchema = z.object({
  userId: z.string().min(1),
  // FormData carries strings — Boolean("false") is true, so map explicitly.
  isActive: z.preprocess(
    (v) => v === true || v === "true" || v === "on",
    z.boolean()
  ),
});

export const CompleteLessonSchema = z.object({
  lessonId: z.string().min(1),
});

export type CreateStudentInput = z.infer<typeof CreateStudentSchema>;
