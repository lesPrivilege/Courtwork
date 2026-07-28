/**
 * PI-SIDECAR-DIST-1R · 共享判定层（纯函数，零 I/O）。
 *
 * 存在理由，直接来自 `9b8142f` 的拒绝理由第一条：原装置把 stdio/abort/crash 的失败
 * **只序列化进 JSON**，聚合处仍报 `status:'ok'`，缺产物还会静默跳过。于是「八枚全过」
 * 没有任何一处会因语义失败而判红——那不是证据，是排版。
 *
 * 本模块因此只做一件事：把「观察值」翻成「通过 / 不通过」。
 * - **纯**：不碰 fs、不 spawn、不读 `process`、不 `exit`。观察由各 probe 采集后传进来。
 * - **唯一**：`measure` / `coldstart-rounds` / `reproducibility-probe` / `sign-probe`
 *   四支必须消费同一份判据，不得各自另写一套宽松口径。
 * - **闭集**：库存恰十件，多一件少一件都是失败；判据本身是冻结字面量，不从被测包 import——
 *   若两端同源，判据就与被测对象一起漂移，等于没判。
 *
 * 施工序留档（TDD 首红须落在既有缺陷，而非模块加载）：本文件先按 `70e6482` 的真实口径落地
 * ——`verdictStdio`/`verdictCrash`/`verdictInventory` 直接 `return []`，`conclude` 恒报 `ok`——
 * 在那份口径上 `probe-verdict.test.mjs` 102 例红 87 例；随后才逐条收紧到下文判据，同件转全绿。
 */

/** 被测运行时。只此一个版本，`fetch-runtime` / `extract-runtime` 与判定共用。 */
export const NODE_VERSION = 'v22.23.1';

/** 官方发行目录。冻结到版本级，不接受任意 URL。 */
export const NODE_DIST_BASE = `https://nodejs.org/dist/${NODE_VERSION}/`;

/**
 * 冻结的官方发行包身份。**先冻结、再下载**：下载回来的 `SHASUMS256.txt` 只是第二个独立
 * 见证，不是唯一真源——否则「同时被替换的 archive + SHASUMS」可以自洽通过。
 */
export const RUNTIME_ARCHIVES = [
  {
    nodeArch: 'arm64',
    name: `node-${NODE_VERSION}-darwin-arm64.tar.gz`,
    bytes: 50_067_502,
    sha256: 'ef28d8fab2c0e4314522d4bb1b7173270aa3937e93b92cb7de79c112ac1fa953',
  },
  {
    nodeArch: 'x64',
    name: `node-${NODE_VERSION}-darwin-x64.tar.gz`,
    bytes: 51_245_086,
    sha256: 'b8da981b8a0b1241b70249204916da76c63573ddf5814dbd2d1e41069105cb81',
  },
];

/** Tauri `bundle.externalBin` 的 target triple ↔ Node 官方发行包架构名 ↔ 进程内 `process.arch`。 */
export const TARGETS = [
  { triple: 'aarch64-apple-darwin', nodeArch: 'arm64', processArch: 'arm64', native: true },
  { triple: 'x86_64-apple-darwin', nodeArch: 'x64', processArch: 'x64', native: false },
];

export const SIDECAR_BASENAME = 'pi-sidecar';

/**
 * 路线甲三档 bundle 形态。`esm-naive` 是**负控**：它必须以既知原因启动失败，
 * 失败即通过；哪天它跑起来了，说明上游或打包链变了，同样要判红。
 */
export const SEALED_VARIANTS = [
  { name: 'esm-naive', format: 'esm', extension: 'mjs', role: 'negative-control' },
  { name: 'esm-createrequire', format: 'esm', extension: 'mjs', role: 'candidate' },
  { name: 'cjs', format: 'cjs', extension: 'cjs', role: 'candidate' },
];

/** 路线乙两档 blob 形态，均为候选。 */
export const SEA_VARIANTS = [
  { name: 'default', useCodeCache: false, role: 'candidate' },
  { name: 'code-cache', useCodeCache: true, role: 'candidate' },
];

