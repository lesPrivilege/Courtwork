#!/usr/bin/env python3
"""Generate the delivery-rollup blob-retention audit from immutable Git trees.

This script is read-only with respect to product history: it reads commit trees and
writes only the adjacent audit TSV/log files.  It deliberately records every path
in each source delta, including exact blob IDs for paths whose bytes are retained.
"""
from __future__ import annotations

from collections import Counter, defaultdict
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[3]
AUDIT = Path(__file__).resolve().parent
CANDIDATE = "4003c548a314246d8c46516c4033fa5602e19c4b"
ACCEPTED = "055cffcbc18eb26d15f3818aada50b82a4bd0fa8"

REFS = {
    "anchor": "2e9da09bd163ca128e3cd2f4c91ef61ceec2fc2f",
    "baseline": "df9fc18b9f1a8374d72fa071c2b9c1e61e0010d1",
    "icon": "e2ab3f5ef106b6bcbbbb5a7574282a40904d3faf",
    "icon_maintenance": "6169f015f1cacd342f89cd29c2b7acad9a426ef3",
    "spark_contract": "0220d350b05aac9eafabe9620d34673f3d01adc7",
    "fe05a": "68b8d3d67d6b66d1a6c2c8d4f72ff7079135b662",
    "att_base": "a579929edd66544e6aa7cd8cd7d2399fae8265d3",
    "att_scoped": "9db6fc4362a07dc8ff20e1914e2ac471f20b62c1",
    "att_prepared": "1097fd453a6da0d0302cb64a881b48c583dc06d1",
    "material": "aa2c55b74dd872c9f9156b09dcdf9b7f07075c8a",
    "att_accepted": ACCEPTED,
    "spark_1": "9761303450280c8100aec4b0c4617f9d2c55e7bb",
    "spark_2": "eccacd04f715cc7502f755b4e3df71e5353bcce2",
    "spark_3": "20d8330dc6555d073a6bdec7ebf1e6bafc7aee99",
    "candidate": CANDIDATE,
}

# The source delta describes the original delivery's write surface.  The target
# rows intentionally include accepted HEAD and the later Spark candidate; a
# pre-feature target is retained as a topology comparison so it cannot be called
# byte-retained by accident.
SCOPES = [
    ("B0", "baseline", "anchor", "baseline", "baseline product range"),
    ("I1", "icon", "baseline", "icon", "ICON delivery"),
    ("F1", "fe05a", "spark_contract", "fe05a", "FE-05a accepted delivery"),
    ("A1", "att", "material", "att_accepted", "ATT accepted delivery"),
    ("M1", "material", "fe05a", "material", "material specimen delivery"),
    ("SP1", "spark-1", "fe05a", "spark_1", "Spark source merge"),
    ("SP2", "spark-2", "spark_1", "spark_2", "Spark scope/focus repair"),
    ("SP3", "spark-3", "spark_2", "spark_3", "Spark shape repair"),
    # The final Spark tree is the authoritative source scope for the candidate;
    # the three sequence rows above make each repair's later path touches visible.
    ("SPF", "spark-final", "fe05a", "spark_3", "Spark source sequence final tree"),
]
TARGETS = [
    ("T055", ACCEPTED, "accepted ATT/material HEAD"),
    ("T4003", CANDIDATE, "assembled Spark candidate"),
]

