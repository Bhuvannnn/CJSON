# Compact JSON (CJSON)

Compact JSON (CJSON) is a token-efficient, human-readable serialization format inspired by TOON and optimized for LLM interactions. This repository contains the production-ready parser, encoder, and tooling along with the reference documentation.

## Features

- 40–70% token reduction compared to JSON
- Familiar key/value syntax with optional compact array headers
- Inline, multi-line, and compact array formats
- Built-in comment support (`# comment`)
- Zero runtime dependencies, written in TypeScript
- Encode/decode/parsing APIs with rich error reporting

## Installation

```bash
npm install cjson
# or
yarn add cjson
```

## Quick Start

```ts
import { encode, decode } from 'cjson';

const data = {
  name: 'Alice',
  age: 30,
  tags: ['developer', 'designer'],
  projects: [
    { name: 'Atlas', status: 'active' },
    { name: 'Zephyr', status: 'paused' },
  ],
};

const cjson = encode(data);
// name: Alice
// age: 30
// tags: [developer, designer]
// projects[2]{name, status}:
//   name: Atlas, status: active
//   name: Zephyr, status: paused

const parsed = decode(cjson);
// => original JavaScript object
```

### Parsing only

```ts
import { parse, astToValue } from 'cjson';

const ast = parse('user:\n  name: Mira\n  active: true');
const value = astToValue(ast); // { user: { name: 'Mira', active: true } }
```

See `docs/API.md` for the full API surface (encode/decode/parse/options/validator).

## Syntax at a Glance

```
# Comments start with '#'
name: Alice
age: 30
tags: [js, ts, rust]

address:
  city: Seattle
  zip: 98101

users[2]{name, role}:
  name: Ada, role: admin
  name: Bob, role: user
```

More examples and formal rules are in `docs/SPEC.md`.

## Documentation

- [`docs/API.md`](docs/API.md) – API reference, options, and error types
- [`docs/SPEC.md`](docs/SPEC.md) – Format specification with examples
- [`DESIGN_DOCUMENT.md`](DESIGN_DOCUMENT.md) – Historical design doc and roadmap

## Examples

Example scripts live in the `examples/` directory:

- `examples/basic.ts` – encode/decode round trip
- `examples/parser.ts` – inspect AST output
- `examples/validator.ts` – validate documents against a schema

Run them with [`tsx`](https://github.com/esbuild-kit/tsx):

```bash
npx tsx examples/basic.ts
```

## Development

```bash
npm install
npm run build        # compile TypeScript
npm test             # run unit & integration tests (Vitest)
npm run benchmark    # measure encode/decode performance
```

CI is provided via GitHub Actions (`.github/workflows/ci.yml`) and runs lint + tests + build on pushes/PRs targeting `main` or `phase-5`.

## License

MIT © 2025-present CJSON contributors.

## References

- [TOON Format](https://github.com/toon-format/toon) – original inspiration
- [TOON Specification](https://github.com/toon-format/spec)

