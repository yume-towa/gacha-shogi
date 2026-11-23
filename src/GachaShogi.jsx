import React, { useState, useEffect, useRef } from "react";

/* ================= 定数 ================= */
const KANJI = { P: "歩", L: "香", N: "桂", S: "銀", G: "金", B: "角", R: "飛", K: "王" };
const PROM_KANJI = { P: "と", L: "杏", N: "圭", S: "全", B: "馬", R: "龍" };
const NAMES = { P: "歩", L: "香", N: "桂", S: "銀", G: "金", B: "角", R: "飛", K: "王" };
const TYPES7 = ["P", "L", "N", "S", "G", "B", "R"];
const FUSABLE = ["P", "L", "N", "S", "B", "R"];
const NORMAL_RATES = { P: 45, L: 12, N: 12, S: 12, G: 8, B: 3.5, R: 3.5 };
const PREMIUM_RATES = { L: 22, N: 22, S: 22, G: 14, B: 7, R: 7 };
const PICKUP_POOL = ["L", "N", "S", "G", "B", "R"];
const RARE = { B: true, R: true };
const VAL = { P: 1, L: 3, N: 3, S: 5, G: 6, B: 8, R: 10, K: 1000 };
const SELL = { P: 1, L: 2, N: 2, S: 2, G: 2, B: 3, R: 3 };
const MINCHO = { fontFamily: '"Shippori Mincho B1", "Yu Mincho", "Hiragino Mincho ProN", "MS Mincho", serif' };
/* 駒・見出し用の明朝(読み込めない環境では端末の明朝で表示) */
const FONT_CSS = "@import url('https://fonts.googleapis.com/css2?family=Shippori+Mincho+B1:wght@600;800&display=swap');";
const KANJI_NUM = ["一", "二", "三", "四", "五", "六", "七", "八", "九"];

/* 木目テクスチャ: feTurbulenceで生成した繊維ノイズをdata URIとして重ねる */
const WOOD_GRAIN =
  'url("data:image/svg+xml;utf8,' +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='260' height='260'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='0.011 0.13' numOctaves='4' seed='11'/><feColorMatrix values='0 0 0 0 0.30 0 0 0 0 0.19 0 0 0 0 0.06 0 0 0 0.5 0'/></filter><rect width='260' height='260' filter='url(#g)'/></svg>"
  ) +
  '")';
const PIECE_GRAIN =
  'url("data:image/svg+xml;utf8,' +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='p'><feTurbulence type='fractalNoise' baseFrequency='0.02 0.3' numOctaves='3' seed='4'/><feColorMatrix values='0 0 0 0 0.42 0 0 0 0 0.28 0 0 0 0 0.10 0 0 0 0.32 0'/></filter><rect width='120' height='120' filter='url(#p)'/></svg>"
  ) +
  '")';

/* ================= 効果音(Web Audioでその場で合成・外部ファイル不要) ================= */
let _ac = null;
function ac() {
  if (typeof window === "undefined") return null;
  if (!_ac) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    _ac = new C();
  }
  if (_ac.state === "suspended") _ac.resume();
  return _ac;
}
function _tone(a, { f = 440, f2 = null, d = 0.15, type = "sine", g = 0.15, at = 0 }) {
  const t = a.currentTime + at;
  const o = a.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
  const gn = a.createGain();
  gn.gain.setValueAtTime(g, t);
  gn.gain.exponentialRampToValueAtTime(0.0008, t + d);
  o.connect(gn); gn.connect(a.destination);
  o.start(t); o.stop(t + d + 0.02);
}
function _click(a, { fq = 2400, d = 0.05, g = 0.5, at = 0 }) {
  const t = a.currentTime + at;
  const len = Math.max(1, Math.floor(a.sampleRate * d));
  const buf = a.createBuffer(1, len, a.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  const s = a.createBufferSource(); s.buffer = buf;
  const bp = a.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = fq; bp.Q.value = 1.1;
  const gn = a.createGain(); gn.gain.setValueAtTime(g, t); gn.gain.exponentialRampToValueAtTime(0.001, t + d);
  s.connect(bp); bp.connect(gn); gn.connect(a.destination);
  s.start(t);
}
function playSnd(type, opt = {}) {
  const a = ac(); if (!a) return;
  const at = opt.at || 0;
  switch (type) {
    case "move": _click(a, { fq: 2300, g: 0.45 }); _tone(a, { f: 170, d: 0.09, g: 0.22 }); break; // 駒音「パチッ」
    case "drop": _click(a, { fq: 2650, g: 0.5 }); _tone(a, { f: 205, d: 0.1, g: 0.25 }); break;
    case "capture": _click(a, { fq: 2200, g: 0.55 }); _tone(a, { f: 150, d: 0.12, g: 0.3 }); _tone(a, { f: 520, f2: 720, d: 0.12, g: 0.08, at: 0.05, type: "triangle" }); break;
    case "fuse": _tone(a, { f: 620, f2: 930, d: 0.18, g: 0.12, type: "triangle" }); _tone(a, { f: 930, f2: 1240, d: 0.22, g: 0.1, at: 0.1, type: "triangle" }); break; // 成りのきらめき
    case "sell": _tone(a, { f: 1250, d: 0.07, g: 0.11, type: "square" }); _tone(a, { f: 1670, d: 0.09, g: 0.09, at: 0.06, type: "square" }); break; // 小銭
    case "roll": _click(a, { fq: 950, d: 0.11, g: 0.25, at }); break; // 駒がめくれる
    case "rare": _tone(a, { f: 880, d: 0.12, g: 0.12, type: "triangle", at }); _tone(a, { f: 1174, d: 0.12, g: 0.12, type: "triangle", at: at + 0.09 }); _tone(a, { f: 1568, d: 0.32, g: 0.14, type: "triangle", at: at + 0.18 }); break; // レア!
    case "check": _tone(a, { f: 392, d: 0.12, g: 0.16, type: "square" }); _tone(a, { f: 330, d: 0.2, g: 0.16, type: "square", at: 0.12 }); break; // 王手
    case "win": [523, 659, 784, 1046].forEach((f, i) => _tone(a, { f, d: 0.22, g: 0.13, type: "triangle", at: i * 0.13 })); break;
    case "lose": [392, 330, 262].forEach((f, i) => _tone(a, { f, d: 0.3, g: 0.12, type: "sine", at: i * 0.16 })); break;
    case "draw": _tone(a, { f: 440, d: 0.25, g: 0.1 }); break;
    default: break;
  }
}
const sndId = () => Date.now() + Math.random();

/* ================= BGM(生成型・和風アンビエント) =================
   平調子スケールから琴風の音をランダムに爪弾く。ループ素材ではないので
   同じフレーズの繰り返しにならない。外部ファイル不要。 */
let BGM = null;
function _pluck(a, out, f, t, v = 1) {
  const o = a.createOscillator(); o.type = "triangle"; o.frequency.setValueAtTime(f, t);
  const o2 = a.createOscillator(); o2.type = "sine"; o2.frequency.setValueAtTime(f * 2.01, t); // 倍音の揺らぎ
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.055 * v, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0005, t + 1.7);
  const g2 = a.createGain(); g2.gain.value = 0.22;
  o.connect(g); o2.connect(g2); g2.connect(g); g.connect(out);
  o.start(t); o.stop(t + 1.9); o2.start(t); o2.stop(t + 0.5);
}
function startBgm() {
  const a = ac(); if (!a || BGM) return;
  const master = a.createGain();
  master.gain.setValueAtTime(0.0001, a.currentTime);
  master.gain.linearRampToValueAtTime(1.0, a.currentTime + 2.5); // フェードイン
  master.connect(a.destination);
  // 低音ドローン(2本の微妙なズレでうねりを作る)
  const dr1 = a.createOscillator(); dr1.type = "sine"; dr1.frequency.value = 55;
  const dg1 = a.createGain(); dg1.gain.value = 0.03;
  dr1.connect(dg1); dg1.connect(master); dr1.start();
  const dr2 = a.createOscillator(); dr2.type = "sine"; dr2.frequency.value = 110.4;
  const dg2 = a.createGain(); dg2.gain.value = 0.018;
  dr2.connect(dg2); dg2.connect(master); dr2.start();
  // 平調子(A基準): A・B♭・D・E・F とそのオクターブ
  const SCALE = [220, 233.08, 293.66, 329.63, 349.23, 440, 466.16, 587.33, 659.26];
  let next = a.currentTime + 1.2;
  const timer = setInterval(() => {
    if (!BGM) return;
    const now = a.currentTime;
    while (next < now + 1.5) {
      if (Math.random() < 0.8) {
        const f = SCALE[Math.floor(Math.random() * SCALE.length)];
        _pluck(a, master, f, next);
        if (Math.random() < 0.22) _pluck(a, master, f * 1.5, next + 0.16, 0.5); // 装飾音
      }
      next += 0.9 + Math.random() * 1.3;
    }
  }, 400);
  BGM = { master, timer, oscs: [dr1, dr2] };
}
function stopBgm() {
  if (!BGM) return;
  const b = BGM;
  BGM = null;
  try {
    clearInterval(b.timer);
    if (_ac) b.master.gain.linearRampToValueAtTime(0.0001, _ac.currentTime + 0.7);
    setTimeout(() => {
      try { b.oscs.forEach((o) => o.stop()); b.master.disconnect(); } catch (e) {}
    }, 900);
  } catch (e) {}
}

/* ================= 盤ロジック ================= */
const emptyCounts = () => ({ P: 0, L: 0, N: 0, S: 0, G: 0, B: 0, R: 0 });
const emptyPool = () => ({ place: emptyCounts(), mat: emptyCounts() });
const emptyStats = () => ({ pulls: 0, premium: 0, drawn: emptyCounts(), spent: 0, sold: 0, soldGain: 0, fused: 0, captured: 0, mull: 0 });
const cloneB = (b) => b.map((row) => row.map((p) => (p ? { ...p } : null)));
const zoneOf = (size) => (size === 9 ? 3 : 2);
const pval = (pc) => VAL[pc.t] + (pc.p ? 2 : 0);
const cheb = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]));
const capStones = (v, cfg) => (cfg.cap > 0 ? Math.min(v, cfg.cap) : v);

function movesOf(board, r, c) {
  const pc = board[r][c];
  if (!pc) return [];
  const n = board.length;
  const f = pc.o === 0 ? -1 : 1;
  const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  const ORTH = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const GOLD = [[f, -1], [f, 0], [f, 1], [0, -1], [0, 1], [-f, 0]];
  let steps = [], slides = [];
  const key = pc.p ? "+" + pc.t : pc.t;
  switch (key) {
    case "P": steps = [[f, 0]]; break;
    case "L": slides = [[f, 0]]; break;
    case "N": steps = [[2 * f, -1], [2 * f, 1]]; break;
    case "S": steps = [[f, -1], [f, 0], [f, 1], [-f, -1], [-f, 1]]; break;
    case "G": case "+P": case "+L": case "+N": case "+S": steps = GOLD; break;
    case "B": slides = DIAG; break;
    case "R": slides = ORTH; break;
    case "+B": slides = DIAG; steps = ORTH; break;
    case "+R": slides = ORTH; steps = DIAG; break;
    case "K": steps = [...DIAG, ...ORTH]; break;
    default: break;
  }
  const out = [];
  for (const [dr, dc] of steps) {
    const R = r + dr, C = c + dc;
    if (R >= 0 && R < n && C >= 0 && C < n && (!board[R][C] || board[R][C].o !== pc.o)) out.push([R, C]);
  }
  for (const [dr, dc] of slides) {
    let R = r + dr, C = c + dc;
    while (R >= 0 && R < n && C >= 0 && C < n) {
      if (!board[R][C]) out.push([R, C]);
      else { if (board[R][C].o !== pc.o) out.push([R, C]); break; }
      R += dr; C += dc;
    }
  }
  return out;
}

function kingPos(board, o) {
  for (let r = 0; r < board.length; r++)
    for (let c = 0; c < board.length; c++)
      if (board[r][c] && board[r][c].t === "K" && board[r][c].o === o) return [r, c];
  return null;
}

function isAttacked(board, tr, tc, by) {
  for (let r = 0; r < board.length; r++)
    for (let c = 0; c < board.length; c++) {
      const p = board[r][c];
      if (p && p.o === by) {
        const ms = movesOf(board, r, c);
        for (const [mr, mc] of ms) if (mr === tr && mc === tc) return true;
      }
    }
  return false;
}

function inCheck(board, o) {
  const kp = kingPos(board, o);
  if (!kp) return false;
  return isAttacked(board, kp[0], kp[1], 1 - o);
}

function stranded(t, o, n, r) {
  if (t === "P" || t === "L") return o === 0 ? r === 0 : r === n - 1;
  if (t === "N") return o === 0 ? r <= 1 : r >= n - 2;
  return false;
}

function inEnemyZone(o, r, n, z) {
  return o === 0 ? r < z : r >= n - z;
}

function legalDests(board, fr, fc, cfg) {
  const pc = board[fr][fc];
  if (!pc) return [];
  const n = board.length;
  return movesOf(board, fr, fc).filter(([tr, tc]) => {
    if (!cfg.enemyPromo && !pc.p && stranded(pc.t, pc.o, n, tr)) return false;
    const b2 = cloneB(board);
    const cap = b2[tr][tc];
    if (cap && cap.t === "K") return false; // 王は直接取れない(詰みで決着)
    b2[tr][tc] = b2[fr][fc];
    b2[fr][fc] = null;
    return !inCheck(b2, pc.o);
  });
}

function colHasPawn(board, o, c) {
  for (let r = 0; r < board.length; r++) {
    const p = board[r][c];
    if (p && p.o === o && p.t === "P" && !p.p) return true;
  }
  return false;
}

function dropDests(board, o, t, cfg, pools, skipUchi) {
  const n = board.length;
  const ek = kingPos(board, 1 - o);
  const out = [];
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      if (board[r][c]) continue;
      if (ek && Math.abs(r - ek[0]) <= 1 && Math.abs(c - ek[1]) <= 1) continue;
      if (stranded(t, o, n, r)) continue;
      if (cfg.nifu && t === "P" && colHasPawn(board, o, c)) continue;
      const b2 = cloneB(board);
      b2[r][c] = { t, o, p: false };
      if (inCheck(b2, o)) continue;
      if (t === "P" && !skipUchi) {
        if (inCheck(b2, 1 - o) && !hasResponse(b2, 1 - o, pools[1 - o], cfg, pools)) continue;
      }
      out.push([r, c]);
    }
  return out;
}

function hasResponse(board, o, pool, cfg, pools) {
  for (let r = 0; r < board.length; r++)
    for (let c = 0; c < board.length; c++) {
      const p = board[r][c];
      if (p && p.o === o && legalDests(board, r, c, cfg).length > 0) return true;
    }
  for (const t of TYPES7)
    if (pool.place[t] > 0 && dropDests(board, o, t, cfg, pools, true).length > 0) return true;
  return false;
}

function existsLegalMove(board, o, cfg) {
  for (let r = 0; r < board.length; r++)
    for (let c = 0; c < board.length; c++) {
      const p = board[r][c];
      if (p && p.o === o && legalDests(board, r, c, cfg).length > 0) return true;
    }
  return false;
}

function existsLegalDrop(board, o, pool, cfg, pools) {
  for (const t of TYPES7)
    if (pool.place[t] > 0 && dropDests(board, o, t, cfg, pools, false).length > 0) return true;
  return false;
}

/* 王手を受けているとき、ガチャで引いた駒を打って防げる見込みがあるか。
   ガチャ0.5+打つ0.5で行動力1.0が要る。桂馬の王手・隣からの王手・両王手は、打っても防げない */
function gachaCanSave(board, o, cfg, ap, funds) {
  if (ap < 1 || funds < 2) return false;
  const n = board.length;
  const ek = kingPos(board, 1 - o);
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      if (board[r][c]) continue;
      if (ek && Math.abs(r - ek[0]) <= 1 && Math.abs(c - ek[1]) <= 1) continue; // 相手王の周りには打てない
      const b2 = cloneB(board);
      b2[r][c] = { t: "G", o, p: false };
      if (!inCheck(b2, o)) return true;
    }
  return false;
}

function totalSellValue(pool, sellScope) {
  let v = 0;
  for (const t of TYPES7) {
    v += pool.mat[t] * SELL[t];
    if (sellScope === "all") v += pool.place[t] * SELL[t];
  }
  return v;
}

/* ================= 詰み情報(可視化用) ================= */
function mateInfo(board, loser) {
  const kp = kingPos(board, loser);
  if (!kp) return null;
  const n = board.length;
  const winner = 1 - loser;
  const checkers = [];
  const lines = [];
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      const p = board[r][c];
      if (!p || p.o !== winner) continue;
      const ms = movesOf(board, r, c);
      if (!ms.some(([a, b]) => a === kp[0] && b === kp[1])) continue;
      checkers.push([r, c]);
      const dr = kp[0] - r, dc = kp[1] - c;
      const aligned = dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc);
      if (aligned && Math.max(Math.abs(dr), Math.abs(dc)) > 1) {
        const sr = Math.sign(dr), sc = Math.sign(dc);
        let R = r + sr, C = c + sc;
        while (R !== kp[0] || C !== kp[1]) { lines.push([R, C]); R += sr; C += sc; }
      }
    }
  const escapes = [];
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const R = kp[0] + dr, C = kp[1] + dc;
      if (R < 0 || R >= n || C < 0 || C >= n) continue;
      const p = board[R][C];
      if (p && p.o === loser) continue; // 味方駒で塞がっている(自明)
      if (isAttacked(board, R, C, winner)) escapes.push([R, C]);
    }
  return { kp, checkers, lines, escapes };
}

/* ================= ガチャ ================= */
/* 乱数テープ: 対局ごとに固定される乱数列。ガチャは状態(g.rng)の位置から順に消費する。
   待ったで状態が巻き戻ると位置も巻き戻り、やり直しても同じ結果が出る(リセマラ防止)。 */
let RNG_TAPE = [];
function tapeReset() { RNG_TAPE = []; }
function tapePreset(vals) { RNG_TAPE = vals.slice(); }
/* 指定の駒がノーマルガチャで出る一様乱数値(重み累積の中点/合計96) */
const U_FOR = { P: 0.23, L: 0.53, N: 0.656, S: 0.78, G: 0.885, B: 0.94, R: 0.982 };
function tapeU(i) {
  while (RNG_TAPE.length <= i) RNG_TAPE.push(Math.random());
  return RNG_TAPE[i];
}

function rollGacha(rates, pickup, u) {
  const w = { ...rates };
  if (pickup && w[pickup] != null) w[pickup] *= 2;
  const total = Object.values(w).reduce((a, b) => a + b, 0);
  let x = (u != null ? u : Math.random()) * total;
  for (const k of Object.keys(w)) {
    x -= w[k];
    if (x < 0) return k;
  }
  return Object.keys(w)[0];
}
const randPickup = (u) => PICKUP_POOL[Math.floor((u != null ? u : Math.random()) * PICKUP_POOL.length)];

/* ピックアップ適用後の実効排出率(%)。rates任意(ノーマル/プレミアム両対応) */
function effRates(rates, pu) {
  const w = { ...rates };
  if (pu && w[pu] != null) w[pu] *= 2;
  const tot = Object.values(w).reduce((a, b) => a + b, 0);
  const out = {};
  for (const k of Object.keys(w)) out[k] = (100 * w[k]) / tot;
  return out;
}

/* ================= 純粋な状態遷移 ================= */
const addLog = (log, msg) => [msg, ...log].slice(0, 14);
const pname = (o, cfg) => (o === 0 ? "先手" : cfg.mode === "ai" ? "AI(後手)" : "後手");

/* マスの符号(例: 5五)。盤の上と右に振った番号と同じ */
const sqName = (n, r, c) => `${n - c}${KANJI_NUM[r]}`;
/* この手番でした行動を記録(相手の手を見やすく表示するため) */
const withAct = (g0, act) => [...(g0.turnActs || []), act];

function bumpStats(stats, who, fn) {
  return stats.map((s, i) => {
    if (i !== who) return s;
    const ns = { ...s, drawn: { ...s.drawn } };
    fn(ns);
    return ns;
  });
}

