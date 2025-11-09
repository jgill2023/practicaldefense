-- Create course_status enum type
DO $$ BEGIN
  CREATE TYPE "course_status" AS ENUM('draft', 'published', 'unpublished', 'archived');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add status column with default value
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "status" "course_status" NOT NULL DEFAULT 'published';

-- Add archivedAt column
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "archived_at" timestamp;

-- Backfill status from isActive for existing records
-- isActive = true -> status = 'published'
-- isActive = false -> status = 'unpublished'
UPDATE "courses" SET "status" = 
  CASE 
    WHEN "is_active" = true THEN 'published'::course_status
    WHEN "is_active" = false THEN 'unpublished'::course_status
  END
WHERE "status" = 'published'::course_status; -- Only update records that still have default value
