ALTER TABLE "expense_categories" ADD COLUMN "chart_account_id" uuid;--> statement-breakpoint
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_chart_account_id_chart_accounts_id_fk" FOREIGN KEY ("chart_account_id") REFERENCES "public"."chart_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "expense_categories_chart_account_id_idx" ON "expense_categories" USING btree ("chart_account_id");--> statement-breakpoint
-- Normalize historical source_module typo ('expenses' -> 'expense')
UPDATE "journal_entries" SET "source_module" = 'expense' WHERE "source_module" = 'expenses';--> statement-breakpoint
-- Backfill expense_categories.chart_account_id to matching 5xxx GL accounts
UPDATE "expense_categories" ec
SET "chart_account_id" = ca."id"
FROM "chart_accounts" ca
WHERE ec."chart_account_id" IS NULL
  AND ca."code" = CASE
    WHEN lower(ec."name") ~ '(hosting|infrastructure|server|cloud|domain)' THEN '5010'
    WHEN lower(ec."name") ~ '(software|subscription|saas|licence|license)' THEN '5020'
    WHEN lower(ec."name") ~ '(office|supply|supplies|stationery|printing|equipment|hardware|device)' THEN '5030'
    WHEN lower(ec."name") ~ '(marketing|advertising|ad spend|promotion)' THEN '5040'
    WHEN lower(ec."name") ~ '(professional|accounting|legal|consulting|consultant)' THEN '5050'
    WHEN lower(ec."name") ~ '(telecom|phone|internet|data|mobile)' THEN '5060'
    WHEN lower(ec."name") ~ '(travel|transport|fuel|petrol|shipping|shipment|delivery|courier)' THEN '5070'
    WHEN lower(ec."name") ~ '(insurance)' THEN '5080'
    WHEN lower(ec."name") ~ '(contractor|freelance|sub-contractor)' THEN '5090'
    WHEN lower(ec."name") ~ '(utility|electricity|water|municipal)' THEN '5100'
    WHEN lower(ec."name") ~ '(bank|charge|fee|processing)' THEN '5110'
    WHEN lower(ec."name") ~ '(staff|salary|wage|employee|director|remuneration|bonus)' THEN '5120'
    WHEN lower(ec."name") ~ '(reinvest|growth|development)' THEN '5130'
    ELSE '5140'
  END;
