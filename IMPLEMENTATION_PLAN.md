# Implementation Plan: Compact JSON (CJSON)

This document provides a detailed, step-by-step implementation plan for building the CJSON library. This plan is designed to be LLM-friendly with clear, actionable tasks and specific implementation details.

## Overview

The implementation is divided into 5 phases over 8 weeks. Each phase builds upon the previous one, with clear deliverables and success criteria. The plan focuses on incremental development with testing at each stage.

## Phase 1: Core Parser (Week 1-2)

### Objective
Build the foundational parsing infrastructure that can tokenize and parse basic CJSON structures.

### Tasks

#### Task 1.1: Project Setup
- Initialize npm project with package.json
- Set up TypeScript configuration (tsconfig.json)
- Create directory structure: src/parser, src/ast, src/errors, tests/
- Install development dependencies: typescript, vitest, @types/node
- Create .gitignore file
- Set up basic test configuration (vitest.config.ts)

#### Task 1.2: Define Core Types
**File: src/ast/nodes.ts**
- Define ASTNode union type (ObjectNode | ArrayNode | PrimitiveNode | NullNode)
- Define ObjectNode interface with properties map, line, column
- Define ArrayNode interface with items array, format type, line, column
- Define PrimitiveNode interface with value, type, quoted flag, line, column
- Define NullNode interface with null value, line, column
- Export all types

**File: src/parser/types.ts**
- Define Token interface with type, value, line, column
- Define TokenType enum with all token types: KEY, VALUE, COLON, COMMA, DASH, BRACKET_OPEN, BRACKET_CLOSE, INDENT, COMMENT, NEWLINE, EOF
- Define ParseContext interface for tracking parsing state
- Export all types

**File: src/errors/errors.ts**
- Define base CJSONError class extending Error with line and column properties
- Define ParseError class extending CJSONError
- Define EncodeError class extending CJSONError
- Define ValidationError class extending CJSONError
- Export all error classes

#### Task 1.3: Implement Tokenizer
**File: src/parser/tokenizer.ts**
- Create tokenize function that takes input string and returns Token array
- Implement character-by-character scanning
- Handle newlines: increment line counter, reset column to 1, create NEWLINE token
- Handle colons: create COLON token
- Handle commas: create COMMA token
- Handle dashes: create DASH token
- Handle brackets: create BRACKET_OPEN or BRACKET_CLOSE token
- Handle hash for comments: read until newline, create COMMENT token
- Handle whitespace: track indentation, create INDENT tokens
- Handle quoted strings: read until closing quote, handle escapes, create VALUE token
- Handle unquoted values: read until special character or whitespace, create VALUE or KEY token
- Track line and column numbers for each token
- Add EOF token at end
- Handle edge cases: empty input, only whitespace, unterminated strings

**Test Cases:**
- Empty string returns EOF token only
- Simple key-value pair produces KEY, COLON, VALUE tokens
- Quoted strings with special characters
- Comments are tokenized correctly
- Indentation is tracked correctly

#### Task 1.4: Implement Basic Parser
**File: src/parser/parser.ts**
- Create parse function that takes input string and returns ASTNode
- Call tokenizer to get tokens
- Implement parseValue function: handle primitives (string, number, boolean, null)
- Implement parseObject function: parse key-value pairs, handle indentation for nesting
- Implement parseArray function: parse inline arrays [item1, item2], handle brackets
- Track current indentation level
- Handle errors: throw ParseError with line/column information
- Return root AST node

**Test Cases:**
- Parse simple object: name: Alice
- Parse nested object with indentation
- Parse array of primitives: [1, 2, 3]
- Parse object with multiple properties
- Error handling for invalid syntax

#### Task 1.5: Create AST Builder Utilities
**File: src/ast/builder.ts**
- Create helper functions to build AST nodes
- buildObjectNode function: create ObjectNode from properties map
- buildArrayNode function: create ArrayNode from items array
- buildPrimitiveNode function: create PrimitiveNode with type inference
- buildNullNode function: create NullNode
- All builders include line/column information

### Deliverables
- Complete tokenizer implementation
- Basic parser for objects and simple arrays
- AST node type definitions
- Error classes
- Basic test suite with 10+ test cases

