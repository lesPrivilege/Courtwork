const ruleBody = (css, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, 's'))?.[1] ?? '';
};

export function validateVersionalSite({ html, css, desktopCss }) {
  const failures = [];
  const proof = ruleBody(css, '.scenario-proof');
  const proofItem = ruleBody(css, '.scenario-proof li');
  const promiseRow = ruleBody(css, '.promise-ledger > div');
  const promiseLast = ruleBody(css, '.promise-ledger > div:last-child');
  const marginalia = ruleBody(css, '.design-boundary');

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
  if (!/border:\s*0/.test(marginalia) || /border:\s*1px/.test(marginalia) || !/border-block:\s*1px solid var\(--border-hairline\)/.test(marginalia)) {
    failures.push('VL-P04 眉批带退回四周卡框');
  }
  if (!/class="design-boundary site-marginalia"/.test(html)) failures.push('VL-P04 站面眉批未绑定唯一消费点');
  if (/writing-mode\s*:/.test(css)) failures.push('退项竖排签条不得复活');
  if (!/\.composer-shell:focus-within\s*\{\s*border-color:\s*var\(--text-tertiary\);\s*\}/.test(desktopCss ?? '')) {
    failures.push('VL-L05 composer focus 强边界退场或色槽漂移');
  }

  return failures;
}
