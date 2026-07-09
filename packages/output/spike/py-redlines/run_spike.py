"""Python-Redlines (DocxodusEngine) 路径 spike 主脚本。

流程：original.docx --[apply_instructions]--> modified.docx
      --[DocxodusEngine.run_redline]--> redline.docx
批注两条路径都试：
  A) diff 前把批注写进 modified.docx，看 diff 后是否存活
  B) diff 后直接把批注写进 redline.docx（含对被删文本的批注）
"""

import json
import shutil
import time
from pathlib import Path

from docx import Document
from python_redlines.engines import DocxodusEngine

from lib_docx_edit import apply_instructions
from lib_comments import inject_comments

HERE = Path(__file__).parent
FIXTURES = HERE.parent / "fixtures"
OUT = HERE / "out"


def main():
    OUT.mkdir(exist_ok=True)
    instructions = json.loads((FIXTURES / "instructions.json").read_text())["instructions"]

    original_path = FIXTURES / "original.docx"
    modified_path = OUT / "modified.docx"
    modified_with_comments_path = OUT / "modified_with_comments.docx"
    redline_path = OUT / "redline.docx"
    redline_with_comments_path = OUT / "redline_with_comments.docx"

    # 1) 应用文本类指令
    doc = Document(str(original_path))
    apply_results = apply_instructions(doc, instructions)
    doc.save(str(modified_path))

    # 2) 路径 A：diff 前往 modified.docx 里注入批注
    comment_specs_a = []
    for ins in instructions:
        r = apply_results.get(ins["id"], {})
        quote = r.get("quote_for_comment")
        if quote and ins["annotation"]["text"]:
            comment_specs_a.append({"quote": quote, "text": ins["annotation"]["text"], "instruction_id": ins["id"]})
    inject_comments(str(modified_path), str(modified_with_comments_path), comment_specs_a)

    # 3) 跑 DocxodusEngine：分别对"无批注 modified"和"带批注 modified"各跑一次 diff，
    #    对比批注是否在 diff 后存活
    engine = DocxodusEngine()

    t0 = time.time()
    original_bytes = original_path.read_bytes()
    modified_bytes = modified_path.read_bytes()
    redline_bytes, stdout, stderr = engine.run_redline(
        "Courtwork Spike", original_bytes, modified_bytes,
        detect_moves=True, simplify_move_markup=True,
    )
    t_plain = time.time() - t0
    redline_path.write_bytes(redline_bytes)

    t0 = time.time()
    modified_with_comments_bytes = modified_with_comments_path.read_bytes()
    redline_wc_bytes, stdout_wc, stderr_wc = engine.run_redline(
        "Courtwork Spike", original_bytes, modified_with_comments_bytes,
        detect_moves=True, simplify_move_markup=True,
    )
    t_with_comments_pre = time.time() - t0
    redline_with_comments_path.write_bytes(redline_wc_bytes)

    # 4) 路径 B：diff 后直接往 redline.docx 里注入批注（含删除类指令的批注，
    #    这些在 modified.docx 里已经没有对应文本，只能锚定在 redline 里的 w:delText 上）
    comment_specs_b = []
    for ins in instructions:
        if ins["annotation"]["text"]:
            locator = ins["locator"]
            quote = locator.get("quote") or (locator.get("tableRowContains"))
            if quote:
                comment_specs_b.append({"quote": quote, "text": ins["annotation"]["text"], "instruction_id": ins["id"]})
    redline_postcomment_path = OUT / "redline_postcomment.docx"
    inject_comments(str(redline_path), str(redline_postcomment_path), comment_specs_b)

    report = {
        "apply_instructions_results": apply_results,
        "engine": "DocxodusEngine",
        "timing_seconds": {
            "diff_plain": round(t_plain, 3),
            "diff_with_precomments": round(t_with_comments_pre, 3),
        },
        "stdout_plain": stdout,
        "stderr_plain": stderr,
        "comments_path_A_pre_diff_injection": comment_specs_a,
        "comments_path_B_post_diff_injection": comment_specs_b,
        "outputs": {
            "modified": str(modified_path),
            "redline_no_comments": str(redline_path),
            "redline_precomments_survived_diff": str(redline_with_comments_path),
            "redline_postcomment_injected": str(redline_postcomment_path),
        },
    }
    (OUT / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2))
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
