-- Add user status enum
DO $$ BEGIN
 CREATE TYPE "public"."user_status" AS ENUM('pending', 'active', 'suspended', 'rejected');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Add user role enum (replacing varchar-based role)
DO $$ BEGIN
 CREATE TYPE "public"."user_role" AS ENUM('student', 'instructor', 'admin', 'superadmin');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Add new columns to users table
ALTER TABLE "users" ADD COLUMN "user_status" "user_status" DEFAULT 'pending' NOT NULL;
ALTER TABLE "users" ADD COLUMN "status_updated_at" timestamp;
ALTER TABLE "users" ADD COLUMN "status_reason" text;

-- Convert existing role column from varchar to enum
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "user_role" USING ("role"::text::"user_role");
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'student';

-- Update all existing users to 'active' status (they were already in the system before approval workflow)
UPDATE "users" SET "user_status" = 'active', "status_updated_at" = NOW();