function newGameG(cfg) {
  tapeReset();
  const n = cfg.size;
  const board = Array.from({ length: n }, () => Array(n).fill(null));
  const mid = Math.floor(n / 2);
  board[n - 1][mid] = { t: "K", o: 0, p: false };
  board[0][mid] = { t: "K", o: 1, p: false };
  return {
    board, phase: "setup", sp: 0, drew: [false, false],
    cur: 0, ap: 0, rng: 1,
    stones: [capStones(cfg.init0, cfg), capStones(cfg.init1, cfg)],
    pool: [emptyPool(), emptyPool()],
    round: 1, pickup: cfg.pickup ? randPickup(tapeU(0)) : null,
    mull: [false, false],
    turnActs: [], prevTurn: null,
    stats: [emptyStats(), emptyStats()],
    log: ["対局開始。先手は初回3連ガチャを引いてください(配置は互いに非公開)。"],
    over: null, last: null,
  };
}

/* 召喚酔いは自分のターン終了時に解除 */
function clearSick(board, o) {
  return board.map((row) => row.map((p) => (p && p.o === o && p.sick ? { ...p, sick: false } : p)));
}

function nextTurnStateG(g0, cfg, extraMsg) {
  const nxt = 1 - g0.cur;
  const board = clearSick(g0.board, g0.cur);
  let round = g0.round;
  let pickup = g0.pickup;
  let rng = g0.rng;
  let log = g0.log;
  if (extraMsg) log = addLog(log, extraMsg);
  if (nxt === 0) {
    round += 1;
    if (cfg.pickup && (round - 1) % 3 === 0) {
      pickup = randPickup(tapeU(rng));
      rng += 1;
      log = addLog(log, `ピックアップ切替 → ${NAMES[pickup]}(排出2倍)`);
    }
    if (cfg.limit > 0 && round > cfg.limit) {
      return { ...g0, board, rng, log: addLog(log, "ターン上限に到達。引き分け。"), over: { winner: -1, reason: "ターン上限" } };
    }
  }
  const stones = [...g0.stones];
  stones[nxt] = capStones(stones[nxt] + cfg.spt, cfg);
  log = addLog(log, `${pname(nxt, cfg)}の番(石+${cfg.spt})`);
  const prevTurn = { who: g0.cur, round: g0.round, acts: g0.turnActs || [] };
  return { ...g0, board, cur: nxt, ap: 1, stones, round, pickup, rng, log, prevTurn, turnActs: [] };
}

function doGachaG(g0, cfg, kind) {
  const cost = kind === "n1" ? 2 : kind === "pr" ? 3 : 5;
  if (g0.ap < 0.5 || g0.stones[g0.cur] < cost) return g0;
  const nrolls = kind === "n3" ? 3 : 1;
  const rates = kind === "pr" ? PREMIUM_RATES : NORMAL_RATES;
  const pk = g0.pickup; // ピックアップはプレミアムにも適用
  const res = Array.from({ length: nrolls }, (_, i) => rollGacha(rates, pk, tapeU(g0.rng + i)));
  const rng = g0.rng + nrolls;
  const pool = g0.pool.map((pl, i) => (i === g0.cur ? { ...pl, place: { ...pl.place } } : pl));
  res.forEach((t) => pool[g0.cur].place[t]++);
  const stones = [...g0.stones];
  stones[g0.cur] -= cost;
  const label = kind === "pr" ? "プレミアム" : kind === "n3" ? "ノーマル3連" : "ノーマル単発";
  const humanActor = !(cfg.mode === "ai" && g0.cur === 1);
  const logMsg = cfg.fx && humanActor
    ? `${pname(g0.cur, cfg)}が${label}を引いた!`
    : `${pname(g0.cur, cfg)}が${label}: ${res.map((t) => NAMES[t]).join("・")}`;
  const stats = bumpStats(g0.stats, g0.cur, (s) => {
    s.pulls += nrolls;
    s.spent += cost;
    if (kind === "pr") s.premium += 1;
    res.forEach((t) => { s.drawn[t] += 1; });
  });
  return {
    ...g0, pool, stones, ap: g0.ap - 0.5, rng, stats,
    turnActs: withAct(g0, { k: "gacha", kind: label, res }),
    lastGacha: { id: Date.now() + Math.random(), who: g0.cur, kind: label, res },
    log: addLog(g0.log, logMsg),
  };
}

function doSellG(g0, cfg, t, fromMat) {
  if (cfg.sell === "off" || !cfg.sell) return g0;
  if (cfg.sell === "mat" && !fromMat) return g0; // ガチャ駒は売却不可(素材のみ)
  const pool = g0.pool.map((pl, i) =>
    i === g0.cur ? { place: { ...pl.place }, mat: { ...pl.mat } } : pl
  );
  const src = fromMat ? pool[g0.cur].mat : pool[g0.cur].place;
  if (src[t] <= 0) return g0;
  src[t]--;
  const stones = [...g0.stones];
  stones[g0.cur] = capStones(stones[g0.cur] + SELL[t], cfg);
  const stats = bumpStats(g0.stats, g0.cur, (s) => { s.sold += 1; s.soldGain += SELL[t]; });
  return {
    ...g0, pool, stones, stats, snd: { id: sndId(), type: "sell", who: g0.cur },
    turnActs: withAct(g0, { k: "sell", t, gain: SELL[t] }),
    log: addLog(g0.log, `${pname(g0.cur, cfg)}: ${NAMES[t]}${fromMat ? "(素材)" : ""}を売却 → +${SELL[t]}石`),
  };
}

function doMoveG(g0, cfg, fr, fc, tr, tc, promote) {
  const board = cloneB(g0.board);
  const pc = board[fr][fc];
  const cap = board[tr][tc];
  board[tr][tc] = { ...pc, p: pc.p || promote };
  board[fr][fc] = null;
  const who = pname(g0.cur, cfg);
  if (cap && cap.t === "K") {
    // 到達しないはずの保険
    return { ...g0, board, last: [tr, tc], over: { winner: g0.cur, reason: "王を捕獲" }, log: addLog(g0.log, `${who}が王を捕獲!`) };
  }
  const n = board.length;
  const mvName = pc.p ? PROM_KANJI[pc.t] : KANJI[pc.t];
  let log = addLog(g0.log, `${who}: ${mvName} ${sqName(n, fr, fc)}→${sqName(n, tr, tc)}${!pc.p && promote ? " 成り!" : ""}`);
  const act = { k: "move", t: pc.t, wasP: !!pc.p, promo: !pc.p && promote, fr, fc, tr, tc, cap: cap ? cap.t : null, capP: cap ? !!cap.p : false };
  if (cap) {
    const pool = g0.pool.map((pl, i) => (i === g0.cur ? { ...pl, mat: { ...pl.mat } } : pl));
    pool[g0.cur].mat[cap.t]++;
    log = addLog(log, `${who}が${NAMES[cap.t]}を取った! 素材を獲得しターン終了。`);
    const stats = bumpStats(g0.stats, g0.cur, (s) => { s.captured += 1; });
    const anim = { id: sndId(), k: "capture", fr, fc, tr, tc, promo: !pc.p && promote };
    return nextTurnStateG({ ...g0, board, pool, stats, ap: 0, log, last: [tr, tc], anim, turnActs: withAct(g0, act), snd: { id: sndId(), type: "capture", who: g0.cur } }, cfg);
  }
  const anim = { id: sndId(), k: "move", fr, fc, tr, tc, promo: !pc.p && promote };
  return { ...g0, board, ap: g0.ap - 1, log, last: [tr, tc], anim, turnActs: withAct(g0, act), snd: { id: sndId(), type: "move", who: g0.cur } };
}

function doDropG(g0, cfg, t, r, c) {
  const board = cloneB(g0.board);
  board[r][c] = { t, o: g0.cur, p: false, sick: true }; // 召喚酔い
  const pool = g0.pool.map((pl, i) => (i === g0.cur ? { ...pl, place: { ...pl.place } } : pl));
  pool[g0.cur].place[t]--;
  return {
    ...g0, board, pool, ap: g0.ap - 0.5, last: [r, c], anim: { id: sndId(), k: "drop", tr: r, tc: c }, snd: { id: sndId(), type: "drop", who: g0.cur },
    turnActs: withAct(g0, { k: "drop", t, tr: r, tc: c }),
    log: addLog(g0.log, `${pname(g0.cur, cfg)}: ${NAMES[t]}を${sqName(board.length, r, c)}に打つ`),
  };
}

function doFuseG(g0, cfg, r, c, useMat) {
  const pc = g0.board[r][c];
  if (!pc || pc.o !== g0.cur || pc.p || pc.sick || !FUSABLE.includes(pc.t)) return g0;
  if (!useMat && g0.ap < 0.5) return g0;
  const pool = g0.pool.map((pl, i) =>
    i === g0.cur ? { place: { ...pl.place }, mat: { ...pl.mat } } : pl
  );
  const src = useMat ? pool[g0.cur].mat : pool[g0.cur].place;
  if (src[pc.t] <= 0) return g0;
  src[pc.t]--;
  const board = cloneB(g0.board);
  board[r][c] = { ...pc, p: true };
  const stats = bumpStats(g0.stats, g0.cur, (s) => { s.fused += 1; });
  return {
    ...g0, board, pool, stats, ap: useMat ? g0.ap : g0.ap - 0.5, last: [r, c], anim: { id: sndId(), k: "fuse", tr: r, tc: c }, snd: { id: sndId(), type: "fuse", who: g0.cur },
    turnActs: withAct(g0, { k: "fuse", t: pc.t, tr: r, tc: c, mat: useMat }),
    log: addLog(g0.log, `${pname(g0.cur, cfg)}: ${sqName(board.length, r, c)}の${KANJI[pc.t]}を合成 → ${PROM_KANJI[pc.t]}に成った!${useMat ? "(素材/コスト0)" : "(ガチャ駒/0.5)"}`),
  };
}

function doSetupDrawG(g0, cfg) {
  const p = g0.sp;
  const res = [0, 1, 2].map((i) => rollGacha(NORMAL_RATES, g0.pickup, tapeU(g0.rng + i)));
  const rng = g0.rng + 3;
  const pool = g0.pool.map((pl, i) => (i === p ? { ...pl, place: { ...pl.place } } : pl));
  res.forEach((t) => pool[p].place[t]++);
  // 同時公開制: 人間(AI戦の先手)以外の結果はログに出さない
  const revealed = cfg.mode === "ai" && p === 0;
  const msg = revealed
    ? (cfg.fx ? "先手が初回3連ガチャを引いた!" : `先手の初回3連: ${res.map((t) => NAMES[t]).join("・")}`)
    : `${pname(p, cfg)}が初回3連ガチャを引いた(公開まで非表示)`;
  const stats = bumpStats(g0.stats, p, (s) => {
    s.pulls += 3;
    res.forEach((t) => { s.drawn[t] += 1; });
  });
  return {
    ...g0, pool, rng, stats, drew: g0.drew.map((d, i) => (i === p ? true : d)),
    lastGacha: { id: Date.now() + Math.random(), who: p, kind: "初回3連", res, setup: true },
    log: addLog(g0.log, msg),
  };
}

/* 自陣に置いた駒の数(王を除く)。引き直しは配置前のみ可 */
function ownPlacedCount(board, o) {
  let n = 0;
  for (let r = 0; r < board.length; r++)
    for (let c = 0; c < board.length; c++) {
      const p = board[r][c];
      if (p && p.o === o && p.t !== "K") n++;
    }
  return n;
}

/* 初回ガチャの引き直し(マリガン): 3枚まるごと引き直す。1回まで・配置前のみ */
function doSetupRedrawG(g0, cfg) {
  const p = g0.sp;
  if (!cfg.mulligan || g0.mull[p] || !g0.drew[p]) return g0;
  if (ownPlacedCount(g0.board, p) > 0) return g0;
  const res = [0, 1, 2].map((i) => rollGacha(NORMAL_RATES, g0.pickup, tapeU(g0.rng + i)));
  const rng = g0.rng + 3;
  const pool = g0.pool.map((pl, i) => (i === p ? { ...pl, place: emptyCounts() } : pl));
  res.forEach((t) => pool[p].place[t]++);
  const revealed = cfg.mode === "ai" && p === 0;
  const msg = revealed
    ? (cfg.fx ? "先手が初回ガチャを引き直した!" : `先手が引き直した: ${res.map((t) => NAMES[t]).join("・")}`)
    : `${pname(p, cfg)}が初回ガチャを引き直した(公開まで非表示)`;
  const stats = bumpStats(g0.stats, p, (s) => {
    s.pulls += 3;
    s.mull += 1;
    res.forEach((t) => { s.drawn[t] += 1; });
  });
  return {
    ...g0, pool, rng, stats, mull: g0.mull.map((m, i) => (i === p ? true : m)),
    lastGacha: { id: Date.now() + Math.random(), who: p, kind: "引き直し", res, setup: true },
    log: addLog(g0.log, msg),
  };
}

function doSetupPlaceG(g0, cfg, t, r, c) {
  const board = cloneB(g0.board);
  board[r][c] = { t, o: g0.sp, p: false };
  const pool = g0.pool.map((pl, i) => (i === g0.sp ? { ...pl, place: { ...pl.place } } : pl));
  pool[g0.sp].place[t]--;
  const revealed = cfg.mode === "ai" && g0.sp === 0;
  return {
    ...g0, board, pool, last: revealed ? [r, c] : g0.last,
    log: addLog(g0.log, revealed ? `先手: ${NAMES[t]}を配置` : `${pname(g0.sp, cfg)}が駒を配置(非公開)`),
  };
}

function doSetupDoneG(g0, cfg) {
  if (g0.sp === 0) {
    const msg = cfg.mode === "ai" ? "AI(後手)が初期配置を行います…" : "後手に交代。初回3連ガチャを引いてください。";
    return { ...g0, sp: 1, log: addLog(g0.log, msg) };
  }
  return {
    ...g0, phase: "play", cur: 0, ap: 1,
    stones: [capStones(g0.stones[0] + cfg.spt, cfg), g0.stones[1]],
    log: addLog(g0.log, `配置を公開! 対局開始、先手の番(石+${cfg.spt})`),
  };
}

function setupDestsG(g0, cfg, t) {
  const n = g0.board.length, z = zoneOf(cfg.size), o = g0.sp;
  const ek = kingPos(g0.board, 1 - o);
  const out = [];
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      const inTerr = o === 0 ? r >= n - z : r < z;
      if (!inTerr || g0.board[r][c]) continue;
      if (ek && Math.abs(r - ek[0]) <= 1 && Math.abs(c - ek[1]) <= 1) continue;
      if (cfg.nifu && t === "P" && colHasPawn(g0.board, o, c)) continue;
      if (stranded(t, o, n, r)) continue;
      out.push([r, c]);
    }
  return out;
}

/* ================= 簡易AI ================= */
function collectMoves(g0, cfg) {
  const out = [];
  const board = g0.board;
  for (let r = 0; r < board.length; r++)
    for (let c = 0; c < board.length; c++) {
      const p = board[r][c];
      if (p && p.o === g0.cur)
        for (const [tr, tc] of legalDests(board, r, c, cfg)) out.push({ fr: r, fc: c, tr, tc });
    }
  return out;
}

function promoInfo(g0, cfg, m) {
  const pc = g0.board[m.fr][m.fc];
  const n = g0.board.length, z = zoneOf(cfg.size);
  const must = cfg.enemyPromo && !pc.p && stranded(pc.t, pc.o, n, m.tr);
  const can = must || (cfg.enemyPromo && !pc.p && FUSABLE.includes(pc.t) &&
    (inEnemyZone(pc.o, m.fr, n, z) || inEnemyZone(pc.o, m.tr, n, z)));
  return can;
}

function scoreMoveAI(g0, cfg, m, chk, lv) {
  const board = g0.board;
  const pc = board[m.fr][m.fc];
  const cap = board[m.tr][m.tc];
  const ek = kingPos(board, 1 - g0.cur);
  const promo = promoInfo(g0, cfg, m);
  const b2 = cloneB(board);
  b2[m.tr][m.tc] = { ...pc, p: pc.p || promo };
  b2[m.fr][m.fc] = null;
  const destAttacked = isAttacked(b2, m.tr, m.tc, 1 - g0.cur);

  let s = 0;
  if (cap) {
    if (lv === "hard") s += pval(cap) * 10 - (destAttacked ? pval(pc) * 8 : 0); // 交換を考慮
    else s += pval(cap) * 10;
  }
  if (ek) s += (cheb([m.fr, m.fc], ek) - cheb([m.tr, m.tc], ek)) * 1.5;
  if (promo) s += 4;
  if (!cap && destAttacked) s -= pval(pc) * 3;
  if (lv === "hard" && inCheck(b2, 1 - g0.cur)) s += 3; // 王手ボーナス
  if (pc.t === "K" && !chk) s -= 3;
  const noise = lv === "easy" ? Math.random() * 14 - 7 : Math.random();
  return s + noise;
}

/* 1手詰め探索(つよい用): 移動または打ちで即詰みになる手を探す */
function findMate1(g0, cfg) {
  if (g0.ap >= 1) {
    for (const m of collectMoves(g0, cfg)) {
      const pc = g0.board[m.fr][m.fc];
      const promo = promoInfo(g0, cfg, m);
      const b2 = cloneB(g0.board);
      b2[m.tr][m.tc] = { ...pc, p: pc.p || promo };
      b2[m.fr][m.fc] = null;
      if (b2[m.tr][m.tc] && g0.board[m.tr][m.tc]) continue; // 駒取りはターン終了なので相手応手前提で判定不可→通常評価に委ねる
      if (inCheck(b2, 1 - g0.cur) && !hasResponse(b2, 1 - g0.cur, g0.pool[1 - g0.cur], cfg, g0.pool)) {
        return { type: "move", m, promo };
      }
    }
  }
  if (g0.ap >= 0.5) {
    for (const t of TYPES7) {
      if (g0.pool[g0.cur].place[t] <= 0) continue;
      for (const [r, c] of dropDests(g0.board, g0.cur, t, cfg, g0.pool, false)) {
        const b2 = cloneB(g0.board);
        b2[r][c] = { t, o: g0.cur, p: false };
        if (inCheck(b2, 1 - g0.cur) && !hasResponse(b2, 1 - g0.cur, g0.pool[1 - g0.cur], cfg, g0.pool)) {
          return { type: "drop", t, r, c };
        }
      }
    }
  }
  return null;
}

