# Parser coordinate spike

Astra，2026-09-10。隔离安装 unified 11.0.5、remark-parse 11.0.0、remark-gfm 4.0.1，精确依赖与 integrity 见 package-lock.json；不改变 app 或 UI vendor 依赖。

运行（仓根）：

```sh
npm ci --prefix evidence/markdown-review-20260910/parser-spike --ignore-scripts
node evidence/markdown-review-20260910/parser-spike/probe.mjs
```

10/10 行为探针通过，详细观察见 results.json。这是 parser 的局部作者验证，不是产品 source-map、renderer、跨版本 anchor 或独立接受。

实测否定直接使用 mdast.position 的三个假设：BOM 的原文字节与 parser input 不同；UTF-16、Unicode code points、UTF-8 bytes 不同；entity/code 语法区间与显示文本非一一对应。后置 reference definition 还会改变先前段落的语义；duplicate block 不能仅凭 hash 定身份。原始数据均为本轮合成。

package-lock 固定可复跑 npm artifact；本轮未作全依赖供应链审计或生产依赖准入。未运行上游仓库 app，也未声明解析结果已通过 HTML sanitizer。
