import {
  computePosition,
  offset,
  flip,
  shift,
  autoUpdate,
} from "./vendor/floating.mjs";
import { marked } from "./vendor/marked.mjs";
import DOMPurify from "./vendor/purify.mjs";

export function el(tag, { className, text, attrs } = {}, ...children) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = String(text);
  for (const [key, value] of Object.entries(attrs || {}))
    if (value !== null && value !== undefined)
      node.setAttribute(key, String(value));
  for (const child of children.flat())
    if (child !== null && child !== undefined && child !== false)
      node.append(
        typeof child === "string" ? document.createTextNode(child) : child,
      );
  return node;
}
const icons = new Set([
  "panel-left",
  "plug",
  "panel-right",
  "x",
  "plus",
  "square-pen",
  "settings-2",
  "refresh-cw",
  "search",
  "chevron-right",
  "chevron-down",
  "arrow-up",
  "square",
  "paperclip",
  "file-text",
  "copy",
  "maximize-2",
  "minimize-2",
  "house",
  "activity",
  "folder",
  "message-square",
  "arrow-down",
  "external-link",
]);
export function icon(name) {
  if (!icons.has(name)) throw new Error("Unknown static icon");
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  for (const [key, value] of Object.entries({
    viewBox: "0 0 24 24",
    width: 20,
    height: 20,
    fill: "none",
    stroke: "currentColor",
    "stroke-width": 2,
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    "aria-hidden": "true",
    focusable: "false",
    class: "ui-icon",
  }))
    svg.setAttribute(key, String(value));
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
  use.setAttribute("href", `/web/vendor/icons.svg#${name}`);
  svg.append(use);
  return svg;
}
export function setAction(button, name, label, { visible = false } = {}) {
  button.replaceChildren(
    icon(name),
    el("span", {
      className: visible ? "button-label" : "sr-only",
      text: label,
    }),
  );
  button.setAttribute("aria-label", label);
  button.removeAttribute("title");
  if (visible) delete button.dataset.tooltip;
  else button.dataset.tooltip = label;
  button.classList.toggle("icon-only", !visible);
  return button;
}
export function action(
  name,
  label,
  onClick,
  { visible = false, className = "quiet-button", attrs = {} } = {},
) {
  const button = setAction(
    el("button", { className, attrs: { type: "button", ...attrs } }),
    name,
    label,
    { visible },
  );
  if (onClick) button.addEventListener("click", onClick);
  return button;
}
export function copyAction(text, label = "Copy", focusKey = "") {
  const button = action(
    "copy",
    label,
    async () => {
      try {
        await navigator.clipboard.writeText(String(text));
        setAction(button, "copy", "Copied");
        const timer = setTimeout(() => {
          if (button.isConnected) setAction(button, "copy", label);
        }, 1600);
      } catch {
        setAction(button, "copy", "Copy unavailable");
      }
    },
    { attrs: { "data-focus-key": focusKey } },
  );
  return button;
}
const markdownTags = [
  "p",
  "br",
  "strong",
  "em",
  "del",
  "blockquote",
  "ul",
  "ol",
  "li",
  "pre",
  "code",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "a",
  "hr",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
];
export function markdown(text, { key = "markdown" } = {}) {
  const root = el("div", { className: "markdown-body" });
  const html = marked.parse(String(text), { gfm: true, async: false });
  root.append(
    DOMPurify.sanitize(html, {
      ALLOWED_TAGS: markdownTags,
      ALLOWED_ATTR: ["href", "title", "start", "colspan", "rowspan"],
      RETURN_DOM_FRAGMENT: true,
    }),
  );
  for (const link of root.querySelectorAll("a")) {
    const href = link.getAttribute("href") || "";
    if (!/^https?:\/\//i.test(href)) {
      link.removeAttribute("href");
      continue;
    }
    link.setAttribute("target", "_blank");
    link.setAttribute("rel", "noopener noreferrer");
  }
  let index = 0;
  for (const pre of [...root.querySelectorAll("pre")]) {
    const wrap = el("div", { className: "code-block" });
    pre.replaceWith(wrap);
    wrap.append(
      el(
        "div",
        { className: "code-toolbar" },
        el("span", { text: "Code" }),
        copyAction(pre.textContent, "Copy code", `${key}:code:${index++}`),
      ),
      pre,
    );
  }
  for (const table of [...root.querySelectorAll("table")]) {
    const wrap = el("div", {
      className: "table-scroll",
      attrs: { tabindex: 0, "aria-label": "Scrollable table" },
    });
    table.replaceWith(wrap);
    wrap.append(table);
  }
  return root;
}

