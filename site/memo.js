async function loadItems() {
  const res = await fetch('./data/items.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load data');
  return res.json();
}

const state = {
  items: [],
  current: null,
  revealed: false,
};

function sampleNext() {
  const useArtpen = document.getElementById('cat-artpen').checked;
  const useMagnet = document.getElementById('cat-magnet').checked;
  const pool = state.items.filter((it) => (
    (it.category === 'artpen' && useArtpen) || (it.category === 'magnet' && useMagnet)
  ));
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

function showItem(it) {
  state.current = it;
  state.revealed = false;
  document.getElementById('memoImage').src = it.src;
  document.getElementById('memoImage').alt = it.alt || 'item';
  const ans = document.getElementById('memoAnswer');
  ans.textContent = '';
  document.getElementById('tapArea').classList.remove('flipped');
}

function next() {
  const it = sampleNext();
  if (!it) {
    document.getElementById('hint').textContent = '対象カテゴリにカードがありません';
    return;
  }
  showItem(it);
}

async function init() {
  try {
    const data = await loadItems();
    state.items = data;
    next();
  } catch (e) {
    console.error(e);
    document.getElementById('hint').textContent = 'データの読み込みに失敗しました';
  }

  document.getElementById('nextBtn').addEventListener('click', next);
  document.getElementById('cat-artpen').addEventListener('change', next);
  document.getElementById('cat-magnet').addEventListener('change', next);
  document.getElementById('tapArea').addEventListener('click', () => {
    if (!state.current) return;
    const ans = document.getElementById('memoAnswer');
    if (!state.revealed) {
      ans.innerHTML = formatAltDetail(state.current.alt || '(altなし)');
      document.getElementById('tapArea').classList.add('flipped');
      state.revealed = true;
    } else {
      next();
    }
  });
}

init();
function escapeHtml(s) {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatAltDetail(alt) {
  const text = (alt || '').replace(/[\u3000\s]+/g, ' ').trim();
  const m = text.match(/^(\S+)\s+(\S+)\s+(.+)$/);
  if (m) {
    const kind = escapeHtml(m[1]);
    const artist = escapeHtml(m[2]);
    const title = escapeHtml(m[3]);
    return `種別: ${kind}<br/>作家: ${artist}<br/>作品名: ${title}`;
  }
  return `作品名: ${escapeHtml(text)}`;
}
