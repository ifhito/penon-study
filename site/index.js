function updateLinks(order) {
  document.querySelectorAll('.mode-grid a.mode-card').forEach((a) => {
    const url = new URL(a.getAttribute('href'), location.href);
    url.searchParams.set('order', order);
    a.setAttribute('href', url.pathname.replace(location.origin, '') + url.search);
  });
}

function init() {
  const saved = localStorage.getItem('orderMode') || 'random';
  const order = saved === 'seq' ? 'seq' : 'random';
  document.getElementById('order-random').checked = order === 'random';
  document.getElementById('order-seq').checked = order === 'seq';
  updateLinks(order);

  document.querySelectorAll('input[name="order"]').forEach((el) => {
    el.addEventListener('change', () => {
      const val = document.getElementById('order-seq').checked ? 'seq' : 'random';
      localStorage.setItem('orderMode', val);
      updateLinks(val);
    });
  });
}

init();

