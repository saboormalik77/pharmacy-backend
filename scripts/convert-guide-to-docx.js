const path = require('path');
const { spawnSync } = require('child_process');

const mdPath = path.join(__dirname, '..', 'DEVELOPMENT_GUIDE_FCR_MODULES.md');
const outPath = path.join(__dirname, '..', 'DEVELOPMENT_GUIDE_FCR_MODULES.docx');

// Use pandoc so the output contains native DOCX text nodes (not altChunk HTML),
// which prevents blank documents in viewers that do not support altChunk.
const result = spawnSync(
  'pandoc',
  [mdPath, '-f', 'gfm', '-t', 'docx', '-o', outPath],
  { stdio: 'pipe', encoding: 'utf-8' }
);

if (result.error) {
  console.error('Failed to execute pandoc:', result.error.message);
  process.exit(1);
}

if (result.status !== 0) {
  console.error('Pandoc conversion failed.');
  if (result.stderr) {
    console.error(result.stderr);
  }
  process.exit(result.status || 1);
}

console.log(`Created: ${outPath}`);
