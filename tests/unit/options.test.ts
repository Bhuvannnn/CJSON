/**
 * Tests for options handling
 */

import { describe, it, expect } from 'vitest';
import {
  mergeParseOptions,
  mergeEncodeOptions,
  mergeDecodeOptions,
  validateOptions,
  parseWithOptions,
  encodeWithOptions,
} from '../../src/core/core';
import { CJSONOptions } from '../../src/core/types';

describe('Options Handling', () => {
  describe('mergeParseOptions', () => {
    it('should merge with defaults', () => {
      const options = mergeParseOptions();
      expect(options.preserveComments).toBe(true);
      expect(options.allowTrailingCommas).toBe(false);
      expect(options.allowEmptyKeys).toBe(false);
    });

    it('should override defaults', () => {
      const options = mergeParseOptions({ preserveComments: false });
      expect(options.preserveComments).toBe(false);
      expect(options.allowTrailingCommas).toBe(false);
    });
  });

  describe('mergeEncodeOptions', () => {
    it('should merge with defaults', () => {
      const options = mergeEncodeOptions();
      expect(options.indent).toBe(2);
      expect(options.newline).toBe('\n');
      expect(options.quoteMode).toBe('auto');
      expect(options.compactArrays).toBe(true);
      expect(options.preserveComments).toBe(true);
    });

    it('should override defaults', () => {
      const options = mergeEncodeOptions({ indent: 4, quoteMode: 'always' });
      expect(options.indent).toBe(4);
      expect(options.quoteMode).toBe('always');
      expect(options.newline).toBe('\n'); // Should keep default
    });
  });

  describe('mergeDecodeOptions', () => {
    it('should merge with defaults', () => {
      const options = mergeDecodeOptions();
      expect(options.preserveComments).toBe(true);
      expect(options.coerceNumbers).toBe(true);
      expect(options.coerceBooleans).toBe(true);
    });

    it('should override defaults', () => {
      const options = mergeDecodeOptions({ coerceNumbers: false });
      expect(options.coerceNumbers).toBe(false);
      expect(options.coerceBooleans).toBe(true); // Should keep default
    });
  });

  describe('validateOptions', () => {
    it('should accept valid options', () => {
      const options: CJSONOptions = {
        parse: { preserveComments: true },
        encode: { indent: 2, quoteMode: 'auto' },
        decode: { coerceNumbers: true },
      };
      expect(() => validateOptions(options)).not.toThrow();
    });

    it('should reject invalid indent', () => {
      const options: CJSONOptions = {
        encode: { indent: -1 },
      };
      expect(() => validateOptions(options)).toThrow('indent must be a non-negative number');
    });

    it('should reject invalid newline', () => {
      const options: CJSONOptions = {
        encode: { newline: '\t' as any },
      };
      expect(() => validateOptions(options)).toThrow('newline must be');
    });

    it('should reject invalid quoteMode', () => {
      const options: CJSONOptions = {
        encode: { quoteMode: 'invalid' as any },
      };
      expect(() => validateOptions(options)).toThrow('quoteMode must be');
    });
  });

  describe('parseWithOptions', () => {
    it('should parse with options', () => {
      const result = parseWithOptions('name: Alice', { preserveComments: true });
      expect(result.type).toBe('object');
    });
  });

  describe('encodeWithOptions', () => {
    it('should encode with custom indent', () => {
      const result = encodeWithOptions({ user: { name: 'Alice' } }, { indent: 4 });
      expect(result).toContain('    name: Alice'); // 4 spaces for nested property
    });

    it('should encode with custom newline', () => {
      const result = encodeWithOptions({ name: 'Alice', age: 30 }, { newline: '\r\n' });
      expect(result).toContain('\r\n');
    });

    it('should encode with quoteMode always', () => {
      const result = encodeWithOptions('value', { quoteMode: 'always' });
      expect(result).toBe('"value"');
    });
  });
});

