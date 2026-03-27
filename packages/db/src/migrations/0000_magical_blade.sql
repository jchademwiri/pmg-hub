CREATE TYPE "public"."tes_lead_status" AS ENUM('new', 'contacted', 'converted', 'archived');--> statement-breakpoint
CREATE TYPE "public"."tes_service" AS ENUM('bid_preparation', 'tender_tracking', 'compliance_docs', 'method_statements', 'pricing_boq', 'post_award', 'project_management', 'full_service');--> statement-breakpoint
CREATE TYPE "public"."aws_booking_status" AS ENUM('new', 'contacted', 'active', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."aws_message_status" AS ENUM('new', 'read', 'replied', 'archived');--> statement-breakpoint
CREATE TYPE "public"."aws_package_type" AS ENUM('monthly', 'once_off');--> statement-breakpoint
CREATE TYPE "public"."pmg_lead_service" AS ENUM('tendering', 'web_dev', 'both', 'general');--> statement-breakpoint
CREATE TYPE "public"."pmg_lead_status" AS ENUM('new', 'contacted', 'referred_tes', 'referred_aws', 'converted', 'archived');--> statement-breakpoint
CREATE TABLE "tes_leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"company" text,
	"service_interest" "tes_service",
	"message" text NOT NULL,
	"newsletter_opt_in" boolean DEFAULT false,
	"status" "tes_lead_status" DEFAULT 'new' NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aws_bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"package_name" text NOT NULL,
	"package_price" integer NOT NULL,
	"package_type" "aws_package_type" NOT NULL,
	"newsletter_opt_in" boolean DEFAULT false,
	"status" "aws_booking_status" DEFAULT 'new' NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aws_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"subject" text,
	"message" text NOT NULL,
	"newsletter_opt_in" boolean DEFAULT false,
	"status" "aws_message_status" DEFAULT 'new' NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aws_pricing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"price" integer NOT NULL,
	"period" text,
	"upfront" integer,
	"description" text NOT NULL,
	"features" jsonb NOT NULL,
	"cta" text NOT NULL,
	"popular" boolean DEFAULT false,
	"type" "aws_package_type" NOT NULL,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "pmg_leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"company" text,
	"service_interest" "pmg_lead_service" DEFAULT 'general' NOT NULL,
	"message" text,
	"newsletter_opt_in" boolean DEFAULT false NOT NULL,
	"status" "pmg_lead_status" DEFAULT 'new' NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "tes_leads_status_idx" ON "tes_leads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tes_leads_email_idx" ON "tes_leads" USING btree ("email");--> statement-breakpoint
CREATE INDEX "aws_bookings_status_idx" ON "aws_bookings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "aws_bookings_email_idx" ON "aws_bookings" USING btree ("email");--> statement-breakpoint
CREATE INDEX "aws_messages_status_idx" ON "aws_messages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "aws_messages_email_idx" ON "aws_messages" USING btree ("email");--> statement-breakpoint
CREATE INDEX "pmg_leads_status_idx" ON "pmg_leads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "pmg_leads_email_idx" ON "pmg_leads" USING btree ("email");