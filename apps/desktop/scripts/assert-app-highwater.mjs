// App.tsx 高水位门（架构裁定 2026-07-20，随 CONVERGE-DOC-1 复验回炉批立）。
//
// **立门缘由**：第二轮验收暴露一个结构性事实——派生工单表 14 行里 **10 行触碰
// `App.tsx`**（4 行不触）。在「触 App.tsx 的票不并行」这条硬约束下，整条线实质串行，并行度上限
// 约等于 1。
//
// 架构裁定**不提前 D1**（大爆炸重构换并行度是坏交易——D1 自己就是最大的 App.tsx 票，
// 提前它等于把串行变成停摆），代之以两件配套：
//   ① **「过手即拆」纪律**：凡触 App.tsx 的票，所触状态/JSX 面优先外提为独立模组，
//      SPEC 留痕（人执行，验收查）。
//   ② **本门**：当前行数即上限，**只降不升**；票内净增须由等量外提抵消。
//
// 于是串行是既成代价，但**随线衰减**——每张票过手，下一张的触碰面就小一分。没有本门，
// ①只是一句劝告：过手的人赶工期时净增几十行毫无阻力，而债只会朝一个方向走。
//
// **门的边界（如实登记）**：行数是**代理指标**不是目标本身。它拦得住「又长胖了」，
// 拦不住「行数没变但耦合更深」。把 200 行塞进一个新文件再 import 回来同样能过门——
// 那正是本门想要的方向（外提），但外提得好不好仍须人看。**不要把绿灯读成解耦达标。**

import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const appPath = path.resolve(scriptDirectory, '..', 'src', 'App.tsx');

// 高水位＝立门当日实测行数。**此常量只许下调**：任何上调都是在把裁定改掉，
// 须经架构拍板并在此处留痕（同 floor 只升不降的先例，方向相反）。
const HIGH_WATER_LINES = 2777;

// 计数口径＝**视觉行数**：末尾换行不算作额外一行。对以换行结尾的文件（本仓源码皆是）
// 它与 `wc -l` 同值；无尾换行时本门比 `wc -l` 多 1——那一行确实存在，只是没有结尾换行符。
// 写死这条是因为立门时踩过：`split('\n').length` 比 `wc -l` 多 1，门在基线就自红。
// 口径含糊的门比没有门更坏——它会让人以为常量错了而去调常量。（前版注释把口径写成
// 「对齐 wc -l」，仅在尾换行时成立，属自述不准，已订正为实际口径。）
const content = readFileSync(appPath, 'utf8');
const actual = content.endsWith('\n') ? content.split('\n').length - 1 : content.split('\n').length;

if (actual > HIGH_WATER_LINES) {
  console.error(
    `App.tsx 高水位门失败：当前 ${actual} 行 > 上限 ${HIGH_WATER_LINES} 行（净增 ${actual - HIGH_WATER_LINES}）。\n`
    + '「过手即拆」纪律：触碰 App.tsx 的票，其所触状态/JSX 面须优先外提为独立模组，\n'
    + '票内净增必须由等量外提抵消。若本票确有正当理由净增，须经架构拍板后下调本门常量并留痕——\n'
    + '不得因赶工期而上调：上限只降不升是这条纪律唯一的执行力来源。',
  );
  process.exit(1);
}

if (actual < HIGH_WATER_LINES) {
  // 外提生效即应收紧上限，否则腾出的空间会被下一张票悄悄吃掉——高水位若不跟着降，
  // 「只降不升」就退化成「一次性宽限」。
  console.error(
    `App.tsx 高水位门失败：当前 ${actual} 行 < 上限 ${HIGH_WATER_LINES} 行。\n`
    + `外提已生效，请把本门常量下调为 ${actual} 并在票内 SPEC 留痕（外提了什么、去了哪个模组）。\n`
    + '不收紧上限＝把腾出的空间留给下一张票悄悄吃掉，纪律随即失效。',
  );
  process.exit(1);
}

console.log(`App.tsx 高水位门通过：${actual} 行（上限 ${HIGH_WATER_LINES}，只降不升）`);
