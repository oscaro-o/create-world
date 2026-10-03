/* ==========================================================================
   造世 · THE MAKER — 4/4b  the seventh day, and the last act
   ========================================================================== */

/* ------------------------------------------------------------ 第七日 · 安息
   The world finishes itself. This is not a cut-scene: the frontier grows one
   cell at a time from the edges of what the player painted, taking the terrain
   of whatever is already next to it. So the world that ends up on screen is
   literally the player's own world, continued — which is what makes the next
   scene true rather than asserted.
   ------------------------------------------------------------------------ */

var restTimer = null;
function runRest(){
  G.brush = null;
  renderPalette(); renderDaybar(); clearActRow();
  overlay('<div class="big">' + t("s8_big") + '</div><div class="mid">' + t("s8_say") + '</div>');
  setTimeout(hideOverlay, 2800);

  var spawnAcc = 0;
  restTimer = setInterval(function () {
    var filled = restTick(9, function (x, y) {
      /* the world also gets busier on its own — a creature appears every so
         often on ground that can hold one */
      spawnAcc++;
      if (spawnAcc % 7 !== 0) return;
      var kinds = ["fish", "bird", "beast"];
      var k = kinds[Math.floor(hash(x, y, 55) * 3) % 3];
      if (!mayPlaceLife(k, x, y)) return;
      for (var i = 0; i < G.life.length; i++) if (G.life[i].x === x && G.life[i].y === y) return;
      G.life.push({ x: x, y: y, k: k, n: "" });
    });
    if (filled === 0) {
      clearInterval(restTimer); restTimer = null;
      setTimeout(restDone, 900);
    }
  }, 105);

  track("rest");
}

/* grow the frontier by up to `budget` cells. Returns how many were filled. */
function restTick(budget, onFill){
  var frontier = [], x, y, i, nx, ny, n;
  var dx = [1, -1, 0, 0], dy = [0, 0, 1, -1];
  for (y = 0; y < ROWS; y++) for (x = 0; x < COLS; x++) {
    if (G.cell[idx(x, y)] !== VOID) continue;
    for (i = 0; i < 4; i++) {
      nx = x + dx[i]; ny = y + dy[i];
      if (inB(nx, ny) && G.cell[idx(nx, ny)] !== VOID) { frontier.push([x, y]); break; }
    }
  }
  if (!frontier.length) return 0;

  /* deterministic order, so two players who painted the same world watch it
     finish the same way */
  frontier.sort(function (a, b) { return hash(a[0], a[1], 61) - hash(b[0], b[1], 61); });

  var done = 0;
  for (i = 0; i < frontier.length && done < budget; i++) {
    x = frontier[i][0]; y = frontier[i][1];
    if (G.cell[idx(x, y)] !== VOID) continue;

    /* take the colour of the neighbourhood, with a little drift */
    var tally = {}, best = VOID, bestN = 0;
    for (n = 0; n < 4; n++) {
      nx = x + dx[n]; ny = y + dy[n];
      if (!inB(nx, ny)) continue;
      var c = G.cell[idx(nx, ny)];
      if (c === VOID) continue;
      tally[c] = (tally[c] || 0) + 1;
      if (tally[c] > bestN) { bestN = tally[c]; best = c; }
    }
    if (hash(x, y, 62) < 0.14) {
      var pool = [];
      for (var kk in tally) if (tally.hasOwnProperty(kk)) pool.push(+kk);
      if (pool.length) best = pool[Math.floor(hash(x, y, 63) * pool.length) % pool.length];
    }
    if (best === VOID) best = LIGHT;
    G.cell[idx(x, y)] = best;
    G.tint[idx(x, y)] = hash(x, y, 7) < 0.5 ? 0 : 1;
    G.dirty = true;
    done++;
    if (onFill) onFill(x, y);
  }
  return done;
}

