import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
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
// Give the entry module and every ESM dependency the same deployment revision.
// A fresh start-screen label must not accompany cached game/audio modules.
if (run) {
  const revision = encodeURIComponent(`${run}.${attempt}-${commit || 'build'}`);
  const stamp = `?build=${revision}`;
  const builtPage = await readFile(page, 'utf8');
  await writeFile(
    page,
    builtPage.replace(
      /src="(\.\/)?src\/main\.js"/,
      (_, prefix = '') => `src="${prefix}src/main.js${stamp}"`,
    ),
  );
  async function stampModules(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const url = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory);
      if (entry.isDirectory()) await stampModules(url);
      else if (entry.name.endsWith('.js')) {
        const source = await readFile(url, 'utf8');
        const revised = source.replace(
          /(\b(?:from\s*|import\s*(?:\(\s*)?))(['"])(\.{1,2}\/[^'"]+\.js)\2/g,
          (_, prefix, quote, specifier) => `${prefix}${quote}${specifier}${stamp}${quote}`,
        );
        await writeFile(url, revised);
      }
    }
  }
  await stampModules(new URL('src/', output));
}
await writeFile(new URL('.nojekyll', output), '');

console.log(`Static site ready: ${fileURLToPath(output)}`);
