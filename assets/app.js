// 麦爸的思想智慧库 —— 前端筛选与渲染（纯静态，读取 assets/entries.json）
// 双库：我的智慧（origin: self） / 读书外脑（origin: book），两套数据互不混合
(function () {
  "use strict";

  // 筛选维度配置：同组 OR，跨组 AND
  var DIMS = [
    { key: "theme", label: "主题", order: [] },
    { key: "level", label: "性价比", order: ["极高", "高", "一般"] },
    { key: "value", label: "换回什么", order: ["钱", "时间精力", "人身自由", "认知", "关系", "内心"] },
    { key: "spend_money", label: "花钱", order: ["不花钱", "少花钱", "多花钱"] },
    { key: "spend_time", label: "花时间", order: ["顺手", "几小时", "每天占用"] },
    { key: "spend_will", label: "要毅力", order: ["不用毅力", "一点毅力", "很多毅力"] }
  ];

  var LEVEL_RANK = { "极高": 0, "高": 1, "一般": 2 };
  var READ_KEY = "maiba-wisdom-read";

  var byCol = {};        // collectionId -> entries
  var colMeta = [];      // [{id,label,hint,count}]
  var activeCol = "self";
  var state = {};        // 当前激活的筛选：{ theme: Set, ... }
  var query = "";
  var onlyUnread = false;
  var visible = [];      // 当前渲染出来的条目
  var readSet = loadRead();

  var $ = function (id) { return document.getElementById(id); };

  function loadRead() {
    try {
      var arr = JSON.parse(localStorage.getItem(READ_KEY) || "[]");
      return new Set(Array.isArray(arr) ? arr : []);
    } catch (e) { return new Set(); }
  }
  function saveRead() {
    try { localStorage.setItem(READ_KEY, JSON.stringify(Array.from(readSet))); } catch (e) {}
  }

  function uniq(arr) { return arr.filter(function (v, i) { return arr.indexOf(v) === i; }); }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function currentEntries() { return byCol[activeCol] || []; }

  /* ===== 顶部双库切换 ===== */
  function renderTabs() {
    var wrap = $("tabs");
    wrap.innerHTML = "";
    colMeta.forEach(function (c) {
      var b = document.createElement("button");
      b.className = "tab" + (c.id === activeCol ? " active" : "");
      b.innerHTML = escapeHtml(c.label) + '<span class="tab-count">' + c.count + "</span>";
      b.title = c.hint || "";
      b.onclick = function () { switchCol(c.id); };
      wrap.appendChild(b);
    });
    var active = colMeta.filter(function (c) { return c.id === activeCol; })[0];
    $("entryList").className = "entry-list mode-" + (activeCol === "book" ? "book" : "self");
    document.body.setAttribute("data-collection", activeCol);
  }

  function switchCol(id) {
    if (id === activeCol) return;
    activeCol = id;
    onlyUnread = false;
    query = "";
    $("search").value = "";
    DIMS.forEach(function (d) { state[d.key] = new Set(); });
    renderTabs();
    buildFilters();
    render();
  }

  /* ===== 侧边栏 ===== */
  function orderedOptions(dim, entries) {
    var vals = [];
    entries.forEach(function (e) {
      var v = e[dim.key];
      if (Array.isArray(v)) vals = vals.concat(v);
      else if (v) vals.push(v);
    });
    vals = uniq(vals);
    if (dim.order && dim.order.length) {
      vals.sort(function (a, b) {
        var ia = dim.order.indexOf(a), ib = dim.order.indexOf(b);
        if (ia === -1) ia = 999;
        if (ib === -1) ib = 999;
        return ia - ib;
      });
    }
    return vals;
  }

  function buildFilters() {
    var wrap = $("filters");
    wrap.innerHTML = "";
    var data = currentEntries();
    DIMS.forEach(function (dim) {
      var opts = orderedOptions(dim, data);
      if (!opts.length) return;
      var group = document.createElement("div");
      group.className = "filter-group";
      var h = document.createElement("h3");
      h.textContent = dim.label;
      group.appendChild(h);
      var chips = document.createElement("div");
      chips.className = "chips";
      opts.forEach(function (opt) {
        var chip = document.createElement("span");
        chip.className = "chip";
        chip.textContent = opt;
        chip.onclick = function () {
          var set = state[dim.key];
          if (set.has(opt)) { set.delete(opt); chip.classList.remove("active"); }
          else { set.add(opt); chip.classList.add("active"); }
          render();
        };
        chips.appendChild(chip);
      });
      group.appendChild(chips);
      wrap.appendChild(group);
    });
  }

  function updateProgress() {
    var list = currentEntries();
    var read = list.filter(function (e) { return readSet.has(e.id); }).length;
    var pct = list.length ? Math.round((read / list.length) * 100) : 0;
    var box = $("progress");
    box.innerHTML =
      '<div class="progress-head"><span>已读 ' + read + ' / ' + list.length + "</span><span>" + pct + "%</span></div>" +
      '<div class="progress-track"><i style="width:' + pct + '%"></i></div>';
    var chip = document.createElement("span");
    chip.className = "chip only-unread" + (onlyUnread ? " active" : "");
    chip.textContent = "只看未读";
    chip.onclick = function () {
      onlyUnread = !onlyUnread;
      updateProgress();
      render();
    };
    box.appendChild(chip);
  }

  /* ===== 筛选与排序 ===== */
  function matches(e) {
    if (onlyUnread && readSet.has(e.id)) return false;
    for (var i = 0; i < DIMS.length; i++) {
      var dim = DIMS[i];
      var set = state[dim.key];
      if (set && set.size) {
        var v = e[dim.key];
        var vals = Array.isArray(v) ? v : (v ? [v] : []);
        if (!vals.some(function (x) { return set.has(x); })) return false;
      }
    }
    if (query) {
      var hay = (e.title + " " + (e.tags || []).join(" ") + " " +
        (e.book || "") + " " + (e.chapter || "") + " " + (e.bodyText || "")).toLowerCase();
      if (hay.indexOf(query) === -1) return false;
    }
    return true;
  }

  function sortEntries(list) {
    return list.slice().sort(function (a, b) {
      var ra = LEVEL_RANK[a.level] != null ? LEVEL_RANK[a.level] : 9;
      var rb = LEVEL_RANK[b.level] != null ? LEVEL_RANK[b.level] : 9;
      if (ra !== rb) return ra - rb;
      return (a.order || 0) - (b.order || 0);
    });
  }

  /* ===== 渲染 ===== */
  function render() {
    var list = $("entryList");
    list.innerHTML = "";
    visible = sortEntries(currentEntries().filter(matches));
    var total = currentEntries().length;
    $("count").textContent = "共 " + total + " 条 · 当前 " + visible.length + " 条";
    $("emptyHint").hidden = visible.length !== 0;

    visible.forEach(function (e) {
      var li = document.createElement("li");
      li.className = "entry" + (readSet.has(e.id) ? " read" : "");
      li.setAttribute("data-id", e.id);

      var head = document.createElement("div");
      head.className = "entry-head";

      var title = document.createElement("p");
      title.className = "entry-title";
      title.innerHTML = '<span class="idx">#' + (e.order != null ? e.order : "") + "</span>" + escapeHtml(e.title);
      head.appendChild(title);

      var badges = document.createElement("div");
      badges.className = "badges";
      if (e.origin === "book") {
        badges.appendChild(makeBadge("book-tag", "《" + (e.bookShort || e.book) + "》" + (e.kicker || "")));
      }
      badges.appendChild(makeBadge("theme", e.theme));
      if (e.level) badges.appendChild(makeBadge("level-" + e.level, "性价比·" + e.level));
      (Array.isArray(e.value) ? e.value : (e.value ? [e.value] : [])).forEach(function (v) {
        badges.appendChild(makeBadge("", "换回·" + v));
      });
      (Array.isArray(e.spend_money) ? e.spend_money : []).forEach(function (v) { badges.appendChild(makeBadge("", v)); });
      (Array.isArray(e.spend_time) ? e.spend_time : []).forEach(function (v) { badges.appendChild(makeBadge("", v)); });
      (Array.isArray(e.spend_will) ? e.spend_will : []).forEach(function (v) { badges.appendChild(makeBadge("", v)); });
      head.appendChild(badges);

      var toggle = document.createElement("button");
      toggle.className = "read-toggle";
      toggle.type = "button";
      toggle.title = readSet.has(e.id) ? "取消已读标记" : "标记已读";
      toggle.textContent = "✓";
      toggle.onclick = function (ev) {
        ev.stopPropagation();
        if (readSet.has(e.id)) readSet.delete(e.id); else readSet.add(e.id);
        saveRead();
        render();
      };
      head.appendChild(toggle);

      head.onclick = function () {
        var opening = !li.classList.contains("open");
        li.classList.toggle("open");
        // 展开即视为读过——碎片阅读靠这个累积进度
        if (opening && !readSet.has(e.id)) {
          readSet.add(e.id);
          saveRead();
          li.classList.add("read");
          refreshReadIndicators();
        }
      };

      var body = document.createElement("div");
      body.className = "entry-body";
      var inner = document.createElement("div");
      inner.className = "inner";
      inner.innerHTML = e.body || "";
      body.appendChild(inner);

      li.appendChild(head);
      li.appendChild(body);
      list.appendChild(li);
    });

    updateProgress();
  }

  function refreshReadIndicators() {
    // 轻量更新：只改已读样式与进度，不重建列表（避免关掉正在看的卡）
    var list = currentEntries();
    var read = list.filter(function (e) { return readSet.has(e.id); }).length;
    var pct = list.length ? Math.round((read / list.length) * 100) : 0;
    var head = document.querySelector("#progress .progress-head");
    if (head) {
      head.innerHTML = "<span>已读 " + read + " / " + list.length + "</span><span>" + pct + "%</span>";
      var track = document.querySelector("#progress .progress-track i");
      if (track) track.style.width = pct + "%";
    }
  }

  function makeBadge(cls, text) {
    var b = document.createElement("span");
    b.className = "badge" + (cls ? " " + cls : "");
    b.textContent = text;
    return b;
  }

  /* ===== 随机抽一张：碎片时间的入口 ===== */
  function pickRandom() {
    if (!visible.length) return;
    var unread = visible.filter(function (e) { return !readSet.has(e.id); });
    var pool = unread.length ? unread : visible;
    var pick = pool[Math.floor(Math.random() * pool.length)];
    var el = document.querySelector('.entry[data-id="' + pick.id + '"]');
    if (!el) return;
    Array.prototype.forEach.call(document.querySelectorAll(".entry.open"), function (n) {
      if (n !== el) n.classList.remove("open");
    });
    el.classList.add("open");
    if (!readSet.has(pick.id)) {
      readSet.add(pick.id);
      saveRead();
      el.classList.add("read");
      refreshReadIndicators();
    }
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  /* ===== 初始化 ===== */
  function init() {
    DIMS.forEach(function (d) { state[d.key] = new Set(); });

    fetch("assets/entries.json", { cache: "no-cache" })
      .then(function (r) {
        if (!r.ok) throw new Error("entries.json " + r.status);
        return r.json();
      })
      .then(function (json) {
        colMeta = json.collections || [];
        (json.entries || []).forEach(function (e) {
          e.bodyText = (e.body || "").replace(/<[^>]+>/g, " ");
          byCol[e.collection] = byCol[e.collection] || [];
          byCol[e.collection].push(e);
        });
        byCol.self = byCol.self || [];
        activeCol = colMeta.length ? colMeta[0].id : "self";
        renderTabs();
        buildFilters();
        render();
      })
      .catch(function (err) {
        $("count").textContent = "加载失败：" + err.message;
        console.error(err);
      });

    $("search").addEventListener("input", function (e) {
      query = e.target.value.trim().toLowerCase();
      render();
    });
    $("clearFilters").onclick = function () {
      DIMS.forEach(function (d) { state[d.key].clear(); });
      query = "";
      onlyUnread = false;
      $("search").value = "";
      document.querySelectorAll(".chip.active").forEach(function (c) { c.classList.remove("active"); });
      render();
    };
    $("toggleSidebar").onclick = function () {
      $("sidebar").classList.toggle("show");
    };
    $("randomBtn").onclick = pickRandom;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
