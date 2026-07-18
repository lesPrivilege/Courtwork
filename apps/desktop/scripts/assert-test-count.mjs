import { spawnSync } from 'node:child_process';

const result = spawnSync('pnpm', ['exec', 'playwright', 'test', '--list'], { encoding: 'utf8' });
if (result.status !== 0) {
  globalThis.process.stderr.write(result.stderr || result.stdout);
  globalThis.process.exit(result.status ?? 1);
}

const output = `${result.stdout}\n${result.stderr}`;
const match = output.match(/Total:\s+(\d+)\s+tests?/);
const count = match ? Number(match[1]) : 0;
// GOAL-1：+goal1 用例；floor 只升（禁降史 …→146→152→160→167→169→171→172→173→176→181→182→183→185，……chrome 装卡内 +1、三栏对齐+打字机 +2、双侧收拢磁吸 +1；CHAT-MATERIAL-1 附件正文入请求 + 空内容阻断 +2 → 211；验收补第二轮 history 同源 +1 → 212；HOST-AUTH-LITE 空态/denied/happy/读写三类失败 +4 → 216；CHAT-SESSION-1 跨窗新开/窗口内延续/只读导航 +3 → 219；CASE-ROOT-1 新建案 denied/授权建案/重授权 +3 → 222；CHAT-MEMORY-1 蒸馏→注入→查看→一键清除全链 +1 → 223；OUTPUT-CONFIRM-UI-1 未落点逐条确认落盘 + 取消零产出 +2 → 225；MATERIAL-INGRESS-1 就地入库/核验漂移与删除阻断 +2 → 227；UI-SURFACE-1 失败轮次重试（可重试+末位限定）+2、RightRailModules 未开通态可测标记 +1、MaterialsZone 在访达中显示未开通态 +1 → 231，合并解冲突由架构师定值；UI-RESIDUE-1（批一）residue project 新增 21 例 → 252）。
// WORK-LIVE-1：grant 案合同审查全链（run→gate→docx）+ 运行中取消 +2 → 254。
// LAYOUT-CONVERGE-1：rails-compact 幽灵列反例 +1 → 255（chrome-in-card 双侧收拢改断测宽为原地升级，不计数；合并解冲突由架构师定值）。
// WORK-LIVE-1-FIX：未装配 → rejected/not_configured 中性反馈 e2e +1 → 256。
// WORK-LIVE-REPLAY-1：跨切案恢复→水合→续行 docx + 恢复失效诚实 +2 → 258（答复 WORK-HOST-1 驳回阻断二）。
// CASE-PERSIST-1：真跨重载三层重建 + 失效 grant 显式态可移除 + demo 恒挂/归档清除对称 +3 → 261。
// PILOT-LIVE-1 B：grant 案显式导航开面（起草答辩状非零反应）+ 面板内切 tab 不闪回 +2 → 263。
// PILOT-LIVE-1 A/C：非 demo 案 work 段 composer 发送走真实请求链 + 建案/欢迎态授权自动入库（新增 pilot-entry.spec.ts 三例）+3 → 266。
// PILOT-LIVE-1 D：双侧收敛居中（都开/仅左收/仅右收 + 双收回归锁升级双证）+ 右栏默认窄态（非 demo
// 窄轨/宽轨往返 + compactLayout×previewOpen 互斥）+ chat 段/welcome 回归锁 + 窄态零溢出目检
// ×2（新增 pilot-layout.spec.ts 九例）+9 → 275。
// PILOT-LIVE-1-FIX：墙钟自证（相对时间戳 A→B 窗口内翻字不破 A≡B，先红后绿）+1 → 276。
// READER-ISOLATION-1：非 demo 案零 demo 语料入口（隔离红证）+ demo 案对照锁 +2 → 278。
// PILOT-LIVE-2 F：grant 语境上传入库主红证 + 同名同容幂等 + 同名异容显式拒绝 +3 → 279
// PILOT-LIVE-2 E：最新回复不折叠红证 + 历史折叠展开回看与块界对齐 +2 → 281。
// READER 与 PILOT-LIVE-2 为并发只升点；合并树取用例并集：276 + 2 + 3 + 2 → 283。
// PILOT-LIVE-2 验收修复：发送在途窗口 running assistant 不抢 latest 席位 +1 → 284。
// WORK-TURN-1 G：中文标题案铸号安全语法红证 + 存量旧 id 守卫显式引导 +2 → 286。
// WORK-TURN-1 H：Work 面案语境注入双向红证（Work 面在场/chat 面缺席）+1 → 287。
// CONFIRM-GRANULARITY-1：批量确认入口 feature-off 显式回归锁（入口不可见 + 逐条路径可用）+1 → 288。
// WORK-TURN-2：Work 面不切 Chat、case-keyed journal 分账与 chat 反向无案语境 +1 → 289。
// WORK-TURN-2 验收修复：workChatPending/workChatFlightRef 补按 caseId 隔离（原实现为全局单飞行锁/
// 单 pending 位，案 A 在途会静默锁死案 B composer）+1 → 290。
// KEY-PERSIST-1：stored Keychain 跨 reload 自动恢复 ready + Settings 显式清除/零前端残留 +2 → 292。
// CASE-TITLE-CONVERGE-1：旧键标题迁入不丢 + 不可读列表拒绝 legacy fallback +2 → 294。
const minimum = 294;
if (count < minimum) {
  throw new Error(`Playwright 用例不足：发现 ${count}，至少需要 ${minimum}`);
}
globalThis.process.stdout.write(`Playwright 假绿防护通过：${count} 条用例（下限 ${minimum}）\n`);
