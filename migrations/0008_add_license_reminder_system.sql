-- Add courseType to courses
ALTER TABLE courses ADD COLUMN IF NOT EXISTS course_type VARCHAR(20);

-- Create license_reminder_logs table
CREATE TABLE IF NOT EXISTS license_reminder_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id),
  reminder_type VARCHAR(30) NOT NULL,
  channel VARCHAR(10) NOT NULL,
  sent_at TIMESTAMP DEFAULT NOW(),
  license_expiration_date TIMESTAMP,
  license_issued_date TIMESTAMP,
  course_schedule_date TIMESTAMP,
  template_id UUID REFERENCES notification_templates(id)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_license_reminder_logs_user_id ON license_reminder_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_license_reminder_logs_type ON license_reminder_logs(reminder_type);
CREATE INDEX IF NOT EXISTS idx_license_reminder_logs_user_type ON license_reminder_logs(user_id, reminder_type);
CREATE INDEX IF NOT EXISTS idx_courses_course_type ON courses(course_type);
