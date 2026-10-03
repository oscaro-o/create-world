/* ==========================================================================
   造世 · THE MAKER — 1/4  constants, text, state
   --------------------------------------------------------------------------
   The whole game is one canvas and one stage machine. Nothing is random:
   every jitter, every tuft of grass, every star position is derived from a
   hash of the cell coordinate, so the world looks the same after a repaint
   and the same on every device. A world that reshuffles itself when you
   scroll is not a world.
   ========================================================================== */

/* The world is shaped to the screen: a landscape window on a desktop, a
   portrait one on a phone. A 44-column grid inside 330 CSS pixels puts a
   person in a cell seven pixels wide, which is not something a thumb can hit —
   and the first day of creation should not be a precision exercise. */
var NARROW = (typeof window !== "undefined") && window.innerWidth < 700;
var COLS = NARROW ? 30 : 44;
var ROWS = NARROW ? 40 : 26;
var CW = NARROW ? 660 : 880;
var CH = Math.round(CW * ROWS / COLS);
var CELL_W = CW / COLS, CELL_H = CH / ROWS;

/* terrain, in the order it can appear. VOID is the only one you cannot paint. */
var VOID = 0, LIGHT = 1, WATER = 2, EARTH = 3, PLANT = 4;

/* how much of the canvas is "sky" — the band where 日 月 星 may hang */
var SKY = 0.30;

/* a stage is: what you may paint, how much of it, and what it says */
var S = {
  OPEN: 0, DAY1: 1, DAY2: 2, DAY3: 3, DAY4: 4, DAY5: 5, DAY6: 6,
  LAW: 7, REST: 8, ENTER: 9, END: 10
};

var TRACK_ON = /(^|\.)trilumi\.xyz$/.test(location.hostname);
var TRACK_URL = "/_e/p.gif";

/* ==========================================================================
   text — 繁體 / 简体 / English. Written as three parallel blocks rather than
   one keyed object, because a translator reads a column, not a dictionary.
   ========================================================================== */
