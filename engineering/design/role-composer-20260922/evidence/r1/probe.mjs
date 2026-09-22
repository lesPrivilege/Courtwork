/* 06E-R1 probe. Loads the specimen controller from a given tree, picks the
 * declaration-only scenario, chooses Attention and prints the Send decision.
 *   node probe.mjs <tree> <scenario> */
import path from "node:path";
import { pathToFileURL } from "node:url";
const [tree, scenario] = process.argv.slice(2);
const dir = path.join(tree, "engineering/design/role-composer-20260922/specimen");
const { createComposerFixture } = await import(pathToFileURL(path.join(dir, "composer-adapter.mjs")));
const { createComposerAgentController } = await import(pathToFileURL(path.join(dir, "composer-agent.mjs")));
const fixture = createComposerFixture({ pause: () => Promise.resolve() });
fixture.configure(scenario);
const controller = createComposerAgentController({ adapter: fixture.adapter });
await controller.load();
controller.select("ap-attention");
await new Promise((resolve) => setTimeout(resolve, 0));
const next = controller.getState().next;
console.log(JSON.stringify({ tree: path.basename(tree), scenario, kits: next.kits, blockers: next.blockers, send: next.send }, null, 2));
