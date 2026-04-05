CREATE TABLE "expense_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "expense_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "income" DROP CONSTRAINT "income_client_id_clients_id_fk";
--> statement-breakpoint
ALTER TABLE "income" ALTER COLUMN "client_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "divisions" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "withdrawals" ADD COLUMN "account" text DEFAULT 'salary' NOT NULL;--> statement-breakpoint
ALTER TABLE "income" ADD CONSTRAINT "income_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;