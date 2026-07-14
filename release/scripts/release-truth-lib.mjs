import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;
const DOWNLOAD_PATTERN = /https:\/\/github\.com\/lesPrivilege\/Courtwork\/releases\/download\/v(\d+\.\d+\.\d+)\/(Courtwork_(\d+\.\d+\.\d+)_aarch64\.dmg)/g;

function parseJsonVersion(source, label, failures) {
  try {
    const version = JSON.parse(source).version;
    if (typeof version !== 'string') failures.push(`${label}: version is missing`);
    return typeof version === 'string' ? version : null;
  } catch {
    failures.push(`${label}: invalid JSON`);
    return null;
  }
}

function parseCargoPackageVersion(source, label, failures) {
  const packageStart = source.search(/^\[package\]\s*$/m);
  const remainder = packageStart >= 0 ? source.slice(packageStart).replace(/^\[package\]\s*$/m, '') : '';
  const nextSection = remainder.search(/^\[/m);
  const packageSection = nextSection >= 0 ? remainder.slice(0, nextSection) : remainder;
  const version = packageSection.match(/^version\s*=\s*"([^"]+)"\s*$/m)?.[1] ?? null;
  if (!version) failures.push(`${label}: package version is missing`);
  return version;
}

function parseCargoLockVersion(source, failures) {
  const blocks = source.split(/^\[\[package\]\]\s*$/m);
  const block = blocks.find((candidate) => /^name\s*=\s*"courtwork-desktop"\s*$/m.test(candidate));
  const version = block?.match(/^version\s*=\s*"([^"]+)"\s*$/m)?.[1] ?? null;
  if (!version) failures.push('Cargo.lock courtwork-desktop: version is missing');
  return version;
}

function parseSettingsVersion(source, failures) {
  const version = source.match(/\bconst\s+APP_VERSION\s*=\s*['"]([^'"]+)['"]\s*;/)?.[1] ?? null;
  if (!version) failures.push('SettingsPage.APP_VERSION: version is missing');
  return version;
}

export function validateApplicationVersions(sources, { expectedVersion } = {}) {
  const failures = [];
  const versions = [
    ['apps/desktop/package.json', parseJsonVersion(sources.packageJson, 'apps/desktop/package.json', failures)],
    ['tauri.conf.json', parseJsonVersion(sources.tauriConfig, 'tauri.conf.json', failures)],
    ['Cargo.toml', parseCargoPackageVersion(sources.cargoToml, 'Cargo.toml', failures)],
    ['Cargo.lock courtwork-desktop', parseCargoLockVersion(sources.cargoLock, failures)],
    ['SettingsPage.APP_VERSION', parseSettingsVersion(sources.settingsPage, failures)],
  ];
  const version = versions[0][1];
  const target = expectedVersion ?? version;

  if (expectedVersion && !VERSION_PATTERN.test(expectedVersion)) {
    failures.push(`expected version is not x.y.z: ${expectedVersion}`);
  }
  if (target) {
    for (const [label, actual] of versions) {
      if (actual && actual !== target) failures.push(`${label}: expected ${target}, got ${actual}`);
    }
  }

  return { version, failures };
}

function collectDownloadLinks(html) {
  return [...html.matchAll(DOWNLOAD_PATTERN)].map((match) => ({
    url: match[0],
    tagVersion: match[1],
    asset: match[2],
    assetVersion: match[3],
  }));
}

