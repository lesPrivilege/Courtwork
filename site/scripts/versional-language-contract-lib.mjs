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
  const siteDark = css.match(/@media\s*\(prefers-color-scheme:\s*dark\)\s*\{\s*:root\s*\{([^}]*)\}/s)?.[1] ?? '';
  const desktopLightRoot = ruleBody(desktopCss ?? '', ':root');
  const desktopDarkRoot = ruleBody(desktopCss ?? '', ":root[data-theme='dark']");

  for (const [property, value] of [
    ['--bg-app', '#FAFBFB'],
    ['--bg-surface', '#F3F4F5'],
    ['--bg-raised', '#FFFFFF'],
    ['--text-primary', '#24303C'],
    ['--text-secondary', '#53616E'],
    ['--text-tertiary', '#626E78'],
    ['--border-hairline', '#DCE0E2'],
    ['--border-strong', '#C8CED1'],
    ['--border-focus', '#2563EB'],
  ]) {
    if (!new RegExp(`${property}:\\s*${value}`, 'i').test(root)) failures.push(`VL2-C01 Pages 浅宗色阶漂移：${property}`);
  }
  if (!/font-weight:\s*700/.test(heroTitle)) failures.push('VL2-T01 hero 标题未与四栏标题同用宋体 700 重端');
  // VL3-C01|dark-tertiary: GUI-PAPER-1 keeps Pages on the exact lead-black/cool-gray slots.
  for (const [property, value] of [
    ['--bg-app', '#121416'],
    ['--bg-surface', '#1C2024'],
    ['--bg-raised', '#272C31'],
    ['--text-primary', '#E8ECEF'],
    ['--text-secondary', '#BCC5CB'],
    ['--text-tertiary', '#98A2AA'],
    ['--border-hairline', '#343B41'],
    ['--border-strong', '#465058'],
    ['--border-focus', '#6A94F1'],
    ['--important-title', '#D9AE6A'],
  ]) {
    if (!new RegExp(`${property}:\\s*${value}`, 'i').test(siteDark)) failures.push(`GUI-PAPER-C01 Pages 铅黑／冷灰深宗色阶漂移：${property}`);
  }
  if (!/--important-title:\s*#24303C/i.test(root)
      || !/--important-title:\s*#24303c/i.test(desktopLightRoot)
      || !/--important-title:\s*#d9ae6a/i.test(desktopDarkRoot)) {
    failures.push('VL3-C02 Agent／Pages 重要标题双宗 token 未同源');
  }

  for (const [property, value] of [
    ['--bg-app', '#fafbfb'],
    ['--bg-surface', '#f3f4f5'],
    ['--bg-raised', '#fff'],
    ['--bg-hover', '#eceeef'],
    ['--control-hover', '#e5e8e9'],
    ['--bg-selected', '#dde2e4'],
    ['--text-primary', '#24303c'],
    ['--text-secondary', '#53616e'],
    ['--text-tertiary', '#626e78'],
    ['--text-disabled', '#90989e'],
    ['--border', '#dce0e2'],
    ['--border-strong', '#c8ced1'],
    ['--action-primary-hover', '#344353'],
  ]) {
    if (!new RegExp(`${property}:\\s*${value}`, 'i').test(desktopLightRoot)) {
      failures.push(`GLW-C01 Agent 冷白／铅灰浅宗漂移：${property}`);
    }
  }
  if (!/--important-title:\s*#24303c/i.test(desktopLightRoot)) {
    failures.push('GUI-PAPER-C01 Agent 浅宗重要标题未跟随藏青墨');
  }

  for (const [property, value] of [
    ['--bg-app', '#121416'],
    ['--bg-surface', '#1c2024'],
    ['--bg-raised', '#272c31'],
    ['--bg-hover', '#2b3035'],
    ['--control-hover', '#30363c'],
    ['--bg-selected', '#313941'],
    ['--text-primary', '#e8ecef'],
    ['--text-secondary', '#bcc5cb'],
    ['--text-tertiary', '#98a2aa'],
    ['--text-disabled', '#626c73'],
    ['--text-inverse', '#121416'],
    ['--border', '#343b41'],
    ['--border-strong', '#465058'],
  ]) {
    if (!new RegExp(`${property}:\\s*${value}`, 'i').test(desktopDarkRoot)) {
      failures.push(`GUI-PAPER-C01 Agent 铅黑／冷灰深宗漂移：${property}`);
    }
  }
  for (const [rootName, root, expected] of [
    ['light', desktopLightRoot, [['--border-focus', '#2563eb'], ['--blue-graphic', '#2563eb'], ['--blue-fg', '#1d4ed8']]],
    ['dark', desktopDarkRoot, [['--border-focus', '#6a94f1'], ['--blue-graphic', '#2563eb'], ['--blue-fg', '#779ef3']]],
  ]) {
    for (const [property, value] of expected) {
      if (!new RegExp(`${property}:\\s*${value}`, 'i').test(root)) {
        failures.push(`GUI-PAPER-C02 ${rootName} semantic blue/focus role drifted: ${property}`);
      }
    }
  }
  const siteImportant = ruleBody(css, 'h1.zh-title, .section-heading h2.zh-title, .closing h2.zh-title');
  if (!/color:\s*var\(--important-title\)/.test(siteImportant)
      || !/color:\s*var\(--important-title\)/.test(ruleBody(desktopCss ?? '', '.chat-titlebar .chat-case-title'))
      || !/color:\s*var\(--important-title\)/.test(ruleBody(desktopCss ?? '', '.welcome-slogan'))
      || !/font-family:\s*var\(--font-title\)/.test(ruleBody(desktopCss ?? '', '.settings-header h1'))
      || !/font-weight:\s*600/.test(ruleBody(desktopCss ?? '', '.settings-header h1'))
      || !/color:\s*var\(--important-title\)/.test(ruleBody(desktopCss ?? '', '.settings-header h1'))) {
    failures.push('VL3-T01 重要标题字轨／字重／泥金预算漂移');
  }
  for (const selector of ['body', '.hero-lead', '.zh-doc', '.settings-lead', '.risk-detail', '.dense-row']) {
    if (/var\(--important-title\)/.test(ruleBody(css, selector)) || /var\(--important-title\)/.test(ruleBody(desktopCss ?? '', selector))) {
      failures.push(`VL3-T02 泥金越界进入正文或数据：${selector}`);
    }
  }
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
