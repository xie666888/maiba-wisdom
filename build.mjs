// 麦爸的思想智慧库 —— 构建脚本（Node 零依赖）
// 扫描两个数据源 → 解析 frontmatter + 轻量 markdown→html → 输出 assets/entries.json
//   book/    「我的智慧」：麦爸本人的实战复盘（origin: self）
//   reading/ 「读书外脑」：成庆佛学著作的读书卡片（origin: book）
// 用法：node build.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_FILE = path.join(__dirname, "assets", "entries.json");

const COLLECTIONS = [
  {
    id: "self",
    label: "我的智慧",
    hint: "提炼自麦爸本人在微信群里的发言",
    dir: path.join(__dirname, "book"),
    nested: false
  },
  {
    id: "book",
    label: "读书外脑",
    hint: "成庆佛学著作的读书卡片，与我的智慧分开存放",
    dir: path.join(__dirname, "reading"),
    nested: true
  }
];

const REQUIRED = ["id", "title", "theme", "level"];

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function inline(s) {
  s = escapeHtml(s);
  s = s.replace(/`([^`]+)`/g, (_, c) => "<code>" + c + "</code>");
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener">$1</a>');
  return s;
}

function mdToHtml(md) {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  let html = "";
  let para = [];
  let i = 0;

  const flushPara = () => {
    if (para.length) { html += "<p>" + inline(para.join(" ")) + "</p>"; para = []; }
  };

  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*$/.test(line)) { flushPara(); i++; continue; }

    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      flushPara();
      const lvl = Math.min(h[1].length + 2, 4);
      html += `<h${lvl}>` + inline(h[2]) + `</h${lvl}>`;
      i++; continue;
    }
    if (/^>\s?/.test(line)) {
      flushPara();
      const quote = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) { quote.push(lines[i].replace(/^>\s?/, "")); i++; }
      html += "<blockquote>" + inline(quote.join(" ")) + "</blockquote>";
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      flushPara();
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) { items.push(lines[i].replace(/^[-*]\s+/, "")); i++; }
      html += "<ul>" + items.map((it) => "<li>" + inline(it) + "</li>").join("") + "</ul>";
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      flushPara();
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) { items.push(lines[i].replace(/^\d+\.\s+/, "")); i++; }
      html += "<ol>" + items.map((it) => "<li>" + inline(it) + "</li>").join("") + "</ol>";
      continue;
    }
    para.push(line);
    i++;
  }
  flushPara();
  return html;
}

function parseFrontmatter(raw) {
  const m = raw.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!m) return { meta: {}, body: raw };
  const fm = m[1];
  const body = raw.slice(m[0].length).replace(/^\n/, "");
  const meta = {};
  fm.split("\n").forEach((line) => {
    const mm = line.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (!mm) return;
    const key = mm[1];
    let val = mm[2].trim();
    if (val.startsWith("[") && val.endsWith("]")) {
      meta[key] = val.slice(1, -1)
        .split(",").map((s) => s.trim().replace(/^['"]|['"]$/g, "")).filter(Boolean);
    } else {
      meta[key] = val.replace(/^['"]|['"]$/g, "");
    }
  });
  return { meta, body };
}

// 收集某个数据源下的 .md（nested=true 时递归一层子目录，保留子目录分组）
function collectFiles(col) {
  if (!fs.existsSync(col.dir)) return [];
  const out = [];
  if (!col.nested) {
    fs.readdirSync(col.dir).filter((f) => f.endsWith(".md")).sort()
      .forEach((f) => out.push({ file: f, abs: path.join(col.dir, f), group: "" }));
    return out;
  }
  fs.readdirSync(col.dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()
    .forEach((sub) => {
      const subDir = path.join(col.dir, sub);
      fs.readdirSync(subDir).filter((f) => f.endsWith(".md")).sort()
        .forEach((f) => out.push({ file: f, abs: path.join(subDir, f), group: sub }));
    });
  return out;
}

function shortChapter(chapter) {
  const s = String(chapter || "");
  let m = s.match(/^(第[0-9一二三四五六七八九十]+[讲章])/);
  if (m) return m[1];
  m = s.match(/^(缘起|序|前言|附录|后记|结语|致谢)/);
  if (m) return m[1];
  if (s.indexOf("×") > -1 || s.indexOf("访谈") > -1) return "访谈";
  return s.slice(0, 8);
}

function main() {
  const entries = [];
  const collections = [];
  const problems = [];

  COLLECTIONS.forEach((col) => {
    const files = collectFiles(col);
    if (!files.length) {
      problems.push(`[${col.label}] 目录为空：${col.dir}`);
    }
    let n = 0;
    files.forEach((f, idx) => {
      const raw = fs.readFileSync(f.abs, "utf8");
      const { meta, body } = parseFrontmatter(raw);
      const id = meta.id || f.file.replace(/\.md$/, "");
      const origin = meta.origin || (col.id === "self" ? "self" : "book");

      REQUIRED.forEach((k) => {
        if (!meta[k]) problems.push(`[${col.label}] ${f.file} 缺字段 ${k}`);
      });

      const isBook = origin === "book";
      const book = meta.book || "";
      const chapter = meta.chapter || "";

      entries.push({
        id,
        collection: col.id,
        origin,
        title: meta.title || f.file,
        theme: meta.theme || "未分类",
        level: meta.level || "",
        value: meta.value || [],
        spend_money: meta.spend_money || [],
        spend_time: meta.spend_time || [],
        spend_will: meta.spend_will || [],
        tags: meta.tags || [],
        date: meta.date || "",
        // 展示序号一律由排序位置生成，保证同一集合内连续
        order: ++n,
        // 书籍卡专属
        book,
        bookShort: book ? book.split("：")[0] : "",
        author: meta.author || "",
        chapter,
        kicker: isBook ? shortChapter(chapter) : "",
        body: mdToHtml(body),
        source: (f.group ? f.group + "/" : "") + f.file
      });
    });
    collections.push({ id: col.id, label: col.label, hint: col.hint, count: n });
  });

  // 重复 id 检查
  const seen = new Map();
  entries.forEach((e) => {
    if (seen.has(e.id)) problems.push(`重复 id：${e.id}（${seen.get(e.id)} 与 ${e.source}）`);
    else seen.set(e.id, e.source);
  });

  const out = {
    generated: new Date().toISOString(),
    count: entries.length,
    collections,
    entries
  };
  fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2), "utf8");

  const detail = collections.map((c) => `${c.label} ${c.count} 条`).join(" · ");
  console.log(`✓ 共 ${entries.length} 条 → assets/entries.json（${detail}）`);
  if (problems.length) {
    console.log(`\n⚠ ${problems.length} 处需要留意：`);
    problems.slice(0, 40).forEach((p) => console.log("  - " + p));
  }
}

main();
