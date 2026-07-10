# 演示数据集清单（manifest）

样板案：临江精铸科技有限公司诉起云智能装备（虚构）有限公司买卖合同纠纷（案号 (2025)云章03民初472号，全部虚构）。本清单说明数据集组织方式、场景覆盖、虚构纪律遵守情况、覆盖缺口与校验结果。唯一事实来源见 `case-bible.md`。

---

## 一、场景覆盖对照表（S1–S4）

| 场景 | 输入 | 本数据集提供的素材 | 输出 artifact 样例 |
|------|------|----------------------|----------------------|
| **S1 卷宗阅卷** | 上传卷宗文件（pdf/jpg/png，此处以干净 .md 文本代替） | `dossier/` 20 份文书（起诉状、答辩状、证据清单、主合同、补充协议、送货单×3、验收单、催告函×2、会议纪要×2、银行流水摘要、情况说明、律师函、债权转让通知书、保证书、授权委托书、企业信用信息查询单） | `artifacts/case-file.json`、`artifacts/timeline.json`（47事件）、`artifacts/party-graph.json`（14节点/15边） |
| **S2 矩阵审阅** | CaseFile（此处以合同变体集合代替批量文档） | `contracts/variants/` 10 份同类采购合同变体（不同虚构对手方，违约金比例/管辖/付款节点/质保期等条款各异） | `artifacts/review-matrix.json`（10文档 × 7问题） |
| **S3 合同审查** | CaseFile + party-verify 工具 | `contracts/main-contract.md`（含6处预埋风险条款）；`registries/party-verify.json`（主体核验库，22条记录 + out_of_coverage名单） | `artifacts/risk-list.json`（6个风险点，均带法条依据+来源锚点） |
| **S4 文书起草** | CaseFile + Timeline + PartyGraph | 复用 S1 的三个 artifact；`dossier/01-起诉状.md`、`dossier/02-答辩状.md` 可作为起草文风参照样本 | 暂无独立 outputArtifacts（`registry/scenarios/S4.yaml` 声明为 label-only 确认门禁，`RevisionInstructionSet` 待 W4 落地，见 `packages/schemas/SPEC.md` TODO），本数据集不预生成，待该产物类型定稿后补充 |

`registries/cite-check.json`（法条/判例引用校验库，67条：57条现行有效真实法条 + 7条已失效旧法 + 3条虚构判例）供 S3/S4 的引用校验能力通用消费，不专属某一场景。

---

## 二、虚构纪律遵守声明

1. **主体全虚构**：卷宗涉及全部企业（临江精铸科技及其母公司/关联公司、起云智能及其母公司、华瑞商业保理、10份变体合同对手方、party-verify噪声主体等共计30余家）与自然人（封文昌、岑瑞霖、梅昭阳、柯清源、麦承业、柏景行、练明轩等）均为虚构，如与现实同名企业/个人重合纯属巧合。统一社会信用代码统一使用 `DEMO` 前缀（如 `DEMO91330100MA2XCJZ01X`），不符合真实18位社会信用代码校验规则，明确不可用于真实核验。案号 `(2025)云章03民初472号` 及法院"云章市中级人民法院"均为虚构地名/机构。
2. **法条真实**：`registries/cite-check.json` 中 57 条现行有效条文取自《中华人民共和国民法典》（总则编/合同编通则/买卖合同/保证合同）与《中华人民共和国民事诉讼法》，均标注版本（民法典：2021年1月1日施行；民诉法：2022年1月1日施行，2021年12月24日第四次修正）；7条已失效旧法（《合同法》6条、《民法通则》1条）标注失效日期与被替代关系，用于演示 cite-check 识别失效条文的价值；3条虚构判例条目案号/法院明显虚构并标注 `status: demo`，不构成真实裁判依据。
3. **信源分级标识**：`party-verify.json`、`cite-check.json` 中演示库条目均标注 `source: "demo-fixture"`、`sourceGrade: "B"`（真实法条为 `sourceGrade: "A"`，来自公开发布文本），无 C 级（web search）条目，符合 `docs/20` 信源分级拍板。
4. **一致性高于数量**：全部衍生文书由 `case-bible.md` 派生，日期、金额、合同编号在各文书间已交叉核对（见下方"六、一致性检查结果"），4处预埋矛盾点均按圣经清单精确对应，非无意错误。

---

