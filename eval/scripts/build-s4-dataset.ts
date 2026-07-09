import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * S4 数据集生成脚本。demo-data 的 manifest.md 明确记录"S4 尚无预生成 artifact，
 * 待 RevisionInstructionSet 定稿后补充"——这些标准答案由本层（eval）自己撰写，
 * 不是跨层缺口，"专业标准答案"本来就是 SPEC 交给 W7 的交付物。
 *
 * 每例的 sourceDocumentText 取 dossier/01-起诉状.md 或 02-答辩状.md 全文
 * （真实文风参照样本），标准答案里每条指令的 locator.quote 必须逐字取自该全文——
 * revisionSetMatch 规则会核验这一点，本脚本生成时就用同一份文本切片，不会跑偏。
 */

const evalRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const demoDataRoot = join(evalRoot, '..', 'packages', 'demo-data', 'data');

const CASE_ID = 'case-linjiang-qiyun-2025';

const complaintText = readFileSync(join(demoDataRoot, 'dossier', '01-起诉状.md'), 'utf-8');
const answerText = readFileSync(join(demoDataRoot, 'dossier', '02-答辩状.md'), 'utf-8');

const FACTS = {
  actualPrepaymentDate: '2024年8月26日',
  misdirectedAmount: '500,000',
  misdirectedAccount: '临江贸易',
  warrantyDeposit: '380,000',
  warrantyPeriodMonths: '12',
  filingDate: '2025年5月6日',
  penaltyStartDate: '2024年12月26日',
};

function writeCase(caseId: string, data: Record<string, unknown>) {
  const dir = join(evalRoot, 'datasets', 'S4', caseId);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'case.json'), JSON.stringify({ id: caseId, ...data }, null, 2) + '\n');
  console.log(`wrote S4/${caseId}`);
}

function statuteCitation(law: string, article: string) {
  return { law, article, citation: `《${law}》${article}` };
}

const MFD = '中华人民共和国民法典';
const MSFL = '中华人民共和国民事诉讼法';

interface CommentCase {
  id: string;
  targetDoc: '01-起诉状.md' | '02-答辩状.md';
  quote: string;
  annotationText: string;
  statute?: { law: string; article: string };
  factCheckFields?: string[];
  caseType: 'draft';
  sourceRefs: string[];
}

function buildCommentOnlyCase(c: CommentCase) {
  const sourceDocumentText = c.targetDoc === '01-起诉状.md' ? complaintText : answerText;
  if (!sourceDocumentText.includes(c.quote)) {
    throw new Error(`案例 ${c.id} 的 locator.quote 在 ${c.targetDoc} 全文里找不到，检查是否手误`);
  }
  const citation = c.statute ? statuteCitation(c.statute.law, c.statute.article) : undefined;
  const scoringRules: Array<Record<string, unknown>> = [
    { type: 'schemaValid', schemaName: 'RevisionInstructionSet' },
    { type: 'revisionSetMatch' },
  ];
  if (citation) scoringRules.push({ type: 'citationExists' });
  if (c.factCheckFields?.length) scoringRules.push({ type: 'factConsistency', checkFields: c.factCheckFields });
  scoringRules.push({ type: 'llmJudge', judgePromptFile: 'judges/s4-draft-quality.judge.md', weight: 1 });

  writeCase(c.id, {
    scenario: 'S4',
    caseType: c.caseType,
    task: {
      instruction:
        `你是本案代理律师，正在审阅《${c.targetDoc === '01-起诉状.md' ? '民事起诉状' : '民事答辩状'}》草稿。` +
        '请针对指定内容添加一条 commentOnly 类型的审阅批注（不改动原文文字），说明需要补充或注意的要点，' +
        '并在 annotation.citations 中给出依据（真实法条引用，或结合本案已确认的事实）。' +
        '按 RevisionInstructionSet 格式输出：{id, caseId, targetDocument:{fileId}, instructions:[{id, kind:"commentOnly", ' +
        'locator:{strategy:"text", quote}, annotation:{text, citations:[{citation, statuteRef?:{law,article}}]}}]}。',
      input: { caseId: CASE_ID, sourceDocumentText, targetFileId: c.targetDoc, focusQuote: c.quote },
    },
    expectedAnswer: {
      id: `rev-${c.id}`,
      caseId: CASE_ID,
      targetDocument: { fileId: c.targetDoc },
      instructions: [
        {
          id: 'ins-01',
          kind: 'commentOnly',
          locator: { strategy: 'text', quote: c.quote },
          annotation: {
            text: c.annotationText,
            citations: citation
              ? [{ citation: citation.citation, sourceAnchors: [], statuteRef: { law: citation.law, article: citation.article } }]
              : [],
          },
        },
      ],
      facts: FACTS,
    },
    scoringRules,
    sourceRefs: c.sourceRefs,
  });
}

