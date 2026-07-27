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
const TEST_BLOCK_MARKER = '#[cfg(test)]';

/** 只取生产码：每个 .rs 文件在首个 `#[cfg(test)]` 处截断，测试块不计入能力面。 */
export function productionSpawnPrograms(sources) {
  const found = new Map();
  for (const [file, text] of Object.entries(sources)) {
    const cut = text.indexOf(TEST_BLOCK_MARKER);
    const production = cut >= 0 ? text.slice(0, cut) : text;
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

export function validateIsolationBinding({ adrText, evidenceText, sources, ledger = capabilityLedger }) {
  const contract = parseIsolationContract(adrText);
  if (contract.failures.length > 0) return { contract, failures: contract.failures };
  return {
    contract,
    failures: [...validateLevelEvidence(contract, evidenceText), ...validateCapabilityLedger(ledger, contract, sources)],
  };
}
