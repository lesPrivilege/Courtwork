import { describe, expect, it } from 'vitest';

import {
  createWorkspaceReadEnv,
  resolveWorkspaceReadPath,
  workspaceReadProposalHash,
  WORKSPACE_LIST_ROOT,
  WORKSPACE_READ_PROPOSAL_DOMAIN,
  type WorkspaceReadPort,
  type WorkspaceReadPortOutcome,
  type WorkspaceReadRequest,
} from './workspace-read-env.js';

const SESSION = 'sess_1';
const REQUEST = 'req_1';

/** 记录每一次 port 调用；未脚本化的操作一律显式抛，不静默回默认值。 */
function harness(script: (request: WorkspaceReadRequest) => WorkspaceReadPortOutcome) {
  const requests: WorkspaceReadRequest[] = [];
  const port: WorkspaceReadPort = {
    async read(request) {
      requests.push(request);
      return script(request);
    },
  };
  let ordinal = 0;
  const env = createWorkspaceReadEnv({
    sessionId: SESSION,
    requestId: REQUEST,
    rawToolCallId: 'tc_1',
    registry: {
      publicToolCallId: () => 'tc_1',
      allocateOperationId: () => {
        ordinal += 1;
        return `op_1_${ordinal}`;
      },
    },
    port,
  });
  return { env, requests };
}

const utf8 = (value: string) => new TextEncoder().encode(value);

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes.slice().buffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** 与实现**不同源**的独立重算：逐 frame 拼接后取 SHA-256（ADR-022 六-B.2 read 行）。 */
async function independentReadHash(fields: {
  sessionId: string;
  requestId: string;
  operationId: string;
  operation: string;
  logicalPath: string;
}): Promise<string> {
  const parts = [
    WORKSPACE_READ_PROPOSAL_DOMAIN,
    fields.sessionId,
    fields.requestId,
    fields.operationId,
    fields.operation,
    fields.logicalPath,
  ];
  const chunks: number[] = [];
  for (const part of parts) {
    const body = utf8(part);
    chunks.push((body.byteLength >>> 24) & 0xff, (body.byteLength >>> 16) & 0xff, (body.byteLength >>> 8) & 0xff, body.byteLength & 0xff);
    for (const byte of body) chunks.push(byte);
  }
  return sha256Hex(new Uint8Array(chunks));
}

describe('workspace 读面逻辑路径 grammar', () => {
  it('相对路径与虚拟绝对路径归一到同一 logicalPath', () => {
    const relative = resolveWorkspaceReadPath('notes/会议纪要.md', 'read_file');
    const absolute = resolveWorkspaceReadPath('/workspace/notes/会议纪要.md', 'read_file');
    expect(relative).toEqual({ ok: true, logicalPath: 'notes/会议纪要.md', virtualPath: '/workspace/notes/会议纪要.md' });
    expect(absolute).toEqual(relative);
  });

  it('list 的根是 `.`，虚拟形态是 /workspace 且不带尾斜杠', () => {
    for (const input of ['/workspace', '.', '']) {
      expect(resolveWorkspaceReadPath(input, 'list')).toEqual({
        ok: true,
        logicalPath: WORKSPACE_LIST_ROOT,
        virtualPath: '/workspace',
      });
    }
  });

  it('根只对 list 合法：exists/read_file 拿根一律拒（ADR-022 六-B.2「除 list 的根」）', () => {
    for (const operation of ['exists', 'read_file'] as const) {
      const resolved = resolveWorkspaceReadPath('/workspace', operation);
      expect(resolved.ok).toBe(false);
    }
  });

  it('越界与畸形逐条拒', () => {
    const rejected = [
      '/case/材料.md',
      '/etc/passwd',
      '../workspace/x.md',
      'notes/../../x.md',
      'notes//x.md',
      'notes\\x.md',
      'C:/x.md',
      'CON.md',
      'trailing /x.md'.replace('trailing ', 'trailing.'),
      `${'长'.repeat(200)}.md`,
    ];
    for (const input of rejected) {
      expect(resolveWorkspaceReadPath(input, 'read_file').ok, input).toBe(false);
    }
  });

  it('读面不要求 `.md`：目录与任意 basename 都可 list/exists', () => {
    expect(resolveWorkspaceReadPath('notes', 'list').ok).toBe(true);
    expect(resolveWorkspaceReadPath('notes/草稿', 'exists').ok).toBe(true);
  });
});

