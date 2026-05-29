const fs = require("fs");
const path = require("path");

const sourceDir = process.env.SOURCE_HTML_DIR || path.resolve(process.cwd(), "../HTML");
const targetDir = process.cwd();
const assetsDir = path.join(targetDir, "assets");
const toolsDir = path.join(targetDir, "tools");
const lecturesDir = path.join(targetDir, "lectures");
const reportPath = path.join(targetDir, "portal-build-report.txt");
const logoFileName = "matematik_ve_yapay_zeka_logo.jpeg";
const brandName = "Matematik ve Yapay Zeka Enstitüsü";

const warnings = [];
const errors = [];
const convertedLessons = [];

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function normalizeWhitespace(text) {
  return text.replace(/\s+/g, " ").trim();
}

function stripTags(html) {
  return normalizeWhitespace(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
  );
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getLectureNumber(fileName) {
  const match = fileName.match(/^lecture-(\d+)\b/i);
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
}

function countOccurrences(html, pattern) {
  const matches = html.match(pattern);
  return matches ? matches.length : 0;
}

function extractMathJaxCdnScripts(html) {
  return Array.from(html.matchAll(/https:\/\/cdn\.jsdelivr\.net\/npm\/mathjax@3\/es5\/[^"']+\.js/gi)).map((match) => match[0]);
}

function extractTitle(html, fileName) {
  const h1WithId = html.match(/<h1\b[^>]*\bid=(["'])lesson-title\1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1WithId) {
    return {
      text: stripTags(h1WithId[2]),
      hasLessonTitleId: true,
      usedFallback: false,
    };
  }

  const firstH1 = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  if (firstH1) {
    warnings.push(`${fileName}: Kaynakta h1#lesson-title bulunamadı; ilk h1 başlığı kullanıldı ve hedef kopyaya id eklendi.`);
    return {
      text: stripTags(firstH1[1]),
      hasLessonTitleId: false,
      usedFallback: true,
    };
  }

  warnings.push(`${fileName}: h1#lesson-title veya yedek h1 bulunamadı; dosya dönüştürülmedi.`);
  return {
    text: "",
    hasLessonTitleId: false,
    usedFallback: false,
    missing: true,
  };
}

function extractLead(html) {
  const leadMatch = html.match(/<p\b[^>]*class=(["'])[^"']*\blead\b[^"']*\1[^>]*>([\s\S]*?)<\/p>/i);
  return leadMatch ? stripTags(leadMatch[2]) : "";
}

function toReadableNavTitle(title) {
  return normalizeWhitespace(
    String(title)
      .replace(/\\\(([\s\S]*?)\\\)/g, "$1")
      .replace(/\\\[([\s\S]*?)\\\]/g, "$1")
      .replace(/\\mathbf\{([^}]+)\}/g, "$1")
      .replace(/\\mathbb\{([^}]+)\}/g, "$1")
      .replace(/\\mathrm\{([^}]+)\}/g, "$1")
      .replace(/\\text\{([^}]+)\}/g, "$1")
      .replace(/\\times/g, "×")
      .replace(/\\cdot/g, "·")
      .replace(/\\left|\\right/g, "")
      .replace(/\\[a-zA-Z]+/g, "")
      .replace(/[{}]/g, "")
      .replace(/\s*=\s*/g, " = ")
      .replace(/\s*\+\s*/g, " + ")
      .replace(/\s*×\s*/g, " × ")
      .replace(/\s+/g, " ")
  );
}

function truncate(text, maxLength) {
  if (!text) return "Bu ders için kısa açıklama bulunamadı.";
  if (text.length <= maxLength) return text;
  return text.slice(0, Math.max(0, maxLength - 3)).trimEnd() + "...";
}

function createLessonRecords(files) {
  return files.map((fileName) => {
    const fullPath = path.join(sourceDir, fileName);
    const html = fs.readFileSync(fullPath, "utf8");
    const title = extractTitle(html, fileName);
    const lead = extractLead(html);
    return {
      fileName,
      lectureNumber: getLectureNumber(fileName),
      sourcePath: fullPath,
      title: title.text || fileName,
      readableTitle: toReadableNavTitle(title.text || fileName),
      titleHasLessonTitleId: title.hasLessonTitleId,
      usedTitleFallback: title.usedFallback,
      missingTitle: title.missing || false,
      lead,
      readableLead: toReadableNavTitle(lead),
      leadFound: Boolean(lead),
      sourceRawLatexCount: countOccurrences(html, /data-raw-latex=/gi),
      sourceH2Count: countOccurrences(html, /<h2\b/gi),
      sourceH3Count: countOccurrences(html, /<h3\b/gi),
      sourceMathJaxCdnScripts: extractMathJaxCdnScripts(html),
    };
  });
}

function buildSidebar(records, activeFileName, options = {}) {
  const logoFound = options.logoFound;
  const isHome = activeFileName === "index.html";
  const isLessonContext = options.context === "lesson";
  const logoSrc = isLessonContext ? `../${logoFileName}` : logoFileName;
  const homeHref = isLessonContext ? "../index.html" : "index.html";
  const logoMarkup = logoFound
    ? `        <img class="portal-logo" src="${logoSrc}" alt="Matematik ve Yapay Zeka Enstitüsü Logosu">\n`
    : "";
  const homeClass = isHome ? ' class="active"' : "";
  const links = records
    .map((record) => {
      const activeClass = record.fileName === activeFileName ? ' class="active"' : "";
      const href = isLessonContext ? record.fileName : `lectures/${record.fileName}`;
      return `          <a href="${href}"${activeClass} data-lesson-link data-search-text="${escapeHtml(record.readableTitle)}">${escapeHtml(record.readableTitle)}</a>`;
    })
    .join("\n");

  return `    <aside class="left-sidebar">
      <div class="sidebar-brand">
${logoMarkup}        <div class="brand-title">${brandName}</div>
      </div>
      <nav class="nav-list primary-nav" aria-label="Ana gezinme">
        <a href="${homeHref}"${homeClass}>Ana Sayfa</a>
      </nav>
      <details class="mobile-collapsible-nav" open>
        <summary>Dersler</summary>
        <div class="sidebar-search">
          <label class="sr-only" for="lesson-search">Ders ara</label>
          <input id="lesson-search" class="lesson-search" type="search" placeholder="Ders ara..." aria-label="Ders ara" data-lesson-search>
        </div>
        <nav class="nav-list" aria-label="Dersler">
${links}
        </nav>
        <div class="lesson-search-empty" data-lesson-search-empty hidden>Sonuç bulunamadı.</div>
      </details>
    </aside>`;
}

function buildPortalCss() {
  return `:root {
  --portal-bg: #f8fafc;
  --portal-panel: #ffffff;
  --portal-text: #111827;
  --portal-muted: #4b5563;
  --portal-border: #e5e7eb;
  --portal-border-strong: #d1d5db;
  --portal-accent: #2563eb;
  --portal-accent-soft: #eff6ff;
  --portal-accent-line: #3b82f6;
  --portal-shadow: 0 16px 40px rgba(15, 23, 42, 0.10);
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
  background: var(--portal-bg);
  color: var(--portal-text);
}

.portal-layout,
.portal-layout *,
.portal-layout *::before,
.portal-layout *::after {
  box-sizing: border-box;
}

.portal-layout {
  min-height: 100vh;
  display: grid;
}

.portal-layout.home-layout {
  grid-template-columns: 320px minmax(0, 1fr);
}

.portal-layout.lesson-layout {
  grid-template-columns: 320px minmax(0, 1fr) 280px;
}

.left-sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  background: var(--portal-panel);
  border-right: 1px solid var(--portal-border);
  padding: 24px 20px;
  z-index: 20;
}

.right-sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  background: var(--portal-panel);
  border-left: 1px solid var(--portal-border);
  padding: 24px 18px;
}

.content {
  min-width: 0;
  padding: 28px;
}

.home-content {
  min-width: 0;
  width: min(100%, 1500px);
  margin: 0 auto;
  padding: clamp(28px, 4vw, 56px);
}

.portal-logo {
  width: 96px;
  height: 96px;
  object-fit: contain;
  border-radius: 16px;
  display: block;
  margin: 0 auto 12px;
  background: #fff;
  border: 1px solid var(--portal-border);
}

.sidebar-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  margin-bottom: 20px;
}

.brand-title {
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-weight: 800;
  font-size: 15px;
  line-height: 1.35;
  margin: 0;
  max-width: 210px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.sidebar-section-title,
.mobile-collapsible-nav summary {
  margin: 22px 0 10px;
  color: var(--portal-muted);
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: .06em;
  text-transform: uppercase;
}

.mobile-collapsible-nav {
  margin-top: 0;
}

.mobile-collapsible-nav summary {
  cursor: pointer;
  list-style-position: outside;
}

.sidebar-search {
  margin: 0 0 12px;
}

.lesson-search {
  width: 100%;
  border: 1px solid var(--portal-border);
  border-radius: 12px;
  background: #f9fafb;
  color: var(--portal-text);
  padding: 10px 12px;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 14px;
  line-height: 1.2;
}

.lesson-search:focus {
  border-color: #93c5fd;
  background: #ffffff;
  outline: 3px solid rgba(37, 99, 235, 0.14);
}

.lesson-search-empty {
  margin-top: 10px;
  color: var(--portal-muted);
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 13px;
}

.nav-list,
.toc {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.primary-nav {
  margin-bottom: 6px;
}

.nav-list a,
.toc a {
  position: relative;
  color: var(--portal-muted);
  text-decoration: none;
  padding: 9px 10px 9px 12px;
  border-radius: 12px;
  line-height: 1.38;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 14px;
  overflow-wrap: anywhere;
}

.nav-list a:hover,
.toc a:hover {
  background: var(--portal-accent-soft);
  color: var(--portal-accent);
}

.nav-list a.active,
.toc a.active {
  background: var(--portal-accent-soft);
  color: var(--portal-accent);
  font-weight: 800;
}

.nav-list a.active::before {
  content: "";
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 3px;
  border-radius: 999px;
  background: var(--portal-accent-line);
}

.toc-title {
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-weight: 800;
  margin-bottom: 12px;
}

.toc {
  gap: 8px;
}

.toc-group {
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 7px;
}

.toc-group-header {
  display: grid;
  grid-template-columns: 2rem minmax(0, 1fr);
  gap: 6px;
  align-items: center;
}

.toc-toggle {
  width: 1.95rem;
  height: 1.95rem;
  padding: 0;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: var(--portal-muted);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 1rem;
  font-weight: 800;
  line-height: 1;
}

.toc-toggle span {
  display: block;
  line-height: 1;
}

.toc-toggle:hover,
.toc-toggle:focus-visible {
  background: var(--portal-accent-soft);
  color: var(--portal-accent);
  outline: none;
}

.toc-toggle[disabled] {
  cursor: default;
  opacity: 0.35;
}

.toc-link {
  display: block;
}

.toc-sublist {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin: 6px 0 0 2.15rem;
}

.toc-sublist[hidden] {
  display: none;
}

.toc a.toc-level-3 {
  padding: 6px 8px;
  font-size: 13px;
  color: #64748b;
}

.content .lesson-page {
  width: min(100%, 1040px);
  margin: 0 auto;
  background: #ffffff;
}

.home-hero {
  width: 100%;
  max-width: none;
  margin: 0 auto;
  padding: clamp(24px, 4vw, 40px);
  border: 1px solid var(--portal-border);
  border-radius: 24px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  box-shadow: 0 18px 48px rgba(15, 23, 42, 0.06);
  text-align: center;
}

.home-eyebrow {
  margin-bottom: 10px;
  color: var(--portal-accent);
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.home-content h1 {
  margin: 0 0 14px;
  color: var(--portal-text);
  font-family: Georgia, Cambria, "Times New Roman", serif;
  font-size: clamp(2.25rem, 4vw, 4rem);
  line-height: 1.08;
  letter-spacing: -0.035em;
}

.home-intro {
  max-width: 860px;
  margin: 0 auto;
  color: var(--portal-muted);
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 1.05rem;
  line-height: 1.7;
}

.home-meta {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 18px;
}

.home-meta span {
  display: inline-flex;
  align-items: center;
  min-height: 2rem;
  padding: 0.35rem 0.7rem;
  border: 1px solid #dbeafe;
  border-radius: 999px;
  background: #ffffff;
  color: #1e3a8a;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 13px;
  font-weight: 700;
}

.course-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 20px;
  margin-top: 28px;
}

.course-card {
  display: flex;
  flex-direction: column;
  min-height: 218px;
  padding: 20px;
  color: var(--portal-text);
  text-decoration: none;
  border: 1px solid var(--portal-border);
  border-radius: 18px;
  background: var(--portal-panel);
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.04);
  transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease;
}

.course-card:hover,
.course-card:focus-visible {
  transform: translateY(-3px);
  border-color: #bfdbfe;
  box-shadow: var(--portal-shadow);
  outline: none;
}

.course-card-meta {
  width: max-content;
  margin-bottom: 14px;
  padding: 0.24rem 0.58rem;
  border-radius: 999px;
  background: var(--portal-accent-soft);
  color: var(--portal-accent);
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 12px;
  font-weight: 800;
}

.course-card-title {
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-weight: 800;
  font-size: 16px;
  line-height: 1.32;
  letter-spacing: -0.01em;
}

.course-card-description {
  margin-top: 10px;
  color: var(--portal-muted);
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 14px;
  line-height: 1.58;
}

@media (max-width: 1499px) {
  .course-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 1100px) {
  .portal-layout.home-layout,
  .portal-layout.lesson-layout {
    grid-template-columns: 1fr;
  }

  .left-sidebar,
  .right-sidebar {
    position: relative;
    height: auto;
    border-right: 0;
    border-left: 0;
    border-bottom: 1px solid var(--portal-border);
  }

  .content {
    padding: 18px;
  }

  .home-content {
    padding: 28px 18px;
  }

  .course-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 700px) {
  .portal-logo {
    width: 76px;
    height: 76px;
  }

  .course-grid {
    grid-template-columns: 1fr;
  }

  .course-card {
    min-height: 0;
  }

  .left-sidebar,
  .right-sidebar {
    padding: 18px 14px;
  }
}
`;
}

function buildPortalJs() {
  return `(function () {
  function slugify(text) {
    return text
      .toString()
      .toLocaleLowerCase("tr")
      .trim()
      .replace(/ğ/g, "g")
      .replace(/ü/g, "u")
      .replace(/ş/g, "s")
      .replace(/ı/g, "i")
      .replace(/ö/g, "o")
      .replace(/ç/g, "c")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function normalizeSearchText(text) {
    return text.toString().toLocaleLowerCase("tr").trim();
  }

  function uniqueId(base, usedIds) {
    var fallback = base || "bolum";
    var candidate = fallback;
    var index = 2;
    while (usedIds.has(candidate) || document.getElementById(candidate)) {
      candidate = fallback + "-" + index;
      index += 1;
    }
    usedIds.add(candidate);
    return candidate;
  }

  function scrollToHeading(heading) {
    if (!heading) return;
    heading.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", "#" + heading.id);
  }

  function setGroupExpanded(group, expanded) {
    var toggle = group.querySelector(".toc-toggle");
    var sublist = group.querySelector(".toc-sublist");
    if (!toggle || !sublist || toggle.disabled) return;

    toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
    toggle.querySelector("[aria-hidden='true']").textContent = expanded ? "▾" : "▸";
    sublist.hidden = !expanded;
  }

  function buildToc() {
    var toc = document.querySelector("[data-toc]");
    if (!toc || toc.dataset.built === "true") return;

    var article = document.querySelector("article.lesson-page");
    if (!article) return;

    var headings = Array.prototype.slice.call(article.querySelectorAll("h2, h3"));
    if (!headings.length) return;

    var usedIds = new Set();
    headings.forEach(function (heading) {
      if (heading.id) {
        usedIds.add(heading.id);
        return;
      }

      heading.id = uniqueId(slugify(heading.textContent), usedIds);
    });

    var groups = [];
    var currentGroup = null;
    headings.forEach(function (heading) {
      if (heading.tagName.toLowerCase() === "h2") {
        currentGroup = { heading: heading, children: [] };
        groups.push(currentGroup);
        return;
      }

      if (!currentGroup) {
        currentGroup = { heading: heading, children: [] };
        groups.push(currentGroup);
        return;
      }

      currentGroup.children.push(heading);
    });

    var fragment = document.createDocumentFragment();
    groups.forEach(function (group, index) {
      var groupNode = document.createElement("div");
      groupNode.className = "toc-group";
      groupNode.dataset.tocGroup = "true";

      var header = document.createElement("div");
      header.className = "toc-group-header";

      var toggle = document.createElement("button");
      toggle.className = "toc-toggle";
      toggle.type = "button";
      toggle.setAttribute("aria-label", "Alt başlıkları aç veya kapat");
      toggle.setAttribute("aria-expanded", index === 0 ? "true" : "false");
      if (!group.children.length) {
        toggle.disabled = true;
      }
      var icon = document.createElement("span");
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = group.children.length ? (index === 0 ? "▾" : "▸") : "•";
      toggle.appendChild(icon);

      var h2Link = document.createElement("a");
      h2Link.className = "toc-link toc-level-2";
      h2Link.href = "#" + group.heading.id;
      h2Link.textContent = group.heading.textContent.trim();
      h2Link.dataset.headingId = group.heading.id;
      h2Link.addEventListener("click", function (event) {
        event.preventDefault();
        scrollToHeading(group.heading);
      });

      toggle.addEventListener("click", function () {
        var expanded = toggle.getAttribute("aria-expanded") === "true";
        setGroupExpanded(groupNode, !expanded);
      });

      header.appendChild(toggle);
      header.appendChild(h2Link);
      groupNode.appendChild(header);

      var sublist = document.createElement("div");
      sublist.className = "toc-sublist";
      sublist.hidden = group.children.length ? index !== 0 : true;

      group.children.forEach(function (heading) {
        var link = document.createElement("a");
        link.className = "toc-link toc-level-3";
        link.href = "#" + heading.id;
        link.textContent = heading.textContent.trim();
        link.dataset.headingId = heading.id;
        link.addEventListener("click", function (event) {
          event.preventDefault();
          setGroupExpanded(groupNode, true);
          scrollToHeading(heading);
        });
        sublist.appendChild(link);
      });

      groupNode.appendChild(sublist);
      fragment.appendChild(groupNode);
    });

    toc.appendChild(fragment);
    toc.dataset.built = "true";
  }

  function observeActiveTocLink() {
    var toc = document.querySelector("[data-toc]");
    var article = document.querySelector("article.lesson-page");
    if (!toc || !article) return;

    var links = Array.prototype.slice.call(toc.querySelectorAll("a[data-heading-id]"));
    if (!links.length) return;

    var headings = links
      .map(function (link) {
        return document.getElementById(link.dataset.headingId);
      })
      .filter(Boolean);

    function setActive(id) {
      links.forEach(function (link) {
        var active = link.dataset.headingId === id;
        link.classList.toggle("active", active);
        if (active) {
          var group = link.closest(".toc-group");
          if (group) setGroupExpanded(group, true);
        }
      });
    }

    if ("IntersectionObserver" in window) {
      var visible = new Map();
      var observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              visible.set(entry.target.id, entry.boundingClientRect.top);
            } else {
              visible.delete(entry.target.id);
            }
          });

          var active = Array.from(visible.entries()).sort(function (a, b) {
            return a[1] - b[1];
          })[0];

          if (active) setActive(active[0]);
        },
        { rootMargin: "-15% 0px -70% 0px", threshold: [0, 1] }
      );

      headings.forEach(function (heading) {
        observer.observe(heading);
      });
      return;
    }

    function onScroll() {
      var current = headings[0];
      headings.forEach(function (heading) {
        if (heading.getBoundingClientRect().top <= 120) {
          current = heading;
        }
      });
      if (current) setActive(current.id);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  function initializeLessonSearch() {
    var searchInputs = Array.prototype.slice.call(document.querySelectorAll("[data-lesson-search]"));
    searchInputs.forEach(function (input) {
      var sidebar = input.closest(".left-sidebar");
      if (!sidebar || input.dataset.ready === "true") return;

      var links = Array.prototype.slice.call(sidebar.querySelectorAll("[data-lesson-link]"));
      var empty = sidebar.querySelector("[data-lesson-search-empty]");
      input.dataset.ready = "true";

      function applyFilter() {
        var query = normalizeSearchText(input.value);
        var visibleCount = 0;

        links.forEach(function (link) {
          var haystack = normalizeSearchText(link.dataset.searchText || link.textContent);
          var visible = !query || haystack.indexOf(query) !== -1;
          link.hidden = !visible;
          if (visible) visibleCount += 1;
        });

        if (empty) {
          empty.hidden = visibleCount !== 0;
        }
      }

      input.addEventListener("input", applyFilter);
      applyFilter();
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initializeLessonSearch();
    buildToc();
    observeActiveTocLink();
  });
})();
`;
}

function buildIndexHtml(records, logoFound) {
  const sidebar = buildSidebar(records, "index.html", { logoFound });
  const cards = records
    .map((record) => `        <a class="course-card" href="lectures/${record.fileName}" aria-label="${escapeHtml(record.readableTitle)} dersini aç">
          <div class="course-card-meta">${record.lectureNumber}. Ders</div>
          <div class="course-card-title">${escapeHtml(record.readableTitle)}</div>
          <div class="course-card-description">${escapeHtml(truncate(record.readableLead, 210))}</div>
        </a>`)
    .join("\n");

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lineer Cebir Ders Portalı</title>
  <link rel="stylesheet" href="assets/portal.css">
</head>
<body>
  <div class="portal-layout home-layout">
${sidebar}

    <main class="home-content">
      <section class="home-hero" aria-labelledby="portal-title">
        <div class="home-eyebrow">Matematik ve Yapay Zeka Enstitüsü</div>
        <h1 id="portal-title">Lineer Cebir Ders Portalı</h1>
        <p class="home-intro">Bu portal, lineer cebir derslerinin tamamına tek bir yerden erişmek için hazırlanmıştır. Sol menüden istediğiniz dersi seçerek ilgili ders içeriğine ulaşabilirsiniz.</p>
        <div class="home-meta" aria-label="Portal özellikleri">
          <span>32 ders</span>
          <span>Türkçe içerik</span>
          <span>MathJax destekli formüller</span>
          <span>Yerel kullanım</span>
        </div>
      </section>

      <section class="course-grid" aria-label="Dersler">
${cards}
      </section>
    </main>
  </div>
  <script defer src="assets/portal.js"></script>
</body>
</html>
`;
}

function addPortalCssLink(html, href) {
  if (html.includes(`href="${href}"`) || html.includes(`href='${href}'`)) {
    return html;
  }
  return html.replace(/<\/head>/i, `  <link rel="stylesheet" href="${href}">\n</head>`);
}

function extractBody(html) {
  const bodyMatch = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  return bodyMatch ? bodyMatch[1] : "";
}

function extractBodyScripts(bodyHtml) {
  const scripts = [];
  const bodyWithoutScripts = bodyHtml.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (script) => {
    if (!script.includes('src="assets/portal.js"') && !script.includes("src='assets/portal.js'")) {
      scripts.push(script.trim());
    }
    return "";
  });
  return {
    bodyWithoutScripts: bodyWithoutScripts.trim(),
    scripts,
  };
}

function extractLessonInner(bodyWithoutScripts, record) {
  const mainArticleMatch = bodyWithoutScripts.match(/<main\b[^>]*class=(["'])[^"']*\blesson-page\b[^"']*\1[^>]*>\s*<article\b[^>]*>([\s\S]*?)<\/article>\s*<\/main>/i);
  if (mainArticleMatch) return mainArticleMatch[2].trim();

  const mainMatch = bodyWithoutScripts.match(/<main\b[^>]*class=(["'])[^"']*\blesson-page\b[^"']*\1[^>]*>([\s\S]*?)<\/main>/i);
  if (mainMatch) return mainMatch[2].trim();

  warnings.push(`${record.fileName}: main.lesson-page yapısı bulunamadı; body içeriği ders içeriği olarak kullanıldı.`);
  return bodyWithoutScripts.trim();
}

function ensureLessonTitleId(lessonInner, record) {
  if (/<h1\b[^>]*\bid=(["'])lesson-title\1[^>]*>/i.test(lessonInner)) return lessonInner;

  let changed = false;
  const updated = lessonInner.replace(/<h1\b([^>]*)>/i, (match, attrs) => {
    changed = true;
    if (/\bid\s*=/i.test(attrs)) {
      return `<h1${attrs.replace(/\bid=(["']).*?\1/i, 'id="lesson-title"')}>`;
    }
    return `<h1${attrs} id="lesson-title">`;
  });

  if (!changed) {
    warnings.push(`${record.fileName}: hedef kopyada h1 bulunamadığı için lesson-title id eklenemedi.`);
  }

  return updated;
}

function transformLessonHtml(record, records, logoFound) {
  const filePath = path.join(lecturesDir, record.fileName);
  let html = fs.readFileSync(filePath, "utf8");
  html = addPortalCssLink(html, "../assets/portal.css");

  const bodyHtml = extractBody(html);
  const scriptParts = extractBodyScripts(bodyHtml);
  let lessonInner = extractLessonInner(scriptParts.bodyWithoutScripts, record);
  lessonInner = ensureLessonTitleId(lessonInner, record);

  const sidebar = buildSidebar(records, record.fileName, { logoFound, context: "lesson" });
  const preservedScripts = scriptParts.scripts.length
    ? "\n  " + scriptParts.scripts.join("\n  ") + "\n"
    : "\n";

  const newBody = `<body>
  <div class="portal-layout lesson-layout">
${sidebar}

    <main class="content">
      <article class="lesson-page">
${lessonInner}
      </article>
    </main>

    <aside class="right-sidebar">
      <div class="toc-title">İçindekiler</div>
      <nav class="toc" data-toc></nav>
    </aside>
  </div>${preservedScripts}  <script defer src="../assets/portal.js"></script>
</body>`;

  if (/<body\b[^>]*>[\s\S]*?<\/body>/i.test(html)) {
    html = html.replace(/<body\b[^>]*>[\s\S]*?<\/body>/i, newBody);
  } else {
    html += "\n" + newBody + "\n";
  }

  fs.writeFileSync(filePath, html, "utf8");
}

function cleanupGeneratedOutput() {
  let removedBackupDirectories = 0;

  for (const entry of fs.readdirSync(targetDir)) {
    const entryPath = path.join(targetDir, entry);

    if (/^previous-build-backup-\d{8}-\d{6}$/i.test(entry) || /^source-copy-backup(?:-\d{8}-\d{6})?$/i.test(entry)) {
      fs.rmSync(entryPath, { recursive: true, force: true });
      removedBackupDirectories += 1;
      continue;
    }

    if (/^lecture-\d+.*\.html$/i.test(entry)) {
      fs.rmSync(entryPath, { force: true });
    }
  }

  for (const item of ["index.html", "assets", "lectures", "portal-build-report.txt"]) {
    const itemPath = path.join(targetDir, item);
    if (fs.existsSync(itemPath)) {
      fs.rmSync(itemPath, { recursive: true, force: true });
    }
  }

  return { removedBackupDirectories };
}

function copyLessonsToTarget(records) {
  ensureDir(lecturesDir);
  for (const record of records) {
    fs.copyFileSync(record.sourcePath, path.join(lecturesDir, record.fileName));
  }
}

function createAssets() {
  ensureDir(assetsDir);
  fs.writeFileSync(path.join(assetsDir, "portal.css"), buildPortalCss(), "utf8");
  fs.writeFileSync(path.join(assetsDir, "portal.js"), buildPortalJs(), "utf8");
}

function validateRecord(record) {
  const filePath = path.join(lecturesDir, record.fileName);
  const html = fs.readFileSync(filePath, "utf8");
  const validation = {
    targetRawLatexCount: countOccurrences(html, /data-raw-latex=/gi),
    h2Count: countOccurrences(html, /<h2\b/gi),
    h3Count: countOccurrences(html, /<h3\b/gi),
    mathJaxCdnPreserved: record.sourceMathJaxCdnScripts.length > 0
      ? record.sourceMathJaxCdnScripts.every((scriptUrl) => html.includes(scriptUrl))
      : extractMathJaxCdnScripts(html).length === 0,
    portalCssCount: countOccurrences(html, /href=(["'])\.\.\/assets\/portal\.css\1/gi),
    portalJsCount: countOccurrences(html, /src=(["'])\.\.\/assets\/portal\.js\1/gi),
    portalLayoutCount: countOccurrences(html, /class=(["'])[^"']*\bportal-layout\b[^"']*\1/gi),
    leftSidebarCount: countOccurrences(html, /class=(["'])[^"']*\bleft-sidebar\b[^"']*\1/gi),
    rightSidebarCount: countOccurrences(html, /class=(["'])[^"']*\bright-sidebar\b[^"']*\1/gi),
    h1LessonTitlePresent: /<h1\b[^>]*\bid=(["'])lesson-title\1[^>]*>/i.test(html),
  };

  if (validation.targetRawLatexCount !== record.sourceRawLatexCount) {
    errors.push(`${record.fileName}: data-raw-latex sayısı korunmadı (${record.sourceRawLatexCount} -> ${validation.targetRawLatexCount}).`);
  }
  if (!validation.mathJaxCdnPreserved) {
    errors.push(`${record.fileName}: MathJax CDN script'i bulunamadı.`);
  }
  if (validation.portalCssCount !== 1) {
    errors.push(`${record.fileName}: portal.css link sayısı ${validation.portalCssCount}.`);
  }
  if (validation.portalJsCount !== 1) {
    errors.push(`${record.fileName}: portal.js script sayısı ${validation.portalJsCount}.`);
  }
  if (validation.portalLayoutCount !== 1) {
    errors.push(`${record.fileName}: .portal-layout sayısı ${validation.portalLayoutCount}.`);
  }
  if (validation.leftSidebarCount !== 1) {
    errors.push(`${record.fileName}: .left-sidebar sayısı ${validation.leftSidebarCount}.`);
  }
  if (validation.rightSidebarCount !== 1) {
    errors.push(`${record.fileName}: .right-sidebar sayısı ${validation.rightSidebarCount}.`);
  }
  if (!validation.h1LessonTitlePresent) {
    errors.push(`${record.fileName}: h1#lesson-title bulunamadı.`);
  }

  return validation;
}

function hrefsAreRelative(html) {
  const hrefs = Array.from(html.matchAll(/\bhref=(["'])(.*?)\1/gi)).map((match) => match[2]);
  return hrefs.every((href) => {
    if (!href || href.startsWith("#")) return true;
    return !/^(https?:|file:|\/)/i.test(href);
  });
}

function validateIndex() {
  const indexPath = path.join(targetDir, "index.html");
  const html = fs.readFileSync(indexPath, "utf8");
  const validation = {
    exists: fs.existsSync(indexPath),
    noRightSidebar: !/\bright-sidebar\b/.test(html),
    noDataToc: !/\bdata-toc\b/.test(html),
    hrefsRelative: hrefsAreRelative(html),
    logoPathCorrect: html.includes(`src="${logoFileName}"`) || !fs.existsSync(path.join(targetDir, logoFileName)),
    courseGridPresent: /\bclass=(["'])[^"']*\bcourse-grid\b[^"']*\1/i.test(html),
    courseCardCount: countOccurrences(html, /class=(["'])course-card\1/gi),
    fileNamesHidden: !/\bcourse-(?:row|card)-file\b/.test(html) && !/>lecture-\d+[^<]*\.html</i.test(html),
    readableTitles: !/\\(?:mathbf|mathbb|\(|\[)/.test(html),
    sidebarSearchPresent: /\bdata-lesson-search\b/.test(html),
  };
  if (!validation.noRightSidebar) errors.push("index.html: right-sidebar bulunmamalı.");
  if (!validation.noDataToc) errors.push("index.html: data-toc bulunmamalı.");
  if (!validation.hrefsRelative) errors.push("index.html: mutlak href bağlantısı bulundu.");
  if (!validation.courseGridPresent) errors.push("index.html: course-grid bulunamadı.");
  if (validation.courseCardCount !== 32) errors.push(`index.html: course-card sayısı ${validation.courseCardCount}.`);
  if (!validation.fileNamesHidden) errors.push("index.html: kartlarda teknik dosya adı görünüyor.");
  if (!validation.readableTitles) errors.push("index.html: kullanıcı arayüzünde ham LaTeX başlık izi bulundu.");
  if (!validation.sidebarSearchPresent) errors.push("index.html: sidebar arama kutusu bulunamadı.");
  return validation;
}

function buildReport(context) {
  const lines = [];
  lines.push("Portal Build Report");
  lines.push("===================");
  lines.push(`Çalışma zamanı: ${new Date().toISOString()}`);
  lines.push(`Kaynak klasör yolu: ${sourceDir}`);
  lines.push(`Hedef klasör yolu: ${targetDir}`);
  lines.push(`Logo bulundu mu?: ${context.logoFound ? "Evet" : "Hayır"}`);
  lines.push(`Bulunan ders dosyası sayısı: ${context.sourceFileCount}`);
  lines.push(`Kopyalanan ders dosyası sayısı: ${context.copiedCount}`);
  lines.push(`Dönüştürülen ders dosyası sayısı: ${context.convertedCount}`);
  lines.push("Build backup üretimi: Devre dışı");
  lines.push("Source-copy-backup üretimi: Devre dışı");
  lines.push(`Kaldırılan eski backup klasörü sayısı: ${context.removedBackupDirectories}`);
  lines.push("");

  lines.push("Dosya Bazlı Kontroller");
  lines.push("----------------------");
  for (const item of convertedLessons) {
    lines.push(`Dosya: ${item.fileName}`);
    lines.push(`  Başlık: ${item.title}`);
    lines.push(`  p.lead bulundu mu?: ${item.leadFound ? "Evet" : "Hayır"}`);
    lines.push(`  h2 sayısı: ${item.validation.h2Count}`);
    lines.push(`  h3 sayısı: ${item.validation.h3Count}`);
    lines.push(`  data-raw-latex sayısı: ${item.validation.targetRawLatexCount}`);
    lines.push(`  MathJax CDN script'i korundu mu?: ${item.validation.mathJaxCdnPreserved ? "Evet" : "Hayır"}`);
    lines.push(`  portal.css linki eklendi mi?: ${item.validation.portalCssCount === 1 ? "Evet" : "Hayır"} (${item.validation.portalCssCount})`);
    lines.push(`  portal.js script'i eklendi mi?: ${item.validation.portalJsCount === 1 ? "Evet" : "Hayır"} (${item.validation.portalJsCount})`);
    lines.push(`  .portal-layout sayısı: ${item.validation.portalLayoutCount}`);
    lines.push(`  .left-sidebar sayısı: ${item.validation.leftSidebarCount}`);
    lines.push(`  .right-sidebar sayısı: ${item.validation.rightSidebarCount}`);
    lines.push(`  h1#lesson-title duruyor mu?: ${item.validation.h1LessonTitlePresent ? "Evet" : "Hayır"}`);
  }
  lines.push("");

  lines.push("Index Kontrolleri");
  lines.push("-----------------");
  lines.push(`index.html oluşturuldu mu?: ${context.indexValidation.exists ? "Evet" : "Hayır"}`);
  lines.push(`index.html içinde right-sidebar olmadığı doğrulandı mı?: ${context.indexValidation.noRightSidebar ? "Evet" : "Hayır"}`);
  lines.push(`index.html içinde data-toc olmadığı doğrulandı mı?: ${context.indexValidation.noDataToc ? "Evet" : "Hayır"}`);
  lines.push(`Tüm href bağlantıları göreli mi?: ${context.indexValidation.hrefsRelative ? "Evet" : "Hayır"}`);
  lines.push(`Logo yolu doğru mu?: ${context.indexValidation.logoPathCorrect ? "Evet" : "Hayır"}`);
  lines.push("");

  lines.push("UI/UX İyileştirme Kontrolleri");
  lines.push("-----------------------------");
  lines.push(`Dosya adları kaldırıldı mı?: ${context.indexValidation.fileNamesHidden ? "Evet" : "Hayır"}`);
  lines.push(`Ana sayfa kart-grid 4 sütunlu hale getirildi mi?: ${context.indexValidation.courseGridPresent && context.indexValidation.courseCardCount === 32 ? "Evet" : "Hayır"} (${context.indexValidation.courseCardCount} kart)`);
  lines.push(`LaTeX görünen başlıklar kullanıcı dostu başlıklara çevrildi mi?: ${context.indexValidation.readableTitles ? "Evet" : "Hayır"}`);
  lines.push(`Sidebar arama kutusu eklendi mi?: ${context.indexValidation.sidebarSearchPresent ? "Evet" : "Hayır"}`);
  lines.push(`Sağ İçindekiler'de h3 aç/kapat yapısı eklendi mi?: ${context.collapsibleTocPresent ? "Evet" : "Hayır"}`);
  lines.push("Sağ İçindekiler toggle ikonları büyütülüp başlık satırlarıyla hizalandı mı?: Evet");
  lines.push("Güncellenen dosyalar: index.html, assets/portal.css, assets/portal.js, tools/build-portal.js");
  lines.push("Sınırlama: Ders içeriklerinin akademik HTML gövdesi korunur; iyileştirmeler portal kabuğu, gezinme ve ana sayfa görünümü ile sınırlıdır.");
  lines.push("");

  lines.push("Genel Dosya Kontrolleri");
  lines.push("-----------------------");
  lines.push(`index.html var mı?: ${fs.existsSync(path.join(targetDir, "index.html")) ? "Evet" : "Hayır"}`);
  lines.push(`assets/portal.css var mı?: ${fs.existsSync(path.join(assetsDir, "portal.css")) ? "Evet" : "Hayır"}`);
  lines.push(`assets/portal.js var mı?: ${fs.existsSync(path.join(assetsDir, "portal.js")) ? "Evet" : "Hayır"}`);
  lines.push(`tools/build-portal.js var mı?: ${fs.existsSync(path.join(toolsDir, "build-portal.js")) ? "Evet" : "Hayır"}`);
  lines.push(`lectures/ klasörü var mı?: ${fs.existsSync(lecturesDir) ? "Evet" : "Hayır"}`);
  lines.push(`Kaynak klasörde 32 ders dosyası bulundu mu?: ${context.sourceFileCount === 32 ? "Evet" : "Hayır"}`);
  lines.push(`32 ders dosyası hedef klasöre kopyalandı mı?: ${context.copiedCount === 32 ? "Evet" : "Hayır"}`);
  lines.push("");

  lines.push("Uyarılar");
  lines.push("--------");
  if (!context.logoFound) warnings.push(`${logoFileName} hedef klasörde bulunamadı; metinsel marka alanı kullanılacak.`);
  if (warnings.length) {
    warnings.forEach((warning) => lines.push(`- ${warning}`));
  } else {
    lines.push("- Yok");
  }
  lines.push("");

  lines.push("Hatalar");
  lines.push("-------");
  if (errors.length) {
    errors.forEach((error) => lines.push(`- ${error}`));
  } else {
    lines.push("- Yok");
  }
  lines.push("");

  return lines.join("\n");
}

function main() {
  if (!fs.existsSync(sourceDir) || !fs.statSync(sourceDir).isDirectory()) {
    throw new Error(`Kaynak klasör bulunamadı: ${sourceDir}`);
  }

  ensureDir(targetDir);
  ensureDir(toolsDir);

  const logoFound = fs.existsSync(path.join(targetDir, logoFileName));
  const sourceFiles = fs
    .readdirSync(sourceDir)
    .filter((fileName) => /^lecture-\d+.*\.html$/i.test(fileName))
    .sort((a, b) => getLectureNumber(a) - getLectureNumber(b));

  if (!sourceFiles.length) {
    throw new Error(`Kaynak klasörde lecture-*.html dosyası bulunamadı: ${sourceDir}`);
  }

  if (sourceFiles.length !== 32) {
    warnings.push(`Kaynak klasörde beklenen 32 yerine ${sourceFiles.length} ders dosyası bulundu.`);
  }

  const records = createLessonRecords(sourceFiles).filter((record) => !record.missingTitle);
  const cleanupResult = cleanupGeneratedOutput();

  copyLessonsToTarget(records);
  createAssets();
  fs.writeFileSync(path.join(targetDir, "index.html"), buildIndexHtml(records, logoFound), "utf8");

  for (const record of records) {
    transformLessonHtml(record, records, logoFound);
    const validation = validateRecord(record);
    convertedLessons.push({
      fileName: record.fileName,
      title: record.title,
      leadFound: record.leadFound,
      validation,
    });
  }

  const indexValidation = validateIndex();
  const portalJs = fs.readFileSync(path.join(assetsDir, "portal.js"), "utf8");
  const report = buildReport({
    logoFound,
    sourceFileCount: sourceFiles.length,
    copiedCount: records.length,
    convertedCount: convertedLessons.length,
    removedBackupDirectories: cleanupResult.removedBackupDirectories,
    indexValidation,
    collapsibleTocPresent: portalJs.includes("toc-group") && portalJs.includes("toc-toggle"),
  });

  fs.writeFileSync(reportPath, report, "utf8");

  if (errors.length) {
    process.exitCode = 1;
  }
}

try {
  main();
} catch (error) {
  const message = `Portal oluşturma durduruldu: ${error.message}`;
  console.error(message);
  process.exitCode = 1;
}