### Success Criteria
- Can parse simple objects with key-value pairs
- Can parse nested objects using indentation
- Can parse arrays of primitives in inline format
- Error messages include line and column numbers
- All tests pass

## Phase 2: Array Support (Week 3)

### Objective
Extend parser to handle all array formats: inline, multi-line, and compact tabular format.

### Tasks

#### Task 2.1: Enhance Array Parsing
**File: src/parser/parser.ts**
- Extend parseArray function to detect array format
- Detect inline format: [item1, item2, item3]
- Detect multi-line format: items starting with dash on separate lines
- Detect compact tabular format: key[N]: followed by rows
- Parse compact array header: extract key name and count
- Parse compact array rows: parse comma-separated key-value pairs
- Store array format in ArrayNode

#### Task 2.2: Implement Array Uniformity Detection
**File: src/parser/utils.ts**
- Create checkArrayUniformity function
- Check if all items in array are objects
- Check if all objects have same keys
- Return boolean indicating uniformity
- Handle edge cases: empty array, single item, mixed types

#### Task 2.3: Enhance Tokenizer for Arrays
**File: src/parser/tokenizer.ts**
- Improve handling of brackets in arrays
- Detect array length notation: [N] pattern
- Handle compact array row parsing
- Better handling of commas in compact format

#### Task 2.4: Add Array Tests
**File: tests/parser.test.ts**
- Test inline array parsing
- Test multi-line array parsing
- Test compact tabular array parsing
- Test array uniformity detection
- Test mixed array formats
- Test edge cases: empty arrays, single item arrays

### Deliverables
- Enhanced parser supporting all array formats
- Array uniformity detection
- Comprehensive array parsing tests

### Success Criteria
- Can parse inline arrays: [1, 2, 3]
- Can parse multi-line arrays with dash markers
- Can parse compact tabular arrays: users[3]: followed by rows
- Correctly detects uniform vs non-uniform arrays
- All array format tests pass

## Phase 3: Encoder (Week 4-5)

### Objective
Build encoder that converts JavaScript objects to CJSON format with optimal formatting.

### Tasks

#### Task 3.1: Implement Core Encoding Functions
**File: src/encoder/encoder.ts**
- Create encode function: main entry point, takes value and options
- Create encodeValue function: dispatches based on value type
- Create encodeObject function: encodes objects with indentation
- Create encodeArray function: chooses best array format
- Create encodeString function: handles quoting and escaping
- Create encodeNumber function: converts number to string
- Create encodeBoolean function: converts to "true" or "false"
- Create encodeNull function: returns "null"

#### Task 3.2: Implement String Quoting Logic
**File: src/encoder/utils.ts**
- Create needsQuoting function: checks if string needs quotes
- Check for special characters: comma, colon, brackets, quotes, newlines
- Check for leading/trailing whitespace
- Check for numeric strings that could be confused with numbers
- Create escapeString function: escapes quotes and special characters
- Handle quote strategy: auto, always, never

#### Task 3.3: Implement Array Format Selection
**File: src/encoder/encoder.ts**
- In encodeArray function, implement format selection logic
- Check if array is empty: return "[]"
- Check if array of primitives: use inline if <= threshold, else multi-line
- Check if array of objects: check uniformity
- If uniform: use compact tabular format
- If non-uniform: use multi-line format with dash markers
- Respect compactArrays option

#### Task 3.4: Implement Compact Array Encoding
**File: src/encoder/encoder.ts**
- Create encodeCompactArray function
- Extract keys from first object
- Format header: key[N]: where N is array length
- Format each row: key: value, key: value format
- Handle indentation correctly
- Handle quoting of values

#### Task 3.5: Implement Formatter
**File: src/encoder/formatter.ts**
- Create format function: formats AST to string
- Create indent function: generates indentation string
- Create formatObject function: formats object with proper indentation
- Create formatArray function: formats array based on format type
- Handle consistent spacing and line breaks

#### Task 3.6: Add Encoding Tests
**File: tests/encoder.test.ts**
- Test encoding simple objects
- Test encoding nested objects
- Test encoding arrays of primitives (inline and multi-line)
- Test encoding arrays of objects (compact and multi-line)
- Test string quoting logic
- Test indentation options
- Test all encoding options

### Deliverables
- Complete encoder implementation
- String quoting and escaping
- Array format selection
- Formatter for consistent output
- Comprehensive encoding tests

