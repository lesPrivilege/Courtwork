# 第二片 · 精确版本的确定性比较

第一片后端01e8837已通过独立核查后串行接收。只比较同一Intake来源的两个保留revision；无Core采用关系时不补造adopted版本，也没有“接受差异”命令。

沿现Session token与scope查询，要求sourceId/fromRevision/fromSha256/toRevision/toSha256；两边分别经原reader验证，不解析隐式latest或用当前路径替代。响应保留两端精确identity、原UTF-8表示和查询时最新保留revision。身份/版本/完整性失败按原owner拒绝；读比较不写新版本或Run。

采用仓库已锁定 `diff@8.0.4`（BSD-3-Clause）公共`diffLines`，从传递依赖提升为显式依赖，版本和包内容不变；来源为安装包README、LICENSE与lockfile integrity。上游入口[代码仓库](https://github.com/kpdecker/jsdiff)。未能从网页取得对应版本tag，不以远端tag核验代替本地锁包证据。消费者`app/intake/compare.mjs`仅作行模型转换，渲染复用`app/web/diff-view.mjs`；不自研差异算法，不升级全套依赖。

每侧64KiB/2000行，编辑距离2000、算法40ms；超限返回limited与空rows，不把截断diff呈现为完整。空文、CRLF/LF、末尾无换行、空白与Unicode以原字符精确对比。前端原word强调只在有界token矩阵内运行，大行退回整行显示，防止用户长文本造成二次平方内存开销。

UI在现保留来源的版本details内选择两版并明确点击比较；显示from/to与读取入口，说明最新保留不同于正式采用。非请求更新不替换选择或阅读版本。发生版本并发变化，旧确切比较仍合法，正式采用仍只能走原Work Review；此片不实现上传来源与Matter membership，不能声称已关闭S2全部专业决定场景。

验证：字节可重建的双侧行模型；空/Unicode/CRLF/末尾换行；scope/hash冲突；超限/大行回退；无写效应、无自动采用。原diff呈现与Files/Inspector相邻行为复核。
