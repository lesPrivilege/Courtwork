const ruleBody = (css, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, 's'))?.[1] ?? '';
};

export function validateVersionalSite({ html, css, desktopCss }) {
  const failures = [];
  const root = ruleBody(css, ':root');
  const proof = ruleBody(css, '.scenario-proof');
  const proofItem = ruleBody(css, '.scenario-proof li');
  const promiseRow = ruleBody(css, '.promise-ledger > div');
  const promiseLast = ruleBody(css, '.promise-ledger > div:last-child');
  const marginalia = ruleBody(css, '.design-boundary');
  const evidenceStep = ruleBody(css, '.evidence-step');
  const workRow = ruleBody(css, '.work-row');
  const scenarioRow = ruleBody(css, '.scenario-row');
  const scenarioLast = ruleBody(css, '.scenario-row:last-child');
  const heroTitle = ruleBody(css, 'h1.zh-title');
  const documentHead = ruleBody(desktopCss ?? '', '.document-preview header');
  const draftSurface = ruleBody(desktopCss ?? '', '.draft-editor, .draft-reading');
  const progressCard = ruleBody(desktopCss ?? '', '.progress-card');
  const pasteToggle = ruleBody(desktopCss ?? '', '.paste-block .collapse-toggle');

  for (const [property, value] of [
    ['--bg-app', '#F7F8FA'],
    ['--bg-surface', '#F2F4F7'],
    ['--bg-raised', '#FFFFFF'],
    ['--text-primary', '#232B38'],
    ['--text-secondary', '#55617A'],
    ['--text-tertiary', '#637083'],
    ['--border-hairline', '#D5DAE3'],
    ['--border-strong', '#C3CAD6'],
    ['--border-focus', '#2563EB'],
  ]) {
    if (!new RegExp(`${property}:\\s*${value}`, 'i').test(root)) failures.push(`VL2-C01 Pages 浅宗色阶漂移：${property}`);
  }
  if (!/font-weight:\s*700/.test(heroTitle)) failures.push('VL2-T01 hero 标题未与四栏标题同用宋体 700 重端');
  if (!/border-right:\s*0/.test(evidenceStep)
      || !/border-top:\s*0/.test(workRow)
      || !/border-top:\s*0/.test(scenarioRow)
      || !/border-bottom:\s*0/.test(scenarioLast)
      || !/border(?:-block)?:\s*0/.test(marginalia)) {
    failures.push('VL2-L01 Pages 连续叙事的 routine 分隔线未完成二次减法');
  }
  if (!/border-bottom:\s*0/.test(documentHead)
      || !/border:\s*0/.test(draftSurface)
      || !/border-top:\s*0/.test(progressCard)
      || !/border-bottom:\s*0/.test(progressCard)
      || !/border-top:\s*0/.test(pasteToggle)) {
    failures.push('VL2-L02 Agent 文书与进度面的 routine 分隔线未完成二次减法');
  }

  if (!/class="release-fact publication-colophon" id="release-colophon"/.test(html)) {
    failures.push('VL-P03 平框刊记缺失或不再唯一锚定 release-colophon');
  }
  if (!/border:\s*1px solid var\(--border-strong\)/.test(ruleBody(css, '.publication-colophon'))) {
    failures.push('VL-P03 刊记未保留平框结构边界');
  }
  if (!/border-block:\s*1px solid var\(--border-hairline\)/.test(proof)) {
    failures.push('VL-P02 scenario-proof 外部组界缺失');
  }
  if (!/border-right:\s*0/.test(proofItem)) {
    failures.push('VL-P02 scenario-proof routine 竖格线复活');
  }
  if (!/border-bottom:\s*0/.test(promiseRow) || !/border-bottom:\s*1px solid var\(--border-hairline\)/.test(promiseLast)) {
    failures.push('VL-P02 promise ledger 未收为单一上下版框');
  }
  if (!/border:\s*0/.test(marginalia) || /border:\s*1px/.test(marginalia)) {
    failures.push('VL-P04 眉批带退回卡框');
  }
  if (!/class="design-boundary site-marginalia"/.test(html)) failures.push('VL-P04 站面眉批未绑定唯一消费点');
  if (/writing-mode\s*:/.test(css)) failures.push('退项竖排签条不得复活');
  if (!/\.composer-shell:focus-within\s*\{\s*border-color:\s*var\(--text-tertiary\);\s*\}/.test(desktopCss ?? '')) {
    failures.push('VL-L05 composer focus 强边界退场或色槽漂移');
  }

  return failures;
}
