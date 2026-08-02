import { CHAPTERS, CLUES, IMAGES, ENDING } from './story.js';

const $ = (s) => document.querySelector(s);
const app = $('#app'), flow = $('#flow'), body = document.body;

/* ───────── 音频 ───────── */
const A = 'assets/audio/';
const ambients = {
  monitor:  A + 'amb_monitor.mp3',
  day:      A + 'amb_day.mp3',
  night:    A + 'amb_night.mp3',
  dreamlow: A + 'amb_dream.mp3',
  forest:   A + 'amb_forest.mp3',
};
const sfxMap = {
  monitor_once: A + 'sfx_monitor.mp3',
  crack:   A + 'sfx_crack.mp3',
  sting:   A + 'sfx_sting.mp3',
  pickup:  A + 'sfx_pickup.mp3',
  cs_start:A + 'sfx_chainsaw_start.mp3',
  cs_run:  A + 'sfx_chainsaw_run.mp3',
  boom:    A + 'sfx_boom.mp3',
  shout:   A + 'sfx_shout.mp3',
};
let curAmbient = null, curAmbientKey = 'none';
function playAmbient(key) {
  if (key === curAmbientKey) return;
  curAmbientKey = key;
  const old = curAmbient;
  if (old) { fadeOut(old); }
  if (key === 'none' || !ambients[key] || !state.sound) { curAmbient = null; return; }
  const el = new Audio(ambients[key]);
  el.loop = true; el.volume = 0;
  el.play().then(() => fadeIn(el, 0.32)).catch(() => {});
  curAmbient = el;
}
function fadeIn(el, target) {
  const t0 = performance.now();
  (function step(t) {
    const k = Math.min(1, (t - t0) / 1600);
    el.volume = target * k;
    if (k < 1 && el === curAmbient) requestAnimationFrame(step);
  })(t0);
}
function fadeOut(el) {
  const v0 = el.volume, t0 = performance.now();
  (function step(t) {
    const k = Math.min(1, (t - t0) / 900);
    el.volume = v0 * (1 - k);
    if (k < 1) requestAnimationFrame(step); else el.pause();
  })(t0);
}
function playSfx(id) {
  if (!state.sound || !sfxMap[id]) return;
  const el = new Audio(sfxMap[id]);
  el.volume = id === 'sting' ? 0.6 : 0.75;
  el.play().catch(() => {});
}

/* ───────── 状态 ───────── */
const SAVE_KEY = 'rmxc-save-v1';
let state = { c: 0, i: -1, clues: [], bead: 0, sound: true, done: false };
try {
  const s = JSON.parse(localStorage.getItem(SAVE_KEY));
  if (s && typeof s.c === 'number') state = Object.assign(state, s);
} catch (e) {}
function save() { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }

/* ───────── 工具 ───────── */
function vibrate(p) { if (navigator.vibrate) try { navigator.vibrate(p); } catch (e) {} }
function setWorld(w) {
  body.classList.toggle('world-dream', w === 'dream');
}
function flash(ms = 260) {
  const f = $('#fx-flash');
  f.style.transition = 'none'; f.style.opacity = .85;
  requestAnimationFrame(() => { f.style.transition = `opacity ${ms}ms ease`; f.style.opacity = 0; });
}
function fallTransition(cb) {
  const f = $('#fx-fall');
  f.style.transition = 'opacity 1.4s ease'; f.style.opacity = 1;
  vibrate([80, 60, 120]);
  setTimeout(() => {
    cb && cb();
    f.style.transition = 'opacity 1.6s ease'; f.style.opacity = 0;
  }, 1500);
}
function vignettePulse() {
  const v = $('#fx-vignette');
  v.style.opacity = 1; setTimeout(() => v.style.opacity = 0, 900);
}
function shake(hard) {
  const cls = hard ? 'fx-shake-hard' : 'fx-shake';
  app.classList.remove('fx-shake', 'fx-shake-hard');
  void app.offsetWidth;
  app.classList.add(cls);
  setTimeout(() => app.classList.remove(cls), hard ? 900 : 550);
}
function applyFx(fx) {
  switch (fx) {
    case 'vibrate': vibrate(70); break;
    case 'shake': shake(false); vibrate(90); break;
    case 'shakeHard': shake(true); vibrate([120, 60, 160]); break;
    case 'flash': flash(); vibrate(40); break;
    case 'sting': vignettePulse(); shake(false); vibrate([60, 40, 90]); break;
    case 'fall': break; // handled with world switch
  }
}

