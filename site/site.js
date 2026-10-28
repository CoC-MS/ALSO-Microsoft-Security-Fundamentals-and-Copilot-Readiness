const chapterLinks = [...document.querySelectorAll(".chapter-nav a")];
const chapters = chapterLinks.map((link) => document.querySelector(link.hash));

function updateChapter() {
  const nav = document.querySelector(".chapter-nav");
  const threshold = nav.getBoundingClientRect().bottom + 45;
  let activeIndex = 0;
  chapters.forEach((chapter, index) => {
    if (chapter.getBoundingClientRect().top <= threshold) activeIndex = index;
  });
  chapterLinks.forEach((link, index) => {
    if (index === activeIndex) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  });
}

let scheduled = false;
window.addEventListener("scroll", () => {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(() => {
    updateChapter();
    scheduled = false;
  });
}, { passive: true });
window.addEventListener("resize", updateChapter);
window.addEventListener("load", updateChapter);
updateChapter();

const referenceStates = new Map();
window.addEventListener("beforeprint", () => {
  document.querySelectorAll(".visual-reference").forEach((reference) => {
    referenceStates.set(reference, reference.open);
    reference.open = true;
  });
});
window.addEventListener("afterprint", () => {
  referenceStates.forEach((open, reference) => { reference.open = open; });
  referenceStates.clear();
});
