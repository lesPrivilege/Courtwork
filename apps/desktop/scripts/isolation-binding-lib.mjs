/**
 * ADR-018 决定五「等级—能力绑定表」的机器可读门（ADR-018 未决 3 的触发条件已到，
 * 由 `SANDBOX-PROBE-1` 携带落地）。
 *
 * 真源单一：等级闭集（决定一表）、等级—能力绑定（决定五表）、当期等级（文件头声明）
 * 三者一律**从 ADR-018 正文解析**，本文件不留第二份副本。本文件只登记一样东西——
 * **能力登记册**：宿主生产码里每一个「把 argv 交给 OS 执行」的原语，各自属哪条能力、
 * 要求哪个隔离等级。登记册住代码而非运行时配置，依 ADR-017 决定三
 * 「白名单变更是代码变更，走 review 与门禁」。
 *
 * 三条判据：
 *   R1 契约自洽——当期等级须在决定一闭集内，且决定一与决定五的等级集合逐条对齐；
 *   R2 无反例即无等级——当期等级高于 `none` 时，须有登记在册的越界反例证据（决定一末条）；
 *   R3 能力面不得越档——登记册与生产码双向锁死，且每条能力所需等级不得高于当期等级。
 */

/** 生产码里每个 spawn 原语的能力归属。新增一个 spawn 就必须在此登记，否则 R3 触红。 */
export const capabilityLedger = [
  {
    capability: 'host-codesign-probe',
    program: 'codesign',
    requiredLevel: 'none',
    anchor: 'apps/desktop/src-tauri/src/lib.rs',
    note: '宿主自签名快照：只读、无副作用，落在 `none` 允许的最高档内',
  },
];

/**
 * 动态 spawn 登记册（PI-HOST-LOOP-1 §二.8）。
 *
 * 上面的 `capabilityLedger` 只认字面量 `Command::new("prog")`——程序名是常量时，
 * 「登记 program 名」就足以描述能力面。Route A 的 sidecar 不是这个形态：程序路径是
 * 运行期算出来的 `verified_runtime_path`，字面量扫描面对它整枚失明。
 *
 * 动态行因此换一套判据：能力面不由「程序名」刻画，而由**调用点**刻画——
 * 精确表达式、直接包围它的函数、所在文件与出现次数，四项双向锁死。改变量名、拼接、
 * 搬进 helper／command factory、再开第二枚 spawn，都会让四项对不上而触红。
 *
 * 机器门只证明**调用点闭集**：`verified_runtime_path` 运行期仍必须来自通过 manifest
 * 身份门的不可变 path，那是 `pi_loop_process::preflight_route_pair` 的责任，静态门不冒充
 * 运行期 hash 证明。这里的 `process` 是拓扑，不是 ADR-018 的全局隔离升档。
 */
export const dynamicSpawnLedger = [
  {
    capability: 'pi-product-sidecar',
    programExpression: 'verified_runtime_path',
    enclosingFunction: 'spawn_verified_sidecar',
    requiredLevel: 'none',
    anchor: 'apps/desktop/src-tauri/src/pi_loop_process.rs',
    exactCount: 1,
    note: 'Route A verified Node：argv 恰两枚、env 清空、cwd 为 app-data 下的 pi-loop-runtime；路径已过 manifest 身份门',
  },
];

/** 动态行的闭集键。多一个、少一个都触红——不许拿自由字段糊过双向锁。 */
const DYNAMIC_ROW_KEYS = [
  'capability',
  'programExpression',
  'enclosingFunction',
  'requiredLevel',
  'anchor',
  'exactCount',
  'note',
];

/**
 * pi lane（`packages/pi-lane`）生产码里每个 **Node 侧执行/写原语**的能力归属。
 * 扫描面随 `PI-LANE-1` 扩入（ADR-022 修订记录 2026-07-27）：Rust 侧起 sidecar 会被
 * 上面的 `capabilityLedger` 逼进登记册，但 sidecar 进程内的 Node 工具面原先在盲区。
 *
 * 读面票内本册应为空——`packages/pi-lane` 的「edit/write/bash 配置层禁用」由此获得
 * 静态红证，而不止是配置承诺。新增一个 `child_process` 或 fs 写调用就必须在此登记，
 * 否则 R3 触红；登记册留着已不存在的调用点，同样触红。
 */
