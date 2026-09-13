import {
  computePosition,
  offset,
  flip,
  shift,
  autoUpdate,
} from "./vendor/floating.mjs";
import { marked } from "./vendor/marked.mjs";
import DOMPurify from "./vendor/purify.mjs";
import { iconData } from "./vendor/icon-data.generated.mjs";

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
  "volume-2",
  "thumbs-up",
  "thumbs-down",
  "rotate-ccw",
  "git-branch",
  "share-2",
  "pin",
  "ellipsis",
  "pause",
  "play",
  "download",
  // CourtWork domain glyphs and the Settings group set (stage 1, 2026-09-11)
  "expert",
  "matter",
  "spark",
  "attention",
  "chat",
  "text-align-start",
  "sliders-horizontal",
  "palette",
  "cpu",
  "book-open",
  "database",
  "key-round",
  "keyboard",
  "code",
]);
/* IC-1 / copy-convention §4 · the glyph slot is 16 in a row, 18 on a control and
 * 20 in navigation. The size is stated where the glyph is built, not patched
 * afterwards by a selector, so a row's glyph cannot silently inherit a control's
 * size when it moves. The hit region is a separate number and is never derived
 * from this one. */
export function icon(name, { size = 20 } = {}) {
  if (!icons.has(name)) throw new Error("Unknown static icon");
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  for (const [key, value] of Object.entries({
    viewBox: "0 0 24 24",
    width: size,
    height: size,
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
  // The Host can disappear while the UI remains open. New controls must keep
  // their glyphs without resolving another external SVG resource on each render.
  // Geometry is generated from the same pinned source as icons.svg, not redrawn.
  for (const [tag, attrs] of iconData[name]) {
    const shape = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [key, value] of Object.entries(attrs)) shape.setAttribute(key, value);
    svg.append(shape);
  }
  return svg;
}
/* WK-57 · one anatomy for every Chat Flow row, reached by subtraction from the
 * frontier card: a type glyph at 16, the object's own name, one metadata line,
 * and at most one primary action. There is no second action, no nested card and
 * no eyebrow — a row that needs two actions is not this primitive.
 *
 * `title` is the object name (copy-convention §2 «标题 = 对象名本身»); `meta` is
 * one state word or one type fact in grey (only failed / waiting_user are ever
 * coloured, by the caller's class); `action` is the single trailing control, or
 * null when the row's own disclosure is the action. */
export function flowRow(
  tag,
  { glyph, title, meta, className = "", attrs } = {},
  action = null,
) {
  const disclosure = tag === 'summary' || (tag === 'button' && attrs && Object.hasOwn(attrs, 'aria-expanded'))
    ? icon('chevron-right', { size: 16 }) : null;
  disclosure?.classList.add('flow-disclosure-icon');
  return el(
    tag,
    { className: `flow-row ${className}`.trim(), attrs },
    glyph ? icon(glyph, { size: 16 }) : null,
    el("span", { className: "flow-title", text: title }),
    meta ? el("span", { className: "flow-meta", text: meta }) : null,
    action,
    disclosure,
  );
}
/* M-16（WK-131 / WK-132）· 一个动作按钮的解剖只有一个主人。
 *
 * 此前三处调用方各自在 `setAction` 之后 `classList.remove("icon-only")` 再
 * `replaceChildren`：可见标签、图标位置与 icon-only 的几何锁因此散在三份代码里，
 * 任何一次重绘只要漏掉其中一步，按钮就会既锁着 `--control` 见方的零内边距几何、
 * 又装着一行看得见的字。这里把五件事收回同一处：字形、可见 / sr-only 标签槽位、
 * aria 名、tooltip、以及 icon-only 类名。`visible` 取字符串时是"看得见的短词 +
 * 完整可访问名"（WK-59）；`trailing` 把字形放到标签之后；`size` 保留各处既有字号。 */
export function setAction(
  button,
  name,
  label,
  { visible = false, trailing = false, size } = {},
) {
  const shown = typeof visible === "string" ? visible : visible ? label : null;
  if (name == null && !shown) throw new Error("Text controls require a visible name");
  const glyph = name == null ? null : icon(name, size ? { size } : undefined);
  const text = el("span", {
    className: shown ? "button-label" : "sr-only",
    text: shown ?? label,
  });
  button.replaceChildren(...(trailing ? [text, glyph] : [glyph, text]).filter(Boolean));
  button.setAttribute("aria-label", label);
  button.removeAttribute("title");
  if (shown) delete button.dataset.tooltip;
  else button.dataset.tooltip = label;
  button.classList.toggle("icon-only", !shown);
  return button;
}
export function action(
  name,
  label,
  onClick,
  { visible = false, trailing = false, size, className = "quiet-button", attrs = {} } = {},
) {
  const button = setAction(
    el("button", { className, attrs: { type: "button", ...attrs } }),
    name,
    label,
    { visible, trailing, size },
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
/* M-10 · 首个 tooltip 的延迟，以及"刚看过一个"的分组窗口。两个数字都在这里，
 * 改一个不必翻两处。 */
export const TOOLTIP_DELAY = 400;
export const TOOLTIP_GROUP_WINDOW = 300;

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
    generation = 0,
    lastHidden = 0;
  /* M-10（WK-119 补充，CC-W 第 0 项）· 一个 provider 里的 tooltip 共享一段延迟：
   * 第一个等 TOOLTIP_DELAY，之后 TOOLTIP_GROUP_WINDOW 之内移到相邻控件即时切换，
   * 出了这个窗口再回到延迟。语义不变 —— 仍然是纯文本、仍然只在 hover / focus 上
   * 出现、仍然是同一个单例浮层，改的只是"这一次要不要等"。 */
  const hide = () => {
    clearTimeout(timer);
    clearTimeout(closing);
    if (anchor) lastHidden = Date.now();
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
    const grouped =
      Boolean(anchor) || Date.now() - lastHidden <= TOOLTIP_GROUP_WINDOW;
    timer = setTimeout(() => show(target), grouped ? 0 : TOOLTIP_DELAY);
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
    hide();
    if (target?.matches(":focus-visible")) {
      // Native popover dismissal restores focus inside its own show/hide
      // operation. Open the tooltip after that operation, not reentrantly.
      const own = generation;
      queueMicrotask(() => {
        if (own === generation && target.contains(document.activeElement)) show(target);
      });
    }
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

/* WK-92 · Chat 与 Work 是同一个会话的两种交互模式，不是两种对象。一个会话在绑定
 * Matter 之前是 Chat，绑定之后是 Work；判断只读会话上**已经有**的那一个事实
 * （`extensionBinding`），不新增字段、不新增状态、不新增端点。Project 是容器，
 * Workspace 是可选的文件夹绑定，两者都不参与这个判断 —— 一个没有 workspace 的
 * 会话仍然是 Chat，一个有 workspace 的未绑定会话也仍然是 Chat。 */
export const SESSION_MODE_LABELS = { chat: "Chat", work: "Work" };
export function sessionMode(session) {
  return session?.extensionBinding ? "work" : "chat";
}
export function sessionModeLabel(session) {
  return SESSION_MODE_LABELS[sessionMode(session)];
}
/* WK-92 · Matter header 的 scope 位。BE-19（memory adapter）之前它只有一个可说的
 * 值，所以它是一句陈述而不是一个开关：没有 popover，没有控件，因为今天没有第二个
 * 值可以切过去。画一个只能停在 Off 的选择器会许诺一个后端没有的能力。 */
export const MEMORY_SCOPE_OFF = "Memory · Off";

/* FE-04 · 一个在途请求是第三类事实：既不是它出发前的状态，也不是它请求的那个结果
 * （FN-19；review-projection §6 授权卡一行「pending → submitting：按钮禁用、文字
 * "Sending…"、不换图标」）。同一个词由每一个只送一次决定的原语共用 —— 授权卡的
 * Approve / Deny、问题卡的 Answer、composer 的 Send 与 Cancel run —— 于是「已送出」
 * 与「已生效」在四处都不会被同一个标签混同。状态词（Working / Stopping / Cancelled）
 * 不受它影响：那些说的是 Run 的状态，只能由宿主的回执改变。 */
export const SENDING_LABEL = "Sending…";
export function requestLabel(label, inFlight) {
  return inFlight ? SENDING_LABEL : label;
}
/* M-9（WK-118 (d)，CC-W 第 0 项）· 换词是对的，换宽度不是。`Sending…` 比 `Approve`
 * 长、比 `Cancel run` 短，于是一次决定送出的瞬间，它旁边的按钮会左右挪一下 —— 指针
 * 已经落在半路上的用户因此可能点到另一个决定。修法不是量一次宽度存起来（那会在字号
 * 三档、`--text-scale` 与不同字体回退下过期），而是让按钮**同时**排一份静止态标签：
 * 当前标签与两份影子叠在同一个 grid 格子里，两份影子分别预留静止态与在途态的
 * 宽度，按钮的宽度因此永远是两者的较大值。按钮元素本身不被替换，所以焦点不动。 */
export function setRequestLabel(button, label, inFlight) {
  const visible = document.createElement("span");
  visible.className = "request-label";
  visible.textContent = requestLabel(label, inFlight);
  // Icon actions already have fixed geometry. Preserve the glyph installed by
  // setAction through every repaint; only their accessible name and tooltip
  // change while a request is in flight. Text actions still reserve both labels.
  const glyph = button.classList.contains?.("icon-only")
    ? button.querySelector(":scope > svg.ui-icon") : null;
  if (glyph) {
    visible.className = "request-label sr-only";
    button.classList.remove("request-width");
    delete button.dataset.restingLabel;
    delete button.dataset.sendingLabel;
    button.dataset.tooltip = visible.textContent;
    button.setAttribute("aria-label", visible.textContent);
    button.replaceChildren(glyph, visible);
    return button;
  }
  button.classList.add("request-width");
  /* 影子是 CSS 生成内容（`::before` / `::after` 读两个属性），不是一个真的子节点：真的子节点
   * 会进 `textContent`，而既有的反例脚本正是按 `textContent` 认这几个按钮的。生成
   * 内容在无障碍树里可能被读到，所以可访问名由 `aria-label` 显式说一遍，与看得见的
   * 字一字不差。 */
  button.dataset.restingLabel = label;
  button.dataset.sendingLabel = SENDING_LABEL;
  button.setAttribute("aria-label", requestLabel(label, inFlight));
  button.replaceChildren(visible);
  return button;
}
