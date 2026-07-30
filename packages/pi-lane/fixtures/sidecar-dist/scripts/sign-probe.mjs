/**
 * PI-SIDECAR-DIST-1R3 · entitlements 四层证据与 security-execution-domain 探针。
 *
 * 只证明同机 ad-hoc 探针；不裁路线，不产生产品 signing plan，不宣称 Developer ID、
 * notarization、Tauri bundler 或公开发行成熟度。
 *
 * 用法：
 *   node scripts/sign-probe.mjs --execution-domain-id <id> [--preflight-only]
 */

import { spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  APPLE_TOOL_PATHS,
  CANONICAL_ENTITLEMENTS,
  CANONICAL_SOURCE,
  EXECUTION_DOMAIN_ID,
  OFFICIAL_NODE_SHA256,
  SIGN_MODES,
  SIGN_SUBJECT_IDS,
  TARGETS,
  classifyPreflight,
  conclude,
  deriveGatesFromRaw,
  deriveSecurityBlockedReasons,
  firstNonemptyLine,
  officialNodeExpectedPath,
  parseCodesignFlags,
  parseDerHumanEntitlements,
  parseOfficialSignatureIdentity,
  securityReasonsFromStreams,
  signCellDirName,
  verdictPreflightRun,
  verdictSign,
} from './lib/probe-verdict.mjs';
import {
  DIST_DIR,
  FIXTURE_DIR,
  REPO_ROOT,
  SIDECAR_BASENAME,
  byteSize,
  ensureDir,
  resolveInventory,
  sha256File,
  spawnNdjson,
} from './lib/toolkit.mjs';

const CODESIGN = '/usr/bin/codesign';
const SPCTL = '/usr/sbin/spctl';
const PLUTIL = '/usr/bin/plutil';
const FILE = '/usr/bin/file';
const SW_VERS = '/usr/bin/sw_vers';
const UNAME = '/usr/bin/uname';
const XCODE_SELECT = '/usr/bin/xcode-select';
const PKGUTIL = '/usr/sbin/pkgutil';
const TRUE = '/usr/bin/true';

const CONTROL_DEADLINES = {
  readyMs: 30_000,
  eofMs: 15_000,
  exitMs: 15_000,
  killConfirmMs: 5_000,
};

const args = process.argv.slice(2);
const domainFlag = args.indexOf('--execution-domain-id');
const executionDomainId = domainFlag >= 0 ? args[domainFlag + 1] : null;
const preflightOnly = args.includes('--preflight-only');
const allowedArgCount = preflightOnly ? 3 : 2;

if (
  !executionDomainId ||
  !EXECUTION_DOMAIN_ID.test(executionDomainId) ||
  domainFlag < 0 ||
  args.length !== allowedArgCount ||
  (preflightOnly && args.at(-1) !== '--preflight-only')
) {
  process.stderr.write(
    '用法：node scripts/sign-probe.mjs --execution-domain-id <[a-z0-9][a-z0-9-]{0,31}> [--preflight-only]\n',
  );
  process.exit(2);
}

const SECURITY_DOMAIN_DIR = path.join(DIST_DIR, 'security-domain');
const FINAL_DIR = path.join(SECURITY_DOMAIN_DIR, executionDomainId);
if (fs.existsSync(FINAL_DIR)) {
  process.stderr.write(`拒绝覆盖既有 execution-domain 目录：${FINAL_DIR}\n`);
  process.exit(2);
}

ensureDir(SECURITY_DOMAIN_DIR);
const STAGING_DIR = path.join(
  SECURITY_DOMAIN_DIR,
  `.stage-${executionDomainId}-${process.pid}-${randomBytes(6).toString('hex')}`,
);
fs.mkdirSync(STAGING_DIR, { recursive: false, mode: 0o700 });

const startedAt = new Date().toISOString();
const commandReceipts = [];
let hostToolReceipt = null;
let preflight = null;
let signProbe = null;
let fatal = null;

