import { encode, decode } from '../src';

const data = {
  name: 'Alice',
  age: 30,
  tags: ['developer', 'designer'],
  projects: [
    { name: 'Atlas', active: true },
    { name: 'Zephyr', active: false },
  ],
};

const cjson = encode(data);
console.log('Encoded CJSON:\n', cjson);

const roundTrip = decode(cjson);
console.log('\nDecoded object:', roundTrip);

