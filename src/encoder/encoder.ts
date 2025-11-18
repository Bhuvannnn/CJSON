import { EncodeError, ErrorCode } from '../errors/errors';
import { ASTNode } from '../ast/nodes';
import {
  formatArray,
  formatObject,
  indentString,
  FormattedProperty,
  FormattedValue,
} from './formatter';
import {
  escapeString,
  isPlainObject,
  isPrimitiveValue,
  needsQuoting,
  QuoteMode,
} from './utils';

export interface EncodeOptions {
  /**
   * Number of spaces used for indentation.
   * Defaults to 2.
   */
  indent?: number;
  /**
   * Newline character to use between lines.
   * Defaults to '\n'.
   */
  newline?: '\n' | '\r\n';
  /**
   * Strategy for quoting strings.
   * Will be expanded in Task 3.2.
   */
  quoteMode?: QuoteMode;
  /**
   * Placeholder for future array formatting options.
   * Implemented in Task 3.3+.
   */
  compactArrays?: boolean;
  /**
   * Whether to preserve comments when encoding.
   * Defaults to true.
   */
  preserveComments?: boolean;
}

interface EncodeContext {
  indentLevel: number;
  indentSize: number;
  newline: string;
  options: Required<EncodeOptions>;
}

const DEFAULT_OPTIONS: Required<EncodeOptions> = {
  indent: 2,
  newline: '\n',
  quoteMode: 'auto',
  compactArrays: true,
  preserveComments: true,
};

const INLINE_PRIMITIVE_MAX_ITEMS = 5;
const INLINE_PRIMITIVE_MAX_LENGTH = 80;

/**
 * Encodes any JavaScript value into the Compact JSON (CJSON) format.
 */
export function encode(value: unknown, options?: EncodeOptions): string {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const context: EncodeContext = {
    indentLevel: 0,
    indentSize: mergedOptions.indent,
    newline: mergedOptions.newline,
    options: mergedOptions,
  };

  const result = encodeValue(value, context);
  return result.text;
}

function encodeValue(value: unknown, context: EncodeContext): FormattedValue {
  if (value === null) {
    return { inline: true, text: 'null' };
  }

  if (Array.isArray(value)) {
    return encodeArray(value, context);
  }

  if (isPlainObject(value)) {
    return encodeObject(value, context);
  }

  switch (typeof value) {
    case 'string':
      return { inline: true, text: encodeString(value, context.options.quoteMode) };
    case 'number':
      return { inline: true, text: encodeNumber(value) };
    case 'boolean':
      return { inline: true, text: encodeBoolean(value) };
    case 'undefined':
      throw new EncodeError(
        'Cannot encode undefined values',
        0,
        0,
        ErrorCode.INVALID_VALUE,
        {
          expected: 'null, object, array, string, number, or boolean',
          actual: 'undefined',
          suggestion: 'Use null instead of undefined, or remove the property',
        },
      );
    case 'function':
    case 'symbol':
      throw new EncodeError(
        `Cannot encode value of type ${typeof value}`,
        0,
        0,
        ErrorCode.UNSUPPORTED_TYPE,
        {
          expected: 'null, object, array, string, number, or boolean',
          actual: typeof value,
          suggestion: `Convert ${typeof value} to a supported type before encoding`,
        },
      );
    default:
      break;
  }

  if (value instanceof Date) {
    return { inline: true, text: encodeString(value.toISOString(), context.options.quoteMode) };
  }

  throw new EncodeError(
    'Unsupported value type',
    0,
    0,
    ErrorCode.UNSUPPORTED_TYPE,
    {
      expected: 'null, object, array, string, number, boolean, or Date',
      suggestion: 'Convert the value to a supported CJSON type',
    },
  );
}

function encodeObject(value: Record<string, unknown>, context: EncodeContext): FormattedValue {
  const entries = Object.entries(value ?? {});

  if (entries.length === 0) {
    return { inline: true, text: '{}' };
  }

  const properties: FormattedProperty[] = [];

  for (const [key, child] of entries) {
    if (typeof child === 'undefined') {
      continue;
    }

    const childContext: EncodeContext = {
      ...context,
      indentLevel: context.indentLevel + 1,
    };

    if (isPlainObject(child)) {
      const encodedChild = encodeObject(child as Record<string, unknown>, childContext);
      properties.push({ key, value: encodedChild });
      continue;
    }

    if (Array.isArray(child)) {
      const encodedArray = encodeArray(child, childContext, key);
      properties.push({ key, value: encodedArray, headerSuffix: encodedArray.headerSuffix });
      continue;
    }

    if (child instanceof Date) {
      const dateString = encodeString(child.toISOString(), context.options.quoteMode);
      properties.push({
        key,
        value: { inline: true, text: dateString },
      });
      continue;
    }

    const primitiveValue = encodePrimitive(child, context.options.quoteMode);
    properties.push({
      key,
      value: { inline: true, text: primitiveValue },
    });
  }

  return formatObject(properties, context);
}

