import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const sourceFile = new URL('../site/index.html', import.meta.url);
const outputFile = new URL('./learn-links.json', import.meta.url);
const locales = { de: 'de-de', fr: 'fr-fr', es: 'es-es', ru: 'ru-ru', it: 'it-it', pl: 'pl-pl' };
const concurrency = 4;
const timeoutMs = 30_000;
const maxAttempts = 3;

function decodeAttribute(value) {
  return value.replace(/&(?:amp|quot|apos|#(\d+)|#x([0-9a-f]+));/gi, (entity, decimal, hex) => {
    if (decimal) return String.fromCodePoint(Number(decimal));
    if (hex) return String.fromCodePoint(Number.parseInt(hex, 16));
    return { '&amp;': '&', '&quot;': '"', '&apos;': "'" }[entity.toLowerCase()];
  });
}

function extractUrls(html) {
  return [...new Set(
    [...html.matchAll(/\bhref\s*=\s*(["'])(.*?)\1/gi)]
      .map((match) => decodeAttribute(match[2]))
      .filter((href) => /^https:\/\/learn\.microsoft\.com\/en-us\//i.test(href)),
  )].sort();
}

async function verify(requestedUrl, expectedLocale) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(requestedUrl, {
        redirect: 'follow',
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          'Accept': 'text/html',
          'Accept-Language': expectedLocale,
          'User-Agent': 'LearnLinkVerifier/1.0',
        },
      });
      const body = await response.text();
      const final = new URL(response.url);
      // Fetch does not send fragments; retain the article's original section link.
      final.hash = new URL(requestedUrl).hash;
      const finalLocale = final.pathname.split('/')[1].toLowerCase();
      const htmlTag = body.match(/<html\b[^>]*>/i)?.[0] ?? '';
      const htmlLang = htmlTag.match(/\blang\s*=\s*(["'])(.*?)\1/i)?.[2]?.toLowerCase() ?? null;
      const contentType = response.headers.get('content-type');
      let reason = null;
      if (response.status !== 200) reason = `HTTP ${response.status}`;
      else if (final.hostname !== 'learn.microsoft.com') reason = `Redirected outside Microsoft Learn: ${final.hostname}`;
      else if (finalLocale !== expectedLocale) reason = `Final URL locale ${finalLocale || '(missing)'} is not ${expectedLocale}`;
      else if (!contentType?.toLowerCase().includes('text/html')) reason = `Response is not HTML: ${contentType ?? '(missing content-type)'}`;
      else if (htmlLang !== expectedLocale) reason = `HTML lang ${htmlLang ?? '(missing)'} is not ${expectedLocale}`;

      if ((response.status === 429 || response.status >= 500) && attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
        continue;
      }
      return {
        requestedUrl,
        finalUrl: final.href,
        httpStatus: response.status,
        finalLocale,
        htmlLang,
        contentType,
        verified: reason === null,
        reason,
        attempts: attempt,
      };
    } catch (error) {
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
        continue;
      }
      return {
        requestedUrl,
        finalUrl: null,
        httpStatus: null,
        finalLocale: null,
        htmlLang: null,
        contentType: null,
        verified: false,
        reason: `Request failed: ${error.message}`,
        attempts: attempt,
      };
    }
  }
}

async function main() {
  const html = await readFile(sourceFile, 'utf8');
  const urls = extractUrls(html);
  if (urls.length === 0) throw new Error('No English Microsoft Learn links found in site/index.html');
  const tasks = urls.flatMap((original) => [
    { original, language: 'en', locale: 'en-us', requestedUrl: original },
    ...Object.entries(locales).map(([language, locale]) => ({
      original,
      language,
      locale,
      requestedUrl: original.replace(/\/en-us\//i, `/${locale}/`),
    })),
  ]);
  const results = new Map(urls.map((url) => [url, {}]));
  let nextTask = 0;
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (nextTask < tasks.length) {
      const task = tasks[nextTask++];
      results.get(task.original)[task.language] = await verify(task.requestedUrl, task.locale);
    }
  }));

  const links = {};
  const evidence = {};
  const verifiedCounts = Object.fromEntries(Object.keys(locales).map((locale) => [locale, 0]));
  const fallbacks = [];
  for (const original of urls) {
    links[original] = {};
    evidence[original] = {};
    for (const language of ['en', ...Object.keys(locales)]) {
      const check = results.get(original)[language];
      evidence[original][language] = check;
      if (language === 'en') continue;
      links[original][language] = check.verified ? check.finalUrl : original;
      if (check.verified) verifiedCounts[language] += 1;
      else {
        fallbacks.push({ original, language, reason: check.reason });
        evidence[original][language].fallbackReason = check.reason;
      }
    }
  }
  // Avoid publishing evidence from a source snapshot that changed during requests.
  if (await readFile(sourceFile, 'utf8') !== html) {
    throw new Error('site/index.html changed during verification; rerun to verify the current source');
  }
  const output = {
    schemaVersion: 1,
    verifiedAt: new Date().toISOString(),
    source: 'site/index.html',
    sourceSha256: createHash('sha256').update(html).digest('hex'),
    verification: { method: 'GET', redirect: 'follow', concurrency, timeoutMs, maxAttempts, locales },
    summary: { uniqueEnglishUrls: urls.length, verifiedCounts, fallbacks },
    links,
    evidence,
  };
  await writeFile(outputFile, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ output: fileURLToPath(outputFile), ...output.summary }, null, 2));
  const invalidEnglish = urls.filter((url) => !results.get(url).en.verified);
  if (invalidEnglish.length) {
    console.warn('English source links requiring attention:', JSON.stringify(invalidEnglish));
  }
}

await main();