/* ───────── 玉珠 ───────── */
function renderBeads() {
  const box = $('#beads'); box.innerHTML = '';
  for (let k = 0; k < 8; k++) {
    const b = document.createElement('span');
    b.className = 'bead';
    if (k === 0) {
      if (state.bead >= 2) b.classList.add('shattered');
      else if (state.bead >= 1) b.classList.add('cracked');
    }
    box.appendChild(b);
  }
}

/* ───────── 线索图鉴 ───────── */
function renderClueDrawer() {
  const box = $('#clue-list'); box.innerHTML = '';
  const all = Object.keys(CLUES);
  let got = 0;
  all.forEach((id) => {
    const owned = state.clues.includes(id);
    if (owned) got++;
    const d = document.createElement('div');
    d.className = 'clue-card' + (owned ? '' : ' locked');
    d.innerHTML = owned
      ? `<h3>${CLUES[id].title}</h3><p>${CLUES[id].text}</p>`
      : `<h3>？？？</h3><p>尚未发现的线索。继续阅读，梦境自会揭晓。</p>`;
    box.appendChild(d);
  });
  $('#clue-count').textContent = `${got} / ${all.length}`;
  const badge = $('#clue-badge');
  badge.textContent = got; badge.style.display = got ? 'flex' : 'none';
}
let toastTimer = null;
function unlockClue(id) {
  if (!id || state.clues.includes(id)) return;
  state.clues.push(id); save();
  renderClueDrawer();
  const t = $('#toast');
  t.innerHTML = `获得线索卡 · <b>${CLUES[id].title}</b>`;
  t.classList.add('show');
  playSfx('pickup');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}

/* ───────── 渲染段落 ───────── */
function segNode(seg) {
  if (seg.t === 'div') {
    const d = document.createElement('div');
    d.className = 'seg divider'; d.textContent = '· · ·';
    return d;
  }
  const frag = document.createDocumentFragment();
  if (seg.img && IMAGES[seg.img]) {
    const f = document.createElement('figure');
    f.className = 'plate';
    f.innerHTML = `<img src="${IMAGES[seg.img].src}" alt="${IMAGES[seg.img].caption}" loading="lazy"><figcaption>${IMAGES[seg.img].caption}</figcaption>`;
    frag.appendChild(f);
  }
  const p = document.createElement('p');
  p.className = 'seg ' + ({ n: 'narr', d: 'dial', i: 'inner', v: 'voice' }[seg.t] || 'narr');
  if (seg.fx === 'slow') p.classList.add('slow');
  if (seg.t === 'd' && seg.who) {
    const w = document.createElement('span');
    w.className = 'who'; w.textContent = seg.who;
    p.appendChild(w);
    p.appendChild(document.createTextNode(`「${seg.text}」`));
  } else {
    p.textContent = seg.text;
  }
  frag.appendChild(p);
  return frag;
}
function scrollBottom() {
  requestAnimationFrame(() => {
    flow.scrollTo({ top: flow.scrollHeight, behavior: 'smooth' });
  });
}

/* ───────── 进度 ───────── */
const TOTAL = CHAPTERS.reduce((s, c) => s + c.seg.length, 0);
function progress() {
  let n = 0;
  for (let k = 0; k < state.c; k++) n += CHAPTERS[k].seg.length;
  n += state.i + 1;
  $('#progress-line').style.width = Math.min(100, (n / TOTAL) * 100) + '%';
}

/* ───────── 章节卡 ───────── */
function showChapterCard(ch, cb) {
  const card = $('#chapter-card');
  $('#chapter-num').textContent = `第 ${'一二三四五六七八九十'[ch.n - 1]} 章`;
  $('#chapter-title').textContent = ch.title;
  card.classList.add('show');
  $('#chapter-label').textContent = `第${ch.n}章 · ${ch.title}`;
  const go = () => {
    card.classList.remove('show');
    card.removeEventListener('click', go);
    setTimeout(cb, 350);
  };
  card.addEventListener('click', go);
}

/* ───────── 推进 ───────── */
function curSeg() { return CHAPTERS[state.c].seg[state.i]; }

function applySegment(seg) {
  // 世界切换
  if (seg.world) {
    const toDream = seg.world === 'dream';
    const nowDream = body.classList.contains('world-dream');
    if (toDream !== nowDream) {
      if (seg.fx === 'fall') {
        fallTransition(() => { setWorld(seg.world); });
      } else {
        flash(320);
        setTimeout(() => setWorld(seg.world), 120);
      }
    }
  }
  if (seg.ambient) playAmbient(seg.ambient);
  if (seg.bead === 'crack') { state.bead = Math.max(state.bead, 1); renderBeads(); }
  if (seg.bead === 'shatter') { state.bead = 2; renderBeads(); }
  flow.appendChild(segNode(seg));
  scrollBottom();
  if (seg.fx && seg.fx !== 'fall' && seg.fx !== 'slow') applyFx(seg.fx);
  if (seg.sfx) playSfx(seg.sfx);
  if (seg.clue) setTimeout(() => unlockClue(seg.clue), 900);
  progress();
}

