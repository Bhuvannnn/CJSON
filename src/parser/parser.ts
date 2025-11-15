/**
 * Parser for CJSON
 * Converts tokens into AST
 */

import { Token, TokenType, ParseContext } from './types';
import { ASTNode, ObjectNode, ArrayNode, PrimitiveNode, NullNode } from '../ast/nodes';
import { ParseError } from '../errors/errors';
import { tokenize } from './tokenizer';

/**
 * Parses a CJSON input string into an AST
 * @param input - The input string to parse
 * @returns Root AST node
 */
export function parse(input: string): ASTNode {
  const tokens = tokenize(input);
  const context: ParseContext = {
    tokens,
    currentIndex: 0,
    currentIndent: 0,
    line: 1,
    column: 1,
  };

  // Skip leading whitespace and newlines
  skipWhitespace(context);

  if (isEOF(context)) {
    throw new ParseError('Empty input', 1, 1);
  }

  // Parse the root value (should be an object)
  return parseValue(context);
}

/**
 * Parses a value (object, array, or primitive)
 */
function parseValue(context: ParseContext): ASTNode {
  skipWhitespace(context);

  if (isEOF(context)) {
    throw new ParseError('Unexpected end of input', context.line, context.column);
  }

  const token = peek(context);
  if (!token) {
    throw new ParseError('Unexpected end of input', context.line, context.column);
  }

  // Check for array
  if (token.type === TokenType.BRACKET_OPEN) {
    return parseArray(context);
  }

  // Check for primitive value
  if (token.type === TokenType.VALUE) {
    return parsePrimitive(context);
  }

  // Check for dash (multi-line array item)
  if (token.type === TokenType.DASH) {
    return parseArrayItem(context);
  }

  // Check for object (starts with KEY)
  if (token.type === TokenType.KEY) {
    return parseObject(context);
  }

  throw new ParseError(
    `Unexpected token: ${token.type} (${token.value})`,
    token.line,
    token.column
  );
}

/**
 * Parses an object with a specified base indentation level
 */
