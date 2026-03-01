-- Migration: Add requiresOnlineCourseEnrollment to courses
-- Enables gating course registration behind online course purchase verification

ALTER TABLE courses ADD COLUMN IF NOT EXISTS requires_online_course_enrollment BOOLEAN NOT NULL DEFAULT false;
