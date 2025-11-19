import { performance } from 'node:perf_hooks';
import { encode, decode } from '../src';

interface BenchmarkResult {
  label: string;
  avgMs: number;
  sizeKB: number;
  msPerKB: number;
}

function generateSampleData(multiplier = 64) {
  const users = [];
  for (let i = 0; i < multiplier; i++) {
    users.push({
      id: i + 1,
      name: `User-${i + 1}`,
      email: `user${i + 1}@example.com`,
      roles: ['admin', 'editor', 'viewer'].slice(0, (i % 3) + 1),
      active: i % 2 === 0,
      stats: {
        score: i * 17,
        badges: Array.from({ length: 5 }, (_, idx) => `badge-${idx + i}`),
      },
    });
  }

  return {
    organization: 'CJSON Benchmarks',
    generatedAt: new Date().toISOString(),
    users,
  };
}

function measure(label: string, iterations: number, sizeKB: number, fn: () => void): BenchmarkResult {
  // Warm-up run
  fn();

  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const total = performance.now() - start;
  const avgMs = total / iterations;
  const msPerKB = avgMs / sizeKB;

  return { label, avgMs, sizeKB, msPerKB };
}

function bytesToKB(bytes: number): number {
  return bytes / 1024;
}

function logResult(result: BenchmarkResult): void {
  const size = result.sizeKB.toFixed(2);
  const avg = result.avgMs.toFixed(3);
  const perKB = result.msPerKB.toFixed(3);
  console.log(`${result.label.padEnd(12)} | size: ${size} KB | avg: ${avg} ms | ms/KB: ${perKB}`);
}

async function runBenchmarks(): Promise<void> {
  const iterations = Number(process.env.CJSON_BENCH_ITERS ?? 200);
  const sample = generateSampleData();

  // Measure encode
  const encodeResult = measure(
    'encode',
    iterations,
    bytesToKB(Buffer.byteLength(JSON.stringify(sample), 'utf8')),
    () => {
      encode(sample);
    },
  );

  // Prepare CJSON payload for decode benchmark
  const encodedPayload = encode(sample);
  const decodeResult = measure(
    'decode',
    iterations,
    bytesToKB(Buffer.byteLength(encodedPayload, 'utf8')),
    () => {
      decode(encodedPayload);
    },
  );

  console.log('CJSON Benchmarks (average per iteration)');
  console.log('----------------------------------------');
  logResult(encodeResult);
  logResult(decodeResult);
  console.log('\nTarget: < 1ms per KB for both encode and decode.');
}

runBenchmarks().catch((error) => {
  console.error('Benchmark failed:', error);
  process.exit(1);
});

