import {readFile, writeFile, mkdir, readdir, rm, copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {join, extname} from 'node:path';
import {services} from '../src/data.mjs';
import {serviceCard} from '../src/render.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = join(root, 'dist');
await rm(out, {recursive:true, force:true});
await mkdir(join(out, 'assets'), {recursive:true});
const files = new Map();
function references(text) {
  return text.replace(/@asset:([^@]+)@/g, (_, name) => {
    if (!files.has(name)) throw new Error('Asset not built: ' + name);
    return files.get(name);
  });
}
async function asset(name, bytes) {
  const extension = extname(name);
  const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 12);
  const filename = name.slice(0, -extension.length) + '.' + hash + extension;
  await writeFile(join(out, 'assets', filename), bytes);
  files.set(name, '/assets/' + filename);
}
for (const name of await readdir(join(root, 'assets'))) {
  await asset(name, await readFile(join(root, 'assets', name)));
}
// Dependency order keeps every import and stylesheet URL content-addressed.
for (const name of ['render.mjs','data.mjs','history.mjs','motion.mjs','app.mjs','styles.css']) {
  let text = references(await readFile(join(root, 'src', name), 'utf8'));
  text = text.replace(/(['"])\.\/([^'"]+\.mjs)\1/g, (_, quote, dependency) => {
    if (!files.has(dependency)) throw new Error('Module not built: ' + dependency);
    return quote + files.get(dependency) + quote;
  });
  await asset(name, text);
}
let html = await readFile(join(root, 'index.html'), 'utf8');
html = html.replace('@home-services@', services.slice(0,3).map((s,i) => serviceCard(s, files.get(['cut.webp','tools.webp','combo.webp'][i]))).join(''))
  .replace('@catalog@', services.map(s => serviceCard(s)).join(''));
html = references(html);
if (/@[a-z][^@\s]*@/.test(html)) throw new Error('Unresolved template marker');
await writeFile(join(out, 'index.html'), html);
// Preserve the existing alternate URL and original logo URL for old bookmarks.
await writeFile(join(out, 'wm-atualizado.html'), html);
await copyFile(join(root, 'logo_barbearia_wm.jpg'), join(out, 'logo_barbearia_wm.jpg'));
await writeFile(join(out, 'asset-manifest.json'), JSON.stringify(Object.fromEntries(files), null, 2));
console.log(`Built ${files.size} versioned assets; HTML ${(Buffer.byteLength(html)/1024).toFixed(1)} KiB.`);
