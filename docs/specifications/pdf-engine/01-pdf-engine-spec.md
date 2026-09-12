# PMG Hub PDF Generation Engine Specification

## 1. Executive Summary & Architecture

The PMG Hub PDF Generation Engine produces client-facing financial and operational documents across Playhouse Media Group, TenderEdge Solutions, and Apex Web Solutions.

### Architectural Migration
- **Legacy Engine**: Coordinate-based imperative `jspdf` (millimeter math, manual text wrapping, ad-hoc pagination).
- **Modern Engine**: Component-based declarative JSX rendering with `pdfcn`, using **Takumi (`takumi-pdf`)** WebAssembly compiler for Next.js App Router and edge/serverless compatibility.

```
┌───────────────────────────────────────────────────────────┐
│              Client Application / API Route               │
│  (GET /api/billing/pdf/[type]/[id] / UniversalEmailDialog)│
└─────────────────────────────┬─────────────────────────────┘
                              │ calls
┌─────────────────────────────▼─────────────────────────────┐
│                 @pmg/billing / @pmg/accounting            │
│            generateBillingPdf() / generateAccountingPdf() │
└─────────────────────────────┬─────────────────────────────┘
                              │ renders
┌─────────────────────────────▼─────────────────────────────┐
│                 Declarative PDF Components                │
│    <InvoicePdfDocument /> | <QuotePdfDocument /> | ...    │
│    • PdfcnThemeProvider (PMG / TES / AWS Theme)           │
│    • Primitives (<Document>, <Page>, <View>, <Text>)      │
│    • Blocks (<Table>, <KeyValue>, <Badge>, <KeepTogether>)│
└─────────────────────────────┬─────────────────────────────┘
                              │ compiles
┌─────────────────────────────▼─────────────────────────────┐
│                 Takumi WASM Engine                        │
│                 (takumi-pdf/next)                         │
└─────────────────────────────┬─────────────────────────────┘
                              │ emits
┌─────────────────────────────▼─────────────────────────────┐
│                   Uint8Array (PDF Buffer)                 │
└───────────────────────────────────────────────────────────┘
```

---

## 2. Design System & Visual Tokens (ui-ux-pro-max & frontend-mastery)

All documents adhere to high-end typographical and accessibility standards.

### 2.1 Geometry & Grid
- **Page Size**: ISO A4 (`210mm × 297mm` / `595.28pt × 841.89pt`).
- **Margins**: `36pt` (approx 12.7mm / 0.5 in) minimum outer margins with `48pt` on top/bottom for headers and footers.
- **Base Grid**: 4pt rhythmic spacing system.

### 2.2 Typography Scale
- **Ratio**: Major Third (`1.25` typographic progression).
- **Font Families**:
  - Primary / Body: Clean sans-serif (`Helvetica`, `Inter`, `system-ui`).
  - Numbers / Financial Figures: Tabular Numerals (`font-variant-numeric: tabular-nums`).
  - Headings / Formal Documents: Optional Serif accent (`Times-Roman` / `Merriweather`).
- **Font Sizes & Leading**:
  - Document Title (H1): `22pt` (line-height: `1.2`)
  - Section Headings (H2): `14pt` (line-height: `1.25`, font-weight: `700`)
  - Subsections / Table Headers (H3): `10pt` (line-height: `1.3`, font-weight: `700`, uppercase, letter-spacing: `0.5pt`)
  - Body Text: `9pt` (line-height: `1.45`, color: `#18181b`)
  - Captions, Terms, Notes: `7.5pt` (line-height: `1.4`, color: `#52525b`)
  - Page Footers & Micro-metadata: `6.5pt` (color: `#71717a`)

### 2.3 Color Tokens & Multi-Brand Palettes (WCAG AA Compliance)
Contrast ratio must strictly exceed **4.5:1** against backgrounds. Pure black (`#000000`) is prohibited.

