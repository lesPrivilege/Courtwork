# Luna · bounded non-author review

2026-09-13。Reviewer `measurement_card_audit` 只读复核隔离候选；Astra是实现与修复作者。Luna没有修改源码、查看个人数据或运行真实provider，没有独立浏览器/辅助技术接受。

范围：local package preview/register/trust、ExtensionRegistry生命周期与恢复、MCP/Skill scope/CAS、草稿异步边界。Luna的合成故障探针发现并由Astra修复：

1. 重启恢复 start 拒绝未 dispose；Load cleanup误要求 dispose 返回Promise。
2. dispose 拒绝使内存unloaded与持久loaded分裂；现为持久invalidated+诊断。
3. 卸载成功但receipt保存失败会从旧loaded重启；现有副作用前持久suspended标记与回执成功后解除顺序，重启保守失效。
4. 新标记类型未验证，字符串true会绕过 `=== true`；现拒绝存在的非boolean值，兼容旧记录缺失字段。
5. 修改本地路径虽无法使用旧preview登记，旧manifest/trust按钮仍可见；现立即重绘并恢复输入光标。

审阅回执：新/相邻组20/20与既有control/source组22/22曾通过；标记加入后所列六文件组43/43通过。最后只复验marker闭环的 `node --test tests/local-extension-intake.test.mjs` 为8/8，确认拒绝畸形标记先于本地activation、imports不增。最终结论为本片有界代码检查无剩余阻塞，不扩大为全站或恶意进程隔离保证。

作者证据：[66项相邻检查](evidence/reviewed-targeted.log)、[合流全量983项](evidence/integrated-full.log)、[最后marker/文案等32项](evidence/final-fixes.log)。全量来源为7fadc56；最后marker类型断言与Home/Usage小改在全量启动之后，由定向与Luna末轮复验覆盖，未宣称第二次全量。
