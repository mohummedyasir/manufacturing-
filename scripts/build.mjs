/*
 * GulfMakers static site generator.
 * Reads data/jobs.json and renders SEO-optimised HTML pages + sitemap.xml.
 * Run:  node scripts/build.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ------------------------------------------------------------------
// SITE CONFIG — change BASE_URL to your live domain before launch.
// ------------------------------------------------------------------
const CONFIG = {
  BASE_URL: "https://gulfmakers.com",
  SITE_NAME: "GulfMakers",
  TAGLINE: "Manufacturing & Industrial Jobs across the Gulf",
  DESCRIPTION:
    "GulfMakers is the specialist job board for manufacturing and industrial careers across the GCC — UAE, Saudi Arabia, Qatar, Oman, Bahrain and Kuwait. Find production, engineering, maintenance, QA/QC and plant-management roles.",
  APPLY_EMAIL: "careers@gulfmakers.com",
  OPERATOR: "Business Umbrella",
  TWITTER: "@BusinessUmbrella",
  LOCALE: "en",
};

const COUNTRIES = {
  AE: { name: "United Arab Emirates", short: "UAE", flag: "🇦🇪" },
  SA: { name: "Saudi Arabia", short: "Saudi Arabia", flag: "🇸🇦" },
  QA: { name: "Qatar", short: "Qatar", flag: "🇶🇦" },
  OM: { name: "Oman", short: "Oman", flag: "🇴🇲" },
  BH: { name: "Bahrain", short: "Bahrain", flag: "🇧🇭" },
  KW: { name: "Kuwait", short: "Kuwait", flag: "🇰🇼" },
};

const EMPLOYMENT_LABEL = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACTOR: "Contract",
  TEMPORARY: "Temporary",
  INTERN: "Internship",
};

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------
const esc = (s = "") =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const initials = (name) =>
  name.replace(/[^A-Za-z ]/g, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

function fmtSalary(job) {
  if (!job.salaryMin && !job.salaryMax) return null;
  const per = { MONTH: "/month", YEAR: "/year", HOUR: "/hour" }[job.salaryPeriod] || "";
  const n = (v) => v.toLocaleString("en-US");
  if (job.salaryMin && job.salaryMax) return `${job.salaryCurrency} ${n(job.salaryMin)}–${n(job.salaryMax)}${per}`;
  return `${job.salaryCurrency} ${n(job.salaryMin || job.salaryMax)}${per}`;
}

function fmtDate(iso) {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

const canonical = (path) => CONFIG.BASE_URL + "/" + path;

function write(rel, content) {
  const full = join(ROOT, rel);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content, "utf8");
  console.log("  ✓", rel);
}

// ------------------------------------------------------------------
// Shared layout
// ------------------------------------------------------------------
function head({ title, description, path, image, jsonld = [], type = "website" }) {
  const url = canonical(path);
  const img = image || CONFIG.BASE_URL + "/assets/og-image.svg";
  const ld = jsonld.map((o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join("\n");
  return `<!DOCTYPE html>
<html lang="${CONFIG.LOCALE}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(url)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta name="theme-color" content="#0b2540">
<meta name="author" content="${esc(CONFIG.OPERATOR)}">
<!-- Open Graph -->
<meta property="og:type" content="${type}">
<meta property="og:site_name" content="${esc(CONFIG.SITE_NAME)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(img)}">
<meta property="og:locale" content="en_US">
<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(img)}">
<meta name="twitter:site" content="${esc(CONFIG.TWITTER)}">
<link rel="icon" type="image/svg+xml" href="${rel(path)}assets/favicon.svg">
<link rel="apple-touch-icon" href="${rel(path)}assets/favicon.svg">
<link rel="manifest" href="${rel(path)}site.webmanifest">
<link rel="preload" as="style" href="${rel(path)}assets/css/style.css">
<link rel="stylesheet" href="${rel(path)}assets/css/style.css">
${ld}
</head>`;
}

// prefix for relative asset/link paths based on page depth
function rel(path) {
  const depth = (path.match(/\//g) || []).length;
  return depth === 0 ? "" : "../".repeat(depth);
}

function header(path, current) {
  const p = rel(path);
  const link = (href, label, key) =>
    `<a href="${p}${href}"${current === key ? ' aria-current="page"' : ""}>${label}</a>`;
  return `<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header">
  <div class="container">
    <a class="brand" href="${p}index.html" aria-label="${esc(CONFIG.SITE_NAME)} home">
      <span class="logo-mark">GM</span>
      <span>Gulf<span class="brand-sub">Makers</span></span>
    </a>
    <button class="nav-toggle" aria-label="Toggle menu" aria-expanded="false">☰</button>
    <nav class="main-nav" aria-label="Primary">
      ${link("index.html", "Home", "home")}
      ${link("index.html#jobs", "Browse Jobs", "jobs")}
      ${link("about.html", "About", "about")}
      ${link("employers.html", "For Employers", "employers")}
      ${link("contact.html", "Contact", "contact")}
      <a class="nav-cta" href="${p}employers.html">Post a Job</a>
    </nav>
  </div>
</header>`;
}

function footer(path) {
  const p = rel(path);
  return `<footer class="site-footer">
  <div class="container">
    <div class="footer-grid">
      <div class="about-col">
        <a class="brand" href="${p}index.html" style="margin-bottom:12px"><span class="logo-mark">GM</span><span>Gulf<span class="brand-sub">Makers</span></span></a>
        <p>The specialist job board for manufacturing, industrial and engineering careers across the Gulf region.</p>
      </div>
      <div>
        <h4>Explore</h4>
        <a href="${p}index.html#jobs">All Jobs</a>
        <a href="${p}index.html#countries">By Country</a>
        <a href="${p}about.html">About Us</a>
      </div>
      <div>
        <h4>Employers</h4>
        <a href="${p}employers.html">Post a Job</a>
        <a href="${p}employers.html#pricing">Hiring Solutions</a>
        <a href="${p}contact.html">Talk to Us</a>
      </div>
      <div>
        <h4>Regions</h4>
        <a href="${p}index.html?country=AE#jobs">UAE Jobs</a>
        <a href="${p}index.html?country=SA#jobs">Saudi Arabia Jobs</a>
        <a href="${p}index.html?country=QA#jobs">Qatar Jobs</a>
        <a href="${p}index.html?country=OM#jobs">Oman &amp; Bahrain</a>
      </div>
    </div>
    <div class="powered">
      <span>© <span data-year>2026</span> ${esc(CONFIG.SITE_NAME)}. All rights reserved.</span>
      <span>Powered by <b>${esc(CONFIG.OPERATOR)}</b></span>
    </div>
  </div>
</footer>
<script src="${p}assets/js/app.js" defer></script>
</body>
</html>`;
}

// ------------------------------------------------------------------
// Structured data
// ------------------------------------------------------------------
function organizationLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: CONFIG.SITE_NAME,
    url: CONFIG.BASE_URL + "/",
    description: CONFIG.DESCRIPTION,
    parentOrganization: { "@type": "Organization", name: CONFIG.OPERATOR },
    areaServed: Object.values(COUNTRIES).map((c) => c.name),
    logo: CONFIG.BASE_URL + "/assets/og-image.svg",
  };
}

function websiteLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: CONFIG.SITE_NAME,
    url: CONFIG.BASE_URL + "/",
    potentialAction: {
      "@type": "SearchAction",
      target: CONFIG.BASE_URL + "/index.html?q={search_term_string}#jobs",
      "query-input": "required name=search_term_string",
    },
  };
}

function jobPostingLd(job) {
  const country = COUNTRIES[job.countryCode];
  const ld = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: jobDescriptionHtml(job),
    identifier: { "@type": "PropertyValue", name: job.company, value: job.slug },
    datePosted: job.datePosted,
    validThrough: job.validThrough + "T23:59:59Z",
    employmentType: job.employmentType,
    industry: "Manufacturing",
    hiringOrganization: {
      "@type": "Organization",
      name: job.company,
      sameAs: CONFIG.BASE_URL + "/",
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: job.city,
        addressRegion: job.region,
        addressCountry: job.countryCode,
      },
    },
    applicantLocationRequirements: { "@type": "Country", name: country.name },
    directApply: true,
  };
  if (job.salaryMin || job.salaryMax) {
    ld.baseSalary = {
      "@type": "MonetaryAmount",
      currency: job.salaryCurrency,
      value: {
        "@type": "QuantitativeValue",
        minValue: job.salaryMin || job.salaryMax,
        maxValue: job.salaryMax || job.salaryMin,
        unitText: job.salaryPeriod,
      },
    };
  }
  return ld;
}

function breadcrumbLd(job) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: CONFIG.BASE_URL + "/" },
      { "@type": "ListItem", position: 2, name: "Jobs", item: CONFIG.BASE_URL + "/index.html#jobs" },
      { "@type": "ListItem", position: 3, name: job.title, item: canonical("jobs/" + job.slug + ".html") },
    ],
  };
}

// ------------------------------------------------------------------
// Job rendering
// ------------------------------------------------------------------
function jobDescriptionHtml(job) {
  const li = (arr) => arr.map((x) => `<li>${esc(x)}</li>`).join("");
  return (
    `<p>${esc(job.summary)}</p>` +
    `<h2>Key Responsibilities</h2><ul>${li(job.responsibilities)}</ul>` +
    `<h2>Requirements</h2><ul>${li(job.requirements)}</ul>` +
    `<h2>What's on Offer</h2><ul>${li(job.benefits)}</ul>`
  );
}

function jobCard(job, path) {
  const p = rel(path);
  const country = COUNTRIES[job.countryCode];
  const salary = fmtSalary(job);
  const search = `${job.title} ${job.company} ${job.category} ${job.city} ${country.name} ${country.short}`;
  return `<a class="job-card" href="${p}jobs/${job.slug}.html"
    data-country="${job.countryCode}" data-category="${esc(job.category)}"
    data-type="${job.employmentType}" data-search="${esc(search)}">
    <div class="jc-top">
      <div>
        <h3>${esc(job.title)}</h3>
        <div class="company">${esc(job.company)}</div>
      </div>
      <div class="logo-badge" aria-hidden="true">${initials(job.company)}</div>
    </div>
    <p class="summary">${esc(job.summary)}</p>
    <div class="meta-row">
      <span class="chip">📍 ${esc(job.city)}, ${country.flag} ${esc(country.short)}</span>
      <span class="chip">💼 ${EMPLOYMENT_LABEL[job.employmentType]}</span>
      <span class="chip amber">🏭 ${esc(job.category)}</span>
      ${salary ? `<span class="chip green">💰 ${esc(salary)}</span>` : ""}
    </div>
    <div class="jc-foot">
      <span class="posted">Posted ${fmtDate(job.datePosted)}</span>
      <span class="arrow">View role →</span>
    </div>
  </a>`;
}

function jobPage(job, jobs) {
  const path = `jobs/${job.slug}.html`;
  const country = COUNTRIES[job.countryCode];
  const salary = fmtSalary(job);
  const title = `${job.title} — ${job.company} | ${job.city}, ${country.short} | ${CONFIG.SITE_NAME}`;
  const desc = `${job.summary} Apply for this ${EMPLOYMENT_LABEL[job.employmentType]} ${job.category} role at ${job.company} in ${job.city}, ${country.name}.`;
  const applyHref = `mailto:${CONFIG.APPLY_EMAIL}?subject=${encodeURIComponent("Application: " + job.title + " (" + job.slug + ")")}`;
  const related = jobs.filter((j) => j.countryCode === job.countryCode && j.slug !== job.slug).slice(0, 3);

  const kv = (k, v) => `<div class="kv"><span class="k">${k}</span><span class="v">${esc(v)}</span></div>`;

  return (
    head({
      title,
      description: desc,
      path,
      type: "article",
      jsonld: [jobPostingLd(job), breadcrumbLd(job)],
    }) +
    `<body>` +
    header(path, "jobs") +
    `<main id="main">
  <div class="job-hero">
    <div class="container">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="../index.html">Home</a> › <a href="../index.html#jobs">Jobs</a> › ${esc(job.title)}
      </nav>
      <div class="company">${esc(job.company)}</div>
      <h1>${esc(job.title)}</h1>
      <div class="meta-row">
        <span class="chip amber">📍 ${esc(job.city)}, ${esc(country.name)} ${country.flag}</span>
        <span class="chip">💼 ${EMPLOYMENT_LABEL[job.employmentType]}</span>
        <span class="chip">🏭 ${esc(job.category)}</span>
        <span class="chip">🎯 ${esc(job.experienceLevel)}</span>
      </div>
    </div>
  </div>
  <div class="container">
    <div class="detail-layout">
      <article class="prose">
        ${jobDescriptionHtml(job)}
        <div class="badge-note mt-24">This role is managed by ${esc(CONFIG.SITE_NAME)}, a ${esc(CONFIG.OPERATOR)} company. We respond to shortlisted applicants within 5 working days.</div>
      </article>
      <aside class="apply-card">
        ${salary ? `<div class="salary">${esc(salary.split("/")[0])}<span>${salary.includes("/") ? " /" + salary.split("/")[1] : ""}</span></div>` : ""}
        ${kv("Location", job.city + ", " + country.short)}
        ${kv("Job type", EMPLOYMENT_LABEL[job.employmentType])}
        ${kv("Category", job.category)}
        ${kv("Experience", job.experienceLevel)}
        ${kv("Posted", fmtDate(job.datePosted))}
        ${kv("Closes", fmtDate(job.validThrough))}
        <a class="btn btn-primary" href="${applyHref}">Apply Now</a>
        <a class="btn btn-ghost" href="../contact.html">Ask a Question</a>
      </aside>
    </div>
    ${
      related.length
        ? `<section class="block" style="padding-top:0">
      <h2 style="color:var(--navy)">More manufacturing jobs in ${esc(country.short)}</h2>
      <div id="related">${related.map((r) => jobCard(r, path)).join("")}</div>
    </section>`
        : ""
    }
  </div>
</main>` +
    footer(path)
  );
}

// ------------------------------------------------------------------
// Pages
// ------------------------------------------------------------------
function indexPage(jobs) {
  const path = "index.html";
  const categories = [...new Set(jobs.map((j) => j.category))].sort();
  const countByCountry = {};
  jobs.forEach((j) => (countByCountry[j.countryCode] = (countByCountry[j.countryCode] || 0) + 1));

  const countryOptions = Object.entries(COUNTRIES)
    .map(([code, c]) => `<option value="${code}">${c.short}</option>`)
    .join("");
  const catOptions = categories.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join("");

  const typeChecks = Object.entries(EMPLOYMENT_LABEL)
    .filter(([k]) => jobs.some((j) => j.employmentType === k))
    .map(
      ([k, label]) =>
        `<label class="check"><input type="checkbox" data-filter-type value="${k}"> ${label}</label>`
    )
    .join("");

  const catChecks = categories
    .map(
      (c) =>
        `<label class="check"><input type="radio" name="catradio" onclick="document.getElementById('f-category').value='${esc(
          c
        )}';document.getElementById('f-category').dispatchEvent(new Event('change'))"> ${esc(c)}</label>`
    )
    .join("");

  const countryCards = Object.entries(COUNTRIES)
    .map(
      ([code, c]) =>
        `<a class="country-card" href="index.html?country=${code}#jobs"><span class="flag" aria-hidden="true">${c.flag}</span><b>${esc(
          c.short
        )}</b><span>${countByCountry[code] || 0} open role${(countByCountry[code] || 0) === 1 ? "" : "s"}</span></a>`
    )
    .join("");

  return (
    head({
      title: `${CONFIG.SITE_NAME} — ${CONFIG.TAGLINE} | UAE, Saudi, Qatar, Oman, Bahrain, Kuwait`,
      description: CONFIG.DESCRIPTION,
      path,
      jsonld: [organizationLd(), websiteLd()],
    }) +
    `<body>` +
    header(path, "home") +
    `<main id="main">
  <section class="hero">
    <div class="container">
      <h1>Manufacturing Jobs across the <span class="accent">Gulf</span></h1>
      <p class="lede">${esc(CONFIG.TAGLINE)}. Production, engineering, maintenance, QA/QC and plant leadership roles from trusted industrial employers in the GCC.</p>
      <form id="hero-search" class="search-panel" action="index.html#jobs" method="get" role="search">
        <div class="field">
          <label for="f-keyword">Keyword or job title</label>
          <input id="f-keyword" name="q" type="search" placeholder="e.g. Welder, CNC, Plant Manager" autocomplete="off">
        </div>
        <div class="field">
          <label for="f-country">Country</label>
          <select id="f-country" name="country"><option value="">All Gulf countries</option>${countryOptions}</select>
        </div>
        <div class="field">
          <label for="f-category">Category</label>
          <select id="f-category" name="category"><option value="">All categories</option>${catOptions}</select>
        </div>
        <button class="btn btn-primary" type="submit">Search Jobs</button>
      </form>
      <div class="stats">
        <div class="stat"><b>${jobs.length}+</b><span>Live vacancies</span></div>
        <div class="stat"><b>6</b><span>GCC countries</span></div>
        <div class="stat"><b>${categories.length}</b><span>Job categories</span></div>
      </div>
    </div>
  </section>

  <section class="block" id="countries">
    <div class="container">
      <div class="section-head">
        <span class="eyebrow">Hiring hotspots</span>
        <h2>Manufacturing jobs by country</h2>
        <p>From steel and petrochemicals to food, aluminium and electronics — explore industrial roles in every Gulf market.</p>
      </div>
      <div class="country-grid">${countryCards}</div>
    </div>
  </section>

  <section class="block" id="jobs" style="background:linear-gradient(180deg, transparent, rgba(31,78,121,.04))">
    <div class="container">
      <div class="section-head">
        <span class="eyebrow">Latest openings</span>
        <h2>Browse manufacturing &amp; industrial jobs</h2>
        <p>Filter by country, category and job type to find your next role on the Gulf's shop floors and plants.</p>
      </div>
      <div class="jobs-layout">
        <aside class="filters" aria-label="Job filters">
          <h3>Filters</h3>
          <div class="filter-group">
            <span>Job type</span>
            ${typeChecks}
          </div>
          <div class="filter-group">
            <span>Category</span>
            ${catChecks}
          </div>
          <button id="clear-filters" class="btn btn-ghost" type="button" style="width:100%;margin-top:6px">Clear filters</button>
        </aside>
        <div>
          <div class="results-bar">
            <div class="count"><b id="result-count">${jobs.length}</b> jobs found</div>
          </div>
          <div id="job-list">
            ${jobs.map((j) => jobCard(j, path)).join("\n")}
          </div>
          <div id="no-results" class="no-results hidden">
            <p><strong>No jobs match your search.</strong></p>
            <p>Try clearing filters or <a href="contact.html">register your CV</a> and we'll alert you when a matching role goes live.</p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="block">
    <div class="container">
      <div class="section-head">
        <span class="eyebrow">Why GulfMakers</span>
        <h2>Built for manufacturing careers</h2>
      </div>
      <div class="grid-3">
        <div class="feature"><div class="ic" aria-hidden="true">🏭</div><h3>Industry specialists</h3><p>We focus only on manufacturing, industrial and engineering roles — no noise, just relevant Gulf vacancies.</p></div>
        <div class="feature"><div class="ic" aria-hidden="true">⚡</div><h3>Fast, direct apply</h3><p>Apply in one click. Shortlisted candidates hear back within 5 working days — no black holes.</p></div>
        <div class="feature"><div class="ic" aria-hidden="true">🌍</div><h3>Whole-Gulf coverage</h3><p>Live roles across the UAE, Saudi Arabia, Qatar, Oman, Bahrain and Kuwait, updated continuously.</p></div>
      </div>
    </div>
  </section>

  <section class="block">
    <div class="container">
      <div class="cta-band">
        <h2>Hiring for your plant or factory?</h2>
        <p>Reach thousands of manufacturing, engineering and industrial professionals across the Gulf. Post your vacancy with GulfMakers and let our ${esc(CONFIG.OPERATOR)} recruitment team do the rest.</p>
        <a class="btn btn-primary" href="employers.html">Post a Job</a>
      </div>
    </div>
  </section>
</main>` +
    footer(path)
  );
}

function aboutPage() {
  const path = "about.html";
  return (
    head({
      title: `About GulfMakers — Gulf Manufacturing Recruitment | ${CONFIG.SITE_NAME}`,
      description:
        "GulfMakers is the specialist manufacturing and industrial job board for the GCC, operated by Business Umbrella. Learn about our mission to connect Gulf plants with skilled talent.",
      path,
      jsonld: [organizationLd()],
    }) +
    `<body>` +
    header(path, "about") +
    `<main id="main">
  <div class="page-hero"><div class="container"><h1>About GulfMakers</h1><p>Connecting the Gulf's factories, plants and industrial employers with the skilled people who keep them running.</p></div></div>
  <div class="container block"><div class="rich">
    <p>${esc(CONFIG.SITE_NAME)} is a specialist job board dedicated entirely to <strong>manufacturing, industrial and engineering careers across the Gulf region</strong> — the UAE, Saudi Arabia, Qatar, Oman, Bahrain and Kuwait.</p>
    <p>The Gulf is investing heavily in industrial diversification — steel, aluminium, petrochemicals, food processing, building materials, electronics and advanced manufacturing. That growth needs skilled operators, technicians, engineers, planners and plant leaders. We exist to make that match faster and fairer.</p>
    <h2>What we do</h2>
    <ul>
      <li>Curate genuine manufacturing and industrial vacancies from trusted GCC employers.</li>
      <li>Give candidates a clean, fast, mobile-first way to search and apply.</li>
      <li>Help employers reach a focused pool of production, maintenance, QA/QC and engineering talent.</li>
    </ul>
    <h2>Powered by Business Umbrella</h2>
    <p>GulfMakers is operated by <strong>${esc(CONFIG.OPERATOR)}</strong>, a Gulf-based recruitment and business-services group. Our consultants bring deep industrial hiring expertise, so every posting is backed by real recruitment support — not just a listing.</p>
    <h2>Our regions</h2>
    <ul>
      <li>🇦🇪 United Arab Emirates — Dubai, Abu Dhabi, Sharjah, Jebel Ali</li>
      <li>🇸🇦 Saudi Arabia — Jubail, Dammam, Yanbu, Riyadh</li>
      <li>🇶🇦 Qatar — Doha, Ras Laffan</li>
      <li>🇴🇲 Oman — Muscat, Sohar</li>
      <li>🇧🇭 Bahrain — Manama, Sitra</li>
      <li>🇰🇼 Kuwait — Kuwait City, Shuaiba</li>
    </ul>
    <p class="mt-24"><a class="btn btn-primary" href="index.html#jobs">Browse open jobs</a> &nbsp; <a class="btn btn-outline" href="employers.html">Hire with us</a></p>
  </div></div>
</main>` +
    footer(path)
  );
}

function employersPage() {
  const path = "employers.html";
  return (
    head({
      title: `Post a Manufacturing Job in the Gulf | For Employers — ${CONFIG.SITE_NAME}`,
      description:
        "Hire skilled manufacturing, industrial and engineering talent across the GCC. Post a job on GulfMakers and access Business Umbrella's Gulf recruitment network.",
      path,
      jsonld: [organizationLd()],
    }) +
    `<body>` +
    header(path, "employers") +
    `<main id="main">
  <div class="page-hero"><div class="container"><h1>Hire manufacturing talent across the Gulf</h1><p>Post your vacancy to a focused audience of industrial professionals — and get hands-on recruitment support from the ${esc(CONFIG.OPERATOR)} team.</p></div></div>
  <div class="container block">
    <div class="grid-3" id="pricing">
      <div class="feature"><div class="ic">📢</div><h3>Job Listing</h3><p>Publish a single vacancy to candidates searching production, engineering and maintenance roles across the GCC.</p></div>
      <div class="feature"><div class="ic">🎯</div><h3>Managed Hiring</h3><p>Our consultants source, screen and shortlist candidates so you only meet the best-fit talent for your plant.</p></div>
      <div class="feature"><div class="ic">🏢</div><h3>Volume &amp; Bulk</h3><p>Ramping a new line or facility? We run high-volume industrial recruitment campaigns end to end.</p></div>
    </div>

    <div class="section-head mt-24" style="margin-top:48px"><h2>Post a job</h2><p>Tell us about the role and our team will get it live and start sourcing. Fields marked * are required.</p></div>
    <form class="form-card" action="mailto:${esc(CONFIG.APPLY_EMAIL)}" method="post" enctype="text/plain">
      <div class="form-grid-2">
        <div class="form-row"><label for="cname">Contact name *</label><input id="cname" name="Contact name" required></div>
        <div class="form-row"><label for="company">Company *</label><input id="company" name="Company" required></div>
      </div>
      <div class="form-grid-2">
        <div class="form-row"><label for="email">Work email *</label><input id="email" name="Email" type="email" required></div>
        <div class="form-row"><label for="phone">Phone</label><input id="phone" name="Phone" type="tel"></div>
      </div>
      <div class="form-grid-2">
        <div class="form-row"><label for="jobtitle">Job title *</label><input id="jobtitle" name="Job title" required></div>
        <div class="form-row"><label for="country">Country *</label>
          <select id="country" name="Country" required>
            <option value="">Select…</option>
            <option>United Arab Emirates</option><option>Saudi Arabia</option><option>Qatar</option>
            <option>Oman</option><option>Bahrain</option><option>Kuwait</option>
          </select>
        </div>
      </div>
      <div class="form-row"><label for="details">Role details *</label><textarea id="details" name="Details" rows="6" placeholder="Responsibilities, requirements, salary range, number of positions…" required></textarea></div>
      <button class="btn btn-primary" type="submit">Submit vacancy</button>
      <p style="color:var(--muted);font-size:.85rem;margin-top:12px">Prefer to talk first? Email <a href="mailto:${esc(CONFIG.APPLY_EMAIL)}">${esc(CONFIG.APPLY_EMAIL)}</a> or use our <a href="contact.html">contact form</a>.</p>
    </form>
  </div>
</main>` +
    footer(path)
  );
}

function contactPage() {
  const path = "contact.html";
  return (
    head({
      title: `Contact GulfMakers — Manufacturing Recruitment Gulf | ${CONFIG.SITE_NAME}`,
      description:
        "Get in touch with the GulfMakers team. Register your CV, ask about a role, or discuss hiring manufacturing talent across the Gulf.",
      path,
      jsonld: [organizationLd()],
    }) +
    `<body>` +
    header(path, "contact") +
    `<main id="main">
  <div class="page-hero"><div class="container"><h1>Contact us</h1><p>Questions about a role, your application, or hiring with us? We'd love to hear from you.</p></div></div>
  <div class="container block">
    <form class="form-card" action="mailto:${esc(CONFIG.APPLY_EMAIL)}" method="post" enctype="text/plain">
      <div class="form-grid-2">
        <div class="form-row"><label for="name">Your name *</label><input id="name" name="Name" required></div>
        <div class="form-row"><label for="email">Email *</label><input id="email" name="Email" type="email" required></div>
      </div>
      <div class="form-row"><label for="subject">I'm a…</label>
        <select id="subject" name="Enquiry type">
          <option>Job seeker</option><option>Employer / hiring manager</option><option>Other</option>
        </select>
      </div>
      <div class="form-row"><label for="message">Message *</label><textarea id="message" name="Message" rows="6" required></textarea></div>
      <button class="btn btn-primary" type="submit">Send message</button>
    </form>
    <p class="text-center mt-24" style="color:var(--muted)">Or email us directly at <a href="mailto:${esc(CONFIG.APPLY_EMAIL)}">${esc(CONFIG.APPLY_EMAIL)}</a> — a ${esc(CONFIG.OPERATOR)} company.</p>
  </div>
</main>` +
    footer(path)
  );
}

function notFoundPage() {
  const path = "404.html";
  return (
    head({ title: `Page not found | ${CONFIG.SITE_NAME}`, description: "The page you were looking for could not be found.", path }) +
    `<body>` +
    header(path, "") +
    `<main id="main"><div class="container" style="text-align:center;padding:90px 20px">
      <h1 style="font-size:3rem;color:var(--navy);margin:0">404</h1>
      <p style="color:var(--muted);font-size:1.1rem">We couldn't find that page. The job may have closed.</p>
      <p><a class="btn btn-primary" href="index.html#jobs">Browse open jobs</a></p>
    </div></main>` +
    footer(path)
  );
}

function sitemap(jobs) {
  const staticPaths = ["index.html", "about.html", "employers.html", "contact.html"];
  const urls = [
    { loc: CONFIG.BASE_URL + "/", pr: "1.0", freq: "daily" },
    ...staticPaths.slice(1).map((p) => ({ loc: canonical(p), pr: "0.7", freq: "monthly" })),
    ...jobs.map((j) => ({ loc: canonical("jobs/" + j.slug + ".html"), pr: "0.9", freq: "weekly", lastmod: j.datePosted })),
  ];
  const body = urls
    .map(
      (u) =>
        `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}<changefreq>${u.freq}</changefreq><priority>${u.pr}</priority></url>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemap.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`.replace(
    "www.sitemap.org",
    "www.sitemaps.org"
  );
}

// ------------------------------------------------------------------
// Build
// ------------------------------------------------------------------
function main() {
  const { jobs } = JSON.parse(readFileSync(join(ROOT, "data/jobs.json"), "utf8"));
  jobs.sort((a, b) => (a.datePosted < b.datePosted ? 1 : -1));
  console.log(`Building ${jobs.length} jobs + pages…`);

  write("index.html", indexPage(jobs));
  write("about.html", aboutPage());
  write("employers.html", employersPage());
  write("contact.html", contactPage());
  write("404.html", notFoundPage());
  jobs.forEach((j) => write(`jobs/${j.slug}.html`, jobPage(j, jobs)));
  write("sitemap.xml", sitemap(jobs));

  console.log("Done.");
}

main();
