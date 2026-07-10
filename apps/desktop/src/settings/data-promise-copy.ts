/**
 * 数据承诺声明页文案（docs/28 矩阵摘录）。
 * 主协议级、文书排版；律所客户会逐字读——不增不减语义。
 */

export const DATA_PROMISE_TITLE = '数据承诺声明';

export const DATA_PROMISE_SECTIONS: ReadonlyArray<{
  id: string;
  heading: string;
  paragraphs: readonly string[];
}> = [
  {
    id: 'never-train',
    heading: '案件内容永不训练',
    paragraphs: [
      '案件内容本体在任何部署形态下均不用于模型训练。这是委托代理关系的必然要求：律所与律师无权代当事人同意将案件实质内容用于第三方训练。',
      '本条写入主协议正文，而非仅置于隐私政策附件。',
    ],
  },
  {
    id: 'behavior-data',
    heading: '脱敏行为数据',
    paragraphs: [
      '可复利的数据仅限不可逆脱敏后的字段级修正行为（例如改了哪个字段、否决了哪个风险点），不含案件实质内容。',
      '采用 opt-in：条款明示、可随时关闭、关闭不溯及既往。关闭前已脱敏汇总的统计不受影响。',
    ],
  },
  {
    id: 'telemetry',
    heading: '使用遥测',
    paragraphs: [
      '使用遥测用于产品稳定性与功能改进，不含密钥、不含案件正文。本机部署下遥测默认仅存于本机；您可随时在设置中关闭。',
    ],
  },
  {
    id: 'annotations',
    heading: '公开判例上的专业判断标注',
    paragraphs: [
      '对公开判例的专业判断标注采用 opt-in；使用权归产品方，「个人贡献记录」可见性归律师本人。回传经客户机构同意。',
    ],
  },
  {
    id: 'redlines',
    heading: '我们不会做的事',
    paragraphs: [
      '不会默认勾选任何与案件内容相关的授权。',
      '不会用可复原的假名化冒充脱敏。',
      '不会把关键授权埋进长文本——行为数据 opt-in 等关键授权须逐项确认。',
    ],
  },
] as const;

/** 预留项统一 tooltip 模板（docs/19 / docs/45）。 */
export function reservedTooltip(feature: string, alternative: string): string {
  return `${feature}即将支持 · 当前可通过${alternative}实现`;
}

export const RESERVED_COPY = {
  sources: reservedTooltip('来源授权管理', '在对话中按条确认附件归属'),
  wecom: reservedTooltip('企业微信通道', '本机导出后手动发送'),
  feishu: reservedTooltip('飞书通道', '本机导出后手动发送'),
  email: reservedTooltip('邮件通道', '系统默认邮件客户端发送产出文件'),
  enterpriseLib: reservedTooltip('企业私域库接入', '将资料放入本案卷宗文件夹'),
  clearPrefs: reservedTooltip('清除记住的偏好', '在记忆空间上线后管理；与「清空本次对话」是两个独立入口'),
  checkUpdate: reservedTooltip('检查更新', '从发行渠道手动下载新版本'),
} as const;
