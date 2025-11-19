/**
 * Parser for CJSON
 * Converts tokens into AST
 */

import { Token, TokenType, ParseContext } from './types';
import { ASTNode, ObjectNode, ArrayNode, PrimitiveNode, NullNode } from '../ast/nodes';
import { ParseError, ErrorCode } from '../errors/errors';
import { tokenize } from './tokenizer';

interface CompactArrayHeader {
  key: string;
  length: number;
  fields?: string[];
}

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

  // Skip leading whitespace, newlines, and comments
  skipWhitespace(context);
  
  // Skip leading comments
  while (peek(context)?.type === TokenType.COMMENT) {
    consume(context, TokenType.COMMENT);
    skipWhitespace(context);
  }

  if (isEOF(context)) {
    throw new ParseError(
      'Empty input - CJSON requires at least one key-value pair',
      1,
      1,
      ErrorCode.EMPTY_INPUT,
      {
        suggestion: 'Add at least one property, e.g., "name: value"',
      },
    );
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
    throw new ParseError(
      'Unexpected end of input while parsing value',
      context.line,
      context.column,
      ErrorCode.UNEXPECTED_EOF,
      {
        suggestion: 'Ensure all values are complete and properly terminated',
      },
    );
  }

  const token = peek(context);
  if (!token) {
    throw new ParseError(
      'Unexpected end of input while parsing value',
      context.line,
      context.column,
      ErrorCode.UNEXPECTED_EOF,
      {
        suggestion: 'Ensure all values are complete and properly terminated',
      },
    );
  }

  // Skip comments (they should be handled by collectLeadingComments in parseObjectWithIndent)
  if (token.type === TokenType.COMMENT) {
    consume(context, TokenType.COMMENT);
    skipWhitespace(context);
    // Recursively parse after comment
    return parseValue(context);
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
    `Unexpected token while parsing value`,
    token.line,
    token.column,
    ErrorCode.UNEXPECTED_TOKEN,
    {
      expected: 'object, array, primitive value, or dash',
      actual: `${token.type} (${token.value})`,
      suggestion: `Check syntax around line ${token.line}, column ${token.column}. Expected a value but found ${token.type}.`,
    },
  );
}

/**
 * Parses an object with a specified base indentation level
 */
