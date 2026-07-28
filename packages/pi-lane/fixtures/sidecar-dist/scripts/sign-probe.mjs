/**
 * PI-SIDECAR-DIST-1 · 签名与 `.app` 嵌套形态探针（**开发态 ad-hoc 面**）。
 *
 * 边界先说清楚：本机没有 Developer ID 证书，也没有公证凭据。因此本脚本能证的只有
 * 「ad-hoc 条件下的可签、可验、可跑」，**证不了** Gatekeeper 公证、staple 与首启放行——
 * 那些属 `PI-SIDECAR-RELEASE-1`，本票一律记 blocked，不以 ad-hoc 冒充。
 *
 * 三问，都是分发路线选型直接要用的：
 * 1. 官方 Node 二进制带哪些 entitlement？两条路线都在分发一个 Node，重签时丢了会怎样？
 * 2. `-o runtime`（hardened runtime）下不带 entitlement 重签，V8 还能不能起来？
 * 3. 把产物放进 `.app` 的 `Contents/MacOS/`、按「先内后外」嵌套签名，验得过吗？还跑得动吗？
 *
 * 用法：`node scripts/sign-probe.mjs`
 */

import fs from 'node:fs';
import path from 'node:path';

import {
  DIST_DIR,
  NODE_VERSION,
  RUNTIME_DIR,
  SIDECAR_BASENAME,
  byteSize,
  ensureDir,
  rmrf,
  run,
  spawnNdjson,
} from './lib/toolkit.mjs';

const PROBE_DIR = path.join(DIST_DIR, 'sign-probe');
rmrf(PROBE_DIR);
ensureDir(PROBE_DIR);

const TRIPLE = 'aarch64-apple-darwin';
const OFFICIAL = path.join(RUNTIME_DIR, `node-${NODE_VERSION}-darwin-arm64`, 'bin', 'node');

const report = { triple: TRIPLE, official: {}, resign: [], appBundle: {} };

// —— 问一：官方二进制的签名与 entitlement 真值。
const dumped = run('codesign', ['-d', '--entitlements', '-', '--xml', OFFICIAL]);
const entitlementsFile = path.join(PROBE_DIR, 'node-official.entitlements.plist');
const xml = dumped.stdout.slice(dumped.stdout.indexOf('<?xml'));
if (xml.startsWith('<?xml')) fs.writeFileSync(entitlementsFile, xml);
report.official = {
  binary: OFFICIAL,
  bytes: byteSize(OFFICIAL),
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
    const exited = await proc.exited;
    return { ok: false, exit: exited, stderrTail: proc.stderr().split('\n').filter(Boolean).slice(-3) };
  }
  proc.child.stdin.end();
  await proc.exited;
  return { ok: true, sea: ready.sea, node: ready.node };
}

// —— 问二：三种重签姿势 × 两条路线的产物。
const SUBJECTS = [
  {
    id: 'a/cjs',
    source: path.join(DIST_DIR, 'route-a', `${TRIPLE}--cjs`, `${SIDECAR_BASENAME}-${TRIPLE}`),
    args: [path.join(DIST_DIR, 'route-a', `${TRIPLE}--cjs`, 'sidecar.cjs')],
  },
  {
    id: 'b/default',
    source: path.join(DIST_DIR, 'route-b', `${TRIPLE}--default`, `${SIDECAR_BASENAME}-${TRIPLE}`),
    args: [],
  },
];

const RESIGN_MODES = [
  { name: 'adhoc-plain', flags: ['--sign', '-'] },
  { name: 'adhoc-hardened-no-entitlements', flags: ['--sign', '-', '--options', 'runtime'] },
  {
    name: 'adhoc-hardened-with-official-entitlements',
    flags: ['--sign', '-', '--options', 'runtime', '--entitlements', entitlementsFile],
  },
];

for (const subject of SUBJECTS) {
  if (!fs.existsSync(subject.source)) {
    report.resign.push({ subject: subject.id, status: 'blocked', reason: 'artifact-missing' });
    continue;
  }
  for (const mode of RESIGN_MODES) {
    if (mode.flags.includes('--entitlements') && !fs.existsSync(entitlementsFile)) {
      report.resign.push({ subject: subject.id, mode: mode.name, status: 'blocked', reason: 'entitlements-missing' });
      continue;
    }
    const workDir = path.join(PROBE_DIR, `${subject.id.replace('/', '-')}--${mode.name}`);
    ensureDir(workDir);
    const copy = path.join(workDir, `${SIDECAR_BASENAME}-${TRIPLE}`);
    fs.copyFileSync(subject.source, copy);
    fs.chmodSync(copy, 0o755);

    const signed = run('codesign', ['--force', ...mode.flags, copy]);
    const verified = run('codesign', ['--verify', '--strict', '--verbose=2', copy]);
    const displayed = run('codesign', ['-dv', '--verbose=2', copy]);
    report.resign.push({
      subject: subject.id,
      mode: mode.name,
      signExit: signed.status,
      signStderr: signed.stderr.trim().slice(0, 400),
      verifyExit: verified.status,
      flags: (displayed.stderr.match(/flags=[^\s]+/) ?? [null])[0],
      run: await launches(copy, subject.args),
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

const nestedSource = path.join(DIST_DIR, 'route-b', `${TRIPLE}--default`, `${SIDECAR_BASENAME}-${TRIPLE}`);
const nested = path.join(APP, 'Contents', 'MacOS', `${SIDECAR_BASENAME}-${TRIPLE}`);
if (fs.existsSync(nestedSource)) {
  fs.copyFileSync(nestedSource, nested);
  fs.chmodSync(nested, 0o755);

  // 苹果的次序要求：先签嵌套代码，再签外层 bundle。`--deep` 只用于 verify，不代签。
  const signNested = run('codesign', ['--force', '--sign', '-', nested]);
  const signOuter = run('codesign', ['--force', '--sign', '-', APP]);
  report.appBundle = {
    layout: 'Contents/MacOS/<externalBin>',
    signNestedExit: signNested.status,
    signOuterExit: signOuter.status,
    verifyDeepStrictExit: run('codesign', ['--verify', '--deep', '--strict', '--verbose=2', APP]).status,
    verifyDeepStrictStderr: run('codesign', ['--verify', '--deep', '--strict', '--verbose=2', APP])
      .stderr.trim()
      .split('\n')
      .slice(0, 4),
    // ad-hoc 必然过不了 Gatekeeper：如实记下它说什么，作为「未公证」的实证而非推断。
    spctl: run('spctl', ['-a', '-vv', APP]).stderr.trim().split('\n').slice(0, 4),
    spctlExit: run('spctl', ['-a', '-vv', APP]).status,
    nestedRun: await launches(nested),
  };
} else {
  report.appBundle = { status: 'blocked', reason: 'route-b-artifact-missing' };
}

fs.writeFileSync(path.join(DIST_DIR, 'sign-probe.json'), `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
