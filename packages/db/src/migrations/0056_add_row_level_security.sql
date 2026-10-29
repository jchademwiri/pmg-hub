-- ── Functions for RLS ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION app_current_client_id()
RETURNS uuid LANGUAGE plpgsql STABLE PARALLEL SAFE AS $$
DECLARE
  raw_val text;
BEGIN
  raw_val := NULLIF(current_setting('app.current_client_id', true), '');
  IF raw_val IS NULL THEN
    RETURN NULL;
  END IF;
  BEGIN
    RETURN raw_val::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN NULL;
  END;
END;
$$;

CREATE OR REPLACE FUNCTION app_is_admin()
RETURNS boolean LANGUAGE sql STABLE PARALLEL SAFE AS $$
  SELECT COALESCE(current_setting('app.is_admin', true) = 'true', false);
$$;

CREATE OR REPLACE FUNCTION app_is_client_mode()
RETURNS boolean LANGUAGE sql STABLE PARALLEL SAFE AS $$
  SELECT COALESCE(current_setting('app.is_client_mode', true) = 'true', false)
      OR NULLIF(current_setting('app.current_client_id', true), '') IS NOT NULL;
$$;

-- ── invoices ──────────────────────────────────────────────────────────────────
ALTER TABLE "invoices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invoices" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS invoices_tenant_isolation ON "invoices";
CREATE POLICY invoices_tenant_isolation ON "invoices"
  FOR ALL
  USING (
    app_is_admin()
    OR (app_current_client_id() IS NOT NULL AND client_id = app_current_client_id())
    OR (app_current_client_id() IS NULL AND NOT app_is_client_mode())
  )
  WITH CHECK (
    app_is_admin()
    OR (app_current_client_id() IS NOT NULL AND client_id = app_current_client_id())
    OR (app_current_client_id() IS NULL AND NOT app_is_client_mode())
  );

-- ── quotations ────────────────────────────────────────────────────────────────
ALTER TABLE "quotations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "quotations" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS quotations_tenant_isolation ON "quotations";
CREATE POLICY quotations_tenant_isolation ON "quotations"
  FOR ALL
  USING (
    app_is_admin()
    OR (app_current_client_id() IS NOT NULL AND client_id = app_current_client_id())
    OR (app_current_client_id() IS NULL AND NOT app_is_client_mode())
  )
  WITH CHECK (
    app_is_admin()
    OR (app_current_client_id() IS NOT NULL AND client_id = app_current_client_id())
    OR (app_current_client_id() IS NULL AND NOT app_is_client_mode())
  );

-- ── credit_notes ──────────────────────────────────────────────────────────────
ALTER TABLE "credit_notes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "credit_notes" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS credit_notes_tenant_isolation ON "credit_notes";
CREATE POLICY credit_notes_tenant_isolation ON "credit_notes"
  FOR ALL
  USING (
    app_is_admin()
    OR (app_current_client_id() IS NOT NULL AND client_id = app_current_client_id())
    OR (app_current_client_id() IS NULL AND NOT app_is_client_mode())
  )
  WITH CHECK (
    app_is_admin()
    OR (app_current_client_id() IS NOT NULL AND client_id = app_current_client_id())
    OR (app_current_client_id() IS NULL AND NOT app_is_client_mode())
  );

-- ── credit_refunds ────────────────────────────────────────────────────────────
ALTER TABLE "credit_refunds" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "credit_refunds" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS credit_refunds_tenant_isolation ON "credit_refunds";
CREATE POLICY credit_refunds_tenant_isolation ON "credit_refunds"
  FOR ALL
  USING (
    app_is_admin()
    OR (app_current_client_id() IS NOT NULL AND client_id = app_current_client_id())
    OR (app_current_client_id() IS NULL AND NOT app_is_client_mode())
  )
  WITH CHECK (
    app_is_admin()
    OR (app_current_client_id() IS NOT NULL AND client_id = app_current_client_id())
    OR (app_current_client_id() IS NULL AND NOT app_is_client_mode())
  );

-- ── project_schedule_entries ──────────────────────────────────────────────────
ALTER TABLE "project_schedule_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "project_schedule_entries" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS project_schedule_entries_tenant_isolation ON "project_schedule_entries";
CREATE POLICY project_schedule_entries_tenant_isolation ON "project_schedule_entries"
  FOR ALL
  USING (
    app_is_admin()
    OR (app_current_client_id() IS NOT NULL AND client_id = app_current_client_id())
    OR (app_current_client_id() IS NULL AND NOT app_is_client_mode())
  )
  WITH CHECK (
    app_is_admin()
    OR (app_current_client_id() IS NOT NULL AND client_id = app_current_client_id())
    OR (app_current_client_id() IS NULL AND NOT app_is_client_mode())
  );