function parseObjectWithIndent(
  context: ParseContext,
  baseIndent: number,
  options?: { allowInlineStart?: boolean },
): ObjectNode {
  const properties = new Map<string, ASTNode>();
  const currentIndent = baseIndent;
  let startToken: Token | null = null;
  const allowInlineStart = options?.allowInlineStart ?? false;
  let inlineStartUsed = false;

  while (true) {
    if (context.currentIndex >= context.tokens.length) {
      break;
    }
    const lookahead = context.tokens[context.currentIndex];
    if (!lookahead || lookahead.type === TokenType.EOF) {
      break;
    }
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
      if (allowInlineStart && !inlineStartUsed && properties.size === 0) {
        inlineStartUsed = true;
      } else {
        break;
      }
    }

    // Now skip whitespace (this will consume INDENT tokens we just measured)
    skipWhitespace(context);
    
    // Collect leading comments before checking for KEY
    // This must be done after skipWhitespace but before consuming the KEY
    const leadingComment = collectLeadingComments(context);
    
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

      const { suffix, colonToken } = collectKeySuffix(context);
      const compactHeader = parseCompactArrayHeader(keyToken.value, suffix);
      const propertyKey = compactHeader?.key ?? keyToken.value;
      if (!colonToken) {
        throw new ParseError(
          'Expected colon after key',
          token.line,
          token.column,
          ErrorCode.MISSING_COLON,
          {
            expected: 'colon (:)',
            actual: token.type,
            suggestion: `Add a colon after the key "${keyToken.value}", e.g., "${keyToken.value}: value"`,
          },
        );
      }

      // Don't skip whitespace yet - we need to check if there's a NEWLINE
      // Skip comments (but don't skip whitespace/newlines)
      while (peek(context)?.type === TokenType.COMMENT) {
        consume(context, TokenType.COMMENT);
        // Skip whitespace after comment, but don't skip newlines
        while (context.currentIndex < context.tokens.length) {
          const t = context.tokens[context.currentIndex];
          if (t.type === TokenType.INDENT) {
            context.currentIndex++;
          } else {
            break;
          }
        }
      }

      if (compactHeader) {
        const compactArray = parseCompactArrayValue(context, compactHeader, currentIndent, keyToken);
        if (leadingComment) {
          compactArray.leadingComment = leadingComment;
        }
        properties.set(propertyKey, compactArray);
        continue;
      }

      // Check if value is on next line (nested object or multi-line array)
      // peek doesn't skip whitespace, so we need to manually skip INDENT tokens
      let nextTokenIndex = context.currentIndex;
      while (nextTokenIndex < context.tokens.length) {
        const t = context.tokens[nextTokenIndex];
        if (t.type === TokenType.INDENT) {
          nextTokenIndex++;
        } else {
          break;
        }
      }
      const nextToken = nextTokenIndex < context.tokens.length ? context.tokens[nextTokenIndex] : null;
      if (nextToken?.type === TokenType.NEWLINE) {
        // Consume newline
        context.currentIndex = nextTokenIndex + 1; // Skip to after NEWLINE
        
        // Calculate indentation AFTER the newline
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
        
        // Check if we have indentation after newline
        if (afterNewlineIndent > currentIndent) {
          // checkIdx now points to the first non-INDENT token after the newline
          // Check if it's a DASH (multi-line array)
          if (checkIdx < context.tokens.length) {
            const tokenAfterIndent = context.tokens[checkIdx];
            
            if (tokenAfterIndent.type === TokenType.DASH) {
              // This is a multi-line array
              // context.currentIndex is at the INDENT token
              // parseMultiLineArray will calculate lineIndent from currentIndex, skip whitespace, and find the DASH
              // Make sure currentIndex is at the INDENT token (it should be, but let's be explicit)
              // We don't need to change currentIndex - it's already at the INDENT token
              const multiLineArray = parseMultiLineArray(context, afterNewlineIndent);
              if (leadingComment) {
                multiLineArray.leadingComment = leadingComment;
              }
              properties.set(propertyKey, multiLineArray);
              continue; // Continue to next iteration to parse next key-value pair
            }
          }
          
          // Not a multi-line array, check for nested object
          {
            // Check if next token is INDENT (nested object) or KEY (nested object on same line)
            if (context.currentIndex < context.tokens.length) {
              const nextTokenAfterNewline = context.tokens[context.currentIndex];
              if (nextTokenAfterNewline?.type === TokenType.INDENT || nextTokenAfterNewline?.type === TokenType.KEY) {
                // Nested object - the nested parser will handle skipping whitespace and parsing keys
                const nestedObject = parseObjectWithIndent(context, afterNewlineIndent);
                if (leadingComment) {
                  nestedObject.leadingComment = leadingComment;
                }
                properties.set(propertyKey, nestedObject);
              } else {
                // Empty nested object (just a colon with newline)
                const emptyObj: ObjectNode = {
                  type: 'object',
                  properties: new Map(),
                  line: nextToken.line,
                  column: nextToken.column,
                };
                if (leadingComment) {
                  emptyObj.leadingComment = leadingComment;
                }
                properties.set(propertyKey, emptyObj);
              }
            } else {
              // Empty nested object
              const emptyObj: ObjectNode = {
                type: 'object',
                properties: new Map(),
                line: nextToken.line,
                column: nextToken.column,
              };
              if (leadingComment) {
                emptyObj.leadingComment = leadingComment;
              }
              properties.set(propertyKey, emptyObj);
            }
          }
        } else {
          // Empty nested object (just a colon with newline, no indentation)
          const emptyObj: ObjectNode = {
            type: 'object',
            properties: new Map(),
            line: nextToken.line,
            column: nextToken.column,
          };
          if (leadingComment) {
            emptyObj.leadingComment = leadingComment;
          }
          properties.set(propertyKey, emptyObj);
        }
      } else {
        // Value is on same line
        // Skip any inline indentation before checking the value
        while (
          context.currentIndex < context.tokens.length &&
          context.tokens[context.currentIndex]?.type === TokenType.INDENT
        ) {
          context.currentIndex++;
        }

        // Check what type of value it is before parsing
        const valueToken = peek(context);
        if (!valueToken || valueToken.type === TokenType.EOF) {
          // Treat missing inline value as empty object
          const emptyObj: ObjectNode = {
            type: 'object',
            properties: new Map(),
            line: keyToken.line,
            column: keyToken.column,
          };
          if (leadingComment) {
            emptyObj.leadingComment = leadingComment;
          }
          properties.set(propertyKey, emptyObj);
          continue;
        }
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
        
        // Attach leading comment to the value node
        if (leadingComment && value) {
          value.leadingComment = leadingComment;
        }
        
        properties.set(propertyKey, value);
        
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
            context.currentIndex++;
            continue;
          } else if (nextToken?.type === TokenType.EOF) {
            break;
          }
        }
        
        // After skipping whitespace/comments, check for newline or EOF
        const finalToken = peek(context);
        if (finalToken?.type === TokenType.NEWLINE) {
          context.currentIndex++;
          continue;
        } else if (finalToken?.type === TokenType.EOF) {
          break;
        }
        // If there's no newline and no EOF, continue to next iteration
        // (might be another key at same level or end of object)
        continue;
      }
    } else if (token.type === TokenType.NEWLINE) {
      context.currentIndex++;
      // Continue to next iteration
      continue;
    } else {
      break;
    }
  }

  if (!startToken) {
    throw new ParseError(
      'Expected object key',
      context.line,
      context.column,
      ErrorCode.MISSING_KEY,
      {
        expected: 'key followed by colon',
        suggestion: 'Add at least one key-value pair, e.g., "name: value"',
      },
    );
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

function collectKeySuffix(context: ParseContext): { suffix: string; colonToken: Token | null } {
  const parts: string[] = [];
  while (context.currentIndex < context.tokens.length) {
    const token = context.tokens[context.currentIndex];
    if (token.type === TokenType.COLON) {
      context.currentIndex++;
      return { suffix: parts.join('').trim(), colonToken: token };
    }
    if (token.type === TokenType.INDENT) {
      context.currentIndex++;
      continue;
    }
    if (token.type === TokenType.NEWLINE || token.type === TokenType.EOF) {
      break;
    }
    parts.push(tokenToLiteral(token));
    context.currentIndex++;
  }
  return { suffix: '', colonToken: null };
}

function tokenToLiteral(token: Token): string {
  switch (token.type) {
    case TokenType.BRACKET_OPEN:
      return '[';
    case TokenType.BRACKET_CLOSE:
      return ']';
    case TokenType.COMMA:
      return ',';
    default:
      return token.value ?? '';
  }
}

function parseCompactArrayHeader(baseKey: string, suffix: string): CompactArrayHeader | null {
  const fullKey = `${baseKey}${suffix}`.trim();
  const headerMatch = fullKey.match(/^(.+?)\[(\d+)\](?:\{([^}]*)\})?$/);
  if (!headerMatch) {
    return null;
  }

  const [, rawKey, lengthValue, fieldsSegment] = headerMatch;
  const key = rawKey.trim();
  if (!key) {
    return null;
  }

  const length = Number.parseInt(lengthValue || '0', 10);
  if (!Number.isFinite(length) || length < 0) {
    return null;
  }

  let fields: string[] | undefined;
  if (fieldsSegment) {
    fields = fieldsSegment
      .split(',')
      .map((field) => field.trim())
      .filter((field) => field.length > 0);
  }

  return {
    key,
    length,
    fields,
  };
}

