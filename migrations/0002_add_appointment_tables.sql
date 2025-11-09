
-- Create appointment types table
CREATE TABLE IF NOT EXISTS "appointment_types" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "instructor_id" varchar NOT NULL REFERENCES "users"("id"),
  "title" varchar(255) NOT NULL,
  "description" text,
  "duration_minutes" integer NOT NULL,
  "price" numeric(10, 2) NOT NULL,
  "requires_approval" boolean NOT NULL DEFAULT false,
  "buffer_before" integer NOT NULL DEFAULT 0,
  "buffer_after" integer NOT NULL DEFAULT 0,
  "max_party_size" integer NOT NULL DEFAULT 1,
  "color" varchar(7) DEFAULT '#3b82f6',
  "is_active" boolean NOT NULL DEFAULT true,
  "sort_order" integer DEFAULT 0,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Create instructor weekly templates table
CREATE TABLE IF NOT EXISTS "instructor_weekly_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "instructor_id" varchar NOT NULL REFERENCES "users"("id"),
  "day_of_week" integer NOT NULL,
  "start_time" varchar(8) NOT NULL,
  "end_time" varchar(8) NOT NULL,
  "breaks" jsonb,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Create instructor availability overrides table
CREATE TABLE IF NOT EXISTS "instructor_availability_overrides" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "instructor_id" varchar NOT NULL REFERENCES "users"("id"),
  "override_type" varchar(20) NOT NULL,
  "start_date" timestamp NOT NULL,
  "end_date" timestamp NOT NULL,
  "start_time" varchar(8),
  "end_time" varchar(8),
  "reason" varchar(255),
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Create instructor appointments table
CREATE TABLE IF NOT EXISTS "instructor_appointments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "appointment_type_id" uuid NOT NULL REFERENCES "appointment_types"("id"),
  "instructor_id" varchar NOT NULL REFERENCES "users"("id"),
  "student_id" varchar REFERENCES "users"("id"),
  "student_info" jsonb,
  "start_time" timestamp NOT NULL,
  "end_time" timestamp NOT NULL,
  "status" varchar NOT NULL DEFAULT 'pending',
  "party_size" integer NOT NULL DEFAULT 1,
  "payment_status" varchar NOT NULL DEFAULT 'pending',
  "payment_intent_id" varchar,
  "stripe_payment_intent_id" varchar,
  "amount_paid" numeric(10, 2),
  "booked_at" timestamp DEFAULT now(),
  "confirmed_at" timestamp,
  "rejected_at" timestamp,
  "rejection_reason" text,
  "cancelled_at" timestamp,
  "cancellation_reason" text,
  "cancelled_by" varchar,
  "completed_at" timestamp,
  "student_notes" text,
  "instructor_notes" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Create appointment notification templates table
CREATE TABLE IF NOT EXISTS "appointment_notification_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "instructor_id" varchar NOT NULL REFERENCES "users"("id"),
  "event_type" varchar(50) NOT NULL,
  "recipient_type" varchar(20) NOT NULL,
  "channel_type" varchar(20) NOT NULL,
  "subject" varchar(255),
  "body" text NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Create appointment reminder schedules table
CREATE TABLE IF NOT EXISTS "appointment_reminder_schedules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "instructor_id" varchar NOT NULL REFERENCES "users"("id"),
  "reminder_name" varchar(100) NOT NULL,
  "minutes_before" integer NOT NULL,
  "template_id" uuid REFERENCES "appointment_notification_templates"("id"),
  "send_email" boolean NOT NULL DEFAULT true,
  "send_sms" boolean NOT NULL DEFAULT false,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
