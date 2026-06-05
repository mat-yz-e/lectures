/* ============================================================================
   DeepLearning.AI — Agentic AI Kursu
   Ortak navigasyon davranışı: sol sidebar üretimi, mobil çekmeceler,
   backdrop/Escape ve sağ sidebar (TOC) scroll-spy. Tamamen offline/yerel.
   ============================================================================ */
(function () {
  "use strict";

  var COURSE = [
    {
      folder: "Module-1-Introduction-to-Agentic-Workflows",
      title: "Module 1 — Introduction to Agentic Workflows",
      lessons: [
        ["M1-1-What-is-Agentic-AI", "1. What is Agentic AI"],
        ["M1-2-Degrees-of-Agenticness", "2. Degrees of Agenticness"],
        ["M1-3-Benefits-of-Agentic-AI", "3. Benefits of Agentic AI"],
        ["M1-4-Agentic-AI-Applications", "4. Agentic AI Applications"],
        ["M1-5-Task-Decomposition-Identifying-Steps-in-a-Workflow", "5. Task Decomposition: Identifying Steps in a Workflow"],
        ["M1-6-Evaluating-Agentic-AI", "6. Evaluating Agentic AI"],
        ["M1-7-Agentic-Design-Patterns", "7. Agentic Design Patterns"]
      ]
    },
    {
      folder: "Module-2-Reflection-Design-Pattern",
      title: "Module 2 — Reflection Design Pattern",
      lessons: [
        ["M2-1-Reflection-to-Improve-Outputs-of-a-Task", "1. Reflection to Improve Outputs of a Task"],
        ["M2-2-Why-Not-Just-Direct-Generation", "2. Why Not Just Direct Generation"],
        ["M2-3-Chart-Generation-Workflow", "3. Chart Generation Workflow"],
        ["M2-4-Chat-Generation", "4. Chart Generation"],
        ["M2-5-Evaluating-the-Impact-of-Reflection", "5. Evaluating the Impact of Reflection"],
        ["M2-6-Using-External-Feedback", "6. Using External Feedback"],
        ["M2-7-Improving-SQL-Generation-with-Reflection", "7. Improving SQL Generation with Reflection"]
      ]
    },
    {
      folder: "Module-3-Tool-Use",
      title: "Module 3 — Tool Use",
      lessons: [
        ["M3-1-What-Are-Tools", "1. What Are Tools"],
        ["M3-2-Creating-a-Tool", "2. Creating a Tool"],
        ["M3-3-Tool-Syntax", "3. Tool Syntax"],
        ["M3-4-Turning-Fuctions-into-Tools", "4. Turning Functions into Tools"],
        ["M3-5-Email-Assistant-Workflow", "5. Email Assistant Workflow"],
        ["M3-6-Code-Execution", "6. Code Execution"],
        ["M3-7-Model-Context-Protocol-MCP", "7. Model Context Protocol (MCP)"]
      ]
    },
    {
      folder: "Module-4-Practical-Tips-for-Building-Agentic-AI",
      title: "Module 4 — Practical Tips for Building Agentic AI",
      lessons: [
        ["M4-1-Evaluations", "1. Evaluations"],
        ["M4-2-Error-Analysis-and-Prioritizing-Next-Steps", "2. Error Analysis and Prioritizing Next Steps"],
        ["M4-3-More-Error-Analysis-Examples", "3. More Error Analysis Examples"],
        ["M4-4-Component-Level-Evaluations", "4. Component-Level Evaluations"],
        ["M4-5-Adding-a-Component-Level-Eval-to-the-Research-Workflow", "5. Adding a Component-Level Eval to the Research Workflow"],
        ["M4-6-How-to-Address-Problems-You-Identify", "6. How to Address Problems You Identify"],
        ["M4-7-Latency-Cost-Optimization", "7. Latency / Cost Optimization"],
        ["M4-8-Development-Process-Summary", "8. Development Process Summary"]
      ]
    },
    {
      folder: "Module-5-Patterns-for-Highly-Autonomous-Agents",
      title: "Module 5 — Patterns for Highly Autonomous Agents",
      lessons: [
        ["M5-1-Planning-Workflows", "1. Planning Workflows"],
        ["M5-2-Creating-and-Executing-LLM-Plans", "2. Creating and Executing LLM Plans"],
        ["M5-3-Planning-with-Code-Execution", "3. Planning with Code Execution"],
        ["M5-4-Customer-Service-Agent", "4. Customer Service Agent"],
        ["M5-5-Multi-Agentic-Workflows", "5. Multi-Agentic Workflows"],
        ["M5-6-Market-Research-Team", "6. Market Research Team"],
        ["M5-7-Communication-Patterns-for-Multi-Agent-Systems", "7. Communication Patterns for Multi-Agent Systems"]
      ]
    }
  ];

  var body = document.body;
  var root = body.getAttribute("data-root") || "";
  var active = body.getAttribute("data-active") || "";
  var isIndex = active === "index" || active === "";

  function el(tag, cls, attrs) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (attrs) Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    return node;
  }

  /* ---- Sol sidebar (kurs navigasyonu) üretimi ------------------------- */
  function buildCourseNav() {
    var aside = document.getElementById("course-nav");
    if (!aside) return;

    var brand = el("div", "sidebar-brand");

    // Sol sidebar marka logosu — yalnızca kurum / küratör logosu (kullanıcı tercihi)
    var sec = el("a", "sidebar-brand-secondary", {
      href: root + "index.html",
      "aria-label": "Ana sayfa — Matematik ve Yapay Zeka Enstitüsü"
    });
    var simg = el("img", null, {
      src: root + "matematik_ve_yapay_zeka_logo.jpeg",
      alt: "Matematik ve Yapay Zeka Enstitüsü logosu"
    });
    var scap = el("span", "sidebar-brand-caption");
    scap.innerHTML = "<strong>Hazırlayan kurum</strong>Matematik ve Yapay Zeka Enstitüsü";
    sec.appendChild(simg); sec.appendChild(scap);
    brand.appendChild(sec);

    var nav = el("nav", "course-nav-inner", { "aria-label": "Dersler" });

    var home = el("a", "nav-home" + (isIndex ? " is-current" : ""), { href: root + "index.html" });
    home.textContent = "Ana Sayfa";
    if (isIndex) home.setAttribute("aria-current", "page");
    nav.appendChild(home);

    COURSE.forEach(function (mod) {
      var moduleHasActive = false;
      var lessonsWrap = el("div", "nav-lessons");

      mod.lessons.forEach(function (pair) {
        var folder = pair[0], label = pair[1];
        var path = mod.folder + "/" + folder + "/" + folder + ".html";
        var link = el("a", "nav-lesson", { href: root + path });
        link.textContent = label;
        if (path === active) {
          link.classList.add("is-active");
          link.setAttribute("aria-current", "page");
          moduleHasActive = true;
        }
        lessonsWrap.appendChild(link);
      });

      var details = el("details", "nav-module" + (moduleHasActive ? " is-active-module" : ""));
      if (moduleHasActive) details.open = true;
      var summary = el("summary", "nav-module-title");
      summary.textContent = mod.title;
      details.appendChild(summary);
      details.appendChild(lessonsWrap);
      nav.appendChild(details);
    });

    aside.appendChild(brand);
    aside.appendChild(nav);

    // Aktif dersi görünür alana getir
    var activeLink = aside.querySelector(".nav-lesson.is-active");
    if (activeLink) {
      try { activeLink.scrollIntoView({ block: "center" }); } catch (e) { /* noop */ }
    }
  }

  /* ---- Mobil çekmeceler (off-canvas) ---------------------------------- */
  function setupDrawers() {
    var backdrop = document.getElementById("nav-backdrop");
    var courseSb = document.getElementById("course-nav");
    var tocSb = document.getElementById("toc-nav");
    var btnCourse = document.getElementById("btn-course");
    var btnToc = document.getElementById("btn-toc");

    function anyOpen() {
      return (courseSb && courseSb.classList.contains("is-open")) ||
             (tocSb && tocSb.classList.contains("is-open"));
    }
    function syncBackdrop() {
      if (!backdrop) return;
      backdrop.classList.toggle("is-active", anyOpen());
    }
    function close(sb, btn) {
      if (sb) sb.classList.remove("is-open");
      if (btn) btn.setAttribute("aria-expanded", "false");
      syncBackdrop();
    }
    function closeAll() {
      close(courseSb, btnCourse);
      close(tocSb, btnToc);
    }
    function toggle(sb, btn, other, otherBtn) {
      if (!sb) return;
      close(other, otherBtn);
      var open = sb.classList.toggle("is-open");
      if (btn) btn.setAttribute("aria-expanded", open ? "true" : "false");
      syncBackdrop();
    }

    if (btnCourse) btnCourse.addEventListener("click", function () { toggle(courseSb, btnCourse, tocSb, btnToc); });
    if (btnToc) btnToc.addEventListener("click", function () { toggle(tocSb, btnToc, courseSb, btnCourse); });
    if (backdrop) backdrop.addEventListener("click", closeAll);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeAll(); });

    // Bir bağlantıya tıklanınca çekmeceyi kapat (mobilde)
    [courseSb, tocSb].forEach(function (sb) {
      if (!sb) return;
      sb.addEventListener("click", function (e) {
        var a = e.target.closest ? e.target.closest("a") : null;
        if (a && window.matchMedia("(max-width: 1099px)").matches) closeAll();
      });
    });

    window.addEventListener("resize", function () {
      if (window.matchMedia("(min-width: 1100px)").matches) closeAll();
    });
  }

  /* ---- Sağ sidebar (TOC) scroll-spy ----------------------------------- */
  function setupScrollSpy() {
    var toc = document.getElementById("toc-nav");
    if (!toc) return;
    var links = [].slice.call(toc.querySelectorAll("a[href^='#']"));
    if (!links.length) return;

    var map = {};
    var targets = [];
    links.forEach(function (a) {
      var id = decodeURIComponent(a.getAttribute("href").slice(1));
      var node = document.getElementById(id);
      if (node) { map[id] = a; targets.push(node); }
    });
    if (!targets.length) return;

    function setActive(id) {
      links.forEach(function (a) { a.classList.remove("is-active"); });
      if (map[id]) {
        map[id].classList.add("is-active");
        if (map[id].getAttribute("aria-current") !== "true") {
          // görünürlük için TOC içinde kaydır
          var r = map[id].getBoundingClientRect();
          var tr = toc.getBoundingClientRect();
          if (r.top < tr.top || r.bottom > tr.bottom) {
            try { map[id].scrollIntoView({ block: "nearest" }); } catch (e) { /* noop */ }
          }
        }
      }
    }

    if ("IntersectionObserver" in window) {
      var visible = {};
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) visible[en.target.id] = en.intersectionRatio;
          else delete visible[en.target.id];
        });
        var best = null, bestTop = Infinity;
        targets.forEach(function (n) {
          var top = n.getBoundingClientRect().top;
          if (top <= 120 && top > -1e6) { if (Math.abs(top) < bestTop || top <= 120) { /* prefer last passed */ } }
        });
        // Aktif: viewport üstüne en yakın geçmiş başlık
        var current = null;
        targets.forEach(function (n) {
          if (n.getBoundingClientRect().top - 130 <= 0) current = n;
        });
        if (!current && targets.length) current = targets[0];
        if (current) setActive(current.id);
      }, { rootMargin: "-120px 0px -55% 0px", threshold: [0, 1] });
      targets.forEach(function (n) { obs.observe(n); });
    }

    // Yedek: doğrudan scroll dinleyici
    var ticking = false;
    window.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        var current = targets[0];
        targets.forEach(function (n) {
          if (n.getBoundingClientRect().top - 130 <= 0) current = n;
        });
        if (current) setActive(current.id);
        ticking = false;
      });
    }, { passive: true });
  }

  function init() {
    buildCourseNav();
    setupDrawers();
    setupScrollSpy();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