describe('读面 proposalHash（协调裁定：换域串同 frame）', () => {
  it('域串恰为 workspace_read.v1，且与独立重算逐字相同', async () => {
    expect(WORKSPACE_READ_PROPOSAL_DOMAIN).toBe('courtwork.pi.workspace_read.v1');
    const fields = {
      sessionId: SESSION,
      requestId: REQUEST,
      operationId: 'op_1_1',
      operation: 'read_file' as const,
      logicalPath: 'notes/会议纪要.md',
    };
    expect(await workspaceReadProposalHash(fields)).toBe(await independentReadHash(fields));
  });

  it('六枚字段各改一枚即换 hash——篡改任一读字段都可判', async () => {
    const base = {
      sessionId: SESSION,
      requestId: REQUEST,
      operationId: 'op_1_1',
      operation: 'read_file' as const,
      logicalPath: 'a.md',
    };
    const original = await workspaceReadProposalHash(base);
    const mutations = [
      { ...base, sessionId: 'sess_2' },
      { ...base, requestId: 'req_2' },
      { ...base, operationId: 'op_1_2' },
      { ...base, operation: 'exists' as const },
      { ...base, logicalPath: 'b.md' },
    ];
    for (const mutated of mutations) {
      expect(await workspaceReadProposalHash(mutated), JSON.stringify(mutated)).not.toBe(original);
    }
  });

  it('frame 长度前缀使字段边界不可挪移：拼接歧义不成立', async () => {
    const left = await workspaceReadProposalHash({
      sessionId: 'ab',
      requestId: 'c',
      operationId: 'op',
      operation: 'exists',
      logicalPath: 'x.md',
    });
    const right = await workspaceReadProposalHash({
      sessionId: 'a',
      requestId: 'bc',
      operationId: 'op',
      operation: 'exists',
      logicalPath: 'x.md',
    });
    expect(left).not.toBe(right);
  });
});

