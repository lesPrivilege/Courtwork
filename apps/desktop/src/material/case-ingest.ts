import type { AttachmentScope, AttachmentStatus } from '../composer/types';
import { hostAuthReasonCopy, type HostAuthPort } from '../host/host-auth-port';
import type { StoredMaterial } from './material-ref';
import type { HostListResult, HostReadResult, IngestResult, IngestSource } from './material-store';
import { sha256Hex } from './sha256';

/**
 * 案件材料入库编排（DEBT-DOSSIER-1 从 `App.tsx` 外提，「过手即拆」）。
 *
 * 住这里的是两条**已有**入库路径的编排——整夹入库（`+` 菜单授权文件夹）与 composer 上传入库。
 * 二者共用同一个 MaterialStore 入库链与同一个计数出口；App 只留装配（注入 store、宿主写入与显式态通道）。
 *
 * 本模块的两条不变量：
 *  - **入库路径唯一**：scope 不另开旁路。「存入卷宗」只决定*哪些*上传进入既有 `ingest`，不决定*怎么*入库。
 *  - **计数不自增**：任何入库动作之后，件数一律以 `listForCase` 的返回列表回灌 [`CaseIngestSink.listed`]。
 *    自增计数会与 store 漂移，而漂移的那一刻没人会发现——故此处永不 `+1`。
 */

/**
 * composer 上传的最小面（沿 `material-actions.ts` 的 `MaterialResolver` 先例：只取本模块要用的字段，
 * 不绑定 Composer 组件类型）。scope/status 复用 composer 的类型别名，不另抄一份字面量闭集。
 */
export interface ComposerUpload {
  fileName: string;
  bytes: Uint8Array;
  scope: AttachmentScope;
  status: AttachmentStatus;
}

/** MaterialStore 的入库最小面（便于注入与测试）。 */
export interface CaseIngestPort {
  listDir(grantId: string, relativeDir?: string): Promise<HostListResult>;
  readSource(grantId: string, relativePath: string): Promise<HostReadResult>;
  ingest(caseId: string, source: IngestSource): Promise<IngestResult>;
  listForCase(caseId: string): Promise<StoredMaterial[]>;
}

export interface CaseIngestSink {
  /** 显式态通道（既有 systemFeedback）。ok=false 即用户可见的阻断陈述。 */
  feedback: (message: string, ok: boolean) => void;
  /**
   * 材料清单的唯一回灌口：入库后以 `listForCase` 的结果整列交回。
   * 原件列表与三处件数都读这一份，故它们结构上不可能各说各话。
   */
  listed: (caseId: string, materials: StoredMaterial[]) => void;
}

export interface CaseIngestDeps {
  materials: CaseIngestPort;
  writeFile: HostAuthPort['writeFile'];
  sink: CaseIngestSink;
}

/**
 * DEBT-DOSSIER-1 件一：**入库判据的唯一真源**。
 *
 * 此前「存入卷宗/资料」只喂 chip badge，grant 案会把全部 ready 上传一律入库——按钮按不按都一样，
 * 那颗 badge 说的话不作数。自此判据就是这个函数：`scope === 'dossier'` 且已就绪才进既有入库链；
 * message-only 上传仍逐字进入本轮请求（正文链不变），但零写授权目录、零 MaterialStore 记录。
 * badge 自此是这条判据的投影，不是它的替身。
 *
 * `ready` 一并在此判：调用方（Composer.handleSend）当前已只交出 ready 附件，但入库判据不靠
 * 上游恰好过滤过——本模块的契约是「dossier 且 ready」，两条都在此成立。
 */
export function selectDossierUploads<T extends ComposerUpload>(uploads: readonly T[]): T[] {
  return uploads.filter((item) => item.scope === 'dossier' && item.status.kind === 'ready');
}

/**
 * MATERIAL-INGRESS-1：就地入库一个授权文件夹的原件——枚举单层文件 → 逐件读原件、哈希、
 * reading-view 派生 → 持久 source-neutral MaterialRef。原件永远只读、原地不动（grant root 之下）。
 * demo 案不走生产 store（双向隔离，由调用方按 case 分流）；诚实计数上报（就绪/需识别/不可用/失败），零静默。
 */
