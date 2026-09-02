import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const workflow = await readFile(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');
const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8');

assert.equal(packageJson.engines?.node, '>=22 <25');
assert.match(workflow, /node-version: \[22, 24\]/);
assert.match(workflow, /npm ci/);
assert.match(workflow, /npm run release:check/);
assert.match(workflow, /npm pack --dry-run/);
assert.match(readme, /Requires Node\.js 22 or 24\./);

console.log('Node support policy is consistent across package metadata, CI, and README.');
