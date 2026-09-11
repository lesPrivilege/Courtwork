# Claude Paper v1 · Astra裁定与本地集成

2026-09-11。原作者Claude；Astra核验原包、查看真实阅读面与E1/E2/E3，并完成有界修补。选择E1、黑色宗默认与彩色宗上横红可选，接受为本轮出版阅读面候选。SE本地main已集成到 `0f23ad1ebed4ff2ef42394a5b1744eaaff30dd75`；未推送SE或触发Pages。本轮不改变论文采用9.6 / 2026-09-07 / d78fd312，不关闭产品或原生a11y门。

## 原件与来源

- [原作者返回](AUTHOR-RETURN.md)、[完整原ZIP](source.zip)、[140文件接收清单](archive-manifest.json)。ZIP为13,452,969字节，SHA-256 `3748d31cbbdcdd7a165eae9273e3b1d7411d8495b39b9a8a4340fffa796a3fe9`。解包140文件与交付目录逐字节相同；作者manifest的139项输出全部匹配（不含manifest自身）。原ZIP未改。
- [固定输入复核](source-check.json)：28项带hash本地输入全部匹配。作者明确未填ONE-SHOT hash，不是hash冲突；本次补固定 `8d70853e985e4335f1dba1cb1948dadde9b9364768d5a71f05a09cc122bcbbfb`。3个外部参考链接本轮未重新抓取，作者使用主张不升级为外部事实。
- [正式开工依据](../../../release/claude-paper-2026-09-11/ONE-SHOT.md)。最近先例：SE reader.js与QA@2817b824；CourtWork品牌包、Dystopia与68ch出版measure@0227673。影响仅Paper出版层级、署名、封面和目录grammar，不改App/Pages控制或review语义。

## 八项裁定

| 作者问题 | Astra裁定与理由 |
| --- | --- |
| Canonical单独封面 | 采用E1。它把保留的工作结构放在中心、模型轨迹放在边缘，适合摘要的连续性命题；Practice/Index直接进入各卷正文。E2较偏候选／判断，E3更泛化，均保留原包备选。 |
| eyebrow元数据 | Canonical去掉重复Edition；裸9.6加“文本版本／Text revision”。论文日期与阅读面候选日期分开。 |
| 章节sans／正文serif | 采用。保持长文阅读节奏与层级，标题副题仍serif；不修改源文标题。 |
| JS宽屏展开目录 | 采用原生details渐进增强；窄屏默认折叠、无JS仍可手动展开且三卷全文可读。 |
| validator调色板 | 采用Dystopia静态角色值。不是仅改断言求绿：三卷双语实际文本对比度检查通过，品牌红与review角色分开。 |
| 带日期候选HTML | 保留-paper-v1独立文件。集成不删除后缀覆盖既存9月11或历史文件；后续发布需单独回执。 |
| 中横红／灰阶变体 | 不补实例；本单黑宗、上横红彩宗均保留。研究备选无须变成第三套主身份。 |
| E1 alt的执行者 | 改为“更替的模型执行实例”；承载面保留经治理成果、提交记录和未完义务。避免把模型实例等同Operator，也不暗示接触承载面即获正式效力。 |

## 修补与集成

SE基线2817b824 → Claude补丁应用提交 `853af2f2f8f69b1f3ae4efc3ce0c087cf27d163b` → Astra修补 `0f23ad1ebed4ff2ef42394a5b1744eaaff30dd75`。可移植[两提交补丁](integration.patch)。

除元数据和alt外，必需SVG缺失／空文件现在中止构建，避免紧凑图缺失时窄屏空白；相邻文字已读出les Privilege，内联标记改为装饰以免重复朗读。修正打印层叠优先级：深色封面不再覆盖灰阶，彩色署名打印使用黑色。正文、译文、manifest及所有基线历史dist共20文件逐字节不变。

Astra对Claude原作作非作者审查；Astra自写的修补与扩展测试标记为作者自检，不冒称另一位作者的独立接受。未调用付费provider或启动新外部作者。

## 验证与限定

- build_en/build/validate通过；译文门8测试、资源失败负例3测试通过。
- [浏览器结果](verification/results.json)：原72项保留并扩展至110/110，中英三卷、目录／语言章节、主题、键盘、无JS、打印、外部请求、320/390/720/1100/1301宽度与文本对比度。补测深色+彩色宗打印灰阶。
- [源文与历史文件](verification/source-history.json)20/20不变；[可复现构建](verification/rebuild.json)中英输出hash重复一致。
- Astra在真实浏览器查看390宽Canon明暗、Practice英文切换与1440图；核对封面、身份、文字层级及无溢出。[宽屏](verification/zh-desktop.png)、[窄屏](verification/zh-mobile.png)、[深色](verification/zh-dark.png)。其余本次QA截图也在verification；作者44图保留原ZIP。
- 200%沿既有QA以viewport/device metrics模拟，不能称原生浏览器缩放验收。原生VoiceOver、IME、forced-colors、实体打印、外链可达、PDF和线上发布未核验。插画静态；目录箭头存在120ms过渡，reduced-motion取消，纠正作者“无新增motion”的笼统表述。

SE的main push会触发Pages；本轮只有本地main集成，远端与线上未改。共享CourtWork其他作者的current段落、研究稿和验证工作保留。
