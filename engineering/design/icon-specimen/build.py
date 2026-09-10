#!/usr/bin/env python3
"""EX-IC1 specimen generator.

Reads mapping.json plus three frozen upstream checkouts, copies each consumed
SVG verbatim into assets/, records its provenance in sources.json, and inlines
the same bytes into index.html so the finished page fetches nothing at runtime.

Candidate geometry is never redrawn: only width/height/class/aria-hidden are
set on the root element. viewBox, path data, fill/stroke treatment and the
family's own cap/join defaults are carried through untouched.

Usage: python3 build.py <checkout-root>
  <checkout-root>/lucide    lucide-icons/lucide     @ 1.41.0
  <checkout-root>/mingcute  mingcute-design/mingcute-icons @ v3.0.2
  <checkout-root>/phosphor  phosphor-icons/core     @ v2.0.8
"""
import hashlib, json, os, re, shutil, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = sys.argv[1] if len(sys.argv) > 1 else "/private/tmp/ic1-src"

BASE_SHA = "2e9da09bd163ca128e3cd2f4c91ef61ceec2fc2f"

FAMILIES = {
    "lucide": {
        "label": "Lucide",
        "variant": "Regular (shipped baseline)",
        "repo": "lucide-icons/lucide",
        "tag": "1.41.0",
        "commit": "bca7e75a816dcf1e75e8feb5a3198a68cbb8a052",
        "dir": "icons",
        "license": "ISC (with the Feather MIT notice retained upstream)",
        "license_path": "LICENSE",
        "checkout": "lucide",
        "out": "lucide",
    },
    "mingcute": {
        "label": "MingCute Regular",
        "variant": "Core Regular",
        "repo": "mingcute-design/mingcute-icons",
        "tag": "v3.0.2",
        "commit": "e884b033f868d1c38286537c75e764000dc74442",
        "dir": "packages/svg/core-regular",
        "license": "Apache-2.0",
        "license_path": "LICENSE",
        "checkout": "mingcute",
        "out": "mingcute-regular",
    },
    "phosphor": {
        "label": "Phosphor Regular",
        "variant": "Regular",
        "repo": "phosphor-icons/core",
        "tag": "v2.0.8",
        "commit": "d42782b2abe747d904b971ccab48b182a1455f86",
        "dir": "assets/regular",
        "license": "MIT",
        "license_path": "LICENSE",
        "checkout": "phosphor",
        "out": "phosphor-regular",
    },
}
ORDER = ["lucide", "mingcute", "phosphor"]


def sha256(b):
    return hashlib.sha256(b).hexdigest()


def upstream_path(fam, asset):
    return "%s/%s.svg" % (FAMILIES[fam]["dir"], asset)


def upstream_url(fam, path):
    f = FAMILIES[fam]
    return "https://raw.githubusercontent.com/%s/%s/%s" % (f["repo"], f["commit"], path)


def read_asset(fam, asset):
    p = os.path.join(SRC, FAMILIES[fam]["checkout"], upstream_path(fam, asset))
    with open(p, "rb") as fh:
        return fh.read()


def view_box(text):
    m = re.search(r'viewBox="([^"]+)"', text)
    return m.group(1) if m else None


def inline(raw, size, extra_class=""):
    """Return the upstream SVG with only presentation-neutral attributes set."""
    text = raw.decode("utf-8").strip()
    m = re.match(r"<svg\b([^>]*)>", text, re.S)
    attrs = m.group(1)
    attrs = re.sub(r'\s(?:width|height|class|aria-hidden|focusable)="[^"]*"', "", attrs)
    attrs = attrs.rstrip()
    head = '<svg%s width="%d" height="%d" class="gl %s" aria-hidden="true" focusable="false">' % (
        attrs, size, size, extra_class)
    return head + text[m.end():]


