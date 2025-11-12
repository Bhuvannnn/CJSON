# Compact JSON (CJSON) - Design Documentation

## Overview

This repository contains the complete design documentation for **Compact JSON (CJSON)**, a simplified, token-efficient serialization format designed for Large Language Model (LLM) interactions. CJSON is inspired by [TOON](https://github.com/toon-format/toon) but offers a simpler, more streamlined approach.

## What is CJSON?

**Compact JSON (CJSON)** is a human-readable serialization format that reduces token usage by 40-70% compared to standard JSON. It's specifically optimized for:

- **LLM Interactions**: Efficient data transmission to language models
- **Token Efficiency**: Significant reduction in token count
- **Human Readability**: Easy to read and write
- **Simplicity**: Simpler than TOON, easier to parse and generate

## Key Features

- 40-70% Token Reduction vs JSON
- Human Readable - YAML-like syntax
- Simple Parsing - Straightforward tokenization
- Comment Support - Built-in comments with hash symbol
- Flexible Arrays - Multiple formats (inline, multi-line, compact)
- Zero Dependencies - Lightweight implementation

## Documentation

This repository contains comprehensive design documentation:

### [DESIGN_DOCUMENT.md](./DESIGN_DOCUMENT.md)
Complete design specification including:
- Format specification
- Implementation details
- API design
- Architecture overview
- Testing strategy
- Development roadmap (8-week plan)
- Technical specifications

### [QUICK_START.md](./QUICK_START.md)
Quick reference guide with:
- Basic syntax examples
- API usage
- Common patterns
- Comparison examples

### [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)
Project organization guide:
- Directory structure
- File descriptions
- Setup instructions
- Configuration templates

## Quick Example

**JSON (78 tokens):**
```json
{
  "users": [
    { "id": 1, "name": "Alice", "role": "admin" },
    { "id": 2, "name": "Bob", "role": "user" }
  ],
  "count": 3
}
```

**CJSON (42 tokens, ~46% reduction):**
```
users[2]:
  id: 1, name: Alice, role: admin
  id: 2, name: Bob, role: user
count: 3
```

## Comparison with TOON

| Feature | TOON | CJSON |
|---------|------|-------|
| Array Format | `items[2]{id,name}:` | `items[2]:` |
| Syntax Complexity | Medium | Low |
| Parsing Difficulty | Medium | Low |
| Comments | No | Yes |
| Use Case | Large uniform tables | General-purpose |

## Project Status

- Design Phase - Complete
- Implementation - Not Started  

This repository currently contains the design documentation. Implementation will follow the 8-week roadmap outlined in the design document.

## Implementation Roadmap

1. **Phase 1** (Week 1-2): Core Parser
2. **Phase 2** (Week 3): Array Support
3. **Phase 3** (Week 4-5): Encoder
4. **Phase 4** (Week 6): Advanced Features
5. **Phase 5** (Week 7-8): Optimization & Polish

See [DESIGN_DOCUMENT.md](./DESIGN_DOCUMENT.md) for detailed roadmap.

## Getting Started

1. **Read the Design Document**: Start with [DESIGN_DOCUMENT.md](./DESIGN_DOCUMENT.md) for complete specifications
2. **Review Quick Start**: Check [QUICK_START.md](./QUICK_START.md) for syntax examples
3. **Set Up Project**: Follow [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) for project setup
4. **Begin Implementation**: Start with Phase 1: Core Parser

## Goals

- Create a simplified alternative to TOON
- Maintain token efficiency (40-70% reduction)
- Ensure easy parsing and generation
- Support comments and advanced features
- Provide comprehensive documentation

## License

This design documentation is provided as-is for reference and implementation purposes.

## References

- [TOON Format](https://github.com/toon-format/toon) - Original inspiration
- [TOON Specification](https://github.com/toon-format/spec) - Format specification

## Contributing

This is currently a design document repository. Once implementation begins, contributions will be welcome following the guidelines in the design document.

---

**Note**: This is a design document repository. The actual implementation will be created in a separate repository following these specifications.

