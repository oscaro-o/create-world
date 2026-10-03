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

**线上：<https://createworld.trilumi.xyz>**（2026-10-03 上线）
仓库：**https://github.com/oscaro-o/create-world**（public，与其它游戏一致）

一次完整的 `bash brand/deploy-family.sh createworld`：

```
  ok    createworld                                200  107613 bytes
  ok    beacon @ createworld                       200  42 bytes
  ok    createworld (sw)                           v1
  ok    academy (hub)                              200  54034 bytes
all checks passed.
```

### 建新子域的完整顺序（下次照这个走，顺序不能换）

**1 · 建 vhost**

```bash
ssh hetu 'cyberpanel createWebsite --package Default --owner admin \
  --domainName createworld.trilumi.xyz --email <邮箱> --php 8.1'
```

**2 · 补 SSL listener 的 map**

```bash
bash brand/check-vhost-maps.sh createworld.trilumi.xyz --fix
```

> ⚠️ **CyberPanel 的 `createWebsite` 只写 `Default` listener 的 map 行。**
> 一个子域要在 `httpd_config.conf` 里**三个 listener 都 map**（`Default` /
> `SSL` / `SSL IPv6`）。只写第一个的结果是 http 完全正常、https 永远连不上 ——
> **而且报错看起来像证书坏了，其实不是**：SSL listener 没有 map，请求根本到不了
> vhost。2026-10-03 就是这么卡住的。

**3 · 加 DNS A 记录**（Hostinger hPanel，NS = `dns-parking.com`，SSH 改不了）

```
类型 A    名称 createworld    值 212.85.27.147    TTL 默认
```

```bash
nslookup -type=A createworld.trilumi.xyz 8.8.8.8   # 必须返回 212.85.27.147
```

**4 · 签证书**

```bash
MSYS_NO_PATHCONV=1 gh workflow run "TLS certificate" --repo NekoBite/TrilumiWebsite \
  -f domain=createworld.trilumi.xyz \
  -f mode=issue \
  -f webroot=/usr/local/lsws/Example/html
```

> ⚠️ **`MSYS_NO_PATHCONV=1` 不能省。** Git Bash 会把 `/usr/local/...` 这种以斜杠
> 开头的参数**转换成 Windows 路径**再交给 `gh`。2026-10-03 第一次跑就因此失败：
> 服务器收到的是
> `C:/Users/oscar/.workbuddy-ai/binaries/PortableGit/versions/1.2.0/usr/local/lsws/Example/html`，
> 于是 `[ -d "$WEBROOT" ]` 直接挂掉。好在它挂在 `acme.sh` **之前**，没浪费
> Let's Encrypt 的签发额度。

> ⚠️ **`extra_domains` 传空是无效的，只能接受它的默认值 `www.trilumi.xyz`。**
> GitHub Actions 把「空字符串输入」当成「没提供」，于是回落到默认值。`-f
> extra_domains=` 和 `gh api -f 'inputs[extra_domains]='` 都试过，两种都会让
> 工作流收到 `www.trilumi.xyz`（日志里会打
> `Certificate will cover: createworld.trilumi.xyz www.trilumi.xyz`）。
> 结果：**这张证书额外覆盖了 `www.trilumi.xyz`**。
> 这是**无害的**——www 有自己的 vhost 和自己的证书（`CN=trilumi.xyz`），
> 这张证书不会被用到 www 上；续期也没问题，因为所有 vhost 的
> `/.well-known/acme-challenge` 都指向同一个共享目录
> `/usr/local/lsws/Example/html/.well-known/acme-challenge`（已实测 www 和 apex
> 都返回 200）。**所以就这样留着，不要去重签** —— 为了一行 SAN 去动一张正在
> 提供服务的生产证书，不划算。

**5 · 最终验证**

```bash
cd "C:/Users/oscar/WorkBuddy AI/2026-09-19-21-22-00"
bash brand/deploy-family.sh createworld
bash brand/check-family.sh          # 7 个游戏 local == blob == 线上
```

### 签名时遇到的两个坑（2026-10-03 实测）

- **`acme.sh --install-cert` 的 `--reloadcmd "systemctl restart lsws"` 报了
  `Job for lshttpd.service canceled.`**，于是工作流退出码 1。
  但证书**已经签好也装好了**（`/etc/letsencrypt/live/createworld.trilumi.xyz/`），
  服务也一直是 active —— 只是脚本在追加 `vhssl` block **之前**就退出了。
  手动补上即可（见下），或者直接重跑工作流。
- 因为上一条，`vhssl` block 是**手工追加**的，内容与工作流一致：

  ```
  vhssl  {
    keyFile                 /etc/letsencrypt/live/createworld.trilumi.xyz/privkey.pem
    certFile                /etc/letsencrypt/live/createworld.trilumi.xyz/fullchain.pem
    certChain               1
    sslProtocol             24
    enableECDHE             1
    renegProtection         1
    sslSessionCache         1
    enableSpdy              15
    enableStapling          1
    ocspRespMaxAge          86400
  }
  ```

  追加前先 `cp -a vhost.conf vhost.conf.bak-$(date +%s)`。改完 `systemctl restart
  lsws`，然后**务必回头确认其它站点还活着** —— lsws 挂了是全家一起挂。

### 之后每次发版

```bash
cd "C:/Users/oscar/WorkBuddy AI/2026-09-19-21-22-00/_gh/create-world"
bash _build/assemble.sh
# bump sw.js 的 VERSION
cd .. && cd .. && bash brand/deploy-family.sh createworld
```

改完 `index.html` **一定要 bump `sw.js` 的 VERSION**，否则老访客拿到旧缓存。
（`deploy-family.sh` 现在会真的校验线上 VERSION —— 之前它用的模式是
`const VERSION`，而本仓库写的是 `var VERSION`，所以那条断言一直静默通过、
什么都没查。2026-10-03 已修。）
