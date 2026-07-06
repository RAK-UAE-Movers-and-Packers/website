import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { areas, languages, site } from "./site.config.mjs";

const outDir = process.cwd();
const langCodes = Object.keys(languages);
const now = new Date().toISOString().slice(0, 10);
const languageFlags = {
  en: "flag-gb.png",
  ar: "flag-ae.png",
  ru: "flag-ru.png",
  hi: "flag-in.png"
};

function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function attr(value) {
  return esc(value);
}

function fill(template, vars) {
  return template.replaceAll(/\{(\w+)\}/g, (_, key) => vars[key] ?? "");
}

function absolute(pathname) {
  return `${site.baseUrl}${pathname}`;
}

function pathFor(lang, pageKey, areaSlug = "") {
  if (pageKey === "home") return `/${lang}/`;
  if (pageKey === "root") return "/";
  return `/${lang}/${areaSlug}/`;
}

function alternates(pageKey, areaSlug = "") {
  const alternatePageKey = pageKey === "root" ? "home" : pageKey;
  const links = langCodes.map((lang) => ({
    lang: languages[lang].hreflang,
    href: absolute(pathFor(lang, alternatePageKey, areaSlug))
  }));
  links.push({
    lang: "x-default",
    href: pageKey === "home" || pageKey === "root"
      ? absolute("/")
      : absolute(pathFor("en", pageKey, areaSlug))
  });
  return links;
}

function whatsappUrl(message) {
  return `https://wa.me/${site.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

function pageData(langCode, pageKey, area = null) {
  const lang = languages[langCode];
  const quoteMessage = langCode === "en"
    ? "Hello, I need packing and moving help in Ras Al Khaimah."
    : "Hello, I need packing and moving help in Ras Al Khaimah.";
  if (pageKey === "home") {
    return {
      pageKey,
      lang,
      area,
      title: lang.home.title,
      description: lang.home.description,
      h1: lang.home.h1,
      intro: lang.home.intro,
      highlights: lang.home.highlights,
      servicesTitle: lang.home.servicesTitle,
      servicesIntro: lang.home.servicesIntro,
      localTitle: lang.home.whyTitle,
      localIntro: lang.home.whyIntro,
      checks: lang.home.checks,
      finalTitle: lang.home.finalTitle,
      finalIntro: lang.home.finalIntro,
      canonicalPath: pathFor(langCode, pageKey),
      quoteMessage
    };
  }

  if (pageKey === "root") {
    return {
      pageKey,
      lang,
      area,
      title: lang.home.title,
      description: lang.home.description,
      h1: lang.home.h1,
      intro: lang.home.intro,
      highlights: lang.home.highlights,
      servicesTitle: lang.home.servicesTitle,
      servicesIntro: lang.home.servicesIntro,
      localTitle: lang.home.whyTitle,
      localIntro: lang.home.whyIntro,
      checks: lang.home.checks,
      finalTitle: lang.home.finalTitle,
      finalIntro: lang.home.finalIntro,
      canonicalPath: "/",
      quoteMessage
    };
  }

  const areaName = area.name[langCode] || area.name.en;
  const areaPrep = area.prep?.[langCode] || areaName;
  const vars = { area: areaName, areaPrep };
  return {
    pageKey,
    lang,
    area,
    areaName,
    title: fill(lang.areaTemplate.title, vars),
    description: fill(lang.areaTemplate.description, vars),
    h1: fill(lang.areaTemplate.h1, vars),
    intro: fill(lang.areaTemplate.intro, vars),
    highlights: lang.home.highlights,
    servicesTitle: fill(lang.areaTemplate.servicesTitle, vars),
    servicesIntro: fill(lang.areaTemplate.servicesIntro, vars),
    localTitle: fill(lang.areaTemplate.localTitle, vars),
    localIntro: fill(lang.areaTemplate.localIntro, vars),
    checks: lang.areaTemplate.checks.map((item) => fill(item, vars)),
    finalTitle: fill(lang.areaTemplate.finalTitle, vars),
    finalIntro: fill(lang.areaTemplate.finalIntro, vars),
    canonicalPath: pathFor(langCode, pageKey, area.slug),
    quoteMessage: `Hello, I need movers and packers in ${area.name.en}, Ras Al Khaimah.`
  };
}

function icon(name) {
  const icons = {
    box: '<svg viewBox="0 0 24 24"><path d="M3 7.5 12 3l9 4.5-9 4.5L3 7.5Z"/><path d="M3 7.5v9L12 21l9-4.5v-9"/><path d="M12 12v9"/></svg>',
    home: '<svg viewBox="0 0 24 24"><path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>',
    tool: '<svg viewBox="0 0 24 24"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-3 3-3-3 3-3Z"/></svg>'
  };
  return icons[name];
}

function head(data) {
  const altLinks = alternates(data.pageKey, data.area?.slug)
    .map((item) => `  <link rel="alternate" hreflang="${attr(item.lang)}" href="${attr(item.href)}">`)
    .join("\n");
  const keywordVars = {
    area: data.areaName || "",
    areaPrep: data.area?.prep?.[data.lang.code] || data.areaName || ""
  };
  const keywords = data.area
    ? fill(data.lang.areaKeywords, keywordVars)
    : data.lang.keywords;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MovingCompany",
    name: data.lang.brand,
    description: data.description,
    telephone: site.phoneHref,
    url: absolute(data.canonicalPath),
    image: site.image,
    areaServed: data.area
      ? [data.areaName, data.lang.common.footerArea]
      : areas.map((area) => area.name[data.lang.code] || area.name.en).concat([data.lang.common.footerArea]),
    priceRange: "$$",
    sameAs: whatsappUrl(data.quoteMessage),
    serviceType: data.lang.schemaServiceType
  };

  return `  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(data.title)}</title>
  <meta name="description" content="${attr(data.description)}">
  <meta name="keywords" content="${attr(keywords)}">
  <meta name="robots" content="index, follow">
  <meta property="og:title" content="${attr(data.title)}">
  <meta property="og:description" content="${attr(data.description)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${attr(absolute(data.canonicalPath))}">
  <meta property="og:image" content="${attr(site.image)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${attr(data.title)}">
  <meta name="twitter:description" content="${attr(data.description)}">
  <meta name="theme-color" content="#0f766e">
  <link rel="canonical" href="${attr(absolute(data.canonicalPath))}">
