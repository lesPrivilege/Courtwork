// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { ChatMarkdown, plainFallbackReason } from './ChatMarkdown';

/**
 * MD-CONVERGE-1+（A/R-18 + C/R-6 合票）：手写解析器退役，改用 workspace 既有 remark。
 *
 * 断言层级从「解析器 AST 形状」下沉到「渲染出的 DOM」——AST 是实现细节（随解析器换代而变），
 * DOM 才是与 App.tsx/SessionHistory/e2e/styles 的真实契约。旧 chat-markdown.test.ts 的每一条
 * 行为用例在此逐条有对应，无净覆盖损失。
 */

let root: ReturnType<typeof createRoot> | undefined;
let container: HTMLDivElement | undefined;

afterEach(() => {
  if (root) act(() => root?.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
});

function render(text: string): HTMLElement {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  act(() => root?.render(createElement(ChatMarkdown, { text })));
  const host = container.querySelector<HTMLElement>('[data-testid="chat-markdown"]');
  if (!host) throw new Error('chat-markdown 根节点缺失');
  return host;
}

/** 渲染后的可见文本（用于「字面标记不得漏出」与「未支持语法原样透出」两类断言）。 */
function visibleText(host: HTMLElement): string {
  return host.textContent ?? '';
}

describe('既有语法回归对照（批次七② + CHAT-MD-TABLE-1 范围，逐条不回退）', () => {
  it('段落按空行切分，段内软换行仍落 <br>', () => {
    const host = render('第一段第一行\n第一段第二行\n\n第二段');
    const paragraphs = host.querySelectorAll('p');
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0].querySelectorAll('br')).toHaveLength(1);
    expect(paragraphs[0].textContent).toBe('第一段第一行第一段第二行');
    expect(paragraphs[1].textContent).toBe('第二段');
  });

  it('标题/无序列表/有序列表各归其块', () => {
    const host = render('# 标题\n- 甲\n- 乙\n\n1. 一\n2. 二');
    expect(host.querySelector('.md-h')?.textContent).toBe('标题');
    expect(host.querySelector('.md-h')?.className).toContain('md-h-1');
    expect(host.querySelectorAll('ul li')).toHaveLength(2);
    expect(host.querySelectorAll('ol li')).toHaveLength(2);
  });

  it('围栏代码块整段收纳，内部不再解析', () => {
    const host = render('```\nconst a = **不是加重**;\n# 不是标题\n```\n尾段');
    const block = host.querySelector('[data-testid="paste-block"]');
    expect(block?.textContent).toContain('const a = **不是加重**;');
    expect(block?.textContent).toContain('# 不是标题');
    expect(host.querySelectorAll('strong')).toHaveLength(0);
    expect(host.querySelector('p')?.textContent).toBe('尾段');
  });

  it('缺闭栏容错：到文末收束，不吞行不抛错', () => {
    const host = render('```\n未闭合代码');
    expect(host.querySelector('[data-testid="paste-block"]')?.textContent).toContain('未闭合代码');
  });

  it('纯文本零 markdown 时原样单段', () => {
    const host = render('没有任何标记的回复。');
    const paragraphs = host.querySelectorAll('p');
    expect(paragraphs).toHaveLength(1);
    expect(paragraphs[0].textContent).toBe('没有任何标记的回复。');
  });

  it('嵌套列表落真嵌套，且标记字符零裸露（换解析器不得比拍平更差）', () => {
    // 退役解析器是扁平单层，此输入被拍平成三个同级项——无嵌套但也无裸标记。
    // remark 给真嵌套：若列表项内容按行内处理，嵌套 list 会落进「未支持→原文切片」，
    // 把 `- 甲子` 的标记裸露出来，比旧行为更差。此例即该回归的红证。
    const host = render('- 甲\n  - 甲子\n- 乙');
    expect(host.querySelectorAll('ul')).toHaveLength(2);
    expect(host.querySelectorAll('li')).toHaveLength(3);
    expect(host.querySelector('li ul li')?.textContent).toBe('甲子');
    expect(visibleText(host)).not.toContain('- ');
  });

  it('列表项内嵌代码块保持从属关系，不割裂为顶层块', () => {
    const host = render('1. 步骤一：\n   ```\n   code\n   ```\n2. 步骤二');
    expect(host.querySelectorAll('ol')).toHaveLength(1);
    expect(host.querySelectorAll('ol > li')).toHaveLength(2);
    expect(host.querySelector('li [data-testid="paste-block"]')?.textContent).toContain('code');
  });

  it('行内 **加重** 与 `code` 落真实标签', () => {
    const host = render('这是**重点**与 `inline` 标识。');
    expect(host.querySelector('strong')?.textContent).toBe('重点');
    expect(host.querySelector('code')?.textContent).toBe('inline');
    expect(visibleText(host)).not.toContain('**');
    expect(visibleText(host)).not.toContain('`');
  });
});

