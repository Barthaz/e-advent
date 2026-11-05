document.querySelector('#print-report')?.addEventListener('click', () => {
  document.querySelectorAll('details').forEach(element => { element.open = true; });
  window.print();
});
