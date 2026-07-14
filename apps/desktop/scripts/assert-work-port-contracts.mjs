import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => readFile(path.join(root, relative), 'utf8');
const [app, main, protocol, demo] = await Promise.all([
  read('src/App.tsx'),
  read('src/main.tsx'),
  read('src/protocol/client.ts'),
  read('src/demo/client.ts'),
]);

const failures = [];
const requireMatch = (source, pattern, message) => {
  if (!pattern.test(source)) failures.push(message);
};
const forbidMatch = (source, pattern, message) => {
  if (pattern.test(source)) failures.push(message);
};

forbidMatch(app, /createDemoClient|from ['"]\.\/demo\/(?:client|recordings)|DEMO_ARTIFACTS|GATES/, 'App must not import or construct demo recordings');
requireMatch(app, /workProjection\s*:\s*WorkProjectionPort/, 'AppProps must require an injected WorkProjectionPort');
requireMatch(app, /replayWorkProjection\(\s*workProjection/, 'App must replay through the injected projection');
requireMatch(main, /createDemoWorkFixture\(/, 'main composition root must create the demo fixture');
requireMatch(main, /workProjection=\{demoWorkFixture\.projection\}/, 'main must inject the demo projection explicitly');
forbidMatch(protocol, /interface\s+SessionEventClient/, 'legacy mixed SessionEventClient must be removed');
requireMatch(protocol, /interface\s+WorkProjectionPort/, 'generic WorkProjectionPort declaration is missing');
requireMatch(protocol, /interface\s+WorkCommandPort/, 'generic WorkCommandPort declaration is missing');
requireMatch(demo, /from ['"]\.\/recordings/, 'recordings must remain inside the demo adapter');
requireMatch(demo, /const\s+GATES/, 'hard-coded gates must remain inside the demo adapter');
forbidMatch(app, /scenario-executor|ScenarioRunInput|inputArtifacts|toolInputs/, 'React must not construct executor inputs');

if (failures.length > 0) {
  console.error(`WORK-PORT-1 boundary violations (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('WORK-PORT-1 boundary checks passed');
