# CJSON API Reference

This document describes the public API exported from `cjson`. All TypeScript examples also work in plain JavaScript (omit type annotations).

## Table of Contents

1. [Core Functions](#core-functions)
2. [Options](#options)
3. [Validator](#validator)
4. [Error Types](#error-types)

---

## Core Functions

### `encode(value: unknown, options?: EncodeOptions): string`
Serializes any supported JavaScript value (objects, arrays, primitives, `Date`) into the CJSON format.

```ts
import { encode } from 'cjson';

const result = encode({
  name: 'Alice',
  tags: ['js', 'ts', 'rust'],
  users: [
    { name: 'Ada', role: 'admin' },
    { name: 'Bob', role: 'user' },
  ],
});
```

- Throws `EncodeError` if unsupported types are encountered (`undefined`, `symbol`, `function`, circular references, non-finite numbers, etc.).
- Honors formatting options (`indent`, `quoteMode`, `compactArrays`, `newline`, `preserveComments`).

### `decode(input: string, options?: DecodeOptions): unknown`
Parses a CJSON string directly to JavaScript values.

```ts
import { decode } from 'cjson';

const data = decode(`name: Alice\nactive: true`);
// => { name: 'Alice', active: true }
```

- Runs the full parser + AST-to-value converter.
- Honors parse/decode options (`preserveComments`, `allowTrailingCommas`, `coerceNumbers`, etc.).

### `parse(input: string, options?: ParseOptions): ASTNode`
Returns the full AST representation (objects, arrays, primitives, nulls) including comments, line/column info, and array format metadata.

```ts
import { parse } from 'cjson';

const ast = parse('users:\n  - name: Ada');
// ast.type === 'object'
```

Useful when you need custom transforms before re-encoding.

### `astToValue(ast: ASTNode): unknown`
Converts an AST tree returned by `parse` into plain JavaScript values. Exported as `astToValue` and `astToJS` for convenience.

```ts
import { parse, astToValue } from 'cjson';

const ast = parse('count: 3');
const value = astToValue(ast); // { count: 3 }
```

### `encodeAST(node: ASTNode, options?: EncodeOptions): string`
Encodes an AST directly back to CJSON. Respect comments and formatting metadata stored on AST nodes.

### `validate(node: ASTNode, schema?: PropertySchema): ValidationResult`
Validates an AST against optional schemas (string/number/boolean/null/object/array/any) and returns `{ valid: boolean; errors: ValidationError[] }`.

---

## Options

### `EncodeOptions`

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `indent` | `number` | `2` | Spaces per indent level |
| `newline` | `'\n' \| '\r\n'` | `'\n'` | Line separator |
| `quoteMode` | `'auto' \| 'always' \| 'never'` | `'auto'` | String quoting strategy |
| `compactArrays` | `boolean` | `true` | Use compact header format for uniform object arrays |
| `preserveComments` | `boolean` | `true` | Encode comments stored on AST nodes |

### `ParseOptions`

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `preserveComments` | `boolean` | `true` | Keep comment metadata on AST nodes |
| `allowTrailingCommas` | `boolean` | `false` | (Reserved for future use) |
| `allowEmptyKeys` | `boolean` | `false` | (Reserved for future use) |

### `DecodeOptions`

Extends `ParseOptions` and adds:

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `coerceNumbers` | `boolean` | `true` | Ensures numeric tokens become numbers (not strings) |
| `coerceBooleans` | `boolean` | `true` | Ensures `true`/`false` tokens become booleans |

---

## Validator

The validator works on AST nodes (`validate(ast, schema)`). Schema helpers live in `src/validator/types`.

```ts
import { parse, validate } from 'cjson';

const ast = parse('user:\n  name: Ada\n  age: 30');
const schema = {
  type: 'object',
  schema: {
    required: ['user'],
    properties: {
      user: {
        type: 'object',
        schema: {
          required: ['name', 'age'],
          properties: {
            name: { type: 'string' },
            age: { type: 'number' },
          },
        },
      },
    },
  },
};

const result = validate(ast, schema);
// result.valid === true
```

`ValidationError` fields:
- `message`
- `path`
- `line`, `column`

---

## Error Types

| Error | Description |
| --- | --- |
| `ParseError` | Thrown by `parse`/`decode` when syntax or structure is invalid. Includes line/column info and human-friendly messages. |
| `EncodeError` | Thrown by `encode` when encountering unsupported values or circular references. Messages include the offending path. |

`ErrorCode` enumerates the error categories (unexpected token, invalid value, unsupported type, empty input, etc.). You can inspect `error.code` to customize error handling.

---

Need more detail? Check `docs/SPEC.md` for the format rules and `DESIGN_DOCUMENT.md` for historical design context.