${altLinks}
  <link rel="preconnect" href="https://images.pexels.com">
  <link rel="stylesheet" href="/assets/styles.css">
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`;
}

function header(data) {
  const lang = data.lang;
  const switcher = langCodes.map((code) => {
    const targetPageKey = data.pageKey === "root" ? "home" : data.pageKey;
    const href = pathFor(code, targetPageKey, data.area?.slug);
    const current = code === lang.code ? ' aria-current="page"' : "";
    return `<li>
            <a href="${attr(href)}"${current}>
              <img src="/assets/icons/${attr(languageFlags[code])}" alt="" loading="lazy">
              <span>${esc(languages[code].label)}</span>
            </a>
          </li>`;
  }).join("");
  return `<header class="site-header">
    <nav class="nav" aria-label="${attr(lang.common.mainNavigation)}">
      <a class="brand" href="${data.pageKey === "root" ? "/" : `/${lang.code}/`}">
        <strong>${esc(lang.brand)}</strong>
      </a>
      <div class="nav-links">
        <a href="#services">${esc(lang.nav.services)}</a>
        <a href="#areas">${esc(lang.nav.areas)}</a>
        <a href="#process">${esc(lang.nav.process)}</a>
        <a href="#faq">${esc(lang.nav.faq)}</a>
        <a class="button button-primary nav-quote" href="${attr(whatsappUrl(data.quoteMessage))}" target="_blank" rel="noopener">${esc(lang.nav.quote)}</a>
      </div>
      <details class="language-switcher">
        <summary>
          <img class="language-icon" src="/assets/icons/globe.png" alt="" aria-hidden="true">
          <span class="sr-only">${esc(lang.common.languageLabel)}: </span>
          <span>${esc(lang.label)}</span>
        </summary>
        <ul>${switcher}</ul>
      </details>
    </nav>
  </header>`;
}

function services(data) {
  const cards = data.lang.services.map((service, index) => {
    const iconName = ["box", "home", "tool"][index];
    return `<article class="service-card">
            <div class="service-icon" aria-hidden="true">${icon(iconName)}</div>
            <h3>${esc(service[0])}</h3>
            <p>${esc(service[1])}</p>
          </article>`;
  }).join("\n");
  return `<section id="services" aria-labelledby="services-title">
      <div class="section-inner">
        <div class="section-heading">
          <h2 id="services-title">${esc(data.servicesTitle)}</h2>
          <p>${esc(data.servicesIntro)}</p>
        </div>
        <div class="services-grid">${cards}</div>
      </div>
    </section>`;
}

function areaLinks(data) {
  return areas.map((area) => {
    const name = area.name[data.lang.code] || area.name.en;
    return `<li><a class="area-pill" href="/${data.lang.code}/${area.slug}/">${esc(name)}</a></li>`;
  }).join("");
}

function localSection(data) {
  const checks = data.checks.map((item) => `<li>${esc(item)}</li>`).join("");
  return `<section id="areas" class="split" aria-labelledby="areas-title">
      <div class="section-inner split-layout">
        <div>
          <h2 id="areas-title">${esc(data.localTitle)}</h2>
          <p class="intro-text">${esc(data.localIntro)}</p>
          <ul class="check-list">${checks}</ul>
          <h3 class="mini-heading">${esc(data.lang.common.areasServed)}</h3>
          <ul class="areas">${areaLinks(data)}</ul>
        </div>
        <aside class="quote-panel">
          <h3>${esc(data.lang.common.quoteButton)}</h3>
          <p>${esc(data.lang.common.quotePromptBody)}</p>
          <a class="button button-primary" href="${attr(whatsappUrl(data.quoteMessage))}" target="_blank" rel="noopener">${esc(data.lang.common.quoteButton)}</a>
        </aside>
      </div>
    </section>`;
}

function processSection(data) {
  const steps = data.lang.process.map((step) => `<article class="process-step">
            <h3>${esc(step[0])}</h3>
            <p>${esc(step[1])}</p>
          </article>`).join("");
  return `<section id="process" aria-labelledby="process-title">
      <div class="section-inner">
        <div class="section-heading">
          <h2 id="process-title">${esc(data.lang.home.processTitle)}</h2>
          <p>${esc(data.lang.home.processIntro)}</p>
        </div>
        <div class="process-grid">${steps}</div>
      </div>
    </section>`;
}

function faq(data) {
  const items = data.lang.faq.map((item) => `<details>
            <summary>${esc(item[0])}</summary>
            <p>${esc(item[1])}</p>
          </details>`).join("");
  return `<section id="faq" class="faq" aria-labelledby="faq-title">
      <div class="section-inner">
        <div class="section-heading">
          <h2 id="faq-title">${esc(data.lang.home.faqTitle)}</h2>
          <p>${esc(data.lang.home.faqIntro)}</p>
        </div>
        <div class="faq-list">${items}</div>
      </div>
    </section>`;
}

function hero(data) {
  const points = data.highlights.map((point) => `<li class="hero-point">
              <strong>${esc(point[0])}</strong>
              <span>${esc(point[1])}</span>
            </li>`).join("");
  const callLabel = esc(data.lang.common.call).replaceAll(" ", "&nbsp;");
  return `<section class="hero" aria-labelledby="hero-title">
      <div class="hero-inner">
        <div class="hero-copy">
          <p class="eyebrow">${esc(data.lang.common.eyebrow)}</p>
          <h1 id="hero-title">${esc(data.h1)}</h1>
          <p>${esc(data.intro)}</p>
          <div class="hero-actions" role="group" aria-label="${attr(data.lang.common.contactOptions)}">
            <a class="button button-primary" href="${attr(whatsappUrl(data.quoteMessage))}" target="_blank" rel="noopener">${esc(data.lang.common.whatsapp)}</a>
            <a class="button button-secondary" href="tel:${attr(site.phoneHref)}">${callLabel}</a>
          </div>
        </div>
        <ul class="hero-points">${points}</ul>
      </div>
    </section>`;
}

function finalCta(data) {
  const phone = `<bdi dir="ltr">${esc(site.phoneDisplay)}</bdi>`;
  return `<section class="final-cta" aria-labelledby="contact-title">
      <div class="section-inner">
        <div>
          <h2 id="contact-title">${esc(data.finalTitle)}</h2>
          <p>${esc(data.finalIntro)}</p>
        </div>
        <a class="button button-secondary" href="${attr(whatsappUrl(data.quoteMessage))}" target="_blank" rel="noopener">${esc(data.lang.common.whatsappLabel)} ${phone}</a>
      </div>
    </section>`;
}

function footer(data) {
  const phone = `<bdi dir="ltr">${esc(site.phoneDisplay)}</bdi>`;
  return `<footer class="site-footer">
    <div class="footer-inner">
      <span>${esc(data.lang.footerBrand)}</span>
      <span>${esc(data.lang.common.whatsappLabel)}: ${phone}</span>
    </div>
  </footer>
  <a class="whatsapp-float" href="${attr(whatsappUrl(data.quoteMessage))}" target="_blank" rel="noopener" aria-label="${attr(data.lang.common.chatAria)}">
    <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16.02 3.2A12.66 12.66 0 0 0 5.11 22.28L3.8 28.8l6.66-1.56A12.64 12.64 0 1 0 16.02 3.2Zm0 22.95a10.32 10.32 0 0 1-5.25-1.44l-.38-.23-3.95.92.78-3.86-.25-.4a10.34 10.34 0 1 1 9.05 5.01Zm5.66-7.73c-.31-.16-1.84-.91-2.13-1.01-.29-.11-.5-.16-.71.16-.21.31-.82 1.01-1.01 1.22-.18.21-.37.24-.68.08-.31-.16-1.31-.48-2.5-1.54-.92-.82-1.55-1.84-1.73-2.15-.18-.31-.02-.48.14-.64.14-.14.31-.37.47-.55.16-.18.21-.31.31-.52.11-.21.05-.39-.03-.55-.08-.16-.71-1.71-.97-2.34-.26-.62-.52-.53-.71-.54h-.6c-.21 0-.55.08-.84.39-.29.31-1.1 1.07-1.1 2.62s1.13 3.05 1.29 3.26c.16.21 2.22 3.39 5.38 4.75.75.32 1.34.52 1.8.66.76.24 1.45.21 1.99.13.61-.09 1.84-.75 2.1-1.48.26-.73.26-1.35.18-1.48-.08-.13-.29-.21-.6-.37Z"/></svg>
    ${esc(data.lang.common.whatsappLabel)}
  </a>`;
}

function renderPage(data) {
  return `<!DOCTYPE html>
