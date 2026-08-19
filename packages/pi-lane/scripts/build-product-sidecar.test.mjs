/**
 * PI-HOST-LOOP-1 · snapshot 生成器的定向门（`node --test`，零网络）。
 *
 * 分工写在这里免得被误读：本文件只测**判据与可复现构建**——冻结表、SafeToken stage 名、
 * Mach-O 判定、inventory 闭集、archive/runtime 五三项判据、正式根复用规则，以及
 * 从 product source 现编 CJS 的 byte-identical。真正打到 `nodejs.org` 的下载、解包与
 * 落名由独占命令 `build:product-sidecar` 承担，它不在普通 `pnpm test` 的路径上。
 *
 * 每条判据都配一枚定向反例：只改被判的那一项，其余全部保持合格。判据若不带区分力，
 * 反例就不会红。
 *
 * PI-FETCH-TIMEOUT-1：新增 `fetchWithTimeoutRetry` 定向测试段，覆盖成功/重试/耗尽/
 * HTTP 非 2xx/真实 `AbortSignal` 到期五类；其中一枚用**本机 loopback TCP 黑洞**
 * （`net.createServer` 接受连接后故意零响应）驱动**真实全局 `fetch`**，是本文件唯一
 * 触碰网络 I/O 的用例——但目标恒为 `127.0.0.1`，不出网、不依赖 `nodejs.org` 可达，
 * 与上一段「零网络」的既有定位不冲突。所有用例都给显式 `{ timeout }`（node:test 自身的
 * 用例超时），杜绝任何回归把它们变成真正的无限挂起。
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import {
  BUNDLE_BASENAME,
  DOWNLOAD_RETRY_DELAY_MS,
  DOWNLOAD_TIMEOUT_MS,
  MAX_DOWNLOAD_ATTEMPTS,
  NODE_VERSION,
  PACKAGE_ROOT,
  PRODUCT_ENTRY,
  ROUTE_ID,
  SIDECAR_BASENAME,
  SNAPSHOT_INVENTORY,
  TAURI_SIGNING_ARGS,
  TARGETS,
  USE_CODE_CACHE,
  archiveProblems,
  assertSafeToken,
  buildDeterministicBundle,
  bundleOptions,
  fetchWithTimeoutRetry,
  inventoryOf,
  inventoryProblems,
  packagedRuntimeProblems,
  readMachoArch,
  renderRouteManifest,
  routeManifestBytes,
  runtimeProblems,
  snapshotReuseProblems,
  stageDirPath,
} from './build-product-sidecar.mjs';

const scratchRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pi-host-build-test-'));

function machoHeader(cpuType, magic = 0xfeedfacf) {
  const head = Buffer.alloc(8);
  head.writeUInt32LE(magic, 0);
  head.writeUInt32LE(cpuType, 4);
  return head;
}

/** 造一份合格的三件 snapshot，供正例与「只改一项」的反例共用。 */
function makeSnapshot(name, contents = { a: 'arm', b: 'x86', c: 'cjs' }) {
  const dir = path.join(scratchRoot, name);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${SIDECAR_BASENAME}-${TARGETS[0].targetTriple}`), contents.a);
  fs.writeFileSync(path.join(dir, `${SIDECAR_BASENAME}-${TARGETS[1].targetTriple}`), contents.b);
  fs.writeFileSync(path.join(dir, BUNDLE_BASENAME), contents.c);
  return dir;
}

test('冻结表逐值等于票面 §二.4 的 Route A 真值', () => {
  assert.equal(ROUTE_ID, 'node22-runtime-sealed-cjs-v1');
  assert.equal(NODE_VERSION, '22.23.1');
  assert.equal(USE_CODE_CACHE, false);
  assert.deepEqual(
    TARGETS.map((target) => [
      target.targetTriple,
      target.machoArch,
      target.archive.filename,
      target.archive.bytes,
      target.archive.sha256,
      target.sourceRuntime.bytes,
      target.sourceRuntime.sha256,
      target.runtime.bytes,
      target.runtime.sha256,
    ]),
    [
      [
        'aarch64-apple-darwin',
        'arm64',
        'node-v22.23.1-darwin-arm64.tar.gz',
        50067502,
        'ef28d8fab2c0e4314522d4bb1b7173270aa3937e93b92cb7de79c112ac1fa953',
        112928848,
        '2e3f1286a7eb3736346ed1803e458a0ff909e2b2d5bc746144dcb76970e9b99d',
        112271136,
        '54600689d8bce010c2c336ca320d016018fb5d4af6ea74f38c7ad786492ff51f',
      ],
      [
        'x86_64-apple-darwin',
        'x86_64',
        'node-v22.23.1-darwin-x64.tar.gz',
        51245086,
        'b8da981b8a0b1241b70249204916da76c63573ddf5814dbd2d1e41069105cb81',
        115447952,
        '03afb3618a2685335209c93f8c34633f8316dbe6cc32196bc19daa1a73852e5b',
        115446688,
        'd2cde31d078b01fb5244db4539ea63d84200349434fa68aee60655f316404371',
      ],
    ],
  );
  assert.deepEqual(SNAPSHOT_INVENTORY, [
    'pi-sidecar-aarch64-apple-darwin',
    'pi-sidecar-x86_64-apple-darwin',
    'sidecar.cjs',
  ]);
});

test('stage 目录是正式根的 sibling，且只收 SafeToken', () => {
  const staged = stageDirPath('b1234-deadbeef');
  assert.equal(path.dirname(staged), path.join(PACKAGE_ROOT, 'dist'));
  assert.equal(path.basename(staged), '.product-sidecar.stage-b1234-deadbeef');
  // 正式根一定不会被 stage 名撞上。
  assert.notEqual(staged, path.join(PACKAGE_ROOT, 'dist', 'product-sidecar'));
  for (const bad of ['', '../escape', '_leading', 'has space', 'has/slash', 'a'.repeat(129)]) {
    assert.throws(() => assertSafeToken(bad), /SafeToken/, `应拒 ${JSON.stringify(bad)}`);
  }
  assert.equal(assertSafeToken('a'.repeat(128)), 'a'.repeat(128));
});

test('Mach-O 判定只认 thin 64-bit LE 的两枚 cputype', () => {
  assert.equal(readMachoArch(machoHeader(0x0100000c)), 'arm64');
  assert.equal(readMachoArch(machoHeader(0x01000007)), 'x86_64');
  // 反例：fat header、32-bit magic、错 cputype、长度不足，一律不认。
  assert.equal(readMachoArch(machoHeader(0x0100000c, 0xcafebabe)), null);
  assert.equal(readMachoArch(machoHeader(0x0100000c, 0xfeedface)), null);
  assert.equal(readMachoArch(machoHeader(0x0000000c)), null);
  assert.equal(readMachoArch(Buffer.alloc(4)), null);
  assert.equal(readMachoArch(null), null);
});

test('inventory 闭集恰三件普通文件', () => {
  assert.deepEqual(inventoryProblems(inventoryOf(makeSnapshot('good'))), []);

  const extra = makeSnapshot('extra');
  fs.writeFileSync(path.join(extra, 'README.md'), 'x');
  assert.ok(inventoryProblems(inventoryOf(extra)).some((problem) => problem.includes('不是冻结三件')));

  const missing = makeSnapshot('missing');
  fs.rmSync(path.join(missing, BUNDLE_BASENAME));
  assert.ok(inventoryProblems(inventoryOf(missing)).some((problem) => problem.includes('不是冻结三件')));

  const asDir = makeSnapshot('as-dir');
  fs.rmSync(path.join(asDir, BUNDLE_BASENAME));
  fs.mkdirSync(path.join(asDir, BUNDLE_BASENAME));
  assert.ok(inventoryProblems(inventoryOf(asDir)).some((problem) => problem.includes('不是普通文件')));

  const asLink = makeSnapshot('as-link');
  fs.rmSync(path.join(asLink, BUNDLE_BASENAME));
  fs.symlinkSync(path.join(asLink, `${SIDECAR_BASENAME}-${TARGETS[0].targetTriple}`), path.join(asLink, BUNDLE_BASENAME));
  assert.ok(inventoryProblems(inventoryOf(asLink)).some((problem) => problem.includes('symlink')));

  // 根本身是 symlink：不得跟随进去当成合格树。
  const realRoot = makeSnapshot('real-root');
  const linkedRoot = path.join(scratchRoot, 'linked-root');
  fs.rmSync(linkedRoot, { recursive: true, force: true });
  fs.symlinkSync(realRoot, linkedRoot);
  assert.ok(inventoryProblems(inventoryOf(linkedRoot)).some((problem) => problem.includes('不是目录')));

  assert.deepEqual(inventoryProblems(inventoryOf(path.join(scratchRoot, '并不存在'))), ['snapshot 根不存在']);
});

test('正式根只在 exact inventory 且逐件 byte-identical 时才可复用', () => {
  const stage = makeSnapshot('reuse-stage');
  const same = makeSnapshot('reuse-same');
  assert.deepEqual(snapshotReuseProblems(same, stage), []);

  // 反例一：只改一件的内容。
  const drifted = makeSnapshot('reuse-drift', { a: 'arm', b: 'x86', c: 'cjs-v2' });
  assert.ok(
    snapshotReuseProblems(drifted, stage).some((problem) => problem.includes('不 byte-identical')),
    '内容漂移必须拒',
  );

  // 反例二：inventory 多一件。
  const extra = makeSnapshot('reuse-extra');
  fs.writeFileSync(path.join(extra, 'stray.txt'), 'x');
  assert.ok(snapshotReuseProblems(extra, stage).some((problem) => problem.startsWith('正式根：')));
});

test('archive 五项判据逐条带区分力', () => {
  const target = TARGETS[0];
  const good = {
    name: target.archive.filename,
    bytes: target.archive.bytes,
    sha256: target.archive.sha256,
    shasumsEntry: target.archive.sha256,
    tarOk: true,
    tarStderr: null,
  };
  assert.deepEqual(archiveProblems(good, target), []);
  assert.equal(archiveProblems({ ...good, name: 'node-v22.23.1-darwin-arm64.tgz' }, target).length, 1);
  assert.equal(archiveProblems({ ...good, bytes: target.archive.bytes - 1 }, target).length, 1);
  // 冻结表与同次下载的 SHASUMS 是**两个独立见证**：动一个只红一条，两个都动才红两条。
  assert.equal(archiveProblems({ ...good, sha256: 'f'.repeat(64) }, target).length, 1);
  assert.equal(archiveProblems({ ...good, shasumsEntry: null }, target).length, 1);
  assert.equal(archiveProblems({ ...good, sha256: 'f'.repeat(64), shasumsEntry: 'f'.repeat(64) }, target).length, 2);
  assert.equal(archiveProblems({ ...good, tarOk: false, tarStderr: 'bad gzip' }, target).length, 1);
});

test('runtime 三项判据逐条带区分力', () => {
  const target = TARGETS[1];
  const sourceGood = {
    bytes: target.sourceRuntime.bytes,
    sha256: target.sourceRuntime.sha256,
    machoArch: target.machoArch,
  };
  const packagedGood = {
    bytes: target.runtime.bytes,
    sha256: target.runtime.sha256,
    machoArch: target.machoArch,
  };
  const good = sourceGood;
  assert.deepEqual(runtimeProblems(good, target), []);
  assert.equal(runtimeProblems({ ...good, bytes: 0 }, target).length, 1);
  assert.equal(runtimeProblems({ ...good, sha256: '0'.repeat(64) }, target).length, 1);
  // 双件交换：arm64 的实物落到 x86_64 那一格，Mach-O 判据必须抓住。
  assert.equal(runtimeProblems({ ...good, machoArch: 'arm64' }, target).length, 1);
  assert.equal(runtimeProblems({ ...good, machoArch: null }, target).length, 1);
  assert.deepEqual(packagedRuntimeProblems(packagedGood, target), []);
  assert.equal(packagedRuntimeProblems({ ...packagedGood, bytes: 0 }, target).length, 1);
  assert.equal(packagedRuntimeProblems({ ...packagedGood, sha256: '0'.repeat(64) }, target).length, 1);
});

test('manifest 只把签后 runtime 实测 digest 带入 schema，source archive 语义不变', () => {
  const target = TARGETS[0];
  const bundle = { bytes: 123, sha256: '1'.repeat(64) };
  const manifest = renderRouteManifest({ targets: [target], bundle });
  assert.deepEqual(manifest, {
    schemaVersion: 1,
    routeId: 'node22-runtime-sealed-cjs-v1',
    nodeVersion: '22.23.1',
    useCodeCache: false,
    bundle: {
      resourceRelativePath: 'pi-loop-resources/sidecar.cjs',
      bytes: 123,
      sha256: '1'.repeat(64),
    },
    targets: [
      {
        targetTriple: target.targetTriple,
        machoArch: target.machoArch,
        sourceArchive: {
          filename: target.archive.filename,
          bytes: target.archive.bytes,
          sha256: target.archive.sha256,
        },
        runtime: {
          externalBinBasename: 'pi-sidecar',
          bytes: target.runtime.bytes,
          sha256: target.runtime.sha256,
        },
      },
    ],
  });
  assert.equal(routeManifestBytes({ targets: [target], bundle }).toString('utf8').endsWith('\n'), true);
  assert.ok(TAURI_SIGNING_ARGS.includes('--options'));
});

test('bundle 选项是冻结值，且不开 code cache / sourcemap', () => {
  const options = bundleOptions('/entry.ts', '/out.cjs');
  assert.equal(options.bundle, true);
  assert.equal(options.platform, 'node');
  assert.equal(options.target, 'node22');
  assert.equal(options.format, 'cjs');
  assert.equal(options.minify, true);
  assert.equal(options.sourcemap, false);
  assert.equal(USE_CODE_CACHE, false);
  assert.ok(!('codeCache' in options));
});

test('从 product source 现编两次 byte-identical，并链进真实 DeepSeek catalog', async () => {
  const built = await buildDeterministicBundle({ scratchDir: path.join(scratchRoot, 'bundle') });
  assert.equal(built.reproducible, true);
  assert.ok(built.bytes > 0);
  assert.match(built.sha256, /^[0-9a-f]{64}$/);

  const text = fs.readFileSync(path.join(scratchRoot, 'bundle', 'bundle-a.cjs'), 'utf8');
  assert.ok(text.includes('api.deepseek.com'), 'production bundle 必须链进真实 provider catalog');
  assert.ok(!text.includes('fauxProvider'), 'scripted provider 不得进入 production bundle');
  assert.ok(!text.includes(PACKAGE_ROOT), 'bundle 不得烧进构建期绝对路径');
  assert.equal(PRODUCT_ENTRY, path.join(PACKAGE_ROOT, 'src', 'product-main.ts'));

  process.stdout.write(`bundle bytes=${built.bytes} sha256=${built.sha256}\n`);
});

test('普通 build 不触发生成器：只有独占 script 会跑它', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(PACKAGE_ROOT, 'package.json'), 'utf8'));
  assert.equal(manifest.scripts.build, 'tsc -p tsconfig.json');
  assert.equal(manifest.scripts['build:product-sidecar'], 'node scripts/build-product-sidecar.mjs');
  assert.equal(manifest.scripts['test:product-sidecar'], 'node --test scripts/build-product-sidecar.test.mjs');
  for (const hook of ['postinstall', 'prepare', 'prepublish', 'prepublishOnly', 'preinstall']) {
    assert.equal(manifest.scripts[hook], undefined, `${hook} 不得存在`);
  }
  // 依赖集合零变化：本票不加任何 crate/npm。
  assert.deepEqual(Object.keys(manifest.dependencies).sort(), [
    '@earendil-works/pi-agent-core',
    '@earendil-works/pi-ai',
  ]);
  assert.deepEqual(Object.keys(manifest.devDependencies).sort(), ['@types/node', 'esbuild', 'postject']);
  assert.equal(manifest.devDependencies.esbuild, '0.28.1');
});

test('PI-FETCH-TIMEOUT-1：下载超时/重试冻结值', () => {
  assert.equal(DOWNLOAD_TIMEOUT_MS, 60_000);
  assert.equal(MAX_DOWNLOAD_ATTEMPTS, 3);
  assert.equal(DOWNLOAD_RETRY_DELAY_MS, 5_000);
  // 全失速下的最坏总时长必须显式有界，且远小于验收环境登记的 14/16 分钟静默挂起。
  const worstCaseMs = MAX_DOWNLOAD_ATTEMPTS * DOWNLOAD_TIMEOUT_MS + (MAX_DOWNLOAD_ATTEMPTS - 1) * DOWNLOAD_RETRY_DELAY_MS;
  assert.equal(worstCaseMs, 190_000);
  assert.ok(worstCaseMs < 14 * 60_000, '最坏总时长必须显著小于登记事故的 14 分钟下限');
});

/** 造一枚合格的假 Response：header 阶段 ok，body 阶段可读出固定字节。 */
function okResponse(bytes = new Uint8Array([1, 2, 3]).buffer) {
  return { ok: true, status: 200, arrayBuffer: async () => bytes };
}

test('fetchWithTimeoutRetry：首次即成功——零重试、零等待，body 与 fetch 同一次尝试内读出', async () => {
  let calls = 0;
  const sleeps = [];
  const result = await fetchWithTimeoutRetry('https://example.invalid/ok', {
    fetchImpl: async (url, init) => {
      calls += 1;
      assert.equal(url, 'https://example.invalid/ok');
      assert.ok(init.signal instanceof AbortSignal, '每次调用都必须带 AbortSignal');
      return okResponse();
    },
    sleepImpl: async (ms) => sleeps.push(ms),
  });
  assert.equal(result.response.ok, true);
  assert.equal(Buffer.from(result.body).length, 3);
  assert.equal(calls, 1);
  assert.deepEqual(sleeps, []);
});

test('fetchWithTimeoutRetry：前 N-1 次失败、最后一次成功——重试计数与延时逐次正确', async () => {
  let calls = 0;
  const sleeps = [];
  const result = await fetchWithTimeoutRetry('https://example.invalid/flaky', {
    maxAttempts: 3,
    retryDelayMs: 777,
    fetchImpl: async () => {
      calls += 1;
      if (calls < 3) throw new Error(`探测失败 #${calls}`);
      return okResponse();
    },
    sleepImpl: async (ms) => sleeps.push(ms),
  });
  assert.equal(result.response.ok, true);
  assert.equal(calls, 3);
  assert.deepEqual(sleeps, [777, 777], '只在失败之后等待，且延时逐次等于配置值');
});

