
-- Add refund tracking fields to enrollments table
ALTER TABLE enrollments 
  ADD COLUMN IF NOT EXISTS refund_requested BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS refund_requested_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS refund_processed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS refund_processed_at TIMESTAMP;