try {
  hostToolReceipt = collectHostToolReceipt();
  writeJsonSynced(path.join(STAGING_DIR, 'host-tool-receipt.json'), hostToolReceipt);

  const canonical = validateCanonical();
  const official = officialNodeFingerprint();
  hostToolReceipt.officialNode = official;
  hostToolReceipt.canonicalSource = { ...CANONICAL_SOURCE };
  writeJsonSynced(path.join(STAGING_DIR, 'host-tool-receipt.json'), hostToolReceipt);

  preflight = await runPreflight(canonical, official);
  writeJsonSynced(path.join(STAGING_DIR, 'preflight.json'), preflight);

  if (preflight.status === 'ok' && !preflightOnly) {
    signProbe = await runFullProbe(canonical, official, preflight);
    writeJsonSynced(path.join(STAGING_DIR, 'sign-probe.json'), signProbe);
  }
} catch (cause) {
  fatal = {
    classification: 'probe_failed',
    code: 'unexpected_probe_error',
    message: cause instanceof Error ? cause.message : String(cause),
  };
  if (!hostToolReceipt) {
    hostToolReceipt = {
      status: 'failed',
      failure: fatal,
      commands: commandReceipts,
    };
    writeJsonSynced(path.join(STAGING_DIR, 'host-tool-receipt.json'), hostToolReceipt);
  }
  if (!preflight) {
    preflight = {
      executionDomainId,
      status: 'failed',
      classification: 'probe_failed',
      failure: fatal,
      startedAt,
      finishedAt: new Date().toISOString(),
      commandReceipts,
    };
    writeJsonSynced(path.join(STAGING_DIR, 'preflight.json'), preflight);
  }
}

hostToolReceipt.commands = commandReceipts;
writeJsonSynced(path.join(STAGING_DIR, 'host-tool-receipt.json'), hostToolReceipt);

// —— R5 闭口三：在形成 manifest/status **之前**跑 production-used hard verdict ——————
//
// R4 在这里直接取 producer 的 `preflight.status` / `signProbe.status`，preflight-only 更是
// 全程不经任何 verdict。现在两条路径都先过 hard verdict，final status 只由它映射；
// producer 自报值降为 parity。verdict 是进程内消费，不新增持久化证据文件。
const hardVerdict = fatal
  ? { status: 'probe_failed', failures: [{ id: 'sign', check: 'sign.probe.fatal', expected: null, observed: fatal }] }
  : verdictPreflightRun({
      executionDomainId,
      canonical: preflight?.canonical,
      preflight,
      hostToolReceipt,
    });

// full 路径另叠 `verdictSign` 的六格/`.app`/officialEntitlements 闭口；
// 任一层有 failure 都不得再由摘要重算成功。
const fullFailures = preflightOnly || fatal ? [] : (signProbe?.failures ?? [{ id: 'sign', check: 'sign.fullProbe.missing', expected: 'full probe verdict', observed: null }]);

// `verdictPreflightRun()` 的 `status` 已经把三种映射收在一处（failure→probe_failed、
// 恰 passed→ok、恰 blocked→同名 blocked），故这里只需再叠 full 的失败。
// producer 自报 status/classification 的 parity 由判定层内部强制，不在这里重算。
const finalStatus = fullFailures.length > 0 ? 'probe_failed' : hardVerdict.status;

const manifest = {
  schemaVersion: 1,
  executionDomainId,
  mode: preflightOnly ? 'preflight-only' : 'full',
  status: finalStatus,
  cwd: process.cwd(),
  startedAt,
  finishedAt: new Date().toISOString(),
  files: listJsonEvidence(STAGING_DIR),
};
writeJsonSynced(path.join(STAGING_DIR, 'manifest.json'), manifest);
syncDir(STAGING_DIR);
fs.renameSync(STAGING_DIR, FINAL_DIR);
syncDir(SECURITY_DOMAIN_DIR);

// R5 修（Stage C 矩阵实测坐实）：R4 的 `failureCount` 在 preflight-only 下是个**占位常量**
// （非 ok 一律报 1），hard verdict 的 failures 一条也不出现在任何输出面——「判红了但不说
// 为什么」本身就是静默降级。现在逐条摊到 stdout：真实计数 + 具名判据 + 期望/实测。
const hardFailures = [...hardVerdict.failures, ...fullFailures];
const output = {
  status: finalStatus,
  executionDomainId,
  mode: manifest.mode,
  manifestPath: repoRelative(path.join(FINAL_DIR, 'manifest.json')),
  manifestSha256: sha256File(path.join(FINAL_DIR, 'manifest.json')),
  rawPreflight: hardVerdict.raw
    ? { status: hardVerdict.raw.status, classification: hardVerdict.raw.classification }
    : null,
  failureCount: hardFailures.length,
  failures: hardFailures,
  fatal,
};
process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
if (finalStatus !== 'ok') process.exit(1);