test('fetchWithTimeoutRetry：耗尽次数抛具名错误——含 URL、已试次数，且不吞原始 cause', async () => {
  const sentinel = new Error('探测：连接被拒绝');
  let calls = 0;
  await assert.rejects(
    fetchWithTimeoutRetry('https://example.invalid/dead', {
      maxAttempts: 2,
      retryDelayMs: 1,
      fetchImpl: async () => {
        calls += 1;
        throw sentinel;
      },
      sleepImpl: async () => {},
    }),
    (error) => {
      assert.match(error.message, /已尝试 2 次/);
      assert.match(error.message, /https:\/\/example\.invalid\/dead/);
      assert.equal(error.cause, sentinel, '不得吞掉原始错误');
      return true;
    },
  );
  assert.equal(calls, 2);
});

test('fetchWithTimeoutRetry：HTTP 非 2xx 视为可重试失败，耗尽后具名', async () => {
  let calls = 0;
  await assert.rejects(
    fetchWithTimeoutRetry('https://example.invalid/503', {
      maxAttempts: 2,
      retryDelayMs: 1,
      fetchImpl: async () => {
        calls += 1;
        return { ok: false, status: 503 };
      },
      sleepImpl: async () => {},
    }),
    /HTTP 503/,
  );
  assert.equal(calls, 2);
});

