# Project Structure Template

This document outlines the recommended project structure for implementing Compact JSON (CJSON).

## Directory Structure

```
cjson/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml              # CI/CD pipeline
│   │   └── release.yml         # Release automation
│   └── ISSUE_TEMPLATE/
│       └── bug_report.md
├── src/
│   ├── parser/
│   │   ├── tokenizer.ts        # Tokenize input string
│   │   ├── parser.ts           # Parse tokens to AST
│   │   ├── types.ts            # Token and AST type definitions
│   │   └── index.ts            # Parser exports
│   ├── encoder/
│   │   ├── encoder.ts          # Encode objects to CJSON
│   │   ├── formatter.ts        # Format output string
│   │   ├── utils.ts            # Encoding utilities
│   │   └── index.ts            # Encoder exports
│   ├── validator/
│   │   ├── validator.ts        # Validation logic
│   │   ├── types.ts            # Validation types
│   │   └── index.ts            # Validator exports
│   ├── ast/
│   │   ├── nodes.ts            # AST node definitions
│   │   ├── builder.ts          # AST builder utilities
│   │   └── index.ts            # AST exports
│   ├── errors/
│   │   ├── errors.ts           # Error classes
│   │   └── index.ts            # Error exports
│   ├── utils/
│   │   ├── string.ts           # String utilities
│   │   ├── types.ts            # Type utilities
│   │   └── index.ts            # Utils exports
│   ├── core.ts                 # Main encode/decode functions
│   └── index.ts                # Public API exports
├── tests/
│   ├── unit/
│   │   ├── parser.test.ts
│   │   ├── encoder.test.ts
│   │   ├── validator.test.ts
│   │   └── utils.test.ts
│   ├── integration/
│   │   ├── roundtrip.test.ts
│   │   ├── complex.test.ts
│   │   └── edge-cases.test.ts
│   ├── fixtures/
│   │   ├── simple.json
│   │   ├── nested.json
│   │   ├── arrays.json
│   │   └── large.json
│   └── helpers/
│       └── test-utils.ts
├── benchmarks/
│   ├── comparison.ts           # JSON vs CJSON comparison
│   ├── performance.ts          # Speed benchmarks
│   └── token-count.ts          # Token count analysis
├── examples/
│   ├── basic.ts
│   ├── arrays.ts
│   ├── nested.ts
│   └── llm-integration.ts
├── docs/
│   ├── API.md                  # Complete API documentation
│   ├── SPEC.md                 # Format specification
│   ├── EXAMPLES.md             # Usage examples
│   └── CONTRIBUTING.md         # Contribution guidelines
├── scripts/
│   ├── build.ts                # Build script
│   ├── test.ts                 # Test runner
│   └── benchmark.ts            # Benchmark runner
├── .editorconfig
├── .eslintrc.js
├── .gitignore
├── .prettierrc
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── vitest.config.ts
├── README.md
└── DESIGN_DOCUMENT.md
```

## File Descriptions

### Source Files (`src/`)

#### `parser/`
- **tokenizer.ts**: Converts input string into tokens
- **parser.ts**: Parses tokens into Abstract Syntax Tree (AST)
- **types.ts**: TypeScript types for tokens and parsing context

#### `encoder/`
- **encoder.ts**: Converts JavaScript objects to CJSON format
- **formatter.ts**: Formats AST nodes into CJSON strings
- **utils.ts**: Helper functions for encoding (quoting, escaping, etc.)

#### `validator/`
- **validator.ts**: Validates AST structure and types
- **types.ts**: Validation result types

#### `ast/`
- **nodes.ts**: AST node type definitions
- **builder.ts**: Utilities for building AST nodes

#### `errors/`
- **errors.ts**: Custom error classes (ParseError, EncodeError, etc.)

#### `utils/`
- **string.ts**: String manipulation utilities
- **types.ts**: Type checking and inference utilities

#### `core.ts`
Main entry point with `encode()` and `decode()` functions

#### `index.ts`
Public API exports

### Test Files (`tests/`)

#### `unit/`
Unit tests for individual modules

#### `integration/`
Integration tests for full workflows

#### `fixtures/`
Test data files (JSON and CJSON)

#### `helpers/`
Test utilities and helpers

### Documentation (`docs/`)

- **API.md**: Complete API reference
- **SPEC.md**: Format specification
- **EXAMPLES.md**: Usage examples
- **CONTRIBUTING.md**: Development guidelines

### Configuration Files

- **package.json**: NPM package configuration
- **tsconfig.json**: TypeScript configuration
- **vitest.config.ts**: Test configuration
- **.eslintrc.js**: Linting rules
- **.prettierrc**: Code formatting rules

## Initial Setup Commands

```bash
# Initialize project
npm init -y

# Install dependencies
npm install -D typescript @types/node vitest eslint prettier

# Create directory structure
mkdir -p src/{parser,encoder,validator,ast,errors,utils}
mkdir -p tests/{unit,integration,fixtures,helpers}
mkdir -p {benchmarks,examples,docs,scripts}

# Initialize TypeScript
npx tsc --init

# Initialize Git
git init
```

## Package.json Template

```json
{
  "name": "cjson",
  "version": "0.1.0",
  "description": "Compact JSON - Token-efficient serialization for LLMs",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "benchmark": "tsx scripts/benchmark.ts",
    "lint": "eslint src/**/*.ts",
    "format": "prettier --write src/**/*.ts"
  },
  "keywords": [
    "json",
    "serialization",
    "llm",
    "token-efficient",
    "compact"
  ],
  "author": "",
  "license": "MIT"
}
```

## TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020"],
    "moduleResolution": "node",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

## Next Steps

1. Set up the directory structure
2. Initialize package.json and TypeScript
3. Create basic file skeletons
4. Start implementing Phase 1 (Core Parser)
5. Set up testing framework
6. Create initial documentation

