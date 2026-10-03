/* ==========================================================================
   造世 · THE MAKER — 3/4  input, palette, the spoken line
   ========================================================================== */

var mouse = { x: -99, y: -99, down: false, in: false, last: null };

/* elements, and what kind of thing each one is */
var EL = {
  light: { kind:"terrain", terr:LIGHT, c:"#f0d9a8", key:"el_light" },
  water: { kind:"terrain", terr:WATER, c:"#2d6f95", key:"el_water" },
  earth: { kind:"terrain", terr:EARTH, c:"#8a6a45", key:"el_earth" },
  plant: { kind:"terrain", terr:PLANT, c:"#3f8a58", key:"el_plant" },
  sun:   { kind:"sky",  c:"#ffd27a", key:"el_sun"   },
  moon:  { kind:"sky",  c:"#cfe0ef", key:"el_moon"  },
  star:  { kind:"sky",  c:"#e2eeff", key:"el_star"  },
  fish:  { kind:"life", c:"#8fd0f0", key:"el_fish"  },
  bird:  { kind:"life", c:"#eae3d2", key:"el_bird"  },
  beast: { kind:"life", c:"#cfa470", key:"el_beast" },
  human: { kind:"life", c:"#f6e2b4", key:"el_human" }
};

/* which elements each day offers. A day with too many tools is a toolbox,
   not a day of creation. */
var STAGE_EL = {
  1: ["light"],
  2: ["water", "earth"],
  3: ["plant"],
  4: ["sun", "moon", "star"],
  5: ["fish", "bird", "beast"],
  6: ["human"]
};

/* how much has to exist before a day is finished */
var GOAL = {
  1: { light: Math.round(COLS * ROWS * 0.10) },
  2: { water: Math.round(COLS * ROWS * 0.06), earth: Math.round(COLS * ROWS * 0.08) },
  3: { plant: Math.round(COLS * ROWS * 0.08) },
  4: { sun: 1, moon: 1, star: 3 },
  5: { life: 6 },
  6: { human: 5 }
};

function brushRadius(){ return CELL_W * 2.3; }

/* --------------------------------------------------------- canvas pointer */

function toCanvas(e){
  var r = cv.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) * (CW / r.width),
    y: (e.clientY - r.top) * (CH / r.height)
  };
}

function paintHere(p){
  var e = EL[G.brush];
  if (!e || e.kind !== "terrain") return 0;
  return stroke(e.terr, p.x, p.y, brushRadius());
}

cv.addEventListener("pointerdown", function (ev) {
  if (G.stage === S.OPEN || G.stage === S.END) return;
  cv.setPointerCapture && cv.setPointerCapture(ev.pointerId);
  var p = toCanvas(ev);
  mouse.x = p.x; mouse.y = p.y; mouse.in = true;

  if (G.stage === S.ENTER) { mouse.down = false; return; }

  var e = EL[G.brush];
  if (!e) return;
  mouse.down = true;

  if (e.kind === "terrain") {
    paintHere(p); mouse.last = p;
  } else {
    placeAt(e, p);
  }
  ev.preventDefault();
});

cv.addEventListener("pointermove", function (ev) {
  var p = toCanvas(ev);
  mouse.x = p.x; mouse.y = p.y; mouse.in = true;

  if (G.stage === S.ENTER) { markAt(p); return; }
  if (!mouse.down) return;

  var e = EL[G.brush];
  if (!e) return;
  if (e.kind === "terrain") {
    /* interpolate between the last point and this one, or a fast drag leaves
       a dotted line instead of a stroke */
    var a = mouse.last || p, steps = Math.max(1, Math.ceil(Math.hypot(p.x - a.x, p.y - a.y) / (brushRadius() * 0.5)));
    for (var i = 1; i <= steps; i++) {
      paintHere({ x: a.x + (p.x - a.x) * i / steps, y: a.y + (p.y - a.y) * i / steps });
    }
    mouse.last = p;
  }
  ev.preventDefault();
});

function endStroke(){ mouse.down = false; mouse.last = null; checkGoal(); }
cv.addEventListener("pointerup", endStroke);
cv.addEventListener("pointercancel", endStroke);
cv.addEventListener("pointerleave", function () { mouse.in = false; mouse.down = false; });

