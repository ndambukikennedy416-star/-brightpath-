-- Rename the SUPER_ADMIN role value to ADMIN (no data loss; existing rows keep their role).
ALTER TYPE "UserRole" RENAME VALUE 'SUPER_ADMIN' TO 'ADMIN';
