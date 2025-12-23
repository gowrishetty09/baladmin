const fs = require('fs');
const path = require('path');
const { SourceMapConsumer } = require('source-map');

const defaultMapCandidates = [
  path.resolve(
    'android',
    'app',
    'build',
    'intermediates',
    'sourcemaps',
    'react',
    'release',
    'index.android.bundle.combined.map'
  ),
  path.resolve(
    'android',
    'app',
    'build',
    'intermediates',
    'sourcemaps',
    'react',
    'release',
    'index.android.bundle.packager.map'
  ),
];

const mapPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : defaultMapCandidates.find((p) => fs.existsSync(p)) || defaultMapCandidates[0];

const positions = process.argv.slice(3);

function parsePos(text) {
  const m = String(text).match(/^(\d+):(\d+)$/);
  if (!m) return null;
  return { line: Number(m[1]), column: Number(m[2]) };
}

async function main() {
  const raw = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
  const consumer = await new SourceMapConsumer(raw);
  const defaultPositions = [
    '1:45513',
    '1:99480',
    '1:1236833',
    '1:1346171',
    '1:1434397',
    '1:1474252',
    '1:1480986',
  ];

  const toResolve = (positions.length ? positions : defaultPositions)
    .map(parsePos)
    .filter(Boolean);

  for (const p of toResolve) {
    const a = consumer.originalPositionFor({ line: p.line, column: p.column });
    const b = consumer.originalPositionFor({ line: p.line, column: Math.max(0, p.column - 1) });

    const best = a && a.source ? a : b;

    console.log(`\nGenerated ${p.line}:${p.column}`);
    console.log('Mapped    ', best);
  }

  if (typeof consumer.destroy === 'function') consumer.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
