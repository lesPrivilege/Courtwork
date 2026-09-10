/* FE-04 · Primitive reconciliation（WK-93）的运行断言。全部状态都经产品自己的控件
 * 或产品自己的 /api/v5 客户端到达，没有向 store 直写，没有 stub 任何 renderer。
 * 唯一的合成手段是**扣住一个请求**（in-page `window.fetch` 包装，wk10b-1 FE-T07
 * 已用同一手法）：在途窗口在 loopback 上只有几毫秒，不扣住就无法观察它。扣住的是
 * 传输，不是答案 —— 请求照样发出、照样由服务端处理。
 *
 *   APP_URL=http://127.0.0.1:8909 WK6_CDP_PORT=20070 node evidence/fe04/primitive-checks.mjs
 */
import { evaluate as ev, waitFor, close, ORIGIN, sleep, observations } from "./browser.mjs";
import { writeFile } from "node:fs/promises";

const state = "window.__V5_UI__.state";
const results = [];
const check = (name, pass, actual) => {
  results.push({ name, pass, actual });
  console.log(`${pass ? "PASS" : "FAIL"} · ${name} · ${JSON.stringify(actual)?.slice(0, 500)}`);
};
const openSession = (title) =>
  ev(`(async () => {
    document.querySelectorAll('#project-list .project-toggle').forEach(t => { if (t.getAttribute('aria-expanded') === 'false') t.click(); });
    await new Promise(r => setTimeout(r, 500));
    const button = [...document.querySelectorAll('#project-list .session-button')].find(b => b.textContent.includes(${JSON.stringify(title)}));
    if (!button) throw new Error('no session named ' + ${JSON.stringify(title)});
    button.click();
    await new Promise(r => setTimeout(r, 1500));
  })()`);
/* 通过产品自己的 client 起一个 run：token 与 origin 检查都是真的那一套。 */
const startRun = (input) =>
  ev(`(async () => {
    const composer = document.getElementById('composer-input');
    composer.value = ${JSON.stringify(input)};
    composer.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 300));
    document.getElementById('send-button').click();
    await new Promise(r => setTimeout(r, 1200));
    return ${state}.activeSessionId;
  })()`);
/* 扣住某一个请求 HOLD_MS，期间读一次屏幕，然后放行。 */
const holdAndRead = (match, act, read, holdMs = 2200) =>
  ev(`(async () => {
    const original = window.fetch;
    let holds = 0;
    /* 每一个命中的请求都被扣住，而不只是第一个：轮询与决定走同一条线，只扣决定
     * 会让轮询先把回执取回来，在途窗口就在屏幕上不存在了。扣的是传输。 */
    window.fetch = (...args) => {
      const url = String(args[0]);
      const method = (args[1] && args[1].method) || 'GET';
      if (${match}) {
        holds += 1;
        const sent = original(...args);
        return new Promise(resolve => setTimeout(() => resolve(sent), ${holdMs}));
      }
      return original(...args);
    };
    ${act}
    /* 渲染在 click 的同一拍里发生，所以在途窗口一开就读；再晚一点，轮询就可能
     * 先把回执取回来，扣住的只是这一次传输，不是服务端的处理。 */
    await new Promise(r => setTimeout(r, 200));
    const during = (${read});
    await new Promise(r => setTimeout(r, ${holdMs} + 1500));
    window.fetch = original;
    const after = (${read});
    return { held: holds > 0, holds, during, after };
  })()`);

const readComposer = `({
  send: document.getElementById('send-button').textContent.trim(),
  sendHidden: document.getElementById('send-button').hidden,
  cancel: document.getElementById('cancel-run-button').textContent.trim(),
  cancelHidden: document.getElementById('cancel-run-button').hidden,
  hint: (document.getElementById('composer-run-hint')||{}).textContent || '',
  badges: [...document.querySelectorAll('#message-stream .run-badge')].map(n => n.textContent.trim()),
})`;
const readApproval = `(() => {
  const card = document.querySelector('#message-stream .permission-card');
  return {
    card: Boolean(card),
    heading: card ? card.querySelector('h3').textContent.trim() : null,
    buttons: card ? [...card.querySelectorAll('.question-actions button')].map(b => ({ text: b.textContent.trim(), ariaDisabled: b.getAttribute('aria-disabled') })) : [],
    alert: card ? [...card.querySelectorAll('[role=alert]')].map(n => n.textContent.trim()) : [],
  };
})()`;

