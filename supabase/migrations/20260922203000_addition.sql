-- AlterTable: ExpenseClaim emergency workflow (PRD §3.3)
ALTER TABLE "ExpenseClaim" ADD COLUMN "isEmergency" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ExpenseClaim" ADD COLUMN "reviewedBy" TEXT;

-- CreateTable: Document vault (PRD §3.1)
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Document_studentId_idx" ON "Document"("studentId");

-- CreateTable: Fee structures + caps (PRD §3.2)
CREATE TABLE "FeeStructure" (
    "id" TEXT NOT NULL,
    "schoolName" TEXT NOT NULL,
    "academicYear" INTEGER NOT NULL,
    "tuitionCap" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeeStructure_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FeeStructure_schoolName_academicYear_key" ON "FeeStructure"("schoolName", "academicYear");
CREATE INDEX "FeeStructure_schoolName_idx" ON "FeeStructure"("schoolName");

-- CreateTable: Leases (PRD §3.2)
CREATE TABLE "Lease" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "landlordName" TEXT NOT NULL,
    "address" TEXT,
    "monthlyRent" DECIMAL(10,2) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lease_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Lease_studentId_idx" ON "Lease"("studentId");

-- CreateTable: Audit log (PRD §3.5, immutable)
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- Foreign keys
ALTER TABLE "Document" ADD CONSTRAINT "Document_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
