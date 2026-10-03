/* ==========================================================================
   造世 · THE MAKER — 2b/4  the renderer
   --------------------------------------------------------------------------
   Two layers. The terrain is baked into an offscreen canvas and repainted only
   when something actually changes; everything that moves — the sun's glow, a
   star twinkling, a fish bobbing — is drawn fresh on top. Baking is what makes
   a 1144-cell world cheap enough to animate at 30fps.

   How the ground is built: every cell lays down one soft blob, and the blobs
   are drawn at roughly twice the cell pitch so neighbours overlap heavily. The
   first version of this drew one disc per cell at cell size, and the result
   looked like bubble wrap — you could see every cell. Overlap plus a long
   gradient tail plus three tones per terrain gives mottling instead of circles.
   ========================================================================== */

var cv = document.getElementById("cv");
cv.width = CW; cv.height = CH;
var ctx = cv.getContext("2d");
var base = document.createElement("canvas");
base.width = CW; base.height = CH;
var bctx = base.getContext("2d");

/* one soft blob, pre-rendered. Drawing 1144 gradients a frame is not
   affordable; drawing 1144 cached sprites is. */
function makeBlob(rgb){
  var SZ = 96, c = document.createElement("canvas");
  c.width = c.height = SZ;
  var g = c.getContext("2d");
  var grad = g.createRadialGradient(SZ / 2, SZ / 2, 0, SZ / 2, SZ / 2, SZ / 2);
  grad.addColorStop(0,    "rgba(" + rgb + ",1)");
  grad.addColorStop(0.34, "rgba(" + rgb + ",.62)");
  grad.addColorStop(0.68, "rgba(" + rgb + ",.20)");
  grad.addColorStop(1,    "rgba(" + rgb + ",0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, SZ, SZ);
  return c;
}
function blobSet(a, b, c){ return [makeBlob(a), makeBlob(b), makeBlob(c)]; }

/* three tones each, dark → light. The tone is picked per cell from the hash,
   which is what stops a field of one terrain reading as one flat colour.
   Light's three tones sit close together and all of them are bright: light is
   a field, not a texture, and the first version's wide dark-to-gold spread
   made day one look like a beach. */
var BLOB = {
  light: blobSet("255,216,166", "255,231,198", "255,243,222"),
  water: blobSet("20,58,88",    "30,84,118",   "42,110,150"),
  earth: blobSet("88,64,42",    "116,88,60",   "146,116,84"),
  plant: blobSet("34,86,56",    "48,114,74",   "64,142,96"),
  kelp:  blobSet("22,74,68",    "32,98,88",    "46,124,108")
};

/* per-cell geometry. Everything is derived from the hash, so the world looks
   identical after a repaint and identical on every device. */
function cellGeom(x, y){
  var cx = (x + 0.5) * CELL_W + (hash(x, y, 1) - 0.5) * CELL_W * 0.44;
  var cy = (y + 0.5) * CELL_H + (hash(x, y, 2) - 0.5) * CELL_H * 0.44;
  var r  = CELL_W * 1.16 * (0.86 + hash(x, y, 3) * 0.30);
  return { cx: cx, cy: cy, r: r, tone: Math.floor(hash(x, y, 7) * 3) };
}

function bake(){
  bctx.setTransform(1, 0, 0, 1, 0, 0);
  bctx.globalAlpha = 1;
  bctx.globalCompositeOperation = "source-over";
  bctx.clearRect(0, 0, CW, CH);

  /* the void — not flat black. A world you are about to fill should already
     have a grain to it, or the first stroke lands on nothing. */
  bctx.fillStyle = "#04050a";
  bctx.fillRect(0, 0, CW, CH);
  bctx.fillStyle = "rgba(126,148,196,.055)";
  for (var i = 0; i < 2400; i++) {
    bctx.fillRect(hash(i, 0, 21) * CW, hash(i, 1, 21) * CH, 1, 1);
  }

  var x, y, g, k, c;

  /* pass 1 — light, additive, underneath everything. Two runs: the field
     itself, then a wide, faint bloom of the same cells, which is what turns
     "beige gravel" into something that reads as a source of light. */
  var lights = [];
  for (y = 0; y < ROWS; y++) for (x = 0; x < COLS; x++) {
    if (G.cell[idx(x, y)] === LIGHT) lights.push(x, y);
  }
  bctx.globalCompositeOperation = "lighter";
  for (i = 0; i < lights.length; i += 2) {
    x = lights[i]; y = lights[i + 1];
    g = cellGeom(x, y);
    bctx.globalAlpha = 0.46;
    bctx.drawImage(BLOB.light[g.tone], g.cx - g.r, g.cy - g.r, g.r * 2, g.r * 2);
  }
  for (i = 0; i < lights.length; i += 2) {
    x = lights[i]; y = lights[i + 1];
    g = cellGeom(x, y);
    var R = g.r * 3.2;
    bctx.globalAlpha = 0.075;
    bctx.drawImage(BLOB.light[1], g.cx - R, g.cy - R, R * 2, R * 2);
  }
  bctx.globalAlpha = 1;
  bctx.globalCompositeOperation = "source-over";

  /* pass 2 — water and earth */
  for (y = 0; y < ROWS; y++) for (x = 0; x < COLS; x++) {
    c = G.cell[idx(x, y)];
    if (c !== WATER && c !== EARTH) continue;
    g = cellGeom(x, y);
    bctx.globalAlpha = 0.95;
    bctx.drawImage((c === WATER ? BLOB.water : BLOB.earth)[g.tone],
                   g.cx - g.r, g.cy - g.r, g.r * 2, g.r * 2);
  }

  /* pass 3 — plants, slightly smaller than the ground so a rim of soil or
     water still shows around every clump */
  for (y = 0; y < ROWS; y++) for (x = 0; x < COLS; x++) {
    if (G.cell[idx(x, y)] !== PLANT) continue;
    g = cellGeom(x, y);
    var kelp = G.tint[idx(x, y)] === 1;
    var rr2 = g.r * 0.94;
    bctx.globalAlpha = 0.92;
    bctx.drawImage((kelp ? BLOB.kelp : BLOB.plant)[g.tone],
                   g.cx - rr2, g.cy - rr2, rr2 * 2, rr2 * 2);
  }
  bctx.globalAlpha = 1;

  /* pass 4 — blades. Density is modulated on a coarse grid first, so the
     canopy has clearings in it; a blade on every planted cell reads as
     wallpaper, not as grass. Each blade also gets its own angle and length. */
  bctx.lineCap = "round";
  for (y = 0; y < ROWS; y++) for (x = 0; x < COLS; x++) {
    if (G.cell[idx(x, y)] !== PLANT) continue;
    if (hash(Math.floor(x / 3), Math.floor(y / 3), 40) > 0.72) continue;
    if (hash(x, y, 14) > 0.66) continue;
    g = cellGeom(x, y);
    kelp = G.tint[idx(x, y)] === 1;
    var blades = 1 + Math.floor(hash(x, y, 15) * 3);
    for (k = 0; k < blades; k++) {
      var ang = (hash(x, y, 16 + k) - 0.5) * 1.7;
      var len = (kelp ? 6 : 4) + hash(x, y, 19 + k) * 5;
      bctx.save();
      bctx.translate(g.cx + (hash(x, y, 22 + k) - 0.5) * 9, g.cy + 3);
      bctx.rotate(ang);
      bctx.strokeStyle = kelp ? "rgba(104,190,166,.40)" : "rgba(146,218,162,.38)";
      bctx.lineWidth = 1.4;
      bctx.beginPath();
      bctx.moveTo(0, 0);
      bctx.lineTo(0, -len);
      bctx.stroke();
      bctx.restore();
    }
  }

  G.dirty = false;
  G.lastBake = Date.now();
}

/* ------------------------------------------------------------- the frame */

/* a standing atmosphere, drawn over the terrain but under everything alive:
   cooler and darker at the top of the frame, warmer at the bottom. It is what
   makes the rectangle read as a place with a sky in it rather than a map. */
var ATMO = (function () {
  var g = ctx.createLinearGradient(0, 0, 0, CH);
  g.addColorStop(0,    "rgba(32,58,104,.34)");
  g.addColorStop(0.42, "rgba(18,26,44,.06)");
  g.addColorStop(0.72, "rgba(40,30,14,.03)");
  g.addColorStop(1,    "rgba(46,32,14,.14)");
  return g;
})();

/* built once — a gradient per frame per frame is a waste */
var VIGNETTE = (function () {
  var g = ctx.createRadialGradient(CW * 0.5, CH * 0.5, CH * 0.30,
                                   CW * 0.5, CH * 0.5, CH * 0.94);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(0.60, "rgba(0,0,0,.10)");
  g.addColorStop(1, "rgba(0,0,0,.64)");
  return g;
})();

function drawFrame(now){
  var tt = now / 1000;
  if (G.dirty && Date.now() - G.lastBake > 70) bake();

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, CW, CH);
  ctx.drawImage(base, 0, 0);
  ctx.fillStyle = ATMO;
  ctx.fillRect(0, 0, CW, CH);

  var x, y, i, g, o;

  /* water shimmer — only a quarter of the water cells carry a highlight,
     which is enough to read as moving water and cheap enough to run at 30fps */
  ctx.lineCap = "round";
  for (y = 0; y < ROWS; y++) for (x = 0; x < COLS; x++) {
    i = idx(x, y);
    if (G.cell[i] !== WATER) continue;
    if (hash(x, y, 31) > 0.22) continue;
    g = cellGeom(x, y);
    var ph = tt * 1.5 + hash(x, y, 32) * 6.283;
    ctx.strokeStyle = "rgba(184,228,255," + (0.05 + 0.10 * (0.5 + 0.5 * Math.sin(ph))).toFixed(3) + ")";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(g.cx - 5, g.cy + Math.sin(ph) * 1.4);
    ctx.lineTo(g.cx + 5, g.cy + Math.sin(ph) * 1.4);
    ctx.stroke();
  }

  /* celestial bodies, before the creatures so nothing flies in front of the sun */
  for (i = 0; i < G.sky.length; i++) {
    o = G.sky[i];
    var ox = (o.x + 0.5) * CELL_W, oy = (o.y + 0.5) * CELL_H;
    ctx.globalCompositeOperation = "lighter";
    if (o.k === "sun") {
      var pg = ctx.createRadialGradient(ox, oy, 0, ox, oy, 104);
      pg.addColorStop(0,   "rgba(255,244,214,.98)");
      pg.addColorStop(.14, "rgba(255,222,150,.62)");
      pg.addColorStop(.46, "rgba(255,196,96,.16)");
      pg.addColorStop(1,   "rgba(255,180,80,0)");
      ctx.fillStyle = pg;
      ctx.beginPath(); ctx.arc(ox, oy, 104, 0, 6.2832); ctx.fill();
      ctx.fillStyle = "rgba(255,250,232,1)";
      ctx.beginPath(); ctx.arc(ox, oy, 15, 0, 6.2832); ctx.fill();
    } else if (o.k === "moon") {
      var mg = ctx.createRadialGradient(ox, oy, 0, ox, oy, 70);
      mg.addColorStop(0,   "rgba(216,234,252,.66)");
      mg.addColorStop(.42, "rgba(178,206,238,.18)");
      mg.addColorStop(1,   "rgba(160,190,230,0)");
      ctx.fillStyle = mg;
      ctx.beginPath(); ctx.arc(ox, oy, 70, 0, 6.2832); ctx.fill();
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(240,248,255,.97)";
      ctx.beginPath(); ctx.arc(ox, oy, 13, 0, 6.2832); ctx.fill();
      /* the crescent is a shadow, not a hole. An opaque dark disc read as a
         black dot punched through the sky, so it is pushed further out, made
         smaller and kept faint — enough to say "moon", not "hole". */
      ctx.fillStyle = "rgba(18,26,44,.40)";
      ctx.beginPath(); ctx.arc(ox + 9, oy - 4.6, 9.8, 0, 6.2832); ctx.fill();
    } else {
      var tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(tt * 2.1 + hash(o.x, o.y, 33) * 6.283));
      ctx.fillStyle = "rgba(228,240,255," + tw.toFixed(3) + ")";
      ctx.beginPath(); ctx.arc(ox, oy, 2.2, 0, 6.2832); ctx.fill();
      ctx.strokeStyle = "rgba(228,240,255," + (tw * 0.45).toFixed(3) + ")";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(ox - 5.5, oy); ctx.lineTo(ox + 5.5, oy);
      ctx.moveTo(ox, oy - 5.5); ctx.lineTo(ox, oy + 5.5);
      ctx.stroke();
    }
  }
  ctx.globalCompositeOperation = "source-over";

  /* the light the world is actually standing in — this is why 第四日 changes
     the colour of everything, which is the day's whole promise */
  for (i = 0; i < G.sky.length; i++) {
    o = G.sky[i];
    if (o.k === "star") continue;
    var lx = (o.x + 0.5) * CELL_W, ly = (o.y + 0.5) * CELL_H;
    var lg = ctx.createRadialGradient(lx, ly, 0, lx, ly, CW * 1.0);
    if (o.k === "sun") {
      lg.addColorStop(0, "rgba(255,204,124,.20)");
      lg.addColorStop(1, "rgba(255,190,110,0)");
    } else {
      lg.addColorStop(0, "rgba(146,188,240,.13)");
      lg.addColorStop(1, "rgba(140,180,235,0)");
    }
    ctx.fillStyle = lg;
    ctx.fillRect(0, 0, CW, CH);
  }

  for (i = 0; i < G.life.length; i++) drawLife(G.life[i], tt, i);

  /* depth: the world sits in a frame, it does not stop at a hard edge */
  ctx.fillStyle = VIGNETTE;
  ctx.fillRect(0, 0, CW, CH);

  /* the brush ring, only while a brush is in hand */
  if (G.brush && mouse.in) {
    var rr3 = brushRadius();
    ctx.strokeStyle = "rgba(242,215,155,.55)";
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.arc(mouse.x, mouse.y, rr3, 0, 6.2832); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(242,215,155,.09)";
    ctx.beginPath(); ctx.arc(mouse.x, mouse.y, rr3, 0, 6.2832); ctx.fill();
  }

  /* the maker's token, during 入世. It is the only thing on screen that is not
     part of the world — which is the entire point of the last act. */
  if (G.mark) {
    var mx = (G.mark.x + 0.5) * CELL_W, my = (G.mark.y + 0.5) * CELL_H;
    var pulse = 0.5 + 0.5 * Math.sin(tt * 3.4);
    ctx.strokeStyle = "rgba(255,255,255," + (0.35 + pulse * 0.45).toFixed(3) + ")";
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(mx, my, 10 + pulse * 3, 0, 6.2832); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.10)";
    ctx.beginPath(); ctx.arc(mx, my, 10 + pulse * 3, 0, 6.2832); ctx.fill();
    /* the slot it was refused */
    ctx.strokeStyle = "rgba(196,74,62,.9)";
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.moveTo(mx - 8, my - 8); ctx.lineTo(mx + 8, my + 8);
    ctx.moveTo(mx + 8, my - 8); ctx.lineTo(mx - 8, my + 8);
    ctx.stroke();
  }
}