function collectHostToolReceipt() {
  const tools = APPLE_TOOL_PATHS.map(fingerprintTool);
  const product = runReceipt(SW_VERS, ['-productVersion'], { record: false });
  const build = runReceipt(SW_VERS, ['-buildVersion'], { record: false });
  const darwin = runReceipt(UNAME, ['-r'], { record: false });
  const hardware = runReceipt(UNAME, ['-m'], { record: false });
  const xcodeSelect = runReceipt(XCODE_SELECT, ['-p'], { record: false });
  const clt = runReceipt(PKGUTIL, ['--pkg-info=com.apple.pkg.CLTools_Executables'], { record: false });
  const harnessNode = fingerprintRegularFile(process.execPath);

  return {
    schemaVersion: 1,
    executionDomainId,
    capturedAt: new Date().toISOString(),
    host: {
      macOSProductVersion: text(product.stdout),
      macOSBuildVersion: text(build.stdout),
      darwinRelease: text(darwin.stdout),
      hardwareArchitecture: text(hardware.stdout),
      processArchitecture: process.arch,
      platform: process.platform,
    },
    harnessNode: {
      ...harnessNode,
      version: process.version,
      execPath: process.execPath,
      architecture: process.arch,
    },
    developerTools: {
      xcodeSelectPath: text(xcodeSelect.stdout),
      cltPackageVersion: parsePkgVersion(text(clt.stdout)),
    },
    tools,
    commands: commandReceipts,
  };
}

function validateCanonical() {
  const absolute = path.join(REPO_ROOT, CANONICAL_ENTITLEMENTS.repoRelativePath);
  const fingerprint = fingerprintRegularFile(absolute);
  const lint = runApple(PLUTIL, ['-lint', absolute]);
  const json = runApple(PLUTIL, ['-convert', 'json', '-o', '-', absolute]);
  const values = json.exit === 0 ? JSON.parse(json.stdout.content) : null;
  const failures = [];

  if (
    fingerprint.bytes !== CANONICAL_ENTITLEMENTS.bytes ||
    fingerprint.sha256 !== CANONICAL_ENTITLEMENTS.sha256
  ) {
    failures.push('canonical byte identity mismatch');
  }
  if (lint.exit !== 0 || json.exit !== 0) failures.push('plutil rejected canonical fixture');
  if (!sameFlatRecord(values, CANONICAL_ENTITLEMENTS.values)) failures.push('canonical six-key semantics mismatch');
  if (failures.length > 0) throw new Error(`canonical_input_invalid: ${failures.join('; ')}`);

  return {
    ...CANONICAL_ENTITLEMENTS,
    absolutePath: absolute,
    regularFile: fingerprint.regularFile,
    symlink: fingerprint.symlink,
    values,
    lint,
    json,
  };
}

function officialNodeFingerprint() {
  // R5 锚点：坐标由判定层的冻结构造器给出，采集端与判定端共用同一份，不各拼一次。
  const officialPath = officialNodeExpectedPath();
  const fingerprint = fingerprintRegularFile(officialPath);
  if (fingerprint.sha256 !== OFFICIAL_NODE_SHA256) {
    throw new Error(`official_node_source_invalid: ${fingerprint.sha256 ?? 'missing'}`);
  }
  return { ...fingerprint, path: officialPath, expectedSha256: OFFICIAL_NODE_SHA256 };
}

async function runPreflight(canonical, official) {
  const controlDir = path.join(STAGING_DIR, 'control');
  fs.mkdirSync(controlDir, { mode: 0o700 });
  const controlNode = path.join(controlDir, 'node');
  fs.copyFileSync(official.path, controlNode, fs.constants.COPYFILE_EXCL);
  fs.chmodSync(controlNode, 0o755);

  const controlSign = runApple(CODESIGN, [
    '--force',
    '--sign',
    '-',
    '--options',
    'runtime',
    '--entitlements',
    canonical.absolutePath,
    controlNode,
  ]);
  const controlVerify = runApple(CODESIGN, ['--verify', '--strict', '--verbose=4', controlNode]);
  const controlXmlCommand = runApple(CODESIGN, ['-d', '--entitlements', '-', '--xml', controlNode]);
  const controlXml = parseXmlObservation(controlXmlCommand, path.join(controlDir, 'control.xml.plist'));
  const controlLaunch = await launchControl(controlNode);

  const verify = runApple(CODESIGN, ['--verify', '--strict', '--verbose=4', official.path]);
  const display = runApple(CODESIGN, ['-d', '--verbose=4', official.path]);
  const officialSignature = parseOfficialSignature(verify, display);

  const appGatekeeper = createAndProbeSyntheticApp(controlDir);
  // 采集端与判定端共用同一份推导：判定端会从同一批 raw receipt 重导并要求 exact parity。
  const blockedReasons = deriveSecurityBlockedReasons({
    controlSign,
    controlVerify,
    controlXml: controlXmlCommand,
    officialVerify: verify,
    officialDisplay: display,
    spctl: appGatekeeper.command,
  });

  // 四个 gate 与判定端共用同一份定义，直接从本轮 raw command 与 bounded launch 重导。
  // 签名面与生命周期面分开，正是 R3 分不清「域被挡」与「控制进程没起来」的修法。
  const gates = deriveGatesFromRaw({
    launch: controlLaunch,
    controlSign,
    controlVerify,
    controlXml: controlXmlCommand,
    controlXmlValues: controlXml.values,
    officialVerify: verify,
    officialDisplay: display,
    spctl: appGatekeeper.command,
    appPath: appGatekeeper.appPath,
  });
  const { status, classification } = classifyPreflight({ ...gates, blockedReasons });

  return {
    schemaVersion: 1,
    executionDomainId,
    status,
    classification,
    blockedReasons,
    gates,
    canonical: stripAbsoluteCanonical(canonical),
    control: {
      signExit: controlSign.exit,
      verifyExit: controlVerify.exit,
      sign: controlSign,
      verify: controlVerify,
      // R5 修（Stage C 矩阵实测坐实）：控制 XML 的**投影**必须在这里就成型。R4 只有
      // `runFullProbe()` 才把 exit/bytes/sha256/stderr 摊平，`runPreflight()` 交的是
      // `parseXmlObservation()` 原形；preflight-only 于是把缺这四格的对象喂进同一道
      // verdict，四条 `sign.preflight.rawGateParity` 全判 null。两条路径现在共用这一份投影。
      xml: projectXmlObservation(controlXml),
      launch: controlLaunch,
    },
    officialSignature,
    appGatekeeper,
    startedAt,
    finishedAt: new Date().toISOString(),
  };
}

