import { readdir, readFile } from 'node:fs/promises';
import { resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const graph = new Map();
async function scan(folder) {
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const file = resolve(folder, entry.name);
    if (entry.isDirectory()) await scan(file);
    else if (entry.name.endsWith('.js')) {
      const checked = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
      if (checked.status !== 0) throw new Error(checked.stderr);
      const content = await readFile(file, 'utf8');
      const imports = [...content.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)]
        .map((match) => match[1])
        .filter((specifier) => specifier.startsWith('.'));
      const dependencies = [];
      for (const specifier of imports) {
        if (!specifier.endsWith('.js'))
          throw new Error(`Missing .js extension in ${file}: ${specifier}`);
        const dependency = resolve(dirname(file), specifier);
        await readFile(dependency);
        dependencies.push(dependency);
      }
      graph.set(file, dependencies);
    }
  }
}
await scan(root);
const visited = new Set();
function visit(file, stack = []) {
  if (stack.includes(file))
    throw new Error(
      `Circular imports: ${[...stack, file].map((p) => relative(root, p)).join(' -> ')}`,
    );
  if (visited.has(file)) return;
  for (const dependency of graph.get(file) || []) visit(dependency, [...stack, file]);
  visited.add(file);
}
for (const file of graph.keys()) visit(file);
console.log(
  `Checked ${graph.size} JavaScript files: syntax, local imports, and circular dependencies.`,
);
