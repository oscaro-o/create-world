/* ==========================================================================
   造世 · THE MAKER — 4/4a  the seven days
   ========================================================================== */

var frame = document.getElementById("frame");

function setStage(n){
  G.stage = n;
  G.stageDone = false;
  G.brush = null;
  G.dirty = true;

  var painting = (n >= S.DAY1 && n <= S.DAY6);
  frame.classList.toggle("locked", !painting);
  renderDaybar();
  renderPalette();
  if (!painting) say("");        /* or the last day's quota sits under the last act */
  clearActRow();
  hideOverlay();

  if (n === S.OPEN) {
    overlay('<div class="big">' + t("s0_big") + '</div>' +
            '<div class="mid">' + t("s0_mid") + '</div>' +
            '<div class="sm">' + t("s0_sm") + '</div>');
    actRow([{ label: t("s0_btn"), go: function () { trackFirst("start"); setStage(S.DAY1); } }]);
    return;
  }

  if (n === S.LAW) { panelLaw(); return; }
  if (n === S.REST) { runRest(); return; }
  if (n === S.ENTER) { runEnter(); return; }
  if (n === S.END) { return; }

  /* a day of painting: a title card, then the goal in the line below */
  sayGoal();
  overlay('<div class="big">' + t("s" + n + "_big") + '</div>');
  setTimeout(function () { if (G.stage === n) hideOverlay(); }, 1700);
  trackFirst("day" + n);
  if (n === 4) setTimeout(function () { if (G.stage === 4) flashSay("sky"); }, 2200);
}

/* -------------------------------------------------------------- the goal */

function have(k){
  if (k === "life")  return G.life.length;
  if (k === "human") return lifeCount("human");
  if (k === "sun" || k === "moon" || k === "star") return skyCount(k);
  return count(EL[k].terr);
}

function checkGoal(){
  if (G.stage < S.DAY1 || G.stage > S.DAY6 || G.stageDone) return;
  var g = GOAL[G.stage];
  if (!g) return;
  for (var k in g) if (g.hasOwnProperty(k) && have(k) < g[k]) return;
  G.stageDone = true;
  var n = G.stage;
  track("done", { d: n });
  setTimeout(function () { dayDone(n); }, 380);
}

function dayDone(n){
  sayGoal();
  overlay('<div class="big">' + t("s" + n + "_done") + '</div>' +
          '<div class="mid">' + t("s" + n + "_done2") + '</div>');
  actRow([{ label: t("next"), go: function () {
    setStage(n === S.DAY6 ? S.LAW : n + 1);
  } }]);
}

/* called from placeAt, with the element id that was just used */
function afterPlace(id){
  if (id === "fish" || id === "bird" || id === "beast") {
    if (!G.nameOf) panelName();
  } else if (id === "human") {
    if (!G.name && lifeCount("human") === 3) panelAsk();
  }
}

/* ---------------------------------------------------------------- panels */

var panelEl = document.getElementById("panel");
var panelBox = document.getElementById("panelbox");
function openPanel(html){ panelBox.innerHTML = html; panelEl.classList.add("show"); }
function closePanel(){ panelEl.classList.remove("show"); panelBox.innerHTML = ""; }

/* --- the first creature gets a name. This is the only place in the game
   where the player is asked to write something of their own, and it is
   deliberately the smallest, most domestic moment in it. --- */
function panelName(){
  openPanel(
    '<h3>' + t("s5_name_t") + '</h3>' +
    '<p class="lede">' + t("s5_name_l") + '</p>' +
    '<input type="text" id="pin" maxlength="14" autocomplete="off" spellcheck="false" placeholder="' + t("s5_name_ph") + '">' +
    '<div class="row"><button type="button" class="btn" id="pok">' + t("s5_name_btn") + '</button></div>' +
    '<p class="note" id="pnote"></p>'
  );
  var inp = document.getElementById("pin");
  setTimeout(function () { inp.focus(); }, 140);

  function ok(){
    var v = clean(inp.value, 14);
    if (!v) { document.getElementById("pnote").textContent = t("s5_name_ph"); inp.focus(); return; }
    G.nameOf = v;
    if (G.life.length) G.life[G.life.length - 1].n = v;
    closePanel();
    track("named");
    overlay('<div class="big">' + tf("s5_named", { n: v }) + '</div>' +
            '<div class="mid">' + t("s5_named2") + '</div>');
    setTimeout(function () { if (G.stage === S.DAY5) hideOverlay(); }, 2800);
  }
  document.getElementById("pok").onclick = ok;
  inp.addEventListener("keydown", function (e) { if (e.key === "Enter") ok(); });
}

