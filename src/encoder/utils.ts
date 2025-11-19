export type QuoteMode = 'auto' | 'always' | 'never';

const SAFE_UNQUOTED_PATTERN = /^[A-Za-z0-9._-]+$/;
const NUMERIC_PATTERN = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/;
const RESERVED_WORDS = new Set(['true', 'false', 'null']);
const RESERVED_CHAR_PATTERN = /[[\],:{}"#]/;
const ESCAPE_LOOKUP: Record<string, string> = {
  '\\': '\\\\',
  '"': '\\"',
  '\n': '\\n',
  '\r': '\\r',
  '\t': '\\t',
};
const ESCAPE_PATTERN = /["\\\n\r\t]/g;

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

export function isPrimitiveValue(value: unknown): value is string | number | boolean | null {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}

export function needsQuoting(value: string): boolean {
  if (value.length === 0) {
    return true;
  }
  if (value !== value.trim()) {
    return true;
  }
  if (value.includes('\n') || value.includes('\r') || value.includes('\t')) {
    return true;
  }
  if (RESERVED_CHAR_PATTERN.test(value)) {
    return true;
  }
  if (NUMERIC_PATTERN.test(value)) {
    return true;
  }
  if (RESERVED_WORDS.has(value)) {
    return true;
  }
  return !SAFE_UNQUOTED_PATTERN.test(value);
}

export function escapeString(value: string): string {
  return value.replace(ESCAPE_PATTERN, (char) => ESCAPE_LOOKUP[char] ?? char);
}

