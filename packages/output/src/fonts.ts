/**
 * 法律文书字体惯例（packages/output/SPEC.md TODO，架构拍板 2026-07-09）：
 * 正文用仿宋_GB2312（公文类文书的标准正文字体，起诉状/答辩状均属此类，非泛指宋体族）、
 * 标题黑体、西文/数字 Times New Roman，禁用微软雅黑。管线写出的每个 run 必须显式声明完整
 * w:rFonts（ascii + eastAsia + hAnsi + cs），不依赖文档默认回退——缺 eastAsia 是中文渲染错乱主因。
 * 字体不随包分发，仅按名引用。
 */
export const BODY_EAST_ASIA_FONT = '仿宋_GB2312';
export const HEADING_EAST_ASIA_FONT = '黑体';
export const LATIN_FONT = 'Times New Roman';

export type FontRole = 'body' | 'heading';

export function eastAsiaFontFor(role: FontRole): string {
  return role === 'heading' ? HEADING_EAST_ASIA_FONT : BODY_EAST_ASIA_FONT;
}
