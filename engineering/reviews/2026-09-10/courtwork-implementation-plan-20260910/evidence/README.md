# 本次实际验证范围

通过GitHub connector读取固定commit。容器无法解析GitHub域名，因此未取得完整clone、未安装app依赖，未跑全量测试、真实Core数据库集成、浏览器或真实provider。

仅将读取的 `app/core/client.mjs` 原字节重建为隔离副本：9609 bytes；Git object hash（`SHA1("blob "+length+NUL+bytes)`）为 `9e697d444a3990e674ee38224fd49d24cff1c442`，与远端blob完全相等。副本仅依赖Node标准库。

执行 `core-client-lifecycle.mjs` 使用合成可执行worker、临时dataDir，不接触真实Core数据库。结果见JSON：close无ACK观察1502ms仍pending；ready超时之后child仍存活。探针结束后已强制回收其测试worker。

环境Node v22.16.0，低于项目声明的>=22.19.0。因此这两项是精确源码的局部故障复现，不是项目受支持环境的通过证明；RV26-Q01须在目标版本重跑。无真实数据、provider、浏览器测试。

**脚本是缺陷基线探针：退出0表示两项缺陷成功复现，不表示产品健康。** 修复工单必须将它转换为正向回归断言。不要把该脚本的绿色退出状态作为修复验收。

仓库current里记录的522/522等数字属于原作者/独验回执；本审查没有重新执行，不把它们冒认成本轮结果。