function encodeArray(value: unknown[], context: EncodeContext, parentKey?: string): FormattedValue {
  if (value.length === 0) {
    return { inline: true, text: '[]' };
  }

  const primitivesOnly = value.every(isPrimitiveValue);
  if (primitivesOnly) {
    return encodePrimitiveArray(value, context);
  }

  if (isObjectArray(value)) {
    const normalizedItems = value.map(normalizeObjectForEncoding);
    const uniformObjects = isUniformObjectArray(normalizedItems);
    const hasFields = normalizedItems[0] ? Object.keys(normalizedItems[0]).length > 0 : false;
    const primitiveFields = normalizedItems.every(hasOnlyPrimitiveValues);

    if (
      uniformObjects &&
      primitiveFields &&
      hasFields &&
      parentKey &&
      context.options.compactArrays
    ) {
      return encodeCompactArray(normalizedItems, context);
    }

    return encodeDashArray(value, context);
  }

  return encodeDashArray(value, context);
}

function encodePrimitiveArray(value: unknown[], context: EncodeContext): FormattedValue {
  const encodedItems = value.map((item) => encodePrimitive(item, context.options.quoteMode));
  const inlineText = `[${encodedItems.join(', ')}]`;

  if (shouldRenderInlinePrimitiveArray(value.length, inlineText.length)) {
    return { inline: true, text: inlineText };
  }

  return encodeDashArray(value, context);
}

function encodeDashArray(items: unknown[], context: EncodeContext): FormattedValue {
  const formattedItems = items.map((item) => {
    const itemContext: EncodeContext = {
      ...context,
      indentLevel: context.indentLevel + 1,
    };
    return encodeValue(item, itemContext);
  });

  return formatArray(formattedItems, context);
}

function shouldRenderInlinePrimitiveArray(itemCount: number, inlineLength: number): boolean {
  return itemCount <= INLINE_PRIMITIVE_MAX_ITEMS && inlineLength <= INLINE_PRIMITIVE_MAX_LENGTH;
}

function isObjectArray(value: unknown[]): value is Record<string, unknown>[] {
  return value.length > 0 && value.every((item) => isPlainObject(item));
}

function normalizeObjectForEncoding(source: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, entryValue] of Object.entries(source)) {
    if (typeof entryValue === 'undefined') {
      continue;
    }
    result[key] = entryValue;
  }
  return result;
}

function isUniformObjectArray(items: Record<string, unknown>[]): boolean {
  if (items.length === 0) {
    return false;
  }

  const referenceKeys = Object.keys(items[0]);
  for (let idx = 1; idx < items.length; idx++) {
    const itemKeys = Object.keys(items[idx]);
    if (itemKeys.length !== referenceKeys.length) {
      return false;
    }
    for (let keyIndex = 0; keyIndex < referenceKeys.length; keyIndex++) {
      if (itemKeys[keyIndex] !== referenceKeys[keyIndex]) {
        return false;
      }
    }
  }

  return true;
}

function hasOnlyPrimitiveValues(item: Record<string, unknown>): boolean {
  return Object.values(item).every((value) => isPrimitiveValue(value));
}

function encodeCompactArray(items: Record<string, unknown>[], context: EncodeContext): FormattedValue {
  if (items.length === 0) {
    return { inline: true, text: '[]' };
  }

  const fields = Object.keys(items[0]);
  if (fields.length === 0) {
    return encodeDashArray(items, context);
  }

  const rowIndent = indentString(context);
  const rows = items.map((item) => formatCompactRow(item, fields, context, rowIndent));
  const headerSuffix = `[${items.length}]{${fields.join(', ')}}`;

  return {
    inline: false,
    text: rows.join(context.newline),
    headerSuffix,
  };
}

