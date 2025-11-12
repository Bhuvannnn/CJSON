/**
 * Parser type definitions for CJSON
 */

/**
 * Token types in CJSON
 */
export enum TokenType {
  KEY = 'KEY',
  VALUE = 'VALUE',
  COLON = 'COLON',
  COMMA = 'COMMA',
  DASH = 'DASH',
  BRACKET_OPEN = 'BRACKET_OPEN',
  BRACKET_CLOSE = 'BRACKET_CLOSE',
  INDENT = 'INDENT',
  COMMENT = 'COMMENT',
  NEWLINE = 'NEWLINE',
  EOF = 'EOF',
}

/**
 * Token interface representing a single token
 */
export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

/**
 * Parse context for tracking parsing state
 */
export interface ParseContext {
  tokens: Token[];
  currentIndex: number;
  currentIndent: number;
  line: number;
  column: number;
}

