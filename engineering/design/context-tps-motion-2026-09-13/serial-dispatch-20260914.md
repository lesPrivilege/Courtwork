# P1 telemetry 串行派工

用户于2026-09-14授权串行施工。接[原合同](telemetry-p1-20260914.md)，本轮只启动第一单，其余排队。

## 第一单：DS normalized telemetry

已派本地Luna `telemetry_slice1`，基线main `7e1a1ff047721e1ca6c871deba7f367ccea55a06`，隔离分支 `codex/telemetry-slice1-20260914`（由施工者建立并回报）。核官方协议及已安装SDK，沿现有provider/Pi映射和request telemetry owner接真实cache/usage，确认token delta/timing能力，缺失继续unavailable。不得把chunk、最终usage或Host时间冒称provider实时TPS/TTFT。

施工范围：计量映射、必要定向测试、原任务交付证据；不碰UI、权限、schema或个人凭据，不新增付费请求。新公共字段/事件语义先交Astra裁决。施工前在slice1-delivery.md记录责任与先例；保留其他writer改动，不同步主树、不push/deploy。

施工交付后另派非作者Luna验收；Astra不重复跑验收。第一单接收后才启动第二单cache last-confirmed，再启动第三单activity drivers。跨层争议回原合同处置，不由作者自行扩单。

## 后续顺序与关闭条件

1. DS计量能力与接线：真实能力矩阵、缺失理由及定向回归。
2. Cache last-confirmed：身份边界、来源request/time、未知/零值/乱序与切换行为。
3. Activity drivers：ambient / output pulse / 有依据的真实TPS分层；Chrome人工视觉接受。

已有Copy与Composer的人工视觉项继续保留，未由本次派工关闭。CW会话仓库/exec仍不可达，因此本地代施工不计产品自身coding执行能力。Chrome沿现有8859 Host，用户真实交互反馈作为目验输入；本记录不宣称已实施或通过。
