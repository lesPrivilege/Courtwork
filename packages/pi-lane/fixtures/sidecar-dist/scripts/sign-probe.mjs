/**
 * PI-SIDECAR-DIST-1R · 签名与 `.app` 嵌套形态探针（**同机开发态 ad-hoc 面**）。
 *
 * 边界先说清楚，且本文件不作任何超出它的宣称：本机没有 Developer ID 证书，也没有公证凭据。
 * 本支能证的只有「同机 ad-hoc 条件下的可签、可验、可跑」。它**不宣称** Tauri bundler 的实际
 * 行为、不宣称 Developer ID、不宣称 notarize/staple、不宣称跨机可复现——那些属
 * `PI-SIDECAR-RELEASE-1`，一律记 blocked，不以 ad-hoc 冒充。
 *
 * 三问，都是分发路线选型直接要用的：
 * 1. 官方 Node 二进制带哪些 entitlement？两条路线都在分发一个 Node，重签时丢了会怎样？
 * 2. `-o runtime`（硬化运行时）下不带 entitlement 重签，V8 还能不能起来？
 * 3. 把产物放进 `.app` 的 `Contents/MacOS/`、按「先内后外」嵌套签名，验得过吗？还跑得动吗？
 *
 * 与 `70e6482` 的差别：原件全篇只记录、无一处比对，连 `blocked` 也只是写进 JSON。现在
 * 六格 × sign/verify/launch 与嵌套 `.app` 全部经 `verdictSign` 判——其中
 * 「硬化 + 无 entitlements 必须起不来」也是锁死的既知形态：它哪天起来了，报告第七节的
 * 结论就得重写，故同样判红。
 *
 * 用法：`node scripts/sign-probe.mjs`
 */

import fs from 'node:fs';
import path from 'node:path';

import { SIGN_MODES, SIGN_SUBJECT_IDS, TARGETS, conclude, verdictSign } from './lib/probe-verdict.mjs';
import {
  DIST_DIR,
  NODE_VERSION,
  RUNTIME_DIR,
  SIDECAR_BASENAME,
  byteSize,
  ensureDir,
  resolveInventory,
  rmrf,
  run,
  spawnNdjson,
} from './lib/toolkit.mjs';

const PROBE_DIR = path.join(DIST_DIR, 'sign-probe');
rmrf(PROBE_DIR);
ensureDir(PROBE_DIR);

const TRIPLE = TARGETS[0].triple;
const OFFICIAL = path.join(RUNTIME_DIR, `node-${NODE_VERSION}-darwin-arm64`, 'bin', 'node');

const report = {
  scope: 'same-machine ad-hoc only; Developer ID / notarize / staple / tauri-bundler 均 blocked',
  triple: TRIPLE,
  official: {},
  resign: [],
  appBundle: {},
};

// —— 问一：官方二进制的签名与 entitlement 真值。
const dumped = run('codesign', ['-d', '--entitlements', '-', '--xml', OFFICIAL]);
const entitlementsFile = path.join(PROBE_DIR, 'node-official.entitlements.plist');
const xml = dumped.stdout.slice(dumped.stdout.indexOf('<?xml'));
if (xml.startsWith('<?xml')) fs.writeFileSync(entitlementsFile, xml);
report.official = {
  binary: OFFICIAL,
  bytes: fs.existsSync(OFFICIAL) ? byteSize(OFFICIAL) : null,
  codesign: run('codesign', ['-dv', '--verbose=4', OFFICIAL]).stderr.trim().split('\n'),
  entitlementKeys: [...xml.matchAll(/<key>([^<]+)<\/key>/g)].map((match) => match[1]),
  entitlementsFile: fs.existsSync(entitlementsFile) ? entitlementsFile : null,
};

/** 起一次、要一个 ready、再退出；跑不起来就把 stderr 尾三行留成红证。 */
async function launches(command, args = []) {
  const proc = spawnNdjson(command, args);
  const ready = await proc.waitFor((packet) => packet.op === 'ready', 30_000);
  if (!ready) {
    proc.child.kill('SIGKILL');
    const exit = await proc.exited;
    return { ok: false, exit, stderrTail: proc.stderr().split('\n').filter(Boolean).slice(-3) };
  }
  proc.child.stdin.end();
  await proc.exited;
  return { ok: true, sea: ready.sea, node: ready.node };
}

// —— 问二：三种重签姿势 × 两条路线各一枚 aarch64 产物。
const inventory = resolveInventory();
const SUBJECTS = SIGN_SUBJECT_IDS.map((id) => {
  const artifact = inventory.find((entry) => entry.id === id);
  return { id, source: artifact.command, args: artifact.args };
});

const flagsFor = (mode) => ['--sign', '-', ...(mode.hardened ? ['--options', 'runtime'] : []),
  ...(mode.entitlements ? ['--entitlements', entitlementsFile] : [])];