function aiAction(g0, cfg) {
  const o = g0.cur;
  const lv = cfg.ailv || "normal";
  const pool = g0.pool[o];
  const board = g0.board;
  const chk = inCheck(board, o);
  const moves = g0.ap >= 1 ? collectMoves(g0, cfg) : [];
  const placeTotal = TYPES7.reduce((a, t) => a + pool.place[t], 0);

  /* --- 王手対応(全難易度共通) --- */
  if (chk) {
    if (moves.length) {
      let best = moves[0], bs = -1e9;
      for (const m of moves) { const s = scoreMoveAI(g0, cfg, m, chk, lv); if (s > bs) { bs = s; best = m; } }
      return doMoveG(g0, cfg, best.fr, best.fc, best.tr, best.tc, promoInfo(g0, cfg, best));
    }
    if (g0.ap >= 0.5) {
      for (const t of ["P", "L", "N", "S", "G", "B", "R"]) {
        if (pool.place[t] > 0) {
          const dd = dropDests(board, o, t, cfg, g0.pool, false);
          if (dd.length) return doDropG(g0, cfg, t, dd[0][0], dd[0][1]);
        }
      }
      const funds = g0.stones[o] + (cfg.sell !== "off" ? totalSellValue(pool, cfg.sell) : 0);
      if (!gachaCanSave(board, o, cfg, g0.ap, funds)) return g0; // 打っても防げない王手 → 詰み判定に委ねる
      // 石が足りなければ売却してガチャ資金に
      if (cfg.sell !== "off" && g0.stones[o] < 2) {
        for (const t of ["R", "B", "G", "S", "N", "L", "P"]) {
          if (pool.mat[t] > 0) return doSellG(g0, cfg, t, true);
          if (cfg.sell === "all" && pool.place[t] > 0) return doSellG(g0, cfg, t, false);
        }
      }
      if (g0.stones[o] >= 2) return doGachaG(g0, cfg, g0.stones[o] >= 5 ? "n3" : "n1");
    }
    return g0; // 手詰まり → 詰み判定に委ねる
  }

  /* --- 1手詰め(つよいのみ) --- */
  if (lv === "hard") {
    const m1 = findMate1(g0, cfg);
    if (m1) {
      if (m1.type === "move") return doMoveG(g0, cfg, m1.m.fr, m1.m.fc, m1.m.tr, m1.m.tc, m1.promo);
      return doDropG(g0, cfg, m1.t, m1.r, m1.c);
    }
  }

  /* --- 無料合成(素材・召喚酔いは除外) --- */
  if (lv !== "easy" || Math.random() < 0.5) {
    for (const t of ["R", "B", "S", "N", "L", "P"]) {
      if (pool.mat[t] > 0) {
        for (let r = 0; r < board.length; r++)
          for (let c = 0; c < board.length; c++) {
            const p = board[r][c];
            if (p && p.o === o && p.t === t && !p.p && !p.sick && FUSABLE.includes(t))
              return doFuseG(g0, cfg, r, c, true);
          }
      }
    }
  }

  /* --- 死に素材の売却(盤上に合成先がない素材を換金) --- */
  if (cfg.sell !== "off" && lv !== "easy" && g0.stones[o] < 5) {
    for (const t of TYPES7) {
      if (pool.mat[t] <= 0) continue;
      let usable = false;
      for (let r = 0; r < board.length && !usable; r++)
        for (let c = 0; c < board.length; c++) {
          const p = board[r][c];
          if (p && p.o === o && p.t === t && !p.p && FUSABLE.includes(t)) { usable = true; break; }
        }
      if (!usable) return doSellG(g0, cfg, t, true);
    }
  }

  /* --- 良い取り/攻め手 --- */
  let best = null, bs = -1e9;
  for (const m of moves) { const s = scoreMoveAI(g0, cfg, m, chk, lv); if (s > bs) { bs = s; best = m; } }
  if (best && board[best.tr][best.tc] && bs > 0) {
    return doMoveG(g0, cfg, best.fr, best.fc, best.tr, best.tc, promoInfo(g0, cfg, best));
  }

  /* --- 内政: 打つ > ガチャ --- */
  if (g0.ap >= 0.5) {
    if (placeTotal > 0) {
      const ek = kingPos(board, 1 - o);
      let bd = null, bds = -1e9;
      for (const t of TYPES7) {
        if (pool.place[t] <= 0) continue;
        const dd = dropDests(board, o, t, cfg, g0.pool, false);
        for (const [r, c] of dd) {
          let s = ek ? -cheb([r, c], ek) * 1.2 : 0;
          const b2 = cloneB(board);
          b2[r][c] = { t, o, p: false };
          if (isAttacked(b2, r, c, 1 - o)) s -= VAL[t] * 2;
          s += lv === "easy" ? Math.random() * 6 : Math.random() * 0.8;
          if (s > bds) { bds = s; bd = { t, r, c }; }
        }
      }
      if (bd) return doDropG(g0, cfg, bd.t, bd.r, bd.c);
    }
    const prPr = lv === "hard" ? 0.4 : 0.25;
    if (g0.stones[o] >= 5) return doGachaG(g0, cfg, Math.random() < prPr && g0.stones[o] >= 3 ? "pr" : "n3");
    if (g0.stones[o] >= 3 && lv === "hard" && placeTotal === 0 && Math.random() < 0.5) return doGachaG(g0, cfg, "pr");
    if (g0.stones[o] >= 2 && placeTotal === 0) return doGachaG(g0, cfg, "n1");
  }

  /* --- 通常の移動 --- */
  if (g0.ap >= 1 && best && bs > -3) {
    return doMoveG(g0, cfg, best.fr, best.fc, best.tr, best.tc, promoInfo(g0, cfg, best));
  }

  return nextTurnStateG(g0, cfg);
}

/* ================= 達人AI(自分の手 → 相手の最善の応手 まで読む探索) =================
   1) 候補手(移動・打ち・合成・売却・パス)を盤面評価で絞り込み
   2) 上位の候補について相手の応手を全部試し、最悪の結果が一番ましな手を選ぶ
   3) ガチャは「引いた駒の期待値 − 石の価値」で他の手と比べて判断(結果の先読みはしない) */
const MATE = 100000;
function vecOf(pc) {
  const f = pc.o === 0 ? -1 : 1;
  const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  const ORTH = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const GOLD = [[f, -1], [f, 0], [f, 1], [0, -1], [0, 1], [-f, 0]];
  switch (pc.p ? "+" + pc.t : pc.t) {
    case "P": return { steps: [[f, 0]], slides: [] };
    case "L": return { steps: [], slides: [[f, 0]] };
    case "N": return { steps: [[2 * f, -1], [2 * f, 1]], slides: [] };
    case "S": return { steps: [[f, -1], [f, 0], [f, 1], [-f, -1], [-f, 1]], slides: [] };
    case "G": case "+P": case "+L": case "+N": case "+S": return { steps: GOLD, slides: [] };
    case "B": return { steps: [], slides: DIAG };
    case "R": return { steps: [], slides: ORTH };
    case "+B": return { steps: ORTH, slides: DIAG };
    case "+R": return { steps: DIAG, slides: ORTH };
    default: return { steps: [...DIAG, ...ORTH], slides: [] }; // K
  }
}
/* 各マスへの利きの数(味方の駒がいるマス=守りも数える) */
function attackCounts(board, o) {
  const n = board.length;
  const A = new Int8Array(n * n);
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      const p = board[r][c];
      if (!p || p.o !== o) continue;
      const { steps, slides } = vecOf(p);
      for (const [dr, dc] of steps) {
        const R = r + dr, C = c + dc;
        if (R >= 0 && R < n && C >= 0 && C < n) A[R * n + C]++;
      }
      for (const [dr, dc] of slides) {
        let R = r + dr, C = c + dc;
        while (R >= 0 && R < n && C >= 0 && C < n) {
          A[R * n + C]++;
          if (board[R][C]) break;
          R += dr; C += dc;
        }
      }
    }
  return A;
}
function hasFuseTarget(board, o, t) {
  if (!FUSABLE.includes(t)) return false;
  for (const row of board) for (const p of row) if (p && p.o === o && p.t === t && !p.p) return true;
  return false;
}
/* 局面評価(me側から見た点数。toMove=次に指す側) */
function evalPos(st, me, toMove, cfg) {
  const { board, pool, stones } = st;
  const n = board.length;
  const A = [attackCounts(board, 0), attackCounts(board, 1)];
  const kp = [kingPos(board, 0), kingPos(board, 1)];
  const hang = [0, 0];
  let s = 0;
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      const p = board[r][c];
      if (!p || p.t === "K") continue;
      const sign = p.o === me ? 1 : -1;
      const v = pval(p);
      s += sign * v;
      const att = A[1 - p.o][r * n + c], def = A[p.o][r * n + c];
      if (att > 0) {
        const loss = def > 0 ? Math.max(0, v - 2.5) * 0.7 + 0.2 : v;
        if (loss > hang[p.o]) hang[p.o] = loss;
      }
      const ek = kp[1 - p.o];
      if (ek) s += sign * 0.14 * Math.max(0, 4 - cheb([r, c], ek));
    }
  // 次に指す側は、相手の浮き駒を1枚取れる
  const idle = 1 - toMove;
  s += (idle === me ? -1 : 1) * hang[idle] * 0.8;
  s += (toMove === me ? -1 : 1) * hang[toMove] * 0.15;
  for (const o of [0, 1]) {
    const sign = o === me ? 1 : -1;
    for (const t of TYPES7) {
      s += sign * pool[o].place[t] * VAL[t] * 0.8;
      if (pool[o].mat[t] > 0) {
        const mv = hasFuseTarget(board, o, t) ? 2.4 : cfg.sell !== "off" ? SELL[t] * 0.7 : 0.2;
        s += sign * pool[o].mat[t] * mv;
      }
    }
    s += sign * stones[o] * 0.5;
    // 玉の安全度
    const k = kp[o];
    if (!k) continue;
    let danger = 0, free = 0;
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        const R = k[0] + dr, C = k[1] + dc;
        if (R < 0 || R >= n || C < 0 || C >= n) continue;
        const a = A[1 - o][R * n + C];
        danger += Math.min(a, 2) * (dr === 0 && dc === 0 ? 1.5 : 0.8);
        if ((dr || dc) && !a && !(board[R][C] && board[R][C].o === o)) free++;
      }
    if (free === 0) danger += 2;
    else if (free === 1) danger += 0.8;
    for (let r = Math.max(0, k[0] - 2); r <= Math.min(n - 1, k[0] + 2); r++)
      for (let c = Math.max(0, k[1] - 2); c <= Math.min(n - 1, k[1] + 2); c++) {
        const p = board[r][c];
        if (p && p.o !== o && p.t !== "K") danger += 0.5;
      }
    danger += 0.25 * Math.min(4, TYPES7.reduce((a, t) => a + pool[1 - o].place[t], 0));
    s += (o === me ? -1 : 1) * danger * 0.9;
  }
  return s;
}
const lightState = (g0) => ({
  board: cloneB(g0.board),
  pool: g0.pool.map((pl) => ({ place: { ...pl.place }, mat: { ...pl.mat } })),
  stones: [...g0.stones],
});
function applyLight(st, me, a) {
  const b = st.board;
  if (a.k === "move") {
    const pc = b[a.m.fr][a.m.fc], cap = b[a.m.tr][a.m.tc];
    if (cap) st.pool[me].mat[cap.t]++;
    b[a.m.tr][a.m.tc] = { ...pc, p: pc.p || a.promo };
    b[a.m.fr][a.m.fc] = null;
  } else if (a.k === "drop") {
    b[a.r][a.c] = { t: a.t, o: me, p: false, sick: true };
    st.pool[me].place[a.t]--;
  } else if (a.k === "fuse") {
    b[a.r][a.c] = { ...b[a.r][a.c], p: true };
    (a.mat ? st.pool[me].mat : st.pool[me].place)[b[a.r][a.c].t]--;
  } else if (a.k === "sell") {
    st.pool[me].mat[a.t]--;
    st.stones[me] += SELL[a.t];
  }
  return st;
}
const copyState = (st) => ({
  board: cloneB(st.board),
  pool: st.pool.map((pl) => ({ place: { ...pl.place }, mat: { ...pl.mat } })),
  stones: [...st.stones],
});
/* 相手の応手をすべて試し、me側にとって最悪の評価を返す */
function replyValue(st, me, cfg) {
  const opp = 1 - me;
  const board = st.board, n = board.length, z = zoneOf(cfg.size);
  const oppInCheck = inCheck(board, opp);
  if (oppInCheck && !hasResponse(board, opp, st.pool[opp], cfg, st.pool)) {
    const funds = st.stones[opp] + (cfg.sell !== "off" ? totalSellValue(st.pool[opp], cfg.sell) : 0);
    if (!gachaCanSave(board, opp, cfg, 1, funds)) return MATE; // 詰み
    return evalPos(st, me, opp, cfg) + 6;
  }
  let worst = oppInCheck ? Infinity : evalPos(st, me, me, cfg); // 相手がパスした場合
  const mk = kingPos(board, me);
  const consider = (st2) => {
    if (oppInCheck && inCheck(st2.board, opp)) return; // 王手を放置する応手は不可
    let v = evalPos(st2, me, me, cfg);
    if (inCheck(st2.board, me)) {
      if (!hasResponse(st2.board, me, st2.pool[me], cfg, st2.pool)) {
        const f = st2.stones[me] + (cfg.sell !== "off" ? totalSellValue(st2.pool[me], cfg.sell) : 0);
        v = gachaCanSave(st2.board, me, cfg, 1, f) ? v - 8 : -MATE;
      }
    }
    if (v < worst) worst = v;
  };
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      const p = board[r][c];
      if (!p || p.o !== opp) continue;
      for (const [tr, tc] of movesOf(board, r, c)) {
        const cap = board[tr][tc];
        if (cap && cap.t === "K") continue;
        if (!cfg.enemyPromo && !p.p && stranded(p.t, p.o, n, tr)) continue;
        const st2 = copyState(st);
        const promo = cfg.enemyPromo && !p.p && FUSABLE.includes(p.t) &&
          (inEnemyZone(opp, r, n, z) || inEnemyZone(opp, tr, n, z));
        if (cap) st2.pool[opp].mat[cap.t]++;
        st2.board[tr][tc] = { ...p, p: p.p || promo };
        st2.board[r][c] = null;
        if (p.t === "K" && inCheck(st2.board, opp)) continue;
        consider(st2);
      }
    }
  // 相手の打ち: こちらの玉の周り(2マス圏)だけを読む。価値の高い2種まで
  const types = TYPES7.filter((t) => st.pool[opp].place[t] > 0).sort((a, b) => VAL[b] - VAL[a]).slice(0, 2);
  if (types.length && mk) {
    for (let r = Math.max(0, mk[0] - 2); r <= Math.min(n - 1, mk[0] + 2); r++)
      for (let c = Math.max(0, mk[1] - 2); c <= Math.min(n - 1, mk[1] + 2); c++) {
        if (board[r][c] || cheb([r, c], mk) < 2) continue;
        for (const t of types) {
          if (stranded(t, opp, n, r)) continue;
          if (cfg.nifu && t === "P" && colHasPawn(board, opp, c)) continue;
          const st2 = copyState(st);
          st2.board[r][c] = { t, o: opp, p: false };
          st2.pool[opp].place[t]--;
          consider(st2);
        }
      }
  }
  return worst === Infinity ? MATE : worst;
}
function gachaGain(kind, pickup) {
  const rates = effRates(kind === "pr" ? PREMIUM_RATES : NORMAL_RATES, pickup);
  let ev = 0;
  for (const t of Object.keys(rates)) ev += (rates[t] / 100) * VAL[t];
  if (kind === "n3") ev *= 3;
  const cost = kind === "n1" ? 2 : kind === "pr" ? 3 : 5;
  return (ev * 0.8 - cost * 0.5) * 0.7;
}
function expertAction(g0, cfg) {
  const me = g0.cur, opp = 1 - me;
  const board = g0.board, pool = g0.pool[me], n = board.length;
  const chk = inCheck(board, me);
  if (!chk) {
    const m1 = findMate1(g0, cfg);
    if (m1) return m1.type === "move"
      ? doMoveG(g0, cfg, m1.m.fr, m1.m.fc, m1.m.tr, m1.m.tc, m1.promo)
      : doDropG(g0, cfg, m1.t, m1.r, m1.c);
  }
  const cands = [];
  if (g0.ap >= 1) for (const m of collectMoves(g0, cfg)) cands.push({ k: "move", m, promo: promoInfo(g0, cfg, m), left: 0 });
  if (g0.ap >= 0.5) {
    const ek = kingPos(board, opp), mk = kingPos(board, me);
    for (const t of TYPES7) {
      if (pool.place[t] <= 0) continue;
      let dd = dropDests(board, me, t, cfg, g0.pool, false);
      if (!chk) {
        const near = dd.filter(([r, c]) => (ek && cheb([r, c], ek) <= 3) || (mk && cheb([r, c], mk) <= 2));
        if (near.length >= 6) dd = near;
      }
      for (const [r, c] of dd) cands.push({ k: "drop", t, r, c, left: g0.ap - 0.5 });
    }
  }
  if (!chk) {
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++) {
        const p = board[r][c];
        if (!p || p.o !== me || p.p || p.sick || !FUSABLE.includes(p.t)) continue;
        if (pool.mat[p.t] > 0) cands.push({ k: "fuse", r, c, mat: true, left: g0.ap });
        else if (g0.ap >= 0.5 && pool.place[p.t] > 0) cands.push({ k: "fuse", r, c, mat: false, left: g0.ap - 0.5 });
      }
    if (cfg.sell !== "off") for (const t of TYPES7) if (pool.mat[t] > 0) cands.push({ k: "sell", t, left: g0.ap });
    cands.push({ k: "pass", left: 0 });
  }
  if (!cands.length) return aiAction(g0, cfg); // 王手で動けない: 打てる駒がなければガチャ・売却で凌ぐ
  // 第1段: 静的評価で絞り込む
  for (const a of cands) {
    a.st = applyLight(lightState(g0), me, a);
    a.s1 = evalPos(a.st, me, opp, cfg) + a.left * 0.6;
  }
  cands.sort((x, y) => y.s1 - x.s1);
  const top = cands.slice(0, 12);
  const pass = cands.find((a) => a.k === "pass");
  if (pass && !top.includes(pass)) top.push(pass);
  // 第2段: 相手の応手まで読む
  let best = null;
  for (const a of top) {
    a.v = replyValue(a.st, me, cfg) + a.left * 0.6 + Math.random() * 0.05;
    if (!best || a.v > best.v) best = a;
  }
  // ガチャ: 期待値で判断
  if (!chk && g0.ap >= 0.5 && pass) {
    let gk = null, gv = -Infinity;
    for (const kind of ["n1", "n3", "pr"]) {
      const cost = kind === "n1" ? 2 : kind === "pr" ? 3 : 5;
      if (g0.stones[me] < cost) continue;
      const v = pass.v + gachaGain(kind, g0.pickup) + 0.3;
      if (v > gv) { gv = v; gk = kind; }
    }
    if (gk && gv > best.v) return doGachaG(g0, cfg, gk);
  }
  switch (best.k) {
    case "move": return doMoveG(g0, cfg, best.m.fr, best.m.fc, best.m.tr, best.m.tc, best.promo);
    case "drop": return doDropG(g0, cfg, best.t, best.r, best.c);
    case "fuse": return doFuseG(g0, cfg, best.r, best.c, best.mat);
    case "sell": return doSellG(g0, cfg, best.t, true);
    default: return nextTurnStateG(g0, cfg);
  }
}

/* チュートリアル用の相手: 王手対応以外は歩を前進させて「餌」を出す。ガチャは引かない */
function tutAiAction(g0, cfg) {
  const o = 1;
  if (inCheck(g0.board, o)) return aiAction(g0, cfg);
  if (g0.ap >= 1) {
    // 歩を1マス前進(教材: 取られに行く)
    for (let r = 0; r < g0.board.length; r++)
      for (let c = 0; c < g0.board.length; c++) {
        const p = g0.board[r][c];
        if (p && p.o === 1 && p.t === "P" && !p.p) {
          const dd = legalDests(g0.board, r, c, cfg);
          const fwd = dd.find(([a, b]) => a === r + 1 && b === c && !g0.board[a][b] && a <= 3);
          if (fwd) {
            const m = { fr: r, fc: c, tr: fwd[0], tc: fwd[1] };
            return doMoveG(g0, cfg, m.fr, m.fc, m.tr, m.tc, promoInfo(g0, cfg, m));
          }
        }
      }
    const ms = collectMoves(g0, cfg);
    if (ms.length) {
      const quiet = ms.filter((m) => !g0.board[m.tr][m.tc]);
      const pick = (quiet.length ? quiet : ms)[Math.floor(Math.random() * (quiet.length ? quiet.length : ms.length))];
      return doMoveG(g0, cfg, pick.fr, pick.fc, pick.tr, pick.tc, promoInfo(g0, cfg, pick));
    }
  }
  return nextTurnStateG(g0, cfg);
}

function aiSetupAction(g0, cfg) {
  if (!g0.drew[1]) return doSetupDrawG(g0, cfg);
  // マリガン: 銀以上の駒が1枚もなければ引き直す
  if (cfg.mulligan && !g0.mull[1] && ownPlacedCount(g0.board, 1) === 0) {
    const pool0 = g0.pool[1].place;
    const hasGood = ["S", "G", "B", "R"].some((t) => pool0[t] > 0);
    if (!hasGood) return doSetupRedrawG(g0, cfg);
  }
  const pool = g0.pool[1];
  const n = g0.board.length, z = zoneOf(cfg.size);
  const mid = Math.floor(n / 2);
  for (const t of ["R", "B", "G", "S", "N", "L", "P"]) {
    if (pool.place[t] <= 0) continue;
    const dd = setupDestsG(g0, cfg, t);
    if (!dd.length) continue;
    let bd = dd[0], bs = -1e9;
    for (const [r, c] of dd) {
      let s = t === "P" ? -(z - 1 - r) : -r;
      s -= Math.abs(c - mid) * 0.3;
      s += Math.random() * 0.4;
      if (s > bs) { bs = s; bd = [r, c]; }
    }
    return doSetupPlaceG(g0, cfg, t, bd[0], bd[1]);
  }
  return doSetupDoneG(g0, cfg);
}