test(
  'fetchWithTimeoutRetry：真实 AbortSignal 到期即可重试超时（信号驱动，非墙钟猜测）',
  { timeout: 3000 },
  async () => {
    const start = Date.now();
    await assert.rejects(
      fetchWithTimeoutRetry('https://example.invalid/hang', {
        timeoutMs: 80,
        maxAttempts: 2,
        retryDelayMs: 20,
        // 忠实模拟真实 fetch 对 AbortSignal 的行为：自己永不 resolve，只在 signal 触发时拒绝。
        fetchImpl: (url, { signal }) =>
          new Promise((resolve, reject) => {
            signal.addEventListener('abort', () => reject(signal.reason));
          }),
      }),
      (error) => {
        assert.match(error.message, /未在 80ms 内完成/);
        return true;
      },
    );
    const elapsed = Date.now() - start;
    assert.ok(elapsed < 1000, `应在数百毫秒内失败，实得 ${elapsed}ms`);
  },
);

test(
  'fetchWithTimeoutRetry：headers 阶段成功、body 流式读取途中失速——同一枚 signal 必须仍能救回，' +
    '不得绕过重试与具名包装（2026-08-10 真实网络实测复现过的缺陷回归锁）',
  { timeout: 3000 },
  async () => {
    let calls = 0;
    const start = Date.now();
    await assert.rejects(
      fetchWithTimeoutRetry('https://example.invalid/body-stall', {
        timeoutMs: 80,
        maxAttempts: 2,
        retryDelayMs: 20,
        fetchImpl: async (url, { signal }) => {
          calls += 1;
          // headers 阶段立即「成功」——旧实现在这里就会 return，把 body 阶段甩出保护范围。
          return {
            ok: true,
            status: 200,
            // body 阶段忠实模拟真实 fetch/undici 语义：body 流绑定同一枚 signal，
            // signal 到期时 body 读取被中止拒绝，而不是各自独立计时。
            arrayBuffer: () =>
              new Promise((resolve, reject) => {
                signal.addEventListener('abort', () => reject(signal.reason));
              }),
          };
        },
      }),
      (error) => {
        // 必须是本函数包装过的具名错误（含已试次数），不是裸 TimeoutError 冒泡。
        assert.match(error.message, /已尝试 2 次/);
        assert.match(error.message, /未在 80ms 内完成/);
        return true;
      },
    );
    assert.equal(calls, 2, 'body 阶段失速也必须触发重试，不能被当成「已成功」而只调一次');
    const elapsed = Date.now() - start;
    assert.ok(elapsed < 1000, `应在数百毫秒内失败，实得 ${elapsed}ms`);
  },
);

test(
  'fetchWithTimeoutRetry：对真实本地 TCP 黑洞（accept 后静默零响应）具名快红，不静默无限挂起',
  { timeout: 5000 },
  async () => {
    const server = net.createServer(() => {
      // 故意什么都不做：接受连接、不写任何字节、不关闭——真实失速，非模拟。
    });
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    const { port } = server.address();
    const url = `http://127.0.0.1:${port}/probe`;
    try {
      const start = Date.now();
      await assert.rejects(
        fetchWithTimeoutRetry(url, { timeoutMs: 200, maxAttempts: 2, retryDelayMs: 50 }),
        (error) => {
          assert.match(error.message, /已尝试 2 次/);
          assert.ok(error.message.includes(url), '错误必须携带被卡住的 URL');
          return true;
        },
      );
      const elapsed = Date.now() - start;
      assert.ok(elapsed < 2000, `真实黑洞下应在秒级内具名失败，实得 ${elapsed}ms`);
    } finally {
      server.close();
    }
  },
);

test.after(() => {
  fs.rmSync(scratchRoot, { recursive: true, force: true });
});
