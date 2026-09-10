# 拟议DTO与不变量 · 开工时需正式冻结

本文件是建议，不是现有API。旧Work/Attention字段、action schema、receipt和stateVersion不能因新UI统一而偷偷更名。公开DTO没有actor、secret或直接执行权限。

## 1. SourceCapture与Rendition

```ts
type Digest = string; // exactly lowercase SHA-256 hex; nonempty identity != digest
interface SourceObservationV1 {
  schemaVersion: 1;
  captureId: string;
  sourceObservationId: string;
  logicalSourceId: string;      // 不以path/hash自动合并业务身份
  scopeId: string;              // host-issued handle，不接受任意文件系统路径
  observedPath: string;         // 相对scope的观察位置；不是授权
  availability: 'captured' | 'metadata_only' | 'unavailable' | 'unstable';
  contentHash: Digest | null;   // metadata_only/unavailable不能伪造
  byteLength: number | null;
  observedAt: string;
}
interface RenditionV1 {
  schemaVersion: 1;
  renditionId: string;
  sourceObservationId: string;
  rawContentHash: Digest;
  extractor: { id: string; version: string; configHash: Digest };
  status: 'complete' | 'partial' | 'failed' | 'unsupported';
  textHash: Digest | null;
  lengthCodePoints: number | null;
  pageMapAvailable: boolean;
  bboxMapping: 'verified' | 'unavailable';
  diagnostics: { code: string; message: string }[];
}
```

raw hash表示原始字节，textHash表示特定处理器得到的UTF-8文本。pypdf成功不代表语义读取完整。不能自动normalize换行再声称原始字节相同。极限预算会给partial/failed，不无痕截断。

## 2. Core绑定

建议同一Core owner中保存以下**映射**（表名/字段在LG01C冻结）：

```text
(matter_id, source_set_revision, source_id, source_version)
    → capture_id, source_observation_id,
      raw_content_hash, rendition_id, rendition_text_hash,
      extractor_id/version/config_hash
```

它不是第二份source membership或accept服务。Core原有source.text/digest继续对应被接受绑定的文本。绑定提交时同时检查已持久化对象与当前scope；blobs先落稳，SQLite绑定随后原子提交。源文件系统与Core没有跨介质原子事务承诺。

同内容的副本不自动同身份；更名不自动业务换版；Core source-set修订仍按现有STALE_INPUT规则影响旧候选。已有receipt哈希不因补元数据而重算。

## 3. 查询和证据

```ts
interface EvidenceRefV1 {
  matterId: string;
  sourceId: string;
  sourceVersion: number;
  sourceSetRevision: number;
  renditionId: string;
  textHash: Digest;
  offsetCodePoints: number;
  lengthCodePoints: number;
  page: number | null;           // 1-based when available
  quote: string;
  role: 'supports' | 'contradicts' | 'reports';
}
interface SearchResultV1 {
  schemaVersion: 1;
  generation: string;
  snapshotId: string;
  hits: { ref: EvidenceRefV1; reason: string }[];
  coverage: 'complete_for_declared_scope' | 'partial' | 'unknown';
  omitted: { code: string; count: number | null }[];
  nextCursor: string | null;     // host-issued, scoped；不是任意offset拼装
}
```

query/generation/cursor不携带授权，读取时仍检查当前grant。隐藏对象不得改变可见计数。FTS表达式按literal意图构造并转义，不直接执行用户提供的查询语言。短CJK查询有明确fallback。空hits只表示当前范围/预算内的搜索结果。

## 4. Finding与Context

```ts
interface FindingV1 {
  schemaVersion: 1;
  kind: 'missing_attachment';
  claim: string;
  conclusion: 'not_found_in_capture' | 'found' | 'undetermined';
  evidenceRefs: EvidenceRefV1[];
  coverage: { searchedRefs: string[]; unreadRefs: string[]; status: string };
  basis: {
    matterId: string; sourceSetRevision: number;
    contractVersion: string; baseArtifactId: string | null;
    indexGeneration: string;
  };
  producer: { runId: string; adapterId: string; configHash: Digest };
  uncertainty: string[];
}
```

Finding进入既有Candidate/领域合同；上述DTO不能自行declare trusted actor/PASS/accepted。humanActions仍来自服务器当前合同。结构PASS和人的接受也不等于已经证明法律准确。

ContextManifest只冻结本次选入/排除的locator、版本、预算、required obligations与unread，不成为Matter真源。计量单位必须注明tokens/UTF-16 code units/UTF-8 bytes/Unicode code points，不能互换。token估计须带estimate与tokenizer/version。24k旧metadata门不能悄悄改成24k tokens。

## 5. Recovery Projection

读取当前已接受成果的历史身份、basis适用性、未决候选、义务、冲突、未知效果和continuation references。读取不启动Run。新的执行重新求binding×policy×runtime capability；旧grant/Session能力不转移。

分页snapshot identity必须覆盖候选新增等事实，不仅使用Matter.version。出于正确性第一版可以复用完整state digest；其性能开销仍受Q05检查。未来read epoch不得漏更新事务，也不得与旧stateVersion混为同一算法。

## 6. UI与Telemetry投影

同一packet用于card/pane/details；真正业务owner只在后端。状态至少覆盖loading/empty/partial/stale/revoked/unsupported/integrity failure/lost acknowledgement。descriptors未知时不执行。

Spark报告记录不同量纲：source observations、reused/rebuilt derived objects、executions、findings、human decisions，不能直接相加为“工作数”。未测节省时间为null。

TPS必须记录分子、分母与计量basis。provider output tokens / request wall seconds不等于decode TPS；若计数包括推理token或时间含tool wait，必须写明。missing usage/cache为unknown，不是0；占位cost为0不能推导账单免费。

## 7. Attention不得被旁路

现有human action、query与record_signal合同优先。初期只有已有、获授权对象接收signal；无匹配则生成待关联建议。source来源里的指令、一次Run完成、UI点击“已读”或cache刷新都不能resolve Attention或accept Matter。自动create/外部效果须单独准入。
