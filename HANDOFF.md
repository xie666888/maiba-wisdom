# HANDOFF · 麦爸的思想智慧库

> 交接文档。每次改动后追加更新，让接手者能快速了解项目当前状态与待办。
> 最近更新：2026-09-29

## 一、项目是什么

个人智慧检索站。纯静态、零依赖、零后端，构建后推 GitHub Pages 即上线。
在线：https://xie666888.github.io/maiba-wisdom　仓库：https://github.com/xie666888/maiba-wisdom

**两库并存，互不混合：**

| 库 | 数据源 | origin | 视觉 | 条数 |
|---|---|---|---|---|
| 我的智慧 | `book/*.md` | `self` | 蓝色 | 30 |
| 读书外脑 | `reading/*/*.md` | `book` | 青色 | 54（新增） |

## 二、本轮改动（2026-09-29）

### 目标
把成庆两本佛学著作（《人生解忧：佛学入门四十讲》25.6 万字、《安心之道：佛学通识十讲》10.3 万字）
做成可碎片消化的读书卡片，接入检索站，并与「我的智慧」严格区分。

### 新增文件

| 路径 | 说明 |
|---|---|
| `reading/01-renshengjieyou/rs-01..rs-44.md` | 《人生解忧》44 张卡（缘起 + 40 讲 + 3 篇访谈） |
| `reading/02-anxinzhidao/ax-01..ax-10.md` | 《安心之道》10 张卡（一章一卡） |
| `_raw/reading/_extract.py` | EPUB → 按节切分纯文本（标准库，零依赖） |
| `_raw/reading/_card_spec.md` | 卡片写作规范 v1（唯一口径，批量提炼时必读） |
| `_raw/reading/renshengjieyou/`、`_raw/reading/anxinzhidao/` | 全文与目录索引，**已在 .gitignore 内，不进公开仓库** |
| `HANDOFF.md` | 本文件 |

### 修改文件

| 文件 | 改了什么 |
|---|---|
| `build.mjs` | 由单源改双源。新增 `COLLECTIONS` 配置；`collectFiles()` 支持读取一层子目录；条目新增 `collection / origin / book / bookShort / author / chapter / kicker` 字段；输出新增 `collections` 汇总与**校验告警**（缺必填字段、重复 id、空目录）；`order` 改为按**同一库内排序位置**生成（不再读 frontmatter 的 order） |
| `index.html` | 新增顶部双库 Tab 容器 `#tabs`、随机按钮 `#randomBtn`、侧边栏进度容器 `#progress`；footer 与 meta 描述改为双库口径 |
| `assets/app.js` | 全量重写渲染层：双库切换 `switchCol()`、按库重建筛选器、`updateProgress()` 进度条 + 「只看未读」、`pickRandom()` 随机抽卡、`readSet` 用 localStorage 持久化、卡片展开自动记已读、`refreshReadIndicators()` 轻量更新进度（不重建列表，避免关掉正在看的卡） |
| `assets/style.css` | 新增 `--teal` 系变量；新增 Tab / 进度条 / 已读态 / `ghost-btn` 样式；新增 `body[data-collection="book"]` 与 `.mode-book` 青色体系覆盖（含 header 渐变、徽章、引用块、标题色） |
| `README.md` | 重写：双库说明、读书外脑来源与**版权声明**、新目录结构、两类卡片模板、order 自动生成说明 |

### 关键设计决策

1. **版权红线**：两书全文合计 36 万汉字，受版权保护。全文只落 `_raw/reading/`（.gitignore 已排除），
   **公开仓库只有提炼卡片 + 每讲 ≤80 字短引文**。与既有 `_raw/` 保护微信聊天记录的做法一致。
2. **四层隔离**：目录（`book/` vs `reading/`）、数据（`origin` 字段）、视觉（蓝 vs 青）、
   写法（第一人称复盘 vs 第三人称书摘）。**卡片里不写麦爸个人观点**，这是「外脑」的界。
3. **粒度选择**：一讲一卡 / 一章一卡，正文 300–450 汉字（硬上限 550），对应 1–2 分钟阅读。
   这是针对"时间碎片"的核心设计，不是顺带。
4. **已读进度的触发**：展开卡片即自动记已读（可选 ✓ 按钮手动取消）。碎片阅读靠这个累积反馈。
   仅存 localStorage，跨设备不同步——刻意不做后端。

## 三、待办事项

- [ ] **本轮改动尚未 git 提交**。构建与本地验证通过后，建议 `git add -A && git commit && git push`。
- [ ] 读书卡片正文由多个并行子任务分别提炼，建议人工抽读 5–8 张复核：
  重点看原文引句是否逐字、有无串讲、正文长度是否超 550 汉字。
- [ ] `_raw/reading/_extract.py` 中 EPUB 源路径写死了微信文件目录，
  换机器或换书需改 `EPUB_DIR` 与 `BOOKS` 两处常量。
- [ ] 访谈类（rs-42/43/44）与《安心之道》第 9 章「心的锻炼」（实操）建议优先复核，
  这两类是风格最可能跑偏的。

## 四、已知风险

| 风险 | 说明 | 处理 |
|---|---|---|
| 版权 | 全文若误提交即构成侵权 | `.gitignore` 已含 `_raw/`；**切勿** `git add -f _raw/` |
| 引文准确性 | 卡片引文由模型逐字摘录，存在极小概率失真 | 复核时对照 `_raw/reading/` 原文抽查 |
| 已读进度丢失 | localStorage 随浏览器清理而丢 | 已知取舍，不引入后端 |
| 卡片与原文偏离 | 提炼会损失细节，卡片是入口不是替代 | 每卡标注 `chapter`，可回原书核对 |

## 五、下一步建议

1. 先提交本轮成果，再抽读复核（不要边改边提交，避免 review 成本）。
2. 若效果满意，可把同一套 `reading/` 结构复用到其他书——
   只要按 `_card_spec.md` 产出卡片并放进 `reading/03-xxx/`，`build.mjs` 自动纳入，无需改代码。
3. 阅读端可考虑加「今天读一张」的每日一卡（按日期取模），比随机抽卡更有连续性。
4. `_card_spec.md` 已沉淀为可复用规范；若后续提炼其他书，直接复用该文件即可。

## 六、本地跑起来

```bash
node build.mjs                 # 生成 assets/entries.json（会打印校验告警）
python -m http.server 8000     # 开 http://localhost:8000/
```

注意必须走 http，直接双击 `index.html` 会因浏览器安全策略读不到 `entries.json` 而空白。