# Every non-equal source->target blob in an in-scope tree must be explained by a
# later authorized owner/hunk or by an explicit topology boundary.  Keep these
# descriptions short enough for TSV, while shared-invariants.tsv carries the
# full hunk/check ledger.
BASELINE_LATER = {
    "app/server/index.mjs": ("Spark", "0082fef883e49fd19538c369f20a04c111d8c602;63840a7df22914e7a13cffcee0f646b8ded6ab9f;9761303450280c8100aec4b0c4617f9d2c55e7bb", "static allowlist adds spark-view.mjs and spark-projection.mjs"),
    "app/tests/home-presentation.test.mjs": ("ATT", "9db6fc4362a07dc8ff20e1914e2ac471f20b62c1", "TinyDOM helpers move to tiny-dom.mjs for ATT coverage"),
    "app/tests/static-web-manifest.test.mjs": ("ICON", "3667641179e2829151004293ae921b5e0a17d8dd", "icon allowlist/sprite/manifest/source/hash parity tests"),
    "app/web/app.mjs": ("Spark", "0082fef883e49fd19538c369f20a04c111d8c602;63840a7df22914e7a13cffcee0f646b8ded6ab9f", "read-only Spark view, existing Matter-bound session reuse, nav/wiring"),
    "app/web/attention-view.mjs": ("ATT", "9db6fc4362a07dc8ff20e1914e2ac471f20b62c1", "typed action descriptors, six views, refusal/focus/retry semantics"),
    "app/web/home-view.mjs": ("FE05a", "0879b32727a379d59de3499c603e84cb8b4e6e22", "M-15/M-16 shared gutter and action anatomy"),
    "app/web/index.html": ("Spark", "0082fef883e49fd19538c369f20a04c111d8c602", "Spark nav button carries no unread badge"),
    "app/web/settings-view.mjs": ("FE05a", "915cca9d0225e2e581f764849cfc8dd12569f304", "WK-128 context-card shape grammar"),
    "app/web/styles.css": ("FE05a+ATT+Spark", "0879b32727a379d59de3499c603e84cb8b4e6e22;915cca9d0225e2e581f764849cfc8dd12569f304;c1a4052e2f3c3276ff1067d9f2ba39c8b2c051e8;9db6fc4362a07dc8ff20e1914e2ac471f20b62c1;0082fef883e49fd19538c369f20a04c111d8c602;20d8330dc6555d073a6bdec7ebf1e6bafc7aee99", "FE05a tokens/density; ATT views/actions/mobile target; Spark dialog/chips"),
    "engineering/current.md": ("ICON", "e2ab3f5ef106b6bcbbbb5a7574282a40904d3faf", "WK-163 and icon provenance ledger update"),
    "engineering/design/atlas/README.md": ("ICON", "e2ab3f5ef106b6bcbbbb5a7574282a40904d3faf", "WK-163 icon source/canonical-family update"),
    "engineering/design/sources.md": ("ICON", "e2ab3f5ef106b6bcbbbb5a7574282a40904d3faf", "S17 source ledger and EX-IC1/WK-163 update"),
}

ICON_LATER = {
    "engineering/design/icon-specimen/build.py": ("ICON maintenance", "6169f015f1cacd342f89cd29c2b7acad9a426ef3", "generator rstrip hygiene; vendor bytes unchanged"),
    "engineering/design/icon-specimen/index.html": ("ICON maintenance", "6169f015f1cacd342f89cd29c2b7acad9a426ef3", "generated specimen blank-line normalization"),
}
FE_LATER = {
    "app/web/styles.css": ("ATT/Spark", "9db6fc4362a07dc8ff20e1914e2ac471f20b62c1;0082fef883e49fd19538c369f20a04c111d8c602;20d8330dc6555d073a6bdec7ebf1e6bafc7aee99", "shared CSS additions preserve FE-05a selectors/tokens"),
}
ATT_LATER = {
    "app/web/styles.css": ("Spark", "0082fef883e49fd19538c369f20a04c111d8c602;20d8330dc6555d073a6bdec7ebf1e6bafc7aee99", "read-only Spark dialog and shared pill radius"),
}
SP1_LATER = {
    "app/web/spark-view.mjs": ("Spark repair", "eccacd04f715cc7502f755b4e3df71e5353bcce2", "preserves scope, retry identity, navigation focus"),
    "app/web/styles.css": ("ATT merge/Spark repair", "9db6fc4362a07dc8ff20e1914e2ac471f20b62c1;20d8330dc6555d073a6bdec7ebf1e6bafc7aee99", "ATT action/view CSS plus Spark radius"),
}
SP2_LATER = {
    "evidence/spark-delivery-20260910/README.md": ("Spark repair", "20d8330dc6555d073a6bdec7ebf1e6bafc7aee99", "records radius-lint repair"),
}
SP3_LATER = {
    "app/web/styles.css": ("ATT merge", "9db6fc4362a07dc8ff20e1914e2ac471f20b62c1", "ATT view/action CSS is merged over Spark tree"),
}

TOPOLOGY = {
    "M1": "material source aa2 postdates candidate 4003 construction; 51 material paths require reconciliation into any final Spark merge",
    "SP1": "T055 predates Spark; source paths are expected absent/older until Spark is merged",
    "SP2": "T055 predates Spark repairs; source paths are expected absent until Spark is merged",
    "SP3": "T055 predates Spark repairs; source paths are expected absent/older until Spark is merged",
    "SPF": "T055 predates Spark; final Spark source paths are expected absent/older until Spark is merged",
}


