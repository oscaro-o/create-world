# 造世 · THE MAKER

> 你親手創造世界，可這世界沒有你位置。
> You made the world with your own hands. It has no place for you.

第七个 Trilumi 单文件游戏。一个造物游戏：你在虚空上画光、水、土、草木，挂起日月星辰，
造出鱼鸟兽与人，给世界立下三条规矩 —— 然后你要走进去。

---

## 玩法（约 6–8 分钟）

| 阶段 | 做什么 | 为什么在这里 |
|---|---|---|
| 起初 | 点一下 | 虚空，还没有形状 |
| 第一日 · 分光 | 画光 | 世界的第一层 |
| 第二日 · 水土 | 画水、画土 | 两种都要有 |
| 第三日 · 草木 | 画草木 | 草木只长在土/水上；长在水上会变藻 |
| 第四日 · 光体 | 挂日、月、星 | 放在上方天空；放下的光体改变整个世界颜色 |
| 第五日 · 众生 | 放鱼、鸟、兽，**给第一只取名字** | 鱼只在水里，兽只在陆上 |
| 第六日 · 造人 | 放人；**世界问你叫什么** | 世界第一次向你说话 |
| 立法 | 六条里选三条 | 六条听起来都是祝福，三条是承重墙 |
| 第七日 · 安息 | 看着 | 世界自己把剩下的每一格长满 |
| 入世 | 把光标拖到任意一格 | 每一格都已经有人了 |
| 终 | 二选一 | 两个都是失去，只是失去的东西不同 |

**设计的核心**：转折不是"告诉"玩家的，是玩家自己造的。
第七日世界会长满**每一格**（不是动画，是真的 flood-fill 生长，从玩家画过的边缘往外长），
所以入世时"没有位置"是**机械上为真**的事实，不是台词。
立法的三条会被结尾原句引回来 —— 玩家用自己的话把自己关在门外。

两个结局：

- **毁了它，换一个位置** —— 世界回到虚空，只剩一格亮着，你站在里面。你造了一整座世界，
  只是为了给自己腾出一个格子。
- **留下它，站在外面** —— 世界继续运转，你退出画面。它会记得你，以一个名字，写在没有人读的地方。

---

## 文件

```
index.html              ← 唯一的交付物，零外部依赖（108 KB）
sw.js                   ← PWA service worker，VERSION 要 bump
manifest.webmanifest
icons/                  ← 从 hetu-luoshu 复制的一套
_build/                 ← 源码分片 + 组装 + 测试（不进部署）
  head.html head2.html body.html     样式与标记
  game1.js   常量 + 三语文本表
  game2.js   世界状态 + 绘制规则（谁能画在哪）
  game2b.js  渲染器（烘焙地形 / 动态层）
  game3.js   输入、调色板、指令行
  game4.js   七日流程、命名面板、立法面板
  game5.js   安息、入世、结局、分享卡、启动
  assemble.sh      组装 index.html
  play.js          真浏览器全流程测试
  mobile.js mob2.js  手机端布局检查
```

`index.html` 是**拼出来的**，不要直接改它 —— 改 `_build/` 里的分片再跑 `assemble.sh`。
`tribrand.js` / `tricard.js` / `trishare.js` 是从 `brand/` 直接串进来的（不是复制），
所以分享面板的修改会同时落到每个游戏。

---

## 重建与测试

```bash
cd "C:/Users/oscar/WorkBuddy AI/2026-09-19-21-22-00/_gh/create-world"
bash _build/assemble.sh

NODE=/c/Users/oscar/.workbuddy-ai/binaries/node/versions/22.22.2-3/node.exe
NM=C:/Users/oscar/.workbuddy-ai/binaries/node/workspace/node_modules

NODE_PATH=$NM $NODE _build/play.js hant b            # 繁體，结局 B
NODE_PATH=$NM $NODE _build/play.js en a              # English，结局 A
NODE_PATH=$NM $NODE _build/play.js hans b narrow     # 简体，手机竖屏世界
```

`play.js` 用真指针事件把整局打完，并在每一步断言游戏自己的状态。它检查的关键几件事：

- 草木拒绝长在**纯虚空**和**纯光**上（直接探测规则，不是数格子）
- 同一次笔刷落在水上会变成藻
- 日/月/星挂不进下方天空
- 鱼/兽/人各自的栖地规则
- 第七日结束时 **1144/1144 格无虚空**
- 入世时 `occupantAt()` 对**每一格**都返回非空
- 分享卡渲染到 1080 宽，并引用玩家自己写下的法条

---

## 坑（都踩过）

1. **世界随屏幕变形。** 桌面 44×26（1144 格），窄屏（<700px）30×40（1200 格）。
   44 列塞进 330 CSS px，一格 7px，拇指点不到 —— 造物的第一天不该是射击游戏。
2. **点击会吸附到最近的有效格（2 格内）。** 不然手机上放一个人靠的是准头不是想法。
   超过 2 格就不吸 —— "兽不能站在天上"仍然是玩家能感觉到的规则。
3. **光一开始画出来像沙滩。** 三个色阶（暗金→金→浅金）铺满整块地，加性混合后是米色噪点。
   改成三个都很亮的近似色，再加一层大半径低透明度的 bloom，才读得出是"光"。
4. **一格一个圆 = 泡泡纸。** 现在每格的 blob 半径是格距的 1.16 倍，重叠约两倍，
   加上每格从 hash 取的三个色调 —— 才变成苔藓而不是气泡。
5. **月亮画成了黑洞。** 不透明的深色圆盖在亮圆上，读起来是"天上打了个洞"。
   现在阴影外移、变小、半透明。
6. **`overlay(html, "soft")`。** 最后一幕必须让玩家看见他进不去的那个世界，
   所以文字沉到底部，上方留空。
7. **分享按钮在页头，加载即可见。** 藏起来 = 等于没有。
8. **`navigator.share` 必须在同一次点击任务里调用。** 分享卡在结局渲染时就预热好
   （`warmCard()` 把 blob 存进 `CARD_FILE`），点击时是同步的。
9. **改完 `index.html` 一定要 bump `sw.js` 的 VERSION。**

---

## 部署

新子域 **`createworld.trilumi.xyz` 目前还不存在**（DNS 没有，服务器没有 vhost）。
先建子域，然后：

```bash
cd "C:/Users/oscar/WorkBuddy AI/2026-09-19-21-22-00"
bash brand/deploy-family.sh createworld
```

`deploy-family.sh` 里已经有 `createworld` 这一行；它会推 index.html、sw.js、
manifest 和整套 icons，然后 verify HTTP 200 + beacon + 线上 VERSION。
