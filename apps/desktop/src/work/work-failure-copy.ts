/**
 * PROVIDER-STREAM-1 ③（显示边界）：Work 场景失败报文的产品语守门。
 *
 * provider 流归一后的失败报文已是中文产品语（「服务商请求失败（HTTP N）」族），原样透传；
 * 协议外守卫（core turn-runner「Provider stream threw outside the closed failure protocol」，
 * 收编后触发即 bug）与任何英文技术残文一律改写为兜底产品语——真机 I 项的裸透由此结构性根除。
 * 判据取「零中文即技术残文」而非枚举清单：产品语恒含中文（含 HTTP 状态等短 ASCII 词无妨），
 * 纯英文文本必是未经归一的异常/守卫报文——未知形态同样不得裸透。
 */
export const WORK_MODEL_FAILURE_FALLBACK_COPY =
  '与模型服务的通信中断，本次审查未完成 · 请稍后重试；诊断记录已留存，供排查使用';

const HAS_CJK = /[一-鿿]/;

export function workFailureDisplayCopy(message: string | undefined): string {
  const trimmed = message?.trim();
  if (!trimmed) return WORK_MODEL_FAILURE_FALLBACK_COPY;
  if (!HAS_CJK.test(trimmed)) return WORK_MODEL_FAILURE_FALLBACK_COPY;
  return trimmed;
}
