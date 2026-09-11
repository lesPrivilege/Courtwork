# 节点发布回执

2026-09-12。用户明确授权main推送、清理已合入分支与GitHub Pages部署。

- 已部署源：`6f27f5a3a99b4f990e26b9d0d4d21be8a0d1c619`，含Pages深色“一笔红”修正`ad5a03f`和本轮整体模型裁决。
- [GitHub Pages run 34644492998](https://github.com/lesPrivilege/Courtwork/actions/runs/34644492998)：build/deploy均success；[机器回执](deployment-run.json)。
- [线上站点](https://lesprivilege.github.io/Courtwork/)：19份HTML/CSS/build-manifest逐一HTTP/hash匹配本地构建；[核验](live-verification.json)。深色`--campaign-diff-change`为`#c95e55`，App配色未改。
- 本地两次构建161文件一致；capture-ready、296公开链接、21图注册、材质与5项公开数据/采集政策检查通过。Actions另在固定提交上通过同一发布流程；文档检查5210链接通过。
- 本轮架构只改engineering文档；未声称自动capture、Broker、Spark治理写入或义务调度已实现。未执行真实Provider/原生宿主检查，未部署SE。

发布后的回执/current文档提交不改变上述静态产物。最终main与origin/main对齐，独立review的干净检出包含这些回执；已合入临时开发分支退役，六个archive refs保留。共享Courtwork目录原有62个修改/未跟踪文件按字节保留（current只追加本轮状态），不将该共享目录称为干净，也不把它们混入review或发布源。

独立审阅按[入口与四个问题](README.md)进行。该入口是准备材料，不代表已经完成独立架构或产品接受。
