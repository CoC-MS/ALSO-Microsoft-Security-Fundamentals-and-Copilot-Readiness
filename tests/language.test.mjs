import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";

const script = await readFile(new URL("../site/language.js", import.meta.url), "utf8");
const css = await readFile(new URL("../site/styles.css", import.meta.url), "utf8");

test("language dropdown keeps chapter, query and project base, restores history selection, and translates mobile labels", () => {
  const events = {};
  const selections = {};
  const options = ["en", "de", "fr", "es", "ru", "it", "pl"].map((lang) => ({ lang, value: lang === "en" ? "../" : `../${lang}/` }));
  const select = { options, value: "", addEventListener(name, callback) { selections[name] = callback; } };
  let destination;
  const cells = [{ dataset: {} }, { dataset: {} }];
  const headings = ["Bereich", "Die Grundlage", "Zusätzlicher Schutz"].map((text) => ({
    childNodes: [{ textContent: text }, { textContent: "Business Premium" }],
  }));
  const styles = new Map();
  const header = { getBoundingClientRect: () => ({ height: 105 }) };
  const nav = { getBoundingClientRect: () => ({ height: 54 }) };
  const document = {
    querySelectorAll(selector) {
      if (selector === ".readiness-matrix thead th") return headings;
      if (selector === ".readiness-matrix tbody tr") return [{ querySelectorAll: () => cells }];
      throw new Error(`Unexpected selector ${selector}`);
    },
    querySelector(selector) {
      if (selector === "#language-select") return select;
      return selector === ".site-header" ? header : nav;
    },
    baseURI: "https://example.test/guide/de/?review=1#identity",
    documentElement: { lang: "de", style: { setProperty: (key, value) => styles.set(key, value) } },
  };
  const window = {
    location: { hash: "#copilot-preparation", search: "?review=1", assign(url) { destination = url; } },
    addEventListener(name, callback) { events[name] = callback; },
  };
  class ResizeObserver {
    constructor(callback) { this.callback = callback; }
    observe(target) { assert.equal(target, header); this.callback(); this.callback(); }
  }
  runInNewContext(script, { document, window, URL, ResizeObserver });
  assert.equal(select.value, "../de/");
  for (const option of options) {
    select.value = option.value;
    selections.change();
    assert.equal(destination, `https://example.test/guide/${option.lang === "en" ? "" : `${option.lang}/`}?review=1#copilot-preparation`);
  }
  events.pageshow();
  assert.equal(select.value, "../de/", "Back/forward cache must restore actual page locale");
  assert.equal(cells[0].dataset.label, "Die Grundlage\nBusiness Premium");
  assert.equal(cells[1].dataset.label, "Zusätzlicher Schutz\nBusiness Premium");
  assert.equal(styles.get("--header-height"), "105px");
  assert.equal(document.documentElement.style.scrollPaddingTop, "183px");
  assert.match(css, /min-height: var\(--header-min-height\)/, "Measured height must not feed back into header sizing");
  window.location.hash = "";
  window.location.search = "";
  select.value = "../";
  selections.change();
  assert.equal(destination, "https://example.test/guide/");
});
