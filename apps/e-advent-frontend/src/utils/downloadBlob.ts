export function downloadBlob(blob: Blob, filename: string) {
  const safeName = filename
    .replace(/[<>:"/\\|?*]+/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 120);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = safeName || 'e-Advent.pdf';
  a.rel = 'noopener';
  a.type = blob.type || 'application/pdf';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}
