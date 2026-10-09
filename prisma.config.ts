import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // process.env (not env()) so `prisma generate` / `validate` work without a DB.
    // Set real Supabase pooled URL in .env before migrate/seed.
    url: process.env.DATABASE_URL ?? "",
  },
});
