/* Play the whole game in a real browser, from 起初 to the ending.
 *
 * A painting game cannot be verified by reading the source: the brush rules,
 * the frontier growth in 第七日 and the "every cell is taken" claim in the last
 * act are all things that are either true on screen or not true at all. So this
 * drives the actual UI — real pointer events on the real canvas — and asserts
 * on the game's own state at each step.
 *
 *   node _build/play.js [lang] [ending]
 *   node _build/play.js hant a      # 繁體, destroy the world
 *   node _build/play.js en b        # English, walk away
 */
const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright-core");

const LANG = process.argv[2] || "hant";
const ENDING = process.argv[3] || "b";
const NARROW = process.argv[4] === "narrow";
const CHROME = "C:/Users/oscar/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe";
const PAGE = "file:///" + path.resolve(__dirname, "../index.html").replace(/\\/g, "/") + "?l=" + LANG;
const SHOTS = path.resolve(__dirname, "shots");
fs.mkdirSync(SHOTS, { recursive: true });

let fails = 0;
function ok(cond, msg, extra) {
  console.log((cond ? "  ok    " : "  FAIL  ") + msg + (extra === undefined ? "" : "   " + extra));
  if (!cond) fails++;
}

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME });
  const page = await browser.newPage({ viewport: NARROW ? { width: 390, height: 844 } : { width: 1180, height: 940 }, deviceScaleFactor: 1 });

  const errors = [];
  page.on("pageerror", e => errors.push("pageerror: " + e.message));
  page.on("console", m => { if (m.type() === "error") errors.push("console: " + m.text()); });

  await page.goto(PAGE);
  await page.waitForTimeout(700);

  /* --- geometry helpers, in canvas fractions ---------------------------- */
  const rect = await page.evaluate(() => {
    const r = document.getElementById("cv").getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  const P = (fx, fy) => ({ x: rect.x + rect.w * fx, y: rect.y + rect.h * fy });

  async function drag(a, b, steps) {
    const p1 = P(a[0], a[1]), p2 = P(b[0], b[1]);
    await page.mouse.move(p1.x, p1.y);
    await page.mouse.down();
    for (let i = 1; i <= (steps || 10); i++) {
      await page.mouse.move(p1.x + (p2.x - p1.x) * i / steps, p1.y + (p2.y - p1.y) * i / steps);
    }
    await page.mouse.up();
    await page.waitForTimeout(60);
  }
  async function tap(fx, fy) {
    const p = P(fx, fy);
    await page.mouse.move(p.x, p.y);
    await page.mouse.down(); await page.mouse.up();
    await page.waitForTimeout(90);
  }
  const state = () => page.evaluate(() => ({
    stage: G.stage, life: G.life.length, sky: G.sky.length,
    painted: totalPainted(), total: COLS * ROWS,
    light: count(1), water: count(2), earth: count(3), plant: count(4),
    name: G.name, nameOf: G.nameOf, laws: G.laws.length, mark: !!G.mark
  }));
  const shot = n => page.screenshot({ path: path.join(SHOTS, n + ".png") });
  const btn = async (text) => {
    const b = page.locator("#actrow button", { hasText: text });
    await b.first().click();
    await page.waitForTimeout(200);
  };

  console.log("\n── 起初 ─────────────────────────────────────────");
  let s = await state();
  ok(s.stage === 0, "opens on 起初", "stage=" + s.stage);
  ok(await page.locator("#overlay.show").count() === 1, "the opening card is up");
  ok(await page.locator("#trishbtn").isVisible(), "share button visible before playing");
  await shot("01-open");

  await btn(await page.evaluate(() => t("s0_btn")));
  s = await state();
  ok(s.stage === 1, "start button moves to 第一日");

  /* --- 第一日 · light --------------------------------------------------- */
  console.log("\n── 第一日 · 分光 ────────────────────────────────");
  for (let i = 0; i < 14; i++) {
    await drag([0.06 + i * 0.065, 0.12], [0.06 + i * 0.065, 0.9], 8);
  }
  s = await state();
  ok(s.light >= 114, "light reaches the day-one quota", s.light + " cells");
  await page.waitForTimeout(700);
  ok(await page.locator("#actrow button").count() > 0, "day-one card offers Continue");
  await shot("02-day1");
  await btn(await page.evaluate(() => t("next")));

  /* --- 第二日 · water + earth ------------------------------------------ */
  console.log("\n── 第二日 · 水土 ────────────────────────────────");
  await page.evaluate(() => { G.brush = "water"; renderPalette(); });
  for (let i = 0; i < 6; i++) await drag([0.1 + i * 0.05, 0.34], [0.24 + i * 0.05, 0.78], 8);
  await page.evaluate(() => { G.brush = "earth"; renderPalette(); });
  for (let i = 0; i < 8; i++) await drag([0.44 + i * 0.06, 0.28], [0.5 + i * 0.06, 0.88], 8);
  s = await state();
  ok(s.water >= 69 && s.earth >= 92, "water and earth both reach quota",
     "water=" + s.water + " earth=" + s.earth);
  await page.waitForTimeout(700);
  await btn(await page.evaluate(() => t("next")));

  /* --- 第三日 · plants -------------------------------------------------- */
  console.log("\n── 第三日 · 草木 ────────────────────────────────");
  for (let i = 0; i < 10; i++) await drag([0.42 + i * 0.05, 0.3], [0.46 + i * 0.05, 0.86], 8);
  s = await state();
  ok(s.plant >= 92, "plants reach quota", s.plant + " cells");
  /* the rule under test is "plants never take hold on bare void or bare light".
     Counting plants against earth would fail here for the right reason —
     painting a plant turns the earth under it into a plant — so the rule is
     probed directly instead. */
  const rule = await page.evaluate(() => {
    let vx = -1, vy = -1, lx = -1, ly = -1;
    for (let y = 0; y < ROWS && vx < 0; y++) for (let x = 0; x < COLS; x++) {
      if (G.cell[idx(x, y)] === VOID) { vx = x; vy = y; break; }
    }
    for (let y = 0; y < ROWS && lx < 0; y++) for (let x = 0; x < COLS; x++) {
      if (G.cell[idx(x, y)] === LIGHT) { lx = x; ly = y; break; }
    }
    const before = count(PLANT);
    if (vx >= 0) stroke(PLANT, (vx + 0.5) * CELL_W, (vy + 0.5) * CELL_H, 30);
    if (lx >= 0) stroke(PLANT, (lx + 0.5) * CELL_W, (ly + 0.5) * CELL_H, 30);
    const afterBarren = count(PLANT);
    /* and it does take hold on water, as kelp */
    let wx = -1, wy = -1, kelp = 0;
    for (let y = 0; y < ROWS && wx < 0; y++) for (let x = 0; x < COLS; x++) {
      if (G.cell[idx(x, y)] === WATER) { wx = x; wy = y; break; }
    }
    stroke(PLANT, (wx + 0.5) * CELL_W, (wy + 0.5) * CELL_H, 40);
    for (let i = 0; i < G.cell.length; i++) if (G.cell[i] === PLANT && G.tint[i] === 1) kelp++;
    return {
      before, afterBarren, kelp,
      voidHeld: vx < 0 || G.cell[idx(vx, vy)] === VOID,
      lightHeld: lx < 0 || G.cell[idx(lx, ly)] === LIGHT
    };
  });
  ok(rule.afterBarren === rule.before && rule.voidHeld && rule.lightHeld,
     "plants refuse bare void and bare light", JSON.stringify(rule));
  ok(rule.kelp > 0, "the same brush makes kelp when it lands on water", rule.kelp + " kelp cells");
  await page.waitForTimeout(700);
  await btn(await page.evaluate(() => t("next")));

  /* --- 第四日 · lights -------------------------------------------------- */
  console.log("\n── 第四日 · 光體 ────────────────────────────────");
  await page.evaluate(() => { G.brush = "sun"; renderPalette(); });
  await tap(0.24, 0.13);
  await page.evaluate(() => { G.brush = "moon"; renderPalette(); });
  await tap(0.74, 0.13);
  await page.evaluate(() => { G.brush = "star"; renderPalette(); });
  for (const x of [0.4, 0.5, 0.6]) await tap(x, 0.07);
  s = await state();
  ok(s.sky === 5, "sun, moon and three stars are hung", "sky=" + s.sky);
  await tap(0.5, 0.8);
  s = await state();
  ok(s.sky === 5, "a light cannot be hung below the sky band", "sky=" + s.sky);
  await page.waitForTimeout(700);
  await shot("03-day4");
  await btn(await page.evaluate(() => t("next")));

  /* --- 第五日 · creatures, and the first name -------------------------- */
  console.log("\n── 第五日 · 眾生 ────────────────────────────────");
  await page.evaluate(() => { G.brush = "fish"; renderPalette(); });
  await tap(0.16, 0.5);
  await page.waitForTimeout(400);
  ok(await page.locator("#panel.show").count() === 1, "naming panel opens on the first creature");
  await shot("04-naming");
  await page.fill("#pin", "阿灰");
  await page.click("#pok");
  await page.waitForTimeout(500);
  s = await state();
  ok(s.nameOf === "阿灰", "the creature keeps the name the player gave it", s.nameOf);
  ok(await page.locator("#panel.show").count() === 0, "naming panel closes");
  /* fish only in the water band painted on day two, beasts only on land */
  for (const [x, y] of [[0.26, 0.45], [0.34, 0.6]]) await tap(x, y);
  const wrongHome = await state();
  ok(wrongHome.life === 3, "two more fish find the water", "life=" + wrongHome.life);
  await page.evaluate(() => { G.brush = "beast"; renderPalette(); });
  await tap(0.2, 0.05);                      /* deep sky — beyond the two-cell
                                                snap, so this is the rule itself
                                                being tested, not the aim */
  ok((await state()).life === 3, "a beast cannot stand where there is no land");
  await tap(0.62, 0.42);
  await tap(0.72, 0.5);
  await page.evaluate(() => { G.brush = "bird"; renderPalette(); });
  await tap(0.55, 0.22);
  s = await state();
  ok(s.life >= 6, "six living things are made", "life=" + s.life);
  await page.waitForTimeout(700);
  await btn(await page.evaluate(() => t("next")));

  /* --- 第六日 · people, and the creator's own name --------------------- */
  console.log("\n── 第六日 · 造人 ────────────────────────────────");
  await page.evaluate(() => { G.brush = "human"; renderPalette(); });
  /* where people may actually stand, read off the world rather than guessed.
     Spots are kept at least three cells apart: the canvas is displayed at a
     fractional scale, so two taps on neighbouring cells can round to the same
     one — which is a harness artefact, not a game bug. */
  const spots = await page.evaluate(() => {
    const out = [];
    for (let y = 0; y < ROWS && out.length < 6; y++)
      for (let x = 0; x < COLS && out.length < 6; x++) {
        const c = G.cell[idx(x, y)];
        if (c !== EARTH && c !== PLANT) continue;
        if (G.life.some(o => o.x === x && o.y === y)) continue;
        if (out.some(p => Math.abs(p[0] - x) < 3 && Math.abs(p[1] - y) < 3)) continue;
        out.push([x, y]);
      }
    return out.map(([x, y]) => [(x + 0.5) / COLS, (y + 0.5) / ROWS]);
  });
  ok(spots.length >= 5, "there is ground for people to stand on", spots.length + " cells");
  await tap(0.5, 0.02);                       /* bare sky: refused */
  ok((await state()).life === 6, "a person cannot be placed in the empty sky");
  await tap(spots[0][0], spots[0][1]);
  await tap(spots[1][0], spots[1][1]);
  await tap(spots[2][0], spots[2][1]);
  await page.waitForTimeout(400);
  ok(await page.locator("#panel.show").count() === 1, "the world asks for the maker's name");
  await shot("05-who-are-you");
  await page.fill("#pin", "O");
  await page.click("#pok");
  await page.waitForTimeout(500);
  s = await state();
  ok(s.name === "O", "the maker's name is kept", s.name);
  await tap(spots[3][0], spots[3][1]);
  await tap(spots[4][0], spots[4][1]);
  s = await state();
  ok(s.life >= 11, "five people are placed", "life=" + s.life);
  await page.waitForTimeout(700);
  await btn(await page.evaluate(() => t("next")));

  /* --- 立法 ------------------------------------------------------------- */
  console.log("\n── 立法 ─────────────────────────────────────────");
  await page.waitForTimeout(300);
  ok(await page.locator("#panel.show").count() === 1, "the law panel opens");
  ok(await page.locator(".law").count() === 6, "six laws are offered");
  ok(await page.locator("#pok").isDisabled(), "the law panel starts unconfirmed");
  await shot("06-laws");
  for (const i of [0, 2, 5]) await page.locator('.law[data-i="' + i + '"]').click();
  ok(!(await page.locator("#pok").isDisabled()), "three picks enable the confirm button");
  await page.click("#pok");
  await page.waitForTimeout(400);
  s = await state();
  ok(s.laws === 3, "three laws are written", "laws=" + s.laws);
  ok(await page.locator("#panel.show").count() === 0, "the law panel closes");

  /* --- 第七日 · the world finishes itself ------------------------------ */
  console.log("\n── 第七日 · 安息 ────────────────────────────────");
  await page.waitForTimeout(2500);
  await shot("07-rest-mid");
  await page.waitForFunction(() => G.cell.every(c => c !== 0), null, { timeout: 60000 });
  s = await state();
  ok(s.painted === s.total, "the world completes itself — no cell left void",
     s.painted + "/" + s.total);
  ok(s.life > 11, "life spreads on its own while it rests", "life=" + s.life);
  await page.waitForTimeout(1400);
  await shot("08-rest-done");

  /* --- 入世 ------------------------------------------------------------- */
  console.log("\n── 入世 ─────────────────────────────────────────");
  await btn(await page.evaluate(() => t("s8_btn")));
  await page.waitForTimeout(2600);
  ok((await state()).stage === 9, "the game moves into 入世");
  ok((await state()).mark, "the maker's token exists");
  await shot("09-enter");
  /* the claim under test: whatever cell the token is dragged onto, the world
     answers with an occupant, never with a vacancy */
  const vac = await page.evaluate(async () => {
    let empty = 0, seen = {};
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const o = occupantAt(x, y);
      if (!o) empty++; else seen[o] = (seen[o] || 0) + 1;
    }
    return { empty, seen };
  });
  ok(vac.empty === 0, "not one cell in the world is vacant", JSON.stringify(vac.seen));
  await drag([0.3, 0.4], [0.7, 0.6], 12);
  await page.waitForTimeout(300);
  const said = await page.locator("#say").innerText();
  ok(/(此處|此处|here)/.test(said), "the world names what is standing under the token", said.trim());
  await shot("10-token-moved");
  await page.waitForTimeout(3000);
  await btn(await page.evaluate(() => t("s9_skip")));
  await page.waitForTimeout(1200);
  await shot("11-the-line");
  await page.waitForTimeout(3200);

  /* --- the ending ------------------------------------------------------- */
  console.log("\n── 終 ──────────────────────────────────────────");
  const label = await page.evaluate(e => t(e === "a" ? "s10_a" : "s10_b"), ENDING);
  await btn(label);
  await page.waitForTimeout(ENDING === "a" ? 4200 : 2000);
  s = await state();
  ok(s.stage === 10, "the game reaches its ending");
  if (ENDING === "a") {
    ok(s.painted === 1, "everything returns to the void except one cell", s.painted + " cell left");
  } else {
    ok(s.painted === s.total, "the world is left whole", s.painted + "/" + s.total);
  }
  await shot("12-ending-" + ENDING);

  /* --- the card --------------------------------------------------------- */
  await page.waitForTimeout(600);
  const cardOk = await page.evaluate(() => {
    const spec = cardSpec(false);
    const c = TRICARD.draw(spec);
    return { w: c.width, h: c.height, quote: spec.quote, title: spec.title };
  });
  ok(cardOk.w === 1080 && cardOk.h >= 900, "the share card renders at 1080 wide",
     cardOk.w + "x" + cardOk.h);
  ok(cardOk.quote.indexOf("。") > 0 || cardOk.quote.indexOf(".") > 0,
     "the card quotes the player's own law back at them", cardOk.quote.slice(0, 60));
  await page.evaluate(() => { const c = TRICARD.draw(cardSpec(false)); document.body.appendChild(c); c.style.cssText = "position:fixed;left:-9999px"; });
  const cardEl = await page.evaluate(() => {
    const c = TRICARD.draw(cardSpec(false));
    const url = c.toDataURL("image/png");
    const img = document.createElement("img");
    img.id = "cardimg"; img.src = url;
    img.style.cssText = "position:fixed;left:0;top:0;width:540px;z-index:999999;border:1px solid #333";
    document.body.appendChild(img);
    return url.length;
  });
  ok(cardEl > 20000, "the card encodes to a real PNG", cardEl + " bytes of dataURL");
  await page.waitForTimeout(500);
  await shot("13-card");

  console.log("\n── console ─────────────────────────────────────");
  if (errors.length) { errors.forEach(e => console.log("  " + e)); fails++; }
  else console.log("  ok    no page errors, no console errors");

  await browser.close();
  console.log("\n" + (fails ? fails + " FAILED" : "all checks passed") + "\n");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error("HARNESS CRASH:", e); process.exit(2); });
