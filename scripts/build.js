import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const output = new URL('dist/', root);

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

// Publish only the game and its license. Native ESM imports stay unchanged.
for (const path of ['index.html', 'styles', 'src', 'assets', 'LICENSE']) {
  await cp(new URL(path, root), new URL(path, output), { recursive: true });
}
await writeFile(new URL('.nojekyll', output), '');

console.log(`Static site ready: ${fileURLToPath(output)}`);
