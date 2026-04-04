UPDATE income
SET client_id = (SELECT id FROM clients LIMIT 1)
WHERE client_id IS NULL;
--> statement-breakpoint
ALTER TABLE income ALTER COLUMN client_id SET NOT NULL;
