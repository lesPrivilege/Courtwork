import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * S3 数据集生成脚本：从 packages/demo-data 的语料派生评测例，不编平行素材。
 * 重新运行本脚本会用语料的当前内容覆盖 datasets/S3/*——语料变了（比如 risk-list.json
 * 改了某个风险点的依据），重跑一次就能让数据集跟上，不需要手工找出哪些 case.json 该改。
 */

const evalRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const demoDataRoot = join(evalRoot, '..', 'packages', 'demo-data', 'data');

const CASE_ID = 'case-linjiang-qiyun-2025';
const FACTS = {
  caseNumber: '(2025)云章03民初472号',
  contractNumber: 'LJJZ-CY-2024-0817',
  totalAmount: '3,800,000',
};

interface RiskItem {
  id: string;
  description: string;
  level: 'high' | 'medium' | 'low';
  basis: Array<{ citation: string; sourceAnchors: unknown[] }>;
  dispositionStatus: string;
}
interface RiskListFile {
  caseId: string;
  risks: RiskItem[];
}

const mainContractText = readFileSync(join(demoDataRoot, 'contracts', 'main-contract.md'), 'utf-8');
const riskList = JSON.parse(readFileSync(join(demoDataRoot, 'artifacts', 'risk-list.json'), 'utf-8')) as RiskListFile;

function writeCase(scenario: 'S3' | 'S4', caseId: string, data: Record<string, unknown>) {
  const dir = join(evalRoot, 'datasets', scenario, caseId);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'case.json'), JSON.stringify({ id: caseId, ...data }, null, 2) + '\n');
  console.log(`wrote ${scenario}/${caseId}`);
}

const RISK_INSTRUCTION =
  '你是本案（临江精铸诉起云智能设备采购合同纠纷案）代理律师，正在审查买卖合同条款。' +
  '请仔细阅读以下合同条款文本，识别其中存在的法律风险，并按 RiskList 格式输出完整风险清单：' +
  '{caseId: string, risks: [{id, description, level: "high"|"medium"|"low", ' +
  'basis: [{citation, sourceAnchors: [{fileId}]}], dispositionStatus: "pending"}]}。' +
  '只输出该条款范围内确实存在的风险；如果该条款没有问题，risks 应为空数组，不要为了凑数虚构风险点。';

const HOLISTIC_INSTRUCTION = RISK_INSTRUCTION.replace(
  '以下合同条款文本',
  '以下完整合同文本（本次审查对象是全文，不是单一条款）',
);

// ---- 核心例：main-risk-01..06，每例 = 主合同一条具体条款 + risk-list.json 对应的单个风险点 ----

const CLAUSE_EXCERPTS: Record<string, string> = {
  'risk-01':
    '**第六条 违约责任**\n乙方逾期支付任何一期款项的，每逾期一日应按未付金额的1%向甲方支付违约金。',
  'risk-02':
    '**第九条 争议解决**\n本合同履行过程中发生的争议，双方应协商解决；协商不成的，提交甲方所在地有管辖权的人民法院管辖。',
  'risk-03':
    '**第四条 验收**\n双方应在设备到货后组织联调验收。验收标准以甲方提供的技术参数为准，双方未就书面验收异议期限作出约定。',
  'risk-04':
    '**第七条 所有权与风险转移**\n设备交付即视为风险转移至乙方；同时约定验收合格前设备所有权仍归甲方所有。',
  'risk-05':
    '**第八条 不可抗力**\n因地震、洪水、战争等不可抗力致使本合同不能履行的，双方互不承担违约责任。',
  'risk-06':
    '**第六条 违约责任**\n乙方逾期支付任何一期款项的，每逾期一日应按未付金额的1%向甲方支付违约金。' +
    '本合同未对甲方逾期交付或交付瑕疵约定相应违约金标准。',
};

for (const risk of riskList.risks) {
  const excerpt = CLAUSE_EXCERPTS[risk.id];
  if (!excerpt) throw new Error(`main-contract.md 里没有为 ${risk.id} 配置条款摘录`);
  writeCase('S3', `main-${risk.id}`, {
    scenario: 'S3',
    caseType: 'core',
    task: {
      instruction: RISK_INSTRUCTION,
      input: { caseId: CASE_ID, contractText: excerpt },
    },
    expectedAnswer: { caseId: CASE_ID, risks: [risk] },
    scoringRules: [
      { type: 'schemaValid', schemaName: 'RiskList' },
      { type: 'riskListMatch' },
      { type: 'citationExists' },
      { type: 'llmJudge', judgePromptFile: 'judges/s3-risk-quality.judge.md', weight: 1 },
    ],
    sourceRefs: [
      'packages/demo-data/data/contracts/main-contract.md',
      'packages/demo-data/data/artifacts/risk-list.json',
    ],
  });
}