async function runFullProbe(canonical, official, preflightObservation) {
  const officialXmlCommand = runApple(CODESIGN, ['-d', '--entitlements', '-', '--xml', official.path]);
  const officialXml = parseXmlObservation(
    officialXmlCommand,
    path.join(STAGING_DIR, 'official-node.xml.plist'),
  );
  const officialHumanCommand = runApple(CODESIGN, ['-d', '--entitlements', '-', official.path]);
  const officialHuman = parseHumanObservation(officialHumanCommand, official.path);

  const inventory = resolveInventory();
  const subjects = SIGN_SUBJECT_IDS.map((id) => {
    const artifact = inventory.find((entry) => entry.id === id);
    return { id, source: artifact.command, args: artifact.args };
  });
  const resign = [];

  for (const subject of subjects) {
    for (const mode of SIGN_MODES) {
      // 物理 cell 目录名走判定端的共享口径，两谱不再各拼一次。
      const workDir = path.join(STAGING_DIR, 'matrix', signCellDirName(subject.id, mode.name));
      fs.mkdirSync(workDir, { recursive: true, mode: 0o700 });
      const copy = path.join(workDir, `${SIDECAR_BASENAME}-${TARGETS[0].triple}`);
      const row = {
        subject: subject.id,
        mode: mode.name,
        status: 'failed',
        canonicalInputPath: CANONICAL_ENTITLEMENTS.repoRelativePath,
        canonicalInputSha256: CANONICAL_ENTITLEMENTS.sha256,
        // R5：判定端要按 mode 重建 sign 的完整 argv，故带上本轮 canonical 的绝对路径。
        canonicalInputAbsolutePath: mode.entitlements ? canonical.absolutePath : null,
      };
      if (!fs.existsSync(subject.source)) {
        row.reason = 'artifact-missing';
        resign.push(row);
        continue;
      }
      fs.copyFileSync(subject.source, copy, fs.constants.COPYFILE_EXCL);
      fs.chmodSync(copy, 0o755);
      for (const arg of subject.args) {
        fs.copyFileSync(arg, path.join(workDir, path.basename(arg)), fs.constants.COPYFILE_EXCL);
      }
      const copiedArgs = subject.args.map((arg) => path.join(workDir, path.basename(arg)));
      const signArgs = [
        '--force',
        '--sign',
        '-',
        ...(mode.hardened ? ['--options', 'runtime'] : []),
        ...(mode.entitlements ? ['--entitlements', canonical.absolutePath] : []),
        copy,
      ];
      const signed = runApple(CODESIGN, signArgs);
      const verified = runApple(CODESIGN, ['--verify', '--strict', '--verbose=4', copy]);
      const displayed = runApple(CODESIGN, ['-d', '--verbose=4', copy]);
      const actual = readActualEntitlements(copy, mode.entitlements, workDir);
      const launch = await launchExecutable(copy, copiedArgs);
      row.status = 'ok';
      row.signExit = signed.exit;
      row.sign = signed;
      row.verifyExit = verified.exit;
      row.verify = verified;
      row.flags = parseCodesignFlags(displayed.stderr.content);
      row.display = displayed;
      row.launched = launch.ok;
      row.run = launch;
      row.actualEntitlements = actual;
      resign.push(row);
    }
  }

  const appBundle = await createFullAppBundle(subjects.find((subject) => subject.id.startsWith('b/')));
  const observation = {
    executionDomainId,
    // R5 闭口四：六格与 `.app` 的全部 expected 坐标都由这一个 trusted stage root 推出。
    stageRoot: STAGING_DIR,
    canonical: stripAbsoluteCanonical(canonical),
    preflight: {
      status: preflightObservation.status,
      classification: preflightObservation.classification,
      blockedReasons: preflightObservation.blockedReasons,
      gates: preflightObservation.gates,
      control: {
        signExit: preflightObservation.control.signExit,
        verifyExit: preflightObservation.control.verifyExit,
        // 三条 control raw receipt 原样带上：判定端要拿它们重导 blocked reason，
        // 并与完整 receipt.commands 里的同一条逐字段对齐。
        sign: preflightObservation.control.sign,
        verify: preflightObservation.control.verify,
        // R5 修：投影已在 `runPreflight()` 成型（含落盘件与两条 plutil receipt，
        // 判定端据此重核 XML 语义，不接受自研宽 parser），这里原样复用，不再各摊一次。
        xml: preflightObservation.control.xml,
        launch: preflightObservation.control.launch,
      },
      officialSignature: preflightObservation.officialSignature,
      appGatekeeper: {
        exit: preflightObservation.appGatekeeper.exit,
        signal: preflightObservation.appGatekeeper.signal,
        stdout: preflightObservation.appGatekeeper.stdout,
        stderrFirstNonemptyLine: preflightObservation.appGatekeeper.stderrFirstNonemptyLine,
        appPath: preflightObservation.appGatekeeper.appPath,
        command: preflightObservation.appGatekeeper.command,
      },
    },
    officialEntitlements: {
      xml: {
        command: officialXmlCommand,
        values: officialXml.values,
        artifact: officialXml.artifact,
        lint: officialXml.lint,
        json: officialXml.json,
      },
      human: {
        command: officialHumanCommand,
        parseError: officialHuman.parseError,
        entries: officialHuman.entries,
        values: officialHuman.values,
      },
    },
    // R4：**原样**交出同轮完整 receipt。R3 在这里投影成 `{tools, commands}`，
    // 于是 host / harness Node / Developer Tools / official Node 删掉都还能假绿。
    hostToolReceipt,
    resign,
    appBundle,
  };
  const verdict = conclude(verdictSign(observation), {
    probe: 'sign-probe-r3',
    scope: 'same-machine ad-hoc only; no route recommendation',
    ...observation,
  });
  return verdict;
}

