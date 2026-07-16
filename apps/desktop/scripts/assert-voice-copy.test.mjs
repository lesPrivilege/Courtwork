// 文案门反例注入（node --test）：证明 voice.md 三条可机器断言条款各自能触红，
// 且现有安全用法与纯英文 affordance / 代码标识符不误伤。
import assert from 'node:assert/strict';
import test from 'node:test';

import { extractUserFacingStrings, scanVoice } from './voice-copy-lib.mjs';

const src = (path, content) => ({ path, content });
const rules = (sources) => scanVoice(sources).map((f) => f.rule);

test('§1 裸确认词：JSX 文本与字面量各自触红，动词+名词放行', () => {
  assert.ok(rules([src('a.tsx', '<button className="primary-button">确认</button>')]).includes('bare-confirm'));
  assert.ok(rules([src('a.ts', "const label = '确定';")]).includes('bare-confirm'));
  assert.ok(rules([src('a.tsx', '<button>OK</button>')]).includes('bare-confirm'));
  // 动词+名词 / 处置动词对语义自足，放行
  assert.deepEqual(rules([src('a.tsx', '<button>确认此项</button>')]), []);
  assert.deepEqual(rules([src('a.tsx', '<button>存入卷宗</button>')]), []);
  assert.deepEqual(rules([src('a.tsx', '<button>驳回</button><button>修正</button>')]), []);
  // 「逐条确认」是短语（含前缀），非裸词，放行
  assert.deepEqual(rules([src('a.tsx', "<span>{mode ? '逐条确认' : '可批量确认'}</span>")]), []);
});

test('§3 成功自评：动词+成功触红，「已+动词」放行，现有安全用法不误伤', () => {
  assert.ok(rules([src('a.ts', "showToast('成功删除');")]).includes('success-claim'));
  assert.ok(rules([src('a.ts', "showToast('保存成功');")]).includes('success-claim'));
  assert.ok(rules([src('a.ts', "showToast('操作成功');")]).includes('success-claim'));
  assert.ok(rules([src('a.tsx', '<div>已成功归档</div>')]).includes('success-claim'));
  // 「已+动词」结果陈述放行
  assert.deepEqual(rules([src('a.ts', "showToast('已删除');")]), []);
  assert.deepEqual(rules([src('a.ts', "showToast('已存入卷宗');")]), []);
  // 现有安全用法：未成功（失败态）/ 以成功为准（解释性），不得误伤
  assert.deepEqual(rules([src('a.tsx', '<p>此轮请求未成功</p>')]), []);
  assert.deepEqual(rules([src('a.tsx', '<p>连接状态只以真实请求成功为准</p>')]), []);
});

test('§6 工程词泄漏：中文夹工程词触红，纯英文 affordance 与标识符放行', () => {
  assert.ok(rules([src('a.ts', "const e = '解析 schema 失败';")]).includes('eng-leak'));
  assert.ok(rules([src('a.ts', "const e = 'token 已用完';")]).includes('eng-leak'));
  assert.ok(rules([src('a.tsx', '<span>生成 prompt 出错</span>')]).includes('eng-leak'));
  // 纯英文工具 affordance / 参数不误伤（无 CJK）
  assert.deepEqual(rules([src('a.tsx', '<span>Ran command</span>')]), []);
  assert.deepEqual(rules([src('a.tsx', "<ToolCallRow args='case=demo scope=payment' />")]), []);
  // 代码标识符：模板插值与 ASCII 值不误伤
  assert.deepEqual(rules([src('a.tsx', 'const x = `未知原件：${anchor.fileId}`;')]), []);
  assert.deepEqual(rules([src('a.ts', "const schemaId = 'legal.CaseFile';")]), []);
});

test('注释不是用户文案', () => {
  assert.deepEqual(rules([src('a.ts', '// 验证成功后的回调；返回 schema 描述')]), []);
  assert.deepEqual(rules([src('a.ts', '/* 授权成功（桩）时并入已授权集，命中 token */')]), []);
  assert.deepEqual(rules([src('a.tsx', '{/* 确认 */}')]), []);
});

test('抽取器：剔注释与插值，保留 CJK 字符串与 JSX 文本', () => {
  const got = extractUserFacingStrings("const a = '存入卷宗'; // 注释 confirm\n<button>确认</button>");
  const values = got.map((g) => g.value.trim());
  assert.ok(values.includes('存入卷宗'));
  assert.ok(values.includes('确认'));
  assert.ok(!values.some((v) => v.includes('注释')));
  // 行号定位正确（确认在第 2 行）
  const confirmHit = got.find((g) => g.value.trim() === '确认');
  assert.equal(confirmHit.line, 2);
});