export const nodePrimitiveLedger = [];

const CURRENT_LEVEL_PATTERN = /当期隔离等级：`([a-z_]+)`/;
const TABLE_ROW_PATTERN = /^\|\s*`([a-z_]+)`\s*\|(.+)$/;

function tableLevels(adrText, headingPattern) {
  const lines = adrText.split('\n');
  const start = lines.findIndex((line) => headingPattern.test(line));
  if (start < 0) return null;
  const rows = [];
  for (const line of lines.slice(start)) {
    const matched = TABLE_ROW_PATTERN.exec(line.trim());
    if (matched) {
      rows.push({ level: matched[1], cells: matched[2].replace(/\|\s*$/, '') });
      continue;
    }
    if (rows.length > 0 && line.trim() === '') break;
  }
  return rows.length > 0 ? rows : null;
}

/** 解析 ADR-018：等级闭集（含次序）、等级—能力绑定、当期等级。 */
export function parseIsolationContract(adrText) {
  const failures = [];

  const currentMatch = CURRENT_LEVEL_PATTERN.exec(adrText);
  const currentLevel = currentMatch ? currentMatch[1] : null;
  if (!currentLevel) failures.push('ADR-018 未声明「当期隔离等级：`<level>`」，机器读不出真源');

  const closedSet = tableLevels(adrText, /^##\s*决定一/);
  if (!closedSet) failures.push('ADR-018 决定一的等级闭集表解析失败');

  const bindingSet = tableLevels(adrText, /^##\s*决定五/);
  if (!bindingSet) failures.push('ADR-018 决定五的等级—能力绑定表解析失败');

  if (closedSet && bindingSet) {
    const closed = closedSet.map((row) => row.level);
    const bound = bindingSet.map((row) => row.level);
    if (closed.join('|') !== bound.join('|')) {
      failures.push(`决定一闭集 [${closed.join(', ')}] 与决定五绑定表 [${bound.join(', ')}] 不对齐——两表必须逐条同集同序`);
    }
  }

  const levels = closedSet ? closedSet.map((row) => row.level) : [];
  if (currentLevel && levels.length > 0 && !levels.includes(currentLevel)) {
    failures.push(`当期等级 \`${currentLevel}\` 不在决定一闭集 [${levels.join(', ')}] 内`);
  }

  const capabilityByLevel = new Map((bindingSet ?? []).map((row) => [row.level, row.cells.trim()]));
  return { currentLevel, levels, capabilityByLevel, failures };
}

/**
 * R2：无反例即无等级（ADR-018 决定一末条）。等级高于 `none` 时，
 * 越界反例证据须逐类在册——读、写、网络三类各要有被拒实录。
 */
export const REQUIRED_BREACH_MARKERS = ['读策略外路径：被拒', '写策略外路径：被拒', '连策略外地址：被拒'];

export function validateLevelEvidence(contract, evidenceText) {
  const { currentLevel, levels } = contract;
  if (!currentLevel || levels.length === 0) return [];
  if (currentLevel === levels[0]) return []; // 最低档不需要反例——它本来就不声称任何隔离
  if (!evidenceText) {
    return [`当期等级 \`${currentLevel}\` 高于最低档，但找不到越界反例证据文件——无反例即无等级`];
  }
  return REQUIRED_BREACH_MARKERS.filter((marker) => !evidenceText.includes(marker)).map(
    (marker) => `当期等级 \`${currentLevel}\` 的反例证据缺一类：「${marker}」未在证据文件中登记`,
  );
}

const SPAWN_PATTERN = /Command::new\(\s*"([^"]+)"\s*\)/g;
/**
 * 测试块的边界是 `#[cfg(test)] mod ...`，**不是**任意一枚 `#[cfg(test)]` 属性。
 *
 * 两者在 H2 之前碰巧同址，所以「截到首个 `#[cfg(test)]`」一直看着没问题；`pi_loop_process.rs`
 * 把 `#[cfg(test)]` 用在了 impl 内的单个 test-only 构造器上（行 328），旧判据于是从那里
 * 一刀切下，把该文件 36% 的**生产码**（含唯一的 spawn 调用点）连同测试块一起丢出扫描面。
 * `pi_loop_journal.rs` 同形，丢 24%。判据改为只认 module 边界——扫描面只会变大，不会变小。
 */
const TEST_MODULE_PATTERN = /#\[cfg\(test\)\]\s*\n\s*(?:pub(?:\([^)]*\))?\s+)?mod\s+/;

/** 生产段：每个 .rs 文件在 `#[cfg(test)] mod` 处截断，测试块不计入能力面。 */
function productionSegment(text) {
  const matched = TEST_MODULE_PATTERN.exec(text);
  return matched ? text.slice(0, matched.index) : text;
}

/** 只取生产码：每个 .rs 文件在首个 `#[cfg(test)]` 处截断，测试块不计入能力面。 */
export function productionSpawnPrograms(sources) {
  const found = new Map();
  for (const [file, text] of Object.entries(sources)) {
    const production = productionSegment(text);
    for (const match of production.matchAll(SPAWN_PATTERN)) {
      const program = match[1];
      if (!found.has(program)) found.set(program, new Set());
      found.get(program).add(file);
    }
  }
  return found;
}

/** R3：登记册与生产码双向锁，且每条能力所需等级不得高于当期等级。 */
export function validateCapabilityLedger(ledger, contract, sources) {
  const failures = [];
  const { currentLevel, levels } = contract;
  const rank = new Map(levels.map((level, index) => [level, index]));
  const currentRank = rank.has(currentLevel) ? rank.get(currentLevel) : -1;

  for (const entry of ledger) {
    if (!rank.has(entry.requiredLevel)) {
      failures.push(`能力「${entry.capability}」声明的隔离等级 \`${entry.requiredLevel}\` 不在 ADR-018 闭集内`);
      continue;
    }
    if (currentRank >= 0 && rank.get(entry.requiredLevel) > currentRank) {
      failures.push(
        `能力面超出当前隔离等级：「${entry.capability}」（spawn \`${entry.program}\`）要求 \`${entry.requiredLevel}\`，当期只有 \`${currentLevel}\`——` +
          `当期允许的最高档是「${contract.capabilityByLevel.get(currentLevel) ?? '（绑定表未给出）'}」`,
      );
    }
  }

  const spawned = productionSpawnPrograms(sources);
  const registered = new Set(ledger.map((entry) => entry.program));
  for (const [program, files] of spawned) {
    if (!registered.has(program)) {
      failures.push(`生产码出现未登记的执行原语：spawn \`${program}\`（${[...files].join('、')}）——先在能力登记册立项并给出所需隔离等级`);
    }
  }
  for (const entry of ledger) {
    if (!spawned.has(entry.program)) {
      failures.push(`能力登记册与生产码脱节：「${entry.capability}」登记了 spawn \`${entry.program}\`，生产码里找不到——能力退役须同批销号`);
    }
  }

  return failures;
}

// ── 动态 spawn 扫描面 ───────────────────────────────────────────────────────

const SPAWN_MARKER = 'Command::new(';
/** 与字面量扫描面（`SPAWN_PATTERN`）逐字同判据，两个面因此严格互斥、无缝无叠。 */
const LITERAL_ARGUMENT = /^"[^"]+"$/;

