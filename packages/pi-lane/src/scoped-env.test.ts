import { mkdtemp, mkdir, realpath, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';

import { createAuthorizedRoot } from './authorized-root.js';
import { createReadOnlyScopedEnv } from './scoped-env.js';
import type { ExecutionEnv } from '@earendil-works/pi-agent-core';

/**
 * 容器层（ADR-022 决定二：取形必须带容器）。pi 的工具一律经 `ExecutionEnv` 触碰文件系统，
 * 故写面与 shell 在这层直接不成立——不是「包一层再拒」，而是本包生产码内根本没有写/执行原语。
 */

let root: string;
let outside: string;
let env: ExecutionEnv;

beforeAll(async () => {
  const sandbox = await realpath(await mkdtemp(path.join(tmpdir(), 'pi-lane-env-')));
  root = path.join(sandbox, '案卷');
  outside = path.join(sandbox, '界外');
  await mkdir(root);
  await mkdir(outside);
  await writeFile(path.join(root, '备忘.md'), '第一行\n第二行\n第三行\n');
  await writeFile(path.join(outside, '机密.md'), '不得读到\n');
  await symlink(outside, path.join(root, '外链'));
  env = createReadOnlyScopedEnv(await createAuthorizedRoot(root));
});

describe('只读容器：读面', () => {
  it('绿证一：界内文本可读', async () => {
    const result = await env.readTextFile('备忘.md');
    expect(result.ok).toBe(true);
    expect(result.ok && result.value).toContain('第一行');
  });

  it('绿证二：界内目录可列', async () => {
    const result = await env.listDir('.');
    expect(result.ok).toBe(true);
    expect(result.ok && result.value.map((entry) => entry.name).sort()).toEqual(['备忘.md', '外链']);
  });

  it('绿证三：readTextLines 尊重 maxLines', async () => {
    const result = await env.readTextLines('备忘.md', { maxLines: 2 });
    expect(result.ok && result.value).toEqual(['第一行', '第二行']);
  });

  it('绿证四：cwd 就是授权文件夹', () => {
    expect(env.cwd).toBe(root);
  });

  it('红证一：界外文本读取被拒（permission_denied，不是 not_found）', async () => {
    const result = await env.readTextFile(path.join(outside, '机密.md'));
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe('permission_denied');
  });

  it('红证二：经 symlink 出界的读取被拒（容器层独立复核，不倚赖上层）', async () => {
    const result = await env.readTextFile('外链/机密.md');
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe('permission_denied');
  });

  it('红证三：界外目录列举被拒', async () => {
    expect((await env.listDir(outside)).ok).toBe(false);
  });

  it('红证四：界外二进制读取被拒', async () => {
    expect((await env.readBinaryFile(path.join(outside, '机密.md'))).ok).toBe(false);
  });

  it('红证五：界外 fileInfo / exists / canonicalPath 一律被拒（探测存在性也算读）', async () => {
    expect((await env.fileInfo(path.join(outside, '机密.md'))).ok).toBe(false);
    expect((await env.exists(path.join(outside, '机密.md'))).ok).toBe(false);
    expect((await env.canonicalPath(path.join(outside, '机密.md'))).ok).toBe(false);
  });
});

describe('只读容器：写面与 shell 不成立', () => {
  it('红证六：界内写入同样被拒（读面票不开写，越界与否无关）', async () => {
    const result = await env.writeFile('备忘.md', '篡改');
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe('not_supported');
    expect(!result.ok && result.error.message).toContain('写面未授权');
  });

  it('红证七：append / createDir / remove / 临时文件全部被拒', async () => {
    expect((await env.appendFile('备忘.md', 'x')).ok).toBe(false);
    expect((await env.createDir('新目录')).ok).toBe(false);
    expect((await env.remove('备忘.md')).ok).toBe(false);
    expect((await env.createTempDir()).ok).toBe(false);
    expect((await env.createTempFile()).ok).toBe(false);
  });

  it('红证八：exec 被拒（bash 面锁 SANDBOX-PROBE-1，升档前不可授）', async () => {
    const result = await env.exec('echo 越界');
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe('shell_unavailable');
    expect(!result.ok && result.error.message).toContain('bash 面未授权');
  });

  it('红证九：写入被拒后文件内容未改变（拒绝不是「拒了但还是写了」）', async () => {
    await env.writeFile('备忘.md', '篡改');
    const result = await env.readTextFile('备忘.md');
    expect(result.ok && result.value).toContain('第一行');
    expect(result.ok && result.value).not.toContain('篡改');
  });
});