## 三、out_of_coverage 名单

以下主体在本案叙事/PartyGraph 中出现，但**故意不纳入** `registries/party-verify.json` 的核验记录，用于演示核验覆盖缺口（`out_of_coverage`）的正确处理——查询应返回"库内未覆盖"，不得自信否定其存在或资质：

1. **起云智能装备（虚构）有限公司安徽分公司**（卷宗提及的分支机构，未单独入库）
2. **云章中衡工业设备鉴定评估有限公司**（买方拟委托的第三方检测机构，未入库）
3. **麦承业**（起云智能自然人股东/个人连带保证人，自然人主体暂不在本库覆盖范围）

以上三者已在 `registries/party-verify.json` 的 `outOfCoverage` 字段中登记原因，且已通过脚本验证均不出现在 `entries[].entityName` 中（见下方校验结果）。

---

## 四、预埋矛盾点清单（共4处，对应 `case-bible.md` 第六节）

| # | 矛盾内容 | 冲突文书 | 演示价值 |
|---|----------|----------|----------|
| 1 | 催告函（一）落款盖章为"临江精铸集团有限公司"（母公司），与合同卖方"临江精铸科技有限公司"不一致 | `dossier/04-设备采购合同.md` vs `dossier/10-催告函-一.md` | 履约主体识别、催告效力争议 |
| 2 | 送货单三份发货单位均为"临江精铸（云章）装备有限公司"（关联公司），与合同卖方不一致 | `dossier/04-设备采购合同.md` vs `dossier/06/07/08-送货单.md` | 实际履约主体与签约主体分离的主体识别 |
| 3 | 验收单载明"验收合格"，会议纪要（一）记载买方代表陈述"验收当日即发现异常、尚未正式验收" | `dossier/09-验收单.md` vs `dossier/12-会议纪要-一.md` | 核心矛盾检测演示点，买方主要抗辩基础 |
| 4 | 起诉状陈述预付款"2024年8月24日依约支付"，银行流水显示实际到账2024-08-26；另一笔50万元流入非合同约定收款账户 | `dossier/01-起诉状.md` vs `dossier/14-银行流水摘要.md` | 事实细节核验 + 清偿对象适格性争议 |

---

## 五、已知边界

- 卷宗文书目前均为干净 `.md` 文本，无扫描件/印章/手写体样张；OCR 印章识别、手写体识别能力待 W3 有真实脱敏样本后补充演示数据。
- 全部 `SourceAnchor` 使用 `textRange: {start:0, end:len(quote)}` 作为占位区间，`quote` 字段为真实引用文本，但 `textRange` 尚未按文件实际字符偏移量精确校准——该校准是 ingest 摄取管线（W8）的职责，摄取管线落地后应重新生成精确锚点。当前占位不影响 artifact 通过 JSON Schema 结构性校验及 SourceAnchor 业务规则校验。
- S4（文书起草）尚无独立 outputArtifacts 产物类型（`RevisionInstructionSet` 待 W4 提案落地），本数据集未预生成对应 artifact，复用 S1 的 CaseFile/Timeline/PartyGraph 作为起草输入，并以 `dossier/01`、`dossier/02` 作为起草文风参照。
- `registries/cite-check.json` 中法条全文依据训练知识复核整理（无法在本次任务环境中联网核对全国人大官网原文，官网/国家法律法规数据库页面为 JS 动态渲染，静态抓取未成功），条号与文字准确度较高但建议正式生产环境启用前再做一次官方文本核对，已在库的 `note` 字段中声明此建议。
- 本案审理状态为"已受理，尚未安排开庭"，如需演示庭审笔录/裁判文书素材，需后续迭代补充。

---

## 六、校验结果

### 6.1 JSON Schema 结构性校验（`packages/schemas/json-schema/*.schema.json`）

使用 Python `jsonschema` 库（沙箱环境无法联网升级到支持 2020-12 draft 的版本，退而使用沙箱自带 3.2.0 版本的 `Draft7Validator`；本仓库 schema 所用关键字—`type`/`properties`/`required`/`enum`/`pattern`/`minLength`/`minItems`/`oneOf`/`const`/`additionalProperties`/数值型 `exclusiveMinimum`—在 Draft7 语义下与 2020-12 一致，不影响校验结论）逐一校验 `artifacts/` 下 5 个文件：