/**
 * Parses an array
 */
function parseArray(context: ParseContext): ArrayNode {
  const startToken = consume(context, TokenType.BRACKET_OPEN);
  if (!startToken) {
    throw new ParseError(
      'Expected opening bracket for array',
      context.line,
      context.column,
      ErrorCode.UNEXPECTED_TOKEN,
      {
        expected: '[',
        suggestion: 'Use square brackets for arrays, e.g., "[item1, item2]"',
      },
    );
  }

  const items: ASTNode[] = [];

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
    format: 'inline',
    line: startToken.line,
    column: startToken.column,
  };
}

/**
 * Parses a multi-line array (items starting with dash at a specific indentation level)
 */
function parseMultiLineArray(context: ParseContext, baseIndent: number): ArrayNode {
  const items: ASTNode[] = [];
  let startToken: Token | null = null;

  while (true) {
    if (context.currentIndex >= context.tokens.length) {
      break;
    }

    const leadingToken = context.tokens[context.currentIndex];
    if (!leadingToken || leadingToken.type === TokenType.EOF) {
      break;
    }

    // Calculate indentation of the current line BEFORE skipping whitespace
    let lineIndent = 0;
    let checkIndex = context.currentIndex;
    
    // Count INDENT tokens at current position (before skipWhitespace consumes them)
    // Skip past any NEWLINE tokens and count INDENT tokens after them
    while (checkIndex < context.tokens.length) {
      const t = context.tokens[checkIndex];
      if (t.type === TokenType.NEWLINE) {
        lineIndent = 0;
        checkIndex++;
      } else if (t.type === TokenType.INDENT) {
        lineIndent += t.value.length;
        checkIndex++;
      } else {
        break;
      }
    }
    
    // If we've moved to a less indented level, we're done with this array
    if (lineIndent < baseIndent) {
      break;
    }
    
    // Now skip whitespace (this will consume INDENT tokens we just measured)
    skipWhitespace(context);
    
    const token = peek(context);
    if (!token || token.type === TokenType.EOF) {
      break;
    }
    
    // Check if we're at the right indentation level and have a DASH
    if (lineIndent === baseIndent && token.type === TokenType.DASH) {
      if (!startToken) {
        startToken = token;
      }
      
      // Consume the DASH
      consume(context, TokenType.DASH);
      
      // Skip whitespace after dash
      skipWhitespace(context);
      
      // Parse the array item value
      // Check what comes after the dash
      const afterDashToken = peek(context);
      if (!afterDashToken) {
        // Empty item - treat as empty object
        items.push({
          type: 'object',
          properties: new Map(),
          line: token.line,
          column: token.column,
        });
      } else if (afterDashToken.type === TokenType.NEWLINE) {
        // Empty item after newline - treat as empty object
        items.push({
          type: 'object',
          properties: new Map(),
          line: token.line,
          column: token.column,
        });
        context.currentIndex++;
      } else if (afterDashToken.type === TokenType.KEY) {
        // Object item - parse as nested object
        // The item starts at baseIndent + 1 (after the dash and space)
        const itemIndent = baseIndent + 2; // dash + space
        const itemObject = parseObjectWithIndent(context, itemIndent, { allowInlineStart: true });
        items.push(itemObject);
      } else {
        // Primitive or other value
        const item = parseValue(context);
        items.push(item);
      }
      // After parsing an item, consume newline if present
      const afterItemToken = peek(context);
      if (afterItemToken?.type === TokenType.NEWLINE) {
        context.currentIndex++;
      } else if (afterItemToken?.type === TokenType.EOF) {
        break;
      }
    } else if (token.type === TokenType.NEWLINE) {
      context.currentIndex++;
      continue;
    } else {
      break;
    }
  }

  if (!startToken) {
    throw new ParseError(
      'Expected array item after dash',
      context.line,
      context.column,
      ErrorCode.UNEXPECTED_TOKEN,
      {
        expected: 'array item value',
        suggestion: 'Add a value after the dash, e.g., "- item" or "- key: value"',
      },
    );
  }

  return {
    type: 'array',
    items,
    format: 'multiline',
    line: startToken.line,
    column: startToken.column,
  };
}

