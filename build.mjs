// 麦爸的思想智慧库 —— 构建脚本（Node 零依赖）
// 扫描 book/*.md → 解析 frontmatter + 轻量 markdown→html → 输出 assets/entries.json
// 用法：node build.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BOOK_DIR = path.join(__dirname, "book");
const OUT_FILE = path.join(__dirname, "assets", "entries.json");

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

function main() {
  if (!fs.existsSync(BOOK_DIR)) {
    console.error("找不到 book/ 目录"); process.exit(1);
  }
  const files = fs.readdirSync(BOOK_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort();

  const entries = files.map((file, idx) => {
    const raw = fs.readFileSync(path.join(BOOK_DIR, file), "utf8");
    const { meta, body } = parseFrontmatter(raw);
    return {
      id: meta.id || file.replace(/\.md$/, ""),
      title: meta.title || file,
      theme: meta.theme || "未分类",
      level: meta.level || "",
      value: meta.value || [],
      spend_money: meta.spend_money || [],
      spend_time: meta.spend_time || [],
      spend_will: meta.spend_will || [],
      tags: meta.tags || [],
      date: meta.date || "",
      order: meta.order != null ? Number(meta.order) : idx + 1,
      body: mdToHtml(body),
      source: file
    };
  });

  const out = { generated: new Date().toISOString(), count: entries.length, entries };
  fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2), "utf8");
  console.log(`✓ 已生成 ${entries.length} 条 → assets/entries.json`);
}

main();
