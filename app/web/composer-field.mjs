/* CI-B / CI-F · the composer field's two behaviours that do not depend on what
 * the backend can accept.
 *
 * Growth (CI-B). The field grows with its content from its variant's min-height
 * to its max-height (Chat 88 → 180, Home 96 → 160, Home modules 48 → 160, all
 * declared in styles.css), then scrolls. Where `field-sizing: content` is
 * supported the stylesheet does all of it and this module does nothing. Where it
 * is not, `installComposerGrowth` sizes the box from `scrollHeight`. Neither path
 * ever writes `value`: a `value` write empties the browser's undo history.
 *
 * Unsupported paste (CI-F). A run takes text only. A paste that carries an image
 * and no usable text would otherwise insert nothing and say nothing; it gets one
 * sentence instead. A paste with text is left entirely to the browser — the image
 * in such a clipboard is often just another representation of the same text
 * (a copied table, a document selection), and nothing here may swallow text. */

export function supportsFieldSizing(css = globalThis.CSS) {
  return Boolean(css?.supports?.("field-sizing", "content"));
}

/* Fit the field's height to its content. min-height / max-height in the
 * stylesheet still clamp the result, so the variants keep their own bounds. */
export function fitFieldHeight(field, view = globalThis) {
  const style = view.getComputedStyle(field);
  const px = (name) => Number.parseFloat(style.getPropertyValue(name)) || 0;
  const edge = style.getPropertyValue("box-sizing") === "border-box"
    ? px("border-top-width") + px("border-bottom-width")
    : -(px("padding-top") + px("padding-bottom"));
  field.style.height = "auto";
  field.style.height = `${field.scrollHeight + edge}px`;
}

/* Returns the function the caller runs after every programmatic value change
 * (draft restore, session switch, send). With native support it is a no-op. */
export function installComposerGrowth(field, { css = globalThis.CSS, view = globalThis } = {}) {
  if (!field || supportsFieldSizing(css)) return () => {};
  const fit = () => fitFieldHeight(field, view);
  field.addEventListener("input", fit);
  // Width decides how the text wraps; height changes are this function's own.
  let width = field.clientWidth;
  if (typeof view.ResizeObserver === "function") {
    new view.ResizeObserver(() => {
      if (field.clientWidth === width) return;
      width = field.clientWidth;
      fit();
    }).observe(field);
  }
  fit();
  return fit;
}

export function unsupportedPasteNotice(data) {
  if (!data) return "";
  if ((data.getData?.("text/plain") ?? "").trim()) return "";
  const images = Array.from(data.items ?? []).filter(
    (item) => item.kind === "file" && /^image\//.test(item.type),
  ).length;
  if (!images) return "";
  return images === 1
    ? "Only text can be sent, so the image wasn't added."
    : "Only text can be sent, so the images weren't added.";
}
