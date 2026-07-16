import { convertToReadingView, type ConvertInput, type ReadingViewOutcome } from '@courtwork/reading-view';
import { isDemoCaseId } from '../case/case-scope';
import type { HostAuthReason } from '../host/host-auth-port';
import { sha256Hex, sha256HexOfText } from './sha256';
import type { MaterialBlock, MaterialBlockReason, MaterialStatus, StoredMaterial } from './material-ref';

/**
 * MATERIAL-INGRESS-1：材料入库与 provider 前验证（ADR-010 决定四）。
 *
 * 形制：原件永远只读、原地不动（grant root 之下）；入库＝就地读原件 → sha256 → reading-view 确定性派生
 * → 持久 source-neutral 元数据（宿主侧扁平记录，沿 host_auth 先例）。provider 前重验：再读原件 →
 * 重算 content hash → 再派生 ReadingView 与持久哈希比对 → status/跨 case 门；漂移、删除、需 OCR、
 * 跨 case 全部显式阻断，不读 demo、不猜内容。
 *
 * 宿主接缝 [`MaterialHostPort`] 抽象「枚举/就地读/持久/再读/取用/列举」：Tauri 走 src-tauri 命令；
 * 浏览器/E2E 走内存桩（**只在 DEV + E2E 装配，绝不进正式 Tauri composition**）。哈希与 reading-view
 * 派生是纯 TS，两适配器共用；只有持久/再读/枚举物理分界不同。
 */

/** reading-view 派生管线语义版本（转换器逻辑一变即 bump → 旧持久视图判漂移，провайдер 前重派生兜底）。 */
export const READING_VIEW_DERIVATION_VERSION = 'reading-view-material@1';

export type ConvertFn = (input: ConvertInput) => Promise<ReadingViewOutcome>;

/** 入库来源（瞬态 provenance，仅入库/枚举握手期在 wire，与既有 readFile/writeFile 同契约）。 */
export interface IngestSource {
  grantId: string;
  relativePath: string;
  fileName: string;
}

/** 持久记录（含 provenance grantId/relativePath；宿主独占，永不入 source-neutral 投影）。 */
export interface MaterialPersistRecord extends StoredMaterial {
  grantId: string;
  relativePath: string;
}

export type HostReadResult =
  | { status: 'read'; bytes: Uint8Array }
  | { status: 'failed'; reason: HostAuthReason };

export type HostListResult =
  | { status: 'listed'; entries: { relativePath: string; fileName: string }[] }
  | { status: 'failed'; reason: HostAuthReason };

/**
 * 宿主接缝：材料持久、原件就地读/再读、授权文件夹枚举。
 * 实现（Tauri / 浏览器桩）由 composition root 注入；MaterialStore 只依赖此接口。
 */
export interface MaterialHostPort {
  /** 单层枚举授权文件夹的可入库文件（relativePath 相对 grant root）。 */
  listDir(grantId: string, relativeDir: string): Promise<HostListResult>;
  /** 就地读一个原件字节（入库时按已知 grantId/relativePath）。 */
  readSource(grantId: string, relativePath: string): Promise<HostReadResult>;
  /** 原子持久一条材料记录（含 provenance）。 */
  put(record: MaterialPersistRecord): Promise<void>;
  /** 按 (caseId, materialId) 取 source-neutral 已持久材料；跨 case/未知 → null。 */
  get(caseId: string, materialId: string): Promise<StoredMaterial | null>;
  /** provider 前按 provenance 再读原件字节（跨 case/删除/撤权结构化失败）。 */
  readOriginal(caseId: string, materialId: string): Promise<HostReadResult>;
  /** 本 case 已持久材料清单（重启后原件列表真源），source-neutral。 */
  list(caseId: string): Promise<StoredMaterial[]>;
}

export type IngestResult =
  | { status: 'ingested'; material: StoredMaterial }
  | { status: 'failed'; reason: HostAuthReason };

