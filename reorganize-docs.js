const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname);

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function moveFile(src, dest) {
  const srcPath = path.join(root, src);
  const destPath = path.join(root, dest);
  if (fs.existsSync(srcPath)) {
    ensureDir(path.dirname(destPath));
    fs.renameSync(srcPath, destPath);
    console.log(`Moved file: ${src} -> ${dest}`);
  }
}

function moveDirContents(srcDir, destDir) {
  const srcPath = path.join(root, srcDir);
  if (!fs.existsSync(srcPath)) return;
  
  const items = fs.readdirSync(srcPath, { recursive: true, withFileTypes: true });
  for (const item of items) {
    if (item.isFile()) {
      const itemParent = item.parentPath || item.path;
      const relPath = path.relative(srcPath, path.join(itemParent, item.name));
      const targetPath = path.join(root, destDir, relPath);
      ensureDir(path.dirname(targetPath));
      fs.renameSync(path.join(srcPath, relPath), targetPath);
      console.log(`Moved content: ${path.join(srcDir, relPath)} -> ${path.join(destDir, relPath)}`);
    }
  }
}

function deletePath(p) {
  const full = path.join(root, p);
  if (fs.existsSync(full)) {
    fs.rmSync(full, { recursive: true, force: true });
    console.log(`Deleted: ${p}`);
  }
}

console.log('--- Phase 1: App-Scoped Reorganization ---');

// Admin App (apps/admin)
moveFile('docs/specifications/pmg-admin-specification.md', 'docs/apps/admin/specifications/pmg-admin-specification.md');
moveDirContents('docs/features/billing-accounting', 'docs/apps/admin/billing-accounting');
moveDirContents('docs/features/scheduling', 'docs/apps/admin/scheduling');
moveDirContents('docs/features/insights', 'docs/apps/admin/insights');
moveDirContents('docs/features/compliance-tracking', 'docs/apps/admin/compliance-tracking');
moveFile('docs/audits/admin-site-audit.md', 'docs/apps/admin/audits/admin-site-audit.md');
moveFile('docs/audits/pmg-hub-admin-ux-audit.md', 'docs/apps/admin/audits/pmg-hub-admin-ux-audit.md');
moveFile('docs/audits/pmg-hub-admin-ux-audit-code-comparison-report.md', 'docs/apps/admin/audits/pmg-hub-admin-ux-audit-code-comparison-report.md');
moveFile('docs/audits/billing-improvements-backlog.md', 'docs/apps/admin/audits/billing-improvements-backlog.md');
moveFile('docs/audits/billing-responsiveness-audit.md', 'docs/apps/admin/audits/billing-responsiveness-audit.md');

// Portal App (apps/portal)
moveDirContents('docs/features/client-portal', 'docs/apps/portal/specifications');
moveFile('docs/audits/client-forms-audit.md', 'docs/apps/portal/audits/client-forms-audit.md');

// PMG App (apps/pmg)
moveFile('docs/business-profiles/PMG_Business_Plan_Final.md', 'docs/apps/pmg/business-plan.md');
moveFile('docs/business-profiles/playhouse_media_group_business_plan_brand_structure.md', 'docs/apps/pmg/brand-structure.md');
moveFile('docs/business-profiles/PMG_Handoff_Summary.md', 'docs/apps/pmg/handoff-summary.md');
moveDirContents('docs/business-profiles/services', 'docs/apps/pmg/services');

// TES App (apps/tes)
moveFile('docs/audits/tes-site-audit.md', 'docs/apps/tes/audits/tes-site-audit.md');
moveDirContents('docs/business-profiles/tes', 'docs/apps/tes/profile');

// AWS App (apps/aws)
moveFile('docs/audits/seo-audit-pmg-tes-aws.md', 'docs/apps/aws/audits/seo-audit.md');

console.log('--- Phase 2: Package-Scoped Reorganization ---');

// DB Package (@pmg/db)
moveFile('docs/architecture/pmg-db-setup-guide.md', 'docs/packages/db/setup-guide.md');
moveFile('docs/architecture/db-sync-cicd.md', 'docs/packages/db/db-sync-cicd.md');
moveDirContents('docs/audits/database-audit', 'docs/packages/db/audits');

// Billing Package (@pmg/billing)
moveFile('docs/specifications/pmg-billing-system-spec.md', 'docs/packages/billing/billing-system-spec.md');

// Emails Package (@pmg/emails)
moveFile('docs/archive/implementation-plans/invoice_email_delivery_plan.md', 'docs/packages/emails/invoice-email-delivery-plan.md');

// UI Package (@pmg/ui)
moveFile('docs/audits/shadcn-audit.md', 'docs/packages/ui/shadcn-audit.md');

console.log('--- Phase 3: Empty Directory Cleanup ---');
const foldersToRemove = [
  'docs/features/billing-accounting',
  'docs/features/scheduling',
  'docs/features/insights',
  'docs/features/compliance-tracking',
  'docs/features/client-portal',
  'docs/features',
  'docs/business-profiles/services',
  'docs/business-profiles/tes',
  'docs/business-profiles',
  'docs/audits/database-audit'
];

foldersToRemove.forEach(deletePath);

console.log('--- App-Aligned Reorganization Complete ---');
