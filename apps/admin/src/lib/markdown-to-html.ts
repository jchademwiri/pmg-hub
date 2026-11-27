function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatInline(raw: string): string {
  let out = escapeHtml(raw);
  // Links: [label](url)
  out = out.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+|\/[^\s)]*)\)/g,
    (_, label, url) => {
      const isExternal = /^https?:\/\//i.test(url);
      const attrs = isExternal
        ? `href="${url}" target="_blank" rel="noopener noreferrer nofollow"`
        : `href="${url}"`;
      return `<a ${attrs}>${label}</a>`;
    },
  );
  // Inline code: `code`
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Bold: **text** or __text__
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  // Italic: *text*
  out = out.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>');
  return out;
}

/**
 * Heuristic check for whether pasted plain text is Markdown that should be
 * converted to rich HTML inside the Tiptap editor.
 */
export function looksLikeMarkdown(text: string): boolean {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (!normalized) return false;
  const lines = normalized.split('\n');
  let signals = 0;

  if (lines.some((l) => /^#{1,3}\s+\S/.test(l))) signals += 2;
  if (lines.some((l) => /^\s*([-*]|\d+\.)\s+\S/.test(l))) signals += 1;
  if (lines.some((l) => /^>\s+\S/.test(l))) signals += 1;
  if (/\*\*[^*\n]+\*\*/.test(normalized)) signals += 1;
  if (/\[[^\]]+\]\((https?:\/\/|mailto:|\/)/.test(normalized)) signals += 2;
  if (lines.some((l) => /^(-{3,}|\*{3,})$/.test(l.trim()))) signals += 1;

  return signals >= 2;
}

/**
 * Converts common Markdown syntax (headings, lists, checklists, blockquotes,
 * links, bold, italic, inline code, horizontal rules) into Tiptap-friendly HTML.
 */
export function markdownToHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const html: string[] = [];

  let inUl = false;
  let inOl = false;
  let inQuote = false;
  let paragraphLines: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return;
    html.push(`<p>${formatInline(paragraphLines.join(' '))}</p>`);
    paragraphLines = [];
  };

  const closeLists = () => {
    if (inUl) {
      html.push('</ul>');
      inUl = false;
    }
    if (inOl) {
      html.push('</ol>');
      inOl = false;
    }
  };

  const closeQuote = () => {
    if (inQuote) {
      html.push('</blockquote>');
      inQuote = false;
    }
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    if (!trimmed) {
      flushParagraph();
      closeLists();
      closeQuote();
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flushParagraph();
      closeLists();
      closeQuote();
      html.push('<hr />');
      continue;
    }

    // Headings (# / ## -> h2, ###+ -> h3 to match Tiptap levels [2, 3])
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      closeLists();
      closeQuote();
      const level = headingMatch[1].length <= 2 ? 2 : 3;
      html.push(`<h${level}>${formatInline(headingMatch[2].trim())}</h${level}>`);
      continue;
    }

    // Blockquote
    const quoteMatch = trimmed.match(/^>\s?(.*)$/);
    if (quoteMatch) {
      flushParagraph();
      closeLists();
      if (!inQuote) {
        html.push('<blockquote>');
        inQuote = true;
      }
      html.push(`<p>${formatInline(quoteMatch[1].trim())}</p>`);
      continue;
    } else {
      closeQuote();
    }

    // Markdown table separator row (skip) or pipe row (render as bullet item)
    if (/^\|?[\s:-]+\|[\s|:-]+$/.test(trimmed)) {
      continue;
    }
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const cells = trimmed
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim())
        .filter(Boolean);
      if (cells.length > 0) {
        flushParagraph();
        if (inOl) {
          html.push('</ol>');
          inOl = false;
        }
        if (!inUl) {
          html.push('<ul>');
          inUl = true;
        }
        html.push(`<li>${cells.map((c) => formatInline(c)).join(' — ')}</li>`);
        continue;
      }
    }

    // Unordered list or task checklist (- [ ] / - [x] / - / *)
    const ulMatch = rawLine.match(/^\s*[-*]\s+(?:\[([ xX])\]\s+)?(.+)$/);
    if (ulMatch) {
      flushParagraph();
      if (inOl) {
        html.push('</ol>');
        inOl = false;
      }
      if (!inUl) {
        html.push('<ul>');
        inUl = true;
      }
      html.push(`<li>${formatInline(ulMatch[2].trim())}</li>`);
      continue;
    }

    // Ordered list (1. item)
    const olMatch = rawLine.match(/^\s*\d+\.\s+(.+)$/);
    if (olMatch) {
      flushParagraph();
      if (inUl) {
        html.push('</ul>');
        inUl = false;
      }
      if (!inOl) {
        html.push('<ol>');
        inOl = true;
      }
      html.push(`<li>${formatInline(olMatch[1].trim())}</li>`);
      continue;
    }

    closeLists();
    paragraphLines.push(trimmed);
  }

  flushParagraph();
  closeLists();
  closeQuote();

  return html.join('');
}