### Success Criteria
- Can encode all JavaScript value types
- Chooses optimal array format automatically
- Properly quotes strings when needed
- Respects all encoding options
- Output is properly formatted and indented
- All encoding tests pass

## Phase 4: Advanced Features (Week 6)

### Objective
Add advanced features: comments, validation, enhanced error handling, and options support.

### Tasks

#### Task 4.1: Implement Comment Support
**File: src/parser/parser.ts**
- Extend parser to handle COMMENT tokens
- Store comments in AST nodes (optional field)
- Preserve comments during parsing
- Handle inline comments: value # comment
- Handle standalone comments: # comment on its own line

**File: src/encoder/encoder.ts**
- Add comment preservation in encoding
- Format comments correctly in output
- Handle comment option: preserve or strip

#### Task 4.2: Implement Validator
**File: src/validator/validator.ts**
- Create validate function: takes AST and returns ValidationResult
- Validate object structure: check for required properties
- Validate array structure: check uniformity if needed
- Validate types: ensure types match expected
- Create checkArrayUniformity function for validation
- Create checkTypes function: validate primitive types
- Return detailed validation errors

#### Task 4.3: Enhance Error Handling
**File: src/errors/errors.ts**
- Enhance error messages with more context
- Add error codes for different error types
- Include expected vs actual in error messages
- Add error recovery suggestions where possible

**File: src/parser/parser.ts**
- Improve error messages in parser
- Add context about what was being parsed
- Include suggestions for fixing errors

**File: src/encoder/encoder.ts**
- Add error handling for unsupported types
- Provide clear error messages for encoding failures

#### Task 4.4: Implement Options Handling
**File: src/core/types.ts**
- Define EncodeOptions interface with all options
- Define DecodeOptions interface with all options
- Define ParseOptions interface with all options
- Export all option types

**File: src/core/core.ts**
- Implement options merging with defaults
- Validate option values
- Apply options throughout encoding/decoding

#### Task 4.5: Add Advanced Feature Tests
**File: tests/validator.test.ts**
- Test validation of valid structures
- Test validation error detection
- Test array uniformity validation
- Test type validation

**File: tests/comments.test.ts**
- Test comment parsing
- Test comment preservation
- Test comment encoding
- Test inline vs standalone comments

### Deliverables
- Comment support in parser and encoder
- Validation system
- Enhanced error handling
- Complete options support
- Tests for all advanced features

### Success Criteria
- Can parse and preserve comments
- Validator catches structural errors
- Error messages are clear and helpful
- All options work correctly
- All advanced feature tests pass

## Phase 5: Optimization & Polish (Week 7-8)

### Objective
Optimize performance, handle edge cases, complete documentation, and prepare for release.

### Tasks

#### Task 5.1: Performance Optimization
**File: src/parser/tokenizer.ts**
- Optimize tokenization: reduce allocations
- Use string indexing efficiently
- Minimize regex usage where possible

**File: src/parser/parser.ts**
- Optimize parsing: reduce AST node creation overhead
- Cache frequently used values
- Optimize indentation tracking

**File: src/encoder/encoder.ts**
- Optimize encoding: use string builders efficiently
- Minimize string concatenation
- Cache formatting strings

**File: benchmarks/performance.ts**
- Create performance benchmarks
- Compare parsing speed vs JSON
- Compare encoding speed vs JSON
- Measure memory usage
- Target: < 1ms per KB for parsing and encoding

#### Task 5.2: Edge Case Handling
**File: src/parser/parser.ts**
- Handle empty objects: {}
- Handle empty arrays: []
- Handle null values correctly
- Handle very long strings
- Handle very deep nesting (10+ levels)
- Handle special characters in all contexts
- Handle unicode characters

**File: src/encoder/encoder.ts**
- Handle circular references (error gracefully)
- Handle undefined values (convert to null or error)
- Handle functions (error gracefully)
- Handle symbols (error gracefully)
- Handle dates (convert to ISO string)
- Handle all edge cases from design document

#### Task 5.3: Comprehensive Testing
**File: tests/integration.test.ts**
- Round-trip tests: encode then decode, compare
- Complex nested structure tests
- Large array tests (1000+ items)
- Real-world example tests
- Fuzz testing with random data

