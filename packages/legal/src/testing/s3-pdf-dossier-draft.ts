import type { RiskListDraft } from '../schemas/risk-list.js';

/**
 * S3 生成节点的 PDF 卷宗档草稿（LEGAL-DEMO-RUN，2026-07-13）：全链穿越的剧本层。
 *
 * 与 s3-risk-list-draft.ts（docx 黄金样例档）的分工：那一档服务既有验收流
 * （original.docx 文本层）；本档以 demo-data 主合同的 **生成 PDF**
 * （data/contracts/设备采购合同.pdf，源 main-contract.md）为公证基底——引语全部
 * 出自 PDF 真实文本层，页码按 PDF 两页排布声明（模型侧"文件+页/块+逐字引语"
 * 的忠实形态），坐标一律由 resolver 对材料唯一精确匹配后铸造，剧本里结构性
 * 不存在坐标。
 *
 * 考点（golden 预埋引语）与剧本同住本 demo 包，不进机器层——防过拟合隔离审计
 * （assert-no-demo-in-harness）以此为断言对象之一。
 *
 * risk-08 的首个依据引语出自信用查询单（md 材料），刻意不出现在合同 docx 孪生里：
 * 编译进 RevisionInstructionSet 后 output 侧预期 locator_not_found——"定位失败时
 * 报错并跳过，不错插"纪律的保留展示位（沿 s3-risk-list-response.ts 的先例）。
 * 其 blockId '7' 同时演示 md 材料的块寻址（本条引语虽全文唯一，仍按模型忠实
 * 形态声明块位——真模型被要求给出文件+页/块）。
 */

/** PDF 档预埋考点：真模型跑本档材料时，产出锚点引语应命中其中至少 S3_PDF_MINIMUM_PRELOADED_FINDINGS 条。 */
export const S3_PDF_PRELOADED_ANCHOR_QUOTES = [
  '乙方逾期支付任何一期款项的，每逾期一日应按未付金额的1%向甲方支付违约金。',
  '本合同未对甲方逾期交付或交付瑕疵约定相应违约金标准。',
  '验收标准以甲方提供的技术参数为准',
  '设备交付即视为风险转移至乙方',
  '验收合格前设备所有权仍归甲方所有',
  '因地震、洪水、战争等不可抗力致使本合同不能履行的，双方互不承担违约责任。',
  '提交甲方所在地有管辖权的人民法院管辖',
] as const;

export const S3_PDF_MINIMUM_PRELOADED_FINDINGS = 5;

export const S3_PDF_CONTRACT_FILE_ID = '设备采购合同.pdf';
export const S3_PDF_CREDIT_FILE_ID = '20-企业信用信息查询单.md';

/**
 * 委托方视角：乙方起云智能装备（买方）。八条风险全部针对合同里对买方不利的
 * 预埋条款（与 reading-view s3-material.test 登记的七条诱饵条款一一对应，另加
 * 主体核验一条）。dispositionStatus 一律 pending——处置属于律师（门禁逐条）。
 */