describe('管道表格（CHAT-MD-TABLE-1 ①）逐条不回退', () => {
  it('合法管道表格：表头/数据行落真实 table', () => {
    const host = render('| 列甲 | 列乙 |\n| --- | --- |\n| 1 | 2 |\n| 3 | 4 |');
    const table = host.querySelector('[data-testid="chat-markdown-table"]');
    expect(table).not.toBeNull();
    expect(table?.querySelectorAll('thead th')).toHaveLength(2);
    expect(table?.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(visibleText(host)).not.toContain('|');
  });

  it('分隔行对齐标记（左/右/居中）逐列生效', () => {
    const host = render('| 甲 | 乙 | 丙 |\n| :--- | ---: | :---: |\n| a | b | c |');
    const headers = host.querySelectorAll<HTMLElement>('thead th');
    expect(headers[0].style.textAlign).toBe('left');
    expect(headers[1].style.textAlign).toBe('right');
    expect(headers[2].style.textAlign).toBe('center');
  });

  it('省略首尾竖线的表格行同样识别为合法语法', () => {
    const host = render('甲 | 乙\n--- | ---\n1 | 2');
    expect(host.querySelector('[data-testid="chat-markdown-table"]')).not.toBeNull();
  });

  it('表格后空行接段落：表格不吞尾段', () => {
    const host = render('| 甲 | 乙 |\n| --- | --- |\n| 1 | 2 |\n\n尾段文字');
    expect(host.querySelector('[data-testid="chat-markdown-table"]')).not.toBeNull();
    expect(host.querySelector('p')?.textContent).toBe('尾段文字');
  });

  it('单元格内联加重生效', () => {
    const host = render('| 风险项 |\n| --- |\n| **逾期违约金** |');
    expect(host.querySelector('tbody strong')?.textContent).toBe('逾期违约金');
  });

  it.each([
    ['分隔行缺失', '| 甲 | 乙 |\n| 1 | 2 |'],
    ['分隔行列数与表头不符', '| 甲 | 乙 |\n| --- |\n| 1 | 2 |'],
    ['分隔行单元格不匹配 -/: 语法', '| 甲 | 乙 |\n| foo | bar |\n| 1 | 2 |'],
  ])('畸形（%s）整体降级回段落，不猜测补全', (_label, source) => {
    const host = render(source);
    expect(host.querySelectorAll('[data-testid="chat-markdown-table"]')).toHaveLength(0);
    expect(visibleText(host)).toContain('| 甲 | 乙 |');
  });

  it('列表起始行优先于表格判定，不误吞', () => {
    const host = render('- 甲 | 乙\n- 丙 | 丁');
    expect(host.querySelectorAll('ul li')).toHaveLength(2);
    expect(host.querySelectorAll('[data-testid="chat-markdown-table"]')).toHaveLength(0);
  });

  it('围栏代码块内的管道文本不被误判为表格', () => {
    const host = render('```\n| 甲 | 乙 |\n| --- | --- |\n```');
    expect(host.querySelectorAll('[data-testid="chat-markdown-table"]')).toHaveLength(0);
    expect(host.querySelector('[data-testid="paste-block"]')?.textContent).toContain('| 甲 | 乙 |');
  });
});

describe('--- hr（CHAT-MD-TABLE-1 ②）逐条不回退', () => {
  it('独占一行的 --- 归 hr', () => {
    const host = render('第一段\n\n---\n\n第二段');
    expect(host.querySelectorAll('hr')).toHaveLength(1);
    expect(host.querySelectorAll('p')).toHaveLength(2);
    expect(visibleText(host)).not.toContain('---');
  });

  it('两个短横线不构成 hr，按普通段落文字处理', () => {
    const host = render('--');
    expect(host.querySelectorAll('hr')).toHaveLength(0);
    expect(host.querySelector('p')?.textContent).toBe('--');
  });

  it('围栏代码块内的 --- 不被误判为 hr', () => {
    const host = render('```\n---\n```');
    expect(host.querySelectorAll('hr')).toHaveLength(0);
    expect(host.querySelector('[data-testid="paste-block"]')?.textContent).toContain('---');
  });
});

/**
 * 兼容层锁定：remark 的标准语义在下列两处与退役解析器不同。本票范围是「换实现 + 扩五项」，
 * 不含改既有语义，故显式保留旧行为；「是否改采 remark 标准」另立提案交拍板（见 SPEC 提案区）。
 * 这两条测试同时是提案的红证——一旦架构裁定改采标准语义，此处即为唯一需改的断言。
 */
describe('legacy 语义兼容层（票面外行为零变更）', () => {
  it('紧跟段落的 --- 仍读作 hr，不升格为 Setext 标题', () => {
    const host = render('结论文字\n---');
    expect(host.querySelectorAll('hr')).toHaveLength(1);
    expect(host.querySelector('p')?.textContent).toBe('结论文字');
    expect(host.querySelectorAll('h1,h2,h3,h4,h5,h6')).toHaveLength(0);
  });

  it('数据行列数与表头不符处表格止步，残行回段落', () => {
    const host = render('| 甲 | 乙 |\n| --- | --- |\n| 1 | 2 |\n| 只一列 |\n| 3 | 4 |');
    const table = host.querySelector('[data-testid="chat-markdown-table"]');
    expect(table?.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(visibleText(host)).toContain('| 只一列 |');
    expect(visibleText(host)).toContain('| 3 | 4 |');
  });
});

describe('扩围五项（C/R-6 批准范围）', () => {
  it('链接渲染为可见文字，且是非导航形态（不接 href 打开）', () => {
    const host = render('见 [民法典第五百七十七条](https://example.com/a) 规定');
    const link = host.querySelector<HTMLElement>('.md-link');
    expect(link?.textContent).toBe('民法典第五百七十七条');
    expect(link?.title).toBe('https://example.com/a');
    // 打开能力挂 EXPLORE-RAIL-1 权限位；本票零导航面
    expect(host.querySelectorAll('a')).toHaveLength(0);
    expect(visibleText(host)).not.toContain('](');
  });

  it('单星号斜体落 <em>', () => {
    const host = render('这是 *强调* 文字');
    expect(host.querySelector('em')?.textContent).toBe('强调');
    expect(visibleText(host)).not.toContain('*');
  });

  it('引用落 <blockquote>', () => {
    const host = render('> 引用一行\n> 引用二行');
    const quote = host.querySelector('blockquote');
    expect(quote).not.toBeNull();
    expect(quote?.textContent).toContain('引用一行');
    expect(visibleText(host)).not.toContain('> ');
  });

  it('删除线落 <del>', () => {
    const host = render('~~已废止~~ 条款');
    expect(host.querySelector('del')?.textContent).toBe('已废止');
    expect(visibleText(host)).not.toContain('~~');
  });

  it('任务清单落可读勾选态，且非可交互控件', () => {
    const host = render('- [ ] 未办事项\n- [x] 已办事项');
    const items = host.querySelectorAll<HTMLElement>('li.md-task');
    expect(items).toHaveLength(2);
    expect(items[0].dataset.checked).toBe('false');
    expect(items[1].dataset.checked).toBe('true');
    expect(items[0].textContent).toContain('未办事项');
    // 助手回复是只读内容，不得渲染出可勾选的表单控件
    expect(host.querySelectorAll('input')).toHaveLength(0);
    expect(visibleText(host)).not.toContain('[ ]');
    expect(visibleText(host)).not.toContain('[x]');
  });
});

describe('渲染预算门（验收阻断一：解析同步冻结的回归防线）', () => {
  // 冻结输入：退役解析器 0ms，remark 空闲机实测 2568ms 同步阻塞。守卫必须在 parse 之前短路。
  const FROZEN = `${'*'.repeat(8000)}x${'*'.repeat(8000)}`;
  // 爆栈输入：n=16000 时解析器在 unist-util-visit-parents 上递归爆栈（RangeError），
  // 比「慢」更严重——渲染中抛出会打断整条消息。两种失效模式须同守。
  const STACK_BLOWER = `${'*'.repeat(16_000)}x${'*'.repeat(16_000)}`;

  it('已证冻结输入被游程门拦下，不进解析器', () => {
    expect(plainFallbackReason(FROZEN)).toBe('run');
  });

  it('已证爆栈输入同样被拦下（失效模式二：RangeError 而非变慢）', () => {
    expect(plainFallbackReason(STACK_BLOWER)).not.toBeNull();
  });

  it.each([
    ['下划线定界符', `${'_'.repeat(600)}x${'_'.repeat(600)}`],
    ['方括号定界符', `${'['.repeat(600)}x${']'.repeat(600)}`],
    ['混合定界符', `${'*'.repeat(400)}${'_'.repeat(400)}x`],
  ])('变体（%s）同样被拦——守卫是通用游程约束，非定界符黑名单', (_label, source) => {
    expect(plainFallbackReason(source)).toBe('run');
  });

  it('超长输入被长度门拦下', () => {
    expect(plainFallbackReason('甲'.repeat(40_000))).toBe('length');
  });

  it('真实内容零误伤：长回复/长代码块/80 字符分隔线均放行', () => {
    const longReply = '本条约定存在风险：\n\n| 风险 | 等级 |\n| --- | --- |\n| 违约金畸高 | 高 |\n\n'.repeat(120);
    const codeHeavy = `\`\`\`\n${'const x = compute(a, b, c);\n'.repeat(800)}\`\`\`\n`;
    const ruled = `章节\n\n${'-'.repeat(80)}\n\n正文。\n\n`.repeat(200);
    expect(plainFallbackReason(longReply)).toBeNull();
    expect(plainFallbackReason(codeHeavy)).toBeNull();
    expect(plainFallbackReason(ruled)).toBeNull();
  });

  it('降级可见且内容完整：显式说明在场、原文一字不少、不进格式路径', () => {
    const started = Date.now();
    const host = render(FROZEN);
    // 守卫若失效，此处会同步冻结 >20s——耗时本身即断言
    expect(Date.now() - started).toBeLessThan(2_000);
    expect(host.dataset.plainFallback).toBe('run');
    expect(host.querySelector('.md-plain-notice')?.textContent).toContain('已按纯文本完整显示');
    expect(host.querySelector('[data-testid="paste-block"]')?.textContent).toBe(FROZEN);
    // 降级态不得残留格式路径产物
    expect(host.querySelectorAll('strong,em,table,hr')).toHaveLength(0);
  });
});

describe('松散列表段界与有序起始序号（验收 D2 / D3）', () => {
  it('松散列表项内多段落保留段界，不拼成一句', () => {
    const host = render('- 违约金为每日一百元\n\n  合计三十日共计三千元\n- 下一项');
    const first = host.querySelectorAll('li')[0];
    const paragraphs = first.querySelectorAll('p');
    // 段界是结构事实，须逐段各自取文；textContent 跨元素拼接，天然看不出段界，不能用作判据。
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0].textContent).toBe('违约金为每日一百元');
    expect(paragraphs[1].textContent).toBe('合计三十日共计三千元');
  });

  it('紧凑列表项仍内联，不平白多出段落包裹', () => {
    const host = render('- 甲\n- 乙');
    expect(host.querySelectorAll('li p')).toHaveLength(0);
  });

  it('有序列表起始序号不丢（旧「已知边界③」随 remark 递上 start 而消解）', () => {
    const host = render('3. 第三条\n4. 第四条');
    expect(host.querySelector('ol')?.getAttribute('start')).toBe('3');
  });

  it('起始为 1 时不写冗余 start', () => {
    const host = render('1. 甲\n2. 乙');
    expect(host.querySelector('ol')?.getAttribute('start')).toBe('1');
  });
});

describe('明确除外与安全边界', () => {
  it('图片不渲染为 <img>，原样透出字面量（无多模态管线，不造能力幻觉）', () => {
    const host = render('![说明](https://example.com/i.png)');
    expect(host.querySelectorAll('img')).toHaveLength(0);
    expect(visibleText(host)).toContain('![说明](https://example.com/i.png)');
  });

  it('数学公式原样透出（垂类无需，不引公式引擎）', () => {
    const host = render('质能方程 $E=mc^2$ 如上');
    expect(visibleText(host)).toContain('$E=mc^2$');
  });

  it('原始 HTML 按纯文本渲染，不落真实元素（SPEC.md:70 安全边界不变）', () => {
    const host = render('<b>粗</b> 与 <script>alert(1)</script>');
    expect(host.querySelectorAll('b')).toHaveLength(0);
    expect(host.querySelectorAll('script')).toHaveLength(0);
    expect(visibleText(host)).toContain('<b>');
    expect(visibleText(host)).toContain('<script>');
  });

  it('未支持节点一律回落原文切片，不静默吞', () => {
    const host = render('脚注引用[^1] 与图片 ![x](y)');
    expect(visibleText(host)).toContain('[^1]');
    expect(visibleText(host)).toContain('![x](y)');
  });
});