/** 负控的既知失败原因。原文来自 esbuild 为 ESM 产物生成的 `__require()` 垫片。 */
export const NEGATIVE_CONTROL_ERROR = 'Dynamic require of "process" is not supported';

/**
 * 库存闭集：两架构 × （sealed 三档 + SEA 两档）＝ 恰十件。
 * `role` 决定判据走候选面还是负控面；`expected*` 是每件产物必须自证的身份。
 */
export const INVENTORY = TARGETS.flatMap((target) => [
  ...SEALED_VARIANTS.map((variant) => ({
    id: `a/${target.triple}/${variant.name}`,
    route: 'a-sealed-bundle',
    triple: target.triple,
    variant: variant.name,
    role: variant.role,
    fileCount: 2,
    expectedNode: NODE_VERSION,
    expectedArch: target.processArch,
    expectedSea: 'not-sea',
  })),
  ...SEA_VARIANTS.map((variant) => ({
    id: `b/${target.triple}/${variant.name}`,
    route: 'b-node-sea',
    triple: target.triple,
    variant: variant.name,
    role: variant.role,
    fileCount: 1,
    expectedNode: NODE_VERSION,
    expectedArch: target.processArch,
    expectedSea: 'sea',
  })),
]);

export const INVENTORY_IDS = INVENTORY.map((entry) => entry.id);
export const CANDIDATE_IDS = INVENTORY.filter((entry) => entry.role === 'candidate').map((entry) => entry.id);
export const NEGATIVE_CONTROL_IDS = INVENTORY.filter((entry) => entry.role === 'negative-control').map(
  (entry) => entry.id,
);

export const entryOf = (id) => INVENTORY.find((entry) => entry.id === id) ?? null;

/**
 * 三类 payload 的构造谱。判定与采集共用同一份，避免「两谱各抄一份字面量」。
 * `c0-worst-escape` 对应 ADR-022 六-B.1 点名的 encoded-packet worst case。
 */
export const PAYLOAD_SPECS = [
  { label: 'ascii-1MiB', unit: 'a', repeat: 1024 * 1024 },
  { label: 'utf8-multibyte', unit: '契約書𝒜😀', repeat: 50_000 },
  { label: 'c0-worst-escape', unit: '\u0001"\\', repeat: 80_000 },
];

export const payloadText = (spec) => spec.unit.repeat(spec.repeat);

/**
 * 只读工具表的冻结期望。**故意不从 `@courtwork/pi-lane` import**：
 * fixture 自己就是从那里取的，两端同源则永远相等，判据零区分力。
 */
export const EXPECTED_TOOL_NAMES = ['read', 'grep', 'glob'];

/** 一轮 loop 的期望：模型请求 read → 容器执行 → 回灌 → assistant 收尾。 */
export const EXPECTED_LOOP = { toolsExecuted: ['read'], turns: 2, lastRole: 'assistant' };

/** 四类崩溃的 exact 期望。`code`/`signal` 恰有一个非空。 */
export const CRASH_EXPECTATIONS = [
  { kind: 'throw', code: 1, signal: null },
  { kind: 'exit', code: 7, signal: null },
  { kind: 'hang', code: null, signal: 'SIGKILL' },
  { kind: 'sigterm', code: null, signal: 'SIGTERM' },
];

/** 冷启取样形状：三轮 × 每轮 25 样本，丢前 3 热身。 */
export const COLDSTART_SHAPE = { rounds: 3, samples: 25, warmup: 3 };

/** ad-hoc 签名三姿势 × 两候选；`launches` 是**已实测的既知形态**，变了就该红。 */
export const SIGN_MODES = [
  { name: 'adhoc-plain', hardened: false, entitlements: false, launches: true },
  { name: 'adhoc-hardened-no-entitlements', hardened: true, entitlements: false, launches: false },
  { name: 'adhoc-hardened-with-official-entitlements', hardened: true, entitlements: true, launches: true },
];

