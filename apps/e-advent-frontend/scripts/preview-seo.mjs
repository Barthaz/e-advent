import { createReadStream, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Serve the same generated documents as Apache when reviewing a release using vite preview.
export function previewSeo(server) {
  const root = resolve(server.config.root, server.config.build.outDir);
  const aliases = { privacy: 'polityka-prywatnosci', terms: 'regulamin', shipping: 'dostawa-i-zwroty', returns: 'dostawa-i-zwroty', 'track-santa': 'sledz-mikolaja', checkout: 'platnosc', success: 'sukces', preview: 'podglad', 'stworz-kalendarz/puzzle': 'stworz-kalendarz' };
  server.middlewares.use((req, res, next) => {
    const url = new URL(req.url, 'http://localhost');
    const path = url.pathname.slice(1);
    if (path === '') return next();
    const alias = Object.hasOwn(aliases, path) ? aliases[path] : null;
    if (alias || path.endsWith('/') || path === 'index.html') {
      res.writeHead(301, { Location: '/' + (alias ?? (path === 'index.html' ? '' : path.slice(0, -1))) + url.search });
      return res.end();
    }
    if (/^[a-z0-9/-]+$/.test(path) && existsSync(resolve(root, '_pages', path + '.html'))) req.url = '/_pages/' + path + '.html';
    else if (/^(?:koszyk|platnosc|sukces|platnosc-blad|create|podglad|kalendarz|(?:kalendarz|calendar|podglad-okienka)\/[^/]+|wiadomosc-od-mikolaja\/(?:kreator|personalizacja\/[^/]+)|od-mikolaja\/(?:[^/]+|przyklad\/[^/]+))$/.test(path)) req.url = '/app-shell.html';
    else if (path.startsWith('_pages/') || path === 'app-shell.html' || !existsSync(resolve(root, path))) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      createReadStream(resolve(root, '404.html')).pipe(res);
      return;
    }
    next();
  });
}