function restDone(){
  overlay('<div class="big">' + t("s8_done") + '</div><div class="mid">' + t("s8_done2") + '</div>');
  actRow([{ label: t("s8_btn"), go: function () { setStage(S.ENTER); } }]);
  track("rest_done", { life: G.life.length, cells: totalPainted() });
}

/* ------------------------------------------------------------ 入世 · 你伸手
   The camera pushes in. The player is given a token and can drag it anywhere
   in the world — and the world answers, honestly, with whoever is standing
   there. There is no cell that says anything else.
   ------------------------------------------------------------------------ */

function runEnter(){
  G.brush = null;
  renderPalette(); renderDaybar(); clearActRow();
  hideOverlay();

  frame.classList.add("zoom");
  setTimeout(function () { cv.style.transform = "scale(2.7)"; }, 40);

  var cx = Math.floor(COLS / 2), cy = Math.floor(ROWS / 2);
  G.mark = { x: cx, y: cy };
  markAt({ x: (cx + 0.5) * CELL_W, y: (cy + 0.5) * CELL_H });

  setTimeout(function () {
    overlay('<div class="big">' + t("s9_reach") + '</div>');
    setTimeout(function () { if (G.stage === S.ENTER) hideOverlay(); }, 2200);
  }, 1250);

  /* the world does not wait for the player to work it out */
  setTimeout(function () {
    overlay('<div class="mid">' + t("s9_try") + '</div>', "soft");
    setTimeout(function () { if (G.stage === S.ENTER) hideOverlay(); }, 2800);
  }, 4600);

  setTimeout(function () {
    if (G.stage !== S.ENTER) return;
    actRow([{ label: t("s9_skip"), cls: "ghost", go: finalReveal }]);
  }, 7600);

  track("enter");
}

function finalReveal(){
  clearActRow();
  hideOverlay();
  setTimeout(function () {
    overlay('<div class="big">' + t("s9_big") + '</div>' +
            '<div class="mid">' + t("s9_mid") + '</div>', "soft");
  }, 260);
  setTimeout(function () {
    actRow([
      { label: t("s10_a"), cls: "danger", go: function () { ending("a"); } },
      { label: t("s10_b"), cls: "ghost",  go: function () { ending("b"); } }
    ]);
  }, 3600);
  track("twist");
}

/* ------------------------------------------------------------------ endings
   Both answers are losses, and they are different losses. Destroying the world
   buys a place in nothing; leaving it keeps a world that has moved on. Neither
   one lets the player be in the thing they made.
   ------------------------------------------------------------------------ */

function ending(which){
  G.stage = S.END;
  G.ending = which;
  clearActRow();
  say("");                       /* the token's read-out belongs to 入世, not here */
  track("end", { c: which, t: Math.round((Date.now() - G.t0) / 1000), life: G.life.length });

  var cx = Math.floor(COLS / 2), cy = Math.floor(ROWS / 2), keep = idx(cx, cy);

  if (which === "a") {
    /* everything goes back to void, except the one cell the maker is standing in */
    var cells = [];
    for (var i = 0; i < G.cell.length; i++) if (G.cell[i] !== VOID && i !== keep) cells.push(i);
    cells.sort(function (a, b) {
      return hash(a % COLS, Math.floor(a / COLS), 88) - hash(b % COLS, Math.floor(b / COLS), 88);
    });
    var n = 0, per = Math.max(1, Math.ceil(cells.length / 46));
    G.life = []; G.sky = [];
    var t2 = setInterval(function () {
      for (var k = 0; k < per && n < cells.length; k++, n++) {
        G.cell[cells[n]] = VOID;
        G.tint[cells[n]] = 0;
      }
      G.dirty = true;
      if (n >= cells.length) {
        clearInterval(t2);
        G.cell[keep] = LIGHT; G.tint[keep] = 1; G.dirty = true;
        G.mark = { x: cx, y: cy };
        setTimeout(function () {
          overlay('<div class="big">' + t("s10_a_big") + '</div>' +
                  '<div class="mid">' + t("s10_a_mid") + '</div>' +
                  '<div class="sm">' + t("s10_a_sm") + '</div>', "soft");
          finish();
        }, 700);
      }
    }, 52);
  } else {
    /* the world stays exactly as it is; only the hand leaves. The zoom class
       stays on so the pull-back is animated — removing it would drop the
       transition and the camera would snap. */
    setTimeout(function () { G.mark = null; }, 2000);
    cv.style.transform = "scale(1)";
    overlay('<div class="big">' + t("s10_b_big") + '</div>' +
            '<div class="mid">' + t("s10_b_mid") + '</div>' +
            '<div class="sm">' + t("s10_b_sm") + '</div>', "soft");
    finish();
  }
}

