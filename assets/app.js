// 麦爸的思想智慧库 —— 前端筛选与渲染（纯静态，读取 assets/entries.json）
(function () {
  "use strict";

  // 筛选维度配置：同组 OR，跨组 AND
  var DIMS = [
    { key: "theme", label: "主题", order: [] },
    { key: "level", label: "性价比", order: ["极高", "高", "一般"] },
    { key: "value", label: "换回什么", order: ["钱", "时间精力", "人身自由", "认知"] },
    { key: "spend_money", label: "花钱", order: ["不花钱", "少花钱", "多花钱"] },
    { key: "spend_time", label: "花时间", order: ["顺手", "几小时", "每天占用"] },
    { key: "spend_will", label: "要毅力", order: ["不用毅力", "一点毅力", "很多毅力"] }
  ];

  var LEVEL_RANK = { "极高": 0, "高": 1, "一般": 2 };

  var state = {};      // 当前激活的筛选：{ theme: Set, level: Set, ... }
  var data = [];
  var query = "";

  var $ = function (id) { return document.getElementById(id); };

  function uniq(arr) { return arr.filter(function (v, i) { return arr.indexOf(v) === i; }); }

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

  function matches(e) {
    // 跨组 AND
    for (var i = 0; i < DIMS.length; i++) {
      var dim = DIMS[i];
      var set = state[dim.key];
      if (set && set.size) {
        var v = e[dim.key];
        var vals = Array.isArray(v) ? v : (v ? [v] : []);
        var hit = vals.some(function (x) { return set.has(x); });
        if (!hit) return false;
      }
    }
    // 搜索
    if (query) {
      var hay = (e.title + " " + (e.tags || []).join(" ") + " " + (e.bodyText || "")).toLowerCase();
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

  function render() {
    var list = $("entryList");
    list.innerHTML = "";
    var filtered = sortEntries(data.filter(matches));
    $("count").textContent = "共 " + data.length + " 条 · 当前 " + filtered.length + " 条";
    $("emptyHint").hidden = filtered.length !== 0;

    filtered.forEach(function (e, i) {
      var li = document.createElement("li");
      li.className = "entry";

      var head = document.createElement("div");
      head.className = "entry-head";

      var title = document.createElement("p");
      title.className = "entry-title";
      title.innerHTML = '<span class="idx">#' + (e.order != null ? e.order : (i + 1)) + "</span>" + escapeHtml(e.title);

      var badges = document.createElement("div");
      badges.className = "badges";
      badges.appendChild(makeBadge("theme", e.theme));
      if (e.level) badges.appendChild(makeBadge("level-" + e.level, "性价比·" + e.level));
      (Array.isArray(e.value) ? e.value : (e.value ? [e.value] : [])).forEach(function (v) {
        badges.appendChild(makeBadge("", "换回·" + v));
      });
      (Array.isArray(e.spend_money) ? e.spend_money : (e.spend_money ? [e.spend_money] : [])).forEach(function (v) {
        badges.appendChild(makeBadge("", v));
      });
      (Array.isArray(e.spend_time) ? e.spend_time : (e.spend_time ? [e.spend_time] : [])).forEach(function (v) {
        badges.appendChild(makeBadge("", v));
      });
      (Array.isArray(e.spend_will) ? e.spend_will : (e.spend_will ? [e.spend_will] : [])).forEach(function (v) {
        badges.appendChild(makeBadge("", v));
      });

      head.appendChild(title);
      head.appendChild(badges);

      var body = document.createElement("div");
      body.className = "entry-body";
      var inner = document.createElement("div");
      inner.className = "inner";
      inner.innerHTML = e.body || "";
      body.appendChild(inner);

      head.onclick = function () { li.classList.toggle("open"); };

      li.appendChild(head);
      li.appendChild(body);
      list.appendChild(li);
    });
  }

  function makeBadge(cls, text) {
    var b = document.createElement("span");
    b.className = "badge" + (cls ? " " + cls : "");
    b.textContent = text;
    return b;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function init() {
    DIMS.forEach(function (d) { state[d.key] = new Set(); });
    fetch("assets/entries.json", { cache: "no-cache" })
      .then(function (r) {
        if (!r.ok) throw new Error("entries.json " + r.status);
        return r.json();
      })
      .then(function (json) {
        data = (json.entries || []).map(function (e, i) {
          e.order = e.order != null ? e.order : (i + 1);
          e.bodyText = (e.body || "").replace(/<[^>]+>/g, " ");
          return e;
        });
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
      $("search").value = "";
      document.querySelectorAll(".chip.active").forEach(function (c) { c.classList.remove("active"); });
      render();
    };
    $("toggleSidebar").onclick = function () {
      $("sidebar").classList.toggle("show");
    };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