describe('host-mediated 读容器', () => {
  it('readBinaryFile 逐字节回原内容，且 request 字段恰为闭集', async () => {
    const content = '# 纪要\n第一条：**加粗**\n';
    const bytes = utf8(content);
    const digest = await sha256Hex(bytes);
    const { env, requests } = harness(() => ({
      status: 'ok',
      operation: 'read_file',
      logicalPath: 'notes/会议纪要.md',
      content,
      contentSha256: digest,
      byteLength: bytes.byteLength,
    }));

    const read = await env.readBinaryFile('/workspace/notes/会议纪要.md');
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    expect(Array.from(read.value)).toEqual(Array.from(bytes));

    expect(requests).toHaveLength(1);
    expect(Object.keys(requests[0]).sort()).toEqual(
      ['logicalPath', 'operation', 'operationId', 'proposalHash', 'requestId', 'sessionId'].sort(),
    );
    expect(requests[0].logicalPath).toBe('notes/会议纪要.md');
    expect(requests[0].operation).toBe('read_file');
    expect(requests[0].proposalHash).toBe(
      await independentReadHash({
        sessionId: SESSION,
        requestId: REQUEST,
        operationId: requests[0].operationId,
        operation: 'read_file',
        logicalPath: 'notes/会议纪要.md',
      }),
    );
  });

  it('宿主自报 hash 与正文不符即拒——回读双验，不拿正文冒充已验', async () => {
    const content = '真内容';
    const { env } = harness(() => ({
      status: 'ok',
      operation: 'read_file',
      logicalPath: 'a.md',
      content,
      contentSha256: '0'.repeat(64),
      byteLength: utf8(content).byteLength,
    }));
    const read = await env.readBinaryFile('/workspace/a.md');
    expect(read.ok).toBe(false);
  });

  it('宿主自报 byteLength 与正文不符即拒', async () => {
    const content = '真内容';
    const digest = await sha256Hex(utf8(content));
    const { env } = harness(() => ({
      status: 'ok',
      operation: 'read_file',
      logicalPath: 'a.md',
      content,
      contentSha256: digest,
      byteLength: 999,
    }));
    expect((await env.readBinaryFile('/workspace/a.md')).ok).toBe(false);
  });

  it('宿主回的 logicalPath 与请求不符即拒——不接受被掉包的目标', async () => {
    const content = '内容';
    const digest = await sha256Hex(utf8(content));
    const { env } = harness(() => ({
      status: 'ok',
      operation: 'read_file',
      logicalPath: '别的.md',
      content,
      contentSha256: digest,
      byteLength: utf8(content).byteLength,
    }));
    expect((await env.readBinaryFile('/workspace/a.md')).ok).toBe(false);
  });

  it('listDir 出的是 /workspace 逻辑绝对路径，永不出现 ../workspace 或物理根', async () => {
    const { env } = harness(() => ({
      status: 'ok',
      operation: 'list',
      logicalPath: WORKSPACE_LIST_ROOT,
      entries: [
        { name: '会议纪要.md', kind: 'file', byteLength: 12, mtimeMs: 1 },
        { name: '子目录', kind: 'directory', byteLength: null, mtimeMs: 2 },
        { name: '外链', kind: 'symlink', byteLength: null, mtimeMs: null },
      ],
    }));
    const listed = await env.listDir('/workspace');
    expect(listed.ok).toBe(true);
    if (!listed.ok) return;
    expect(listed.value.map((entry) => entry.path)).toEqual([
      '/workspace/会议纪要.md',
      '/workspace/子目录',
      '/workspace/外链',
    ]);
    expect(listed.value.map((entry) => entry.kind)).toEqual(['file', 'directory', 'symlink']);
    for (const entry of listed.value) expect(entry.path.includes('..')).toBe(false);
  });

  it('exists 走 host exists，一次调用恰一枚 operation', async () => {
    const { env, requests } = harness(() => ({
      status: 'ok',
      operation: 'exists',
      logicalPath: 'a.md',
      exists: false,
    }));
    const result = await env.exists('/workspace/a.md');
    expect(result).toEqual({ ok: true, value: false });
    expect(requests.map((request) => request.operationId)).toEqual(['op_1_1']);
  });

  it('宿主 denied/failed 一律成为具名读失败，不塌成「不存在」', async () => {
    for (const status of ['denied', 'failed'] as const) {
      const { env } = harness(() => ({ status, code: 'symlink_forbidden', message: '路径含符号链接' }));
      const listed = await env.listDir('/workspace');
      expect(listed.ok).toBe(false);
      if (listed.ok) return;
      expect(listed.error.message).toContain('symlink_forbidden');
    }
  });

  it('写面与 shell 在读容器里一律拒，且 port 零调用', async () => {
    const { env, requests } = harness(() => {
      throw new Error('读容器的写面不得触达 port');
    });
    expect((await env.writeFile('/workspace/a.md', 'x')).ok).toBe(false);
    expect((await env.appendFile('/workspace/a.md', 'x')).ok).toBe(false);
    expect((await env.remove('/workspace/a.md')).ok).toBe(false);
    expect((await env.createDir('/workspace/新')).ok).toBe(false);
    expect((await env.exec('ls')).ok).toBe(false);
    expect(requests).toHaveLength(0);
  });

  it('canonicalPath 固定 not_supported：不把物理真相带回 Node', async () => {
    const { env } = harness(() => {
      throw new Error('不该调用');
    });
    const result = await env.canonicalPath('/workspace/a.md');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('not_supported');
  });

  it('cwd 恰是 /workspace 且不带尾斜杠', () => {
    const { env } = harness(() => {
      throw new Error('不该调用');
    });
    expect(env.cwd).toBe('/workspace');
  });

  it('非法路径在铸 operation 之前即拒：port 与 op 双零', async () => {
    let allocations = 0;
    const port: WorkspaceReadPort = {
      async read() {
        throw new Error('非法路径不得发 host request');
      },
    };
    const env = createWorkspaceReadEnv({
      sessionId: SESSION,
      requestId: REQUEST,
      rawToolCallId: 'tc_1',
      registry: {
        publicToolCallId: () => 'tc_1',
        allocateOperationId: () => {
          allocations += 1;
          return 'op_1_1';
        },
      },
      port,
    });
    expect((await env.readBinaryFile('/case/材料.md')).ok).toBe(false);
    expect((await env.listDir('../外面')).ok).toBe(false);
    expect(allocations).toBe(0);
  });
});