function finish(){
  actRow([
    { label: t("share"), go: shareCard },
    { label: t("s10_again"), cls: "ghost", go: function () { location.reload(); } }
  ]);
  warmCard();
  if (TRACK_ON) setTimeout(function () { track("finish"); }, 400);
}

/* ==========================================================================
   the card
   ========================================================================== */

var CARD = { cv: null, file: null, text: "" };

function lawsLine(){
  if (!G.laws || !G.laws.length) return "";
  var laws = LAWS[LANG], out = [];
  for (var i = 0; i < G.laws.length; i++) out.push(laws[G.laws[i]][0]);
  return out.join(LANG === "en" ? " " : "");
}

function cardSpec(teaser){
  var laws = LAWS[LANG];
  var title, body, quote, stats;
  if (teaser || !G.ending) {
    title = t("card_teaser_title");
    body  = t("card_teaser_body");
    quote = "";
  } else {
    title = t("s9_big") + (LANG === "en" ? " " : "") + t("s9_mid");
    body  = t("card_body");
    if (G.name) body += (LANG === "en" ? " " : "") + tf("card_named_as", { n: G.name });
    quote = t("card_law") + "\u300C" + lawsLine() + "\u300D";
  }
  stats = [
    { k: t("st_world"),   v: Math.round(totalPainted() / (COLS * ROWS) * 100) + "%" },
    { k: t("st_life"),    v: String(G.life.length) },
    { k: t("st_laws"),    v: String((G.laws || []).length) },
    { k: t("st_time"),    v: mmss(Date.now() - G.t0) }
  ];
  return {
    paper: "#f7f4ef", ink: "#191713", accent: "#a8542a", muted: "#8c8478",
    line: "#e2dbcf", panel: "#191713", panelInk: "#f2ece2",
    serif: '"Songti SC","Songti TC","Source Han Serif SC","Noto Serif CJK SC",Georgia,serif',
    sans: '"Segoe UI",Helvetica,"Microsoft YaHei",sans-serif',
    kicker: t("card_kicker"),
    title: title, body: body, stats: stats, quote: quote,
    footer: t("card_footer"),
    mark: function (c, x, y, h) { TRILUMI.path(c, x, y, h, "#a8542a"); }
  };
}

/* Pre-render. navigator.share has to be called inside the same task as the
   tap, and canvas.toBlob is async — so the blob is made in advance and the
   tap handler is synchronous. */
function warmCard(){
  try {
    var spec = cardSpec(!!G.ending ? false : true);
    CARD.cv = TRICARD.draw(spec);
    CARD.text = TRICARD.text(spec);
    CARD.cv.toBlob(function (b) {
      try { CARD.file = new File([b], "create-world.png", { type: "image/png" }); } catch (e) {}
    }, "image/png");
  } catch (e) {}
}

function shareCard(){
  var spec = cardSpec(!!G.ending ? false : true);
  var cvs, txt;
  try { cvs = TRICARD.draw(spec); txt = TRICARD.text(spec); }
  catch (e) { cvs = CARD.cv; txt = CARD.text; }

  track("share", { at: G.ending || "mid" });

  if (CARD.file && navigator.canShare && navigator.canShare({ files: [CARD.file] })) {
    navigator.share({ files: [CARD.file], text: txt }).catch(function () {});
    return;
  }
  TRISHARE.open(cvs, txt, {
    lang: LANG,
    filename: "create-world.png",
    title: t("title"), hint: t("hint"),
    dl: t("dl"), cp: t("cp"), cl: t("cl"), ok: t("ok"), bad: t("bad")
  });
}

