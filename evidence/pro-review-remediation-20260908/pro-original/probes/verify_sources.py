#!/usr/bin/env python3
"""Verify the four reproduced original files before executing independent probes."""
from pathlib import Path
import hashlib
import json

def main() -> None:
    root = Path(__file__).resolve().parent
    manifest = json.loads((root / "source-manifest.json").read_text(encoding="utf-8"))
    for name, expected in manifest["files"].items():
        data = (root / name).read_bytes()
        blob = hashlib.sha1(b"blob " + str(len(data)).encode("ascii") + b"\0" + data).hexdigest()
        sha256 = hashlib.sha256(data).hexdigest()
        if blob != expected["git_blob_sha1"] or sha256 != expected["sha256"]:
            raise SystemExit(f"Source verification failed: {name}")
        print(f"verified {name}: blob={blob}; sha256={sha256}")

if __name__ == "__main__":
    main()
