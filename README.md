# GulfMakers — Manufacturing Jobs across the Gulf 🏭

A fast, SEO-optimised **job board for manufacturing & industrial careers in the GCC** — the UAE, Saudi Arabia, Qatar, Oman, Bahrain and Kuwait. Built as a dependency-free static site so it loads instantly and ranks well. **Powered by Business Umbrella.**

**Live (once Pages is enabled):** `https://<username>.github.io/<repo>/` or your custom domain (e.g. `https://gulfmakers.com`).

---

## ✨ What's inside

- **Homepage** with hero search, country hotspots, live job grid, and instant client-side filtering (keyword / country / category / job type).
- **12 seed manufacturing vacancies** spanning all 6 Gulf countries and categories (production, machining, QA/QC, maintenance, engineering, HSE, supply chain, management).
- **Individual job pages** — one clean URL each, with an apply card and full description.
- **About**, **For Employers** (post-a-job form), and **Contact** pages.
- **404** page.

## 🔍 SEO features (built in)

- Unique `<title>` + meta description, canonical URL, and robots meta on every page.
- **Open Graph + Twitter Card** tags with a branded social image (`assets/og-image.svg`).
- **JSON-LD structured data**: `Organization` + `WebSite` (with Sitelinks Search box) on the home page, and Google-compliant **`JobPosting`** + `BreadcrumbList` on every job page — eligible for Google Jobs rich results.
- Auto-generated **`sitemap.xml`** and **`robots.txt`**.
- Semantic HTML, mobile-first responsive layout, sticky nav, dark-mode support, fast system-font stack, and a web app manifest.
- Server-rendered job listings (not JS-only) so crawlers see every role.

## 🗂 Structure

```
data/jobs.json            → single source of truth for all vacancies
scripts/build.mjs         → generator: renders all HTML + sitemap.xml
assets/css/style.css      → all styles (no frameworks)
assets/js/app.js          → mobile nav + client-side filtering
index.html, about.html …  → generated pages (do not edit by hand)
jobs/*.html               → generated job pages
.github/workflows/deploy.yml → GitHub Pages CI/CD
```

## 🛠 Local development

```bash
node scripts/build.mjs          # regenerate all pages from data/jobs.json
python3 -m http.server 8080     # preview at http://localhost:8080
```

## ➕ Add or edit a job

1. Edit **`data/jobs.json`** (copy an existing entry as a template).
2. Run `node scripts/build.mjs`.
3. Commit & push — the Pages workflow redeploys automatically.

## 🚀 Launch checklist

1. **Set your domain:** edit `CONFIG.BASE_URL` (and `APPLY_EMAIL`, `TWITTER`) at the top of `scripts/build.mjs`, and the `Sitemap:` line in `robots.txt`. Re-run the build.
2. **Enable GitHub Pages:** repo *Settings → Pages → Source: GitHub Actions*. The included workflow deploys on every push to `main`.
3. **Custom domain (optional):** add a `CNAME` file with your domain and point DNS to GitHub Pages.
4. **Verify & submit:** add the site to [Google Search Console](https://search.google.com/search-console), submit `sitemap.xml`, and test job pages in the [Rich Results Test](https://search.google.com/test/rich-results).
5. **Wire up applications:** the apply/contact forms currently use `mailto:`. For production, connect a form backend (Formspree, Web3Forms) or your ATS.

> **Note:** the included vacancies are realistic **seed listings** to demonstrate the board. Replace them with live roles in `data/jobs.json` before promoting the site.

---

© GulfMakers · Powered by **Business Umbrella**