async function createFullAppBundle(subject) {
  const app = path.join(STAGING_DIR, 'app-bundle', 'SidecarProbe.app');
  const macos = path.join(app, 'Contents', 'MacOS');
  fs.mkdirSync(macos, { recursive: true, mode: 0o700 });
  fs.writeFileSync(
    path.join(app, 'Contents', 'Info.plist'),
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleExecutable</key><string>SidecarProbe</string>
<key>CFBundleIdentifier</key><string>cn.courtwork.sidecar-probe.r3.full</string>
<key>CFBundleName</key><string>SidecarProbe</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>CFBundleShortVersionString</key><string>0.0.0</string>
</dict></plist>
`,
    { mode: 0o600 },
  );
  const outerExecutable = path.join(macos, 'SidecarProbe');
  fs.copyFileSync(TRUE, outerExecutable, fs.constants.COPYFILE_EXCL);
  fs.chmodSync(outerExecutable, 0o755);

  const nested = path.join(macos, `${SIDECAR_BASENAME}-${TARGETS[0].triple}`);
  if (!subject || !fs.existsSync(subject.source)) {
    return { status: 'blocked', reason: 'route-b-artifact-missing' };
  }
  fs.copyFileSync(subject.source, nested, fs.constants.COPYFILE_EXCL);
  fs.chmodSync(nested, 0o755);

  const signNested = runApple(CODESIGN, ['--force', '--sign', '-', nested]);
  const signOuter = runApple(CODESIGN, ['--force', '--sign', '-', app]);
  const deepVerify = runApple(CODESIGN, ['--verify', '--deep', '--strict', '--verbose=4', app]);
  const spctl = runApple(SPCTL, ['-a', '-vv', app]);
  const nestedRun = await launchExecutable(nested);
  const spctlStderrFirstNonemptyLine = firstNonemptyLine(spctl.stderr.content);
  return {
    status: 'ok',
    signNestedExit: signNested.exit,
    signOuterExit: signOuter.exit,
    verifyDeepStrictExit: deepVerify.exit,
    nestedLaunched: nestedRun.ok,
    nestedRun,
    spctlExit: spctl.exit,
    spctlStdout: spctl.stdout.content,
    spctlStderrFirstNonemptyLine,
    appPath: app,
    signNested,
    signOuter,
    deepVerify,
    spctl,
  };
}

function createAndProbeSyntheticApp(root) {
  const app = path.join(root, 'SidecarProbe.app');
  const macos = path.join(app, 'Contents', 'MacOS');
  fs.mkdirSync(macos, { recursive: true, mode: 0o700 });
  fs.writeFileSync(
    path.join(app, 'Contents', 'Info.plist'),
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleExecutable</key><string>SidecarProbe</string>
<key>CFBundleIdentifier</key><string>cn.courtwork.sidecar-probe.r3</string>
<key>CFBundleName</key><string>SidecarProbe</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>CFBundleShortVersionString</key><string>0.0.0</string>
</dict></plist>
`,
    { mode: 0o600 },
  );
  const executable = path.join(macos, 'SidecarProbe');
  fs.copyFileSync(TRUE, executable, fs.constants.COPYFILE_EXCL);
  fs.chmodSync(executable, 0o755);
  const signNested = runApple(CODESIGN, ['--force', '--sign', '-', executable]);
  const signOuter = runApple(CODESIGN, ['--force', '--sign', '-', app]);
  const deepVerify = runApple(CODESIGN, ['--verify', '--deep', '--strict', '--verbose=4', app]);
  const command = runApple(SPCTL, ['-a', '-vv', app]);
  // 与判定端同源：首非空行只由共享纯函数从 raw stderr 取一次。
  const firstLine = firstNonemptyLine(command.stderr.content);
  return {
    appPath: app,
    exit: command.exit,
    signal: command.signal,
    stdout: command.stdout.content,
    stderrFirstNonemptyLine: firstLine,
    command,
    appBundle: {
      status: 'ok',
      signNestedExit: signNested.exit,
      signOuterExit: signOuter.exit,
      verifyDeepStrictExit: deepVerify.exit,
      nestedLaunched: true,
      spctlExit: command.exit,
      spctlStdout: command.stdout.content,
      spctlStderrFirstNonemptyLine: firstLine,
      appPath: app,
    },
  };
}