/**
 * 从 `(` 起做**括号配对**扫描，取出完整实参源码。
 * 不能用 `/\(([^)]*)\)/`——`resolve(a, g(b))` 会被截在第一个右括号上，
 * 于是「拼接/包裹」这类真要抓的形态反而对上了在册的短表达式。
 */
function readCallArgument(text, open) {
  let depth = 0;
  let index = open;
  let inString = false;
  while (index < text.length) {
    const character = text[index];
    if (inString) {
      if (character === '\\') {
        index += 2;
        continue;
      }
      if (character === '"') inString = false;
      index += 1;
      continue;
    }
    if (character === '"') {
      inString = true;
      index += 1;
      continue;
    }
    if (character === '(') depth += 1;
    if (character === ')') {
      depth -= 1;
      if (depth === 0) return text.slice(open + 1, index);
    }
    index += 1;
  }
  return null;
}

/** 直接包围调用点的 Rust function name：取调用点之前最后一枚 `fn <name>`。 */
function enclosingFunctionName(text, offset) {
  const pattern = /\bfn\s+([A-Za-z_][A-Za-z0-9_]*)/g;
  let name = null;
  for (const match of text.matchAll(pattern)) {
    if (match.index >= offset) break;
    name = match[1];
  }
  return name;
}

/**
 * 生产码里每一处**非字面量** `Command::new(<expr>)`，逐处返回
 * `{anchor, programExpression, enclosingFunction}`（不聚合——次数由调用方数）。
 * `programExpression` 是去首尾空白后的 exact source text。
 */
