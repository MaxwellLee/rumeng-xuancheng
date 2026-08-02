import { CHAPTERS, CLUES, IMAGES, VOICES, ENDING } from './story.js';

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
  glass:   A + 'sfx_glass.mp3',
  sting:   A + 'sfx_sting.mp3',
  pickup:  A + 'sfx_pickup.mp3',
  cs_start:A + 'sfx_chainsaw_start.mp3',
  cs_run:  A + 'sfx_chainsaw_run.mp3',
  boom:    A + 'sfx_boom.mp3',
  run:     A + 'sfx_run.mp3',
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

/* ───────── 配音 ───────── */
let curVoice = null;
function playVoice(id) {
  if (!state.sound || !VOICES[id]) return Promise.resolve(2500);
  return new Promise((resolve) => {
    if (curVoice) { curVoice.pause(); }
    const el = new Audio(VOICES[id]);
    el.volume = 0.9;
    curVoice = el;
    let settled = false;
    const done = (ms) => { if (!settled) { settled = true; resolve(ms); } };
    el.addEventListener('loadedmetadata', () => done(el.duration * 1000));
    el.play().catch(() => done(2500));
    setTimeout(() => done(Math.max(2500, (el.duration || 2.5) * 1000)), 8000);
  });
}

/* ───────── 状态 ───────── */
const SAVE_KEY = 'rmxc-save-v2';
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
  v.style.animation = 'none'; v.style.opacity = 1;
  setTimeout(() => v.style.opacity = 0, 900);
}
let heartbeatTimer = null;
function heartbeat() {
  const v = $('#fx-vignette');
  let n = 0;
  clearInterval(heartbeatTimer);
  heartbeatTimer = setInterval(() => {
    v.style.transition = 'opacity .18s ease';
    v.style.opacity = .9;
    setTimeout(() => { v.style.opacity = 0; }, 200);
    if (++n >= 5) clearInterval(heartbeatTimer);
  }, 620);
  vibrate([40, 60, 40]);
}
function shake(hard) {
  const cls = hard ? 'fx-shake-hard' : 'fx-shake';
  app.classList.remove('fx-shake', 'fx-shake-hard');
  void app.offsetWidth;
  app.classList.add(cls);
  setTimeout(() => app.classList.remove(cls), hard ? 900 : 550);
}

