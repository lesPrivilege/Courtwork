/* WK9 artboard runtime · classic script.
   ES modules and external <use href> are both blocked over file://, so the two generated assets
   below are inlined verbatim rather than imported. Neither is hand-drawn:
     ICON_SPRITE   = /private/tmp/se-agent-wk6/app/web/vendor/icons.svg (the Lucide subset the product already vendors)
     WORDMARK_*    = renderSymbol({concept:"write", material:"hierarchical", size:20, theme:...})
                     from /private/tmp/se-agent-wk6/brand/src/symbol.mjs
   WK-38: the stem takes --cw-ink, the three lines --cw-record. The brand package still hardcodes those
   two greys inside its shadow root, so host tokens cannot reach it until brand-requests BR-1 lands;
   the artboards therefore keep a light and a dark rendering and swap them. Product code keeps the
   <court-symbol material="hierarchical" size="20"> custom element; only these artboards inline its output. */
(function () {
  var ICON_SPRITE = "<svg xmlns=\"http://www.w3.org/2000/svg\">\n<symbol id=\"activity\" viewBox=\"0 0 24 24\">\n  <path d=\"M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2\" />\n</symbol>\n<symbol id=\"arrow-down\" viewBox=\"0 0 24 24\">\n  <path d=\"M12 5v14\" />\n  <path d=\"m19 12-7 7-7-7\" />\n</symbol>\n<symbol id=\"arrow-up\" viewBox=\"0 0 24 24\">\n  <path d=\"m5 12 7-7 7 7\" />\n  <path d=\"M12 19V5\" />\n</symbol>\n<symbol id=\"chevron-down\" viewBox=\"0 0 24 24\">\n  <path d=\"m6 9 6 6 6-6\" />\n</symbol>\n<symbol id=\"chevron-right\" viewBox=\"0 0 24 24\">\n  <path d=\"m9 18 6-6-6-6\" />\n</symbol>\n<symbol id=\"copy\" viewBox=\"0 0 24 24\">\n  <rect width=\"14\" height=\"14\" x=\"8\" y=\"8\" rx=\"2\" ry=\"2\" />\n  <path d=\"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2\" />\n</symbol>\n<symbol id=\"external-link\" viewBox=\"0 0 24 24\">\n  <path d=\"M15 3h6v6\" />\n  <path d=\"M10 14 21 3\" />\n  <path d=\"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6\" />\n</symbol>\n<symbol id=\"file-text\" viewBox=\"0 0 24 24\">\n  <path d=\"M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z\" />\n  <path d=\"M14 2v5a1 1 0 0 0 1 1h5\" />\n  <path d=\"M10 9H8\" />\n  <path d=\"M16 13H8\" />\n  <path d=\"M16 17H8\" />\n</symbol>\n<symbol id=\"folder\" viewBox=\"0 0 24 24\">\n  <path d=\"M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z\" />\n</symbol>\n<symbol id=\"house\" viewBox=\"0 0 24 24\">\n  <path d=\"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8\" />\n  <path d=\"M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z\" />\n</symbol>\n<symbol id=\"maximize-2\" viewBox=\"0 0 24 24\">\n  <path d=\"M15 3h6v6\" />\n  <path d=\"m21 3-7 7\" />\n  <path d=\"m3 21 7-7\" />\n  <path d=\"M9 21H3v-6\" />\n</symbol>\n<symbol id=\"message-square\" viewBox=\"0 0 24 24\">\n  <path d=\"M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z\" />\n</symbol>\n<symbol id=\"minimize-2\" viewBox=\"0 0 24 24\">\n  <path d=\"m14 10 7-7\" />\n  <path d=\"M20 10h-6V4\" />\n  <path d=\"m3 21 7-7\" />\n  <path d=\"M4 14h6v6\" />\n</symbol>\n<symbol id=\"panel-left\" viewBox=\"0 0 24 24\">\n  <rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\" />\n  <path d=\"M9 3v18\" />\n</symbol>\n<symbol id=\"panel-right\" viewBox=\"0 0 24 24\">\n  <rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\" />\n  <path d=\"M15 3v18\" />\n</symbol>\n<symbol id=\"paperclip\" viewBox=\"0 0 24 24\">\n  <path d=\"m16 6-8.414 8.586a2 2 0 0 0 2.829 2.829l8.414-8.586a4 4 0 1 0-5.657-5.657l-8.379 8.551a6 6 0 1 0 8.485 8.485l8.379-8.551\" />\n</symbol>\n<symbol id=\"plus\" viewBox=\"0 0 24 24\">\n  <path d=\"M5 12h14\" />\n  <path d=\"M12 5v14\" />\n</symbol>\n<symbol id=\"refresh-cw\" viewBox=\"0 0 24 24\">\n  <path d=\"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8\" />\n  <path d=\"M21 3v5h-5\" />\n  <path d=\"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16\" />\n  <path d=\"M8 16H3v5\" />\n</symbol>\n<symbol id=\"search\" viewBox=\"0 0 24 24\">\n  <path d=\"m21 21-4.34-4.34\" />\n  <circle cx=\"11\" cy=\"11\" r=\"8\" />\n</symbol>\n<symbol id=\"settings-2\" viewBox=\"0 0 24 24\">\n  <path d=\"M14 17H5\" />\n  <path d=\"M19 7h-9\" />\n  <circle cx=\"17\" cy=\"17\" r=\"3\" />\n  <circle cx=\"7\" cy=\"7\" r=\"3\" />\n</symbol>\n<symbol id=\"square-pen\" viewBox=\"0 0 24 24\">\n  <path d=\"M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7\" />\n  <path d=\"M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z\" />\n</symbol>\n<symbol id=\"square\" viewBox=\"0 0 24 24\">\n  <rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\" />\n</symbol>\n<symbol id=\"x\" viewBox=\"0 0 24 24\">\n  <path d=\"M18 6 6 18\" />\n  <path d=\"m6 6 12 12\" />\n</symbol>\n</svg>\n";
  var WORDMARK_LIGHT = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"20\" height=\"20\" viewBox=\"-3 -3 70 70\" role=\"img\" aria-labelledby=\"cwLight-title\" data-concept=\"write\" data-material=\"hierarchical\" data-requested-material=\"hierarchical\" data-presence=\"present\" data-authority=\"none\" data-activity=\"idle\" data-theme=\"light\" data-geometry-sha256=\"522d4303216259490fb501458391431e8329a6aff8cfa3b463be6573d4614556\">\n <title id=\"cwLight-title\">Record forms</title>\n <style>\n svg{color:var(--cw-color,var(--cw-ink,#283849));overflow:visible}\n .hint{opacity:.28}.part{transform-box:fill-box;transform-origin:center}.record{transform-origin:left center}\n [data-presence=\"available\"] .actor{opacity:.38}[data-presence=\"absent\"] .actor{opacity:0}\n [data-concept=\"commit\"] [data-layer=\"settled\"]{opacity:0}[data-concept=\"commit\"][data-activity=\"complete\"] [data-layer=\"settled\"]{opacity:1}\n [data-authority=\"requested\"] [data-layer=\"boundary\"]{stroke-dasharray:3 3}[data-authority=\"revoked\"] [data-layer=\"boundary\"]{opacity:.4}\n @media(forced-colors:active){.part rect{fill:CanvasText!important;stroke:none!important;filter:none!important}[filter]{filter:none!important}[data-layer=\"glow\"]{display:none}}\n @media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}\n </style>\n <defs>\n <linearGradient id=\"cwLight-face\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop stop-color=\"#f7fbff\"/><stop offset=\".38\" stop-color=\"#bacbda\" stop-opacity=\".76\"/><stop offset=\"1\" stop-color=\"#6f889e\"/></linearGradient>\n <linearGradient id=\"cwLight-rim\" x1=\"0\" y1=\"0\" x2=\".7\" y2=\"1\"><stop stop-color=\"#fff\"/><stop offset=\".42\" stop-color=\"#b6c9d7\" stop-opacity=\".42\"/><stop offset=\".68\" stop-color=\"#536e86\"/><stop offset=\"1\" stop-color=\"#e4eff9\"/></linearGradient>\n <linearGradient id=\"cwLight-light\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop stop-color=\"#fff\" stop-opacity=\".76\"/><stop offset=\".45\" stop-color=\"#fff\" stop-opacity=\".02\"/><stop offset=\"1\" stop-color=\"#fff\" stop-opacity=\".16\"/></linearGradient>\n <filter id=\"cwLight-shadow\" x=\"-55%\" y=\"-35%\" width=\"210%\" height=\"190%\" color-interpolation-filters=\"sRGB\"><feDropShadow dx=\"0\" dy=\"1.8\" stdDeviation=\"1.2\" flood-color=\"#1e344a\" flood-opacity=\".2\"/></filter>\n <filter id=\"cwLight-glow\" x=\"-60%\" y=\"-40%\" width=\"220%\" height=\"200%\" color-interpolation-filters=\"sRGB\"><feGaussianBlur stdDeviation=\"1.35\"/></filter>\n </defs>\n \n <g data-layer=\"actor\" class=\"part actor\"><rect x=\"7.2\" y=\"4\" width=\"11.2\" height=\"52.8\" rx=\"2\" fill=\"var(--cw-ink,#283849)\"/></g><g data-layer=\"line line-1\" class=\"part record\"><rect x=\"28\" y=\"7.2\" width=\"28\" height=\"9.6\" rx=\"2.8\" fill=\"var(--cw-record,#6f8191)\"/></g><g data-layer=\"line line-2\" class=\"part record\"><rect x=\"28\" y=\"25.6\" width=\"28\" height=\"9.6\" rx=\"2.8\" fill=\"var(--cw-record,#6f8191)\"/></g><g data-layer=\"line line-3\" class=\"part record\"><rect x=\"28\" y=\"44\" width=\"19.2\" height=\"9.6\" rx=\"2.8\" fill=\"var(--cw-record,#6f8191)\"/></g>\n </svg>";
  var WORDMARK_DARK = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"20\" height=\"20\" viewBox=\"-3 -3 70 70\" role=\"img\" aria-labelledby=\"cwDark-title\" data-concept=\"write\" data-material=\"hierarchical\" data-requested-material=\"hierarchical\" data-presence=\"present\" data-authority=\"none\" data-activity=\"idle\" data-theme=\"dark\" data-geometry-sha256=\"522d4303216259490fb501458391431e8329a6aff8cfa3b463be6573d4614556\">\n <title id=\"cwDark-title\">Record forms</title>\n <style>\n svg{color:var(--cw-color,var(--cw-ink,#e0e8f1));overflow:visible}\n .hint{opacity:.28}.part{transform-box:fill-box;transform-origin:center}.record{transform-origin:left center}\n [data-presence=\"available\"] .actor{opacity:.38}[data-presence=\"absent\"] .actor{opacity:0}\n [data-concept=\"commit\"] [data-layer=\"settled\"]{opacity:0}[data-concept=\"commit\"][data-activity=\"complete\"] [data-layer=\"settled\"]{opacity:1}\n [data-authority=\"requested\"] [data-layer=\"boundary\"]{stroke-dasharray:3 3}[data-authority=\"revoked\"] [data-layer=\"boundary\"]{opacity:.4}\n @media(forced-colors:active){.part rect{fill:CanvasText!important;stroke:none!important;filter:none!important}[filter]{filter:none!important}[data-layer=\"glow\"]{display:none}}\n @media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}\n </style>\n <defs>\n <linearGradient id=\"cwDark-face\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop stop-color=\"#ebf4ff\"/><stop offset=\".38\" stop-color=\"#7f95b2\" stop-opacity=\".76\"/><stop offset=\"1\" stop-color=\"#344459\"/></linearGradient>\n <linearGradient id=\"cwDark-rim\" x1=\"0\" y1=\"0\" x2=\".7\" y2=\"1\"><stop stop-color=\"#ffffff\"/><stop offset=\".42\" stop-color=\"#8aadc9\" stop-opacity=\".42\"/><stop offset=\".68\" stop-color=\"#405e79\"/><stop offset=\"1\" stop-color=\"#b8d1eb\"/></linearGradient>\n <linearGradient id=\"cwDark-light\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop stop-color=\"#fff\" stop-opacity=\".76\"/><stop offset=\".45\" stop-color=\"#fff\" stop-opacity=\".02\"/><stop offset=\"1\" stop-color=\"#fff\" stop-opacity=\".16\"/></linearGradient>\n <filter id=\"cwDark-shadow\" x=\"-55%\" y=\"-35%\" width=\"210%\" height=\"190%\" color-interpolation-filters=\"sRGB\"><feDropShadow dx=\"0\" dy=\"1.8\" stdDeviation=\"1.2\" flood-color=\"#000\" flood-opacity=\".38\"/></filter>\n <filter id=\"cwDark-glow\" x=\"-60%\" y=\"-40%\" width=\"220%\" height=\"200%\" color-interpolation-filters=\"sRGB\"><feGaussianBlur stdDeviation=\"1.35\"/></filter>\n </defs>\n \n <g data-layer=\"actor\" class=\"part actor\"><rect x=\"7.2\" y=\"4\" width=\"11.2\" height=\"52.8\" rx=\"2\" fill=\"var(--cw-ink,#e0e8f1)\"/></g><g data-layer=\"line line-1\" class=\"part record\"><rect x=\"28\" y=\"7.2\" width=\"28\" height=\"9.6\" rx=\"2.8\" fill=\"var(--cw-record,#b4c0ce)\"/></g><g data-layer=\"line line-2\" class=\"part record\"><rect x=\"28\" y=\"25.6\" width=\"28\" height=\"9.6\" rx=\"2.8\" fill=\"var(--cw-record,#b4c0ce)\"/></g><g data-layer=\"line line-3\" class=\"part record\"><rect x=\"28\" y=\"44\" width=\"19.2\" height=\"9.6\" rx=\"2.8\" fill=\"var(--cw-record,#b4c0ce)\"/></g>\n </svg>";

  function isDark() {
    var attr = document.documentElement.getAttribute("data-theme");
    if (attr) return attr === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  function paintWordmarks() {
    var svg = isDark() ? WORDMARK_DARK : WORDMARK_LIGHT;
    var nodes = document.querySelectorAll("[data-brand-wordmark]");
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].innerHTML = svg;
      nodes[i].setAttribute("aria-hidden", "true");
    }
  }
  function boot() {
    var theme = new URLSearchParams(location.search).get("theme");
    if (theme === "dark" || theme === "light")
      document.documentElement.setAttribute("data-theme", theme);
    var host = document.createElement("div");
    host.hidden = true;
    host.innerHTML = ICON_SPRITE;
    document.body.appendChild(host);
    paintWordmarks();
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", paintWordmarks);
    measure();
  }
  /* ?measure=1 reports the real heights of every [data-band]. Measuring aid, never product code. */
  function measure() {
    if (new URLSearchParams(location.search).get("measure") !== "1") return;
    var bands = document.querySelectorAll("[data-band]");
    var parts = [];
    var over = [];
    var all = document.querySelectorAll("body *");
    for (var k = 0; k < all.length; k++)
      if (all[k].getBoundingClientRect().right > document.documentElement.clientWidth + 1)
        over.push(all[k].className || all[k].tagName);
    if (over.length) parts.push("OVERFLOW: " + over.slice(0, 6).join(" | "));
    parts.push("scrollW " + document.documentElement.scrollWidth);
    if (!bands.length) { paint(parts); return; }
    var base = bands[0].getBoundingClientRect().height;
    for (var i = 0; i < bands.length; i++) {
      var h = bands[i].getBoundingClientRect().height;
      parts.push(bands[i].getAttribute("data-band") + " " + Math.round(h) + " (" + (h / base).toFixed(2) + ")");
    }
    paint(parts);
  }
  function paint(parts) {
    var strip = document.createElement("div");
    strip.className = "measure-strip";
    strip.textContent =
      "client " + document.documentElement.clientWidth + "x" + document.documentElement.clientHeight +
      " · " + parts.join(" · ");
    document.body.appendChild(strip);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