// ---- 风险清单驱动（6 例）：risk-list.json 的 6 个风险点，映射为对应文书的审阅批注 ----

buildCommentOnlyCase({
  id: 'draft-risk-01-penalty',
  targetDoc: '02-答辩状.md',
  quote: '合同约定逾期付款每日按未付金额1%计收违约金，年化利率远超法律保护上限，显失公平，请求人民法院依法酌减。',
  annotationText:
    '建议在此处明确援引《中华人民共和国民法典》第五百八十五条作为请求酌减违约金的请求权基础，而不仅是笼统主张"显失公平"。',
  statute: { law: MFD, article: '第五百八十五条' },
  caseType: 'draft',
  sourceRefs: [
    'packages/demo-data/data/dossier/02-答辩状.md',
    'packages/demo-data/data/artifacts/risk-list.json',
  ],
});

buildCommentOnlyCase({
  id: 'draft-risk-02-jurisdiction',
  targetDoc: '02-答辩状.md',
  quote: '综上，请求驳回原告全部或部分诉讼请求。',
  annotationText:
    '本合同管辖条款约定"提交甲方所在地有管辖权的人民法院管辖"，系卖方单方拟定的格式条款，' +
    '建议代理律师评估是否曾在答辩期内一并提出管辖权异议、或在后续程序中援引《中华人民共和国民法典》第四百九十六条' +
    '就该条款的提示说明义务提出抗辩，本条为策略性提醒，不改变当前答辩状实体内容。',
  statute: { law: MFD, article: '第四百九十六条' },
  caseType: 'draft',
  sourceRefs: [
    'packages/demo-data/data/dossier/02-答辩状.md',
    'packages/demo-data/data/artifacts/risk-list.json',
  ],
});

buildCommentOnlyCase({
  id: 'draft-risk-03-inspection-period',
  targetDoc: '02-答辩状.md',
  quote: '验收单载明"验收合格"与实际情况不符，答辩人有权就此提出异议并暂缓付款。',
  annotationText:
    '建议援引《中华人民共和国民法典》第六百二十条、第六百二十一条关于买受人检验期限与异议通知义务的规定，' +
    '说明本案合同本身未约定书面验收异议期限、验收标准又仅以卖方单方技术参数为准，' +
    '答辩人"验收当日即发现异常"的抗辩在法律上具有更充分的依据。',
  statute: { law: MFD, article: '第六百二十一条' },
  caseType: 'draft',
  sourceRefs: [
    'packages/demo-data/data/dossier/02-答辩状.md',
    'packages/demo-data/data/artifacts/risk-list.json',
  ],
});

buildCommentOnlyCase({
  id: 'draft-risk-04-ownership-transfer',
  targetDoc: '01-起诉状.md',
  quote: '原告已按约分三批于2024年10月15日、11月5日、11月28日交付全部设备，被告一已于2024年12月10日签署验收单，确认设备验收合格。',
  annotationText:
    '建议在此处补充援引《中华人民共和国民法典》第六百零四条（标的物毁损灭失风险交付后由买受人承担），' +
    '强调设备已交付且验收合格，原告的主给付义务已完全履行，为后续违约金主张的正当性铺垫论证基础。',
  statute: { law: MFD, article: '第六百零四条' },
  caseType: 'draft',
  sourceRefs: [
    'packages/demo-data/data/dossier/01-起诉状.md',
    'packages/demo-data/data/artifacts/risk-list.json',
  ],
});