-- ── compliance_documents ──────────────────────────────────────────────────────
ALTER TABLE "compliance_documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "compliance_documents" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS compliance_documents_tenant_isolation ON "compliance_documents";
CREATE POLICY compliance_documents_tenant_isolation ON "compliance_documents"
  FOR ALL
  USING (
    app_is_admin()
    OR (app_current_client_id() IS NOT NULL AND client_id = app_current_client_id())
    OR (app_current_client_id() IS NULL AND NOT app_is_client_mode())
  )
  WITH CHECK (
    app_is_admin()
    OR (app_current_client_id() IS NOT NULL AND client_id = app_current_client_id())
    OR (app_current_client_id() IS NULL AND NOT app_is_client_mode())
  );

-- ── expenses ──────────────────────────────────────────────────────────────────
ALTER TABLE "expenses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "expenses" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS expenses_tenant_isolation ON "expenses";
CREATE POLICY expenses_tenant_isolation ON "expenses"
  FOR ALL
  USING (
    app_is_admin()
    OR (app_current_client_id() IS NOT NULL AND client_id = app_current_client_id())
    OR (app_current_client_id() IS NULL AND NOT app_is_client_mode())
  )
  WITH CHECK (
    app_is_admin()
    OR (app_current_client_id() IS NOT NULL AND client_id = app_current_client_id())
    OR (app_current_client_id() IS NULL AND NOT app_is_client_mode())
  );

-- ── client_change_requests ────────────────────────────────────────────────────
ALTER TABLE "client_change_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "client_change_requests" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS client_change_requests_tenant_isolation ON "client_change_requests";
CREATE POLICY client_change_requests_tenant_isolation ON "client_change_requests"
  FOR ALL
  USING (
    app_is_admin()
    OR (app_current_client_id() IS NOT NULL AND client_id = app_current_client_id())
    OR (app_current_client_id() IS NULL AND NOT app_is_client_mode())
  )
  WITH CHECK (
    app_is_admin()
    OR (app_current_client_id() IS NOT NULL AND client_id = app_current_client_id())
    OR (app_current_client_id() IS NULL AND NOT app_is_client_mode())
  );

-- ── billing_line_items (Child) ────────────────────────────────────────────────
ALTER TABLE "billing_line_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "billing_line_items" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS billing_line_items_tenant_isolation ON "billing_line_items";
CREATE POLICY billing_line_items_tenant_isolation ON "billing_line_items"
  FOR ALL
  USING (
    app_is_admin()
    OR (
      app_current_client_id() IS NOT NULL AND (
        (document_type = 'invoice' AND EXISTS (
          SELECT 1 FROM "invoices"
          WHERE "invoices".id = "billing_line_items".document_id
            AND "invoices".client_id = app_current_client_id()
        ))
        OR (document_type = 'quotation' AND EXISTS (
          SELECT 1 FROM "quotations"
          WHERE "quotations".id = "billing_line_items".document_id
            AND "quotations".client_id = app_current_client_id()
        ))
      )
    )
    OR (app_current_client_id() IS NULL AND NOT app_is_client_mode())
  )
  WITH CHECK (
    app_is_admin()
    OR (
      app_current_client_id() IS NOT NULL AND (
        (document_type = 'invoice' AND EXISTS (
          SELECT 1 FROM "invoices"
          WHERE "invoices".id = "billing_line_items".document_id
            AND "invoices".client_id = app_current_client_id()
        ))
        OR (document_type = 'quotation' AND EXISTS (
          SELECT 1 FROM "quotations"
          WHERE "quotations".id = "billing_line_items".document_id
            AND "quotations".client_id = app_current_client_id()
        ))
      )
    )
    OR (app_current_client_id() IS NULL AND NOT app_is_client_mode())
  );

