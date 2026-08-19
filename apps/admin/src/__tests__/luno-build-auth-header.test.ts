/**
 * Unit Tests for buildAuthHeader
 *
 * Validates: Requirements 1.4
 *
 * Tests that `buildAuthHeader` correctly encodes Luno credentials as an
 * HTTP Basic Auth header value: "Basic <base64(keyId:keySecret)>"
 */

import { describe, it, expect } from 'vitest';
import { buildAuthHeader } from '@/lib/luno';

describe('buildAuthHeader', () => {
  it('encodes typical id and secret — buildAuthHeader("id", "secret") → "Basic aWQ6c2VjcmV0"', () => {
    // Buffer.from("id:secret").toString("base64") === "aWQ6c2VjcmV0"
    expect(buildAuthHeader('id', 'secret')).toBe('Basic aWQ6c2VjcmV0');
  });

  it('always prefixes the result with "Basic "', () => {
    const result = buildAuthHeader('anyId', 'anySecret');
    expect(result.startsWith('Basic ')).toBe(true);
  });

  it('produces the correct base64 segment for the provided credentials', () => {
    const keyId = 'myKeyId';
    const keySecret = 'myKeySecret';
    const expected = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    expect(buildAuthHeader(keyId, keySecret)).toBe(expected);
  });

  it('encodes empty keyId correctly — empty string before the colon', () => {
    // Buffer.from(":secret").toString("base64") === "OnNlY3JldA=="
    const expected = 'Basic ' + Buffer.from(':secret').toString('base64');
    expect(buildAuthHeader('', 'secret')).toBe(expected);
  });

  it('encodes empty keySecret correctly — empty string after the colon', () => {
    // Buffer.from("id:").toString("base64") === "aWQ6"
    const expected = 'Basic ' + Buffer.from('id:').toString('base64');
    expect(buildAuthHeader('id', '')).toBe(expected);
  });

  it('encodes both empty components correctly — just a colon', () => {
    // Buffer.from(":").toString("base64") === "Og=="
    const expected = 'Basic ' + Buffer.from(':').toString('base64');
    expect(buildAuthHeader('', '')).toBe(expected);
  });

  it('encodes keyId containing a colon — colon is not treated as a separator', () => {
    // keyId = "key:with:colons", keySecret = "secret"
    // Buffer.from("key:with:colons:secret").toString("base64")
    const keyId = 'key:with:colons';
    const keySecret = 'secret';
    const expected = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    expect(buildAuthHeader(keyId, keySecret)).toBe(expected);
  });

  it('encodes keySecret containing a colon', () => {
    const keyId = 'myid';
    const keySecret = 'sec:ret:value';
    const expected = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    expect(buildAuthHeader(keyId, keySecret)).toBe(expected);
  });

  it('encodes strings with special characters correctly', () => {
    const keyId = 'key!@#$%^&*()';
    const keySecret = 'secret/+=';
    const expected = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    expect(buildAuthHeader(keyId, keySecret)).toBe(expected);
  });

  it('produces a deterministic result — same inputs always produce same output', () => {
    const result1 = buildAuthHeader('testId', 'testSecret');
    const result2 = buildAuthHeader('testId', 'testSecret');
    expect(result1).toBe(result2);
  });

  it('produces different output when either argument changes', () => {
    const base = buildAuthHeader('id', 'secret');
    expect(buildAuthHeader('OTHER', 'secret')).not.toBe(base);
    expect(buildAuthHeader('id', 'OTHER')).not.toBe(base);
  });
});