buildCommentOnlyCase({
  id: 'draft-risk-05-force-majeure-note',
  targetDoc: '01-起诉状.md',
  quote: '原告已按约分三批于2024年10月15日、11月5日、11月28日交付全部设备，被告一已于2024年12月10日签署验收单，确认设备验收合格。',
  annotationText:
    '提示：本合同不可抗力条款（仅列举地震、洪水、战争）范围偏窄，未涵盖供应链中断等情形，' +
    '本案履行过程中未发生任何不可抗力事由，此点不影响当前诉请，仅作为条款本身缺陷的风险提示留档，供未来同类合同起草时参考。',
  caseType: 'draft',
  sourceRefs: [
    'packages/demo-data/data/dossier/01-起诉状.md',
    'packages/demo-data/data/artifacts/risk-list.json',
  ],
});

buildCommentOnlyCase({
  id: 'draft-risk-06-one-sided-liability',
  targetDoc: '02-答辩状.md',
  quote: '合同约定逾期付款每日按未付金额1%计收违约金，年化利率远超法律保护上限，显失公平，请求人民法院依法酌减。',
  annotationText:
    '建议一并援引《中华人民共和国民法典》第四百九十七条、第五百七十七条，指出本合同仅约定买方逾期付款的违约责任、' +
    '未对卖方逾期交付或交付瑕疵约定对应违约金标准，双方权利义务不对等，与畸高的违约金比例共同构成请求酌减的复合理由。',
  statute: { law: MFD, article: '第五百七十七条' },
  caseType: 'draft',
  sourceRefs: [
    'packages/demo-data/data/dossier/02-答辩状.md',
    'packages/demo-data/data/artifacts/risk-list.json',
  ],
});

// ---- 预埋矛盾点驱动（4 例）：case-bible.md 第六节的 4 处矛盾 ----

buildCommentOnlyCase({
  id: 'draft-contradiction-1-seal-mismatch',
  targetDoc: '02-答辩状.md',
  quote: '该催告函不能视为合同相对方的有效催告，原告主张的违约金起算时点应予重新审查。',
  annotationText:
    '建议援引《中华人民共和国民法典》第六十条（法人以其全部财产独立承担民事责任），' +
    '强调临江精铸集团有限公司与合同卖方临江精铸科技有限公司系相互独立的法人主体，' +
    '集团公司出具的催告函不能代表卖方本人的催告意思表示。',
  statute: { law: MFD, article: '第六十条' },
  caseType: 'draft',
  sourceRefs: [
    'packages/demo-data/data/dossier/02-答辩状.md',
    'packages/demo-data/data/case-bible.md',
  ],
});

buildCommentOnlyCase({
  id: 'draft-contradiction-2-delivery-entity',
  targetDoc: '02-答辩状.md',
  quote: '送货单载明发货单位为"临江精铸（云章）装备有限公司"，与合同卖方"临江精铸科技有限公司"不一致，交付义务的实际履行主体存疑。',
  annotationText:
    '建议同样援引《中华人民共和国民法典》第六十条，将"关联公司实际发货"与"催告主体不适格"两点并列论证，' +
    '形成"合同权利义务主体与实际履约/催告主体反复不一致"的整体抗辩逻辑，而非孤立提出。',
  statute: { law: MFD, article: '第六十条' },
  caseType: 'draft',
  sourceRefs: [
    'packages/demo-data/data/dossier/02-答辩状.md',
    'packages/demo-data/data/case-bible.md',
  ],
});

buildCommentOnlyCase({
  id: 'draft-contradiction-3-acceptance-dispute',
  targetDoc: '02-答辩状.md',
  quote: '2024年12月10日验收当日，答辩人现场人员即发现熔炼炉温控系统运行异常，此事实在2024年12月20日双方协商会议纪要中已有明确记载，验收单载明"验收合格"与实际情况不符，答辩人有权就此提出异议并暂缓付款。',
  annotationText:
    '建议援引《中华人民共和国民事诉讼法》第六十四条（当事人对自己提出的主张有责任提供证据），' +
    '说明验收单与会议纪要两份书证内容存在矛盾时，应由主张"验收合格"的原告一方就验收单的真实反映验收当日实际情况承担进一步的举证责任。',
  statute: { law: MSFL, article: '第六十四条' },
  caseType: 'draft',
  sourceRefs: [
    'packages/demo-data/data/dossier/02-答辩状.md',
    'packages/demo-data/data/case-bible.md',
  ],
});