async function launchControl(command) {
  const proc = spawnNdjson(command, [path.join(FIXTURE_DIR, 'scripts', 'sidecar-fixture.mjs')], {
    cwd: FIXTURE_DIR,
    env: { ...process.env, LC_ALL: 'C' },
  });
  const timeouts = [];
  const ready = await proc.waitFor((packet) => packet.op === 'ready', CONTROL_DEADLINES.readyMs);
  if (!ready) {
    timeouts.push('ready');
    const killed = await proc.killAndConfirm(CONTROL_DEADLINES.killConfirmMs);
    if (!killed) timeouts.push('kill-confirm');
    return {
      ready: false,
      eofSent: false,
      exit: killed,
      deadlines: CONTROL_DEADLINES,
      timeouts,
      stderrTail: tail(proc.stderr()),
    };
  }
  proc.child.stdin.end();
  const exit = await proc.waitForExit(CONTROL_DEADLINES.exitMs);
  if (!exit) {
    timeouts.push('exit');
    const killed = await proc.killAndConfirm(CONTROL_DEADLINES.killConfirmMs);
    if (!killed) timeouts.push('kill-confirm');
    return {
      ready: true,
      eofSent: true,
      exit: killed,
      deadlines: CONTROL_DEADLINES,
      timeouts,
      stderrTail: tail(proc.stderr()),
    };
  }
  return {
    ready: true,
    eofSent: true,
    exit,
    deadlines: CONTROL_DEADLINES,
    timeouts,
    node: ready.node,
    sea: ready.sea,
    stderrTail: tail(proc.stderr()),
  };
}

async function launchExecutable(command, args = []) {
  const proc = spawnNdjson(command, args, {
    cwd: path.dirname(command),
    env: { ...process.env, LC_ALL: 'C' },
  });
  const timeouts = [];
  const ready = await proc.waitFor((packet) => packet.op === 'ready', CONTROL_DEADLINES.readyMs);
  if (!ready) {
    timeouts.push('ready');
    const killed = await proc.killAndConfirm(CONTROL_DEADLINES.killConfirmMs);
    if (!killed) timeouts.push('kill-confirm');
    return { ok: false, exit: killed, timeouts, stderrTail: tail(proc.stderr()) };
  }
  proc.child.stdin.end();
  const exit = await proc.waitForExit(CONTROL_DEADLINES.exitMs);
  if (!exit) {
    timeouts.push('exit');
    const killed = await proc.killAndConfirm(CONTROL_DEADLINES.killConfirmMs);
    if (!killed) timeouts.push('kill-confirm');
    return { ok: false, exit: killed, timeouts, stderrTail: tail(proc.stderr()) };
  }
  return {
    ok: exit.code === 0 && exit.signal === null,
    exit,
    timeouts,
    node: ready.node,
    sea: ready.sea,
    stderrTail: tail(proc.stderr()),
  };
}