export const SIGN_SUBJECT_IDS = [
  `a/${TARGETS[0].triple}/cjs`,
  `b/${TARGETS[0].triple}/default`,
];

/** 跨架构 code cache 被拒时 Node 在 stderr 留下的原句。静默降级零容忍即锁这一句。 */
export const CODE_CACHE_REJECT_WARNING = 'Code cache data rejected.';

/** 一条失败记录。`check` 是稳定判据名，报告与回执直接引它，不引行号。 */
const fail = (id, check, expected, observed) => ({ id, check, expected, observed });

const asNullable = (value) => (value === undefined ? null : value);
const sorted = (list) => [...list].sort();
const sameSet = (a, b) => a.length === b.length && sorted(a).every((value, index) => value === sorted(b)[index]);

/** payload 的期望字节数由构造谱算出，不取采集端自报——否则「发小了又自称发小了」可自洽通过。 */
export const payloadBytes = (spec) => Buffer.byteLength(spec.unit, 'utf8') * spec.repeat;

/** `file -b` 的 Mach-O 描述 → 官方发行包架构名。两端共用，避免各写一套字符串匹配。 */
export function normalizeMachoArch(fileOutput) {
  const text = String(fileOutput ?? '');
  if (/\barm64\b/.test(text)) return 'arm64';
  if (/\bx86_64\b/.test(text)) return 'x64';
  return null;
}

// ——————————————————————————————————————————————————————————————————————
// 判定本体。十支各自只回报失败清单；顶层由 `conclude` 收束。
// 判据一律「有一处不符就记一条」，不做提前 return——一次跑完要看到全部缺口。
// ——————————————————————————————————————————————————————————————————————

/** 库存必须恰为十件闭集：少一、多一、重复、错名都判红。 */
export function verdictInventory(observedIds) {
  const observed = Array.isArray(observedIds) ? observedIds : [];
  const failures = [];

  const duplicates = observed.filter((id, index) => observed.indexOf(id) !== index);
  for (const id of new Set(duplicates)) {
    failures.push(fail(id, 'inventory.duplicate', 'exactly once', `${observed.filter((x) => x === id).length} times`));
  }
  for (const id of INVENTORY_IDS) {
    if (!observed.includes(id)) failures.push(fail(id, 'inventory.missing', 'present', 'absent'));
  }
  for (const id of new Set(observed)) {
    if (!INVENTORY_IDS.includes(id)) failures.push(fail(id, 'inventory.unexpected', 'not in closed set', 'present'));
  }
  if (observed.length !== INVENTORY_IDS.length) {
    failures.push(fail('inventory', 'inventory.count', INVENTORY_IDS.length, observed.length));
  }
  return failures;
}

/**
 * 负控必须**以既知原因失败**。跑起来了、以 0 退出、换了失败原因、没留下原因，四种都判红——
 * 负控跑通说明上游或打包链变了，那时候八枚候选的读数也不再可比。
 */
export function verdictNegativeControl(id, observation) {
  const entry = entryOf(id);
  const failures = [];
  if (!entry || entry.role !== 'negative-control') {
    return [fail(id, 'negativeControl.subject', 'a declared negative control', entry?.role ?? 'unknown id')];
  }
  if (!observation) return [fail(id, 'negativeControl.observation', 'launch observation', null)];

  if (observation.launched !== false) {
    failures.push(fail(id, 'negativeControl.launched', false, asNullable(observation.launched)));
  }
  const code = asNullable(observation.exit?.code);
  if (typeof code !== 'number' || code === 0) {
    failures.push(fail(id, 'negativeControl.exitCode', 'non-zero number', code));
  }
  const errorLine = observation.errorLine ?? null;
  if (typeof errorLine !== 'string' || !errorLine.includes(NEGATIVE_CONTROL_ERROR)) {
    failures.push(fail(id, 'negativeControl.reason', NEGATIVE_CONTROL_ERROR, errorLine));
  }
  return failures;
}

