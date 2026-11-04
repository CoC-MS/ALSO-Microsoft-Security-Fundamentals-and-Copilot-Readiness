import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { build, locales, strings, microsoftLinks, learnAudit, companionSites } from "../tools/localize.mjs";

const site = new URL("../site/", import.meta.url);
const english = await readFile(new URL("index.html", site), "utf8");

test("localized pages are complete, current, and preserve guide functionality", async () => {
  await build({ check: true });
  for (const locale of locales) {
    const pageUrl = new URL(`${locale}/index.html`, site);
    const html = await readFile(pageUrl, "utf8");
    assert.ok(html.includes(`<html lang="${locale}">`));
    const ids = (page) => [...page.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
    assert.deepEqual(ids(html), ids(english));
    const code = (page) => [...page.matchAll(/<code>(.*?)<\/code>/g)].map((match) => match[1]);
    assert.deepEqual(code(html), code(english));
    for (const tag of ["article", "details", "summary", "table", "tr", "td", "img"]) {
      const count = (page) => [...page.matchAll(new RegExp(`<${tag}(?:\\s|>)`, "g"))].length;
      assert.equal(count(html), count(english), `${locale}: ${tag} parity`);
    }
    for (const [, value] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      if (value.startsWith("#")) assert.ok(ids(html).includes(value.slice(1)));
      else if (!value.startsWith("https://")) {
        const projectUrl = new URL(value, `https://example.test/project-guide/${locale}/`);
        assert.ok(projectUrl.pathname.startsWith("/project-guide/"), `${locale}: link escaped the Pages project base`);
        const path = new URL(value.endsWith("/") ? `${value}index.html` : value, pageUrl);
        const file = await stat(path);
        assert.ok(file.isFile() && file.size > 0, `${locale}: ${value}`);
      }
    }
    const selector = html.match(/<select id="language-select"[\s\S]*?<\/select>/)[0];
    assert.deepEqual([...selector.matchAll(/lang="([^"]+)"/g)].map((match) => match[1]), ["en", ...locales]);
    assert.equal([...selector.matchAll(/ selected/g)].length, 1);
    assert.match(selector, new RegExp(`lang="${locale}" selected`));
    for (const [, value] of selector.matchAll(/value="([^"]+)"/g)) {
      assert.ok((await stat(new URL(`${value}index.html`, pageUrl))).isFile());
    }
    assert.ok(!html.includes("/en/"));
    const joined = html.match(/.{0,30}(?:<\/(?:strong|code)>[\p{L}\p{N}]|[\p{L}\p{N}]<(?:strong|code)>).{0,30}/gu) ?? [];
    assert.deepEqual(joined, [], `${locale}: joined words at inline markup`);
    const matrix = html.match(/<table class="readiness-matrix">[\s\S]*?<\/table>/)[0];
    assert.equal([...matrix.matchAll(/<td data-label="/g)].length, 10, "Mobile labels must also work without JavaScript");
    // Product names may be unchanged; visitor-facing sentences must not fall back.
    const catalog = JSON.parse(await readFile(new URL(`../translations/${locale}.json`, import.meta.url), "utf8"));
    for (const key of strings(english).filter((value) => value.length > 100)) {
      assert.notEqual(catalog[key], key, `${locale}: untranslated prose`);
    }
    const external = (page) => [...page.matchAll(/href="(https:\/\/[^"]+)"/g)].map((match) => match[1]);
    const expected = external(english).map((url) => {
      if (companionSites.includes(url)) return `${url}${locale}/`;
      return microsoftLinks[url]?.[locale] ?? url;
    });

    assert.deepEqual(external(html), expected, "Only verified Learn links and language-matched companion routes may change");
    for (const base of companionSites.slice(0, 2)) {
      assert.ok(html.includes(`href="${base}${locale}/"`));
      assert.ok(!html.includes(`href="${base}"`));
      assert.ok(english.includes(`href="${base}"`), "English companion route stays unchanged");
    }
  }
});

test("English language selector exposes every localized route without moving the base URL", () => {
  const selector = english.match(/<select id="language-select"[\s\S]*?<\/select>/)[0];
  assert.match(selector, /value="\.\/" lang="en" selected/);
  for (const locale of locales) assert.ok(selector.includes(`value="${locale}/" lang="${locale}"`));
  assert.match(selector, />Русский<\/option>/);
  assert.match(selector, />Italiano<\/option>/);
});

test("German review wording keeps KI and precise readiness guidance", async () => {
  const catalog = JSON.parse(await readFile(new URL("../translations/de.json", import.meta.url), "utf8"));
  const html = await readFile(new URL("de/index.html", site), "utf8");
  const expected = {
    "A practical path from your first security settings to a Copilot-ready environment. Protect your people, secure your devices, and put your data in the right hands.": "Ein praktischer Weg von den ersten Sicherheitseinstellungen bis hin zu einer für Copilot vorbereiteten Umgebung. Schützen Sie Ihre Mitarbeitenden, sichern Sie Ihre Geräte und sorgen Sie dafür, dass Ihre Daten in die richtigen Hände gelangen.",
    "Your people &amp; trusted devices": "Ihre Mitarbeitenden und vertrauenswürdigen Geräte",
    "Gettings started with Business Premium and up": "Erste Schritte mit Microsoft 365 Business Premium und höher",
    "Use Entra ID P2 to block high-risk users and high-risk sign-ins.": "Verwenden Sie Entra ID P2, um Benutzer und Anmeldungen mit hohem Risiko zu erkennen und entsprechende Zugriffe zu steuern.",
  };
  for (const [key, value] of Object.entries(expected)) {
    assert.equal(catalog[key], value);
    assert.ok(html.includes(value), `German page must include reviewed wording: ${key}`);
  }
  assert.match(html, /Gute KI beginnt mit<br>einer sicheren Grundlage\./);
  for (const key of strings(english).filter(value => /\bAI\b/.test(value))) {
    assert.match(catalog[key], /\bKI\b/, key);
    assert.doesNotMatch(catalog[key], /\bAI\b/, key);
  }
  const matrix = html.match(/<table class="readiness-matrix">[\s\S]*?<\/table>/)[0];
  assert.equal([...matrix.matchAll(/data-label="[^"]*Erste Schritte mit Microsoft 365 Business Premium und höher/g)].length, 5);
  assert.equal(catalog["Block high-risk users"], "Benutzer mit hohem Risiko blockieren");
  assert.equal(catalog["Block high-risk sign-ins"], "Anmeldungen mit hohem Risiko blockieren");
});

test("every Learn destination has matching verification evidence or an explicit English fallback", () => {
  const urls = [...new Set([...english.matchAll(/href="(https:\/\/learn\.microsoft\.com\/[^"]+)"/g)].map((m) => m[1]))].sort();
  assert.deepEqual(Object.keys(microsoftLinks).sort(), urls);
  for (const url of urls) for (const locale of locales) {
    const destination = microsoftLinks[url][locale];
    const evidence = learnAudit.evidence[url][locale];
    if (destination !== url) {
      assert.equal(evidence.httpStatus, 200);
      assert.equal(evidence.verified, true);
      assert.match(destination, new RegExp(`^https://learn.microsoft.com/${locale}-${locale}/`));
      assert.equal(evidence.htmlLang.toLowerCase(), `${locale}-${locale}`);
      assert.equal(evidence.finalUrl, destination);
    } else {
      assert.ok(learnAudit.summary.fallbacks.some((fallback) => fallback.language === locale && fallback.original === url && fallback.reason));
    }
  }
});

test("Polish names and English-only Learn articles are explicit across the complete guide", async () => {
  const catalog = JSON.parse(await readFile(new URL("../translations/pl.json", import.meta.url), "utf8"));
  const html = await readFile(new URL("pl/index.html", site), "utf8");
  assert.deepEqual(Object.keys(catalog).sort(), strings(english).sort());
  assert.equal(catalog.Language, "Język");
  assert.equal(catalog["Conditional Access"], "Dostęp warunkowy");
  assert.equal(catalog["Security defaults must be"], "Domyślne ustawienia zabezpieczeń muszą być");
  assert.equal(catalog["Show keep user signed in"], "Pokaż opcję pozostawania użytkownika zalogowanym");
  assert.match(catalog["Deploy compliance policies, then enforce compliant access"], /zasady zgodności/);
  assert.match(html, /lang="pl" selected>Polski<\/option>/);
  assert.match(html, /<strong>Ustawienia<\/strong> oraz włącz/);
  const fallbackUrls = [
    "https://learn.microsoft.com/en-us/purview/sensitivity-labels",
    "https://learn.microsoft.com/en-us/sharepoint/data-access-governance-reports",
    "https://learn.microsoft.com/en-us/sharepoint/restricted-content-discovery",
    "https://learn.microsoft.com/en-us/sharepoint/turn-external-sharing-on-or-off",
  ];
  assert.equal(learnAudit.summary.verifiedCounts.pl, 19);
  const fallbacks = learnAudit.summary.fallbacks.filter(item => item.language === "pl");
  assert.deepEqual(fallbacks.map(item => item.original).sort(), fallbackUrls.sort());
  for (const original of fallbackUrls) {
    const anchor = [...html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].find(match => match[1] === original);
    assert.ok(anchor, original);
    assert.match(anchor[2], /<span class="learn-fallback"> \(w języku angielskim\)<\/span>/);
    assert.equal(learnAudit.evidence[original].pl.verified, false);
    assert.equal(learnAudit.evidence[original].pl.htmlLang, "en-us");
  }
  assert.equal([...html.matchAll(/class="learn-fallback"/g)].length, 4);
});

test("reviewed Microsoft terminology stays consistent without claiming tenant verification", async () => {
  const audit = JSON.parse(await readFile(new URL("../tools/terminology-audit.json", import.meta.url), "utf8"));
  assert.match(audit.method, /not live tenant UI verification/);
  assert.equal(audit.userTerminology.ru["Conditional Access"], "Условный доступ");
  assert.equal(audit.userTerminology.ru.Scripts, "Скрипты");
  assert.ok(audit.uncertainties.some(value => value.includes("agent identity blueprints")));
  assert.ok(audit.uncertainties.some(value => value.includes("Show keep user signed in")));
  const names = { de: "Bedingter Zugriff", fr: "Accès conditionnel", es: "Acceso condicional", it: "Accesso condizionale", ru: "Условный доступ", pl: "Dostęp warunkowy" };
  for (const locale of locales) {
    const catalog = JSON.parse(await readFile(new URL(`../translations/${locale}.json`, import.meta.url), "utf8"));
    const html = await readFile(new URL(`${locale}/index.html`, site), "utf8");
    assert.equal(catalog["Conditional Access"], names[locale]);
    for (const [key, value] of Object.entries(catalog)) {
      assert.doesNotMatch(value, /Conditional(?:-| )Access|Restricted Management Administrative Units|Restricted Content Discovery|Data Access Governance|App Governance|Safe Links|Safe Attachments/, `${locale}: unlocalized feature in ${key}`);
      if (locale === "ru" && key.includes("Conditional Access")) assert.match(value, /условн[а-я]+ доступ[а-я]*/i, key);
    }
    for (const item of audit.inventory) {
      assert.ok(strings(english).includes(item.english), "Inventory must refer to current English content");
      assert.equal(catalog[item.english], item.translations[locale], `${locale}: terminology audit needs review for ${item.english}`);
      assert.ok(html.includes(item.translations[locale]), `${locale}: reviewed term missing from generated page`);
    }
    for (const evidence of audit.sources.filter(value => value.locale === locale)) {
      assert.equal(evidence.httpStatus, 200);
      if (evidence.verifiedLocalized === false) {
        assert.equal(locale, "pl");
        assert.equal(evidence.htmlLang, "en-us");
        assert.match(evidence.fallbackReason, /English/);
      } else {
        assert.equal(evidence.htmlLang, `${locale}-${locale}`);
      }
      assert.match(evidence.url, new RegExp(`^https://learn\\.microsoft\\.com/${locale}-${locale}/`));
      assert.ok(evidence.headingOrBodyExcerpt.length > 0);
      assert.ok(Array.isArray(evidence.excerpts));
    }
    assert.ok(audit.sources.filter(value => value.locale === locale).length > 0);
  }
  const russian = JSON.parse(await readFile(new URL("../translations/ru.json", import.meta.url), "utf8"));
  for (const key of strings(english).filter(value => /\bscript\b/i.test(value))) {
    assert.match(russian[key], /скрипт/i, key);
    assert.doesNotMatch(russian[key], /сценари/i, key);
  }
  assert.equal(russian["not phishing-resistant"], "не устойчив к фишингу");
  assert.equal(russian["Review legitimate flow dependencies first"], "Сначала проверьте зависимости от этих потоков в допустимых сценариях");
});