<html lang="${attr(data.lang.locale)}" dir="${attr(data.lang.dir)}">
<head>
${head(data)}
</head>
<body>
  ${header(data)}
  <main>
    ${hero(data)}
    ${services(data)}
    ${localSection(data)}
    ${processSection(data)}
    ${faq(data)}
    ${finalCta(data)}
  </main>
  ${footer(data)}
</body>
</html>
`;
}

function sitemap() {
  const pages = [{ pageKey: "root" }, { pageKey: "home" }, ...areas.map((area) => ({ pageKey: "area", area }))];
  const entries = [];
  for (const page of pages) {
    const pageLangs = page.pageKey === "root" ? ["en"] : langCodes;
    for (const lang of pageLangs) {
      const path = pathFor(lang, page.pageKey, page.area?.slug);
      const altLinks = alternates(page.pageKey, page.area?.slug)
        .map((item) => `    <xhtml:link rel="alternate" hreflang="${item.lang}" href="${item.href}" />`)
        .join("\n");
      entries.push(`  <url>
    <loc>${absolute(path)}</loc>
${altLinks}
    <lastmod>${now}</lastmod>
  </url>`);
    }
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join("\n")}
</urlset>
`;
}

async function write(pathname, content) {
  const filepath = join(outDir, pathname);
  await mkdir(dirname(filepath), { recursive: true });
  await writeFile(filepath, content);
}

async function main() {
  for (const code of langCodes) {
    await rm(join(outDir, code), { recursive: true, force: true });
  }

  await write("index.html", renderPage(pageData("en", "root")));
  await write("robots.txt", `User-agent: *\nAllow: /\nSitemap: ${site.baseUrl}/sitemap.xml\n`);
  await write(".nojekyll", "");
  await write("sitemap.xml", sitemap());

  for (const code of langCodes) {
    await write(`${code}/index.html`, renderPage(pageData(code, "home")));
    for (const area of areas) {
      await write(`${code}/${area.slug}/index.html`, renderPage(pageData(code, "area", area)));
    }
  }
}

main();
