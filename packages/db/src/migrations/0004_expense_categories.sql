CREATE TABLE IF NOT EXISTS expense_categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
--> statement-breakpoint
INSERT INTO expense_categories (name)
SELECT DISTINCT category
FROM expenses
WHERE category IS NOT NULL
ORDER BY category
ON CONFLICT (name) DO NOTHING;
