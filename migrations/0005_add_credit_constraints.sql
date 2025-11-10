-- Add CHECK constraints to prevent negative credit balances
-- This provides an additional layer of protection against race conditions

ALTER TABLE instructor_credits
ADD CONSTRAINT sms_credits_non_negative CHECK (sms_credits >= 0);

ALTER TABLE instructor_credits
ADD CONSTRAINT email_credits_non_negative CHECK (email_credits >= 0);
