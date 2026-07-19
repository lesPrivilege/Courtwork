import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const files = Object.fromEntries(await Promise.all([
  ['app', 'src/App.tsx'],
  ['main', 'src/main.tsx'],
  ['client', 'src/provider/chat-client.ts'],
  ['journal', 'src/provider/turn-protocol-client.ts'],
  ['card', 'src/chat/TurnCard.tsx'],
  ['interactionProjection', 'src/preview/projection/interaction.ts'],
  ['legal', 'src/demo/legal-interaction.ts'],
  ['css', 'src/styles.css'],
].map(async ([name, relative]) => [name, await readFile(path.join(root, relative), 'utf8')])));

const failures = [];
const requireText = (file, text, message) => { if (!files[file].includes(text)) failures.push(message); };
const forbidText = (file, text, message) => { if (files[file].includes(text)) failures.push(message); };

requireText('client', '@courtwork/core/turn-protocol', 'Chat lifecycle must consume the browser-safe core turn subpath');
requireText('client', 'runTurn({', 'Chat requests must run through core runTurn');
requireText('client', 'setStreamFactory', 'E2E injection must be a provider stream, not a final result responder');
forbidText('client', 'setResponder', 'Final result responder hooks are forbidden');
forbidText('client', 'provider.generate(', 'Chat may not bypass core with provider.generate aggregation');
requireText('main', "import.meta.env.DEV && import.meta.env.VITE_COURTWORK_E2E === '1'", 'Chat test hook must be explicit DEV+E2E only');

requireText('journal', "courtwork.turn-journal.v1", 'Turn journal must have a versioned localStorage envelope');
requireText('journal', 'turnIds:', 'Turn journal must persist its known turnId index');
requireText('journal', 'this.store.replayTurn(id)', 'Known index must not bypass core replay validation');
forbidText('journal', 'removeItem(', 'Corrupt turn history must never be silently cleared');

for (const domainText of ['是否继续聚焦付款与验收条款', 'focus-payment-acceptance', 'legal.risk-evidence-confirmation']) {
  if (`${files.app}\n${files.card}\n${files.client}`.includes(domainText)) failures.push(`Generic chat surface contains vertical content: ${domainText}`);
}
requireText('card', 'request: view.request', 'Interaction projection must receive the immutable request snapshot');
requireText('interactionProjection', 'input.request.options.map', 'Interaction options must project from the immutable request snapshot');
requireText('card', 'view.resolution?.answer', 'Recorded answer must render from core replay');
requireText('card', 'submittingRef.current', 'Interaction resolve must guard concurrent submission');
requireText('legal', 'requestInteraction({', 'Legal demo must inject through the generic interaction coordinator');
requireText('legal', 'contractSourceMd.slice(start, end) !== anchor.quote', 'Source routing must validate the exact resolved quote slice');

const interactionCss = files.css.slice(files.css.indexOf('.interaction-turn-card'), files.css.indexOf('.progress-pulse'));
// SKIN-B3：断关系不断值——hairline 由 `1px` 字面量改断「走次界档（--rule-minor）」。
if (!/border:\s*var\(--rule-minor\) solid var\(--border\)/.test(interactionCss)) failures.push('Interaction card must use a hairline border');
if (!/background:\s*color-mix\(in srgb, var\(--generated\) 94%, var\(--bg-raised\) 6%\)/.test(interactionCss)) failures.push('Interaction card must use the approved subtle generated surface');
if (/box-shadow|gradient|glow/i.test(interactionCss)) failures.push('Interaction card may not add shadow, gradient or glow');
requireText('app', 'processTraceFromTurn(turn)', 'Chat reasoning must consume the shared ProcessTrace adapter');
forbidText('app', 'chat-reasoning-absent', 'Absent reasoning must leave no UI placeholder');
forbidText('app', '<details className="chat-reasoning"', 'Native chat details may not fork the shared ProcessTrace interaction');
requireText('app', 'chatAbortRef.current?.abort()', 'Stop must use the active AbortController');

try {
  await access(path.join(root, 'src/chat/Typewriter.tsx'));
  failures.push('Retired Typewriter implementation still exists');
} catch {
  // expected
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('CHAT-UI-1 turn/journal/interaction boundaries: OK');
