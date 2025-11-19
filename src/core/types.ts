/**
 * Core type definitions for CJSON options
 */

import { EncodeOptions } from '../encoder/encoder';

/**
 * Options for parsing CJSON input
 */
export interface ParseOptions {
  /**
   * Whether to preserve comments in the AST.
   * Defaults to true.
   */
  preserveComments?: boolean;
  /**
   * Whether to allow trailing commas in arrays/objects.
   * Defaults to false.
   */
  allowTrailingCommas?: boolean;
  /**
   * Whether to allow empty keys in objects.
   * Defaults to false.
   */
  allowEmptyKeys?: boolean;
}

/**
 * Options for decoding CJSON to JavaScript objects
 */
export interface DecodeOptions extends ParseOptions {
  /**
   * Whether to convert string numbers to actual numbers.
   * Defaults to true.
   */
  coerceNumbers?: boolean;
  /**
   * Whether to convert string booleans to actual booleans.
   * Defaults to true.
   */
  coerceBooleans?: boolean;
}

/**
 * Re-export EncodeOptions from encoder
 */
export type { EncodeOptions } from '../encoder/encoder';

/**
 * Combined options for encode/decode operations
 */
export interface CJSONOptions {
  parse?: ParseOptions;
  encode?: EncodeOptions;
  decode?: DecodeOptions;
}