function parseCompactArrayValue(
  context: ParseContext,
  header: CompactArrayHeader,
  currentIndent: number,
  startToken: Token,
): ArrayNode {
  const nextToken = peek(context);
  if (nextToken?.type === TokenType.NEWLINE) {
    context.currentIndex++;
    const rowIndent = measureIndentation(context);
    if (rowIndent <= currentIndent) {
      throw new ParseError('Expected indented rows for compact array', nextToken.line, nextToken.column);
    }
    const arrayNode = parseCompactArrayRows(context, header, rowIndent, startToken);
    arrayNode.format = 'compact';
    return arrayNode;
  }

  const inlineArray = parseCompactInlineArray(context, header, startToken);
  inlineArray.format = 'compact';
  return inlineArray;
}

function parseCompactInlineArray(
  context: ParseContext,
  header: CompactArrayHeader,
  startToken: Token,
): ArrayNode {
  if (header.fields && header.fields.length > 0) {
    throw new ParseError(
      'Compact object arrays with fields must use multi-line rows',
      startToken.line,
      startToken.column,
    );
  }

  const items: ASTNode[] = [];

  while (
    context.currentIndex < context.tokens.length &&
    context.tokens[context.currentIndex].type !== TokenType.EOF
  ) {
    skipWhitespace(context);
    const nextToken = peek(context);
    if (!nextToken || nextToken.type === TokenType.NEWLINE || nextToken.type === TokenType.EOF) {
      break;
    }

    const valueNode = parseValue(context);
    items.push(valueNode);

    skipWhitespace(context);
    if (peek(context)?.type === TokenType.COMMA) {
      context.currentIndex++;
      continue;
    }
    break;
  }

  if (peek(context)?.type === TokenType.NEWLINE) {
    context.currentIndex++;
  }

  if (items.length !== header.length) {
    throw new ParseError(
      `Expected ${header.length} items in compact array but found ${items.length}`,
      startToken.line,
      startToken.column,
    );
  }

  return {
    type: 'array',
    items,
    format: 'compact',
    line: startToken.line,
    column: startToken.column,
  };
}