export type ResolveResult =
  | { status: 'ready'; material: StoredMaterial }
  | { status: 'blocked'; reason: MaterialBlockReason };

function mediaTypeForFile(fileName: string): string {
  const ext = fileName.toLowerCase().split('.').pop() ?? '';
  switch (ext) {
    case 'pdf':
      return 'application/pdf';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'md':
      return 'text/markdown';
    case 'txt':
      return 'text/plain';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    default:
      return 'application/octet-stream';
  }
}

interface Derived {
  status: MaterialStatus;
  readingMarkdown: string;
  blocks: MaterialBlock[];
  readingViewSha256: string;
}

/** ReadingViewOutcome → 派生内容（status/markdown/blocks/hash）。空/disabled → rejected，needs_ocr → needs_ocr。 */
async function deriveReadingView(outcome: ReadingViewOutcome): Promise<Derived> {
  const empty = async (status: MaterialStatus): Promise<Derived> => ({
    status,
    readingMarkdown: '',
    blocks: [],
    readingViewSha256: await sha256HexOfText(''),
  });
  if (outcome.status === 'needs_ocr') return empty('needs_ocr');
  if (outcome.status === 'disabled') return empty('rejected');
  const markdown = outcome.view.markdown;
  if (markdown.trim().length === 0) return empty('rejected');
  // md/txt 无 textLayerVersion：为全文铸一枚源文版本作漂移检测（消费侧，不动 reading-view 契约）。
  const sourceVersion = `source-text@1+${(await sha256HexOfText(markdown)).slice(0, 16)}`;
  const blocks: MaterialBlock[] = outcome.view.paragraphs.map((paragraph) => ({
    blockId: String(paragraph.index),
    ...(paragraph.anchor.page !== undefined ? { page: paragraph.anchor.page } : {}),
    text: paragraph.anchor.quote ?? '',
    rangeBase: paragraph.anchor.textRange?.start ?? 0,
    textLayerVersion: paragraph.anchor.textLayerVersion ?? sourceVersion,
  }));
  return {
    status: 'ready',
    readingMarkdown: markdown,
    blocks,
    readingViewSha256: await sha256HexOfText(markdown),
  };
}

/** source-neutral 投影：显式只搬 MaterialRef + 派生内容字段，grantId/relativePath provenance 绝不外泄。 */
function stripProvenance(record: MaterialPersistRecord): StoredMaterial {
  return {
    materialId: record.materialId,
    caseId: record.caseId,
    fileName: record.fileName,
    mediaType: record.mediaType,
    byteLength: record.byteLength,
    contentSha256: record.contentSha256,
    readingViewVersion: record.readingViewVersion,
    readingViewSha256: record.readingViewSha256,
    readingMarkdown: record.readingMarkdown,
    blocks: record.blocks.map((block) => ({ ...block })),
    status: record.status,
  };
}

function mapReadReason(reason: HostAuthReason): MaterialBlockReason {
  switch (reason) {
    case 'unavailable':
      return 'unavailable';
    case 'out_of_scope':
      return 'out_of_scope';
    case 'denied':
    case 'revoked':
      return 'revoked';
  }
}

let mintSeq = 0;
function defaultMintMaterialId(): string {
  mintSeq += 1;
  return `mat-${Date.now().toString(36)}-${mintSeq.toString(36)}`;
}

export class MaterialStore {
  constructor(
    private readonly host: MaterialHostPort,
    private readonly convert: ConvertFn = convertToReadingView,
    private readonly mintId: () => string = defaultMintMaterialId,
  ) {}

  /** 授权文件夹单层枚举（就地入库的文件清单来源）。 */
  listDir(grantId: string, relativeDir = ''): Promise<HostListResult> {
    return this.host.listDir(grantId, relativeDir);
  }