var L = {
hant: {
  lang:"zh-Hant",
  gtitle:"造世", subtitle:"七日造物 · 一場",
  share:"分享", install:"裝到桌面",
  days:["起初","一","二","三","四","五","六","七"],

  s0_big:"起初",
  s0_mid:"地是空虛混沌，淵面黑暗。",
  s0_sm:"沒有形狀。沒有光。沒有你。",
  s0_btn:"你來造",

  el_light:"光", el_water:"水", el_earth:"土", el_plant:"草木",
  el_fish:"魚", el_bird:"鳥", el_beast:"獸", el_human:"人",
  el_sun:"日", el_moon:"月", el_star:"星",
  el_hint:"選一樣，在世界上畫。",

  s1_big:"第一日 · 分光",
  s1_say:"在黑暗上畫出光。這是世界的第一層。",
  s1_need:"光",
  s1_done:"有晚上，有早晨。",
  s1_done2:"你稱光為晝，稱暗為夜。這是第一日。",

  s2_big:"第二日 · 分水與土",
  s2_say:"水要聚在一處，旱地要露出來。兩種都要有。",
  s2_need:"水與土",
  s2_done:"你看見了地，也看見了海。",
  s2_done2:"你稱旱地為地，稱水的聚處為海。這是第二日。",

  s3_big:"第三日 · 草木",
  s3_say:"草木只長在土上。畫在水上的，會變成藻。",
  s3_need:"草木",
  s3_done:"地長出青草、菜蔬，和結果子的樹。",
  s3_done2:"各從其類，果子都包著核。這是第三日。",

  s4_big:"第四日 · 光體",
  s4_say:"在上方掛起日、月、星辰。你放的光體，會改變整個世界的顏色。",
  s4_need:"光體",
  s4_rule:"日 1 · 月 1 · 星 5",
  s4_done:"光體要在天空，普照於地。",
  s4_done2:"大的管晝，小的管夜，還有眾星。這是第四日。",

  s5_big:"第五日 · 眾生",
  s5_say:"魚只在水裡，鳥在天上，獸只在陸上。造一隻，然後給牠名字。",
  s5_need:"活物",
  s5_name_t:"給牠一個名字。",
  s5_name_l:"你造了牠。現在，叫牠。",
  s5_name_ph:"牠的名字",
  s5_name_btn:"命名",
  s5_named:"牠叫「{n}」。",
  s5_named2:"從此，世界裡有了一樣你叫得出名字的東西。",
  s5_done:"水滋生生命，鳥飛在地面以上。",
  s5_done2:"各從其類，你都看著是好的。這是第五日。",

  s6_big:"第六日 · 造人",
  s6_say:"地要生出人來。放在土上，或草木之間。",
  s6_need:"人",
  s6_ask_t:"他們抬起頭，問：你是誰？",
  s6_ask_l:"世界第一次向你說話。它在問你的名字。",
  s6_ask_ph:"你的名字",
  s6_ask_btn:"回答",
  s6_ask_note:"你答了。他們記住了。",
  s6_done:"你照著自己的樣子造了他們。",
  s6_done2:"你看一切所造的，都甚好。這是第六日。",

  s7_big:"立法",
  s7_say:"世界已經成形。現在給它規矩——它會永遠守著。",
  s7_lede:"選三條。世界會照做。",
  s7_pick:"已選 {n}/3",
  s7_btn:"就這樣",
  s7_note:"這些話會刻在世界裡，比石頭久。",

  s8_big:"第七日 · 安息",
  s8_say:"你停手了。世界開始自己運轉。",
  s8_done:"天地萬物都造齊了。",
  s8_done2:"第七日，你歇了工。",
  s8_btn:"入世",

  s9_big:"你親手創造世界。",
  s9_mid:"可這世界，沒有你的位置。",
  s9_reach:"你伸出手。",
  s9_try:"每一格都已經有人了。",
  s9_skip:"看夠了",

  s10_ask:"你要怎麼辦？",
  s10_a:"毀了它，換一個位置",
  s10_b:"留下它，站在外面",
  s10_a_big:"你有了位置。",
  s10_a_mid:"世界沒有了。",
  s10_a_sm:"你造了一整座世界，只是為了給自己騰出一個格子。",
  s10_b_big:"世界繼續運轉。",
  s10_b_mid:"它不需要你。",
  s10_b_sm:"它會記得你——以一個名字，寫在沒有人讀的地方。",
  s10_again:"再造一次",
  next:"繼續",
  card_teaser_title:"造世 · 七日造物",
  card_teaser_body:"你在虛空上畫光、畫水、畫土，造活物，給世界立規矩。七日之後，你要找一個位置——自己的位置。",
  card_named_as:"世界記得你叫「{n}」。",

  occ_light:"此處有光", occ_water:"此處有水", occ_earth:"此處有土",
  occ_plant:"此處有草木", occ_fish:"此處有魚", occ_bird:"此處有鳥",
  occ_beast:"此處有獸", occ_human:"此處有人",
  occ_sun:"此處有日", occ_moon:"此處有月", occ_star:"此處有星",
  you:"你",

  st_world:"世界", st_life:"活物", st_names:"命名", st_laws:"立法",
  st_time:"所費", st_painted:"已造",
  card_kicker:"造世 · 七日",
  card_title:"你親手創造世界，可這世界沒有你位置",
  card_body:"七日之內，你在虛空上畫出光、水、土、草木，掛起日月星辰，造了魚鳥獸與人，給世界留下三條規矩。然後你找自己的位置——一格也沒有。",
  card_law:"你寫下：",
  card_footer:"academy.trilumi.xyz",
  ok:"已複製", bad:"複製失敗，請手動選取。",
  title:"你的結果卡片", hint:"長按圖片儲存，或點下面的下載。",
  dl:"下載圖片", cp:"複製文字", cl:"關閉"
},
hans: {
  lang:"zh-Hans",
  gtitle:"造世", subtitle:"七日造物 · 一场",
  share:"分享", install:"装到桌面",
  days:["起初","一","二","三","四","五","六","七"],

  s0_big:"起初",
  s0_mid:"地是空虚混沌，渊面黑暗。",
  s0_sm:"没有形状。没有光。没有你。",
  s0_btn:"你来造",

  el_light:"光", el_water:"水", el_earth:"土", el_plant:"草木",
  el_fish:"鱼", el_bird:"鸟", el_beast:"兽", el_human:"人",
  el_sun:"日", el_moon:"月", el_star:"星",
  el_hint:"选一样，在世界上画。",

  s1_big:"第一日 · 分光",
  s1_say:"在黑暗上画出光。这是世界的第一层。",
  s1_need:"光",
  s1_done:"有晚上，有早晨。",
  s1_done2:"你称光为昼，称暗为夜。这是第一日。",

  s2_big:"第二日 · 分水与土",
  s2_say:"水要聚在一处，旱地要露出来。两种都要有。",
  s2_need:"水与土",
  s2_done:"你看见了地，也看见了海。",
  s2_done2:"你称旱地为地，称水的聚处为海。这是第二日。",

  s3_big:"第三日 · 草木",
  s3_say:"草木只长在土上。画在水上的，会变成藻。",
  s3_need:"草木",
  s3_done:"地长出青草、菜蔬，和结果子的树。",
  s3_done2:"各从其类，果子都包着核。这是第三日。",

  s4_big:"第四日 · 光体",
  s4_say:"在上方挂起日、月、星辰。你放的光体，会改变整个世界的颜色。",
  s4_need:"光体",
  s4_rule:"日 1 · 月 1 · 星 5",
  s4_done:"光体要在天空，普照于地。",
  s4_done2:"大的管昼，小的管夜，还有众星。这是第四日。",

  s5_big:"第五日 · 众生",
  s5_say:"鱼只在水里，鸟在天上，兽只在陆上。造一只，然后给它名字。",
  s5_need:"活物",
  s5_name_t:"给它一个名字。",
  s5_name_l:"你造了它。现在，叫它。",
  s5_name_ph:"它的名字",
  s5_name_btn:"命名",
  s5_named:"它叫「{n}」。",
  s5_named2:"从此，世界里有了一个你叫得出名字的东西。",
  s5_done:"水滋生生命，鸟飞在地面以上。",
  s5_done2:"各从其类，你都看着是好的。这是第五日。",

  s6_big:"第六日 · 造人",
  s6_say:"地要生出人来。放在土上，或草木之间。",
  s6_need:"人",
  s6_ask_t:"他们抬起头，问：你是谁？",
  s6_ask_l:"世界第一次向你说话。它在问你的名字。",
  s6_ask_ph:"你的名字",
  s6_ask_btn:"回答",
  s6_ask_note:"你答了。他们记住了。",
  s6_done:"你照着自己的样子造了他们。",
  s6_done2:"你看一切所造的，都甚好。这是第六日。",

  s7_big:"立法",
  s7_say:"世界已经成形。现在给它规矩——它会永远守着。",
  s7_lede:"选三条。世界会照做。",
  s7_pick:"已选 {n}/3",
  s7_btn:"就这样",
  s7_note:"这些话会刻在世界里，比石头久。",

  s8_big:"第七日 · 安息",
  s8_say:"你停手了。世界开始自己运转。",
  s8_done:"天地万物都造齐了。",
  s8_done2:"第七日，你歇了工。",
  s8_btn:"入世",

  s9_big:"你亲手创造世界。",
  s9_mid:"可这世界，没有你的位置。",
  s9_reach:"你伸出手。",
  s9_try:"每一格都已经有人了。",
  s9_skip:"看够了",

  s10_ask:"你要怎么办？",
  s10_a:"毁了它，换一个位置",
  s10_b:"留下它，站在外面",
  s10_a_big:"你有了位置。",
  s10_a_mid:"世界没有了。",
  s10_a_sm:"你造了一整座世界，只是为了给自己腾出一个格子。",
  s10_b_big:"世界继续运转。",
  s10_b_mid:"它不需要你。",
  s10_b_sm:"它会记得你——以一个名字，写在没有人读的地方。",
  s10_again:"再造一次",
  next:"继续",
  card_teaser_title:"造世 · 七日造物",
  card_teaser_body:"你在虚空上画光、画水、画土，造活物，给世界立规矩。七日之后，你要找一个位置——自己的位置。",
  card_named_as:"世界记得你叫「{n}」。",

  occ_light:"此处有光", occ_water:"此处有水", occ_earth:"此处有土",
  occ_plant:"此处有草木", occ_fish:"此处有鱼", occ_bird:"此处有鸟",
  occ_beast:"此处有兽", occ_human:"此处有人",
  occ_sun:"此处有日", occ_moon:"此处有月", occ_star:"此处有星",
  you:"你",

  st_world:"世界", st_life:"活物", st_names:"命名", st_laws:"立法",
  st_time:"所费", st_painted:"已造",
  card_kicker:"造世 · 七日",
  card_title:"你亲手创造世界，可这世界没有你位置",
  card_body:"七日之内，你在虚空上画出光、水、土、草木，挂起日月星辰，造了鱼鸟兽与人，给世界留下三条规矩。然后你找自己的位置——一格也没有。",
  card_law:"你写下：",
  card_footer:"academy.trilumi.xyz",
  ok:"已复制", bad:"复制失败，请手动选取。",
  title:"你的结果卡片", hint:"长按图片保存，或点下面的下载。",
  dl:"下载图片", cp:"复制文字", cl:"关闭"
},
en: {
  lang:"en",
  gtitle:"THE MAKER", subtitle:"seven days of making",
  share:"Share", install:"Install",
  days:["Before","1","2","3","4","5","6","7"],

  s0_big:"IN THE BEGINNING",
  s0_mid:"The earth was formless and void, and darkness was over the deep.",
  s0_sm:"No shape. No light. No you.",
  s0_btn:"Make it",

  el_light:"Light", el_water:"Water", el_earth:"Earth", el_plant:"Plants",
  el_fish:"Fish", el_bird:"Bird", el_beast:"Beast", el_human:"Human",
  el_sun:"Sun", el_moon:"Moon", el_star:"Star",
  el_hint:"Pick one, then paint the world.",

  s1_big:"Day One · Light",
  s1_say:"Paint light onto the dark. This is the world's first layer.",
  s1_need:"light",
  s1_done:"There was evening, and there was morning.",
  s1_done2:"You called the light day, and the darkness night. The first day.",

  s2_big:"Day Two · Water and Earth",
  s2_say:"Let the waters be gathered, and let dry land appear. You need both.",
  s2_need:"water and earth",
  s2_done:"You saw the land, and you saw the sea.",
  s2_done2:"You called the dry land earth, and the gathered waters seas. The second day.",

  s3_big:"Day Three · Plants",
  s3_say:"Plants grow only on earth. Painted on water, they become kelp.",
  s3_need:"plants",
  s3_done:"The earth brought forth grass, and herbs, and trees bearing fruit.",
  s3_done2:"Each after its kind, with seed in itself. The third day.",

  s4_big:"Day Four · Lights",
  s4_say:"Hang sun, moon and stars above. The lights you place change the colour of the whole world.",
  s4_need:"lights",
  s4_rule:"sun 1 · moon 1 · stars 5",
  s4_done:"Let there be lights in the sky, to give light upon the earth.",
  s4_done2:"The greater for the day, the lesser for the night, and the stars also. The fourth day.",

  s5_big:"Day Five · Living Things",
  s5_say:"Fish only in water, birds in the air, beasts only on land. Make one — then give it a name.",
  s5_need:"creatures",
  s5_name_t:"Give it a name.",
  s5_name_l:"You made it. Now call it.",
  s5_name_ph:"its name",
  s5_name_btn:"Name it",
  s5_named:"Its name is \u201C{n}\u201D.",
  s5_named2:"Now the world holds one thing you can call by name.",
  s5_done:"The waters brought forth life, and birds flew above the earth.",
  s5_done2:"Each after its kind, and you saw that it was good. The fifth day.",

  s6_big:"Day Six · Humankind",
  s6_say:"Let the earth bring forth people. Place them on earth, or among the plants.",
  s6_need:"people",
  s6_ask_t:"They look up and ask: who are you?",
  s6_ask_l:"For the first time, the world speaks to you. It is asking for your name.",
  s6_ask_ph:"your name",
  s6_ask_btn:"Answer",
  s6_ask_note:"You answered. They remembered.",
  s6_done:"You made them in your own image.",
  s6_done2:"You looked at everything you had made, and it was very good. The sixth day.",

  s7_big:"Laws",
  s7_say:"The world has taken shape. Now give it rules — it will keep them forever.",
  s7_lede:"Choose three. The world will obey.",
  s7_pick:"{n} of 3 chosen",
  s7_btn:"That is all",
  s7_note:"These words will be cut into the world, and outlast stone.",

  s8_big:"Day Seven · Rest",
  s8_say:"You stopped. The world began to run itself.",
  s8_done:"The heavens and the earth were finished, and all their host.",
  s8_done2:"On the seventh day, you rested from your work.",
  s8_btn:"Enter",

  s9_big:"You made this world with your own hands.",
  s9_mid:"And this world has no place for you.",
  s9_reach:"You reach out.",
  s9_try:"Every cell is already taken.",
  s9_skip:"Enough",

  s10_ask:"What will you do?",
  s10_a:"Destroy it, and take a place",
  s10_b:"Leave it, and stand outside",
  s10_a_big:"You have a place.",
  s10_a_mid:"There is no world.",
  s10_a_sm:"You built an entire world just to clear one cell for yourself.",
  s10_b_big:"The world keeps turning.",
  s10_b_mid:"It does not need you.",
  s10_b_sm:"It will remember you \u2014 as a name, written where nobody reads.",
  s10_again:"Make another",
  next:"Continue",
  card_teaser_title:"THE MAKER · seven days",
  card_teaser_body:"You paint light, water and earth onto the void, make living things, and give the world its laws. After seven days you go looking for a place in it \u2014 your own.",
  card_named_as:"The world remembers you as \u201C{n}\u201D.",

  occ_light:"light here", occ_water:"water here", occ_earth:"earth here",
  occ_plant:"plants here", occ_fish:"a fish here", occ_bird:"a bird here",
  occ_beast:"a beast here", occ_human:"a person here",
  occ_sun:"the sun here", occ_moon:"the moon here", occ_star:"a star here",
  you:"you",

  st_world:"world", st_life:"living", st_names:"named", st_laws:"laws",
  st_time:"time", st_painted:"made",
  card_kicker:"THE MAKER · SEVEN DAYS",
  card_title:"You made the world with your own hands. It has no place for you.",
  card_body:"In seven days you painted light, water, earth and plants onto the void, hung sun and moon and stars, made fish and birds and beasts and people, and left the world three laws. Then you looked for your own place in it. There was not one cell left.",
  card_law:"You wrote:",
  card_footer:"academy.trilumi.xyz",
  ok:"Copied", bad:"Could not copy \u2014 select the text manually.",
  title:"Your card", hint:"Long-press the image to save it, or use Download.",
  dl:"Download PNG", cp:"Copy as text", cl:"Close"
}
};