function parseCompactArrayRows(
  context: ParseContext,
  header: CompactArrayHeader,
  rowIndent: number,
  startToken: Token,
): ArrayNode {
  const items: ObjectNode[] = [];

  while (
    context.currentIndex < context.tokens.length &&
    context.tokens[context.currentIndex].type !== TokenType.EOF &&
    items.length < header.length
  ) {
    const token = peek(context);
    if (!token) {
      break;
    }

    if (token.type === TokenType.NEWLINE) {
      context.currentIndex++;
      continue;
    }

    let indent = 0;
    let idx = context.currentIndex;
    while (idx < context.tokens.length && context.tokens[idx].type === TokenType.INDENT) {
      indent += context.tokens[idx].value.length;
      idx++;
    }

    if (indent < rowIndent) {
      break;
    }

    if (indent > rowIndent) {
      throw new ParseError('Unexpected indentation in compact array row', token.line, token.column);
    }

    context.currentIndex = idx;
    const rowObject = parseCompactRow(context, header);
    items.push(rowObject);
  }

  if (items.length !== header.length) {
    throw new ParseError(
      `Expected ${header.length} rows in compact array but found ${items.length}`,
      startToken.line,
      startToken.column,
    );
  }

  return {
    type: 'array',
    items,
    format: 'compact',
    line: startToken.line,
    column: startToken.column,
  };
}

function parseCompactRow(context: ParseContext, header: CompactArrayHeader): ObjectNode {
  const properties = new Map<string, ASTNode>();
  let startToken: Token | null = null;

  while (
    context.currentIndex < context.tokens.length &&
    context.tokens[context.currentIndex].type !== TokenType.EOF
  ) {
    while (context.currentIndex < context.tokens.length && context.tokens[context.currentIndex].type === TokenType.INDENT) {
      context.currentIndex++;
    }

    const keyToken = consume(context, TokenType.KEY);
    if (!keyToken) {
      break;
    }

    if (!startToken) {
      startToken = keyToken;
    }

    const colonToken = consume(context, TokenType.COLON);
    if (!colonToken) {
      throw new ParseError('Expected colon in compact array row', keyToken.line, keyToken.column);
    }

    while (
      context.currentIndex < context.tokens.length &&
      context.tokens[context.currentIndex]?.type === TokenType.INDENT
    ) {
      context.currentIndex++;
    }

    const valueNode = parseValue(context);
    properties.set(keyToken.value, valueNode);

    skipInlineSeparators(context);
    const nextToken = peek(context);
    if (nextToken?.type === TokenType.COMMA) {
      context.currentIndex++;
      continue;
    }

    if (nextToken?.type === TokenType.NEWLINE) {
      context.currentIndex++;
    }

    break;
  }

  if (properties.size === 0) {
    throw new ParseError('Expected fields in compact array row', context.line, context.column);
  }

  if (header.fields && header.fields.length > 0) {
    for (const field of header.fields) {
      if (!properties.has(field)) {
        throw new ParseError(
          `Missing "${field}" in compact array row`,
          startToken?.line ?? context.line,
          startToken?.column ?? context.column,
        );
      }
    }
  }

  return {
    type: 'object',
    properties,
    line: startToken?.line ?? context.line,
    column: startToken?.column ?? context.column,
  };
}