function parseObjectWithIndent(context: ParseContext, baseIndent: number): ObjectNode {
  const properties = new Map<string, ASTNode>();
  const currentIndent = baseIndent;
  let startToken: Token | null = null;

  while (!isEOF(context)) {
    // Calculate indentation of the current line BEFORE skipping whitespace
    // This is critical - we need to see INDENT tokens before skipWhitespace consumes them
    let lineIndent = 0;
    let checkIndex = context.currentIndex;
    
    // Count INDENT tokens at current position (before skipWhitespace consumes them)
    // Skip past any NEWLINE tokens and count INDENT tokens after them
    while (checkIndex < context.tokens.length) {
      const t = context.tokens[checkIndex];
      if (t.type === TokenType.NEWLINE) {
        // Reset indent after newline and continue past it
        lineIndent = 0;
        checkIndex++;
      } else if (t.type === TokenType.INDENT) {
        lineIndent += t.value.length;
        checkIndex++;
      } else {
        break;
      }
    }
    
    // If we've moved to a less indented level, we're done with this object
    // Note: lineIndent === currentIndent means we're at the same level (continue parsing)
    if (lineIndent < currentIndent) {
      break;
    }

    // Now skip whitespace (this will consume INDENT tokens we just measured)
    skipWhitespace(context);
    
    const token = peek(context);
    if (!token || token.type === TokenType.EOF) {
      break;
    }
    
    // Use the lineIndent we calculated (before skipWhitespace)
    // We're at the right indentation level (lineIndent >= currentIndent)
    // This means we should parse this key as part of the current object

    // Parse key-value pair
    if (token.type === TokenType.KEY) {
      // Save the first token for line/column info
      if (!startToken) {
        startToken = token;
      }
      
      // We're at the right indentation level (lineIndent >= currentIndent)
      // This means we should parse this key as part of the current object

      const keyToken = consume(context, TokenType.KEY);
      if (!keyToken) break;

      const colonToken = consume(context, TokenType.COLON);
      if (!colonToken) {
        throw new ParseError('Expected colon after key', token.line, token.column);
      }

      skipWhitespace(context);

      // Skip comments
      while (peek(context)?.type === TokenType.COMMENT) {
        consume(context, TokenType.COMMENT);
        skipWhitespace(context);
      }

      // Check if value is on next line (nested object)
      const nextToken = peek(context);
      if (nextToken?.type === TokenType.NEWLINE) {
        // Consume newline
        consume(context, TokenType.NEWLINE);
        
        // Calculate indentation BEFORE skipping whitespace
        let afterNewlineIndent = 0;
        let checkIdx = context.currentIndex;
        while (checkIdx < context.tokens.length) {
          const t = context.tokens[checkIdx];
          if (t.type === TokenType.INDENT) {
            afterNewlineIndent += t.value.length;
            checkIdx++;
          } else {
            break;
          }
        }
        
        if (afterNewlineIndent > currentIndent) {
          // Nested object - check if next token is INDENT (which will be followed by KEY)
          // We've already calculated the indentation, so we know there should be INDENT tokens
          if (context.currentIndex < context.tokens.length && 
              context.tokens[context.currentIndex]?.type === TokenType.INDENT) {
            // Parse as nested object with explicit base indentation
            // The nested parser will handle skipping whitespace and parsing keys
            const nestedObject = parseObjectWithIndent(context, afterNewlineIndent);
            properties.set(keyToken.value, nestedObject);
          } else {
            // Empty nested object (just a colon with newline)
            properties.set(keyToken.value, {
              type: 'object',
              properties: new Map(),
              line: nextToken.line,
              column: nextToken.column,
            });
          }
        } else {
          // Empty nested object (just a colon with newline, no indentation)
          properties.set(keyToken.value, {
            type: 'object',
            properties: new Map(),
            line: nextToken.line,
            column: nextToken.column,
          });
        }
      } else {
        // Value is on same line
        // Check what type of value it is before parsing
        const valueToken = peek(context);
        let value: ASTNode;
        
        if (valueToken?.type === TokenType.VALUE) {
          // Parse primitive directly
          // consume will call skipWhitespace first, but we've already skipped whitespace
          // so it should just consume the VALUE token
          value = parsePrimitive(context);
        } else if (valueToken?.type === TokenType.BRACKET_OPEN) {
          // Parse array
          value = parseArray(context);
        } else {
          // Use parseValue for other cases (it will handle skipWhitespace)
          value = parseValue(context);
        }
        
        properties.set(keyToken.value, value);
        
        // After parsing a value, check what token comes next
        // consume in parsePrimitive calls skipWhitespace BEFORE consuming,
        // so after consuming the VALUE token, we should be positioned right after it
        // The next token should be NEWLINE (if there is one)
        // Check the token directly at currentIndex (peek does the same thing)
        const afterValueToken = context.currentIndex < context.tokens.length 
          ? context.tokens[context.currentIndex] 
          : null;
        if (afterValueToken?.type === TokenType.NEWLINE) {
          // Consume newline - the next iteration will calculate indentation
          context.currentIndex++; // Consume NEWLINE directly
          // Continue to next iteration - it will:
          // 1. Calculate indent (should see INDENT token before next KEY)
          // 2. Check if indent >= currentIndent
          // 3. If yes, parse the next key-value pair
          continue;
        } else if (afterValueToken?.type === TokenType.EOF) {
          // End of input, we're done
          break;
        }
        
        // If there's no newline immediately, there might be whitespace or comments
        // Skip whitespace (but this might consume a NEWLINE if there is one)
        skipWhitespace(context);
        const afterSkipToken = context.currentIndex < context.tokens.length 
          ? context.tokens[context.currentIndex] 
          : null;
        
        // Check for comments
        while (afterSkipToken?.type === TokenType.COMMENT) {
          consume(context, TokenType.COMMENT);
          skipWhitespace(context);
          const nextToken = peek(context);
          if (nextToken?.type === TokenType.NEWLINE) {
            consume(context, TokenType.NEWLINE);
            continue;
          } else if (nextToken?.type === TokenType.EOF) {
            break;
          }
        }
        
        // After skipping whitespace/comments, check for newline or EOF
        const finalToken = peek(context);
        if (finalToken?.type === TokenType.NEWLINE) {
          consume(context, TokenType.NEWLINE);
          continue;
        } else if (finalToken?.type === TokenType.EOF) {
          break;
        }
        // If there's no newline and no EOF, continue to next iteration
        // (might be another key at same level or end of object)
        continue;
      }
    } else if (token.type === TokenType.NEWLINE) {
      consume(context, TokenType.NEWLINE);
      // Continue to next iteration
      continue;
    } else {
      break;
    }
  }

  if (!startToken) {
    throw new ParseError('Expected object key', context.line, context.column);
  }

  return {
    type: 'object',
    properties,
    line: startToken.line,
    column: startToken.column,
  };
}

