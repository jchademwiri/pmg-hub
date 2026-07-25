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
      console.log(`Moved file content: ${path.join(srcDir, relPath)} -> ${path.join(destDir, relPath)}`);
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

console.log('--- Phase 1: File Deletions ---');
[
  'docs/fix.md'
].forEach(deletePath);

console.log('--- Phase 2: Root & Loose Docs Relocation ---');
moveFile('pmg-hub-overview-nav-items.md', 'docs/architecture/pmg-hub-overview-nav-items.md');
moveFile('pmg-hub-phase8-ar-journal-posting-plan.md', 'docs/features/billing-accounting/pmg-hub-phase8-ar-journal-posting-plan.md');
moveFile('docs/cloudflare-data-backups.md', 'docs/architecture/cloudflare-data-backups.md');
moveFile('docs/db/sync.md', 'docs/architecture/db-sync-cicd.md');
moveFile('docs/revenue-received-vs-invoiced-chart-plan.md', 'docs/features/billing-accounting/revenue-received-vs-invoiced-chart-plan.md');
moveFile('docs/pmg-hub-admin-ux-audit.md', 'docs/audits/pmg-hub-admin-ux-audit.md');
moveFile('docs/pmg-hub-admin-ux-audit-code-comparison-report.md', 'docs/audits/pmg-hub-admin-ux-audit-code-comparison-report.md');
moveFile('docs/notes.md', 'docs/archive/summaries-and-notes/notes-monthly-grouping-feature.md');
moveFile('docs/today-summary-2026-06-18.md', 'docs/archive/summaries-and-notes/today-summary-2026-06-18.md');

console.log('--- Phase 3: Directory Consolidation & Moves ---');
// Specific files out of directories before moving parent
moveFile('docs/july-2026/master-execution-plan.md', 'docs/roadmap/master-execution-plan.md');
moveFile('docs/implementation-plans/pmg-mvp-v1-readiness.md', 'docs/roadmap/pmg-mvp-v1-readiness.md');

// Features
moveDirContents('docs/scheduling-ux', 'docs/features/scheduling');
moveDirContents('docs/scheduling-ux-audit', 'docs/features/scheduling/audit');
moveDirContents('docs/tender-scheduling-project-management', 'docs/features/scheduling/project-management');
moveDirContents('docs/client-dashboard', 'docs/features/client-portal');
moveDirContents('docs/portal-dashboard', 'docs/features/client-portal');
moveDirContents('docs/billing', 'docs/features/billing-accounting');
moveDirContents('docs/write-off', 'docs/features/billing-accounting/write-off');
moveDirContents('docs/finance', 'docs/features/billing-accounting/finance');
moveDirContents('docs/insights', 'docs/features/insights');
moveDirContents('docs/july-2026/compliance-tracking', 'docs/features/compliance-tracking');

// Audits
moveDirContents('docs/analysis', 'docs/audits/analysis');
moveDirContents('docs/database-audit', 'docs/audits/database-audit');
moveDirContents('docs/final-audit', 'docs/audits/final-audit');

// Research
moveDirContents('docs/ux-research', 'docs/research/ux-research');

// Archive
moveDirContents('docs/july-2026', 'docs/archive/july-2026');
moveDirContents('docs/implementation-plans', 'docs/archive/implementation-plans');
moveDirContents('docs/kiro', 'docs/archive/summaries-and-notes');

console.log('--- Phase 4: Empty Directory Cleanup ---');
const foldersToRemove = [
  'docs/scheduling-ux',
  'docs/scheduling-ux-audit',
  'docs/tender-scheduling-project-management',
  'docs/client-dashboard',
  'docs/portal-dashboard',
  'docs/billing',
  'docs/write-off',
  'docs/finance',
  'docs/insights',
  'docs/july-2026',
  'docs/implementation-plans',
  'docs/ux-research',
  'docs/database-audit',
  'docs/final-audit',
  'docs/analysis',
  'docs/db',
  'docs/kiro'
];

foldersToRemove.forEach(deletePath);

console.log('--- Documentation Reorganization Complete ---');
