const fs = require('fs');
const path = require('path');

const targets = [
  'docs/business-profiles/PMG_Business_Plan_Final.docx',
  'docs/archive/db query updates.zip',
  'docs/kiro',
  'docs/fix.md',
  'docs/notes.md',
  'docs/today-summary-2026-06-18.md',
  'docs/research/accounting-system/buffy',
  'docs/research/accounting-system/chatgpt',
  'docs/research/accounting-system/claude',
  'docs/research/accounting-system/codex',
  'docs/research/accounting-system/gemini-cli',
  'docs/research/accounting-system/ai-prompts',
  'docs/research/accounting-system/PMG-Accounting-Research-Gap-Analysis.docx'
];

for (const target of targets) {
  const full = path.resolve(target);
  if (fs.existsSync(full)) {
    fs.rmSync(full, { recursive: true, force: true });
    console.log('Deleted:', target);
  }
}
