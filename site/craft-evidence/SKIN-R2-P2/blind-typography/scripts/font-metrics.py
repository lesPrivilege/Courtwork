#!/usr/bin/env python3
import hashlib
import json
import os
import sys
from pathlib import Path
from fontTools.ttLib import TTFont


def inspect(path: str) -> dict:
    raw = open(path, "rb").read()
    font = TTFont(path)
    cmap = set()
    for table in font["cmap"].tables:
        cmap.update(table.cmap.keys())
    names = {}
    for name in font["name"].names:
        if name.nameID in (1, 2, 4, 6):
            try:
                value = name.toUnicode()
            except Exception:
                continue
            names.setdefault(str(name.nameID), value)
    return {
        "file": os.path.basename(path),
        "bytes": len(raw),
        "sha256": hashlib.sha256(raw).hexdigest(),
        "glyphCount": len(font.getGlyphOrder()),
        "unicodeCount": len(cmap),
        "cjkUnifiedCount": sum(0x4E00 <= codepoint <= 0x9FFF for codepoint in cmap),
        "unitsPerEm": font["head"].unitsPerEm,
        "names": names,
    }


if __name__ == "__main__":
    output = json.dumps([inspect(path) for path in sys.argv[1:]], ensure_ascii=False, indent=2) + "\n"
    if target := os.environ.get("P2_METRICS_OUT"):
        Path(target).write_text(output, encoding="utf-8")
    else:
        print(output, end="")