def main():
    mapping = json.load(open(os.path.join(HERE, "mapping.json")))
    rows = mapping["semantics"] + mapping["inventory_only"]

    sources = {
        "specimen": "EX-IC1",
        "courtwork_base_sha": BASE_SHA,
        "runtime_network_fetches": 0,
        "note": "Every consumed asset is copied verbatim from a pinned upstream commit and inlined into index.html. No CDN, no webfont, no icon font, no runtime fetch.",
        "families": {},
        "assets": [],
    }

    for fam in ORDER:
        f = FAMILIES[fam]
        outdir = os.path.join(HERE, "assets", f["out"])
        shutil.rmtree(outdir, ignore_errors=True)
        os.makedirs(outdir)
        lic = open(os.path.join(SRC, f["checkout"], f["license_path"]), "rb").read()
        open(os.path.join(outdir, "LICENSE"), "wb").write(lic)
        sources["families"][fam] = {
            "label": f["label"],
            "variant": f["variant"],
            "repository": "https://github.com/%s" % f["repo"],
            "tag": f["tag"],
            "commit": f["commit"],
            "upstream_asset_dir": f["dir"],
            "license": f["license"],
            "license_file": "assets/%s/LICENSE" % f["out"],
            "license_sha256": sha256(lic),
            "role": "SHIPPED BASELINE" if fam == "lucide" else "CANDIDATE",
        }

    if FAMILIES["mingcute"]:
        sources["families"]["mingcute"]["source_variant_note"] = (
            "MingCute publishes the same Core Regular geometry twice inside this commit: "
            "assets/svg/core/regular/<category>/<name>.svg hardcodes stroke=\"#10161F\", while "
            "packages/svg/core-regular/<name>.svg carries stroke=\"currentColor\". The specimen "
            "consumes the currentColor distribution so that all three columns inherit one foreground "
            "colour. Both are upstream-authored; the path data differs only in encoding, not in shape, "
            "and nothing was redrawn locally."
        )
    sources["families"]["phosphor"]["source_variant_note"] = (
        "Phosphor Regular is authored as a filled outline on a 256x256 canvas (fill=currentColor), not "
        "as a stroked 24 grid. That is the family's own Regular weight, not the Fill weight, and it is "
        "preserved as authored."
    )

    inlined = {}
    for row in rows:
        for fam in ORDER:
            asset = row["lucide"] if fam == "lucide" else row[fam]["asset"]
            if asset is None:
                continue
            key = (fam, asset)
            if key in inlined:
                continue
            raw = read_asset(fam, asset)
            out_rel = "assets/%s/%s.svg" % (FAMILIES[fam]["out"], asset)
            open(os.path.join(HERE, out_rel), "wb").write(raw)
            inlined[key] = raw
            sources["assets"].append({
                "family": fam,
                "asset": asset,
                "courtwork_semantics": sorted(
                    r["key"] for r in rows
                    if (r["lucide"] if fam == "lucide" else r[fam]["asset"]) == asset),
                "upstream_path": upstream_path(fam, asset),
                "upstream_url": upstream_url(fam, upstream_path(fam, asset)),
                "sha256": sha256(raw),
                "bytes": len(raw),
                "upstream_view_box": view_box(raw.decode("utf-8")),
                "local_path": out_rel,
                "license": FAMILIES[fam]["license"],
            })
    sources["assets"].sort(key=lambda a: (ORDER.index(a["family"]), a["asset"]))
    json.dump(sources, open(os.path.join(HERE, "sources.json"), "w"), indent=2, ensure_ascii=False)
    json.dump({"inline_count": len(inlined)}, open(os.devnull, "w"))

    render_html(mapping, inlined)
    print("assets: %d  families: %d" % (len(inlined), len(ORDER)))


# ---------------------------------------------------------------- HTML -----

def g(inlined, row, fam, size, cls="", section=""):
    """One glyph cell body: the family's glyph, or an explicit NO MATCH token."""
    asset = row["lucide"] if fam == "lucide" else row[fam]["asset"]
    if asset is None:
        return ('<span class="nomatch" style="--gs:%dpx" data-semantic="%s" data-family="%s"'
                ' role="img" aria-label="No equivalent glyph in this family">NO<br>MATCH</span>'
                % (size, row["key"], fam))
    svg = inline(inlined[(fam, asset)], size, cls)
    return svg.replace("<svg", '<svg data-semantic="%s" data-family="%s" data-asset="%s" data-slot="%s"'
                       % (row["key"], fam, asset, section), 1)


