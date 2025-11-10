-- Create credit transaction type enum
CREATE TYPE "public"."credit_transaction_type" AS ENUM('purchase', 'usage', 'refund', 'adjustment', 'initial_grant');

-- Create instructor_credits table
CREATE TABLE IF NOT EXISTS "instructor_credits" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "instructor_id" varchar NOT NULL UNIQUE,
  "sms_credits" integer DEFAULT 0 NOT NULL,
  "email_credits" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT instructor_credits_instructor_id_fk FOREIGN KEY ("instructor_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- Create credit_packages table
CREATE TABLE IF NOT EXISTS "credit_packages" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar(100) NOT NULL,
  "description" text,
  "sms_credits" integer DEFAULT 0 NOT NULL,
  "email_credits" integer DEFAULT 0 NOT NULL,
  "price" numeric(10, 2) NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0,
  "is_popular" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Drop credit_transactions if exists (in case of partial migration)
DROP TABLE IF EXISTS "credit_transactions";

-- Create credit_transactions table
CREATE TABLE IF NOT EXISTS "credit_transactions" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "instructor_id" varchar NOT NULL,
  "transaction_type" "credit_transaction_type" NOT NULL,
  "sms_credits" integer DEFAULT 0 NOT NULL,
  "email_credits" integer DEFAULT 0 NOT NULL,
  "balance_after_sms" integer NOT NULL,
  "balance_after_email" integer NOT NULL,
  "amount" numeric(10, 2),
  "stripe_payment_intent_id" varchar,
  "package_id" varchar,
  "communication_id" uuid,
  "description" text,
  "created_at" timestamp DEFAULT now(),
  CONSTRAINT credit_transactions_instructor_id_fk FOREIGN KEY ("instructor_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT credit_transactions_package_id_fk FOREIGN KEY ("package_id") REFERENCES "credit_packages"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT credit_transactions_communication_id_fk FOREIGN KEY ("communication_id") REFERENCES "communications"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "idx_instructor_credits_instructor_id" ON "instructor_credits"("instructor_id");
CREATE INDEX IF NOT EXISTS "idx_credit_transactions_instructor_id" ON "credit_transactions"("instructor_id");
CREATE INDEX IF NOT EXISTS "idx_credit_transactions_created_at" ON "credit_transactions"("created_at");

-- Insert default credit packages
INSERT INTO "credit_packages" ("name", "description", "sms_credits", "email_credits", "price", "is_active", "sort_order", "is_popular") VALUES
  ('Starter SMS Pack', '100 SMS messages - perfect for getting started', 100, 0, 10.00, true, 1, false),
  ('Professional SMS Pack', '500 SMS messages - great value for active instructors', 500, 0, 40.00, true, 2, true),
  ('Enterprise SMS Pack', '1000 SMS messages - best value for high-volume users', 1000, 0, 70.00, true, 3, false),
  ('Starter Email Pack', '500 email messages - ideal for newsletters', 0, 500, 15.00, true, 4, false),
  ('Professional Email Pack', '2000 email messages - perfect for regular communications', 0, 2000, 50.00, true, 5, true),
  ('Enterprise Email Pack', '5000 email messages - maximum reach', 0, 5000, 100.00, true, 6, false),
  ('Combo Starter', '50 SMS + 250 emails - balanced starter pack', 50, 250, 12.00, true, 7, false),
  ('Combo Professional', '300 SMS + 1000 emails - complete communication solution', 300, 1000, 60.00, true, 8, true),
  ('Combo Enterprise', '750 SMS + 3000 emails - ultimate package', 750, 3000, 125.00, true, 9, false);
