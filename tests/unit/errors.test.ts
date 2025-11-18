/**
 * Tests for enhanced error handling
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../../src/parser/parser';
import { encode } from '../../src/encoder/encoder';
import { ParseError, EncodeError, ErrorCode } from '../../src/errors/errors';

describe('Enhanced Error Handling', () => {
  describe('ParseError', () => {
    it('should include error code', () => {
      try {
        parse('');
      } catch (error) {
        expect(error).toBeInstanceOf(ParseError);
        if (error instanceof ParseError) {
          expect(error.code).toBe(ErrorCode.EMPTY_INPUT);
        }
      }
    });

    it('should include expected and actual values', () => {
      try {
        parse('name:: value');
      } catch (error) {
        expect(error).toBeInstanceOf(ParseError);
        if (error instanceof ParseError) {
          expect(error.code).toBeDefined();
        }
      }
    });

    it('should include suggestions', () => {
      try {
        parse('');
      } catch (error) {
        expect(error).toBeInstanceOf(ParseError);
        if (error instanceof ParseError) {
          expect(error.suggestion).toBeDefined();
          expect(error.suggestion).toContain('Add at least one property');
        }
      }
    });

    it('should format error message with context', () => {
      try {
        parse('');
      } catch (error) {
        expect(error).toBeInstanceOf(ParseError);
        if (error instanceof ParseError) {
          const message = error.toString();
          expect(message).toContain('ParseError');
          expect(message).toContain('EMPTY_INPUT');
          expect(message).toContain('line');
          expect(message).toContain('column');
        }
      }
    });
  });

  describe('EncodeError', () => {
    it('should include error code for unsupported types', () => {
      try {
        encode(undefined);
      } catch (error) {
        expect(error).toBeInstanceOf(EncodeError);
        if (error instanceof EncodeError) {
          expect(error.code).toBe(ErrorCode.INVALID_VALUE);
          expect(error.expected).toBeDefined();
          expect(error.suggestion).toBeDefined();
        }
      }
    });

    it('should include suggestions for encoding errors', () => {
      try {
        encode(Symbol('test'));
      } catch (error) {
        expect(error).toBeInstanceOf(EncodeError);
        if (error instanceof EncodeError) {
          expect(error.code).toBe(ErrorCode.UNSUPPORTED_TYPE);
          expect(error.suggestion).toContain('Convert');
        }
      }
    });
  });

  describe('ErrorCode enum', () => {
    it('should have all expected error codes', () => {
      expect(ErrorCode.UNEXPECTED_TOKEN).toBe('UNEXPECTED_TOKEN');
      expect(ErrorCode.UNEXPECTED_EOF).toBe('UNEXPECTED_EOF');
      expect(ErrorCode.MISSING_COLON).toBe('MISSING_COLON');
      expect(ErrorCode.MISSING_KEY).toBe('MISSING_KEY');
      expect(ErrorCode.INVALID_SYNTAX).toBe('INVALID_SYNTAX');
      expect(ErrorCode.UNSUPPORTED_TYPE).toBe('UNSUPPORTED_TYPE');
      expect(ErrorCode.INVALID_VALUE).toBe('INVALID_VALUE');
    });
  });
});