/**
 * Parses an object (public interface)
 */
function parseObject(context: ParseContext): ObjectNode {
  const baseIndent = getCurrentIndent(context);
  return parseObjectWithIndent(context, baseIndent);
}

/**
 * Parses an array
 */
function parseArray(context: ParseContext): ArrayNode {
  const startToken = consume(context, TokenType.BRACKET_OPEN);
  if (!startToken) {
    throw new ParseError('Expected [', context.line, context.column);
  }

  const items: ASTNode[] = [];
  let format: 'inline' | 'multiline' | 'compact' = 'inline';

  skipWhitespace(context);

  // Check if empty array
  if (peek(context)?.type === TokenType.BRACKET_CLOSE) {
    consume(context, TokenType.BRACKET_CLOSE);
    return {
      type: 'array',
      items: [],
      format: 'inline',
      line: startToken.line,
      column: startToken.column,
    };
  }

  // Parse inline array: [item1, item2, item3]
  while (!isEOF(context)) {
    skipWhitespace(context);

    if (peek(context)?.type === TokenType.BRACKET_CLOSE) {
      consume(context, TokenType.BRACKET_CLOSE);
      break;
    }

    const item = parseValue(context);
    items.push(item);

    skipWhitespace(context);

    if (peek(context)?.type === TokenType.COMMA) {
      consume(context, TokenType.COMMA);
      skipWhitespace(context);
    } else if (peek(context)?.type !== TokenType.BRACKET_CLOSE) {
      throw new ParseError(
        'Expected comma or closing bracket',
        peek(context)?.line || context.line,
        peek(context)?.column || context.column
      );
    }
  }

  return {
    type: 'array',
    items,
    format,
    line: startToken.line,
    column: startToken.column,
  };
}

/**
 * Parses an array item (for multi-line arrays with dash)
 */
function parseArrayItem(context: ParseContext): ASTNode {
  const dashToken = consume(context, TokenType.DASH);
  if (!dashToken) {
    throw new ParseError('Expected dash', context.line, context.column);
  }

  skipWhitespace(context);
  return parseValue(context);
}

/**
 * Parses a primitive value
 * May consume multiple VALUE tokens if they're on the same line (e.g., "New York")
 */