export function productionDynamicSpawns(sources) {
  const sites = [];
  for (const [file, text] of Object.entries(sources)) {
    const production = productionSegment(text);
    let cursor = 0;
    for (;;) {
      const marker = production.indexOf(SPAWN_MARKER, cursor);
      if (marker < 0) break;
      const open = marker + SPAWN_MARKER.length - 1;
      const argument = readCallArgument(production, open);
      cursor = marker + SPAWN_MARKER.length;
      if (argument === null) continue;
      const expression = argument.trim();
      if (LITERAL_ARGUMENT.test(expression)) continue;
      sites.push({
        anchor: file,
        programExpression: expression,
        enclosingFunction: enclosingFunctionName(production, marker) ?? '(顶层，无包围函数)',
      });
    }
  }
  return sites;
}

const dynamicKey = (anchor, enclosingFunction, programExpression) =>
  `${anchor} ${enclosingFunction} ${programExpression}`;

/**
 * R3 的动态面：登记册与生产码按 {表达式, 函数, 文件, 次数} 四项双向锁，等级不得越档。
 * 只证明调用点闭集；`verified_runtime_path` 运行期的身份由 manifest 门独立承担。
 */
export function validateDynamicSpawnLedger(ledger, contract, sources) {
  const failures = [];
  const { currentLevel, levels } = contract;
  const rank = new Map(levels.map((level, index) => [level, index]));
  const currentRank = rank.has(currentLevel) ? rank.get(currentLevel) : -1;
  const expectedKeys = [...DYNAMIC_ROW_KEYS].sort().join(',');

  const registered = new Map();
  for (const entry of ledger) {
    const keys = Object.keys(entry).sort();
    if (keys.join(',') !== expectedKeys) {
      failures.push(
        `动态登记行的键集必须恰为 {${DYNAMIC_ROW_KEYS.join(', ')}}：` +
          `「${entry.capability ?? '(未具名)'}」实为 {${keys.join(', ')}}`,
      );
      continue;
    }
    if (typeof entry.programExpression !== 'string' || entry.programExpression.trim() === '') {
      failures.push(`动态登记行「${entry.capability}」的 \`programExpression\` 不得为空——空登记不是登记`);
      continue;
    }
    if (typeof entry.enclosingFunction !== 'string' || entry.enclosingFunction.trim() === '') {
      failures.push(`动态登记行「${entry.capability}」的 \`enclosingFunction\` 不得为空——空登记不是登记`);
      continue;
    }
    if (!Number.isInteger(entry.exactCount) || entry.exactCount < 1) {
      failures.push(`动态登记行「${entry.capability}」的 \`exactCount\` 必须是正整数，实为 ${JSON.stringify(entry.exactCount)}`);
      continue;
    }
    if (!rank.has(entry.requiredLevel)) {
      failures.push(`动态能力「${entry.capability}」声明的隔离等级 \`${entry.requiredLevel}\` 不在 ADR-018 闭集内`);
      continue;
    }
    if (currentRank >= 0 && rank.get(entry.requiredLevel) > currentRank) {
      failures.push(
        `动态能力面超出当前隔离等级：「${entry.capability}」（调用点 \`${entry.programExpression}\`）要求 ` +
          `\`${entry.requiredLevel}\`，当期只有 \`${currentLevel}\``,
      );
      continue;
    }
    registered.set(dynamicKey(entry.anchor, entry.enclosingFunction, entry.programExpression), entry);
  }

  const counts = new Map();
  for (const site of productionDynamicSpawns(sources)) {
    const key = dynamicKey(site.anchor, site.enclosingFunction, site.programExpression);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  for (const [key, count] of counts) {
    const [anchor, enclosingFunction, programExpression] = key.split(' ');
    const entry = registered.get(key);
    if (!entry) {
      failures.push(
        `生产码出现未登记的动态执行原语：\`${programExpression}\`（${anchor} 的 \`${enclosingFunction}\`，${count} 处）——` +
          '动态调用点须按 {表达式, 函数, 文件, 次数} 四项在动态登记册立项并给出所需隔离等级',
      );
      continue;
    }
    if (entry.exactCount !== count) {
      failures.push(
        `动态调用点次数对不上：「${entry.capability}」实测 ${count} 处，登记 ${entry.exactCount} 处` +
          `（${anchor} 的 \`${enclosingFunction}\`）`,
      );
    }
  }

  for (const [key, entry] of registered) {
    if (counts.has(key)) continue;
    const [anchor, enclosingFunction, programExpression] = key.split(' ');
    failures.push(
      `动态能力登记册与生产码脱节：「${entry.capability}」登记了 ${anchor} 的 \`${enclosingFunction}\` 内 ` +
        `\`${programExpression}\`，生产码里找不到——调用点搬家、改名或退役须同批销号`,
    );
  }

  return failures;
}

/** 取得写能力的 fs 导出名。`open`/`openSync` 计入——它们能拿到可写句柄。 */
const FS_WRITE_NAMES = new Set([
  'appendFile', 'appendFileSync', 'chmod', 'chmodSync', 'chown', 'chownSync', 'copyFile', 'copyFileSync',
  'cp', 'cpSync', 'createWriteStream', 'link', 'linkSync', 'mkdir', 'mkdirSync', 'mkdtemp', 'mkdtempSync',
  'open', 'openSync', 'rename', 'renameSync', 'rm', 'rmSync', 'rmdir', 'rmdirSync', 'symlink', 'symlinkSync',
  'truncate', 'truncateSync', 'unlink', 'unlinkSync', 'utimes', 'utimesSync', 'write', 'writeFile',
  'writeFileSync', 'writeSync', 'writev',
]);

const FS_MODULES = new Set(['fs', 'node:fs', 'fs/promises', 'node:fs/promises']);
const EXEC_MODULES = new Set(['child_process', 'node:child_process']);

const IMPORT_FROM_PATTERN = /import\s+([^'";]*?)\s+from\s*['"]([^'"]+)['"]/g;
const BARE_IMPORT_PATTERN = /import\s*['"]([^'"]+)['"]/g;
const REQUIRE_PATTERN = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

/** `{ a, b as c }` → ['a','b']；`* as fs` / `fs` → 命名空间绑定名。 */
function parseImportClause(clause) {
  const named = [];
  const namespaces = [];
  const braced = /\{([^}]*)\}/.exec(clause);
  if (braced) {
    for (const part of braced[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/)[0].trim().replace(/^type\s+/, '');
      if (name) named.push(name);
    }
  }
  const starred = /\*\s+as\s+([A-Za-z_$][\w$]*)/.exec(clause);
  if (starred) namespaces.push(starred[1]);
  const head = clause.replace(/\{[^}]*\}/g, '').replace(/\*\s+as\s+[A-Za-z_$][\w$]*/g, '').replace(/,/g, ' ').trim();
  if (/^[A-Za-z_$][\w$]*$/.test(head)) namespaces.push(head);
  return { named, namespaces };
}

