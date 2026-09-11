import { figureSvg } from './assets/figures/figures.mjs';

// Both views share a claim. CSS selects one complete, statically readable view.
function responsiveFigure(id, caption) {
  return `<div class="continuity-figure">
    <figure class="figure figure-plate figure-wide" data-figure="${id}">
      <div class="figure-scroll" role="region" tabindex="0" aria-label="${id === 'source-change' ? '来源更新后的工作' : '候选与正式结果'}">${figureSvg(id)}</div>
      <figcaption>${caption}</figcaption>
    </figure>
    <figure class="figure figure-object figure-compact" data-figure="${id}-compact">
      ${figureSvg(`${id}-compact`)}
      <figcaption>${caption}</figcaption>
    </figure>
  </div>`;
}

export function sourceChangeStory() {
  return `<section class="section continuity-story" id="source-change" aria-labelledby="source-change-heading">
    <p class="index">AFTER A SOURCE CHANGES</p>
    <h2 id="source-change-heading">Keep the work.<br><em>Move it forward.</em></h2>
    <p class="lede">来源变了，先找到受影响的候选。沿着同一事项检查、更新、审阅，让新成果接上已有工作。</p>
    ${responsiveFigure('source-change', '来源集合从修订2更新到3，Spark 显示较早的派生。检查 c-10 后重新派生，c-11 经验证与接受进入事项版本8；旧候选与来源仍可追溯。')}
    <p class="actions"><a href="./tour.html#chapter-know">Follow the work →</a></p>
  </section>`;
}

export function candidateCommitStory() {
  return `<section class="continuity-story tour-continuity" id="candidate-commit" aria-labelledby="candidate-commit-heading">
    <p class="index">FROM CANDIDATE TO COMMITMENT</p>
    <h3 id="candidate-commit-heading">A result worth<br><em>building on.</em></h3>
    <p class="lede">把本次所需的材料带进执行，再把有依据的候选带回审阅。接受决定落到具体版本，成为下一次工作的起点。</p>
    ${responsiveFigure('candidate-to-record', '当前工作投影为上下文，执行产生候选与运行记录。候选经验证与授权接受后，新的正式成果、决定和回执一起保存。运行记录可供查证，正式成果由接受决定建立。')}
  </section>`;
}
