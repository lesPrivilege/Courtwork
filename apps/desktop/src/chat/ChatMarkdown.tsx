import { Fragment, type CSSProperties, type ReactNode } from 'react';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import type { Nodes, Parents, PhrasingContent, RootContent, Table, TableRow } from 'mdast';
import { PasteBlock } from './PasteBlock';

/**
 * MD-CONVERGE-1+（A/R-18 + C/R-6 合票）：chat 回复的 md 富渲染。
 *
 * 解析改用 workspace 既有的 remark（`packages/reading-view` 同版生产依赖，零新第三方包），
 * 退役原 228 行手写解析器——扩围语法由标准解析器免费获得，不再逐个扩自研分支。
 *
 * 渲染边界（本件只做渲染，不做导航、不做多模态）：
 * - **链接只渲染不导航**：落 `span.md-link`，零 `<a href>`；打开能力挂 EXPLORE-RAIL-1 的
 *   `opener:allow-open-url` 权限位，本件不接。
 * - **图片、公式、原始 HTML 不落真实元素**：图片无多模态管线（渲染即造能力幻觉）、公式垂类无需、
 *   原始 HTML 是既有安全边界（见 SPEC.md `CHAT-MD-TABLE-1` 节「原始 HTML 片段不解析执行」条，
 *   不引 rehype-raw 一类）。按节名引用而非行号——行号在反复编辑的同一文件里必漂。
 * - **未支持节点一律回落原文切片**：`renderUnsupported` 是兜底而非枚举，新语法出现时默认原样
 *   透出而非静默吞——「不静默降级」对尚未支持的语法同样成立。
 */

type Align = 'left' | 'right' | 'center' | null;

const processor = unified().use(remarkParse).use(remarkGfm);

/* ── 渲染预算门（验收阻断一：解析同步冻结）────────────────────────────────────
 * CommonMark 的强调/链接定界符匹配在长游程下命中最坏复杂度。空闲机实测（`'*'×n + 'x' + '*'×n`）：
 *   n=4000 → 511ms；n=8000 → 2568ms（主线程同步冻结）；
 *   n=16000 → **`RangeError: Maximum call stack size exceeded`**（`unist-util-visit-parents`
 *   在深层嵌套 strong 上递归爆栈——本件的递归渲染器同样会爆，只是解析先崩）。
 * 退役的手写解析器同输入 0ms，故**两种失效模式都是换件引入的回归**，不是既有问题。
 * 本件渲染模型输出（不可信输入），故 parse 前须有预算门。
 *
 * 测量纪律留痕：初次归因曾记为「n=8000 → >20s」，那是同机并发跑 Playwright 时的负载虚高值；
 * 空闲复测得 2568ms。结论方向不变（超线性、无界），但量级以空闲实测为准——
 * 负载相关缺陷须在复现条件下测，此处如实更正。
 *
 * 两层，缺一不可：
 *   ① 长度门——聊天正文超过数十 KB 本身已是呈现问题；同时为聚合面（多段中等游程）设上界。
 *   ② 游程门——**任意字符**的最大连续重复数。刻意不做定界符黑名单：黑名单的完备性不可证
 *      （`_`/`[`/`]` 与未知组合同样命中），而「无单字符长游程」是通用结构性约束，覆盖未来语法。
 *
 * 阈值由实测校准（真实内容：典型法律长回复 8160 字符/最长游程 3；含长代码块 22408/3；
 * 含 80 字符分隔线 18600/80）——对真实内容留 1.5–3.2 倍余量，零误伤。
 * **诚实边界**：门把无界冻结压成有界代价，不是消除代价——上限内最坏输入实测仍需约 553ms
 * （32 KiB 全塞 256 游程）。这是有意接受的残余，不作「已解决」宣称。
 * ────────────────────────────────────────────────────────────────────────── */

const MAX_SOURCE_LENGTH = 32_768;
const MAX_RUN_LENGTH = 256;

export type PlainFallbackReason = 'length' | 'run';

/** 超预算返回原因，未超返回 null。单趟扫描，O(n) 且与解析器无关。 */
export function plainFallbackReason(source: string): PlainFallbackReason | null {
  if (source.length > MAX_SOURCE_LENGTH) return 'length';
  let run = 1;
  for (let index = 1; index < source.length; index += 1) {
    if (source.charCodeAt(index) === source.charCodeAt(index - 1)) {
      run += 1;
      if (run > MAX_RUN_LENGTH) return 'run';
    } else {
      run = 1;
    }
  }
  return null;
}

/** 降级必须可见（不变量 4）：说清发生了什么与为何，并申明内容完整未截断。 */
const PLAIN_FALLBACK_COPY = '本条回复已按纯文本完整显示 · 内容过长或含大量连续重复符号时不做格式排版';