/* placement — one creature or one light per tap.
   The tap is snapped to the nearest cell that will actually accept the thing,
   out to two cells. On a phone a cell is eleven CSS pixels wide; without the
   snap, placing a person is a test of aim rather than a creative act. Beyond
   two cells nothing is offered — so "a beast cannot stand in the sky" is still
   a rule the player can feel, not a nudge that quietly does it for them. */
var SNAP_D = [[0,0],[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1],
              [2,0],[-2,0],[0,2],[0,-2],[2,1],[2,-1],[-2,1],[-2,-1],
              [1,2],[-1,2],[1,-2],[-1,-2]];

function nearestValid(kind, x, y, isLife){
  for (var i = 0; i < SNAP_D.length; i++) {
    var nx = x + SNAP_D[i][0], ny = y + SNAP_D[i][1];
    if (!inB(nx, ny)) continue;
    if (isLife) {
      if (!mayPlaceLife(kind, nx, ny)) continue;
      var taken = false;
      for (var j = 0; j < G.life.length; j++) {
        if (G.life[j].x === nx && G.life[j].y === ny) { taken = true; break; }
      }
      if (taken) continue;
    } else if (!mayPlaceSky(kind, nx, ny)) {
      continue;
    }
    return [nx, ny];
  }
  return null;
}

function placeAt(e, p){
  var x = Math.floor(p.x / CELL_W), y = Math.floor(p.y / CELL_H);
  if (!inB(x, y)) return;
  var at = nearestValid(G.brush, x, y, e.kind === "life");
  if (!at) { flashSay(e.kind === "sky" ? "sky" : "no"); return; }
  x = at[0]; y = at[1];
  if (e.kind === "life") {
    G.life.push({ x: x, y: y, k: G.brush, n: "" });
    trackFirst("life_" + G.brush);
    afterPlace(G.brush);        /* the element id, not "life" — 第五日 has to
                                   know whether it was a fish or a person */
  } else {
    G.sky.push({ x: x, y: y, k: G.brush });
    afterPlace("sky");
  }
  checkGoal();
}

function markAt(p){
  var x = Math.floor(p.x / CELL_W), y = Math.floor(p.y / CELL_H);
  if (!inB(x, y)) return;
  G.mark = { x: x, y: y };
  var occ = occupantAt(x, y);
  var label = occ ? t("occ_" + occ) : "—";
  G.markTaken = label;
  say('<b>' + t("you") + '</b> · ' + label);
}

/* --------------------------------------------------------------- the line */

function say(html){ document.getElementById("say").innerHTML = html; }

var flashT = 0;
function flashSay(why){
  var s = document.getElementById("say");
  var old = s.innerHTML;
  s.innerHTML = '<span class="dim">' +
    (why === "sky" ? (LANG === "en" ? "Lights hang in the upper sky only." :
                      LANG === "hant" ? "光體只能掛在上方的天空。" : "光体只能挂在上方的天空。")
                   : (LANG === "en" ? "It cannot live there." :
                      LANG === "hant" ? "牠不能在那裡活。" : "它不能在那里活。")) + '</span>';
  s.style.borderColor = "var(--blood)";
  clearTimeout(flashT);
  flashT = setTimeout(function () { s.innerHTML = old; s.style.borderColor = ""; }, 1100);
}

/* the line, plus a bar when the day has a quota */
function sayGoal(){
  var g = GOAL[G.stage];
  if (!g) { return; }
  var rows = [], done = true, x;
  for (var k in g) {
    if (!g.hasOwnProperty(k)) continue;
    var have, want = g[k];
    if (k === "life") have = G.life.length;
    else if (k === "sun" || k === "moon" || k === "star") have = skyCount(k);
    else if (k === "human") have = lifeCount("human");
    else have = count(EL[k].terr);
    if (have < want) done = false;
    rows.push('<b>' + (EL[k] ? t(EL[k].key) : k) + '</b> ' +
              Math.min(have, want) + " / " + want);
  }
  say(t("s" + G.stage + "_say") + '<br><span class="dim">' + rows.join(" · ") + "</span>");
}

