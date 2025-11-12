/**
 * Tokenizer for CJSON
 * Converts input string into tokens
 */

import { Token, TokenType } from './types';
import { ParseError } from '../errors/errors';

/**
 * Tokenizes a CJSON input string into an array of tokens
 * @param input - The input string to tokenize
 * @returns Array of tokens
 */
export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let line = 1;
  let column = 1;
  let i = 0;

  // Helper to create a token
  const createToken = (type: TokenType, value: string, tokenLine: number, tokenColumn: number): Token => {
    return { type, value, line: tokenLine, column: tokenColumn };
  };

  // Helper to peek at next character without advancing
  const peek = (offset: number = 0): string | null => {
    if (i + offset >= input.length) return null;
    return input[i + offset];
  };

  // Helper to advance and update position
  const advance = (): string | null => {
    if (i >= input.length) return null;
    const char = input[i];
    i++;
    if (char === '\n') {
      line++;
      column = 1;
    } else {
      column++;
    }
    return char;
  };

  // Skip whitespace (but track indentation)
  const skipWhitespace = (): number => {
    let indentLevel = 0;
    let startColumn = column;
    
    while (i < input.length) {
      const char = input[i];
      if (char === ' ' || char === '\t') {
        if (char === ' ') {
          indentLevel++;
        } else {
          // Treat tab as 2 spaces for consistency
          indentLevel += 2;
        }
        advance();
      } else if (char === '\n') {
        // Newline resets indentation tracking
        advance();
        return 0;
      } else {
        break;
      }
    }
    
    // Only create INDENT token if there's actual indentation
    if (indentLevel > 0) {
      tokens.push(createToken(TokenType.INDENT, ' '.repeat(indentLevel), line, startColumn));
    }
    
    return indentLevel;
  };

  // Read a quoted string
  const readQuotedString = (): string => {
    const startLine = line;
    const startColumn = column;
    const quote = advance(); // Consume opening quote
    let value = '';
    let escaped = false;

    while (i < input.length) {
      const char = advance();
      if (char === null) {
        throw new ParseError('Unterminated string', startLine, startColumn);
      }

      if (escaped) {
        if (char === 'n') {
          value += '\n';
        } else if (char === 't') {
          value += '\t';
        } else if (char === 'r') {
          value += '\r';
        } else if (char === '\\') {
          value += '\\';
        } else if (char === '"') {
          value += '"';
        } else {
          value += char;
        }
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        return value;
      } else {
        value += char;
      }
    }

    throw new ParseError('Unterminated string', startLine, startColumn);
  };

  // Read an unquoted value (key or value)
  const readUnquotedValue = (): string => {
    let value = '';
    
    while (i < input.length) {
      const char = peek();
      if (char === null) break;
      
      // Stop at special characters
      if (char === ':' || char === ',' || char === '[' || char === ']' || 
          char === '#' || char === '\n' || char === ' ' || char === '\t' || char === '-') {
        break;
      }
      
      value += advance()!;
    }
    
    return value.trim();
  };

  // Main tokenization loop
  while (i < input.length) {
    const char = peek();
    if (char === null) break;

    // Skip whitespace and track indentation
    if (char === ' ' || char === '\t') {
      skipWhitespace();
      continue;
    }

    // Handle newline
    if (char === '\n') {
      const newlineColumn = column;
      advance();
      tokens.push(createToken(TokenType.NEWLINE, '\n', line - 1, newlineColumn));
      continue;
    }

    // Handle colon
    if (char === ':') {
      const colonColumn = column;
      advance();
      tokens.push(createToken(TokenType.COLON, ':', line, colonColumn));
      continue;
    }

    // Handle comma
    if (char === ',') {
      const commaColumn = column;
      advance();
      tokens.push(createToken(TokenType.COMMA, ',', line, commaColumn));
      continue;
    }

    // Handle dash (for array items)
    if (char === '-') {
      const dashColumn = column;
      advance();
      // Skip whitespace after dash
      skipWhitespace();
      tokens.push(createToken(TokenType.DASH, '-', line, dashColumn));
      continue;
    }

    // Handle opening bracket
    if (char === '[') {
      const bracketColumn = column;
      advance();
      tokens.push(createToken(TokenType.BRACKET_OPEN, '[', line, bracketColumn));
      continue;
    }

    // Handle closing bracket
    if (char === ']') {
      const bracketColumn = column;
      advance();
      tokens.push(createToken(TokenType.BRACKET_CLOSE, ']', line, bracketColumn));
      continue;
    }

    // Handle comment
    if (char === '#') {
      const commentColumn = column;
      let comment = '';
      advance(); // Consume #
      
      while (i < input.length) {
        const nextChar = peek();
        if (nextChar === null || nextChar === '\n') {
          break;
        }
        comment += advance()!;
      }
      
      tokens.push(createToken(TokenType.COMMENT, comment, line, commentColumn));
      continue;
    }

    // Handle quoted string
    if (char === '"' || char === "'") {
      const stringColumn = column;
      const value = readQuotedString();
      tokens.push(createToken(TokenType.VALUE, value, line, stringColumn));
      continue;
    }

    // Handle unquoted value (could be key or value)
    const valueStartColumn = column;
    const value = readUnquotedValue();
    
    if (value.length > 0) {
      // Determine if this is a KEY or VALUE
      // If next non-whitespace token is COLON, it's a KEY
      let j = i;
      let foundColon = false;
      
      // Skip whitespace
      while (j < input.length && (input[j] === ' ' || input[j] === '\t')) {
        j++;
      }
      
      if (j < input.length && input[j] === ':') {
        tokens.push(createToken(TokenType.KEY, value, line, valueStartColumn));
      } else {
        tokens.push(createToken(TokenType.VALUE, value, line, valueStartColumn));
      }
    }
  }

  // Add EOF token
  tokens.push(createToken(TokenType.EOF, '', line, column));

  return tokens;
}