/* --- the humans ask for the player's own name. They get it. The world never
   uses it again, except once, at the very end, as the subject of a sentence
   about a place that does not exist. --- */
function panelAsk(){
  openPanel(
    '<h3>' + t("s6_ask_t") + '</h3>' +
    '<p class="lede">' + t("s6_ask_l") + '</p>' +
    '<input type="text" id="pin" maxlength="14" autocomplete="off" spellcheck="false" placeholder="' + t("s6_ask_ph") + '">' +
    '<div class="row"><button type="button" class="btn" id="pok">' + t("s6_ask_btn") + '</button></div>' +
    '<p class="note" id="pnote"></p>'
  );
  var inp = document.getElementById("pin");
  setTimeout(function () { inp.focus(); }, 140);

  function ok(){
    var v = clean(inp.value, 14);
    if (!v) { document.getElementById("pnote").textContent = t("s6_ask_ph"); inp.focus(); return; }
    G.name = v;
    closePanel();
    track("creator_named");
    overlay('<div class="mid">' + t("s6_ask_note") + '</div>');
    setTimeout(function () { if (G.stage === S.DAY6) hideOverlay(); }, 2400);
  }
  document.getElementById("pok").onclick = ok;
  inp.addEventListener("keydown", function (e) { if (e.key === "Enter") ok(); });
}

/* --- the laws. Six sentences, all of them blessings, three of them load
   bearing. The player picks the three they like the sound of, and the world
   will quote them back at the end. --- */
var lawPicks = [];
function panelLaw(){
  lawPicks = [];
  var laws = LAWS[LANG];
  var h = '<h3>' + t("s7_big") + '</h3><p class="lede">' + t("s7_lede") + '</p><div class="laws">';
  for (var i = 0; i < laws.length; i++) {
    h += '<button type="button" class="law" data-i="' + i + '">' +
         '<span class="idx">' + (i + 1) + '.</span>' + laws[i][0] +
         '<span class="gloss">' + laws[i][1] + '</span></button>';
  }
  h += '</div><div class="row"><button type="button" class="btn" id="pok" disabled>' + t("s7_btn") + '</button>' +
       '<span class="note" id="pnote" style="align-self:center"></span></div>';
  openPanel(h);

  var btns = panelBox.querySelectorAll(".law");
  function refresh(){
    document.getElementById("pnote").textContent = tf("s7_pick", { n: lawPicks.length });
    document.getElementById("pok").disabled = lawPicks.length !== 3;
    for (var j = 0; j < btns.length; j++) {
      btns[j].className = "law" + (lawPicks.indexOf(+btns[j].getAttribute("data-i")) >= 0 ? " on" : "");
    }
  }
  for (var j = 0; j < btns.length; j++) {
    btns[j].onclick = function () {
      var i = +this.getAttribute("data-i"), at = lawPicks.indexOf(i);
      if (at >= 0) lawPicks.splice(at, 1);
      else if (lawPicks.length < 3) lawPicks.push(i);
      refresh();
    };
  }
  refresh();

  document.getElementById("pok").onclick = function () {
    if (lawPicks.length !== 3) return;
    G.laws = lawPicks.slice().sort(function (a, b) { return a - b; });
    closePanel();
    track("laws", { a: G.laws[0], b: G.laws[1], c: G.laws[2] });
    overlay('<div class="big">' + t("s7_note") + '</div>');
    setTimeout(function () { hideOverlay(); setStage(S.REST); }, 2200);
  };
}
