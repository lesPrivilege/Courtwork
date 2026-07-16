// 文案门规则库（docs/design/voice.md 的可机器断言条款）。
// 纯函数、无 I/O：extractUserFacingStrings 抽取用户文案，scanVoice 施加规则。
// 只判定三条可机器断言项：§1 裸确认词、§3 成功自评、§6 工程词泄漏。
// §2 错误体例 / §4 进行态 / §5 空态需语义与相邻 DOM 判断，留人工评审，不进本库。

const CJK = /[㐀-鿿豈-﫿]/; // CJK 统一表意文字（含 Ext-A）+ 兼容表意

/** 剔除模板插值 `${…}`（平衡花括号）——插值是代码表达式，不是文案。 */
function stripInterpolation(s) {
  let out = '';
  let i = 0;
  while (i < s.length) {
    if (s[i] === '$' && s[i + 1] === '{') {
      let depth = 1;
      i += 2;
      while (i < s.length && depth > 0) {
        if (s[i] === '{') depth++;
        else if (s[i] === '}') depth--;
        i++;
      }
      out += ' ';
    } else {
      out += s[i];
      i++;
    }
  }
  return out;
}

// 正则字面量起始判据：`/` 出现在表达式位（前一个有效字符是这些之一，或位于源首）时为正则，否则为除法/JSX。
// 刻意排除 `<`（`</tag>` 闭合）、`>`/`)`/`]`/标识符/数字（除法左操作数），避免误吞 JSX 与运算。
function regexCanStart(prev) {
  return prev === '' || '([{,;:=!&|?+-*%^~'.includes(prev);
}

/**
 * 单遍分词，正则字面量感知：产出（1）注释/正则/字符串内芯已抹空的 skeleton
 * （保 `<`/`>` 供 JSX 文本识别），（2）字符串字面量令牌（含起始偏移；模板去插值）。
 * 关键：正则字面量里的引号（如 /i'm/）不得被误判为字符串起始而拖垮后续解析。
 */
function tokenize(src) {
  const n = src.length;
  const skeleton = src.split('');
  const strings = [];
  let i = 0;
  let state = 'code'; // code | line | block | regex | str
  let quote = '';
  let strStart = 0;
  let inClass = false; // 正则字符类 [...] 内
  let prev = ''; // code 态最近一个非空白字符
  const blank = (k) => { if (skeleton[k] !== '\n') skeleton[k] = ' '; };

  while (i < n) {
    const c = src[i];
    const c2 = src[i + 1];
    if (state === 'code') {
      if (c === '/' && c2 === '/') { blank(i); blank(i + 1); state = 'line'; i += 2; continue; }
      if (c === '/' && c2 === '*') { blank(i); blank(i + 1); state = 'block'; i += 2; continue; }
      if (c === '/' && regexCanStart(prev)) { blank(i); state = 'regex'; inClass = false; prev = '/'; i++; continue; }
      if (c === "'" || c === '"' || c === '`') { state = 'str'; quote = c; strStart = i + 1; i++; continue; }
      if (!/\s/.test(c)) prev = c;
      i++;
      continue;
    }
    if (state === 'line') { if (c === '\n') state = 'code'; else blank(i); i++; continue; }
    if (state === 'block') {
      if (c === '*' && c2 === '/') { blank(i); blank(i + 1); state = 'code'; i += 2; continue; }
      blank(i);
      i++;
      continue;
    }
    if (state === 'regex') {
      blank(i);
      if (c === '\\') { blank(i + 1); i += 2; continue; }
      if (c === '[') inClass = true;
      else if (c === ']') inClass = false;
      else if (c === '/' && !inClass) {
        state = 'code';
        prev = '/';
        i++;
        while (i < n && /[a-z]/i.test(src[i])) { blank(i); i++; } // 消 flag
        continue;
      }
      i++;
      continue;
    }
    // str 态
    if (c === '\\') { i += 2; continue; }
    if (c === quote) {
      let value = src.slice(strStart, i);
      if (quote === '`') value = stripInterpolation(value);
      strings.push({ value, index: strStart });
      state = 'code';
      prev = quote;
      i++;
      continue;
    }
    blank(i); // 抹空字符串内芯，保留定界符与结构
    i++;
  }
  return { skeleton: skeleton.join(''), strings };
}

