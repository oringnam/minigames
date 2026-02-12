// Delivery Dash - vanilla canvas top-down action mini-game
// Desktop: WASD/Arrows move, Space dash, P pause, Enter start/restart, 1-3 pick upgrade
// Mobile: left drag move, right tap dash, tap upgrade card

(() => {
  'use strict';

  /** @type {HTMLCanvasElement} */
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const BUILD = '20260211-0020';

  // Level-up pacing (triangular numbers): 1 -> 3 -> 6 -> 10 -> ...
  // next threshold after n level-ups completed = T(n+1) = (n+1)(n+2)/2
  const nextLevelUpAt = (levelUpCount) => ((levelUpCount + 1) * (levelUpCount + 2)) / 2;

  const toastEl = document.getElementById('toast');
  
  // Score board (GameUI)
  let scoreBoard = null;
  if (typeof GameUI !== 'undefined') {
    scoreBoard = GameUI.createScoreBoard({
      items: [
        { id: 'score', label: '점수', value: 0 },
        { id: 'deliveries', label: '배달', value: 0 },
        { id: 'time', label: '시간', value: '60s' }
      ],
      containerId: 'scoreBoard'
    });
  }

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);

  const COLORS = {
    fg: '#e8eefc',
    muted: '#a5b3d6',
    accent: '#56f0c2',
    danger: '#ff4d6d',
    soft: 'rgba(255,255,255,.08)',
    soft2: 'rgba(255,255,255,.14)',
  };

  const keysDown = new Set();
  let lastInputTs = 0;
  let lastTouchTs = 0;

  const isTouchDevice = (() => {
    try {
      return ('ontouchstart' in window) || (navigator.maxTouchPoints || 0) > 0;
    } catch {
      return false;
    }
  })();


  // Touch controls: left stick + dash button (DOM gamepad UI on mobile)
  const touch = {
    // stick center/cur are in CSS pixels (screen space)
    stick: { active: false, pointerId: null, centerXCss: 0, centerYCss: 0, curXCss: 0, curYCss: 0, radiusCss: 68 },
    axisX: 0,
    axisY: 0,
    dashRequested: false,
  };

  function eventToWorld(e) {
    const rect = canvas.getBoundingClientRect();
    const xCss = e.clientX - rect.left;
    const yCss = e.clientY - rect.top;
    const x = (xCss / rect.width) * W;
    const y = (yCss / rect.height) * H;
    return { x, y, rect, xCss, yCss };
  }

  // DOM gamepad UI (shown on mobile)
  const padLeft = document.getElementById('pad-left');
  const dashBtn = document.getElementById('pad-dash');
  const stickKnob = document.getElementById('stick-knob');

  function setKnob(dx, dy) {
    if (!stickKnob) return;
    stickKnob.style.setProperty('--dx', `${dx.toFixed(1)}px`);
    stickKnob.style.setProperty('--dy', `${dy.toFixed(1)}px`);
  }

  function resetStick() {
    touch.stick.active = false;
    touch.stick.pointerId = null;
    touch.axisX = 0;
    touch.axisY = 0;
    setKnob(0, 0);
  }

  function updateStickAxisFromPad() {
    const st = touch.stick;
    const dx = st.curXCss - st.centerXCss;
    const dy = st.curYCss - st.centerYCss;

    const r = st.radiusCss;
    const d = Math.hypot(dx, dy) || 1;
    const k = Math.min(1, r / d);

    const ndx = dx * k;
    const ndy = dy * k;

    touch.axisX = ndx / r;
    touch.axisY = ndy / r;
    setKnob(ndx, ndy);
  }

  if (padLeft) {
    padLeft.addEventListener('contextmenu', (e) => e.preventDefault());

    padLeft.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      lastTouchTs = performance.now();
      padLeft.setPointerCapture?.(e.pointerId);

      touch.stick.active = true;
      touch.stick.pointerId = e.pointerId;
      const rect = padLeft.getBoundingClientRect();
      touch.stick.centerXCss = rect.left + rect.width * 0.5;
      touch.stick.centerYCss = rect.top + rect.height * 0.5;
      touch.stick.curXCss = e.clientX;
      touch.stick.curYCss = e.clientY;
      updateStickAxisFromPad();
    }, { passive: false });

    padLeft.addEventListener('pointermove', (e) => {
      if (!touch.stick.active) return;
      if (touch.stick.pointerId !== e.pointerId) return;
      e.preventDefault();
      lastTouchTs = performance.now();
      touch.stick.curXCss = e.clientX;
      touch.stick.curYCss = e.clientY;
      updateStickAxisFromPad();
    }, { passive: false });

    padLeft.addEventListener('pointerup', (e) => {
      if (touch.stick.active && touch.stick.pointerId === e.pointerId) resetStick();
    });

    padLeft.addEventListener('pointercancel', (e) => {
      if (touch.stick.active && touch.stick.pointerId === e.pointerId) resetStick();
    });
  }

  if (dashBtn) {
    dashBtn.addEventListener('contextmenu', (e) => e.preventDefault());
    dashBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      lastTouchTs = performance.now();
      touch.dashRequested = true;
    }, { passive: false });
  }

  function pointInRect(px, py, r) {
    return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
  }

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    lastTouchTs = performance.now();

    // Tap to start/restart
    if (state.mode === 'title') { startGame(); return; }
    if (state.gameOver) { startGame(); return; }

    const ev = eventToWorld(e);

    // Upgrade selection by tap
    if (state.mode === 'upgrade') {
      if (state.uiUpgradeBoxes?.length) {
        for (let i = 0; i < state.uiUpgradeBoxes.length; i++) {
          if (pointInRect(ev.x, ev.y, state.uiUpgradeBoxes[i])) {
            pickUpgrade(i);
            return;
          }
        }
      }
      return;
    }

    // During play, canvas taps are ignored (mobile uses the gamepad UI below the map).
  }, { passive: false });

  canvas.addEventListener('pointermove', (e) => {
    if (!touch.stick.active) return;
    if (touch.stick.pointerId !== e.pointerId) return;
    e.preventDefault();
    lastTouchTs = performance.now();

    const ev = eventToWorld(e);
    touch.stick.curX = ev.x;
    touch.stick.curY = ev.y;
    updateStickAxis(ev.rect);
  }, { passive: false });

  canvas.addEventListener('pointerup', (e) => {
    if (touch.stick.active && touch.stick.pointerId === e.pointerId) resetStick();
  });

  canvas.addEventListener('pointercancel', (e) => {
    if (touch.stick.active && touch.stick.pointerId === e.pointerId) resetStick();
  });

  window.addEventListener('keydown', (e) => {
    const kRaw = e.key;
    const k = kRaw.toLowerCase();
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Spacebar'].includes(kRaw)) e.preventDefault();

    // Upgrade selection
    if (state.mode === 'upgrade' && !state.gameOver) {
      if (k === '1' || k === '2' || k === '3') {
        pickUpgrade(parseInt(k, 10) - 1);
        return;
      }
    }

    keysDown.add(k);
    lastInputTs = performance.now();

    // one-shot controls
    if (k === 'p') togglePause();
    if (kRaw === 'Enter') {
      if (state.mode !== 'playing') startGame();
      else if (state.gameOver) startGame();
    }
    if (kRaw === ' ') tryDash();
  }, { passive: false });

  window.addEventListener('keyup', (e) => {
    keysDown.delete(e.key.toLowerCase());
  });

  function axis() {
    // Combine keyboard + touch stick
    let x = 0, y = 0;
    if (keysDown.has('a') || keysDown.has('arrowleft')) x -= 1;
    if (keysDown.has('d') || keysDown.has('arrowright')) x += 1;
    if (keysDown.has('w') || keysDown.has('arrowup')) y -= 1;
    if (keysDown.has('s') || keysDown.has('arrowdown')) y += 1;

    x += touch.axisX;
    y += touch.axisY;

    const m = Math.hypot(x, y) || 1;
    return { x: x / m, y: y / m };
  }

  function toast(msg, ms = 1400) {
    toastEl.textContent = msg;
    toastEl.style.opacity = '1';
    clearTimeout(toast._t);
    toast._t = setTimeout(() => {
      toastEl.style.opacity = '0.0';
    }, ms);
  }

  const state = {
    mode: 'title', // title | playing | paused | upgrade
    t: 0,
    dt: 0,
    lastTs: 0,

    // Short session (mini-run)
    timeLimit: 60, // seconds
    timeLeft: 60,
    endReason: null, // 'hp' | 'time'

    score: 0,
    scoreMult: 1,
    deliveries: 0,

    // level-ups
    levelUpCount: 0,
    nextLevelUpAt: nextLevelUpAt(0),

    gameOver: false,

    enemySpeedMult: 1,

    player: null,
    drones: [],
    bullets: [],
    mines: [],
    explosions: [],

    obstacles: [],

    pkg: null,
    drop: null,

    difficulty: 0,
    shake: 0,

    carry: false,

    // upgrade UI
    upgradeChoices: null,
    uiUpgradeBoxes: null,
  };

  function makePlayer() {
    return {
      x: W * 0.5,
      y: H * 0.5,
      vx: 0,
      vy: 0,
      r: 14,
      baseSpeed: 240,
      hp: 3,
      hpMax: 6,

      pickupBonus: 0,
      dropBonus: 0,

      dashCd: 0,
      dashCdBase: 1.10,
      dashActive: 0,
      dashDuration: 0.16,
      dashDirX: 0,
      dashDirY: 0,

      iFrames: 0,
    };
  }

  function makeDrone(x, y, speed, type = 'chaser') {
    return {
      type,
      x, y,
      vx: 0,
      vy: 0,
      r: 12,
      speed,
      wobble: rand(0, Math.PI * 2),
      hitCd: 0,

      // type-specific
      shotCd: rand(0.3, 1.0),
      chargeCd: rand(0.8, 2.0),
      chargeTime: 0,
      chargeDirX: 0,
      chargeDirY: 0,
    };
  }

  function makeBullet(x, y, vx, vy) {
    return { x, y, vx, vy, r: 4, life: 2.6 };
  }

  function spawnPackage() {
    const pad = 40;
    for (let attempt = 0; attempt < 30; attempt++) {
      const x = rand(pad, W - pad);
      const y = rand(pad, H - pad);
      if (circleHitsObstacles(x, y, 16)) continue;
      state.pkg = { x, y, r: 10, pulse: rand(0, Math.PI * 2) };
      return;
    }
    // fallback
    state.pkg = { x: W * 0.5, y: H * 0.25, r: 10, pulse: rand(0, Math.PI * 2) };
  }

  function spawnDropZone() {
    const p = state.player;
    // Prefer top/bottom-ish to make routes in portrait map.
    const pad = 70;
    const spots = [
      { x: W * 0.5, y: pad },
      { x: W * 0.5, y: H - pad },
      { x: pad, y: pad },
      { x: W - pad, y: pad },
      { x: pad, y: H - pad },
      { x: W - pad, y: H - pad },
    ];

    for (let attempt = 0; attempt < 24; attempt++) {
      const s = spots[(Math.random() * spots.length) | 0];
      const x = s.x + rand(-30, 30);
      const y = s.y + rand(-30, 30);
      const r = 28 + (p?.dropBonus || 0);
      if (circleHitsObstacles(x, y, r + 8)) continue;
      state.drop = { x, y, r, pulse: rand(0, Math.PI * 2) };
      return;
    }

    state.drop = { x: W * 0.5, y: H - pad, r: 28 + (p?.dropBonus || 0), pulse: rand(0, Math.PI * 2) };
  }

  function spawnMine() {
    const pad = 50;
    const p = state.player;
    for (let attempt = 0; attempt < 12; attempt++) {
      const x = rand(pad, W - pad);
      const y = rand(pad, H - pad);
      if (p && Math.hypot(x - p.x, y - p.y) < 140) continue;
      if (state.drop && Math.hypot(x - state.drop.x, y - state.drop.y) < 120) continue;
      state.mines.push({ x, y, r: 9, arm: 0.7, fuse: 0, pulse: rand(0, Math.PI * 2) });
      return;
    }
  }

  function circleHit(ax, ay, ar, bx, by, br) {
    const dx = ax - bx, dy = ay - by;
    return (dx * dx + dy * dy) <= (ar + br) * (ar + br);
  }

  function circleRectHit(cx, cy, cr, rx, ry, rw, rh) {
    const nx = clamp(cx, rx, rx + rw);
    const ny = clamp(cy, ry, ry + rh);
    const dx = cx - nx;
    const dy = cy - ny;
    return (dx * dx + dy * dy) <= cr * cr;
  }

  function resolveCircleRect(ent, r, rect) {
    const nx = clamp(ent.x, rect.x, rect.x + rect.w);
    const ny = clamp(ent.y, rect.y, rect.y + rect.h);
    let dx = ent.x - nx;
    let dy = ent.y - ny;
    const d2 = dx * dx + dy * dy;
    if (d2 >= r * r) return false;

    // If exactly inside (rare), push out to nearest side.
    if (dx === 0 && dy === 0) {
      const left = ent.x - rect.x;
      const right = (rect.x + rect.w) - ent.x;
      const top = ent.y - rect.y;
      const bottom = (rect.y + rect.h) - ent.y;
      const m = Math.min(left, right, top, bottom);
      if (m === left) ent.x = rect.x - r;
      else if (m === right) ent.x = rect.x + rect.w + r;
      else if (m === top) ent.y = rect.y - r;
      else ent.y = rect.y + rect.h + r;
      return true;
    }

    const dist = Math.sqrt(d2) || 1;
    const push = (r - dist) + 0.01;
    ent.x += (dx / dist) * push;
    ent.y += (dy / dist) * push;
    return true;
  }

  function circleHitsObstacles(x, y, r) {
    for (const o of state.obstacles) {
      if (circleRectHit(x, y, r, o.x, o.y, o.w, o.h)) return true;
    }
    return false;
  }

  function resolveCircleVsObstacles(ent, r) {
    // resolve a few iterations to avoid corner sticking
    for (let iter = 0; iter < 4; iter++) {
      let moved = false;
      for (const o of state.obstacles) {
        if (resolveCircleRect(ent, r, o)) moved = true;
      }
      if (!moved) break;
    }
  }

  function spawnObstacles() {
    state.obstacles = [];

    // small set of rectangles; keep center area less crowded
    const count = 7;
    const pad = 22;
    const avoidX = W * 0.5;
    const avoidY = H * 0.5;

    for (let i = 0; i < count; i++) {
      for (let attempt = 0; attempt < 40; attempt++) {
        const w = 70 + Math.random() * 120;
        const h = 40 + Math.random() * 110;
        const x = rand(pad, W - pad - w);
        const y = rand(pad, H - pad - h);

        // avoid spawning too close to the player's initial area
        const cx = x + w * 0.5;
        const cy = y + h * 0.5;
        if (Math.hypot(cx - avoidX, cy - avoidY) < 170) continue;

        // avoid overlaps with other obstacles
        let ok = true;
        for (const o of state.obstacles) {
          const sep = 18;
          if (!(x + w + sep < o.x || x > o.x + o.w + sep || y + h + sep < o.y || y > o.y + o.h + sep)) {
            ok = false;
            break;
          }
        }
        if (!ok) continue;

        state.obstacles.push({ x, y, w, h });
        break;
      }
    }
  }

  function navReachable(ax, ay, bx, by, clearR) {
    const step = 26;
    const cols = Math.ceil(W / step);
    const rows = Math.ceil(H / step);

    const toCell = (x, y) => {
      const cx = clamp(Math.floor(x / step), 0, cols - 1);
      const cy = clamp(Math.floor(y / step), 0, rows - 1);
      return [cx, cy];
    };

    const [sx, sy] = toCell(ax, ay);
    const [gx, gy] = toCell(bx, by);

    const idx = (x, y) => y * cols + x;
    const visited = new Uint8Array(cols * rows);
    const qx = new Int16Array(cols * rows);
    const qy = new Int16Array(cols * rows);
    let qh = 0, qt = 0;

    const cellFree = (x, y) => {
      const px = x * step + step * 0.5;
      const py = y * step + step * 0.5;
      if (px < clearR || px > W - clearR || py < clearR || py > H - clearR) return false;
      return !circleHitsObstacles(px, py, clearR);
    };

    if (!cellFree(sx, sy) || !cellFree(gx, gy)) return false;

    visited[idx(sx, sy)] = 1;
    qx[qt] = sx; qy[qt] = sy; qt++;

    while (qh < qt) {
      const x = qx[qh];
      const y = qy[qh];
      qh++;

      if (x === gx && y === gy) return true;

      const nbs = [
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1],
      ];

      for (const [nx, ny] of nbs) {
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        const id = idx(nx, ny);
        if (visited[id]) continue;
        if (!cellFree(nx, ny)) continue;
        visited[id] = 1;
        qx[qt] = nx; qy[qt] = ny; qt++;
      }
    }

    return false;
  }

  function rerollMap(reason = 'start') {
    const p = state.player;
    if (!p) return;

    // When the map changes, re-center player so it never spawns inside obstacles.
    p.x = W * 0.5;
    p.y = H * 0.62;
    p.vx = 0; p.vy = 0;

    const clearR = p.r + 10;

    for (let attempt = 0; attempt < 28; attempt++) {
      spawnObstacles();
      spawnPackage();
      spawnDropZone();

      // ensure we have at least one valid route
      if (!state.pkg || !state.drop) continue;
      if (!navReachable(p.x, p.y, state.pkg.x, state.pkg.y, clearR)) continue;
      if (!navReachable(state.pkg.x, state.pkg.y, state.drop.x, state.drop.y, clearR)) continue;
      if (!navReachable(p.x, p.y, state.drop.x, state.drop.y, clearR)) continue;

      resolveCircleVsObstacles(p, p.r);

      if (reason === 'levelup') {
        // If obstacles changed mid-run, clear things that can end up inside new walls.
        state.mines = [];
        state.explosions = [];
        state.bullets = [];

        // Re-spawn drones so they never start embedded in a new wall.
        // Also ramp difficulty slightly on level-up by adding +1 drone.
        const keep = Math.max(1, state.drones.length + 1);
        state.drones = [];
        spawnDroneAtEdge(keep);
      }

      return;
    }

    // fallback: no obstacles
    state.obstacles = [];
    spawnPackage();
    spawnDropZone();
  }

  function resetWorld() {
    state.t = 0;
    state.score = 0;
    state.scoreMult = 1;
    state.deliveries = 0;

    state.levelUpCount = 0;
    state.nextLevelUpAt = nextLevelUpAt(0);

    state.difficulty = 0;
    state.enemySpeedMult = 1;

    state.gameOver = false;
    state.endReason = null;
    state.carry = false;
    state.shake = 0;

    state.timeLeft = state.timeLimit;

    state.player = makePlayer();
    state.drones = [];
    state.bullets = [];
    state.mines = [];
    state.explosions = [];
    state.obstacles = [];

    state.upgradeChoices = null;
    state.uiUpgradeBoxes = null;

    // Build a new map + ensure routes exist
    rerollMap('start');

    // Start with 1 chaser.
    spawnDroneAtEdge(1, true);
  }

  function chooseDroneType() {
    // Ramp: introduce new types after some deliveries.
    const d = state.deliveries;
    if (d < 2) return 'chaser';
    const r = Math.random();
    // weights shift slightly with progress
    const wSniper = Math.min(0.35, 0.20 + d * 0.02);
    const wCharger = Math.min(0.22, 0.10 + d * 0.01);
    const wChaser = Math.max(0.35, 1 - (wSniper + wCharger));
    if (r < wChaser) return 'chaser';
    if (r < wChaser + wSniper) return 'sniper';
    return 'charger';
  }

  function spawnDroneAtEdge(n = 1, forceChaser = false) {
    for (let i = 0; i < n; i++) {
      const side = (Math.random() * 4) | 0;
      let x, y;
      if (side === 0) { x = -20; y = rand(0, H); }
      if (side === 1) { x = W + 20; y = rand(0, H); }
      if (side === 2) { x = rand(0, W); y = -20; }
      if (side === 3) { x = rand(0, W); y = H + 20; }

      const type = forceChaser ? 'chaser' : chooseDroneType();
      const base = 165 + state.deliveries * 10;

      let speed = base + rand(-10, 20);
      if (type === 'sniper') speed *= 0.92;
      if (type === 'charger') speed *= 0.88;

      speed *= state.enemySpeedMult;
      state.drones.push(makeDrone(x, y, speed, type));
    }
  }

  function startGame() {
    // Save high score if game was over
    if (state.gameOver && typeof GameUtils !== 'undefined') {
      const finalScore = Math.floor(state.score);
      GameUtils.updateHighScore('delivery-dash', finalScore);
    }
    
    resetWorld();
    state.mode = 'playing';
    resetStick();
    toast(isTouchDevice ? '왼쪽 드래그 이동 · 오른쪽 탭 대시' : 'Space 대시 · P 일시정지 · 배달 후 1-3 업그레이드', 1800);
  }

  function togglePause() {
    if (state.mode === 'playing') {
      state.mode = 'paused';
      toast('일시정지 (P로 재개)', 1200);
    } else if (state.mode === 'paused') {
      state.mode = 'playing';
      toast('재개', 700);
    }
  }

  function tryDash() {
    if (state.mode !== 'playing' || state.gameOver) return;
    const p = state.player;
    if (p.dashCd > 0 || p.dashActive > 0) return;

    const a = axis();
    // If no direction input, dash towards last velocity (or up).
    let dx = a.x, dy = a.y;
    if (Math.abs(dx) + Math.abs(dy) < 0.01) {
      const vm = Math.hypot(p.vx, p.vy);
      if (vm > 1) { dx = p.vx / vm; dy = p.vy / vm; }
      else { dx = 0; dy = -1; }
    }

    p.dashDirX = dx;
    p.dashDirY = dy;
    p.dashActive = p.dashDuration;
    p.dashCd = p.dashCdBase;
    state.shake = 6;
  }

  // ----- Upgrades -----
  const UPGRADE_POOL = [
    {
      id: 'speed',
      name: '신발',
      desc: '이동속도 +25',
      apply: (s, p) => { p.baseSpeed += 25; },
    },
    {
      id: 'dash_cd',
      name: '대시 냉각',
      desc: '대시 쿨다운 -0.12s',
      apply: (s, p) => { p.dashCdBase = Math.max(0.45, p.dashCdBase - 0.12); },
    },
    {
      id: 'dash_len',
      name: '대시 부스터',
      desc: '대시 지속시간 +0.03s',
      apply: (s, p) => { p.dashDuration = Math.min(0.28, p.dashDuration + 0.03); },
    },
    {
      id: 'hp',
      name: '수리 키트',
      desc: 'HP +1 (최대 6)',
      available: (s, p) => p.hp < p.hpMax,
      apply: (s, p) => { p.hp = Math.min(p.hpMax, p.hp + 1); },
    },
    {
      id: 'score',
      name: '프리미엄 계약',
      desc: '점수 x1.15',
      apply: (s, p) => { s.scoreMult *= 1.15; },
    },
    {
      id: 'slow',
      name: '재머',
      desc: '드론 속도 -8%',
      apply: (s, p) => {
        s.enemySpeedMult *= 0.92;
        for (const d of s.drones) d.speed *= 0.92;
      },
    },
    {
      id: 'pickup',
      name: '자석',
      desc: '픽업 범위 +10',
      apply: (s, p) => { p.pickupBonus += 10; },
    },
    {
      id: 'drop',
      name: '정밀 배달',
      desc: '배달존 범위 +6',
      apply: (s, p) => { p.dropBonus += 6; if (s.drop) s.drop.r += 6; },
    },
    {
      id: 'time',
      name: '시간 연장',
      desc: '남은 시간 +8s (상한 120s)',
      apply: (s, p) => { s.timeLimit = Math.min(120, s.timeLimit + 4); s.timeLeft = Math.min(120, s.timeLeft + 8); },
    },
  ];

  function pick3Upgrades() {
    const p = state.player;
    const pool = UPGRADE_POOL.filter(u => (u.available ? u.available(state, p) : true));
    // shuffle partial
    for (let i = pool.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, 3);
  }

  function openUpgrade() {
    state.mode = 'upgrade';
    // Upgrade 화면에서는 글씨 가독성이 중요해서 화면 흔들림을 끔
    state.shake = 0;
    state.upgradeChoices = pick3Upgrades();
    state.uiUpgradeBoxes = null;
  }

  function pickUpgrade(index) {
    if (state.mode !== 'upgrade' || state.gameOver) return;
    const choices = state.upgradeChoices;
    if (!choices || !choices[index]) return;

    const p = state.player;
    const u = choices[index];
    u.apply(state, p);

    // Small grace period
    p.iFrames = Math.max(p.iFrames, 0.75);

    state.upgradeChoices = null;
    state.uiUpgradeBoxes = null;
    state.mode = 'playing';

    toast(`${u.name}!`, 900);
  }

  function damagePlayer(amount, msg) {
    const p = state.player;
    if (p.iFrames > 0) return;
    p.hp -= amount;
    p.iFrames = 0.65;
    state.shake = 14;
    if (msg) toast(msg, 1100);
    if (p.hp <= 0) {
      state.gameOver = true;
      state.endReason = 'hp';
    }
  }

  // ----- Update -----
  function update(dt) {
    if (state.mode !== 'playing') return;
    if (state.gameOver) return;

    // Touch dash (one-shot)
    if (touch.dashRequested) {
      touch.dashRequested = false;
      tryDash();
    }

    // Timed mini-run
    state.timeLeft = Math.max(0, state.timeLeft - dt);
    if (state.timeLeft <= 0) {
      state.gameOver = true;
      state.endReason = 'time';
      toast('시간 종료! (탭/Enter로 재시작)', 1400);
      return;
    }

    const p = state.player;
    p.iFrames = Math.max(0, p.iFrames - dt);

    p.dashCd = Math.max(0, p.dashCd - dt);
    p.dashActive = Math.max(0, p.dashActive - dt);

    // Player move
    const a = axis();
    let speed = p.baseSpeed;
    if (p.dashActive > 0) speed = 560;

    const targetVx = (p.dashActive > 0 ? p.dashDirX : a.x) * speed;
    const targetVy = (p.dashActive > 0 ? p.dashDirY : a.y) * speed;
    const k = p.dashActive > 0 ? 0.55 : 0.18;
    p.vx = lerp(p.vx, targetVx, 1 - Math.pow(1 - k, dt * 60));
    p.vy = lerp(p.vy, targetVy, 1 - Math.pow(1 - k, dt * 60));

    p.x += p.vx * dt;
    p.y += p.vy * dt;

    p.x = clamp(p.x, p.r, W - p.r);
    p.y = clamp(p.y, p.r, H - p.r);
    resolveCircleVsObstacles(p, p.r);
    p.x = clamp(p.x, p.r, W - p.r);
    p.y = clamp(p.y, p.r, H - p.r);

    // Mines
    for (let i = state.mines.length - 1; i >= 0; i--) {
      const m = state.mines[i];
      m.pulse += dt * 4.0;
      if (m.arm > 0) {
        m.arm = Math.max(0, m.arm - dt);
      } else {
        const d = Math.hypot(p.x - m.x, p.y - m.y);
        if (m.fuse <= 0 && d < 52) m.fuse = 0.38;
        if (m.fuse > 0) {
          m.fuse = Math.max(0, m.fuse - dt);
          if (m.fuse <= 0) {
            state.explosions.push({ x: m.x, y: m.y, t: 0.18, r: 0, maxR: 72 });
            state.mines.splice(i, 1);
          }
        }
      }
    }

    for (let i = state.explosions.length - 1; i >= 0; i--) {
      const ex = state.explosions[i];
      ex.t -= dt;
      ex.r = lerp(ex.r, ex.maxR, 1 - Math.pow(1 - 0.35, dt * 60));
      if (circleHit(p.x, p.y, p.r, ex.x, ex.y, ex.r)) {
        damagePlayer(1, '폭발!');
      }
      if (ex.t <= 0) state.explosions.splice(i, 1);
    }

    // Package pickup
    if (!state.carry && state.pkg) {
      const pickupR = state.pkg.r + 4 + p.pickupBonus;
      if (circleHit(p.x, p.y, p.r, state.pkg.x, state.pkg.y, pickupR)) {
        state.carry = true;
        state.score += 50 * state.scoreMult;
        toast('패키지 픽업! 배달 지점으로!', 900);
      }
    }

    // Delivery
    if (state.carry && state.drop) {
      if (circleHit(p.x, p.y, p.r, state.drop.x, state.drop.y, state.drop.r)) {
        state.carry = false;
        state.deliveries += 1;
        state.score += (250 + Math.floor(state.deliveries * 12)) * state.scoreMult;
        state.difficulty += 1;
        state.shake = 10;

        // Difficulty ramp (scales with level)
        const lv = state.levelUpCount;
        for (const d of state.drones) d.speed += 8 * (1 + lv * 0.22);

        const droneEvery = Math.max(1, 3 - Math.floor(lv / 2)); // higher level -> more frequent spawns
        const mineEvery = Math.max(1, 2 - Math.floor(lv / 3));

        if (state.deliveries % droneEvery === 0) spawnDroneAtEdge(1);
        if (state.deliveries % mineEvery === 0) spawnMine();

        // Level-up pacing: 1 -> 3 -> 6 -> 10 -> ...
        const shouldLevelUp = state.deliveries >= state.nextLevelUpAt;

        if (shouldLevelUp) {
          state.levelUpCount += 1;
          state.nextLevelUpAt = nextLevelUpAt(state.levelUpCount);

          // Harder as you level up
          state.enemySpeedMult = 1 + state.levelUpCount * 0.18;

          // Map changes on every level-up
          rerollMap('levelup');

          openUpgrade();
          toast(isTouchDevice ? '업그레이드 탭해서 선택' : '업그레이드 선택: 1/2/3', 1200);
          return;
        }

        // normal next route
        spawnPackage();
        spawnDropZone();
      }
    }

    // Bullets
    for (let i = state.bullets.length - 1; i >= 0; i--) {
      const b = state.bullets[i];
      b.life -= dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.life <= 0 || b.x < -30 || b.x > W + 30 || b.y < -30 || b.y > H + 30) {
        state.bullets.splice(i, 1);
        continue;
      }

      // obstacles
      for (const o of state.obstacles) {
        if (circleRectHit(b.x, b.y, b.r, o.x, o.y, o.w, o.h)) {
          state.bullets.splice(i, 1);
          break;
        }
      }
      if (!state.bullets[i]) continue;
      if (circleHit(p.x, p.y, p.r, b.x, b.y, b.r)) {
        state.bullets.splice(i, 1);
        damagePlayer(1, '피격!');
      }
    }

    // Drones
    for (const d of state.drones) {
      d.hitCd = Math.max(0, d.hitCd - dt);
      d.wobble += dt * 2.2;

      const dx = p.x - d.x;
      const dy = p.y - d.y;
      const dist = Math.hypot(dx, dy) || 1;
      const ux = dx / dist;
      const uy = dy / dist;

      // Behavior by type
      let tx = ux, ty = uy;
      let sp = d.speed;

      if (d.type === 'sniper') {
        // keep distance + strafe
        const idealMin = 210;
        const idealMax = 320;
        if (dist < idealMin) { tx = -ux; ty = -uy; }
        else if (dist > idealMax) { tx = ux; ty = uy; }
        else { tx = 0; ty = 0; }

        const px = -uy, py = ux;
        const str = Math.sin(d.wobble) * 0.85;
        tx += px * str;
        ty += py * str;
        const nm = Math.hypot(tx, ty) || 1;
        tx /= nm; ty /= nm;

        sp *= 0.92;

        // Shoot
        d.shotCd -= dt;
        if (d.shotCd <= 0 && dist < 520) {
          d.shotCd = Math.max(0.55, 1.18 - state.deliveries * 0.03) + rand(0, 0.35);
          const bv = 540;
          state.bullets.push(makeBullet(d.x, d.y, ux * bv, uy * bv));
        }
      }

      if (d.type === 'charger') {
        d.chargeCd -= dt;
        if (d.chargeTime > 0) {
          d.chargeTime = Math.max(0, d.chargeTime - dt);
          tx = d.chargeDirX;
          ty = d.chargeDirY;
          sp = 560;
        } else if (d.chargeCd <= 0 && dist < 520) {
          d.chargeCd = Math.max(1.6, 2.5 - state.deliveries * 0.05) + rand(0, 0.4);
          d.chargeTime = 0.34;
          d.chargeDirX = ux;
          d.chargeDirY = uy;
          tx = ux;
          ty = uy;
          sp = 560;
        } else {
          sp *= 0.88;
          // slight wobble
          const wob = Math.sin(d.wobble) * 0.12;
          const wx = ux * Math.cos(wob) - uy * Math.sin(wob);
          const wy = ux * Math.sin(wob) + uy * Math.cos(wob);
          tx = wx; ty = wy;
        }
      }

      if (d.type === 'chaser') {
        const wob = Math.sin(d.wobble) * 0.18;
        const wx = ux * Math.cos(wob) - uy * Math.sin(wob);
        const wy = ux * Math.sin(wob) + uy * Math.cos(wob);
        tx = wx; ty = wy;
      }

      const targetVx = tx * sp;
      const targetVy = ty * sp;
      d.vx = lerp(d.vx, targetVx, 1 - Math.pow(1 - 0.10, dt * 60));
      d.vy = lerp(d.vy, targetVy, 1 - Math.pow(1 - 0.10, dt * 60));

      d.x += d.vx * dt;
      d.y += d.vy * dt;

      d.x = clamp(d.x, -30, W + 30);
      d.y = clamp(d.y, -30, H + 30);
      resolveCircleVsObstacles(d, d.r);

      // Contact damage
      if (d.hitCd <= 0 && circleHit(p.x, p.y, p.r, d.x, d.y, d.r)) {
        d.hitCd = 0.75;
        damagePlayer(1, p.hp > 1 ? `접촉! HP ${Math.max(0, p.hp - 1)}` : '격추됨…');

        // knockback
        const kx = (p.x - d.x) / (dist || 1);
        const ky = (p.y - d.y) / (dist || 1);
        p.vx += kx * 260;
        p.vy += ky * 260;
      }
    }

    // score tick
    state.score += dt * 3 * state.scoreMult;

  }

  // ----- Draw -----
  function drawGrid() {
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = COLORS.soft;
    ctx.lineWidth = 1;
    const step = 40;
    for (let x = 0; x <= W; x += step) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, H);
      ctx.stroke();
    }
    for (let y = 0; y <= H; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(W, y + 0.5);
      ctx.stroke();
    }
    ctx.restore();
  }

  function draw() {
    // 화면 흔들림은 플레이 중에만 (업그레이드/타이틀/일시정지/게임오버에선 가독성 우선)
    const s = (state.mode === 'playing' && !state.gameOver) ? state.shake : 0;
    const ox = s > 0 ? rand(-s, s) : 0;
    const oy = s > 0 ? rand(-s, s) : 0;

    ctx.save();
    ctx.clearRect(0, 0, W, H);
    ctx.translate(ox, oy);

    // background
    ctx.fillStyle = 'rgba(0,0,0,.15)';
    ctx.fillRect(0, 0, W, H);
    drawGrid();

    // obstacles
    for (const o of state.obstacles) {
      ctx.save();
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = 'rgba(255,255,255,.06)';
      ctx.strokeStyle = 'rgba(255,255,255,.14)';
      ctx.lineWidth = 2;
      roundRect(ctx, o.x, o.y, o.w, o.h, 12);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // mines
    for (const m of state.mines) {
      ctx.save();
      const armed = m.arm <= 0;
      const a = armed ? 0.85 : 0.45;
      const blink = armed && m.fuse > 0 ? (0.25 + 0.75 * (0.5 + 0.5 * Math.sin(m.pulse * 6))) : 0.35;
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(255,255,255,.12)';
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r + 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = a;
      ctx.fillStyle = armed ? `rgba(255,77,109,${0.25 + 0.25 * blink})` : 'rgba(255,255,255,.10)';
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = armed ? 'rgba(255,77,109,.55)' : 'rgba(255,255,255,.14)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // explosions
    for (const ex of state.explosions) {
      ctx.save();
      ctx.globalAlpha = 0.32;
      ctx.fillStyle = 'rgba(255,77,109,.25)';
      ctx.beginPath();
      ctx.arc(ex.x, ex.y, ex.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = 'rgba(255,77,109,.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ex.x, ex.y, ex.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // drop zone
    if (state.drop) {
      const z = state.drop;
      z.pulse += state.dt * 2.6;
      const pr = z.r + Math.sin(z.pulse) * 2.0;
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = COLORS.accent;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(z.x, z.y, pr, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.14;
      ctx.fillStyle = COLORS.accent;
      ctx.beginPath();
      ctx.arc(z.x, z.y, pr, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // package
    if (state.pkg && !state.carry) {
      const p = state.pkg;
      p.pulse += state.dt * 4.0;
      const a = 0.65 + Math.sin(p.pulse) * 0.15;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r + 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.22;
      ctx.strokeStyle = COLORS.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r + 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // bullets
    for (const b of state.bullets) {
      ctx.save();
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = 'rgba(120,160,255,.92)';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // drones
    for (const d of state.drones) {
      ctx.save();
      let core = 'rgba(255,77,109,.9)';
      let aura = 'rgba(255,77,109,.0)';
      if (d.type === 'sniper') { core = 'rgba(120,160,255,.92)'; aura = 'rgba(120,160,255,.0)'; }
      if (d.type === 'charger') { core = 'rgba(255,170,64,.92)'; aura = 'rgba(255,170,64,.0)'; }

      const g = ctx.createRadialGradient(d.x - 4, d.y - 4, 2, d.x, d.y, d.r + 10);
      g.addColorStop(0, 'rgba(255,255,255,.35)');
      g.addColorStop(1, aura);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r + 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.95;
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(0,0,0,.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.stroke();

      // eye
      ctx.fillStyle = 'rgba(0,0,0,.45)';
      ctx.beginPath();
      ctx.arc(d.x + Math.cos(d.wobble) * 3, d.y + Math.sin(d.wobble) * 3, 3, 0, Math.PI * 2);
      ctx.fill();

      // charger telegraph
      if (d.type === 'charger' && d.chargeCd < 0.35 && d.chargeTime <= 0) {
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = 'rgba(255,170,64,.65)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r + 10, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    }

    // player
    if (state.player) {
      const p = state.player;
      ctx.save();
      const dashGlow = p.dashActive > 0 ? 0.45 : 0.18;
      const g = ctx.createRadialGradient(p.x - 6, p.y - 6, 2, p.x, p.y, p.r + 18);
      g.addColorStop(0, `rgba(86,240,194,${dashGlow})`);
      g.addColorStop(1, 'rgba(86,240,194,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r + 18, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = p.iFrames > 0 ? 0.65 : 0.98;
      ctx.fillStyle = 'rgba(232,238,252,.95)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(0,0,0,.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.stroke();

      if (state.carry) {
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = 'rgba(86,240,194,.85)';
        ctx.beginPath();
        ctx.arc(p.x + 18, p.y - 18, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }


    // overlays
    if (state.mode === 'title') {
      const sub = isTouchDevice
        ? `탭해서 시작\n왼쪽 드래그 이동 · 오른쪽 탭 대시\n배달 후 업그레이드 선택\n${state.timeLimit}초 미니런`
        : `Enter로 시작\n이동: WASD/방향키 · 대시: Space · 일시정지: P\n배달 후 업그레이드(1~3)\n${state.timeLimit}초 미니런`;
      drawOverlay('Delivery Dash', sub);
    } else if (state.mode === 'paused') {
      drawOverlay('일시정지', isTouchDevice ? 'P로 재개' : 'P로 재개');
    } else if (state.mode === 'upgrade') {
      drawUpgradeOverlay();
    } else if (state.gameOver) {
      const reason = state.endReason === 'time' ? '시간 종료' : '격추됨';
      const restart = isTouchDevice ? '탭해서 재시작' : 'Enter로 재시작';
      drawOverlay(reason, `점수 ${Math.floor(state.score)} · 배달 ${state.deliveries}\n${restart}`);
    }

    ctx.restore();
  }

  function drawOverlay(title, subtitle) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.42)';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = 'rgba(14,19,35,.72)';
    roundRect(ctx, W * 0.5 - 280, H * 0.5 - 130, 560, 260, 18);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,.12)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = COLORS.fg;
    ctx.font = '700 44px ui-sans-serif, system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, W * 0.5, H * 0.5 - 52);

    ctx.fillStyle = 'rgba(232,238,252,.85)';
    ctx.font = '16px ui-sans-serif, system-ui';

    const lines = subtitle.split('\n');
    lines.forEach((ln, i) => {
      ctx.fillText(ln, W * 0.5, H * 0.5 + 8 + i * 22);
    });

    ctx.restore();
  }

  function drawUpgradeOverlay() {
    const choices = state.upgradeChoices;
    if (!choices) return;

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.46)';
    ctx.fillRect(0, 0, W, H);

    const margin = 18;
    const panelW = Math.min(600, W - margin * 2);
    const innerPad = 18;
    const cardH = 76;
    const cardGap = 12;
    const headerH = 98;
    const cardsH = cardH * 3 + cardGap * 2;
    const panelH = Math.min(H - margin * 2, headerH + cardsH + innerPad);

    const px = W * 0.5 - panelW * 0.5;
    const py = clamp(H * 0.5 - panelH * 0.5, margin, H - margin - panelH);

    // panel
    ctx.fillStyle = 'rgba(14,19,35,.78)';
    roundRect(ctx, px, py, panelW, panelH, 18);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,.12)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const titleY = py + 40;
    const hintY = py + 66;

    ctx.fillStyle = COLORS.fg;
    ctx.font = '700 30px ui-sans-serif, system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('업그레이드 선택', W * 0.5, titleY);

    ctx.fillStyle = 'rgba(232,238,252,.75)';
    ctx.font = '14px ui-sans-serif, system-ui';
    const hint = isTouchDevice ? '카드 탭해서 선택' : '1 / 2 / 3 키로 선택';
    ctx.fillText(hint, W * 0.5, hintY);

    // cards
    const boxes = [];
    const cardW = Math.min(520, panelW - innerPad * 2);
    const x = W * 0.5 - cardW * 0.5;
    let y = py + headerH;
    // keep cards fully inside the panel
    const maxY = py + panelH - innerPad - (cardH * 3 + cardGap * 2);
    y = Math.min(y, maxY);

    for (let i = 0; i < 3; i++) {
      const u = choices[i];
      const bx = x;
      const by = y + i * (cardH + cardGap);

      boxes.push({ x: bx, y: by, w: cardW, h: cardH });

      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,.06)';
      roundRect(ctx, bx, by, cardW, cardH, 16);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.12)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      ctx.fillStyle = 'rgba(86,240,194,.85)';
      ctx.font = '700 16px ui-sans-serif, system-ui';
      ctx.fillText(`${i + 1}. ${u.name}`, bx + 16, by + 28);

      ctx.fillStyle = 'rgba(232,238,252,.80)';
      ctx.font = '14px ui-sans-serif, system-ui';
      ctx.fillText(u.desc, bx + 16, by + 52);

      ctx.restore();
    }

    state.uiUpgradeBoxes = boxes;

    ctx.restore();
  }

  function drawTouchUI() {
    // Left stick visual
    if (touch.stick.active) {
      const st = touch.stick;
      const dx = st.curX - st.baseX;
      const dy = st.curY - st.baseY;
      const m = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, 52 / m);
      const knobX = st.baseX + dx * k;
      const knobY = st.baseY + dy * k;

      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = 'rgba(255,255,255,.20)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(st.baseX, st.baseY, 34, 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalAlpha = 0.55;
      ctx.fillStyle = 'rgba(255,255,255,.12)';
      ctx.beginPath();
      ctx.arc(st.baseX, st.baseY, 34, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.85;
      ctx.fillStyle = 'rgba(86,240,194,.25)';
      ctx.beginPath();
      ctx.arc(knobX, knobY, 16, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = 'rgba(86,240,194,.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(knobX, knobY, 16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Dash button visual (bottom-right)
    const bx = W - 78;
    const by = H - 78;
    const r = 30;
    const p = state.player;
    const ready = p && p.dashCd <= 0 && p.dashActive <= 0;

    ctx.save();
    ctx.globalAlpha = ready ? 0.95 : 0.55;
    ctx.fillStyle = ready ? 'rgba(86,240,194,.18)' : 'rgba(255,255,255,.08)';
    ctx.strokeStyle = ready ? 'rgba(86,240,194,.55)' : 'rgba(255,255,255,.14)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(232,238,252,.85)';
    ctx.font = '700 14px ui-sans-serif, system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('DASH', bx, by);

    // cooldown ring
    if (p && p.dashCd > 0) {
      const t = clamp(p.dashCd / p.dashCdBase, 0, 1);
      ctx.globalAlpha = 0.75;
      ctx.strokeStyle = 'rgba(255,255,255,.25)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(bx, by, r + 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * t);
      ctx.stroke();
    }

    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function updateHud() {
    // mobile dash button state
    if (dashBtn) {
      const p2 = state.player;
      const ready = !!p2 && p2.dashCd <= 0 && p2.dashActive <= 0 && state.mode === 'playing' && !state.gameOver;
      dashBtn.classList.toggle('ready', ready);
      dashBtn.classList.toggle('cooldown', !ready);
    }
    const p = state.player;
    const t = `${Math.ceil(state.timeLeft)}s`;
    
    // Update score board
    if (scoreBoard) {
      scoreBoard.update('score', Math.floor(state.score));
      scoreBoard.update('deliveries', state.deliveries);
      scoreBoard.update('time', t);
    }
  }

  function loop(ts) {
    if (!state.lastTs) state.lastTs = ts;
    const dt = Math.min(0.032, (ts - state.lastTs) / 1000);
    state.lastTs = ts;
    state.dt = dt;
    state.t += dt;

    update(dt);

    // camera shake decay (모드 무관하게 서서히 감소)
    state.shake = Math.max(0, state.shake - dt * 32);

    updateHud();
    draw();

    requestAnimationFrame(loop);
  }

  // boot
  toast(isTouchDevice ? '탭해서 시작' : 'Enter로 시작', 1200);
  requestAnimationFrame(loop);

  // Auto-start if user presses movement keys on title
  setInterval(() => {
    if (state.mode === 'title') {
      if (performance.now() - lastInputTs < 1200 && (keysDown.has('w') || keysDown.has('a') || keysDown.has('s') || keysDown.has('d') || keysDown.has('arrowup') || keysDown.has('arrowdown') || keysDown.has('arrowleft') || keysDown.has('arrowright'))) {
        startGame();
      }
    }
  }, 250);

  // Small safety: if user stops touching, relax stick (avoid stuck axis)
  setInterval(() => {
    if (touch.stick.active && performance.now() - lastTouchTs > 1200) resetStick();
  }, 400);

})();