/* ── legacy 语义兼容层 ───────────────────────────────────────────────────────
 * remark 的标准语义在两处与退役解析器不同。本票范围是「换实现 + 扩五项」，不含改既有语义，
 * 故在此显式保留旧行为；两处均有测试锁定（chat-markdown.test.ts『legacy 语义兼容层』节）。
 * 架构已裁维持旧行为，兼容层转为常设；未来若改变行为须另作架构裁决。
 * ────────────────────────────────────────────────────────────────────────── */

/** Setext 标题（`文字` + `---`/`===` 下划线）判定：源码起点不是 `#` 即为 Setext 形态。 */
function isSetextHeading(node: Nodes, source: string): boolean {
  if (node.type !== 'heading' || !node.position) return false;
  return source.charAt(node.position.start.offset ?? 0) !== '#';
}

/**
 * 旧解析器不实现 Setext 语义，`结论文字\n---` 恒读作「段落 + hr」（原注释：不猜测意图）。
 * 还原：depth 2（`---` 下划线）拆回段落 + thematicBreak；depth 1（`===`）整体回落原文切片。
 */
function unwrapSetext(node: Nodes, source: string): RootContent[] {
  if (node.type !== 'heading') return [node as RootContent];
  const paragraph: RootContent = { type: 'paragraph', children: node.children, position: node.position };
  if (node.depth === 2) return [paragraph, { type: 'thematicBreak' }];
  return [{ type: 'paragraph', children: [{ type: 'text', value: sliceOf(node, source) }] }];
}

/**
 * 旧解析器在「数据行列数与表头不符」处让表格止步，残行回落段落（原注释：不猜测补全/截断该行）。
 * remark-gfm 则把缺格行留在表格内。还原：从首个不符行起截断，其后原文切片转段落。
 */
function truncateRaggedTable(table: Table, source: string): RootContent[] {
  const [header, ...body] = table.children;
  if (!header) return [table];
  const width = header.children.length;
  const bad = body.findIndex((row) => row.children.length !== width);
  if (bad < 0) return [table];
  const kept: TableRow[] = [header, ...body.slice(0, bad)];
  const residueStart = body[bad]?.position?.start.offset;
  const residueEnd = table.position?.end.offset;
  const head: RootContent = { ...table, children: kept };
  if (residueStart === undefined || residueEnd === undefined) return [head];
  const residue = source.slice(residueStart, residueEnd);
  return [head, { type: 'paragraph', children: [{ type: 'text', value: residue }] }];
}

/* ── 渲染 ──────────────────────────────────────────────────────────────── */

/** 节点对应的原文切片；位置缺失时回落空串（不猜测、不编造）。 */
function sliceOf(node: Nodes, source: string): string {
  const start = node.position?.start.offset;
  const end = node.position?.end.offset;
  if (start === undefined || end === undefined) return '';
  return source.slice(start, end);
}

/** 软换行还原为 <br>：mdast 把段内单换行留在 text 值里，逐行切分后交替插入。 */
function renderText(value: string, key: string): ReactNode[] {
  const lines = value.split('\n');
  return lines.map((line, index) => (
    <Fragment key={`${key}-${index}`}>
      {index > 0 && <br />}
      {line}
    </Fragment>
  ));
}

/** 未支持/明确除外的节点：原样透出原文切片，绝不静默吞。 */
function renderUnsupported(node: Nodes, source: string, key: string): ReactNode {
  return <Fragment key={key}>{sliceOf(node, source)}</Fragment>;
}

function renderPhrasing(nodes: PhrasingContent[], source: string, keyBase: string): ReactNode[] {
  return nodes.map((node, index) => {
    const key = `${keyBase}-${index}`;
    switch (node.type) {
      case 'text':
        return <Fragment key={key}>{renderText(node.value, key)}</Fragment>;
      case 'strong':
        return <strong key={key}>{renderPhrasing(node.children, source, key)}</strong>;
      case 'emphasis':
        return <em key={key}>{renderPhrasing(node.children, source, key)}</em>;
      case 'delete':
        return <del key={key}>{renderPhrasing(node.children, source, key)}</del>;
      case 'inlineCode':
        return <code key={key}>{node.value}</code>;
      case 'break':
        return <br key={key} />;
      case 'link':
        // 非导航形态：零 <a href>，URL 经 title 可见可复制；打开挂 EXPLORE-RAIL-1 权限位。
        return (
          <span key={key} className="md-link" title={node.url}>
            {renderPhrasing(node.children, source, key)}
          </span>
        );
      default:
        // image / html / footnoteReference / 未来新语法：原样透出
        return renderUnsupported(node, source, key);
    }
  });
}

const ALIGN_STYLE: Record<Exclude<Align, null>, CSSProperties> = {
  left: { textAlign: 'left' },
  right: { textAlign: 'right' },
  center: { textAlign: 'center' },
};