function parsePrimitive(context: ParseContext): PrimitiveNode | NullNode {
  const firstToken = consume(context, TokenType.VALUE);
  if (!firstToken) {
    throw new ParseError('Expected value', context.line, context.column);
  }

  // Combine multiple VALUE tokens on the same line (e.g., "New York" becomes two tokens)
  // The tokenizer splits "New York" into two VALUE tokens: "New" and "York"
  let value = firstToken.value;
  while (context.currentIndex < context.tokens.length) {
    const nextToken = context.tokens[context.currentIndex];
    // If next token is also a VALUE token, combine it (space-separated values on same line)
    // Skip any whitespace tokens (INDENT, NEWLINE) between VALUE tokens
    if (nextToken.type === TokenType.INDENT || nextToken.type === TokenType.NEWLINE) {
      // If we hit a newline, we're done (end of value)
      if (nextToken.type === TokenType.NEWLINE) {
        break;
      }
      // Skip INDENT tokens (shouldn't happen on same line, but be safe)
      context.currentIndex++;
      continue;
    } else if (nextToken.type === TokenType.VALUE) {
      // Combine with previous value (space-separated)
      value += ' ' + nextToken.value;
      context.currentIndex++;
    } else if (nextToken.type === TokenType.EOF) {
      // Stop at EOF
      break;
    } else {
      // Stop at any other token type (COLON, COMMA, etc.)
      break;
    }
  }

  // Check for null
  if (value === 'null') {
    return {
      type: 'null',
      value: null,
      line: firstToken.line,
      column: firstToken.column,
    };
  }

  // Check for boolean
  if (value === 'true' || value === 'false') {
    return {
      type: 'primitive',
      value: value === 'true',
      primitiveType: 'boolean',
      quoted: false,
      line: firstToken.line,
      column: firstToken.column,
    };
  }

  // Check for number
  const numValue = parseNumber(value);
  if (numValue !== null) {
    return {
      type: 'primitive',
      value: numValue,
      primitiveType: 'number',
      quoted: false,
      line: firstToken.line,
      column: firstToken.column,
    };
  }

  // Otherwise it's a string
  return {
    type: 'primitive',
    value,
    primitiveType: 'string',
    quoted: false,
    line: firstToken.line,
    column: firstToken.column,
  };
}

/**
 * Parses a number string to a number
 */
function parseNumber(value: string): number | null {
  // Check if it's a valid number
  if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(value)) {
    const num = Number(value);
    if (!isNaN(num) && isFinite(num)) {
      return num;
    }
  }
  return null;
}

/**
 * Gets the current indentation level
 */
function getCurrentIndent(context: ParseContext): number {
  let indent = 0;
  let i = context.currentIndex;

  // Skip NEWLINE tokens and count consecutive INDENT tokens
  while (i < context.tokens.length) {
    const token = context.tokens[i];
    if (token.type === TokenType.NEWLINE) {
      indent = 0; // Reset indent after newline
      i++;
    } else if (token.type === TokenType.INDENT) {
      indent += token.value.length;
      i++;
    } else {
      break;
    }
  }

  return indent;
}

/**
 * Skips whitespace tokens
 */
function skipWhitespace(context: ParseContext): void {
  while (context.currentIndex < context.tokens.length) {
    const token = context.tokens[context.currentIndex];
    if (token.type === TokenType.INDENT || token.type === TokenType.NEWLINE) {
      context.currentIndex++;
    } else {
      break;
    }
  }
}

/**
 * Peeks at the current token without consuming it
 */
function peek(context: ParseContext): Token | null {
  if (context.currentIndex >= context.tokens.length) {
    return null;
  }
  return context.tokens[context.currentIndex];
}

/**
 * Consumes a token of the expected type
 */
function consume(context: ParseContext, expectedType: TokenType): Token | null {
  skipWhitespace(context);

  if (context.currentIndex >= context.tokens.length) {
    return null;
  }

  const token = context.tokens[context.currentIndex];
  if (token.type === expectedType) {
    context.currentIndex++;
    context.line = token.line;
    context.column = token.column;
    return token;
  }

  return null;
}

/**
 * Checks if we've reached end of file
 */
function isEOF(context: ParseContext): boolean {
  skipWhitespace(context);
  const token = peek(context);
  return token === null || token.type === TokenType.EOF;
}

