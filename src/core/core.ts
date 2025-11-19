/**
 * Core CJSON functions with options handling
 */

import { parse } from '../parser/parser';
import { encode, encodeAST, EncodeOptions } from '../encoder/encoder';
import { validate } from '../validator/validator';
import { ASTNode } from '../ast/nodes';
import { astToJS } from '../ast/converter';
import { PropertySchema, ValidationResult } from '../validator/types';
import { ParseOptions, DecodeOptions, CJSONOptions } from './types';

/**
 * Default parse options
 */
const DEFAULT_PARSE_OPTIONS: Required<ParseOptions> = {
  preserveComments: true,
  allowTrailingCommas: false,
  allowEmptyKeys: false,
};

/**
 * Default decode options
 */
const DEFAULT_DECODE_OPTIONS: Required<DecodeOptions> = {
  ...DEFAULT_PARSE_OPTIONS,
  coerceNumbers: true,
  coerceBooleans: true,
};

/**
 * Merges user options with defaults
 */
export function mergeParseOptions(options?: ParseOptions): Required<ParseOptions> {
  return { ...DEFAULT_PARSE_OPTIONS, ...options };
}

/**
 * Merges user decode options with defaults
 */
export function mergeDecodeOptions(options?: DecodeOptions): Required<DecodeOptions> {
  return { ...DEFAULT_DECODE_OPTIONS, ...options };
}

/**
 * Merges user encode options with defaults
 */
export function mergeEncodeOptions(options?: EncodeOptions): Required<EncodeOptions> {
  const defaults: Required<EncodeOptions> = {
    indent: 2,
    newline: '\n',
    quoteMode: 'auto',
    compactArrays: true,
    preserveComments: true,
  };
  return { ...defaults, ...options };
}

/**
 * Validates option values
 */
export function validateOptions(options: CJSONOptions): void {
  if (options.parse) {
    if (options.parse.preserveComments !== undefined && typeof options.parse.preserveComments !== 'boolean') {
      throw new Error('parse.preserveComments must be a boolean');
    }
    if (options.parse.allowTrailingCommas !== undefined && typeof options.parse.allowTrailingCommas !== 'boolean') {
      throw new Error('parse.allowTrailingCommas must be a boolean');
    }
    if (options.parse.allowEmptyKeys !== undefined && typeof options.parse.allowEmptyKeys !== 'boolean') {
      throw new Error('parse.allowEmptyKeys must be a boolean');
    }
  }

  if (options.encode) {
    if (options.encode.indent !== undefined && (typeof options.encode.indent !== 'number' || options.encode.indent < 0)) {
      throw new Error('encode.indent must be a non-negative number');
    }
    if (options.encode.newline !== undefined && options.encode.newline !== '\n' && options.encode.newline !== '\r\n') {
      throw new Error('encode.newline must be "\\n" or "\\r\\n"');
    }
    if (options.encode.quoteMode !== undefined && !['auto', 'always', 'never'].includes(options.encode.quoteMode)) {
      throw new Error('encode.quoteMode must be "auto", "always", or "never"');
    }
    if (options.encode.compactArrays !== undefined && typeof options.encode.compactArrays !== 'boolean') {
      throw new Error('encode.compactArrays must be a boolean');
    }
    if (options.encode.preserveComments !== undefined && typeof options.encode.preserveComments !== 'boolean') {
      throw new Error('encode.preserveComments must be a boolean');
    }
  }

  if (options.decode) {
    if (options.decode.coerceNumbers !== undefined && typeof options.decode.coerceNumbers !== 'boolean') {
      throw new Error('decode.coerceNumbers must be a boolean');
    }
    if (options.decode.coerceBooleans !== undefined && typeof options.decode.coerceBooleans !== 'boolean') {
      throw new Error('decode.coerceBooleans must be a boolean');
    }
  }
}

/**
 * Parses CJSON string with options
 */
export function parseWithOptions(input: string, options?: ParseOptions): ASTNode {
  const mergedOptions = mergeParseOptions(options);
  // For now, parse options are mostly for future use
  // The parser already handles comments based on AST structure
  return parse(input);
}

/**
 * Encodes JavaScript value to CJSON with options
 */
export function encodeWithOptions(value: unknown, options?: EncodeOptions): string {
  const mergedOptions = mergeEncodeOptions(options);
  return encode(value, mergedOptions);
}

/**
 * Encodes AST node to CJSON with options
 */
export function encodeASTWithOptions(node: ASTNode, options?: EncodeOptions): string {
  const mergedOptions = mergeEncodeOptions(options);
  return encodeAST(node, mergedOptions);
}

/**
 * Validates AST node with schema
 */
export function validateWithOptions(
  node: ASTNode,
  schema?: PropertySchema,
): ValidationResult {
  return validate(node, schema);
}

/**
 * Decodes a CJSON string to a JavaScript value
 * @param input - The CJSON string to decode
 * @param options - Optional decode options
 * @returns JavaScript value (object, array, or primitive)
 * 
 * @example
 * ```ts
 * decode('name: Alice\nage: 30')
 * // { name: 'Alice', age: 30 }
 * 
 * decode('users[2]:\n  name: Alice, age: 30\n  name: Bob, age: 25')
 * // { users: [{ name: 'Alice', age: 30 }, { name: 'Bob', age: 25 }] }
 * ```
 */
export function decode(input: string, options?: DecodeOptions): unknown {
  const mergedOptions = mergeDecodeOptions(options);
  
  // Parse the input to AST
  const ast = parseWithOptions(input, mergedOptions);
  
  // Convert AST to JavaScript value
  // The parser already handles type inference (numbers, booleans, null)
  // so we just need to convert the AST structure to JS
  return astToJS(ast);
}

