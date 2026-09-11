# Independent Design return · source intake

2026-09-11 · 用户转交实际canvas目录后，已取得完整7页/19板与RETURN-design.md，取代此前只有摘要的接收状态。原始远端[artifact](https://claude.ai/code/artifact/27dec73a-7d0d-4def-b704-68ed55c90240)访问曾失败；本次审核依据是用户提供的实际本地文件，未声称远端已核。

[完整原源archive](source.tar.gz)保留66个regular files的字节（仅排除.DS_Store与symlink），包括生成源、work/return-package两个目录、编译HTML与原ZIP。[source-manifest](source-manifest.json)记录每个member的byte/hash和archive hash；原ZIP28个文件CRC通过，逐个与return-package内容一致。打包仅规范tar容器metadata，member原字节不改。原始脚本未执行。

基线为dbd1efe52d7a078cfdb8af03a82470135f31a9dd。返回稿注明product a01dee8与5e3a504深色修补、f137媒体，均作固定来源；不将f137重标成新设计截图。35 Lucide SVG+LICENSE共36 manifest条目，与47 semantic entries分别计数，不能混称36 glyph。

## 阅读与裁决

- [Astra正式DG裁决、五分歧及六PR合同](../../design/se-control-one-shot-2026-09-11/return-intake.md)
- [视觉审阅与19板取样](../../../evidence/se-design-return-20260911/visual-review.md)
- [45行消费审计](../../../evidence/se-design-return-20260911/consumption-review.md)
- [能力与接线审计](../../../evidence/se-design-return-20260911/capability-review.md)

原文在archive的`return-package/RETURN-design.md`；原画板位于`return-package/artboards/`；原创6个glyph位于`return-package/glyphs/`；`work/canvas.json`记录页/画板尺寸。它们是返回来源，不是产品实现或接受真源。

可运行`python3 evidence/se-design-return-20260911/preview.py`只读预览archive画板。仅绑定127.0.0.1随机端口，CSP禁止脚本；不改原板layout、不注入产品数据。缺失support.js保留为原始资产缺口，静态审阅不依赖它。长板边界及未测项目见visual-review。
