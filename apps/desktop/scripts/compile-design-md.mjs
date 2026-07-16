// DESIGN-MD-1 编译 CLI + drift 门（零依赖）。
//   默认（无参数）= drift 门：按现行 tokens.json + principles.md 重编译，与已入库
//     docs/design/courtwork-design.md 逐字节比对；不一致或缺产物 → 退出码 1（tokens 变更未重编译触红）。
//   --write            = 重新生成并写入产物。
// 路径以脚本位置为锚（import.meta.url），不依赖 CWD——直跑或经 pnpm --filter 皆可。
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { compileDesignMd } from './compile-design-md-lib.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const TOKENS = resolve(root, 'docs/design/tokens.json');
const PRINCIPLES = resolve(root, 'docs/design/principles.md');
const OUT = resolve(root, 'docs/design/courtwork-design.md');
const REGEN = 'pnpm --filter @courtwork/desktop design:md';

const generated = compileDesignMd({
  tokensText: readFileSync(TOKENS, 'utf8'),
  principlesText: readFileSync(PRINCIPLES, 'utf8'),
});

if (process.argv.includes('--write')) {
  writeFileSync(OUT, generated, 'utf8');
  process.stdout.write(
    `design-md: 已写入 docs/design/courtwork-design.md（${Buffer.byteLength(generated, 'utf8')} 字节）\n`,
  );
} else {
  let committed;
  try {
    committed = readFileSync(OUT, 'utf8');
  } catch {
    console.error(`design-md drift 门失败：docs/design/courtwork-design.md 缺失。运行 \`${REGEN}\` 重新生成。`);
    process.exit(1);
  }
  if (committed !== generated) {
    console.error(
      `design-md drift 门失败：docs/design/courtwork-design.md 与现行 tokens.json + principles.md 不一致。\n` +
        `token 或原则已变更但未重编译。运行 \`${REGEN}\` 重新生成后再提交。`,
    );
    process.exit(1);
  }
  process.stdout.write('design-md drift 门通过：courtwork-design.md 与 tokens.json + principles.md 同步\n');
}
