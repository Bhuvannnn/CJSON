# Design Document: Compact JSON (CJSON)
## A Simplified Token-Efficient Serialization Format for LLMs

---

## 1. Executive Summary

### 1.1 Project Overview
**Compact JSON (CJSON)** is a lightweight, human-readable serialization format designed specifically for efficient data transmission to Large Language Models (LLMs). Unlike TOON's tabular approach, CJSON focuses on a simplified, line-oriented format that reduces token count by 40-70% compared to standard JSON while maintaining readability and ease of parsing.

### 1.2 Core Philosophy
- **Simplicity First**: Easier to parse and generate than TOON
- **Token Efficiency**: Optimized for LLM tokenizers
- **Human Readable**: Natural, intuitive syntax
- **Minimal Overhead**: No complex delimiters or headers

### 1.3 Key Differentiators from TOON
| Feature | TOON | CJSON (This Project) |
|---------|------|----------------------|
| Array Format | Tabular with headers `[N]{fields}` | Line-oriented with type inference |
| Delimiters | Configurable (comma, tab, pipe) | Fixed comma (simpler) |
| Nesting | Indentation-based | Indentation + prefix markers |
| Complexity | Medium (headers, delimiters) | Low (minimal syntax) |
| Use Case | Large uniform tables | General-purpose compact JSON |

---

## 2. Format Specification

### 2.1 Basic Syntax Rules

#### 2.1.1 Objects
- Key-value pairs: `key: value`
- Nested objects use indentation (2 spaces per level)
- No braces or commas needed
- Trailing colons for objects with children

**Example:**
```
name: Alice
age: 30
address:
  city: New York
  zip: 10001
```

#### 2.1.2 Arrays
- Arrays of primitives: `key: [value1, value2, value3]` or multi-line
- Arrays of objects: Each object on separate line with `-` prefix
- Arrays of primitives (multi-line): Each item on separate line with `-` prefix

**Examples:**
```
tags: [python, javascript, typescript]

# OR multi-line
tags:
  - python
  - javascript
  - typescript

# Array of objects
users:
  - id: 1
    name: Alice
    role: admin
  - id: 2
    name: Bob
    role: user
```

#### 2.1.3 Primitives
- **Strings**: Unquoted unless containing special characters (comma, colon, brackets, quotes)
- **Numbers**: Unquoted (integers and floats)
- **Booleans**: `true`, `false` (lowercase)
- **Null**: `null` (lowercase)
- **Quoted strings**: Use double quotes when needed: `"Hello, world"`

**Examples:**
```
name: Alice              # Unquoted string
age: 30                  # Number
active: true             # Boolean
note: "Hello, world"     # Quoted (contains comma)
empty: null              # Null value
```

#### 2.1.4 Special Characters
- **Comma** in strings: Requires quoting
- **Colon** in strings: Requires quoting
- **Brackets** in strings: Requires quoting
- **Quotes** in strings: Escape with `\"` or use single quotes

### 2.2 Advanced Features

#### 2.2.1 Compact Array Format (Uniform Objects)
For arrays of objects with identical keys, use a compact tabular format:

```
users[3]:
  id: 1, name: Alice, role: admin
  id: 2, name: Bob, role: user
  id: 3, name: Charlie, role: user
```

**Benefits:**
- Keys declared once in first row
- Subsequent rows only contain values
- Significant token savings for large arrays

#### 2.2.2 Inline Arrays
Small arrays can be inline:
```
tags: [python, javascript, typescript]
numbers: [1, 2, 3, 4, 5]
```

#### 2.2.3 Comments
Single-line comments using `#`:
```
# This is a comment
name: Alice  # Inline comment
```

#### 2.2.4 Empty Values
```
empty_array: []
empty_object:
null_value: null
```

---

## 3. Core Features

### 3.1 Token Efficiency Features

1. **No Redundant Punctuation**
   - No braces `{}` or brackets `[]` for simple structures
   - No quotes for simple strings
   - No commas between key-value pairs

