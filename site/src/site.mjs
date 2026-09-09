// The page's only script. Two jobs, both of which the page survives without:
// switch the three layer tabs, and let the reader put one paragraph of the
// architecture section in focus. Nothing here fetches, stores or measures.

// ---- 01 · the three layers of one fact -------------------------------------
for (const group of document.querySelectorAll("[data-tabs]")) {
  const tabs = [...group.querySelectorAll('[role="tab"]')];
  const panels = tabs.map((tab) => document.getElementById(tab.getAttribute("aria-controls")));

  const select = (index) => {
    tabs.forEach((tab, position) => {
      tab.setAttribute("aria-selected", String(position === index));
      tab.tabIndex = position === index ? 0 : -1;
      panels[position].hidden = position !== index;
    });
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => select(index));
    tab.addEventListener("keydown", (event) => {
      const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
      if (!step) return;
      event.preventDefault();
      const from = tabs.indexOf(document.activeElement);
      const next = ((from === -1 ? index : from) + step + tabs.length) % tabs.length;
      select(next);
      tabs[next].focus();
    });
  });

  // Only now do the panels start hiding each other: until this line runs, all
  // three are on the page, which is what a reader without scripting gets.
  group.dataset.ready = "";
  select(0);
}

// ---- 03 · one paragraph at a time ------------------------------------------
const editorial = document.querySelector(".editorial");
if (editorial) {
  const paragraphs = [...editorial.querySelectorAll(".prose[data-layers]")];
  const layers = [...editorial.querySelectorAll(".diagram g[data-layer]")];

  const clear = () => {
    delete editorial.dataset.focus;
    for (const node of [...paragraphs, ...layers]) node.classList.remove("is-sharp");
  };

  const focus = (paragraph) => {
    const wanted = new Set((paragraph.dataset.layers || "").split(" ").filter(Boolean));
    if (!wanted.size) return clear();
    editorial.dataset.focus = "";
    for (const node of paragraphs) node.classList.toggle("is-sharp", node === paragraph);
    for (const layer of layers) layer.classList.toggle("is-sharp", wanted.has(layer.dataset.layer));
  };

  for (const paragraph of paragraphs) {
    paragraph.tabIndex = 0;
    paragraph.addEventListener("pointerenter", () => focus(paragraph));
    paragraph.addEventListener("focus", () => focus(paragraph));
    paragraph.addEventListener("blur", clear);
  }
  editorial.addEventListener("pointerleave", clear);
}