function formatCompactRow(
  item: Record<string, unknown>,
  fields: string[],
  context: EncodeContext,
  rowIndent: string,
): string {
  const parts = fields.map((field) => {
    const value = item[field];
    const encodedValue = encodePrimitive(value, context.options.quoteMode);
    return `${field}: ${encodedValue}`;
  });

  return `${rowIndent}${parts.join(', ')}`;
}

function encodePrimitive(value: unknown, quoteMode: QuoteMode): string {
  if (value === null) {
    return 'null';
  }

  if (typeof value === 'string') {
    return encodeString(value, quoteMode);
  }

  if (typeof value === 'number') {
    return encodeNumber(value);
  }

  if (typeof value === 'boolean') {
    return encodeBoolean(value);
  }

  throw new EncodeError(
    `Cannot encode primitive value of type ${typeof value}`,
    0,
    0,
    ErrorCode.INVALID_VALUE,
    {
      expected: 'string, number, boolean, or null',
      actual: typeof value,
      suggestion: `Convert ${typeof value} to a supported primitive type`,
    },
  );
}

function encodeString(value: string, quoteMode: QuoteMode): string {
  if (quoteMode === 'always') {
    return `"${escapeString(value)}"`;
  }

  if (quoteMode === 'never') {
    return value;
  }

  return needsQuoting(value) ? `"${escapeString(value)}"` : value;
}

function encodeNumber(value: number): string {
  if (!Number.isFinite(value)) {
    throw new EncodeError('Cannot encode non-finite numbers');
  }
  return value.toString();
}

function encodeBoolean(value: boolean): string {
  return value ? 'true' : 'false';
}

/**
 * Encodes an AST node to CJSON format, preserving comments
 */
export function encodeAST(node: ASTNode, options?: EncodeOptions): string {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const context: EncodeContext = {
    indentLevel: 0,
    indentSize: mergedOptions.indent,
    newline: mergedOptions.newline,
    options: mergedOptions,
  };

  const result = encodeASTNode(node, context);
  return result.text;
}

function encodeASTNode(node: ASTNode, context: EncodeContext): FormattedValue {
  const preserveComments = context.options.preserveComments;
  
  switch (node.type) {
    case 'object': {
      const properties: FormattedProperty[] = [];
      for (const [key, value] of node.properties.entries()) {
        const encodedValue = encodeASTNode(value, {
          ...context,
          indentLevel: context.indentLevel + 1,
        });
        const property: FormattedProperty = {
          key,
          value: encodedValue,
        };
        if (preserveComments) {
          if (value.leadingComment) {
            property.leadingComment = value.leadingComment;
          }
          if (value.inlineComment) {
            property.inlineComment = value.inlineComment;
          }
        }
        properties.push(property);
      }
      const formatted = formatObject(properties, context);
      if (preserveComments && node.leadingComment) {
        formatted.leadingComment = node.leadingComment;
      }
      if (preserveComments && node.inlineComment) {
        formatted.inlineComment = node.inlineComment;
      }
      if (preserveComments && node.trailingComment) {
        formatted.trailingComment = node.trailingComment;
      }
      return formatted;
    }
    case 'array': {
      const items = node.items.map((item) => encodeASTNode(item, {
        ...context,
        indentLevel: context.indentLevel + 1,
      }));
      const formatted = formatArray(items, context);
      if (preserveComments && node.leadingComment) {
        formatted.leadingComment = node.leadingComment;
      }
      if (preserveComments && node.inlineComment) {
        formatted.inlineComment = node.inlineComment;
      }
      if (preserveComments && node.trailingComment) {
        formatted.trailingComment = node.trailingComment;
      }
      return formatted;
    }
    case 'primitive': {
      const text = encodePrimitive(node.value, context.options.quoteMode);
      const formatted: FormattedValue = { inline: true, text };
      if (preserveComments && node.leadingComment) {
        formatted.leadingComment = node.leadingComment;
      }
      if (preserveComments && node.inlineComment) {
        formatted.inlineComment = node.inlineComment;
      }
      if (preserveComments && node.trailingComment) {
        formatted.trailingComment = node.trailingComment;
      }
      return formatted;
    }
    case 'null': {
      const formatted: FormattedValue = { inline: true, text: 'null' };
      if (preserveComments && node.leadingComment) {
        formatted.leadingComment = node.leadingComment;
      }
      if (preserveComments && node.inlineComment) {
        formatted.inlineComment = node.inlineComment;
      }
      if (preserveComments && node.trailingComment) {
        formatted.trailingComment = node.trailingComment;
      }
      return formatted;
    }
  }
}


