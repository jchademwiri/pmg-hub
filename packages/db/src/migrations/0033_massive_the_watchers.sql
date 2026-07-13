-- Set a default division for any existing financial records where division_id might be null
DO $$ 
DECLARE 
    unmappable text;
BEGIN
    -- invoices mapping
    SELECT string_agg(i.id::text, ', ') INTO unmappable
    FROM "invoices" i
    LEFT JOIN "clients" c ON i."client_id" = c.id
    WHERE i."division_id" IS NULL AND (c.id IS NULL OR c."division_id" IS NULL);

    IF unmappable IS NOT NULL THEN
        RAISE EXCEPTION 'Unmappable invoices found: %', unmappable;
    END IF;

    -- income mapping
    SELECT string_agg(i.id::text, ', ') INTO unmappable
    FROM "income" i
    LEFT JOIN "clients" c ON i."client_id" = c.id
    WHERE i."division_id" IS NULL AND (c.id IS NULL OR c."division_id" IS NULL);

    IF unmappable IS NOT NULL THEN
        RAISE EXCEPTION 'Unmappable income found: %', unmappable;
    END IF;

    -- expenses mapping
    SELECT string_agg(e.id::text, ', ') INTO unmappable
    FROM "expenses" e
    LEFT JOIN "clients" c ON e."client_id" = c.id
    WHERE e."division_id" IS NULL AND (c.id IS NULL OR c."division_id" IS NULL);

    IF unmappable IS NOT NULL THEN
        RAISE EXCEPTION 'Unmappable expenses found: %', unmappable;
    END IF;

    UPDATE "invoices" i SET "division_id" = c."division_id" FROM "clients" c WHERE i."client_id" = c.id AND i."division_id" IS NULL;
    UPDATE "income" i SET "division_id" = c."division_id" FROM "clients" c WHERE i."client_id" = c.id AND i."division_id" IS NULL;
    UPDATE "expenses" e SET "division_id" = c."division_id" FROM "clients" c WHERE e."client_id" = c.id AND e."division_id" IS NULL;
END $$;

ALTER TABLE "journal_entries" ADD COLUMN "division_id" uuid;

DO $$ 
DECLARE 
    unmappable text;
BEGIN
    -- journal_entries mapping
    SELECT string_agg(j.id::text, ', ') INTO unmappable
    FROM "journal_entries" j
    LEFT JOIN "invoices" i ON j."source_table" = 'invoices' AND j."source_id" = i.id
    LEFT JOIN "income" inc ON j."source_table" = 'income' AND j."source_id" = inc.id
    LEFT JOIN "expenses" e ON j."source_table" = 'expenses' AND j."source_id" = e.id
    WHERE j."division_id" IS NULL 
      AND (i."division_id" IS NULL AND inc."division_id" IS NULL AND e."division_id" IS NULL);

    IF unmappable IS NOT NULL THEN
        RAISE EXCEPTION 'Unmappable journal_entries found: %', unmappable;
    END IF;

    UPDATE "journal_entries" j SET "division_id" = COALESCE(i."division_id", inc."division_id", e."division_id")
    FROM "journal_entries" j2
    LEFT JOIN "invoices" i ON j2."source_table" = 'invoices' AND j2."source_id" = i.id
    LEFT JOIN "income" inc ON j2."source_table" = 'income' AND j2."source_id" = inc.id
    LEFT JOIN "expenses" e ON j2."source_table" = 'expenses' AND j2."source_id" = e.id
    WHERE j.id = j2.id AND j."division_id" IS NULL;
END $$;

ALTER TABLE "journal_entries" ALTER COLUMN "division_id" SET NOT NULL;
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE restrict ON UPDATE no action NOT VALID;
ALTER TABLE "journal_entries" VALIDATE CONSTRAINT "journal_entries_division_id_divisions_id_fk";