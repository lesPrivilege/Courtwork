/* global CSS, navigator, innerWidth, innerHeight, devicePixelRatio, getComputedStyle, requestAnimationFrame */
const fixtureText = '验收标准明确且未约定书面异议期限，合同仅约定技术参数为准，履约记录应逐项核对。';
const punctuationIndex = fixtureText.indexOf('，');

function markup() {
  return `${fixtureText.slice(0, punctuationIndex)}<span class="punctuation-probe">${fixtureText[punctuationIndex]}</span>${fixtureText.slice(punctuationIndex + 1)}`;
}

function rectOf(element, selector) {
  const outer = element.getBoundingClientRect();
  const mark = element.querySelector(selector).getBoundingClientRect();
  return {
    containerRight: +outer.right.toFixed(2),
    punctuationLeft: +mark.left.toFixed(2),
    punctuationRight: +mark.right.toFixed(2),
    punctuationTop: +mark.top.toFixed(2),
    overhang: +(mark.right - outer.right).toFixed(2),
    height: +outer.height.toFixed(2),
  };
}

function pairAt(width) {
  const host = document.createElement('div');
  host.className = 'search-probe';
  host.innerHTML = `<p class="fixture positive">${markup()}</p><p class="fixture negative">${markup()}</p>`;
  host.style.setProperty('--fixture-width', `${width}px`);
  document.body.append(host);
  const positive = rectOf(host.children[0], '.punctuation-probe');
  const negative = rectOf(host.children[1], '.punctuation-probe');
  host.remove();
  return { width, positive, negative };
}

async function run() {
  await document.fonts.ready;
  let best = pairAt(320);
  for (let width = 220; width <= 420; width += 0.5) {
    const candidate = pairAt(width);
    const effect = candidate.positive.overhang - candidate.negative.overhang;
    const lineShift = candidate.positive.punctuationTop !== candidate.negative.punctuationTop;
    if (candidate.positive.overhang > 0.25 && (effect > 0.25 || lineShift)) {
      best = candidate;
      break;
    }
  }

  document.documentElement.style.setProperty('--fixture-width', `${best.width}px`);
  for (const id of ['positive', 'negative']) document.getElementById(id).innerHTML = markup();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  const positive = rectOf(document.getElementById('positive'), '.punctuation-probe');
  const negative = rectOf(document.getElementById('negative'), '.punctuation-probe');
  const supports = CSS.supports('hanging-punctuation', 'allow-end');
  const effectObserved = supports && positive.overhang > negative.overhang + 0.25;
  const lineShift = +(negative.punctuationTop - positive.punctuationTop).toFixed(2);
  const result = {
    system: navigator.platform,
    userAgent: navigator.userAgent,
    webkit: /AppleWebKit\/([\d.]+)/.exec(navigator.userAgent)?.[1] ?? 'unknown',
    viewport: `${innerWidth}x${innerHeight}`,
    dpr: devicePixelRatio,
    font: getComputedStyle(document.getElementById('positive')).fontFamily,
    fixtureWidth: best.width,
    supportsAllowEnd: supports,
    positive,
    negative,
    lineShift,
    effectObserved,
  };
  document.getElementById('measurements').textContent = JSON.stringify({
    system: result.system,
    webkit: result.webkit,
    viewport: result.viewport,
    dpr: result.dpr,
    font: result.font,
    fixtureWidth: result.fixtureWidth,
    supportsAllowEnd: result.supportsAllowEnd,
    positiveOverhang: result.positive.overhang,
    negativeLineShift: lineShift,
    effectObserved: result.effectObserved,
  }, null, 2);
  const verdict = document.getElementById('verdict');
  verdict.dataset.effect = effectObserved ? 'positive' : 'negative';
  verdict.textContent = effectObserved
    ? `实效成立：allow-end 让逗号留在前行并越界 ${positive.overhang.toFixed(2)} CSS px；none 将逗号下移 ${lineShift.toFixed(2)} CSS px。`
    : '实效未成立：本次真实 WKWebView 未测得 allow-end 相对 none 的行末差异。';
  document.title = `P3-H01 ready | supports=${supports} | effect=${effectObserved} | viewport=${result.viewport} | dpr=${result.dpr} | width=${best.width} | pos=${positive.overhang}@${positive.punctuationTop} | neg=${negative.overhang}@${negative.punctuationTop} | shift=${lineShift}`;
}

run();