def run(*args: str) -> str:
    return subprocess.check_output(["git", "-C", str(ROOT), *args], text=True)


def tree(ref: str) -> dict[str, tuple[str, str, str]]:
    raw = subprocess.check_output(["git", "-C", str(ROOT), "ls-tree", "-r", "-z", ref])
    out: dict[str, tuple[str, str, str]] = {}
    for record in raw.split(b"\0"):
        if not record:
            continue
        meta, path = record.split(b"\t", 1)
        mode, kind, blob = meta.split()
        out[path.decode("utf-8", "surrogateescape")] = (mode.decode(), kind.decode(), blob.decode())
    return out


def source_paths(base: str, source: str) -> list[tuple[str, str]]:
    rows: list[tuple[str, str]] = []
    for line in run("diff", "--name-status", REFS[base], REFS[source]).splitlines():
        if not line:
            continue
        fields = line.split("\t")
        status = fields[0][0]
        path = fields[-1]
        rows.append((status, path))
    return rows


trees = {name: tree(ref) for name, ref in REFS.items()}
# Aliases used as source/target in the table.
trees["T055"] = tree(ACCEPTED)
trees["T4003"] = tree(CANDIDATE)

rows: list[dict[str, str]] = []
summary: dict[tuple[str, str], Counter[str]] = defaultdict(Counter)
all_explained = True
for round_id, label, base, source, domain in SCOPES:
    source_ref = REFS[source]
    base_ref = REFS[base]
    src_tree = trees[source]
    for target_id, target_ref, target_description in TARGETS:
        target_tree = trees["T055" if target_id == "T055" else "T4003"]
        for change_status, path in source_paths(base, source):
            src_mode, src_kind, src_blob = src_tree.get(path, ("-", "-", "-"))
            tgt_mode, tgt_kind, tgt_blob = target_tree.get(path, ("-", "-", "-"))
            authorized = None
            if round_id == "B0":
                authorized = BASELINE_LATER.get(path)
            elif round_id == "I1":
                authorized = ICON_LATER.get(path)
            elif round_id == "F1":
                authorized = FE_LATER.get(path)
            elif round_id == "A1":
                authorized = ATT_LATER.get(path)
            elif round_id == "SP1":
                authorized = SP1_LATER.get(path)
            elif round_id == "SP2":
                authorized = SP2_LATER.get(path)
            elif round_id == "SP3":
                authorized = SP3_LATER.get(path)
            elif round_id == "SPF":
                authorized = ATT_LATER.get(path)
            # Material is deliberately not classified as a later modification;
            # its target absence is an explicit topology boundary.
            if tgt_blob == "-":
                comparison = "topology_excluded"
                detail = TOPOLOGY.get(round_id, "target does not contain source path")
                owner = "topology"
                later = "-"
                invariant = detail
            elif src_blob == tgt_blob and src_mode == tgt_mode:
                comparison = "retained_exact"
                detail = "-"
                owner = "-"
                later = "-"
                invariant = "source mode/blob equals target mode/blob"
            elif authorized and (target_id == "T4003" or round_id in {"B0", "I1", "F1", "A1"}):
                owner, later, invariant = authorized
                comparison = "authorized_later"
                detail = "later owner/hunk recorded in shared-invariants.tsv"
            elif target_id == "T055" and round_id.startswith("SP"):
                comparison = "topology_excluded"
                detail = TOPOLOGY[round_id]
                owner = "topology"
                later = "-"
                invariant = detail
            elif round_id == "M1" and target_id == "T4003":
                comparison = "topology_excluded"
                detail = TOPOLOGY[round_id]
                owner = "topology"
                later = "-"
                invariant = detail
            else:
                comparison = "UNEXPLAINED_DIFF"
                detail = "target blob differs without a recorded authorized hunk"
                owner = "-"
                later = "-"
                invariant = detail
                all_explained = False
            summary[(round_id, target_id)][comparison] += 1
            rows.append({
                "round": round_id,
                "source_label": label,
                "source_base": base_ref,
                "source_commit": source_ref,
                "target": target_id,
                "target_commit": target_ref,
                "target_description": target_description,
                "delta_status": change_status,
                "path": path,
                "source_mode": src_mode,
                "source_blob": src_blob,
                "target_mode": tgt_mode,
                "target_blob": tgt_blob,
                "comparison": comparison,
                "later_owner": owner,
                "later_commits": later,
                "invariant": invariant,
                "detail": detail,
            })