-- ── payment_allocations (Child) ───────────────────────────────────────────────
ALTER TABLE "payment_allocations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payment_allocations" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payment_allocations_tenant_isolation ON "payment_allocations";
CREATE POLICY payment_allocations_tenant_isolation ON "payment_allocations"
  FOR ALL
  USING (
    app_is_admin()
    OR (
      app_current_client_id() IS NOT NULL AND EXISTS (
        SELECT 1 FROM "invoices"
        WHERE "invoices".id = "payment_allocations".invoice_id
          AND "invoices".client_id = app_current_client_id()
      )
    )
    OR (app_current_client_id() IS NULL AND NOT app_is_client_mode())
  )
  WITH CHECK (
    app_is_admin()
    OR (
      app_current_client_id() IS NOT NULL AND EXISTS (
        SELECT 1 FROM "invoices"
        WHERE "invoices".id = "payment_allocations".invoice_id
          AND "invoices".client_id = app_current_client_id()
      )
    )
    OR (app_current_client_id() IS NULL AND NOT app_is_client_mode())
  );

-- ── credit_applications (Child) ───────────────────────────────────────────────
ALTER TABLE "credit_applications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "credit_applications" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS credit_applications_tenant_isolation ON "credit_applications";
CREATE POLICY credit_applications_tenant_isolation ON "credit_applications"
  FOR ALL
  USING (
    app_is_admin()
    OR (
      app_current_client_id() IS NOT NULL AND (
        EXISTS (
          SELECT 1 FROM "invoices"
          WHERE "invoices".id = "credit_applications".invoice_id
            AND "invoices".client_id = app_current_client_id()
        )
        OR EXISTS (
          SELECT 1 FROM "credit_notes"
          WHERE "credit_notes".id = "credit_applications".credit_note_id
            AND "credit_notes".client_id = app_current_client_id()
        )
      )
    )
    OR (app_current_client_id() IS NULL AND NOT app_is_client_mode())
  )
  WITH CHECK (
    app_is_admin()
    OR (
      app_current_client_id() IS NOT NULL AND (
        EXISTS (
          SELECT 1 FROM "invoices"
          WHERE "invoices".id = "credit_applications".invoice_id
            AND "invoices".client_id = app_current_client_id()
        )
        OR EXISTS (
          SELECT 1 FROM "credit_notes"
          WHERE "credit_notes".id = "credit_applications".credit_note_id
            AND "credit_notes".client_id = app_current_client_id()
        )
      )
    )
    OR (app_current_client_id() IS NULL AND NOT app_is_client_mode())
  );

-- ── project_progress_sections (Child) ─────────────────────────────────────────
ALTER TABLE "project_progress_sections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "project_progress_sections" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS project_progress_sections_tenant_isolation ON "project_progress_sections";
CREATE POLICY project_progress_sections_tenant_isolation ON "project_progress_sections"
  FOR ALL
  USING (
    app_is_admin()
    OR (
      app_current_client_id() IS NOT NULL AND EXISTS (
        SELECT 1 FROM "project_schedule_entries"
        WHERE "project_schedule_entries".id = "project_progress_sections".project_id
          AND "project_schedule_entries".client_id = app_current_client_id()
      )
    )
    OR (app_current_client_id() IS NULL AND NOT app_is_client_mode())
  )
  WITH CHECK (
    app_is_admin()
    OR (
      app_current_client_id() IS NOT NULL AND EXISTS (
        SELECT 1 FROM "project_schedule_entries"
        WHERE "project_schedule_entries".id = "project_progress_sections".project_id
          AND "project_schedule_entries".client_id = app_current_client_id()
      )
    )
    OR (app_current_client_id() IS NULL AND NOT app_is_client_mode())
  );

-- ── project_progress_items (Child) ────────────────────────────────────────────
ALTER TABLE "project_progress_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "project_progress_items" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS project_progress_items_tenant_isolation ON "project_progress_items";
CREATE POLICY project_progress_items_tenant_isolation ON "project_progress_items"
  FOR ALL
  USING (
    app_is_admin()
    OR (
      app_current_client_id() IS NOT NULL AND EXISTS (
        SELECT 1 FROM "project_progress_sections" s
        JOIN "project_schedule_entries" p ON s.project_id = p.id
        WHERE s.id = "project_progress_items".section_id
          AND p.client_id = app_current_client_id()
      )
    )
    OR (app_current_client_id() IS NULL AND NOT app_is_client_mode())
  )
  WITH CHECK (
    app_is_admin()
    OR (
      app_current_client_id() IS NOT NULL AND EXISTS (
        SELECT 1 FROM "project_progress_sections" s
        JOIN "project_schedule_entries" p ON s.project_id = p.id
        WHERE s.id = "project_progress_items".section_id
          AND p.client_id = app_current_client_id()
      )
    )
    OR (app_current_client_id() IS NULL AND NOT app_is_client_mode())
  );