/** `ready` 的版本／架构／SEA 三元组必须自证身份；错一项即整枚读数不可用。 */
export function verdictIdentity(id, ready) {
  const entry = entryOf(id);
  if (!entry) return [fail(id, 'identity.subject', 'known inventory id', 'unknown')];
  if (!ready) return [fail(id, 'identity.ready', 'ready packet', null)];

  const failures = [];
  if (ready.node !== entry.expectedNode) {
    failures.push(fail(id, 'identity.node', entry.expectedNode, asNullable(ready.node)));
  }
  if (ready.arch !== entry.expectedArch) {
    failures.push(fail(id, 'identity.arch', entry.expectedArch, asNullable(ready.arch)));
  }
  if (ready.sea !== entry.expectedSea) {
    failures.push(fail(id, 'identity.sea', entry.expectedSea, asNullable(ready.sea)));
  }
  return failures;
}

/** stdio：pong、三 payload 的 byte/hash、exact 工具表、真实 loop、干净 EOF。缺一即红。 */
export function verdictStdio(id, observation) {
  if (!observation) return [fail(id, 'stdio.observation', 'stdio observation', null)];
  const failures = [];

  if (observation.pong?.seen !== true) {
    failures.push(fail(id, 'stdio.pong', true, asNullable(observation.pong?.seen)));
  }

  const payloads = Array.isArray(observation.payloads) ? observation.payloads : [];
  const observedLabels = payloads.map((payload) => payload.label);
  const expectedLabels = PAYLOAD_SPECS.map((spec) => spec.label);
  if (observedLabels.length !== expectedLabels.length || observedLabels.some((l, i) => l !== expectedLabels[i])) {
    failures.push(fail(id, 'stdio.payload.set', expectedLabels, observedLabels));
  }
  for (const spec of PAYLOAD_SPECS) {
    const row = payloads.find((payload) => payload.label === spec.label);
    if (!row) continue; // 缺类已由 payload.set 记过一次，不重复计数。
    const expectedBytes = payloadBytes(spec);
    if (row.sentBytes !== expectedBytes) {
      failures.push(fail(id, `stdio.payload.${spec.label}.sentBytes`, expectedBytes, asNullable(row.sentBytes)));
    }
    if (row.observedBytes !== row.sentBytes) {
      failures.push(
        fail(id, `stdio.payload.${spec.label}.byteLength`, asNullable(row.sentBytes), asNullable(row.observedBytes)),
      );
    }
    if (!row.sentSha256 || row.observedSha256 !== row.sentSha256) {
      failures.push(
        fail(id, `stdio.payload.${spec.label}.sha256`, asNullable(row.sentSha256), asNullable(row.observedSha256)),
      );
    }
  }

  const tools = observation.session?.tools ?? null;
  const toolsOk =
    Array.isArray(tools) &&
    tools.length === EXPECTED_TOOL_NAMES.length &&
    tools.every((name, index) => name === EXPECTED_TOOL_NAMES[index]);
  if (!toolsOk) failures.push(fail(id, 'stdio.tools', EXPECTED_TOOL_NAMES, tools));

  const loop = observation.loop ?? null;
  if (!loop) {
    failures.push(fail(id, 'stdio.loop', EXPECTED_LOOP, null));
  } else {
    const executed = Array.isArray(loop.toolsExecuted) ? loop.toolsExecuted : null;
    const executedOk =
      executed !== null &&
      executed.length === EXPECTED_LOOP.toolsExecuted.length &&
      executed.every((name, index) => name === EXPECTED_LOOP.toolsExecuted[index]);
    if (!executedOk) failures.push(fail(id, 'stdio.loop.toolsExecuted', EXPECTED_LOOP.toolsExecuted, executed));
    if (loop.turns !== EXPECTED_LOOP.turns) {
      failures.push(fail(id, 'stdio.loop.turns', EXPECTED_LOOP.turns, asNullable(loop.turns)));
    }
    if (loop.lastRole !== EXPECTED_LOOP.lastRole) {
      failures.push(fail(id, 'stdio.loop.lastRole', EXPECTED_LOOP.lastRole, asNullable(loop.lastRole)));
    }
  }

  failures.push(...cleanExit(id, 'stdio.eof', observation.eofExit));
  return failures;
}