// ---- 整体例：main-holistic，完整合同文本 + risk-list.json 全量 6 个风险点 ----

writeCase('S3', 'main-holistic', {
  scenario: 'S3',
  caseType: 'holistic',
  task: {
    instruction: HOLISTIC_INSTRUCTION,
    input: { caseId: CASE_ID, contractText: mainContractText },
  },
  expectedAnswer: { ...riskList, facts: FACTS },
  scoringRules: [
    { type: 'schemaValid', schemaName: 'RiskList' },
    { type: 'riskListMatch' },
    { type: 'citationExists' },
    { type: 'factConsistency', checkFields: ['caseNumber', 'contractNumber'] },
    { type: 'llmJudge', judgePromptFile: 'judges/s3-risk-quality.judge.md', weight: 1 },
  ],
  sourceRefs: [
    'packages/demo-data/data/contracts/main-contract.md',
    'packages/demo-data/data/artifacts/risk-list.json',
    'packages/demo-data/data/case-bible.md',
  ],
});

// ---- 负例：主合同里未被标记的干净条款，正确答案是 risks: [] ----

const MAIN_NEGATIVE_CLAUSES: Record<string, string> = {
  'neg-main-price':
    '**第一条 标的与价款**\n标的设备为：中频熔炼炉1台、精密铸造模具及配套系统1套、自动化上下料系统1套。' +
    '合同总价为人民币叁佰捌拾万元整（¥3,800,000元），含税含运费送达乙方指定安装地点。',
  'neg-main-payment':
    '**第二条 付款方式**\n1. 预付款：合同总价30%，计人民币1,140,000元，乙方应于本合同签订后7日内支付。\n' +
    '2. 验收款：合同总价60%，计人民币2,280,000元，乙方应于设备验收合格后15日内支付。\n' +
    '3. 质保金：合同总价10%，计人民币380,000元，于质保期（验收合格之日起12个月）届满后由甲方申请、乙方支付。',
  'neg-main-delivery':
    '**第三条 交付**\n甲方应于本合同签订后90日内分批完成设备交付，交付地点为乙方厂区。交付方式、交付凭证以送货单为准。',
  'neg-main-boilerplate':
    '**第十条 其他**\n本合同一式肆份，甲乙双方各执贰份，自双方签字盖章之日起生效。',
};

for (const [caseId, contractText] of Object.entries(MAIN_NEGATIVE_CLAUSES)) {
  writeCase('S3', caseId, {
    scenario: 'S3',
    caseType: 'negative',
    task: { instruction: RISK_INSTRUCTION, input: { caseId: CASE_ID, contractText } },
    expectedAnswer: { caseId: CASE_ID, risks: [] },
    scoringRules: [
      { type: 'schemaValid', schemaName: 'RiskList' },
      { type: 'riskListMatch' },
    ],
    sourceRefs: ['packages/demo-data/data/contracts/main-contract.md'],
  });
}

// ---- 变体例：10 份 S2 变体合同里，挑选法律实质相同/相反的条款，复用同一批真实法条 ----

function variantRisk(
  caseId: string,
  variantFile: string,
  contractText: string,
  description: string,
  level: RiskItem['level'],
  citations: string[],
) {
  writeCase('S3', caseId, {
    scenario: 'S3',
    caseType: 'variant',
    task: { instruction: RISK_INSTRUCTION, input: { caseId: CASE_ID, contractText } },
    expectedAnswer: {
      caseId: CASE_ID,
      risks: [
        {
          id: 'variant-risk',
          description,
          level,
          basis: citations.map((citation) => ({
            citation,
            // textRange 是占位区间（同 demo-data manifest.md 五、已知边界所述的约定），
            // 精确字符偏移量待 ingest 摄取管线（W8）落地后由该管线重新生成。
            sourceAnchors: [{ fileId: variantFile, textRange: { start: 0, end: contractText.length } }],
          })),
          dispositionStatus: 'pending',
        },
      ],
    },
    scoringRules: [
      { type: 'schemaValid', schemaName: 'RiskList' },
      { type: 'riskListMatch' },
      { type: 'citationExists' },
      { type: 'llmJudge', judgePromptFile: 'judges/s3-risk-quality.judge.md', weight: 1 },
    ],
    sourceRefs: [`packages/demo-data/data/contracts/variants/${variantFile}`],
  });
}

function variantClean(caseId: string, variantFile: string, contractText: string) {
  writeCase('S3', caseId, {
    scenario: 'S3',
    caseType: 'variant',
    task: { instruction: RISK_INSTRUCTION, input: { caseId: CASE_ID, contractText } },
    expectedAnswer: { caseId: CASE_ID, risks: [] },
    scoringRules: [
      { type: 'schemaValid', schemaName: 'RiskList' },
      { type: 'riskListMatch' },
    ],
    sourceRefs: [`packages/demo-data/data/contracts/variants/${variantFile}`],
  });
}