for (const subject of SUBJECTS) {
  for (const mode of SIGN_MODES) {
    if (!fs.existsSync(subject.source)) {
      report.resign.push({ subject: subject.id, mode: mode.name, status: 'blocked', reason: 'artifact-missing' });
      continue;
    }
    if (mode.entitlements && !fs.existsSync(entitlementsFile)) {
      report.resign.push({ subject: subject.id, mode: mode.name, status: 'blocked', reason: 'entitlements-missing' });
      continue;
    }
    const workDir = path.join(PROBE_DIR, `${subject.id.replaceAll('/', '-')}--${mode.name}`);
    ensureDir(workDir);
    const copy = path.join(workDir, `${SIDECAR_BASENAME}-${TRIPLE}`);
    fs.copyFileSync(subject.source, copy);
    fs.chmodSync(copy, 0o755);
    // 路线甲的随行 bundle 也要跟着到 workDir，否则「跑不起来」测的是缺文件不是签名。
    for (const arg of subject.args) fs.copyFileSync(arg, path.join(workDir, path.basename(arg)));
    const args = subject.args.map((arg) => path.join(workDir, path.basename(arg)));

    const signed = run('codesign', ['--force', ...flagsFor(mode), copy]);
    const verified = run('codesign', ['--verify', '--strict', '--verbose=2', copy]);
    const displayed = run('codesign', ['-dv', '--verbose=2', copy]);
    const attempt = await launches(copy, args);
    report.resign.push({
      subject: subject.id,
      mode: mode.name,
      status: 'ok',
      signExit: signed.status,
      signStderr: signed.stderr.trim().slice(0, 400),
      verifyExit: verified.status,
      flags: (displayed.stderr.match(/flags=[^\s]+/) ?? [null])[0],
      launched: attempt.ok,
      run: attempt,
    });
  }
}

// —— 问三：`.app` 内嵌套形态。Tauri 会把 externalBin 复制进 Contents/MacOS/。
const APP = path.join(PROBE_DIR, 'SidecarProbe.app');
ensureDir(path.join(APP, 'Contents', 'MacOS'));
ensureDir(path.join(APP, 'Contents', 'Resources'));
fs.writeFileSync(
  path.join(APP, 'Contents', 'Info.plist'),
  `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleExecutable</key><string>SidecarProbe</string>
<key>CFBundleIdentifier</key><string>cn.courtwork.sidecar-probe</string>
<key>CFBundleName</key><string>SidecarProbe</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>CFBundleShortVersionString</key><string>0.0.0</string>
</dict></plist>
`,
);
// 外壳主可执行文件用系统 `/usr/bin/true` 的副本：本探针只关心嵌套结构，不关心外壳行为。
fs.copyFileSync('/usr/bin/true', path.join(APP, 'Contents', 'MacOS', 'SidecarProbe'));
fs.chmodSync(path.join(APP, 'Contents', 'MacOS', 'SidecarProbe'), 0o755);

const nestedSource = inventory.find((entry) => entry.id === SIGN_SUBJECT_IDS[1]).command;
const nested = path.join(APP, 'Contents', 'MacOS', `${SIDECAR_BASENAME}-${TRIPLE}`);
if (fs.existsSync(nestedSource)) {
  fs.copyFileSync(nestedSource, nested);
  fs.chmodSync(nested, 0o755);

  // 苹果的次序要求：先签嵌套代码，再签外层 bundle。`--deep` 只用于 verify，不代签。
  const signNested = run('codesign', ['--force', '--sign', '-', nested]);
  const signOuter = run('codesign', ['--force', '--sign', '-', APP]);
  const deepVerify = run('codesign', ['--verify', '--deep', '--strict', '--verbose=2', APP]);
  const spctl = run('spctl', ['-a', '-vv', APP]);
  const nestedRun = await launches(nested);
  report.appBundle = {
    status: 'ok',
    layout: 'Contents/MacOS/<externalBin>',
    signNestedExit: signNested.status,
    signOuterExit: signOuter.status,
    verifyDeepStrictExit: deepVerify.status,
    verifyDeepStrictStderr: deepVerify.stderr.trim().split('\n').slice(0, 4),
    // ad-hoc 必然过不了 Gatekeeper：如实记下它说什么，作为「未公证」的实证而非推断。
    spctlExit: spctl.status,
    spctl: spctl.stderr.trim().split('\n').slice(0, 4),
    nestedLaunched: nestedRun.ok,
    nestedRun,
  };
} else {
  report.appBundle = { status: 'blocked', reason: 'route-b-artifact-missing' };
}

const verdict = conclude(verdictSign(report), { probe: 'sign-probe', ...report });
fs.writeFileSync(path.join(DIST_DIR, 'sign-probe.json'), `${JSON.stringify(verdict, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(verdict, null, 2)}\n`);
process.stdout.write(`\nstatus=${verdict.status} failures=${verdict.failureCount}\n`);
for (const failure of verdict.failures) {
  process.stdout.write(`  ✗ ${failure.id} ${failure.check}: 期望 ${JSON.stringify(failure.expected)}，实测 ${JSON.stringify(failure.observed)}\n`);
}

if (verdict.status !== 'ok') process.exit(1);