/** stdin EOF 后必须是「退出码 0、无信号」。走信号收束一律算异常 EOF。 */
function cleanExit(id, check, exit) {
  const code = asNullable(exit?.code);
  const signal = asNullable(exit?.signal);
  if (code === 0 && signal === null) return [];
  return [fail(id, check, { code: 0, signal: null }, { code, signal })];
}

/**
 * abort 四条一起判：ack 收到且打的是在途回合、慢流以 `aborted` 收束、
 * abort 后进程仍能应答、随后 EOF 干净退 0。少任何一条，「abort 可用」都不成立。
 */
export function verdictAbort(id, observation) {
  if (!observation) return [fail(id, 'abort.observation', 'abort observation', null)];
  const failures = [];

  if (observation.ack?.seen !== true) {
    failures.push(fail(id, 'abort.ack', true, asNullable(observation.ack?.seen)));
  } else if (observation.ack.wasRunning !== true) {
    failures.push(fail(id, 'abort.ack.wasRunning', true, asNullable(observation.ack.wasRunning)));
  }
  if (!observation.ended) {
    failures.push(fail(id, 'abort.ended', 'slow-ended packet', null));
  } else if (observation.ended.stopReason !== 'aborted') {
    failures.push(fail(id, 'abort.stopReason', 'aborted', asNullable(observation.ended.stopReason)));
  }
  if (observation.pingAfterAbort !== true) {
    failures.push(fail(id, 'abort.survived', true, asNullable(observation.pingAfterAbort)));
  }
  failures.push(...cleanExit(id, 'abort.eof', observation.eofExit));
  return failures;
}

/** 四类崩溃：kind 闭集、exact code/signal、且**逐类**复启 ready。 */
export function verdictCrash(id, observation) {
  const terminations = Array.isArray(observation?.terminations) ? observation.terminations : [];
  const failures = [];

  const observedKinds = terminations.map((entry) => entry.kind);
  const expectedKinds = CRASH_EXPECTATIONS.map((expectation) => expectation.kind);
  if (!sameSet(observedKinds, expectedKinds)) {
    failures.push(fail(id, 'crash.kinds', expectedKinds, observedKinds));
  }

  for (const expectation of CRASH_EXPECTATIONS) {
    const row = terminations.find((entry) => entry.kind === expectation.kind);
    if (!row) continue; // 缺类已由 crash.kinds 记过。
    const code = asNullable(row.exitCode);
    const signal = asNullable(row.signal);
    if (code !== expectation.code || signal !== expectation.signal) {
      failures.push(
        fail(
          id,
          `crash.${expectation.kind}`,
          { code: expectation.code, signal: expectation.signal },
          { code, signal },
        ),
      );
    }
    if (row.respawnReady !== true) {
      failures.push(fail(id, `crash.${expectation.kind}.respawn`, true, asNullable(row.respawnReady)));
    }
  }
  return failures;
}

/**
 * 冷启：形状（三轮 × 25 样本 × 丢 3 热身）、恰八候选、逐轮顺序已记录且确实是排列。
 *
 * 「已打乱」这条只识别**压根没打乱**（三轮顺序全同）。它不宣称能证明随机性；
 * 八候选有 40,320 种排列，三轮碰巧全同的概率约 6e-10，够作漏 shuffle 的判据。
 * 本判定不设任何路线胜负阈值——只报同机数字。
 */
