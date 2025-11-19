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

  // Helper to skip header decorations (e.g., [3]{name,age}) when checking for colon
  const skipKeyDecorators = (position: number): number => {
    let idx = position;
    while (idx < input.length) {
      if (input[idx] === '[') {
        const closing = input.indexOf(']', idx + 1);
        if (closing === -1) {
          return idx;
        }
        idx = closing + 1;
      } else if (input[idx] === '{') {
        const closing = input.indexOf('}', idx + 1);
        if (closing === -1) {
          return idx;
        }
        idx = closing + 1;
      } else {
        break;
      }
      while (idx < input.length && (input[idx] === ' ' || input[idx] === '\t')) {
        idx++;
      }
    }
    return idx;
  };

  // Read an unquoted value (key or value)
  const readUnquotedValue = (): string => {
    let value = '';
    
    while (i < input.length) {
      const char = peek();
      if (char === null) break;
      
      if (
        char === ':' ||
        char === ',' ||
        char === '[' ||
        char === ']' ||
        char === '#' ||
        char === '\n' ||
        char === ' ' ||
        char === '\t'
      ) {
        break;
      }
      
      value += advance()!;
    }
    
    return value;
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

    // Handle dash (for array items or negative numbers)
    if (char === '-') {
      // Check if this is a negative number (dash followed by digit)
      // Look ahead to see if next non-whitespace char is a digit
      let j = i + 1;
      while (j < input.length && (input[j] === ' ' || input[j] === '\t')) {
        j++;
      }
      
      // If followed by a digit, it's part of a number (not an array dash)
      if (j < input.length && /[0-9]/.test(input[j])) {
        // This is a negative number - let readUnquotedValue handle it
        // Don't create a DASH token, just continue to value parsing
      } else {
        // This is an array item dash
        const dashColumn = column;
        advance();
        tokens.push(createToken(TokenType.DASH, '-', line, dashColumn));
        // Skip spaces or tabs after dash without emitting INDENT tokens
        while (true) {
          const nextChar = peek();
          if (nextChar === ' ' || nextChar === '\t') {
            advance();
            continue;
          }
          break;
        }
        continue;
      }
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
      
      j = skipKeyDecorators(j);
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