writeCase('draft-contradiction-4-payment-facts', {
  scenario: 'S4',
  caseType: 'draft',
  task: {
    instruction:
      '你是本案代理律师，正在审阅《民事起诉状》草稿。请核对以下事实陈述与本案确认的事实是否一致，' +
      '如有出入，请用 replace 类型的修订指令给出准确表述。按 RevisionInstructionSet 格式输出：' +
      '{id, caseId, targetDocument:{fileId}, instructions:[{id, kind:"replace", locator:{strategy:"text", quote}, text}]}。' +
      '本案确认的事实：预付款实际到账日期为2024年8月26日（较合同约定的2024年8月24日迟延2日）；' +
      '另有一笔500,000元于2025年1月22日流入临江贸易账户，而非合同约定的临江精铸科技收款账户，该笔款项性质存疑。',
    input: {
      caseId: CASE_ID,
      sourceDocumentText: complaintText,
      targetFileId: '01-起诉状.md',
      focusQuote: '被告一于2024年8月24日依约支付预付款1,140,000元。',
    },
  },
  expectedAnswer: {
    id: 'rev-draft-contradiction-4-payment-facts',
    caseId: CASE_ID,
    targetDocument: { fileId: '01-起诉状.md' },
    instructions: [
      {
        id: 'ins-01',
        kind: 'replace',
        locator: { strategy: 'text', quote: '被告一于2024年8月24日依约支付预付款1,140,000元。' },
        text: '被告一应于2024年8月24日支付预付款1,140,000元，实际于2024年8月26日到账，较约定日期迟延2日。',
      },
    ],
    facts: FACTS,
  },
  scoringRules: [
    { type: 'schemaValid', schemaName: 'RevisionInstructionSet' },
    { type: 'revisionSetMatch' },
    { type: 'factConsistency', checkFields: ['actualPrepaymentDate'] },
    { type: 'llmJudge', judgePromptFile: 'judges/s4-draft-quality.judge.md', weight: 1 },
  ],
  sourceRefs: [
    'packages/demo-data/data/dossier/01-起诉状.md',
    'packages/demo-data/data/case-bible.md',
  ],
});

// ---- 补充议题（6 例）：源自案件圣经其他事实/主体谱系细节，非风险清单/矛盾点覆盖范围 ----

buildCommentOnlyCase({
  id: 'draft-guarantee-joint-liability',
  targetDoc: '01-起诉状.md',
  quote: '被告二、被告三分别于2025年4月15日、4月10日出具连带责任保证书，依法应承担连带清偿责任。',
  annotationText: '建议明确援引《中华人民共和国民法典》第六百八十八条（连带责任保证），强化连带清偿请求的法律依据。',
  statute: { law: MFD, article: '第六百八十八条' },
  caseType: 'draft',
  sourceRefs: ['packages/demo-data/data/dossier/01-起诉状.md', 'packages/demo-data/data/case-bible.md'],
});

buildCommentOnlyCase({
  id: 'draft-assignment-notice-validity',
  targetDoc: '01-起诉状.md',
  quote: '2025年3月20日，原告将该应收账款部分转让予华瑞商业保理（云章）有限公司并通知被告一，现原告仍就本案主张权利。',
  annotationText:
    '建议援引《中华人民共和国民法典》第五百四十六条（债权转让未通知债务人不发生效力，本案已通知故转让对被告一发生效力），' +
    '提前回应被告可能就债权转让提出的原告主体资格抗辩。',
  statute: { law: MFD, article: '第五百四十六条' },
  caseType: 'draft',
  sourceRefs: ['packages/demo-data/data/dossier/01-起诉状.md', 'packages/demo-data/data/case-bible.md'],
});

buildCommentOnlyCase({
  id: 'draft-assignment-defense',
  targetDoc: '02-答辩状.md',
  quote: '原告是否仍有权就已转让部分主张权利存疑，请求追加华瑞商业保理为本案第三人。',
  annotationText:
    '建议援引《中华人民共和国民法典》第五百四十八条（债务人对让与人的抗辩可以向受让人主张），' +
    '强化"债权转让后原告主体资格存疑、有必要追加受让人参与诉讼"这一论证的法律基础。',
  statute: { law: MFD, article: '第五百四十八条' },
  caseType: 'draft',
  sourceRefs: ['packages/demo-data/data/dossier/02-答辩状.md', 'packages/demo-data/data/case-bible.md'],
});

