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
 * Parses an object
 */
function parseObject(context: ParseContext): ObjectNode {
  const startToken = peek(context);
  if (!startToken || startToken.type !== TokenType.KEY) {
    throw new ParseError('Expected object key', context.line, context.column);
  }

  const properties = new Map<string, ASTNode>();
  const currentIndent = getCurrentIndent(context);

  while (!isEOF(context)) {
    // Calculate indentation BEFORE skipping whitespace
    // (so we can see INDENT tokens before they're consumed)
    let indent = 0;
    let checkIndex = context.currentIndex;
    
    // Count INDENT tokens at current position (before skipWhitespace consumes them)
    while (checkIndex < context.tokens.length) {
      const t = context.tokens[checkIndex];
      if (t.type === TokenType.NEWLINE) {
        indent = 0; // Reset after newline
        checkIndex++;
      } else if (t.type === TokenType.INDENT) {
        indent += t.value.length;
        checkIndex++;
      } else {
        break;
      }
    }
    
    // If we've moved to a less indented level, we're done with this object
    if (indent < currentIndent) {
      break;
    }

    skipWhitespace(context);
    const token = peek(context);
    if (!token || token.type === TokenType.EOF) {
      break;
    }
    
    // Use the indent we calculated (before skipWhitespace)
    if (indent < currentIndent) {
      break;
    }

    // Parse key-value pair
    if (token.type === TokenType.KEY) {
      // Only parse keys at current or greater indentation
      if (indent < currentIndent) {
        break;
      }

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
        // Consume newline and check for indented content
        consume(context, TokenType.NEWLINE);
        skipWhitespace(context);
        
        const afterNewlineIndent = getCurrentIndent(context);
        if (afterNewlineIndent > currentIndent) {
          // Nested object - check if next token is a KEY
          const tokenAfterIndent = peek(context);
          if (tokenAfterIndent?.type === TokenType.KEY) {
            // Parse as nested object
            const nestedObject = parseObject(context);
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
        const value = parseValue(context);
        properties.set(keyToken.value, value);
      }

      // Skip trailing comments and newlines
      skipWhitespace(context);
      while (peek(context)?.type === TokenType.COMMENT) {
        consume(context, TokenType.COMMENT);
        skipWhitespace(context);
      }
      
      // Check if there's a newline - if so, consume it and continue
      // The next iteration will check indentation and parse the next key if appropriate
      if (peek(context)?.type === TokenType.NEWLINE) {
        consume(context, TokenType.NEWLINE);
        // Continue to next iteration - it will check indentation and parse next key
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

  return {
    type: 'object',
    properties,
    line: startToken.line,
    column: startToken.column,
  };
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
 */
function parsePrimitive(context: ParseContext): PrimitiveNode | NullNode {
  const token = consume(context, TokenType.VALUE);
  if (!token) {
    throw new ParseError('Expected value', context.line, context.column);
  }

  const value = token.value;

  // Check for null
  if (value === 'null') {
    return {
      type: 'null',
      value: null,
      line: token.line,
      column: token.column,
    };
  }

  // Check for boolean
  if (value === 'true' || value === 'false') {
    return {
      type: 'primitive',
      value: value === 'true',
      primitiveType: 'boolean',
      quoted: false,
      line: token.line,
      column: token.column,
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
      line: token.line,
      column: token.column,
    };
  }

  // Otherwise it's a string
  return {
    type: 'primitive',
    value,
    primitiveType: 'string',
    quoted: false,
    line: token.line,
    column: token.column,
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

