// The repository's README.
//
// One README, Chinese-led, sharing its headline, its claim table and its
// commands with the published page — literally, from copy.mjs, so the two can
// never say different things about what has been verified. The README does not
// repeat the page's argument; it says how to run the thing and what is true.
import { HERO, CLAIMS, BUILD, EVIDENCE } from "./copy.mjs";

export function renderReadme({ identity, evidence }) {
  const claims = CLAIMS.map(([claim, status, entry]) => {
    const cell =
      entry === "—" || !/^[A-Za-z0-9_.\-]+(\/|$)/.test(entry) ? entry : `[\`${entry}\`](${entry})`;
    return `| ${claim} | ${status} | ${cell} |`;
  }).join("\n");

  // The page's entry table lists the README first; inside the README that row
  // would point at the file the reader is already in.
  const entries = BUILD.entries
    .filter(([, , target]) => target !== "README.md")
    .map(([name, text, target]) => `- [\`${target}\`](${target})：${text}`)
    .join("\n");
  const components = BUILD.components.map(([name, text]) => `- **${name}** ${text}`).join("\n");

  return `# ${HERO.wordmark}

_${HERO.tagline}_

**${HERO.h1[0]}**
**${HERO.h1[1]}**

${HERO.lede}

发布面：<https://lesprivilege.github.io/Courtwork/>。页面与本文共用同一份声称表；页面的构建见 [\`site/\`](site/)。

## 本地运行

${BUILD.note}

\`\`\`sh
${BUILD.commands.join("\n")}
\`\`\`

## 验证

\`\`\`sh
npm --prefix app test
node --test benchmarks/continuity/grade.test.mjs
node benchmarks/continuity/run.mjs --output /absolute/path/result.json
node tools/lint-colors.mjs
node tools/lint-materials.mjs
node tools/contrast-report.mjs
\`\`\`

发布 commit \`${identity.sha7}\` 上的记录：应用测试 ${evidence.tests.pass} 通过、${evidence.tests.fail} 失败；continuity conformance E ${evidence.benchmark.conditions.E.passed}/${evidence.benchmark.conditions.E.attempted}、S ${evidence.benchmark.conditions.S.passed}/${evidence.benchmark.conditions.S.attempted}，记录在 [\`${evidence.benchmark.record}\`](${evidence.benchmark.record})。该 benchmark 衡量协议保真度，不衡量增量价值：E 与 S 都应通过，这是校准。

Local / fake-provider 通过不等于真实模型验收。

## 声称表

| 可写的声称 | 状态 | 证据入口 |
|---|---|---|
${claims}

${EVIDENCE.claimsNote}

## 入口

${entries}
- [\`engineering/migration/2026-09-08/README.md\`](engineering/migration/2026-09-08/README.md)：来源、Git 谱系、工作目录与回退边界。

## 组成

${components}

${BUILD.upstream}

## Paper

CourtWork 按 Schema Engineering 9.6（\`d78fd31\`）建造，版本绑定与反馈路径见 [\`PAPER.md\`](PAPER.md)。论文是权威；产品状态从不修改论文。

## License

MIT，见 [\`LICENSE\`](LICENSE)。
`;
}
