import { unzipSync, zipSync, strToU8, strFromU8 } from "fflate";

export function loadDocx(buf) {
  return unzipSync(new Uint8Array(buf));
}

export function getText(files, path) {
  return strFromU8(files[path]);
}

export function setText(files, path, text) {
  files[path] = strToU8(text);
}

export function saveDocx(files) {
  return Buffer.from(zipSync(files, { level: 0 }));
}