/* ================= 駒コンポーネント ================= */
const KOMA_CLIP = "polygon(50% 0%, 88% 21%, 81.5% 100%, 18.5% 100%, 12% 21%)";

function Koma({ pc, cell, flipped, dim }) {
  const face = pc.p ? PROM_KANJI[pc.t] : KANJI[pc.t];
  const upside = flipped != null ? flipped : pc.o === 1;
  const rare = RARE[pc.t];
  // dim=取った駒(素材)。フィルターではなく灰色の面で描く
  const faceBg = dim
    ? "linear-gradient(176deg,#e4e7ec 0%,#c7ccd4 45%,#a9b0ba 100%)"
    : rare
    ? "linear-gradient(176deg,#f8e8b4 0%,#eccb74 40%,#ddb056 75%,#c99a40 100%)"
    : "linear-gradient(176deg,#f7ecd0 0%,#ecd7a4 40%,#dfbe7d 75%,#cda45f 100%)";
  const clip = { clipPath: KOMA_CLIP, WebkitClipPath: KOMA_CLIP };
  const abs = { position: "absolute", left: 0, right: 0 };
  return (
    <div
      style={{
        position: "relative",
        width: "86%", height: "92%",
        transform: upside ? "rotate(180deg)" : undefined,
        filter: "drop-shadow(0 2px 2px rgba(0,0,0,.55))",
        WebkitFilter: "drop-shadow(0 2px 2px rgba(0,0,0,.55))",
        opacity: pc.sick ? 0.78 : 1,
        userSelect: "none", WebkitUserSelect: "none",
      }}
    >
      {/* 厚み(側面の木口) */}
      <div style={{ ...abs, top: 3, bottom: 0, ...clip, background: dim ? "linear-gradient(180deg,#7b818b,#545a63)" : "linear-gradient(180deg,#8a6432,#5a3f1c)" }} />
      {/* 表面 */}
      <div style={{ ...abs, top: 0, bottom: 3, ...clip, background: faceBg, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
        <div style={{ position: "absolute", inset: 0, top: 0, left: 0, right: 0, bottom: 0, background: PIECE_GRAIN, opacity: dim ? 0.25 : 0.55, mixBlendMode: "multiply" }} />
        {/* 面取りの光と陰 */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "linear-gradient(178deg, rgba(255,252,240,.55) 0%, rgba(255,252,240,0) 24%, rgba(0,0,0,0) 70%, rgba(58,34,8,.32) 100%)" }} />
        <span
          style={{
            ...MINCHO,
            position: "relative",
            color: dim ? "#3a3f47" : pc.p ? "#9e1f16" : "#221304",
            fontWeight: 700,
            fontSize: cell * 0.46,
            lineHeight: 1,
            paddingBottom: cell * 0.1,
            textShadow: "0 1px 0 rgba(255,246,218,.55), 0 0 1px rgba(40,20,0,.4)",
          }}
        >
          {face}
        </span>
      </div>
    </div>
  );
}

/* ガチャ演出用: 裏向きの駒がめくれる。レアは金の光をまとってから反転 */
function FxKoma({ item }) {
  const { t, rare, delay } = item;
  const flipDelay = delay + (rare ? 0.55 : 0.12);
  return (
    <div className="relative" style={{ width: 58, height: 66, perspective: 320, animation: `koAppear .15s ease ${delay}s both`, filter: "drop-shadow(0 3px 3px rgba(0,0,0,.5))" }}>
      {rare && (
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            inset: -16,
            background: "radial-gradient(circle, rgba(240,205,122,.9) 0%, rgba(240,205,122,0) 70%)",
            animation: `koGlow .6s ease ${delay}s both`,
          }}
        />
      )}
      {rare && (
        <div
          className="absolute rounded-full pointer-events-none"
          style={{ inset: -10, border: "2px solid #f0cd7a", animation: `koBurst .5s ease ${flipDelay}s both` }}
        />
      )}
      <div className="w-full h-full relative" style={{ transformStyle: "preserve-3d", animation: `koFlip .35s ease ${flipDelay}s both` }}>
        {/* 裏面 */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ backfaceVisibility: "hidden", clipPath: KOMA_CLIP, background: "linear-gradient(170deg,#9c7a44,#6b4d26)" }}
        >
          <div className="absolute inset-0" style={{ background: PIECE_GRAIN, opacity: 0.5, mixBlendMode: "multiply" }} />
          <span className="rotate-45 inline-block w-2.5 h-2.5" style={{ background: "#caa05f" }} />
        </div>
        {/* 表面 */}
        <div
          className="absolute inset-0 flex items-end justify-center"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            clipPath: KOMA_CLIP,
            background: rare
              ? "linear-gradient(176deg,#f8e8b4 0%,#eccb74 40%,#ddb056 75%,#c99a40 100%)"
              : "linear-gradient(176deg,#f7ecd0 0%,#ecd7a4 40%,#dfbe7d 75%,#cda45f 100%)",
          }}
        >
          <div className="absolute inset-0" style={{ background: PIECE_GRAIN, opacity: 0.5, mixBlendMode: "multiply" }} />
          <div className="absolute inset-0" style={{ background: "linear-gradient(178deg, rgba(255,252,240,.55) 0%, rgba(255,252,240,0) 24%, rgba(0,0,0,0) 70%, rgba(58,34,8,.3) 100%)" }} />
          <span style={{ ...MINCHO, position: "relative", color: "#221304", fontWeight: 800, fontSize: 30, lineHeight: 1, paddingBottom: 8, textShadow: "0 1px 0 rgba(255,246,218,.55)" }}>{KANJI[t]}</span>
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `linear-gradient(105deg, transparent 38%, rgba(255,255,255,${rare ? 0.8 : 0.55}) 50%, transparent 62%)`,
              backgroundSize: "260% 100%",
              animation: `koShine .45s ease ${flipDelay + 0.2}s both`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function PoolChip({ t, count, mat, active, onClick, disabled }) {
  const badge = {
    position: "absolute", lineHeight: 1, fontWeight: 700, borderRadius: 999, pointerEvents: "none", zIndex: 2,
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`${NAMES[t]} ${count}枚${mat ? "(素材)" : ""}`}
      style={{
        position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center",
        flex: "0 0 auto", width: 44, height: 50, padding: 0, margin: 0, border: 0, borderRadius: 6,
        WebkitAppearance: "none", appearance: "none", font: "inherit", color: "inherit",
        background: active ? "rgba(240,205,122,.30)" : "transparent",
        boxShadow: active ? "0 0 0 2px #f0cd7a" : "none",
        transform: active ? "translateY(-3px)" : "none",
        opacity: disabled && !active ? 0.6 : 1,
        cursor: disabled ? "default" : "pointer",
      }}
    >
      <span style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 38 }}>
        <Koma pc={{ t, o: 0, p: false }} cell={40} flipped={false} dim={mat} />
      </span>
      {count > 1 && (
        <span style={{ ...badge, right: -1, bottom: 0, fontSize: 10, padding: "2px 4px", background: "#1b2130", color: "#f0e2bd", border: "1px solid #6b5530" }}>
          {count}
        </span>
      )}
      {mat && (
        <span style={{ ...badge, left: -1, top: 0, fontSize: 9, padding: "2px 3px", borderRadius: 3, background: "#3a4356", color: "#d5dbe5" }}>素</span>
      )}
    </button>
  );
}

/* 盤上の駒の動き(スライド・打ち込み・成り・駒取りの火花) */
function AnimKoma({ pc, cell, flipped, anim, dx, dy }) {
  let style = {};
  if (anim && (anim.k === "move" || anim.k === "capture")) {
    style = { "--dx": `${dx}px`, "--dy": `${dy}px`, animation: "komaSlide .22s cubic-bezier(.2,.8,.25,1) both" };
  } else if (anim && anim.k === "drop") {
    style = { animation: "komaDrop .26s cubic-bezier(.2,.9,.3,1.2) both" };
  } else if (anim && anim.k === "fuse") {
    style = { animation: "komaPromote .5s ease both" };
  }
  return (
    <div key={anim ? anim.id : "still"} className="absolute inset-0 flex items-center justify-center" style={style}>
      <Koma pc={pc} cell={cell} flipped={flipped} />
    </div>
  );
}

function CaptureSparks({ id }) {
  return (
    <div key={id} className="absolute inset-0 pointer-events-none" style={{ zIndex: 6 }}>
      {Array.from({ length: 8 }, (_, i) => (
        <span
          key={i}
          className="absolute rounded-full"
          style={{
            left: "50%", top: "50%", width: 5, height: 5, marginLeft: -2.5, marginTop: -2.5,
            background: i % 2 ? "#ffd27a" : "#ff7a4d",
            "--ang": `${i * 45 + 22}deg`,
            animation: "capSpark .45s ease-out .12s both",
          }}
        />
      ))}
    </div>
  );
}

