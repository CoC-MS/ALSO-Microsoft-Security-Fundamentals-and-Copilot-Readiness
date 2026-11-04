import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
export const locales = ["de", "fr", "es", "ru", "it", "pl"];
export const learnFallbackLabels = {
  de: "Englisch", fr: "en anglais", es: "en inglés", ru: "на английском", it: "inglese", pl: "w języku angielskim",
};
export const learnAudit = JSON.parse(await readFile(new URL("tools/learn-links.json", root), "utf8"));
export const microsoftLinks = learnAudit.links;
export const companionSites = [
  "https://coc-ms.github.io/ALSO-security-policy-templates-navigator/",
  "https://coc-ms.github.io/CoC-MS-ALSO-Microsoft-Security-AttackPrevention/",
  "https://coc-ms.github.io/ALSO-Microsoft-Security-Fundamentals-and-Copilot-Readiness/",
];
const source = await readFile(new URL("site/index.html", root), "utf8");

// Keep markup, whitespace, policy identifiers and URLs independent of translation.
export function transform(html, translate) {
  let protectedTag = "";
  return html.split(/(<!--[\s\S]*?-->|<[^>]+>)/g).map((part) => {
    if (part.startsWith("<")) {
      if (/^<(script|style|code)\b/i.test(part)) protectedTag = part.match(/^<(\w+)/)[1];
      else if (protectedTag && part.startsWith(`</${protectedTag}`)) protectedTag = "";
      return part.replace(/\b(alt|aria-label|content)="([^"]+)"/g, (match, attr, value) => {
        if (attr === "content" && !part.includes('name="description"')) return match;
        return `${attr}="${translate(value)}"`;
      });
    }
    if (protectedTag || !part.trim() || !/[a-zA-Z]/.test(part)) return part;
    return part.replace(/\S[\s\S]*\S|\S/, (value) => translate(value));
  }).join("");
}

export function strings(html) {
  const result = new Set();
  transform(html, (value) => { result.add(value); return value; });
  return [...result];
}

export async function build({ check = false } = {}) {
  for (const locale of locales) {
    const catalog = JSON.parse(await readFile(new URL(`translations/${locale}.json`, root), "utf8"));
    const required = strings(source);
    for (const key of required) {
      if (typeof catalog[key] !== "string" || !catalog[key].trim()) {
        throw new Error(`${locale}: missing translation for ${key}`);
      }
      if (/[<>"]/.test(catalog[key])) throw new Error(`${locale}: unescaped markup in ${key}`);
    }
    for (const key of Object.keys(catalog)) {
      if (!required.includes(key)) throw new Error(`${locale}: stale translation for ${key}`);
    }
    let html = transform(source, (value) => catalog[value]);
    html = html.replace('<html lang="en">', `<html lang="${locale}">`)
      .replace(/((?:href|src)=")(assets\/|downloads\/|styles\.css|site\.js|language\.js)/g, "$1../$2")
      .replace(/<option value="(?:\.\/|[a-z]{2}\/)" lang="([a-z]{2})"(?: selected)?>/g, (_, lang) =>
        `<option value="${lang === "en" ? "../" : `../${lang}/`}" lang="${lang}"${lang === locale ? " selected" : ""}>`);
    const learnUrls = [...source.matchAll(/href="(https:\/\/learn\.microsoft\.com\/[^"]+)"/g)].map((match) => match[1]);
    const englishFallbacks = new Set();
    for (const original of learnUrls) {
      const destination = microsoftLinks[original]?.[locale];
      if (!destination) throw new Error(`${locale}: Microsoft Learn URL has no verification: ${original}`);
      html = html.replaceAll(`${original}"`, `${destination}"`);
      if (destination === original) englishFallbacks.add(original);
    }
    html = html.replace(/(<a\b[^>]*\bhref="([^"]+)"[^>]*>)([\s\S]*?)(<\/a>)/g, (anchor, open, url, label, close) =>
      englishFallbacks.has(url) ? `${open}${label}<span class="learn-fallback"> (${learnFallbackLabels[locale]})</span>${close}` : anchor);
    for (const base of companionSites) {
      html = html.replaceAll(`href="${base}"`, `href="${base}${locale}/"`);
    }
    const mobileLabels = [
      `${catalog["The foundation"]}&#10;${catalog["Gettings started with Business Premium and up"]}`,
      `${catalog["Additional protection"]}&#10;${catalog["With E5/ Defender and Purview Suite"]}`,
    ];
    let cellIndex = 0;
    html = html.replace(/<table class="readiness-matrix">[\s\S]*?<\/table>/, (table) =>
      table.replace(/<td>/g, () => `<td data-label="${mobileLabels[cellIndex++ % 2]}">`));
    const target = new URL(`site/${locale}/index.html`, root);
    if (check) {
      if (await readFile(target, "utf8") !== html) throw new Error(`${locale}: generated page is out of date`);
    } else {
      await mkdir(new URL(`site/${locale}/`, root), { recursive: true });
      await writeFile(target, html);
    }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes("--extract")) {
    await mkdir(new URL("translations/", root), { recursive: true });
    await writeFile(new URL("translations/en.json", root), `${JSON.stringify(Object.fromEntries(strings(source).map((key) => [key, key])), null, 2)}\n`);
  } else {
    await build({ check: process.argv.includes("--check") });
  }
}