/* ==========================================================================
   language, install, boot
   ========================================================================== */

function detectLang(){
  var q = (location.search.match(/[?&]l=(hant|hans|en)/) || [])[1];
  if (q) return q;
  try {
    var s = localStorage.getItem("cw_lang");
    if (s && L[s]) return s;
  } catch (e) {}
  var n = (navigator.language || "en").toLowerCase();
  if (n.indexOf("zh") === 0) return (n.indexOf("hant") >= 0 || n.indexOf("tw") >= 0 ||
                                    n.indexOf("hk") >= 0 || n.indexOf("mo") >= 0) ? "hant" : "hans";
  return "en";
}

function setLang(code, first){
  LANG = L[code] ? code : "en";
  try { localStorage.setItem("cw_lang", LANG); } catch (e) {}
  document.documentElement.lang = L[LANG].lang;
  document.body.className = (LANG === "en") ? "en" : "";

  document.getElementById("gtitle").textContent = t("gtitle");
  document.getElementById("subtitle").textContent = t("subtitle");
  document.getElementById("trishlabel").textContent = t("share");
  document.getElementById("installbtn").textContent = t("install");
  document.title = t("gtitle") + " · " + t("card_title");

  var sw = document.getElementById("langsw").querySelectorAll("button");
  for (var i = 0; i < sw.length; i++) {
    sw[i].className = (sw[i].getAttribute("data-l") === LANG) ? "on" : "";
  }

  renderDaybar();
  renderPalette();
  if (G.stage >= S.DAY1 && G.stage <= S.DAY6) sayGoal();
  else if (G.stage === S.OPEN) say("");
  if (G.stage === S.LAW && panelEl.classList.contains("show")) panelLaw();
}

/* the version tag reads the service worker's own VERSION rather than a string
   typed into the page — a hard-coded one lies the moment you forget to bump it */
(function () {
  if (!/^https?:/.test(location.protocol)) return;
  fetch("sw.js", { cache: "no-store" })
    .then(function (r) { return r.text(); })
    .then(function (x) {
      var m = x.match(/VERSION\s*=\s*"([^"]+)"/);
      if (m) document.getElementById("buildtag").textContent = "build " + m[1];
    })
    .catch(function () {});
})();

/* ------------------------------------------------------------ render loop */

var last = 0;
function loop(now){
  requestAnimationFrame(loop);
  if (now - last < 33) return;         /* ~30fps; this is a painting, not a shooter */
  last = now;
  drawFrame(now);
}

/* ---------------------------------------------------------------- install */

var deferredPrompt = null;
window.addEventListener("beforeinstallprompt", function (e) {
  e.preventDefault();
  deferredPrompt = e;
  document.getElementById("installbtn").hidden = false;
});
document.getElementById("installbtn").hidden = true;
document.getElementById("installbtn").onclick = function () {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  deferredPrompt = null;
  this.hidden = true;
};
window.addEventListener("appinstalled", function () {
  document.getElementById("installbtn").hidden = true;
  track("install");
});

/* ------------------------------------------------------------------- boot */

document.getElementById("trishbtn").onclick = shareCard;
document.getElementById("langsw").onclick = function (e) {
  var b = e.target.closest ? e.target.closest("button") : null;
  if (b && b.getAttribute("data-l")) { setLang(b.getAttribute("data-l")); track("lang", { l: LANG }); }
};
document.getElementById("panel").onclick = function (e) { if (e.target === this) return; };

setLang(detectLang(), true);
renderDaybar();
setStage(S.OPEN);
requestAnimationFrame(loop);
trackFirst("open");

if ("serviceWorker" in navigator && /^https?:/.test(location.protocol)) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("sw.js").catch(function () {});
  });
}