export function verdictColdstart(observation) {
  if (!observation) return [fail('coldstart', 'coldstart.observation', 'coldstart observation', null)];
  const failures = [];

  const shape = observation.shape ?? {};
  for (const key of ['rounds', 'samples', 'warmup']) {
    if (shape[key] !== COLDSTART_SHAPE[key]) {
      failures.push(fail('coldstart', `coldstart.shape.${key}`, COLDSTART_SHAPE[key], asNullable(shape[key])));
    }
  }
  const keptExpected = COLDSTART_SHAPE.samples - COLDSTART_SHAPE.warmup;

  const orders = Array.isArray(observation.orders) ? observation.orders : [];
  if (orders.length !== COLDSTART_SHAPE.rounds) {
    failures.push(fail('coldstart', 'coldstart.orders.rounds', COLDSTART_SHAPE.rounds, orders.length));
  }
  orders.forEach((order, index) => {
    const list = Array.isArray(order) ? order : [];
    if (!sameSet(list, CANDIDATE_IDS) || new Set(list).size !== list.length) {
      failures.push(fail(`round-${index + 1}`, 'coldstart.orders.permutation', CANDIDATE_IDS.length, list));
    }
  });
  if (orders.length > 1 && orders.every((order) => JSON.stringify(order) === JSON.stringify(orders[0]))) {
    failures.push(fail('coldstart', 'coldstart.orders.shuffled', 'per-round randomised order', 'identical order'));
  }

  const subjects = Array.isArray(observation.subjects) ? observation.subjects : [];
  const subjectIds = subjects.map((subject) => subject.id);
  if (!sameSet(subjectIds, CANDIDATE_IDS) || new Set(subjectIds).size !== subjectIds.length) {
    failures.push(fail('coldstart', 'coldstart.subjects', CANDIDATE_IDS, subjectIds));
  }

  for (const subject of subjects) {
    const rounds = Array.isArray(subject.rounds) ? subject.rounds : [];
    if (rounds.length !== COLDSTART_SHAPE.rounds) {
      failures.push(fail(subject.id, 'coldstart.rounds', COLDSTART_SHAPE.rounds, rounds.length));
    }
    for (const round of rounds) {
      const at = `${subject.id}#${round.round ?? '?'}`;
      if (round.failed) {
        failures.push(fail(at, 'coldstart.round.failed', 'completed', round.failed));
        continue;
      }
      if (round.keptSamples !== keptExpected) {
        failures.push(fail(at, 'coldstart.round.keptSamples', keptExpected, asNullable(round.keptSamples)));
      }
      if (round.eofClean !== true) {
        failures.push(fail(at, 'coldstart.round.eof', true, asNullable(round.eofClean)));
      }
      failures.push(...verdictIdentity(subject.id, round.identity).map((entry) => ({ ...entry, id: at })));
    }
  }
  return failures;
}

/**
 * 双 cycle 可复现性。三条互不替代：
 * - sealed minified 与 SEA `default` **必须**两次逐字节相同；
 * - `code-cache` **必须**两次不同——它若「碰巧一致」是误报，同样判红，不许当好消息；
 * - arm64 blob 注入 x64 **必须**看到 `Code cache data rejected.` 原句，静默降级零容忍。
 */
