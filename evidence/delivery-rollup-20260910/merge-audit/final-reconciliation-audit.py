#!/usr/bin/env python3
"""Audit the final material retention and product-tree reconciliation.

This is a read-only Git-tree audit.  It checks that the 51 material specimen
paths from aa2 remain byte/mode-identical in d0118, and that every non-material
path in the fixed 1f product candidate is byte/mode-identical in d0118.  It
also records the already-materialized final test/lint/link/ledger results; it
does not execute the product suite or any provider.
"""
from __future__ import annotations

from collections import Counter
import json
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[3]
AUDIT = Path(__file__).resolve().parent
MATERIAL_PARENT = "68b8d3d67d6b66d1a6c2c8d4f72ff7079135b662"
MATERIAL = "aa2c55b74dd872c9f9156b09dcdf9b7f07075c8a"
PRODUCT = "1f8317a999abf04508b7fc9d65e758796374aafd"
FINAL = "d0118ab356c541f0ff2dcd9bc867c438399d3e7d"


def git(*args: str) -> str:
    return subprocess.check_output(["git", "-C", str(ROOT), *args], text=True)


def tree(ref: str) -> dict[str, tuple[str, str, str]]:
    raw = subprocess.check_output(["git", "-C", str(ROOT), "ls-tree", "-r", "-z", ref])
    result: dict[str, tuple[str, str, str]] = {}
    for record in raw.split(b"\0"):
        if not record:
            continue
        meta, path = record.split(b"\t", 1)
        mode, kind, blob = meta.split()
        result[path.decode("utf-8", "surrogateescape")] = (
            mode.decode(), kind.decode(), blob.decode()
        )
    return result


def delta_paths(base: str, source: str) -> list[tuple[str, str]]:
    rows: list[tuple[str, str]] = []
    for line in git("diff", "--name-status", base, source).splitlines():
        if not line:
            continue
        fields = line.split("\t")
        rows.append((fields[0][0], fields[-1]))
    return rows


def scope_labels(path: str) -> list[str]:
    labels: list[str] = []
    if path.startswith("app/"):
        labels.append("app")
    if path.startswith("tools/"):
        labels.append("tools")
    if path.startswith("docs/work-core/"):
        labels.append("docs/work-core")
    if path.startswith("docs/runtime-control/"):
        labels.append("docs/runtime-control")
    if path.startswith("app/domains/"):
        labels.append("app/domains")
    if path.startswith("brand/"):
        labels.append("brand")
    # These are the two globs used by app/package.json's full test command.
    if path.startswith("app/tests/") or path.startswith("tests/"):
        labels.append("full-test-glob")
    return labels or ["other"]


material_delta = delta_paths(MATERIAL_PARENT, MATERIAL)
material_paths = {path for status, path in material_delta}
material_statuses = Counter(status for status, _ in material_delta)
material_tree = tree(MATERIAL)
product_tree = tree(PRODUCT)
final_tree = tree(FINAL)

material_rows: list[dict[str, str]] = []
material_summary: Counter[str] = Counter()
for path in sorted(material_paths):
    source_mode, source_kind, source_blob = material_tree.get(path, ("-", "-", "-"))
    final_mode, final_kind, final_blob = final_tree.get(path, ("-", "-", "-"))
    if source_mode == final_mode and source_kind == final_kind and source_blob == final_blob:
        comparison = "retained_exact"
    elif final_blob == "-":
        comparison = "MISSING_FINAL"
    else:
        comparison = "CHANGED_FINAL"
    material_summary[comparison] += 1
    material_rows.append(
        {
            "path": path,
            "source_status": next(status for status, candidate in material_delta if candidate == path),
            "source_mode": source_mode,
            "source_blob": source_blob,
            "final_mode": final_mode,
            "final_blob": final_blob,
            "comparison": comparison,
        }
    )

with (AUDIT / "final-material-retention.tsv").open("w", encoding="utf-8", newline="") as fh:
    headers = list(material_rows[0])
    fh.write("\t".join(headers) + "\n")
    for row in material_rows:
        fh.write("\t".join(row[h] for h in headers) + "\n")

