import "dotenv/config";
import fs from "fs";
import path from "path";
import { Client } from "pg";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("FAIL: DATABASE_URL is not set (see .env.example).");
    process.exit(1);
  }
  const file = process.argv[2] || "prisma/migrations/1_addition/migration.sql";
  const c = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 20000,
  });
  await c.connect();
  console.log("connected");
  const sql = fs.readFileSync(path.resolve(file), "utf8");
  await c.query(sql);
  console.log("MIGRATION APPLIED: " + file);
  await c.end();
}

main().catch((e) => {
  console.error("FAIL:", e.message);
  process.exit(1);
});