var LANG = "hant";
function t(k){ var v = L[LANG][k]; return (v === undefined) ? ("[" + k + "]") : v; }
function tf(k, o){
  var s = t(k);
  for (var p in o) s = s.split("{" + p + "}").join(o[p]);
  return s;
}

/* the six laws, per language. Index-aligned across the three tables. */
var LAWS = {
  hant:[
    ["凡有生之物，皆有其位。","世界不會留下任何一個無處可去的人。"],
    ["萬物各有其序，無物在其外。","一切都有次序，不必有人看管。"],
    ["造物歸於此世，不復歸於造者。","你造的東西，永遠屬於它自己。"],
    ["見者不居，居者不見。","你不在裡面，也就不會干涉它。"],
    ["此世自足，不假外求。","它會自己活下去。"],
    ["凡入此世者，必生於此世。","進來的，都是它自己生的。"]
  ],
  hans:[
    ["凡有生之物，皆有其位。","世界不会留下任何一个无处可去的人。"],
    ["万物各有其序，无物在其外。","一切都有次序，不必有人看管。"],
    ["造物归于此世，不复归于造者。","你造的东西，永远属于它自己。"],
    ["见者不居，居者不现。","你不在里面，也就不会干涉它。"],
    ["此世自足，不假外求。","它会自己活下去。"],
    ["凡入此世者，必生于此世。","进来的，都是它自己生的。"]
  ],
  en:[
    ["Every living thing shall have its place.","No one in this world will be left with nowhere to go."],
    ["All things shall keep their order; nothing shall stand outside it.","Everything has its order. No one needs to watch over it."],
    ["What is made belongs to this world, and never again to its maker.","What you make will always belong to itself."],
    ["The one who sees does not dwell; the one who dwells does not see.","You are not in it, so you cannot interfere with it."],
    ["This world is sufficient unto itself; it shall seek nothing outside.","It will live on its own."],
    ["Whoever would enter this world must be born into it.","All who come in are born of it."]
  ]
};
