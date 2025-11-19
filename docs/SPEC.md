# CJSON Format Specification

This document summarizes the CJSON syntax and semantics. For the historical design notes refer to `DESIGN_DOCUMENT.md`.

## 1. Basics

- UTF-8 text.
- Key/value pairs separated by `:` and optional space.
- Indentation uses spaces (configurable indent width, default 2). Tabs should be avoided.
- Comments start with `#` and run until the end of the line. Comments can appear:
  - On a line by themselves (`# comment`)
  - Inline after a value (`name: Alice # inline`)

```
# Person record
name: Alice
age: 30
active: true # inline comment
```

## 2. Values

| Type | Example | Notes |
| --- | --- | --- |
| String | `name: Alice`, `note: "Hello, world!"` | Quoting is automatic unless the string contains spaces/special chars |
| Number | `score: 42`, `temperature: -12.5` | Follows JavaScript number literals |
| Boolean | `active: true`, `flag: false` | Case-sensitive |
| Null | `value: null` | Case-sensitive |
| Object | `config:\n  key: value` | Indented block |
| Array | See [Arrays](#3-arrays) | Inline `[1, 2]`, multi-line `- item`, or compact headers |

## 3. Arrays

### 3.1 Inline primitive arrays

```
tags: [alpha, beta, gamma]
ids: [1, 2, 3]
```

Used when the array is short (≤ 5 items by default) and contains primitives only.

### 3.2 Multi-line dash arrays

```
items:
  - first
  - second
  - nested:
      key: value
```

Each item inherits its own indentation block. Items can be primitives, objects, or arrays.

### 3.3 Compact object arrays

```
users[2]{name, role}:
  name: Ada, role: admin
  name: Bob, role: user
```

- Header syntax: `<key>[<length>]{<field1>, <field2>, ...}:`
- Rows are comma-separated inline objects that follow the same field order.
- Automatically emitted by the encoder when:
  - Array length > 0
  - All entries are objects
  - All objects have identical primitive fields
  - `compactArrays` option is enabled

Parser validates the declared length and field presence.

## 4. Indentation Rules

- Indentation level increases by `indent` spaces (2 by default) when nesting objects/arrays.
- Sibling keys must align at the same indentation level.
- Empty objects/arrays are represented inline: `meta: {}` / `items: []`.

## 5. String Handling

- Unquoted strings must not contain whitespace, `:`, `,`, `[`, `]`, `#`.
- Quote strings with `"..."` to include spaces or special characters. Escapes use JSON-style sequences (`\"`, `\n`, `\t`, etc.).
- Encoder provides `quoteMode`:
  - `auto` (default): quote when necessary
  - `always`: quote all strings
  - `never`: never quote (unsafe if strings contain special chars)

## 6. Numbers

- Follow JavaScript numeric literal rules (supports `-`, decimal, exponent).
- Non-finite numbers (`NaN`, `Infinity`) are rejected during encoding.

## 7. Comments

```
# Leading comment
name: Alice # Inline comment
```

- Parser stores comments on AST nodes so they can be preserved during re-encoding (`preserveComments` option).

## 8. Error Handling

Parser (`parse`) and decoder (`decode`) throw `ParseError` with:
- `message`
- `line`, `column`
- `code` (via `ErrorCode`)
- Helpful `suggestion` metadata when possible

Encoder (`encode`) throws `EncodeError` for:
- Unsupported types (`undefined`, `symbol`, `function`, circular refs, non-finite numbers)
- Invalid compact array rows
- General invalid values

## 9. Example Document

```
# Team snapshot
team: Atlas
active: true
members[2]{name, role, skills}:
  name: Ada, role: lead, skills: [systems, reliability]
  name: Bob, role: dev, skills: [infra]
metrics:
  uptime: 99.95
  incidents: 0
notes:
  - Launch scheduled next week
  - Keep stakeholders updated
```

---

For API-level details see `docs/API.md`. For deeper design rationale and roadmap consult `DESIGN_DOCUMENT.md`.

