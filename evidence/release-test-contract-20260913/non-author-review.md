# Luna 非作者有界检查

对象：Sol实现、Astra整合的`448e8f1`五文件变化，以及`7c58f45`仅workflow的四行补充。Luna未运行全量suite。

- 独立反例：临时PATH将npm映射到`/usr/bin/false`，仅运行product-check.mjs。输出只到第一项bounded synthetic test suite，exit=1；smoke与文档检查均未继续。这只证明普通非零child的提前终止/传播，不冒称已验证signal、安装或每一个后续步骤的失败。
- 默认4与load8执行相同两个glob，文档一致；真实凭据非必需的描述准确。
- 锁文件的安装脚本检查未见ignore-scripts必然缺少运行文件的阻断。实际安装/运行接受仍以Astra日志为准。
- 指出workflow隐式依赖Ubuntu Python的问题；Astra在7c58f45增加setup-python@v5的3.12及45分钟job上限，Luna复核四行未见问题。

本结论是runner/配置的有界非作者证据，不能代签完整P12-A、G1–G5、远端CI、真实模型或所有操作系统。
