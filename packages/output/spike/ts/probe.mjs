import { readFileSync } from "node:fs";
import { unzipSync } from "fflate";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";

const buf = readFileSync("golden/original.docx");
const files = unzipSync(new Uint8Array(buf));
const docXmlText = new TextDecoder("utf-8").decode(files["word/document.xml"]);

const doc = new DOMParser().parseFromString(docXmlText, "text/xml");
const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const paras = doc.getElementsByTagNameNS(W_NS, "p");
console.log("paragraph count:", paras.length);

let allText = "";
const texts = doc.getElementsByTagNameNS(W_NS, "t");
for (let i = 0; i < texts.length; i++) allText += texts[i].textContent;
console.log("first 200 chars:", allText.slice(0, 200));

const roundTrip = new XMLSerializer().serializeToString(doc);
console.log("round-trip length:", roundTrip.length, "vs original", docXmlText.length);
console.log("round-trip contains 违约金:", roundTrip.includes("违约金"));
