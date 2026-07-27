import { mkdtemp, mkdir, realpath, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createAuthorizedRoot, type AuthorizedRoot } from './authorized-root.js';

/**
 * ADR-022 决定二读面：授权文件夹外零读。本组红证覆盖四类逃逸——
 * `..` 回溯、绝对路径外投、同前缀兄弟目录、symlink 出界。
 */

let sandbox: string;
let root: string;
let outside: string;
let authorized: AuthorizedRoot;

beforeAll(async () => {
  sandbox = await realpath(await mkdtemp(path.join(tmpdir(), 'pi-lane-root-')));
  root = path.join(sandbox, '案卷');
  outside = path.join(sandbox, '案卷-外');
  await mkdir(root);
  await mkdir(outside);
  await mkdir(path.join(root, '子目录'));
  await writeFile(path.join(root, '备忘.md'), '# 备忘\n');
  await writeFile(path.join(outside, '机密.md'), '# 机密\n');
  // root 内指向 root 外的 symlink：字面路径在界内，规范化后出界。
  await symlink(outside, path.join(root, '外链'));
  // root 内指向 root 内的 symlink：规范化后仍在界内，必须放行。
  await symlink(path.join(root, '子目录'), path.join(root, '内链'));
  authorized = await createAuthorizedRoot(root);
});

afterAll(() => {
  // 只读票不做清理写操作：临时目录交由 OS 回收。
});

describe('授权文件夹归一化', () => {
  it('绿证一：界内相对路径解析为绝对路径', async () => {
    const resolved = await authorized.resolve('备忘.md');
    expect(resolved).toEqual({ ok: true, path: path.join(root, '备忘.md') });
  });

  it('绿证二：授权文件夹自身允许', async () => {
    const resolved = await authorized.resolve('.');
    expect(resolved).toEqual({ ok: true, path: root });
  });

  it('绿证三：界内尚不存在的路径允许（不存在由读工具另报，不在此层伪装成越界）', async () => {
    const resolved = await authorized.resolve('还没有的文件.md');
    expect(resolved).toEqual({ ok: true, path: path.join(root, '还没有的文件.md') });
  });

  it('绿证四：界内 symlink 指向界内，规范化后放行', async () => {
    const resolved = await authorized.resolve('内链');
    expect(resolved.ok).toBe(true);
  });

  it('红证一：`..` 回溯出界被拒', async () => {
    const resolved = await authorized.resolve('../案卷-外/机密.md');
    expect(resolved).toEqual({ ok: false, code: 'outside_root', reason: expect.stringContaining('授权文件夹外') });
  });

  it('红证二：绝对路径外投被拒', async () => {
    const resolved = await authorized.resolve(path.join(outside, '机密.md'));
    expect(resolved.ok).toBe(false);
  });

  it('红证三：同前缀兄弟目录被拒（前缀比较不得只比字符串）', async () => {
    const resolved = await authorized.resolve(`${root}-外/机密.md`);
    expect(resolved.ok).toBe(false);
  });

  it('红证四：界内 symlink 指向界外被拒（字面在界内，规范化后出界）', async () => {
    const resolved = await authorized.resolve('外链/机密.md');
    expect(resolved).toEqual({ ok: false, code: 'outside_root', reason: expect.stringContaining('授权文件夹外') });
  });

  it('红证五：不存在的路径且其存在祖先在界外，同样被拒', async () => {
    const resolved = await authorized.resolve(path.join(outside, '也不存在.md'));
    expect(resolved.ok).toBe(false);
  });

  it('红证六：授权文件夹本身不可用时构造即失败（无根不开线）', async () => {
    await expect(createAuthorizedRoot(path.join(sandbox, '并不存在的根'))).rejects.toThrow(/授权文件夹/);
  });
});