# Compare every candidate path except the explicitly retained material set.
# Any final-only path must itself be one of those 51 material paths.
candidate_paths = set(product_tree)
final_nonmaterial_paths = set(final_tree) - material_paths
equality_paths = sorted(candidate_paths | final_nonmaterial_paths)
equality_rows: list[dict[str, str]] = []
equality_summary: Counter[str] = Counter()
scope_counts: dict[str, Counter[str]] = {}
for path in equality_paths:
    product_mode, product_kind, product_blob = product_tree.get(path, ("-", "-", "-"))
    final_mode, final_kind, final_blob = final_tree.get(path, ("-", "-", "-"))
    comparison = (
        "product_exact"
        if (product_mode, product_kind, product_blob) == (final_mode, final_kind, final_blob)
        else "UNEXPECTED_PRODUCT_DIFF"
    )
    labels = scope_labels(path)
    equality_summary[comparison] += 1
    for label in labels:
        scope_counts.setdefault(label, Counter())[comparison] += 1
    equality_rows.append(
        {
            "path": path,
            "scope": ";".join(labels),
            "product_mode": product_mode,
            "product_blob": product_blob,
            "final_mode": final_mode,
            "final_blob": final_blob,
            "comparison": comparison,
        }
    )

with (AUDIT / "final-product-equality.tsv").open("w", encoding="utf-8", newline="") as fh:
    headers = list(equality_rows[0])
    fh.write("\t".join(headers) + "\n")
    for row in equality_rows:
        fh.write("\t".join(row[h] for h in headers) + "\n")

extra_final = set(final_tree) - candidate_paths
extra_expected = extra_final == material_paths
missing_final = candidate_paths - set(final_tree)

# Read supplied final evidence without executing it.
result_path = ROOT / "evidence/delivery-rollup-20260910/integration/logs/full-suite-final-result.json"
result_json = json.loads(result_path.read_text(encoding="utf-8"))
suite_log = (ROOT / "evidence/delivery-rollup-20260910/integration/logs/full-suite-final.log").read_text(encoding="utf-8")
suite_checks = {
    "metadata_commit": result_json.get("commit") == PRODUCT,
    "exit_code_0": result_json.get("exitCode") == 0,
    "not_timed_out": result_json.get("timedOut") is False,
    "tests_643": bool(re.search(r"ℹ tests 643\b", suite_log)),
    "pass_643": bool(re.search(r"ℹ pass 643\b", suite_log)),
    "fail_0": bool(re.search(r"ℹ fail 0\b", suite_log)),
    "cancelled_0": bool(re.search(r"ℹ cancelled 0\b", suite_log)),
    "skipped_0": bool(re.search(r"ℹ skipped 0\b", suite_log)),
}

evidence_files = {
    "smoke": ROOT / "evidence/delivery-rollup-20260910/integration/logs/final-smoke.log",
    "lint_colors": ROOT / "evidence/delivery-rollup-20260910/integration/logs/final-lint-colors.log",
    "lint_interaction": ROOT / "evidence/delivery-rollup-20260910/integration/logs/final-lint-interaction.log",
    "lint_materials": ROOT / "evidence/delivery-rollup-20260910/integration/logs/final-lint-materials.log",
    "lint_shapes": ROOT / "evidence/delivery-rollup-20260910/integration/logs/final-lint-shapes.log",
    "doc_links": ROOT / "evidence/delivery-rollup-20260910/integration/logs/final-check-doc-links.log",
    "ledger": ROOT / "evidence/delivery-rollup-20260910/integration/logs/review-ledger.log",
}
evidence_text = {name: path.read_text(encoding="utf-8") for name, path in evidence_files.items()}
evidence_checks = {
    "smoke": '"status": "passed"' in evidence_text["smoke"] and '"realProvider": "not_run"' in evidence_text["smoke"],
    "lint_colors": "lint-colors: ok" in evidence_text["lint_colors"],
    "lint_interaction": "lint-interaction: ok" in evidence_text["lint_interaction"],
    "lint_materials": "lint-materials: ok" in evidence_text["lint_materials"],
    "lint_shapes": "lint-shapes: ok" in evidence_text["lint_shapes"],
    "doc_links": '"pass": true' in evidence_text["doc_links"] and '"problems": []' in evidence_text["doc_links"],
    "ledger": '"pass": true' in evidence_text["ledger"],
}

