async function loadItems() {
  const res = await fetch('./data/items.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load data');
  return res.json();
}

function getOrderMode() {
  const p = new URLSearchParams(location.search);
  const v = p.get('order') || localStorage.getItem('orderMode') || 'random';
  return v === 'seq' ? 'seq' : 'random';
}

const state = {
  items: [],
  current: null,
  revealed: false,
  order: 'random',
  seqList: [],
  seqIdx: 0,
  seqDone: false,
};

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function allowedItems() {
  const useArtpen = document.getElementById('cat-artpen').checked;
  const useMagnet = document.getElementById('cat-magnet').checked;
  const usePostcard = document.getElementById('cat-postcard') ? document.getElementById('cat-postcard').checked : true;
  return state.items.filter((it) => (
    (it.category === 'artpen' && useArtpen) || (it.category === 'magnet' && useMagnet) || (it.category === 'postcard' && usePostcard)
  ));
}

function rebuildSequence() {
  state.seqList = shuffle(allowedItems());
  state.seqIdx = 0;
  state.seqDone = state.seqList.length === 0;
}

function sampleNext() {
  const pool = allowedItems();
  if (pool.length === 0) return null;
  if (state.order === 'seq') {
    if (state.seqIdx > state.seqList.length) rebuildSequence();
    if (state.seqIdx >= state.seqList.length) { state.seqDone = true; return null; }
    const it = state.seqList[state.seqIdx];
    state.seqIdx += 1;
    return it;
  }
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
  renderProgress();
}

function next() {
  const it = sampleNext();
  if (!it) {
    const hint = document.getElementById('hint');
    if (state.order === 'seq') {
      if (state.seqDone) {
        hint.textContent = '全て出題しました。次でリセットして再開します';
        rebuildSequence();
        renderProgress();
      } else {
        hint.textContent = '対象カテゴリにカードがありません';
      }
    } else {
      hint.textContent = '対象カテゴリにカードがありません';
    }
    renderProgress();
    return;
  }
  showItem(it);
}

async function init() {
  try {
    const data = await loadItems();
    state.items = data;
    state.order = getOrderMode();
    if (state.order === 'seq') rebuildSequence();
    next();
  } catch (e) {
    console.error(e);
    document.getElementById('hint').textContent = 'データの読み込みに失敗しました';
  }

  document.getElementById('nextBtn').addEventListener('click', next);
  document.getElementById('cat-artpen').addEventListener('change', () => { if (state.order === 'seq') rebuildSequence(); next(); });
  document.getElementById('cat-magnet').addEventListener('change', () => { if (state.order === 'seq') rebuildSequence(); next(); });
  const pc = document.getElementById('cat-postcard');
  if (pc) pc.addEventListener('change', () => { if (state.order === 'seq') rebuildSequence(); next(); });
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

function renderProgress() {
  const el = document.getElementById('progressNum');
  if (!el) return;
  if (state.order === 'seq' && state.seqList.length > 0 && state.current) {
    el.textContent = `${state.seqIdx} / ${state.seqList.length}`;
  } else if (state.order === 'seq' && state.seqDone) {
    el.textContent = `${state.seqList.length} / ${state.seqList.length}`;
  } else {
    el.textContent = '-';
  }
}
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