2. **Compact Array Representation**
   - Tabular format for uniform object arrays
   - Inline arrays for small primitive arrays
   - Multi-line format for readability when needed

3. **Minimal Whitespace**
   - 2-space indentation (configurable)
   - No trailing spaces
   - No blank lines required

### 3.2 Human Readability Features

1. **YAML-like Syntax**
   - Familiar indentation-based structure
   - Natural key-value pairs
   - Easy to read and write

2. **Self-Documenting**
   - Structure is clear from indentation
   - No need for complex headers
   - Comments supported

3. **Error-Friendly**
   - Clear syntax errors
   - Easy to debug
   - Helpful error messages

### 3.3 LLM-Optimized Features

1. **Type Inference**
   - Numbers, booleans, nulls automatically detected
   - No type annotations needed
   - LLMs can easily infer types

2. **Consistent Formatting**
   - Deterministic output
   - Predictable structure
   - Easy for LLMs to generate

3. **Schema Awareness**
   - Structure implies schema
   - First object in array defines structure
   - LLMs can understand patterns

---

## 4. Implementation Design

### 4.1 Architecture Overview

```
┌─────────────────┐
│   CJSON Parser  │
│  (String → AST) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  AST Validator  │
│  (Type Check)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Object Builder │
│  (AST → Object) │
└─────────────────┘

┌─────────────────┐
│ CJSON Encoder   │
│ (Object → AST)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Formatter      │
│  (AST → String) │
└─────────────────┘
```

### 4.2 Core Components

#### 4.2.1 Parser (`parser.ts`)
**Responsibilities:**
- Tokenize input string
- Parse tokens into Abstract Syntax Tree (AST)
- Handle indentation tracking
- Detect array formats (inline, multi-line, tabular)

**Key Functions:**
- parse(input: string): ASTNode - Main parsing function
- tokenize(input: string): Token[] - Tokenize input string
- parseValue(token: Token, context: ParseContext): ValueNode - Parse a single value
- parseObject(tokens: Token[], indent: number): ObjectNode - Parse object structure
- parseArray(tokens: Token[], indent: number): ArrayNode - Parse array structure

**Token Types:**
- `KEY`: Object key
- `VALUE`: Primitive value
- `COLON`: Key-value separator
- `COMMA`: Value separator
- `DASH`: Array item marker
- `BRACKET_OPEN/CLOSE`: Array markers
- `INDENT`: Indentation level
- `COMMENT`: Comment marker

#### 4.2.2 Encoder (`encoder.ts`)
**Responsibilities:**
- Convert JavaScript objects to CJSON format
- Optimize output for token efficiency
- Choose best array format (inline vs multi-line vs tabular)
- Handle quoting and escaping

**Key Functions:**
- encode(value: any, options?: EncodeOptions): string - Main encoding function
- encodeObject(obj: object, indent: number): string - Encode object structure
- encodeArray(arr: any[], indent: number): string - Encode array structure
- encodeValue(value: any): string - Encode primitive value
- needsQuoting(str: string): boolean - Check if string needs quotes
- escapeString(str: string): string - Escape special characters in strings

**Encoding Strategy:**
1. **Objects**: Always multi-line with indentation
2. **Arrays of Primitives**: 
   - ≤ 3 items: Inline format
   - > 3 items: Multi-line format
3. **Arrays of Objects**:
   - Check if uniform (same keys)
   - Uniform: Use compact tabular format
   - Non-uniform: Use multi-line format

#### 4.2.3 Validator (`validator.ts`)
**Responsibilities:**
- Validate AST structure
- Type checking
- Array uniformity checking
- Error reporting

**Key Functions:**
- validate(ast: ASTNode): ValidationResult - Validate AST structure
- checkArrayUniformity(arr: ArrayNode): boolean - Check if array has uniform structure
- checkTypes(node: ASTNode): TypeCheckResult - Validate types in AST

#### 4.2.4 Formatter (`formatter.ts`)
**Responsibilities:**
- Format output string
- Consistent indentation
- Line breaks
- Spacing