/* ================= メイン ================= */
export default function GachaShogi() {
  const [screen, setScreen] = useState("menu");
  const [cfg, setCfg] = useState({
    mode: "ai", ailv: "normal", size: 9, spt: 1, init0: 2, init1: 2,
    enemyPromo: true, nifu: true, pickup: true, limit: 0,
    sell: "mat", cap: 0, undo: true, fx: true, snd: true, bgm: true, mulligan: 1, guide: true,
    flip: "fixed", aispeed: "normal",
  });
  const [g, setG] = useState(null);
  const [sel, setSel] = useState(null); // {kind:'sq'|'drop'|'setup'|'view'|'mat', ...}
  const [pend, setPend] = useState(null);
  const [showRates, setShowRates] = useState(false);
  const [handoff, setHandoff] = useState(false);
  const [fx, setFx] = useState(null); // ガチャ演出 {key, who, kind, items:[{t,rare,delay,dur}]}
  const [fxHidden, setFxHidden] = useState(null); // 演出でめくれるまでプール表示から隠す {who, counts:{t:n}}
  const fxToRef = useRef([]); // 段階公開用タイマー
  const histRef = useRef([]);
  const fxSeenRef = useRef(0);
  const fxTimerRef = useRef(null);
  const sndSeenRef = useRef(0);
  const overSndRef = useRef(false);
  const checkKeyRef = useRef("");
  const [help, setHelp] = useState(null); // null | 'rules' | 'pieces'
  const helpSeenRef = useRef(false);
  const [showOpt, setShowOpt] = useState(false); // 詳細オプションの開閉
  const [confirmExit, setConfirmExit] = useState(false); // 対局中断の確認
  const [confirmResign, setConfirmResign] = useState(null); // 投了の確認(投了する側のプレイヤー番号)
  const [showResult, setShowResult] = useState(false); // リザルト画面
  const [checkFx, setCheckFx] = useState(0); // 王手演出
  const [turnToast, setTurnToast] = useState(null); // 手番の切り替わり表示 {id, text, mine}
  const turnKeyRef = useRef("");
  const [logOpen, setLogOpen] = useState(false);
  const checkFxTimerRef = useRef(null);
  const [tstep, setTstep] = useState(0); // チュートリアル進行(0=導入)
  const tutSndRef = useRef(0);
  const tutGRef = useRef(0);
  const cfgBackupRef = useRef(null);
  const [vw, setVw] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
  useEffect(() => {
    const f = () => setVw(window.innerWidth);
    window.addEventListener("resize", f);
    return () => window.removeEventListener("resize", f);
  }, []);

  const aiControls = (g0) =>
    cfg.mode === "ai" && ((g0.phase === "play" && g0.cur === 1) || (g0.phase === "setup" && g0.sp === 1));

  /* 履歴付きの状態更新 */
  function commit(act, updater, humanGacha = false) {
    setG((g0) => {
      const ng = updater(g0);
      if (ng !== g0) {
        const h = histRef.current;
        if (!h.length || h[h.length - 1].g !== g0) {
          h.push({ g: g0, act, humanGacha });
          if (h.length > 80) h.shift();
        }
      }
      return ng;
    });
  }

  function clearFxAll() {
    if (fxTimerRef.current) clearTimeout(fxTimerRef.current);
    fxToRef.current.forEach(clearTimeout);
    fxToRef.current = [];
    setFx(null);
    setFxHidden(null);
  }

  function newGame() {
    histRef.current = [];
    clearFxAll();
    setG(newGameG(cfg));
    setSel(null); setPend(null); setHandoff(false); setShowResult(false);
    setScreen("game");
    if (!helpSeenRef.current) {
      helpSeenRef.current = true;
      setHelp("rules"); // 初回だけ遊び方カードを自動表示
    }
  }

  /* ---- チュートリアル ---- */
  const TUT_MSGS = {
    1: "① 「初回3連ガチャ(無料)」を引こう。レアが出るかも…?",
    2: "② 引いた3枚を配置しよう。下の駒台の駒をタップ → 緑に光った自陣マスへ(3枚とも置こう)",
    3: "③ 「配置完了」を押そう。相手の配置が公開されて対局開始!",
    4: "④ 自分の駒をタップ → 緑のマスへ動かそう(移動=行動力1.0を使う)",
    5: "⑤ 石が貯まった! ガチャ「単発(2石)」を引こう",
    6: "⑥ 引いた駒を駒台でタップ → 盤の好きなマスに打とう(0.5)。相手王の周り8マスは打てない",
    7: "⑦ 今度は何もせず「ターン終了」を押してみよう(パス)。行動力を余らせて石を貯める作戦もできる。なお行動力を使い切ると自動で相手の番になる",
    8: "⑧ パスで石が貯まった! もう一度「単発(2石)」を引こう(次の合成の材料にする)",
    9: "⑨ 盤上の歩をタップ →「ガチャ駒で(0.5)」ボタンで合成! 同じ駒2枚で\"と金\"に成る",
    10: "⑩ 相手の歩が前に出てくる。自分の駒の利きに入ったら取ろう(届かなければ駒を近づける)。取るとターン終了&素材ゲット",
    11: "⑪ 取った素材(駒台の右側、灰色で「素」マークの駒)をタップ →「売却」ボタンで石に換えてみよう(コスト0)。素材は無料の合成にも使えるので、状況で使い分けるのがコツ",
    12: "🎓 ここからは自由に! 王手(赤表示)をかけて、相手の王を詰ませたら勝ち!",
  };

  function startTutorial() {
    if (!cfg.tut) cfgBackupRef.current = cfg; // 「もう一度」でチュートリアル設定を退避先に上書きしない
    const tcfg = {
      ...cfg, mode: "ai", tut: true, ailv: "easy",
      size: 6, spt: 2, init0: 0, init1: 0,
      pickup: false, mulligan: 0, sell: "mat", cap: 0, limit: 0,
      undo: false, guide: false, nifu: true, enemyPromo: true,
    };
    setCfg(tcfg);
    histRef.current = [];
    clearFxAll();
    helpSeenRef.current = true;
    const g0 = newGameG(tcfg);
    // 台本: 引く駒を固定(自分=歩・銀・飛 / 相手=歩・歩・香 / 対局中の単発2回=歩・歩)
    tapePreset([0.5, U_FOR.P, U_FOR.S, U_FOR.R, U_FOR.P, U_FOR.P, U_FOR.L, U_FOR.P, U_FOR.P]);
    setG(g0);
    setSel(null); setPend(null); setHandoff(false); setShowResult(false);
    setTstep(0);
    tutSndRef.current = 0; tutGRef.current = 0;
    setScreen("game");
  }

  function goMenu() {
    if (cfg.tut && cfgBackupRef.current) setCfg(cfgBackupRef.current);
    stopBgm();
    setScreen("menu");
  }

  /* チュートリアル進行(状態ベース) */
  useEffect(() => {
    if (!cfg.tut || !g) return;
    setTstep((s) => {
      let n = s;
      if (n === 1 && g.drew[0]) n = 2;
      if (n === 2 && g.drew[0] && TYPES7.every((t) => g.pool[0].place[t] === 0)) n = 3;
      if (n === 3 && g.phase === "play") n = 4;
      return n;
    });
  }, [g, cfg.tut]);

  /* チュートリアル進行(行動イベントベース) */
  useEffect(() => {
    if (!cfg.tut || !g || !g.snd) return;
    if (g.snd.id <= tutSndRef.current) return;
    tutSndRef.current = g.snd.id;
    if (g.snd.who !== 0) return;
    setTstep((s) => {
      if (s === 4 && g.snd.type === "move") return 5;
      if (s === 6 && g.snd.type === "drop") return 7;
      if (s === 9 && g.snd.type === "fuse") return 10;
      if (s === 10 && g.snd.type === "capture") return 11;
      if (s === 11 && g.snd.type === "sell") return 12;
      return s;
    });
  }, [g, cfg.tut]);
  useEffect(() => {
    if (!cfg.tut || !g || !g.lastGacha) return;
    if (g.lastGacha.id <= tutGRef.current) return;
    tutGRef.current = g.lastGacha.id;
    if (g.lastGacha.who !== 0 || g.lastGacha.setup) return;
    setTstep((s) => (s === 5 ? 6 : s === 8 ? 9 : s));
  }, [g, cfg.tut]);

  /* ---- 待った ---- */
  function undo() {
    const h = histRef.current;
    // ターン終了(手動・自動)とAIの手は「操作」ではないので飛ばし、直前の操作を1つ取り消す
    const skip = cfg.mode === "pvp" ? ["auto", "end"] : ["auto", "end", "ai"];
    let i = h.length - 1;
    while (i >= 0 && skip.includes(h[i].act)) i--;
    if (i < 0) {
      setG((g0) => ({ ...g0, log: addLog(g0.log, "これ以上戻せません。") }));
      return;
    }
    if (h[i].act === "gacha") {
      setG((g0) => ({ ...g0, log: addLog(g0.log, "ガチャは待ったできません。") }));
      return;
    }
    const st = h[i].g;
    h.length = i;
    setG(st); setSel(null); setPend(null); clearFxAll();
  }

  /* ---- ハンドラ(人間) ---- */
  const gacha = (kind) => {
    commit("gacha", (g0) => doGachaG(g0, cfg, kind), true);
    setSel(null);
  };
  const applyMove = (fr, fc, tr, tc, promote) => { commit("move", (g0) => doMoveG(g0, cfg, fr, fc, tr, tc, promote)); setSel(null); setPend(null); };
  const applyDrop = (t, r, c) => { commit("drop", (g0) => doDropG(g0, cfg, t, r, c)); setSel(null); };
  const fuse = (r, c, useMat) => { commit("fuse", (g0) => doFuseG(g0, cfg, r, c, useMat)); setSel(null); };
  const sell = (t, fromMat) => { commit("sell", (g0) => doSellG(g0, cfg, t, fromMat)); setSel(null); };
  const setupDraw = () => {
    commit("gacha", (g0) => doSetupDrawG(g0, cfg), true);
  };
  const setupRedraw = () => {
    commit("gacha", (g0) => doSetupRedrawG(g0, cfg), true);
    setSel(null);
  };
  const setupDone = () => {
    const wasP0 = g && g.phase === "setup" && g.sp === 0;
    commit("setup", (g0) => doSetupDoneG(g0, cfg));
    setSel(null);
    if (wasP0 && cfg.mode === "pvp") setHandoff(true);
  };
  const endTurn = () => {
    if (inCheck(g.board, g.cur)) return;
    commit("end", (g0) => nextTurnStateG(g0, cfg));
    setSel(null);
    if (cfg.tut) setTstep((s) => (s === 7 ? 8 : s)); // チュートリアル: パス体験の達成
  };

  function clickCell(r, c) {
    if (!g || pend) return;
    const pc = g.board[r][c];
    // 終局後は利きの閲覧のみ可能
    if (g.over) {
      if (pc) setSel({ kind: "view", r, c, dests: movesOf(g.board, r, c) });
      else setSel(null);
      return;
    }
    const aiTurn = aiControls(g);
    if (aiTurn) {
      if (pc) setSel({ kind: "view", r, c, dests: movesOf(g.board, r, c) });
      else setSel(null);
      return;
    }

    if (g.phase === "setup") {
      if (sel && sel.kind === "setup" && sel.dests.some(([a, b]) => a === r && b === c)) {
        commit("setup", (g0) => doSetupPlaceG(g0, cfg, sel.t, r, c));
        setSel(null);
      } else if (pc) {
        setSel({ kind: "view", r, c, dests: movesOf(g.board, r, c) });
      } else setSel(null);
      return;
    }

    if (sel && sel.kind === "sq" && !sel.viewOnly && sel.dests.some(([a, b]) => a === r && b === c)) {
      const spc = g.board[sel.r][sel.c];
      const n = g.board.length, z = zoneOf(cfg.size);
      const must = cfg.enemyPromo && !spc.p && stranded(spc.t, spc.o, n, r);
      const can = cfg.enemyPromo && !spc.p && FUSABLE.includes(spc.t) &&
        (inEnemyZone(spc.o, sel.r, n, z) || inEnemyZone(spc.o, r, n, z));
      if (must) applyMove(sel.r, sel.c, r, c, true);
      else if (can) setPend({ fr: sel.r, fc: sel.c, tr: r, tc: c });
      else applyMove(sel.r, sel.c, r, c, false);
      return;
    }
    if (sel && sel.kind === "drop" && sel.dests.some(([a, b]) => a === r && b === c)) {
      applyDrop(sel.t, r, c);
      return;
    }
    if (pc && pc.o === g.cur) {
      if (sel && sel.kind === "sq" && sel.r === r && sel.c === c) { setSel(null); return; }
      setSel({ kind: "sq", r, c, viewOnly: g.ap < 1, dests: legalDests(g.board, r, c, cfg) });
    } else if (pc) {
      setSel({ kind: "view", r, c, dests: movesOf(g.board, r, c) });
    } else setSel(null);
  }

  function clickPool(t, isSetup, fromMat) {
    if (!g || g.over || pend || aiControls(g)) return;
    if (fromMat) {
      if (cfg.sell === "off" || g.phase !== "play" || g.pool[g.cur].mat[t] <= 0) return;
      setSel({ kind: "mat", t });
      return;
    }
    if (isSetup) {
      if (g.pool[g.sp].place[t] <= 0) return;
      setSel({ kind: "setup", t, dests: setupDestsG(g, cfg, t) });
      return;
    }
    if (g.pool[g.cur].place[t] <= 0 || g.ap < 0.5) {
      // AP不足でも売却対象としては選べる(すべて売却可の設定時のみ)
      if (cfg.sell === "all" && g.pool[g.cur].place[t] > 0) setSel({ kind: "drop", t, dests: [] });
      return;
    }
    setSel({ kind: "drop", t, dests: dropDests(g.board, g.cur, t, cfg, g.pool, false) });
  }

  /* ---- 詰み判定 ---- */
  useEffect(() => {
    if (!g || g.phase !== "play" || g.over || pend) return;
    if (!inCheck(g.board, g.cur)) return;
    const anyMove = existsLegalMove(g.board, g.cur, cfg);
    const anyDrop = existsLegalDrop(g.board, g.cur, g.pool[g.cur], cfg, g.pool);
    const sellable = cfg.sell !== "off" ? totalSellValue(g.pool[g.cur], cfg.sell) : 0;
    const canGacha = gachaCanSave(g.board, g.cur, cfg, g.ap, g.stones[g.cur] + sellable);
    const canEsc = (g.ap >= 1 && anyMove) || (g.ap >= 0.5 && anyDrop) || canGacha;
    if (!canEsc) {
      setG((g0) => ({
        ...g0,
        over: { winner: 1 - g0.cur, reason: "詰み" },
        log: addLog(g0.log, `詰み! ${pname(1 - g0.cur, cfg)}の勝ち`),
      }));
    }
  }, [g, pend]);

  /* ---- 行動不能なら自動でターン終了(人間の手番) ---- */
  useEffect(() => {
    if (!g || g.phase !== "play" || g.over || pend) return;
    if (aiControls(g)) return;
    if (fx) return; // 引いた駒がめくれ終わるまで待つ
    if (inCheck(g.board, g.cur)) return;
    const o = g.cur;
    const pool = g.pool[o];
    const canMove = g.ap >= 1 && existsLegalMove(g.board, o, cfg);
    const canGacha = g.ap >= 0.5 && g.stones[o] >= 2;
    const canDrop = g.ap >= 0.5 && existsLegalDrop(g.board, o, pool, cfg, g.pool);
    const canSell = cfg.sell !== "off" && g.ap >= 0.5 && totalSellValue(pool, cfg.sell) > 0; // 売却→ガチャの目がある間は待つ
    let canFuseMat = false, canFuseGacha = false;
    for (let r = 0; r < g.board.length; r++)
      for (let c = 0; c < g.board.length; c++) {
        const p = g.board[r][c];
        if (p && p.o === o && !p.p && !p.sick && FUSABLE.includes(p.t)) {
          if (pool.mat[p.t] > 0) canFuseMat = true;
          if (g.ap >= 0.5 && pool.place[p.t] > 0) canFuseGacha = true;
        }
      }
    if (canMove || canGacha || canDrop || canSell || canFuseMat || canFuseGacha) return;
    const id = setTimeout(() => {
      commit("auto", (g0) => {
        if (g0.phase !== "play" || g0.over) return g0;
        return nextTurnStateG(g0, cfg, "行動できないため自動でターン終了");
      });
      setSel(null);
    }, 800);
    return () => clearTimeout(id);
  }, [g, pend, fx]);

  /* ---- ガチャ演出+ガチャ音 ---- */
  useEffect(() => {
    if (!g || !g.lastGacha) return;
    const ev = g.lastGacha;
    if (ev.id <= fxSeenRef.current) return; // 待った等での再発火防止
    fxSeenRef.current = ev.id;
    const isAI = cfg.mode === "ai" && ev.who === 1;
    if (ev.setup) {
      // 同時公開制のため、公開されている自分(AI戦の先手)の初回ガチャのみ
      if (!(cfg.mode === "ai" && ev.who === 0)) return;
    }
    let res = ev.res;
    if (isAI) res = res.filter((t) => RARE[t]); // AIはレア(角・飛)のみ表示
    if (!res.length) return;
    let delay = 0;
    const items = res.map((t) => {
      const rare = !!RARE[t];
      const dur = rare ? 1.0 : 0.5; // 通常0.5秒 / レア1秒
      const it = { t, rare, delay, dur };
      delay += dur;
      return it;
    });
    if (cfg.snd) {
      if (cfg.fx) {
        // めくれるタイミングに合わせて音を予約
        for (const it of items) {
          const flipAt = it.delay + (it.rare ? 0.55 : 0.12);
          playSnd("roll", { at: flipAt });
          if (it.rare) playSnd("rare", { at: flipAt });
        }
      } else {
        playSnd("roll");
        if (items.some((i) => i.rare)) playSnd("rare", { at: 0.1 });
      }
    }
    if (!cfg.fx) return;
    // めくれるまでプール表示から隠し、反転タイミングで1枚ずつ公開
    const hid = {};
    items.forEach((it) => { hid[it.t] = (hid[it.t] || 0) + 1; });
    fxToRef.current.forEach(clearTimeout);
    fxToRef.current = [];
    setFxHidden({ who: ev.who, counts: hid });
    items.forEach((it) => {
      const at = (it.delay + (it.rare ? 0.55 : 0.12) + 0.18) * 1000;
      fxToRef.current.push(setTimeout(() => {
        setFxHidden((h) => {
          if (!h) return h;
          const c = { ...h.counts };
          c[it.t] = Math.max(0, (c[it.t] || 0) - 1);
          return { ...h, counts: c };
        });
      }, at));
    });
    setFx({ key: ev.id, who: ev.who, kind: isAI ? "AIがレアを引いた!" : ev.kind, items });
    if (fxTimerRef.current) clearTimeout(fxTimerRef.current);
    fxTimerRef.current = setTimeout(() => { setFx(null); setFxHidden(null); }, delay * 1000 + 600);
    return;
  }, [g]);

  /* ---- 行動の効果音 ---- */
  useEffect(() => {
    if (!g || !g.snd) return;
    if (g.snd.id <= sndSeenRef.current) return;
    sndSeenRef.current = g.snd.id;
    if (cfg.snd) {
      playSnd(g.snd.type);
      if (g.snd.type === "capture" && typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(14);
    }
  }, [g]);

  /* ---- BGM: ゲーム画面中のみ再生 ---- */
  useEffect(() => {
    if (screen === "game" && cfg.bgm) startBgm();
    else stopBgm();
    return () => stopBgm();
  }, [screen, cfg.bgm]);

  /* ---- 王手アラート音 ---- */
  useEffect(() => {
    if (!g || g.phase !== "play" || g.over) return;
    if (!inCheck(g.board, g.cur)) return;
    const key = g.round + ":" + g.cur;
    if (checkKeyRef.current === key) return;
    checkKeyRef.current = key;
    if (cfg.snd) {
      playSnd("check");
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([18, 40, 18]);
    }
    // 「王手」の演出
    setCheckFx((n) => n + 1);
    if (checkFxTimerRef.current) clearTimeout(checkFxTimerRef.current);
    checkFxTimerRef.current = setTimeout(() => setCheckFx(0), 1100);
  }, [g]);

  /* ---- 手番の切り替わり表示 ---- */
  useEffect(() => {
    if (!g || g.phase !== "play" || g.over) return;
    const key = g.round + ":" + g.cur;
    if (turnKeyRef.current === key) return;
    turnKeyRef.current = key;
    const mine = cfg.mode === "ai" ? g.cur === 0 : true;
    const text = cfg.mode === "ai" ? (g.cur === 0 ? "あなたの番" : "AIの番") : g.cur === 0 ? "先手の番" : "後手の番";
    setTurnToast({ id: key, text, mine });
    // 同じ手番中にgが更新されても消えるよう、タイマーはeffectの後片付けに結びつけない
    setTimeout(() => setTurnToast((t) => (t && t.id === key ? null : t)), 1000);
  }, [g]);

  /* ---- 終局ジングル ---- */
  useEffect(() => {
    if (!g || !g.over) { overSndRef.current = false; return; }
    if (overSndRef.current) return;
    overSndRef.current = true;
    if (!cfg.snd) return;
    if (g.over.winner === -1) playSnd("draw");
    else {
      const humanWon = cfg.mode === "pvp" ? true : g.over.winner === 0;
      playSnd(humanWon ? "win" : "lose");
    }
  }, [g]);

  /* ---- AIの手番 ---- */
  useEffect(() => {
    if (!g || g.over || pend || cfg.mode !== "ai") return;
    const isAiPlay = g.phase === "play" && g.cur === 1;
    const isAiSetup = g.phase === "setup" && g.sp === 1;
    if (!isAiPlay && !isAiSetup) return;
    const id = setTimeout(() => {
      commit("ai", (g0) => {
        if (g0.over) return g0;
        if (g0.phase === "setup" && g0.sp === 1) return aiSetupAction(g0, cfg);
        if (g0.phase === "play" && g0.cur === 1) {
          if (cfg.tut) return tutAiAction(g0, cfg);
          return cfg.ailv === "master" ? expertAction(g0, cfg) : aiAction(g0, cfg);
        }
        return g0;
      });
    }, isAiSetup ? (cfg.aispeed === "fast" ? 120 : 280) : cfg.aispeed === "fast" ? 260 : 700);
    return () => clearTimeout(id);
  }, [g, pend]);

  /* ================= 描画 ================= */
  if (screen === "menu") {
    return (
      <div
        className="min-h-screen w-full flex items-center justify-center p-4"
        style={{
          background:
            "radial-gradient(ellipse at 50% 18%, rgba(228,185,79,.10) 0%, rgba(228,185,79,0) 55%), " +
            "repeating-linear-gradient(0deg, rgba(255,255,255,.025) 0 1px, transparent 1px 44px), " +
            "repeating-linear-gradient(90deg, rgba(255,255,255,.025) 0 1px, transparent 1px 44px), " +
            "linear-gradient(180deg,#141925 0%,#1c2333 100%)",
          touchAction: "manipulation", WebkitTapHighlightColor: "transparent",
        }}
      >
        <style>{FONT_CSS}</style>
        <style>{`@keyframes fanIn { from { opacity: 0; transform: translateY(18px) rotate(var(--rot)); } to { opacity: 1; transform: translateY(0) rotate(var(--rot)); } }
          @keyframes rareGlow { 0%,100% { opacity: .55; } 50% { opacity: 1; } }
          @media (prefers-reduced-motion: reduce) { * { animation-duration: .01ms !important; animation-delay: 0s !important; } }`}</style>
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            {/* 引いた3枚の駒(歩・銀・飛) */}
            <div className="relative mx-auto mb-3 flex items-end justify-center" style={{ height: 92 }}>
              <div className="absolute rounded-full pointer-events-none" style={{ width: 120, height: 120, left: "50%", top: -10, marginLeft: 6, background: "radial-gradient(circle, rgba(240,205,122,.45) 0%, rgba(240,205,122,0) 65%)", animation: "rareGlow 2.6s ease-in-out infinite" }} />
              {[["P", -14, 0, 0], ["S", 0, -6, 0.08], ["R", 14, 0, 0.16]].map(([t, rot, y, d]) => (
                <div key={t} style={{ width: 60, height: 68, margin: "0 -2px", marginBottom: -y, "--rot": `${rot}deg`, transform: `rotate(${rot}deg)`, animation: `fanIn .5s ease ${d}s both`, transformOrigin: "50% 100%" }}>
                  <Koma pc={{ t, o: 0, p: false }} cell={70} flipped={false} />
                </div>
              ))}
            </div>
            <div style={{ ...MINCHO, fontWeight: 800, textShadow: "0 2px 0 rgba(0,0,0,.4)" }} className="text-5xl tracking-widest text-amber-100">ガチャ将棋</div>
            <div className="text-slate-400 text-sm mt-2 tracking-wide">王一枚から、引いて、置いて、成って、詰ます。</div>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-4 space-y-3 text-slate-200 text-sm">
            <OptRow label="対戦モード">
              <Seg options={[["ai", "AI対戦"], ["pvp", "2人対戦"]]} value={cfg.mode} onChange={(v) => setCfg({ ...cfg, mode: v })} />
            </OptRow>
            {cfg.mode === "ai" && (
              <OptRow label="AIの強さ">
                <Seg options={[["easy", "よわい"], ["normal", "ふつう"], ["hard", "つよい"], ["master", "達人"]]} value={cfg.ailv} onChange={(v) => setCfg({ ...cfg, ailv: v })} />
              </OptRow>
            )}
            <OptRow label="盤サイズ">
              <Seg options={[["9", "9×9 標準"], ["6", "6×6 スピード"]]} value={String(cfg.size)} onChange={(v) => setCfg({ ...cfg, size: Number(v) })} />
            </OptRow>
          </div>

          {/* 詳細オプション(折りたたみ) */}
          <div className="mt-3 rounded-lg border border-slate-700 bg-slate-900/70 text-slate-200 text-sm overflow-hidden">
            <button
              onClick={() => setShowOpt(!showOpt)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-800/60"
            >
              <span className="text-slate-300">
                <span className={`inline-block mr-2 transition-transform ${showOpt ? "rotate-90" : ""}`}>▸</span>
                詳細オプション
              </span>
              <span className="text-xs text-slate-500">
                {(() => {
                  const d = { spt: 1, init0: 2, init1: 2, cap: 0, sell: "mat", mulligan: 1, guide: true, fx: true, snd: true, bgm: true, undo: true, enemyPromo: true, nifu: true, pickup: true, limit: 0, flip: "fixed", aispeed: "normal" };
                  const n = Object.keys(d).filter((k) => cfg[k] !== d[k]).length;
                  return n > 0 ? <span className="text-amber-400">標準から{n}件変更中</span> : "すべて標準";
                })()}
              </span>
            </button>
            {showOpt && (
              <div className="px-4 pb-4 space-y-3 border-t border-slate-800 pt-3">
                <OptRow label="毎ターン配布石">
                  <Seg options={[["1", "1石"], ["2", "2石"], ["3", "3石"]]} value={String(cfg.spt)} onChange={(v) => setCfg({ ...cfg, spt: Number(v) })} />
                </OptRow>
                <OptRow label="初期石(先手)">
                  <NumInput value={cfg.init0} onChange={(v) => setCfg({ ...cfg, init0: v })} />
                </OptRow>
                <OptRow label={cfg.mode === "ai" ? "初期石(AI)" : "初期石(後手)"}>
                  <NumInput value={cfg.init1} onChange={(v) => setCfg({ ...cfg, init1: v })} />
                </OptRow>
                <OptRow label="石の所持上限">
                  <Seg options={[["0", "なし"], ["10", "10"], ["15", "15"], ["20", "20"]]} value={String(cfg.cap)} onChange={(v) => setCfg({ ...cfg, cap: Number(v) })} />
                </OptRow>
                <OptRow label="売却(コスト0)">
                  <Seg options={[["mat", "素材のみ"], ["all", "すべて"], ["off", "なし"]]} value={cfg.sell} onChange={(v) => setCfg({ ...cfg, sell: v })} />
                </OptRow>
                <OptRow label="初回引き直し">
                  <Seg options={[["1", "1回まで"], ["0", "なし"]]} value={String(cfg.mulligan)} onChange={(v) => setCfg({ ...cfg, mulligan: Number(v) })} />
                </OptRow>
                <OptRow label="AIの速さ">
                  <Seg options={[["normal", "ふつう"], ["fast", "はやい"]]} value={cfg.aispeed} onChange={(v) => setCfg({ ...cfg, aispeed: v })} />
                </OptRow>
                <OptRow label="2人対戦の盤の向き">
                  <Seg options={[["fixed", "固定"], ["turn", "手番側を手前"]]} value={cfg.flip} onChange={(v) => setCfg({ ...cfg, flip: v })} />
                </OptRow>
                <OptRow label="操作ガイド">
                  <Seg options={[["1", "ON"], ["0", "OFF"]]} value={cfg.guide ? "1" : "0"} onChange={(v) => setCfg({ ...cfg, guide: v === "1" })} />
                </OptRow>
                <OptRow label="ガチャ演出">
                  <Seg options={[["1", "ON"], ["0", "OFF"]]} value={cfg.fx ? "1" : "0"} onChange={(v) => setCfg({ ...cfg, fx: v === "1" })} />
                </OptRow>
                <OptRow label="効果音">
                  <Seg options={[["1", "ON"], ["0", "OFF"]]} value={cfg.snd ? "1" : "0"} onChange={(v) => setCfg({ ...cfg, snd: v === "1" })} />
                </OptRow>
                <OptRow label="BGM">
                  <Seg options={[["1", "ON"], ["0", "OFF"]]} value={cfg.bgm ? "1" : "0"} onChange={(v) => setCfg({ ...cfg, bgm: v === "1" })} />
                </OptRow>
                <OptRow label="待った">
                  <Seg options={[["1", "ON"], ["0", "OFF"]]} value={cfg.undo ? "1" : "0"} onChange={(v) => setCfg({ ...cfg, undo: v === "1" })} />
                </OptRow>
                <OptRow label="敵陣成り">
                  <Seg options={[["1", "あり"], ["0", "なし(合成のみ)"]]} value={cfg.enemyPromo ? "1" : "0"} onChange={(v) => setCfg({ ...cfg, enemyPromo: v === "1" })} />
                </OptRow>
                <OptRow label="二歩禁止">
                  <Seg options={[["1", "ON"], ["0", "OFF"]]} value={cfg.nifu ? "1" : "0"} onChange={(v) => setCfg({ ...cfg, nifu: v === "1" })} />
                </OptRow>
                <OptRow label="ピックアップ">
                  <Seg options={[["1", "ON"], ["0", "OFF"]]} value={cfg.pickup ? "1" : "0"} onChange={(v) => setCfg({ ...cfg, pickup: v === "1" })} />
                </OptRow>
                <OptRow label="ターン上限">
                  <Seg options={[["0", "なし"], ["50", "50"], ["100", "100"]]} value={String(cfg.limit)} onChange={(v) => setCfg({ ...cfg, limit: Number(v) })} />
                </OptRow>
                <button
                  onClick={() => setCfg({ ...cfg, spt: 1, init0: 2, init1: 2, cap: 0, sell: "mat", mulligan: 1, guide: true, fx: true, snd: true, bgm: true, undo: true, enemyPromo: true, nifu: true, pickup: true, limit: 0, flip: "fixed", aispeed: "normal" })}
                  className="w-full mt-1 py-1.5 rounded border border-slate-700 text-xs text-slate-400 hover:text-slate-200"
                >
                  標準設定に戻す
                </button>
              </div>
            )}
          </div>
          <button
            onClick={newGame}
            className="w-full mt-4 py-3.5 rounded-lg text-lg font-bold text-white active:scale-[.98] transition-transform"
            style={{ ...MINCHO, fontWeight: 800, background: "linear-gradient(160deg,#c9432f,#a52c1d)", letterSpacing: "0.3em", boxShadow: "0 6px 18px rgba(165,44,29,.35), inset 0 1px 0 rgba(255,255,255,.18)" }}
          >
            対局開始
          </button>
          <button
            onClick={startTutorial}
            className="w-full mt-2 py-2.5 rounded-lg text-sm font-bold"
            style={{ ...MINCHO, color: "#3a2a05", background: "linear-gradient(160deg,#f0cd7a,#d3a53c)", letterSpacing: "0.15em" }}
          >
            はじめての方へ — チュートリアル(約5分)
          </button>
          <button
            onClick={() => setHelp("rules")}
            className="w-full mt-2 py-2 rounded-lg text-sm text-slate-300 border border-slate-600 hover:bg-slate-800"
          >
            遊び方・駒の動きを見る
          </button>
          {help && <HelpModal tab={help} setTab={setHelp} onClose={() => setHelp(null)} />}
        </div>
      </div>
    );
  }

  const n = g.board.length;
  // 画面幅に収まるようマスサイズを自動調整(基準: 9×9=44px / 6×6=58px、下限26px)
  const baseCell = n === 9 ? 50 : 64;
  const cell = Math.max(26, Math.min(baseCell, Math.floor((vw - 74) / n)));
  // 盤の向き: 2人対戦で「手番側を手前」のとき、後手の番は盤を180度回して表示
  const viewer = cfg.mode === "pvp" && cfg.flip === "turn" ? (g.phase === "setup" ? g.sp : g.cur) : 0;
  const flipB = viewer === 1;
  const disp = (r, c) => (flipB ? [n - 1 - r, n - 1 - c] : [r, c]);
  const topSide = 1 - viewer, bottomSide = viewer;
  const isSetup = g.phase === "setup";
  const actor = isSetup ? g.sp : g.cur;
  const chk = !isSetup && !g.over && inCheck(g.board, g.cur);
  const highlights = sel && sel.dests ? sel.dests : [];
  const viewMode = sel && (sel.kind === "view" || sel.viewOnly);
  // 同時公開: セットアップ中は「見てはいけない側」の駒を隠す
  const hiddenOwner = isSetup ? (cfg.mode === "ai" ? 1 : 1 - g.sp) : -1;
  // 詰み時は敗者の王、対局中の王手は手番側の王を可視化(逃げ場×印は終局時のみ)
  const mv = g.over && g.over.winner >= 0 && g.over.reason === "詰み"
    ? mateInfo(g.board, 1 - g.over.winner)
    : chk
    ? mateInfo(g.board, g.cur)
    : null;
  const showEscapes = !!(g.over && mv);
  const humanSide = cfg.mode === "pvp" ? g.cur : 0;
  const shownTurn = isSetup
    ? null
    : !g.over && aiControls(g)
    ? { who: g.cur, round: g.round, acts: g.turnActs || [], live: true }
    : g.prevTurn && g.prevTurn.who !== humanSide
    ? g.prevTurn
    : null;
  const marks = turnMarks(shownTurn);
  const canFuseHere =
    sel && sel.kind === "sq" && !isSetup && !chk && !g.over && !aiControls(g) &&
    g.board[sel.r] && g.board[sel.r][sel.c] &&
    g.board[sel.r][sel.c].o === g.cur && !g.board[sel.r][sel.c].p && !g.board[sel.r][sel.c].sick &&
    FUSABLE.includes(g.board[sel.r][sel.c].t)
      ? g.board[sel.r][sel.c].t
      : null;
  const sellSel =
    cfg.sell !== "off" && !isSetup && !g.over && !aiControls(g) && sel &&
    ((sel.kind === "drop" && cfg.sell === "all" && g.pool[g.cur].place[sel.t] > 0) ||
      (sel.kind === "mat" && g.pool[g.cur].mat[sel.t] > 0))
      ? { t: sel.t, fromMat: sel.kind === "mat" }
      : null;

  return (
    <div
      className="min-h-screen w-full p-3 flex flex-col items-center"
      style={{ background: "linear-gradient(180deg,#151a26 0%,#1c2333 100%)", touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
    >
      <style>{FONT_CSS}</style>
      <div className="w-full max-w-3xl">
        {/* ヘッダー */}
        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
          <div style={{ ...MINCHO, fontWeight: 800 }} className="text-xl text-amber-100 tracking-widest">ガチャ将棋</div>
          <div className="flex items-center gap-1.5 text-xs flex-wrap justify-end">
            {g.pickup && (
              <button onClick={() => setShowRates(true)} className="px-2 py-1 rounded border border-amber-500/60 text-amber-300 bg-amber-500/10 hover:bg-amber-500/20">
                PU: <b style={MINCHO}>{NAMES[g.pickup]}</b> ×2
              </button>
            )}
            <span className="px-2 py-1 rounded border border-slate-600 text-slate-300">R{g.round}</span>
            <button onClick={() => setHelp("rules")} className="px-2.5 py-1.5 rounded border border-amber-600/60 text-amber-300 hover:bg-amber-900/30">遊び方</button>
            <button onClick={() => { if (g && !g.over) setConfirmExit(true); else goMenu(); }} className="px-2.5 py-1.5 rounded border border-slate-600 text-slate-400 hover:text-slate-200">設定へ</button>
          </div>
        </div>

        {/* 終局バナー(盤面は見える) */}
        {g.over && (
          <div className="mb-2 rounded-lg border border-amber-500/70 bg-amber-500/10 p-3 flex flex-wrap items-center gap-3">
            <div>
              <span style={MINCHO} className="text-xl font-bold text-amber-100 tracking-widest">
                {g.over.winner === -1 ? "引き分け" : `${pname(g.over.winner, cfg)}の勝ち`}
              </span>
              <span className="ml-2 text-sm text-slate-300">({g.over.reason})</span>
              {cfg.tut && <span className="ml-2 text-sm text-amber-300 font-bold">🎓 チュートリアル完了! 「本編へ」から本番の対局をどうぞ</span>}
            </div>
            {mv && (
              <div className="text-[11px] text-slate-300 leading-tight">
                <span className="inline-block w-3 h-3 rounded-sm align-middle mr-1" style={{ background: "rgba(200,30,30,.7)" }} />詰まされた王
                <span className="inline-block w-3 h-3 rounded-sm align-middle ml-3 mr-1" style={{ boxShadow: "inset 0 0 0 2px #e8862e" }} />王手をかけた駒
                <span className="inline-block w-3 h-3 rounded-sm align-middle ml-3 mr-1" style={{ background: "rgba(200,30,30,.25)" }} />利き筋
                <span className="ml-3 text-red-400 font-bold">×</span> 逃げ場(利きで封鎖)
              </div>
            )}
            <div className="flex-1" />
            <div className="flex gap-2">
              <button onClick={() => setShowResult(true)} className="px-4 py-1.5 rounded font-bold text-sm" style={{ ...MINCHO, color: "#3a2a05", background: "linear-gradient(160deg,#f0cd7a,#d3a53c)" }}>リザルト</button>
              <button onClick={cfg.tut ? startTutorial : newGame} className="px-4 py-1.5 rounded font-bold text-white text-sm" style={{ ...MINCHO, background: "linear-gradient(160deg,#c9432f,#a52c1d)" }}>{cfg.tut ? "もう一度" : "再戦"}</button>
              <button onClick={goMenu} className="px-4 py-1.5 rounded text-slate-200 border border-slate-500 text-sm" style={MINCHO}>{cfg.tut ? "本編へ" : "設定へ"}</button>
            </div>
          </div>
        )}

        {/* 上側(相手)のパネル */}
        <PlayerPanel
          g={g} cfg={cfg} me={topSide} actor={actor} isSetup={isSetup} chk={chk} hiddenOwner={hiddenOwner}
          sel={sel} clickPool={clickPool} gacha={gacha} setShowRates={setShowRates} fxMask={fxHidden} shownTurn={shownTurn}
          setupDraw={setupDraw} setupRedraw={setupRedraw} setupDone={setupDone} endTurn={endTurn} undo={undo} histLen={histRef.current.length}
          canFuseHere={canFuseHere} fuse={fuse} sellSel={sellSel} sell={sell}
          resign={() => setConfirmResign(topSide)}
        />

        {/* チュートリアルの台本吹き出し */}
        {cfg.tut && !g.over && tstep >= 1 && (
          <div className="mb-2 rounded-lg border border-amber-500/70 bg-amber-500/10 px-3 py-2 flex items-start gap-2">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-600 text-white font-bold mt-0.5 whitespace-nowrap">
              {tstep >= 12 ? "仕上げ" : `${tstep}/11`}
            </span>
            <span className="text-[13px] text-amber-100 leading-snug flex-1">{TUT_MSGS[Math.min(tstep, 12)]}</span>
            <button onClick={goMenu} className="text-[11px] px-2 py-0.5 rounded border border-slate-600 text-slate-400 whitespace-nowrap">スキップ</button>
          </div>
        )}

        {/* 操作ガイド(初心者向け・序盤のみ) */}
        {(() => {
          if (cfg.tut) return null;
          if (!cfg.guide || g.over) return null;
          const guideActive = isSetup || g.round <= 3;
          if (!guideActive) return null;
          let msg = null;
          if (aiControls(g)) {
            msg = isSetup ? "AIが配置を考えています…" : "AIが考えています…(相手の駒をタップすると利きが見える)";
          } else if (isSetup) {
            if (!g.drew[g.sp]) msg = "① まずは「初回3連ガチャ(無料)」を引こう";
            else {
              const pt = TYPES7.reduce((a, t) => a + g.pool[g.sp].place[t], 0);
              msg = pt > 0
                ? "② 下の駒台の駒をタップ → 緑に光った自陣マスに配置(温存もOK)。済んだら「配置完了」"
                : "③ 「配置完了」を押して次へ";
            }
          } else if (g.round <= 3 && !chk) {
            const pt = TYPES7.reduce((a, t) => a + g.pool[g.cur].place[t], 0);
            if (g.ap >= 0.5 && pt > 0) msg = "駒台の駒をタップ → 光ったマスに打てる(0.5)。盤上の駒をタップすれば移動(1.0)";
            else if (g.ap >= 0.5 && g.stones[g.cur] >= 2) msg = "石が貯まったらガチャ! 単発2石 / 3連5石 / プレミアム3石(歩なし)";
            else if (g.ap >= 1) msg = "自分の駒をタップ → 緑のマスへ移動。相手の駒をタップすると利きが見える";
          }
          if (!msg) {
            if (chk) msg = "王手! 赤く光る駒から王を守ろう(逃げる・取る・間に打つ)";
            else if (g.ap < 0.5) msg = "行動力を使い切ったので、まもなく相手の番";
            else msg = "何もしないなら「ターン終了」でパス(石を貯められる)";
          }
          return (
            <div className="mb-2 rounded border border-sky-700/60 bg-sky-900/30 px-3 py-1.5 text-[12px] leading-snug text-sky-200 text-center flex items-center justify-center" style={{ minHeight: 46 }}>
              {msg}
            </div>
          );
        })()}

        {/* 盤 */}
        <div className="my-2 flex justify-center">
          <div
            className="rounded-md relative"
            style={{
              padding: "18px 20px 12px 12px",
              background: `${WOOD_GRAIN}, linear-gradient(165deg,#c99f5e 0%,#b8874c 55%,#a3743c 100%)`,
              boxShadow: "0 12px 26px rgba(0,0,0,.55), 0 4px 0 #6e4b20, inset 0 1px 0 rgba(255,240,210,.4)",
            }}
          >
            {/* 符号(筋と段) */}
            {Array.from({ length: n }, (_, i) => (
              <span key={"f" + i} className="absolute text-center pointer-events-none select-none" style={{ left: 12 + i * cell, top: 3, width: cell, fontSize: 10, lineHeight: "12px", color: "#4a3112", fontWeight: 700, opacity: 0.8 }}>
                {flipB ? i + 1 : n - i}
              </span>
            ))}
            {Array.from({ length: n }, (_, i) => (
              <span key={"d" + i} className="absolute flex items-center justify-center pointer-events-none select-none" style={{ right: 3, top: 18 + i * cell, width: 15, height: cell, fontSize: 10, color: "#4a3112", fontWeight: 700, opacity: 0.8, ...MINCHO }}>
                {KANJI_NUM[flipB ? n - 1 - i : i]}
              </span>
            ))}
            {/* 手番の切り替わり */}
            {turnToast && (
              <div key={turnToast.id} className="absolute left-1/2 pointer-events-none" style={{ top: "44%", zIndex: 30, animation: "turnToast 1s ease both" }}>
                <div
                  className="px-5 py-2 rounded-full whitespace-nowrap"
                  style={{
                    ...MINCHO, fontWeight: 800, fontSize: 18, letterSpacing: "0.2em",
                    color: turnToast.mine ? "#fbe7b4" : "#c9d6f2",
                    background: "rgba(14,18,28,.86)",
                    border: `1px solid ${turnToast.mine ? "#e4b94f" : "#4a6fb5"}`,
                    boxShadow: "0 6px 20px rgba(0,0,0,.5)",
                  }}
                >
                  {turnToast.text}
                </div>
              </div>
            )}
            <div
              className="relative"
              style={{
                width: n * cell, height: n * cell,
                background: `${WOOD_GRAIN}, linear-gradient(150deg,#dcb26d 0%,#c89a55 100%)`,
                boxShadow: "inset 0 0 16px rgba(88,54,14,.5)",
              }}
            >
              {/* 漆の罫線と星 */}
              <svg className="absolute inset-0 pointer-events-none" width={n * cell} height={n * cell}>
                {Array.from({ length: n + 1 }, (_, i) => (
                  <React.Fragment key={i}>
                    <line x1={i * cell} y1={0} x2={i * cell} y2={n * cell} stroke="#412c0f" strokeWidth={i === 0 || i === n ? 2.5 : 1.1} opacity=".85" />
                    <line x1={0} y1={i * cell} x2={n * cell} y2={i * cell} stroke="#412c0f" strokeWidth={i === 0 || i === n ? 2.5 : 1.1} opacity=".85" />
                  </React.Fragment>
                ))}
                {(n === 9 ? [[3, 3], [3, 6], [6, 3], [6, 6]] : [[2, 2], [2, 4], [4, 2], [4, 4]]).map(([a, b]) => (
                  <circle key={a + "-" + b} cx={b * cell} cy={a * cell} r="3" fill="#412c0f" opacity=".9" />
                ))}
              </svg>
              <div
                className="grid absolute inset-0"
                style={{ gridTemplateColumns: `repeat(${n}, ${cell}px)`, gridTemplateRows: `repeat(${n}, ${cell}px)` }}
              >
              {Array.from({ length: n }, (_, dr) =>
                Array.from({ length: n }, (_, dc) => {
                  const [r, c] = disp(dr, dc);
                  const pcRaw = g.board[r][c];
                  const hidden = pcRaw && pcRaw.o === hiddenOwner && pcRaw.t !== "K";
                  const pc = hidden ? null : pcRaw;
                  const hl = highlights.some(([a, b]) => a === r && b === c);
                  const selHere = sel && (sel.kind === "sq" || sel.kind === "view") && sel.r === r && sel.c === c;
                  const lastHere = g.last && g.last[0] === r && g.last[1] === c;
                  const isMateKing = mv && mv.kp[0] === r && mv.kp[1] === c;
                  const isChecker = mv && mv.checkers.some(([a, b]) => a === r && b === c);
                  const isLine = mv && mv.lines.some(([a, b]) => a === r && b === c);
                  const isEscape = showEscapes && mv.escapes.some(([a, b]) => a === r && b === c);
                  const animHere = pc && g.anim && g.anim.tr === r && g.anim.tc === c ? g.anim : null;
                  const mark = marks[r + "," + c];
                  let adx = 0, ady = 0;
                  if (animHere && (animHere.k === "move" || animHere.k === "capture")) {
                    const [fr2, fc2] = disp(animHere.fr, animHere.fc);
                    adx = (fc2 - dc) * cell;
                    ady = (fr2 - dr) * cell;
                  }
                  return (
                    <div
                      key={r + "-" + c}
                      onClick={() => clickCell(r, c)}
                      className="relative flex items-center justify-center cursor-pointer"
                      style={{
                        background: isMateKing
                          ? "rgba(200,30,30,.55)"
                          : isLine
                          ? "rgba(200,30,30,.25)"
                          : selHere
                          ? viewMode ? "rgba(74,111,181,.4)" : "rgba(201,67,47,.35)"
                          : lastHere && !(mark && mark.to) ? "rgba(228,185,79,.28)" : "transparent",
                        boxShadow: isChecker ? "inset 0 0 0 2px #e8862e" : "none",
                        zIndex: animHere ? 5 : undefined,
                      }}
                    >
                      {mark && mark.to && <div className="absolute inset-0 pointer-events-none" style={{ background: SIDE_TINT[shownTurn.who] }} />}
                      {mark && mark.from && (
                        <div className="absolute pointer-events-none rounded-sm" style={{ inset: 3, border: `2px dashed ${SIDE_COLOR[shownTurn.who]}`, opacity: 0.85 }} />
                      )}
                      {isChecker && <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: "inset 0 0 0 2.5px #e8862e" }} />}
                      {hl && (
                        <div
                          className="absolute inset-0"
                          style={{
                            background: viewMode
                              ? "rgba(74,111,181,.45)"
                              : pc ? "rgba(201,67,47,.45)" : "rgba(46,120,70,.4)",
                          }}
                        />
                      )}
                      {hl && !pc && !viewMode && <div className="absolute w-2.5 h-2.5 rounded-full" style={{ background: "#2e7846" }} />}
                      {hl && !pc && viewMode && <div className="absolute w-2.5 h-2.5 rounded-full" style={{ background: "#4a6fb5" }} />}
                      {hidden && (
                        <div className="w-3/4 h-3/4 rounded flex items-center justify-center text-slate-500 text-lg" style={{ background: "rgba(0,0,0,.25)", border: "1px dashed #55606f" }}>?</div>
                      )}
                      {pc && <AnimKoma pc={pc} cell={cell} flipped={pc.o !== viewer} anim={animHere} dx={adx} dy={ady} />}
                      {animHere && animHere.k === "capture" && <CaptureSparks id={animHere.id} />}
                      {animHere && animHere.k === "fuse" && (
                        <div key={animHere.id} className="absolute pointer-events-none rounded-full" style={{ inset: 2, boxShadow: "0 0 0 2px #f0cd7a, 0 0 18px 6px rgba(240,205,122,.7)", animation: "fuseRing .6s ease-out both" }} />
                      )}
                      {mark && mark.nums.length > 0 && (
                        <span
                          className="absolute rounded-full font-bold text-white flex items-center justify-center pointer-events-none"
                          style={{ left: 1, top: 1, minWidth: 15, height: 15, padding: "0 3px", fontSize: 10, background: SIDE_COLOR[shownTurn.who], boxShadow: "0 1px 2px rgba(0,0,0,.5)", zIndex: 7 }}
                        >
                          {mark.nums.join("・")}
                        </span>
                      )}
                      {pc && pc.sick && (
                        <span className="absolute top-0 right-0 text-[9px] px-0.5 rounded-bl bg-sky-700 text-white leading-tight">新</span>
                      )}
                      {isEscape && <span className="absolute text-red-500 font-bold pointer-events-none" style={{ fontSize: cell * 0.6, textShadow: "0 0 3px #000" }}>×</span>}
                    </div>
                  );
                })
              )}
              </div>
            </div>
          </div>
        </div>

        {/* 下側(手前)のパネル */}
        <PlayerPanel
          g={g} cfg={cfg} me={bottomSide} actor={actor} isSetup={isSetup} chk={chk} hiddenOwner={hiddenOwner}
          sel={sel} clickPool={clickPool} gacha={gacha} setShowRates={setShowRates} fxMask={fxHidden} shownTurn={shownTurn}
          setupDraw={setupDraw} setupRedraw={setupRedraw} setupDone={setupDone} endTurn={endTurn} undo={undo} histLen={histRef.current.length}
          canFuseHere={canFuseHere} fuse={fuse} sellSel={sellSel} sell={sell}
          resign={() => setConfirmResign(bottomSide)}
        />

        {/* 記録(最新1行。タップで展開) */}
        <div className="mt-3 rounded border border-slate-700 bg-slate-900/60 text-xs text-slate-400">
          <button onClick={() => setLogOpen(!logOpen)} className="w-full flex items-center gap-2 px-2.5 py-2 text-left" aria-expanded={logOpen}>
            <span className="text-slate-500 shrink-0">{logOpen ? "▾" : "▸"} 記録</span>
            {!logOpen && <span className="text-slate-200 truncate">{g.log[0]}</span>}
          </button>
          {logOpen && (
            <div className="px-2.5 pb-2 max-h-44 overflow-y-auto leading-relaxed">
              {g.log.map((m, i) => (
                <div key={i} className={i === 0 ? "text-slate-200" : ""}>・{m}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ガチャ演出オーバーレイ */}
      {fx && (
        <div className="fixed inset-x-0 top-24 z-40 flex justify-center pointer-events-none">
          <div
            className="rounded-xl border px-6 py-3 flex flex-col items-center gap-2"
            style={{
              background: fx.items.some((i) => i.rare)
                ? "radial-gradient(ellipse at 50% 60%, rgba(228,185,79,.28) 0%, rgba(14,18,28,.95) 70%)"
                : "rgba(14,18,28,.93)",
              borderColor: fx.items.some((i) => i.rare) ? "#e4b94f" : "#3a4356",
              boxShadow: fx.items.some((i) => i.rare) ? "0 10px 34px rgba(0,0,0,.65), 0 0 30px rgba(228,185,79,.25)" : "0 10px 34px rgba(0,0,0,.65)",
            }}
          >
            <div style={MINCHO} className="text-sm text-amber-100 tracking-widest">{fx.kind}</div>
            <div className="flex gap-3">
              {fx.items.map((it, i) => (
                <FxKoma key={fx.key + "-" + i} item={it} />
              ))}
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes koAppear { from { opacity: 0; transform: translateY(-16px) scale(.8); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes koFlip { from { transform: rotateY(0deg); } to { transform: rotateY(180deg); } }
        @keyframes koGlow { 0% { opacity: 0; transform: scale(.6); } 55% { opacity: 1; transform: scale(1.05); } 100% { opacity: .35; transform: scale(1); } }
        @keyframes koBurst { 0% { opacity: .9; transform: scale(.45); } 100% { opacity: 0; transform: scale(2); } }
        @keyframes checkPop { 0% { opacity: 0; transform: scale(.5); } 14% { opacity: 1; transform: scale(1.18); } 28% { transform: scale(1); } 75% { opacity: 1; } 100% { opacity: 0; transform: scale(1.04); } }
        @keyframes checkEdge { 0% { opacity: 0; } 20% { opacity: 1; } 100% { opacity: 0; } }
        @keyframes komaSlide { from { transform: translate(var(--dx), var(--dy)) scale(1.06); } to { transform: translate(0, 0) scale(1); } }
        @keyframes komaDrop { 0% { opacity: .2; transform: translateY(-14px) scale(1.25); } 70% { opacity: 1; transform: translateY(1px) scale(.97); } 100% { transform: translateY(0) scale(1); } }
        @keyframes komaPromote { 0% { transform: scale(1); filter: brightness(1); } 35% { transform: scale(1.18) rotateY(180deg); filter: brightness(1.6); } 100% { transform: scale(1) rotateY(360deg); filter: brightness(1); } }
        @keyframes fuseRing { 0% { opacity: 0; transform: scale(.5); } 30% { opacity: 1; } 100% { opacity: 0; transform: scale(1.5); } }
        @keyframes capSpark { 0% { opacity: 1; transform: rotate(var(--ang)) translateX(0); } 100% { opacity: 0; transform: rotate(var(--ang)) translateX(22px); } }
        @keyframes turnToast { 0% { opacity: 0; transform: translate(-50%, 8px) scale(.94); } 18% { opacity: 1; transform: translate(-50%, 0) scale(1); } 78% { opacity: 1; } 100% { opacity: 0; transform: translate(-50%, -6px); } }
        @keyframes koShine { from { background-position: 130% 0; } to { background-position: -30% 0; } }
        @media (prefers-reduced-motion: reduce) { * { animation-duration: .01ms !important; animation-delay: 0s !important; } }
      `}</style>

      {/* 王手演出 */}
      {checkFx > 0 && (
        <div key={"edge" + checkFx} className="fixed inset-0 z-30 pointer-events-none" style={{ boxShadow: "inset 0 0 110px 24px rgba(220,40,20,.5)", animation: "checkEdge 1.05s ease both" }} />
      )}
      {checkFx > 0 && (
        <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
          <div
            key={checkFx}
            style={{
              ...MINCHO,
              animation: "checkPop 1.05s ease both",
              color: "#ff6a55",
              textShadow: "0 0 18px rgba(200,40,20,.8), 0 2px 4px rgba(0,0,0,.9)",
              letterSpacing: "0.25em",
            }}
            className="text-7xl font-bold"
          >
            王手
          </div>
        </div>
      )}

      {/* 投了の確認 */}
      {confirmResign != null && (
        <Modal onClose={() => setConfirmResign(null)}>
          <div style={MINCHO} className="text-xl text-amber-100 mb-2 text-center">投了しますか?</div>
          <div className="text-sm text-slate-300 mb-4 text-center">{pname(confirmResign, cfg)}の負けとして対局が終了します。<br />この操作は元に戻せません。</div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                const loser = confirmResign;
                setConfirmResign(null);
                setSel(null); setPend(null);
                setG((g0) => (g0 && !g0.over ? { ...g0, over: { winner: 1 - loser, reason: "投了" }, log: addLog(g0.log, `${pname(loser, cfg)}が投了。`) } : g0));
              }}
              className="px-6 py-2 rounded font-bold text-white"
              style={{ ...MINCHO, background: "linear-gradient(160deg,#c9432f,#a52c1d)" }}
            >
              はい(投了する)
            </button>
            <button
              onClick={() => setConfirmResign(null)}
              className="px-6 py-2 rounded font-bold text-slate-100 border border-slate-500"
              style={MINCHO}
            >
              いいえ
            </button>
          </div>
        </Modal>
      )}

      {/* 対局中断の確認 */}
      {confirmExit && (
        <Modal onClose={() => setConfirmExit(false)}>
          <div style={MINCHO} className="text-xl text-amber-100 mb-2 text-center">対局を中断しますか?</div>
          <div className="text-sm text-slate-300 mb-4 text-center">設定画面に戻ると、進行中の対局は<span className="text-red-400 font-bold">破棄</span>されます。<br />この操作は元に戻せません。</div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => { setConfirmExit(false); setSel(null); setPend(null); goMenu(); }}
              className="px-6 py-2 rounded font-bold text-white"
              style={{ ...MINCHO, background: "linear-gradient(160deg,#c9432f,#a52c1d)" }}
            >
              はい(中断する)
            </button>
            <button
              onClick={() => setConfirmExit(false)}
              className="px-6 py-2 rounded font-bold text-slate-100 border border-slate-500"
              style={MINCHO}
            >
              いいえ
            </button>
          </div>
        </Modal>
      )}

      {/* リザルト */}
      {showResult && g.over && (
        <ResultModal g={g} cfg={cfg} onClose={() => setShowResult(false)} onRematch={cfg.tut ? startTutorial : newGame} />
      )}

      {/* チュートリアル導入 */}
      {cfg.tut && tstep === 0 && (
        <Modal>
          <div style={MINCHO} className="text-2xl text-amber-100 mb-2 text-center tracking-widest">チュートリアル</div>
          <div className="text-sm text-slate-300 mb-4 leading-relaxed">
            小さな6×6の盤で、ガチャ将棋のひと通りを体験します。<br />
            ゴールは<b className="text-amber-200">相手の王を詰ませること</b>。<br />
            画面上部の指示に沿って進めてください(約5分)。
          </div>
          <button
            onClick={() => setTstep(1)}
            className="w-full py-2.5 rounded font-bold text-white"
            style={{ ...MINCHO, background: "linear-gradient(160deg,#c9432f,#a52c1d)", letterSpacing: "0.2em" }}
          >
            はじめる
          </button>
        </Modal>
      )}

      {/* 遊び方・駒の動き */}
      {help && <HelpModal tab={help} setTab={setHelp} onClose={() => setHelp(null)} />}

      {/* 交代モーダル(2人対戦の同時配置) */}
      {handoff && (
        <Modal>
          <div style={MINCHO} className="text-xl text-amber-100 mb-2 text-center">後手に交代</div>
          <div className="text-sm text-slate-300 mb-4 text-center">先手の配置は非公開になりました。<br />後手のプレイヤーに端末を渡してください。</div>
          <button onClick={() => setHandoff(false)} className="w-full py-2 rounded font-bold text-white" style={{ ...MINCHO, background: "linear-gradient(160deg,#c9432f,#a52c1d)" }}>後手の配置を始める</button>
        </Modal>
      )}

      {/* 成りモーダル */}
      {pend && (
        <Modal>
          <div style={MINCHO} className="text-xl text-amber-100 mb-4 text-center">成りますか?</div>
          <div className="flex gap-3 justify-center">
            <button onClick={() => applyMove(pend.fr, pend.fc, pend.tr, pend.tc, true)} className="px-6 py-3 rounded font-bold text-white" style={{ ...MINCHO, background: "#a5231b" }}>成る</button>
            <button onClick={() => applyMove(pend.fr, pend.fc, pend.tr, pend.tc, false)} className="px-6 py-3 rounded font-bold text-slate-100 border border-slate-500" style={MINCHO}>不成</button>
          </div>
        </Modal>
      )}

      {/* 排出率モーダル */}
      {showRates && (
        <Modal onClose={() => setShowRates(false)}>
          <div style={MINCHO} className="text-lg text-amber-100 mb-1">{cfg.sell !== "off" ? "排出率と売却額" : "排出率"}</div>
          {g.pickup && (
            <div className="text-xs text-amber-300 mb-2">
              ピックアップ中: <b style={MINCHO}>{NAMES[g.pickup]}</b> ×2(3ラウンドごとに切替)
            </div>
          )}
          {(() => {
            const nEff = effRates(NORMAL_RATES, g.pickup);
            const pEff = effRates(PREMIUM_RATES, g.pickup);
            return (
              <table className="text-sm text-slate-200 w-full">
                <thead>
                  <tr className="text-slate-400 text-xs">
                    <th className="text-left pb-1">駒</th>
                    <th className="text-right pb-1">ノーマル</th>
                    <th className="text-right pb-1">プレミアム</th>
                    {cfg.sell !== "off" && <th className="text-right pb-1">売却</th>}
                  </tr>
                </thead>
                <tbody>
                  {["P", "L", "N", "S", "G", "B", "R"].map((t) => (
                    <tr key={t} className={g.pickup === t ? "text-amber-300 font-bold" : ""}>
                      <td style={MINCHO}>{NAMES[t]}{g.pickup === t ? " ★" : ""}</td>
                      <td className="text-right">{nEff[t].toFixed(1)}%</td>
                      <td className="text-right">{pEff[t] != null ? pEff[t].toFixed(1) + "%" : "—"}</td>
                      {cfg.sell !== "off" && <td className="text-right">{SELL[t]}石</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          })()}
          <div className="text-[11px] text-slate-500 mt-2">
            {g.pickup
              ? "ピックアップ(★)適用後の実効値。PUはノーマル・プレミアム両方に効きます。"
              : "実効値(重みを正規化した実際の確率)。"}
          </div>
          <button onClick={() => setShowRates(false)} className="mt-3 w-full py-2 rounded border border-slate-600 text-slate-300">閉じる</button>
        </Modal>
      )}
    </div>
  );
}

/* ================= 相手の手の表示 ================= */
const SIDE_COLOR = ["#c9432f", "#4a6fb5"];
const SIDE_TINT = ["rgba(201,67,47,.24)", "rgba(74,111,181,.30)"];
/* 行動の一覧を、盤に影響する行動には通し番号を付けて文章にする */
function describeActs(acts, n) {
  let num = 0;
  return acts.map((a) => {
    if (a.k === "gacha") return { num: null, text: `ガチャ(${a.kind.replace("ノーマル", "")})で ${a.res.map((t) => NAMES[t]).join("・")} を引いた` };
    if (a.k === "sell") return { num: null, text: `取った${NAMES[a.t]}を売って +${a.gain}石` };
    num += 1;
    if (a.k === "drop") return { num, text: `${NAMES[a.t]}を ${sqName(n, a.tr, a.tc)} に打った` };
    if (a.k === "fuse") return { num, text: `${sqName(n, a.tr, a.tc)}の${KANJI[a.t]}を合成して「${PROM_KANJI[a.t]}」に成った` };
    const name = a.wasP ? PROM_KANJI[a.t] : KANJI[a.t];
    let text = `${name}を ${sqName(n, a.fr, a.fc)} → ${sqName(n, a.tr, a.tc)} へ動かした`;
    if (a.promo) text += `(「${PROM_KANJI[a.t]}」に成った)`;
    if (a.cap) text += `。${a.capP ? PROM_KANJI[a.cap] : NAMES[a.cap]}を取った`;
    return { num, text };
  });
}
/* 盤に付ける印: 行き先に番号、動かした元に点線 */
function turnMarks(turn) {
  const marks = {};
  if (!turn) return marks;
  let num = 0;
  const get = (r, c) => (marks[r + "," + c] = marks[r + "," + c] || { nums: [], from: false, to: false });
  for (const a of turn.acts) {
    if (a.k !== "move" && a.k !== "drop" && a.k !== "fuse") continue;
    num += 1;
    const m = get(a.tr, a.tc);
    m.nums.push(num);
    m.to = true;
    if (a.k === "move") get(a.fr, a.fc).from = true;
  }
  return marks;
}
function TurnSummary({ turn, n, me, cfg }) {
  const items = describeActs(turn.acts, n);
  const color = SIDE_COLOR[me];
  return (
    <div className="mt-2 rounded-md px-2.5 py-2" style={{ background: "rgba(255,255,255,.04)", border: `1px solid ${color}88` }}>
      <div className="text-[11px] mb-1 flex items-center gap-1.5" style={{ color }}>
        <span className="font-bold">{turn.live ? "いまの手" : "直前の手"}</span>
        <span className="text-slate-500">— {pname(me, cfg)} / R{turn.round}</span>
      </div>
      {items.length ? (
        <ol className="space-y-1">
          {items.map((it, i) => (
            <li key={i} className="flex items-start gap-1.5 text-[12.5px] leading-snug text-slate-100">
              {it.num != null ? (
                <span className="shrink-0 rounded-full text-[10px] font-bold text-white flex items-center justify-center" style={{ width: 17, height: 17, marginTop: 1, background: color }}>{it.num}</span>
              ) : (
                <span className="shrink-0 flex items-center justify-center" style={{ width: 17, height: 17, marginTop: 1 }}>
                  <span className="inline-block w-2 h-2 rotate-45" style={{ background: "linear-gradient(160deg,#f0cd7a,#c9992e)" }} />
                </span>
              )}
              <span>{it.text}</span>
            </li>
          ))}
        </ol>
      ) : (
        <div className="text-[12.5px] text-slate-400">{turn.live ? "考えています…" : "何もせずターン終了(パス)"}</div>
      )}
    </div>
  );
}

/* ================= パネル ================= */
function PlayerPanel({ g, cfg, me, actor, isSetup, chk, hiddenOwner, sel, clickPool, gacha, setShowRates, setupDraw, setupRedraw, setupDone, endTurn, undo, histLen, canFuseHere, fuse, sellSel, sell, resign, fxMask, shownTurn }) {
  // ガチャ演出中: めくれるまで新しい駒をプール表示から隠す
  const maskOf = (t) => (fxMask && fxMask.who === me && fxMask.counts[t]) || 0;
  const shownPlace = (t) => Math.max(0, pool.place[t] - maskOf(t));
  const active = actor === me && !g.over;
  const isAI = cfg.mode === "ai" && me === 1;
  const pool = g.pool[me];
  const name = pname(me, cfg);
  const accent = me === 0 ? "#c9432f" : "#4a6fb5";
  const apDots = active && !isSetup ? g.ap : null;
  const hiddenPool = isSetup && me === hiddenOwner; // 同時配置中は相手プールも非公開

  return (
    <div
      className="rounded-lg border p-2"
      style={{
        borderColor: active ? accent : "#2c3446",
        background: active ? "rgba(255,255,255,.04)" : "rgba(0,0,0,.15)",
        boxShadow: active ? `0 0 0 1px ${accent}` : "none",
      }}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span style={{ ...MINCHO, color: active ? "#fff" : "#8b93a5" }} className="font-bold">{name}</span>
        {active && (
          <span className="text-[10px] px-1.5 py-0.5 rounded text-white" style={{ background: accent }}>
            {isSetup ? "配置中" : isAI ? "思考中…" : "手番"}
          </span>
        )}
        {active && chk && !isSetup && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-700 text-white font-bold animate-pulse">王手!</span>}
        <span className="text-sm text-amber-300 flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rotate-45" style={{ background: "linear-gradient(160deg,#f0cd7a,#c9992e)" }} />
          {g.stones[me]}石{cfg.cap > 0 ? <span className="text-slate-500 text-xs">/{cfg.cap}</span> : null}
        </span>
        {apDots != null && (
          <span className="text-xs text-slate-300 flex items-center gap-1">
            行動力
            <span className="flex gap-0.5">
              {[0, 1].map((i) => (
                <span key={i} className="inline-block w-4 h-2 rounded-sm" style={{ background: apDots >= (i + 1) * 0.5 ? "#e4b94f" : "#3a4256" }} />
              ))}
            </span>
            {apDots.toFixed(1)}
          </span>
        )}
        <div className="flex-1" />
        {active && !isAI && cfg.undo && histLen > 0 && (
          <button onClick={undo} className="text-xs px-3 py-2 rounded border border-slate-600 text-slate-300 hover:bg-slate-700">待った</button>
        )}
        {active && !isSetup && !isAI && (
          <>
            <button onClick={endTurn} disabled={chk} className={`text-xs px-3 py-2 rounded border font-bold ${chk ? "border-slate-700 text-slate-600" : "border-amber-500/70 text-amber-200 bg-amber-500/10 hover:bg-amber-500/20"}`}>
              ターン終了
            </button>
            <button onClick={resign} className="text-xs px-3 py-2 rounded border border-slate-700 text-slate-500 hover:text-red-400">投了</button>
          </>
        )}
      </div>

      {/* この人の直前の手(相手の手を追いやすくする) */}
      {shownTurn && shownTurn.who === me && <TurnSummary turn={shownTurn} n={g.board.length} me={me} cfg={cfg} />}

      {/* 持ち駒(駒台) */}
      {hiddenPool ? (
        <div className="mt-2 text-xs text-slate-500">配置フェーズ中は非公開</div>
      ) : (
        <div
          style={{
            marginTop: 8, borderRadius: 6, padding: "4px 8px",
            display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px 4px",
            minHeight: TYPES7.some((t) => pool.place[t] > 0 || pool.mat[t] > 0) ? 58 : 34,
            background: `${WOOD_GRAIN}, linear-gradient(160deg,#b98d52 0%,#9c723f 100%)`,
            boxShadow: "inset 0 1px 0 rgba(255,236,200,.35), inset 0 -3px 6px rgba(60,35,10,.35), 0 2px 4px rgba(0,0,0,.35)",
          }}
        >
          {TYPES7.filter((t) => shownPlace(t) > 0).map((t) => (
            <PoolChip
              key={t} t={t} count={shownPlace(t)}
              active={sel && (sel.kind === "drop" || sel.kind === "setup") && sel.t === t && active}
              disabled={!active || isAI || g.over}
              onClick={() => clickPool(t, isSetup, false)}
            />
          ))}
          {TYPES7.every((t) => shownPlace(t) === 0) && (
            <span style={{ color: "#4a3112", fontSize: 12, padding: "0 4px" }}>{fxMask && fxMask.who === me ? "抽選中…" : "持ち駒なし"}</span>
          )}
          {TYPES7.some((t) => pool.mat[t] > 0) && (
            <span style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "4px 4px", alignSelf: "stretch" }}>
              <span style={{ display: "block", alignSelf: "stretch", width: 1, margin: "0 4px", background: "rgba(60,35,10,.45)" }} />
              <span style={{ color: "#3b260c", fontSize: 10, lineHeight: 1.1, padding: "0 2px", writingMode: "vertical-rl", WebkitWritingMode: "vertical-rl" }}>素材</span>
              {TYPES7.filter((t) => pool.mat[t] > 0).map((t) => (
                <PoolChip
                  key={"m" + t} t={t} count={pool.mat[t]} mat
                  active={sel && sel.kind === "mat" && sel.t === t && active}
                  disabled={!active || isAI || g.over || cfg.sell === "off" || isSetup}
                  onClick={() => clickPool(t, isSetup, true)}
                />
              ))}
            </span>
          )}
        </div>
      )}

      {/* アクション行 */}
      {active && !g.over && !isAI && (
        <div className="mt-2 flex flex-wrap gap-1.5 items-center">
          {isSetup ? (
            <>
              {!g.drew[me] ? (
                <button onClick={setupDraw} className="px-3 py-1.5 rounded text-sm font-bold text-white" style={{ ...MINCHO, background: "linear-gradient(160deg,#c9432f,#a52c1d)" }}>
                  初回3連ガチャ(無料)
                </button>
              ) : (
                <>
                  <span className="text-xs text-slate-400">駒を選んで自陣に配置(温存も可)</span>
                  {cfg.mulligan > 0 && !g.mull[me] && ownPlacedCount(g.board, me) === 0 && (
                    <button onClick={setupRedraw} className="px-3 py-1.5 rounded text-sm font-bold text-white" style={{ ...MINCHO, background: "linear-gradient(160deg,#8a5fb8,#6a4394)" }}>
                      引き直す(1回まで)
                    </button>
                  )}
                  <button onClick={setupDone} className="px-3 py-1.5 rounded text-sm font-bold text-white" style={{ background: "#2e7846" }}>配置完了</button>
                </>
              )}
            </>
          ) : (
            <>
              <GBtn onClick={() => gacha("n1")} disabled={g.ap < 0.5 || g.stones[me] < 2} label="単発" sub="2石" />
              <GBtn onClick={() => gacha("n3")} disabled={g.ap < 0.5 || g.stones[me] < 5} label="3連" sub="5石" />
              <GBtn onClick={() => gacha("pr")} disabled={g.ap < 0.5 || g.stones[me] < 3} label="プレミアム" sub="3石・歩なし" gold />
              {g.pickup ? (
                <button
                  onClick={() => setShowRates(true)}
                  className="text-[11px] px-2 py-1 rounded border border-amber-500/60 text-amber-300 bg-amber-500/10 hover:bg-amber-500/20"
                >
                  PU: <b style={MINCHO}>{NAMES[g.pickup]}</b> ×2 中(排出率)
                </button>
              ) : (
                <button onClick={() => setShowRates(true)} className="text-[11px] px-2 py-1 rounded border border-slate-700 text-slate-500 hover:text-slate-300">排出率</button>
              )}
              {sellSel && (
                <button
                  onClick={() => sell(sellSel.t, sellSel.fromMat)}
                  className="text-[11px] px-2 py-1 rounded border border-teal-500 text-teal-300 hover:bg-teal-900/40"
                >
                  <span style={MINCHO}>{NAMES[sellSel.t]}</span>{sellSel.fromMat ? "(素材)" : ""}を売却 +{SELL[sellSel.t]}石
                </button>
              )}
              {canFuseHere && (
                <span className="flex items-center gap-1.5 ml-1 pl-2 border-l border-slate-700">
                  <span className="text-[11px] text-slate-400" style={MINCHO}>{KANJI[canFuseHere]}を合成→{PROM_KANJI[canFuseHere]}:</span>
                  <button
                    onClick={() => fuse(sel.r, sel.c, true)}
                    disabled={g.pool[me].mat[canFuseHere] <= 0}
                    className={`text-[11px] px-2 py-1 rounded border ${g.pool[me].mat[canFuseHere] > 0 ? "border-emerald-500 text-emerald-300 hover:bg-emerald-900/40" : "border-slate-700 text-slate-600"}`}
                  >
                    素材で(0)
                  </button>
                  <button
                    onClick={() => fuse(sel.r, sel.c, false)}
                    disabled={g.pool[me].place[canFuseHere] <= 0 || g.ap < 0.5}
                    className={`text-[11px] px-2 py-1 rounded border ${g.pool[me].place[canFuseHere] > 0 && g.ap >= 0.5 ? "border-amber-500 text-amber-300 hover:bg-amber-900/40" : "border-slate-700 text-slate-600"}`}
                  >
                    ガチャ駒で(0.5)
                  </button>
                </span>
              )}
            </>
          )}
        </div>
      )}
      {active && chk && !isSetup && !isAI && (
        <div className="mt-1 text-[11px] text-red-400">王手を受けています。逃げる・取る・合駒を打つ、またはガチャ(売却で資金化も可)で凌いでください。</div>
      )}
    </div>
  );
}

function GBtn({ onClick, disabled, label, sub, gold }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1.5 rounded-md text-xs font-bold active:scale-95 transition-transform ${disabled ? "opacity-40" : ""}`}
      style={{
        ...MINCHO,
        minHeight: 42,
        color: gold ? "#3a2a05" : "#fff",
        background: gold
          ? "linear-gradient(160deg,#f0cd7a,#d3a53c)"
          : "linear-gradient(160deg,#c9432f,#a52c1d)",
        boxShadow: disabled ? "none" : "inset 0 1px 0 rgba(255,255,255,.2), 0 2px 6px rgba(0,0,0,.3)",
      }}
    >
      {label}
      <span className="block text-[9px] font-normal opacity-90">{sub}</span>
    </button>
  );
}

function Modal({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="rounded-lg border border-slate-600 bg-slate-900 p-5 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function OptRow({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-slate-400">{label}</span>
      {children}
    </div>
  );
}

function Seg({ options, value, onChange }) {
  return (
    <div className="flex rounded overflow-hidden border border-slate-600">
      {options.map(([v, label]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`px-2.5 py-1 text-xs ${value === v ? "bg-amber-600 text-white font-bold" : "bg-slate-800 text-slate-400"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function NumInput({ value, onChange }) {
  return (
    <div className="flex items-center gap-1">
      <button onClick={() => onChange(Math.max(0, value - 1))} className="w-7 h-7 rounded border border-slate-600 text-slate-300">−</button>
      <span className="w-8 text-center text-amber-300 font-bold">{value}</span>
      <button onClick={() => onChange(Math.min(20, value + 1))} className="w-7 h-7 rounded border border-slate-600 text-slate-300">＋</button>
    </div>
  );
}

/* ================= 駒の動き図 ================= */
const DIAG4 = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const ORTH4 = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const GOLD6 = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0]];
const MOVE_CHART = [
  { k: "歩", steps: [[-1, 0]], note: "前に1マス" },
  { k: "香", slides: [[-1, 0]], note: "前に何マスでも" },
  { k: "桂", steps: [[-2, -1], [-2, 1]], note: "前2横1に跳ぶ(飛び越えOK)" },
  { k: "銀", steps: [[-1, -1], [-1, 0], [-1, 1], [1, -1], [1, 1]], note: "前3方向と斜め後ろ" },
  { k: "金", steps: GOLD6, note: "斜め後ろ以外の6方向" },
  { k: "角", slides: DIAG4, note: "斜めに何マスでも" },
  { k: "飛", slides: ORTH4, note: "縦横に何マスでも" },
  { k: "王", steps: [...DIAG4, ...ORTH4], note: "全方向に1マス" },
  { k: "と", steps: GOLD6, red: true, note: "杏・圭・全も同じ。金と同じ動き" },
  { k: "馬", slides: DIAG4, steps: ORTH4, red: true, note: "角+縦横1マス" },
  { k: "龍", slides: ORTH4, steps: DIAG4, red: true, note: "飛+斜め1マス" },
];

function MoveDiagram({ k, steps = [], slides = [], red }) {
  const cell = 24, size = cell * 5, cx = size / 2, cy = size / 2;
  const arrows = slides.map(([dr, dc], i) => {
    const len = Math.sqrt(dr * dr + dc * dc);
    const nx = dc / len, ny = dr / len;
    const bx = cx + nx * 46, by = cy + ny * 46;
    const tx = cx + nx * 56, ty = cy + ny * 56;
    const px = -ny * 5, py = nx * 5;
    return (
      <g key={i}>
        <line x1={cx + nx * 15} y1={cy + ny * 15} x2={bx} y2={by} stroke="#2e7846" strokeWidth="2.5" />
        <polygon points={`${tx},${ty} ${bx + px},${by + py} ${bx - px},${by - py}`} fill="#2e7846" />
      </g>
    );
  });
  return (
    <svg width={size} height={size} className="rounded-sm" style={{ background: "#d9b877" }}>
      {Array.from({ length: 6 }, (_, i) => (
        <g key={i} stroke="#6d4a22" strokeWidth={i === 0 || i === 5 ? 1.6 : 0.7} opacity=".8">
          <line x1={i * cell} y1={0} x2={i * cell} y2={size} />
          <line x1={0} y1={i * cell} x2={size} y2={i * cell} />
        </g>
      ))}
      {steps.map(([dr, dc], i) => (
        <circle key={i} cx={cx + dc * cell} cy={cy + dr * cell} r="5.5" fill="#2e7846" />
      ))}
      {arrows}
      <polygon
        points={`${cx},${cy - 10.5} ${cx + 8.4},${cy - 6} ${cx + 7},${cy + 10.5} ${cx - 7},${cy + 10.5} ${cx - 8.4},${cy - 6}`}
        fill="#f0dcae" stroke="#8a6432" strokeWidth=".7"
      />
      <text x={cx} y={cy + 7.5} textAnchor="middle" fontSize="12.5" fontWeight="700" fill={red ? "#9e1f16" : "#241708"} style={MINCHO}>{k}</text>
    </svg>
  );
}

/* ================= リザルト画面 ================= */
function StatRow({ label, v0, v1, hl }) {
  return (
    <tr className={hl ? "text-amber-300" : "text-slate-200"}>
      <td className="py-1 text-slate-400 text-xs">{label}</td>
      <td className="py-1 text-right font-bold">{v0}</td>
      <td className="py-1 text-right font-bold">{v1}</td>
    </tr>
  );
}

function ResultModal({ g, cfg, onClose, onRematch }) {
  const s = g.stats;
  const rare = (i) => s[i].drawn.B + s[i].drawn.R;
  const drawnList = (i) =>
    TYPES7.filter((t) => s[i].drawn[t] > 0)
      .map((t) => `${KANJI[t]}${s[i].drawn[t]}`)
      .join(" ") || "—";
  // ハイライト文(勝者ではなく先手=人間視点で選ぶ)
  const me = 0;
  let highlight;
  if (rare(me) >= 2) highlight = `角・飛を${rare(me)}枚も引き当てた豪運の一局!`;
  else if (rare(me) === 1) highlight = s[me].drawn.R > 0 ? "飛車を引き当てた!" : "角を引き当てた!";
  else if (s[me].fused >= 4) highlight = `合成${s[me].fused}回、成り駒で押し切る職人の将棋。`;
  else if (s[me].captured >= 6) highlight = `${s[me].captured}枚取りの猛攻だった。`;
  else highlight = "レアは出なかった…次の一局に懸けよう。";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3" onClick={onClose}>
      <div className="rounded-lg border border-slate-600 bg-slate-900 w-full flex flex-col" style={{ maxWidth: 460, maxHeight: "86vh" }} onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-700 text-center">
          <div style={MINCHO} className="text-2xl font-bold text-amber-100 tracking-widest">
            {g.over.winner === -1 ? "引き分け" : `${pname(g.over.winner, cfg)}の勝ち`}
          </div>
          <div className="text-xs text-slate-400 mt-1">{g.over.reason} ・ {g.round}ラウンド</div>
        </div>
        <div className="overflow-y-auto p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 border-b border-slate-800">
                <th className="text-left pb-1"></th>
                <th className="text-right pb-1" style={{ color: "#c9432f" }}>先手</th>
                <th className="text-right pb-1" style={{ color: "#4a6fb5" }}>{cfg.mode === "ai" ? "AI" : "後手"}</th>
              </tr>
            </thead>
            <tbody>
              <StatRow label="ガチャ回数" v0={`${s[0].pulls}連`} v1={`${s[1].pulls}連`} />
              <StatRow label="うちプレミアム" v0={s[0].premium} v1={s[1].premium} />
              <StatRow label="レア(角・飛)獲得" v0={rare(0)} v1={rare(1)} hl />
              <StatRow label="使った石" v0={s[0].spent} v1={s[1].spent} />
              <StatRow label="合成(成り)" v0={s[0].fused} v1={s[1].fused} />
              <StatRow label="取った駒" v0={s[0].captured} v1={s[1].captured} />
              {cfg.sell !== "off" && <StatRow label="売却" v0={`${s[0].sold}回 (+${s[0].soldGain}石)`} v1={`${s[1].sold}回 (+${s[1].soldGain}石)`} />}
              {cfg.mulligan > 0 && <StatRow label="引き直し" v0={s[0].mull ? "使用" : "—"} v1={s[1].mull ? "使用" : "—"} />}
            </tbody>
          </table>
          <div className="mt-3 text-[11px] text-slate-500">引いた駒の内訳</div>
          <div className="text-sm text-slate-300 flex justify-between gap-3">
            <span style={MINCHO}>{drawnList(0)}</span>
            <span style={MINCHO} className="text-right">{drawnList(1)}</span>
          </div>
          <div className="mt-4 rounded border border-amber-600/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200 text-center" style={MINCHO}>
            {highlight}
          </div>
        </div>
        <div className="flex gap-2 p-3 border-t border-slate-700">
          <button onClick={onRematch} className="flex-1 py-2 rounded font-bold text-white" style={{ ...MINCHO, background: "linear-gradient(160deg,#c9432f,#a52c1d)" }}>再戦</button>
          <button onClick={onClose} className="flex-1 py-2 rounded text-slate-300 border border-slate-600" style={MINCHO}>盤面を見る</button>
        </div>
      </div>
    </div>
  );
}

/* ================= 遊び方モーダル ================= */
function HelpCard({ no, title, children }) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
      <div className="text-[11px] text-amber-400 tracking-widest mb-1">カード {no}</div>
      <div style={MINCHO} className="text-lg font-bold text-amber-100 mb-2">{title}</div>
      <div className="text-[13px] text-slate-300 leading-relaxed space-y-1.5">{children}</div>
    </div>
  );
}

function HelpModal({ tab, setTab, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3" onClick={onClose}>
      <div
        className="rounded-lg border border-slate-600 bg-slate-900 w-full flex flex-col"
        style={{ maxWidth: 620, maxHeight: "86vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 p-3 border-b border-slate-700">
          <span style={MINCHO} className="text-lg font-bold text-amber-100 tracking-widest mr-2">遊び方</span>
          <button
            onClick={() => setTab("rules")}
            className={`px-3 py-1 rounded text-sm ${tab === "rules" ? "bg-amber-600 text-white font-bold" : "text-slate-400 border border-slate-600"}`}
          >
            ルール
          </button>
          <button
            onClick={() => setTab("pieces")}
            className={`px-3 py-1 rounded text-sm ${tab === "pieces" ? "bg-amber-600 text-white font-bold" : "text-slate-400 border border-slate-600"}`}
          >
            駒の動き
          </button>
          <div className="flex-1" />
          <button onClick={onClose} className="px-3 py-1 rounded border border-slate-600 text-slate-300 text-sm">閉じる</button>
        </div>
        <div className="overflow-y-auto p-3 space-y-3">
          {tab === "rules" ? (
            <>
              <HelpCard no="1/3" title="王一枚から始まる将棋">
                <p>盤上にあるのは互いの<b className="text-amber-200">王だけ</b>。石を使ってガチャで駒を引き、盤に置いて、自分だけの布陣を作りながら相手の王を詰ませます。</p>
                <p>石は<b className="text-amber-200">毎ターン+1</b>。ガチャは 単発2石 / 3連5石 / プレミアム3石(歩が出ない)。</p>
                <p>ゲーム開始時はお互い無料の3連ガチャを引いて、自陣に配置します(相手には見えません。配置完了で一斉公開)。</p>
              </HelpCard>
              <HelpCard no="2/3" title="1ターンにできること — 行動力1.0">
                <p>毎ターン行動力<b className="text-amber-200">1.0</b>を自由に組み合わせて使います:</p>
                <p>駒を動かす <b className="text-amber-300">1.0</b> / ガチャ <b className="text-amber-300">0.5</b> / 打つ <b className="text-amber-300">0.5</b> / 合成 <b className="text-amber-300">0.5</b> / <span className="text-emerald-300">取った素材での合成 0・売却 0</span></p>
                <p>例:「ガチャを引いて、そのまま打つ」で1ターン。何もせずパスして石を貯めるのもアリです。</p>
                <p className="text-red-300">相手の駒を取ると、その瞬間にターン終了。取った駒は「合成素材」になります(盤には打てません)。</p>
              </HelpCard>
              <HelpCard no="3/3" title="覚えておくルール">
                <p>・<b className="text-amber-200">合成=成り</b>: 盤上の駒に同じ種類の駒を重ねると成ります(歩+歩→と金、飛+飛→龍)。</p>
                <p>・打つ場所は自由。ただし<b className="text-amber-200">相手王の周囲8マスには打てない</b>。</p>
                <p>・打った駒は<b className="text-amber-200">そのターン合成できない</b>(「新」マーク=召喚酔い)。</p>
                <p>・王は直接取れません。勝敗は必ず<b className="text-amber-200">詰み</b>で決まります。</p>
                <p>・王手をかけられたら解消が最優先。ただし<b className="text-amber-200">ガチャと売却は王手中もOK</b> — 引いた駒の合駒で凌ぐ逆転も。</p>
                <p className="text-slate-400">駒の動き方は上の「駒の動き」タブでいつでも確認できます。相手の駒をタップすると利きが青く光ります。</p>
              </HelpCard>
            </>
          ) : (
            <>
              <div className="text-[12px] text-slate-400 px-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full align-middle mr-1" style={{ background: "#2e7846" }} />=1マス進める
                <span className="ml-4 text-emerald-400 font-bold">→</span> =その方向へ何マスでも(間に駒があると止まる)
                <span className="ml-4" style={{ color: "#c96a5e" }}>赤字=成り駒</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {MOVE_CHART.map((m) => (
                  <div key={m.k} className="flex flex-col items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/60 p-2">
                    <MoveDiagram k={m.k} steps={m.steps} slides={m.slides} red={m.red} />
                    <div style={MINCHO} className={`text-sm font-bold ${m.red ? "text-red-300" : "text-amber-100"}`}>{m.k}</div>
                    <div className="text-[11px] text-slate-400 text-center leading-tight">{m.note}</div>
                  </div>
                ))}
              </div>
              <div className="text-[12px] text-slate-500 px-1">上向き(先手視点)の動きです。後手の駒は上下が逆になります。</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
