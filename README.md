# 麦爸的思想智慧库

> 麦爸出品，必属精品 —— 一份可按主题、性价比、成本维度筛选的**个人智慧合集**。
> 在线访问：https://xie666888.github.io/maiba-wisdom

## 这是什么

一份"可筛选的智慧清单"，对标 [HowToLiveBetter](https://eternity4719.github.io/HowToLiveBetter/)。
每条智慧是一个 `.md` 文件，带标签（主题 / 性价比 / 换回什么 / 花钱 / 花时间 / 要毅力），
页面左侧按这些标签筛选，条目可点开看详情。

纯静态、零依赖、零后端，挂在 GitHub Pages 上，改完内容推上去就更新。

## 目录结构

```
book/             ← 智慧条目（每个文件一条，带 frontmatter）
assets/
  entries.json    ← 由 build.mjs 自动生成，页面读取它
  app.js          ← 筛选 + 渲染逻辑
  style.css       ← 蓝黄白主题样式
index.html        ← 在线检索页
build.mjs         ← 扫描 book/ 生成 entries.json（Node 零依赖）
```

## 怎么加一条智慧

1. 在 `book/` 里新建一个 `.md` 文件，文件名用数字前缀好排序，例如 `11-xxx.md`。
2. 按模板写 frontmatter + 正文：

```markdown
---
id: 唯一英文id
title: 一句话讲清这条智慧（动词开头最佳）
theme: AI赋能          # 主题
level: 极高            # 极高 / 高 / 一般（性价比）
value: [钱, 时间精力]  # 换回什么：钱 / 时间精力 / 人身自由 / 认知
spend_money: [不花钱]  # 不花钱 / 少花钱 / 多花钱
spend_time: [顺手]     # 顺手 / 几小时 / 每天占用
spend_will: [不用毅力] # 不用毅力 / 一点毅力 / 很多毅力
tags: [AI, 生意]       # 任意标签，用于搜索
date: 2026-09
---

正文用 markdown 写：段落、**加粗**、> 引用、- 列表。
结尾加一句「说人话」把道理翻成日常说法。
```

3. 重新生成数据并发布：

```bash
node build.mjs        # 刷新 assets/entries.json
git add -A
git commit -m "add: 新智慧一条"
git push
```

推送后约 1 分钟，站点自动更新。

## 散落内容怎么整理进来

飞书 / 笔记 / 聊天里的碎片，先归成"一条一个观点 + 一句说人话"，再按上面模板落成 `.md`。
宁可一次只沉淀一两条真有用的，也不要把碎片原样堆进来。

## 本地预览

```bash
python -m http.server 8000   # 然后浏览器开 http://localhost:8000/
```

> 注意：必须用 http 打开（本地服务器或 GitHub Pages），直接双击 `index.html` 会因浏览器安全策略读不到 `entries.json` 而空白。