function drawLife(o, tt, i){
  var cx = (o.x + 0.5) * CELL_W, cy = (o.y + 0.5) * CELL_H;
  var bob = Math.sin(tt * 1.7 + i * 1.31) * 1.4;
  ctx.save();
  ctx.translate(cx, cy + bob);
  if (o.k === "fish") {
    ctx.fillStyle = "#9ad6f2";
    ctx.beginPath(); ctx.ellipse(0, 0, 5.4, 2.7, 0, 0, 6.2832); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-4.8, 0); ctx.lineTo(-8.6, -2.7); ctx.lineTo(-8.6, 2.7);
    ctx.closePath(); ctx.fill();
  } else if (o.k === "bird") {
    ctx.strokeStyle = "#efe8d6"; ctx.lineWidth = 1.8; ctx.lineCap = "round";
    var f = Math.sin(tt * 4.2 + i) * 2.6;
    ctx.beginPath();
    ctx.moveTo(-5.8, f); ctx.quadraticCurveTo(-2.1, -2.8, 0, 0);
    ctx.quadraticCurveTo(2.1, -2.8, 5.8, f);
    ctx.stroke();
  } else if (o.k === "beast") {
    ctx.fillStyle = "#d6ab74";
    ctx.beginPath(); ctx.ellipse(0, -0.6, 4.6, 3.0, 0, 0, 6.2832); ctx.fill();
    ctx.strokeStyle = "#d6ab74"; ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-2.7, 1.7); ctx.lineTo(-2.7, 4.4);
    ctx.moveTo(2.7, 1.7);  ctx.lineTo(2.7, 4.4);
    ctx.stroke();
    ctx.beginPath(); ctx.arc(4.9, -2.5, 2.2, 0, 6.2832); ctx.fill();
  } else {
    /* a person: the only figure in the world with a head and shoulders, drawn
       at the same scale as everything else */
    ctx.fillStyle = "#fae7bc";
    ctx.beginPath(); ctx.arc(0, -4.6, 2.2, 0, 6.2832); ctx.fill();
    ctx.strokeStyle = "#fae7bc"; ctx.lineWidth = 1.7; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, -2.4); ctx.lineTo(0, 2.7);
    ctx.moveTo(-3.2, -0.4); ctx.lineTo(3.2, -0.4);
    ctx.moveTo(0, 2.7); ctx.lineTo(-2.5, 5.4);
    ctx.moveTo(0, 2.7); ctx.lineTo(2.5, 5.4);
    ctx.stroke();
  }
  ctx.restore();
}

/* what is standing in a given cell — used by the last act, where every answer
   has to be the truth about the world the player actually built */
function occupantAt(x, y){
  if (!inB(x, y)) return null;
  var i, cx, cy;
  for (i = 0; i < G.life.length; i++) {
    if (G.life[i].x === x && G.life[i].y === y) return G.life[i].k;
  }
  for (i = 0; i < G.sky.length; i++) {
    cx = Math.floor(G.sky[i].x); cy = Math.floor(G.sky[i].y);
    if (cx === x && cy === y) return G.sky[i].k;
  }
  var c = G.cell[idx(x, y)];
  if (c === PLANT) return "plant";
  if (c === WATER) return "water";
  if (c === EARTH) return "earth";
  if (c === LIGHT) return "light";
  return null;
}