variantRisk(
  'variant-v02-ownership-conflict',
  'V02-云章远大机械制造有限公司.md',
  '**第六条 所有权与风险转移**\n设备交付即视为风险转移至乙方；同时约定验收合格前设备所有权仍归甲方所有（与风险转移条款存在逻辑冲突）。',
  '所有权保留与风险转移条款自相矛盾：一方面约定设备交付即视为风险转移至乙方，另一方面又约定验收合格前设备所有权仍归甲方所有，两条款在设备毁损灭失责任归属上存在逻辑冲突。',
  'medium',
  ['《中华人民共和国民法典》第六百零四条'],
);

variantRisk(
  'variant-v02-one-sided-liability',
  'V02-云章远大机械制造有限公司.md',
  '**第五条 违约责任**\n乙方逾期支付任何一期款项的，每逾期一日应按未付金额的0.1%向甲方支付违约金。本合同未对甲方逾期交付或交付瑕疵约定相应违约金标准。',
  '违约责任条款单向：仅约定买方逾期付款的违约责任，未对卖方逾期交付或交付瑕疵约定对应的违约金标准，双方权利义务不对等。',
  'medium',
  ['《中华人民共和国民法典》第四百九十七条', '《中华人民共和国民法典》第五百七十七条'],
);

variantRisk(
  'variant-v05-penalty-elevated',
  'V05-惠远供应链管理（云章）有限公司.md',
  '**第五条 违约责任**\n乙方逾期支付任何一期款项的，每逾期一日应按未付金额的0.2%向甲方支付违约金。本合同未对甲方逾期交付或交付瑕疵约定相应违约金标准。',
  '违约金约定畸高：每逾期一日0.2%对应的年化利率约73%，远超司法实践中以LPR四倍为参考的酌减尺度，存在被大幅调低的风险。',
  'high',
  ['《中华人民共和国民法典》第五百八十五条'],
);

variantRisk(
  'variant-v06-penalty-high',
  'V06-恒锐重工装备有限公司.md',
  '**第五条 违约责任**\n乙方逾期支付任何一期款项的，每逾期一日应按未付金额的0.5%向甲方支付违约金。本合同未对甲方逾期交付或交付瑕疵约定相应违约金标准。',
  '违约金约定畸高：每逾期一日0.5%对应的年化利率约182.5%，远超司法实践中以LPR四倍为参考的酌减尺度。',
  'high',
  ['《中华人民共和国民法典》第五百八十五条'],
);

variantRisk(
  'variant-v09-penalty-elevated',
  'V09-天衡精密机床有限公司.md',
  '**第五条 违约责任**\n甲方逾期交付或交付设备不符合约定的，应按迟延交付部分货款每日0.1%向乙方支付违约金；乙方逾期支付任何一期款项的，每逾期一日应按未付金额的0.3%支付违约金。',
  '违约金约定畸高：乙方逾期付款每日0.3%对应的年化利率约109.5%，远超司法实践中以LPR四倍为参考的酌减尺度（本条款本身双向对等，畸高问题只针对乙方一侧的比例数值）。',
  'high',
  ['《中华人民共和国民法典》第五百八十五条'],
);

variantClean(
  'variant-v04-penalty-clean',
  'V04-沃德精工装备制造有限公司.md',
  '**第五条 违约责任**\n甲方逾期交付或交付设备不符合约定的，应按迟延交付部分货款每日0.1%向乙方支付违约金；乙方逾期支付任何一期款项的，每逾期一日应按未付金额的0.03%支付违约金。',
);

variantClean(
  'variant-v04-ownership-clean',
  'V04-沃德精工装备制造有限公司.md',
  '**第六条 所有权与风险转移**\n设备所有权及毁损灭失风险均自验收合格之日起转移至乙方，权责对应关系明确。',
);

variantClean(
  'variant-v01-liability-clean',
  'V01-卓越智造装备（云章）有限公司.md',
  '**第五条 违约责任**\n甲方逾期交付或交付设备不符合约定的，应按迟延交付部分货款每日0.1%向乙方支付违约金；乙方逾期支付任何一期款项的，每逾期一日应按未付金额的0.05%支付违约金。',
);

variantClean(
  'variant-v01-jurisdiction-neutral',
  'V01-卓越智造装备（云章）有限公司.md',
  '**第八条 争议解决**\n因本合同产生的争议，双方协商不成的，争议提交云章仲裁委员会仲裁。',
);

console.log('S3 数据集生成完毕。');
