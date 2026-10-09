import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL ?? "",
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminEmail = "admin@brightpath.local";
  const passwordHash = await bcrypt.hash("Admin123!", 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "Admin",
      role: "ADMIN",
      passwordHash,
    },
  });

  // Financial literacy with Kenyan examples (M-PESA, local banks).
  const lessons = [
    {
      title: "Budgeting 101",
      content:
        "Track income vs expenses every month. Pay school fees first, then rent, then food. Example: from a 5,000 KES stipend, send fees via M-PESA PayBill before spending on airtime.",
      order: 0,
    },
    {
      title: "Saving for Emergencies",
      content:
        "Keep a small buffer for transport and books — aim for 500 KES in M-PESA savings. Banks like KCB, Equity, and Co-operative offer student accounts with no monthly fee.",
      order: 1,
    },
    {
      title: "M-PESA Safety",
      content:
        "Never share your M-PESA PIN. A valid Safaricom line looks like 0712345678 or 254712345678. Confirm the recipient name before pressing send.",
      order: 2,
    },
  ];
  for (const l of lessons) {
    await prisma.financialLiteracyLesson.upsert({
      where: { order: l.order },
      update: { title: l.title, content: l.content },
      create: l,
    });
  }

  // Fee caps for Kenyan partner schools (amounts in KES).
  const fees = [
    { schoolName: "Alliance High School", academicYear: 2026, tuitionCap: 120000, notes: "National school boarding cap" },
    { schoolName: "Kenya High School", academicYear: 2026, tuitionCap: 115000, notes: "National school boarding cap" },
    { schoolName: "Strathmore University", academicYear: 2026, tuitionCap: 350000, notes: "Per-year tuition cap" },
    { schoolName: "University of Nairobi", academicYear: 2026, tuitionCap: 220000, notes: "Module II estimate" },
  ];
  for (const f of fees) {
    await prisma.feeStructure.upsert({
      where: { schoolName_academicYear: { schoolName: f.schoolName, academicYear: f.academicYear } },
      update: { tuitionCap: f.tuitionCap, notes: f.notes },
      create: f,
    });
  }

  console.log("Seed complete: admin + lessons + Kenyan fee structures");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
