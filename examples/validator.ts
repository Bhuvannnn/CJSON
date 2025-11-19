import { parse, validate } from '../src';

const doc = `
user:
  name: Ada
  age: 35
  active: true
`;

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
            active: { type: 'boolean' },
          },
        },
      },
    },
  },
};

const ast = parse(doc.trim());
const result = validate(ast, schema);

if (result.valid) {
  console.log('Document is valid!');
} else {
  console.error('Validation errors:');
  for (const error of result.errors) {
    console.error(`- ${error.path}: ${error.message} (line ${error.line})`);
  }
}