function readActualEntitlements(binary, expectedPresent, workDir) {
  const command = runApple(CODESIGN, ['-d', '--entitlements', '-', '--xml', binary]);
  if (command.exit === 0 && command.stdout.bytes > 0) {
    const parsed = parseXmlObservation(command, path.join(workDir, 'actual-entitlements.plist'));
    // R5 闭口四：签后 XML 的语义同样只认绑定的绝对 plutil 两条 receipt，故落盘件指纹与
    // `lint`/`json` 必须一并交给判定端——R4 在这里把它们丢掉了，于是只剩 producer 的 values。
    return {
      kind: 'present',
      values: parsed.values,
      command,
      artifact: parsed.artifact,
      lint: parsed.lint,
      json: parsed.json,
    };
  }
  if (
    !expectedPresent &&
    command.exit === 0 &&
    command.stdout.bytes === 0 &&
    !securityReasonsFromStreams([command]).length
  ) {
    return { kind: 'none', values: {}, command };
  }
  return { kind: 'unreadable', values: null, command };
}

/**
 * `parseXmlObservation()` 的**唯一**摊平投影：把 raw command 的 exit 与 stdout/stderr 摊成
 * 判定端消费的四格摘要，raw/落盘件/两条 plutil receipt 原样带上。judge 侧会拿这四格与绑定
 * raw 作 exact parity，故这里只许**取值**、不许兜底成 null——缺 raw 本身另有硬门。
 */
function projectXmlObservation(observation) {
  return {
    exit: observation.command.exit,
    bytes: observation.command.stdout.bytes,
    sha256: observation.command.stdout.sha256,
    values: observation.values,
    stderr: observation.command.stderr.content,
    command: observation.command,
    artifact: observation.artifact,
    lint: observation.lint,
    json: observation.json,
  };
}

/**
 * XML observation 不自研第二套 parser：语义一律来自绝对 `/usr/bin/plutil`。
 * 采集端把落盘件的 path/bytes/SHA 与两条 plutil receipt 一并留档，判定端据此重核并自行解析。
 */
function parseXmlObservation(command, outputPath) {
  let values = null;
  let parseError = null;
  let artifact = null;
  let lint = null;
  let json = null;
  if (command.exit === 0 && command.stdout.bytes > 0) {
    fs.writeFileSync(outputPath, command.stdout.buffer, { flag: 'wx', mode: 0o600 });
    artifact = { path: outputPath, bytes: byteSize(outputPath), sha256: sha256File(outputPath) };
    lint = runApple(PLUTIL, ['-lint', outputPath]);
    json = runApple(PLUTIL, ['-convert', 'json', '-o', '-', outputPath]);
    if (lint.exit === 0 && json.exit === 0) {
      try {
        values = JSON.parse(json.stdout.content);
      } catch (cause) {
        parseError = cause instanceof Error ? cause.message : String(cause);
      }
    } else {
      parseError = 'plutil rejected extraction';
    }
  }
  return { command: stripBuffer(command), values, parseError, artifact, lint, json };
}

/**
 * 采集端不再自带第二套 grammar：解析交给 `probe-verdict.mjs` 的共享纯函数，
 * 判定端会拿同一份 raw command 再跑一次并与这里保存的三者互证。
 * R3 把 stdout 与 stderr 拼起来喂进同一个 grammar，那正是「未知层级被跳过」的温床。
 */
function parseHumanObservation(command, officialPath) {
  const { parseError, entries, values } = parseDerHumanEntitlements({
    stdout: command.stdout.content,
    stderr: command.stderr.content,
    // 与判定端同源：期望值取实物 official path，不取 command 自报的 argv-last。
    expectedExecutable: officialPath,
  });
  return { command: stripBuffer(command), entries, values, parseError };
}

function parseOfficialSignature(verify, display) {
  // 与判定端同源：identity 只由共享纯函数从 raw display stderr 解析一次。
  return {
    verifyExit: verify.exit,
    displayExit: display.exit,
    ...parseOfficialSignatureIdentity(display.stderr.content),
    verify,
    display,
  };
}

// R5：flags 解析退役为判定端的共享 `parseCodesignFlags`——判定端会从同一份 raw stderr
// 重解析并与 `row.flags` 作 parity，两谱各写一套迟早各自漂移。

