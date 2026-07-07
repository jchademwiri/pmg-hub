-- Set a default division for any existing financial records where division_id might be null
DO $$ 
DECLARE 
    first_division_id uuid;
BEGIN
    SELECT id INTO first_division_id FROM "divisions" ORDER BY "created_at" ASC LIMIT 1;
    
    IF first_division_id IS NOT NULL THEN
        UPDATE "invoices" SET "division_id" = first_division_id WHERE "division_id" IS NULL;
        UPDATE "income" SET "division_id" = first_division_id WHERE "division_id" IS NULL;
        UPDATE "expenses" SET "division_id" = first_division_id WHERE "division_id" IS NULL;
    END IF;
END $$;

ALTER TABLE "journal_entries" ADD COLUMN "division_id" uuid;

DO $$ 
DECLARE 
    first_division_id uuid;
BEGIN
    SELECT id INTO first_division_id FROM "divisions" ORDER BY "created_at" ASC LIMIT 1;
    
    IF first_division_id IS NOT NULL THEN
        UPDATE "journal_entries" SET "division_id" = first_division_id WHERE "division_id" IS NULL;
    END IF;
END $$;

ALTER TABLE "journal_entries" ALTER COLUMN "division_id" SET NOT NULL;
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE restrict ON UPDATE no action;