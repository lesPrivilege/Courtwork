/**
 * PI-SIDECAR-DIST-1R · 共享判定层的定向测试。
 *
 * 跑法：本仓 root `vitest.config.ts` 的 include 只收各包 `src` 下的 `.test.ts`，故本件不进
 * root `pnpm test`；与 `site/scripts` 下同类 `.test.mjs` 一个体例，走 `node --test`：
 *
 *   node --test packages/pi-lane/fixtures/sidecar-dist/scripts/probe-verdict.test.mjs
 *
 * 每个用例的形状固定为「先造一份合格观察，再只坏一处」——这样断言红的时候，
 * 红的原因唯一。合格观察本身也各有一条 `通过` 用例，防止判据宽到「什么都红」。
 */

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

// 缺口二与缺口四要真文件系统／真句柄语义，故本件也引采集侧（仍不含任何判定）。
import { killAndConfirmInto, observeAssembly } from './lib/toolkit.mjs';

import {
  CANDIDATE_IDS,
  CANONICAL_SOURCE,
  CODE_CACHE_REJECT_WARNING,
  COLDSTART_SHAPE,
  CRASH_ACK_REQUIRED,
  CRASH_DEADLINES,
  CRASH_EXPECTATIONS,
  EXPECTED_LOOP,
  EXPECTED_TOOL_NAMES,
  INVENTORY_IDS,
  NEGATIVE_CONTROL_ERROR,
  NEGATIVE_CONTROL_IDS,
  OFFICIAL_NODE_SHA256,
  PAYLOAD_SPECS,
  RUNTIME_ARCHIVES,
  SEA_STAGES,
  SIGN_MODES,
  SIGN_SUBJECT_IDS,
  assemblyLayout,
  classifyPreflight,
  conclude,
  entryOf,
  payloadText,
  verdictAbort,
  verdictAssembly,
  verdictColdstart,
  verdictCrash,
  verdictIdentity,
  verdictInventory,
  verdictNegativeControl,
  verdictReproducibility,
  verdictRuntimeSource,
  verdictSeaBuild,
  verdictSign,
  verdictStdio,
} from './lib/probe-verdict.mjs';

/** 深拷贝，保证「只坏一处」不会污染下一个用例。 */
const clone = (value) => JSON.parse(JSON.stringify(value));

const failed = (failures, hint) => {
  assert.ok(Array.isArray(failures), `${hint}：判定必须返回数组`);
  assert.ok(failures.length > 0, `${hint}：期望判红，实际零失败`);
};
const passed = (failures, hint) =>
  assert.deepEqual(failures, [], `${hint}：期望判绿，实际 ${JSON.stringify(failures)}`);

/**
 * 「红了」不等于「红得准确」。失败行本就会因某阶段 exit 非零而红，若只断言 `failed()`，
 * 换个字段坏掉照样能被那条旧红顺带满足——那是零区分力。故凡归因要紧的用例一律核具名判据。
 */
const hasCheck = (failures, check, hint) => {
  assert.ok(Array.isArray(failures), `${hint}：判定必须返回数组`);
  assert.ok(
    failures.some((failure) => failure.check === check),
    `${hint}：期望命中判据 ${check}，实际 ${JSON.stringify(failures.map((f) => f.check))}`,
  );
};

// —— 合格观察构造器 ————————————————————————————————————————————————

function goodStdio() {
  return {
    pong: { seen: true, roundTripMs: 0.42 },
    payloads: PAYLOAD_SPECS.map((spec) => {
      const text = payloadText(spec);
      const bytes = Buffer.byteLength(text, 'utf8');
      const sha = createHash('sha256').update(text, 'utf8').digest('hex');
      return { label: spec.label, sentBytes: bytes, sentSha256: sha, observedBytes: bytes, observedSha256: sha };
    }),
    session: { tools: [...EXPECTED_TOOL_NAMES], setupMs: 12.3 },
    loop: clone(EXPECTED_LOOP),
    eofExit: { code: 0, signal: null },
  };
}

const goodAbort = () => ({
  ack: { seen: true, wasRunning: true },
  ended: { stopReason: 'aborted', elapsedMs: 1180 },
  pingAfterAbort: true,
  eofExit: { code: 0, signal: null },
});

const goodCrash = () => ({
  terminations: CRASH_EXPECTATIONS.map((expectation) => ({
    kind: expectation.kind,
    // `sigterm` 是外部信号，不要求 ack；其余三类必须收到 `crashing`。
    ackSeen: CRASH_ACK_REQUIRED.includes(expectation.kind) ? true : null,
    exitCode: expectation.code,
    signal: expectation.signal,
    respawnReady: true,
    respawnEofClean: true,
    timeouts: [],
  })),
});

const goodReady = (id) => {
  const entry = entryOf(id);
  return { node: entry.expectedNode, arch: entry.expectedArch, sea: entry.expectedSea };
};

const goodNegativeControl = () => ({
  launched: false,
  exit: { code: 1, signal: null },
  errorLine: `Error: ${NEGATIVE_CONTROL_ERROR}`,
});

/** 每轮 25 枚样本逐枚留档；前三枚 `warmup:true`——只不入性能统计，仍过身份与 EOF 门。 */
const goodSamples = (id) =>
  Array.from({ length: COLDSTART_SHAPE.samples }, (_, sample) => ({
    sample,
    warmup: sample < COLDSTART_SHAPE.warmup,
    identity: goodReady(id),
    elapsedMs: 40 + sample * 0.1,
    eof: { code: 0, signal: null },
  }));

function goodColdstart() {
  // 三轮各自打乱：本判据只识别「压根没打乱」，不宣称能证明随机性。
  const orders = [
    [...CANDIDATE_IDS],
    [...CANDIDATE_IDS].reverse(),
    [CANDIDATE_IDS[3], ...CANDIDATE_IDS.filter((_, index) => index !== 3)],
  ];
  return {
    shape: { ...COLDSTART_SHAPE },
    orders,
    subjects: CANDIDATE_IDS.map((id) => ({
      id,
      rounds: [1, 2, 3].map((round) => ({
        round,
        keptSamples: COLDSTART_SHAPE.samples - COLDSTART_SHAPE.warmup,
        samples: goodSamples(id),
        identityDrift: null,
        medianMs: 40 + round,
        minMs: 38,
      })),
    })),
  };
}

/**
 * **真 SHA 形状的构造件**。R1 这里用的是 `sea-arm`/`cc-arm-1` 一类占位串，
 * 于是「判据认不认得有效 SHA」这件事在测试里根本没被问过——`f261347` blocker 3 的温床。
 * 本票起构造件一律给 64 位小写 hex，无效值只在**反例**里出现。
 */
const sha = (seed) => createHash('sha256').update(seed, 'utf8').digest('hex');
const cycleOf = (seed) => ({ exists: true, regularFile: true, bytes: 115_447_952, sha256: sha(seed) });
const canonicalEntitlements = {
  repoRelativePath:
    'packages/pi-lane/fixtures/sidecar-dist/upstream/node-v22.23.1/osx-entitlements.plist',
  bytes: 632,
  sha256: 'a0387464b93dd3d92c9f92c3d3f67713b355cc76d131f0542a69d2ca2cc6d797',
  values: {
    'com.apple.security.cs.allow-jit': true,
    'com.apple.security.cs.allow-unsigned-executable-memory': true,
    'com.apple.security.cs.disable-executable-page-protection': true,
    'com.apple.security.cs.allow-dyld-environment-variables': true,
    'com.apple.security.cs.disable-library-validation': true,
    'com.apple.security.get-task-allow': true,
  },
};

const noEntitlements = { kind: 'none', values: {} };
const canonicalActualEntitlements = () => ({
  kind: 'present',
  values: clone(canonicalEntitlements.values),
});

const streamOf = (content) => ({ bytes: Buffer.byteLength(content, 'utf8'), sha256: sha(content), content });

/**
 * R4：human 路径的构造件不再只有派生六键，而是**真实 raw stdout 形状**——
 * `codesign -d --entitlements -` 的 DER human dump 是缩进的一个根 `[Dict]` 加六组三元行，
 * `Executable=<path>` 走 stderr。判定端要从这份原文重解析，故构造件必须长成原文的样子。
 */
const FIXTURE_CWD = '/private/tmp/courtwork-sidecar-r4/packages/pi-lane/fixtures/sidecar-dist';
const OFFICIAL_NODE_PATH = `${FIXTURE_CWD}/dist/runtime/node-v22.23.1-darwin-arm64/bin/node`;
const CONTROL_NODE_PATH = `${FIXTURE_CWD}/dist/security-domain/.stage-a/control/node`;
const CONTROL_APP_PATH = `${FIXTURE_CWD}/dist/security-domain/.stage-a/control/SidecarProbe.app`;
const CANONICAL_ABS_PATH = `${FIXTURE_CWD}/upstream/node-v22.23.1/osx-entitlements.plist`;

const derHumanStdout = (keys = Object.keys(canonicalEntitlements.values)) =>
  `${['[Dict]', ...keys.flatMap((key) => [`\t[Key] ${key}`, '\t[Value]', '\t\t[Bool] true'])].join('\n')}\n`;

/** 实测形状：`codesign -d --entitlements -` 的 stderr 恰一行 `Executable=<path>` 加一个 `\n`。 */
const derHumanStderr = (target = OFFICIAL_NODE_PATH) => `Executable=${target}\n`;

const xmlPlistText = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>${Object.keys(canonicalEntitlements.values)
  .map((key) => `<key>${key}</key><true/>`)
  .join('')}</dict></plist>
