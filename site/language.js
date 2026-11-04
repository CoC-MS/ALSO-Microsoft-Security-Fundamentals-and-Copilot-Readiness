const languageSelect = document.querySelector("#language-select");
function restoreLanguageSelection() {
  const option = [...languageSelect.options].find((item) => item.lang === document.documentElement.lang);
  languageSelect.value = option.value;
}
languageSelect.addEventListener("change", () => {
  const url = new URL(languageSelect.value, document.baseURI);
  url.search = window.location.search;
  url.hash = window.location.hash;
  window.location.assign(url.href);
});
window.addEventListener("pageshow", restoreLanguageSelection);
restoreLanguageSelection();

const headings = [...document.querySelectorAll(".readiness-matrix thead th")];
document.querySelectorAll(".readiness-matrix tbody tr").forEach((row) => {
  row.querySelectorAll("td").forEach((cell, index) => {
    const heading = headings[index + 1];
    cell.dataset.label = [...heading.childNodes].map((node) => node.textContent.trim()).filter(Boolean).join("\n");
  });
});

const header = document.querySelector(".site-header");
const chapterNav = document.querySelector(".chapter-nav");
new ResizeObserver(() => {
  const height = header.getBoundingClientRect().height;
  document.documentElement.style.setProperty("--header-height", `${height}px`);
  document.documentElement.style.scrollPaddingTop = `${height + chapterNav.getBoundingClientRect().height + 24}px`;
}).observe(header);
