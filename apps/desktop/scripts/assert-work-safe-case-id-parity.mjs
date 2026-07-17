import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const tsSource = readFileSync(`${root}/src/case/case-id.ts`, 'utf8');
const rustSource = readFileSync(`${root}/src-tauri/src/work_state.rs`, 'utf8');

const expectedTsMirror = String.raw`/^(?!\.$)(?!\.\.$)(?!.*\.\.)[A-Za-z0-9._-]{1,128}$/`;
const tsMirror = tsSource.match(/WORK_SAFE_CASE_ID_RE\s*=\s*(\/[^;]+\/)/)?.[1];
if (tsMirror !== expectedTsMirror) {
  throw new Error(`WORK_SAFE_CASE_ID_RE 漂移：期望 ${expectedTsMirror}，實得 ${String(tsMirror)}`);
}

const rustPredicate = rustSource.match(/fn safe_token\(token: &str\) -> bool \{([\s\S]*?)\n\}/)?.[1];
if (!rustPredicate) throw new Error('找不到 work_state.rs safe_token 謂詞');

const normalize = (value) => value.replace(/\s+/g, ' ').trim();
const expectedRustPredicate = normalize(`
  !token.is_empty()
    && token.len() <= 128
    && token != "."
    && token != ".."
    && !token.contains("..")
    && token
      .chars()
      .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_' || c == '.')
`);
if (normalize(rustPredicate) !== expectedRustPredicate) {
  throw new Error('work_state.rs safe_token 漂移：須與 TS mirror 同步逐字符核對');
}

console.log('work safe caseId parity: TS mirror 与 Rust safe_token 逐字符等价');
