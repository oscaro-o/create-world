/* ==========================================================================
   造世 · THE MAKER — 2/4  the world: state, painting rules, renderer
   ========================================================================== */

var G = {
  stage: S.OPEN,
  cell: new Uint8Array(COLS * ROWS),      /* terrain */
  tint: new Uint8Array(COLS * ROWS),      /* 0|1 — two tones per terrain, from the hash */
  life: [],                               /* {x,y,k,n} — k: fish|bird|beast|human */
  sky: [],                                /* {x,y,k} — k: sun|moon|star */
  brush: null,
  laws: [], nameOf: "", name: "",
  t0: Date.now(),
  dirty: true,
  lastBake: 0,
  zoom: 0,                                /* 0..1 — the camera push at the end */
  mark: null,                             /* the creator's own token, during 入世 */
  markTaken: ""
};

/* ---------------------------------------------------------------- helpers */

function idx(x, y){ return y * COLS + x; }
function inB(x, y){ return x >= 0 && y >= 0 && x < COLS && y < ROWS; }

/* deterministic noise. Math.imul keeps it in 32 bits — the naive
   (n * 1274126177) overflows 2^53 and silently loses the low bits, which
   makes the world look different on every repaint. */
function hash(x, y, s){
  var n = Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(s | 0, 83492791);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function count(terr){
  var n = 0;
  for (var i = 0; i < G.cell.length; i++) if (G.cell[i] === terr) n++;
  return n;
}
function lifeCount(kind){
  if (!kind) return G.life.length;
  var n = 0;
  for (var i = 0; i < G.life.length; i++) if (G.life[i].k === kind) n++;
  return n;
}
function skyCount(kind){
  var n = 0;
  for (var i = 0; i < G.sky.length; i++) if (G.sky[i].k === kind) n++;
  return n;
}
function totalPainted(){
  var n = 0;
  for (var i = 0; i < G.cell.length; i++) if (G.cell[i] !== VOID) n++;
  return n;
}

/* ------------------------------------------------------------ paint rules
   Each terrain and each creature has an opinion about where it may go. The
   opinions are the whole design: 草木 refusing the void is why the world ends
   up with structure, and 魚 refusing dry land is why the map reads as a map.
   ------------------------------------------------------------------------ */

function mayPaint(terr, x, y){
  var c = G.cell[idx(x, y)];
  if (terr === LIGHT) return c === VOID || c === LIGHT;
  if (terr === WATER || terr === EARTH) return true;          /* land forms anywhere */
  if (terr === PLANT) return c === EARTH || c === WATER;      /* never on void or bare light */
  return false;
}

function mayPlaceLife(kind, x, y){
  var c = G.cell[idx(x, y)];
  if (kind === "fish") return c === WATER;
  if (kind === "bird") return c !== VOID;
  return c === EARTH || c === PLANT;                          /* beast, human */
}
function mayPlaceSky(kind, x, y){
  if (y > ROWS * SKY) return false;
  if (kind === "sun")  return skyCount("sun") < 1;
  if (kind === "moon") return skyCount("moon") < 1;
  return skyCount("star") < 5;
}

/* one stroke. Returns the number of cells actually changed. */
function stroke(terr, px, py, radius){
  var x0 = Math.floor((px - radius) / CELL_W), x1 = Math.ceil((px + radius) / CELL_W);
  var y0 = Math.floor((py - radius) / CELL_H), y1 = Math.ceil((py + radius) / CELL_H);
  var r2 = radius * radius, n = 0, x, y, i, dx, dy;
  for (y = y0; y <= y1; y++) {
    for (x = x0; x <= x1; x++) {
      if (!inB(x, y)) continue;
      dx = (x + 0.5) * CELL_W - px; dy = (y + 0.5) * CELL_H - py;
      if (dx * dx + dy * dy > r2) continue;
      if (!mayPaint(terr, x, y)) continue;
      i = idx(x, y);
      /* the brush is not uniform: roughly one cell in five inside the disc
         refuses the paint, which is what stops a stroke looking like a
         circle and starts it looking like ground. */
      if (hash(x, y, 9) < 0.12) continue;
      if (terr === PLANT) {
        var sub = (G.cell[i] === WATER) ? 1 : 0;              /* 1 = kelp */
        if (G.cell[i] === PLANT && G.tint[i] === sub) continue;
        G.cell[i] = PLANT; G.tint[i] = sub;
      } else {
        if (G.cell[i] === terr) continue;
        G.cell[i] = terr;
        G.tint[i] = hash(x, y, 7) < 0.5 ? 0 : 1;
      }
      n++;
    }
  }
  if (n) G.dirty = true;
  return n;
}