export function validateSiteDownloadTruth(sources, { expectedVersion } = {}) {
  const failures = [];
  const links = collectDownloadLinks(sources.html);
  const rawDmgLinks = [...sources.html.matchAll(/href="([^"]+\.dmg)"/g)].map((match) => match[1]);

  if (links.length !== 2) failures.push(`site download URL: expected exactly two canonical DMG entrances, got ${links.length}`);
  if (rawDmgLinks.length !== links.length) failures.push('site download URL: non-canonical DMG link found');
  if (new Set(links.map((link) => link.url)).size > 1) failures.push('site download URL: all DMG links must be identical');

  const first = links[0];
  const version = first?.tagVersion ?? null;
  const asset = first?.asset ?? null;
  if (first && first.tagVersion !== first.assetVersion) {
    failures.push(`site download URL: tag ${first.tagVersion} does not match asset ${first.assetVersion}`);
  }
  if (expectedVersion && version && version !== expectedVersion) {
    failures.push(`site download URL: expected ${expectedVersion}, got ${version}`);
  }
  for (const link of links) {
    if (link.tagVersion !== version || link.asset !== asset) {
      failures.push('site download URL: tag or asset drift across links');
      break;
    }
  }

  const releaseFactBlocks = [...sources.html.matchAll(/<p\b[^>]*class="[^"]*\brelease-fact\b[^"]*"[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => match[1]);
  const visibleVersions = releaseFactBlocks.flatMap((block) => (
    [...block.matchAll(/\bv(\d+\.\d+\.\d+)\s*·\s*Apple Silicon\b/g)].map((match) => match[1])
  ));
  if (visibleVersions.length !== 1) {
    failures.push(`site release-fact: expected exactly one visible vX.Y.Z · Apple Silicon, got ${visibleVersions.length}`);
  } else if (version && visibleVersions[0] !== version) {
    failures.push(`site release-fact: visible ${visibleVersions[0]} does not match download ${version}`);
  }

  const displayedShas = [...sources.html.matchAll(/data-release-sha[^>]*>\s*([0-9a-f]{64})\s*</gi)]
    .map((match) => match[1].toLowerCase());
  const sha256 = displayedShas[0] ?? null;
  if (displayedShas.length !== 1) failures.push('site displayed SHA: expected exactly one 64-character value');

  const shaRecord = sources.shaFile.trim().match(/^([0-9a-f]{64})\s{2}([^/\s]+)$/i);
  if (!shaRecord) failures.push('release SHA file: expected sha256 followed by two spaces and asset filename');
  const recordedSha = shaRecord?.[1].toLowerCase() ?? null;
  const recordedAsset = shaRecord?.[2] ?? null;
  if (asset && recordedAsset && asset !== recordedAsset) failures.push(`release SHA file: expected ${asset}, got ${recordedAsset}`);
  if (sha256 && recordedSha && sha256 !== recordedSha) failures.push(`site displayed SHA: expected ${recordedSha}, got ${sha256}`);

  if (version && !sources.releaseNotes.includes(`# Courtwork v${version}`)) failures.push('release notes: version heading drift');
  if (asset && !sources.releaseNotes.includes(asset)) failures.push('release notes: asset name drift');
  if (recordedSha && !sources.releaseNotes.includes(recordedSha)) failures.push('release notes: SHA drift');
  if (!/ad-hoc/i.test(sources.releaseNotes) || !/未(?: Apple )?公证/.test(sources.releaseNotes)) {
    failures.push('release notes: ad-hoc and unnotarized boundary missing');
  }
  if (version && !sources.releaseReadme.includes(`\`v${version}\``)) failures.push('release README: tag drift');
  if (asset && !sources.releaseReadme.includes(`\`${asset}\``)) failures.push('release README: asset drift');
  if (asset && !sources.releaseReadme.includes(`${asset}.sha256`)) failures.push('release README: SHA file link drift');
  if (version && !sources.releaseReadme.includes(`RELEASE_NOTES_v${version}.md`)) failures.push('release README: notes link drift');
  if (!/ad-hoc/i.test(sources.html) || !/未公证/.test(sources.html)) failures.push('site: ad-hoc and unnotarized boundary missing');

  return { version, asset, sha256, failures };
}

function read(root, path) {
  const target = resolve(root, path);
  return existsSync(target) ? readFileSync(target, 'utf8') : '';
}

export function validateRepositoryReleaseTruth(root, { expectedVersion, requireSiteMatch = false } = {}) {
  const app = validateApplicationVersions({
    packageJson: read(root, 'apps/desktop/package.json'),
    tauriConfig: read(root, 'apps/desktop/src-tauri/tauri.conf.json'),
    cargoToml: read(root, 'apps/desktop/src-tauri/Cargo.toml'),
    cargoLock: read(root, 'apps/desktop/src-tauri/Cargo.lock'),
    settingsPage: read(root, 'apps/desktop/src/settings/SettingsPage.tsx'),
  }, { expectedVersion });

  const html = read(root, 'site/index.html');
  const siteLink = collectDownloadLinks(html)[0];
  const siteVersion = siteLink?.tagVersion ?? '';
  const siteAsset = siteLink?.asset ?? '';
  const site = validateSiteDownloadTruth({
    html,
    shaFile: read(root, `release/${siteAsset}.sha256`),
    releaseNotes: read(root, `release/RELEASE_NOTES_v${siteVersion}.md`),
    releaseReadme: read(root, 'release/README.md'),
  }, { expectedVersion: requireSiteMatch ? (expectedVersion ?? app.version) : undefined });

  return {
    app,
    site,
    failures: [...app.failures, ...site.failures],
  };
}
