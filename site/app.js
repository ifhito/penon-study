async function loadItems() {
  const res = await fetch('./data/items.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load data');
  return res.json();
}

function normalize(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[\u3000\s]+/g, ' ') // spaces
    .replace(/[\(\)\[\]\{\}。、，，,\.・!！?？:：;；~〜_＿\-―]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = new Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = i - 1; // dp[i-1][j-1]
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      if (a[i - 1] === b[j - 1]) dp[j] = prev;
      else dp[j] = Math.min(prev + 1, dp[j] + 1, dp[j - 1] + 1);
      prev = tmp;
    }
  }
  return dp[n];
}

function similarity(a, b) {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const dist = levenshtein(na, nb);
  return 1 - dist / Math.max(na.length, nb.length);
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getOrderMode() {
  const p = new URLSearchParams(location.search);
  const v = p.get('order') || localStorage.getItem('orderMode') || 'random';
  return v === 'seq' ? 'seq' : 'random';
}

function allowedItems() {
  const list = [];
  const useArtpen = document.getElementById('cat-artpen').checked;
  const useMagnet = document.getElementById('cat-magnet').checked;
  const usePostcard = document.getElementById('cat-postcard') ? document.getElementById('cat-postcard').checked : true;
  for (const it of state.items) {
    if (
      (it.category === 'artpen' && useArtpen) ||
      (it.category === 'magnet' && useMagnet) ||
      (it.category === 'postcard' && usePostcard)
    ) list.push(it);
  }
  return list;
}

const state = {
  items: [],
  pool: [],
  current: null,
  order: 'random',
  seqList: [],
  seqIdx: 0,
  seqDone: false,
  choices: [],
  score: { ok: 0, no: 0 },
};

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

function renderStats() {
  const { ok, no } = state.score;
  const total = ok + no;
  const rate = total ? Math.round((ok / total) * 100) : 0;
  document.getElementById('scoreCorrect').textContent = ok;
  document.getElementById('scoreWrong').textContent = no;
  document.getElementById('scoreRate').textContent = rate + '%';
  renderProgress();
}

function rebuildSequence() {
  state.seqList = shuffle(allowedItems());
  state.seqIdx = 0;
  state.seqDone = state.seqList.length === 0;
}

function sampleNext() {
  const list = allowedItems();
  if (list.length === 0) return null;
  if (state.order === 'seq') {
    if (state.seqIdx > state.seqList.length) rebuildSequence();
    if (state.seqIdx >= state.seqList.length) { state.seqDone = true; return null; }
    const it = state.seqList[state.seqIdx];
    state.seqIdx += 1;
    return it;
  }
  return list[Math.floor(Math.random() * list.length)];
}

function splitTokens(str) {
  return (str || '')
    .replace(/[\(\)\[\]\{\}、，,・!！?？:：;；~〜_＿\-―]/g, ' ')
    .replace(/[\s\u3000]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
}

function getArtist(alt) {
  const tokens = splitTokens(alt);
  if (tokens.length === 0) return '';
  const generic = new Set(['アート', 'ペン', 'アートペン', 'マグネット', 'アートマグネット', 'ポストカード']);
  if (tokens.length >= 2 && generic.has(tokens[0])) return tokens[1];
  return tokens[0];
}

function keywords(alt) {
  const generic = new Set(['アート', 'ペン', 'アートペン', 'マグネット', 'アートマグネット', 'ポストカード', 'の', 'と']);
  return splitTokens(alt).filter((t) => !generic.has(t) && t.length >= 2);
}

function buildChoices(answer) {
  const useArtpen = document.getElementById('cat-artpen').checked;
  const useMagnet = document.getElementById('cat-magnet').checked;
  const usePostcard = document.getElementById('cat-postcard') ? document.getElementById('cat-postcard').checked : true;
  // pool from current category filters
  const pool = state.items.filter((it) => (
    (it.category === 'artpen' && useArtpen) || (it.category === 'magnet' && useMagnet) || (it.category === 'postcard' && usePostcard)
  ));
  // unique by alt
  const seen = new Set();
  const uniques = [];
  for (const it of pool) {
    const key = it.alt || '';
    if (key && !seen.has(key)) { seen.add(key); uniques.push(it); }
  }

  // Build distractors prioritizing same artist
  const ansArtist = getArtist(answer.alt || '');
  const ansKeys = new Set(keywords(answer.alt || ''));
  const sameArtist = uniques.filter((it) => it.alt !== answer.alt && getArtist(it.alt || '') === ansArtist);
  const related = uniques.filter((it) => {
    if (it.alt === answer.alt) return false;
    const ks = new Set(keywords(it.alt || ''));
    for (const k of ansKeys) if (ks.has(k)) return true;
    return false;
  });
  // Shuffle helpers
  const shuffle = (arr) => arr.sort(() => Math.random() - 0.5);
  shuffle(sameArtist);
  shuffle(related);

  const distractors = [];
  for (const it of sameArtist) { if (distractors.length < 3) distractors.push(it.alt); }
  for (const it of related) { if (distractors.length < 3 && !distractors.includes(it.alt)) distractors.push(it.alt); }
  // Fill from remaining uniques
  const remaining = shuffle(uniques.slice());
  for (const it of remaining) {
    if (distractors.length >= 3) break;
    if (it.alt !== answer.alt && !distractors.includes(it.alt)) distractors.push(it.alt);
  }
  // If still not enough, fill from all items
  if (distractors.length < 3) {
    const allSeen = new Set(uniques.map((u) => u.alt));
    const allUniques = [];
    for (const it of state.items) {
      const k = it.alt || '';
      if (k && !allUniques.includes(k)) allUniques.push(k);
    }
    shuffle(allUniques);
    for (const alt of allUniques) {
      if (distractors.length >= 3) break;
      if (alt !== answer.alt && !distractors.includes(alt)) distractors.push(alt);
    }
  }

  const opts = [answer.alt, ...distractors.slice(0, 3)];
  // shuffle options
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  return opts;
}

function showItem(it) {
  state.current = it;
  const img = document.getElementById('quizImage');
  img.src = it.src;
  img.alt = it.alt || 'item';
  document.getElementById('feedback').textContent = '';
  document.getElementById('feedback').className = 'feedback';
  const truth = document.getElementById('truth');
  truth.textContent = '';
  truth.classList.add('hidden');

  // render choices
  const choices = buildChoices(it);
  state.choices = choices;
  const wrap = document.getElementById('choices');
  wrap.innerHTML = '';
  for (const text of choices) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'choice';
    btn.textContent = text || '(altなし)';
    btn.addEventListener('click', () => handleChoice(text));
    wrap.appendChild(btn);
  }
  renderProgress();
}

function handleChoice(selectedText) {
  if (!state.current) return;
  const target = state.current.alt || '';
  const ok = selectedText === target;
  const fb = document.getElementById('feedback');
  const wrap = document.getElementById('choices');
  // mark buttons
  Array.from(wrap.children).forEach((el) => {
    const txt = el.textContent === '(altなし)' ? '' : el.textContent;
    if (txt === target) el.classList.add('correct');
    if (txt === selectedText && !ok) el.classList.add('wrong');
    el.disabled = true;
  });
  if (ok) {
    state.score.ok++;
    fb.textContent = '正解！';
    fb.className = 'feedback ok';
    setTimeout(nextQuestion, 700);
  } else {
    state.score.no++;
    fb.textContent = '不正解…';
    fb.className = 'feedback no';
    const truth = document.getElementById('truth');
    truth.textContent = `答え: ${target || '(altなし)'}`;
    truth.classList.remove('hidden');
  }
  renderStats();
}

function nextQuestion() {
  const it = sampleNext();
  if (!it) {
    const fb = document.getElementById('feedback');
    if (state.order === 'seq') {
      if (state.seqDone) {
        fb.textContent = '全て出題しました。次でリセットして再開します';
        rebuildSequence();
        renderProgress();
      } else {
        fb.textContent = '対象カテゴリに問題がありません';
      }
    } else {
      fb.textContent = '対象カテゴリに問題がありません';
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
    nextQuestion();
  } catch (e) {
    console.error(e);
    document.getElementById('feedback').textContent = 'データの読み込みに失敗しました';
  }
  renderStats();
  renderProgress();

  document.getElementById('nextBtn').addEventListener('click', nextQuestion);
  document.getElementById('cat-artpen').addEventListener('change', () => { if (state.order === 'seq') rebuildSequence(); nextQuestion(); });
  document.getElementById('cat-magnet').addEventListener('change', () => { if (state.order === 'seq') rebuildSequence(); nextQuestion(); });
  const pc = document.getElementById('cat-postcard');
  if (pc) pc.addEventListener('change', () => { if (state.order === 'seq') rebuildSequence(); nextQuestion(); });

  document.getElementById('giveupBtn').addEventListener('click', () => {
    if (!state.current) return;
    const truth = document.getElementById('truth');
    truth.textContent = `答え: ${state.current.alt || '(altなし)'}`;
    truth.classList.remove('hidden');
    // disable choices and highlight correct
    const wrap = document.getElementById('choices');
    Array.from(wrap.children).forEach((el) => {
      const txt = el.textContent === '(altなし)' ? '' : el.textContent;
      if (txt === (state.current.alt || '')) el.classList.add('correct');
      el.disabled = true;
    });
  });
}

init();
