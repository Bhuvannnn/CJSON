/**
 * Error classes for CJSON
 */

/**
 * Base error class for all CJSON errors
 */
export class CJSONError extends Error {
  public readonly line: number;
  public readonly column: number;

  constructor(message: string, line: number, column: number) {
    super(message);
    this.name = 'CJSONError';
    this.line = line;
    this.column = column;
    Error.captureStackTrace(this, this.constructor);
  }

  toString(): string {
    return `${this.name}: ${this.message} (line ${this.line}, column ${this.column})`;
  }
}

/**
 * Parse error for syntax errors during parsing
 */
export class ParseError extends CJSONError {
  constructor(message: string, line: number, column: number) {
    super(message, line, column);
    this.name = 'ParseError';
  }
}

/**
 * Encode error for errors during encoding
 */
export class EncodeError extends CJSONError {
  constructor(message: string, line: number = 0, column: number = 0) {
    super(message, line, column);
    this.name = 'EncodeError';
  }
}

/**
 * Validation error for validation failures
 */
export class ValidationError extends CJSONError {
  constructor(message: string, line: number = 0, column: number = 0) {
    super(message, line, column);
    this.name = 'ValidationError';
  }
}