function fingerprintTool(toolPath) {
  const file = fingerprintRegularFile(toolPath);
  const description = runReceipt(FILE, ['-b', toolPath], { record: false });
  const architectures = [];
  const output = text(description.stdout);
  if (/\barm64\b/.test(output)) architectures.push('arm64');
  if (/\bx86_64\b/.test(output)) architectures.push('x86_64');
  return { ...file, path: toolPath, architectures, fileDescription: output };
}

function fingerprintRegularFile(filePath) {
  const stat = fs.lstatSync(filePath);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error(`not_regular_or_symlink: ${filePath}`);
  }
  return {
    path: filePath,
    regularFile: true,
    symlink: false,
    bytes: stat.size,
    sha256: sha256File(filePath),
  };
}

function runApple(command, commandArgs) {
  if (!APPLE_TOOL_PATHS.includes(command)) throw new Error(`not an approved Apple tool: ${command}`);
  const receipt = runReceipt(command, commandArgs);
  const tool = hostToolReceipt?.tools?.find((entry) => entry.path === command) ?? fingerprintTool(command);
  receipt.tool = { path: command, sha256: tool.sha256 };
  return receipt;
}

function runReceipt(command, commandArgs, { record = true } = {}) {
  const commandStartedAt = new Date().toISOString();
  const result = spawnSync(command, commandArgs, {
    cwd: process.cwd(),
    env: { ...process.env, LC_ALL: 'C' },
    encoding: null,
    maxBuffer: 64 * 1024 * 1024,
  });
  const stdout = Buffer.isBuffer(result.stdout) ? result.stdout : Buffer.alloc(0);
  const stderr = Buffer.isBuffer(result.stderr) ? result.stderr : Buffer.alloc(0);
  const receipt = {
    argv: [command, ...commandArgs],
    cwd: process.cwd(),
    env: { LC_ALL: 'C' },
    startedAt: commandStartedAt,
    finishedAt: new Date().toISOString(),
    exit: result.status,
    signal: result.signal,
    stdout: streamReceipt(stdout),
    stderr: streamReceipt(stderr),
    error: result.error ? String(result.error.message) : null,
  };
  if (record) commandReceipts.push(receipt);
  return receipt;
}

function streamReceipt(buffer) {
  return {
    bytes: buffer.byteLength,
    sha256: createHash('sha256').update(buffer).digest('hex'),
    content: buffer.toString('utf8'),
    buffer,
  };
}

function stripBuffer(value) {
  if (Array.isArray(value)) return value.map(stripBuffer);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== 'buffer')
      .map(([key, entry]) => [key, stripBuffer(entry)]),
  );
}

function stripAbsoluteCanonical(canonical) {
  return {
    repoRelativePath: canonical.repoRelativePath,
    bytes: canonical.bytes,
    sha256: canonical.sha256,
    values: canonical.values,
  };
}

function sameFlatRecord(actual, expected) {
  if (!actual || typeof actual !== 'object' || Array.isArray(actual)) return false;
  const actualKeys = Object.keys(actual);
  const expectedKeys = Object.keys(expected);
  return (
    actualKeys.length === expectedKeys.length &&
    expectedKeys.every((key) => Object.hasOwn(actual, key) && actual[key] === expected[key])
  );
}

function listJsonEvidence(directory) {
  return fs
    .readdirSync(directory)
    .filter((name) => name.endsWith('.json') && name !== 'manifest.json')
    .sort()
    .map((name) => {
      const absolute = path.join(directory, name);
      return {
        repoRelativePath: repoRelative(path.join(FINAL_DIR, name)),
        bytes: byteSize(absolute),
        sha256: sha256File(absolute),
      };
    });
}

function writeJsonSynced(filePath, value) {
  const serializable = stripBuffer(value);
  const buffer = Buffer.from(`${JSON.stringify(serializable, null, 2)}\n`, 'utf8');
  const fd = fs.openSync(filePath, fs.existsSync(filePath) ? 'w' : 'wx', 0o600);
  try {
    fs.ftruncateSync(fd, 0);
    fs.writeFileSync(fd, buffer);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function syncDir(directory) {
  const fd = fs.openSync(directory, 'r');
  try {
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function repoRelative(absolute) {
  return path.relative(REPO_ROOT, absolute).split(path.sep).join('/');
}

function text(stream) {
  return stream.content.trim();
}

function parsePkgVersion(output) {
  return output.match(/^version:\s*(.+)$/m)?.[1] ?? null;
}

function tail(value) {
  return value.split(/\r?\n/).filter(Boolean).slice(-5);
}