function advance() {
  if (state.done) return;
  const ch = CHAPTERS[state.c];
  if (state.i + 1 >= ch.seg.length) {
    // 下一章或结尾
    if (state.c + 1 >= CHAPTERS.length) { showEnding(); return; }
    state.c++; state.i = -1; save();
    const nch = CHAPTERS[state.c];
    showChapterCard(nch, () => {
      setWorld(nch.world);
      playAmbient(nch.ambient);
      advance();
    });
    return;
  }
  state.i++; save();
  const seg = curSeg();
  // 一章的第一段之前，先亮章节卡
  if (state.i === 0) {
    showChapterCard(ch, () => {
      setWorld(ch.world);
      playAmbient(ch.ambient);
      applySegment(seg);
    });
    return;
  }
  applySegment(seg);
}

/* ───────── 结尾 ───────── */
function showEnding() {
  state.done = true; save();
  playAmbient('none');
  const card = $('#ending-card');
  $('#ending-title').textContent = ENDING.title;
  $('#ending-lines').innerHTML = ENDING.lines.map((l) => `<div>${l}</div>`).join('');
  card.classList.add('show');
}

/* ───────── 启动 ───────── */
function enterReader(fresh) {
  if (fresh) {
    state = { c: 0, i: -1, clues: [], bead: 0, sound: state.sound, done: false };
    flow.innerHTML = '';
    save();
  }
  $('#title-screen').classList.add('hidden');
  $('#reader').classList.remove('hidden');
  $('#topbar').classList.remove('hidden');
  $('#tap-hint').classList.remove('hidden');
  renderBeads(); renderClueDrawer(); progress();
  const ch = CHAPTERS[state.c];
  setWorld(ch.world);
  if (state.i >= 0) {
    // 恢复：重放到当前位置（静默，无特效）
    flow.innerHTML = '';
    for (let k = 0; k <= state.c; k++) {
      const end = k === state.c ? state.i : CHAPTERS[k].seg.length - 1;
      for (let j = 0; j <= end; j++) {
        flow.appendChild(segNode(CHAPTERS[k].seg[j]));
      }
    }
    $('#chapter-label').textContent = `第${ch.n}章 · ${ch.title}`;
    playAmbient(ch.ambient);
    flow.scrollTop = flow.scrollHeight;
  } else {
    advance();
  }
}

$('#btn-start').addEventListener('click', () => {
  // 首次用户手势，解锁音频
  playAmbient('none');
  enterReader(true);
});
$('#btn-continue').addEventListener('click', () => enterReader(false));
if (state.i >= 0 && !state.done) $('#btn-continue').classList.remove('hidden');

$('#reader').addEventListener('click', (e) => {
  if (e.target.closest('.icon-btn') || e.target.closest('#clue-drawer')) return;
  advance();
});

/* 图鉴抽屉 */
function openDrawer() { renderClueDrawer(); $('#clue-drawer').classList.add('show'); $('#drawer-mask').classList.add('show'); }
function closeDrawer() { $('#clue-drawer').classList.remove('show'); $('#drawer-mask').classList.remove('show'); }
$('#btn-clues').addEventListener('click', (e) => { e.stopPropagation(); openDrawer(); });
$('#drawer-mask').addEventListener('click', closeDrawer);

/* 声音开关 */
function renderSound() { $('#btn-sound').textContent = state.sound ? '♪' : '✕'; $('#btn-sound').style.opacity = state.sound ? .75 : .4; }
$('#btn-sound').addEventListener('click', (e) => {
  e.stopPropagation();
  state.sound = !state.sound; save(); renderSound();
  if (!state.sound) { if (curAmbient) curAmbient.pause(); }
  else { const k = curAmbientKey; curAmbientKey = null; playAmbient(k === 'none' ? CHAPTERS[state.c].ambient : k); }
});
renderSound();

/* 结尾按钮 */
$('#btn-restart').addEventListener('click', () => {
  $('#ending-card').classList.remove('show');
  enterReader(true);
});

/* 封面 */
$('#title-screen .cover').style.backgroundImage = "url('assets/img/cover.jpg')";
