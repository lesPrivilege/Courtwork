/**
 * PROVIDER-STREAM-1 ③（显示边界）：Work 场景失败报文的产品语守门。
 *
 * provider 流归一后的失败报文已是中文产品语（「服务商请求失败（HTTP N）」族），原样透传；
 * 协议外守卫（core turn-runner「Provider stream threw outside the closed failure protocol」，
 * 收编后触发即 bug）与任何英文技术残文一律改写为兜底产品语——真机 I 项的裸透由此结构性根除。
 * 判据先拒绝 error/provider/protocol/schema/stack/路径等技术标记，再以「零中文即技术残文」兜底：
 * 产品语恒含中文（含 HTTP 状态等短 ASCII 词无妨），纯英文与夹带少量中文的技术残文均不得裸透。
 */
export const WORK_MODEL_FAILURE_FALLBACK_COPY =
  '与模型服务的通信中断，本次审查未完成 · 请稍后重试；诊断记录已留存，供排查使用';

const HAS_CJK = /[一-鿿]/;
const TECHNICAL_MARKER =
  /(?:\b(?:error|exception|provider|protocol|schema|stack|undefined)\b|\bat\s+\S+\s*\(|\/Users\/|[A-Za-z]:\\)/i;

export function workFailureDisplayCopy(message: string | undefined): string {
  const trimmed = message?.trim();
  if (!trimmed) return WORK_MODEL_FAILURE_FALLBACK_COPY;
  if (TECHNICAL_MARKER.test(trimmed)) return WORK_MODEL_FAILURE_FALLBACK_COPY;
  if (!HAS_CJK.test(trimmed)) return WORK_MODEL_FAILURE_FALLBACK_COPY;
  return trimmed;
}

const BUDGET_TECHNICAL_MARKER =
  /(?:\b(?:maxUsd|maxSteps|maxToolCalls|maxSeconds|paid Turn|Turn terminal|providerId|modelId)\b|价目表版本)/i;

export function workScenarioFailureDisplayCopy(failure: {
  reason: 'invalid_output' | 'runtime_limit' | 'configuration' | 'internal';
  message: string;
}): string {
  if (!BUDGET_TECHNICAL_MARKER.test(failure.message)) return failure.message;
  if (failure.reason === 'configuration') {
    return '预算配置无法继续本次审查 · 已知估算与冻结价目假设仍保留。请重新开始；如仍无法继续，请保留当前案件状态并检查金额上限与模型设置。';
  }
  if (failure.reason === 'runtime_limit') {
    return '本次审查已达到运行上限，已停止继续执行 · 请调整相应运行上限后重新开始。';
  }
  return workFailureDisplayCopy(failure.message);
}
