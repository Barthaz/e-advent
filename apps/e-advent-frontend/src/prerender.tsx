import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { AppContent } from './App';
import { CartProvider } from './context/CartContext';
import { BuildDocument } from './seo/document';
export { publicPaths } from './seo/pages';
export { writeMetadata } from './seo/document';

export function renderPage(path: string, doc: Document) {
  return renderToString(
    <BuildDocument.Provider value={doc}>
      <StaticRouter location={path}><CartProvider><AppContent /></CartProvider></StaticRouter>
    </BuildDocument.Provider>
  );
}