def cell(inner):
    return '<div class="cell">%s</div>' % inner


def by_key(mapping):
    d = {}
    for r in mapping["semantics"] + mapping["inventory_only"]:
        d[r["key"]] = r
    return d


def context(inlined, row, fam):
    """Render one semantic inside its real Courtwork control slot.

    Every family gets byte-identical surrounding DOM, strings, tokens and
    dimensions. The SVG is the only thing that changes.
    """
    k, G = row["key"], lambda s, c="", sec="": g(inlined, row, fam, s, c, sec)
    if k == "nav.home":
        return '<a class="nav-item is-current" href="#">%s<span class="nav-label">Home</span></a>' % G(20, "", "nav")
    if k == "project.object":
        return ('<a class="nav-item nav-sub" href="#">%s<span class="nav-label">Aurora recovery</span>'
                '%s</a>' % (G(20, "", "nav"), g(inlined, by_key.cache["disclosure.open"], fam, 16, "quiet", "row")))
    if k == "session.new":
        return '<a class="nav-item" href="#">%s<span class="nav-label">New session</span></a>' % G(20, "", "nav")
    if k == "app.settings":
        return '<a class="nav-item" href="#">%s<span class="nav-label">Settings</span></a>' % G(20, "", "nav")

    if k == "chrome.nav.toggle":
        return ('<div class="chrome-band"><button type="button" class="icon-btn" aria-label="Toggle navigation" '
                'aria-expanded="true">%s</button><span class="chrome-title">Aurora recovery</span></div>' % G(18, "", "control"))
    if k == "chrome.work.toggle":
        return ('<div class="chrome-band"><span class="chrome-title">Aurora recovery</span>'
                '<button type="button" class="icon-btn" aria-label="Open work surface" aria-expanded="false">%s</button></div>' % G(18, "", "control"))
    if k == "surface.close":
        return ('<div class="surface-head"><span class="surface-title">Session overview</span>'
                '<button type="button" class="icon-btn" aria-label="Close session overview">%s</button></div>' % G(18, "", "control"))
    if k == "disclosure.open":
        return ('<button type="button" class="list-row" aria-label="Inspect this run"><span class="row-title">Run 4f21c9</span>'
                '<span class="row-meta">Completed</span>%s</button>' % G(16, "quiet", "row"))

    if k == "run.activity":
        return ('<div class="flow-row">%s<span class="flow-title">6 tool actions</span>'
                '<span class="flow-meta">Completed</span></div>' % G(16, "", "row"))
    if k == "object.file":
        return ('<button type="button" class="flow-row flow-row-btn"><span class="flow-glyph">%s</span>'
                '<span class="flow-title">app/web/ui-controls.mjs</span><span class="flow-meta">Recorded version</span>%s</button>'
                % (G(16, "", "row"), g(inlined, by_key.cache["disclosure.open"], fam, 16, "quiet", "row")))
    if k == "question.pending":
        return ('<div class="flow-row">%s<span class="flow-title">Which recovery window should this run assume?</span>'
                '</div>' % G(16, "", "row"))

    if k == "content.copy":
        return ('<div class="msg-foot"><span class="msg-label">Assistant</span>'
                '<button type="button" class="icon-btn" aria-label="Copy response">%s</button></div>' % G(18, "", "control"))
    if k == "read.refresh":
        return ('<div class="surface-head"><span class="surface-title">Workspace</span>'
                '<button type="button" class="icon-btn" aria-label="Refresh workspace">%s</button></div>' % G(18, "", "control"))

    if k == "session.files":
        return ('<div class="composer"><span class="composer-text">Ask about the recovery window…</span>'
                '<button type="button" class="icon-btn" aria-label="Session files">%s</button></div>' % G(18, "", "control"))
    if k == "composer.send":
        return ('<div class="composer"><span class="composer-text">Ask about the recovery window…</span>'
                '<button type="button" class="send-slot" aria-label="Send">%s</button></div>' % G(18, "on-accent", "control"))
    if k == "run.cancel":
        return ('<div class="composer"><span class="composer-text is-running">Working…</span>'
                '<button type="button" class="send-slot" aria-label="Cancel run">%s</button></div>' % G(18, "on-accent", "control"))
    raise SystemExit("no context for " + k)