const lineAt = (src, index) => {
  let line = 1;
  for (let i = 0; i < index && i < src.length; i++) if (src[i] === '\n') line++;
  return line;
};

/**
 * 抽取用户文案：
 * - JSX 文本（`>文本<`）：无论中英全取——裸「OK」按钮亦须可判。
 * - 字符串字面量：仅取含 CJK 者——纯 ASCII 字面量多为 code（枚举 'ok'、id、className），排除以免误伤。
 * 含花括号的混排 JSX 文本为已知盲区（toast 多为字符串字面量，已覆盖）。
 */
export function extractUserFacingStrings(src) {
  const { skeleton, strings } = tokenize(src);
  const found = [];
  for (const { value, index } of strings) {
    if (CJK.test(value)) found.push({ line: lineAt(src, index), value });
  }
  for (const m of skeleton.matchAll(/>([^<>{}]*)</g)) {
    const value = m[1];
    if (value.trim()) found.push({ line: lineAt(src, m.index + 1), value });
  }
  return found;
}

// —— 规则 ——

const BARE_CONFIRM = new Set(['确认', '确定']);
function bareConfirm(value) {
  const t = value.trim();
  if (BARE_CONFIRM.has(t)) return t;
  if (t === 'OK') return t; // 区分大小写：按钮「OK」触红，枚举值 'ok' 不误伤
  return null;
}

// 动作动词紧邻「成功」即为自评式完成提示；动词表覆盖本产品的落盘/网络/生成类动作。
const SUCCESS_VERBS = '删除|移除|清除|清空|保存|存入|归档|定稿|创建|新建|建立|新增|上传|导入|导出|提交|发送|送出|移动|重命名|复制|连接|授权|登录|注册|设置|更新|同步|生成|编译|识别|校验|核验|绑定|安装|部署|发布';
const SUCCESS_RE = new RegExp(`(?:${SUCCESS_VERBS})成功|成功(?:${SUCCESS_VERBS})|操作成功`);
const SUCCESS_EXACT = new Set(['成功', '成功了', '成功！', '成功。', '成功!']);
function successClaim(value) {
  const t = value.trim();
  if (SUCCESS_EXACT.has(t)) return t;
  const m = value.match(SUCCESS_RE);
  return m ? m[0] : null;
}

// §9 工程词黑名单（英文按词界匹配，须与中文同串——纯英文 affordance/标识符不误伤）。
const ENG_WORDS = ['schema', 'json', 'prompt', 'token', 'command', 'trace', 'payload', 'endpoint', 'descriptor', 'locator'];
function engLeak(value) {
  if (!CJK.test(value)) return null; // 只守中文办案文案
  for (const w of ENG_WORDS) {
    if (new RegExp(`\\b${w}\\b`, 'i').test(value)) return w;
  }
  return null;
}

/** 扫描源集合（[{path, content}]），返回违例 [{rule, file, line, value, message}]。 */
export function scanVoice(sources) {
  const failures = [];
  for (const { path, content } of sources) {
    for (const { line, value } of extractUserFacingStrings(content)) {
      const bc = bareConfirm(value);
      if (bc) failures.push({ rule: 'bare-confirm', file: path, line, value, message: `裸确认词「${bc}」——动作文案须动词+名词（voice.md §1）` });
      const sc = successClaim(value);
      if (sc) failures.push({ rule: 'success-claim', file: path, line, value, message: `完成提示含「${sc}」——用「已+动词」结果陈述，不喊成功（voice.md §3）` });
      const el = engLeak(value);
      if (el) failures.push({ rule: 'eng-leak', file: path, line, value, message: `中文文案含工程词「${el}」——零技术概念暴露（voice.md §6 / principles.md §9）` });
    }
  }
  return failures;
}