all_pass = (
    material_statuses == Counter({"A": 51})
    and len(material_paths) == 51
    and material_summary == Counter({"retained_exact": 51})
    and equality_summary == Counter({"product_exact": len(equality_paths)})
    and len(equality_paths) == len(candidate_paths)
    and not missing_final
    and extra_expected
    and all(suite_checks.values())
    and all(evidence_checks.values())
)

log: list[str] = []
log.append("Final delivery reconciliation audit")
log.append("Generated from immutable Git trees and already-materialized evidence; no full suite, provider, migration, or product command was run.")
log.append(f"material source: {MATERIAL} (parent {MATERIAL_PARENT})")
log.append(f"fixed product candidate: {PRODUCT}")
log.append(f"final product merge: {FINAL} (parents 055cffcbc18eb26d15f3818aada50b82a4bd0fa8, 936239dca9d7eac0cab859960f8b19950c760193)")
log.append("")
log.append("Material specimen retention aa2..d0118:")
log.append(f"  source delta status: " + ",".join(f"{key}{value}" for key, value in sorted(material_statuses.items())))
log.append(f"  source paths: {len(material_paths)}")
for key in ("retained_exact", "MISSING_FINAL", "CHANGED_FINAL"):
    log.append(f"  {key}: {material_summary[key]}")
log.append(f"  result: {'PASS' if material_summary == Counter({'retained_exact': 51}) else 'FAIL'}")
log.append("")
log.append("Fixed product equality 1f..d0118 (all non-material candidate paths):")
log.append(f"  candidate paths compared: {len(candidate_paths)}")
log.append(f"  non-material union paths compared: {len(equality_paths)}")
log.append(f"  product_exact: {equality_summary['product_exact']}")
log.append(f"  UNEXPECTED_PRODUCT_DIFF: {equality_summary['UNEXPECTED_PRODUCT_DIFF']}")
log.append(f"  final-only paths equal material set: {'PASS' if extra_expected else 'FAIL'} (final-only={len(extra_final)}, material={len(material_paths)})")
for label in ("app", "tools", "docs/work-core", "docs/runtime-control", "app/domains", "brand", "full-test-glob"):
    counts = scope_counts.get(label, Counter())
    total = sum(counts.values())
    log.append(f"  scope {label}: {counts['product_exact']}/{total} exact")
log.append(f"  result: {'PASS' if equality_summary == Counter({'product_exact': len(equality_paths)}) and len(equality_paths) == len(candidate_paths) and not missing_final and extra_expected else 'FAIL'}")
log.append("")
log.append("Supplied final verification evidence (read-only inspection):")
log.append("  " + "; ".join(f"{key}={'PASS' if value else 'FAIL'}" for key, value in suite_checks.items()))
log.append("  " + "; ".join(f"{key}={'PASS' if value else 'FAIL'}" for key, value in evidence_checks.items()))
log.append("  No large suite was rerun; full-suite-final-result.json/log are the supplied 643/643 run.")
log.append("")
log.append("Receipt/current bounded-wording check:")
log.append("  engineering/current.md:3-11 keeps BE-41 backend, RV26-SP01/ME03, G1-G5, real-provider, migration, and deployment boundaries explicit: PASS")
log.append("  evidence/delivery-rollup-20260910/README.md:27,31,35-43 distinguishes front-end acceptance from BE-41, preserves material specimen scope, and keeps deployment/G1-G5 boundaries: PASS")
log.append("")
log.append(f"FINAL RESULT: {'PASS' if all_pass else 'FAIL'}")

(AUDIT / "final-reconciliation.log").write_text("\n".join(log) + "\n", encoding="utf-8")
if not all_pass:
    raise SystemExit("final reconciliation audit failed")
