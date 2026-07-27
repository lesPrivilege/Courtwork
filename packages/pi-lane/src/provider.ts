/**
 * provider 接线（PI-LANE-1 范围五：甜点档优先）。
 *
 * DeepSeek 是 pi-ai 0.82.1 的**原生 provider**（`providers/deepseek`，走 openai-completions
 * 通道），目录里直接带 `deepseek-v4-flash`。故本票不需要自定义 provider、不需要改内核，
 * 也不需要「不支持则换一档」的退路——如实登记：甜点档一次命中。
 *
 * 密钥只在 Node 侧解析（`DEEPSEEK_API_KEY`），不进前端、不进事件流、不进日志。
 * 缺配置一律显式报出，不静默降级成「模型没回话」。
 */

import { createModels, type Model, type MutableModels } from '@earendil-works/pi-ai';
import { deepseekProvider } from '@earendil-works/pi-ai/providers/deepseek';

export const PI_LANE_PROVIDER_ID = 'deepseek';
export const PI_LANE_MODEL_ID = 'deepseek-v4-flash';
/** 凭据只认这一个环境变量；换名字是契约变更。 */
export const PI_LANE_API_KEY_ENV = 'DEEPSEEK_API_KEY';

export interface ProviderReadiness {
  readonly models: MutableModels;
  /** 未就绪时为 undefined——不给一个「看着能用」的假模型。 */
  readonly model?: Model<string>;
  readonly configured: boolean;
  /** 就绪与否都给一句人话；未就绪时说清缺什么。 */
  readonly detail: string;
}

export async function createDeepSeekLane(): Promise<ProviderReadiness> {
  const models = createModels();
  models.setProvider(deepseekProvider());

  const model = models.getModel(PI_LANE_PROVIDER_ID, PI_LANE_MODEL_ID) as Model<string> | undefined;
  if (!model) {
    return {
      models,
      configured: false,
      detail: `pi-ai 目录里找不到 ${PI_LANE_PROVIDER_ID}/${PI_LANE_MODEL_ID}——上游模型表已漂移，须回 ADR-022 决定五按升级纪律重核`,
    };
  }

  const auth = await models.getAuth(PI_LANE_PROVIDER_ID);
  if (!auth) {
    return {
      models,
      model,
      configured: false,
      detail: `未配置 ${PI_LANE_API_KEY_ENV}：pi lane 不会用无凭据的连接去试，请在 sidecar 进程的环境里设置该变量后重启`,
    };
  }

  return {
    models,
    model,
    configured: true,
    detail: `${PI_LANE_MODEL_ID}（${model.api}，${model.baseUrl ?? '默认端点'}）已就绪`,
  };
}
