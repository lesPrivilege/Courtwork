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
import { describe, it } from 'node:test';

import {
  CANDIDATE_IDS,
  CODE_CACHE_REJECT_WARNING,
  COLDSTART_SHAPE,
  CRASH_EXPECTATIONS,
  EXPECTED_LOOP,
  EXPECTED_TOOL_NAMES,
  INVENTORY_IDS,
  NEGATIVE_CONTROL_ERROR,
  NEGATIVE_CONTROL_IDS,
  PAYLOAD_SPECS,
  RUNTIME_ARCHIVES,
  SIGN_MODES,
  SIGN_SUBJECT_IDS,
  conclude,
  entryOf,
  payloadText,
  verdictAbort,
  verdictColdstart,
  verdictCrash,
  verdictIdentity,
  verdictInventory,
  verdictNegativeControl,
  verdictReproducibility,
  verdictRuntimeSource,
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
    exitCode: expectation.code,
    signal: expectation.signal,
    respawnReady: true,
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
        identity: goodReady(id),
        eofClean: true,
        medianMs: 40 + round,
        minMs: 38,
      })),
    })),
  };
}

const goodReproducibility = () => ({
  cycles: 2,
  sealedBundles: ['esm-naive', 'esm-createrequire', 'cjs'].map((variant) => ({
    variant,
    shas: [`sealed-${variant}`, `sealed-${variant}`],
    identical: true,
  })),
  seaDefault: [
    { triple: 'aarch64-apple-darwin', shas: ['sea-arm', 'sea-arm'], identical: true },
    { triple: 'x86_64-apple-darwin', shas: ['sea-x64', 'sea-x64'], identical: true },
  ],
  seaCodeCache: [
    { triple: 'aarch64-apple-darwin', shas: ['cc-arm-1', 'cc-arm-2'], identical: false },
    { triple: 'x86_64-apple-darwin', shas: ['cc-x64-1', 'cc-x64-2'], identical: false },
  ],
  crossArchCodeCache: { launched: true, warningSeen: true, warning: CODE_CACHE_REJECT_WARNING },
});

const goodSign = () => ({
  resign: SIGN_SUBJECT_IDS.flatMap((subject) =>
    SIGN_MODES.map((mode) => ({
      subject,
      mode: mode.name,
      signExit: 0,
      verifyExit: 0,
      flags: mode.hardened ? 'flags=0x10002(adhoc,runtime)' : 'flags=0x2(adhoc)',
      launched: mode.launches,
    })),
  ),
  appBundle: {
    signNestedExit: 0,
    signOuterExit: 0,
    verifyDeepStrictExit: 0,
    nestedLaunched: true,
    spctlExit: 3,
  },
});

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
    observation.subjects[2].rounds[0].identity.node = 'v20.19.0';
    failed(verdictColdstart(observation), '冷启身份');
  });

  it('异常 EOF 判红', () => {
    const observation = goodColdstart();
    observation.subjects[1].rounds[2].eofClean = false;
    failed(verdictColdstart(observation), '冷启 EOF');
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
    observation.sealedBundles[2] = { variant: 'cjs', shas: ['cjs-1', 'cjs-2'], identical: false };
    failed(verdictReproducibility(observation), 'sealed 漂移');
  });

  it('SEA default 两次不一致判红', () => {
    const observation = goodReproducibility();
    observation.seaDefault[0] = { triple: 'aarch64-apple-darwin', shas: ['a', 'b'], identical: false };
    failed(verdictReproducibility(observation), 'default 漂移');
  });

  it('code-cache 竟然可复现要判红（误报，非静默通过）', () => {
    const observation = goodReproducibility();
    observation.seaCodeCache[0] = { triple: 'aarch64-apple-darwin', shas: ['same', 'same'], identical: true };
    failed(verdictReproducibility(observation), 'code-cache 误报');
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

// —— 九 · ad-hoc sign matrix ————————————————————————————————————

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
      (row) => row.mode === 'adhoc-hardened-with-official-entitlements',
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
