/**
 * Comprehensive integration tests covering encode/decode round-trips,
 * large payloads, and randomized data.
 */

import { describe, it, expect } from 'vitest';
import { encode, decode } from '../../src';

describe('Integration - Comprehensive scenarios', () => {
  it('should round-trip complex nested structures through encode/decode', () => {
    const payload = {
      organization: 'CJSON Org',
      active: true,
      metadata: {
        created: '2025-11-19T12:00:00.000Z',
        tags: ['parser', 'encoder', 'validator'],
        settings: {
          indent: 4,
          quoteMode: 'auto',
        },
      },
      projects: [
        {
          id: 1,
          name: 'Atlas',
          contributors: ['Ada', 'Grace', 'Linus'],
          milestones: [
            { name: 'MVP', done: true },
            { name: 'Beta', done: false },
          ],
        },
        {
          id: 2,
          name: 'Zephyr',
          contributors: ['Ken', 'Margaret'],
          milestones: [{ name: 'Design', done: true }],
        },
      ],
    };

    const encoded = encode(payload);
    const decoded = decode(encoded);
    expect(decoded).toEqual(payload);
  });

  it('should handle large arrays (1000 items) efficiently', () => {
    const largeArray = Array.from({ length: 1000 }, (_, index) => ({
      id: index + 1,
      label: `Item-${index + 1}`,
      value: index % 2 === 0,
    }));
    const payload = { largeArray };

    const encoded = encode(payload);
    const decoded = decode(encoded);

    expect(decoded).toEqual(payload);
    expect(encoded.length).toBeGreaterThan(0);
  });

  it('should encode/decode real-world style configuration objects', () => {
    const dashboardConfig = {
      version: 3,
      widgets: [
        {
          type: 'chart',
          title: 'Requests per Minute',
          options: {
            timeframe: '24h',
            stacked: true,
            thresholds: [
              { label: 'warning', value: 1200 },
              { label: 'critical', value: 1800 },
            ],
          },
        },
        {
          type: 'table',
          title: 'Active Sessions',
          columns: ['user', 'region', 'duration'],
          rows: [
            { user: 'alice', region: 'us-east', duration: 180 },
            { user: 'bob', region: 'eu-west', duration: 95 },
          ],
        },
      ],
      alerts: {
        email: ['ops@example.com'],
        sms: ['+15551239876'],
      },
    };

    const encoded = encode(dashboardConfig);
    const decoded = decode(encoded);
    expect(decoded).toEqual(dashboardConfig);
  });

  it('should succeed across randomized fuzz data', () => {
    const iterations = 25;
    for (let i = 0; i < iterations; i++) {
      const payload = generateRandomPayload();
      const encoded = encode(payload);
      const decoded = decode(encoded);
      expect(decoded).toEqual(payload);
    }
  });
});

function generateRandomPayload(): Record<string, unknown> {
  return generateRandomObjectValue(0);
}

function generateRandomValue(depth: number): unknown {
  if (depth > 3) {
    return randomPrimitive();
  }

  const choice = Math.random();
  if (choice < 0.4) {
    return randomPrimitive();
  }
  if (choice < 0.7) {
    return generateRandomArray(depth + 1);
  }
  return generateRandomObjectValue(depth + 1);
}

function generateRandomObjectValue(depth: number): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  const props = randomInt(1, 4);
  for (let i = 0; i < props; i++) {
    obj[`key${i}`] = generateRandomValue(depth + 1);
  }
  return obj;
}

function generateRandomArray(depth: number): unknown[] {
  const length = randomInt(1, 4);
  const items: unknown[] = [];
  const allowObjects = depth < 3;
  const useObjects = allowObjects && Math.random() < 0.5;

  for (let i = 0; i < length; i++) {
    if (useObjects) {
      items.push(generateRandomObjectValue(depth + 1));
    } else {
      items.push(randomPrimitive());
    }
  }

  return items;
}

function randomPrimitive(): string | number | boolean | null {
  const bucket = Math.random();
  if (bucket < 0.25) return null;
  if (bucket < 0.5) return randomInt(-1000, 1000);
  if (bucket < 0.75) return Math.random() < 0.5;
  return `value-${randomInt(0, 1000)}`;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