export async function ingestAuthorizedFolder(
  deps: CaseIngestDeps,
  caseId: string,
  grantId: string,
  label: string,
): Promise<void> {
  const listing = await deps.materials.listDir(grantId);
  if (listing.status === 'failed') {
    deps.sink.feedback(hostAuthReasonCopy(listing.reason), false);
    return;
  }
  if (listing.entries.length === 0) {
    deps.sink.feedback(`〔${label}〕内没有可入库的文件`, false);
    return;
  }
  let ready = 0;
  let needsOcr = 0;
  let rejected = 0;
  let failed = 0;
  for (const entry of listing.entries) {
    const result = await deps.materials.ingest(caseId, {
      grantId,
      relativePath: entry.relativePath,
      fileName: entry.fileName,
    });
    if (result.status === 'failed') {
      failed += 1;
    } else if (result.material.status === 'ready') {
      ready += 1;
    } else if (result.material.status === 'needs_ocr') {
      needsOcr += 1;
    } else {
      rejected += 1;
    }
  }
  deps.sink.listed(caseId, await deps.materials.listForCase(caseId));
  const parts = [`已从〔${label}〕入库 ${ready} 件卷宗原件`];
  if (needsOcr > 0) parts.push(`${needsOcr} 件需文字识别后方可引用`);
  if (rejected > 0) parts.push(`${rejected} 件无法转为可引用的阅读视图`);
  if (failed > 0) parts.push(`${failed} 件读取失败`);
  deps.sink.feedback(parts.join('；'), failed === 0);
}

/**
 * PILOT-LIVE-2 F：case 语境上传入库路由——composer 附件经既有 grant 写授权落入已授权项目
 * 文件夹（host_write_file），再按 grant+relativePath 走 material-ingress 原班 ingest（provenance
 * 与 hash 复验天然成立）。同名同内容＝跳过写入、就地入库（不重复上传）；同名异内容＝显式
 * 拒绝不覆写（原件只读红线）。零新入库语义：写授权、ingest、计数反馈全部复用既有链。
 *
 * DEBT-DOSSIER-1 件一起，入口先过 {@link selectDossierUploads}：非 dossier 一件不进这里，
 * 判据为空集时整条路径零副作用（不写、不入库、不出计数反馈）。
 */
export async function ingestComposerUploads(
  deps: CaseIngestDeps,
  caseId: string,
  grantId: string,
  uploads: readonly ComposerUpload[],
): Promise<void> {
  const dossierUploads = selectDossierUploads(uploads);
  if (dossierUploads.length === 0) return;

  let ingested = 0;
  const refused: string[] = [];
  const failed: string[] = [];
  for (const upload of dossierUploads) {
    const fileName = upload.fileName;
    const existing = await deps.materials.readSource(grantId, fileName);
    if (existing.status === 'read') {
      const [existingSha, uploadSha] = await Promise.all([sha256Hex(existing.bytes), sha256Hex(upload.bytes)]);
      if (existingSha !== uploadSha) {
        refused.push(fileName);
        continue;
      }
      // 同名同内容：原件已在项目文件夹，跳过写入直接就地入库。
    } else {
      const wrote = await deps.writeFile({
        grantId,
        relativePath: fileName,
        bytes: upload.bytes,
        overwrite: false,
      });
      if (wrote.status !== 'wrote') {
        failed.push(`${fileName}（${hostAuthReasonCopy(wrote.reason)}）`);
        continue;
      }
    }
    const result = await deps.materials.ingest(caseId, { grantId, relativePath: fileName, fileName });
    if (result.status === 'failed') failed.push(`${fileName}（${hostAuthReasonCopy(result.reason)}）`);
    else ingested += 1;
  }
  deps.sink.listed(caseId, await deps.materials.listForCase(caseId));
  const parts: string[] = [];
  if (ingested > 0) parts.push(`已入库 ${ingested} 件到本案卷宗`);
  if (refused.length > 0) {
    parts.push(`同名文件已在项目文件夹且内容不同，未覆写：${refused.join('、')} · 请改名后重试，或经「+」菜单整夹入库`);
  }
  if (failed.length > 0) parts.push(`未能入库：${failed.join('、')}`);
  if (parts.length > 0) deps.sink.feedback(parts.join('；'), refused.length === 0 && failed.length === 0);
}