try {
  /* ---------------------------------------------------------------- 1
   * Composer · send in flight。请求已送出、回执未到，是第三类事实。 */
  await ev(`location.href = ${JSON.stringify(ORIGIN)}`);
  await waitFor(`Boolean(window.__V5_UI__ && ${state}.projects.length)`, 20070);
  await openSession("Slow run");
  const sending = await holdAndRead(
    "url.includes('/runs') && method === 'POST'",
    `document.getElementById('composer-input').value = '/fixture question';
     document.getElementById('composer-input').dispatchEvent(new Event('input', { bubbles: true }));
     await new Promise(r => setTimeout(r, 300));
     document.getElementById('send-button').click();`,
    readComposer,
  );
  check(
    "FE-04 · Send 在途时说的是「已送出」，不是「已开始」",
    sending.held && sending.during.send === "Sending…" && sending.during.sendHidden === false,
    sending.during,
  );

  /* ---------------------------------------------------------------- 2
   * FE-T06 后半 · cancel requested ≠ stopped。 */
  /* `/fixture question` 的 run 停在 `waiting_user`：它是一个真正活着的 run，
   * 可以被取消，而且不会在观察在途窗口之前自己结束。 */
  await waitFor(`${state}.runs.some(r => ['created','running','waiting_user'].includes(r.status))`, 25000);
  const cancelling = await holdAndRead(
    "(url.includes('/cancel') && method === 'POST') || url.includes('/events')",
    `document.getElementById('cancel-run-button').click();`,
    readComposer,
  );
  check(
    "FE-T06 · 取消请求在途：控件说 Sending…，Run 的状态词一个字没改",
    cancelling.held &&
      cancelling.during.cancel === "Sending…" &&
      /Working|Waiting for you/.test(cancelling.during.hint) &&
      !/Cancelled|Stopping/.test(cancelling.during.hint) &&
      !cancelling.during.badges.includes("Cancelled"),
    cancelling.during,
  );
  await sleep(2500);
  const settled = await ev(`(() => Object.assign(
    { runs: ${state}.runs.map(r => r.status) },
    ${readComposer},
  ))()`);
  check(
    "FE-T06 · 回执到达之后才说 Cancelled，而且控件把在途词收回",
    settled.runs.includes("cancelled") && settled.cancel === "Cancel run" && settled.send === "Send",
    settled,
  );

  /* ---------------------------------------------------------------- 3
   * Approval · 卡上只有两个决定，没有 always-allow 那一档。 */
  await openSession("Write approval");
  await startRun('/fixture script [{"name":"ws_write","arguments":{"path":"out/note.txt","text":"FE-04 approval fixture"}}]');
  await waitFor(`document.querySelector('#message-stream .permission-card') !== null`, 25000);
  const card = await ev(readApproval);
  check(
    "Approval · 闭集是两个决定，动作词带对象，没有 always-allow",
    card.buttons.length === 2 &&
      card.buttons.some(b => b.text === "Approve this write") &&
      card.buttons.some(b => b.text === "Deny this write") &&
      !card.buttons.some(b => /always/i.test(b.text)),
    card,
  );

  /* Approval · 在途：按下的那个换词，另一个只是关掉。 */
  const deciding = await holdAndRead(
    "(url.includes('/questions/') && method === 'POST') || url.includes('/events')",
    `[...document.querySelectorAll('#message-stream .permission-card .question-actions button')]
       .find(b => b.textContent.trim() === 'Approve this write').click();`,
    readApproval,
  );
  check(
    "Approval · 在途的是哪一个决定，屏幕上看得出来（review-projection §6）",
    deciding.held &&
      deciding.during.buttons.some(b => b.text === "Sending…") &&
      deciding.during.buttons.some(b => b.text === "Deny this write") &&
      deciding.during.buttons.every(b => b.ariaDisabled === "true"),
    deciding.during,
  );

  /* FE-T06 · 三类事实不混同：授权 ≠ 执行结果 ≠ 成果接受。 */
  await sleep(3000);
  const facts = await ev(`(() => {
    const stream = document.getElementById('message-stream');
    const decided = [...stream.querySelectorAll('details')].map(d => d.textContent).filter(t => /Approval (recorded|denied)/.test(t));
    return {
      decided: decided.map(t => t.replace(/\\s+/g, ' ').slice(0, 200)),
      activity: [...stream.querySelectorAll('.activity-group > summary')].map(n => n.textContent.replace(/\\s+/g,' ').trim()),
      toolRows: [...stream.querySelectorAll('.tool-card > summary')].map(n => n.textContent.replace(/\\s+/g,' ').trim()),
      liveCards: stream.querySelectorAll('.permission-card').length,
      accepted: /accepted by a review/i.test(stream.innerText),
    };
  })()`);
  check(
    "FE-T06 · 授权落成一行回执，它明说「不记录成果接受」；执行结果是另一行",
    facts.liveCards === 0 &&
      facts.decided.some(t => /Approval recorded for this exact write/.test(t)) &&
      facts.decided.some(t => /Review acceptance is not recorded here/.test(t)) &&
      facts.toolRows.length > 0,
    facts,
  );

  /* ---------------------------------------------------------------- 4
   * Tool row · Failed 与 Interrupted 由两个不同的事实给出（台账 §3）。 */
  await openSession("Failing tool");
  await startRun('/fixture script [{"name":"ws_read","arguments":{"path":"out/does-not-exist.txt"}}]');
  await waitFor(`${state}.runs.every(r => ['completed','failed','unknown','cancelled'].includes(r.status)) && document.querySelector('#message-stream .tool-card') !== null`, 30000);
  const failed = await ev(`(() => {
    const rows = [...document.querySelectorAll('#message-stream .tool-card')].map(d => ({
      text: d.querySelector('summary').textContent.replace(/\\s+/g,' ').trim(),
      meta: (d.querySelector('summary .flow-meta')||{}).textContent || '',
      isFailed: d.querySelector('summary').classList.contains('is-failed'),
      open: d.open,
    }));
    return { rows, group: [...document.querySelectorAll('.activity-group > summary')].map(n => n.textContent.replace(/\\s+/g,' ').trim()) };
  })()`);
  check(
    "Tool row · 失败的一次带 Failed，而且状态词在自己的槽里，不粘在工具名后面",
    failed.rows.some(r => r.meta === "Failed" && r.isFailed) &&
      failed.rows.every(r => r.meta !== "Interrupted"),
    failed,
  );

  /* ---------------------------------------------------------------- 5
   * Question · 提交失败会被读出来（role=alert），且重试前撤掉旧失败。 */
  await openSession("Question card");
  await startRun("/fixture question");
  await waitFor(`document.querySelector('#message-stream .question-card form input[aria-label=Answer]') !== null`, 25000);
  /* Question · 先走失败路径（合成 409，问题仍未决），再走成功路径：这样能同时看到
   * 那条 role=alert，以及重试时它被撤掉、换成同一个在途词（FN-28 stale 可辨）。 */
  const alerted = await ev(`(async () => {
    const original = window.fetch;
    window.fetch = (...args) => {
      const url = String(args[0]);
      if (url.includes('/questions/') && ((args[1]&&args[1].method)||'GET') === 'POST')
        return Promise.resolve(new Response(JSON.stringify({ error: { code: 'conflict', message: 'synthetic 409 for the alert check' } }), { status: 409, headers: { 'content-type': 'application/json' } }));
      return original(...args);
    };
    const form = document.querySelector('#message-stream .question-card form');
    const input = form.querySelector('input');
    input.value = 'FE-04 first try'; input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 200));
    form.querySelector('button[type=submit]').click();
    await new Promise(r => setTimeout(r, 1500));
    window.fetch = original;
    const node = document.querySelector('#message-stream .question-error');
    return {
      present: Boolean(node),
      role: node ? node.getAttribute('role') : null,
      text: node ? node.textContent.trim().slice(0, 120) : null,
      stillPending: Boolean(document.querySelector('#message-stream .question-card form')),
    };
  })()`);
  check(
    "Question · 提交失败是一条 role=alert，不是一段静默的文字（FN-28）",
    alerted.present && alerted.role === "alert" && alerted.stillPending,
    alerted,
  );

  const answering = await holdAndRead(
    "(url.includes('/questions/') && method === 'POST') || url.includes('/events')",
    `const input = document.querySelector('#message-stream .question-card form input[aria-label=Answer]');
     input.value = 'FE-04'; input.dispatchEvent(new Event('input', { bubbles: true }));
     await new Promise(r => setTimeout(r, 200));
     document.querySelector('#message-stream .question-card form button[type=submit]').click();`,
    `(() => {
       const form = document.querySelector('#message-stream .question-card form');
       return {
         submit: form ? form.querySelector('button[type=submit]').textContent.trim() : null,
         readOnly: form ? form.querySelector('input').readOnly : null,
         staleError: document.querySelectorAll('#message-stream .question-error').length,
       };
     })()`,
  );
  check(
    "Question · 答案在途时用的是同一个在途词，输入框只读而不失焦，上一次的失败已撤掉",
    answering.held &&
      answering.during.submit === "Sending…" &&
      answering.during.readOnly === true &&
      answering.during.staleError === 0,
    answering.during,
  );

  check(
    "本单没有任何请求离开本 origin",
    observations.responses.every(r => r.url.startsWith(ORIGIN) || r.url.startsWith("data:")),
    observations.responses.filter(r => !r.url.startsWith(ORIGIN)).map(r => r.url),
  );
  check("页面没有抛出异常", observations.exceptions.length === 0, observations.exceptions.map(e => e.text));
} finally {
  await writeFile(new URL("./primitive-checks.json", import.meta.url), JSON.stringify(results, null, 1));
  console.log(`${results.filter(r => r.pass).length} / ${results.length}`);
  await close();
}
