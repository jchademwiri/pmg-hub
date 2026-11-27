import { Parser } from 'htmlparser2';

const ALLOWED_TAGS = new Set([
  'h2',
  'h3',
  'p',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'mark',
  'code',
  'pre',
  'ul',
  'ol',
  'li',
  'blockquote',
  'a',
  'br',
  'hr',
]);

const VOID_TAGS = new Set(['br', 'hr']);

const DISCARD_CONTENT_TAGS = new Set([
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'noscript',
  'template',
  'svg',
  'math',
]);

const TEXT_ALIGN_TAGS = new Set(['p', 'h2', 'h3']);
const SAFE_ALIGN_RE = /(?:^|;)\s*text-align\s*:\s*(left|center|right|justify)\s*(?:;|$)/i;

function escapeHtmlText(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function sanitizeHref(rawHref: string | undefined): string | null {
  if (!rawHref) return null;
  // Strip ASCII control characters and surrounding whitespace to block obfuscated schemes
  const cleaned = rawHref.replace(/[\u0000-\u001F\u007F]+/g, '').trim();
  if (!cleaned) return null;
  // Reject protocol-relative URLs (//evil.com)
  if (cleaned.startsWith('//')) return null;
  // Allow http:, https:, mailto:, root-relative /path, or anchor #id
  if (/^(https?:\/\/|mailto:|\/|#)/i.test(cleaned)) {
    return cleaned;
  }
  return null;
}

/**
 * Pure-ESM strict allowlist HTML sanitizer for Tiptap rich content.
 * Uses htmlparser2 directly (ESM-native) to avoid sanitize-html's CJS/ESM
 * ERR_REQUIRE_ESM crash on Vercel Node runtimes.
 */
export function sanitizeRichContent(rawHtml: string): string {
  const trimmed = rawHtml.trim();
  if (!trimmed) return '';

  const output: string[] = [];
  let discardDepth = 0;

  const parser = new Parser(
    {
      onopentag(name, attribs) {
        const tag = name.toLowerCase();
        if (DISCARD_CONTENT_TAGS.has(tag)) {
          discardDepth += 1;
          return;
        }
        if (discardDepth > 0 || !ALLOWED_TAGS.has(tag)) {
          return;
        }

        const serializedAttrs: string[] = [];

        if (tag === 'a') {
          const safeHref = sanitizeHref(attribs.href);
          if (safeHref) {
            serializedAttrs.push(`href="${escapeHtmlAttr(safeHref)}"`);
            if (/^https?:\/\//i.test(safeHref)) {
              serializedAttrs.push('target="_blank"');
              serializedAttrs.push('rel="noopener noreferrer nofollow"');
            }
          }
        } else if (TEXT_ALIGN_TAGS.has(tag) && attribs.style) {
          const match = attribs.style.match(SAFE_ALIGN_RE);
          if (match?.[1]) {
            serializedAttrs.push(`style="text-align:${match[1].toLowerCase()}"`);
          }
        }

        const attrStr = serializedAttrs.length > 0 ? ` ${serializedAttrs.join(' ')}` : '';
        if (VOID_TAGS.has(tag)) {
          output.push(`<${tag}${attrStr} />`);
        } else {
          output.push(`<${tag}${attrStr}>`);
        }
      },
      ontext(text) {
        if (discardDepth > 0) return;
        output.push(escapeHtmlText(text));
      },
      onclosetag(name) {
        const tag = name.toLowerCase();
        if (DISCARD_CONTENT_TAGS.has(tag)) {
          discardDepth = Math.max(0, discardDepth - 1);
          return;
        }
        if (discardDepth > 0 || !ALLOWED_TAGS.has(tag) || VOID_TAGS.has(tag)) {
          return;
        }
        output.push(`</${tag}>`);
      },
    },
    { decodeEntities: true, lowerCaseTags: true, lowerCaseAttributeNames: true },
  );

  parser.write(trimmed);
  parser.end();

  return output.join('').trim();
}