function alignStyle(align: Align): CSSProperties | undefined {
  return align ? ALIGN_STYLE[align] : undefined;
}

function renderTable(node: Table, source: string, key: string): ReactNode {
  const [header, ...body] = node.children;
  const align = (node.align ?? []) as Align[];
  return (
    <div key={key} className="md-table-wrap">
      <table className="md-table" data-testid="chat-markdown-table">
        <thead>
          <tr>
            {(header?.children ?? []).map((cell, c) => (
              <th key={c} style={alignStyle(align[c] ?? null)}>
                {renderPhrasing(cell.children, source, `${key}-h${c}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, r) => (
            <tr key={r}>
              {row.children.map((cell, c) => (
                <td key={c} style={alignStyle(align[c] ?? null)}>
                  {renderPhrasing(cell.children, source, `${key}-r${r}-${c}`)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * 列表项内容：紧凑列表的项内容是 paragraph，须内联渲染（包 <p> 会平白多出段距）；
 * 而嵌套列表/代码块/引用等真块级子节点必须走块级递归——退役解析器是扁平单层，嵌套项被拍平
 * 成同级；remark 给的是真嵌套，若在此按行内处理会落进「未支持→原文切片」，把 `- ` 标记
 * 裸露给用户（比旧行为更差）。此分派即嵌套结构的落点。
 */
function renderItemContent(item: Parents, source: string, keyBase: string): ReactNode[] {
  // 紧凑项（单段落）内联以免多余段距；松散项（多段落）必须保留段界——否则两个独立事实被
  // 拼成一句（验收 D2：「违约金为每日一百元」+「合计三十日共计三千元」曾被并成一行）。
  const inlineSingleParagraph = item.children.filter((child) => child.type === 'paragraph').length <= 1;
  return item.children.map((child, index) => {
    const key = `${keyBase}-${index}`;
    if (child.type === 'paragraph' && inlineSingleParagraph) {
      return <Fragment key={key}>{renderPhrasing(child.children, source, key)}</Fragment>;
    }
    return renderBlock(child, source, key);
  });
}

function renderBlock(node: RootContent, source: string, key: string): ReactNode {
  switch (node.type) {
    case 'code':
      return <PasteBlock key={key} text={node.value} />;
    case 'thematicBreak':
      return <hr key={key} className="md-hr" />;
    case 'heading':
      return (
        <h4 key={key} className={`md-h md-h-${Math.min(node.depth, 3)}`}>
          {renderPhrasing(node.children, source, key)}
        </h4>
      );
    case 'blockquote':
      return (
        <blockquote key={key} className="md-quote">
          {node.children.map((child, index) => renderBlock(child, source, `${key}-${index}`))}
        </blockquote>
      );
    case 'list': {
      const items = node.children.map((item, index) => {
        const checked = item.checked ?? null;
        const content = renderItemContent(item, source, `${key}-${index}`);
        if (checked === null) return <li key={index}>{content}</li>;
        // 助手回复是只读内容：勾选态是「读得出」不是「点得动」，故不渲染表单控件。
        return (
          <li key={index} className="md-task" data-checked={checked ? 'true' : 'false'}>
            <span className="md-task-mark" role="img" aria-label={checked ? '已办' : '未办'}>
              {checked ? '✓' : '○'}
            </span>
            {content}
          </li>
        );
      });
      // D3：起始序号不再丢弃——旧解析器无此字段属成本限制，remark 已递到手上。
      if (!node.ordered) return <ul key={key}>{items}</ul>;
      return <ol key={key} start={node.start ?? undefined}>{items}</ol>;
    }
    case 'table':
      return renderTable(node, source, key);
    case 'paragraph':
      return <p key={key}>{renderPhrasing(node.children, source, key)}</p>;
    default:
      return <p key={key}>{renderUnsupported(node, source, key)}</p>;
  }
}

/** 顶层块序列：先过 legacy 兼容层，再逐块渲染。 */
function toBlocks(source: string): RootContent[] {
  const tree = processor.parse(source);
  const out: RootContent[] = [];
  for (const node of tree.children) {
    if (isSetextHeading(node, source)) out.push(...unwrapSetext(node, source));
    else if (node.type === 'table') out.push(...truncateRaggedTable(node, source));
    else out.push(node);
  }
  return out;
}

export function ChatMarkdown({ text }: { text: string }) {
  const fallback = plainFallbackReason(text);
  if (fallback) {
    return (
      <div className="chat-markdown" data-testid="chat-markdown" data-plain-fallback={fallback}>
        <p className="md-plain-notice">{PLAIN_FALLBACK_COPY}</p>
        <PasteBlock text={text} />
      </div>
    );
  }
  const blocks = toBlocks(text);
  return (
    <div className="chat-markdown" data-testid="chat-markdown">
      {blocks.map((block, index) => renderBlock(block, text, `b${index}`))}
    </div>
  );
}