def render_html(mapping, inlined):
    by_key.cache = by_key(mapping)
    fams = ORDER
    head = []
    for fam in fams:
        f = FAMILIES[fam]
        role = "SHIPPED BASELINE" if fam == "lucide" else "CANDIDATE"
        head.append('<div class="col-head"><h2>%s</h2><p class="role">%s</p>'
                    '<p class="prov">%s · %s<br><code>%s</code><br>%s</p></div>'
                    % (f["label"], role, f["repo"], f["tag"], f["commit"][:12], f["license"]))

    clusters = []
    for cname in ["Navigation", "Chrome", "Agent/work", "Contextual", "Composer"]:
        rows = [r for r in mapping["semantics"] if r["cluster"] == cname]
        body = []
        for r in rows:
            cells = "".join(
                '<div class="cell" data-family="%s">%s<p class="asset">%s</p></div>'
                % (fam, context(inlined, r, fam),
                   ("<em>no equivalent</em>" if (fam != "lucide" and r[fam]["asset"] is None)
                    else ("%s <span class='st st-%s'>%s</span>" % (
                        (r["lucide"] if fam == "lucide" else r[fam]["asset"]),
                        ("m" if fam == "lucide" else r[fam]["status"][0].lower()),
                        ("MATCH" if fam == "lucide" else r[fam]["status"].replace("_", " "))))))
                for fam in fams)
            body.append('<div class="srow"><div class="srow-key"><h3>%s</h3><p class="key">%s</p></div>%s</div>'
                        % (r["label"], r["key"], cells))
        clusters.append('<section class="cluster"><h2 class="cluster-name">%s</h2>%s</section>'
                        % (cname, "".join(body)))

    # inventory appendix
    inv = []
    allrows = mapping["semantics"] + mapping["inventory_only"]
    for r in allrows:
        cs = []
        for fam in fams:
            a = r["lucide"] if fam == "lucide" else r[fam]["asset"]
            st = "MATCH" if fam == "lucide" else r[fam]["status"].replace("_", " ")
            note = "" if fam == "lucide" else r[fam]["note"]
            glyph = ("<span class='nomatch inv' style='--gs:24px'>—</span>" if a is None
                     else inline(inlined[(fam, a)], 24, "inv"))
            cs.append("<td class='inv-cell'>%s<div class='inv-name'>%s</div>"
                      "<div class='st st-%s'>%s</div><div class='inv-note'>%s</div></td>"
                      % (glyph, a or "—", st[0].lower(), st, note))
        inv.append("<tr><th scope='row'><code>%s</code><span class='key'>%s</span></th>%s</tr>"
                   % (r["lucide"], r["key"], "".join(cs)))

    # squint board: the same primary rows, grayscale + blur
    squint = []
    for cname in ["Navigation", "Chrome", "Agent/work", "Contextual", "Composer"]:
        for r in [x for x in mapping["semantics"] if x["cluster"] == cname]:
            cells = "".join('<div class="cell" data-family="%s">%s</div>' % (fam, context(inlined, r, fam))
                            for fam in fams)
            squint.append('<div class="srow"><div class="srow-key"><h3>%s</h3></div>%s</div>' % (r["label"], cells))

    tpl = open(os.path.join(HERE, "template.html")).read()
    html = (tpl
            .replace("<!--HEADS-->", "".join(head))
            .replace("<!--CLUSTERS-->", "".join(clusters))
            .replace("<!--INVENTORY-->", "".join(inv))
            .replace("<!--SQUINT-->", "".join(squint))
            .replace("__BASE_SHA__", BASE_SHA))
    html = "\n".join(line.rstrip() for line in html.splitlines()) + "\n"
    open(os.path.join(HERE, "index.html"), "w").write(html)


if __name__ == "__main__":
    main()
