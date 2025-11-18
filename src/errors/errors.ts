/**
 * Error classes for CJSON
 */

/**
 * Error codes for different error types
 */
export enum ErrorCode {
  // Parse errors
  UNEXPECTED_TOKEN = 'UNEXPECTED_TOKEN',
  UNEXPECTED_EOF = 'UNEXPECTED_EOF',
  MISSING_COLON = 'MISSING_COLON',
  MISSING_KEY = 'MISSING_KEY',
  INVALID_SYNTAX = 'INVALID_SYNTAX',
  UNTERMINATED_STRING = 'UNTERMINATED_STRING',
  INVALID_NUMBER = 'INVALID_NUMBER',
  EMPTY_INPUT = 'EMPTY_INPUT',
  
  // Encode errors
  UNSUPPORTED_TYPE = 'UNSUPPORTED_TYPE',
  CIRCULAR_REFERENCE = 'CIRCULAR_REFERENCE',
  INVALID_VALUE = 'INVALID_VALUE',
  
  // Validation errors
  MISSING_REQUIRED_PROPERTY = 'MISSING_REQUIRED_PROPERTY',
  TYPE_MISMATCH = 'TYPE_MISMATCH',
  NON_UNIFORM_ARRAY = 'NON_UNIFORM_ARRAY',
  INVALID_STRUCTURE = 'INVALID_STRUCTURE',
}

/**
 * Base error class for all CJSON errors
 */
export class CJSONError extends Error {
  public readonly line: number;
  public readonly column: number;
  public readonly code: ErrorCode;
  public readonly expected?: string;
  public readonly actual?: string;
  public readonly suggestion?: string;

  constructor(
    message: string,
    line: number,
    column: number,
    code: ErrorCode,
    options?: {
      expected?: string;
      actual?: string;
      suggestion?: string;
    },
  ) {
    super(message);
    this.name = 'CJSONError';
    this.line = line;
    this.column = column;
    this.code = code;
    this.expected = options?.expected;
    this.actual = options?.actual;
    this.suggestion = options?.suggestion;
    Error.captureStackTrace(this, this.constructor);
  }

  toString(): string {
    let result = `${this.name} [${this.code}]: ${this.message}`;
    if (this.expected || this.actual) {
      result += ` (expected: ${this.expected || 'unknown'}, actual: ${this.actual || 'unknown'})`;
    }
    result += ` at line ${this.line}, column ${this.column}`;
    if (this.suggestion) {
      result += `\nSuggestion: ${this.suggestion}`;
    }
    return result;
  }
}

/**
 * Parse error for syntax errors during parsing
 */
export class ParseError extends CJSONError {
  constructor(
    message: string,
    line: number,
    column: number,
    code: ErrorCode = ErrorCode.INVALID_SYNTAX,
    options?: {
      expected?: string;
      actual?: string;
      suggestion?: string;
    },
  ) {
    super(message, line, column, code, options);
    this.name = 'ParseError';
  }
}

/**
 * Encode error for errors during encoding
 */
export class EncodeError extends CJSONError {
  constructor(
    message: string,
    line: number = 0,
    column: number = 0,
    code: ErrorCode = ErrorCode.UNSUPPORTED_TYPE,
    options?: {
      expected?: string;
      actual?: string;
      suggestion?: string;
    },
  ) {
    super(message, line, column, code, options);
    this.name = 'EncodeError';
  }
}

/**
 * Validation error for validation failures
 */
export class ValidationError extends CJSONError {
  constructor(
    message: string,
    line: number = 0,
    column: number = 0,
    code: ErrorCode = ErrorCode.INVALID_STRUCTURE,
    options?: {
      expected?: string;
      actual?: string;
      suggestion?: string;
    },
  ) {
    super(message, line, column, code, options);
    this.name = 'ValidationError';
  }
}

