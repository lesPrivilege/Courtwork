# Luna 固定版本有界复验

由主责按Luna原始回报登记；验证者未参与产品撰写。固定 `445fb48aa42d47c6ff0f819790630ac9ba723f33`，独立detached工作树，检查后清理。

执行 `node --test` 对 summary-disclosure、chat-shell-proportion、chat-work-shell、composer-field、shell-layout 五测试文件，37/37通过；git diff --check与三个相关模块node --check通过。额外临时反例：带引号和Unicode文件路径重排保留原focus identity，移除后回退run-summary-files。

未发现opener传递、sessionEpoch、disabled排除或文件重排/删除回退缺陷；D2有界列静态契约通过。未进行视觉验收。发现Summary README的旧Open in right panel文字漂移，由Astra在交付文档收尾修正。此为报告回执，未附造不存在的原始测试log，不称完整产品独立接受。
