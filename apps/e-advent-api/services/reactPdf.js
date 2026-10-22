'use strict';

// @react-pdf/renderer is ESM-only. Node without require(esm) support (Vercel runtime)
// throws ERR_REQUIRE_ESM, so fall back to import(); require() keeps Jest working.
let cached = null;

async function loadReactPdf() {
  if (cached) return cached;
  try {
    cached = require('@react-pdf/renderer');
  } catch (error) {
    if (error.code !== 'ERR_REQUIRE_ESM') throw error;
    cached = await import('@react-pdf/renderer');
  }
  return cached;
}

function getReactPdf() {
  if (!cached) throw new Error('@react-pdf/renderer is not loaded; await loadReactPdf() first');
  return cached;
}

module.exports = { loadReactPdf, getReactPdf };
