CREATE TABLE "app_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"home_courses_limit" integer DEFAULT 20 NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cart_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"session_id" varchar,
	"product_id" varchar NOT NULL,
	"variant_id" varchar,
	"quantity" integer DEFAULT 1 NOT NULL,
	"customization" jsonb,
	"price_at_time" numeric(10, 2) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"color" varchar(7) DEFAULT '#3b82f6',
	"sort_order" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "communications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(10) NOT NULL,
	"direction" varchar(10) NOT NULL,
	"purpose" varchar(20),
	"from_address" varchar(255),
	"to_address" varchar(255) NOT NULL,
	"subject" varchar(500),
	"content" text NOT NULL,
	"html_content" text,
	"user_id" varchar,
	"enrollment_id" uuid,
	"course_id" uuid,
	"is_read" boolean DEFAULT false NOT NULL,
	"is_flagged" boolean DEFAULT false NOT NULL,
	"flag_note" text,
	"delivery_status" varchar(50) DEFAULT 'pending',
	"external_message_id" varchar(255),
	"error_message" text,
	"sent_at" timestamp,
	"delivered_at" timestamp,
	"read_at" timestamp,
	"flagged_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "course_information_form_fields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_id" uuid NOT NULL,
	"field_type" varchar(50) NOT NULL,
	"label" varchar(255) NOT NULL,
	"placeholder" varchar(255),
	"is_required" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"options" jsonb,
	"validation" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "course_information_forms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"is_required" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "course_notification_delivery_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"signup_id" uuid NOT NULL,
	"schedule_id" uuid NOT NULL,
	"channel" varchar(20) NOT NULL,
	"status" varchar(20) NOT NULL,
	"error_message" text,
	"sent_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "course_notification_signups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(20),
	"preferred_channel" varchar(20) DEFAULT 'email',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "course_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"email" varchar(255) NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"phone" varchar(20),
	"course_type" varchar(255) NOT NULL,
	"course_category" varchar(100),
	"notification_sent" boolean DEFAULT false NOT NULL,
	"sent_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "course_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"start_time" varchar(8) NOT NULL,
	"end_time" varchar(8) NOT NULL,
	"location" varchar(255),
	"max_spots" integer NOT NULL,
	"available_spots" integer NOT NULL,
	"is_multi_day" boolean DEFAULT false NOT NULL,
	"is_recurring" boolean DEFAULT false NOT NULL,
	"recurrence_pattern" varchar(50),
	"recurrence_interval" integer DEFAULT 1,
	"recurrence_end_date" timestamp,
	"days_of_week" varchar(20),
	"registration_deadline" timestamp,
	"waitlist_enabled" boolean DEFAULT true NOT NULL,
	"auto_confirm_registration" boolean DEFAULT true NOT NULL,
	"event_category" varchar(100),
	"notes" text,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"brief_description" varchar(500),
	"abbreviation" varchar(10),
	"price" numeric(10, 2) NOT NULL,
	"deposit_amount" numeric(10, 2),
	"duration" varchar(100) NOT NULL,
	"category_id" uuid,
	"category" varchar(100) NOT NULL,
	"classroom_time" varchar(50),
	"range_time" varchar(50),
	"rounds" integer,
	"prerequisites" text,
	"max_students" integer DEFAULT 20 NOT NULL,
	"instructor_id" varchar NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"deleted_at" timestamp,
	"image_url" varchar,
	"moodle_course_id" integer,
	"moodle_enrollment_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ecommerce_order_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" varchar NOT NULL,
	"product_id" varchar NOT NULL,
	"variant_id" varchar,
	"product_name" varchar NOT NULL,
	"product_sku" varchar NOT NULL,
	"variant_name" varchar,
	"variant_attributes" jsonb,
	"quantity" integer NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"total_price" numeric(10, 2) NOT NULL,
	"customization" jsonb,
	"fulfillment_status" varchar DEFAULT 'pending',
	"printful_order_id" varchar,
	"download_token" varchar,
	"download_count" integer DEFAULT 0,
	"download_expires_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ecommerce_orders" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_number" varchar(50) NOT NULL,
	"user_id" varchar,
	"customer_email" varchar NOT NULL,
	"customer_phone" varchar,
	"customer_first_name" varchar NOT NULL,
	"customer_last_name" varchar NOT NULL,
	"billing_address" jsonb NOT NULL,
	"shipping_address" jsonb,
	"subtotal" numeric(10, 2) NOT NULL,
	"tax_amount" numeric(10, 2) DEFAULT '0',
	"shipping_amount" numeric(10, 2) DEFAULT '0',
	"discount_amount" numeric(10, 2) DEFAULT '0',
	"total_amount" numeric(10, 2) NOT NULL,
	"payment_status" varchar DEFAULT 'pending',
	"payment_method" varchar,
	"stripe_payment_intent_id" varchar,
	"status" varchar DEFAULT 'pending',
	"fulfillment_status" varchar DEFAULT 'pending',
	"printful_order_id" varchar,
	"printful_status" varchar,
	"shipping_carrier" varchar,
	"tracking_number" varchar,
	"tracking_url" varchar,
	"promo_codes_applied" text[],
	"customer_notes" text,
	"internal_notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"paid_at" timestamp,
	"shipped_at" timestamp,
	"delivered_at" timestamp,
	"cancelled_at" timestamp,
	CONSTRAINT "ecommerce_orders_order_number_unique" UNIQUE("order_number")
);
--> statement-breakpoint
CREATE TABLE "enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" varchar,
	"course_id" uuid NOT NULL,
	"schedule_id" uuid NOT NULL,
	"status" varchar DEFAULT 'initiated' NOT NULL,
	"payment_status" varchar DEFAULT 'pending' NOT NULL,
	"payment_option" varchar DEFAULT 'full' NOT NULL,
	"payment_intent_id" varchar,
	"stripe_payment_intent_id" varchar,
	"promo_code_applied" varchar,
	"student_info" jsonb,
	"waiver_url" varchar,
	"registration_date" timestamp DEFAULT now(),
	"confirmation_date" timestamp,
	"completion_date" timestamp,
	"cancellation_date" timestamp,
	"cancellation_reason" text,
	"moodle_enrolled" boolean DEFAULT false,
	"moodle_enrollment_date" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "event_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schedule_id" uuid NOT NULL,
	"session_date" timestamp NOT NULL,
	"start_time" varchar(8) NOT NULL,
	"end_time" varchar(8) NOT NULL,
	"session_title" varchar(255),
	"session_description" text,
	"location" varchar(255),
	"max_spots" integer,
	"available_spots" integer,
	"is_required" boolean DEFAULT true NOT NULL,
	"session_order" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "message_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instructor_id" varchar NOT NULL,
	"message_content" text NOT NULL,
	"intended_recipients" text[],
	"recipient_count" integer DEFAULT 0 NOT NULL,
	"message_type" varchar(50) NOT NULL,
	"status" varchar(20) NOT NULL,
	"blocked_reason" text,
	"prohibited_words" text[],
	"twilio_message_sid" varchar(255),
	"delivery_status" varchar(50),
	"error_message" text,
	"attempted_at" timestamp DEFAULT now(),
	"delivered_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "notification_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"schedule_id" uuid,
	"recipient_id" varchar NOT NULL,
	"recipient_email" varchar(255),
	"recipient_phone" varchar(20),
	"type" varchar(10) NOT NULL,
	"subject" varchar(500),
	"content" text NOT NULL,
	"variables" jsonb,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"delivery_attempts" integer DEFAULT 0 NOT NULL,
	"last_attempt_at" timestamp,
	"delivered_at" timestamp,
	"error_message" text,
	"external_id" varchar(255),
	"external_status" varchar(50),
	"enrollment_id" uuid,
	"course_id" uuid,
	"sent_by" varchar,
	"sent_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notification_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"trigger_event" varchar(50) NOT NULL,
	"trigger_timing" varchar(20) DEFAULT 'immediate' NOT NULL,
	"delay_days" integer DEFAULT 0,
	"delay_hours" integer DEFAULT 0,
	"course_id" uuid,
	"schedule_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"send_email" boolean DEFAULT true NOT NULL,
	"send_sms" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notification_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(10) NOT NULL,
	"category" varchar(50) NOT NULL,
	"subject" varchar(500),
	"content" text NOT NULL,
	"reply_to_email" varchar,
	"variables" text[],
	"course_id" uuid,
	"schedule_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" varchar NOT NULL,
	"updated_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "product_categories" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"description" text,
	"parent_id" varchar,
	"image_url" varchar,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "product_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" varchar NOT NULL,
	"name" varchar(100) NOT NULL,
	"sku" varchar(100) NOT NULL,
	"price" numeric(10, 2),
	"sale_price" numeric(10, 2),
	"attributes" jsonb,
	"printful_variant_id" integer,
	"stock_quantity" integer DEFAULT 0,
	"weight" numeric(8, 2),
	"image_url" varchar,
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "product_variants_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"short_description" varchar(500),
	"sku" varchar(100) NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"sale_price" numeric(10, 2),
	"product_type" varchar(20) NOT NULL,
	"fulfillment_type" varchar(20) NOT NULL,
	"printful_product_id" integer,
	"printful_sync_variant_id" integer,
	"design_template_url" varchar,
	"mockup_image_url" varchar,
	"download_url" varchar,
	"download_limit" integer,
	"download_expire_days" integer,
	"track_inventory" boolean DEFAULT false,
	"stock_quantity" integer,
	"low_stock_threshold" integer DEFAULT 5,
	"weight" numeric(8, 2),
	"slug" varchar(255),
	"category_id" varchar,
	"tags" text[],
	"primary_image_url" varchar,
	"image_urls" text[],
	"status" varchar(20) DEFAULT 'draft',
	"featured" boolean DEFAULT false,
	"sort_order" integer DEFAULT 0,
	"created_by" varchar,
	"updated_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "products_sku_unique" UNIQUE("sku"),
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "prohibited_words" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"word" varchar(255) NOT NULL,
	"category" varchar(50) NOT NULL,
	"is_regex" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"severity" varchar(20) DEFAULT 'high',
	"description" text,
	"added_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "promo_code_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"promo_code_id" uuid NOT NULL,
	"user_id" varchar NOT NULL,
	"enrollment_id" uuid,
	"original_amount" numeric(10, 2) NOT NULL,
	"discount_amount" numeric(10, 2) NOT NULL,
	"final_amount" numeric(10, 2) NOT NULL,
	"payment_intent_id" varchar,
	"stripe_metadata" jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"redemption_source" varchar(50) DEFAULT 'CHECKOUT',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "promo_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"type" varchar(20) NOT NULL,
	"value" numeric(10, 2) NOT NULL,
	"scope_type" varchar(20) DEFAULT 'GLOBAL' NOT NULL,
	"scope_course_ids" text[],
	"scope_category_ids" text[],
	"exclusion_course_ids" text[],
	"exclusion_category_ids" text[],
	"min_cart_subtotal" numeric(10, 2),
	"first_purchase_only" boolean DEFAULT false NOT NULL,
	"new_customers_only" boolean DEFAULT false NOT NULL,
	"allowed_user_ids" text[],
	"denied_user_ids" text[],
	"max_total_uses" integer,
	"max_uses_per_user" integer DEFAULT 1,
	"current_use_count" integer DEFAULT 0 NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"valid_days_of_week" varchar(20),
	"valid_time_start" varchar(8),
	"valid_time_end" varchar(8),
	"stacking_policy" varchar(20) DEFAULT 'EXCLUSIVE' NOT NULL,
	"apply_to_tax" boolean DEFAULT false NOT NULL,
	"apply_to_shipping" boolean DEFAULT false NOT NULL,
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"created_by" varchar NOT NULL,
	"updated_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "promo_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sms_broadcast_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"broadcast_id" uuid NOT NULL,
	"user_id" varchar NOT NULL,
	"phone_number" varchar(20) NOT NULL,
	"personalized_message" text NOT NULL,
	"twilio_message_sid" varchar(255),
	"status" varchar(50) NOT NULL,
	"error_message" text,
	"sent_at" timestamp,
	"delivered_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sms_broadcast_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"list_id" uuid NOT NULL,
	"instructor_id" varchar NOT NULL,
	"subject" varchar(255),
	"message_content" text NOT NULL,
	"message_html" text,
	"message_plain" text NOT NULL,
	"template_id" uuid,
	"attachment_urls" text[],
	"dynamic_tags" jsonb,
	"scheduled_for" timestamp,
	"status" varchar(50) NOT NULL,
	"total_recipients" integer DEFAULT 0,
	"success_count" integer DEFAULT 0,
	"failure_count" integer DEFAULT 0,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sms_list_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"list_id" uuid NOT NULL,
	"user_id" varchar NOT NULL,
	"added_by" varchar NOT NULL,
	"auto_added" boolean DEFAULT false,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sms_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"list_type" varchar(50) NOT NULL,
	"schedule_id" uuid,
	"instructor_id" varchar NOT NULL,
	"tags" text[],
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "sms_lists_schedule_id_unique" UNIQUE("schedule_id")
);
--> statement-breakpoint
CREATE TABLE "student_form_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"form_id" uuid NOT NULL,
	"field_id" uuid NOT NULL,
	"response" text,
	"submitted_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"preferred_name" varchar,
	"phone" varchar(20),
	"street_address" varchar(255),
	"city" varchar(100),
	"state" varchar(2),
	"zip_code" varchar(10),
	"date_of_birth" timestamp,
	"profile_image_url" varchar,
	"concealed_carry_license_expiration" timestamp,
	"concealed_carry_license_issued" timestamp,
	"preferred_contact_methods" text[],
	"license_expiration_reminder_days" integer DEFAULT 60,
	"enable_license_expiration_reminder" boolean DEFAULT false,
	"refresher_reminder_days" integer DEFAULT 60,
	"enable_refresher_reminder" boolean DEFAULT false,
	"enable_sms_notifications" boolean DEFAULT true,
	"enable_sms_reminders" boolean DEFAULT true,
	"enable_sms_payment_notices" boolean DEFAULT false,
	"enable_sms_announcements" boolean DEFAULT false,
	"reply_to_email" varchar,
	"role" varchar DEFAULT 'student' NOT NULL,
	"moodle_user_id" integer,
	"moodle_username" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "waitlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" varchar NOT NULL,
	"schedule_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"status" varchar DEFAULT 'waiting' NOT NULL,
	"offer_date" timestamp,
	"offer_expiry_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "waiver_instances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"signer_type" varchar(20) DEFAULT 'student' NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"signed_at" timestamp,
	"expires_at" timestamp,
	"pdf_url" varchar,
	"rendered_content" text,
	"audit_trail" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "waiver_signatures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instance_id" uuid NOT NULL,
	"signer_name" varchar(255) NOT NULL,
	"signer_email" varchar(255) NOT NULL,
	"signer_role" varchar(20) DEFAULT 'student' NOT NULL,
	"signature_data" text NOT NULL,
	"signature_method" varchar(20) DEFAULT 'canvas' NOT NULL,
	"consent_checkboxes" jsonb,
	"acknowledgements_completed" boolean DEFAULT false NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"ip_address" varchar(45) NOT NULL,
	"user_agent" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "waiver_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"scope" varchar(20) DEFAULT 'course' NOT NULL,
	"course_ids" text[],
	"category_ids" text[],
	"validity_days" integer DEFAULT 365,
	"requires_guardian" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"force_re_sign" boolean DEFAULT false NOT NULL,
	"available_fields" text[] DEFAULT ARRAY['studentName', 'courseName', 'date', 'instructorName', 'location'],
	"created_by" varchar NOT NULL,
	"updated_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communications" ADD CONSTRAINT "communications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communications" ADD CONSTRAINT "communications_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communications" ADD CONSTRAINT "communications_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_information_form_fields" ADD CONSTRAINT "course_information_form_fields_form_id_course_information_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."course_information_forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_information_forms" ADD CONSTRAINT "course_information_forms_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_notification_delivery_logs" ADD CONSTRAINT "course_notification_delivery_logs_signup_id_course_notification_signups_id_fk" FOREIGN KEY ("signup_id") REFERENCES "public"."course_notification_signups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_notification_delivery_logs" ADD CONSTRAINT "course_notification_delivery_logs_schedule_id_course_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."course_schedules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_notification_signups" ADD CONSTRAINT "course_notification_signups_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_notifications" ADD CONSTRAINT "course_notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_schedules" ADD CONSTRAINT "course_schedules_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_instructor_id_users_id_fk" FOREIGN KEY ("instructor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ecommerce_order_items" ADD CONSTRAINT "ecommerce_order_items_order_id_ecommerce_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."ecommerce_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ecommerce_order_items" ADD CONSTRAINT "ecommerce_order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ecommerce_order_items" ADD CONSTRAINT "ecommerce_order_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ecommerce_orders" ADD CONSTRAINT "ecommerce_orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_schedule_id_course_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."course_schedules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_sessions" ADD CONSTRAINT "event_sessions_schedule_id_course_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."course_schedules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_audit_log" ADD CONSTRAINT "message_audit_log_instructor_id_users_id_fk" FOREIGN KEY ("instructor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_template_id_notification_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."notification_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_schedule_id_notification_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."notification_schedules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_sent_by_users_id_fk" FOREIGN KEY ("sent_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_schedules" ADD CONSTRAINT "notification_schedules_template_id_notification_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."notification_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_schedules" ADD CONSTRAINT "notification_schedules_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_schedules" ADD CONSTRAINT "notification_schedules_schedule_id_course_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."course_schedules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_templates" ADD CONSTRAINT "notification_templates_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_templates" ADD CONSTRAINT "notification_templates_schedule_id_course_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."course_schedules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_templates" ADD CONSTRAINT "notification_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_templates" ADD CONSTRAINT "notification_templates_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_parent_id_product_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."product_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_product_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prohibited_words" ADD CONSTRAINT "prohibited_words_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_code_redemptions" ADD CONSTRAINT "promo_code_redemptions_promo_code_id_promo_codes_id_fk" FOREIGN KEY ("promo_code_id") REFERENCES "public"."promo_codes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_code_redemptions" ADD CONSTRAINT "promo_code_redemptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_code_redemptions" ADD CONSTRAINT "promo_code_redemptions_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_codes" ADD CONSTRAINT "promo_codes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_codes" ADD CONSTRAINT "promo_codes_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_broadcast_deliveries" ADD CONSTRAINT "sms_broadcast_deliveries_broadcast_id_sms_broadcast_messages_id_fk" FOREIGN KEY ("broadcast_id") REFERENCES "public"."sms_broadcast_messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_broadcast_deliveries" ADD CONSTRAINT "sms_broadcast_deliveries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_broadcast_messages" ADD CONSTRAINT "sms_broadcast_messages_list_id_sms_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."sms_lists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_broadcast_messages" ADD CONSTRAINT "sms_broadcast_messages_instructor_id_users_id_fk" FOREIGN KEY ("instructor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_list_members" ADD CONSTRAINT "sms_list_members_list_id_sms_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."sms_lists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_list_members" ADD CONSTRAINT "sms_list_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_list_members" ADD CONSTRAINT "sms_list_members_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_lists" ADD CONSTRAINT "sms_lists_schedule_id_course_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."course_schedules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_lists" ADD CONSTRAINT "sms_lists_instructor_id_users_id_fk" FOREIGN KEY ("instructor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_form_responses" ADD CONSTRAINT "student_form_responses_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_form_responses" ADD CONSTRAINT "student_form_responses_form_id_course_information_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."course_information_forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_form_responses" ADD CONSTRAINT "student_form_responses_field_id_course_information_form_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."course_information_form_fields"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_schedule_id_course_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."course_schedules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waiver_instances" ADD CONSTRAINT "waiver_instances_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waiver_instances" ADD CONSTRAINT "waiver_instances_template_id_waiver_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."waiver_templates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waiver_signatures" ADD CONSTRAINT "waiver_signatures_instance_id_waiver_instances_id_fk" FOREIGN KEY ("instance_id") REFERENCES "public"."waiver_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waiver_templates" ADD CONSTRAINT "waiver_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waiver_templates" ADD CONSTRAINT "waiver_templates_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_promo_redemptions_code_user" ON "promo_code_redemptions" USING btree ("promo_code_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_promo_redemptions_enrollment" ON "promo_code_redemptions" USING btree ("enrollment_id");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");