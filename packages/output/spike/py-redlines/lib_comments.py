"""python-docx 不支持批注（word/comments.xml），直接在 OOXML zip 层面手写注入。

验证点：Python-Redlines 走"整篇 diff"模型，diff 前加的批注是否能在 diff 后的
redline.docx 里存活是未知数，所以本模块同时提供“diff 前注入”与“diff 后注入”
两种入口，spike 脚本两种都跑一遍，实测哪种可靠。
"""

import re
import zipfile
from xml.sax.saxutils import escape
from lxml.etree import fromstring, tostring, SubElement, QName

W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
NSMAP = {"w": W_NS}


def _qn(tag):
    prefix, local = tag.split(":")
    return f"{{{W_NS}}}{local}" if prefix == "w" else tag


def inject_comments(src_path, dst_path, comment_specs):
    """comment_specs: list of {quote: str, author: str, text: str}

    在 document.xml 里查找包含 quote 的第一个 <w:t>，把其所在的 <w:r> 前后
    包上 commentRangeStart/End，并在其后插入携带 commentReference 的 <w:r>。
    """
    with zipfile.ZipFile(src_path, "r") as zin:
        names = zin.namelist()
        contents = {n: zin.read(n) for n in names}

    doc_xml = fromstring(contents["word/document.xml"])

    comment_entries = []  # (id, author, text)
    next_id = 0

    for spec in comment_specs:
        quote = spec["quote"]
        target_t = None
        target_r = None
        # w:t = 正常文本；w:delText = 已标记删除的文本（tracked-changes 输出里
        # 被删内容用这个标签，不是 w:t，漏扫会导致"删除类批注"永远定位失败。
        for tag in (_qn("w:t"), _qn("w:delText")):
            for t in doc_xml.iter(tag):
                if t.text and quote in t.text:
                    target_t = t
                    target_r = t.getparent()
                    break
            if target_r is not None:
                break
        if target_r is None:
            spec["_status"] = "not_found"
            continue

        cid = str(next_id)
        next_id += 1

        # commentRangeStart/End 和携带 commentReference 的 <w:r> 不能塞进
        # <w:del>/<w:ins> 内部（那会让"这条批注"本身看起来也是被删除/插入的
        # 修订内容，语义错且部分渲染器会拒绝）。命中点在修订包裹内时，
        # 改成以包裹元素本身为插入锚点，插到它前后。
        anchor = target_r
        anchor_parent = target_r.getparent()
        if QName(anchor_parent).localname in ("del", "ins"):
            anchor = anchor_parent
            anchor_parent = anchor.getparent()

        parent = anchor_parent
        idx = list(parent).index(anchor)

        range_start = fromstring(
            f'<w:commentRangeStart xmlns:w="{W_NS}" w:id="{cid}"/>'
        )
        range_end = fromstring(
            f'<w:commentRangeEnd xmlns:w="{W_NS}" w:id="{cid}"/>'
        )
        ref_run = fromstring(
            f'<w:r xmlns:w="{W_NS}">'
            f'<w:rPr><w:rStyle w:val="CommentReference"/></w:rPr>'
            f'<w:commentReference w:id="{cid}"/></w:r>'
        )

        parent.insert(idx, range_start)
        idx += 1
        parent.insert(idx + 1, range_end)
        parent.insert(idx + 2, ref_run)

        comment_entries.append((cid, spec.get("author", "Courtwork Spike"), spec["text"]))
        spec["_status"] = "injected"

    comments_children = []
    for cid, author, text in comment_entries:
        comments_children.append(
            f'<w:comment xmlns:w="{W_NS}" w:id="{cid}" w:author="{author}" '
            f'w:date="2026-07-09T00:00:00Z" w:initials="CW">'
            f'<w:p><w:r><w:t>{escape(text)}</w:t></w:r></w:p></w:comment>'
        )
    comments_xml = (
        f'<w:comments xmlns:w="{W_NS}">' + "".join(comments_children) + "</w:comments>"
    ).encode("utf-8")

    contents["word/document.xml"] = tostring(doc_xml, xml_declaration=True, encoding="UTF-8", standalone=True)
    contents["word/comments.xml"] = comments_xml

    rels_key = "word/_rels/document.xml.rels"
    rels_xml = fromstring(contents[rels_key])
    existing_ids = [
        int(re.sub(r"\D", "", r.get("Id")))
        for r in rels_xml
        if re.sub(r"\D", "", r.get("Id")).isdigit()
    ]
    new_rid = f"rId{(max(existing_ids) + 1) if existing_ids else 1000}"
    rel = SubElement(rels_xml, QName("http://schemas.openxmlformats.org/package/2006/relationships", "Relationship"))
    rel.set("Id", new_rid)
    rel.set("Type", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments")
    rel.set("Target", "comments.xml")
    contents[rels_key] = tostring(rels_xml, xml_declaration=True, encoding="UTF-8", standalone=True)

    ct_key = "[Content_Types].xml"
    ct_xml = fromstring(contents[ct_key])
    override = SubElement(ct_xml, QName("http://schemas.openxmlformats.org/package/2006/content-types", "Override"))
    override.set("PartName", "/word/comments.xml")
    override.set("ContentType", "application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml")
    contents[ct_key] = tostring(ct_xml, xml_declaration=True, encoding="UTF-8", standalone=True)

    with zipfile.ZipFile(dst_path, "w", zipfile.ZIP_DEFLATED) as zout:
        for name, data in contents.items():
            zout.writestr(name, data)

    return comment_specs