function skipInlineSeparators(context: ParseContext): void {
  while (
    context.currentIndex < context.tokens.length &&
    context.tokens[context.currentIndex]?.type === TokenType.INDENT
  ) {
    context.currentIndex++;
  }
}

function measureIndentation(context: ParseContext): number {
  let indent = 0;
  let idx = context.currentIndex;
  while (idx < context.tokens.length) {
    const token = context.tokens[idx];
    if (token.type === TokenType.INDENT) {
      indent += token.value.length;
      idx++;
      continue;
    }
    if (token.type === TokenType.NEWLINE) {
      indent = 0;
      idx++;
      continue;
    }
    break;
  }
  return indent;
}

/**
 * Collects leading comments (comments on lines before the current position)
 * Returns the comment text if found, and advances past it
 * This looks at tokens starting from currentIndex and collects comments
 * that appear before the next non-comment, non-whitespace token
 */
function collectLeadingComments(context: ParseContext): string | undefined {
  const comments: string[] = [];
  let idx = context.currentIndex;
  
  // Look forward for comments, stopping at first non-comment/non-whitespace token
  while (idx < context.tokens.length) {
    const token = context.tokens[idx];
    
    if (token.type === TokenType.INDENT || token.type === TokenType.NEWLINE) {
      idx++;
      continue;
    }
    
    if (token.type === TokenType.COMMENT) {
      comments.push(token.value);
      idx++;
      // Skip whitespace after comment
      while (idx < context.tokens.length && context.tokens[idx].type === TokenType.INDENT) {
        idx++;
      }
      // If next is newline, continue looking for more comments
      if (idx < context.tokens.length && context.tokens[idx].type === TokenType.NEWLINE) {
        idx++;
        continue;
      }
      // If next is another comment, continue
      if (idx < context.tokens.length && context.tokens[idx].type === TokenType.COMMENT) {
        continue;
      }
      // Otherwise we've hit a non-comment token, stop
      break;
    }
    
    // Hit a non-comment, non-whitespace token - stop collecting
    break;
  }
  
  if (comments.length > 0) {
    context.currentIndex = idx;
    return comments.join('\n');
  }
  return undefined;
}

/**
 * Collects inline comment (comment after value on same line)
 * Returns the comment text if found, and advances past it
 */
function collectInlineComment(context: ParseContext): string | undefined {
  // Skip whitespace
  let idx = context.currentIndex;
  while (idx < context.tokens.length && context.tokens[idx].type === TokenType.INDENT) {
    idx++;
  }
  
  // Check for comment
  if (idx < context.tokens.length && context.tokens[idx].type === TokenType.COMMENT) {
    const comment = context.tokens[idx].value;
    context.currentIndex = idx + 1;
    return comment;
  }
  
  return undefined;
}

/**
 * Parses an array item (for multi-line arrays with dash)
 * This is used when parsing a value that starts with a dash (not in object context)
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

  // Check for inline comment (before checking value type)
  const inlineComment = collectInlineComment(context);
  
  // Check for null
  if (value === 'null') {
    const node: NullNode = {
      type: 'null',
      value: null,
      line: firstToken.line,
      column: firstToken.column,
    };
    if (inlineComment) {
      node.inlineComment = inlineComment;
    }
    return node;
  }

  // Check for boolean
  if (value === 'true' || value === 'false') {
    const node: PrimitiveNode = {
      type: 'primitive',
      value: value === 'true',
      primitiveType: 'boolean',
      quoted: false,
      line: firstToken.line,
      column: firstToken.column,
    };
    if (inlineComment) {
      node.inlineComment = inlineComment;
    }
    return node;
  }

  // Check for number
  const numValue = parseNumber(value);
  if (numValue !== null) {
    const node: PrimitiveNode = {
      type: 'primitive',
      value: numValue,
      primitiveType: 'number',
      quoted: false,
      line: firstToken.line,
      column: firstToken.column,
    };
    if (inlineComment) {
      node.inlineComment = inlineComment;
    }
    return node;
  }

  // Otherwise it's a string
  const node: PrimitiveNode = {
    type: 'primitive',
    value,
    primitiveType: 'string',
    quoted: false,
    line: firstToken.line,
    column: firstToken.column,
  };
  
  if (inlineComment) {
    node.inlineComment = inlineComment;
  }
  
  return node;
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

