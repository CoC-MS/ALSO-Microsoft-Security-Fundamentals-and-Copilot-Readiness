import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";

const site = new URL("../site/", import.meta.url);
test("all languages link to the byte-identical original English emergency guide", async () => {
  const bytes = await readFile(new URL("downloads/break-glass-account-best-practices.pdf", site));
  assert.equal(createHash("sha256").update(bytes).digest("hex"),
    "47fb00dc594dc1262c7670a7dbd3a50e6e2cc9292d76a69ea2fc4c91df1e64af");
  const labels = { en: "English", de: "Englisch", fr: "en anglais", es: "en inglés", ru: "английском", it: "inglese", pl: "w języku angielskim" };
  for (const [locale, label] of Object.entries(labels)) {
    const url = new URL(locale === "en" ? "index.html" : `${locale}/index.html`, site);
    const html = await readFile(url, "utf8");
    const section = html.split('<article class="step" id="break-glass">')[1].split("</article>")[0];
    const link = section.match(/href="([^"]+\.pdf)" download>([^<]+)/);
    assert.ok(link);
    assert.equal(new URL(link[1], url).href, new URL("downloads/break-glass-account-best-practices.pdf", site).href);
    assert.ok(link[2].includes(label));
  }
  const files = (await readdir(new URL("downloads/", site))).filter((name) => name.startsWith("break-glass"));
  assert.deepEqual(files, ["break-glass-account-best-practices.pdf"]);
});
