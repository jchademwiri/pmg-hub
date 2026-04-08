ALTER TABLE "expenses" ADD COLUMN "client_id" uuid;--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "expenses_client_id_idx" ON "expenses" USING btree ("client_id");