  /**
   * 就地入库一个原件：读字节 → sha256 → reading-view 派生 → 持久 source-neutral 元数据。
   * demo 案拒绝（双向隔离）；读原件失败结构化上报，不静默。
   */
  async ingest(caseId: string, source: IngestSource): Promise<IngestResult> {
    if (isDemoCaseId(caseId)) {
      throw new Error('样板案不走生产材料库（demo 双向隔离）');
    }
    const read = await this.host.readSource(source.grantId, source.relativePath);
    if (read.status === 'failed') return { status: 'failed', reason: read.reason };

    const contentSha256 = await sha256Hex(read.bytes);
    const materialId = this.mintId();
    const outcome = await this.convert({ fileId: materialId, fileName: source.fileName, data: read.bytes });
    const derived = await deriveReadingView(outcome);

    const record: MaterialPersistRecord = {
      materialId,
      caseId,
      grantId: source.grantId,
      relativePath: source.relativePath,
      fileName: source.fileName,
      mediaType: mediaTypeForFile(source.fileName),
      byteLength: read.bytes.byteLength,
      contentSha256,
      readingViewVersion: READING_VIEW_DERIVATION_VERSION,
      readingViewSha256: derived.readingViewSha256,
      readingMarkdown: derived.readingMarkdown,
      blocks: derived.blocks,
      status: derived.status,
    };
    await this.host.put(record);
    return { status: 'ingested', material: stripProvenance(record) };
  }

  /**
   * provider 前验证：再读原件 → 重算 content hash → 再派生 ReadingView 比对持久哈希 → status/跨 case 门。
   * 任一漂移/删除/需 OCR/跨 case → 显式阻断（闭集 reason），绝不读 demo、不猜内容。
   * 通过时返回刚重新验证的派生内容（喂 provider 的正是经核验的当前原件视图）。
   */
  async resolveForProvider(caseId: string, materialId: string): Promise<ResolveResult> {
    if (isDemoCaseId(caseId)) return { status: 'blocked', reason: 'out_of_scope' };

    const stored = await this.host.get(caseId, materialId);
    if (!stored) return { status: 'blocked', reason: 'not_found' }; // 含跨 case（宿主回 null）
    if (stored.status === 'needs_ocr') return { status: 'blocked', reason: 'needs_ocr' };
    if (stored.status === 'rejected') return { status: 'blocked', reason: 'rejected' };

    const read = await this.host.readOriginal(caseId, materialId);
    if (read.status === 'failed') return { status: 'blocked', reason: mapReadReason(read.reason) };

    const freshContent = await sha256Hex(read.bytes);
    if (freshContent !== stored.contentSha256) return { status: 'blocked', reason: 'content_drift' };

    const outcome = await this.convert({ fileId: materialId, fileName: stored.fileName, data: read.bytes });
    const derived = await deriveReadingView(outcome);
    if (derived.status !== 'ready') {
      return { status: 'blocked', reason: derived.status === 'needs_ocr' ? 'needs_ocr' : 'rejected' };
    }
    if (derived.readingViewSha256 !== stored.readingViewSha256) {
      return { status: 'blocked', reason: 'reading_drift' };
    }
    return {
      status: 'ready',
      material: { ...stored, readingMarkdown: derived.readingMarkdown, blocks: derived.blocks },
    };
  }

  /** 本 case 已持久材料清单（重启后原件列表真源）。 */
  listForCase(caseId: string): Promise<StoredMaterial[]> {
    return this.host.list(caseId);
  }
}

// ─── 浏览器/E2E 内存宿主（DEV + E2E only；绝不进正式 Tauri composition）───────────────

interface BrowserMaterialState {
  files: Map<string, Uint8Array>; // `${grantId} ${relativePath}` → 原件字节
  records: Map<string, MaterialPersistRecord>; // materialId → 记录
}

function fileKey(grantId: string, relativePath: string): string {
  return `${grantId} ${relativePath}`;
}

const browserState: BrowserMaterialState = { files: new Map(), records: new Map() };

