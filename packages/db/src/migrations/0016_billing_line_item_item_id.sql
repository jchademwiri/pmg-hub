ALTER TABLE "billing_line_items" ADD COLUMN "item_id" uuid;

UPDATE "billing_line_items"
SET "item_id" = (
  SELECT "billing_items"."id"
  FROM "billing_items"
  WHERE "billing_items"."name" = "billing_line_items"."description"
     OR "billing_items"."description" = "billing_line_items"."description"
  ORDER BY
    CASE
      WHEN "billing_items"."name" = "billing_line_items"."description" THEN 0
      ELSE 1
    END,
    "billing_items"."created_at",
    "billing_items"."id"
  LIMIT 1
)
WHERE "billing_line_items"."item_id" IS NULL
  AND EXISTS (
    SELECT 1
    FROM "billing_items"
    WHERE "billing_items"."name" = "billing_line_items"."description"
       OR "billing_items"."description" = "billing_line_items"."description"
  );

ALTER TABLE "billing_line_items" ADD CONSTRAINT "billing_line_items_item_id_billing_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."billing_items"("id") ON DELETE set null ON UPDATE no action;
CREATE INDEX "billing_line_items_item_id_idx" ON "billing_line_items" USING btree ("item_id");
