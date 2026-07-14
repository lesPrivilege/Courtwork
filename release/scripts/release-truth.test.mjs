import assert from 'node:assert/strict';
import test from 'node:test';

import {
  validateApplicationVersions,
  validateSiteDownloadTruth,
} from './release-truth-lib.mjs';

const APP_SOURCES = {
  packageJson: '{"version":"0.1.2"}',
  tauriConfig: '{"version":"0.1.2"}',
  cargoToml: '[package]\nname = "courtwork-desktop"\nversion = "0.1.2"\n',
  cargoLock: '[[package]]\nname = "courtwork-desktop"\nversion = "0.1.2"\n',
  settingsPage: "const APP_VERSION = '0.1.2';",
};

const SITE_SOURCES = {
  html: `
    <a href="https://github.com/lesPrivilege/Courtwork/releases/download/v0.1.2/Courtwork_0.1.2_aarch64.dmg">下载 macOS 版</a>
    <code data-release-sha>aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa</code>
    <a href="https://github.com/lesPrivilege/Courtwork/releases/download/v0.1.2/Courtwork_0.1.2_aarch64.dmg">下载 macOS 版</a>
    <span>ad-hoc 签名 · 未公证</span>
  `,
  shaFile: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa  Courtwork_0.1.2_aarch64.dmg\n',
  releaseNotes: `# Courtwork v0.1.2

- 文件：\`Courtwork_0.1.2_aarch64.dmg\`
- SHA-256：\`aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\`
- ad-hoc 签名、未 Apple 公证
`,
  releaseReadme: `
- Tag：\`v0.1.2\`
- Asset：\`Courtwork_0.1.2_aarch64.dmg\`
- SHA：见 [Courtwork_0.1.2_aarch64.dmg.sha256](Courtwork_0.1.2_aarch64.dmg.sha256)
- Release notes：见 [RELEASE_NOTES_v0.1.2.md](RELEASE_NOTES_v0.1.2.md)
`,
};

test('application release version accepts the four sources and generated Cargo lock when aligned', () => {
  assert.deepEqual(validateApplicationVersions(APP_SOURCES, { expectedVersion: '0.1.2' }), {
    version: '0.1.2',
    failures: [],
  });
});

test('application release version rejects drift in any current source', () => {
  const failures = validateApplicationVersions({
    ...APP_SOURCES,
    tauriConfig: '{"version":"0.1.1"}',
    settingsPage: "const APP_VERSION = '0.1.0';",
  }, { expectedVersion: '0.1.2' }).failures;
  assert.ok(failures.some((failure) => failure.includes('tauri.conf.json')));
  assert.ok(failures.some((failure) => failure.includes('SettingsPage.APP_VERSION')));
});

test('site download truth accepts one version, asset, SHA, notes, and README record', () => {
  assert.deepEqual(validateSiteDownloadTruth(SITE_SOURCES, { expectedVersion: '0.1.2' }), {
    version: '0.1.2',
    asset: 'Courtwork_0.1.2_aarch64.dmg',
    sha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    failures: [],
  });
});

test('site download truth rejects tag/asset drift and a false displayed SHA', () => {
  const failures = validateSiteDownloadTruth({
    ...SITE_SOURCES,
    html: SITE_SOURCES.html
      .replace('releases/download/v0.1.2/Courtwork_0.1.2', 'releases/download/v0.1.1/Courtwork_0.1.2')
      .replace(/a{64}/, 'b'.repeat(64)),
  }, { expectedVersion: '0.1.2' }).failures;
  assert.ok(failures.some((failure) => failure.includes('download URL')));
  assert.ok(failures.some((failure) => failure.includes('displayed SHA')));
});