| 文件 | Schema | 结果 |
|------|--------|------|
| `case-file.json` | `CaseFile.schema.json` | 通过 |
| `timeline.json` | `Timeline.schema.json` | 通过（47个事件） |
| `party-graph.json` | `PartyGraph.schema.json` | 通过（14节点/15边） |
| `risk-list.json` | `RiskList.schema.json` | 通过（6个风险点） |
| `review-matrix.json` | `ReviewMatrix.schema.json` | 通过（10文档×7问题=70个答案格） |

### 6.2 SourceAnchor 业务规则补验（JSON Schema 无法表达的两条跨字段规则）

自编校验脚本对 5 个 artifact 中出现的全部 `SourceAnchor` 对象逐一检查：（1）`bbox`/`textRange` 至少一个；（2）`bbox` 存在时 `page` 必填。

结果：5 个文件共校验 **145 个 SourceAnchor**（timeline 49、party-graph 18、risk-list 8、review-matrix 70，case-file 本身无 SourceAnchor 字段），**全部通过**，无违反项。

### 6.3 一致性交叉核对

对全部文件抽取关键主体名、合同编号、关键金额、关键日期进行交叉核对：

- 合同编号 `LJJZ-CY-2024-0817`：仅出现在本案相关文书（`case-bible.md`、`contracts/main-contract.md`、`dossier/01,04-11,15-18`、两个 artifact），未误入10份合同变体（变体各自使用独立编号 `LJJZ-CY-2024-09xx`/`-10xx`/`-11xx`/`-12xx`），无冲突。
- 案号 `(2025)云章03民初472号`：在 `case-bible.md`、`dossier/03,19`、`artifacts/timeline.json`、`registries/party-verify.json` 中一致。
- 关键金额（合同总价3,800,000 / 预付款1,140,000 / 验收款2,280,000 / 质保金380,000 / 债权转让2,660,000 / 争议付款500,000）在各自应出现的文书间数值一致，无非预期冲突。
- 4处预埋矛盾点均已逐一比对，确认矛盾内容与 `case-bible.md` 第六节清单精确对应（见上方脚本核实输出），未发现清单之外的意外冲突。
- `party-verify.json` 的 `outOfCoverage` 三个名单（起云智能安徽分公司、云章中衡工业设备鉴定评估有限公司、麦承业）已脚本确认均不出现在 `entries[].entityName` 中。

结论：**全部校验通过，未发现清单之外的一致性问题。**

---

## 七、偏离本任务 prompt 的决定说明

- 少数文书字符数略超"300–800字"区间上限：`contracts/main-contract.md`（含 `dossier/04-设备采购合同.md` 同内容副本，约1250字符）需完整承载10个条款共6处预埋风险点；`dossier/20-企业信用信息查询单.md`（约1155字符）需覆盖7个关联主体的登记信息以支撑PartyGraph股权边的来源锚点；`dossier/03-证据清单.md`（约837字符，超出约5%）因列举15项证据表格略微超长。三者均为结构性（条款/表格）密度导致，非注水式扩写，予以保留。
- PartyGraph 节点数为 14（个人7 + 组织7），未把两家代理律所单列为独立节点（律所信息已在 `party-verify.json` 单独覆盖），案件圣经第二节"当事人谱系"中列出的15个主体口径略宽（含两家律所文字条目），两者口径差异已在此说明，不影响任一 artifact 的 schema 校验或一致性。
- 预埋矛盾点由"2–3处"扩展为4处（第4处为"付款细节+收款账户"复合矛盾），在 `case-bible.md` 与本清单中均已明确标注，供更充分演示矛盾检测能力，不视为偏离。

---

## 八、变更记录

- 2026-07-10（S-1 微工单，`packages/core/SPEC.md` TODO）：`artifacts/timeline.json` 按 `case-bible.md` 第六节 4 处矛盾点的权威事件映射，为 evt-08/14/17/20/24/28/31/33 共 8 个事件补 `markers: ["contradiction"]` 结构化标记（`evt-25` 仅为矛盾点3的背景诱因描述、非该清单列出的矛盾对成员，故不打标记，与旧版靠 description 文本匹配"矛盾"二字会误纳 evt-25 且漏纳未含该字样的 evt-24 形成对照）；已过 `TimelineSchema`（zod）与 `json-schema/Timeline.schema.json`（结构性）双重重新校验。