/**
 * 只取生产码：`.test.` 文件不计入能力面（与 Rust 侧按 `#[cfg(test)]` 截断同义）。
 * 判据取「模块从哪来」而非「标识符长什么样」——`env.exec()` 这类同名方法不会误报，
 * 真正拿到能力的唯一途径是 import/require 那两个模块。
 */
export function productionNodePrimitives(sources) {
  const found = new Map();
  const record = (primitive, file) => {
    if (!found.has(primitive)) found.set(primitive, new Set());
    found.get(primitive).add(file);
  };

  for (const [file, text] of Object.entries(sources)) {
    if (file.includes('.test.')) continue;

    for (const [, specifier] of [...text.matchAll(BARE_IMPORT_PATTERN), ...text.matchAll(REQUIRE_PATTERN)].map(
      (match) => [null, match[1]],
    )) {
      if (EXEC_MODULES.has(specifier)) record('child_process', file);
      if (FS_MODULES.has(specifier)) record('fs:*', file);
    }

    for (const match of text.matchAll(IMPORT_FROM_PATTERN)) {
      const [, clause, specifier] = match;
      if (EXEC_MODULES.has(specifier)) {
        record('child_process', file);
        continue;
      }
      if (!FS_MODULES.has(specifier)) continue;
      const { named, namespaces } = parseImportClause(clause);
      for (const name of named) {
        if (FS_WRITE_NAMES.has(name)) record(`fs:${name}`, file);
      }
      for (const namespace of namespaces) {
        for (const name of FS_WRITE_NAMES) {
          if (new RegExp(`\\b${namespace}\\s*\\.\\s*(?:promises\\s*\\.\\s*)?${name}\\s*\\(`).test(text)) {
            record(`fs:${name}`, file);
          }
        }
      }
    }
  }
  return found;
}