**Key Functions:**
- format(ast: ASTNode, options?: FormatOptions): string - Format AST to string
- indent(level: number): string - Generate indentation string
- formatObject(obj: ObjectNode, indent: number): string - Format object node
- formatArray(arr: ArrayNode, indent: number): string - Format array node

### 4.3 Data Structures

#### 4.3.1 AST Node Types

AST nodes represent the parsed structure of CJSON data. The main node types are:

- **ObjectNode**: Represents an object with properties. Contains a map of property names to AST nodes, and line/column position information.

- **ArrayNode**: Represents an array. Contains an array of item nodes, format type (inline, multiline, or tabular), and position information.

- **PrimitiveNode**: Represents primitive values (string, number, boolean). Contains the value, whether it was quoted in source, and position information.

- **NullNode**: Represents null values. Contains null value and position information.

#### 4.3.2 Token Structure

Tokens represent the smallest units of CJSON syntax. Each token has:
- Type: The token type (KEY, VALUE, COLON, COMMA, DASH, BRACKET_OPEN, BRACKET_CLOSE, INDENT, COMMENT, NEWLINE, EOF)
- Value: The string value of the token
- Line: Line number in source
- Column: Column number in source

Token types include: KEY (object keys), VALUE (primitive values), COLON (key-value separator), COMMA (value separator), DASH (array item marker), BRACKET_OPEN/CLOSE (array markers), INDENT (indentation), COMMENT (comments), NEWLINE (line breaks), and EOF (end of file).

---

## 5. API Design

### 5.1 Public API

#### 5.1.1 Core Functions

- encode(value: any, options?: EncodeOptions): string - Encode JavaScript value to CJSON string
- decode(input: string, options?: DecodeOptions): any - Decode CJSON string to JavaScript value
- parse(input: string, options?: ParseOptions): ASTNode - Parse CJSON string to AST (advanced)
- astToValue(ast: ASTNode): any - Convert AST to JavaScript value (advanced)

#### 5.1.2 Options Interfaces

**EncodeOptions:**
- indent?: number - Spaces per indent level (default: 2)
- inlineThreshold?: number - Max items for inline arrays (default: 3)
- compactArrays?: boolean - Use compact format for uniform arrays (default: true)
- quoteStrings?: 'auto' | 'always' | 'never' - Quoting strategy (default: 'auto')
- comments?: boolean - Preserve comments (default: false)

**DecodeOptions:**
- strict?: boolean - Strict validation (default: true)
- allowComments?: boolean - Allow comments (default: true)
- preserveTypes?: boolean - Preserve type information (default: false)

**ParseOptions:**
- strict?: boolean - Strict parsing (default: true)
- allowComments?: boolean - Allow comments (default: true)

### 5.2 Usage Examples

#### 5.2.1 Basic Encoding

The encode function converts JavaScript objects to CJSON format. For a simple object with nested structures, it produces indented key-value pairs. Arrays of primitives are encoded inline if small, or multi-line if larger.

#### 5.2.2 Array Encoding

Arrays of uniform objects can be encoded in compact tabular format when compactArrays option is enabled. This format lists the array length in brackets, then each object's key-value pairs on separate lines.

#### 5.2.3 Custom Options

The encode function accepts options to customize indentation, inline array thresholds, compact array usage, and string quoting strategy.

---

## 6. Comparison with JSON and TOON

### 6.1 Token Count Comparison

**Example Data:**
```javascript
{
  "users": [
    { "id": 1, "name": "Alice", "role": "admin" },
    { "id": 2, "name": "Bob", "role": "user" },
    { "id": 3, "name": "Charlie", "role": "user" }
  ],
  "count": 3
}
```

**JSON (78 tokens):**
```json
{
  "users": [
    { "id": 1, "name": "Alice", "role": "admin" },
    { "id": 2, "name": "Bob", "role": "user" },
    { "id": 3, "name": "Charlie", "role": "user" }
  ],
  "count": 3
}
```

**TOON (45 tokens):**
```
users[3]{id,name,role}:
  1,Alice,admin
  2,Bob,user
  3,Charlie,user
count: 3
```