export interface MaterialHostTestHooks {
  setFile(grantId: string, relativePath: string, bytes: Uint8Array): void;
  deleteFile(grantId: string, relativePath: string): void;
  patchRecord(materialId: string, patch: Partial<MaterialPersistRecord>): void;
  clearRecords(): void;
  reset(): void;
}

/**
 * 浏览器内存宿主：按 opaque 绑定寻址，绝不携带绝对路径、绝不触真实文件系统。
 * 与 case-output-client 的 browserFiles 同族——E2E 保真 + 跨案隔离靠内存 map。
 */
export function createBrowserMaterialHost(): MaterialHostPort {
  return {
    async listDir(grantId, relativeDir) {
      const prefix = relativeDir ? `${relativeDir.replace(/\/$/, '')}/` : '';
      const entries: { relativePath: string; fileName: string }[] = [];
      for (const key of browserState.files.keys()) {
        const [keyGrant, relativePath] = key.split(' ');
        if (keyGrant !== grantId) continue;
        if (prefix) {
          if (!relativePath.startsWith(prefix)) continue;
          if (relativePath.slice(prefix.length).includes('/')) continue; // 单层
        } else if (relativePath.includes('/')) {
          continue; // 根层：不下钻
        }
        entries.push({ relativePath, fileName: relativePath.split('/').pop() ?? relativePath });
      }
      entries.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
      return { status: 'listed', entries };
    },
    async readSource(grantId, relativePath) {
      const bytes = browserState.files.get(fileKey(grantId, relativePath));
      if (!bytes) return { status: 'failed', reason: 'unavailable' };
      return { status: 'read', bytes: bytes.slice() };
    },
    async put(record) {
      browserState.records.set(record.materialId, { ...record, blocks: record.blocks.map((b) => ({ ...b })) });
    },
    async get(caseId, materialId) {
      const record = browserState.records.get(materialId);
      if (!record || record.caseId !== caseId) return null; // 跨 case fail-closed
      return stripProvenance(record);
    },
    async readOriginal(caseId, materialId) {
      const record = browserState.records.get(materialId);
      if (!record) return { status: 'failed', reason: 'revoked' };
      if (record.caseId !== caseId) return { status: 'failed', reason: 'out_of_scope' };
      const bytes = browserState.files.get(fileKey(record.grantId, record.relativePath));
      if (!bytes) return { status: 'failed', reason: 'unavailable' };
      return { status: 'read', bytes: bytes.slice() };
    },
    async list(caseId) {
      return Array.from(browserState.records.values())
        .filter((record) => record.caseId === caseId)
        .sort((a, b) => a.materialId.localeCompare(b.materialId))
        .map(stripProvenance);
    },
  };
}

/**
 * 安装 E2E 测试钩（window.__courtworkMaterialHost）：驱动就地原件的落盘/漂移/删除与记录篡改。
 * 钩与 createBrowserMaterialHost 共享同一模块级内存态（与 browser-host-auth 同族），无需传 host 实例。
 */
export function installMaterialHostTestHooks(): MaterialHostTestHooks {
  const hooks: MaterialHostTestHooks = {
    setFile(grantId, relativePath, bytes) {
      browserState.files.set(fileKey(grantId, relativePath), bytes.slice());
    },
    deleteFile(grantId, relativePath) {
      browserState.files.delete(fileKey(grantId, relativePath));
    },
    patchRecord(materialId, patch) {
      const record = browserState.records.get(materialId);
      if (record) browserState.records.set(materialId, { ...record, ...patch });
    },
    clearRecords() {
      browserState.records.clear();
    },
    reset() {
      browserState.files.clear();
      browserState.records.clear();
    },
  };
  if (typeof window !== 'undefined') {
    (window as unknown as { __courtworkMaterialHost?: MaterialHostTestHooks }).__courtworkMaterialHost = hooks;
  }
  return hooks;
}
