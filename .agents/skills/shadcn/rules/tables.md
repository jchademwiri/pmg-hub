# Table Uniformity Guidelines

These guidelines define the specifications for rendering data and navigation tables across the pmg-hub project, ensuring a clean, spacious, and highly interactive user experience.

---

## 1. Structure and HTML Validity

- **Row-Level Interactivity**: If clicking a table row navigates the user, make the entire `<TableRow>` clickable (using `cursor-pointer hover:bg-muted/40 transition-colors border-b border-border` and a client-side navigation handler).
- **No Nested Anchor Tags**: Never nest `<a>` or Next.js `<Link>` tags inside a clickable `<TableRow>`. This is invalid HTML and causes hydration or event propagation bugs. Use a styled `<span>` with hover effects (e.g., `hover:underline cursor-pointer`) instead.
- **Header Buttons**: Sortable column headers should use a `<button>` wrapper styled with `group inline-flex items-center text-xs font-semibold hover:text-foreground`.

### Incorrect
```tsx
// ❌ WRONG: Nested Link inside a clickable table row creates invalid HTML structure
<TableRow onClick={() => router.push(`/billing/statements/${client.id}`)}>
  <TableCell>
    <Link href={`/billing/statements/${client.id}`}>
      {client.name}
    </Link>
  </TableCell>
</TableRow>
```

### Correct
```tsx
//   CORRECT: Click handler on TableRow, name styled as a link via span classes
<TableRow 
  className="cursor-pointer hover:bg-muted/40 transition-colors border-b border-border"
  onClick={() => router.push(`/billing/statements/${client.id}`)}
>
  <TableCell className="py-4 text-sm font-medium">
    <span className="hover:underline hover:text-primary">
      {client.name}
    </span>
  </TableCell>
</TableRow>
```

---

## 2. Spacing & Typography

- **Cell Spacing**: To maintain a premium, breathing layout, always add `py-4` padding to all `<TableCell>` and `<TableHead>` elements.
- **Font Sizes**: Default to `text-sm` for normal cell data. Use `text-xs` only when data density mandates highly compact layouts.
- **Tabular Data**: Financial amounts, quantities, and dates should always use the `tabular-nums` Tailwind utility for clean vertical alignment.

### Incorrect
```tsx
// ❌ WRONG: Tight spacing, incorrect sizes, and missing tabular numbers alignment
<TableHead>Amount</TableHead>
...
<TableCell className="text-xs text-right">
  {formatZAR(client.totalInvoiced)}
</TableCell>
```

### Correct
```tsx
//   CORRECT: Spacious py-4 padding, readable text-sm size, and tabular alignment for figures
<TableHead className="py-4 text-right">Amount</TableHead>
...
<TableCell className="py-4 text-sm font-medium text-right tabular-nums">
  {formatZAR(client.totalInvoiced)}
</TableCell>
```

---

## 3. Flat Lists vs. Cards

- **Flat Tables (Preferred for Main Dashboards)**: For main list screens, do not wrap the table in card borders and backgrounds. Present them flat on the page layout with clean horizontal divider borders (`border-b border-border`) between rows.
- **Card-Wrapped Tables**: Wrap tables in `<Card>` components only when they represent minor subsections or tabs inside a larger dashboard page.
