async function loadItems() {
  const res = await fetch('./data/items.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load data');
  return res.json();
}

function normalize(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[\u3000\s]+/g, ' ')
    .replace(/[\(\)\[\]\{\}。、，，,\.・!！?？:：;；~〜_＿\-―]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeHtml(s) {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function parseAlt(alt) {
  const text = (alt || '').replace(/[\u3000\s]+/g, ' ').trim();
  const m = text.match(/^(\S+)\s+(\S+)\s+(.+)$/);
  if (m) {
    return { kind: m[1], artist: m[2], title: m[3] };
  }
  return { kind: '', artist: '', title: text };
}

function kindFromCategory(cat) {
  if (cat === 'artpen') return 'アートペン';
  if (cat === 'magnet') return 'アートマグネット';
  if (cat === 'postcard') return 'ポストカード';
  return '';
}

const state = {
  items: [],
  current: null,
  order: 'random',
  seqList: [],
  seqIdx: 0,
};

function getOrderMode() {
  const p = new URLSearchParams(location.search);
  const v = p.get('order') || localStorage.getItem('orderMode') || 'random';
  return v === 'seq' ? 'seq' : 'random';
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function rebuildSequence() {
  state.seqList = shuffle(state.items);
  state.seqIdx = 0;
}

function sampleNext() {
  if (!state.items.length) return null;
  if (state.order === 'seq') {
    if (state.seqIdx >= state.seqList.length) return null;
    const it = state.seqList[state.seqIdx];
    state.seqIdx += 1;
    return it;
  }
  return state.items[Math.floor(Math.random() * state.items.length)];
}

function showItem(it) {
  state.current = it;
  document.getElementById('inputImage').src = it.src;
  document.getElementById('inputImage').alt = it.alt || 'item';
  // reset UI
  document.getElementById('kind').value = kindFromCategory(it.category);
  document.getElementById('artist').value = '';
  document.getElementById('title').value = '';
  const fb = document.getElementById('feedback');
  fb.textContent = '';
  fb.className = 'feedback';
  const truth = document.getElementById('truth');
  truth.textContent = '';
  truth.classList.add('hidden');
  renderProgress();
}

function checkAnswer() {
  const it = state.current;
  if (!it) return;
  const truthKind = kindFromCategory(it.category);
  const parsed = parseAlt(it.alt || '');
  const inpKind = document.getElementById('kind').value;
  const inpArtist = document.getElementById('artist').value;
  const inpTitle = document.getElementById('title').value;

  const okKind = normalize(inpKind) === normalize(truthKind);
  const okArtist = normalize(inpArtist) === normalize(parsed.artist);
  const okTitle = normalize(inpTitle) === normalize(parsed.title);

  const fb = document.getElementById('feedback');
  if (okKind && okArtist && okTitle) {
    fb.textContent = '正解！';
    fb.className = 'feedback ok';
    setTimeout(next, 700);
  } else {
    const miss = [];
    if (!okKind) miss.push('種別');
    if (!okArtist) miss.push('作家');
    if (!okTitle) miss.push('作品名');
    fb.textContent = `${miss.join('・')} が違います`;
    fb.className = 'feedback no';
  }
}

function reveal() {
  const it = state.current;
  if (!it) return;
  const truthKind = kindFromCategory(it.category);
  const parsed = parseAlt(it.alt || '');
  const html = `種別: ${escapeHtml(truthKind)}<br/>作家: ${escapeHtml(parsed.artist)}<br/>作品名: ${escapeHtml(parsed.title)}`;
  const truth = document.getElementById('truth');
  truth.innerHTML = html;
  truth.classList.remove('hidden');
}

function next() {
  const it = sampleNext();
  if (!it) {
    const fb = document.getElementById('feedback');
    if (state.order === 'seq') {
      fb.textContent = '全て出題しました。次でリセットして再開します';
      rebuildSequence();
      renderProgress();
    }
    return;
  }
  showItem(it);
}

async function init() {
  try {
    state.items = await loadItems();
    state.order = getOrderMode();
    if (state.order === 'seq') rebuildSequence();
    next();
  } catch (e) {
    console.error(e);
    const fb = document.getElementById('feedback');
    fb.textContent = 'データの読み込みに失敗しました';
  }

  document.getElementById('nextBtn').addEventListener('click', next);
  document.getElementById('inputForm').addEventListener('submit', (e) => {
    e.preventDefault();
    checkAnswer();
  });
  document.getElementById('giveupBtn').addEventListener('click', reveal);
}

init();

function renderProgress() {
  const el = document.getElementById('progressNum');
  if (!el) return;
  if (state.order === 'seq' && state.seqList.length > 0 && state.current) {
    el.textContent = `${state.seqIdx} / ${state.seqList.length}`;
  } else if (state.order === 'seq' && state.seqList.length > 0 && state.seqIdx >= state.seqList.length) {
    el.textContent = `${state.seqList.length} / ${state.seqList.length}`;
  } else {
    el.textContent = '-';
  }
}