/* ───────── 裂屏特效 ───────── */
function glassShatter() {
  const cv = $('#fx-glass');
  const ctx = cv.getContext('2d');
  const W = cv.width = app.clientWidth * devicePixelRatio;
  const H = cv.height = app.clientHeight * devicePixelRatio;
  cv.style.opacity = 1;
  const cx = W * (0.4 + Math.random() * 0.2), cy = H * (0.3 + Math.random() * 0.15);
  const rays = [];
  for (let k = 0; k < 15; k++) {
    const ang = (Math.PI * 2 * k) / 15 + Math.random() * 0.35;
    const pts = [[cx, cy]];
    let r = 0, a = ang;
    const maxR = (0.35 + Math.random() * 0.5) * Math.max(W, H);
    while (r < maxR) {
      r += 26 + Math.random() * 60;
      a += (Math.random() - 0.5) * 0.28;
      pts.push([cx + Math.cos(a) * Math.min(r, maxR), cy + Math.sin(a) * Math.min(r, maxR)]);
    }
    rays.push(pts);
  }
  const arcs = [];
  for (const rr of [0.09, 0.17]) {
    const pts = [];
    for (let k = 0; k <= 40; k++) {
      const a = (Math.PI * 2 * k) / 40;
      const rj = rr * W * (1 + (Math.random() - 0.5) * 0.25);
      pts.push([cx + Math.cos(a) * rj, cy + Math.sin(a) * rj]);
    }
    arcs.push(pts);
  }
  const shards = [];
  for (let k = 0; k < 26; k++) {
    const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 9;
    shards.push({
      x: cx, y: cy, vx: Math.cos(a) * sp * devicePixelRatio, vy: (Math.sin(a) * sp - 3) * devicePixelRatio,
      s: (3 + Math.random() * 9) * devicePixelRatio, rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.3,
      life: 1,
    });
  }
  vibrate([100, 50, 160]);
  const t0 = performance.now();
  (function frame(t) {
    const el = (t - t0) / 1000;
    ctx.clearRect(0, 0, W, H);
    const alpha = el < 1.2 ? 1 : Math.max(0, 1 - (el - 1.2) / 0.8);
    // 裂纹
    ctx.strokeStyle = `rgba(255,255,255,${0.75 * alpha})`;
    ctx.lineWidth = 1.4 * devicePixelRatio;
    ctx.shadowColor = 'rgba(255,255,255,.5)'; ctx.shadowBlur = 6 * devicePixelRatio;
    for (const pts of rays) {
      const prog = Math.min(1, el / 0.35);
      const count = Math.max(2, Math.floor(pts.length * prog));
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      for (let k = 1; k < count; k++) ctx.lineTo(pts[k][0], pts[k][1]);
      ctx.stroke();
    }
    for (const pts of arcs) {
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      for (const p of pts) ctx.lineTo(p[0], p[1]);
      ctx.closePath(); ctx.stroke();
    }
    // 碎片
    ctx.shadowBlur = 0;
    for (const s of shards) {
      s.x += s.vx; s.y += s.vy; s.vy += 0.45 * devicePixelRatio; s.rot += s.vr;
      s.life = alpha;
      ctx.save();
      ctx.translate(s.x, s.y); ctx.rotate(s.rot);
      ctx.fillStyle = `rgba(230,240,255,${0.55 * alpha})`;
      ctx.beginPath();
      ctx.moveTo(0, -s.s); ctx.lineTo(s.s * 0.8, s.s * 0.6); ctx.lineTo(-s.s * 0.7, s.s * 0.4);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    if (alpha > 0) requestAnimationFrame(frame);
    else { ctx.clearRect(0, 0, W, H); cv.style.opacity = 0; }
  })(t0);
}

function applyFx(fx) {
  switch (fx) {
    case 'vibrate': vibrate(70); break;
    case 'shake': shake(false); vibrate(90); break;
    case 'shakeHard': shake(true); vibrate([120, 60, 160]); break;
    case 'flash': flash(); vibrate(40); break;
    case 'sting': vignettePulse(); shake(false); vibrate([60, 40, 90]); break;
    case 'heartbeat': heartbeat(); break;
    case 'glass': glassShatter(); break;
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

/* ───────── 插图（含序列帧/波形） ───────── */
function plateNode(def) {
  const f = document.createElement('figure');
  f.className = 'plate';
  if (def.frames && def.frames.length > 1) {
    f.classList.add('seq');
    def.frames.forEach((src, k) => {
      const img = document.createElement('img');
      img.src = src; img.alt = def.caption; img.loading = 'lazy';
      if (k === 0) img.classList.add('on');
      f.appendChild(img);
    });
    let cur = 0;
    const imgs = f.querySelectorAll('img');
    f._seqTimer = setInterval(() => {
      imgs[cur].classList.remove('on');
      cur = (cur + 1) % imgs.length;
      imgs[cur].classList.add('on');
    }, 1300);
  } else {
    const img = document.createElement('img');
    img.src = def.src; img.alt = def.caption; img.loading = 'lazy';
    f.appendChild(img);
  }
  if (def.wave) {
    const cv = document.createElement('canvas');
    cv.className = 'wave';
    f.appendChild(cv);
    requestAnimationFrame(() => startWave(cv));
  }
  const cap = document.createElement('figcaption');
  cap.textContent = def.caption;
  f.appendChild(cap);
  return f;
}
/* 脑电波：在图上叠加实时跳动的波形 */
function startWave(cv) {
  const ctx = cv.getContext('2d');
  const W = cv.width = cv.clientWidth * devicePixelRatio || 600;
  const H = cv.height = cv.clientHeight * devicePixelRatio || 120;
  let x = 0;
  const speed = 2.2 * devicePixelRatio;
  (function frame() {
    if (!cv.isConnected) return;
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(120,255,170,.9)';
    ctx.lineWidth = 1.6 * devicePixelRatio;
    ctx.shadowColor = 'rgba(80,255,150,.8)';
    ctx.shadowBlur = 8 * devicePixelRatio;
    ctx.beginPath();
    for (let px = 0; px < W; px++) {
      const t = (px + x) / W * 6.28 * 2.4;
      const spike = Math.pow(Math.max(0, Math.sin(t * 3)), 14) * 0.75;
      const jitter = Math.sin(t * 7.3) * 0.06 + Math.sin(t * 1.7) * 0.1;
      const y = H * (0.62 - spike - jitter);
      px === 0 ? ctx.moveTo(px, y) : ctx.lineTo(px, y);
    }
    ctx.stroke();
    x += speed;
    requestAnimationFrame(frame);
  })();
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
    frag.appendChild(plateNode(IMAGES[seg.img]));
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

/* ───────── 自动播放 ───────── */
let autoMode = false, autoTimer = null, segBusy = false;
function setAuto(on) {
  autoMode = on;
  $('#auto-ind').classList.toggle('show', on);
  if (!on && autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
  if (on) scheduleNext();
}
function scheduleNext(delay) {
  if (!autoMode) return;
  clearTimeout(autoTimer);
  autoTimer = setTimeout(() => { if (autoMode) advance(); }, delay || 2200);
}
function segDwell(seg) {
  if (seg.voice && state.sound) {
    return playVoice(seg.voice).then((ms) => ms + 900);
  }
  const len = (seg.text || '').length;
  return Promise.resolve(Math.min(6500, 1100 + len * 95));
}

/* ───────── 推进 ───────── */
function curSeg() { return CHAPTERS[state.c].seg[state.i]; }

function applySegment(seg) {
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
  if (state.done || segBusy) return;
  segBusy = true;
  setTimeout(() => { segBusy = false; }, 280);
  const ch = CHAPTERS[state.c];
  if (state.i + 1 >= ch.seg.length) {
    if (state.c + 1 >= CHAPTERS.length) { setAuto(false); showEnding(); return; }
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
  if (state.i === 0) {
    showChapterCard(ch, () => {
      setWorld(ch.world);
      playAmbient(ch.ambient);
      applySegment(seg);
      if (autoMode) segDwell(seg).then(scheduleNext);
    });
    return;
  }
  applySegment(seg);
  if (autoMode) segDwell(seg).then(scheduleNext);
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
  playAmbient('none');
  enterReader(true);
});
$('#btn-continue').addEventListener('click', () => enterReader(false));
if (state.i >= 0 && !state.done) $('#btn-continue').classList.remove('hidden');

/* ───────── 手势：轻触 / 上滑 / 长按自动播放 ───────── */
let pressTimer = null, touchY = null, longPressed = false;
const reader = $('#reader');

function tapAdvance() { advance(); }

reader.addEventListener('click', (e) => {
  if (e.target.closest('.icon-btn') || e.target.closest('#clue-drawer')) return;
  if (longPressed) { longPressed = false; return; }
  if (autoMode) { setAuto(false); return; }
  tapAdvance();
});
reader.addEventListener('touchstart', (e) => {
  touchY = e.touches[0].clientY;
  longPressed = false;
  clearTimeout(pressTimer);
  pressTimer = setTimeout(() => {
    longPressed = true;
    if (!autoMode) { setAuto(true); vibrate(50); }
  }, 620);
}, { passive: true });
reader.addEventListener('touchmove', (e) => {
  if (touchY !== null && Math.abs(e.touches[0].clientY - touchY) > 12) clearTimeout(pressTimer);
}, { passive: true });
reader.addEventListener('touchend', (e) => {
  clearTimeout(pressTimer);
  if (touchY === null) return;
  const dy = e.changedTouches[0].clientY - touchY;
  touchY = null;
  if (dy < -60) {
    // 上滑推进
    if (autoMode) { setAuto(false); return; }
    longPressed = true; // 抑制紧随的 click
    tapAdvance();
    setTimeout(() => { longPressed = false; }, 350);
  }
});
reader.addEventListener('contextmenu', (e) => e.preventDefault());

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
  if (!state.sound) { if (curAmbient) curAmbient.pause(); if (curVoice) curVoice.pause(); }
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
