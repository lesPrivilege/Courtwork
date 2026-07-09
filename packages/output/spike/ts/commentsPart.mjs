import { parseDocument, serializeDocument } from "./edit.mjs";
import { getText, setText } from "./docx.mjs";

const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships";
const CT_NS = "http://schemas.openxmlformats.org/package/2006/content-types";

function escapeXml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function writeCommentsPart(files, comments) {
  const body = comments
    .map(
      (c) =>
        `<w:comment w:id="${c.id}" w:author="Courtwork Spike" w:date="2026-07-09T00:00:00Z" w:initials="CW"><w:p><w:r><w:t>${escapeXml(c.text)}</w:t></w:r></w:p></w:comment>`,
    )
    .join("");
  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:comments xmlns:w="${W}">${body}</w:comments>`;
  setText(files, "word/comments.xml", xml);

  const relsPath = "word/_rels/document.xml.rels";
  const relsDoc = parseDocument(getText(files, relsPath));
  const existingIds = Array.from(relsDoc.getElementsByTagNameNS(REL_NS, "Relationship"))
    .map((r) => parseInt(r.getAttribute("Id").replace(/\D/g, ""), 10))
    .filter((n) => !Number.isNaN(n));
  const newRid = `rId${existingIds.length ? Math.max(...existingIds) + 1 : 1000}`;
  const rel = relsDoc.createElementNS(REL_NS, "Relationship");
  rel.setAttribute("Id", newRid);
  rel.setAttribute(
    "Type",
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments",
  );
  rel.setAttribute("Target", "comments.xml");
  relsDoc.documentElement.appendChild(rel);
  setText(files, relsPath, serializeDocument(relsDoc));

  const ctPath = "[Content_Types].xml";
  const ctDoc = parseDocument(getText(files, ctPath));
  const override = ctDoc.createElementNS(CT_NS, "Override");
  override.setAttribute("PartName", "/word/comments.xml");
  override.setAttribute(
    "ContentType",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml",
  );
  ctDoc.documentElement.appendChild(override);
  setText(files, ctPath, serializeDocument(ctDoc));
}
