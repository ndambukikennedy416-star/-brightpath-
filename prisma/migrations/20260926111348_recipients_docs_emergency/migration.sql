/*
  Warnings:

  - You are about to drop the column `verified` on the `Document` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "InstitutionType" AS ENUM ('PRIMARY_SCHOOL', 'SECONDARY_SCHOOL', 'UNIVERSITY', 'PRIVATE_LANDLORD', 'HOSTEL');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- AlterTable: preserve existing verification flags across the boolean -> enum change.
ALTER TABLE "Document" ADD COLUMN "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING';

UPDATE "Document" SET "status" = 'VERIFIED' WHERE "verified" = true;

ALTER TABLE "Document" DROP COLUMN "verified";

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "emergencyContactName" TEXT,
ADD COLUMN     "emergencyContactPhone" TEXT;

-- CreateTable
CREATE TABLE "PaymentRecipient" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "institutionType" "InstitutionType" NOT NULL,
    "contactPersonName" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "accountName" TEXT NOT NULL,
    "accountNumberEnc" TEXT,
    "bankName" TEXT,
    "paybillNumberEnc" TEXT,
    "mobileMoneyRef" TEXT,
    "lastPaymentDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentRecipient_verificationStatus_idx" ON "PaymentRecipient"("verificationStatus");

-- CreateIndex
CREATE INDEX "PaymentRecipient_institutionType_idx" ON "PaymentRecipient"("institutionType");

-- CreateIndex
CREATE INDEX "Document_status_idx" ON "Document"("status");