export function verdictReproducibility(observation) {
  if (!observation) return [fail('reproducibility', 'reproducibility.observation', 'two-cycle observation', null)];
  const failures = [];

  if (observation.cycles !== 2) {
    failures.push(fail('reproducibility', 'reproducibility.cycles', 2, asNullable(observation.cycles)));
  }

  const sealed = Array.isArray(observation.sealedBundles) ? observation.sealedBundles : [];
  const sealedNames = sealed.map((row) => row.variant);
  const expectedSealed = SEALED_VARIANTS.map((variant) => variant.name);
  if (!sameSet(sealedNames, expectedSealed)) {
    failures.push(fail('reproducibility', 'reproducibility.sealed.set', expectedSealed, sealedNames));
  }
  for (const row of sealed) failures.push(...deterministic(`sealed/${row.variant}`, row, true));

  const seaDefault = Array.isArray(observation.seaDefault) ? observation.seaDefault : [];
  const expectedTriples = TARGETS.map((target) => target.triple);
  if (!sameSet(seaDefault.map((row) => row.triple), expectedTriples)) {
    failures.push(
      fail('reproducibility', 'reproducibility.default.set', expectedTriples, seaDefault.map((row) => row.triple)),
    );
  }
  for (const row of seaDefault) failures.push(...deterministic(`sea-default/${row.triple}`, row, true));

  const codeCache = Array.isArray(observation.seaCodeCache) ? observation.seaCodeCache : [];
  if (!sameSet(codeCache.map((row) => row.triple), expectedTriples)) {
    failures.push(
      fail('reproducibility', 'reproducibility.codeCache.set', expectedTriples, codeCache.map((row) => row.triple)),
    );
  }
  for (const row of codeCache) failures.push(...deterministic(`sea-code-cache/${row.triple}`, row, false));

  const cross = observation.crossArchCodeCache ?? null;
  if (!cross) {
    failures.push(fail('reproducibility', 'reproducibility.crossArch', 'injection observation', null));
  } else {
    if (cross.launched !== true) {
      failures.push(fail('cross-arch', 'reproducibility.crossArch.launched', true, asNullable(cross.launched)));
    }
    if (cross.warningSeen !== true || !String(cross.warning ?? '').includes(CODE_CACHE_REJECT_WARNING)) {
      failures.push(
        fail('cross-arch', 'reproducibility.crossArch.warning', CODE_CACHE_REJECT_WARNING, asNullable(cross.warning)),
      );
    }
  }
  return failures;
}

/** 两次 SHA 的比对。`expectIdentical=false` 时「一致」才是失败——即误报可复现。 */
function deterministic(label, row, expectIdentical) {
  const shas = Array.isArray(row?.shas) ? row.shas : [];
  if (shas.length !== 2) {
    return [fail(label, 'reproducibility.cycleShas', 2, shas.length)];
  }
  const identical = shas[0] === shas[1];
  const failures = [];
  if (row.identical !== identical) {
    failures.push(fail(label, 'reproducibility.selfConsistent', identical, asNullable(row.identical)));
  }
  if (identical !== expectIdentical) {
    failures.push(
      fail(label, expectIdentical ? 'reproducibility.identical' : 'reproducibility.nonDeterministic', expectIdentical, identical),
    );
  }
  return failures;
}

/**
 * ad-hoc 签名矩阵。**只宣称同机 ad-hoc 探针**：不宣称 Tauri bundler、Developer ID、
 * 公证，也不宣称跨机可复现。`launches` 逐格锁既知形态——包括「硬化 + 无 entitlements
 * 必须起不来」这一条；它哪天起来了，第七节的结论就得重写，故也判红。
 */
export function verdictSign(observation) {
  if (!observation) return [fail('sign', 'sign.observation', 'sign observation', null)];
  const failures = [];

  const rows = Array.isArray(observation.resign) ? observation.resign : [];
  const expectedCells = SIGN_SUBJECT_IDS.flatMap((subject) => SIGN_MODES.map((mode) => `${subject}|${mode.name}`));
  const observedCells = rows.map((row) => `${row.subject}|${row.mode}`);
  if (!sameSet(observedCells, expectedCells) || new Set(observedCells).size !== observedCells.length) {
    failures.push(fail('sign', 'sign.matrix', expectedCells, observedCells));
  }

  for (const subject of SIGN_SUBJECT_IDS) {
    for (const mode of SIGN_MODES) {
      const row = rows.find((entry) => entry.subject === subject && entry.mode === mode.name);
      if (!row) continue; // 缺格已由 sign.matrix 记过。
      const at = `${subject}|${mode.name}`;
      if (row.status && row.status !== 'ok') {
        failures.push(fail(at, 'sign.blocked', 'ok', row.status));
        continue;
      }
      if (row.signExit !== 0) failures.push(fail(at, 'sign.signExit', 0, asNullable(row.signExit)));
      if (row.verifyExit !== 0) failures.push(fail(at, 'sign.verifyExit', 0, asNullable(row.verifyExit)));
      if (row.launched !== mode.launches) {
        failures.push(fail(at, 'sign.launched', mode.launches, asNullable(row.launched)));
      }
    }
  }

  const app = observation.appBundle ?? null;
  if (!app || (app.status && app.status !== 'ok')) {
    failures.push(fail('sign', 'sign.appBundle', 'nested .app observation', app?.status ?? null));
  } else {
    for (const [key, expected] of [
      ['signNestedExit', 0],
      ['signOuterExit', 0],
      ['verifyDeepStrictExit', 0],
    ]) {
      if (app[key] !== expected) failures.push(fail('sign/.app', `sign.app.${key}`, expected, asNullable(app[key])));
    }
    if (app.nestedLaunched !== true) {
      failures.push(fail('sign/.app', 'sign.app.nestedLaunched', true, asNullable(app.nestedLaunched)));
    }
    // ad-hoc 必然过不了 Gatekeeper。真过了，说明这不再是 ad-hoc 面，读数不可用。
    if (app.spctlExit === 0) {
      failures.push(fail('sign/.app', 'sign.app.spctl', 'non-zero (ad-hoc rejected)', 0));
    }
  }
  return failures;
}

