import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const output = new URL('dist/', root);

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

// Publish only the game and its license. Native ESM imports stay unchanged.
for (const path of ['index.html', 'styles', 'src', 'assets', 'LICENSE']) {
  await cp(new URL(path, root), new URL(path, output), { recursive: true });
}
// Stamp the page itself, so the label identifies the files actually being viewed.
const { version } = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
const run = process.env.GITHUB_RUN_NUMBER;
const attempt = process.env.GITHUB_RUN_ATTEMPT || '1';
const commit = process.env.GITHUB_SHA?.slice(0, 7);
const build = run ? `build ${run}.${attempt}` : 'local';
const label = `เวอร์ชัน ${version} · ${build}${commit ? ` · ${commit}` : ''}`;
const escapedLabel = label.replace(
  /[&<>"']/g,
  (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
);
const page = new URL('index.html', output);
const html = await readFile(page, 'utf8');
const marker = /(<p class="build-version" id="buildVersion">)[^<]*(<\/p>)/;
if (!marker.test(html)) throw new Error('Missing start-screen version label');
await writeFile(
  page,
  html.replace(marker, (_, open, close) => open + escapedLabel + close),
);
await writeFile(new URL('.nojekyll', output), '');

console.log(`Static site ready: ${fileURLToPath(output)}`);