**CJSON (42 tokens):**
```
users[3]:
  id: 1, name: Alice, role: admin
  id: 2, name: Bob, role: user
  id: 3, name: Charlie, role: user
count: 3
```

**Savings:**
- vs JSON: ~46% reduction
- vs TOON: ~7% reduction (slightly better)

### 6.2 Feature Comparison

| Feature | JSON | TOON | CJSON |
|---------|------|------|-------|
| Token Efficiency | Baseline | 30-60% better | 40-70% better |
| Human Readable | Medium | High | High |
| Parsing Complexity | Low | Medium | Low |
| Array Format | Verbose | Tabular | Line-oriented |
| Nesting Support | Full | Full | Full |
| Type Safety | Runtime | Runtime | Runtime |
| Comments | No | No | Yes |
| Schema Awareness | No | Yes | Implicit |

### 6.3 Use Case Suitability

**JSON Best For:**
- APIs and data exchange
- Complex nested structures
- When compatibility is critical

**TOON Best For:**
- Large uniform tables
- When explicit headers help
- When delimiter flexibility matters

**CJSON Best For:**
- General LLM interactions
- When simplicity matters
- When comments are needed
- When you want easier parsing

---

## 7. Implementation Roadmap

### 7.1 Phase 1: Core Parser (Week 1-2)
**Goals:**
- Basic tokenizer
- Simple object parsing
- Primitive value parsing
- Error handling

**Deliverables:**
- `tokenizer.ts` - Tokenize input string
- `parser.ts` - Parse tokens to AST
- Basic test suite

**Success Criteria:**
- Parse simple objects
- Parse primitive values
- Handle basic errors

### 7.2 Phase 2: Array Support (Week 3)
**Goals:**
- Inline array parsing
- Multi-line array parsing
- Compact tabular array parsing
- Array uniformity detection

**Deliverables:**
- Enhanced `parser.ts` with array support
- Array format detection logic
- Array parsing tests

**Success Criteria:**
- Parse all array formats
- Detect uniform arrays
- Handle mixed arrays

### 7.3 Phase 3: Encoder (Week 4-5)
**Goals:**
- Object encoding
- Array encoding with format selection
- Quoting logic
- Indentation handling

**Deliverables:**
- `encoder.ts` - Encode objects to CJSON
- Format selection logic
- Encoding tests

**Success Criteria:**
- Encode all data types
- Choose optimal array format
- Proper quoting and escaping

### 7.4 Phase 4: Advanced Features (Week 6)
**Goals:**
- Comment support
- Validation
- Error messages
- Options handling

**Deliverables:**
- `validator.ts` - Validation logic
- Comment parsing
- Enhanced error messages
- Options implementation

**Success Criteria:**
- Parse and preserve comments
- Validate structure
- Clear error messages

### 7.5 Phase 5: Optimization & Polish (Week 7-8)
**Goals:**
- Performance optimization
- Edge case handling
- Documentation
- Examples

**Deliverables:**
- Performance benchmarks
- Comprehensive test suite
- API documentation
- Usage examples
- README

**Success Criteria:**
- Fast parsing/encoding
- 100% test coverage
- Complete documentation

---

## 8. Technical Specifications

### 8.1 Language & Runtime
- **Language**: TypeScript
- **Runtime**: Node.js 18+
- **Target**: ES2020
- **Module System**: ESM + CJS

### 8.2 Dependencies
- **Development**:
  - TypeScript 5.x
  - Vitest (testing)
  - ESLint (linting)
  - Prettier (formatting)
- **Production**: None (zero dependencies)