writeCase('draft-guarantee-period-defense', {
  scenario: 'S4',
  caseType: 'draft',
  task: {
    instruction:
      '你是本案代理律师，正在审阅《民事答辩状》草稿。请在文末追加一条 insert 类型的修订指令，' +
      '补充一段关于保证期间的抗辩内容，并在 annotation.citations 中给出依据。按 RevisionInstructionSet 格式输出：' +
      '{id, caseId, targetDocument:{fileId}, instructions:[{id, kind:"insert", locator:{strategy:"text", quote}, text, annotation}]}。' +
      '"insert" 的 locator 语义是"插入点之后"：quote 定位到答辩状结尾的落款前一句话，新增内容插在其后。',
    input: { caseId: CASE_ID, sourceDocumentText: answerText, targetFileId: '02-答辩状.md', focusQuote: '综上，请求驳回原告全部或部分诉讼请求。' },
  },
  expectedAnswer: {
    id: 'rev-draft-guarantee-period-defense',
    caseId: CASE_ID,
    targetDocument: { fileId: '02-答辩状.md' },
    instructions: [
      {
        id: 'ins-01',
        kind: 'insert',
        locator: { strategy: 'text', quote: '综上，请求驳回原告全部或部分诉讼请求。' },
        text:
          '六、保证人的保证责任亦应受保证期间约束。请求人民法院一并查明被告二、被告三出具保证书时是否明确约定保证期间，' +
          '如未约定或约定不明，依《中华人民共和国民法典》第六百九十二条认定保证期间，避免连带责任被不当扩大。',
        annotation: {
          text: '补充保证期间抗辩，避免遗漏保证人责任范围的独立审查空间。',
          citations: [
            {
              citation: `《${MFD}》第六百九十二条`,
              sourceAnchors: [],
              statuteRef: { law: MFD, article: '第六百九十二条' },
            },
          ],
        },
      },
    ],
    facts: FACTS,
  },
  scoringRules: [
    { type: 'schemaValid', schemaName: 'RevisionInstructionSet' },
    { type: 'revisionSetMatch' },
    { type: 'citationExists' },
    { type: 'llmJudge', judgePromptFile: 'judges/s4-draft-quality.judge.md', weight: 1 },
  ],
  sourceRefs: ['packages/demo-data/data/dossier/02-答辩状.md', 'packages/demo-data/data/case-bible.md'],
});

buildCommentOnlyCase({
  id: 'draft-recall-letter-reissued',
  targetDoc: '01-起诉状.md',
  quote: '原告多次催告（2025年1月10日、2025年3月5日）无果。',
  annotationText:
    '建议补充说明：2025年1月10日的催告函（一）落款主体存在瑕疵，2025年3月5日的催告函（二）已以合同卖方' +
    '临江精铸科技有限公司的正确主体重新催告，援引《中华人民共和国民法典》第六十条主张后一次催告的效力不受前次瑕疵影响，' +
    '提前回应被告可能提出的催告主体抗辩。',
  statute: { law: MFD, article: '第六十条' },
  caseType: 'draft',
  sourceRefs: ['packages/demo-data/data/dossier/01-起诉状.md', 'packages/demo-data/data/case-bible.md'],
});