// One tooltip adapter. Floating UI owns positioning; native controls own actions.
/** Keep a fixed-position popover beside its anchor while it is open. Returns
 * the autoUpdate cleanup; the caller runs it when the popover closes. */
export function anchorPopover(anchor, popover, { placement = "bottom-end" } = {}) {
  return autoUpdate(anchor, popover, () => {
    if (!anchor.isConnected || !popover.matches(":popover-open")) return;
    computePosition(anchor, popover, {
      strategy: "fixed",
      placement,
      middleware: [offset(8), flip(), shift({ padding: 8 })],
    })
      .then(({ x, y }) => {
        popover.style.left = `${x}px`;
        popover.style.top = `${y}px`;
      })
      .catch(() => {});
  });
}
export function installTooltips() {
  const tip = el("div", {
    className: "ui-tooltip",
    attrs: { id: "control-tooltip", role: "tooltip", popover: "manual" },
  });
  document.body.append(tip);
  let anchor = null,
    cleanup = null,
    timer = null,
    closing = null,
    generation = 0;
  const hide = () => {
    clearTimeout(timer);
    clearTimeout(closing);
    generation++;
    cleanup?.();
    cleanup = null;
    anchor?.removeAttribute("aria-describedby");
    anchor = null;
    if (tip.matches(":popover-open")) tip.hidePopover();
  };
  const show = (target) => {
    if (
      !target?.isConnected ||
      target.closest("[inert]") ||
      target.disabled ||
      !target.getClientRects().length
    )
      return;
    // A control whose label is already fully visible needs no tooltip (IC-3):
    // navigation rows only explain themselves when their name is truncated.
    const visibleLabel = target.querySelector(".session-name, .project-name");
    if (visibleLabel && visibleLabel.scrollWidth <= visibleLabel.clientWidth)
      return;
    hide();
    anchor = target;
    const own = ++generation;
    tip.textContent = target.dataset.tooltip;
    tip.showPopover();
    target.setAttribute("aria-describedby", tip.id);
    cleanup = autoUpdate(target, tip, () => {
      if (!target.isConnected || !target.getClientRects().length) {
        hide();
        return;
      }
      computePosition(target, tip, {
        strategy: "fixed",
        placement: target.dataset.tooltipSide || "bottom",
        middleware: [offset(8), flip(), shift({ padding: 8 })],
      })
        .then(({ x, y }) => {
          if (own === generation) {
            tip.style.left = `${x}px`;
            tip.style.top = `${y}px`;
          }
        })
        .catch(hide);
    });
  };
  const abort = new AbortController();
  const listen = (target, name, fn, options = {}) =>
    target.addEventListener(name, fn, { ...options, signal: abort.signal });
  listen(document, "pointerover", (event) => {
    if (event.pointerType === "touch") return;
    const target = event.target.closest?.("[data-tooltip]");
    if (event.target === tip || tip.contains(event.target)) {
      clearTimeout(closing);
      return;
    }
    if (!target || target === anchor) return;
    clearTimeout(timer);
    timer = setTimeout(() => show(target), 400);
  });
  listen(document, "pointerout", (event) => {
    const target = event.target.closest?.("[data-tooltip]");
    if (target && !target.contains(event.relatedTarget)) {
      clearTimeout(timer);
      closing = setTimeout(hide, 120);
    }
    if (event.target === tip) closing = setTimeout(hide, 120);
  });
  listen(document, "focusin", (event) => {
    const target = event.target.closest?.("[data-tooltip]");
    if (target?.matches(":focus-visible")) show(target);
    else hide();
  });
  listen(document, "focusout", hide);
  listen(document, "pointerdown", hide, { capture: true });
  listen(
    document,
    "keydown",
    (event) => {
      if (
        event.key === "Escape" &&
        tip.matches(":popover-open") &&
        !event.isComposing
      ) {
        hide();
      }
    },
    { capture: true },
  );
  listen(window, "blur", hide);
  return {
    hide,
    dispose() {
      hide();
      abort.abort();
      tip.remove();
    },
  };
}