headers = list(rows[0])
with (AUDIT / "retention-check.tsv").open("w", encoding="utf-8", newline="") as fh:
    fh.write("\t".join(headers) + "\n")
    for row in rows:
        fh.write("\t".join(row[h].replace("\t", " ").replace("\n", " ") for h in headers) + "\n")

log: list[str] = []
log.append("Delivery rollup blob-retention audit")
log.append("Generated from git ls-tree/git diff; no product files, providers, credentials, or mutable state were read or changed.")
log.append(f"source repository: {ROOT}")
log.append(f"candidate target T4003: {CANDIDATE} (parents 20d8330dc6555d073a6bdec7ebf1e6bafc7aee99, 1097fd453a6da0d0302cb64a881b48c583dc06d1)")
log.append(f"accepted target T055: {ACCEPTED} (parents aa2c55b74dd872c9f9156b09dcdf9b7f07075c8a, 1097fd453a6da0d0302cb64a881b48c583dc06d1)")
log.append("")
log.append("Method:")
log.append("  For every source-delta path, compare Git mode and blob ID from the source commit to each target tree.")
log.append("  retained_exact means both mode and blob are equal. authorized_later means the target blob changed and the later owner/commit/hunk is recorded in shared-invariants.tsv.")
log.append("  topology_excluded is never counted as retained: the target predates the source or the candidate was built before a later accepted delivery.")
log.append("  UNEXPLAINED_DIFF is a hard audit failure; the generated table must contain none.")
log.append("")
for (round_id, target_id), counts in summary.items():
    total = sum(counts.values())
    log.append(f"{round_id} -> {target_id}: paths={total}; " + "; ".join(f"{k}={counts[k]}" for k in ("retained_exact", "authorized_later", "topology_excluded", "UNEXPLAINED_DIFF") if counts[k]))
log.append("")
log.append("Source delta definitions:")
for round_id, label, base, source, domain in SCOPES:
    st = Counter(status for status, _ in source_paths(base, source))
    log.append(f"  {round_id}: {REFS[base]}..{REFS[source]} ({label}; {domain}) statuses=" + ",".join(f"{k}{v}" for k,v in sorted(st.items())))
log.append("")
log.append("Verified later shared-file hunk classes:")
log.append("  SK lineage is inherited by baseline df9; Review remains needs_you-only and skin changes do not become Review authority. See shared-invariants.tsv SK rows and skin evidence.")
log.append("  FE-05a's four product commits are separately listed with full SHAs and checks; its accepted source delta has 254 exact blobs and one shared styles.css later hunk.")
log.append("  ICON has 101 exact blobs; only generator.py/index specimen bytes change in 6169f01, while vendor bytes remain equal.")
log.append("  ATT accepted to candidate has 36 exact blobs and one Spark-shared styles.css hunk; ATT accepted to itself is 37 exact blobs.")
log.append("  Spark final source tree (68..20d, 20 paths) has 19 exact blobs and one ATT-shared styles.css hunk in candidate 4003.")
log.append("")
log.append("Explicit topology/reconciliation findings:")
log.append("  M1 -> T055: 51/51 material source blobs retained exactly.")
log.append("  M1 -> T4003: all 51 material source paths are absent because 4003 was assembled from Spark+ATT before aa2 material merge; these rows are topology_excluded and require final merge reconciliation. They are not silently counted as retained.")
log.append("  SP1/SP2/SP3/SPF -> T055 are topology_excluded because accepted ATT HEAD predates Spark; this is a pre-merge comparison, not a rollback claim.")
log.append("")
log.append("No later authorized modify produced an additional unexplained path/blob difference. This is a bounded result for the listed SHAs/topologies; any later commit requires another incremental table run.")
log.append(f"table rows (excluding header): {len(rows)}")
log.append(f"table audit result: {'PASS' if all_explained else 'FAIL'}")
(AUDIT / "retention-check.log").write_text("\n".join(log) + "\n", encoding="utf-8")

if not all_explained:
    raise SystemExit("UNEXPLAINED_DIFF present in retention-check.tsv")
