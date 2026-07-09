import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { loadDocx, getText, setText, saveDocx } from "./docx.mjs";
import { parseDocument, serializeDocument, getBody, applyInstruction } from "./edit.mjs";
import { writeCommentsPart } from "./commentsPart.mjs";

mkdirSync("out", { recursive: true });

const instructionsRoot = JSON.parse(readFileSync("golden/instructions.json", "utf-8"));
const files = loadDocx(readFileSync("golden/original.docx"));

const docXmlText = getText(files, "word/document.xml");
const doc = parseDocument(docXmlText);
const body = getBody(doc);

const allComments = [];
const results = {};
for (const ins of instructionsRoot.instructions) {
  const { status, comments } = applyInstruction(doc, body, ins);
  results[ins.id] = status;
  allComments.push(...comments);
  console.log(`${ins.id} -> ${status}`);
}

setText(files, "word/document.xml", serializeDocument(doc));
writeCommentsPart(files, allComments);

const outBuf = saveDocx(files);
writeFileSync("out/redline_ts.docx", outBuf);
writeFileSync("out/results.json", JSON.stringify(results, null, 2));

console.log("\nsaved out/redline_ts.docx");
console.log("comments attached:", allComments.length);
console.log(JSON.stringify(results, null, 2));