### 8.3 Project Structure
```
cjson/
├── src/
│   ├── parser/
│   │   ├── tokenizer.ts      # Tokenize input
│   │   ├── parser.ts         # Parse tokens to AST
│   │   └── types.ts          # Token and AST types
│   ├── encoder/
│   │   ├── encoder.ts        # Encode objects to CJSON
│   │   ├── formatter.ts      # Format output
│   │   └── utils.ts          # Encoding utilities
│   ├── validator/
│   │   └── validator.ts      # Validation logic
│   ├── ast/
│   │   └── nodes.ts          # AST node definitions
│   ├── errors/
│   │   └── errors.ts         # Error classes
│   └── index.ts              # Public API
├── tests/
│   ├── parser.test.ts
│   ├── encoder.test.ts
│   ├── validator.test.ts
│   └── integration.test.ts
├── benchmarks/
│   └── comparison.ts          # Performance benchmarks
├── examples/
│   ├── basic.ts
│   ├── arrays.ts
│   └── advanced.ts
├── docs/
│   ├── API.md
│   ├── SPEC.md
│   └── EXAMPLES.md
├── package.json
├── tsconfig.json
└── README.md
```

### 8.4 Performance Targets
- **Parsing**: < 1ms for 1KB input
- **Encoding**: < 1ms for 1KB output
- **Memory**: < 2x input size
- **Token Reduction**: 40-70% vs JSON

### 8.5 Error Handling

Error classes extend a base CJSONError class that includes line and column information. Specific error types include:
- ParseError: Errors during parsing
- EncodeError: Errors during encoding
- ValidationError: Errors during validation

Error messages include the error type, a descriptive message, and the line and column where the error occurred. The format shows what was expected versus what was found.

---

## 9. Testing Strategy

### 9.1 Unit Tests
- **Parser Tests**:
  - Object parsing
  - Array parsing (all formats)
  - Primitive parsing
  - Error cases
  - Edge cases (empty, null, special chars)

- **Encoder Tests**:
  - Object encoding
  - Array encoding (format selection)
  - Quoting logic
  - Indentation
  - Options handling

- **Validator Tests**:
  - Structure validation
  - Type validation
  - Array uniformity
  - Error reporting

### 9.2 Integration Tests
- Round-trip encoding/decoding
- Complex nested structures
- Large arrays
- Real-world examples

### 9.3 Performance Tests
- Parsing speed benchmarks
- Encoding speed benchmarks
- Memory usage tests
- Token count comparisons

### 9.4 Test Data
- Simple objects
- Nested objects
- Arrays of primitives
- Arrays of objects (uniform and mixed)
- Edge cases (empty, null, special chars)
- Large datasets (1000+ items)

---

## 10. Documentation Requirements

### 10.1 README.md
- Project overview
- Quick start guide
- Basic examples
- Installation instructions
- API reference link

### 10.2 SPEC.md
- Complete format specification
- Syntax rules
- Examples for each feature
- Comparison with JSON/TOON

### 10.3 API.md
- Complete API documentation
- All functions and options
- Type definitions
- Usage examples

### 10.4 EXAMPLES.md
- Real-world examples
- Common patterns
- Best practices
- LLM integration examples

### 10.5 CONTRIBUTING.md
- Development setup
- Code style guide
- Testing guidelines
- Pull request process

---

## 12. Edge Cases & Special Considerations

### 12.1 Edge Cases to Handle

1. **Empty Structures**
   - Empty objects: `{}` → `(empty or newline)`
   - Empty arrays: `[]` → `[]`
   - Null values: `null` → `null`

2. **Special Characters in Strings**
   - Commas: `"Hello, world"`
   - Colons: `"Time: 12:00"`
   - Quotes: `"He said \"Hello\""`
   - Newlines: `"Line 1\nLine 2"`

3. **Whitespace Handling**
   - Leading/trailing spaces in strings
   - Indentation consistency
   - Blank lines

4. **Type Ambiguity**
   - Numbers vs strings: `"123"` vs `123`
   - Booleans vs strings: `"true"` vs `true`
   - Null vs string: `"null"` vs `null`

5. **Large Data**
   - Very large arrays (1000+ items)
   - Deep nesting (10+ levels)
   - Very long strings

### 12.2 Performance Considerations

1. **Streaming Parser** (Future)
   - For very large files
   - Parse incrementally
   - Lower memory usage

2. **Caching**
   - Cache parsed ASTs
   - Reuse formatters
   - Optimize repeated operations

