import { parse, astToValue } from '../src';

const input = `
# Inventory snapshot
inventory[2]{name, qty}:
  name: bolts, qty: 150
  name: nuts, qty: 90
meta:
  location: Warehouse A
  audited: true
`;

const ast = parse(input.trim());
console.log('AST:', JSON.stringify(ast, null, 2));

const value = astToValue(ast);
console.log('\nAs plain JS:', value);

