/* ===========================================================
   C 语言知识库 —— 交互脚本
   1) 亮暗主题  2) 全文搜索  3) 目录滚动高亮  4) 移动端抽屉
   5) 复盘表本地暂存
   =========================================================== */
(function () {
  "use strict";

  var root = document.documentElement;
  var LS_THEME = "cl-notes-theme";
  var LS_CELL = "cl-notes-recap-";

  /* ---------- 1. 亮暗主题 ---------- */
  function applyTheme(t) {
    root.setAttribute("data-theme", t);
    try { localStorage.setItem(LS_THEME, t); } catch (e) {}
  }
  document.querySelectorAll(".darkmode").forEach(function (btn) {
    btn.addEventListener("click", function () {
      applyTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark");
    });
  });

  /* ---------- 2. 搜索 ---------- */
  var modal = document.querySelector(".search-modal");
  var input = document.querySelector(".search-bar");
  var ul = document.querySelector(".search-results");
  var index = null;
  var sel = 0;

  function loadIndex() {
    if (index) return Promise.resolve(index);
    if (window.__SEARCH_INDEX__) {
      index = window.__SEARCH_INDEX__;
      return Promise.resolve(index);
    }
    return fetch("search-index.json")
      .then(function (r) { return r.json(); })
      .then(function (d) { index = d; return d; })
      .catch(function () { index = []; return index; });
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function mark(text, q) {
    var i = text.toLowerCase().indexOf(q);
    if (i < 0 || !q) return esc(text);
    return esc(text.slice(0, i)) + "<mark>" + esc(text.slice(i, i + q.length)) +
      "</mark>" + esc(text.slice(i + q.length));
  }

  function snippet(text, q) {
    if (!text) return "";
    var i = text.toLowerCase().indexOf(q);
    if (i < 0) return esc(text.slice(0, 78)) + (text.length > 78 ? "…" : "");
    var s = Math.max(0, i - 34), e = Math.min(text.length, i + q.length + 44);
    return (s > 0 ? "…" : "") + mark(text.slice(s, e), q) + (e < text.length ? "…" : "");
  }

  function render(q) {
    var ql = q.trim().toLowerCase();
    ul.innerHTML = "";
    if (!ql) {
      ul.innerHTML = '<li class="search-empty">输入关键词开始检索（如 指针、UB、realloc）</li>';
      return;
    }
    var hits = [];
    (index || []).forEach(function (row) {
      var bag = (row.t + " " + (row.sec || "") + " " + (row.x || "")).toLowerCase();
      if (bag.indexOf(ql) < 0) return;
      var score = 0;
      if (row.t && row.t.toLowerCase().indexOf(ql) > -1) score += 6;
      if (row.sec && row.sec.toLowerCase().indexOf(ql) > -1) score += 4;
      if (row.x && row.x.toLowerCase().indexOf(ql) > -1) score += 2;
      hits.push({ row: row, score: score });
    });
    hits.sort(function (a, b) { return b.score - a.score; });
    if (!hits.length) {
      ul.innerHTML = '<li class="search-empty">未找到「' + esc(q) + '」，换个关键词试试</li>';
      return;
    }
    hits.slice(0, 24).forEach(function (h, i) {
      var r = h.row;
      var li = document.createElement("li");
      li.innerHTML =
        '<a href="' + r.u + (r.id ? "#" + r.id : "") + '"' + (i === 0 ? ' class="sel"' : "") + '>' +
        '<div class="r-title">' + (r.sec ? esc(r.sec) : esc(r.t)) + "</div>" +
        '<div class="r-path">' + esc(r.t) + "</div>" +
        '<div class="r-snippet">' + snippet(r.x, ql) + "</div>" +
        "</a>";
      ul.appendChild(li);
    });
    sel = 0;
  }

  function openSearch() {
    if (!modal) return;
    modal.hidden = false;
    loadIndex().then(function () { render(input.value); input.focus(); });
  }
  function closeSearch() {
    if (!modal) return;
    modal.hidden = true;
    input.value = "";
  }

  document.querySelectorAll(".search-button").forEach(function (b) {
    b.addEventListener("click", openSearch);
  });
  if (modal) {
    modal.addEventListener("click", function (e) { if (e.target === modal) closeSearch(); });
    input.addEventListener("input", function () { render(input.value); });
  }

  document.addEventListener("keydown", function (e) {
    var tag = (e.target.tagName || "").toLowerCase();
    if ((e.key === "/" && tag !== "input" && tag !== "textarea") || (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey))) {
      e.preventDefault();
      openSearch();
      return;
    }
    if (!modal || modal.hidden) return;
    if (e.key === "Escape") { closeSearch(); }
    else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      var links = ul.querySelectorAll("a");
      if (!links.length) return;
      links[sel] && links[sel].classList.remove("sel");
      sel = (sel + (e.key === "ArrowDown" ? 1 : links.length - 1)) % links.length;
      links[sel].classList.add("sel");
      links[sel].scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      var cur = ul.querySelectorAll("a")[sel];
      if (cur) location.href = cur.getAttribute("href");
    }
  });

  /* ---------- 3. 目录滚动高亮 ---------- */
  var tocLinks = Array.prototype.slice.call(document.querySelectorAll(".toc a[data-for]"));
  var headings = tocLinks
    .map(function (a) { return document.getElementById(a.getAttribute("data-for")); })
    .filter(Boolean);

  function syncToc() {
    if (!headings.length) return;
    var y = 110;
    var cur = headings[0];
    headings.forEach(function (h) {
      var top = h.getBoundingClientRect().top;
      if (top <= y) cur = h;
    });
    tocLinks.forEach(function (a) {
      a.classList.toggle("active", a.getAttribute("data-for") === cur.id);
    });
  }
  if (headings.length) {
    window.addEventListener("scroll", syncToc, { passive: true });
    syncToc();
  }

  /* ---------- 4. 移动端抽屉 ---------- */
  var navBtn = document.querySelector(".mobile-bar .nav-toggle");
  if (navBtn) {
    navBtn.addEventListener("click", function () { document.body.classList.toggle("nav-open"); });
    document.addEventListener("click", function (e) {
      if (!document.body.classList.contains("nav-open")) return;
      if (e.target.closest(".sidebar.left") || e.target.closest(".nav-toggle")) return;
      document.body.classList.remove("nav-open");
    });
  }

  /* ---------- 5. 复盘表本地暂存 ---------- */
  var cells = document.querySelectorAll('td[contenteditable="true"]');
  cells.forEach(function (td) {
    var key = LS_CELL + td.dataset.key;
    var saved = null;
    try { saved = localStorage.getItem(key); } catch (e) {}
    if (saved) td.textContent = saved;
    td.addEventListener("input", function () {
      try {
        if (td.textContent.trim()) localStorage.setItem(key, td.textContent);
        else localStorage.removeItem(key);
      } catch (e) {}
      var bar = document.querySelector(".edit-toolbar .save-state");
      if (bar) {
        bar.textContent = "✓ 已暂存到本机浏览器";
        clearTimeout(bar._t);
        bar._t = setTimeout(function () { bar.textContent = ""; }, 1600);
      }
    });
    td.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); td.blur(); }
    });
  });

  var clearBtn = document.querySelector(".edit-toolbar .clear-recap");
  if (clearBtn) {
    clearBtn.addEventListener("click", function () {
      if (!confirm("清空本机浏览器暂存的所有复盘记录？（不影响 Word 原文档）")) return;
      cells.forEach(function (td) {
        td.textContent = "";
        try { localStorage.removeItem(LS_CELL + td.dataset.key); } catch (e) {}
      });
      var bar = document.querySelector(".edit-toolbar .save-state");
      if (bar) bar.textContent = "已清空";
    });
  }
})();