3. **Memory Management**
   - Avoid deep copies
   - Use references where possible
   - Clean up temporary structures

---

## 13. Future Enhancements

### 13.1 Phase 2 Features (Post-MVP)

1. **Schema Support**
   - Optional schema definition
   - Schema validation
   - Type inference from schema

2. **Streaming API**
   - Stream parser for large files
   - Incremental encoding
   - Memory-efficient processing

3. **CLI Tool**
   - Convert JSON to CJSON
   - Convert CJSON to JSON
   - Format/validate CJSON files

4. **Language Bindings**
   - Python implementation
   - Rust implementation
   - Go implementation

5. **Editor Support**
   - VS Code extension
   - Syntax highlighting
   - Auto-formatting
   - Validation

6. **Advanced Features**
   - References/anchors (like YAML)
   - Custom types
   - Metadata support
   - Compression options

---

## 14. Success Metrics

### 14.1 Technical Metrics
- **Token Reduction**: 40-70% vs JSON (measured)
- **Parsing Speed**: < 1ms per KB
- **Encoding Speed**: < 1ms per KB
- **Test Coverage**: > 95%
- **Zero Dependencies**: Maintained

### 14.2 Quality Metrics
- **Error Rate**: < 0.1% on valid input
- **Compatibility**: 100% round-trip for valid JSON
- **Documentation**: Complete API docs
- **Examples**: 20+ usage examples

### 14.3 Adoption Metrics
- **GitHub Stars**: Target 100+ in first month
- **NPM Downloads**: Target 1000+ in first month
- **Community**: Active issues and PRs
- **Integrations**: Used in 5+ projects

---

## 15. Risk Assessment & Mitigation

### 15.1 Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Parsing ambiguity | High | Medium | Strict grammar, comprehensive tests |
| Performance issues | Medium | Low | Benchmark early, optimize hot paths |
| Edge case bugs | Medium | High | Extensive test suite, fuzzing |
| Token count not optimal | Low | Medium | Continuous benchmarking, optimization |

### 15.2 Project Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Scope creep | Medium | High | Strict phase boundaries, MVP focus |
| Documentation gaps | Low | Medium | Documentation as code, early reviews |
| Adoption challenges | Medium | Medium | Clear examples, good DX |

---

## 16. Conclusion

This design document outlines a comprehensive plan for building **Compact JSON (CJSON)**, a simplified, token-efficient serialization format optimized for LLM interactions. The project differentiates itself from TOON by:

1. **Simpler Syntax**: Line-oriented format without complex headers
2. **Easier Parsing**: Straightforward tokenization and parsing
3. **Comment Support**: Built-in comment handling
4. **Flexible Arrays**: Multiple array formats with automatic selection

The implementation plan is structured in 8 phases over 8 weeks, with clear deliverables and success criteria for each phase. The project maintains high quality through comprehensive testing, documentation, and performance optimization.

**Next Steps:**
1. Review and approve design document
2. Set up project structure
3. Begin Phase 1: Core Parser implementation
4. Establish CI/CD pipeline
5. Create initial documentation

---

## Appendix A: Grammar Specification (BNF-like)

```
cjson        := object | array | value
object       := (property newline)* property?
property     := key colon value | key colon object | key colon array
key          := identifier | quoted_string
value        := string | number | boolean | null | array | object
array        := bracket_open items? bracket_close
             | dash value (newline dash value)*
             | compact_array
compact_array := key bracket_open number bracket_close colon newline
                 (compact_row newline)* compact_row
compact_row  := (key colon value comma? space?)+
items        := value (comma space? value)*
string       := unquoted_string | quoted_string
unquoted_string := [^:,\[\]{}\n#]+
quoted_string := "([^"\\]|\\.)*"
number       := integer | float
boolean      := "true" | "false"
null         := "null"
identifier   := [a-zA-Z_][a-zA-Z0-9_]*
comment      := "#" [^\n]*
newline      := "\n" | "\r\n"
space        := " " | "\t"
indent       := (space space)*
```

---

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-XX  
**Author**: Development Team  
**Status**: Draft - Ready for Review

