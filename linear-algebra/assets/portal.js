(function () {
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
