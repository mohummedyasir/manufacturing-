/* GulfMakers — lightweight vanilla JS. No dependencies. */
(function () {
  "use strict";

  // ---- Mobile nav toggle ----
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector(".main-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  // ---- Year in footer ----
  var y = document.querySelectorAll("[data-year]");
  var year = new Date().getFullYear();
  y.forEach(function (el) { el.textContent = year; });

  // ---- Job filtering (only on pages with the job list) ----
  var list = document.getElementById("job-list");
  if (!list) return;

  var cards = Array.prototype.slice.call(list.querySelectorAll(".job-card"));
  var kw = document.getElementById("f-keyword");
  var country = document.getElementById("f-country");
  var category = document.getElementById("f-category");
  var typeChecks = Array.prototype.slice.call(document.querySelectorAll("input[data-filter-type]"));
  var countEl = document.getElementById("result-count");
  var noResults = document.getElementById("no-results");
  var clearBtn = document.getElementById("clear-filters");

  function readParams() {
    var p = new URLSearchParams(window.location.search);
    if (p.get("q") && kw) kw.value = p.get("q");
    if (p.get("country") && country) country.value = p.get("country");
    if (p.get("category") && category) category.value = p.get("category");
  }

  function apply() {
    var q = (kw && kw.value || "").trim().toLowerCase();
    var c = (country && country.value) || "";
    var cat = (category && category.value) || "";
    var types = typeChecks.filter(function (t) { return t.checked; }).map(function (t) { return t.value; });
    var shown = 0;

    cards.forEach(function (card) {
      var hay = (card.getAttribute("data-search") || "").toLowerCase();
      var matchKw = !q || hay.indexOf(q) !== -1;
      var matchCountry = !c || card.getAttribute("data-country") === c;
      var matchCat = !cat || card.getAttribute("data-category") === cat;
      var matchType = types.length === 0 || types.indexOf(card.getAttribute("data-type")) !== -1;
      var ok = matchKw && matchCountry && matchCat && matchType;
      card.classList.toggle("hidden", !ok);
      if (ok) shown++;
    });

    if (countEl) countEl.textContent = shown;
    if (noResults) noResults.classList.toggle("hidden", shown !== 0);
  }

  [kw, country, category].forEach(function (el) {
    if (!el) return;
    el.addEventListener("input", apply);
    el.addEventListener("change", apply);
  });
  typeChecks.forEach(function (t) { t.addEventListener("change", apply); });

  if (clearBtn) {
    clearBtn.addEventListener("click", function () {
      if (kw) kw.value = "";
      if (country) country.value = "";
      if (category) category.value = "";
      typeChecks.forEach(function (t) { t.checked = false; });
      apply();
    });
  }

  // Intercept the hero search form (if present) to filter in-page.
  var heroForm = document.getElementById("hero-search");
  if (heroForm) {
    heroForm.addEventListener("submit", function (e) {
      // If we're already on the jobs page, filter live instead of navigating.
      if (document.getElementById("job-list")) {
        e.preventDefault();
        apply();
        var target = document.getElementById("jobs");
        if (target) target.scrollIntoView({ behavior: "smooth" });
      }
    });
  }

  readParams();
  apply();
})();