export const S3_PDF_DOSSIER_DRAFT: RiskListDraft = {
  caseId: 'case-linjiang-qiyun-2025',
  risks: [
    {
      id: 'risk-01',
      description:
        '违约金单向且畸高：乙方逾期付款按未付金额每日 1%（年化约 365%）承担违约金，而合同未对甲方逾期交付或交付瑕疵约定任何对应违约金标准，权义务显著失衡；该比例远超实际损失时可依法请求酌减，建议改为双向、封顶并与实际损失挂钩。',
      level: 'high',
      basis: [
        {
          citation: '《中华人民共和国民法典》第五百八十五条',
          quoteClaims: [
            {
              fileId: S3_PDF_CONTRACT_FILE_ID,
              page: 2,
              exactQuote: '乙方逾期支付任何一期款项的，每逾期一日应按未付金额的1%向甲方支付违约金。',
            },
            {
              fileId: S3_PDF_CONTRACT_FILE_ID,
              page: 2,
              exactQuote: '本合同未对甲方逾期交付或交付瑕疵约定相应违约金标准。',
            },
          ],
        },
      ],
      dispositionStatus: 'pending',
    },
    {
      id: 'risk-02',
      description:
        '验收标准由甲方单方决定且无书面异议期：验收以甲方提供的技术参数为准，乙方对验收结论缺少约定的书面异议通道，一旦联调争议将陷入"标准与裁判都在对方"的被动局面；建议改为双方确认的技术协议附件并约定异议期限。',
      level: 'high',
      basis: [
        {
          citation: '《中华人民共和国民法典》第五百一十条',
          quoteClaims: [
            { fileId: S3_PDF_CONTRACT_FILE_ID, page: 1, exactQuote: '验收标准以甲方提供的技术参数为准' },
            { fileId: S3_PDF_CONTRACT_FILE_ID, page: 1, exactQuote: '双方未就书面验收异议期限作出约定' },
          ],
        },
      ],
      dispositionStatus: 'pending',
    },
    {
      id: 'risk-03',
      description:
        '风险转移早于验收：设备"交付即视为风险转移至乙方"，联调验收合格前的毁损灭失风险已压给买方，与验收条款组合后买方在未确认设备合格期间即承担全部风险；建议约定风险自验收合格时转移。',
      level: 'high',
      basis: [
        {
          citation: '《中华人民共和国民法典》第六百零四条',
          quoteClaims: [{ fileId: S3_PDF_CONTRACT_FILE_ID, page: 2, exactQuote: '设备交付即视为风险转移至乙方' }],
        },
      ],
      dispositionStatus: 'pending',
    },
    {
      id: 'risk-04',
      description:
        '所有权保留与风险转移错位：验收合格前所有权仍归甲方、风险却已在交付时移至乙方——乙方在一段期间内"无所有权而担全险"；建议与风险转移条款一并调整为同一时点。',
      level: 'medium',
      basis: [
        {
          citation: '《中华人民共和国民法典》第六百四十一条',
          quoteClaims: [{ fileId: S3_PDF_CONTRACT_FILE_ID, page: 2, exactQuote: '验收合格前设备所有权仍归甲方所有' }],
        },
      ],
      dispositionStatus: 'pending',
    },
    {
      id: 'risk-05',
      description:
        '不可抗力条款为封闭列举：仅列地震、洪水、战争，未涵盖政府行为、疫情管控、供应链中断等情形，也未约定通知与减损义务；列举式表述在个案中可能被从严解释。',
      level: 'low',
      basis: [
        {
          citation: '《中华人民共和国民法典》第一百八十条',
          quoteClaims: [
            {
              fileId: S3_PDF_CONTRACT_FILE_ID,
              page: 2,
              exactQuote: '因地震、洪水、战争等不可抗力致使本合同不能履行的，双方互不承担违约责任。',
            },
          ],
        },
      ],
      dispositionStatus: 'pending',
    },
    {
      id: 'risk-06',
      description:
        '管辖条款向卖方倾斜：争议由甲方所在地法院管辖，乙方应诉与设备现场勘验两头不便；建议改为设备安装地（乙方厂区所在地）或被告所在地法院管辖。',
      level: 'medium',
      basis: [
        {
          citation: '《中华人民共和国民事诉讼法》第三十五条',
          quoteClaims: [{ fileId: S3_PDF_CONTRACT_FILE_ID, page: 2, exactQuote: '提交甲方所在地有管辖权的人民法院管辖' }],
        },
      ],
      dispositionStatus: 'pending',
    },
    {
      id: 'risk-07',
      description:
        '付款节奏前倾：签订后 7 日内即付 30% 预付款（114 万元），而交付期长达 90 日且分批，预付款支付与甲方履约进度脱钩；建议将预付款与到货/安装节点挂钩或要求甲方提供预付款保函。',
      level: 'medium',
      basis: [
        {
          citation: '《中华人民共和国民法典》第五百二十六条',
          quoteClaims: [
            {
              fileId: S3_PDF_CONTRACT_FILE_ID,
              page: 1,
              exactQuote: '预付款：合同总价30%，计人民币1,140,000元，乙方应于本合同签订后7日内支付。',
            },
          ],
        },
      ],
      dispositionStatus: 'pending',
    },
    {
      id: 'risk-08',
      description:
        '收款主体与关联公司网络需核验：甲方集团内存在多家名称高度近似的关联主体（科技/装备/国际贸易），信用查询单明示关联公司"非同一法律主体"，而合同指定收款账户主体为临江精铸科技有限公司——付款前应逐笔核对收款账户主体与签约主体一致，防止付款对象漂移到关联公司。',
      level: 'medium',
      basis: [
        {
          citation: '主体核验：party-verify（demo-fixture，B 级信源）',
          quoteClaims: [
            {
              fileId: S3_PDF_CREDIT_FILE_ID,
              blockId: '7',
              exactQuote: '与临江精铸科技有限公司同受临江精铸集团有限公司控制，为关联公司，非同一法律主体',
            },
            { fileId: S3_PDF_CONTRACT_FILE_ID, page: 1, exactQuote: '账户主体为临江精铸科技有限公司' },
          ],
        },
      ],
      dispositionStatus: 'pending',
    },
  ],
};
