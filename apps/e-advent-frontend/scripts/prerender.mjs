import { build } from 'vite';
import { JSDOM } from 'jsdom';
import { readFile, writeFile, mkdir, mkdtemp, rm, access } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function prerender(root, mode, outDir) {
  const output = resolve(root, outDir);
  const cache = resolve(root, 'node_modules/.cache');
  await mkdir(cache, { recursive: true });
  const temp = await mkdtemp(join(cache, 'eadvent-ssg-'));
  try {
    await build({ root, mode, logLevel: 'warn', ssr: { noExternal: [/^@e-advent\//] },
      build: { ssr: 'src/prerender.tsx', outDir: temp, copyPublicDir: false, minify: false,
        rollupOptions: { output: { entryFileNames: 'render.mjs' } } } });
    const { publicPaths, renderPage, writeMetadata } = await import(pathToFileURL(join(temp, 'render.mjs')).href);
    const template = await readFile(join(output, 'index.html'), 'utf8');
    const titles = new Set();
    const descriptions = new Set();
    const linked = new Set();
    for (const path of [...publicPaths, '/404']) {
      const dom = new JSDOM(template, { url: 'https://e-advent.pl' + path });
      const doc = dom.window.document;
      const body = renderPage(path, doc);
      doc.getElementById('root').innerHTML = body;
      if (publicPaths.includes(path)) {
        const canonical = doc.querySelector('link[rel="canonical"]')?.href;
        const description = doc.querySelector('meta[name="description"]')?.content;
        if (canonical !== dom.window.location.href || !description || descriptions.has(description) ||
            titles.has(doc.title) || doc.querySelectorAll('h1').length !== 1 ||
            doc.querySelector('meta[name="robots"]')?.content.includes('noindex'))
          throw new Error('Invalid SEO document: ' + path + ' (canonical=' + canonical + ', H1=' + doc.querySelectorAll('h1').length + ')');
        titles.add(doc.title);
        descriptions.add(description);
        for (const link of doc.querySelectorAll('link[rel="preload"][as="image"]')) doc.head.append(link);
        for (const link of doc.querySelectorAll('a[href]')) linked.add(new URL(link.href).pathname);
        for (const script of doc.querySelectorAll('script[type="application/ld+json"]')) JSON.parse(script.textContent);
        for (const img of doc.querySelectorAll('img[src]')) {
          if (img.src.startsWith('https://e-advent.pl/')) await access(join(output, new URL(img.src).pathname));
        }
      }
      if (mode === 'test') doc.querySelector('meta[name="robots"]').content = 'noindex, nofollow';
      const target = path === '/' ? 'index.html' : path === '/404' ? '404.html' : '_pages' + path + '.html';
      await mkdir(dirname(join(output, target)), { recursive: true });
      await writeFile(join(output, target), dom.serialize());
      dom.window.close();
    }
    for (const path of publicPaths) if (!linked.has(path)) throw new Error('No internal link to ' + path);
    const shell = new JSDOM(template);
    writeMetadata(shell.window.document, { title: 'e-Advent', robots: 'noindex, follow' });
    await writeFile(join(output, 'app-shell.html'), shell.serialize());
    shell.window.close();
    const sitemap = publicPaths.map(path => '  <url><loc>https://e-advent.pl' + path + '</loc></url>').join('\n');
    await writeFile(join(output, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + sitemap + '\n</urlset>\n');
    console.log('SEO: verified and rendered ' + publicPaths.length + ' public pages, private shell and 404.');
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}