/** R3 的 pi lane 面：登记册与生产码双向锁，等级不得越档。判据与 Rust 侧同构。 */
export function validateNodePrimitiveLedger(ledger, contract, sources) {
  const failures = [];
  const { currentLevel, levels } = contract;
  const rank = new Map(levels.map((level, index) => [level, index]));
  const currentRank = rank.has(currentLevel) ? rank.get(currentLevel) : -1;

  for (const entry of ledger) {
    if (!rank.has(entry.requiredLevel)) {
      failures.push(`pi lane 能力「${entry.capability}」声明的隔离等级 \`${entry.requiredLevel}\` 不在 ADR-018 闭集内`);
      continue;
    }
    if (currentRank >= 0 && rank.get(entry.requiredLevel) > currentRank) {
      failures.push(
        `pi lane 能力面超出当前隔离等级：「${entry.capability}」（原语 \`${entry.primitive}\`）要求 \`${entry.requiredLevel}\`，当期只有 \`${currentLevel}\``,
      );
    }
  }

  const used = productionNodePrimitives(sources);
  const registered = new Set(ledger.map((entry) => entry.primitive));
  for (const [primitive, files] of used) {
    if (!registered.has(primitive)) {
      failures.push(
        `packages/pi-lane 生产码出现未登记的 Node 侧执行/写原语：\`${primitive}\`（${[...files].join('、')}）——` +
          `读面票内此类调用点应为零；确需引入先在能力登记册立项并给出所需隔离等级`,
      );
    }
  }
  for (const entry of ledger) {
    if (!used.has(entry.primitive)) {
      failures.push(
        `pi lane 能力登记册与生产码脱节：「${entry.capability}」登记了 \`${entry.primitive}\`，生产码里找不到——能力退役须同批销号`,
      );
    }
  }

  return failures;
}

export function validateIsolationBinding({
  adrText,
  evidenceText,
  sources,
  nodeSources,
  ledger = capabilityLedger,
  nodeLedger = nodePrimitiveLedger,
  dynamicLedger = dynamicSpawnLedger,
}) {
  const contract = parseIsolationContract(adrText);
  if (contract.failures.length > 0) return { contract, failures: contract.failures };
  return {
    contract,
    failures: [
      ...validateLevelEvidence(contract, evidenceText),
      ...validateCapabilityLedger(ledger, contract, sources),
      ...validateDynamicSpawnLedger(dynamicLedger, contract, sources),
      ...validateNodePrimitiveLedger(nodeLedger, contract, nodeSources ?? {}),
    ],
  };
}
