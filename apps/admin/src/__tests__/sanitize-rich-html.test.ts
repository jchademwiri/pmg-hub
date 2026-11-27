import { describe, it, expect } from 'vitest';
import { sanitizeRichContent } from '../lib/sanitize-rich-html';

describe('sanitizeRichContent', () => {
  it('preserves allowed Tiptap formatting tags', () => {
    const input =
      '<h2>Overview</h2><p><strong>B-BBEE</strong> <em>affidavit</em></p><ul><li>Item 1</li></ul><hr /><br />';
    expect(sanitizeRichContent(input)).toBe(
      '<h2>Overview</h2><p><strong>B-BBEE</strong> <em>affidavit</em></p><ul><li>Item 1</li></ul><hr /><br />',
    );
  });

  it('strips script, style, iframe, and event handler attributes', () => {
    const input =
      '<p onclick="alert(1)">Safe</p><script>alert("xss")</script><style>body{display:none}</style><iframe src="https://evil.com"></iframe>';
    expect(sanitizeRichContent(input)).toBe('<p>Safe</p>');
  });

  it('enforces safe link schemes and external rel/target attributes', () => {
    const input =
      '<a href="https://example.com">Ext</a> <a href="/onboard">Int</a> <a href="javascript:alert(1)">Bad</a> <a href="//evil.com">ProtoRel</a>';
    expect(sanitizeRichContent(input)).toBe(
      '<a href="https://example.com" target="_blank" rel="noopener noreferrer nofollow">Ext</a> <a href="/onboard">Int</a> <a>Bad</a> <a>ProtoRel</a>',
    );
  });

  it('allows only safe text-align styles on p, h2, h3', () => {
    const input =
      '<p style="text-align: center; color: red">Centered</p><h2 style="background: url(x)">Heading</h2>';
    expect(sanitizeRichContent(input)).toBe(
      '<p style="text-align:center">Centered</p><h2>Heading</h2>',
    );
  });

  it('returns empty string for blank input', () => {
    expect(sanitizeRichContent('   ')).toBe('');
  });
});