/* ------------------------------------------------------------- day strip */

function renderDaybar(){
  var bar = document.getElementById("daybar"), h = "";
  var cur = G.stage <= S.DAY6 ? G.stage : (G.stage === S.LAW ? 6 : 7);
  for (var i = 0; i < 8; i++) {
    var cls = i === cur ? " on" : (i < cur ? " done" : "");
    h += '<div class="' + cls.trim() + '" data-d="' + t("days")[i] + '">' + t("days")[i] + "</div>";
  }
  bar.innerHTML = h;
}

/* --------------------------------------------------------------- palette */

function renderPalette(){
  var p = document.getElementById("palette");
  var list = STAGE_EL[G.stage];
  if (!list) { p.innerHTML = ""; return; }   /* not a painting day — no tools,
                                                and no stale prompt either */
  if (!G.brush || list.indexOf(G.brush) < 0) G.brush = list[0];
  var h = "";
  for (var i = 0; i < list.length; i++) {
    var id = list[i], e = EL[id], cnt = "";
    if (id === "sun")  cnt = skyCount("sun")  + "/1";
    if (id === "moon") cnt = skyCount("moon") + "/1";
    if (id === "star") cnt = skyCount("star") + "/5";
    h += '<button type="button" class="el' + (G.brush === id ? " on" : "") + '" data-el="' + id + '">' +
         '<span class="sw" style="background:' + e.c + ';color:' + e.c + '"></span>' +
         '<span class="n">' + t(e.key) + "</span>" +
         (cnt ? '<span class="c">' + cnt + "</span>" : "") +
         "</button>";
  }
  if (G.stage === S.DAY1) h += '<span class="hint">' + t("el_hint") + "</span>";
  p.innerHTML = h;
  var btns = p.querySelectorAll(".el");
  for (var j = 0; j < btns.length; j++) {
    btns[j].onclick = function () { G.brush = this.getAttribute("data-el"); renderPalette(); };
  }
}

/* --------------------------------------------------------------- overlays */

var ov = document.getElementById("overlay");
/* `mode` is "soft" when the world behind the words has to stay visible —
   the last act puts the text at the bottom and leaves the world lit above it,
   because the whole point of that scene is the thing you are looking at. */
function overlay(html, mode){
  ov.innerHTML = html;
  ov.className = "overlay show" + (mode ? " " + mode : "");
}
function hideOverlay(){ ov.className = "overlay"; }

function actRow(buttons){
  var r = document.getElementById("actrow"), h = "";
  for (var i = 0; i < buttons.length; i++) {
    var b = buttons[i];
    h += '<button type="button" class="btn ' + (b.cls || "") + '" data-a="' + i + '">' + b.label + "</button>";
  }
  r.innerHTML = h;
  var els = r.querySelectorAll("button");
  for (var j = 0; j < els.length; j++) {
    els[j].onclick = buttons[j].go;
  }
}
function clearActRow(){ document.getElementById("actrow").innerHTML = ""; }

/* --------------------------------------------------------------- tracking */

var SID = (function () {
  try {
    var v = sessionStorage.getItem("cw_sid");
    if (!v) { v = Date.now().toString(36) + Math.random().toString(36).slice(2, 8); sessionStorage.setItem("cw_sid", v); }
    return v;
  } catch (e) { return "n" + Math.random().toString(36).slice(2, 8); }
})();
var onceSent = {};
function track(ev, extra){
  if (!TRACK_ON) return;
  var q = "?e=" + encodeURIComponent(ev) + "&s=" + SID + "&l=" + LANG;
  if (extra) for (var k in extra) q += "&" + k + "=" + encodeURIComponent(extra[k]);
  try { new Image().src = TRACK_URL + q + "&_=" + Date.now(); } catch (e) {}
}
function trackFirst(ev, extra){
  if (onceSent[ev]) return;
  onceSent[ev] = 1;
  track(ev, extra);
}

/* ---------------------------------------------------------------- helpers */

function mmss(ms){
  var s = Math.max(0, Math.round(ms / 1000));
  return Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2);
}
function clean(s, max){
  s = String(s == null ? "" : s).replace(/\s+/g, " ").trim();
  return s.slice(0, max || 14);
}