**File: tests/edge-cases.test.ts**
- Empty structure tests
- Null value tests
- Special character tests
- Unicode tests
- Deep nesting tests
- Large data tests

#### Task 5.4: Documentation
**File: docs/API.md**
- Document all public functions
- Document all options
- Include usage examples
- Document error types

**File: docs/SPEC.md**
- Complete format specification
- All syntax rules
- Examples for each feature
- Comparison with JSON/TOON

**File: README.md**
- Project overview
- Quick start guide
- Installation instructions
- Basic usage examples
- Links to detailed docs

#### Task 5.5: Final Polish
- Code review and refactoring
- Ensure consistent code style
- Add JSDoc comments to all public functions
- Create examples in examples/ directory
- Set up CI/CD pipeline
- Prepare for npm publish

### Deliverables
- Optimized implementation meeting performance targets
- Comprehensive test suite with >95% coverage
- Complete documentation
- Examples and usage guides
- CI/CD pipeline
- Ready for release

### Success Criteria
- Parsing speed < 1ms per KB
- Encoding speed < 1ms per KB
- Test coverage > 95%
- All edge cases handled
- Documentation is complete
- Code is production-ready

## Implementation Guidelines

### Code Style
- Use TypeScript strict mode
- Follow consistent naming conventions
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions focused and small

### Testing
- Write tests before or alongside implementation
- Test happy paths and error cases
- Test edge cases explicitly
- Aim for high test coverage
- Use descriptive test names

### Error Handling
- Always include line and column in errors
- Provide clear, actionable error messages
- Handle all edge cases gracefully
- Never throw generic errors

### Performance
- Profile before optimizing
- Focus on hot paths
- Minimize allocations
- Use efficient data structures
- Benchmark regularly

### Documentation
- Document all public APIs
- Include usage examples
- Keep docs up to date with code
- Write clear, concise documentation

## File Structure Reference

```
src/
├── parser/
│   ├── tokenizer.ts      # Tokenization logic
│   ├── parser.ts         # Parsing logic
│   ├── types.ts          # Parser types
│   └── utils.ts          # Parser utilities
├── encoder/
│   ├── encoder.ts        # Encoding logic
│   ├── formatter.ts      # Formatting logic
│   └── utils.ts          # Encoding utilities
├── validator/
│   ├── validator.ts      # Validation logic
│   └── types.ts          # Validation types
├── ast/
│   ├── nodes.ts          # AST node definitions
│   └── builder.ts        # AST builder utilities
├── errors/
│   └── errors.ts         # Error classes
├── utils/
│   ├── string.ts         # String utilities
│   └── types.ts          # Type utilities
├── core.ts               # Main encode/decode functions
├── types.ts              # Public type definitions
└── index.ts              # Public API exports

tests/
├── unit/
│   ├── parser.test.ts
│   ├── encoder.test.ts
│   ├── validator.test.ts
│   └── utils.test.ts
├── integration/
│   ├── roundtrip.test.ts
│   ├── complex.test.ts
│   └── edge-cases.test.ts
└── helpers/
    └── test-utils.ts
```

## Key Implementation Details

### Tokenization Strategy
- Character-by-character scanning
- State machine for quoted strings
- Track line/column for error reporting
- Handle all special characters correctly

### Parsing Strategy
- Recursive descent parser
- Track indentation levels
- Build AST incrementally
- Validate as we parse

### Encoding Strategy
- Recursive encoding based on value type
- Format selection for arrays
- Quoting decision for strings
- Indentation management

### Error Handling Strategy
- Always include position information
- Provide context in error messages
- Suggest fixes where possible
- Never lose error information

## Success Metrics

- Token reduction: 40-70% vs JSON (measured)
- Parsing speed: < 1ms per KB
- Encoding speed: < 1ms per KB
- Test coverage: > 95%
- Zero runtime dependencies
- All tests passing
- Documentation complete

## Next Steps After Implementation

1. Performance benchmarking
2. Real-world usage testing
3. Community feedback collection
4. Iterative improvements
5. Additional language bindings (future)

---

This implementation plan provides a clear roadmap for building CJSON. Follow each phase sequentially, ensuring all deliverables are complete before moving to the next phase. Test thoroughly at each stage to catch issues early.