#### Division Palettes:
1. **Playhouse Media Group (Default / Corporate)**:
   - Primary: `#1d4ed8` (Royal Blue)
   - Accent: `#3b82f6`
   - Foreground: `#0f172a` (Deep Slate)
   - Muted Foreground: `#475569`
   - Surface / Table Header: `#f8fafc`
   - Border: `#e2e8f0`

2. **TenderEdge Solutions (TES / Government & Tendering)**:
   - Primary: `#047857` (Deep Emerald)
   - Accent: `#059669`
   - Foreground: `#18181b` (Deep Zinc)
   - Muted Foreground: `#52525b`
   - Surface / Table Header: `#f4fdf8`
   - Border: `#d1fae5`

3. **Apex Web Solutions (AWS / Tech & Digital)**:
   - Primary: `#0284c7` (Sky / Cyan)
   - Accent: `#0ea5e9`
   - Foreground: `#18181b`
   - Muted Foreground: `#52525b`
   - Surface / Table Header: `#f0f9ff`
   - Border: `#e0f2fe`

---

## 3. Document Specifications

### 3.1 Tax Invoice (`InvoicePdfDocument`)
- **Header**: Organization logo, legal name, "A division of...", company registration, VAT number, contact details.
- **Badge**: Status pill (`PAID` [Emerald], `OVERDUE` [Red], `ISSUED` [Blue], `DRAFT` [Zinc]).
- **Metadata Card**: Invoice Number, Tax Invoice label, Issue Date, Due Date, Sales Rep.
- **Bill To**: Client Legal Name, Contact Person, Email, Phone, Physical Address, VAT Number.
- **Line Items Table**:
  - Columns: `#`, `Description / Item`, `Qty`, `Unit Price (excl)`, `VAT %`, `Amount (ZAR)`.
  - Column formatting: Quantities centered, Amounts right-aligned with tabular figures.
- **Summary Section**:
  - Subtotal (excl VAT)
  - VAT (15% standard rate, or 0% exempt)
  - Total Invoice Amount
  - Total Paid to Date
  - **Balance Due** (highlighted container)
- **Footer**: Bank details (Bank, Account Name, Account Number, Branch Code, SWIFT), terms of service, payment reference notice, and repeating page numbers (`Page X of Y`).

### 3.2 Quotation (`QuotePdfDocument`)
- Identical visual structure to Invoice.
- Quotation Number, Validity Expiry Date (e.g. 30 days).
- Acceptance Signature Block (`Accepted By`, `Signature`, `Date`).

### 3.3 Client Statement (`StatementPdfDocument`)
- Activity vs Outstanding views.
- Opening Balance at period start.
- Running chronological transaction ledger (`Date`, `Reference`, `Description`, `Debit (+)`, `Credit (-)`, `Running Balance`).
- **5-Tier Ageing Analysis Bucket Grid**:
  - Columns: `Current`, `1–14 Days`, `15–30 Days`, `31–60 Days`, `61+ Days`, `Total Outstanding`.
  - Color-coded severity based on overdue thresholds.

### 3.4 Payment Receipt (`ReceiptPdfDocument`)
- Receipt Number, Payment Date, Payment Method (EFT, PayFast, Card).
- Allocated Invoices breakdown.
- Remaining account credit balance if applicable.

### 3.5 Financial & Accounting Reports (`@pmg/accounting`)
- Balance Sheet, Profit & Loss, Trial Balance, Cash Flow Statement, General Ledger.
- Automatic page-break avoidance using `<KeepTogether>` on financial statement note groups and ledger account sections.

---

## 4. Performance & Reliability Standards

- **Cold-Start Render Latency**: < 300ms on Vercel Serverless Function.
- **Warm Render Latency**: < 50ms for standard 1–3 page documents.
- **Memory Footprint**: < 35MB WASM instantiation (vs 350MB+ Puppeteer).
- **Attachment Size Limit**: Stays strictly under 8MB to comply with email delivery limits (`assertEmailPdfSize`).
- **Determinism**: 100% identical byte output given the same input data and timestamp.
