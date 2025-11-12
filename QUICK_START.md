# Quick Start Guide: Compact JSON (CJSON)

## Overview

**Compact JSON (CJSON)** is a token-efficient serialization format designed for LLM interactions. It reduces token count by 40-70% compared to JSON while maintaining readability.

## Key Differences from TOON

| Aspect | TOON | CJSON |
|--------|------|-------|
| Array Format | `items[2]{id,name}:` | `items[2]:` |
| Syntax | Tabular headers | Line-oriented |
| Complexity | Medium | Low |
| Comments | No | Yes (#) |

## Basic Syntax

### Objects
```cjson
name: Alice
age: 30
active: true
```

### Nested Objects
```cjson
user:
  name: Alice
  address:
    city: New York
    zip: 10001
```

### Arrays of Primitives
```cjson
tags: [python, javascript, typescript]

# OR multi-line
tags:
  - python
  - javascript
  - typescript
```

### Arrays of Objects
```cjson
users:
  - id: 1
    name: Alice
    role: admin
  - id: 2
    name: Bob
    role: user
```

### Compact Array Format (Uniform Objects)
```cjson
users[3]:
  id: 1, name: Alice, role: admin
  id: 2, name: Bob, role: user
  id: 3, name: Charlie, role: user
```

## API Usage

```typescript
import { encode, decode } from 'cjson'

// Encode
const data = {
  name: 'Alice',
  age: 30,
  tags: ['developer', 'designer']
}

const cjson = encode(data)
// name: Alice
// age: 30
// tags: [developer, designer]

// Decode
const decoded = decode(cjson)
// { name: 'Alice', age: 30, tags: ['developer', 'designer'] }
```

## Options

```typescript
// Encoding options
encode(data, {
  indent: 2,              // Indentation spaces (default: 2)
  inlineThreshold: 3,     // Max items for inline arrays (default: 3)
  compactArrays: true,    // Use compact format (default: true)
  quoteStrings: 'auto'    // 'auto' | 'always' | 'never'
})

// Decoding options
decode(cjson, {
  strict: true,           // Strict validation (default: true)
  allowComments: true     // Allow comments (default: true)
})
```

## Examples

### Example 1: Simple Object
**JSON:**
```json
{
  "name": "Alice",
  "age": 30
}
```

**CJSON:**
```
name: Alice
age: 30
```

**Token Savings:** ~50%

### Example 2: Array of Objects
**JSON:**
```json
{
  "users": [
    { "id": 1, "name": "Alice" },
    { "id": 2, "name": "Bob" }
  ]
}
```

**CJSON:**
```
users[2]:
  id: 1, name: Alice
  id: 2, name: Bob
```

**Token Savings:** ~45%

### Example 3: Complex Nested Structure
**JSON:**
```json
{
  "user": {
    "id": 1,
    "name": "Alice",
    "preferences": {
      "theme": "dark",
      "notifications": true
    }
  }
}
```

**CJSON:**
```
user:
  id: 1
  name: Alice
  preferences:
    theme: dark
    notifications: true
```

**Token Savings:** ~55%

## Comments

```cjson
# This is a comment
name: Alice  # Inline comment
age: 30
```

## Special Characters

Strings with special characters need quoting:

```cjson
note: "Hello, world"      # Contains comma
time: "12:00 PM"          # Contains colon
quote: "He said \"Hi\""   # Contains quotes
```

## Next Steps

1. Read the full [DESIGN_DOCUMENT.md](./DESIGN_DOCUMENT.md) for complete specifications
2. Check implementation roadmap in the design document
3. Review examples and test cases
4. Start with Phase 1: Core Parser implementation