writeCase('draft-out-of-coverage-guarantor', {
  scenario: 'S4',
  caseType: 'draft',
  task: {
    instruction:
      '你是本案代理律师，正在审阅《民事起诉状》草稿。请针对指定内容添加一条 commentOnly 类型的审阅批注，' +
      '提醒关于被告三（个人保证人）的主体信息核验现状。按 RevisionInstructionSet 格式输出：' +
      '{id, caseId, targetDocument:{fileId}, instructions:[{id, kind:"commentOnly", locator:{strategy:"text", quote}, annotation:{text, citations}}]}。' +
      '已知信息：被告三麦承业作为自然人保证人，在本案使用的主体核验演示库（party-verify）中被登记为 out_of_coverage' +
      '（库内未覆盖，不是"核验后确认异常"，更不是"不存在"）。',
    input: {
      caseId: CASE_ID,
      sourceDocumentText: complaintText,
      targetFileId: '01-起诉状.md',
      focusQuote: '判令被告二、被告三对上述第1、2项债务承担连带清偿责任；',
      partyVerifyNote: '麦承业：out_of_coverage（库内未覆盖，不得据此判定其不存在或资信异常）',
    },
  },
  expectedAnswer: {
    id: 'rev-draft-out-of-coverage-guarantor',
    caseId: CASE_ID,
    targetDocument: { fileId: '01-起诉状.md' },
    instructions: [
      {
        id: 'ins-01',
        kind: 'commentOnly',
        locator: { strategy: 'text', quote: '判令被告二、被告三对上述第1、2项债务承担连带清偿责任；' },
        annotation: {
          text:
            '提醒：被告三麦承业的主体核验在本案使用的 party-verify 演示库中标记为 out_of_coverage（库内未覆盖），' +
            '这表示尚未核验，不代表其资信状况异常或主体不存在，正式文书中不应据此作出资信状况的确定性陈述，' +
            '如需引用其资信信息，应通过正式渠道另行核验。',
          citations: [],
        },
      },
    ],
    facts: FACTS,
  },
  scoringRules: [
    { type: 'schemaValid', schemaName: 'RevisionInstructionSet' },
    { type: 'revisionSetMatch' },
    { type: 'llmJudge', judgePromptFile: 'judges/s4-draft-quality.judge.md', weight: 1 },
  ],
  sourceRefs: [
    'packages/demo-data/data/dossier/01-起诉状.md',
    'packages/demo-data/data/registries/party-verify.json',
    'packages/demo-data/data/case-bible.md',
  ],
});

// ---- 补充议题（4 例）：诉讼请求完整性与程序性细节 ----

buildCommentOnlyCase({
  id: 'draft-warranty-not-yet-due-plaintiff',
  targetDoc: '01-起诉状.md',
  quote: '判令被告一起云智能装备（虚构）有限公司向原告支付货款2,280,000元；',
  annotationText:
    '提示：合同约定的质保金380,000元需在质保期（验收合格之日起12个月，即2025年12月10日）届满后方可请求，' +
    '现阶段尚未到期，建议在起诉状中明确本次诉请金额2,280,000元不含质保金，避免诉请范围被误读。',
  factCheckFields: ['warrantyDeposit', 'warrantyPeriodMonths'],
  caseType: 'draft',
  sourceRefs: ['packages/demo-data/data/dossier/01-起诉状.md', 'packages/demo-data/data/case-bible.md'],
});

buildCommentOnlyCase({
  id: 'draft-warranty-reservation-defendant',
  targetDoc: '02-答辩状.md',
  quote: '综上，请求驳回原告全部或部分诉讼请求。',
  annotationText:
    '建议补充说明：质保金380,000元对应的12个月质保期尚未届满，答辩人保留就质保期内另行发现的质量问题主张相应权利，' +
    '不因本次答辩未提及而视为放弃。',
  factCheckFields: ['warrantyDeposit', 'warrantyPeriodMonths'],
  caseType: 'draft',
  sourceRefs: ['packages/demo-data/data/dossier/02-答辩状.md', 'packages/demo-data/data/case-bible.md'],
});

buildCommentOnlyCase({
  id: 'draft-limitation-period-check',
  targetDoc: '01-起诉状.md',
  quote: '被告一已于2024年12月10日签署验收单，确认设备验收合格。',
  annotationText:
    '核验：验收款给付请求权的诉讼时效自付款义务到期后的2024年12月26日起算，' +
    '本案起诉日期为2025年5月6日，两者相距不足一年，远在《中华人民共和国民法典》第一百八十八条规定的三年诉讼时效期间内，无时效抗辩风险。',
  statute: { law: MFD, article: '第一百八十八条' },
  factCheckFields: ['filingDate'],
  caseType: 'draft',
  sourceRefs: ['packages/demo-data/data/dossier/01-起诉状.md', 'packages/demo-data/data/case-bible.md'],
});

buildCommentOnlyCase({
  id: 'draft-delayed-performance-interest',
  targetDoc: '01-起诉状.md',
  quote: '本案诉讼费用由被告承担。',
  annotationText:
    '建议补充一项诉讼请求：若被告未按生效法律文书指定的期间履行给付金钱义务，' +
    '应依《中华人民共和国民事诉讼法》第二百五十三条加倍支付迟延履行期间的债务利息，完善判决执行阶段的请求完整性。',
  statute: { law: MSFL, article: '第二百五十三条' },
  caseType: 'draft',
  sourceRefs: ['packages/demo-data/data/dossier/01-起诉状.md'],
});

console.log('S4 数据集生成完毕。');