/**
 * 官方 Node archive 来源门。冻结身份是第一见证，下载回来的 `SHASUMS256.txt` 是第二见证，
 * 两者都要过——只信 SHASUMS 的话，「archive 与 SHASUMS 一起被换」可以自洽通过。
 *
 * 边界：这只证明**HTTPS 传输完整性 + 冻结身份**，不是 release-key 供应链认证。
 */
export function verdictRuntimeSource(observation) {
  if (!observation) return [fail('runtime', 'runtime.observation', 'runtime source observation', null)];
  const failures = [];

  const targets = Array.isArray(observation.targets) ? observation.targets : [];
  const expectedArches = RUNTIME_ARCHIVES.map((archive) => archive.nodeArch);
  if (!sameSet(targets.map((target) => target.nodeArch), expectedArches)) {
    failures.push(fail('runtime', 'runtime.targets', expectedArches, targets.map((target) => target.nodeArch)));
  }

  for (const archive of RUNTIME_ARCHIVES) {
    const target = targets.find((entry) => entry.nodeArch === archive.nodeArch);
    if (!target) continue; // 缺架构已由 runtime.targets 记过。
    const at = archive.name;
    if (target.status !== 'ok') {
      failures.push(fail(at, 'runtime.blocked', 'ok', target.status ?? null));
      continue;
    }
    if (target.name !== archive.name) failures.push(fail(at, 'runtime.name', archive.name, asNullable(target.name)));
    if (target.bytes !== archive.bytes) failures.push(fail(at, 'runtime.bytes', archive.bytes, asNullable(target.bytes)));
    if (target.sha256 !== archive.sha256) {
      failures.push(fail(at, 'runtime.sha256', archive.sha256, asNullable(target.sha256)));
    }
    if (target.shasumsEntry !== archive.sha256) {
      failures.push(fail(at, 'runtime.shasumsEntry', archive.sha256, asNullable(target.shasumsEntry)));
    }
    if (target.tarOk !== true) failures.push(fail(at, 'runtime.tar', true, asNullable(target.tarOk)));
    if (target.nodeVersion !== NODE_VERSION) {
      failures.push(fail(at, 'runtime.nodeVersion', NODE_VERSION, asNullable(target.nodeVersion)));
    }
    if (target.machoArch !== archive.nodeArch) {
      failures.push(fail(at, 'runtime.machoArch', archive.nodeArch, asNullable(target.machoArch)));
    }
  }
  return failures;
}

/**
 * 顶层收束。**`meta` 先展开、判定后写**：任何调用方都不能靠传 `status:'ok'`
 * 把失败盖掉——`9b8142f` 拒绝的正是「失败只进 JSON、顶层照报 ok」。
 */
export function conclude(failures, meta = {}) {
  const list = Array.isArray(failures) ? failures : [];
  return {
    ...meta,
    status: list.length === 0 ? 'ok' : 'failed',
    failureCount: list.length,
    failures: list,
  };
}