`;

const officialDisplayStderr = `Executable=${OFFICIAL_NODE_PATH}
Identifier=node
Format=Mach-O thin (arm64)
CodeDirectory v=20500 size=9042 flags=0x10000(runtime) hashes=270+7 location=embedded
CDHash=59cdea89a982b05f23e756c08115bebc555ff092
Signature size=9057
Authority=Developer ID Application: Node.js Foundation (HX7739G8FX)
Authority=Developer ID Certification Authority
Authority=Apple Root CA
TeamIdentifier=HX7739G8FX
Sealed Resources=none
`;

const CONTROL_XML_ARTIFACT = `${FIXTURE_CWD}/dist/security-domain/.stage-a/control/control.xml.plist`;
const OFFICIAL_XML_ARTIFACT = `${FIXTURE_CWD}/dist/security-domain/.stage-a/official-node.xml.plist`;

/** `plutil -convert json -o -` 的输出：六键真值的紧凑 JSON。 */
const xmlJsonText = JSON.stringify(canonicalEntitlements.values);

let commandClock = 0;
const appleCommand = (argv, { stdout = '', stderr = '', exit = 0, signal = null, error = null } = {}) => {
  commandClock += 1;
  const stamp = (offset) => new Date(Date.UTC(2026, 6, 29, 0, 0, commandClock, offset)).toISOString();
  return {
    argv,
    cwd: FIXTURE_CWD,
    env: { LC_ALL: 'C' },
    startedAt: stamp(0),
    finishedAt: stamp(100),
    exit,
    signal,
    stdout: streamOf(stdout),
    stderr: streamOf(stderr),
    // production `runReceipt` 一直记着这一格；identity 不比它就不叫「逐字段相同」。
    error,
    tool: { path: argv[0], sha256: sha(argv[0]) },
  };
};

/** 一份 XML observation 的完整实物证据：raw codesign stdout + 落盘件 + 两条 plutil receipt。 */
const xmlEvidence = (command, artifactPath, lint, json) => ({
  exit: command.exit,
  bytes: command.stdout.bytes,
  sha256: command.stdout.sha256,
  values: clone(canonicalEntitlements.values),
  stderr: command.stderr.content,
  command,
  artifact: { path: artifactPath, bytes: command.stdout.bytes, sha256: command.stdout.sha256 },
  lint,
  json,
});

/**
 * 同轮八条关键观察命令 + 一条 plutil。判定端要求它们与完整 `receipt.commands` 里
 * **同一条** receipt 逐字段相同，故此处刻意让两处共享同一个对象——production 本来就共享
 * `commandReceipts` 的元素。只改其中一处副本而不改另一处，正是强反例要打的形状。
 */
function signCommandSet({ officialTarget = OFFICIAL_NODE_PATH } = {}) {
  commandClock = 0;
  const controlSign = appleCommand(
    ['/usr/bin/codesign', '--force', '--sign', '-', '--options', 'runtime', '--entitlements', CANONICAL_ABS_PATH, CONTROL_NODE_PATH],
    { stderr: `${CONTROL_NODE_PATH}: replacing existing signature\n` },
  );
  const controlVerify = appleCommand(
    ['/usr/bin/codesign', '--verify', '--strict', '--verbose=4', CONTROL_NODE_PATH],
    { stderr: `${CONTROL_NODE_PATH}: valid on disk\n${CONTROL_NODE_PATH}: satisfies its Designated Requirement\n` },
  );
  const controlXml = appleCommand(
    ['/usr/bin/codesign', '-d', '--entitlements', '-', '--xml', CONTROL_NODE_PATH],
    { stdout: xmlPlistText, stderr: `Executable=${CONTROL_NODE_PATH}\n` },
  );
  const controlXmlLint = appleCommand(['/usr/bin/plutil', '-lint', CONTROL_XML_ARTIFACT], {
    stdout: `${CONTROL_XML_ARTIFACT}: OK\n`,
  });
  const controlXmlJson = appleCommand(
    ['/usr/bin/plutil', '-convert', 'json', '-o', '-', CONTROL_XML_ARTIFACT],
    { stdout: xmlJsonText },
  );
  const canonicalLint = appleCommand(['/usr/bin/plutil', '-lint', CANONICAL_ABS_PATH], {
    stdout: `${CANONICAL_ABS_PATH}: OK\n`,
  });
  const canonicalJson = appleCommand(
    ['/usr/bin/plutil', '-convert', 'json', '-o', '-', CANONICAL_ABS_PATH],
    { stdout: xmlJsonText },
  );
  const officialVerify = appleCommand(
    ['/usr/bin/codesign', '--verify', '--strict', '--verbose=4', officialTarget],
    { stderr: `${officialTarget}: valid on disk\n${officialTarget}: satisfies its Designated Requirement\n` },
  );
  const officialDisplay = appleCommand(['/usr/bin/codesign', '-d', '--verbose=4', officialTarget], {
    stderr: officialDisplayStderr,
  });
  const spctl = appleCommand(['/usr/sbin/spctl', '-a', '-vv', CONTROL_APP_PATH], {
    exit: 3,
    stderr: `${CONTROL_APP_PATH}: rejected\n`,
  });
  const officialXml = appleCommand(
    ['/usr/bin/codesign', '-d', '--entitlements', '-', '--xml', officialTarget],
    { stdout: xmlPlistText, stderr: `Executable=${officialTarget}\n` },
  );
  const officialXmlLint = appleCommand(['/usr/bin/plutil', '-lint', OFFICIAL_XML_ARTIFACT], {
    stdout: `${OFFICIAL_XML_ARTIFACT}: OK\n`,
  });
  const officialXmlJson = appleCommand(
    ['/usr/bin/plutil', '-convert', 'json', '-o', '-', OFFICIAL_XML_ARTIFACT],
    { stdout: xmlJsonText },
  );
  const officialHuman = appleCommand(['/usr/bin/codesign', '-d', '--entitlements', '-', officialTarget], {
    stdout: derHumanStdout(),
    stderr: derHumanStderr(officialTarget),
  });
  return {
    controlSign,
    controlVerify,
    controlXml,
    controlXmlLint,
    controlXmlJson,
    canonicalLint,
    canonicalJson,
    officialVerify,
    officialDisplay,
    spctl,
    officialXml,
    officialXmlLint,
    officialXmlJson,
    officialHuman,
    all: [
      controlSign,
      controlVerify,
      controlXml,
      controlXmlLint,
      controlXmlJson,
      canonicalLint,
      canonicalJson,
      officialVerify,
      officialDisplay,
      spctl,
      officialXml,
      officialXmlLint,
      officialXmlJson,
      officialHuman,
    ],
  };
}

/** 同轮完整 host receipt 的合格形状。R3 只把 `tools`/`commands` 交给判定，这里补齐其余七项。 */
const goodHostToolReceipt = (domainId, commands) => ({
  schemaVersion: 1,
  executionDomainId: domainId,
  capturedAt: '2026-07-29T00:00:00.000Z',
  host: {
    macOSProductVersion: '26.0.1',
    macOSBuildVersion: '25A362',
    darwinRelease: '25.5.0',
    hardwareArchitecture: 'arm64',
    processArchitecture: 'arm64',
    platform: 'darwin',
  },
  harnessNode: {
    path: '/opt/homebrew/Cellar/node/22.23.1/bin/node',
    execPath: '/opt/homebrew/Cellar/node/22.23.1/bin/node',
    regularFile: true,
    symlink: false,
    bytes: 118_000_000,
    sha256: sha('harness-node'),
    version: 'v22.23.1',
    architecture: 'arm64',
  },
  developerTools: {
    xcodeSelectPath: '/Library/Developer/CommandLineTools',
    cltPackageVersion: '17.0.0.0.1.1756855105',
  },
  officialNode: {
    path: OFFICIAL_NODE_PATH,
    regularFile: true,
    symlink: false,
    bytes: 115_447_952,
    sha256: OFFICIAL_NODE_SHA256,
    expectedSha256: OFFICIAL_NODE_SHA256,
  },
  canonicalSource: { ...CANONICAL_SOURCE },
  tools: [
    { path: '/usr/bin/codesign', regularFile: true, symlink: false, bytes: 1_000_000, sha256: sha('/usr/bin/codesign'), architectures: ['arm64', 'x86_64'] },
    { path: '/usr/sbin/spctl', regularFile: true, symlink: false, bytes: 1_000_000, sha256: sha('/usr/sbin/spctl'), architectures: ['arm64', 'x86_64'] },
    { path: '/usr/bin/plutil', regularFile: true, symlink: false, bytes: 1_000_000, sha256: sha('/usr/bin/plutil'), architectures: ['arm64', 'x86_64'] },
  ],
  commands,
});

/**
 * 随包件的**唯一**预期 assembly-relative path。构造件不再自己拼字面量——
 * 缺口一的成因正是「path 只要是非空字符串就算数」，而 good fixture 自己把 `cjs` 档
 * 写成了 `sidecar.mjs`（正确是 `.cjs`），错得毫无察觉。
 */
const sealedPathOf = (variant) =>
  `route-a/aarch64-apple-darwin--${variant}/sidecar.${variant === 'cjs' ? 'cjs' : 'mjs'}`;
const seaPathOf = (triple, variant) => `route-b/${triple}--${variant}/pi-sidecar-${triple}`;

const goodReproducibility = () => ({
  cycles: 2,
  sealedBundles: ['esm-naive', 'esm-createrequire', 'cjs'].map((variant) => ({
    variant,
    path: sealedPathOf(variant),
    cycles: [cycleOf(`sealed-${variant}`), cycleOf(`sealed-${variant}`)],
    identical: true,
  })),
  seaDefault: ['aarch64-apple-darwin', 'x86_64-apple-darwin'].map((triple) => ({
    triple,
    path: seaPathOf(triple, 'default'),
    cycles: [cycleOf(`default-${triple}`), cycleOf(`default-${triple}`)],
    identical: true,
  })),
  seaCodeCache: ['aarch64-apple-darwin', 'x86_64-apple-darwin'].map((triple) => ({
    triple,
    path: seaPathOf(triple, 'code-cache'),
    cycles: [cycleOf(`cc-${triple}-1`), cycleOf(`cc-${triple}-2`)],
    identical: false,
  })),
  crossArchCodeCache: { launched: true, warningSeen: true, warning: CODE_CACHE_REJECT_WARNING },
});

/** assembly 的合格实物：顶层两条 route，其下六 + 四个目录，各含指定件。 */
function goodAssembly() {
  const layout = assemblyLayout();
  return {
    root: 'assembly',
    exists: true,
    rootType: 'dir',
    entries: [
      ...layout.dirs.map((dir) => ({ path: dir, type: 'dir' })),
      ...layout.files.map((file) => ({ path: file, type: 'file', bytes: 115_447_952 })),
    ].sort((a, b) => (a.path < b.path ? -1 : 1)),
  };
}

/** SEA 四阶段全过、逐格发布的合格观察。 */
const goodSeaBuild = () => ({
  variants: ['aarch64-apple-darwin', 'x86_64-apple-darwin'].flatMap((triple) =>
    ['default', 'code-cache'].map((variant) => ({
      triple,
      variant,
      status: 'ok',
      stage: null,
      stages: Object.fromEntries(SEA_STAGES.map((stage) => [stage, { exit: 0, stderr: '' }])),
      published: true,
      publishedPath: `assembly/route-b/${triple}--${variant}/pi-sidecar-${triple}`,
      publishDirPresent: true,
    })),
  ),
});

/**
 * 一格**真实失败**的观察：`stage` 是第一个非零阶段，该阶段有非零 exit 与非空 stderr，
 * 其后的阶段缺席（没跑），成品未发布且 publishDir 物理不存在。
 */
function seaBuildFailingAt(stage, triple = 'aarch64-apple-darwin', variant = 'default') {
  const observation = goodSeaBuild();
  const row = observation.variants.find((r) => r.triple === triple && r.variant === variant);
  const index = SEA_STAGES.indexOf(stage);
  row.status = 'failed';
  row.stage = stage;
  row.stages = Object.fromEntries(
    SEA_STAGES.slice(0, index).map((s) => [s, { exit: 0, stderr: '' }]),
  );
  row.stages[stage] = { exit: 1, stderr: `${stage}: deliberate counterexample failure` };
  row.published = false;
  row.publishedPath = null;
  row.publishDirPresent = false;
  return { observation, row };
}

const SIGN_DOMAIN_ID = 'r4-first-red';

const goodSign = () => {
  const commands = signCommandSet();
  return {
  executionDomainId: SIGN_DOMAIN_ID,
  canonical: clone(canonicalEntitlements),
  preflight: {
    status: 'ok',
    classification: 'passed',
    blockedReasons: [],
    gates: { controlLifecycleOk: true, controlSignatureOk: true, signatureOk: true, spctlOk: true },
    control: {
      signExit: 0,
      verifyExit: 0,
      sign: commands.controlSign,
      verify: commands.controlVerify,
      xml: xmlEvidence(
        commands.controlXml,
        CONTROL_XML_ARTIFACT,
        commands.controlXmlLint,
        commands.controlXmlJson,
      ),
      launch: {
        ready: true,
        eofSent: true,
        exit: { code: 0, signal: null },
        deadlines: { readyMs: 30_000, eofMs: 15_000, exitMs: 15_000, killConfirmMs: 5_000 },
        timeouts: [],
      },
    },
    officialSignature: {
      verifyExit: 0,
      displayExit: 0,
      identifier: 'node',
      cdhash: '59cdea89a982b05f23e756c08115bebc555ff092',
      teamIdentifier: 'HX7739G8FX',
      flags: '0x10000(runtime)',
      authorities: [
        'Developer ID Application: Node.js Foundation (HX7739G8FX)',
        'Developer ID Certification Authority',
        'Apple Root CA',
      ],
      verify: commands.officialVerify,
      display: commands.officialDisplay,
    },
    appGatekeeper: {
      exit: 3,
      signal: null,
      stdout: '',
      stderrFirstNonemptyLine: `${CONTROL_APP_PATH}: rejected`,
      appPath: CONTROL_APP_PATH,
      command: commands.spctl,
    },
  },
  officialEntitlements: {
    xml: xmlEvidence(
      commands.officialXml,
      OFFICIAL_XML_ARTIFACT,
      commands.officialXmlLint,
      commands.officialXmlJson,
    ),
    human: {
      command: commands.officialHuman,
      parseError: null,
      entries: Object.entries(canonicalEntitlements.values).map(([key, value]) => ({ key, value })),
      values: clone(canonicalEntitlements.values),
    },
  },
  hostToolReceipt: goodHostToolReceipt(SIGN_DOMAIN_ID, commands.all),
  resign: SIGN_SUBJECT_IDS.flatMap((subject) =>
    SIGN_MODES.map((mode) => ({
      subject,
      mode: mode.name,
      canonicalInputPath: canonicalEntitlements.repoRelativePath,
      canonicalInputSha256: canonicalEntitlements.sha256,
      signExit: 0,
      verifyExit: 0,
      flags: mode.hardened ? 'flags=0x10002(adhoc,runtime)' : 'flags=0x2(adhoc)',
      launched: mode.launches,
      actualEntitlements: mode.entitlements ? canonicalActualEntitlements() : clone(noEntitlements),
    })),
  ),
  appBundle: {
    signNestedExit: 0,
    signOuterExit: 0,
    verifyDeepStrictExit: 0,
    nestedLaunched: true,
    spctlExit: 3,
    spctlStdout: '',
    spctlStderrFirstNonemptyLine: '/private/tmp/SidecarProbe.app: rejected',
    appPath: '/private/tmp/SidecarProbe.app',
  },
  };
};

const goodRuntimeSource = () => ({
  targets: RUNTIME_ARCHIVES.map((archive) => ({
    status: 'ok',
    nodeArch: archive.nodeArch,
    name: archive.name,
    bytes: archive.bytes,
    sha256: archive.sha256,
    shasumsEntry: archive.sha256,
    tarOk: true,
    nodeVersion: 'v22.23.1',
    machoArch: archive.nodeArch,
  })),
});

// —— 零 · `f261347` 三枚验收 blocker（返修前必须先红） ————————————————
//
// 本组是 R2 的首红面。三枚全部照抄独立验收 `f261347` 坐实的**真实收束形状**，
// 不是重新发明的坏观察：验收直接调 R1 的 production 判定，各得零 failure。
// 故这三条在未改 production 的 R1 tree 上必然红（判定返回 `[]`），收紧后转绿。
//
// 第一枚（磁盘多一件）没法在纯判定层先红——R1 production 压根没有枚举磁盘的函数，
// 缺函数只会红在模块加载，那不是缺陷红。它的先红取物理实验：真往 `route-a/` 落一份
// 额外文件后跑未改的 `measure.mjs`，实测 `status=ok failures=0`（留档见报告与回执）。
// 这里补的是收紧之后该由判定层守住的那一格。

describe('零 · f261347 三枚 blocker', () => {
  it('blocker 2：R1 的收束形状（首坏后正 → identity 换成 drift 值）必须判红', () => {
    // 照抄 R1 `sampleRound` 的真实返回：`identity ??= seen` 先吃下坏的首样本，
    // `identityDrift` 记住**正确的**后续值，return 又把 `identity` 换成 drift 值——
    // 于是「首枚错」这一事实从读数里彻底消失，R1 的 `verdictColdstart` 返回 `[]`。
    // 这里喂的正是那份 R1 形状（有 `identity`、无逐枚 `samples`）：
    // R1 上零 failure（已实测），R2 上因缺逐枚样本证据而红。
    const observation = goodColdstart();
    const round = observation.subjects[0].rounds[0];
    const good = clone(round.samples[0].identity);
    delete round.samples;
    round.identity = good;
    round.identityDrift = { atSample: 0, seen: good };
    round.eofClean = true;
    failed(verdictColdstart(observation), 'blocker 2：R1 收束形状');
  });

  it('blocker 2b：首枚样本身份错、其余 24 枚正确，必须判红', () => {
    // 同一缺陷的 R2 形状表述：逐枚样本在场时，坏的那一枚不得被任何收束值洗白。
    const observation = goodColdstart();
    observation.subjects[0].rounds[0].samples[0].identity = { node: 'v20.19.0', arch: 'ppc64', sea: 'not-sea' };
    failed(verdictColdstart(observation), 'blocker 2b：首枚坏');
  });

  it('blocker 3：SEA default 两份缺失 SHA 不得算作可复现', () => {
    // `deterministic()` 只做 JavaScript 相等性：`null === null` 为真，于是
    // 「构建摘要根本没记下 executable SHA」被当成「两次字节一致」。
    const observation = goodReproducibility();
    observation.seaDefault = observation.seaDefault.map((row) => ({
      ...row,
      shas: [null, null], // R1 的字段名
      cycles: row.cycles.map((cycle) => ({ ...cycle, sha256: null })), // R2 的字段名
      identical: true,
    }));
    failed(verdictReproducibility(observation), 'blocker 3：两份 null SHA');
  });
});

// —— 零之三 · 独立审查五项缺口（返修前必须先红） ————————————————
//
// 这一组与 `f261347` 的旧五项无关，是另一轮独立审查坐实的**新**假绿面。
// 每条都先在未改 production 的树上判绿（即红），收紧后转绿；
// 有效性另由「只松掉该层判据」的 source mutation 复核，不靠整体换版。

describe('缺口一 · reproducibility 的 path 必须绑定库存项', () => {
  it('合格观察（三档扩展名正确）判绿', () =>
    passed(verdictReproducibility(goodReproducibility()), 'repro 合格'));

  it('good fixture 的 cjs 档扩展名就是 .cjs，不是 .mjs', () => {
    // 缺口一的直接成因：判据只问「path 是不是非空字符串」，于是构造件自己写错也无人察觉。
    assert.equal(sealedPathOf('cjs'), 'route-a/aarch64-apple-darwin--cjs/sidecar.cjs');
    assert.equal(sealedPathOf('esm-naive'), 'route-a/aarch64-apple-darwin--esm-naive/sidecar.mjs');
  });

  it('path 指向另一个合格 cell 判红（两枚 fingerprint 保持有效）', () => {
    const observation = goodReproducibility();
    observation.seaDefault[0].path = seaPathOf('x86_64-apple-darwin', 'default');
    failed(verdictReproducibility(observation), 'wrong-cell path');
  });

  it('sealed 档的 path 指向另一档判红', () => {
    const observation = goodReproducibility();
    observation.sealedBundles[2].path = sealedPathOf('esm-naive');
    failed(verdictReproducibility(observation), 'wrong sealed cell');
  });

  it('path 逃逸出 assembly（`../outside`）判红', () => {
    const observation = goodReproducibility();
    observation.seaDefault[0].path = '../outside/pi-sidecar-aarch64-apple-darwin';
    failed(verdictReproducibility(observation), '../outside');
  });

  it('path 扩展名错判红（.cjs 写成 .mjs）', () => {
    const observation = goodReproducibility();
    observation.sealedBundles[2].path = 'route-a/aarch64-apple-darwin--cjs/sidecar.mjs';
    failed(verdictReproducibility(observation), '错扩展名');
  });

  it('code-cache 行的 path 指向 default 判红', () => {
    const observation = goodReproducibility();
    observation.seaCodeCache[0].path = seaPathOf('aarch64-apple-darwin', 'default');
    failed(verdictReproducibility(observation), 'code-cache→default');
  });
});

describe('缺口二 · assembly 根目录本身不得是 symlink（真文件系统）', () => {
  /** 在临时目录造一棵**完整合格**的 assembly，只为把「根是不是真目录」单独拎出来测。 */
  const buildRealAssembly = (root) => {
    const layout = assemblyLayout();
    for (const dir of layout.dirs) fs.mkdirSync(path.join(root, dir), { recursive: true });
    for (const file of layout.files) fs.writeFileSync(path.join(root, file), 'x'.repeat(64));
    return root;
  };
  const withTemp = (fn) => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'r2-gap2-'));
    try {
      return fn(base);
    } finally {
      fs.rmSync(base, { recursive: true, force: true });
    }
  };

  it('真实目录根：观察记 rootType=dir 且判绿', () =>
    withTemp((base) => {
      const root = buildRealAssembly(path.join(base, 'assembly'));
      const observation = observeAssembly(root);
      assert.equal(observation.rootType, 'dir', 'rootType 必须被记录为 dir');
      passed(verdictAssembly(observation), '真实根');
    }));

  it('根是指向合格树的 symlink：必须判红（不得跟随）', () =>
    withTemp((base) => {
      // 这正是缺口二的假绿形状：树本身完全合格，只有根是符号链接。
      const real = buildRealAssembly(path.join(base, 'real-assembly'));
      const link = path.join(base, 'assembly-link');
      fs.symlinkSync(real, link);
      const observation = observeAssembly(link);
      assert.equal(observation.rootType, 'symlink', 'rootType 必须如实记为 symlink');
      assert.deepEqual(observation.entries, [], '不得跟随 symlink 根去枚举其内容');
      // 归因必须落在 rootType 本身。只断言「红了」是不够的：symlink 根的 entries 为空，
      // 光凭闭集缺件也会红——那样判定层的 rootType 门被删掉都测不出来（已由变异坐实）。
      hasCheck(verdictAssembly(observation), 'assembly.rootType', 'root symlink');
    }));

  it('判定层独立守住 rootType：symlink 根 + 完整 entries 仍判红', () => {
    // 这是「采集侧改用会跟随的 stat」时会交上来的形状：树看着完全合格，根却是链接。
    // 判定层必须自己就拦得住，不能依赖采集侧恰好返回空 entries。
    const observation = { ...goodAssembly(), rootType: 'symlink' };
    hasCheck(verdictAssembly(observation), 'assembly.rootType', 'symlink 根带完整 entries');
  });

  it('判定层对 file / fifo / null 根一律判红', () => {
    for (const rootType of ['file', 'fifo', 'socket', 'device', 'other', null]) {
      const observation = { ...goodAssembly(), rootType };
      hasCheck(verdictAssembly(observation), 'assembly.rootType', `根类型 ${rootType}`);
    }
  });

  it('根是普通文件：判红', () =>
    withTemp((base) => {
      const asFile = path.join(base, 'assembly');
      fs.writeFileSync(asFile, 'not a directory');
      const observation = observeAssembly(asFile);
      assert.equal(observation.rootType, 'file');
      failed(verdictAssembly(observation), 'root file');
    }));

  it('根不存在：判红且 rootType 为 null', () =>
    withTemp((base) => {
      const observation = observeAssembly(path.join(base, 'nope'));
      assert.equal(observation.exists, false);
      assert.equal(observation.rootType, null);
      failed(verdictAssembly(observation), 'root missing');
    }));
});

describe('缺口四 · 三条 cleanup 分支必须登记 kill-confirm 超时', () => {
  it('killAndConfirm 回 null 时把 kill-confirm 记进 timeouts', async () => {
    const timeouts = [];
    const exit = await killAndConfirmInto({ killAndConfirm: async () => null }, 5_000, timeouts);
    assert.equal(exit, null);
    assert.deepEqual(timeouts, ['kill-confirm'], '丢弃返回值＝这条永远登记不上');
  });

  it('killAndConfirm 正常收束时不记 kill-confirm', async () => {
    const timeouts = [];
    const exit = await killAndConfirmInto(
      { killAndConfirm: async () => ({ code: null, signal: 'SIGKILL' }) },
      5_000,
      timeouts,
    );
    assert.deepEqual(exit, { code: null, signal: 'SIGKILL' });
    assert.deepEqual(timeouts, [], '正常收束不该留超时记录');
  });

  it('已有超时时 kill-confirm 追加而非顶替', async () => {
    const timeouts = ['exit'];
    await killAndConfirmInto({ killAndConfirm: async () => null }, 5_000, timeouts);
    assert.deepEqual(timeouts, ['exit', 'kill-confirm']);
  });

  // 三条分支各自的可观察组合——判定层必须把它们都判红。
  for (const combo of [
    ['ready', 'kill-confirm'],
    ['respawn-eof', 'kill-confirm'],
    ['respawn-ready', 'kill-confirm'],
  ]) {
    it(`组合 ${combo.join(' + ')} 判红`, () => {
      const observation = goodCrash();
      observation.terminations[0].timeouts = [...combo];
      failed(verdictCrash(CANDIDATE_IDS[0], observation), combo.join('+'));
    });
  }
});

describe('缺口三 · cold-start 逐枚样本身份必须完整', () => {
  it('合格 600 样本形状判绿', () => passed(verdictColdstart(goodColdstart()), 'coldstart 合格'));

  it('复制 sample:0 顶替 sample:1，总数仍 25，判红', () => {
    const observation = goodColdstart();
    const samples = observation.subjects[0].rounds[0].samples;
    samples[1] = clone(samples[0]); // ordinal 重复，长度不变
    failed(verdictColdstart(observation), '重复 ordinal');
  });

  it('ordinal 越界判红', () => {
    const observation = goodColdstart();
    observation.subjects[0].rounds[0].samples[5].sample = 99;
    failed(verdictColdstart(observation), '越界 ordinal');
  });

  it('ordinal 与数组位置不符判红（整轮乱序）', () => {
    const observation = goodColdstart();
    observation.subjects[0].rounds[0].samples.reverse();
    failed(verdictColdstart(observation), 'ordinal 顺序');
  });

  it('warmup 挪到第 10–12 枚、前三枚改 false，总数仍 3，判红', () => {
    const observation = goodColdstart();
    const samples = observation.subjects[0].rounds[0].samples;
    for (const index of [0, 1, 2]) samples[index].warmup = false;
    for (const index of [10, 11, 12]) samples[index].warmup = true;
    failed(verdictColdstart(observation), 'warmup 位置错但数量对');
  });

  it('keptSamples 与非 warmup 实际计数不符判红', () => {
    const observation = goodColdstart();
    const round = observation.subjects[0].rounds[0];
    round.samples[5].warmup = true; // 非 warmup 实际变 21，keptSamples 仍写 22
    failed(verdictColdstart(observation), 'keptSamples 不自洽');
  });

  it('三个 round 都标成 round:1 判红', () => {
    const observation = goodColdstart();
    for (const round of observation.subjects[0].rounds) round.round = 1;
    failed(verdictColdstart(observation), '重复 round');
  });

  it('round 序号跳号判红', () => {
    const observation = goodColdstart();
    observation.subjects[0].rounds[2].round = 5;
    failed(verdictColdstart(observation), 'round 跳号');
  });
});

describe('缺口五 · SEA 失败证据必须红得准确', () => {
  it('四格全成功判绿', () => passed(verdictSeaBuild(goodSeaBuild()), 'SEA 合格'));

  for (const stage of SEA_STAGES) {
    it(`${stage} 真实失败的完整形状判红且可归因`, () => {
      const { observation } = seaBuildFailingAt(stage);
      const failures = verdictSeaBuild(observation);
      failed(failures, `${stage} 失败`);
    });
  }

  it('成功行缺 publishedPath 判红', () => {
    const observation = goodSeaBuild();
    observation.variants[0].publishedPath = null;
    failed(verdictSeaBuild(observation), '成功行无 publishedPath');
  });

  it('成功行 publishedPath 指向 assembly 外必须判红', () => {
    const observation = goodSeaBuild();
    observation.variants[0].publishedPath = '../bogus';
    hasCheck(verdictSeaBuild(observation), 'seaBuild.publishedPath', '成功行 path 逃逸');
  });

  it('成功行 status 不是 ok 判红', () => {
    const observation = goodSeaBuild();
    observation.variants[0].status = 'failed';
    failed(verdictSeaBuild(observation), '成功行 status 错');
  });

  it('成功行 publishDir 物理不在判红', () => {
    const observation = goodSeaBuild();
    observation.variants[0].publishDirPresent = false;
    failed(verdictSeaBuild(observation), '成功行无成品目录');
  });

  // 以下七条**必须逐条核归因**：失败行本来就因「某阶段 exit 非零」而红，
  // 只断言 `failed()` 会被那条红顺带满足，等于没测。故一律核具名判据是否出现。
  it('失败行的 stage 写成 bogus，须由 seaBuild.stage 抓住', () => {
    const { observation, row } = seaBuildFailingAt('sign');
    row.stage = 'bogus';
    hasCheck(verdictSeaBuild(observation), 'seaBuild.stage', 'stage=bogus');
  });

  it('失败行的 stage 指向实际 exit 0 的阶段，须由 seaBuild.stage 抓住', () => {
    const { observation, row } = seaBuildFailingAt('sign');
    row.stage = 'postject'; // postject 实际 exit 0
    hasCheck(verdictSeaBuild(observation), 'seaBuild.stage', 'stage 指错');
  });

  it('失败阶段的 stderr 被清空，须由 seaBuild.stageStderr 抓住', () => {
    const { observation, row } = seaBuildFailingAt('verifyStrict');
    row.stages.verifyStrict.stderr = '';
    hasCheck(verdictSeaBuild(observation), 'seaBuild.stageStderr', '空 stderr');
  });

  it('失败行 status 仍写 ok，须由 seaBuild.status 抓住', () => {
    const { observation, row } = seaBuildFailingAt('postject');
    row.status = 'ok';
    hasCheck(verdictSeaBuild(observation), 'seaBuild.status', '失败行 status=ok');
  });

  it('失败行仍带 publishedPath，须由 seaBuild.publishedPath 抓住', () => {
    const { observation, row } = seaBuildFailingAt('sign');
    row.publishedPath = 'assembly/route-b/aarch64-apple-darwin--default/pi-sidecar-aarch64-apple-darwin';
    hasCheck(verdictSeaBuild(observation), 'seaBuild.publishedPath', '失败行有 publishedPath');
  });

  it('失败后 publishDir 物理仍在，须由 seaBuild.publishDirPresent 抓住', () => {
    const { observation, row } = seaBuildFailingAt('verifyStrict');
    row.publishDirPresent = true;
    hasCheck(verdictSeaBuild(observation), 'seaBuild.publishDirPresent', 'stale publishDir');
  });

  it('失败阶段之后的阶段冒充已成功运行，须由 seaBuild.laterStage 抓住', () => {
    const { observation, row } = seaBuildFailingAt('postject');
    row.stages.sign = { exit: 0, stderr: '' };
    row.stages.verifyStrict = { exit: 0, stderr: '' };
    hasCheck(verdictSeaBuild(observation), 'seaBuild.laterStage', '后续阶段冒充成功');
  });

  it('四枚真实失败各自归因到自己那一阶段，不串味', () => {
    for (const stage of SEA_STAGES) {
      const { observation } = seaBuildFailingAt(stage);
      const failures = verdictSeaBuild(observation);
      hasCheck(failures, `seaBuild.${stage}`, `${stage} 归因`);
      for (const other of SEA_STAGES.filter((s) => s !== stage)) {
        assert.ok(
          !failures.some((f) => f.check === `seaBuild.${other}`),
          `${stage} 失败不该同时报 seaBuild.${other}：${JSON.stringify(failures.map((f) => f.check))}`,
        );
      }
    }
  });

  it('失败阶段之后的阶段缺席是允许的（不得因缺席而误判绿或误判红原因）', () => {
    const { observation } = seaBuildFailingAt('removeSignature');
    const failures = verdictSeaBuild(observation);
    failed(failures, 'removeSignature 失败');
    // 归因必须落在该阶段本身，而不是「后面三个阶段缺了」。
    assert.ok(
      failures.some((f) => f.check.includes('removeSignature')),
      `归因须指向 removeSignature，实际 ${JSON.stringify(failures.map((f) => f.check))}`,
    );
  });
});

// —— 零之二 · 物理 assembly 闭集（blocker 1 的收紧面） ————————————————

describe('assembly 实物闭集', () => {
  it('顶层恰两条 route、其下六 + 四目录、各含指定件即通过', () =>
    passed(verdictAssembly(goodAssembly()), 'assembly 合格'));

  it('形状恰为 12 目录 + 16 文件', () => {
    const layout = assemblyLayout();
    assert.equal(layout.dirs.length, 12); // route-a、route-b + 六 + 四
    assert.equal(layout.dirs.filter((dir) => dir.startsWith('route-a/')).length, 6);
    assert.equal(layout.dirs.filter((dir) => dir.startsWith('route-b/')).length, 4);
    assert.equal(layout.files.filter((file) => file.startsWith('route-a/')).length, 12); // 六目录 × 两件
    assert.equal(layout.files.filter((file) => file.startsWith('route-b/')).length, 4); // 四目录 × 一件
  });

  it('assembly 不存在判红', () => failed(verdictAssembly({ exists: false, entries: [] }), '无 assembly'));

  // 这一条就是 `f261347` blocker 1 的实物形状：真多出一份文件。
  it('多出一份实际文件判红', () => {
    const observation = goodAssembly();
    observation.entries.push({ path: 'route-a/unexpected-physical', type: 'dir' });
    observation.entries.push({ path: 'route-a/unexpected-physical/proof.txt', type: 'file', bytes: 100 });
    failed(verdictAssembly(observation), '多一件实物');
  });

  it('随包目录里多出构建中间件判红（R1 正是把六档 bundle 摊在 route-a 顶层）', () => {
    const observation = goodAssembly();
    observation.entries.push({ path: 'route-a/sidecar.esm-naive.mjs', type: 'file', bytes: 861_171 });
    failed(verdictAssembly(observation), '中间件混入');
  });

  it('少一份预期文件判红', () => {
    const observation = goodAssembly();
    observation.entries = observation.entries.filter(
      (entry) => entry.path !== 'route-b/aarch64-apple-darwin--default/pi-sidecar-aarch64-apple-darwin',
    );
    failed(verdictAssembly(observation), '缺一件');
  });

  it('少一个 variant 目录判红', () => {
    const observation = goodAssembly();
    observation.entries = observation.entries.filter((entry) => !entry.path.startsWith('route-b/x86_64-apple-darwin--code-cache'));
    failed(verdictAssembly(observation), '缺一目录');
  });

  it('预期文件其实是 symlink 判红', () => {
    const observation = goodAssembly();
    const row = observation.entries.find((entry) => entry.path.endsWith('route-b/aarch64-apple-darwin--default/pi-sidecar-aarch64-apple-darwin'));
    row.type = 'symlink';
    delete row.bytes;
    failed(verdictAssembly(observation), 'symlink 冒充');
  });

  it('预期文件其实是目录判红', () => {
    const observation = goodAssembly();
    const row = observation.entries.find((entry) => entry.path.endsWith('/sidecar.cjs'));
    row.type = 'dir';
    failed(verdictAssembly(observation), '目录冒充文件');
  });

  it('socket / FIFO 混入判红', () => {
    for (const type of ['socket', 'fifo', 'device', 'other']) {
      const observation = goodAssembly();
      observation.entries.push({ path: `route-b/${type}-node`, type });
      failed(verdictAssembly(observation), `${type} 混入`);
    }
  });

  it('零字节成品判红', () => {
    const observation = goodAssembly();
    observation.entries.find((entry) => entry.type === 'file').bytes = 0;
    failed(verdictAssembly(observation), '零字节成品');
  });

  it('错 basename 判红（同数不同名）', () => {
    const observation = goodAssembly();
    const row = observation.entries.find((entry) => entry.path.endsWith('route-b/x86_64-apple-darwin--default/pi-sidecar-x86_64-apple-darwin'));
    row.path = 'route-b/x86_64-apple-darwin--default/pi-sidecar';
    failed(verdictAssembly(observation), '错 basename');
  });

  it('顶层多出第三条 route 判红', () => {
    const observation = goodAssembly();
    observation.entries.push({ path: 'route-c', type: 'dir' });
    failed(verdictAssembly(observation), '第三条 route');
  });
});

// —— 零之三 · SEA 四阶段与原子发布 ————————————————————————————————

describe('SEA 四阶段发布', () => {
  it('四阶段全 0 且逐格发布即通过', () => passed(verdictSeaBuild(goodSeaBuild()), 'SEA 合格'));

  for (const stage of SEA_STAGES) {
    it(`${stage} 非零判红`, () => {
      const observation = goodSeaBuild();
      observation.variants[0].stages[stage] = { exit: 1, stderr: 'boom' };
      observation.variants[0].published = false;
      failed(verdictSeaBuild(observation), `${stage} 失败`);
    });
  }

  it('阶段失败却仍发布判红（stale artifact）', () => {
    const observation = goodSeaBuild();
    observation.variants[0].stages.verifyStrict = { exit: 1, stderr: 'invalid signature' };
    observation.variants[0].published = true;
    failed(verdictSeaBuild(observation), 'stale artifact');
  });

  it('四阶段全过但没发布判红', () => {
    const observation = goodSeaBuild();
    observation.variants[1].published = false;
    failed(verdictSeaBuild(observation), '未发布');
  });

  it('缺一格判红', () => {
    const observation = goodSeaBuild();
    observation.variants.pop();
    failed(verdictSeaBuild(observation), '缺格');
  });

  it('缺阶段记录判红（收了退出码才算数）', () => {
    const observation = goodSeaBuild();
    delete observation.variants[0].stages.sign;
    failed(verdictSeaBuild(observation), '缺阶段');
  });

  it('runtime 缺失导致的 blocked 行判红', () => {
    const observation = goodSeaBuild();
    observation.variants[0] = { triple: 'aarch64-apple-darwin', status: 'blocked', reason: 'runtime-missing' };
    failed(verdictSeaBuild(observation), 'blocked 行');
  });
});

// —— 一 · 库存闭集 ——————————————————————————————————————————————————

describe('库存闭集恰十件', () => {
  it('十件齐全即通过', () => passed(verdictInventory([...INVENTORY_IDS]), '完整库存'));

  it('恰为两架构 × （sealed 三档 + SEA 两档）', () => {
    assert.equal(INVENTORY_IDS.length, 10);
    assert.equal(CANDIDATE_IDS.length, 8);
    assert.equal(NEGATIVE_CONTROL_IDS.length, 2);
    assert.deepEqual(
      NEGATIVE_CONTROL_IDS,
      ['a/aarch64-apple-darwin/esm-naive', 'a/x86_64-apple-darwin/esm-naive'],
    );
  });

  it('少一件判红', () => failed(verdictInventory(INVENTORY_IDS.slice(1)), '缺产物'));

  it('多一件判红', () => failed(verdictInventory([...INVENTORY_IDS, 'a/aarch64-apple-darwin/wasm']), '多产物'));

  it('重复一件判红', () => failed(verdictInventory([...INVENTORY_IDS, INVENTORY_IDS[0]]), '重复产物'));

  it('数目对但换了名字仍判红', () => {
    const swapped = [...INVENTORY_IDS];
    swapped[0] = 'a/aarch64-apple-darwin/esm-naive-2';
    failed(verdictInventory(swapped), '同数错名');
  });
});

// —— 二 · 负控 ————————————————————————————————————————————————————

describe('两枚 esm-naive 负控', () => {
  const id = NEGATIVE_CONTROL_IDS[0];

  it('以既知 dynamic-require 非零失败即通过', () =>
    passed(verdictNegativeControl(id, goodNegativeControl()), '负控如期失败'));

  it('负控竟然启动成功要判红', () => {
    const observation = { ...goodNegativeControl(), launched: true };
    failed(verdictNegativeControl(id, observation), '负控启动');
  });

  it('负控以退出码 0 结束要判红', () => {
    const observation = goodNegativeControl();
    observation.exit.code = 0;
    failed(verdictNegativeControl(id, observation), '负控退出 0');
  });

  it('负控失败原因不是 dynamic require 要判红', () => {
    const observation = goodNegativeControl();
    observation.errorLine = 'Error: something else entirely';
    failed(verdictNegativeControl(id, observation), '负控换因');
  });

  it('负控没留下失败原因要判红', () => {
    const observation = goodNegativeControl();
    observation.errorLine = null;
    failed(verdictNegativeControl(id, observation), '负控无因');
  });
});

// —— 三 · 身份三元组 ——————————————————————————————————————————————

describe('候选身份三元组', () => {
  const id = CANDIDATE_IDS.find((candidate) => candidate.startsWith('b/'));

  it('版本/架构/SEA 相符即通过', () => passed(verdictIdentity(id, goodReady(id)), '身份相符'));

  it('Node 版本错判红', () => failed(verdictIdentity(id, { ...goodReady(id), node: 'v20.19.0' }), '版本错'));
  it('架构错判红', () => failed(verdictIdentity(id, { ...goodReady(id), arch: 'x64' }), '架构错'));
  it('SEA 身份错判红', () => failed(verdictIdentity(id, { ...goodReady(id), sea: 'not-sea' }), 'SEA 错'));

  it('路线甲必须自证 not-sea', () => {
    const sealed = CANDIDATE_IDS.find((candidate) => candidate.startsWith('a/'));
    passed(verdictIdentity(sealed, goodReady(sealed)), '甲 not-sea');
    failed(verdictIdentity(sealed, { ...goodReady(sealed), sea: 'sea' }), '甲误报 sea');
  });

  it('缺 ready 判红', () => failed(verdictIdentity(id, null), '无 ready'));
});

// —— 四 · stdio / loop / EOF ——————————————————————————————————————

describe('stdio、真实 loop 与 EOF', () => {
  const id = CANDIDATE_IDS[0];

  it('全项相符即通过', () => passed(verdictStdio(id, goodStdio()), 'stdio 合格'));

  it('pong 未收到判红', () => {
    const observation = goodStdio();
    observation.pong = { seen: false, roundTripMs: null };
    failed(verdictStdio(id, observation), '无 pong');
  });

  it('payload 少一类判红', () => {
    const observation = goodStdio();
    observation.payloads.pop();
    failed(verdictStdio(id, observation), 'payload 缺类');
  });

  for (const spec of PAYLOAD_SPECS) {
    it(`payload ${spec.label} 字节数不符判红`, () => {
      const observation = goodStdio();
      const row = observation.payloads.find((payload) => payload.label === spec.label);
      row.observedBytes -= 1;
      failed(verdictStdio(id, observation), `${spec.label} 字节`);
    });

    it(`payload ${spec.label} sha256 不符判红`, () => {
      const observation = goodStdio();
      const row = observation.payloads.find((payload) => payload.label === spec.label);
      row.observedSha256 = 'deadbeef'.repeat(8);
      failed(verdictStdio(id, observation), `${spec.label} 哈希`);
    });
  }

  it('工具表少一项判红', () => {
    const observation = goodStdio();
    observation.session.tools = ['read', 'grep'];
    failed(verdictStdio(id, observation), '工具缺项');
  });

  it('工具表多一项判红', () => {
    const observation = goodStdio();
    observation.session.tools = [...EXPECTED_TOOL_NAMES, 'write'];
    failed(verdictStdio(id, observation), '工具多项');
  });

  it('工具表次序不同判红（exact 表，非集合）', () => {
    const observation = goodStdio();
    observation.session.tools = ['grep', 'read', 'glob'];
    failed(verdictStdio(id, observation), '工具乱序');
  });

  it('loop 没执行 read 判红', () => {
    const observation = goodStdio();
    observation.loop.toolsExecuted = [];
    failed(verdictStdio(id, observation), 'loop 无工具');
  });

  it('loop 回合数不是 2 判红', () => {
    const observation = goodStdio();
    observation.loop.turns = 1;
    failed(verdictStdio(id, observation), 'loop 回合');
  });

  it('loop 末条不是 assistant 判红', () => {
    const observation = goodStdio();
    observation.loop.lastRole = 'user';
    failed(verdictStdio(id, observation), 'loop 末角色');
  });

  it('loop 整段缺失判红', () => {
    const observation = goodStdio();
    observation.loop = null;
    failed(verdictStdio(id, observation), 'loop 缺失');
  });

  it('EOF 退出码非 0 判红', () => {
    const observation = goodStdio();
    observation.eofExit = { code: 9, signal: null };
    failed(verdictStdio(id, observation), 'EOF 非零');
  });

  it('EOF 走信号而非干净退出判红', () => {
    const observation = goodStdio();
    observation.eofExit = { code: null, signal: 'SIGKILL' };
    failed(verdictStdio(id, observation), 'EOF 信号');
  });
});

// —— 五 · abort 四岔 ————————————————————————————————————————————

describe('abort 的四条判据', () => {
  const id = CANDIDATE_IDS[0];

  it('ack + aborted + 存活 + 干净 EOF 即通过', () => passed(verdictAbort(id, goodAbort()), 'abort 合格'));

  it('没收到 aborted ack 判红', () => {
    const observation = goodAbort();
    observation.ack = { seen: false, wasRunning: null };
    failed(verdictAbort(id, observation), '无 ack');
  });

  it('ack 的 wasRunning 为 false 判红（打的不是在途回合）', () => {
    const observation = goodAbort();
    observation.ack.wasRunning = false;
    failed(verdictAbort(id, observation), 'wasRunning false');
  });

  it('慢流没有以 aborted 收束判红', () => {
    const observation = goodAbort();
    observation.ended.stopReason = 'endTurn';
    failed(verdictAbort(id, observation), 'stopReason 非 aborted');
  });

  it('慢流压根没收束判红', () => {
    const observation = goodAbort();
    observation.ended = null;
    failed(verdictAbort(id, observation), '无 slow-ended');
  });

  it('abort 后进程不再应答判红', () => {
    const observation = goodAbort();
    observation.pingAfterAbort = false;
    failed(verdictAbort(id, observation), 'abort 打死进程');
  });

  it('abort 后 EOF 非 0 判红', () => {
    const observation = goodAbort();
    observation.eofExit = { code: 1, signal: null };
    failed(verdictAbort(id, observation), 'abort 后 EOF');
  });
});

// —— 六 · 四类崩溃 ——————————————————————————————————————————————

describe('四类崩溃的 exact code/signal 与逐类复启', () => {
  const id = CANDIDATE_IDS[0];

  it('四类各自 exact 且逐类复启即通过', () => passed(verdictCrash(id, goodCrash()), 'crash 合格'));

  for (const expectation of CRASH_EXPECTATIONS) {
    it(`${expectation.kind} 的退出码错判红`, () => {
      const observation = goodCrash();
      const row = observation.terminations.find((entry) => entry.kind === expectation.kind);
      row.exitCode = expectation.code === null ? 0 : expectation.code + 1;
      row.signal = null;
      failed(verdictCrash(id, observation), `${expectation.kind} code`);
    });

    it(`${expectation.kind} 的信号错判红`, () => {
      const observation = goodCrash();
      const row = observation.terminations.find((entry) => entry.kind === expectation.kind);
      row.signal = expectation.signal === 'SIGKILL' ? 'SIGTERM' : 'SIGKILL';
      row.exitCode = null;
      failed(verdictCrash(id, observation), `${expectation.kind} signal`);
    });

    it(`${expectation.kind} 之后复启不 ready 判红`, () => {
      const observation = goodCrash();
      observation.terminations.find((entry) => entry.kind === expectation.kind).respawnReady = false;
      failed(verdictCrash(id, observation), `${expectation.kind} 复启`);
    });
  }

  it('少注入一类判红', () => {
    const observation = goodCrash();
    observation.terminations.pop();
    failed(verdictCrash(id, observation), '崩溃缺类');
  });

  it('hang 用退出码而非 SIGKILL 收束判红', () => {
    const observation = goodCrash();
    const row = observation.terminations.find((entry) => entry.kind === 'hang');
    row.signal = null;
    row.exitCode = 0;
    failed(verdictCrash(id, observation), 'hang 非 SIGKILL');
  });

  // —— R2：每一步等待都有上界。`f261347` 的失败闭口之二。
  it('具名 deadline 恰为票面冻结的五个数', () => {
    assert.deepEqual(CRASH_DEADLINES, {
      ackMs: 15_000,
      exitMs: 15_000,
      respawnReadyMs: 30_000,
      respawnEofMs: 15_000,
      killConfirmMs: 5_000,
    });
    assert.deepEqual(CRASH_ACK_REQUIRED, ['throw', 'exit', 'hang']);
  });

  for (const timeout of ['ack', 'exit', 'respawn-ready', 'respawn-eof', 'kill-confirm']) {
    it(`${timeout} 超时判红`, () => {
      const observation = goodCrash();
      observation.terminations[0].timeouts = [timeout];
      failed(verdictCrash(id, observation), `${timeout} 超时`);
    });
  }

  for (const kind of CRASH_ACK_REQUIRED) {
    it(`${kind} 没收到 crashing ack 判红`, () => {
      const observation = goodCrash();
      observation.terminations.find((entry) => entry.kind === kind).ackSeen = false;
      failed(verdictCrash(id, observation), `${kind} 无 ack`);
    });
  }

  it('sigterm 不要求 ack（外部信号，ackSeen 为 null 也通过）', () => {
    const observation = goodCrash();
    observation.terminations.find((entry) => entry.kind === 'sigterm').ackSeen = null;
    passed(verdictCrash(id, observation), 'sigterm 无需 ack');
  });

  it('复启后 EOF 不干净判红', () => {
    const observation = goodCrash();
    observation.terminations[1].respawnEofClean = false;
    failed(verdictCrash(id, observation), '复启 EOF');
  });

  it('挂死子进程的形状整体判红（既无 ack 也无退出码，且带超时）', () => {
    const observation = goodCrash();
    observation.terminations = observation.terminations.map((row) => ({
      ...row,
      ackSeen: false,
      exitCode: null,
      signal: null,
      respawnEofClean: false,
      timeouts: ['ack', 'exit'],
    }));
    failed(verdictCrash(id, observation), '挂死形状');
  });
});

// —— 七 · 三轮随机化冷启 ————————————————————————————————————————

describe('冷启三轮 × 25 样本、逐轮随机化', () => {
  it('形状与身份齐备即通过', () => passed(verdictColdstart(goodColdstart()), '冷启合格'));

  it('轮数不足判红', () => {
    const observation = goodColdstart();
    observation.shape.rounds = 1;
    observation.orders = observation.orders.slice(0, 1);
    for (const subject of observation.subjects) subject.rounds = subject.rounds.slice(0, 1);
    failed(verdictColdstart(observation), '少轮');
  });

  it('样本不足判红', () => {
    const observation = goodColdstart();
    observation.shape.samples = 10;
    for (const subject of observation.subjects) {
      for (const round of subject.rounds) round.keptSamples = 7;
    }
    failed(verdictColdstart(observation), '少样本');
  });

  it('单轮少留样本判红', () => {
    const observation = goodColdstart();
    observation.subjects[0].rounds[1].keptSamples -= 1;
    failed(verdictColdstart(observation), '单轮少样本');
  });

  it('候选少一枚判红（不是八枚）', () => {
    const observation = goodColdstart();
    observation.subjects.pop();
    observation.orders = observation.orders.map((order) => order.slice(0, -1));
    failed(verdictColdstart(observation), '候选缺枚');
  });

  it('把负控混进冷启判红', () => {
    const observation = goodColdstart();
    observation.subjects.push({
      id: NEGATIVE_CONTROL_IDS[0],
      rounds: observation.subjects[0].rounds.map((round) => clone(round)),
    });
    observation.orders = observation.orders.map((order) => [...order, NEGATIVE_CONTROL_IDS[0]]);
    failed(verdictColdstart(observation), '负控混入');
  });

  it('未记录逐轮顺序判红', () => {
    const observation = goodColdstart();
    observation.orders = [];
    failed(verdictColdstart(observation), '无顺序');
  });

  it('三轮顺序完全相同判红（未打乱）', () => {
    const observation = goodColdstart();
    observation.orders = [[...CANDIDATE_IDS], [...CANDIDATE_IDS], [...CANDIDATE_IDS]];
    failed(verdictColdstart(observation), '未打乱');
  });

  it('某轮顺序不是八候选的排列判红', () => {
    const observation = goodColdstart();
    observation.orders[1] = [...CANDIDATE_IDS.slice(0, 7), CANDIDATE_IDS[0]];
    failed(verdictColdstart(observation), '顺序非排列');
  });

  it('取样中身份漂移判红', () => {
    const observation = goodColdstart();
    observation.subjects[2].rounds[0].samples[6].identity.node = 'v20.19.0';
    failed(verdictColdstart(observation), '冷启身份');
  });

  it('异常 EOF 判红', () => {
    const observation = goodColdstart();
    observation.subjects[1].rounds[2].samples[11].eof = { code: 3, signal: null };
    failed(verdictColdstart(observation), '冷启 EOF');
  });

  // —— R2：逐枚样本才是证据，首/尾/warmup 一律不豁免。
  it('每轮必须留满 25 枚样本', () => {
    const observation = goodColdstart();
    observation.subjects[0].rounds[0].samples.pop();
    failed(verdictColdstart(observation), '样本缺一枚');
  });

  it('压根没留样本判红（不得只交一个收束值）', () => {
    const observation = goodColdstart();
    delete observation.subjects[0].rounds[0].samples;
    failed(verdictColdstart(observation), '无逐枚样本');
  });

  it('首枚样本身份错判红', () => {
    const observation = goodColdstart();
    observation.subjects[0].rounds[0].samples[0].identity = { node: 'v20.19.0', arch: 'ppc64', sea: 'not-sea' };
    failed(verdictColdstart(observation), '首枚身份');
  });

  it('末枚样本身份错判红', () => {
    const observation = goodColdstart();
    observation.subjects[0].rounds[0].samples.at(-1).identity = { node: 'v20.19.0', arch: 'ppc64', sea: 'not-sea' };
    failed(verdictColdstart(observation), '末枚身份');
  });

  it('warmup 样本身份错同样判红（只从统计排除，不从安全门排除）', () => {
    const observation = goodColdstart();
    observation.subjects[0].rounds[0].samples[COLDSTART_SHAPE.warmup - 1].identity.arch = 'ppc64';
    failed(verdictColdstart(observation), 'warmup 身份');
  });

  it('warmup 样本 EOF 异常同样判红', () => {
    const observation = goodColdstart();
    observation.subjects[0].rounds[0].samples[0].eof = { code: null, signal: 'SIGSEGV' };
    failed(verdictColdstart(observation), 'warmup EOF');
  });

  it('warmup 枚数不符判红', () => {
    const observation = goodColdstart();
    for (const sample of observation.subjects[0].rounds[0].samples) sample.warmup = false;
    failed(verdictColdstart(observation), 'warmup 枚数');
  });

  it('记下了 identityDrift 即判红（记了不等于交代过）', () => {
    const observation = goodColdstart();
    observation.subjects[0].rounds[0].identityDrift = { atSample: 7, seen: { node: 'v20.19.0', arch: 'arm64', sea: 'not-sea' } };
    failed(verdictColdstart(observation), 'drift 存在');
  });

  it('样本耗时缺失判红', () => {
    const observation = goodColdstart();
    observation.subjects[0].rounds[0].samples[5].elapsedMs = null;
    failed(verdictColdstart(observation), '无耗时');
  });

  it('整轮失败判红', () => {
    const observation = goodColdstart();
    observation.subjects[0].rounds[0] = { round: 1, failed: { atSample: 4, stderrTail: ['boom'] } };
    failed(verdictColdstart(observation), '冷启轮失败');
  });
});

// —— 八 · 双 cycle 可复现性 ————————————————————————————————————

describe('两次空目录重建的可复现性', () => {
  it('sealed/default 一致、code-cache 不一致、跨架构 warning 在，即通过', () =>
    passed(verdictReproducibility(goodReproducibility()), '可复现合格'));

  it('只跑一个 cycle 判红', () => {
    const observation = goodReproducibility();
    observation.cycles = 1;
    failed(verdictReproducibility(observation), '单 cycle');
  });

  it('sealed minified bundle 两次不一致判红', () => {
    const observation = goodReproducibility();
    observation.sealedBundles[2].cycles[1].sha256 = sha('cjs-drifted');
    observation.sealedBundles[2].identical = false;
    failed(verdictReproducibility(observation), 'sealed 漂移');
  });

  it('SEA default 两次不一致判红', () => {
    const observation = goodReproducibility();
    observation.seaDefault[0].cycles[1].sha256 = sha('default-drifted');
    observation.seaDefault[0].identical = false;
    failed(verdictReproducibility(observation), 'default 漂移');
  });

  it('code-cache 竟然可复现要判红（误报，非静默通过）', () => {
    const observation = goodReproducibility();
    observation.seaCodeCache[0].cycles[1].sha256 = observation.seaCodeCache[0].cycles[0].sha256;
    observation.seaCodeCache[0].identical = true;
    failed(verdictReproducibility(observation), 'code-cache 误报');
  });

  // —— R2：先证明读数有效，再谈相等。以下八条在 R1 全部静默通过。
  it('两份 SHA 皆 null 不得算可复现', () => {
    const observation = goodReproducibility();
    for (const row of observation.seaDefault) row.cycles = row.cycles.map((cycle) => ({ ...cycle, sha256: null }));
    failed(verdictReproducibility(observation), 'null SHA');
  });

  it('两份 SHA 皆空串不得算可复现', () => {
    const observation = goodReproducibility();
    for (const cycle of observation.seaDefault[0].cycles) cycle.sha256 = '';
    failed(verdictReproducibility(observation), '空串 SHA');
  });

  it('占位串（sea-arm 一类）不是有效 SHA', () => {
    const observation = goodReproducibility();
    for (const cycle of observation.seaDefault[0].cycles) cycle.sha256 = 'sea-arm';
    failed(verdictReproducibility(observation), '占位 SHA');
  });

  it('大写 hex 不是本判据认的形态', () => {
    const observation = goodReproducibility();
    for (const cycle of observation.seaDefault[0].cycles) cycle.sha256 = cycle.sha256.toUpperCase();
    failed(verdictReproducibility(observation), '大写 SHA');
  });

  it('截断的 hex 判红', () => {
    const observation = goodReproducibility();
    for (const cycle of observation.seaDefault[0].cycles) cycle.sha256 = cycle.sha256.slice(0, 63);
    failed(verdictReproducibility(observation), '截断 SHA');
  });

  it('文件不存在判红（SHA 相等也不算数）', () => {
    const observation = goodReproducibility();
    for (const cycle of observation.seaDefault[0].cycles) cycle.exists = false;
    failed(verdictReproducibility(observation), '缺件');
  });

  it('不是 regular file 判红（目录冒充成品）', () => {
    const observation = goodReproducibility();
    for (const cycle of observation.seaDefault[0].cycles) cycle.regularFile = false;
    failed(verdictReproducibility(observation), '非 regular');
  });

  it('零字节成品判红', () => {
    const observation = goodReproducibility();
    for (const cycle of observation.seaDefault[0].cycles) cycle.bytes = 0;
    failed(verdictReproducibility(observation), '零字节');
  });

  it('未记录 assembly 内相对路径判红', () => {
    const observation = goodReproducibility();
    delete observation.seaDefault[0].path;
    failed(verdictReproducibility(observation), '无路径');
  });

  it('跨架构注入没观察到 warning 判红（静默降级零容忍）', () => {
    const observation = goodReproducibility();
    observation.crossArchCodeCache = { launched: true, warningSeen: false, warning: null };
    failed(verdictReproducibility(observation), '跨架构静默');
  });

  it('跨架构注入的 warning 原句被改判红', () => {
    const observation = goodReproducibility();
    observation.crossArchCodeCache.warning = 'Code cache data accepted.';
    failed(verdictReproducibility(observation), '跨架构原句');
  });

  it('缺少 sealed 某一档判红', () => {
    const observation = goodReproducibility();
    observation.sealedBundles.shift();
    failed(verdictReproducibility(observation), 'sealed 缺档');
  });
});

// —— 九 · R3 entitlements / security-execution-domain 首红 ——————————

// —— R4 · `eb71d6f` 的六枚 false-green（返修前必须先红） ————————————————
//
// 六枚全部照抄独立验收 `eb71d6f` 坐实的真实收束形状，不是重新发明的坏观察：
// 验收直接调 R3 的 production 判定，四枚 identity 删除与一枚 raw `[Array]` 各得零 failure，
// 一枚混合 preflight 被 blocked-first 洗成执行域受限。故这六条在未改 R3 判定上必然红。
//
// 第六枚落在 `classifyPreflight()` 上——它是 §2 行为等价抽取后 `runPreflight()` 真实调用的
// production classifier，不是新 stub：抽取当轮已以全 64 组入参证明与 R3 内联表达式逐值同结果。

describe('R4 · eb71d6f 六枚 false-green', () => {
  for (const field of ['host', 'harnessNode', 'developerTools', 'officialNode']) {
    it(`false-green 1–4：完整 receipt 删除 ${field} 必须判红`, () => {
      const observation = goodSign();
      delete observation.hostToolReceipt[field];
      hasCheck(verdictSign(observation), `sign.receipt.${field}`, `receipt 缺 ${field}`);
    });
  }

  it('false-green 5：raw human stdout 注入未知 [Array] 层级必须判红（派生六键仍正确）', () => {
    const observation = goodSign();
    const keys = Object.keys(canonicalEntitlements.values);
    const injected = `${['[Dict]', '\t[Array]', ...keys.flatMap((key) => [`\t[Key] ${key}`, '\t[Value]', '\t\t[Bool] true'])].join('\n')}\n`;
    observation.officialEntitlements.human.command.stdout = streamOf(injected);
    // producer 侧派生的 parseError/entries/values 一律保持「正确」——正是 eb71d6f 的形状。
    assert.equal(observation.officialEntitlements.human.parseError, null);
    assert.equal(observation.officialEntitlements.human.entries.length, keys.length);
    hasCheck(verdictSign(observation), 'sign.official.human.grammar', 'raw [Array] 层级');
  });

  it('false-green 6：control lifecycle 失败 + 具名 blocked reason 必须是 probe_failed', () => {
    assert.deepEqual(
      classifyPreflight({
        controlLifecycleOk: false,
        controlSignatureOk: true,
        signatureOk: true,
        spctlOk: true,
        blockedReasons: ['authority_unavailable'],
      }),
      { status: 'failed', classification: 'probe_failed' },
    );
  });

  it('对照：control lifecycle 成立时，具名 blocked reason 仍准确记执行域受限', () => {
    assert.deepEqual(
      classifyPreflight({
        controlLifecycleOk: true,
        controlSignatureOk: false,
        signatureOk: false,
        spctlOk: false,
        blockedReasons: ['invalid_entitlements_blob', 'authority_unavailable'],
      }),
      { status: 'failed', classification: 'security_execution_domain_blocked' },
    );
  });
});

// —— R4 · 补充反例：同轮身份、canonical 出处、命令覆盖与 raw grammar ————————

describe('R4 · 完整 receipt 的逐字段硬门', () => {
  it('合格的完整 receipt 通过', () => passed(verdictSign(goodSign()), 'R4 完整 receipt'));

  it('schemaVersion 非 1 判红', () => {
    const observation = goodSign();
    observation.hostToolReceipt.schemaVersion = 2;
    hasCheck(verdictSign(observation), 'sign.receipt.schemaVersion', 'schemaVersion');
  });

  it('receipt id 与 probe id 不同必须判红（跨轮拼接）', () => {
    const observation = goodSign();
    observation.hostToolReceipt.executionDomainId = 'some-other-domain';
    hasCheck(verdictSign(observation), 'sign.receipt.executionDomainId', 'receipt id mismatch');
  });

  it('capturedAt 为空判红', () => {
    const observation = goodSign();
    observation.hostToolReceipt.capturedAt = '';
    hasCheck(verdictSign(observation), 'sign.receipt.capturedAt', 'capturedAt');
  });

  it('capturedAt 不是合法时间判红', () => {
    const observation = goodSign();
    observation.hostToolReceipt.capturedAt = 'not-a-timestamp';
    hasCheck(verdictSign(observation), 'sign.receipt.capturedAt', 'capturedAt 非法');
  });

  for (const field of [
    'macOSProductVersion',
    'macOSBuildVersion',
    'darwinRelease',
    'hardwareArchitecture',
    'processArchitecture',
    'platform',
  ]) {
    it(`host.${field} 为空判红`, () => {
      const observation = goodSign();
      observation.hostToolReceipt.host[field] = '';
      hasCheck(verdictSign(observation), 'sign.receipt.host', `host.${field}`);
    });
  }

  it('host.platform 非 darwin 判红', () => {
    const observation = goodSign();
    observation.hostToolReceipt.host.platform = 'linux';
    hasCheck(verdictSign(observation), 'sign.receipt.host', 'platform 非 darwin');
  });

  it('harness path 与 execPath 不一致判红', () => {
    const observation = goodSign();
    observation.hostToolReceipt.harnessNode.execPath = '/usr/local/bin/node';
    hasCheck(verdictSign(observation), 'sign.receipt.harnessNode', 'harness path/execPath');
  });

  it('harness 是 symlink 判红', () => {
    const observation = goodSign();
    observation.hostToolReceipt.harnessNode.symlink = true;
    hasCheck(verdictSign(observation), 'sign.receipt.harnessNode', 'harness symlink');
  });

  it('harness bytes 非正判红', () => {
    const observation = goodSign();
    observation.hostToolReceipt.harnessNode.bytes = 0;
    hasCheck(verdictSign(observation), 'sign.receipt.harnessNode', 'harness bytes');
  });

  it('harness SHA 不是 64 位小写 hex 判红', () => {
    const observation = goodSign();
    observation.hostToolReceipt.harnessNode.sha256 = 'NOT-A-SHA';
    hasCheck(verdictSign(observation), 'sign.receipt.harnessNode', 'harness SHA');
  });

  it('harness Node version 为空判红', () => {
    const observation = goodSign();
    observation.hostToolReceipt.harnessNode.version = '';
    hasCheck(verdictSign(observation), 'sign.receipt.harnessNode', 'harness version');
  });

  it('harness 架构与 host process 架构不一致判红', () => {
    const observation = goodSign();
    observation.hostToolReceipt.harnessNode.architecture = 'x64';
    hasCheck(verdictSign(observation), 'sign.receipt.harnessNode', 'harness arch');
  });

  for (const field of ['xcodeSelectPath', 'cltPackageVersion']) {
    it(`Developer Tools 的 ${field} 为空判红`, () => {
      const observation = goodSign();
      observation.hostToolReceipt.developerTools[field] = null;
      hasCheck(verdictSign(observation), 'sign.receipt.developerTools', `developerTools.${field}`);
    });
  }

  it('macOS 与 CLT 具体版本只登记、不冻结成支持矩阵', () => {
    const observation = goodSign();
    observation.hostToolReceipt.host.macOSProductVersion = '15.7.2';
    observation.hostToolReceipt.host.macOSBuildVersion = '24G325';
    observation.hostToolReceipt.host.darwinRelease = '24.6.0';
    observation.hostToolReceipt.developerTools.cltPackageVersion = '16.4.0.0.1.1747106510';
    passed(verdictSign(observation), '版本只登记');
  });

  it('official Node actual SHA 漂移判红', () => {
    const observation = goodSign();
    observation.hostToolReceipt.officialNode.sha256 = sha('drifted-official-node');
    hasCheck(verdictSign(observation), 'sign.receipt.officialNode', 'official actual SHA');
  });

  it('official Node expected SHA 被改成与 actual 一致的假值仍判红', () => {
    const observation = goodSign();
    const forged = sha('forged-pair');
    observation.hostToolReceipt.officialNode.sha256 = forged;
    observation.hostToolReceipt.officialNode.expectedSha256 = forged;
    hasCheck(verdictSign(observation), 'sign.receipt.officialNode', 'official 双值同时被换');
  });

  it('official Node 非 regular file 判红', () => {
    const observation = goodSign();
    observation.hostToolReceipt.officialNode.regularFile = false;
    hasCheck(verdictSign(observation), 'sign.receipt.officialNode', 'official regular file');
  });

  it('canonical source 缺失判红', () => {
    const observation = goodSign();
    delete observation.hostToolReceipt.canonicalSource;
    hasCheck(verdictSign(observation), 'sign.receipt.canonicalSource', 'canonicalSource 缺失');
  });

  for (const field of Object.keys(CANONICAL_SOURCE)) {
    it(`canonical source 的 ${field} 漂移判红`, () => {
      const observation = goodSign();
      observation.hostToolReceipt.canonicalSource[field] = 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef';
      hasCheck(verdictSign(observation), 'sign.receipt.canonicalSource', `canonicalSource.${field}`);
    });
  }

  it('commands 为空数组判红（三工具零覆盖）', () => {
    const observation = goodSign();
    observation.hostToolReceipt.commands = [];
    hasCheck(verdictSign(observation), 'sign.receipt.toolCommandCoverage', 'commands 空');
  });

  for (const toolPath of ['/usr/bin/codesign', '/usr/sbin/spctl', '/usr/bin/plutil']) {
    it(`${toolPath} 一条同轮 command 都没有判红`, () => {
      const observation = goodSign();
      observation.hostToolReceipt.commands = observation.hostToolReceipt.commands.filter(
        (command) => command.argv[0] !== toolPath,
      );
      hasCheck(verdictSign(observation), 'sign.receipt.toolCommandCoverage', `${toolPath} 缺件`);
    });
  }
});

// —— R4 返修二 · 三类仍存的 hard-verdict 假绿（收紧前必须先红） ————————————
//
// 一：official path 没有进入判定，观察命令也只各自自洽——把 XML/human 的目标一起换成
//     bogus path 并重算 stream，判定照样绿，因为它拿 command 自报的 argv-last 做「互证」。
// 二：DER stderr 规则被 trim + `some()` 放过了空 stderr、重复行与带空白的行。
// 三：blocked reason 只信 producer 自报；raw stream 里真出现 `Authority unavailable`
//     而 producer 写 `blockedReasons: []` / `passed`，判定无从发现。

describe('R4 返修二 · official path 与同轮 command 绑定', () => {
  it('单改 officialNode.path 必须判红', () => {
    const observation = goodSign();
    observation.hostToolReceipt.officialNode.path = '';
    hasCheck(verdictSign(observation), 'sign.receipt.officialNode', 'official path 为空');
  });

  it('强反例：XML/human 目标与 human stderr 一起换成 bogus path、stream 重算，而 receipt.commands 保持真实', () => {
    const observation = goodSign();
    const bogus = '/private/tmp/bogus/node';
    const forged = signCommandSet({ officialTarget: bogus });
    // 只换 observation 侧的两条副本；hostToolReceipt.commands 仍是真实那九条。
    observation.officialEntitlements.xml.command = forged.officialXml;
    observation.officialEntitlements.human.command = forged.officialHuman;
    // 伪造件自身完全自洽：argv-last、stderr、bytes/SHA 三者互相对得上。
    assert.equal(observation.officialEntitlements.human.command.argv.at(-1), bogus);
    assert.equal(
      observation.officialEntitlements.human.command.stderr.content,
      `Executable=${bogus}\n`,
    );
    assert.ok(
      observation.hostToolReceipt.commands.every((command) => command.argv.at(-1) !== bogus),
      'receipt.commands 必须保持真实命令',
    );
    hasCheck(verdictSign(observation), 'sign.receipt.commandBinding', 'bogus 目标未绑同轮 command');
  });

  it('XML/human 的 argv-last 不指向 receipt official path 必须判红', () => {
    const observation = goodSign();
    const bogus = '/private/tmp/bogus/node';
    // 直接改共享对象：receipt.commands 也跟着变，故绑定仍成立，只有 path 一致性被破坏。
    observation.officialEntitlements.human.command.argv[4] = bogus;
    observation.officialEntitlements.human.command.stderr = streamOf(`Executable=${bogus}\n`);
    hasCheck(
      verdictSign(observation),
      'sign.receipt.officialCommandBinding',
      'argv-last 不指向 official path',
    );
  });

  it('argv-last 与 stderr 一起漂到 bogus（绑定仍成立）时，grammar 也必须独立判红', () => {
    const observation = goodSign();
    const bogus = '/private/tmp/bogus/node';
    // 改共享对象 → receipt.commands 同步变，commandBinding 仍成立；
    // 伪造件自己跟自己完全自洽。唯一识破它的是「expectedExecutable 取 receipt official path」。
    observation.officialEntitlements.human.command.argv[4] = bogus;
    observation.officialEntitlements.human.command.stderr = streamOf(`Executable=${bogus}\n`);
    hasCheck(
      verdictSign(observation),
      'sign.official.human.grammar',
      'expectedExecutable 不得取 command 自报路径',
    );
  });

  it('XML 命令 argv 形状不对必须判红', () => {
    const observation = goodSign();
    observation.officialEntitlements.xml.command.argv = [
      '/usr/bin/codesign',
      '-d',
      '--entitlements',
      '-',
      OFFICIAL_NODE_PATH,
    ];
    hasCheck(verdictSign(observation), 'sign.receipt.officialCommandBinding', 'XML argv 缺 --xml');
  });

  it('human 命令 argv 形状不对必须判红', () => {
    const observation = goodSign();
    observation.officialEntitlements.human.command.argv = [
      '/usr/bin/codesign',
      '-d',
      '--entitlements',
      '-',
      '--xml',
      OFFICIAL_NODE_PATH,
    ];
    hasCheck(verdictSign(observation), 'sign.receipt.officialCommandBinding', 'human argv 多 --xml');
  });

  // 按观察位置取件，不按下标——命令表增删时下标会静默指到别的命令上。
  for (const [label, pick] of [
    ['control sign', (o) => o.preflight.control.sign],
    ['control verify', (o) => o.preflight.control.verify],
    ['control XML', (o) => o.preflight.control.xml.command],
    ['control XML lint', (o) => o.preflight.control.xml.lint],
    ['control XML json', (o) => o.preflight.control.xml.json],
    ['official verify', (o) => o.preflight.officialSignature.verify],
    ['official display', (o) => o.preflight.officialSignature.display],
    ['spctl', (o) => o.preflight.appGatekeeper.command],
    ['official XML', (o) => o.officialEntitlements.xml.command],
    ['official XML lint', (o) => o.officialEntitlements.xml.lint],
    ['official XML json', (o) => o.officialEntitlements.xml.json],
    ['official human', (o) => o.officialEntitlements.human.command],
  ]) {
    it(`${label} 观察命令不在 receipt.commands 中必须判红`, () => {
      const observation = goodSign();
      const target = pick(observation);
      observation.hostToolReceipt.commands = observation.hostToolReceipt.commands.filter(
        (command) => command !== target,
      );
      hasCheck(verdictSign(observation), 'sign.receipt.commandBinding', `${label} 缺绑定`);
    });
  }

  it('同轮 command 存在但字段被改过一处（stdout SHA）必须判红', () => {
    const observation = goodSign();
    // 复制一份改过 SHA 的 official display 放进 receipt.commands，观察侧仍是原件。
    const real = observation.preflight.officialSignature.display;
    observation.hostToolReceipt.commands = observation.hostToolReceipt.commands.map((command) =>
      command === real ? { ...command, stderr: { ...command.stderr, sha256: sha('tampered') } } : command,
    );
    hasCheck(verdictSign(observation), 'sign.receipt.commandBinding', 'display 字段漂移');
  });
});

// —— R4 返修三 · raw→summary 那一段仍是断的（收紧前必须先红） ————————————
//
// 返修二只闭合了 observation→receipt membership。membership 之后判定端又回头读 producer
// 摘要：`signExit/verifyExit/values`、signature identity、Gatekeeper 首行全是自报值。
// 于是 raw command 与摘要一旦分叉，判定看不见——这正是「各自自洽」的最后一段。

describe('R4 返修三 · official 四命令锁同一条已过 SHA 的路径', () => {
  it('verify/display 的 observation 与 receipt command 同步换 bogus target（path/SHA 仍真实）必须判红', () => {
    const observation = goodSign();
    const bogus = '/private/tmp/bogus/node';
    const forged = signCommandSet({ officialTarget: bogus });
    // 两处同步替换：membership 仍成立（把伪造件也放进 receipt.commands），
    // receipt.officialNode.path 与 SHA 保持真实。只有 argv-last 与 path 对不上。
    const swap = (real, fake) => {
      observation.hostToolReceipt.commands = observation.hostToolReceipt.commands.map((command) =>
        command === real ? fake : command,
      );
    };
    swap(observation.preflight.officialSignature.verify, forged.officialVerify);
    swap(observation.preflight.officialSignature.display, forged.officialDisplay);
    observation.preflight.officialSignature.verify = forged.officialVerify;
    observation.preflight.officialSignature.display = forged.officialDisplay;
    assert.equal(observation.hostToolReceipt.officialNode.path, OFFICIAL_NODE_PATH);
    assert.equal(observation.hostToolReceipt.officialNode.sha256, OFFICIAL_NODE_SHA256);
    hasCheck(
      verdictSign(observation),
      'sign.receipt.officialCommandBinding',
      'verify/display bogus target',
    );
  });

  for (const [label, mutate] of [
    ['verify argv 形状', (o) => { o.preflight.officialSignature.verify.argv = ['/usr/bin/codesign', '--verify', OFFICIAL_NODE_PATH]; }],
    ['display argv 形状', (o) => { o.preflight.officialSignature.display.argv = ['/usr/bin/codesign', '-d', '--verbose=2', OFFICIAL_NODE_PATH]; }],
  ]) {
    it(`official ${label}不 exact 必须判红`, () => {
      const observation = goodSign();
      mutate(observation);
      hasCheck(verdictSign(observation), 'sign.receipt.officialCommandBinding', label);
    });
  }
});

describe('R4 返修三 · gate 从绑定 raw command 重导，producer 摘要只作 parity', () => {
  it('raw control sign 非零而 producer signExit 报零必须判红', () => {
    const observation = goodSign();
    observation.preflight.control.sign.exit = 1;
    observation.preflight.control.sign.stderr = streamOf('codesign: deliberate failure\n');
    assert.equal(observation.preflight.control.signExit, 0);
    hasCheck(verdictSign(observation), 'sign.preflight.rawGateParity', 'control sign raw/summary');
  });

  it('raw control verify 非零而 producer verifyExit 报零必须判红', () => {
    const observation = goodSign();
    observation.preflight.control.verify.exit = 1;
    assert.equal(observation.preflight.control.verifyExit, 0);
    hasCheck(verdictSign(observation), 'sign.preflight.rawGateParity', 'control verify raw/summary');
  });

  it('raw official verify 非零而 producer verifyExit 报零必须判红', () => {
    const observation = goodSign();
    observation.preflight.officialSignature.verify.exit = 1;
    assert.equal(observation.preflight.officialSignature.verifyExit, 0);
    hasCheck(verdictSign(observation), 'sign.preflight.rawGateParity', 'official verify raw/summary');
  });

  it('raw official display 的 CDHash 漂移而 producer identity 保持正确必须判红', () => {
    const observation = goodSign();
    const display = observation.preflight.officialSignature.display;
    display.stderr = streamOf(
      officialDisplayStderr.replace(
        'CDHash=59cdea89a982b05f23e756c08115bebc555ff092',
        'CDHash=0000000000000000000000000000000000000000',
      ),
    );
    assert.equal(observation.preflight.officialSignature.cdhash, '59cdea89a982b05f23e756c08115bebc555ff092');
    hasCheck(verdictSign(observation), 'sign.preflight.officialIdentityRaw', 'raw CDHash 漂移');
  });

  it('raw official display 的 Authority 少一条而 producer 摘要保持三条必须判红', () => {
    const observation = goodSign();
    const display = observation.preflight.officialSignature.display;
    display.stderr = streamOf(officialDisplayStderr.replace('Authority=Apple Root CA\n', ''));
    assert.equal(observation.preflight.officialSignature.authorities.length, 3);
    hasCheck(verdictSign(observation), 'sign.preflight.officialIdentityRaw', 'raw Authority 缺条');
  });

  it('raw spctl 首非空行漂移而 producer 摘要保持 rejected 必须判红', () => {
    const observation = goodSign();
    observation.preflight.appGatekeeper.command.stderr = streamOf(
      'Code Signing subsystem internal error\n',
    );
    assert.equal(
      observation.preflight.appGatekeeper.stderrFirstNonemptyLine,
      `${CONTROL_APP_PATH}: rejected`,
    );
    hasCheck(verdictSign(observation), 'sign.preflight.gatekeeperRaw', 'raw spctl 首行漂移');
  });

  it('raw spctl exit 漂移而 producer 摘要保持 3 必须判红', () => {
    const observation = goodSign();
    observation.preflight.appGatekeeper.command.exit = 1;
    assert.equal(observation.preflight.appGatekeeper.exit, 3);
    hasCheck(verdictSign(observation), 'sign.preflight.gatekeeperRaw', 'raw spctl exit 漂移');
  });
});

// —— R4 返修四 · 成功 raw shape 仍只看 exit，摘要仍有旁路 ————————————————
//
// 返修三把 gate 从 raw 重导了，但「成功」的判据只写了 exit：一条被信号打死、exit 却记 0 的
// 命令照样算成功。producer 自己算好的 `gates` 四字段从没被核过；`control.xml.stderr` 与
// `spctl` 的 argv 也一样——同步改两处副本就能绕过 membership。

describe('R4 返修四 · 成功 raw shape 必须同时要求 exit 与 signal===null', () => {
  for (const [label, pick] of [
    ['control sign', (o) => o.preflight.control.sign],
    ['control verify', (o) => o.preflight.control.verify],
    ['control XML', (o) => o.preflight.control.xml.command],
    ['official verify', (o) => o.preflight.officialSignature.verify],
    ['official display', (o) => o.preflight.officialSignature.display],
  ]) {
    it(`${label} 被 SIGKILL 打死而 exit 仍记 0 必须判红`, () => {
      const observation = goodSign();
      // observation 与 receipt 是同一条 receipt，故这一改同步落在两处，membership 仍成立。
      const command = pick(observation);
      command.signal = 'SIGKILL';
      assert.equal(command.exit, 0);
      hasCheck(verdictSign(observation), 'sign.preflight.rawCommandShape', `${label} SIGKILL`);
    });
  }
});

describe('R4 返修四 · producer 自算的 gates 四字段必须与判定端重导值 parity', () => {
  for (const gate of ['controlLifecycleOk', 'controlSignatureOk', 'signatureOk', 'spctlOk']) {
    it(`preflight.gates.${gate} 漂移必须判红`, () => {
      const observation = goodSign();
      observation.preflight.gates[gate] = false;
      hasCheck(verdictSign(observation), 'sign.preflight.gatesParity', `gates.${gate}`);
    });
  }

  it('gates 字段整块缺失必须判红', () => {
    const observation = goodSign();
    delete observation.preflight.gates;
    hasCheck(verdictSign(observation), 'sign.preflight.gatesParity', 'gates 缺失');
  });

  // parity 只遍历 derived 的四个键时，多出来的键从来没人看——真实
  // `impl-r4e-m1-control` observation 加一个 `unexpected` 也是 7→7。
  it('gates 多出一个键必须判红（恰四键 exact flat record）', () => {
    const observation = goodSign();
    observation.preflight.gates.unexpected = true;
    hasCheck(verdictSign(observation), 'sign.preflight.gatesParity', 'gates 多键');
  });
});

describe('R4 返修四 · control XML 的 stderr 摘要必须与绑定 raw stderr exact parity', () => {
  it('control.xml.stderr 与 raw command stderr 漂移必须判红', () => {
    const observation = goodSign();
    observation.preflight.control.xml.stderr = 'Executable=/private/tmp/somewhere-else\n';
    assert.notEqual(
      observation.preflight.control.xml.stderr,
      observation.preflight.control.xml.command.stderr.content,
    );
    hasCheck(verdictSign(observation), 'sign.preflight.rawGateParity', 'control.xml.stderr');
  });
});

describe('R4 返修四 · spctl 的 argv 必须 exact 指向被探测的 .app', () => {
  it('observation 与 receipt 同步改 argv-last，而 appPath 与 rejection 流保持真实，必须判红', () => {
    const observation = goodSign();
    const bogusApp = '/private/tmp/bogus/Other.app';
    // 同一条 receipt → 两处同步改，membership 仍成立；
    // appGatekeeper.appPath 与 stderr 的 `<real app>: rejected` 都保持真实。
    observation.preflight.appGatekeeper.command.argv = ['/usr/sbin/spctl', '-a', '-vv', bogusApp];
    assert.equal(observation.preflight.appGatekeeper.appPath, CONTROL_APP_PATH);
    assert.equal(
      observation.preflight.appGatekeeper.command.stderr.content,
      `${CONTROL_APP_PATH}: rejected\n`,
    );
    hasCheck(verdictSign(observation), 'sign.preflight.gatekeeperArgv', 'spctl argv-last');
  });

  it('spctl argv 形状不对（缺 -vv）必须判红', () => {
    const observation = goodSign();
    observation.preflight.appGatekeeper.command.argv = ['/usr/sbin/spctl', '-a', CONTROL_APP_PATH];
    hasCheck(verdictSign(observation), 'sign.preflight.gatekeeperArgv', 'spctl 缺 -vv');
  });
});

describe('R4 返修三 · XML 语义绑定绝对 plutil，不自研第二套 parser', () => {
  for (const [label, pick] of [
    ['control', (o) => o.preflight.control.xml],
    ['official', (o) => o.officialEntitlements.xml],
  ]) {
    it(`${label} XML 落盘件指纹与 raw stdout 不一致必须判红`, () => {
      const observation = goodSign();
      pick(observation).artifact.sha256 = sha('different-artifact');
      hasCheck(verdictSign(observation), 'sign.xml.artifactFingerprint', `${label} 落盘指纹`);
    });

    it(`${label} XML 的 plutil -lint argv 不指向该落盘件必须判红`, () => {
      const observation = goodSign();
      pick(observation).lint.argv = ['/usr/bin/plutil', '-lint', '/private/tmp/other.plist'];
      hasCheck(verdictSign(observation), 'sign.xml.plutilBinding', `${label} lint argv`);
    });

    it(`${label} XML 的 plutil -convert argv 形状不对必须判红`, () => {
      const observation = goodSign();
      pick(observation).json.argv = ['/usr/bin/plutil', '-convert', 'json', pick(observation).artifact.path];
      hasCheck(verdictSign(observation), 'sign.xml.plutilBinding', `${label} convert argv`);
    });

    it(`${label} XML 的 plutil -lint 非零必须判红`, () => {
      const observation = goodSign();
      pick(observation).lint.exit = 1;
      hasCheck(verdictSign(observation), 'sign.xml.plutilBinding', `${label} lint 非零`);
    });

    it(`${label} XML 绑定的 JSON stdout 六键漂移而 producer values 保持正确必须判红`, () => {
      const observation = goodSign();
      const evidence = pick(observation);
      const drifted = { ...canonicalEntitlements.values, 'com.apple.security.cs.allow-jit': false };
      evidence.json.stdout = streamOf(JSON.stringify(drifted));
      assert.equal(evidence.values['com.apple.security.cs.allow-jit'], true);
      hasCheck(verdictSign(observation), 'sign.xml.plutilValues', `${label} JSON 六键漂移`);
    });

    it(`${label} XML 绑定的 JSON stdout 不是合法 JSON 必须判红`, () => {
      const observation = goodSign();
      pick(observation).json.stdout = streamOf('{not json');
      hasCheck(verdictSign(observation), 'sign.xml.plutilValues', `${label} JSON 不可解析`);
    });
  }
});

describe('R4 返修三 · command identity 必须消费 production 已记录的全部字段', () => {
  it('observation 与 receipt command 的 error 字段漂移必须判红', () => {
    const observation = goodSign();
    const real = observation.preflight.officialSignature.display;
    // receipt 侧换成一个只有 `error` 不同的副本；其余字段逐字相同。
    observation.hostToolReceipt.commands = observation.hostToolReceipt.commands.map((command) =>
      command === real ? { ...command, error: 'spawn EAGAIN' } : command,
    );
    hasCheck(verdictSign(observation), 'sign.receipt.commandBinding', 'error 字段漂移');
  });

  it('observation 侧带 error 而 receipt 侧为 null 同样判红', () => {
    const observation = goodSign();
    const real = observation.officialEntitlements.human.command;
    observation.officialEntitlements.human.command = { ...real, error: 'spawn ENOMEM' };
    hasCheck(verdictSign(observation), 'sign.receipt.commandBinding', 'error 反向漂移');
  });
});

describe('R4 返修二 · DER stderr exact grammar', () => {
  it('合法 stdout 配空 stderr 必须判红', () => {
    const observation = goodSign();
    observation.officialEntitlements.human.command.stderr = streamOf('');
    hasCheck(verdictSign(observation), 'sign.official.human.grammar', '空 stderr');
  });

  it('重复的 Executable 行必须判红', () => {
    const observation = goodSign();
    observation.officialEntitlements.human.command.stderr = streamOf(
      `Executable=${OFFICIAL_NODE_PATH}\nExecutable=${OFFICIAL_NODE_PATH}\n`,
    );
    hasCheck(verdictSign(observation), 'sign.official.human.grammar', '重复 Executable 行');
  });

  for (const [label, text] of [
    ['前导空白', ` Executable=${OFFICIAL_NODE_PATH}\n`],
    ['尾随空白', `Executable=${OFFICIAL_NODE_PATH} \n`],
    ['前导制表符', `\tExecutable=${OFFICIAL_NODE_PATH}\n`],
    ['缺终止换行', `Executable=${OFFICIAL_NODE_PATH}`],
  ]) {
    it(`带${label}的 Executable 行必须判红`, () => {
      const observation = goodSign();
      observation.officialEntitlements.human.command.stderr = streamOf(text);
      hasCheck(verdictSign(observation), 'sign.official.human.grammar', `stderr ${label}`);
    });
  }
});

describe('R4 返修二 · blocked reason 由判定端从 raw stream 重导', () => {
  it('raw preflight stream 出现 Authority unavailable 而 producer 自报 passed 必须判红', () => {
    const observation = goodSign();
    const verify = observation.preflight.officialSignature.verify;
    const poisoned = `${OFFICIAL_NODE_PATH}: Authority unavailable\n`;
    verify.stderr = streamOf(poisoned);
    verify.exit = 1;
    // producer 侧刻意保持「什么都没发生」。
    assert.deepEqual(observation.preflight.blockedReasons, []);
    assert.equal(observation.preflight.classification, 'passed');
    hasCheck(
      verdictSign(observation),
      'sign.preflight.blockedReasonDerivation',
      'raw Authority unavailable',
    );
  });

  it('raw control XML 为空成功而 producer 未记 control_xml_empty 必须判红', () => {
    const observation = goodSign();
    observation.preflight.control.xml.command.stdout = streamOf('');
    observation.preflight.control.xml.bytes = 0;
    observation.preflight.control.xml.values = null;
    assert.deepEqual(observation.preflight.blockedReasons, []);
    hasCheck(
      verdictSign(observation),
      'sign.preflight.blockedReasonDerivation',
      'control XML 空成功未记',
    );
  });

  it('producer 多报一条 raw 里并不存在的 blocked reason 必须判红', () => {
    const observation = goodSign();
    observation.preflight.blockedReasons = ['authority_unavailable'];
    hasCheck(
      verdictSign(observation),
      'sign.preflight.blockedReasonDerivation',
      'producer 多报 reason',
    );
  });

  it('full matrix 命令里的 internal error 不得串味到 preflight 分类', () => {
    const observation = goodSign();
    // 六格重签阶段的失败文本不属于 preflight 证据面，不得据此判执行域受限。
    observation.resign[0].display = {
      argv: ['/usr/bin/codesign', '-d', '--verbose=4', '/tmp/copy'],
      stderr: { content: 'Code Signing subsystem internal error', bytes: 36, sha256: sha('x') },
    };
    passed(verdictSign(observation), 'full matrix 不串味');
  });
});

describe('R4 · preflight 分类由判定端独立重算', () => {
  it('blockedReasons 出现闭集外的字符串判红', () => {
    const observation = goodSign();
    observation.preflight.blockedReasons = ['looks_scary_but_unfrozen'];
    hasCheck(verdictSign(observation), 'sign.preflight.blockedReasons', 'blocked reason 闭集');
  });

  it('blockedReasons 字段缺失判红', () => {
    const observation = goodSign();
    delete observation.preflight.blockedReasons;
    hasCheck(verdictSign(observation), 'sign.preflight.blockedReasons', 'blockedReasons 缺失');
  });

  it('raw 与 producer 的 blocked reason 一致，但自报 passed 与 classifier 不符必须判红', () => {
    const observation = goodSign();
    // raw 里真出现具名证据，producer 也如实记了（parity 成立），但分类仍写成 passed。
    const verify = observation.preflight.officialSignature.verify;
    verify.stderr = streamOf(`${OFFICIAL_NODE_PATH}: Authority unavailable\n`);
    verify.exit = 1;
    observation.preflight.blockedReasons = ['authority_unavailable'];
    hasCheck(
      verdictSign(observation),
      'sign.preflight.classificationDerivation',
      '自报 passed 与 classifier 不符',
    );
  });

  it('classifier 的四层次序逐格成立', () => {
    const base = {
      controlLifecycleOk: true,
      controlSignatureOk: true,
      signatureOk: true,
      spctlOk: true,
      blockedReasons: [],
    };
    assert.deepEqual(classifyPreflight(base), { status: 'ok', classification: 'passed' });
    assert.deepEqual(classifyPreflight({ ...base, spctlOk: false }), {
      status: 'failed',
      classification: 'probe_failed',
    });
    assert.deepEqual(classifyPreflight({ ...base, blockedReasons: ['control_xml_empty'] }), {
      status: 'failed',
      classification: 'security_execution_domain_blocked',
    });
    // 闭集外的 reason 不得把普通失败洗成执行域受限。
    assert.deepEqual(
      classifyPreflight({ ...base, controlSignatureOk: false, blockedReasons: ['made_up_reason'] }),
      { status: 'failed', classification: 'probe_failed' },
    );
  });
});

describe('R4 · DER human 由共享纯 parser 从 raw stdout 严格重解析', () => {
  const withHumanStdout = (content) => {
    const observation = goodSign();
    observation.officialEntitlements.human.command.stdout = streamOf(content);
    return observation;
  };
  const keys = Object.keys(canonicalEntitlements.values);
  const triples = keys.flatMap((key) => [`\t[Key] ${key}`, '\t[Value]', '\t\t[Bool] true']);

  for (const [label, content] of [
    ['第二个根 [Dict]', `${['[Dict]', ...triples, '[Dict]'].join('\n')}\n`],
    ['嵌套 [Dict]', `${['[Dict]', '\t[Dict]', ...triples].join('\n')}\n`],
    ['未知 marker', `${['[Dict]', '\t[Data] 0x00', ...triples].join('\n')}\n`],
    ['自由文本', `${['[Dict]', 'warning: something happened', ...triples].join('\n')}\n`],
    ['缺 [Value] 行', `${['[Dict]', ...triples.filter((line) => line !== '\t[Value]')].join('\n')}\n`],
    ['缺 [Bool] 行', `${['[Dict]', ...triples.filter((line) => !line.includes('[Bool]'))].join('\n')}\n`],
    ['缺 [Key] 行', `${['[Dict]', ...triples.filter((line) => !line.includes('[Key]'))].join('\n')}\n`],
    ['根不是 [Dict]', `${[...triples].join('\n')}\n`],
    ['空 stdout', ''],
  ]) {
    it(`raw stdout ${label} 判红`, () => {
      hasCheck(verdictSign(withHumanStdout(content)), 'sign.official.human.grammar', `grammar ${label}`);
    });
  }

  it('raw stdout 的 [Bool] false 判红', () => {
    const falsified = `${['[Dict]', ...triples].join('\n').replace('[Bool] true', '[Bool] false')}\n`;
    hasCheck(verdictSign(withHumanStdout(falsified)), 'sign.official.human.grammar', 'grammar false');
  });

  it('raw stdout 的非 bool 值判红', () => {
    const stringy = `${['[Dict]', ...triples].join('\n').replace('[Bool] true', '[String] yes')}\n`;
    hasCheck(verdictSign(withHumanStdout(stringy)), 'sign.official.human.grammar', 'grammar 非 bool');
  });

  it('raw stdout 的额外键判红', () => {
    const extra = `${['[Dict]', ...triples, '\t[Key] com.example.extra', '\t[Value]', '\t\t[Bool] true'].join('\n')}\n`;
    hasCheck(verdictSign(withHumanStdout(extra)), 'sign.official.human.grammar', 'grammar 额外键');
  });

  it('raw stdout 的重复键（总数仍为六）判红', () => {
    const duplicated = triples.slice(0, triples.length - 3).concat(triples.slice(0, 3));
    hasCheck(
      verdictSign(withHumanStdout(`${['[Dict]', ...duplicated].join('\n')}\n`)),
      'sign.official.human.grammar',
      'grammar 重复键',
    );
  });

  it('六键顺序变化仍判绿（顺序可变、闭集 exact）', () => {
    const reordered = [...keys].reverse().flatMap((key) => [`\t[Key] ${key}`, '\t[Value]', '\t\t[Bool] true']);
    const observation = withHumanStdout(`${['[Dict]', ...reordered].join('\n')}\n`);
    observation.officialEntitlements.human.entries = [...keys]
      .reverse()
      .map((key) => ({ key, value: true }));
    passed(verdictSign(observation), '六键换序');
  });

  it('空行可忽略', () => {
    const spaced = `\n${['[Dict]', ...triples.flatMap((line) => [line, ''])].join('\n')}\n\n`;
    passed(verdictSign(withHumanStdout(spaced)), '空行');
  });

  it('stderr 出现非 exact Executable 行判红', () => {
    const observation = goodSign();
    observation.officialEntitlements.human.command.stderr = streamOf(
      `Executable=${OFFICIAL_NODE_PATH}\nwarning: unrelated chatter\n`,
    );
    hasCheck(verdictSign(observation), 'sign.official.human.grammar', 'stderr 杂音');
  });

  it('stderr 的 Executable 指向别的可执行件判红', () => {
    const observation = goodSign();
    observation.officialEntitlements.human.command.stderr = streamOf('Executable=/usr/bin/true\n');
    hasCheck(verdictSign(observation), 'sign.official.human.grammar', 'stderr executable 漂移');
  });

  it('producer 保存的 parseError 与重解析结果不一致判红', () => {
    const observation = goodSign();
    observation.officialEntitlements.human.parseError = 'producer 自称解析失败';
    hasCheck(verdictSign(observation), 'sign.official.human.producerParity', 'parseError 互证');
  });

  it('producer 保存的 entries 与重解析结果不一致判红', () => {
    const observation = goodSign();
    observation.officialEntitlements.human.entries = observation.officialEntitlements.human.entries
      .slice()
      .reverse();
    hasCheck(verdictSign(observation), 'sign.official.human.producerParity', 'entries 互证');
  });

  it('producer 丢失 parseError 字段判红（不得只交派生六键）', () => {
    const observation = goodSign();
    delete observation.officialEntitlements.human.parseError;
    hasCheck(verdictSign(observation), 'sign.official.human.producerParity', 'parseError 缺失');
  });
});

describe('R3 · entitlements 四层证据与 execution-domain 判据', () => {
  it('第三姿势必须改名为冻结的 Node v22.23.1 上游输入', () => {
    assert.deepEqual(
      SIGN_MODES.map((mode) => mode.name),
      [
        'adhoc-plain',
        'adhoc-hardened-no-entitlements',
        'adhoc-hardened-with-node-v22.23.1-entitlements',
      ],
    );
  });

  it('canonical 632-byte SHA 漂移必须判红', () => {
    const observation = goodSign();
    observation.canonical.sha256 = sha('wrong-canonical');
    hasCheck(verdictSign(observation), 'sign.canonical.sha256', 'canonical SHA');
  });

  it('canonical 六键中的 true 被改成 false 必须判红', () => {
    const observation = goodSign();
    observation.canonical.values['com.apple.security.cs.allow-jit'] = false;
    hasCheck(verdictSign(observation), 'sign.canonical.values', 'canonical 六键');
  });

  it('受限执行域不得被普通 probe_failed 混淆', () => {
    const observation = goodSign();
    observation.preflight.status = 'failed';
    observation.preflight.classification = 'probe_failed';
    observation.preflight.control.xml = {
      exit: 0,
      bytes: 0,
      sha256: sha(''),
      values: null,
      stderr: 'invalid entitlements blob',
    };
    hasCheck(verdictSign(observation), 'sign.preflight.classification', '受限域分类');
  });

  it('control XML exit 0 但 stdout 0 bytes 必须判红', () => {
    const observation = goodSign();
    observation.preflight.control.xml.bytes = 0;
    observation.preflight.control.xml.values = null;
    hasCheck(verdictSign(observation), 'sign.preflight.control.xml', 'control 空 XML');
  });

  it('control 只签验、不完成 ready → EOF → exit 0 必须判红', () => {
    const observation = goodSign();
    observation.preflight.control.launch.ready = false;
    observation.preflight.control.launch.eofSent = false;
    observation.preflight.control.launch.exit = { code: null, signal: 'SIGKILL' };
    hasCheck(verdictSign(observation), 'sign.preflight.control.launch', 'control 生命周期');
  });

  it('official Node identity 的 ordered Authority 漂移必须判红', () => {
    const observation = goodSign();
    observation.preflight.officialSignature.authorities.reverse();
    hasCheck(verdictSign(observation), 'sign.preflight.official.authorities', 'official Authority');
  });

  it('spctl exit 1 / internal error 不是 exact rejected', () => {
    const observation = goodSign();
    observation.preflight.appGatekeeper.exit = 1;
    observation.preflight.appGatekeeper.stderrFirstNonemptyLine = 'internal error';
    hasCheck(verdictSign(observation), 'sign.preflight.spctl', 'spctl internal error');
  });

  it('spctl exit 3 但第一非空行不是 exact <app>: rejected 仍判红', () => {
    const observation = goodSign();
    observation.preflight.appGatekeeper.stderrFirstNonemptyLine = 'SidecarProbe.app: rejected';
    hasCheck(verdictSign(observation), 'sign.preflight.spctl', 'spctl 非 exact 行');
  });

  it('official XML exit 0 但 stdout 为空必须判红', () => {
    const observation = goodSign();
    observation.officialEntitlements.xml.command.stdout = { bytes: 0, sha256: sha(''), content: '' };
    observation.officialEntitlements.xml.values = null;
    hasCheck(verdictSign(observation), 'sign.official.xml', 'official XML 空成功');
  });

  for (const [label, mutate] of [
    ['少键', (human) => human.entries.pop()],
    ['多键', (human) => human.entries.push({ key: 'com.example.extra', value: true })],
    ['false', (human) => { human.entries[0].value = false; }],
    ['重复键', (human) => human.entries.push(clone(human.entries[0]))],
  ]) {
    it(`DER human ${label}必须判红`, () => {
      const observation = goodSign();
      mutate(observation.officialEntitlements.human);
      hasCheck(verdictSign(observation), 'sign.official.human', `human ${label}`);
    });
  }

  it('六格任一 canonical input SHA 漂移必须判红', () => {
    const observation = goodSign();
    observation.resign[0].canonicalInputSha256 = sha('wrong-input');
    hasCheck(verdictSign(observation), 'sign.matrix.canonicalInputSha256', '每格 input SHA');
  });

  it('签后 actual entitlements 漂移必须判红', () => {
    const observation = goodSign();
    const row = observation.resign.find((entry) => entry.mode.includes('with-'));
    row.actualEntitlements.values['com.apple.security.cs.allow-jit'] = false;
    hasCheck(verdictSign(observation), 'sign.matrix.actualEntitlements', '签后 actual');
  });

  it('plain 签后出现 entitlements 必须判红', () => {
    const observation = goodSign();
    const row = observation.resign.find((entry) => entry.mode === 'adhoc-plain');
    row.actualEntitlements = canonicalActualEntitlements();
    hasCheck(verdictSign(observation), 'sign.matrix.actualEntitlements', 'plain actual');
  });

  it('execution-domain id 不满足闭集必须判红', () => {
    const observation = goodSign();
    observation.executionDomainId = '../seatbelt';
    hasCheck(verdictSign(observation), 'sign.executionDomainId', 'execution-domain id');
  });

  it('PATH shim 作为实际 argv[0] 必须判红', () => {
    const observation = goodSign();
    observation.hostToolReceipt.commands[0].argv[0] = 'codesign';
    hasCheck(verdictSign(observation), 'sign.receipt.commandTool', 'PATH shim');
  });

  it('tool receipt 的 SHA 与 command receipt 不一致必须判红', () => {
    const observation = goodSign();
    observation.hostToolReceipt.commands[0].tool.sha256 = sha('other-codesign');
    hasCheck(verdictSign(observation), 'sign.receipt.commandTool', 'tool SHA correlation');
  });

  it('命令双流 bytes/SHA 自相矛盾必须判红', () => {
    const observation = goodSign();
    observation.officialEntitlements.xml.command.stdout.bytes += 1;
    hasCheck(verdictSign(observation), 'sign.receipt.stream', 'command stream receipt');
  });
});

// —— 十 · ad-hoc sign matrix ————————————————————————————————————

describe('两候选 × 三姿势的 ad-hoc 签名矩阵', () => {
  it('六格 + 嵌套 .app 齐备即通过', () => passed(verdictSign(goodSign()), 'sign 合格'));

  it('少一格判红', () => {
    const observation = goodSign();
    observation.resign.pop();
    failed(verdictSign(observation), 'sign 缺格');
  });

  it('任一格 blocked 判红', () => {
    const observation = goodSign();
    observation.resign[0] = { subject: SIGN_SUBJECT_IDS[0], mode: SIGN_MODES[0].name, status: 'blocked' };
    failed(verdictSign(observation), 'sign blocked');
  });

  it('签名退出非 0 判红', () => {
    const observation = goodSign();
    observation.resign[1].signExit = 1;
    failed(verdictSign(observation), 'signExit');
  });

  it('verify 退出非 0 判红', () => {
    const observation = goodSign();
    observation.resign[2].verifyExit = 1;
    failed(verdictSign(observation), 'verifyExit');
  });

  it('硬化无 entitlements 竟然跑起来了要判红（既知形态变了）', () => {
    const observation = goodSign();
    observation.resign.find((row) => row.mode === 'adhoc-hardened-no-entitlements').launched = true;
    failed(verdictSign(observation), '硬化无权限起飞');
  });

  it('带官方 entitlements 反而起不来要判红', () => {
    const observation = goodSign();
    observation.resign.find(
      (row) => row.mode === 'adhoc-hardened-with-node-v22.23.1-entitlements',
    ).launched = false;
    failed(verdictSign(observation), '带权限失败');
  });

  it('.app 嵌套签名次序失败判红', () => {
    const observation = goodSign();
    observation.appBundle.signNestedExit = 1;
    failed(verdictSign(observation), '嵌套签名');
  });

  it('.app deep verify 失败判红', () => {
    const observation = goodSign();
    observation.appBundle.verifyDeepStrictExit = 1;
    failed(verdictSign(observation), 'deep verify');
  });

  it('.app 内嵌 sidecar 跑不起来判红', () => {
    const observation = goodSign();
    observation.appBundle.nestedLaunched = false;
    failed(verdictSign(observation), '嵌套运行');
  });

  it('ad-hoc 竟然通过 spctl 要判红（那说明这不再是 ad-hoc 面）', () => {
    const observation = goodSign();
    observation.appBundle.spctlExit = 0;
    failed(verdictSign(observation), 'spctl 放行');
  });
});

// —— 十 · 官方 Node 来源门 ——————————————————————————————————————

describe('官方 Node archive 来源门', () => {
  it('名/字节/SHA/SHASUMS/tar/版本/架构全过即通过', () =>
    passed(verdictRuntimeSource(goodRuntimeSource()), '来源合格'));

  it('缺一个架构判红', () => {
    const observation = goodRuntimeSource();
    observation.targets.pop();
    failed(verdictRuntimeSource(observation), '缺架构');
  });

  it('blocked 判红（不得静默继续）', () => {
    const observation = goodRuntimeSource();
    observation.targets[0] = { status: 'blocked', reason: 'archive-missing', nodeArch: 'arm64' };
    failed(verdictRuntimeSource(observation), 'archive blocked');
  });

  it('字节数不符判红（截断）', () => {
    const observation = goodRuntimeSource();
    observation.targets[0].bytes -= 4096;
    failed(verdictRuntimeSource(observation), '字节截断');
  });

  it('SHA 不符判红', () => {
    const observation = goodRuntimeSource();
    observation.targets[1].sha256 = '0'.repeat(64);
    failed(verdictRuntimeSource(observation), 'SHA 不符');
  });

  it('SHA 与冻结值一致但 SHASUMS 记录不符判红', () => {
    const observation = goodRuntimeSource();
    observation.targets[0].shasumsEntry = '1'.repeat(64);
    failed(verdictRuntimeSource(observation), 'SHASUMS 不符');
  });

  it('archive 与 SHASUMS 被一起换掉仍判红（冻结值是第二见证）', () => {
    const observation = goodRuntimeSource();
    const forged = '2'.repeat(64);
    observation.targets[0].sha256 = forged;
    observation.targets[0].shasumsEntry = forged;
    failed(verdictRuntimeSource(observation), '双替换');
  });

  it('文件名不是冻结名判红', () => {
    const observation = goodRuntimeSource();
    observation.targets[0].name = 'node-v22.23.0-darwin-arm64.tar.gz';
    failed(verdictRuntimeSource(observation), '文件名');
  });

  it('tar 完整性失败判红', () => {
    const observation = goodRuntimeSource();
    observation.targets[1].tarOk = false;
    failed(verdictRuntimeSource(observation), 'tar 截断');
  });

  it('解包后 node --version 不符判红', () => {
    const observation = goodRuntimeSource();
    observation.targets[0].nodeVersion = 'v22.22.0';
    failed(verdictRuntimeSource(observation), '解包版本');
  });

  it('解包后 Mach-O 架构不符判红', () => {
    const observation = goodRuntimeSource();
    observation.targets[0].machoArch = 'x86_64';
    failed(verdictRuntimeSource(observation), '解包架构');
  });
});

// —— 十一 · 顶层收束 ————————————————————————————————————————————

describe('顶层收束', () => {
  it('零失败报 ok', () => {
    const verdict = conclude([], { probe: 'measure' });
    assert.equal(verdict.status, 'ok');
    assert.equal(verdict.failureCount, 0);
    assert.equal(verdict.probe, 'measure');
  });

  it('任一失败即 failed，且失败逐条保全', () => {
    const failures = [
      { id: 'a/aarch64-apple-darwin/cjs', check: 'stdio.payload.sha256', expected: 'x', observed: 'y' },
      { id: 'b/x86_64-apple-darwin/default', check: 'abort.stopReason', expected: 'aborted', observed: 'endTurn' },
    ];
    const verdict = conclude(failures, { probe: 'measure' });
    assert.equal(verdict.status, 'failed');
    assert.equal(verdict.failureCount, 2);
    assert.deepEqual(verdict.failures, failures);
  });

  it('失败不得被 meta 覆盖掉', () => {
    const verdict = conclude([{ id: 'x', check: 'y' }], { status: 'ok', failureCount: 0 });
    assert.equal(verdict.status, 'failed');
    assert.equal(verdict.failureCount, 1);
  });
});
