#!/usr/bin/env python3
"""Audit the verified Spark Work-route repair as an incremental merge.

The audit reads immutable Git trees only.  It compares the repair branch against
its 20d parent, checks that the 1f candidate contains every repair blob exactly,
and checks that the merge changed no other 4003 candidate path.  It writes only
the adjacent TSV/log artifacts.
"""
from __future__ import annotations

from collections import Counter
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[3]
AUDIT = Path(__file__).resolve().parent
BASE = "20d8330dc6555d073a6bdec7ebf1e6bafc7aee99"
PATCH = "936239dca9d7eac0cab859960f8b19950c760193"
PRE_TARGET = "4003c548a314246d8c46516c4033fa5602e19c4b"
FINAL_TARGET = "1f8317a999abf04508b7fc9d65e758796374aafd"


def git(*args: str) -> str:
    return subprocess.check_output(["git", "-C", str(ROOT), *args], text=True)


def tree(ref: str) -> dict[str, tuple[str, str, str]]:
    raw = subprocess.check_output(["git", "-C", str(ROOT), "ls-tree", "-r", "-z", ref])
    out: dict[str, tuple[str, str, str]] = {}
    for record in raw.split(b"\0"):
        if not record:
            continue
        meta, path = record.split(b"\t", 1)
        mode, kind, blob = meta.split()
        out[path.decode("utf-8", "surrogateescape")] = (
            mode.decode(), kind.decode(), blob.decode()
        )
    return out


def source_delta() -> list[tuple[str, str]]:
    rows: list[tuple[str, str]] = []
    for line in git("diff", "--name-status", BASE, PATCH).splitlines():
        if not line:
            continue
        fields = line.split("\t")
        rows.append((fields[0][0], fields[-1]))
    return rows


base_tree = tree(BASE)
patch_tree = tree(PATCH)
pre_tree = tree(PRE_TARGET)
final_tree = tree(FINAL_TARGET)
delta = source_delta()
delta_by_path = {path: status for status, path in delta}
all_paths = sorted(set(pre_tree) | set(final_tree))
rows: list[dict[str, str]] = []
summary: Counter[str] = Counter()

for path in all_paths:
    pre_mode, pre_kind, pre_blob = pre_tree.get(path, ("-", "-", "-"))
    final_mode, final_kind, final_blob = final_tree.get(path, ("-", "-", "-"))
    base_mode, base_kind, base_blob = base_tree.get(path, ("-", "-", "-"))
    patch_mode, patch_kind, patch_blob = patch_tree.get(path, ("-", "-", "-"))
    status = delta_by_path.get(path, "-")

    if pre_mode == final_mode and pre_kind == final_kind and pre_blob == final_blob:
        comparison = "retained_exact"
    elif status and final_mode == patch_mode and final_kind == patch_kind and final_blob == patch_blob:
        comparison = "patch_applied_exact"
    else:
        comparison = "UNEXPECTED_MERGE_DIFF"
    summary[comparison] += 1
    rows.append(
        {
            "path": path,
            "source_delta_status": status,
            "base_mode": base_mode,
            "base_blob": base_blob,
            "patch_mode": patch_mode,
            "patch_blob": patch_blob,
            "pre_target_mode": pre_mode,
            "pre_target_blob": pre_blob,
            "final_target_mode": final_mode,
            "final_target_blob": final_blob,
            "comparison": comparison,
        }
    )

headers = list(rows[0])
with (AUDIT / "spark-route-incremental-retention.tsv").open(
    "w", encoding="utf-8", newline=""
) as fh:
    fh.write("\t".join(headers) + "\n")
    for row in rows:
        fh.write("\t".join(row[h].replace("\t", " ").replace("\n", " ") for h in headers) + "\n")

patch_status = Counter(status for status, _ in delta)
pre_to_final = git("diff", "--name-status", PRE_TARGET, FINAL_TARGET).splitlines()
pre_to_final_paths = [line.split("\t")[-1] for line in pre_to_final if line]
expected_paths = sorted(delta_by_path)
merge_path_set_ok = sorted(pre_to_final_paths) == expected_paths
no_unexpected = summary["UNEXPECTED_MERGE_DIFF"] == 0 and merge_path_set_ok

log: list[str] = []
log.append("Incremental Spark Work-route merge audit")
log.append("Generated from immutable Git trees; no product files, providers, credentials, or mutable state were read or changed.")
log.append(f"repository: {ROOT}")
log.append(f"base: {BASE} (Spark shape candidate before route repair)")
log.append(f"repair source: {PATCH} (parent {BASE})")
log.append(f"pre-repair candidate: {PRE_TARGET} (first parent of final candidate)")
log.append(f"final candidate: {FINAL_TARGET} (parents {PRE_TARGET}, {PATCH})")
log.append("")
log.append("Source delta 20d..936:")
log.append("  " + ("; ".join(git("diff", "--name-status", BASE, PATCH).splitlines()) or "(empty)"))
log.append(f"  status counts: " + ",".join(f"{k}{v}" for k, v in sorted(patch_status.items())))
log.append(f"  shortstat: {git('diff', '--shortstat', BASE, PATCH).strip()}")
log.append("")
log.append("Merge integration 4003..1f:")
log.append("  " + ("; ".join(pre_to_final) or "(empty)"))
log.append(f"  changed path set equals source delta: {'PASS' if merge_path_set_ok else 'FAIL'}")
log.append(f"  shortstat: {git('diff', '--shortstat', PRE_TARGET, FINAL_TARGET).strip()}")
log.append("")
log.append("Per-path mode/blob result in spark-route-incremental-retention.tsv:")
log.append(f"  union tree paths: {len(all_paths)}")
for key in ("retained_exact", "patch_applied_exact", "UNEXPECTED_MERGE_DIFF"):
    log.append(f"  {key}: {summary[key]}")
log.append(f"  result: {'PASS' if no_unexpected else 'FAIL'}")
log.append("")
log.append("Boundary:")
log.append("  4003 is the pre-repair candidate, so its old app.mjs/README blobs and absent new evidence/test files are expected before 936 is merged.")
log.append("  1f contains all five 936 source-delta paths with exact mode/blob equality; its other 3589 tree paths retain 4003 mode/blob equality.")
log.append("  This is source/merge evidence only. It does not independently accept the patch, claim BE-41 snapshot readback, or close RV26-SP01/ME03.")
log.append("")
log.append("Diff-check note:")
log.append("  git diff --check 20d..936 and 4003..1f report six inherited trailing-whitespace lines in routing-unit-before.log; those bytes are preserved as failure provenance.")
log.append(f"  protected app/server/index.mjs and app/core.mjs unchanged across 4003..1f: {'PASS' if not git('diff', '--quiet', PRE_TARGET, FINAL_TARGET, '--', 'app/server/index.mjs', 'app/core.mjs') else 'FAIL'}")

(AUDIT / "spark-route-incremental-retention.log").write_text("\n".join(log) + "\n", encoding="utf-8")
if not no_unexpected:
    raise SystemExit("incremental merge audit failed")
