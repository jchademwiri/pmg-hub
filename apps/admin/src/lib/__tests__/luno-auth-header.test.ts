import { describe, it, expect } from 'vitest';
import { buildAuthHeader } from '../luno';

describe('buildAuthHeader', () => {
  it('encodes "id" and "secret" as "Basic aWQ6c2VjcmV0"', () => {
    expect(buildAuthHeader('id', 'secret')).toBe('Basic aWQ6c2VjcmV0');
  });

  it('encodes empty keyId correctly', () => {
    const result = buildAuthHeader('', 'secret');
    expect(result).toBe('Basic ' + Buffer.from(':secret').toString('base64'));
  });

  it('encodes empty keySecret correctly', () => {
    const result = buildAuthHeader('id', '');
    expect(result).toBe('Basic ' + Buffer.from('id:').toString('base64'));
  });

  it('encodes both empty strings correctly', () => {
    const result = buildAuthHeader('', '');
    expect(result).toBe('Basic ' + Buffer.from(':').toString('base64'));
  });

  it('encodes keyId containing a colon correctly', () => {
    const result = buildAuthHeader('key:id', 'secret');
    expect(result).toBe('Basic ' + Buffer.from('key:id:secret').toString('base64'));
  });

  it('encodes keySecret containing a colon correctly', () => {
    const result = buildAuthHeader('id', 'sec:ret');
    expect(result).toBe('Basic ' + Buffer.from('id:sec:ret').toString('base64'));
  });

  it('encodes strings where both components contain colons correctly', () => {
    const result = buildAuthHeader('a:b', 'c:d');
    expect(result).toBe('Basic ' + Buffer.from('a:b:c:d').toString('base64'));
  });

  it('always returns a string starting with "Basic "', () => {
    expect(buildAuthHeader('any', 'value')).toMatch(/^Basic /);
  });
});
